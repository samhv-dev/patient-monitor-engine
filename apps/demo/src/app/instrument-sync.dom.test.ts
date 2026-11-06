// @vitest-environment happy-dom
// Room plan R0 (docs/plans/room-and-instruments.md §7): the baseline that pins TODAY's follower and instrument behaviour
// before the room pieces change it. Two facts:
//  1. `?join=CODE` without a hash is the learner monitor at once (main.ts's follower branch): R4 puts a picker in front
//     of it only for `#/pick`, so this is what a QR of today keeps doing.
//  2. The defibrillator-profile hazard (§3.4, §4 D5): a follower's `setSkin` sends `device monitor skin` to ITS OWN engine
//     (packages/renderer/src/mount.ts, setSkin), and the device layer takes the defibrillator's and pacer's spec from the
//     skin's profile (packages/engine-core/src/l3/device-layer.ts, defibSpec/pacerSpec). So a defibrillator window that
//     wears a defibrillator skin beside a `saadat-like` host (no defibrillator: the Zoll-like fallback values,
//     defib.ts FALLBACK_DEFIB) may hold another spec than the host. Measured here with the real engines and the real
//     ViewerSync over an in-process hub, through a VF, a charge at the default energy, the shock, and pacing at the
//     default rate and mA, in the two orders a window meets: the skin put on BEFORE the snapshot (the window mounts
//     wearing it; the snapshot's device state replaces the engine's) and AFTER it (a style change, or a window whose skin
//     arrives after it has synced). PME_R0_OUT=<file> writes the measurement as JSON (for the orchestrator's gate).
import { writeFileSync } from 'node:fs';
import { ControllerSession, createInProcessHub, HostSession, ViewerSync, type ViewerTarget } from '@pme/controller';
import { createEngine, type Command, type EngineEvent, type MonitorEngine } from '@pme/engine-core';
import { afterAll, describe, expect, it, vi } from 'vitest';

const flushIo = () => new Promise((r) => setTimeout(r, 0));
const CODE = 'RZQB2N';
const HOST_SKIN = 'saadat-like';

type Status = Extract<EngineEvent, { type: 'deviceStatus' }>;

