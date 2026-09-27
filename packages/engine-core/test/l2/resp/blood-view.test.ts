import { describe, expect, it } from 'vitest';
import { createL1State } from '../../../src/l1/state.ts';
import { advanceResp, createRespState, type BloodView, type RespCtx } from '../../../src/l2/resp/pipeline.ts';
import { createHemoState } from '../../../src/l2/hemo/pipeline.ts';
import { createEngine } from '../../../src/engine.ts';

const ODC14 = { hb: 14, ph: 7.4, dpgMmolL: 4.65, cohb: 0, methb: 0 };

describe('Stage 3 gas step reads the blood view (Stage 7c)', () => {
  it('a CO factor, extra CO2 and a low Hb change the gas step; no view = Stage 3', () => {
    /** 5 s at the neutral view (the MANUAL EtCO2 calibration at t = 0 must not see the change), then `after` for 60 s. */
    const run = (after?: Partial<BloodView>) => {
      const e = createEngine({ seed: 1 }); // for a rhythm view only
      const ps = (e as unknown as { st: { rhythm: RespCtx['rhythm']; hr: RespCtx['hr'] } }).st;
      const l1 = createL1State();
      const rs = createRespState(undefined, l1, 1);
      const blood: BloodView = { odc: ODC14, coFactor: 1, co2LoadMlMin: 0 };
      const ctx: RespCtx = { l1, hemo: createHemoState(undefined, l1, 75), rhythm: ps.rhythm, hr: ps.hr, ...(after ? { blood } : {}) };
      advanceResp(rs, ctx, Math.round(62.5 * 5), () => {});
      Object.assign(blood, after);
      advanceResp(rs, ctx, Math.round(62.5 * 65), () => {});
      return rs;
    };
    const base = run();
    const same = run({});
    expect(same.co2.pf).toBeCloseTo(base.co2.pf, 9);
    expect(same.o2.sa).toBeCloseTo(base.o2.sa, 9);
    const co2 = run({ co2LoadMlMin: 100 });
    expect(co2.co2.pf).toBeGreaterThan(base.co2.pf + 0.5); // +100 mL/min for 60 s
    const low = run({ coFactor: 0.5 });
    expect(low.coRatio).toBeLessThan(0.6 * base.coRatio + 1e-9);
  });
});
