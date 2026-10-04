// FU-9 Task B1 (F10): hypokalaemia prolongs rocuronium (research/22 BF-09b). Rig = the BF runner's GA vent, profile K 2.5
// vs 4.2; rocuronium 0.6 mg/kg at 300 s; the time from the dose to T1 back at 25 % (7f's truth TOF).
import { describe, expect, it } from 'vitest';
import { arm, ev, GA_VENT, MAN, st } from '../helpers/fu9.ts';

const t25 = async (k: number): Promise<number> => {
  const at = Array.from({ length: 360 }, (_, i) => 600 + 10 * i); // 5–65 min after the dose, every 10 s
  const t1 = await arm([...GA_VENT, [300, ev({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' })]], at,
    (e) => (st(e) as unknown as { neuro: { last: { tof: { t1: number } } } }).neuro.last.tof.t1, { ...MAN, blood: { k } });
  const i = t1.findIndex((v) => v >= 0.25);
  return i < 0 ? Number.POSITIVE_INFINITY : ((at[i] as number) - 300) / 60;
};

describe('FU-9 F10: hypokalaemia prolongs a non-depolarising block', { timeout: 600_000 }, () => {
  it('rocuronium 0.6 mg/kg: T1 25 % later at K 2.5 than at 4.2 by ≥ 1 min (was identical, 35.7 min)', async () => {
    const lo = await t25(2.5);
    const n = await t25(4.2);
    console.log(`FU-9 F10: T1 25 % at ${lo.toFixed(1)} min (K 2.5) vs ${n.toFixed(1)} min (K 4.2)`);
    expect(lo - n).toBeGreaterThanOrEqual(1);
  });
});
