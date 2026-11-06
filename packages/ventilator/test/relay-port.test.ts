// Plan room-and-instruments.md R8c: the ventilator link over the relay. The cockpit sends one `cmds` per ventilator tick
// (50 a second at ×1, 400 at ×8, brief 53's measurement); the relay closes a socket past 120 `vent` a second, so the
// port batches the `cmds` of each 20 ms of WALL time into one message, and the far side hands them on one by one, in
// order, exactly as they were posted. The rate is measured here on a fake clock with a real cockpit.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  attachMonitorToLink, createRelayPort, createVentDriver, createVent, RELAY_BATCH_MAX, RELAY_BATCH_MS, RELAY_BODY_BYTES, SETTINGS_MS, ventWireOver,
  type LinkMsg, type VentWire, type VentWireBody,
} from '../src/index.ts';
import { createEngine, type Command, type DispatchResult, type EngineEvent } from '@pme/engine-core';

/** Two ends of one wire: what one sends, the other hears (synchronously, as a copy), every body recorded with its wall time. */
function wirePair() {
  const sent: Array<{ at: number; from: 'a' | 'b'; body: VentWireBody }> = [];
  const fns = { a: new Set<(b: VentWireBody) => void>(), b: new Set<(b: VentWireBody) => void>() };
  const end = (me: 'a' | 'b'): VentWire => ({
    send: (body) => {
      sent.push({ at: Date.now(), from: me, body });
      const copy = JSON.parse(JSON.stringify(body)) as VentWireBody;
      for (const fn of [...fns[me === 'a' ? 'b' : 'a']]) fn(copy);
    },
    onBody: (fn) => (fns[me].add(fn), () => void fns[me].delete(fn)),
  });
  return { a: end('a'), b: end('b'), sent };
}
const cmdsOf = (b: VentWireBody): Array<Extract<LinkMsg, { kind: 'cmds' }>> => (b.kind === 'cmds' ? [b] : b.kind === 'batch' ? b.msgs : []);

beforeEach(() => void vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] }));
afterEach(() => void vi.useRealTimers());

/**
 * A real cockpit (its link driver) at `scale`, drawn at 60 frames a second on the fake wall clock for `seconds`, its
 * clock limit lifted by a monitor side on a real engine that the test advances at the same speed.
 */
async function run(scale: number, seconds: number) {
  const w = wirePair();
  const cockpitPort = createRelayPort(w.a);
  const monitorPort = createRelayPort(w.b);
  const e = createEngine({ seed: 3 });
  const heard: Array<Extract<LinkMsg, { kind: 'cmds' }>> = [];
  monitorPort.onMessage((m) => void (m.kind === 'cmds' && heard.push(m)));
  const mon = { dispatch: (c: Command): DispatchResult => e.dispatch(c), on: (fn: (x: EngineEvent) => void) => e.on(fn) };
  const detach = attachMonitorToLink(mon, monitorPort);
  const posted: Array<Extract<LinkMsg, { kind: 'cmds' }>> = [];
  const post = cockpitPort.post.bind(cockpitPort);
  cockpitPort.post = (m) => {
    if (m.kind === 'cmds') posted.push(JSON.parse(JSON.stringify(m)));
    post(m);
  };
  const v = createVentDriver(cockpitPort, 'normal');
  v.scale = scale;
  const frameMs = 1000 / 60;
  const t0 = Date.now();
  let n = 0;
  while (Date.now() - t0 < seconds * 1000) {
    await vi.advanceTimersByTimeAsync(frameMs);
    v.frame(Date.now() - t0);
    if (++n % 1 === 0) e.advanceTo(((Date.now() - t0) / 1000) * scale + 1e-9);
  }
  await vi.advanceTimersByTimeAsync(RELAY_BATCH_MS);
  detach();
  v.dispose();
  cockpitPort.close();
  monitorPort.close();
  const up = w.sent.filter((s) => s.from === 'a');
  const withCmds = up.filter((s) => cmdsOf(s.body).length > 0);
  // the most cmds-carrying messages in any one second of wall time (a sliding window)
  let peak = 0;
  for (let i = 0, j = 0; i < withCmds.length; i++) {
    while ((withCmds[i] as { at: number }).at - (withCmds[j] as { at: number }).at >= 1000) j++;
    peak = Math.max(peak, i - j + 1);
  }
  return { posted, heard, up, withCmds, peak };
}

