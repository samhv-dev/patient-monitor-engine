// FU-8 Task B4 (research/19 C1; plan D15; for Ali's review BEFORE execution): an anaesthetic removes the TONIC
// sympathetic share of resting SVR, so the patients whose rest depends on it fall more. Propofol 2 mg/kg, ventilated,
// seed 7; nadir 60–360 s after the dose against the 60 s before it. Before (origin/main 0fd5397): every profile −21.6 to
// −23.4 %. Prototype: healthy −29.9, 80 y −37.2, HTN 60 y −35.0, 80 y HTN −42.9, HFrEF −42.7 %.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

async function fall(pt: Record<string, unknown>): Promise<number> {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { sex: 'M', weightKg: 70, ...pt, sensors: { abp: 'connected' } } as never });
  e.advanceTo(1);
  e.dispatch({ id: 'a', issuedBy: 'test', type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } } as never);
  e.dispatch({ id: 'b', issuedBy: 'test', type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 } } as never);
  const mapOf = () => (e as unknown as { st: { hemo: { circ: { mapNow: number } } } }).st.hemo.circ.mapNow;
  const pre: number[] = [];
  let nadir = Infinity;
  for (let t = 10; t <= 660; t += 5) {
    e.advanceTo(t);
    if (t > 240 && t <= 300) pre.push(mapOf());
    if (t === 300) e.dispatch({ id: 'p', issuedBy: 'test', type: 'applyEvent', event: { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' } } as never);
    if (t > 360) nadir = Math.min(nadir, mapOf());
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  return nadir / (pre.reduce((a, b) => a + b, 0) / pre.length) - 1;
}

describe('FU-8 B4 (C1): the induction fall depends on resting sympathetic tone', () => {
  it('healthy 40 y stays in S1 (−20 … −40 %); 80 y, untreated HTN and HFrEF each fall at least 5 points more', async () => {
    const h = await fall({ ageY: 40 });
    const rows = { elderly: await fall({ ageY: 80 }), htn: await fall({ ageY: 60, conditions: [{ id: 'htn' }] }), hfref: await fall({ ageY: 60, conditions: [{ id: 'hfref' }] }) };
    console.log(`fu8 B4: healthy ${(h * 100).toFixed(1)} %, ${Object.entries(rows).map(([k, v]) => `${k} ${(v * 100).toFixed(1)} %`).join(', ')}`);
    expect(h).toBeLessThanOrEqual(-0.2);
    expect(h).toBeGreaterThanOrEqual(-0.4);
    for (const v of Object.values(rows)) expect(v).toBeLessThanOrEqual(h - 0.05);
  }, 120_000);
});
