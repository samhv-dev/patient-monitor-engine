// FU-9 Task A5 (F8; R50 ruling R2): COP from albumin AND globulins (scaled Nitta); a profile albumin keeps its weak-acid
// deficit (Figge).
import { describe, expect, it } from 'vitest';
import { createBloodCore, stepBloodCore } from '../../../src/l2/blood/core.ts';
import { copPlasma, createFluids } from '../../../src/l2/blood/fluids.ts';
import { bloodPatient, GLOBULIN_GL } from '../../../src/l2/blood/params.ts';

const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };
const step = (bc: ReturnType<typeof createBloodCore>) => stepBloodCore(bc, { t: 0, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);

describe('FU-9 F8: hypoalbuminaemia (Weil 1979; Figge 1998; Fencl 2000)', () => {
  it('COP (scaled Nitta): 22.35 at albumin 40 (unchanged), 11–17 at albumin 20 (was 8.7), 14.1 at 25 (CM-10c, was 11.5); 5 % albumin iso-oncotic', () => {
    const p = bloodPatient(MAN);
    expect(GLOBULIN_GL).toBe(24);
    expect(copPlasma(createFluids(p, 40))).toBeCloseTo(22.35, 2);
    const five = createFluids(p, 40);
    five.albG = (50 * five.vp) / 1000; // 5 % albumin: 50 g/L, no globulins
    five.globG = 0;
    expect(copPlasma(five)).toBeGreaterThan(0.95 * 22.35); // measured 25.2 (Landis on total protein gave 15.6)
    const c20 = copPlasma(createFluids(p, 20));
    const c25 = copPlasma(createFluids(p, 25));
    console.log(`FU-9 F8 COP: albumin 20 → ${c20.toFixed(1)}, 25 → ${c25.toFixed(1)}`);
    expect(c20).toBeGreaterThanOrEqual(11);
    expect(c20).toBeLessThanOrEqual(17);
    expect(c25).toBeGreaterThan(c20);
  });
  it('profile albumin 20 g/L without a profile HCO3: AG 3.5–6.5 lower than normal and BE > 0 (the dilution picture); with a profile HCO3 it is honoured', () => {
    const n = createBloodCore(MAN, 5.25, 40);
    const a = createBloodCore({ ...MAN, blood: { albuminGL: 20 } }, 5.25, 40);
    const h = createBloodCore({ ...MAN, blood: { albuminGL: 20, hco3: 24.4 } }, 5.25, 40);
    for (const bc of [n, a, h]) step(bc);
    console.log(`FU-9 F8 AG: normal ${n.out.ag.toFixed(1)}, albumin 20 ${a.out.ag.toFixed(1)} (BE ${a.ab.be.toFixed(1)}), with HCO3 24.4 → ${h.ab.hco3.toFixed(1)}`);
    expect(n.out.ag - a.out.ag).toBeGreaterThanOrEqual(3.5);
    expect(n.out.ag - a.out.ag).toBeLessThanOrEqual(6.5);
    expect(a.ab.be).toBeGreaterThan(0);
    expect(h.ab.hco3).toBeCloseTo(24.4, 1);
    expect(a.out.k).toBeCloseTo(4.2, 2); // the K reference is the patient's own resting pH
  });
});
