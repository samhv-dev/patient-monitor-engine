// Alarm life cycle (brief §6.4, §6.4.1) with synthetic conditions, stepped at the engine's 20 ms tick.
import { describe, expect, it } from 'vitest';
import { applyAlarmAction, createAlarmMgr, stepAlarms, validateAlarmAction, type AlarmMgrState, type Condition } from '../../../src/l3/alarms/manager.ts';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';
import type { EngineEvent } from '../../../src/types.ts';

type Alarm = Extract<EngineEvent, { type: 'alarm' }>;
type Status = Extract<EngineEvent, { type: 'alarmStatus' }>;
const TICK = 0.02;

/** Step from t0 to t1 with `conds(t)` true; returns every event. */
function run(s: AlarmMgrState, t0: number, t1: number, conds: (t: number) => Condition[]): EngineEvent[] {
  const out: EngineEvent[] = [];
  for (let k = Math.round(t0 / TICK); k <= Math.round(t1 / TICK); k++) stepAlarms(s, k * TICK, conds(k * TICK), out);
  return out;
}
const alarms = (ev: EngineEvent[], state?: Alarm['state']) => ev.filter((e): e is Alarm => e.type === 'alarm' && (!state || e.state === state));
const HR: Condition = { id: 'HR_HIGH', level: 2, category: 'physiological', text: '**HR 130>120', delayS: 0, numeric: 'hr' };
const SPO2: Condition = { id: 'SpO2_LOW', level: 2, category: 'physiological', text: '**SpO2 85<90', delayS: 10, numeric: 'spo2' };
const ASY: Condition = { id: 'ASYSTOLE', level: 1, category: 'physiological', text: '***ASYSTOLE', delayS: 0 };
const LEADS: Condition = { id: 'ecgLeadsOff', level: 3, category: 'technical', text: 'ECG LEADS OFF', delayS: 0 };

