// Stage 3 engine wiring: 62.5 Hz channels by absolute index, command routing, events, snapshot round trip.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { cmd, ev3 } from '../helpers/resp.ts';

describe('engine + Stage 3 pipeline wiring', () => {
  it('co2 and resp run at 62.5 Hz with the 100 ms look-ahead (index 6 at creation); co2 off → no trace', () => {
    const e = createEngine({ seed: 1, patient: { sensors: { co2: 'on' } } });
    expect(e.sampleRate('co2')).toBe(62.5);
    expect(e.latestSampleIndex('co2')).toBe(6);
    expect(e.latestSampleIndex('resp')).toBe(6);
    e.advanceTo(10);
    expect(e.latestSampleIndex('co2')).toBe(631);
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'co2', state: 'off' }));
    e.advanceTo(10.1);
    expect(e.latestSampleIndex('co2')).toBe(-1);
    expect(createEngine({ seed: 1 }).latestSampleIndex('co2')).toBe(-1);
  });

  it('accepts the Stage 3 commands, rejects bad ones with a reason, and emits breath, lungState and the new numerics', () => {
    const e = createEngine({ seed: 2, patient: { sensors: { co2: 'on' } } });
    const got = new Set<string>();
    const nums = new Set<string>();
    e.on((x) => {
      got.add(x.type);
      if (x.type === 'measurement') for (const k of Object.keys(x.values)) nums.add(k);
    });
    expect(e.dispatch(ev3({ kind: 'ventilation', source: 'bvm', rr: 10, vtMl: 600, fio2: 1 })).accepted).toBe(true);
    expect(e.dispatch(ev3({ kind: 'airway', state: 'nowhere' })).accepted).toBe(false);
    expect(e.dispatch(cmd({ type: 'attachSensor', sensor: 'temp', state: 'on', site: 'rectal' })).accepted).toBe(true);
    expect(e.dispatch(cmd({ type: 'setTarget', variable: 'spo2', value: 92, ramp: { durationS: 10 } })).accepted).toBe(true);
    e.advanceTo(15);
    for (const t of ['breath', 'lungState', 'measurement', 'state']) expect(got.has(t)).toBe(true);
    for (const k of ['spo2', 'etco2', 'imco2', 'awrr', 'rr', 'tempCore', 'tempSite']) expect(nums.has(k)).toBe(true);
  });

  it('snapshot → JSON → restore reproduces the same co2 samples', () => {
    const a = createEngine({ seed: 3, patient: { sensors: { co2: 'on' } } });
    a.dispatch(ev3({ kind: 'airway', state: 'bronchospasm', severity: 0.5 })); // FU-11 (F20): obstructed gave a flat CO2 (nothing to compare)
    a.advanceTo(20);
    const snap = JSON.parse(JSON.stringify(a.snapshot()));
    const b = createEngine({ seed: 3, patient: { sensors: { co2: 'on' } } });
    b.restore(snap);
    const e2rate = a.sampleRate('co2');
    a.advanceTo(30);
    b.advanceTo(30);
    // FU-11 (F20): the CO2 channel, at an integer sample index, with a count and a signal checked before equality (the
    // old read of 'resp' at index 1562.5 returned 300 NaN on both sides, and NaN arrays compare equal)
    const x = new Float32Array(300);
    const y = new Float32Array(300);
    const from = Math.round(25 * e2rate);
    expect(a.readSamples('co2', from, x)).toBe(300);
    expect(b.readSamples('co2', from, y)).toBe(300);
    expect(Array.from(x).every(Number.isFinite)).toBe(true);
    expect(Math.max(...x) - Math.min(...x)).toBeGreaterThan(1); // a real capnogram, not a flat line
    expect(Array.from(y)).toEqual(Array.from(x));
  });
});
