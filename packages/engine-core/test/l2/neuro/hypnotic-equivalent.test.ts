import { describe, expect, it } from 'vitest';
import { depth, KET_EEG_W } from '../../../src/l2/neuro/depth.ts';
import { readBus } from '../../../src/l2/neuro/bus.ts';
import { busFixture } from '../../helpers/neuro-bus.ts';
import { neuroResp, VENT_ALPHA_BENZO, VENT_ALPHA_HYP } from '../../../src/l2/neuro/drive.ts';

const C0 = { propofol: 0, remifentanil: 0, fentanyl: 0, midazolam: 0, ketamine: 0 };
const d = (hypPropEq: number, dissoc = 0) => depth({ ageY: 40, ce: C0, macPotent: 0, macN2o: 0, t1: 1, stimulus: 0, hypPropEq, dissoc });

/** FU-7 (addendum 20): the depth index and consciousness come from 7g's ONE hypnotic equivalent. */
describe('hypnotic equivalent (R51 addendum 20)', () => {
  it('an induction-strength equivalent from ANY agent gives unconsciousness (DI-69: thiopental and etomidate never did)', () => {
    expect(d(2500).conscious).toBe(false); // 2.5 µg/mL propofol-equivalent > locPropofol(40) = 2020
    expect(d(1200).conscious).toBe(true);
  });
  it('a dissociative equivalent is unconscious with a HIGH index (D3: BIS 60–90 under ketamine)', () => {
    const k = d(3800, 1);
    expect(k.conscious).toBe(false);
    expect(k.diRaw).toBeGreaterThan(80);
    expect(d(3800, 0).diRaw).toBeLessThan(40); // the same equivalent from a non-dissociative agent
    expect(KET_EEG_W).toBeLessThan(0.2);
  });
  it('the reader is duck-typed: a bus without the outputs falls back to the per-agent sum (no NaN)', () => {
    const b = busFixture({ cns: { propCe: 3 } });
    const x = readBus(b);
    expect(Number.isFinite(x.hypPropEq as number)).toBe(true);
    const bare = { ...b, cns: { ...b.cns } } as unknown as Record<string, unknown>;
    delete (bare.cns as Record<string, unknown>).hypPropEq;
    const y = readBus(bare as never);
    expect(y.hypPropEq).toBeUndefined();
    expect(depth({ ageY: 40, ce: { ...C0, propofol: 3000 }, macPotent: 0, macN2o: 0, t1: 1, stimulus: 0, hypPropEq: y.hypPropEq }).conscious).toBe(false);
  });
});

const V0 = { opioid: 0, propofol: 0, midazolam: 0, ketamine: 0 };
const vent = (v: Partial<typeof V0>, hypVentPropEq?: number) =>
  neuroResp({ vent: { ...V0, ...v }, ...(hypVentPropEq !== undefined ? { hypVentPropEq } : {}), macVolatile: 0, diaBlock: 0, tofr: 1, di: 93, naturalAirway: false, wasApnoeic: false });

describe('ventilatory response surface (R51 addendum 20, D4)', () => {
  it('a single class keeps its published calibration (the surface shift needs the OTHER class)', () => {
    expect(vent({ opioid: 1 }).veRest).toBeCloseTo(vent({ opioid: 1 }, 0).veRest, 9);
    expect(vent({ opioid: 1 }).veRest).toBeGreaterThan(0.6); // Nieuwenhuijs 2003: remifentanil 1 ng/mL ≈ −28 %
    expect(vent({ opioid: 1 }).veRest).toBeLessThan(0.8);
    expect(vent({}, 1000).veRest).toBeGreaterThan(0.8); // propofol 1 µg/mL ≈ −13 %
  });
  it('the BENZODIAZEPINE pair is supra-additive: it depresses more than the product of the singles (Bailey 1990)', () => {
    const a = vent({ opioid: 1 }).veRest;
    const b = vent({ midazolam: 150 }).veRest; // MIDAZ_VENT_C50: the fallback path's benzodiazepine share is 1
    expect(vent({ opioid: 1, midazolam: 150 }).veRest).toBeLessThan(a * b);
  });
  it('a hypnotic reaching the drive ONLY through the equivalent still depresses it (thiopental, etomidate)', () => {
    expect(vent({}, 2500).totalDep).toBeGreaterThan(vent({}, 0).totalDep + 0.3);
  });
  it('the α is per class (review F2): the SAME equivalent is more synergistic with an opioid as a benzodiazepine than as propofol', () => {
    const pair = (share: number) => neuroResp({ vent: { ...V0, opioid: 1 }, hypVentPropEq: 1000, benzoShare: share, macVolatile: 0, diaBlock: 0, tofr: 1, di: 93, naturalAirway: false, wasApnoeic: false }).veRest;
    expect(pair(1)).toBeLessThan(pair(0) - 0.05); // Bailey (α 1.5) vs Nieuwenhuijs (α 0, D15b)
    expect(VENT_ALPHA_HYP).toBeLessThan(VENT_ALPHA_BENZO);
    // the benzodiazepine pair is FAR below the product of the singles; the propofol pair only just below it
    // (measured on the applied tree: singles 0.723 / 0.868, product 0.628; propofol pair 0.500, benzodiazepine pair 0.203)
    const prod = vent({ opioid: 1 }).veRest * vent({}, 1000).veRest;
    expect(pair(1)).toBeLessThan(0.5 * prod);
    expect(pair(0)).toBeGreaterThan(0.6 * prod);
  });
});