/** A host engine (the instructor's laptop on `saadat-like`) and a follower engine (the window), on one manual clock. */
async function rig(windowSkin: string, order: 'before' | 'after') {
  const clock = { wall: 1_000_000 };
  const wallNow = () => clock.wall;
  const he = createEngine({ seed: 7, device: { skin: HOST_SKIN } });
  let paused = false;
  const host = {
    dispatch: (c: Command) => he.dispatch(c),
    snapshot: () => he.snapshot(),
    restore: (s: Parameters<MonitorEngine['restore']>[0]) => he.restore(s),
    on: (fn: (e: EngineEvent) => void) => he.on(fn),
    now: () => he.now(),
    time: (a: 'pause' | 'resume' | 'scale') => void (paused = a === 'pause' ? true : a === 'resume' ? false : paused),
  };
  // The follower's monitor engine: mounted with the window's skin (createDevice with that skin, as mountMonitor does)
  const ve = createEngine({ seed: 99, device: { skin: order === 'before' ? windowSkin : HOST_SKIN } });
  const skinCmd = (): Command => ({ id: `skin-${Math.random().toString(36).slice(2)}`, issuedBy: 'renderer', type: 'device', action: { device: 'monitor', action: 'skin', value: windowSkin } }) as Command;
  if (order === 'before') ve.dispatch(skinCmd()); // what setSkin sends; the snapshot below replaces it
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
  const hub = createInProcessHub();
  const hs = new HostSession({ session: CODE, target: host, wallNow, stateIntervalMs: 0 });
  hs.addTransport(hub.connect());
  const ctl = new ControllerSession({ session: CODE, transport: hub.connect(), wallNow });
  await vi.waitFor(() => expect(ctl.hostOnline).toBe(true));
  const sync = new ViewerSync({ session: CODE, transport: hub.connect(), target: viewer, engineVersion: he.version, wallNow });
  await vi.waitFor(() => expect(sync.status).toBe('synced'));
  if (order === 'after') ve.dispatch(skinCmd()); // the window puts its skin on after it has synced
  const statuses = { host: [] as Status[], window: [] as Status[] };
  he.on((e) => void statuses.host.push(e as Status), ['deviceStatus']);
  ve.on((e) => void statuses.window.push(e as Status), ['deviceStatus']);
  const beats = { host: new Map<number, number>(), window: new Map<number, number>() };
  he.on((e) => void (e.type === 'beat' && beats.host.set(e.seq, e.t)), ['beat']);
  ve.on((e) => void (e.type === 'beat' && beats.window.set(e.seq, e.t)), ['beat']);
  const run = async (seconds: number) => {
    for (let i = 0; i < seconds * 50; i++) {
      clock.wall += 20;
      if (!paused) he.advanceTo(he.now().simT + 0.02 + 1e-9);
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

/** The largest |host − window| ECG II sample over the last `seconds` both engines hold (0: sample-identical). */
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

/** VF, a charge at the default energy, the shock once ready, then demand pacing at the default rate and mA. */
async function measure(windowSkin: string, order: 'before' | 'after', o: { energyJ?: number } = {}) {
  const r = await rig(windowSkin, order);
  await r.run(2);
  await r.ctl.send({ type: 'setRhythm', rhythm: 'vfCoarse' });
  await r.run(3);
  const chargeAt = r.he.now().simT;
  await r.ctl.send({ type: 'applyEvent', event: { kind: 'defib', action: 'charge', ...(o.energyJ ? { energyJ: o.energyJ } : {}) } });
  await r.run(14); // the charge time: 4.2 s at 120 J on every profile here; at 360 J 12.6 s by the fallback's rule
  const chargedHost = r.statuses.host.at(-1)?.defib;
  const chargedWin = r.statuses.window.at(-1)?.defib;
  await r.ctl.send({ type: 'applyEvent', event: { kind: 'defib', action: 'shock' } });
  await r.run(6);
  const shockHost = r.statuses.host.at(-1)?.defib?.lastShock ?? null;
  const shockWin = r.statuses.window.at(-1)?.defib?.lastShock ?? null;
  await r.ctl.send({ type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode: 'demand' } });
  await r.run(8);
  const pacerHost = r.statuses.host.at(-1)?.pacer ?? null;
  const pacerWin = r.statuses.window.at(-1)?.pacer ?? null;
  const ecgPacing = ecgDiff(r.he, r.ve, 6);
  // the pacer's PAUSE: LIFEPAK-like paces at 25 % of the rate, the fallback (and Zoll-like) drops the output to 0 mA
  await r.ctl.send({ type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode: 'demand', mA: 80 } });
  await r.run(6);
  const ecgCapture = ecgDiff(r.he, r.ve, 4);
  await r.ctl.send({ type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode: 'demand', pause: true } });
  await r.run(8);
  const ecgPaused = ecgDiff(r.he, r.ve, 6);
  // every beat both engines numbered: the largest time difference
  let beatDriftMs = 0;
  let beatsCompared = 0;
  for (const [seq, t] of r.beats.host) {
    const w = r.beats.window.get(seq);
    if (w === undefined) continue;
    beatsCompared++;
    beatDriftMs = Math.max(beatDriftMs, Math.abs(t - w) * 1000);
  }
  const out = {
    windowSkin,
    order,
    chargeJ: o.energyJ ?? 'default',
    ecgIIMaxDiff: { throughShockAndPacing: ecgDiff(r.he, r.ve, 20), pacingDefaultMa: ecgPacing, pacing80Ma: ecgCapture, pacerPaused: ecgPaused },
    beatsCompared,
    beatDriftMs,
    resyncs: r.sync.resyncs,
    windowProfileSkin: (r.ve as unknown as { dev: { alarms: { profile: { skin: string } } } }).dev.alarms.profile.skin,
    defibEnergyJ: { host: chargedHost?.energyJ ?? null, window: chargedWin?.energyJ ?? null },
    chargeTimeS: { host: chargedHost?.readyAt != null ? +(chargedHost.readyAt - chargeAt).toFixed(3) : null, window: chargedWin?.readyAt != null ? +(chargedWin.readyAt - chargeAt).toFixed(3) : null },
    lastShock: { host: shockHost, window: shockWin },
    pacer: { host: pacerHost, window: pacerWin },
    hrDashes: { host: r.statuses.host.at(-1)?.hrDashes ?? null, window: r.statuses.window.at(-1)?.hrDashes ?? null },
  };
  r.close();
  return out;
}

const results: Array<Awaited<ReturnType<typeof measure>>> = [];
afterAll(() => {
  const file = process.env.PME_R0_OUT;
  if (file) writeFileSync(file, `${JSON.stringify({ hostSkin: HOST_SKIN, head: process.env.PME_R0_HEAD ?? null, results }, null, 2)}\n`);
});

describe('R0: the learner monitor of a `?join=` address without a hash', () => {
  it('mounts the follower at once, on #/monitor, as a phone (data-learner=phone), over the relay of its own page', async () => {
    const calls: Array<{ code: string; net: unknown }> = [];
    vi.doMock('./views/follower.ts', async (orig) => {
      const real = await orig<typeof import('./views/follower.ts')>();
      return {
        ...real,
        mountFollower: (_s: unknown, _site: unknown, code: string, _bar: unknown, net: unknown) => {
          calls.push({ code, net });
          return { monitor: { skin: null, latchAlarms: () => {} }, style: { skin: 'saadat-like', theme: '' }, sync: null, transport: {}, destroy: () => {} };
        },
      };
    });
    vi.doMock('./sim-line.ts', () => ({ simLine: () => ({ set: () => {} }) }));
    vi.doMock('./fast-forward.ts', () => ({ mountFastForward: () => {} }));
    document.body.innerHTML = '<div id="app"></div>';
    history.replaceState(null, '', '/?join=KKQB2N');
    await import('./main.ts');
    expect(calls).toEqual([{ code: 'KKQB2N', net: { relay: `ws://${location.host}/` } }]);
    expect(location.hash).toBe('#/monitor');
    expect(document.documentElement.dataset.learner).toBe('phone');
    vi.doUnmock('./views/follower.ts');
  });
});

