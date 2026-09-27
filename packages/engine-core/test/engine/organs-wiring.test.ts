import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { organsRig } from '../helpers/organs.ts';

describe('Stage 7d engine wiring', { timeout: 300_000 }, () => {
  it('organs event at 1 Hz; icp buffer only while the sensor is on; commands owned and rejected correctly', async () => {
    const r = organsRig({ seed: 1, patient: { weightKg: 70 } });
    await r.run(5);
    expect(r.organs.length).toBeGreaterThanOrEqual(5);
    expect(r.e.latestSampleIndex('icp')).toBe(-1);
    r.send({ type: 'attachSensor', sensor: 'icp', state: 'on' });
    await r.run(4);
    expect(r.e.sampleRate('icp')).toBe(125);
    const n = r.e.latestSampleIndex('icp');
    expect(n).toBeGreaterThan(125 * 8);
    const buf = new Float32Array(250);
    r.e.readSamples('icp', n - 249, buf);
    const mean = buf.reduce((a, x) => a + x, 0) / 250;
    expect(mean).toBeGreaterThan(7);
    expect(mean).toBeLessThan(13);
    expect(Math.max(...buf) - Math.min(...buf)).toBeGreaterThan(0.5); // a pulsatile trace
    const bad = r.e.dispatch({ id: 'b', issuedBy: 't', type: 'applyEvent', event: { kind: 'position', headUpDeg: 100 } });
    expect(bad.accepted).toBe(false);
    const other = r.e.dispatch({ id: 'c', issuedBy: 't', type: 'applyEvent', event: { kind: 'airway', state: 'patent' } });
    expect(other.accepted).toBe(true); // Stage 3 still owns its kinds
    r.send({ type: 'attachSensor', sensor: 'icp', state: 'off' });
    expect(r.e.latestSampleIndex('icp')).toBe(-1);
  });
  it('§11: the published kidney.gfrRel reaches 7g\'s rocuronium clearance — ≈ 1 at rest, lower with an AKI kidney', async () => {
    type St = { st: { organs: { kidney: { gfrRel: number } }; pk: { drugs: Record<string, { factor: number }> } } };
    const factor = async (aki: boolean) => {
      const r = organsRig({ seed: 6, patient: { weightKg: 70, heightCm: 170, ageY: 40, sex: 'M' } });
      r.send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 18, vtMl: 500, fio2: 0.5, peep: 5 } });
      if (aki) r.send({ type: 'applyEvent', event: { kind: 'condition', id: 'aki', severity: 1 } });
      r.send({ type: 'applyEvent', event: { kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' } });
      await r.run(300);
      const st = (r.e as unknown as St).st;
      return { gfrRel: st.organs.kidney.gfrRel, factor: st.pk.drugs.rocuronium!.factor };
    };
    const rest = await factor(false);
    expect(rest.gfrRel).toBeGreaterThan(0.9); // GFR 125 → gfrRel ≈ 1 (no early low value from the t = 0 baseline)
    expect(rest.gfrRel).toBeLessThan(1.1);
    expect(rest.factor).toBeGreaterThanOrEqual(0.97); // hepatic 0.7 × core.liver 0.98 + renal 0.3 × gfrRel × temp
    const aki = await factor(true);
    expect(aki.gfrRel).toBeLessThan(0.7 * rest.gfrRel);
    expect(aki.factor).toBeLessThan(rest.factor); // renal share scales once, by 7d's gfrRel
    expect(aki.factor).toBeGreaterThanOrEqual(0.68); // floor = the hepatic share alone (0.7 × 0.98)
  });
  it('snapshot/restore round-trips the organ state (same ICP afterwards)', async () => {
    const r = organsRig({ seed: 2, patient: { weightKg: 70 } });
    r.send({ type: 'applyEvent', event: { kind: 'brain', massRateMlPerMin: 1 } });
    await r.run(60);
    const snap = r.e.snapshot();
    await r.run(30);
    const icpA = r.last().brain.icp;
    const e2 = createEngine({ seed: 2, patient: { weightKg: 70 } });
    e2.restore(snap);
    let icpB = 0;
    e2.on((x) => {
      if (x.type === 'organs') icpB = x.brain.icp;
    }, ['organs']);
    e2.advanceTo(snap.tick * 0.02 + 30);
    expect(icpB).toBeCloseTo(icpA, 6);
  });
});
