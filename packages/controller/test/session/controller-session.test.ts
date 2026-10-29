// ControllerSession against a hand-driven fake host on the in-process hub.
import { describe, expect, it } from 'vitest';
import { ControllerSession, describe as describeCmd } from '../../src/session/controller-session.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createStamper, type WireMessage } from '../../src/protocol.ts';
import { TransportBase } from '../../src/transport/base.ts';
import { StageBuffer } from '../../src/panel/staging.ts';
import { collect, sleep, waitFor } from '../helpers.ts';

/** A transport whose status the test controls, looping writes back through `sent`. */
class ManualTransport extends TransportBase {
  readonly kind = 'websocket' as const;
  sent: WireMessage[] = [];
  protected write(m: WireMessage): void {
    this.sent.push(m);
  }
  protected teardown(): void {}
  set(s: 'open' | 'connecting'): void {
    this.setStatus(s);
  }
  inject(m: WireMessage): void {
    this.deliver(m);
  }
}

const S = 'CTL234';
const host = createStamper(S, 'host-1');

describe('ControllerSession', () => {
  it('says hello on open, fills id and issuedBy, and resolves on ack with an RTT', async () => {
    const hub = createInProcessHub();
    const fakeHost = hub.connect();
    const atHost = collect(fakeHost);
    let wall = 1000;
    const s = new ControllerSession({ session: S, transport: hub.connect(), peerId: 'ctl-a', wallNow: () => wall });
    const p = s.send({ type: 'setTarget', variable: 'hr', value: 90 });
    await waitFor(() => atHost.some((m) => m.kind === 'command'));
    expect(atHost[0]).toMatchObject({ kind: 'hello', role: 'controller' });
    const cmd = atHost.find((m) => m.kind === 'command') as Extract<WireMessage, { kind: 'command' }>;
    expect(cmd.body).toMatchObject({ id: 'ctl-a-1', issuedBy: 'controller:ctl-a', type: 'setTarget' });
    wall = 1042;
    fakeHost.send(host({ kind: 'ack', commandId: 'ctl-a-1', accepted: true, tick: 7 }));
    const r = await p;
    expect(r).toEqual({ commandId: 'ctl-a-1', accepted: true, tick: 7, rttMs: 42 });
    expect(s.pendingCount).toBe(0);
    s.close();
  });

  it('holds commands while disconnected and re-sends every unacked one on reconnect and on host hello', async () => {
    const t = new ManualTransport();
    const s = new ControllerSession({ session: S, transport: t, peerId: 'ctl-b' });
    s.send({ type: 'setRhythm', rhythm: 'afib' }).catch(() => undefined); // rejected by close() below
    expect(t.sent).toEqual([]); // not open yet
    t.set('open');
    expect(t.sent.map((m) => m.kind)).toEqual(['hello', 'command']);
    t.set('connecting');
    expect(s.hostOnline).toBe(false);
    t.set('open');
    expect(t.sent.map((m) => m.kind)).toEqual(['hello', 'command', 'hello', 'command']);
    t.inject(host({ kind: 'hello', role: 'host' }));
    expect(s.hostOnline).toBe(true);
    const cmds = t.sent.filter((m) => m.kind === 'command') as Array<Extract<WireMessage, { kind: 'command' }>>;
    expect(new Set(cmds.map((c) => c.body.id)).size).toBe(1); // always the same id → host de-duplicates
    expect(cmds.length).toBe(3);
    s.close();
  });

  it('tracks state, measurements, bookmarks and host version, and logs what happened', async () => {
    const t = new ManualTransport();
    const s = new ControllerSession({ session: S, transport: t });
    t.set('open');
    let changes = 0;
    s.onChange(() => changes++);
    t.inject(host({ kind: 'event', body: [
      { type: 'state', t: 12, tick: 600, mode: 'manual', values: { hr: 80 }, control: {} },
      { type: 'measurement', t: 12, values: { hr: { value: 79, flag: 'valid', at: 12 } } },
      { type: 'commandApplied', commandId: 'other-1', tick: 601, resolved: { command: { id: 'other-1', issuedBy: 'panel', type: 'scenario', action: 'bookmark', target: 'B1' } } },
      { type: 'alarm', t: 12, id: 'a', priority: 'high', category: 'physiological', state: 'raised', text: 'HR high' },
    ] }));
    t.inject(host({ kind: 'snapshot', body: { schema: 'pme-snapshot/1', engineVersion: '0.0.0', seed: 1, tick: 600, state: {} } }));
    expect(s.state?.values.hr).toBe(80);
    expect(s.measurements.hr?.value).toBe(79);
    expect(s.simT).toBe(12);
    expect(s.bookmarks).toEqual(['B1']);
    expect(s.hostEngineVersion).toBe('0.0.0');
    expect(s.log.map((l) => l.kind)).toEqual(expect.arrayContaining(['status', 'applied', 'alarm']));
    s.note('IV access');
    expect(s.log.at(-1)).toMatchObject({ kind: 'note', text: 'IV access', simT: 12 });
    expect(changes).toBeGreaterThan(0);
    s.close();
  });

  it('drops duplicate messages (same sender, same or older seq)', async () => {
    const t = new ManualTransport();
    const s = new ControllerSession({ session: S, transport: t });
    t.set('open');
    const m = host({ kind: 'event', body: [{ type: 'measurement', t: 1, values: { hr: { value: 60, flag: 'valid', at: 1 } } }] });
    t.inject(m);
    t.inject({ ...m, body: [{ type: 'measurement', t: 2, values: { hr: { value: 99, flag: 'valid', at: 2 } } }] } as WireMessage);
    expect(s.measurements.hr?.value).toBe(60);
    s.close();
  });

  it('rejects pending sends on close and refuses new ones', async () => {
    const t = new ManualTransport();
    const s = new ControllerSession({ session: S, transport: t });
    const p = s.send({ type: 'setTarget', variable: 'hr', value: 50 });
    s.close();
    await expect(p).rejects.toThrow('session closed');
    await expect(s.send({ type: 'setTarget', variable: 'hr', value: 50 })).rejects.toThrow('session closed');
    await sleep(0);
  });

  it('a staged delivery is ONE command log entry, written at the last ack, naming each item and the refusal', async () => {
    const t = new ManualTransport();
    const s = new ControllerSession({ session: S, transport: t, peerId: 'ctl-z' });
    t.set('open');
    const b = new StageBuffer('ctl-z');
    b.stage({ type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 0.01, unit: 'mg', route: 'iv' } }, 'drug');
    b.stage({ type: 'applyEvent', event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 250, overS: 60 } }, 'fluid');
    b.stage({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 14, vtMl: 450 } }, 'vent');
    const before = s.log.length;
    const done = b.commit((c) => s.send(c), { batch: true });
    const ids = (t.sent.filter((m) => m.kind === 'command') as Array<Extract<WireMessage, { kind: 'command' }>>).map((m) => m.body.id);
    expect(ids).toEqual(['ctl-z-1', 'ctl-z-2', 'ctl-z-3']);
    expect(s.log.length).toBe(before); // nothing logged per item on send
    t.inject(host({ kind: 'ack', commandId: 'ctl-z-1', accepted: true, tick: 9 }));
    t.inject(host({ kind: 'ack', commandId: 'ctl-z-3', accepted: true, tick: 9 }));
    expect(s.log.length).toBe(before); // …nor per ack, until the last one
    t.inject(host({ kind: 'ack', commandId: 'ctl-z-2', accepted: false, tick: 9, reason: 'no IV access' }));
    const acks = await done;
    expect(acks.map((a) => a.accepted)).toEqual([true, false, true]);
    const added = s.log.slice(before);
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({
      kind: 'command', commandId: 'ctl-z-sg1',
      text: 'staged ×3: event drug epinephrine 0.01 mg iv · event fluid crystalloid 250 60 (refused: no IV access) · event ventilation ventilator 14 450',
    });
    // A command outside a batch still logs its command and its ack lines
    const p = s.send({ type: 'setTarget', variable: 'hr', value: 90 });
    t.inject(host({ kind: 'ack', commandId: 'ctl-z-4', accepted: true, tick: 10 }));
    await p;
    expect(s.log.slice(before + 1).map((l) => l.kind)).toEqual(['command', 'ack']);
    s.close();
  });

  it('IP9 review L7: a staged delivery still being answered when the session closes gets its one line with the answers so far', async () => {
    const t = new ManualTransport();
    const s = new ControllerSession({ session: S, transport: t, peerId: 'ctl-c' });
    t.set('open');
    const b = new StageBuffer('ctl-c');
    b.stage({ type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 0.01, unit: 'mg', route: 'iv' } }, 'drug');
    b.stage({ type: 'applyEvent', event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 250, overS: 60 } }, 'fluid');
    const before = s.log.length;
    const done = b.commit((c) => s.send(c), { batch: true });
    t.inject(host({ kind: 'ack', commandId: 'ctl-c-1', accepted: true, tick: 9 }));
    s.close();
    await done.catch(() => undefined);
    const added = s.log.slice(before);
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({ kind: 'command', commandId: 'ctl-c-sg1', text: 'staged ×2: event drug epinephrine 0.01 mg iv · event fluid crystalloid 250 60 (no answer: the session closed)' });
  });

  it('describes commands in one line for the log', () => {
    expect(describeCmd({ id: 'x', issuedBy: 'y', type: 'setTarget', variable: 'hr', value: 120, ramp: { durationS: 30, curve: 'sigmoid' } })).toBe('hr → 120 over 30 s (sigmoid)');
    expect(describeCmd({ id: 'x', issuedBy: 'y', type: 'time', action: 'scale', value: 2 })).toBe('time scale 2');
  });
});
