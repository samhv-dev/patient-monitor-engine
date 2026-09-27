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