type M = Awaited<ReturnType<typeof measure>>;
/** The window held the host's beats, samples, energy, shock and pacer exactly. */
const identical = (m: M) => {
  expect(m.ecgIIMaxDiff).toEqual({ throughShockAndPacing: 0, pacingDefaultMa: 0, pacing80Ma: 0, pacerPaused: 0 });
  expect(m.beatsCompared).toBeGreaterThan(5);
  expect(m.beatDriftMs).toBe(0);
  expect(m.resyncs).toBe(0);
  expect(m.defibEnergyJ.window).toBe(m.defibEnergyJ.host);
  expect(m.chargeTimeS.window).toBe(m.chargeTimeS.host);
  expect(m.lastShock.window).toEqual(m.lastShock.host);
  expect(m.pacer.window).toEqual(m.pacer.host);
  expect(m.hrDashes.window).toBe(m.hrDashes.host);
};

// ≈ 4.5 s each here (20 sim-s of two engines on the main thread): above Vitest's 5 s default on a slow runner
describe('R0: a defibrillator-skinned window beside a saadat-like host (the device profile follows the skin)', { timeout: 60_000 }, () => {
  // Zoll-like's defibrillator and pacer blocks equal the fallback a saadat-like host uses (zoll-like.json, defib.ts
  // FALLBACK_DEFIB, pacer.ts FALLBACK_PACER): whatever order the skin comes in, nothing the device layer computes differs
  it('zoll-like, skin on before the snapshot: the snapshot puts the host profile back; identical at the default energy', async () => {
    const m = await measure('zoll-like', 'before');
    results.push(m);
    expect(m.windowProfileSkin).toBe(HOST_SKIN);
    identical(m);
    expect(m.defibEnergyJ.host).toBe(120);
  });
  it('zoll-like, skin on after the snapshot: the window engine holds the zoll-like profile, and it is still identical (default energy)', async () => {
    const m = await measure('zoll-like', 'after');
    results.push(m);
    expect(m.windowProfileSkin).toBe('zoll-like');
    identical(m);
  });
  it('zoll-like, skin on after the snapshot, a 360 J charge: identical (the same 7 s / 200 J charge rule, 12.62 s)', async () => {
    const m = await measure('zoll-like', 'after', { energyJ: 360 });
    results.push(m);
    identical(m);
    expect(m.chargeTimeS.host).toBe(12.62);
  });
  it('lifepak-like, skin on before the snapshot: the snapshot puts the host profile back; identical (the skin is the look only)', async () => {
    const m = await measure('lifepak-like', 'before');
    results.push(m);
    expect(m.windowProfileSkin).toBe(HOST_SKIN);
    identical(m);
  });
  // The plan expected a 200 J default on the window (lifepak-like.json energyAdultJ) against the host's 120 J. It is not
  // so: the selected energy is device STATE, and the snapshot carries the host's (120 J); a skin switch replaces the
  // profile only (device-layer.ts, 'monitor' action → setProfile), never the state. What the profile changes is how the
  // window's own engine computes from then on
  it('lifepak-like, skin on after the snapshot: the same 120 J and the same shock, but HR dashes while pacing and paced beats during PAUSE (25 % rate) where the host gives 0 mA', async () => {
    const m = await measure('lifepak-like', 'after');
    results.push(m);
    expect(m.windowProfileSkin).toBe('lifepak-like');
    expect(m.defibEnergyJ).toEqual({ host: 120, window: 120 });
    expect(m.chargeTimeS).toEqual({ host: 4.22, window: 4.22 }); // 120 J × 7 s / 200 J on both rules
    expect(m.lastShock.window).toEqual(m.lastShock.host);
    expect(m.ecgIIMaxDiff.throughShockAndPacing).toBeGreaterThan(1); // from the pause on
    expect(m.ecgIIMaxDiff.pacingDefaultMa).toBe(0);
    expect(m.ecgIIMaxDiff.pacing80Ma).toBe(0);
    expect(m.ecgIIMaxDiff.pacerPaused).toBeGreaterThan(1);
    expect(m.hrDashes).toEqual({ host: false, window: true });
  });
  it('lifepak-like, skin on after the snapshot, a 360 J charge: ready 2.6 s early on the window (its table, 10 s at 360 J, against 12.62 s)', async () => {
    const m = await measure('lifepak-like', 'after', { energyJ: 360 });
    results.push(m);
    expect(m.defibEnergyJ).toEqual({ host: 360, window: 360 });
    expect(m.chargeTimeS).toEqual({ host: 12.62, window: 10.02 });
    expect(m.lastShock.window).toEqual(m.lastShock.host); // the shock is the host's command, mirrored once both are ready
  });
});
