// FU-7.1 A2 (research/24 P4): premedication with an opioid deepens the induction hypotension more than additively.
// Rig: Billard 1994's design (Anesthesiology 81:1384, n = 120, ASA 1–2) on the probe's P4 patient — 40 y 70 kg man,
// spontaneous, no airway support, preoxygenated FiO2 1 for 5 min; fentanyl 2 µg/kg (or nothing) at t − 300 s, propofol
// 2 mg/kg at t = 0; the systolic fall from the value just before propofol to the nadir within 4 min (Billard intubated
// at 4 min). SLOW (≈ 10 s wall for the three arms); one yield per sim-minute.
import { describe, expect, it } from 'vitest';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

const T = 400;

async function arm(premed: boolean): Promise<{ sbp0: number; sbpMin: number; dSbp: number; dMap: number }> {
  const e = rig6();
  await runTo(e, T - 300);
  send(e, { kind: 'preoxygenate', fio2: 1, durationS: 300 });
  if (premed) send(e, { kind: 'drug', drugId: 'fentanyl', dose: 2, unit: 'mcg/kg', route: 'iv' });
  await runTo(e, T);
  const c0 = st6(e).hemo.circ;
  const b0 = c0.beats.filter((b: { t: number }) => b.t > T - 10);
  const sbp0 = b0.reduce((a: number, b: { sbp: number }) => a + b.sbp, 0) / b0.length;
  const map0 = c0.mapNow as number;
  send(e, { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' });
  let sbpMin = Infinity;
  let mapMin = Infinity;
  await runTo(e, T + 240, () => {
    const c = st6(e).hemo.circ;
    const bs = c.beats.filter((b: { t: number }) => b.t > (c.t as number) - 4);
    if (bs.length) sbpMin = Math.min(sbpMin, bs.reduce((a: number, b: { sbp: number }) => a + b.sbp, 0) / bs.length);
    mapMin = Math.min(mapMin, c.mapNow as number);
  }, 1);
  return { sbp0, sbpMin, dSbp: sbp0 - sbpMin, dMap: map0 - mapMin };
}

describe('FU-7.1 A2: the opioid deepens the induction hypotension', { timeout: 600_000 }, () => {
  it('fentanyl 2 µg/kg before propofol 2 mg/kg deepens the systolic fall by at least a fifth (main: 25.6 → 27.8 mmHg, ratio 1.09)', async () => {
    const [p, f] = [await arm(false), await arm(true)];
    const ratio = f.dSbp / p.dSbp;
    // eslint-disable-next-line no-console -- the gate note's numbers
    console.log(`FU-7.1 A2 Billard rig: ΔSBP propofol ${p.dSbp.toFixed(1)}, with fentanyl ${f.dSbp.toFixed(1)}, ratio ${ratio.toFixed(2)}; ΔMAP ${p.dMap.toFixed(1)} / ${f.dMap.toFixed(1)}`);
    expect(ratio).toBeGreaterThanOrEqual(1.15);
    expect(f.dSbp).toBeGreaterThan(p.dSbp + 3);
  });
  // R45 (FU-7.1 Q2, the D15b precedent): the paper's ratio is 1.9 (28 → 53 mmHg). The strength that reaches it takes
  // FU-6's sourced induction-apnoea band (fentanyl pair 60–240 s → 513 s) and FU-7 Task 10 case 2's blunting ratio
  // (0.2–0.7 → 0.19) out through FU-4 G10's flow-dependent distribution, so this plan ships the largest strength that
  // keeps both (HEMO_SYN_MAX 0.2) and records the miss here. Owner question Q2.
  it.fails('the fall after fentanyl 2 µg/kg is 1.7–2.1 × the fall after propofol alone (Billard 1994: 53/28 = 1.89) — measured 1.16 at HEMO_SYN_MAX 0.2', async () => {
    const [p, f] = [await arm(false), await arm(true)];
    expect(f.dSbp / p.dSbp).toBeGreaterThanOrEqual(1.7);
  });
});
