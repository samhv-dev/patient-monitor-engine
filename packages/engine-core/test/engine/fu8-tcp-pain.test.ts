// FU-8 Task B5 (research/20 DV-08c, gap V6; the DV amendment (f)): transcutaneous pacing hurts an awake patient. The
// pacer's output current is a nociceptive input added to the instructor's stimulus through the one `stimulus` shape, so
// 7e's catecholamines and 7f's arousal answer it and analgesia/sedation remove it. Before FU-8 B5 (origin/main 4a1cc3f7):
// awake CHB 30 → TCP 80 mA gave ΔNE 0 (research/20 DV-08c), and 100 mA read the same as 40 mA.
// Rig: adult 40 y, MODELED, seed 7; complete heart block (escape 30) at 60 s; the capture threshold set to 30 mA so 40 and
// 100 mA both capture at 70 ppm — identical paced haemodynamics, only the current differs. Means over 400–600 s. The GA
// arms (propofol 3.5 + remifentanil 4 µg/mL / ng/mL effect-site, ventilated) start the block 10 s before the pacer.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

type St = { endo: { core: { out: { nePgMl: number; epiPgMl: number } } }; hemo: { circ: { mapNow: number; hrModel: number } } };
async function arm(o: { ga: boolean; mA: number; threshold?: number }) {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected' } } as never });
  let n = 0;
  const send = (t: number, body: Record<string, unknown>) => e.dispatch({ id: `t${++n}`, issuedBy: 'test', atTick: Math.round(t * 50), ...body } as never);
  const ev = (t: number, event: Record<string, unknown>) => send(t, { type: 'applyEvent', event });
  if (o.ga) {
    ev(1, { kind: 'airwayDevice', device: 'ett' });
    ev(1, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 });
    ev(1, { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3.5 });
    ev(1, { kind: 'tci', drugId: 'remifentanil', mode: 'effect', target: 4 });
  }
  // under GA the block starts 10 s before the pacer (a 4 min anaesthetised CHB 30 collapses before pacing starts)
  const tChb = o.ga ? 290 : 60;
  send(tChb, { type: 'setRhythm', rhythm: 'avb3Wide', opts: { rateBpm: 30 } });
  if (o.threshold !== undefined) send(tChb, { type: 'setTarget', variable: 'paceThresholdMa', value: o.threshold });
  ev(300, { kind: 'pacer', action: 'set', mode: 'fixed', ratePpm: 70, mA: o.mA });
  const acc = { pre: { ne: 0, n: 0 }, ne: 0, epi: 0, map: 0, hr: 0, n: 0 };
  for (let t = 5; t <= 600; t += 5) {
    e.advanceTo(t);
    const s = (e as unknown as { st: St }).st;
    if (t > 240 && t <= 300) { acc.pre.ne += s.endo.core.out.nePgMl; acc.pre.n++; }
    if (t > 400) { acc.ne += s.endo.core.out.nePgMl; acc.epi += s.endo.core.out.epiPgMl; acc.map += s.hemo.circ.mapNow; acc.hr += s.hemo.circ.hrModel; acc.n++; }
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  return { nePre: acc.pre.ne / acc.pre.n, ne: acc.ne / acc.n, epi: acc.epi / acc.n, map: acc.map / acc.n, sinus: acc.hr / acc.n };
}
const f = (x: { ne: number; epi: number; map: number; sinus: number }) => `NE ${x.ne.toFixed(0)}, epi ${x.epi.toFixed(0)}, MAP ${x.map.toFixed(1)}, sinus-node rate ${x.sinus.toFixed(1)}`;

describe('FU-8 B5: transcutaneous pacing is painful when awake, not under analgesia and sedation', { timeout: 300_000 }, () => {
  it('DV-08c: awake CHB 30 → TCP 80 mA (default threshold 70): noradrenaline rises over its pre-pacing level (was ΔNE 0)', async () => {
    const r = await arm({ ga: false, mA: 80 });
    console.log(`fu8 B5 DV-08c: NE ${r.nePre.toFixed(0)} → ${r.ne.toFixed(0)} pg/mL`);
    expect(r.ne - r.nePre).toBeGreaterThan(0);
  });
  it('awake, the same capture at 100 vs 40 mA: noradrenaline, adrenaline, MAP and the sinus-node rate are higher at 100 mA', async () => {
    const hi = await arm({ ga: false, mA: 100, threshold: 30 });
    const lo = await arm({ ga: false, mA: 40, threshold: 30 });
    console.log(`fu8 B5 awake: 100 mA ${f(hi)}; 40 mA ${f(lo)}`);
    expect(hi.ne).toBeGreaterThan(lo.ne * 1.1);
    expect(hi.epi).toBeGreaterThan(lo.epi);
    expect(hi.map).toBeGreaterThan(lo.map);
    expect(hi.sinus).toBeGreaterThan(lo.sinus);
  });
  it('under propofol + remifentanil the same pair is within ± 10 % (noradrenaline and MAP): analgesia removes the pain response', async () => {
    const hi = await arm({ ga: true, mA: 100, threshold: 30 });
    const lo = await arm({ ga: true, mA: 40, threshold: 30 });
    console.log(`fu8 B5 GA: 100 mA ${f(hi)}; 40 mA ${f(lo)}`);
    expect(Math.abs(hi.ne / lo.ne - 1)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(hi.map / lo.map - 1)).toBeLessThanOrEqual(0.1);
  });
});