describe('the relay port batches the cockpit\'s `cmds` per 20 ms of wall time (R8c)', () => {
  it('×8: 400 ticks a second go out in at most 50 messages a second; the far side hears every tick, in order, unchanged', async () => {
    const r = await run(8, 10);
    expect(r.posted.length).toBeGreaterThanOrEqual(3900); // ≈ 400 ticks a second for 10 s
    expect(r.peak).toBeLessThanOrEqual(1000 / RELAY_BATCH_MS); // 50
    expect(r.heard).toEqual(r.posted);
    for (let i = 1; i < r.withCmds.length; i++) expect((r.withCmds[i] as { at: number }).at - (r.withCmds[i - 1] as { at: number }).at).toBeGreaterThanOrEqual(RELAY_BATCH_MS);
    for (const s of r.up) expect(JSON.stringify(s.body).length).toBeLessThanOrEqual(RELAY_BODY_BYTES);
    for (const s of r.up) if (s.body.kind === 'batch') expect(s.body.msgs.length).toBeLessThanOrEqual(RELAY_BATCH_MAX);
    console.log(`R8c batching ×8: ${r.posted.length} ticks in 10 s → ${r.withCmds.length} messages (${(r.withCmds.length / 10).toFixed(1)}/s, peak ${r.peak} in a second)`);
  }, 60_000);

  it('×1: 50 ticks a second, never more than 50 messages a second, every tick heard', async () => {
    const r = await run(1, 5);
    expect(r.posted.length).toBeGreaterThanOrEqual(240);
    expect(r.peak).toBeLessThanOrEqual(50);
    expect(r.heard).toEqual(r.posted);
    console.log(`R8c batching ×1: ${r.posted.length} ticks in 5 s → ${r.withCmds.length} messages (${(r.withCmds.length / 5).toFixed(1)}/s, peak ${r.peak} in a second)`);
  }, 60_000);

  it('a batch of one tick is a plain `cmds`; anything else goes at once, after the cmds posted before it', async () => {
    const w = wirePair();
    const p = createRelayPort(w.a);
    const far = createRelayPort(w.b);
    const heard: LinkMsg[] = [];
    far.onMessage((m) => heard.push(m));
    p.post({ v: 1, kind: 'cmds', tick: 1, cmds: [] });
    expect(w.sent).toHaveLength(0); // held for the batch
    await vi.advanceTimersByTimeAsync(RELAY_BATCH_MS);
    expect(w.sent.map((s) => s.body.kind)).toEqual(['cmds']);
    p.post({ v: 1, kind: 'cmds', tick: 2, cmds: [] });
    p.post({ v: 1, kind: 'cmds', tick: 3, cmds: [] });
    p.post({ v: 1, kind: 'time', action: 'pause' });
    expect(w.sent.map((s) => s.body.kind)).toEqual(['cmds', 'batch', 'time']);
    expect(heard.map((m) => (m.kind === 'cmds' ? m.tick : m.kind))).toEqual([1, 2, 3, 'time']);
    // the host's own messages (clock, lungState) are never held
    far.post({ v: 1, kind: 'clock', ventTick: 80 });
    expect(w.sent.at(-1)?.body).toEqual({ v: 1, kind: 'clock', ventTick: 80 });
    p.close();
    far.close();
  });

  it('a burst larger than one message splits by count and by bytes, in order', async () => {
    const w = wirePair();
    const p = createRelayPort(w.a);
    const frame = { pawCmH2O: 12.34567, flowLps: 0.123456, volumeMl: 234.5678, fio2: 0.4, peepCmH2O: 5 };
    for (let k = 1; k <= 40; k++) p.post({ v: 1, kind: 'cmds', tick: k, cmds: [{ id: `vent-${k}-padding-padding`, issuedBy: 'ventilator', type: 'externalDrive', source: 'ventilator', frame } as Command] });
    await vi.advanceTimersByTimeAsync(RELAY_BATCH_MS);
    expect(w.sent.length).toBeGreaterThan(40 / RELAY_BATCH_MAX);
    for (const s of w.sent) expect(JSON.stringify(s.body).length).toBeLessThanOrEqual(RELAY_BODY_BYTES);
    expect(w.sent.flatMap((s) => cmdsOf(s.body).map((m) => m.tick))).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
    p.close();
  });
});

