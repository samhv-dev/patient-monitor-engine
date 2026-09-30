// FU-8 Task A22 (research/20 DV-02b, DV-03; gap V4): EtCO2 under CPR follows the circulation. MODELED, seed 7,
// ventilated (ETT + VCV 12 × 600, PEEP 5, FiO2 0.5). Before FU-8 (origin/main 3feee6f): EtCO2 under CPR came from a
// quality fit blind to the circulation — a bled-out patient at CoPP 3.1 read 17.4, as VF with a full circulation.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { cardiacOutput } from '../../src/l2/gas/coupling.ts';
import type { HemoState } from '../../src/l2/hemo/pipeline.ts';

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

describe('FU-8 A22: EtCO2 under CPR follows the blood the compressions move through the lungs', () => {
  it('VF + CPR q 1, minutes 2–8: EtCO2 10–20 mmHg (research/20 DV-02b; Sanders 1989: 15 ± 4 in survivors)', async () => {
    const v = await vfCpr();
    console.log(`fu8 A22: VF CPR EtCO2 ${v.etco2.toFixed(1)}`);
    expect(v.etco2).toBeGreaterThanOrEqual(10);
    expect(v.etco2).toBeLessThanOrEqual(20);
  }, 120_000);
  it('complete exsanguination (3 L / 10 min) → PEA → CPR q 0.8 alone from 720 s: EtCO2 < 10 mmHg (research/20 DV-03: 17.4 before FU-8 at CoPP 3.1; AHA 2020: < 10 = no effective output)', async () => {
    const r = rig();
    r.e.advanceTo(60);
    r.send({ type: 'applyEvent', event: { kind: 'bleed', volumeMl: 3000, overS: 600 } });
    r.e.advanceTo(720);
    r.send({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 0.8 } });
    const et = await sample(r, 780, 1320, (s) => s.resp.etco2);
    console.log(`fu8 A22: bled-out CPR EtCO2 ${et.toFixed(1)}`);
    expect(et).toBeLessThan(10);
  }, 120_000);
  it('a 16 kg child, VF + CPR q 0.8: the gas exchange\'s CPR flow scales with the patient — 10–30 mL/kg/min (origin/main: an adult-absolute 1.01 L/min = 63 mL/kg/min, coRatio 0.84, EtCO2 38.6; V.1 Decision 25)', async () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 5, sex: 'M', weightKg: 16, heightCm: 108, sensors: { co2: 'on' } } as never });
    let n = 0;
    const ev = (event: Record<string, unknown>) => e.dispatch({ id: `k${++n}`, issuedBy: 'test', type: 'applyEvent', event } as never);
    e.advanceTo(1);
    ev({ kind: 'airwayDevice', device: 'ett' });
    ev({ kind: 'ventilation', source: 'ventilator', rr: 10, vtMl: 112, peep: 5, fio2: 1 });
    e.advanceTo(60);
    e.dispatch({ id: 'vf', issuedBy: 'test', type: 'setRhythm', rhythm: 'vfCoarse' } as never);
    ev({ kind: 'cpr', active: true, rate: 110, quality: 0.8 });
    let q = 0;
    let k = 0;
    for (let t = 120; t <= 360; t += 5) {
      e.advanceTo(t);
      q += cardiacOutput((e as unknown as { st: { hemo: HemoState } }).st.hemo, t);
      k++;
      if (t % 60 === 0) await new Promise((r) => setImmediate(r));
    }
    const perKg = ((q / k) * 1000) / 16;
    console.log(`fu8 A22: child CPR flow ${(q / k).toFixed(2)} L/min = ${perKg.toFixed(0)} mL/kg/min`);
    expect(perKg).toBeGreaterThanOrEqual(10);
    expect(perKg).toBeLessThanOrEqual(30);
  }, 120_000);
});
