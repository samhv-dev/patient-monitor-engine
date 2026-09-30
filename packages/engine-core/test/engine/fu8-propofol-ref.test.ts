// FU-8 Task A28 (V.1 gate note §10 item 2; FU-4 G10 × F4): the drug model's resting-output reference is in L/min for
// every size. Before FU-8 (origin/main) a drug dosed after the first seconds saw q = CO / reference ≈ effKg / 70: a
// 16 kg child dosed at 120 s read q 0.20 (7c's co0 had settled to L/min while engine.ts still converted it from the
// pre-F4 gas units), shrinking propofol's V1 and CL2/CL3. MODELED, seed 7, ventilated (8 mL/kg).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { circCardiacOutput, type CircModelState } from '../../src/l2/circ/model.ts';

async function qAfter(patient: Record<string, unknown>, doseAt: number): Promise<number> {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ...patient, sensors: { abp: 'connected' } } as never });
  let n = 0;
  const ev = (event: Record<string, unknown>) => e.dispatch({ id: `q${++n}`, issuedBy: 'test', type: 'applyEvent', event } as never);
  e.advanceTo(1);
  ev({ kind: 'airwayDevice', device: 'ett' });
  ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: Math.round(8 * (patient.weightKg as number)), peep: 5, fio2: 0.5 });
  e.advanceTo(doseAt);
  ev({ kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' });
  e.advanceTo(doseAt + 60);
  await new Promise((r) => setImmediate(r));
  const x = e as unknown as { st: { hemo: { circ: CircModelState } }; pkCtx(ps: unknown): { coRefLpm: number } };
  return circCardiacOutput(x.st.hemo.circ) / x.pkCtx(x.st).coRefLpm;
}

describe('FU-8 A28: the drug model\'s resting-output reference', () => {
  it('16 kg child, propofol 2 mg/kg at 120 s: q = CO / reference 0.8–1.2, read 60 s later (origin/main: 0.20 — effKg/70)', async () => {
    const q = await qAfter({ ageY: 5, sex: 'M', weightKg: 16, heightCm: 108 }, 120);
    console.log(`fu8 A28: child q ${q.toFixed(3)}`);
    expect(q).toBeGreaterThanOrEqual(0.8);
    expect(q).toBeLessThanOrEqual(1.2);
  }, 60_000);
  it('70 kg adult, the same: q 0.8–1.2 (bit-identical to origin/main: 0.075 × 70 = 5.25)', async () => {
    const q = await qAfter({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175 }, 120);
    expect(q).toBeGreaterThanOrEqual(0.8);
    expect(q).toBeLessThanOrEqual(1.2);
  }, 60_000);
});
