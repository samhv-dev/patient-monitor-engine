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

// Executor (FU-8 Part B, base 4a1cc3f7): the tonic share is removed by the ANAESTHETIC's output factor `outF` only (plan
// D15's formula; research/23 §6.3 note 4), not by the brainstem-perfusion factor the prototype's line also carried —
// with it, FU-9's GA kidney (H1, 0.49 < 0.5 mL/kg/h) and massive-transfusion rows (F5, an arrest) moved through
// `cbfRel`. Measured: healthy −30.3, 80 y −37.1, HTN 60 y −35.3, HFrEF −41.2 % (before B4: −22.7 / −23.5 / −22.7 / −21.6).
const memo = <T>(f: () => Promise<T>) => { let p: Promise<T> | undefined; return () => (p ??= f()); };
const healthy = memo(() => fall({ ageY: 40 }));
const htn = memo(() => fall({ ageY: 60, conditions: [{ id: 'htn' }] }));

describe('FU-8 B4 (C1): the induction fall depends on resting sympathetic tone', () => {
  it('healthy 40 y stays in S1 (−20 … −40 %); 80 y and HFrEF each fall at least 5 points more', async () => {
    const h = await healthy();
    const rows = { elderly: await fall({ ageY: 80 }), hfref: await fall({ ageY: 60, conditions: [{ id: 'hfref' }] }) };
    console.log(`fu8 B4: healthy ${(h * 100).toFixed(2)} %, ${Object.entries(rows).map(([k, v]) => `${k} ${(v * 100).toFixed(2)} %`).join(', ')}`);
    expect(h).toBeLessThanOrEqual(-0.2);
    expect(h).toBeGreaterThanOrEqual(-0.4);
    for (const v of Object.values(rows)) expect(v).toBeLessThanOrEqual(h - 0.05);
  }, 120_000);
  // R45 (E-FU8B-6): the plan's row, kept with its number — the HTN tonic size (+0.1) is the owner's calibration item (A23)
  // FU-7.1 gate B: flipped (a known miss that turns green is flipped) — FU-7.1 B3's alveolar-washout fall of the
  // low-flow factor moves the HTN induction fall to −35.42 % against the healthy −30.28 %: 5.14 points (was 4.96).
  it('untreated HTN 60 y falls at least 5 points more than the healthy 40 y — measured 5.14 points (−35.42 vs −30.28 %) after FU-7.1 B3 (4.96 before it)', async () => {
    const h = await healthy();
    const v = await htn();
    console.log(`fu8 B4: HTN 60 y ${(v * 100).toFixed(2)} % vs healthy ${(h * 100).toFixed(2)} %`);
    expect(v).toBeLessThanOrEqual(h - 0.05);
  }, 120_000);
});
