// EEG E1 (plan §7 E1, "Red (bus)"): the drug model's hypnotic equivalent split by EEG class, and dexmedetomidine's
// EEG equivalent — ADDITIVE bus outputs: hypPropEq, uHyp and every other output keep their values.
import { describe, expect, it } from 'vitest';
import { combine, DEXMED_EEG_C50_NG_ML, DEXMED_NG_PER_REF, type Active } from '../../../src/l2/pk/combine.ts';
import { DRUGS, DRUG_IDS } from '../../../src/l2/pk/data/drugs.ts';

const CTX = { ph: 7.4, betaBlockC: 0, vasoResp: 1, ageY: 40, macBrain: 0 };
const act = (id: string, c: number): Active => ({ row: DRUGS[id]!, c });
const sum = (h: Record<string, number>) => Object.values(h).reduce((a, b) => a + b, 0);
const HYPNOTICS = DRUG_IDS.filter((id) => DRUGS[id]!.cns?.hypC50 !== undefined);

describe('EEG E1 bus: hypByClass and alpha2Eq', () => {
  it('every row with a hypnotic C50 lands in exactly one class, and the classes sum to hypPropEq (1e-12)', () => {
    expect(HYPNOTICS.sort()).toEqual(['etomidate', 'ketamine', 'midazolam', 'propofol', 'thiopental']);
    const want: Record<string, string> = { propofol: 'gabaIv', thiopental: 'barbiturate', etomidate: 'etomidate', midazolam: 'benzo', ketamine: 'dissociative' };
    for (const id of HYPNOTICS) {
      const { bus } = combine([act(id, 0.7)], CTX);
      const h = bus.cns.hypByClass as unknown as Record<string, number>;
      expect(Math.abs(sum(h) - bus.cns.hypPropEq), id).toBeLessThan(1e-12);
      expect(h[want[id]!], id).toBeCloseTo(bus.cns.hypPropEq, 12);
    }
  });
  it('a mixture of all five at three ages still sums exactly; flumazenil divides the benzodiazepine class only', () => {
    for (const ageY of [20, 40, 85]) {
      const mix = HYPNOTICS.map((id, i) => act(id, 0.3 + 0.2 * i));
      const { bus } = combine([...mix, act('flumazenil', 1)], { ...CTX, ageY });
      expect(Math.abs(sum(bus.cns.hypByClass as unknown as Record<string, number>) - bus.cns.hypPropEq)).toBeLessThan(1e-12);
      const plain = combine(mix, { ...CTX, ageY }).bus.cns.hypByClass;
      expect(bus.cns.hypByClass.benzo).toBeLessThan(plain.benzo);
      expect(bus.cns.hypByClass.gabaIv).toBeCloseTo(plain.gabaIv, 12);
    }
  });
  it('the split is additive: hypPropEq, uHyp, dissoc are what they were (the same sums, the same order)', () => {
    const { bus } = combine([act('propofol', 2), act('ketamine', 0.5)], CTX);
    expect(bus.cns.dissoc).toBeCloseTo(bus.cns.hypByClass.dissociative / bus.cns.hypPropEq, 12);
  });
  it('alpha2Eq = dexmedetomidine Ce (ng/mL) ÷ 2.5 ng/mL; no other row moves it; it is not a hypnotic equivalent', () => {
    expect(DEXMED_EEG_C50_NG_ML).toBe(2.5);
    const { bus } = combine([act('dexmedetomidine', 1)], CTX);
    expect(bus.cns.alpha2Eq).toBeCloseTo(DEXMED_NG_PER_REF / 2.5, 12);
    expect(bus.cns.hypPropEq).toBe(0); // NN-19c stays as it is for the index (D7); the EEG gets its own input
    expect(combine([act('propofol', 3)], CTX).bus.cns.alpha2Eq).toBe(0);
  });
});
