// FU-10 Task A6 (E10, E13; research/14 ET-34, ET-15a): etomidate blunts the cortisol rise of surgery; the adrenal-
// insufficient patient is hypotensive after induction and answers phenylephrine poorly. Ventilated drug GA, seed 7.
import { describe, expect, it } from 'vitest';
import { drug, ev, GA, rows, st, VENTED, type Step } from '../helpers/fu10.ts';

const T = 300;
const H = 3600;
const INCISION: Step = [T + 600, ev({ kind: 'stimulus', intensity: 1 })];
const read = (e: Parameters<Parameters<typeof rows>[3]>[0]) => ({ cort: st(e).endo.core.out.cortisolNmolL as number, map: st(e).hemo.circ.mapNow as number });
const aiMemo = new Map<boolean, ReturnType<typeof aiArm0>>();
const aiArm = (adrenal: boolean) => {
  if (!aiMemo.has(adrenal)) aiMemo.set(adrenal, aiArm0(adrenal));
  return aiMemo.get(adrenal)!;
};
const aiArm0 = (adrenal: boolean) => rows([...VENTED, ...GA(T), INCISION, [T + 1200, drug('phenylephrine', 100, 'mcg')]], T + 2400, 10, read,
  adrenal ? { endo: { adrenalInsufficiency: true } } : {});
const mean = (r: { t: number; map: number }[], a: number, b: number) => { const w = r.filter((x) => x.t > a && x.t <= b); return w.reduce((s, x) => s + x.map, 0) / w.length; };

describe('FU-10 E10/E13: etomidate and adrenal insufficiency', { timeout: 900_000 }, () => {
  it('etomidate 0.3 mg/kg vs propofol 2 mg/kg, incision held 4 h: cortisol ≤ 0.8 × at 4 h (Wagner 1984)', async () => {
    const etom: Step[] = [[T, drug('etomidate', 0.3, 'mg/kg')], [T, drug('rocuronium', 0.6, 'mg/kg')], [T, ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2, n2oFrac: 0 })]];
    const e = await rows([...VENTED, ...etom, INCISION], T + 600 + 4 * H, 600, read);
    const p = await rows([...VENTED, ...GA(T), INCISION], T + 600 + 4 * H, 600, read);
    const ratio = e.at(-1)!.cort / p.at(-1)!.cort;
    console.log(`FU-10 E10: cortisol at 4 h ${e.at(-1)!.cort.toFixed(0)} vs ${p.at(-1)!.cort.toFixed(0)} nmol/L (ratio ${ratio.toFixed(3)})`);
    expect(ratio).toBeLessThanOrEqual(0.8);
  });
  it('adrenal insufficiency: a lower post-induction MAP and a phenylephrine rise ≤ 0.8 × normal (Annane 2017)', async () => {
    const a = await aiArm(true);
    const n = await aiArm(false);
    const minA = Math.min(...a.filter((x) => x.t > T && x.t <= T + 600).map((x) => x.map));
    const minN = Math.min(...n.filter((x) => x.t > T && x.t <= T + 600).map((x) => x.map));
    const pe = (r: typeof a) => Math.max(...r.filter((x) => x.t > T + 1200 && x.t <= T + 1500).map((x) => x.map)) - mean(r, T + 1140, T + 1200);
    console.log(`FU-10 E13: post-induction MAP ${minA.toFixed(1)} vs ${minN.toFixed(1)}; phenylephrine ratio ${(pe(a) / pe(n)).toFixed(2)}; surgical MAP ${(mean(a, T + 900, T + 1200) - mean(n, T + 900, T + 1200)).toFixed(1)}`);
    expect(minA).toBeLessThan(minN - 2);
    expect(pe(a) / pe(n)).toBeLessThanOrEqual(0.8);
  });
  // R45: the permissive term ([ENG] 0.25) is not tuned to the band. Before FU-7 this was an `it.fails` (measured −3.9;
  // −4.2 on the plan base 1b8bdd3). FU-7's stimulus surge (Task 10, addendum 25) now carries the incision's pressor
  // response, and the adrenal-insufficient patient's lower vasopressor responsiveness answers it less (ET-15a: healthy
  // surgical MAP 87.4 → 96.5, adrenal-insufficient 83.3 → 88.2), so the band is met on the merged tree.
  it('adrenal insufficiency: surgical MAP ≥ 5 mmHg below normal (research/14 ET-15a) — measured −8.1 with FU-7 (−3.9 before)', async () => {
    const a = await aiArm(true);
    const n = await aiArm(false);
    expect(mean(a, T + 900, T + 1200) - mean(n, T + 900, T + 1200)).toBeLessThanOrEqual(-5);
  });
});
