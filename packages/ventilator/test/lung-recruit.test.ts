// engine → vent lungState mapping and the interim recruitment model.
import { describe, expect, it } from 'vitest';
import { applyLungState, createLungLink, createRecruit, createVent, recruitTarget, stepRecruit, type LungStateEvent } from '../src/index.ts';

const ls = (o: Partial<LungStateEvent>): LungStateEvent => ({ type: 'lungState', t: 0, complianceMlPerCmH2O: 50, resistanceCmH2OPerLps: 10, effort: 0, autoPeepTendency: 0, shunt: 0.04, deadSpaceMl: 215, frcMl: 2100, ...o });

describe('lungState → ventilator lung', () => {
  it('scales the profile lung by the change from the engine baseline; bronchospasm switches on flow limitation', () => {
    const vs = createVent({ compliance: 33, resistance: 13 });
    const ll = createLungLink(vs.cfg);
    applyLungState(vs, ll, ls({}));
    expect([vs.cfg.compliance, vs.cfg.resistance, vs.cfg.efl]).toEqual([33, 13, false]);
    applyLungState(vs, ll, ls({ resistanceCmH2OPerLps: 40, autoPeepTendency: 0.8 }));
    expect([vs.cfg.resistance, vs.cfg.efl, vs.cfg.eflSeverity]).toEqual([52, true, 'severe']);
    applyLungState(vs, ll, ls({ complianceMlPerCmH2O: 25 }));
    expect([vs.cfg.compliance, vs.cfg.resistance, vs.cfg.efl]).toEqual([17, 13, false]);
  });
  it('effort adds patient Pmus (8 cmH2O × effort) only when the profile does not breathe itself', () => {
    const vs = createVent();
    const ll = createLungLink(vs.cfg);
    applyLungState(vs, ll, ls({ effort: 0.5 }));
    expect([vs.cfg.spont, vs.cfg.pmus]).toEqual([true, 4]);
    applyLungState(vs, ll, ls({ effort: 0 }));
    expect(vs.cfg.spont).toBe(false);
  });
});

describe('interim recruitment → shunt', () => {
  const p = { shuntMax: 0.4, shuntMin: 0.15, p50: 10, k: 2.5 };
  it('logistic in total PEEP; slow to recruit (τ 40 s), faster to derecruit (τ 10 s); sends only moves ≥ 0.005', () => {
    expect(recruitTarget(p, 10)).toBeCloseTo(0.5, 6);
    const s = createRecruit(p, 5);
    const first = stepRecruit(s, p, 5, 0.02);
    expect(first).toBeCloseTo(0.4 - 0.25 * recruitTarget(p, 5), 3);
    expect(stepRecruit(s, p, 5, 0.02)).toBeNull();
    let t = 0;
    while (s.r < 0.5 * (recruitTarget(p, 5) + recruitTarget(p, 15))) { stepRecruit(s, p, 15, 0.02); t += 0.02; }
    expect(t).toBeGreaterThan(20);
    expect(t).toBeLessThan(35);
    let u = 0;
    const hi = s.r;
    while (s.r > 0.5 * (hi + recruitTarget(p, 5))) { stepRecruit(s, p, 5, 0.02); u += 0.02; }
    expect(u).toBeLessThan(t / 3);
  });
});
