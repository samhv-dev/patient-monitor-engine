// FU-7 Task 14 (R51 addendum 24; research/14 DI-51, DI-37c): the two cases that need the whole engine — the volatile's
// own PK for DI-51's duration band, and 7c's blood K for the succinylcholine surge on 7f's nm profile. The audit's
// ventilated rig (ETT + VCV 12 × 600, PEEP 5, FiO2 0.5), 10 s samples; one yield per sim-MINUTE. SLOW_A.
import { describe, expect, it } from 'vitest';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

type Ev = Record<string, unknown>;
async function arm(steps: [number, Ev][], tEnd: number, dt = 10) {
  const e = rig6(undefined, 'modeled', 7);
  await runTo(e, 1);
  send(e, { kind: 'airwayDevice', device: 'ett' });
  send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 });
  const q = [...steps];
  const rows: { t: number; t1: number; k: number }[] = [];
  await runTo(e, tEnd, (u) => {
    while (q.length && q[0]![0] <= u) send(e, q.shift()![1]);
    const s = st6(e);
    rows.push({ t: u, t1: (s.neuro?.last?.tof?.t1 as number | undefined) ?? Number.NaN, k: s.blood.out.k as number });
  }, dt);
  return rows;
}
const drug = (drugId: string, dose: number, unit: string): Ev => ({ kind: 'drug', drugId, dose, unit, route: 'iv' });

describe('FU-7 Task 14: one state each (engine)', { timeout: 1_800_000 }, () => {
  it('1 MAC sevoflurane prolongs rocuronium\'s T1 25 % time by 25–80 % (DI-51; M10 ch. 24: 30–50 % at ≈ 1 MAC)', async () => {
    const roc: [number, Ev] = [1200, drug('rocuronium', 0.6, 'mg/kg')];
    const t25 = (rows: { t: number; t1: number }[]) => (rows.find((r) => r.t > 1500 && r.t1 >= 0.25)?.t ?? Number.NaN) - 1200;
    const vol = await arm([[60, { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 4, n2oFrac: 0 }], roc], 1200 + 7200);
    const tiva = await arm([roc], 1200 + 7200);
    const pct = (100 * (t25(vol) - t25(tiva))) / t25(tiva);
    console.log(`FU-7 T14 DI-51: T1 25 % sevoflurane ${(t25(vol) / 60).toFixed(1)} vs ${(t25(tiva) / 60).toFixed(1)} min: +${pct.toFixed(1)} %`);
    expect(pct).toBeGreaterThanOrEqual(25);
    expect(pct).toBeLessThanOrEqual(80);
  });
  it('the nm profile `denervation` raises the succinylcholine ΔK+ to 3–7 mmol/L; `normal` keeps 0.3–0.8 (DI-37c; ONE disease, ONE answer)', async () => {
    const dk = async (nm: string) => {
      const pre: [number, Ev][] = [[1, { kind: 'neuroProfile', nm }]];
      const i = await arm([...pre, [300, drug('succinylcholine', 1.5, 'mg/kg')]], 900);
      const c = await arm(pre, 900);
      return Math.max(...i.filter((r) => r.t >= 300 && r.t <= 900).map((r) => r.k)) - Math.min(...c.filter((r) => r.t >= 240 && r.t <= 300).map((r) => r.k));
    };
    const den = await dk('denervation');
    const nor = await dk('normal');
    console.log(`FU-7 T14 DI-37c: succinylcholine ΔK denervation ${den.toFixed(2)}, normal ${nor.toFixed(2)} mmol/L`);
    expect(den).toBeGreaterThanOrEqual(3);
    expect(den).toBeLessThanOrEqual(7);
    expect(nor).toBeGreaterThanOrEqual(0.3);
    expect(nor).toBeLessThanOrEqual(0.8);
  });
});
