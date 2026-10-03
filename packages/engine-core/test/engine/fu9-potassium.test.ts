// FU-9 Task A6 (F6): renal K excretion follows plasma K and the loop diuretic's flow, and a renal loss is not refilled
// from an unlimited cellular store (research/22 BF-08d). Rig = the BF runner's GA vent with a profile K 7.5 (normal pH);
// furosemide 40 mg at 300 s; K 3 h later against the same patient without it.
import { describe, expect, it } from 'vitest';
import { arm, ev, GA_VENT, MAN, once, st } from '../helpers/fu9.ts';

const HYPERK = { ...MAN, blood: { k: 7.5 } };
const read = (e: Parameters<typeof st>[0]) => ({ k: st(e).blood.out.k, kIcf: st(e).blood.core.so.kIcf });
const at = [300 + 3 * 3600];
const arms = once(async () => ({ // shared by both tests (R50 F10)
  f: (await arm([...GA_VENT, [300, ev({ kind: 'drug', drugId: 'furosemide', dose: 40, unit: 'mg', route: 'iv' })]], at, read, HYPERK))[0],
  c: (await arm(GA_VENT, at, read, HYPERK))[0],
}));

describe('FU-9 F6: kaliuresis (Young 1988; Good & Wright 1979; UK Renal Association 2023)', { timeout: 600_000 }, () => {
  it('furosemide 40 mg at K 7.5: K lower than the untreated patient at 3 h (was −0.002) and the cells share the loss', async () => {
    const { f, c } = await arms();
    if (!f || !c) throw new Error('no sample');
    console.log(`FU-9 F6: ΔK ${(f.k - c.k).toFixed(3)} at 3 h, cellular pool ${(f.kIcf - c.kIcf).toFixed(1)} mmol`);
    expect(f.k).toBeLessThan(c.k - 0.02);
    expect(f.kIcf).toBeLessThan(c.kIcf);
  });
  // R45 (research/22 BF-08d, dirOnly "beyond 0.1"): the band's size is Ali's (Open question 5). Under GA the diuresis is
  // small (+150 mL/h at the peak), the kaliuresis ≈ 10 mmol against the untreated patient's retention, and 300 mmol of
  // total-body K per mmol/L (Sterns 1981) turns that into −0.03 (−0.029); the alkalotic rig (pH 7.57) also holds K in the cells.
  it.fails('furosemide 40 mg at K 7.5: K ≥ 0.1 lower at 3 h — measured −0.029 (FU-9 F6; −0.042 before H1–H10 in the plan prototype)', async () => {
    const { f, c } = await arms();
    expect((f?.k ?? 0) - (c?.k ?? 0)).toBeLessThanOrEqual(-0.1);
  });
});
