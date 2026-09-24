import { describe, expect, it } from 'vitest';
import { aorticPressure, radialPressure, restState, stepCirculation, type CircInputs } from '../../../src/l2/hemo/circulation.ts';
import { flowAt, makePulse, sinPowIntegral } from '../../../src/l2/hemo/ejection.ts';
import { BACKFLOW_FRAC, EJECTION_SKEW, H_S, KAPPA, lvetS } from '../../../src/l2/hemo/params.ts';

/** Periodic beats of `sv` mL at `hr`; returns radial and aortic max/min/mean over the last 10 s of 30 s. */
function steady(hr: number, sv: number, R = 1.05) {
  const rr = 60 / hr;
  const lv = Array.from({ length: Math.ceil(31 / rr) }, (_, k) => makePulse(k * rr, lvetS(hr), sv, KAPPA, BACKFLOW_FRAC, EJECTION_SKEW));
  const x: CircInputs = { lv, rv: [], thor: [], pFloor: 5, pawp: 8, R, Rp: 0.1 };
  const s = restState(90, 15);
  const r = { max: -Infinity, min: Infinity, sum: 0, n: 0 };
  const a = { max: -Infinity, min: Infinity };
  for (let i = 0; i < Math.round(30 / H_S); i++) {
    const t = i * H_S;
    stepCirculation(s, t, H_S, x);
    if (t < 20) continue;
    const pr = radialPressure(s, t + H_S, x);
    const pa = aorticPressure(s, t + H_S, x);
    r.max = Math.max(r.max, pr);
    r.min = Math.min(r.min, pr);
    r.sum += pr;
    r.n++;
    a.max = Math.max(a.max, pa);
    a.min = Math.min(a.min, pa);
  }
  return { rSys: r.max, rDia: r.min, rMean: r.sum / r.n, aSys: a.max, aDia: a.min };
}

describe('l2/hemo ejection and circulation (brief §4.2)', () => {
  it('each pulse ejects exactly SV (net of the backflow)', () => {
    const p = makePulse(0, 0.3, 70, KAPPA, BACKFLOW_FRAC, EJECTION_SKEW);
    let v = 0;
    for (let t = 0; t < 0.4; t += 1e-5) v += flowAt([p], t) * 1e-5;
    expect(v).toBeCloseTo(70, 1);
    expect(sinPowIntegral(1)).toBeCloseTo(2 / Math.PI, 5);
  });

  it('acceptance 4: at SV 70 and C 1.5 the radial PP is 40–55 mmHg', () => {
    const r = steady(75, 70);
    expect(r.rSys - r.rDia).toBeGreaterThanOrEqual(40);
    expect(r.rSys - r.rDia).toBeLessThanOrEqual(55);
  });

  it('radial SBP exceeds aortic SBP by 5–20 mmHg with the same mean (research 03 §2.3)', () => {
    const r = steady(75, 70);
    expect(r.rSys - r.aSys).toBeGreaterThanOrEqual(5);
    expect(r.rSys - r.aSys).toBeLessThanOrEqual(20);
  });

  it('MAP = P_floor + R·mean flow in steady state (Windkessel DC gain)', () => {
    const r = steady(75, 70, 1.2);
    expect(r.rMean).toBeCloseTo(5 + 1.2 * ((70 * 75) / 60), 0);
  });
});
