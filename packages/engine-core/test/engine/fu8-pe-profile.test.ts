// FU-8 Task A29 (V.1 gate note §10 item 1; FU-4 G6): a profile's massive PE raises PVR as the dispatched event does.
// Before FU-8 (origin/main) a `lungConditions` PE on the PATIENT profile (the ventilator link's massive-PE profile) was
// set at creation and never passed through FU-4 G6's alias: dead space without the PVR rise (mPAP 15, CO 4.9).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

describe('FU-8 A29: FU-4 G6\'s PE alias applies to a profile', () => {
  it('lungConditions pe severity 1 on the profile: PVR × 9 (the φ mapping) and mean PA pressure ≥ 40 mmHg at 120 s (origin/main: × 1, ≈ 15)', async () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, lungConditions: [{ id: 'pe', severity: 1 }], sensors: { abp: 'connected', pap: 'connected' } } as never });
    e.advanceTo(1);
    e.dispatch({ id: 'a', issuedBy: 'test', type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } } as never);
    e.dispatch({ id: 'b', issuedBy: 'test', type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 } } as never);
    let sum = 0;
    let n = 0;
    for (let t = 100; t <= 120; t += 1) {
      e.advanceTo(t);
      sum += (e as unknown as { st: { hemo: { circOut: { pPa: number } } } }).st.hemo.circOut.pPa;
      n++;
    }
    const c = (e as unknown as { st: { hemo: { circ: { ext: { pvr: number } } } } }).st.hemo.circ;
    console.log(`fu8 A29: ext.pvr ${c.ext.pvr.toFixed(2)}, mean PA ${(sum / n).toFixed(1)} mmHg`);
    expect(c.ext.pvr).toBeCloseTo(9, 5);
    expect(sum / n).toBeGreaterThanOrEqual(40);
  }, 60_000);
});
