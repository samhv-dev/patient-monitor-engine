// Room plan R5a's acceptance (docs/plans/room-and-instruments.md §7 R5a): R0's measurement turned into an EQUALITY. R0
// (scratch/room-plan-gate/r0.json, the test apps/demo/src/app/instrument-sync.dom.test.ts of Room PR 1) measured a
// defibrillator-skinned window beside a `saadat-like` host: a window whose engine wears `lifepak-like` after the snapshot
// was READY 2.6 s early at 360 J (its table, 10 s, against the fallback's 12.62 s), and the low-energy outcome rule read
// that skin's 200 J default. With the room's model set by the HOST (`device defib model generic`, which every follower
// replays), the window's spec is the model's whatever its skin. Same rig as R0: the real engines and the real ViewerSync
// over an in-process hub, VF, a charge, the shock, then demand pacing at the defaults. PME_R5A_OUT=<file> writes the
// measurement (before = no model, after = the model) as JSON for the orchestrator's gate. Row 58 (research/41, owner's
// ruling of 6 November): the PACER follows the model too, so R0's last divergence (the LIFEPAK-like window pacing at
// 25 % of the rate through PAUSE where the host is at 0 mA, and its HR dashes) is an equality as well; PME_R58_OUT=<file>
// writes the same measurement for that gate.
import { writeFileSync } from 'node:fs';
import { ControllerSession, createInProcessHub, HostSession, ViewerSync, type ViewerTarget } from '@pme/controller';
import { createEngine, type Command, type EngineEvent, type MonitorEngine } from '@pme/engine-core';
import { afterAll, describe, expect, it, vi } from 'vitest';

const flushIo = () => new Promise((r) => setTimeout(r, 0));
const CODE = 'RZQB2N';
const HOST_SKIN = 'saadat-like';
type Status = Extract<EngineEvent, { type: 'deviceStatus' }>;
interface Run { windowSkin: string; order: 'before' | 'after'; energyJ?: number; model: string | null }

async function rig(windowSkin: string, order: 'before' | 'after') {
  const clock = { wall: 1_000_000 };
  const wallNow = () => clock.wall;
  const he = createEngine({ seed: 7, device: { skin: HOST_SKIN } });
  const ve = createEngine({ seed: 99, device: { skin: order === 'before' ? windowSkin : HOST_SKIN } });
  const skinCmd = (): Command => ({ id: `skin-${Math.random().toString(36).slice(2)}`, issuedBy: 'renderer', type: 'device', action: { device: 'monitor', action: 'skin', value: windowSkin } }) as Command;
  if (order === 'before') ve.dispatch(skinCmd());
  const v = { t: 0, paused: true, rate: 1 };
  const viewer: ViewerTarget = {
    restore(s) {
      ve.restore(s);
      v.t = s.tick * 0.02;
    },
    dispatch: (c) => ve.dispatch(c),
    on: (fn, types) => ve.on(fn, types),
    renderT: () => v.t,
    tick: () => ve.now().tick,
    setRate: (k) => void (v.rate = k),
    setPaused: (p) => void (v.paused = p),
    jumpTo(simT) {
      v.t = simT;
      ve.advanceTo(simT);
    },
  };
  const host = { dispatch: (c: Command) => he.dispatch(c), snapshot: () => he.snapshot(), restore: (s: Parameters<MonitorEngine['restore']>[0]) => he.restore(s), on: (fn: (e: EngineEvent) => void) => he.on(fn), now: () => he.now(), time: () => {} };
  const hub = createInProcessHub();
  const hs = new HostSession({ session: CODE, target: host, wallNow, stateIntervalMs: 0 });
  hs.addTransport(hub.connect());
  const ctl = new ControllerSession({ session: CODE, transport: hub.connect(), wallNow });
  await vi.waitFor(() => expect(ctl.hostOnline).toBe(true));
  const sync = new ViewerSync({ session: CODE, transport: hub.connect(), target: viewer, engineVersion: he.version, wallNow });
  await vi.waitFor(() => expect(sync.status).toBe('synced'));
  if (order === 'after') ve.dispatch(skinCmd());
  const statuses = { host: [] as Status[], window: [] as Status[] };
  he.on((e) => void statuses.host.push(e as Status), ['deviceStatus']);
  ve.on((e) => void statuses.window.push(e as Status), ['deviceStatus']);
  const beats = { host: new Map<number, number>(), window: new Map<number, number>() };
  he.on((e) => void (e.type === 'beat' && beats.host.set(e.seq, e.t)), ['beat']);
  ve.on((e) => void (e.type === 'beat' && beats.window.set(e.seq, e.t)), ['beat']);
  const run = async (seconds: number) => {
    for (let i = 0; i < seconds * 50; i++) {
      clock.wall += 20;
      he.advanceTo(he.now().simT + 0.02 + 1e-9);
      if (i % 10 === 0) hs.emitState();
      await flushIo();
      sync.follow();
      if (!v.paused) {
        v.t += 0.02 * v.rate;
        ve.advanceTo(v.t);
      }
    }
  };
  return { he, ve, ctl, sync, run, statuses, beats, close: () => (hs.close(), ctl.close(), sync.close()) };
}