describe('alarm manager', () => {
  it('raises after the condition delay (SpO2 10 s) with priority and level', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const ev = run(s, 0, 12, (t) => (t >= 1 ? [SPO2] : []));
    const r = alarms(ev, 'raised');
    expect(r).toHaveLength(1);
    expect(r[0]!.t).toBeCloseTo(11, 6);
    expect(r[0]).toMatchObject({ priority: 'medium', level: 2, category: 'physiological', text: '**SpO2 85<90' });
  });

  it('IEC-style latching: a red alarm stays (latched) after its condition clears until acknowledged', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    run(s, 0, 2, (t) => (t < 1 ? [ASY] : []));
    expect(s.active.ASYSTOLE?.latched).toBe(true);
    const out: EngineEvent[] = [];
    applyAlarmAction(s, { device: 'alarm', action: 'ack' }, 2.1, out);
    expect(alarms(out, 'cleared').map((a) => a.id)).toEqual(['ASYSTOLE']);
    expect(s.active.ASYSTOLE).toBeUndefined();
  });

  it('Saadat-like does not latch; a medium IEC-style alarm does not latch either', () => {
    const sa = createAlarmMgr(deviceProfile('saadat-like'));
    const ev = run(sa, 0, 2, (t) => (t < 1 ? [ASY] : []));
    expect(alarms(ev, 'cleared').map((a) => a.id)).toEqual(['ASYSTOLE']);
    const ph = createAlarmMgr(deviceProfile('philips-like'));
    expect(alarms(run(ph, 0, 2, (t) => (t < 1 ? [HR] : [])), 'cleared').map((a) => a.id)).toEqual(['HR_HIGH']);
  });

  it('Saadat-like silence: 120 s, technical alarms acknowledged, a NEW alarm ends it, pressing again ends it', () => {
    const s = createAlarmMgr(deviceProfile('saadat-like'));
    run(s, 0, 1, () => [ASY, LEADS]);
    const out: EngineEvent[] = [];
    applyAlarmAction(s, { device: 'alarm', action: 'silence' }, 1, out);
    expect(s.silencedUntil).toBeCloseTo(121, 6);
    expect(alarms(out, 'acked').map((a) => a.id)).toEqual(['ecgLeadsOff']);
    expect(alarms(out, 'silenced').map((a) => a.id)).toEqual(['ASYSTOLE']);
    run(s, 1.02, 30, () => [ASY, LEADS]);
    expect(s.silencedUntil).not.toBeNull();
    const ev = run(s, 30.02, 31, () => [ASY, LEADS, { ...HR, id: 'HR_HIGH', level: 1 }]);
    expect(alarms(ev, 'raised').map((a) => a.id)).toEqual(['HR_HIGH']);
    expect(s.silencedUntil).toBeNull();
    applyAlarmAction(s, { device: 'alarm', action: 'silence' }, 31, []);
    applyAlarmAction(s, { device: 'alarm', action: 'silence' }, 32, []);
    expect(s.silencedUntil).toBeNull();
  });

  it('Saadat-like silence runs out after 120 s', () => {
    const s = createAlarmMgr(deviceProfile('saadat-like'));
    run(s, 0, 1, () => [ASY]);
    applyAlarmAction(s, { device: 'alarm', action: 'silence' }, 1, []);
    run(s, 1.02, 120.98, () => [ASY]);
    expect(s.silencedUntil).not.toBeNull();
    run(s, 121, 121, () => [ASY]);
    expect(s.silencedUntil).toBeNull();
  });

  it('IEC-style silence (90 s) is not ended by a new alarm', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    run(s, 0, 1, () => [HR]);
    applyAlarmAction(s, { device: 'alarm', action: 'silence' }, 1, []);
    run(s, 1.02, 5, () => [HR, ASY]);
    expect(s.silencedUntil).toBeCloseTo(91, 6);
  });

  it('pause (IEC-style 180 s) removes every alarm and raises nothing until it ends; Saadat-like rejects pause', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    run(s, 0, 1, () => [HR]);
    const out: EngineEvent[] = [];
    applyAlarmAction(s, { device: 'alarm', action: 'pause' }, 1, out);
    expect(alarms(out, 'paused').map((a) => a.id)).toEqual(['HR_HIGH']);
    expect(alarms(run(s, 1.02, 180.98, () => [HR, ASY]), 'raised')).toHaveLength(0);
    const after = alarms(run(s, 181, 181.1, () => [HR, ASY]), 'raised');
    expect(after.map((a) => a.id).sort()).toEqual(['ASYSTOLE', 'HR_HIGH']);
    expect(validateAlarmAction(createAlarmMgr(deviceProfile('saadat-like')), { device: 'alarm', action: 'pause' })).toMatch(/no function/);
  });

  it('alarmStatus on every change and at 1 Hz; saadat-like starts all-off, the preset turns NIBP and SpO2 on', () => {
    const s = createAlarmMgr(deviceProfile('saadat-like'));
    const st = run(s, 0, 3, () => []).filter((e): e is Status => e.type === 'alarmStatus');
    expect(st.map((e) => e.t)).toEqual([0, 1, 2, 3]);
    expect(st[0]!.allOff).toBe(true);
    expect(st[0]!.limits.HR).toMatchObject({ enabled: false, low: 50, high: 150 });
    const pre = createAlarmMgr(deviceProfile('iran-icu-as-found'));
    const ps = run(pre, 0, 0, () => []).find((e): e is Status => e.type === 'alarmStatus')!;
    expect(ps.limits.NIBP_S?.enabled).toBe(true);
    expect(ps.limits.SpO2?.enabled).toBe(true);
    expect(ps.limits.HR?.enabled).toBe(false);
    expect(ps.allOff).toBe(false);
  });

  it('setLimit / enable / setVolume validate and apply', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    expect(validateAlarmAction(s, { device: 'alarm', action: 'setLimit', param: 'HR', low: 60, high: 50 })).toMatch(/below/);
    expect(validateAlarmAction(s, { device: 'alarm', action: 'setLimit', param: 'XX', low: 1 })).toMatch(/no alarm limit/);
    applyAlarmAction(s, { device: 'alarm', action: 'setLimit', param: 'HR', high: 100 }, 0, []);
    applyAlarmAction(s, { device: 'alarm', action: 'enable', param: 'NIBP', value: false }, 0, []);
    const st = run(s, 0, 0, () => []).find((e): e is Status => e.type === 'alarmStatus')!;
    expect(st.limits.HR).toMatchObject({ low: 50, high: 100, enabled: true });
    expect(st.limits.NIBP_M?.enabled).toBe(false);
    expect(validateAlarmAction(s, { device: 'alarm', action: 'setVolume', value: 11 })).toMatch(/volume/);
  });
});
