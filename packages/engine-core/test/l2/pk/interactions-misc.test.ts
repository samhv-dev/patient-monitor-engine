// FU-7 Tasks 12–18: drug interactions and single-target rows (12: sugammadex bradycardia; 13: LAST additivity; 15–18 add
// the volatile, histamine, inotrope and inert-row cases).
// Driven through 7g's REAL PK (the 7f rig: one simulated second per step, neutral context).
import { describe, expect, it } from 'vitest';
import { LAST_THRESHOLDS } from '../../../src/l2/pk/data/rows-other.ts';
import { hill } from '../../../src/l2/pk/pd.ts';
import { give, rig, runTo } from '../../helpers/neuro.ts';

/** The largest fractional fall of 7g's HR multiplier over `min` minutes after a bolus. */
function hrFall(drugId: string, dose: number, unit = 'mg/kg', min = 10): number {
  const r = rig();
  give(r, drugId, dose, unit);
  let lo = 1;
  runTo(r, min, () => { lo = Math.min(lo, r.pk.fx.hr); });
  return 1 - lo;
}

describe('FU-7: single-target rows', () => {
  it('sugammadex (DI-45): 16 mg/kg gives a 15–30 % HR fall (MHRA/EMA; M10 ch. 24)', () => {
    const f16 = hrFall('sugammadex', 16);
    console.log(`FU-7 T12: sugammadex HR fall 16 mg/kg ${(100 * f16).toFixed(1)} %`);
    expect(f16).toBeGreaterThanOrEqual(0.15);
    expect(f16).toBeLessThanOrEqual(0.3);
  });
  // R45: with the plan's Hill of 1 on a linear PK no EC50 gives both bands — 4 mg/kg < 5 % needs c4 < 0.25·EC50 and
  // 16 mg/kg ≥ 15 % needs c4 ≥ 0.375·EC50. The row (emax −0.25, ec50 12) is kept as written; Ali's calibration item.
  it.fails('sugammadex (DI-45): 4 mg/kg gives < 5 % HR fall — measured 13.4 % (16 mg/kg 20.5 %)', () => {
    expect(hrFall('sugammadex', 4)).toBeLessThan(0.05);
  });
});

/** FU-7 Task 13 (addendum 24 / audit D14): local-anaesthetic toxicity is ADDITIVE by potency-weighted dose (ASRA 2020). */
describe('LAST additivity (R51 addendum 24)', () => {
  const TH = LAST_THRESHOLDS;
  /** Every second for 10 min: the published effects and the fractional sums of the agents' concentrations (pH 7.4, no lipid). */
  function trace(doses: [string, number, string][]) {
    const r = rig();
    for (const [id, d, u] of doses) give(r, id, d, u);
    const out: { cnsE: number; cvE: number; seizure: boolean; uCns: number; uCv: number; uSeiz: number }[] = [];
    runTo(r, 10, (b) => {
      let uCns = 0, uCv = 0, uSeiz = 0;
      for (const [id, th] of Object.entries(TH)) { const c = r.pk.lastC[id] ?? 0; uCns += c / th.cns; uCv += c / th.cv; uSeiz += c / th.seizure; }
      out.push({ cnsE: b.last.cnsE, cvE: b.last.cvE, seizure: b.cns.seizure, uCns, uCv, uSeiz });
    });
    return out;
  }
  it('a sole agent keeps the pre-FU-7 effect exactly: hill(c/th, 1, 1, 3) ≡ hill(c, th, 1, 3), and 0.5 at its threshold', () => {
    expect(hill(1, 1, 1, 3)).toBe(0.5);
    for (const x of trace([['bupivacaine', 100, 'mg']])) {
      expect(x.cnsE).toBeCloseTo(hill(x.uCns * TH.bupivacaine!.cns, TH.bupivacaine!.cns, 1, 3), 12);
      expect(x.cvE).toBeCloseTo(hill(x.uCv * TH.bupivacaine!.cv, TH.bupivacaine!.cv, 1, 3), 12);
    }
  });
  it('two agents ADD: lidocaine + bupivacaine give the Hill of the summed fractions, more than either alone (DI-23)', () => {
    const both = trace([['lidocaine', 1.5, 'mg/kg'], ['bupivacaine', 100, 'mg']]);
    const bup = trace([['bupivacaine', 100, 'mg']]);
    for (const x of both) expect(x.cnsE).toBeCloseTo(hill(x.uCns, 1, 1, 3), 12);
    expect(Math.max(...both.map((x) => x.cnsE))).toBeGreaterThan(Math.max(...bup.map((x) => x.cnsE)) + 0.01);
  });
  it('the seizure flag fires on the SUM (≈ 0.6 + 0.6 of each agent\'s seizure threshold), not on either alone', () => {
    const lido = trace([['lidocaine', 4, 'mg/kg']]);
    const bup = trace([['bupivacaine', 44, 'mg']]);
    const both = trace([['lidocaine', 4, 'mg/kg'], ['bupivacaine', 44, 'mg']]);
    expect(Math.max(...lido.map((x) => x.uSeiz))).toBeLessThan(1);
    expect(Math.max(...bup.map((x) => x.uSeiz))).toBeLessThan(1);
    expect(lido.some((x) => x.seizure) || bup.some((x) => x.seizure)).toBe(false);
    expect(both.some((x) => x.seizure)).toBe(true);
  });
});
