// FU-7 Tasks 12–18: drug interactions and single-target rows (12: sugammadex bradycardia; 13: LAST additivity; 15–18 add
// the volatile, histamine, inotrope and inert-row cases).
// Driven through 7g's REAL PK (the 7f rig: one simulated second per step, neutral context).
import { describe, expect, it } from 'vitest';
import { LAST_THRESHOLDS } from '../../../src/l2/pk/data/rows-other.ts';
import { hill } from '../../../src/l2/pk/pd.ts';
import { give, rig, runTo, vaporiser } from '../../helpers/neuro.ts';

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

/** FU-7 Task 15 (addendum 24): the second-gas effect and the end-tidal desflurane surge trigger. */
describe('volatiles: second gas and the desflurane trigger (R51 addendum 24)', () => {
  /** FA/FI of the potent agent and of N2O after `min` minutes of `agent` at `dial` % with `n2o` (fraction), FGF 6. */
  function faFi(agent: 'sevoflurane' | 'desflurane', dial: number, n2o: number, min = 5) {
    const r = rig();
    vaporiser(r, agent, dial, 6, n2o);
    runTo(r, min);
    const v = r.pk.vap!;
    return { potent: v.s.fa / v.s.fi, n2o: v.n2o.fi > 0 ? v.n2o.fa / v.n2o.fi : Number.NaN };
  }
  // R45 (Task 15 UNPROTOTYPED): the uptake-augmented ventilation is the plan's whole mechanism; no scale is fitted.
  it.fails('second gas: 66 % N2O raises sevoflurane 2 %\'s FA/FI at 5 min by +0.03 to +0.15 (Epstein 1964; M10 ch. 19); N2O\'s own FA/FI is unchanged (a one-way term) — measured +0.021 (0.713 → 0.733), N2O unchanged', () => {
    const air = faFi('sevoflurane', 2, 0).potent;
    const withN2o = faFi('sevoflurane', 2, 0.66);
    const n2oAlone = faFi('sevoflurane', 0, 0.66).n2o;
    console.log(`FU-7 T15: sevoflurane FA/FI at 5 min air ${air.toFixed(3)} vs 66 % N2O ${withN2o.potent.toFixed(3)}; N2O FA/FI ${withN2o.n2o.toFixed(4)} (alone ${n2oAlone.toFixed(4)})`);
    expect(withN2o.potent - air).toBeGreaterThanOrEqual(0.03);
    expect(withN2o.potent - air).toBeLessThanOrEqual(0.15);
    expect(withN2o.n2o).toBeCloseTo(n2oAlone, 9);
  });
  // Declared v1 scope (Task 15 Step 1): N2O's OWN concentration effect is not modelled — N2O stays on VA.
  it.fails('concentration effect: 66 % N2O reaches a higher FA/FI at 5 min than 30 % N2O — measured 0.810 both (not modelled in v1)', () => {
    const hi = faFi('sevoflurane', 0, 0.66).n2o;
    const lo = faFi('sevoflurane', 0, 0.3).n2o;
    console.log(`FU-7 T15: N2O FA/FI at 5 min 66 % ${hi.toFixed(4)} vs 30 % ${lo.toFixed(4)}`);
    expect(hi).toBeGreaterThan(lo + 1e-6);
  });
  /** The first second the desflurane surge fires after a dial step at 300 s (NaN: never), and whether it fired at all. */
  function stepFires(agent: 'sevoflurane' | 'desflurane', from: number, to: number): number {
    const r = rig();
    vaporiser(r, agent, from, 4);
    runTo(r, 5);
    vaporiser(r, agent, to, 4);
    let fired = Number.NaN;
    runTo(r, 10, (_b, tMin) => { if (Number.isNaN(fired) && r.pk.desSurgeT > 0 && r.pk.desSurgeT >= 300) fired = tMin * 60 - 300; });
    return fired;
  }
  // R45: at FGF 4 the circuit washes in over minutes (FA/MAC 0.33 at +15 s, 0.59 at +60 s, 1.03 at +3 min), so when the
  // end-tidal MAC crosses 1 its 60 s rise is ≈ 0.16, under the trigger's 0.3 — the surge never fires. Thresholds kept.
  it.fails('a desflurane dial step 3 → 12 % at FGF 4 fires the surge within 60 s (the END-TIDAL trigger; DI-70: brain MAC never fired it) — measured: never within 5 min (end-tidal MAC 1.03 at +3 min, 60 s rise ≈ 0.16 < 0.3)', () => {
    const s = stepFires('desflurane', 3, 12);
    console.log(`FU-7 T15: desflurane 3 → 12 % surge fires at +${s} s`);
    expect(s).toBeLessThanOrEqual(60);
  });
  it('a sevoflurane step does not fire it, and a desflurane step that stays below 1 MAC does not either', () => {
    expect(stepFires('sevoflurane', 1, 6)).toBeNaN();
    expect(stepFires('desflurane', 1, 4)).toBeNaN();
  });
});
