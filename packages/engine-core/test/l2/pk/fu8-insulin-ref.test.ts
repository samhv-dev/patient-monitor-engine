// FU-8 Task B1 (review pack DR-44): the insulin infusion reference is per kg. Through the engine's public API, seed 7.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../../src/index.ts';

const eng = () => createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70 } });
const drug = (e: ReturnType<typeof eng>, event: Record<string, unknown>) => e.dispatch({ id: `d${Math.random()}`, issuedBy: 'test', type: 'applyEvent', event: { kind: 'drug', route: 'iv', ...event } } as never);

describe('FU-8 B1: the insulin infusion reference is per kg', () => {
  it('0.1 units/kg/h (7 units/h at 70 kg) is ONE reference rate: glucose shift −60 mg/dL, K shift −0.6 at 60 min (was 70 rates: −118 / −1.18, the E_max)', async () => {
    const e = eng();
    e.advanceTo(10);
    expect(drug(e, { drugId: 'insulin', dose: 0.1, unit: 'units/kg/h', infusion: true }).accepted).toBe(true);
    for (let t = 70; t <= 3610; t += 60) {
      e.advanceTo(t);
      await new Promise((r) => setImmediate(r)); // CI rule: yield once per sim-minute
    }
    const bus = (e as unknown as { st: { pk: { bus: { metabolic: { glucoseDelta: number; kShift: number } } } } }).st.pk.bus.metabolic;
    console.log(`fu8 B1 insulin: glucoseDelta ${bus.glucoseDelta.toFixed(2)}, kShift ${bus.kShift.toFixed(3)}`);
    expect(bus.glucoseDelta).toBeCloseTo(-60, 0);
    expect(bus.kShift).toBeCloseTo(-0.6, 1);
  }, 120_000);
});
