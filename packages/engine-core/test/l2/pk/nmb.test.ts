import { describe, expect, it } from 'vitest';
import { pkStep, pkSystem, zeroState } from '../../../src/l2/pk/compartment.ts';
import { bindSugammadex, bindSugammadexSites, CISATRACURIUM, MW, NMB_PD, PCHE_CL_MULT, perKg, ROCURONIUM, SUCCINYLCHOLINE, SUGAMMADEX, testT1, VECURONIUM, type PerKgPk } from '../../../src/l2/pk/nmb.ts';

/** Onset (T1 ≤ 1 %) and clinical duration (T1 back to 25 %) after a bolus, minutes, 1 s steps. */
function onsetDuration(m: PerKgPk, pd: { ec50: number; gamma: number }, doseMgKg: number, w = 70, clMult = 1) {
  const p = perKg(m, w, clMult);
  const s = pkSystem(p, 1);
  let x = zeroState(p);
  x[0] = doseMgKg * w * 1000; // µg; concentrations ng/mL
  let onset = -1;
  let dur = -1;
  let min = 1;
  for (let k = 1; k < 600 * 60; k++) {
    x = pkStep(s, x, 0);
    const t1 = testT1(x[3]!, pd.ec50, pd.gamma);
    min = Math.min(min, t1);
    if (onset < 0 && (t1 <= 0.01 || (k > 600 && t1 > min + 1e-6))) onset = k / 60;
    if (onset > 0 && dur < 0 && t1 >= 0.25 && k / 60 > onset) dur = k / 60;
  }
  return { onset, dur };
}

describe('neuromuscular blockers', () => {
  it('rocuronium 0.6 mg/kg: onset 1.5–2.1 min, duration 26–36 (label 1.8/31); 1.2 mg/kg: 0.6–1.2, 55–75 (label 1.0/67)', () => {
    const a = onsetDuration(ROCURONIUM, NMB_PD.rocuronium.thumb, 0.6);
    const b = onsetDuration(ROCURONIUM, NMB_PD.rocuronium.thumb, 1.2);
    expect(a.onset).toBeGreaterThan(1.5);
    expect(a.onset).toBeLessThan(2.1);
    expect(a.dur).toBeGreaterThan(26);
    expect(a.dur).toBeLessThan(36);
    expect(b.onset).toBeGreaterThan(0.6);
    expect(b.onset).toBeLessThan(1.2);
    expect(b.dur).toBeGreaterThan(55);
    expect(b.dur).toBeLessThan(75);
  });
  it('vecuronium 0.1 mg/kg: onset 2.5–5 min, duration 25–45 (label 3–5 / 25–30; Miller Table 24.5 41–44)', () => {
    const v = onsetDuration(VECURONIUM, NMB_PD.vecuronium.thumb, 0.1);
    expect(v.onset).toBeGreaterThan(2.5);
    expect(v.onset).toBeLessThan(5);
    expect(v.dur).toBeGreaterThan(25);
    expect(v.dur).toBeLessThan(45);
  });
  it('cisatracurium 0.15 mg/kg: onset 2–4 min, duration 35–55 (label ≈ 45)', () => {
    const c = onsetDuration(CISATRACURIUM, NMB_PD.cisatracurium.thumb, 0.15);
    expect(c.onset).toBeGreaterThan(2);
    expect(c.onset).toBeLessThan(4);
    expect(c.dur).toBeGreaterThan(35);
    expect(c.dur).toBeLessThan(55);
  });
  it('succinylcholine 1 mg/kg: onset ≤ 1.5 min; T1 25 % at 6–9 min (label T1 10 % 7.1, 90 % 10.9); PChE het ×2, hom 4–8 h (tables §5d)', () => {
    const s = onsetDuration(SUCCINYLCHOLINE, NMB_PD.succinylcholine.thumb, 1);
    expect(s.onset).toBeLessThan(1.5);
    expect(s.dur).toBeGreaterThan(6);
    expect(s.dur).toBeLessThan(9);
    const het = onsetDuration(SUCCINYLCHOLINE, NMB_PD.succinylcholine.thumb, 1, 70, PCHE_CL_MULT.het);
    expect(het.dur / s.dur).toBeGreaterThan(1.5); // prototype 12 / 7.2 = 1.7 (tables "heterozygous ×2")
    expect(het.dur / s.dur).toBeLessThan(2.5);
    const hom = onsetDuration(SUCCINYLCHOLINE, NMB_PD.succinylcholine.thumb, 1, 70, PCHE_CL_MULT.hom);
    expect(hom.dur).toBeGreaterThan(240); // prototype 5.2 h (tables "homozygous 4–8 h")
    expect(hom.dur).toBeLessThan(480);
  });
  it('sugammadex binds free rocuronium 1:1 molar at both effect sites (R51 §5); the excess stays free', () => {
    const roc = [0, 0, 0, 1300, 900]; // ng/mL = µg/L at the thumb and diaphragm sites
    const sgx = [0, 0, 0, 1, 10]; // mg/L at the same sites
    bindSugammadexSites(roc, sgx);
    const thumbSgxUmol = (1 * 1000) / MW.sugammadex; // 0.459 µmol/L < roc 2.13 µmol/L
    expect(roc[3]).toBeCloseTo(1300 - thumbSgxUmol * MW.rocuronium, 6);
    expect(sgx[3]).toBeCloseTo(0, 12);
    expect(roc[4]).toBeCloseTo(0, 12); // diaphragm: sugammadex in molar excess
    expect(sgx[4]).toBeCloseTo(10 - ((900 / MW.rocuronium) * MW.sugammadex) / 1000, 9);
    expect(SUGAMMADEX.ke0).toEqual([0.095, 0.152]);
  });
  it('sugammadex binds free rocuronium 1:1 molar in the central compartment', () => {
    const roc = [0.6 * 70 * 1000, 0, 0, 0, 0]; // µg
    const sgx = [2 * 70, 0, 0, 0]; // mg
    const r = bindSugammadex(roc, sgx);
    const rocUmol = (0.6 * 70 * 1000) / MW.rocuronium;
    const sgxUmol = (2 * 70 * 1000) / MW.sugammadex;
    expect(r.boundUmol).toBeCloseTo(Math.min(rocUmol, sgxUmol), 6);
    expect(roc[0]).toBeCloseTo(Math.max(0, rocUmol - sgxUmol) * MW.rocuronium, 3);
    expect(SUGAMMADEX.cl1).toBeGreaterThan(0);
  });
});