describe('the cockpit\'s settings over the relay port (R8c: on every change and once a second; hidden says so)', () => {
  it('sent at once, on a change (at the next batch), once a second; hidden: the cmds first, then the settings marked hidden', async () => {
    const w = wirePair();
    const vs = createVent();
    const p = createRelayPort(w.a, { settings: () => ({ cfg: vs.cfg, measured: { RR: vs.p.measured.RR, VTE: vs.p.measured.VTE } }) });
    const settings = () => w.sent.filter((s) => s.body.kind === 'settings').map((s) => s.body as Extract<VentWireBody, { kind: 'settings' }>);
    expect(settings()).toHaveLength(1); // at once
    expect(settings()[0]?.cfg).toEqual(vs.cfg);
    await vi.advanceTimersByTimeAsync(SETTINGS_MS);
    expect(settings()).toHaveLength(2); // once a second
    vs.cfg.rate = 18;
    p.post({ v: 1, kind: 'cmds', tick: 1, cmds: [] });
    await vi.advanceTimersByTimeAsync(RELAY_BATCH_MS);
    expect(settings()).toHaveLength(3); // the change, with the next batch
    expect(settings()[2]?.cfg.rate).toBe(18);
    p.post({ v: 1, kind: 'cmds', tick: 2, cmds: [] });
    p.setHidden(true);
    expect(w.sent.slice(-2).map((s) => s.body.kind)).toEqual(['cmds', 'settings']);
    expect(settings().at(-1)).toMatchObject({ hidden: true, cfg: { rate: 18 } });
    await vi.advanceTimersByTimeAsync(SETTINGS_MS);
    expect(settings().at(-1)).toMatchObject({ hidden: true }); // still hidden, still once a second
    p.setHidden(false);
    expect(settings().at(-1)?.hidden).toBeUndefined();
    p.close();
    const n = w.sent.length;
    await vi.advanceTimersByTimeAsync(3 * SETTINGS_MS);
    expect(w.sent).toHaveLength(n); // closed: nothing more
  });
});

describe('ventWireOver: the port over a transport (the cockpit\'s socket to the relay)', () => {
  it('stamps each body as a `vent`; hears only `vent` addressed to it (or to nobody), from the host if named', () => {
    const out: unknown[] = [];
    const fns = new Set<(m: object) => void>();
    const t = { send: (m: object) => void out.push(m), onMessage: (fn: (m: object) => void) => (fns.add(fn), () => void fns.delete(fn)) };
    const wire = ventWireOver(t, (b) => ({ v: 1, session: 'S', from: 'vent-1', seq: 1, sentAt: 0, ...b }), { self: 'vent-1', from: 'host-1' });
    const got: VentWireBody[] = [];
    wire.onBody((b) => got.push(b));
    wire.send({ v: 1, kind: 'time', action: 'pause' });
    expect(out).toEqual([{ v: 1, session: 'S', from: 'vent-1', seq: 1, sentAt: 0, kind: 'vent', body: { v: 1, kind: 'time', action: 'pause' } }]);
    const clock = { v: 1, kind: 'clock', ventTick: 9 };
    for (const fn of fns) {
      fn({ kind: 'vent', from: 'host-1', to: 'vent-1', body: clock });
      fn({ kind: 'vent', from: 'host-1', to: 'vent-2', body: clock }); // another cockpit's
      fn({ kind: 'vent', from: 'learner-1', to: 'vent-1', body: clock }); // not the host
      fn({ kind: 'event', from: 'host-1', body: [] });
    }
    expect(got).toEqual([clock]);
  });
});
