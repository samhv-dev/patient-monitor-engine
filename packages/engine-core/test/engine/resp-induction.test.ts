// FU-6 R3(a) (audit C4/C4b; suite RS3; D5) and F7 (Orchestrator ruling (FU-6 review), 2026-09-28): propofol induction
// apnoea is PROBABILISTIC — one seeded draw per patient (lung/drive.ts `wakeShiftMmHg`) — and follows the Diprivan
// label (2–2.5 mg/kg: apnoea < 30 s 7 %, 30–60 s 24 %, > 60 s 12 %; 43 % overall), more often and longer after an
// opioid (Miller 10e, intravenous anaesthetics). Seed 7 (every other row) is the label's MODAL patient (u 0.737 →
// 30–60 s). Bands [ENG, D5; Q-FU6-1]: seed 7 alone 10–90 s; + fentanyl 2 µg/kg 60–240 s; + remifentanil 0.1 ≥ 90 s;
// 2.5 mg/kg longer than 2 mg/kg; seeds 1–20: the label's shape. SGA (no obstruction), room air.
import { describe, expect, it } from 'vitest';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

async function induce(propMgKg: number, pre?: Record<string, unknown>, seed = 7) {
  const e = rig6(undefined, 'modeled', seed);
  await runTo(e, 1);
  send(e, { kind: 'airwayDevice', device: 'sga' });
  const pa60 = await runTo(e, 60).then(() => st6(e).resp.co2.pf as number);
  if (pre) { await runTo(e, 120); send(e, pre); }
  await runTo(e, 299);
  const pa299 = st6(e).resp.co2.pf as number;
  send(e, { kind: 'drug', drugId: 'propofol', dose: propMgKg, unit: 'mg/kg', route: 'iv' });
  let apnoeaS = 0;
  await runTo(e, 900, () => { if ((st6(e).resp.spont?.rr ?? -1) === 0) apnoeaS += 1; }, 1);
  console.log(`FU-6 R3(a) propofol ${propMgKg} mg/kg ${pre ? JSON.stringify(pre) : 'alone'}: apnoea ${apnoeaS} s; PaCO2 at 60/299 s ${pa60.toFixed(1)}/${pa299.toFixed(1)}`);
  return { apnoeaS, pa60, pa299 };
}

describe('FU-6 R3(a): induction apnoea (was none: RR 17–20 via SGA)', { timeout: 600_000 }, () => {
  it('awake baseline unchanged; propofol 2 mg/kg alone, seed 7 (the modal draw): a short apnoea, 10–90 s (measured 38 s; plan 28 s, 42 s R1-emulated)', async () => {
    const r = await induce(2);
    expect(Math.abs(r.pa299 - r.pa60)).toBeLessThan(1); // the central lag moves no resting value
    expect(r.apnoeaS).toBeGreaterThanOrEqual(10);
    expect(r.apnoeaS).toBeLessThanOrEqual(90);
  });
  it('2.5 mg/kg is longer than 2 mg/kg (measured 48 vs 38 s; plan 44 vs 28 s)', async () => {
    expect((await induce(2.5)).apnoeaS).toBeGreaterThan((await induce(2)).apnoeaS);
  });
  // R45: with Task 4 alone the opioid arms fell short (fentanyl 36 s, remifentanil 38 s: the opioid flattens the CO2
  // slope, opioidDep ≈ 0.63, without shifting the threshold, and the undepressed hypoxic arm ended the apnoea on room
  // air). Since Task 10 (R12: hvrDep — the opioid removes the hypoxic rescue) the apnoea ends only on CO2 at the
  // flattened slope: fentanyl 411 s overshot its 60–240 s band and remifentanil 559 s met its ≥ 90 s band. On the tree
  // merged with FU-8 Part A (its propofol/body-size changes): fentanyl 110 s, remifentanil 190 s — both met (the fentanyl
  // it.fails flipped, R45). No constant names these bands as its fit target — not tuned; Q-FU6-1 (gate note).
  it('an opioid prolongs it: fentanyl 2 µg/kg 60–240 s (measured 110 s on the tree merged with FU-8 Part A; was 411 s at FU-6 Task 10, 36 s before it; plan 62 s)', async () => {
    const f = await induce(2, { kind: 'drug', drugId: 'fentanyl', dose: 2, unit: 'mcg/kg', route: 'iv' });
    expect(f.apnoeaS).toBeGreaterThanOrEqual(60);
    expect(f.apnoeaS).toBeLessThanOrEqual(240);
  });
  it('an opioid prolongs it: remifentanil 0.1 µg/kg/min ≥ 90 s (measured 190 s merged with FU-8 Part A; 559 s at FU-6 Task 10, 38 s before it; plan 124 s)', async () => {
    const r = await induce(2, { kind: 'infusion', drugId: 'remifentanil', rate: 0.1, unit: 'mcg/kg/min' });
    expect(r.apnoeaS).toBeGreaterThanOrEqual(90);
  });
  // The label's inductions are given with supplemental oxygen: this row breathes FiO2 0.5 through the SGA, so the
  // apnoea ends on CO2 (on room air F9's hypoxic plateau ends a long apnoea at PaO2 ≈ 40–45 — seeds 6/12: 48 s, not 92 s)
  it('F7 — probabilistic per the Diprivan label: seeds 1–20 on FiO2 0.5 give apnoea in 25–65 % (label 43 %), the mode 30–60 s, none > 180 s (measured 11/20, < 30 / 30–60 / > 60 s = 2 / 5 / 4, max 114 s; plan 8/20, 1 / 4 / 3, max 110 s)', async () => {
    const d: number[] = [];
    for (let seed = 1; seed <= 20; seed++) d.push((await induce(2, { kind: 'ventilation', source: 'spontaneous', fio2: 0.5 }, seed)).apnoeaS);
    const ap = d.filter((x) => x > 0);
    const bins = [ap.filter((x) => x < 30).length, ap.filter((x) => x >= 30 && x <= 60).length, ap.filter((x) => x > 60).length];
    console.log(`FU-6 F7 seeds 1–20: ${d.join(' ')} s; apnoea ${ap.length}/20; < 30 / 30–60 / > 60 s: ${bins.join(' / ')}`);
    expect(ap.length / 20).toBeGreaterThanOrEqual(0.25); // binomial 95 % range of 43 % in 20 patients ≈ 22–64 %
    expect(ap.length / 20).toBeLessThanOrEqual(0.65);
    expect(bins[1]).toBe(Math.max(...bins)); // the label's mode: 30–60 s
    expect(Math.max(...d)).toBeLessThanOrEqual(180);
  });
});
