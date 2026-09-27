import { describe, expect, it } from 'vitest';
import { cp, pkStep, pkSystem, zeroState, type PkParams } from '../../../src/l2/pk/compartment.ts';
import { ffmAlSallami, lbmJames } from '../../../src/l2/pk/covariates.ts';
import { eleveldPropofol, marshPropofol, schniderPropofol, ttpeMin } from '../../../src/l2/pk/models.ts';

const REF = { ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' as const };
const SCH = { ageY: 53, weightKg: 77, heightCm: 177, sex: 'm' as const };

function bolus(p: PkParams, dose: number, minutes: number) {
  const s = pkSystem(p, 0.1);
  let x = zeroState(p);
  x[0] = dose;
  let peak = 0;
  for (let k = 0; k < minutes * 600; k++) {
    x = pkStep(s, x, 0);
    peak = Math.max(peak, x[3]!);
  }
  return { x, peak };
}

describe('propofol models', () => {
  it('body-size scalars (James LBM, Al-Sallami FFM) at the Eleveld reference patient', () => {
    expect(lbmJames(REF)).toBeCloseTo(55.3, 1);
    expect(ffmAlSallami(REF)).toBeGreaterThan(50);
    expect(ffmAlSallami(REF)).toBeLessThan(60);
  });
  it('Eleveld 2018 reference individual: V1 6.28, V2 25.5, V3 273 L; CL 1.79; ke0 0.146 (D4: Q2 1.83)', () => {
    const p = eleveldPropofol(REF);
    expect(p.v1).toBeCloseTo(6.28, 2);
    expect(p.k10 * p.v1).toBeCloseTo(1.79, 2);
    expect(p.k12 * p.v1).toBeCloseTo(1.83, 1);
    expect(p.v1 * p.k12 / p.k21).toBeCloseTo(25.5, 1);
    expect(p.v1 * p.k13 / p.k31).toBeCloseTo(273, 0);
    expect(p.ke0[0]).toBeCloseTo(0.146, 3);
  });
  it('Eleveld: female clearance 2.10, opioids lower CL and V3, the elderly have a smaller V2', () => {
    const f = eleveldPropofol({ ...REF, sex: 'f' });
    expect(f.k10 * f.v1).toBeGreaterThan(eleveldPropofol(REF).k10 * eleveldPropofol(REF).v1);
    const o = eleveldPropofol(REF, { opioids: true });
    expect(o.k10 * o.v1).toBeLessThan(1.79);
    const old = eleveldPropofol({ ...REF, ageY: 80 });
    expect((old.v1 * old.k12) / old.k21).toBeLessThan(25.5);
  });
  it('Schnider TTPE 1.6 min (published) within 10 %; Miller 10e "time to peak effect 90–100 s" band 1.4–1.8', () => {
    const t = ttpeMin(schniderPropofol(SCH));
    expect(t).toBeGreaterThan(1.44);
    expect(t).toBeLessThan(1.76); // prototype 1.55
  });
  it('Eleveld TTPE (arterial ke0) 2.6–3.2 min (prototype 2.91); Marsh (ke0 0.26) 3.5–4.3 (prototype 3.92)', () => {
    expect(ttpeMin(eleveldPropofol(REF))).toBeGreaterThan(2.6);
    expect(ttpeMin(eleveldPropofol(REF))).toBeLessThan(3.2);
    expect(ttpeMin(marshPropofol(REF))).toBeGreaterThan(3.5);
    expect(ttpeMin(marshPropofol(REF))).toBeLessThan(4.3);
  });
  it('2 mg/kg bolus: Eleveld Ce peak ≈ 3.0 µg/mL (above the 25–50 y LOC C50 1.8–2.35), Cp at 1 min 10.6', () => {
    const b = bolus(eleveldPropofol(REF), 140, 10);
    expect(b.peak).toBeGreaterThan(2.7);
    expect(b.peak).toBeLessThan(3.3);
    const one = bolus(eleveldPropofol(REF), 140, 1);
    expect(cp(eleveldPropofol(REF), one.x)).toBeCloseTo(10.64, 0);
  });
  it('Marsh V1 is 0.228 L/kg', () => {
    expect(marshPropofol({ ...REF, weightKg: 100 }).v1).toBeCloseTo(22.8, 6);
  });
});
