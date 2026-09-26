import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd, read, rig } from '../helpers/hemo.ts';

describe('engine + Stage 2 pipeline wiring', () => {
  it('pleth exists by default; abp/cvp/pap exist only once attached, at 125 Hz with the look-ahead filled', () => {
    const e = createEngine({ seed: 1 });
    expect(e.latestSampleIndex('abp')).toBe(-1);
    expect(e.latestSampleIndex('pleth')).toBe(12); // floor(0.100 s × 125)
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'abp', state: 'connected' }));
    e.advanceTo(1);
    expect(e.sampleRate('abp')).toBe(125);
    expect(e.latestSampleIndex('abp')).toBe(137); // floor(1.1 × 125)
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'abp', state: 'none' }));
    e.advanceTo(1.02);
    expect(e.latestSampleIndex('abp')).toBe(-1);
  });

  it('a lead change does not delete the pressure buffers', () => {
    const { e } = rig();
    e.advanceTo(2);
    e.dispatch(cmd({ type: 'device', action: { device: 'ecg', action: 'lead', value: 'V1', lane: 1 } }));
    e.advanceTo(3);
    expect(e.latestSampleIndex('abp')).toBeGreaterThan(300);
  });

  it('validates Stage 2 commands', () => {
    const e = createEngine();
    const r = (c: Record<string, unknown>) => e.dispatch(cmd(c));
    expect(r({ type: 'setTarget', variable: 'sbp', value: 90, ramp: { durationS: 30 } }).accepted).toBe(true);
    expect(r({ type: 'setTarget', variable: 'svr', value: 1.2 }).reason).toMatch(/derived/);
    expect(r({ type: 'pin', variable: 'cvp', value: 12 }).accepted).toBe(true);
    expect(r({ type: 'release', variable: 'all' }).accepted).toBe(true);
    expect(r({ type: 'setMode', mode: 'modeled' }).accepted).toBe(true); // Stage 7a: MODELED arrives (was rejected until Stage 7)
    expect(r({ type: 'setMode', mode: 'manual' }).accepted).toBe(true);
    expect(r({ type: 'attachSensor', sensor: 'abp', state: 'plugged' }).accepted).toBe(false);
    expect(r({ type: 'attachSensor', sensor: 'ecg', state: 'off' }).accepted).toBe(true); // Stage 3 took co2/temp, Stage 4b ecg
    expect(r({ type: 'applyEvent', event: { kind: 'line', line: 'cvp', action: 'wedge' } }).accepted).toBe(false);
    expect(r({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 200 } }).accepted).toBe(false);
    expect(r({ type: 'device', action: { device: 'nibp', action: 'auto', intervalMin: 7 } }).accepted).toBe(false);
    r({ type: 'attachSensor', sensor: 'nibp', state: 'off' });
    e.advanceTo(0.1);
    expect(r({ type: 'device', action: { device: 'nibp', action: 'start' } }).reason).toBe('cuff not connected');
  });

  it("emits 'state' at 1 Hz with L1 values and control flags", () => {
    const { e, ev } = rig();
    e.dispatch(cmd({ type: 'setTarget', variable: 'sbp', value: 100, ramp: { durationS: 20 } }));
    e.dispatch(cmd({ type: 'pin', variable: 'cvp', value: 10 }));
    e.advanceTo(5);
    const st = ev.filter((x): x is Extract<EngineEvent, { type: 'state' }> => x.type === 'state');
    expect(st.map((s) => s.t)).toEqual([1, 2, 3, 4, 5]);
    const last = st[st.length - 1]!;
    expect(last.values.sbp).toBeCloseTo(120 - (20 * 4.98) / 20, 1);
    expect(last.values.hr).toBe(75);
    expect(last.control).toMatchObject({ sbp: 'ramping', cvp: 'pinned' });
    expect(last.tick).toBe(250);
  });

  it('commands sharing a stageGroup apply on the same tick', () => {
    const e = createEngine();
    const a = e.dispatch(cmd({ type: 'setTarget', variable: 'sbp', value: 100, atTick: 40, stageGroup: 'g1' }));
    const b = e.dispatch(cmd({ type: 'setTarget', variable: 'dbp', value: 60, stageGroup: 'g1' }));
    expect(a.tick).toBe(40);
    expect(b.tick).toBe(40);
  });

  it("attachSensor spo2 'off' gives a flat pleth and invalid PI", () => {
    const { e, ev } = rig();
    e.advanceTo(10);
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'spo2', state: 'off' }));
    e.advanceTo(20);
    expect(Math.max(...read(e, 'pleth', 12, 20))).toBe(0);
    const m = ev.find((x) => x.type === 'measurement' && x.t === 20 && 'pi' in x.values) as Extract<EngineEvent, { type: 'measurement' }>;
    expect(m.values.pi?.flag).toBe('invalid');
    expect(m.values.pr?.flag).toBe('valid'); // falls back to the arterial line
  });
});
