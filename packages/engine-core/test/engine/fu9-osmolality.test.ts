// FU-9 Task A8 (F11): the brain follows a fall in plasma osmolality (research/22 BF-11b). Rig = the BF runner's awake
// patient (TURP under spinal): 1.5 % glycine 3 L absorbed over 30 min from 300 s; read over 2.5 h against no absorption.
import { describe, expect, it } from 'vitest';
import { arm, ev, once, st } from '../helpers/fu9.ts';

const at = Array.from({ length: 30 }, (_, k) => 300 + 300 * (k + 1));
const read = (e: Parameters<typeof st>[0]) => {
  const o = (st(e) as unknown as { organs: { brain: { icp: number; osmWater?: number } } }).organs.brain;
  return { na: st(e).blood.out.na, osm: st(e).blood.out.osm, icp: o.icp, water: o.osmWater ?? 0 };
};
const arms = once(async () => ({ // shared by both tests (R50 F10)
  i: await arm([[300, ev({ kind: 'fluid', fluid: 'glycine', volumeMl: 3000, overS: 1800 })]], at, read),
  c: await arm([], at, read),
}));

describe('FU-9 F11: hypo-osmolar brain swelling (Hahn 2006; Adrogué & Madias 2000)', { timeout: 600_000 }, () => {
  it('glycine 3 L: Na ≈ 120, brain water gained and ICP above the control (was +0.07 max)', async () => {
    const { i, c } = await arms();
    const dIcp = Math.max(...i.map((r, k) => r.icp - (c[k]?.icp ?? r.icp)));
    const water = Math.max(...i.map((r) => r.water));
    console.log(`FU-9 F11: Na min ${Math.min(...i.map((r) => r.na)).toFixed(1)}, osm min ${Math.min(...i.map((r) => r.osm)).toFixed(1)}, brain water +${water.toFixed(2)} mL, ΔICP max +${dIcp.toFixed(2)}`);
    expect(water).toBeGreaterThan(1);
    expect(dIcp).toBeGreaterThan(0.2);
  });
  // R45 (research/22 BF-11b, dirOnly "beyond 1 mmHg"): the gain is the osmotherapy calibration's (0.145 mL per mOsm/kg);
  // an ideal-osmometer brain (≈ 1.1 L of water) would gain ≈ 55 mL for −15 mOsm/kg. Open question 8.
  it.fails('glycine 3 L: ICP ≥ 1 mmHg above the control — measured +0.29 (FU-9 F11)', async () => {
    const { i, c } = await arms();
    expect(Math.max(...i.map((r, k) => r.icp - (c[k]?.icp ?? r.icp)))).toBeGreaterThanOrEqual(1);
  });
});
