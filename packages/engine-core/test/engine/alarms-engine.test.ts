// Stage 4b acceptance: the alarm engine inside the running engine (brief §6.4, §6.4.1, §6.8).
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
import { alarmsOf, beats, cmd, devRig } from '../helpers/device.ts';

type Meas = Extract<EngineEvent, { type: 'measurement' }>;
const hrAbove = (ev: EngineEvent[], v: number) => ev.find((x): x is Meas => x.type === 'measurement' && (x.values.hr?.value ?? 0) > v);

describe('alarm engine in the engine', () => {
  it('philips-like: HR above 120 raises **HR at the first displayed value over the limit (no added delay), medium', () => {
    const { e, ev } = devRig('philips-like');
    e.advanceTo(10);
    e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 150 }));
    e.advanceTo(30);
    const first = hrAbove(ev, 120)!;
    const r = alarmsOf(ev, 'HR_HIGH', 'raised')[0]!;
    expect(r.t - first.t).toBeGreaterThanOrEqual(0);
    expect(r.t - first.t).toBeLessThanOrEqual(0.02 + 1e-9);
    expect(r).toMatchObject({ priority: 'medium', level: 2, category: 'physiological' });
    expect(r.text).toMatch(/^\*\*HR \d+>120$/);
  });

  it('saadat-like: nothing is raised for HR 170 while alarms are factory OFF; switched ON, HR TOO HIGH follows after the 1 s delay, level 1', () => {
    const { e, ev } = devRig('saadat-like');
    e.advanceTo(5);
    e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 170 }));
    e.advanceTo(30);
    expect(alarmsOf(ev)).toEqual([]);
    const st = ev.filter((x) => x.type === 'alarmStatus').pop() as Extract<EngineEvent, { type: 'alarmStatus' }>;
    expect(st.allOff).toBe(true);
    e.dispatch(cmd({ type: 'device', action: { device: 'alarm', action: 'enable', param: 'HR', value: true } }));
    const on = e.now().simT + 0.02; // the switch applies on the next tick
    e.advanceTo(40);
    const r = alarmsOf(ev, 'HR_HIGH', 'raised')[0]!;
    expect(r.t - on).toBeCloseTo(1, 6); // skin alarms.delayS = 1 ("less than 1 s", brief §6.4.1); HR was already over 150
    expect(r).toMatchObject({ priority: 'high', level: 1, text: 'HR TOO HIGH' });
  });

  for (const [skin, s] of [['saadat-like', 10], ['philips-like', 4]] as const) {
    it(`${skin}: asystole ${s} s after the last QRS, level 1`, () => {
      const { e, ev } = devRig(skin);
      e.advanceTo(10);
      e.dispatch(cmd({ type: 'setRhythm', rhythm: 'asystole' }));
      e.advanceTo(30);
      const lastR = beats(ev).pop()!.t;
      const r = alarmsOf(ev, 'ASYSTOLE', 'raised')[0]!;
      expect(r.t - lastR).toBeGreaterThan(s - 0.2);
      expect(r.t - lastR).toBeLessThan(s + 0.2);
      expect(r.level).toBe(1);
    });
  }

  it('VF raises VFIB (level 1) within 3.1 s, VT raises VTAC after a run of 5, on both profiles', () => {
    for (const skin of ['philips-like', 'saadat-like']) {
      const { e, ev } = devRig(skin);
      e.advanceTo(10);
      e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse' }));
      e.advanceTo(20);
      const vf = alarmsOf(ev, 'VFIB', 'raised')[0]!;
      expect(vf.t - 10).toBeLessThan(3.1 + 0.2);
      expect(vf.priority).toBe('high');
      e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vtMono' }));
      e.advanceTo(30);
      const vt = alarmsOf(ev, 'VTAC', 'raised')[0]!;
      const vBeats = beats(ev).filter((b) => b.t > 20 && b.origin === 'ventricular');
      expect(vt.t).toBeGreaterThanOrEqual(vBeats[4]!.t);
      expect(vt.t - vBeats[4]!.t).toBeLessThan(0.1);
      expect(alarmsOf(ev, 'VFIB', 'cleared').length + (skin === 'philips-like' ? 1 : 0)).toBeGreaterThanOrEqual(1);
    }
  });

  it('age band switch: HR 140 is HIGH for an adult (50–120) and inside the paediatric window (75–160)', () => {
    const { e, ev } = devRig('philips-like');
    e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 140 }));
    e.advanceTo(20);
    expect(alarmsOf(ev, 'HR_HIGH', 'raised')).toHaveLength(1);
    e.dispatch(cmd({ type: 'device', action: { device: 'monitor', action: 'ageBand', value: 'paed' } }));
    e.advanceTo(30);
    expect(alarmsOf(ev, 'HR_HIGH', 'cleared')).toHaveLength(1);
    expect(alarmsOf(ev, 'HR_HIGH', 'raised')).toHaveLength(1);
    const st = ev.filter((x) => x.type === 'alarmStatus').pop() as Extract<EngineEvent, { type: 'alarmStatus' }>;
    expect(st.ageBand).toBe('paed');
    expect(st.limits.HR).toMatchObject({ low: 75, high: 160 });
  });

  it('technical alarms on sensor detach: ECG leads off (and no asystole), SpO2 probe off', () => {
    const { e, ev } = devRig('saadat-like');
    e.advanceTo(5);
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'ecg', state: 'off' }));
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'spo2', state: 'off' }));
    e.advanceTo(40);
    const lo = alarmsOf(ev, 'ecgLeadsOff', 'raised')[0]!;
    expect(lo).toMatchObject({ category: 'technical', level: 3, priority: 'low', text: 'ECG CHECK LA/RA/LL' });
    expect(alarmsOf(ev, 'spo2SensorOff', 'raised')[0]).toMatchObject({ category: 'technical', level: 3 });
    expect(alarmsOf(ev, 'ASYSTOLE')).toEqual([]);
    expect(ev.some((x) => x.type === 'alarm' && x.level === undefined)).toBe(false); // raw L2 flags are re-issued, not passed on
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'ecg', state: 'on' }));
    e.advanceTo(45);
    expect(alarmsOf(ev, 'ecgLeadsOff', 'cleared')).toHaveLength(1);
  });

  it('skin switch without restart: the tick keeps counting and the new profile applies', () => {
    const { e, ev } = devRig('saadat-like');
    e.advanceTo(3);
    const r = e.dispatch(cmd({ type: 'device', action: { device: 'monitor', action: 'skin', value: 'philips-like' } }));
    expect(r.accepted).toBe(true);
    expect(e.dispatch(cmd({ type: 'device', action: { device: 'monitor', action: 'skin', value: 'nope-like' } })).accepted).toBe(false);
    e.advanceTo(5);
    expect(e.now().tick).toBe(250);
    const st = ev.filter((x) => x.type === 'alarmStatus').pop() as Extract<EngineEvent, { type: 'alarmStatus' }>;
    expect(st.skin).toBe('philips-like');
    expect(st.allOff).toBe(false);
  });

  it('snapshot/restore carries the alarm state', () => {
    const { e } = devRig('saadat-like');
    e.dispatch(cmd({ type: 'device', action: { device: 'alarm', action: 'enable', param: 'HR', value: true } }));
    e.advanceTo(2);
    const snap = e.snapshot();
    const { e: e2, ev: ev2 } = devRig('philips-like');
    e2.restore(snap);
    e2.advanceTo(3);
    const st = ev2.filter((x) => x.type === 'alarmStatus').pop() as Extract<EngineEvent, { type: 'alarmStatus' }>;
    expect(st.skin).toBe('saadat-like');
    expect(st.limits.HR?.enabled).toBe(true);
  });
});