function ecgDiff(a: MonitorEngine, b: MonitorEngine, seconds: number): number {
  const end = Math.min(a.latestSampleIndex('ecgII'), b.latestSampleIndex('ecgII')) - 60;
  const n = seconds * 500;
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  a.readSamples('ecgII', end - n, x);
  b.readSamples('ecgII', end - n, y);
  let m = 0;
  for (let i = 0; i < n; i++) m = Math.max(m, Math.abs((x[i] as number) - (y[i] as number)));
  return m;
}

async function measure(o: Run) {
  const r = await rig(o.windowSkin, o.order);
  // the room's model, sent by the host's command path (the instructor's Room setup, R5b): the follower replays it
  if (o.model) await r.ctl.send({ type: 'device', action: { device: 'defib', action: 'model', value: o.model } } as never);
  await r.run(2);
  await r.ctl.send({ type: 'setRhythm', rhythm: 'vfCoarse' });
  await r.run(3);
  const chargeAt = r.he.now().simT;
  await r.ctl.send({ type: 'applyEvent', event: { kind: 'defib', action: 'charge', ...(o.energyJ ? { energyJ: o.energyJ } : {}) } });
  await r.run(14);
  const ch = { host: r.statuses.host.at(-1)?.defib, window: r.statuses.window.at(-1)?.defib };
  await r.ctl.send({ type: 'applyEvent', event: { kind: 'defib', action: 'shock' } });
  await r.run(6);
  const shock = { host: r.statuses.host.at(-1)?.defib?.lastShock ?? null, window: r.statuses.window.at(-1)?.defib?.lastShock ?? null };
  await r.ctl.send({ type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode: 'demand' } });
  await r.run(8);
  const ecgPacing = ecgDiff(r.he, r.ve, 6);
  const pacer = { host: r.statuses.host.at(-1)?.pacer ?? null, window: r.statuses.window.at(-1)?.pacer ?? null };
  // as R0: 80 mA (capture, so the beats compare), then PAUSE (the model's pause behaviour when one is set, row 58)
  await r.ctl.send({ type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode: 'demand', mA: 80 } });
  await r.run(6);
  const ecgCapture = ecgDiff(r.he, r.ve, 4);
  await r.ctl.send({ type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode: 'demand', pause: true } });
  await r.run(8);
  const ecgPaused = ecgDiff(r.he, r.ve, 6);
  let beatDriftMs = 0;
  let beatsCompared = 0;
  for (const [seq, t] of r.beats.host) {
    const w = r.beats.window.get(seq);
    if (w === undefined) continue;
    beatsCompared++;
    beatDriftMs = Math.max(beatDriftMs, Math.abs(t - w) * 1000);
  }
  const ready = (d: typeof ch.host) => (d?.readyAt != null ? +(d.readyAt - chargeAt).toFixed(3) : null);
  const out = {
    windowSkin: o.windowSkin,
    order: o.order,
    model: o.model,
    chargeJ: o.energyJ ?? 'default',
    defibEnergyJ: { host: ch.host?.energyJ ?? null, window: ch.window?.energyJ ?? null },
    chargeTimeS: { host: ready(ch.host), window: ready(ch.window) },
    readyTick: { host: ch.host?.readyAt != null ? Math.round(ch.host.readyAt / 0.02) : null, window: ch.window?.readyAt != null ? Math.round(ch.window.readyAt / 0.02) : null },
    lastShock: shock,
    pacer,
    ecgIIMaxDiff: { throughShockAndPacing: ecgDiff(r.he, r.ve, 20), pacingDefaultMa: ecgPacing, pacing80Ma: ecgCapture, pacerPaused: ecgPaused },
    beatsCompared,
    beatDriftMs,
    resyncs: r.sync.resyncs,
    hrDashes: { host: r.statuses.host.at(-1)?.hrDashes ?? null, window: r.statuses.window.at(-1)?.hrDashes ?? null },
  };
  r.close();
  return out;
}
type M = Awaited<ReturnType<typeof measure>>;

