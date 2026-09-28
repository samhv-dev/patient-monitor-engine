// FU-4 F3 (ruling 1, Task 18c): a tension pneumothorax fills through a ONE-WAY VALVE, so the pleural pressure rises
// over minutes toward the catalogue value (now a ceiling); obstructive shock and PEA belong at 3–10 min on PPV
// (Leigh-Smith & Harris, Emerg Med J 2005;22:8–16; ATLS 10th edn), the spontaneously breathing patient's HAEMODYNAMIC
// course is slower, and decompression is immediate (the audit's S8: MAP ≥ 65 within 1 min). `lp.pPtx` keeps its name,
// place and unit (mmHg). Rig: adult 40 y 70 kg MODELED, seed 7, `lungCondition ptxTension` severity 1 side R at 60 s;
// PPV = ETT + VCV 12 × 600 / PEEP 5 / FiO2 0.5; spontaneous = no airway device, room air. Decompression = severity 0
// (the ceiling goes; the accumulated pressure drains with PTX_DRAIN_TAU_S). SLOW_B; one yield per sim-minute.
import { describe, expect, it } from 'vitest';
import { createEngine, type Command } from '../../src/index.ts';
import { PTX_DRAIN_TAU_S } from '../../src/l2/lung/params.ts';

type St = { rhythm: { id: string; opts: { pulseless?: boolean } }; hemo: { circ: { mapNow: number } }; resp: { lung: { lp: { pPtx: number } } } };
let n = 0;
const ev = (event: Record<string, unknown>, atS = 0) => ({ id: `tp${++n}`, issuedBy: 'test', type: 'applyEvent', event, atTick: Math.round(atS * 50) }) as unknown as Command;
const PULSELESS = new Set(['vfCoarse', 'vfFine', 'asystole', 'pWaveAsystole', 'agonal']);

interface Course { pPtx: number[]; map: number[]; tPea?: number; mapAfterDecomp: Array<[number, number]>; pAtDecomp?: number }
async function run(ppv: boolean, endS: number, decompressAt?: number): Promise<Course> {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected', cvp: 'connected' } } });
  if (ppv) {
    e.dispatch(ev({ kind: 'airwayDevice', device: 'ett' }));
    e.dispatch(ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 }));
  }
  e.dispatch(ev({ kind: 'lungCondition', id: 'ptxTension', severity: 1, side: 'R' }, 60));
  if (decompressAt !== undefined) e.dispatch(ev({ kind: 'lungCondition', id: 'ptxTension', severity: 0, side: 'R' }, decompressAt));
  const st = () => (e as unknown as { st: St }).st;
  const c: Course = { pPtx: [], map: [], mapAfterDecomp: [] };
  for (let t = 61; t <= endS; t++) {
    e.advanceTo(t);
    const s = st();
    c.pPtx.push(s.resp.lung.lp.pPtx);
    c.map.push(s.hemo.circ.mapNow);
    if (c.tPea === undefined && (s.rhythm.opts.pulseless === true || PULSELESS.has(s.rhythm.id))) c.tPea = t;
    if (decompressAt !== undefined && t === decompressAt) c.pAtDecomp = s.resp.lung.lp.pPtx;
    if (decompressAt !== undefined && t > decompressAt && t <= decompressAt + 60) c.mapAfterDecomp.push([t - decompressAt, s.hemo.circ.mapNow]);
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  return c;
}
const at = (xs: number[], s: number) => xs[s - 1] as number; // index 0 = +1 s after onset

describe('FU-4 F3: the tension pneumothorax builds through a one-way valve', { timeout: 600_000 }, () => {
  const ppv = run(true, 60 + 12 * 60);
  it('PPV: the pleural pressure rises monotonically over minutes and PEA arrives 3–10 min after onset', async () => {
    const c = await ppv;
    const upTo = c.tPea !== undefined ? c.tPea - 61 : c.pPtx.length;
    const rises = c.pPtx.slice(0, upTo).every((p, i, a) => i === 0 || p >= (a[i - 1] as number) - 1e-9);
    console.log(`tension-ptx PPV: pPtx +10 s ${at(c.pPtx, 10).toFixed(1)}, +60 s ${at(c.pPtx, 60).toFixed(1)}, +240 s ${at(c.pPtx, 240).toFixed(1)}; MAP +60 ${at(c.map, 60).toFixed(0)}, +240 ${at(c.map, 240).toFixed(0)}; PEA at +${((c.tPea ?? NaN) - 60) / 60} min`);
    expect(at(c.pPtx, 10)).toBeLessThan(at(c.pPtx, 60)); // not a step
    expect(rises).toBe(true);
    expect(c.tPea).toBeDefined();
    expect(((c.tPea as number) - 60) / 60).toBeGreaterThanOrEqual(3);
    expect(((c.tPea as number) - 60) / 60).toBeLessThanOrEqual(10);
  });
  it('spontaneous breathing, same severity: no PEA in 15 min and a slower MAP course than on PPV', async () => {
    const c = await run(false, 60 + 15 * 60);
    const p = await ppv;
    console.log(`tension-ptx spontaneous: pPtx +60 s ${at(c.pPtx, 60).toFixed(1)}, plateau ${Math.max(...c.pPtx).toFixed(1)}; MAP +240 ${at(c.map, 240).toFixed(0)} (PPV ${at(p.map, 240).toFixed(0)}), min ${Math.min(...c.map).toFixed(0)}; PEA ${c.tPea ?? 'none'}`);
    expect(c.tPea).toBeUndefined();
    expect(at(c.map, 240)).toBeGreaterThan(at(p.map, 240));
  });
  it('decompression at +4 min on PPV: MAP ≥ 65 within 1 min, and the pleural pressure falls with PTX_DRAIN_TAU_S', async () => {
    const c = await run(true, 60 + 6 * 60, 60 + 240);
    const back = c.mapAfterDecomp.find(([, m]) => m >= 65);
    const p = c.pPtx[240 + PTX_DRAIN_TAU_S - 1] as number; // τ after the decompression
    console.log(`tension-ptx decompression: pPtx at decompression ${c.pAtDecomp?.toFixed(1)}, after τ ${p.toFixed(1)}; MAP ≥ 65 at +${back?.[0]} s`);
    expect(back).toBeDefined();
    expect(back![0]).toBeLessThanOrEqual(60);
    expect(p).toBeGreaterThan((c.pAtDecomp as number) * Math.exp(-1) * 0.8);
    expect(p).toBeLessThan((c.pAtDecomp as number) * Math.exp(-1) * 1.2);
  });
});
