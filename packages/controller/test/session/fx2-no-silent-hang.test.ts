// FX-2 (fixer round; F-49-1, FX-2b): on a loaded machine a follower lost exactness after a ×4 target change and a command
// sent through the host link was never answered. Rulings: a command always gets a reply or a timeout refusal (never a
// silent hang); a viewer's hello is never left unanswered for good; the follower's delay behind the host is WALL time.
import { describe, expect, it } from 'vitest';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { ViewerSync } from '../../src/session/viewer-sync.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { TransportBase } from '../../src/transport/base.ts';
import { createStamper, type ManagedTransport, type WireMessage } from '../../src/protocol.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { manualViewer } from '../fakes/manual-viewer.ts';
import { sleep, waitFor } from '../helpers.ts';

/** A transport the test opens and closes; it records what is written and the test delivers the answers. */
class ManualTransport extends TransportBase {
  readonly kind = 'broadcastChannel' as const;
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
  commands(): Array<Extract<WireMessage, { kind: 'command' }>> {
    return this.sent.filter((m): m is Extract<WireMessage, { kind: 'command' }> => m.kind === 'command');
  }
}

const S = 'FXT234';
const host = createStamper(S, 'host-fx2');

describe('FX-2: a command always gets a reply or a timeout refusal', () => {
  it('a command lost on the way is sent again (same id) and the host answers it', async () => {
    const t = new ManualTransport();
    const s = new ControllerSession({ session: S, transport: t, peerId: 'ctl-x', resendMs: 20, answerTimeoutMs: 1000 });
    t.set('open');
    const p = s.send({ type: 'setTarget', variable: 'hr', value: 120 });
    expect(t.commands()).toHaveLength(1); // ...and that one is lost (nothing answers it)
    await waitFor(() => t.commands().length >= 2, 500, 'a second send of the unanswered command');
    expect(new Set(t.commands().map((c) => c.body.id))).toEqual(new Set(['ctl-x-1'])); // the host de-duplicates by id
    t.inject(host({ kind: 'ack', commandId: 'ctl-x-1', accepted: true, tick: 9 }));
    expect(await p).toMatchObject({ commandId: 'ctl-x-1', accepted: true, tick: 9 });
    const n = t.commands().length;
    await sleep(60);
    expect(t.commands()).toHaveLength(n); // answered: no more sends
    s.close();
  });

  it('a command nobody answers is refused with a reason after the timeout — the sender is told, it does not wait forever', async () => {
    const t = new ManualTransport();
    const s = new ControllerSession({ session: S, transport: t, peerId: 'ctl-y', resendMs: 20, answerTimeoutMs: 120 });
    t.set('open');
    const p = s.send({ type: 'time', action: 'jump', value: 120 });
    const r = await Promise.race([p, sleep(1000).then(() => 'still waiting' as const)]);
    expect(r).toMatchObject({ commandId: 'ctl-y-1', accepted: false, reason: expect.stringMatching(/no answer from the host/) });
    expect(s.pendingCount).toBe(0);
    expect(s.log.at(-1)).toMatchObject({ kind: 'ack', commandId: 'ctl-y-1', text: expect.stringMatching(/^rejected: no answer/) });
    t.inject(host({ kind: 'ack', commandId: 'ctl-y-1', accepted: true, tick: 3 })); // a late answer changes nothing
    expect(s.pendingCount).toBe(0);
    s.close();
  });

  it('time without a link does not count: a command held while disconnected is still sent and answered on reconnect', async () => {
    const t = new ManualTransport();
    const s = new ControllerSession({ session: S, transport: t, peerId: 'ctl-z', resendMs: 20, answerTimeoutMs: 100 });
    const p = s.send({ type: 'setRhythm', rhythm: 'afib' });
    await sleep(250); // longer than the timeout, but the link was never open
    expect(s.pendingCount).toBe(1);
    t.set('open');
    expect(t.commands()).toHaveLength(1);
    t.inject(host({ kind: 'ack', commandId: 'ctl-z-1', accepted: true, tick: 4 }));
    expect((await p).accepted).toBe(true);
    s.close();
  });
});