const results: M[] = [];
afterAll(() => {
  for (const file of [process.env.PME_R5A_OUT, process.env.PME_R58_OUT]) {
    if (file) writeFileSync(file, `${JSON.stringify({ hostSkin: HOST_SKIN, head: process.env.PME_R5A_HEAD ?? null, results }, null, 2)}\n`);
  }
});

/** The defibrillator agrees: energy, charge time, READY tick and the shock (time, energy, outcome). */
const defibEqual = (m: M) => {
  expect(m.defibEnergyJ.window).toBe(m.defibEnergyJ.host);
  expect(m.chargeTimeS.window).toBe(m.chargeTimeS.host);
  expect(m.readyTick.window).toBe(m.readyTick.host);
  expect(m.lastShock.window).toEqual(m.lastShock.host);
};
/** And nothing else drifted: samples, beats, the pacer (the learner monitor's sync: 0 drift, no resync). */
const identical = (m: M) => {
  defibEqual(m);
  expect(m.ecgIIMaxDiff).toEqual({ throughShockAndPacing: 0, pacingDefaultMa: 0, pacing80Ma: 0, pacerPaused: 0 });
  expect(m.beatsCompared).toBeGreaterThan(5);
  expect(m.beatDriftMs).toBe(0);
  expect(m.resyncs).toBe(0);
  expect(m.pacer.window).toEqual(m.pacer.host);
  expect(m.hrDashes.window).toBe(m.hrDashes.host);
};

describe('R5a acceptance: the room\'s defibrillator model, set by the host, holds on a window of any skin', { timeout: 60_000 }, () => {
  it('before (no model): a lifepak-like window at 360 J is READY 2.6 s early, paces at 25 % through PAUSE and dashes HR — R0\'s pinned divergences, reproduced', async () => {
    const m = await measure({ windowSkin: 'lifepak-like', order: 'after', energyJ: 360, model: null });
    results.push(m);
    expect(m.chargeTimeS).toEqual({ host: 12.62, window: 10.02 });
    expect(m.readyTick.window).toBeLessThan(m.readyTick.host as number);
    expect(m.ecgIIMaxDiff.pacingDefaultMa).toBe(0);
    expect(m.ecgIIMaxDiff.pacing80Ma).toBe(0);
    expect(m.ecgIIMaxDiff.pacerPaused).toBeGreaterThan(1);
    expect(m.hrDashes).toEqual({ host: false, window: true });
  });
  for (const order of ['before', 'after'] as const) {
    for (const energyJ of [undefined, 360]) {
      it(`zoll-like window (the generic model's look), skin on ${order} the snapshot, ${energyJ ?? 'default'} J: identical through charge, shock and pacing`, async () => {
        const m = await measure({ windowSkin: 'zoll-like', order, model: 'generic', ...(energyJ ? { energyJ } : {}) });
        results.push(m);
        identical(m);
        expect(m.defibEnergyJ.host).toBe(energyJ ?? 120);
        expect(m.chargeTimeS.host).toBe(energyJ ? 12.62 : 4.22);
      });
    }
  }
  for (const order of ['before', 'after'] as const) {
    for (const energyJ of [undefined, 360]) {
      it(`lifepak-like window, skin on ${order} the snapshot, ${energyJ ?? 'default'} J, model generic: the divergences are an EQUALITY (defibrillator, pacing at the defaults, at 80 mA and through PAUSE, HR)`, async () => {
        const m = await measure({ windowSkin: 'lifepak-like', order, model: 'generic', ...(energyJ ? { energyJ } : {}) });
        results.push(m);
        identical(m);
        expect(m.defibEnergyJ).toEqual({ host: energyJ ?? 120, window: energyJ ?? 120 });
        expect(m.chargeTimeS).toEqual(energyJ ? { host: 12.62, window: 12.62 } : { host: 4.22, window: 4.22 });
        expect(m.hrDashes).toEqual({ host: false, window: false });
      });
    }
  }
});
