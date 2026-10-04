// FU-9 Task A13 (H8; research/13 RH-08): mannitol 1 g/kg is an effective ECF osmole in 7c's pool — it draws water from the
// cells (plasma volume up, Na down: translocational hyponatraemia) before 7d's kidney clears it. "GA vent" (helpers/fu9.ts),
// mannitol at 300 s against the same timeline without it.
import { describe, expect, it } from 'vitest';
import { arm, bvMl, ev, GA_VENT, once, st } from '../helpers/fu9.ts';

const T = 300;
const read = once(async () => {
  const f = (e: Parameters<typeof bvMl>[0]) => ({ bv: bvMl(e), na: st(e).blood.out.na, osm: st(e).blood.out.osm });
  const p = await arm([...GA_VENT, [T, ev({ kind: 'drug', drugId: 'mannitol', dose: 1, unit: 'g/kg', route: 'iv' })]], [T + 900], f);
  const c = await arm(GA_VENT, [T + 900], f);
  const [a, b] = [p[0], c[0]] as { bv: number; na: number; osm: number }[];
  return { dBv: (a as { bv: number }).bv - (b as { bv: number }).bv, dNa: (a as { na: number }).na - (b as { na: number }).na, dOsm: (a as { osm: number }).osm - (b as { osm: number }).osm };
});

describe('FU-9 H8: mannitol is a plasma osmole (research/13 RH-08)', { timeout: 600_000 }, () => {
  it('1 g/kg, at 15 min: blood volume up ≥ 50 mL, Na down ≥ 3 mmol/L, osmolality up ≥ 5 (measured +73 mL, −7.6, +8.7; main −2 mL, +0.1, +0.2)', async () => {
    const r = await read();
    console.log(`FU-9 H8 mannitol 15 min: BV ${r.dBv.toFixed(0)} mL, Na ${r.dNa.toFixed(1)}, osm ${r.dOsm.toFixed(1)}`);
    expect(r.dBv).toBeGreaterThanOrEqual(50);
    expect(r.dNa).toBeLessThanOrEqual(-3);
    expect(r.dOsm).toBeGreaterThanOrEqual(5);
  });
  // R45 (RH-08c): measured osmolality +20–30 mOsm/kg after 1 g/kg (the osmolal gap). 7c's pool is the whole ECF (≈ 14 L:
  // 385 mOsm → +27 at once), and the water it draws from the cells dilutes it within minutes; measured +8.7 — Ali's
  // question (OQ12: the distribution volume in the first minutes, or the band read as a peak).
  it.fails('1 g/kg: osmolality +20–30 mOsm/kg at 15 min (RH-08c) — measured +8.7', async () => {
    expect((await read()).dOsm).toBeGreaterThanOrEqual(20);
  });
});
