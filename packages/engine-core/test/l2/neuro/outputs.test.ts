import { describe, expect, it } from 'vitest';
import { neuroOutputs } from '../../../src/l2/neuro/outputs.ts';

const base = { diRaw: 93, opioidFentEq: 0, antinoc: 0, thumbBlock: 0, hypEq: 0 };
describe('neuro outputs (decision 9)', () => {
  it('awake: neutral; no baroreflex field (7g owns it, R51 addendum 8)', () => {
    const o = neuroOutputs(base);
    expect([o.mapSetShiftMmHg, o.cmro2Mult, o.pupilMm, o.antinoc, o.nmb, o.thermoDepth]).toEqual([0, 1, 4, 0, 0, 0]);
    expect('baroGainMult' in o).toBe(false);
  });
  it('anaesthetised at DI 40: CMRO2 ×0.6, MAP shift −10 (published only); burst suppression ×0.45; opioid miosis; 7e fields clamped', () => {
    const o = neuroOutputs({ ...base, diRaw: 40, hypEq: 1, antinoc: 0.9, thumbBlock: 1 });
    expect(o.cmro2Mult).toBeCloseTo(0.6, 9);
    expect(o.mapSetShiftMmHg).toBeCloseTo(-10, 9);
    expect([o.thermoDepth, o.antinoc, o.nmb]).toEqual([1, 0.9, 1]);
    expect(neuroOutputs({ ...base, hypEq: 2.4 }).thermoDepth).toBe(1.5);
    expect(neuroOutputs({ ...base, diRaw: 20 }).cmro2Mult).toBe(0.45);
    expect(neuroOutputs({ ...base, opioidFentEq: 3 }).pupilMm).toBeLessThan(2.6);
  });
});
