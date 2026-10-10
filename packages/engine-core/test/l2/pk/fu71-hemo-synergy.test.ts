// FU-7.1 A2: an opioid on board deepens a HYPNOTIC's vasodilation and venodilation beyond the independent product
// (Billard 1994 Anesthesiology 81:1384: systolic fall 28 mmHg after propofol alone, 53 mmHg five minutes after
// fentanyl 2 µg/kg). Unit level: the combined effect on `svr` and `v0Frac`, and what must NOT move.
import { describe, expect, it } from 'vitest';
import { combine, HEMO_SYN_MAX, HEMO_SYN_U50, type Active, type PdContext } from '../../../src/l2/pk/combine.ts';
import { DRUGS } from '../../../src/l2/pk/data/drugs.ts';
import type { DrugRow } from '../../../src/l2/pk/row.ts';

const CTX: PdContext = { ph: 7.4, betaBlockC: 0, vasoResp: 1, ageY: 40, macBrain: 0 };
const row = (id: string) => DRUGS[id] as DrugRow;
const fx = (as: Active[]) => combine(as, CTX).fx;
/** Propofol at its PD EC50 (3.5 µg/mL) and fentanyl at a 2 µg/kg peak-ish brain Ce (ng/mL). */
const prop = (c = 3.5): Active => ({ row: row('propofol'), c });
const fent = (c = 4.2): Active => ({ row: row('fentanyl'), c });

describe('FU-7.1 A2: the opioid × hypnotic haemodynamic interaction', () => {
  it('each drug alone is unchanged by the interaction (one class: the factor cannot act)', () => {
    const p = fx([prop()]);
    const f = fx([fent()]);
    expect(p.svr).toBeCloseTo(1 - 0.45 / 2, 6); // propofol's svr Emax −0.45 at its EC50
    expect(p.v0Frac).toBeCloseTo(0.08 / 2, 6);
    expect(f.svr).toBeCloseTo(1 - 0.15 * (4.2 / (4.2 + 2)), 6); // fentanyl's own row, untouched
  });
  it('together, the hypnotic\'s vasodilation and venodilation are deeper than the independent product', () => {
    const both = fx([prop(), fent()]);
    const indep = fx([prop()]).svr * fx([fent()]).svr;
    const u = (4.2 * (row('fentanyl').cns?.remiEq ?? 1.6)) / 1.2;
    const want = 1 + (HEMO_SYN_MAX * u) / (u + HEMO_SYN_U50);
    // eslint-disable-next-line no-console -- the gate note's numbers
    console.log(`FU-7.1 A2 unit: svr both ${both.svr.toFixed(4)} vs independent ${indep.toFixed(4)}; factor ${want.toFixed(3)}`);
    expect(both.svr).toBeLessThan(indep);
    expect(both.v0Frac).toBeGreaterThan(fx([prop()]).v0Frac + fx([fent()]).v0Frac);
    // the hypnotic's own E is scaled by exactly the factor
    const eAlone = fx([prop()]).svr - 1;
    expect((both.svr / fx([fent()]).svr - 1) / eAlone).toBeCloseTo(want, 3);
  });
  it('it acts on the HYPNOTIC class only: a benzodiazepine + opioid pair is the independent product (DI-02)', () => {
    const midaz: Active = { row: row('midazolam'), c: 1 };
    const both = fx([midaz, fent()]);
    expect(both.svr).toBeCloseTo(fx([midaz]).svr * fx([fent()]).svr, 6);
  });
  it('and on the vascular rows only: the hypnotic\'s contractility and reflex rows are untouched', () => {
    const both = fx([prop(), fent()]);
    expect(both.ees).toBeCloseTo(fx([prop()]).ees * fx([fent()]).ees, 6);
    expect(both.gv).toBeCloseTo(fx([prop()]).gv * fx([fent()]).gv, 6);
  });
});
