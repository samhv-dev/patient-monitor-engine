import { describe, expect, it } from 'vitest';
import { outcomeProbabilities, shockStateFactor, type ShockContext } from '../../src/l3/defib-pacer/outcome.ts';

const VF: ShockContext = { cls: 'vf', synced: false, energyJ: 200, defaultJ: 200, vfDurationS: 60, onTPeak: false };
const rosc = (c: ShockContext) => outcomeProbabilities(c).rosc ?? 0;

/** FU-7 (addendum 23): shock success depends on the state the shock lands in. */
describe('shock state factor (R51 addendum 23)', () => {
  it('no state information = the pre-FU-7 table exactly', () => {
    expect(shockStateFactor(VF)).toBe(1);
    expect(rosc(VF)).toBeCloseTo(0.1, 9);
  });
  it('amiodarone on board raises the ROSC share (ARREST 1999, ALPS 2016)', () => {
    expect(rosc({ ...VF, antiarrhythmicU: 1 })).toBeGreaterThan(1.2 * rosc(VF));
  });
  it('severe hyperkalaemia and acidaemia lower it, with floors', () => {
    expect(rosc({ ...VF, kEcg: 9 })).toBeLessThan(0.5 * rosc(VF));
    expect(rosc({ ...VF, ph: 6.9 })).toBeLessThan(0.7 * rosc(VF));
    expect(rosc({ ...VF, kEcg: 12, ph: 6.5 })).toBeGreaterThan(0);
  });
  it('in the circulatory phase good CPR (CPP 25) helps and no-flow CPR (CPP 5) nearly abolishes it (Paradis 1990)', () => {
    const late: ShockContext = { ...VF, vfDurationS: 300 }; // DV amendment: CoPP acts from 240 s (Weisfeldt & Becker 2002)
    expect(rosc({ ...late, cppMmHg: 25 })).toBeGreaterThan(rosc(late));
    expect(rosc({ ...late, cppMmHg: 5 })).toBeLessThan(0.4 * rosc(late));
  });
  it('in the electrical phase CoPP does not matter: an immediate shock without CPR keeps its share (Weisfeldt 2002)', () => {
    expect(rosc({ ...VF, cppMmHg: 3 })).toBeCloseTo(rosc(VF), 9);
    expect(rosc({ ...VF, vfDurationS: 0, arrestS: 60, cppMmHg: 3 })).toBeCloseTo(rosc({ ...VF, vfDurationS: 0, arrestS: 60 }), 9);
  });
  it('the outcome probabilities always sum to 1 and none is negative', () => {
    for (const c of [VF, { ...VF, kEcg: 12, ph: 6.5, cppMmHg: 2 }, { ...VF, antiarrhythmicU: 1, cppMmHg: 30 }, { ...VF, vfDurationS: 900 },
      { ...VF, tempC: 24, vfDurationS: 900, cppMmHg: 30, antiarrhythmicU: 1 }, { ...VF, cls: 'organisedPulse' as const, synced: true, rhythmId: 'afib' as const, energyJ: 360 }]) {
      const p = outcomeProbabilities(c);
      const sum = Object.values(p).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 9);
      for (const v of Object.values(p)) expect(v).toBeGreaterThanOrEqual(0);
    }
  });
  it('the arrest clock acts only on a non-VF arrest (no double-counting with the VF table)', () => {
    expect(rosc({ ...VF, arrestS: 1200 })).toBeCloseTo(rosc(VF), 9);
    expect(rosc({ ...VF, vfDurationS: 0, arrestS: 1200 })).toBeLessThan(rosc({ ...VF, vfDurationS: 0 }));
  });
});

/** FU-7 (DV amendment, research/20 §4): termination, temperature and cardioversion by rhythm and energy. */
const term = (c: ShockContext) => 1 - (outcomeProbabilities(c).unchanged ?? 0);
const cv = (rhythmId: ShockContext['rhythmId'], energyJ: number) =>
  outcomeProbabilities({ cls: 'organisedPulse', synced: true, energyJ, defaultJ: 200, vfDurationS: 0, onTPeak: false, rhythmId }).sinus ?? 0;
describe('shock outcome — DV amendment (research/20 DV-01a, DV-24a/b, DV-06a–c)', () => {
  it('the first biphasic shock terminates VF in 85–98 % (Schneider 2000; van Alem 2003) and termination is not ROSC', () => {
    expect(term(VF)).toBeGreaterThanOrEqual(0.85);
    expect(term(VF)).toBeLessThanOrEqual(0.98);
    expect(rosc(VF)).toBeCloseTo(0.1, 9);
  });
  it('below 30 °C VF is shock-refractory; rewarming above 30 °C restores termination (ERC 2021)', () => {
    expect(term({ ...VF, tempC: 37 })).toBeCloseTo(term(VF), 9);
    expect(term({ ...VF, tempC: 33 })).toBeCloseTo(term(VF), 9);
    expect(term(VF) - term({ ...VF, tempC: 28.5 })).toBeGreaterThan(0.2); // DV-24a: diff > 20 points
    expect(term({ ...VF, tempC: 24 })).toBeGreaterThan(0); // the floor: never abolished
  });
  it('flutter and paroxysmal SVT convert at low energy (≥ 90 % at 50 J; ERC 2021, Neumar 2010)', () => {
    expect(cv('aflutter', 50)).toBeGreaterThanOrEqual(0.9);
    expect(cv('svtAvnrt', 50)).toBeGreaterThanOrEqual(0.9);
  });
  it('monomorphic VT with a pulse converts in > 90 % at 100 J (Neumar 2010)', () => {
    expect(cv('vtMono', 100)).toBeGreaterThan(0.9);
  });
  it('AF needs more energy: 75–90 % at 200 J, rare at 20 J (Page 2002: low-energy first shocks ≈ 20–30 %; ERC 2021)', () => {
    expect(cv('afib', 200)).toBeGreaterThanOrEqual(0.75);
    expect(cv('afib', 200)).toBeLessThanOrEqual(0.9);
    expect(cv('afib', 20)).toBeLessThanOrEqual(0.3);
    expect(cv('afib', 200) - cv('afib', 20)).toBeGreaterThan(0.3); // DV-06a energy dependence (direction, tol 30)
  });
  it('no rhythm id keeps the flat pre-FU-7 cardioversion 0.8', () => {
    expect(cv(undefined, 20)).toBeCloseTo(0.8, 9);
  });
});
