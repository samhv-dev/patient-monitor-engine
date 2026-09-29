import { describe, expect, it } from 'vitest';
import { APNOEA_VE_IN, APNOEA_VE_OUT, drive, HVR_INDEP_VE, hypoxicFactor, WAKE_MMHG, WAKE_QUANTILES, wakeShiftMmHg, type DriveInputs } from '../../../src/l2/lung/drive.ts';
import { seedStream, uniform } from '../../../src/rng/sfc32.ts';

const X: DriveInputs = { paco2: 40, pao2: 100, paco2Set: 40, ve0: 6, co2SlopeMult: 1, opioidDep: 0, hypnoticDep: 0, pain: 0, evlwi: 7, vt0: 500, rr0: 12 };

describe('FU-6 R3(a): the wakefulness drive (D4)', () => {
  it('awake: unchanged resting pattern; unconscious: the threshold rises by WAKE_MMHG', () => {
    expect(drive(X).ve).toBeCloseTo(6, 9);
    expect(WAKE_MMHG).toBe(8);
    expect(drive({ ...X, wake: 1 }).ve).toBe(0); // at the awake resting PaCO2 the unconscious drive is below threshold
    const b = 40 - 6 / 1.5 + WAKE_MMHG; // 44
    expect(drive({ ...X, wake: 1, paco2: b + 2 }).ve).toBeCloseTo(1.5 * 2, 9);
  });
  it('R3(b): against a complete load the extra drive goes into VT, not rate (Zechman 1957)', () => {
    const hyper = { ...X, paco2: 44 }; // VE doubles
    expect(drive(hyper).rr).toBeCloseTo(12 * Math.SQRT2, 6);
    expect(drive({ ...hyper, load: 1 }).rr).toBeCloseTo(12, 6);
    expect(drive({ ...hyper, load: 1 }).vt).toBeCloseTo(1000, 6);
  });
  it('R12: pain and the PE J-receptor drive add ventilation; hvrDep removes the hypoxic arm only', () => {
    expect(drive({ ...X, pain: 1 }).ve).toBeCloseTo(6 * 1.3, 9); // PAIN_GAIN 0.3
    expect(drive({ ...X, jDrive: 1 }).ve).toBeCloseTo(6 * 3.4, 9); // J_PE_VE_FRAC 2.4 of the resting VE, ADDED
    expect(drive({ ...X, paco2: 30, jDrive: 1 }).ve).toBeCloseTo(6 * 2.4, 9); // non-chemical: persists below the CO2 threshold
    expect(drive({ ...X, jDrive: 1 }).rr).toBeGreaterThan(drive({ ...X, paco2: 44 }).rr); // rapid shallow at the same VE (+J_PE_RR)
    const hyp = { ...X, pao2: 50 };
    expect(drive(hyp).ve).toBeGreaterThan(1.5 * drive(X).ve);
    expect(drive({ ...hyp, hvrDep: 1 }).ve).toBeCloseTo(drive(X).ve, 9);
  });
  it('F9: hypoxia drives breathing BELOW the CO2 threshold — PaO2 50 with PaCO2 30 breathes on the hypoxic plateau', () => {
    const low = { ...X, paco2: 30, pao2: 50 }; // B = 36 awake: the CO2 fan is 0
    expect(drive({ ...X, paco2: 30 }).ve).toBe(0); // normoxic: apnoea below the threshold, as before
    expect(drive(low).ve).toBeCloseTo(HVR_INDEP_VE * 6 * (hypoxicFactor(50) - 1), 9); // ≈ 3.06 L/min, 0.51 × resting
    expect(drive({ ...low, wake: 1 }).ve).toBeGreaterThan(APNOEA_VE_IN * 6); // unconscious too (the plateau ignores B)
    expect(drive({ ...low, hvrDep: 1 }).ve).toBe(0); // a fully depressed carotid body: apnoea again
    expect(drive({ ...X, pao2: 50 }).ve).toBeCloseTo(6 * hypoxicFactor(50), 9); // above the threshold the fan governs: unchanged
  });
  it('apnoea below 10 % of resting VE, resuming above 15 % (hysteresis)', () => {
    const at = (ve: number) => 40 - 6 / 1.5 + ve / 1.5; // PaCO2 giving this chemo VE
    expect([APNOEA_VE_IN, APNOEA_VE_OUT]).toEqual([0.1, 0.15]);
    expect(drive({ ...X, paco2: at(0.5) }).ve).toBe(0); // 0.5 < 0.6
    expect(drive({ ...X, paco2: at(0.7) }).ve).toBeGreaterThan(0);
    expect(drive({ ...X, paco2: at(0.7), apnoeic: true }).ve).toBe(0); // 0.7 < 0.9 to resume
    expect(drive({ ...X, paco2: at(1.0), apnoeic: true }).ve).toBeGreaterThan(0);
  });
  it('F7: the wake shift is ONE seeded draw through the label-fitted quantile table; seed 7 is the modal patient', () => {
    expect(WAKE_QUANTILES.map((q) => q[0])).toEqual([0, 0.57, 0.64, 0.88, 1]); // no apnoea / < 30 s / 30–60 s / > 60 s
    for (let u = 0.01; u < 1; u += 0.01) expect(wakeShiftMmHg(u)).toBeGreaterThanOrEqual(wakeShiftMmHg(u - 0.01));
    expect(wakeShiftMmHg(0.57)).toBeCloseTo(7.3, 9); // re-fitted on the merged main (plan: 6.6, R1-emulated)
    const u7 = uniform(seedStream(7, 'resp-wake'));
    expect(u7).toBeGreaterThan(0.64); // seed 7 (rig6) draws inside the 30–60 s band …
    expect(u7).toBeLessThan(0.88);
    expect(drive({ ...X, wake: 1, wakeMmHg: 2, paco2: 40 }).ve).toBeGreaterThan(0); // … a low draw keeps breathing
  });
});
