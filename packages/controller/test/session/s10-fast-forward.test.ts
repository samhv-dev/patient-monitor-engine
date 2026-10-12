// Stage 10 Task 3 (the owner's fast-forward, 22 Oct demonstration): the host runs `time jump` in steps outside its
// command chain, refuses controllers' commands meanwhile, and every controller and viewer sees it start and end.
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { FF_MAX_S, HostSession, type HostSessionOptions } from '../../src/session/host-session.ts';
import { ViewerSync } from '../../src/session/viewer-sync.ts';
import type { WireEvent } from '../../src/protocol.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { manualViewer } from '../fakes/manual-viewer.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'FFW234';
const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
});

/** A host whose monitor fast-forwards one step per macrotask (as a worker answers), and a controller. `during(k)` runs
 *  before the k-th step (k = 0: the empty step that reads the monitor's tick). */
async function rig(o: Partial<HostSessionOptions> = {}, ff = true, during: (k: number, host: ReturnType<typeof manualHost>) => void = () => {}) {
  const host = manualHost({ seed: 7, truthHz: 1 });
  const steps: Array<{ n: number; last: boolean }> = [];
  const target = ff
    ? Object.assign(host, {
        fastForwardStep: async (n: number, last: boolean) => {
          await new Promise((r) => setTimeout(r, 0));
          during(steps.length, host);
          steps.push({ n, last });
          host.engine.advanceTo((host.engine.now().tick + n) * 0.02 + 1e-9);
          return host.engine.now();
        },
      })
    : host;
  const hub = createInProcessHub();
  const hs = new HostSession({ session: S, target, stateIntervalMs: 0, ...o });
  hs.addTransport(hub.connect());
  const ctl = new ControllerSession({ session: S, transport: hub.connect(), issuedBy: 'panel' });
  cleanup.push(() => ctl.close(), () => hs.close());
  await waitFor(() => ctl.hostOnline);
  return { host, hs, hub, ctl, steps };
}

