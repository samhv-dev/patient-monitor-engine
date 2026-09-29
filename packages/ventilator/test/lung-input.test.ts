// engine → vent: lungState is the patient's lung, read as ABSOLUTE values (Stage 7b decision 15; Stage V.1, G7b rulings
// 4+5+13). The pleural opening pressure is pleural.test.ts.
import { describe, expect, it } from 'vitest';
import { applyLungState, createLungLink, createVent, type LungStateEvent } from '../src/index.ts';

const ls = (o: Partial<LungStateEvent>): LungStateEvent => ({ type: 'lungState', t: 0, complianceMlPerCmH2O: 50, resistanceCmH2OPerLps: 10, effort: 0, autoPeepTendency: 0, shunt: 0.04, deadSpaceMl: 215, frcMl: 2100, ...o });

describe('lungState → ventilator lung (absolute)', () => {
  it('takes C and R as they are; R_exp above R_insp is flow limitation with eflK = R_insp/R_exp; the profile lung holds until then', () => {
    const vs = createVent({ compliance: 33, resistance: 13 });
    const ll = createLungLink(vs.cfg);
    expect(ll.last).toBeNull();
    applyLungState(vs, ll, ls({}));
    expect([vs.cfg.compliance, vs.cfg.resistance, vs.cfg.efl, vs.cfg.pleural]).toEqual([50, 10, false, 0]);
    applyLungState(vs, ll, ls({ complianceMlPerCmH2O: 68, resistanceCmH2OPerLps: 25, resistanceExpCmH2OPerLps: 39, autoPeepTendency: 0.8 }));
    expect([vs.cfg.compliance, vs.cfg.resistance, vs.cfg.efl, vs.cfg.eflSeverity, vs.cfg.peepStent]).toEqual([68, 25, true, 'custom', 0]);
    expect(vs.cfg.eflK).toBeCloseTo(25 / 39, 6);
    applyLungState(vs, ll, ls({ complianceMlPerCmH2O: 25, pleuralCmH2O: 27.2 }));
    expect([vs.cfg.compliance, vs.cfg.resistance, vs.cfg.efl, vs.cfg.pleural]).toEqual([25, 10, false, 27.2]);
    expect(ll.last?.complianceMlPerCmH2O).toBe(25);
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
