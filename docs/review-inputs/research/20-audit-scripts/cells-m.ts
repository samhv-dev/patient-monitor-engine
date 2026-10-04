// DV MANUAL twins (research/12 §2.2: every arrest cell and every P1 haemodynamic cell also runs in MANUAL). Q9 is open,
// so the expected response is direction-only (the instructor's targets plus the non-reflex physiology).
import { A, mean, r1 } from './runner.ts';
import { add, cpr, m, pulseAt, rh, shock, sustained, TVF, V, VF, w, XA } from './spec.ts';

const MAN = { mode: 'manual' as const, dt: 5 };
add({ id: 'DV-M1', tier: 'P1', ctx: 'X-A ventilated, MANUAL (MODELED twin DV-02a/b)', state: 'VF (instructor)', intv: 'CPR q 0.8 from 120 s', sys: 'CIRC LUNG',
  arms: { i: V([VF, cpr(120, 0.8)], 600, XA, MAN) },
  measure: (R) => m({ cpp: w(R.i!.rows, 'cpp', 180, 600), etco2: w(R.i!.rows, 'etco2', 180, 600), map: w(R.i!.rows, 'map', 180, 600) }),
  expect: [{ m: 'cpp', dir: 1, tol: 15, src: 'Q9 open: CPR physiology is instructor-independent — CoPP ≥ 15 as in MODELED (direction only)' }], dirOnly: true, owner: 'Q9 (MANUAL physiology)' });
add({ id: 'DV-M2', tier: 'P1', ctx: 'X-A ventilated, MANUAL (MODELED twin DV-03)', state: 'bleed 3 L / 10 min', intv: 'CPR q 0.8 alone from 720 s', sys: 'CIRC RHY',
  arms: { i: V([[60, A.bleed(3000, 600), 'bleed 3 L'], cpr(720, 0.8)], 1320, XA, MAN) },
  measure: (R) => { const r = R.i!.rows; return m({ arrestAtS: (r.find((x) => x.arrest !== '')?.t as number) ?? NaN, mapMin: r1(Math.min(...r.filter((x) => (x.t as number) < 720).map((x) => x.map as number))), pulseUnderCpr: Number.isFinite(pulseAt(r, 725, 1320)), rhythms: rh(R.i!) }); },
  expect: [{ m: 'pulseUnderCpr', event: false, src: 'Q9 / FU-4 D6: MANUAL reaches arrest only through the no-flow rule; an empty heart still cannot be pumped (direction only)' }], dirOnly: true, owner: 'Q9 / FU-4 D6' });
add({ id: 'DV-M3', tier: 'P1', ctx: 'X-A ventilated, MANUAL (MODELED twin DV-01c early arm)', state: 'VF 60 s', intv: 'shock 200 J pre-selected to sinus: the post-ROSC pressure ramp (brief §6.5: 50 % → 100 % of the targets over 30–120 s)', sys: 'CIRC DEV',
  arms: { i: V([VF, ...shock(120, 200, { pre: 'sinus' })], 420, XA, { mode: 'manual', dt: 1 }) },
  measure: (R) => { const r = R.i!.rows; const base = mean(r, 'sbp', 30, 55); return m({ sbpBase: r1(base), sbpAt10s: r1(r.find((x) => x.t === 135)!.sbp as number), fracAt10s: r1((r.find((x) => x.t === 135)!.sbp as number) / base), sbpAt3min: w(r, 'sbp', 290, 310), sustained: sustained(r, 135, 420) }); },
  expect: [{ m: 'fracAt10s', lo: 0.4, hi: 0.8, src: 'brief §6.5 (after successful termination: pressures ramp from 50 % to 100 % of the targets over 30–120 s) — the device layer\'s own design (direction)' }], dirOnly: true, owner: '4b device-layer.ts ROSC ramp' });
add({ id: 'DV-M4', tier: 'P1', ctx: 'X-A ventilated, MANUAL (MODELED twin DV-08b)', state: 'CHB 30', intv: 'TCP fixed 70 ppm 100 mA', sys: 'RHY CIRC',
  arms: { i: V([[TVF, A.rhythm('avb3Wide', { rateBpm: 30 }), 'CHB 30'], [300, A.pacer('fixed', { ratePpm: 70, mA: 100 }), 'TCP 100 mA']], 600, XA, MAN) },
  measure: (R) => m({ mapChb: w(R.i!.rows, 'map', 240, 300), mapPaced: w(R.i!.rows, 'map', 400, 600), dMap: r1(mean(R.i!.rows, 'map', 400, 600) - mean(R.i!.rows, 'map', 240, 300)), hrPaced: w(R.i!.rows, 'hr', 400, 600) }),
  expect: [{ m: 'hrPaced', lo: 65, hi: 75, src: 'capture at the set rate (direction; MANUAL pressure is the instructor\'s)' }], dirOnly: true, owner: 'Q9' });

// MANUAL twin of DV-13b: the instructor's cardiogenic-shock rig (the only way to author a shock state today).
const MAN_CS: [number, any, string][] = [[30, A.target('contractility', 0.4), 'contractility 0.4'], [30, A.target('sbp', 85), 'SBP 85'], [30, A.target('dbp', 55), 'DBP 55']];
add({ id: 'DV-M5', tier: 'P1', ctx: 'HFrEF 60 y ventilated, MANUAL cardiogenic-shock rig (contractility 0.4, SBP/DBP 85/55; MODELED twin DV-13b)', state: 'cardiogenic shock (instructor): SV 34 mL, CO ≈ 2.6, PAWP 24', intv: 'IABP 1:1, correct timing: when does the balloon deflate?', sys: 'CIRC DEV',
  arms: { i: V([...MAN_CS, [400, A.iabp('start', { ratio: 1 }), 'IABP 1:1']], 700, { ageY: 60, weightKg: 80, conditions: [{ id: 'hfref' }] }, { mode: 'manual', dt: 5, fine: [[600, 615]] }) },
  measure: (R) => { const f = R.i!.fine; const opens: number[] = []; let o = false; for (const x of f) { const n = x.qAv > 1; if (n && !o) opens.push(x.t); o = n; }
    const pairs = [...new Map(f.filter((x) => x.iabpIn > 0).map((x) => [x.iabpIn, x.iabpOut])).entries()];
    const lags = pairs.map(([i, d]) => { const nx = opens.find((t) => t > i); return nx === undefined ? NaN : 1000 * (d - nx); }).filter(Number.isFinite);
    return m({ deflLagMs: r1(lags.reduce((a, b) => a + b, 0) / lags.length), co: w(R.i!.rows, 'co', 600, 700), pawp: w(R.i!.rows, 'pawp', 600, 700) }); },
  expect: [{ m: 'deflLagMs', lo: -150, hi: -20, src: 'tables §8.1: deflation just before systole (the balloon is empty at aortic opening) — the MODELED rig gives −184 ms' }],
  hand: { verdict: 'WR', why: 'in MANUAL the balloon deflates ≈ 270 ms AFTER the next aortic opening: every correctly set balloon is late deflation (assisted EDP +8.8 instead of −15.8), because the schedule comes from the MANUAL beat record (hemo/pipeline.ts:285–288 → devices.ts:48–54) whose timing differs from the MODELED one; the instructor\'s cardiogenic-shock rig — the only shock rig there is — cannot teach a correctly timed IABP' },
  owner: 'new: hemo/pipeline.ts onCircBeat → devices.ts iabpOnBeat (schedule from the R wave / the next beat, not the completed beat record)' });
