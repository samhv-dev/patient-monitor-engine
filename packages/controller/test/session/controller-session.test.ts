// ControllerSession against a hand-driven fake host on the in-process hub.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ControllerSession, describe as describeCmd } from '../../src/session/controller-session.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createStamper, type WireMessage } from '../../src/protocol.ts';
import { RELAY_CLOSE, RELAY_RETRY_CLOSE } from '../../src/transport/relay-frames.ts';
import { createWebSocketTransport } from '../../src/transport/websocket.ts';
import { FakeWebSocket } from '../fakes/fake-websocket.ts';
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

// Plan instructor-peer-role.md P5: the instructor's session on the phone side.
type Cmd = Extract<WireMessage, { kind: 'command' }>;
type Hello = Extract<WireMessage, { kind: 'hello' }>;
const commands = (t: ManualTransport) => t.sent.filter((m): m is Cmd => m.kind === 'command');
const hellos = (t: ManualTransport) => t.sent.filter((m): m is Hello => m.kind === 'hello');
const PIN = '4729';
const RESTARTED = "Not given: the instructor's computer restarted. Press again if it is still needed.";
const NOT_CONFIRMED = "Not confirmed: no answer from the instructor's computer. Check the Finished list before pressing again.";

describe('ControllerSession as the instructor (plan P5)', () => {
  it("with role 'instructor' and a pin, every open says the instructor hello with the PIN", () => {
    const t = new ManualTransport();
    const s = new ControllerSession({ session: S, transport: t, peerId: 'ins-a', role: 'instructor', pin: () => PIN });
    t.set('open');
    t.set('connecting');
    t.set('open');
    expect(hellos(t)).toHaveLength(2);
    for (const h of hellos(t)) expect(h).toMatchObject({ kind: 'hello', role: 'instructor', pin: PIN });
    s.close();
  });

  it('access goes pending → granted → revoked, or pending → denied, with its reason, and onChange fires', () => {
    const t = new ManualTransport();
    const s = new ControllerSession({ session: S, transport: t, peerId: 'ins-b', role: 'instructor', pin: () => PIN });
    t.set('open');
    expect(s.access).toEqual({ state: 'pending' });
    let changes = 0;
    s.onChange(() => changes++);
    t.inject(host({ kind: 'grant', to: 'someone-else.1', granted: true })); // another socket's grant
    expect(s.access).toEqual({ state: 'pending' });
    t.inject(host({ kind: 'grant', to: 'ins-b.1', granted: true }));
    expect(s.access).toEqual({ state: 'granted' });
    expect(changes).toBeGreaterThan(0);
    const before = changes;
    t.inject(host({ kind: 'grant', to: 'ins-b.1', granted: false, reason: 'the PIN was changed' }));
    expect(s.access).toEqual({ state: 'revoked', reason: 'the PIN was changed' });
    expect(changes).toBeGreaterThan(before);
    s.close();

    const t2 = new ManualTransport();
    const d = new ControllerSession({ session: S, transport: t2, peerId: 'ins-c', role: 'instructor', pin: () => '1111' });
    t2.set('open');
    let dChanges = 0;
    d.onChange(() => dChanges++);
    t2.inject(host({ kind: 'grant', to: 'ins-c.1', granted: false, reason: 'wrong PIN' }));
    expect(d.access).toEqual({ state: 'denied', reason: 'wrong PIN' });
    expect(dChanges).toBeGreaterThan(0);
    d.close();
  });

  it('commands are held, not sent, until granted, then go in order', async () => {
    const t = new ManualTransport();
    const s = new ControllerSession({ session: S, transport: t, peerId: 'ins-d', role: 'instructor', pin: () => PIN, resendMs: 10, answerTimeoutMs: 30 });
    t.set('open');
    const p1 = s.send({ type: 'setTarget', variable: 'hr', value: 90 });
    const p2 = s.send({ type: 'setRhythm', rhythm: 'afib' });
    await sleep(60); // past the resend and the answer timeout: a held command is neither sent nor timed out
    expect(commands(t)).toEqual([]);
    expect(s.pendingCount).toBe(2);
    t.inject(host({ kind: 'grant', to: 'ins-d.1', granted: true }));
    expect(commands(t).map((c) => c.body.id)).toEqual(['ins-d-1', 'ins-d-2']);
    t.inject(host({ kind: 'ack', commandId: 'ins-d-1', accepted: true, tick: 5 }));
    t.inject(host({ kind: 'ack', commandId: 'ins-d-2', accepted: true, tick: 5 }));
    expect((await p1).accepted).toBe(true);
    expect((await p2).accepted).toBe(true);
    s.close();
  });

  it('`from` is <peerId>.<n> and changes on every open, while command ids keep <peerId>-<n>', () => {
    const t = new ManualTransport();
    const s = new ControllerSession({ session: S, transport: t, peerId: 'ins-e', role: 'instructor', pin: () => PIN });
    t.set('open');
    expect(hellos(t)[0]?.from).toBe('ins-e.1');
    expect(s.from).toBe('ins-e.1');
    s.send({ type: 'setTarget', variable: 'hr', value: 90 }).catch(() => undefined);
    t.inject(host({ kind: 'grant', to: 'ins-e.1', granted: true }));
    expect(commands(t).map((c) => [c.from, c.body.id])).toEqual([['ins-e.1', 'ins-e-1']]);
    t.set('connecting');
    t.set('open');
    expect(hellos(t)[1]?.from).toBe('ins-e.2');
    expect(hellos(t)[1]?.seq).toBe(1); // a fresh sender: its sequence starts again
    expect(s.access).toEqual({ state: 'pending' }); // a grant never passes from one socket to another
    expect(commands(t)).toHaveLength(1); // held again until the new socket is granted
    t.inject(host({ kind: 'grant', to: 'ins-e.1', granted: true })); // the old socket's grant: not ours any more
    expect(s.access).toEqual({ state: 'pending' });
    t.inject(host({ kind: 'grant', to: 'ins-e.2', granted: true }));
    s.send({ type: 'setRhythm', rhythm: 'afib' }).catch(() => undefined);
    expect(commands(t).map((c) => [c.from, c.body.id])).toEqual([['ins-e.1', 'ins-e-1'], ['ins-e.2', 'ins-e-1'], ['ins-e.2', 'ins-e-2']]);
    s.close();
  });

  it('a host hello from a NEW host id answers every pending command locally; the same host id re-saying hello still re-sends', async () => {
    const t = new ManualTransport();
    const s = new ControllerSession({ session: S, transport: t, peerId: 'ins-f', role: 'instructor', pin: () => PIN });
    t.set('open');
    t.inject(host({ kind: 'hello', role: 'host' }));
    t.inject(host({ kind: 'grant', to: 'ins-f.1', granted: true }));
    const p = s.send({ type: 'applyEvent', event: { kind: 'drug', drugId: 'dantrolene', dose: 200, unit: 'mg', route: 'iv' } });
    expect(commands(t)).toHaveLength(1);
    t.inject(host({ kind: 'hello', role: 'host' })); // a restore: the same host says hello again
    expect(commands(t)).toHaveLength(2);
    expect(s.pendingCount).toBe(1);
    const reloaded = createStamper(S, 'host-2');
    t.inject(reloaded({ kind: 'hello', role: 'host' })); // the laptop reloaded: a new host id
    expect(await p).toMatchObject({ commandId: 'ins-f-1', accepted: false, reason: RESTARTED });
    expect(s.pendingCount).toBe(0);
    expect(commands(t)).toHaveLength(2); // never given to the reloaded case
    expect(s.access).toEqual({ state: 'pending' }); // …and it signs in again by itself, PIN and all
    expect(hellos(t).at(-1)).toMatchObject({ role: 'instructor', pin: PIN, from: 'ins-f.1' });
    s.close();
  });

  it("the timeout's reason reads 'not confirmed' for the instructor only; a controller's is unchanged", async () => {
    const t = new ManualTransport();
    const s = new ControllerSession({ session: S, transport: t, peerId: 'ins-g', role: 'instructor', pin: () => PIN, resendMs: 10, answerTimeoutMs: 40 });
    t.set('open');
    t.inject(host({ kind: 'grant', to: 'ins-g.1', granted: true }));
    expect(await s.send({ type: 'time', action: 'pause' })).toMatchObject({ accepted: false, reason: NOT_CONFIRMED });
    s.close();
    const t2 = new ManualTransport();
    const c = new ControllerSession({ session: S, transport: t2, peerId: 'ctl-g', resendMs: 10, answerTimeoutMs: 40 });
    t2.set('open');
    expect(await c.send({ type: 'time', action: 'pause' })).toMatchObject({ accepted: false, reason: 'no answer from the host in 0 s' });
    c.close();
  });

  it('plan §7: the PIN never goes on a BroadcastChannel (every window of the browser hears it)', () => {
    class Bc extends ManualTransport {
      override readonly kind = 'broadcastChannel' as never;
    }
    expect(() => new ControllerSession({ session: S, transport: new Bc(), role: 'instructor', pin: () => PIN })).toThrow(/never a BroadcastChannel/);
    expect(() => new ControllerSession({ session: S, transport: new ManualTransport(), role: 'instructor' })).toThrow(/needs a pin/);
  });

  describe('over the relay socket', () => {
    const opts = { url: 'ws://relay.test/', WebSocketImpl: FakeWebSocket, backoff: { baseMs: 100, maxMs: 1000, jitter: 0 }, livenessMs: 60_000 };
    const sent = (ws: FakeWebSocket) => ws.sent.map((d) => JSON.parse(d) as WireMessage);
    beforeEach(() => {
      vi.useFakeTimers();
      FakeWebSocket.all = [];
    });
    afterEach(() => vi.useRealTimers());

    it('a close with 4010 (id taken) is retried on the next connection with the next `from`', () => {
      const t = createWebSocketTransport(opts);
      const s = new ControllerSession({ session: S, transport: t, peerId: 'ins-w', role: 'instructor', pin: () => PIN });
      FakeWebSocket.last.open();
      expect(sent(FakeWebSocket.last)[0]).toMatchObject({ kind: 'hello', role: 'instructor', pin: PIN, from: 'ins-w.1' });
      FakeWebSocket.last.close(RELAY_RETRY_CLOSE.idTaken, 'peer id ins-w.1 is taken');
      vi.advanceTimersByTime(100);
      expect(FakeWebSocket.all).toHaveLength(2);
      FakeWebSocket.last.open();
      expect(sent(FakeWebSocket.last)[0]).toMatchObject({ kind: 'hello', role: 'instructor', pin: PIN, from: 'ins-w.2' });
      expect(s.access).toEqual({ state: 'pending' });
      s.close();
      t.close();
    });

    it('a close with denied (4013) sets access denied with the reason and stops reconnecting', () => {
      const t = createWebSocketTransport(opts);
      const s = new ControllerSession({ session: S, transport: t, peerId: 'ins-x', role: 'instructor', pin: () => '1111' });
      let changes = 0;
      s.onChange(() => changes++);
      FakeWebSocket.last.open();
      const before = changes;
      FakeWebSocket.last.receive({ relay: 'error', code: 'denied', message: 'the PIN is wrong' });
      FakeWebSocket.last.close(RELAY_CLOSE.denied, 'the PIN is wrong');
      expect(s.access).toEqual({ state: 'denied', reason: 'the PIN is wrong', code: 'denied' });
      expect(changes).toBeGreaterThan(before);
      vi.advanceTimersByTime(10_000);
      expect(FakeWebSocket.all).toHaveLength(1);
      expect(t.status).toBe('error');
      s.close();
      t.close();
    });

    it("a revoked instructor stays revoked when the relay's denied close follows the host's grant", () => {
      const t = createWebSocketTransport(opts);
      const s = new ControllerSession({ session: S, transport: t, peerId: 'ins-y', role: 'instructor', pin: () => PIN });
      FakeWebSocket.last.open();
      FakeWebSocket.last.receive(host({ kind: 'grant', to: 'ins-y.1', granted: true }));
      FakeWebSocket.last.receive(host({ kind: 'grant', to: 'ins-y.1', granted: false, reason: 'taken over by another phone' }));
      FakeWebSocket.last.receive({ relay: 'error', code: 'denied', message: 'taken over by another phone' });
      FakeWebSocket.last.close(RELAY_CLOSE.denied, 'taken over by another phone');
      expect(s.access).toEqual({ state: 'revoked', reason: 'taken over by another phone' });
      s.close();
      t.close();
    });

    // Review F1 (stack review 2026-10-30): the relay ungrants every instructor when a host socket is admitted, the SAME
    // laptop after a Wi-Fi blip included (same host id). The phone signs in again before its commands go again.
    it('F1: a same-host-id hello after a relay-side ungrant ends granted with the command delivered', async () => {
      const t = createWebSocketTransport(opts);
      const s = new ControllerSession({ session: S, transport: t, peerId: 'ins-h', role: 'instructor', pin: () => PIN });
      const ws = FakeWebSocket.last;
      ws.open();
      ws.receive(host({ kind: 'hello', role: 'host' }));
      ws.receive(host({ kind: 'grant', to: 'ins-h.1', granted: true }));
      const p = s.send({ type: 'applyEvent', event: { kind: 'drug', drugId: 'dantrolene', dose: 200, unit: 'mg', route: 'iv' } });
      const cmds = () => sent(ws).filter((m): m is Cmd => m.kind === 'command');
      const insHellos = () => sent(ws).filter((m) => m.kind === 'hello' && m.role === 'instructor');
      expect(cmds()).toHaveLength(1);
      const signIns = insHellos().length; // the open's, and again on the host's first hello while pending
      // The laptop's relay socket reconnects (same host id): the relay ungranted this socket silently and fans the hello
      ws.receive(host({ kind: 'hello', role: 'host' }));
      expect(cmds()).toHaveLength(2); // the restore path re-sends while it believes it is granted…
      ws.receive({ relay: 'error', code: 'forbidden', message: 'the instructor phone is not signed in' }); // …which the relay refuses
      expect(t.status).toBe('open'); // a per-command refusal: the socket stays and follows
      expect(insHellos()).toHaveLength(signIns + 1); // signs in again, with the PIN
      expect(insHellos().at(-1)).toMatchObject({ pin: PIN, from: 'ins-h.1' });
      expect(s.access).toEqual({ state: 'pending' });
      vi.advanceTimersByTime(5000); // held while pending: not re-sent into the refusal
      expect(cmds()).toHaveLength(2);
      ws.receive(host({ kind: 'grant', to: 'ins-h.1', granted: true }));
      expect(s.access).toEqual({ state: 'granted' });
      expect(cmds()).toHaveLength(3);
      expect(cmds().at(-1)?.body.id).toBe('ins-h-1');
      ws.receive(host({ kind: 'ack', commandId: 'ins-h-1', accepted: true, tick: 42 }));
      expect(await p).toMatchObject({ commandId: 'ins-h-1', accepted: true, tick: 42 });
      s.close();
      t.close();
    });

    it("F1: the relay's explicit grant false on a host readmit (revoked) still leads to a re-hello on the host's hello", async () => {
      const t = createWebSocketTransport(opts);
      const s = new ControllerSession({ session: S, transport: t, peerId: 'ins-i', role: 'instructor', pin: () => PIN });
      const ws = FakeWebSocket.last;
      ws.open();
      ws.receive(host({ kind: 'hello', role: 'host' }));
      ws.receive(host({ kind: 'grant', to: 'ins-i.1', granted: true }));
      ws.receive(host({ kind: 'grant', to: 'ins-i.1', granted: false, reason: "the instructor's computer reconnected; signing in again" }));
      expect(s.access).toEqual({ state: 'revoked', reason: "the instructor's computer reconnected; signing in again" });
      const p = s.send({ type: 'time', action: 'pause' });
      const cmds = () => sent(ws).filter((m): m is Cmd => m.kind === 'command');
      expect(cmds()).toHaveLength(0); // held: not signed in
      const signIns = sent(ws).filter((m) => m.kind === 'hello').length;
      ws.receive(host({ kind: 'hello', role: 'host' })); // the same laptop, back
      expect(sent(ws).filter((m) => m.kind === 'hello')).toHaveLength(signIns + 1);
      expect(s.access).toEqual({ state: 'pending' });
      expect(cmds()).toHaveLength(0); // the hello goes before the commands
      ws.receive(host({ kind: 'grant', to: 'ins-i.1', granted: true }));
      expect(cmds().map((c) => c.body.id)).toEqual(['ins-i-1']);
      ws.receive(host({ kind: 'ack', commandId: 'ins-i-1', accepted: true, tick: 7 }));
      expect((await p).accepted).toBe(true);
      s.close();
      t.close();
    });

    // Review F2: `forbidden` is a per-command refusal (the relay keeps the socket open and following); only a fatal close,
    // or the `denied` / `too-many-tries` frames, end the link.
    it('F2: a forbidden frame on a real WsTransport leaves the link open, and a later grant works', async () => {
      const t = createWebSocketTransport(opts);
      const s = new ControllerSession({ session: S, transport: t, peerId: 'ins-j', role: 'instructor', pin: () => PIN });
      const ws = FakeWebSocket.last;
      ws.open();
      ws.receive(host({ kind: 'grant', to: 'ins-j.1', granted: true }));
      const p = s.send({ type: 'setTarget', variable: 'hr', value: 70 });
      ws.receive({ relay: 'error', code: 'forbidden', message: 'the instructor phone is not signed in' });
      expect(t.status).toBe('open');
      vi.advanceTimersByTime(10_000);
      expect(FakeWebSocket.all).toHaveLength(1); // no reconnect: the same socket
      ws.receive(host({ kind: 'event', body: [{ type: 'measurement', t: 3, values: { hr: { value: 71, flag: 'valid', at: 3 } } }] }));
      expect(s.measurements.hr?.value).toBe(71); // …and it still follows
      ws.receive(host({ kind: 'grant', to: 'ins-j.1', granted: true }));
      expect(s.access).toEqual({ state: 'granted' });
      const cmds = sent(ws).filter((m): m is Cmd => m.kind === 'command');
      expect(cmds.at(-1)?.body.id).toBe('ins-j-1');
      ws.receive(host({ kind: 'ack', commandId: 'ins-j-1', accepted: true, tick: 3 }));
      expect((await p).accepted).toBe(true);
      s.close();
      t.close();
    });

    it('a close with tooManyTries (4028) sets a reason and stops', () => {
      const t = createWebSocketTransport(opts);
      const s = new ControllerSession({ session: S, transport: t, peerId: 'ins-z', role: 'instructor', pin: () => '1111' });
      FakeWebSocket.last.open();
      FakeWebSocket.last.receive({ relay: 'error', code: 'too-many-tries', message: 'too many wrong PINs: wait a minute' });
      FakeWebSocket.last.close(RELAY_CLOSE.tooManyTries, 'too many wrong PINs: wait a minute');
      expect(s.access).toEqual({ state: 'denied', reason: 'too many wrong PINs: wait a minute', code: 'too-many-tries' });
      vi.advanceTimersByTime(10_000);
      expect(FakeWebSocket.all).toHaveLength(1);
      s.close();
      t.close();
    });
  });
});
