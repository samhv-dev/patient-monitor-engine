// FU-5: latching, acknowledge and silence per vendor (skin data; research/00 FU-5 ruling; research/05 §6 [S1] p. 135–140,
// [S2] p. 32–40, [S4] §10.8, §39.4.3; research/06 §4.2). Synthetic conditions, stepped at the engine's 20 ms tick.
import { describe, expect, it } from 'vitest';
import { applyAlarmAction, createAlarmMgr, latchCovers, stepAlarms, type AlarmMgrState, type Condition } from '../../../src/l3/alarms/manager.ts';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';
import type { EngineEvent } from '../../../src/types.ts';

const TICK = 0.02;
function run(s: AlarmMgrState, t0: number, t1: number, conds: (t: number) => Condition[]): EngineEvent[] {
  const out: EngineEvent[] = [];
  for (let k = Math.round(t0 / TICK); k <= Math.round(t1 / TICK); k++) stepAlarms(s, k * TICK, conds(k * TICK), out);
  return out;
}
const ASY: Condition = { id: 'ASYSTOLE', level: 1, category: 'physiological', text: '***ASYSTOLE', delayS: 0 };
const APNEA: Condition = { id: 'apnoea-co2', level: 1, category: 'physiological', text: '***APNEA', delayS: 0 };
const HR: Condition = { id: 'HR_HIGH', level: 2, category: 'physiological', text: '**HR 130>120', delayS: 0, numeric: 'hr' };
const VF: Condition = { id: 'VFIB', level: 1, category: 'physiological', text: '***VENT FIB/TACH', delayS: 0 };
const INOP: Condition = { id: 'ecgLeadsOff', level: 3, category: 'technical', text: 'ECG LEADS OFF', delayS: 0 };

describe('FU-5 latching per vendor', () => {
  it('latchCovers: lethal / red / redYellow / off; INOPs never latch', () => {
    expect(latchCovers('lethal', ASY)).toBe(true);
    expect(latchCovers('lethal', APNEA)).toBe(false);
    expect(latchCovers('red', APNEA)).toBe(true);
    expect(latchCovers('red', HR)).toBe(false);
    expect(latchCovers('redYellow', HR)).toBe(true);
    expect(latchCovers('redYellow', INOP)).toBe(false);
    expect(latchCovers('off', ASY)).toBe(false);
  });

  it('philips-like (#H30 visual Red, audible Off): a resolved APNEA stays on screen, silent, until acknowledged', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    run(s, 0, 30, (t) => (t < 20 ? [APNEA] : []));
    expect(s.active['apnoea-co2']).toMatchObject({ latched: true, sounding: false, acked: false });
    const out: EngineEvent[] = [];
    applyAlarmAction(s, { device: 'alarm', action: 'ack' }, 30, out);
    expect(s.active['apnoea-co2']).toBeUndefined();
  });

  it('IEC default (zoll-like, lethal/off): ASYSTOLE latches silently, a resolved red APNEA clears, a yellow limit alarm clears', () => {
    const s = createAlarmMgr(deviceProfile('zoll-like'));
    run(s, 0, 10, (t) => (t < 5 ? [ASY, APNEA, HR] : []));
    expect(Object.keys(s.active)).toEqual(['ASYSTOLE']);
    expect(s.active.ASYSTOLE).toMatchObject({ latched: true, sounding: false });
  });

  it('mindray-like (latching Unselected) and saadat-like do not latch', () => {
    for (const id of ['mindray-like', 'saadat-like']) {
      const s = createAlarmMgr(deviceProfile(id));
      run(s, 0, 10, (t) => (t < 5 ? [ASY, VF] : []));
      expect(Object.keys(s.active)).toEqual([]);
    }
  });

  it('philips-like Silence acknowledges every active alarm (no timer) and a NEW red alarm sounds at once', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    run(s, 0, 5, () => [ASY, INOP]);
    const out: EngineEvent[] = [];
    applyAlarmAction(s, { device: 'alarm', action: 'silence' }, 5, out);
    expect(s.silencedUntil).toBeNull();
    expect(s.active.ASYSTOLE).toMatchObject({ acked: true, sounding: false });
    expect(s.active.ecgLeadsOff).toMatchObject({ acked: true });
    run(s, 5.02, 10, () => [ASY, INOP, VF]);
    expect(s.active.VFIB).toMatchObject({ acked: false, sounding: true });
  });

  it('mindray-like Alarm Reset acknowledges the same way; saadat-like keeps its 120 s mute', () => {
    const m = createAlarmMgr(deviceProfile('mindray-like'));
    run(m, 0, 2, () => [ASY]);
    applyAlarmAction(m, { device: 'alarm', action: 'silence' }, 2, []);
    expect(m.silencedUntil).toBeNull();
    expect(m.active.ASYSTOLE?.acked).toBe(true);
    const sa = createAlarmMgr(deviceProfile('saadat-like'));
    run(sa, 0, 2, () => [ASY]);
    applyAlarmAction(sa, { device: 'alarm', action: 'silence' }, 2, []);
    expect(sa.silencedUntil).toBeCloseTo(122, 6);
  });

  it('an acknowledged alarm whose condition ends clears even under latching ([S2] p. 40)', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    run(s, 0, 2, () => [ASY]);
    applyAlarmAction(s, { device: 'alarm', action: 'ack' }, 2, []);
    run(s, 2.02, 4, () => []);
    expect(s.active.ASYSTOLE).toBeUndefined();
  });
});