const flushIo = () => new Promise((r) => setTimeout(r, 0));

/** Host + in-process hub + controller + viewer on one fake wall clock (20 ms frames); the viewer's link is `vt`. */
async function rig(o: { dropFirstHello?: boolean } = {}) {
  const clock = { wall: 1_000_000 };
  const wallNow = () => clock.wall;
  const h = manualHost();
  const hub = createInProcessHub();
  const hs = new HostSession({ session: S, target: h, wallNow, stateIntervalMs: 0 });
  hs.addTransport(hub.connect());
  const ctl = new ControllerSession({ session: S, transport: hub.connect(), wallNow });
  await waitFor(() => ctl.hostOnline);
  const v = manualViewer();
  const vt = hub.connect();
  let hellos = 0;
  const viewerLink: ManagedTransport = !o.dropFirstHello
    ? vt
    : (new Proxy(vt, {
        get(target, key, recv) {
          if (key !== 'send') return Reflect.get(target, key, recv) as unknown;
          return (m: WireMessage) => {
            if (m.kind === 'hello' && hellos++ === 0) return; // lost on the way (Playwright Linux WebKit, F-49-2)
            target.send(m);
          };
        },
      }) as ManagedTransport);
  const sync = new ViewerSync({ session: S, transport: viewerLink, target: v, engineVersion: h.engine.version, wallNow });
  const run = async (seconds: number) => {
    for (let i = 0; i < seconds * 50; i++) {
      clock.wall += 20;
      h.advance(20);
      if (i % 10 === 0) hs.emitState();
      await flushIo();
      sync.follow();
      v.advance(20);
    }
  };
  return { h, hs, ctl, v, vt, sync, run, hellos: () => hellos, close: () => (hs.close(), ctl.close(), sync.close()) };
}

describe('FX-2: the follower', () => {
  it('says hello again when its hello (or the snapshot) never came back, and syncs', async () => {
    const r = await rig({ dropFirstHello: true });
    await r.run(1);
    expect(r.sync.status).toBe('waiting'); // the first hello was lost
    await r.run(5);
    expect(r.hellos()).toBeGreaterThanOrEqual(2);
    expect(r.sync.status).toBe('synced');
    r.close();
  });

  it('keeps its delay behind the host in WALL time: at ×4 a command 60 ms late on the wire is still mirrored exactly', async () => {
    for (const k of [1, 4]) {
      const r = await rig();
      await waitFor(() => r.sync.status === 'synced');
      await r.ctl.send({ type: 'time', action: 'scale', value: k });
      await r.run(4);
      expect(r.sync.resyncs).toBe(0);
      // a command applied at the host's tick now (a lead change: the beats stay the host's) reaches the viewer three frames
      // (60 ms of wall) later
      const at = r.h.engine.now().tick;
      const late = createStamper(S, 'slow-wire')({ kind: 'event', body: [{ type: 'commandApplied', commandId: `fx2-${k}`, tick: at, resolved: { command: { id: `fx2-${k}`, issuedBy: 'x', type: 'device', action: { device: 'ecg', action: 'lead', value: 'ecgIII', lane: 0 }, atTick: at } } }] });
      await r.run(0.06);
      (r.vt as unknown as { receive(m: unknown): void }).receive(late);
      expect({ k, status: r.sync.status, resyncs: r.sync.resyncs }).toEqual({ k, status: 'synced', resyncs: 0 });
      // and it draws about 0.1 s of wall time behind the host at every speed (lagS is wall seconds)
      await r.run(2);
      expect(r.sync.lagS).toBeGreaterThan(0.05);
      expect(r.sync.lagS).toBeLessThan(0.2);
      expect(r.h.engine.now().simT - r.v.renderT()).toBeGreaterThan(0.05 * k);
      r.close();
    }
  });
});
