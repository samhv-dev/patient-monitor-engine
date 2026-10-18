// FU-8 Task A24 (research/20 DV-02a; gap V8): cerebral blood flow under CPR. MODELED, seed 7, ventilated (ETT + VCV
// 12 × 600, PEEP 5, FiO2 0.5). Before FU-8 (origin/main 3feee6f): 0.71 of normal under good CPR (30–40 % at best).
// Source of the 30–40 % (fix-citations): Kern KB, Niemann JT, Steen S, "Coronary perfusion pressure during CPR", in
// Cardiac Arrest: The Science and Practice of Resuscitation Medicine, 2nd ed., Cambridge UP 2007, pp. 369–388,
// doi:10.1017/CBO9780511544828.020: standard compressions "can, at best, provide 30% to 40% of normal cerebral blood
// flow" (a review chapter, not a measurement; primary canine microsphere data e.g. Michael 1984, PMID 6697465:
// 41 ± 15 % of control WITH adrenaline, < 3 % without). Meaney 2013 (PMID 23801105) repeats the range in its text,
// not its abstract; it is not the source.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

type St = { resp: { etco2: number }; organs: { brain: { cbfRel: number } }; mods: { artefact: { cpr: { rateCpm: number; depth: number } | null } } };
function rig() {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected', spo2: 'on', co2: 'on' } } as never });
  let n = 0;
  const send = (body: Record<string, unknown>) => e.dispatch({ id: `c${++n}`, issuedBy: 'test', ...body } as never);
  e.advanceTo(1);
  send({ type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } });
  send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 } });
  return { e, send, st: () => (e as unknown as { st: St }).st };
}
async function sample(r: ReturnType<typeof rig>, t0: number, t1: number, f: (s: St) => number): Promise<number> {
  let sum = 0;
  let n = 0;
  for (let t = t0; t <= t1; t += 5) {
    r.e.advanceTo(t);
    sum += f(r.st());
    n++;
    if (t % 60 === 0) await new Promise((res) => setImmediate(res));
  }
  return sum / n;
}
let vfRun: Promise<{ etco2: number; cbf: number }> | undefined;
const vfCpr = (): Promise<{ etco2: number; cbf: number }> =>
  (vfRun ??= (async () => {
    const r = rig();
    r.e.advanceTo(60);
    r.send({ type: 'setRhythm', rhythm: 'vfCoarse' });
    r.e.advanceTo(120);
    r.send({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 1 } });
    r.e.advanceTo(175);
    let et = 0;
    let cbf = 0;
    let n = 0;
    for (let t = 180; t <= 600; t += 5) {
      r.e.advanceTo(t);
      et += r.st().resp.etco2;
      cbf += r.st().organs.brain.cbfRel;
      n++;
      if (t % 60 === 0) await new Promise((res) => setImmediate(res));
    }
    return { etco2: et / n, cbf: cbf / n };
  })());

describe('cerebral blood flow under CPR (research/20, gap V8)', () => {
  it('VF + CPR q 1, minutes 2–8: CBF below 0.5 of normal', async () => {
    const v = await vfCpr();
    console.log(`fu8 A24: VF CPR CBF ${v.cbf.toFixed(3)}`);
    expect(v.cbf).toBeLessThan(0.5);
  }, 120_000);
  // Title left for Stage 14 (fix-citations): its "Meaney 2013 consensus [VERIFY]" is resolved — the 30–40 % is Kern,
  // Niemann & Steen 2007's best case (see the header), which Meaney 2013 only repeats. The band is unchanged.
  it.fails('VF + CPR q 1: CBF 0.30–0.40 of normal (Meaney 2013 consensus [VERIFY]; research/20 band 0.2–0.45) — measured 0.45 (a model limitation for the calibration pass)', async () => {
    const v = await vfCpr();
    expect(v.cbf).toBeGreaterThanOrEqual(0.3);
    expect(v.cbf).toBeLessThanOrEqual(0.4);
  }, 120_000);
});
