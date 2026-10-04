// FU-9 Task A8 (F11): brain water follows a FALL in plasma effective osmolality (the osmotherapy calibration's gain).
import { describe, expect, it } from 'vitest';
import { NO_DRUGS } from '../../../src/l2/brain/flow.ts';
import { brainParams, createBrain, stepBrain, type BrainInputs } from '../../../src/l2/brain/model.ts';
import { OSM_WATER_ML_PER_MOSM } from '../../../src/l2/brain/params.ts';

const REST: BrainInputs = { map: 90, cvp: 6, paco2: 40, pao2: 100, sao2: 0.97, hb: 14, tempC: 37, drugs: NO_DRUGS, osm: 290 };
const run = (osm: number, secs: number) => {
  const b = createBrain(brainParams(), REST);
  for (let k = 0; k < 600; k++) stepBrain(b, REST, 0.1);
  const icp0 = b.icp;
  for (let k = 0; k < secs * 10; k++) stepBrain(b, { ...REST, osm }, 0.1);
  return { water: b.osmWater ?? 0, dIcp: b.icp - icp0 };
};

describe('FU-9 F11: hypo-osmolar brain swelling (Hahn 2006; Adrogué & Madias 2000)', () => {
  it('gain = the osmotherapy calibration (0.145 mL per mOsm/kg); −15 mOsm/kg → ≈ 2.2 mL in 30 min and ICP up; a rise adds nothing', () => {
    expect(OSM_WATER_ML_PER_MOSM).toBeCloseTo(0.1454, 3);
    const lo = run(275, 1800);
    console.log(`FU-9 F11 brain: osm −15 → water +${lo.water.toFixed(2)} mL, ICP +${lo.dIcp.toFixed(2)}`);
    expect(lo.water).toBeCloseTo(15 * OSM_WATER_ML_PER_MOSM, 1);
    expect(lo.dIcp).toBeGreaterThan(0);
    expect(run(305, 1800).water).toBe(0);
    const none = createBrain(brainParams(), { ...REST, osm: undefined });
    for (let k = 0; k < 600; k++) stepBrain(none, { ...REST, osm: undefined }, 0.1);
    expect(none.osmWater).toBeUndefined(); // without 7c nothing changes
  });
});
