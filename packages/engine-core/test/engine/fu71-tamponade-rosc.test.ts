// FU-7.1 B4 (research/24 P3b; owner ruling 2026-10-07 + research/26 T4, Perkins 2025 JAMA Surg n = 601: relieving a
// tamponade during CPR is the single most survivable mechanical cause of arrest — ≈ 21 % survival to discharge, and
// none beyond 15 min of arrest): draining the pericardium during good CPR must bring the patient back BY ITSELF, with
// no exogenous fluid — in tamponade the systemic venous pressure is HIGH, so the filling the drainage restores comes
// from the patient's own reservoir. On main it did not: compressions at quality 0.8–1.0 and 100–120/min left the mean
// CPR coronary perfusion pressure at 14.4–14.7 mmHg against `CPP_ROSC` 15 and never reached ROSC, while 1 L of
// crystalloid at CPR start did (mean CoPP 18.6, ROSC +250 s) — the defect this task fixes (two causes, both in
// `l2/circ`: the recruited venous volume was withdrawn with the vasopressor EFFECT in the arrest, and the RV ischaemia
// index froze while there was no beat, so a heart that did regain a pulse re-arrested within 2 s on a stale number).
// Rig: the showcase-tamponade patient (58 y, 80 kg, CVP line), `tamponade 1`, propofol 2 mg/kg at 300 s → PEA at
// +116 s; CPR and `tamponade 0` at the declaration; ETT + VCV 10 × 500 FiO2 1 from +30 s. No drug in either arm.
// SLOW (≈ 60 s wall for the three arms); one yield per two sim-seconds.
import { describe, expect, it } from 'vitest';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

const PT = { ageY: 58, sex: 'M' as const, weightKg: 80, heightCm: 175, sensors: { cvp: 'connected' as const } };

interface Arm { tArrest: number; cppMean: number; holdMax: number; rosc: number; heldS: number }

async function arm(opts: { quality: number; rate: number; drain: boolean; fluidMl?: number }): Promise<Arm> {
  const e = rig6(PT);
  let cpp = 0;
  e.on((x) => { if (x.type === 'circ') cpp = (x as unknown as { cpp: number }).cpp; });
  await runTo(e, 1);
  send(e, { kind: 'condition', id: 'tamponade', severity: 1 });
  await runTo(e, 300);
  send(e, { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' });
  let tA = -1; let tR = -1; let sum = 0; let n = 0; let holdMax = 0; let reArrest = -1;
  for (let u = 302; u <= 300 + 1200; u += 2) {
    await runTo(e, u, undefined, 2);
    const c = st6(e).hemo.circ;
    if (u === 330) { send(e, { kind: 'airwayDevice', device: 'ett' }); send(e, { kind: 'ventilation', source: 'ventilator', rr: 10, vtMl: 500, peep: 5, fio2: 1 }); }
    if (tA < 0 && c.arrest) {
      tA = u;
      send(e, { kind: 'cpr', active: true, rate: opts.rate, quality: opts.quality });
      if (opts.drain) send(e, { kind: 'condition', id: 'tamponade', severity: 0 });
      if (opts.fluidMl) send(e, { kind: 'fluid', fluid: 'crystalloid', volumeMl: opts.fluidMl, overS: 120 });
    }
    if (tA > 0 && tR < 0 && u - tA <= 300) { sum += cpp; n++; holdMax = Math.max(holdMax, c.arrest?.roscS ?? 0); }
    if (tA > 0 && tR < 0 && !c.arrest) { tR = u; send(e, { kind: 'cpr', active: false }); }
    if (tR > 0 && reArrest < 0 && c.arrest) reArrest = u;
    if (tR > 0 && u > tR + 120) break;
  }
  return { tArrest: tA - 300, cppMean: sum / Math.max(1, n), holdMax, rosc: tR < 0 ? -1 : tR - tA, heldS: tR < 0 ? 0 : (reArrest < 0 ? 120 : reArrest - tR) };
}

describe('FU-7.1 B4: the drained tamponade comes back on the drainage', { timeout: 900_000 }, () => {
  it('drainage + standard-quality CPR alone, no fluid and no drug: ROSC within 4 min of the drainage, and the pulse holds (main: mean CoPP 14.5, never)', async () => {
    const a = await arm({ quality: 0.8, rate: 110, drain: true });
    // eslint-disable-next-line no-console -- the gate note's numbers
    console.log(`FU-7.1 B4 drained, q 0.8 / 110, nothing else: arrest +${a.tArrest} s, mean CoPP ${a.cppMean.toFixed(1)}, max hold ${a.holdMax.toFixed(0)} s, ROSC ${a.rosc < 0 ? 'never' : `+${a.rosc} s`}, pulse held ${a.heldS} s`);
    expect(a.cppMean).toBeGreaterThan(15); // CPP_ROSC: the drainage restores filling from the patient's own reservoir
    expect(a.rosc).toBeGreaterThan(0);
    expect(a.rosc).toBeLessThanOrEqual(240); // research/26 T4: within ≈ 1–2 min of drainage (band 30 s – 4 min)
    expect(a.heldS).toBeGreaterThanOrEqual(120); // not a one-beat ROSC that re-arrests on a stale RV number
  });

  it('poor compressions do not: at quality 0.4 the CoPP never reaches the threshold (the "less likely" is CPR quality and time, not a draw)', async () => {
    const a = await arm({ quality: 0.4, rate: 110, drain: true });
    // eslint-disable-next-line no-console -- the gate note's numbers
    console.log(`FU-7.1 B4 drained, q 0.4 / 110: mean CoPP ${a.cppMean.toFixed(1)}, max hold ${a.holdMax.toFixed(0)} s, ROSC ${a.rosc < 0 ? 'never' : `+${a.rosc} s`}`);
    expect(a.cppMean).toBeLessThan(15);
    expect(a.rosc).toBe(-1);
  });

  it('an UNDRAINED tamponade does not, however hard the compressions (ERC: do not pump a heart that cannot fill; Perkins 2025: ≈ 0 % without relief)', async () => {
    const a = await arm({ quality: 1, rate: 120, drain: false });
    // eslint-disable-next-line no-console -- the gate note's numbers
    console.log(`FU-7.1 B4 UNDRAINED, q 1.0 / 120: mean CoPP ${a.cppMean.toFixed(1)}, max hold ${a.holdMax.toFixed(0)} s, ROSC ${a.rosc < 0 ? 'never' : `+${a.rosc} s`}`);
    expect(a.cppMean).toBeLessThan(15);
    expect(a.holdMax).toBeLessThan(60);
    expect(a.rosc).toBe(-1);
  });
});