describe('Stage 10: fast-forward on the host', () => {
  it('runs exactly the asked span in steps; the last step releases the clock; controllers see start and end', async () => {
    const r = await rig();
    r.host.engine.advanceTo(10);
    const seen: WireEvent[] = [];
    const watcher = collect(r.hub.connect());
    const ack = await r.ctl.send({ type: 'time', action: 'jump', value: 300 });
    expect(ack.accepted).toBe(true);
    expect(r.hs.fastForwarding).toBe(true);
    await waitFor(() => r.ctl.fastForward !== null, 2000, 'start seen');
    expect(r.ctl.fastForward).toEqual({ fromT: 10, toT: 310 });
    await waitFor(() => r.ctl.lastFastForward !== null, 60_000, 'end seen');
    expect(r.host.engine.now().tick).toBe(15_500);
    expect(r.steps.reduce((a, s) => a + s.n, 0)).toBe(15_000);
    expect(r.steps[0]).toEqual({ n: 0, last: false }); // the empty first step: the span starts at the monitor's own tick
    expect(r.steps.filter((s) => s.last)).toHaveLength(1);
    expect(r.steps.at(-1)!.last).toBe(true);
    expect(r.ctl.fastForward).toBeNull();
    expect(r.ctl.lastFastForward).toEqual({ fromT: 10, toT: 310, endT: 310, alarms: [] });
    for (const m of watcher) if (m.kind === 'event') seen.push(...m.body);
    const ff = seen.filter((e) => e.type === 'fastForward');
    expect(ff.map((e) => (e as { phase: string }).phase)).toEqual(['start', 'end']);
    // the span's events reached the peers in order: measurements every second of it
    const ts = seen.filter((e) => e.type === 'measurement').map((e) => (e as { t: number }).t).filter((t) => t > 10 && t <= 310);
    expect(ts.length).toBeGreaterThan(290);
    expect(ts.every((t, i) => i === 0 || t >= (ts[i - 1] as number))).toBe(true);
  }, 240_000); // ≈ 15 s alone; the full suite on a loaded machine took 69 s

  it("refuses a controller's commands while it runs (with the reason) and takes them again after", async () => {
    const r = await rig();
    await r.ctl.send({ type: 'time', action: 'jump', value: 60 });
    const during = await r.ctl.send({ type: 'setTarget', variable: 'hr', value: 120 });
    expect(during.accepted).toBe(false);
    expect(during.reason).toMatch(/fast-forwarding/);
    expect((await r.ctl.send({ type: 'time', action: 'scale', value: 8 })).accepted).toBe(false);
    await waitFor(() => r.ctl.lastFastForward !== null, 30_000);
    expect((await r.ctl.send({ type: 'setTarget', variable: 'hr', value: 120 })).accepted).toBe(true);
  }, 180_000);

  it('refuses what it cannot run: no fast-forward monitor, a bad span, a second one', async () => {
    const plain = await rig({}, false);
    expect((await plain.ctl.send({ type: 'time', action: 'jump', value: 300 })).reason).toBe('this monitor cannot fast-forward');
    expect((await plain.ctl.send({ type: 'time', action: 'step', value: 1 })).reason).toBe('time step is not supported');
    const r = await rig();
    for (const v of [0, -5, FF_MAX_S + 1, Number.NaN]) expect((await r.ctl.send({ type: 'time', action: 'jump', value: v })).reason).toBe('fast-forward must be 0–600 s');
    expect((await r.ctl.send({ type: 'time', action: 'jump' })).accepted).toBe(false);
    // a second jump from a second controller while the first runs
    const ctl2 = new ControllerSession({ session: S, transport: r.hub.connect(), issuedBy: 'remote' });
    cleanup.push(() => ctl2.close());
    await waitFor(() => ctl2.hostOnline);
    await r.ctl.send({ type: 'time', action: 'jump', value: 30 });
    expect((await ctl2.send({ type: 'time', action: 'jump', value: 30 })).accepted).toBe(false);
    await waitFor(() => r.ctl.lastFastForward !== null, 30_000);
  }, 180_000);

  it('a controller that joins during the fast-forward sees it running (the sticky jump)', async () => {
    const r = await rig();
    r.host.engine.advanceTo(4);
    await r.ctl.send({ type: 'time', action: 'jump', value: 120 });
    const late = new ControllerSession({ session: S, transport: r.hub.connect(), issuedBy: 'remote' });
    cleanup.push(() => late.close());
    await waitFor(() => late.hostOnline);
    expect(late.fastForward).toEqual({ fromT: 4, toT: 124 });
    await waitFor(() => late.lastFastForward !== null, 30_000);
    expect(late.fastForward).toBeNull();
  }, 180_000);

  it('a new timeline (patient restart) stops the fast-forward and says why', async () => {
    const r = await rig();
    await r.ctl.send({ type: 'time', action: 'jump', value: 300 });
    await waitFor(() => r.steps.length > 3);
    r.hs.newTimeline();
    await waitFor(() => r.ctl.lastFastForward !== null, 10_000);
    expect(r.ctl.lastFastForward?.stopped).toBe('a new patient or scenario started');
    expect(r.hs.fastForwarding).toBe(false);
    expect(r.host.engine.now().tick).toBeLessThan(15_000);
  }, 120_000);

  it('a viewer waits through the fast-forward and starts again from the host at its end', async () => {
    const clock = { wall: 1_000_000 };
    const r = await rig({ wallNow: () => clock.wall });
    const v = manualViewer({ seed: 7, truthHz: 1 });
    const sync = new ViewerSync({ session: S, transport: r.hub.connect(), target: v, engineVersion: r.host.engine.version, wallNow: () => clock.wall });
    cleanup.push(() => sync.close());
    await waitFor(() => sync.status === 'synced');
    await r.ctl.send({ type: 'time', action: 'jump', value: 60 });
    await waitFor(() => r.steps.length > 6);
    sync.follow();
    expect(v.paused).toBe(true);
    expect(sync.fastForwardAt).toBeGreaterThan(1); // the host's time during it (the second screen's panel clock)
    expect(sync.fastForward).toEqual({ fromT: 0, toT: 60 }); // the second screen's marker reads it
    const before = sync.resyncs;
    await waitFor(() => r.ctl.lastFastForward !== null, 30_000);
    await waitFor(() => sync.status === 'synced' && sync.resyncs === before + 1, 5000);
    expect(v.engine.now().tick).toBe(r.host.engine.now().tick); // the snapshot at the end of the span
    expect(sync.fastForward).toBeNull();
    expect(sync.lastFastForward).toEqual({ fromT: 0, toT: 60, endT: 60, alarms: [] });
  }, 180_000);

  // Orchestrator ruling 2026-10-11 (CI run 38166128702: 4568 ms against < 4000; Stage 12/13 saw 5.35 s and 7.5 s): a
  // real-wall-clock upper bound cannot hold on a shared runner. The pace is asserted exactly on a fake clock; one real-time
  // smoke check keeps only a lower bound, which load cannot break.
  it('is paced to the wall time it is given (owner: ≈ 10 s, so the room sees it); the start event carries the pace — fake clock, exact', async () => {
    const clock = { wall: 5_000_000 };
    const waits: number[] = [];
    const r = await rig({
      fastForwardWallMs: 1500,
      wallNow: () => clock.wall,
      sleep: async (ms) => {
        waits.push(ms);
        clock.wall += ms; // the steps themselves take no time on this clock: every wait is the pace
      },
    });
    const watcher = collect(r.hub.connect());
    await r.ctl.send({ type: 'time', action: 'jump', value: 120 }); // the owner's 2-minute span (the CPR pulse-check interval)
    await waitFor(() => r.ctl.lastFastForward !== null, 30_000);
    expect(r.host.engine.now().tick).toBe(6000);
    // 240 steps of 25 ticks: a wait of 1500 × 25 / 6000 = 6.25 ms after each but the last
    expect(waits).toHaveLength(239);
    for (const w of waits) expect(w).toBeCloseTo(6.25, 9);
    expect(clock.wall - 5_000_000).toBeCloseTo((1500 * 239) / 240, 9);
    const start = watcher.flatMap((m) => (m.kind === 'event' ? m.body : [])).find((e) => e.type === 'fastForward' && (e as { phase: string }).phase === 'start');
    expect(start).toMatchObject({ phase: 'start', wallMs: 1500, fromT: 0, toT: 120 });
  }, 180_000);

  it('real time: a paced span never finishes early (lower bound only; load can only make it slower)', async () => {
    const r = await rig({ fastForwardWallMs: 1500 });
    const w0 = performance.now();
    await r.ctl.send({ type: 'time', action: 'jump', value: 120 });
    await waitFor(() => r.ctl.lastFastForward !== null, 120_000);
    expect(performance.now() - w0).toBeGreaterThanOrEqual(1400);
    expect(r.host.engine.now().tick).toBe(6000);
  }, 180_000);

  it('the end lists every alarm raised during it once, with when, and whether it came and went (latched on the monitor)', async () => {
    const lim = (param: string, v: { low?: number; high?: number }) => ({ id: `lim-${param}-${Math.random()}`, issuedBy: 'test', type: 'device', action: { device: 'alarm', action: 'setLimit', param, ...v } }) as never;
    const r = await rig({}, true, (k, host) => {
      if (k === 10) host.engine.dispatch(lim('HR', { high: 70 })); // HR HIGH (HR 75) raised at ≈ 10 s …
      if (k === 60) host.engine.dispatch(lim('HR', { high: 150 })); // … and gone at ≈ 30 s
      if (k === 80) host.engine.dispatch(lim('HR', { low: 120 })); // EXTREME BRADY from ≈ 40 s to the end
    });
    await r.ctl.send({ type: 'time', action: 'jump', value: 60 });
    await waitFor(() => r.ctl.lastFastForward !== null, 30_000);
    const al = r.ctl.lastFastForward?.alarms ?? [];
    expect(al.map((a) => [a.text, a.ended])).toEqual([
      [expect.stringMatching(/HR/), true],
      [expect.stringMatching(/BRADY/), false],
    ]);
    expect(al[0]!.since).toBeGreaterThan(5);
    expect(al[0]!.since).toBeLessThan(30);
    expect(al[1]!.since).toBeGreaterThan(39);
  }, 180_000);
});
