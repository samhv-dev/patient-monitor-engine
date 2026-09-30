// FU-8 Task A1 (F1, G-FU4 2026-09-29): an active limit alarm's message follows the displayed value (research/05 §2.4:
// "the message shows **SpO2 94<96 (deviation and limit)", [S2]); a latched entry keeps the text it had when its
// condition ended. Before FU-8 the text was frozen at the raise (`**ABPm 66<70` at a mean of 19 in Ali's PEA).
import { describe, expect, it } from 'vitest';
import { buildConditions, createInputs } from '../../../src/l3/alarms/conditions.ts';
import { applyAlarmAction, createAlarmMgr, stepAlarms, type AlarmMgrState, type Condition } from '../../../src/l3/alarms/manager.ts';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';
import type { EngineEvent } from '../../../src/types.ts';

const TICK = 0.02;
function run(s: AlarmMgrState, t0: number, t1: number, conds: (t: number) => Condition[]): EngineEvent[] {
  const out: EngineEvent[] = [];
  for (let k = Math.round(t0 / TICK); k <= Math.round(t1 / TICK); k++) stepAlarms(s, k * TICK, conds(k * TICK), out);
  return out;
}
const artLow = (mean: number): Condition => ({ id: 'ART_M_LOW', level: 2, category: 'physiological', text: `**ABPm ${mean}<70`, delayS: 0, numeric: 'abpMean' });

describe('FU-8 A1: the limit-alarm message carries the current value', () => {
  it('ABPm 66 → 19: the active entry and the alarmStatus read "**ABPm 19<70"; ONE raise event, no re-raise', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const ev = run(s, 0, 10, (t) => [artLow(t < 5 ? 66 : 19)]);
    expect(ev.filter((e) => e.type === 'alarm' && e.state === 'raised').length).toBe(1);
    expect(s.active.ART_M_LOW?.text).toBe('**ABPm 19<70');
    const last = ev.filter((e): e is Extract<EngineEvent, { type: 'alarmStatus' }> => e.type === 'alarmStatus').at(-1);
    expect(last?.active.find((a) => a.id === 'ART_M_LOW')?.text).toBe('**ABPm 19<70');
  });
  it('a latched red keeps the text it had when its condition ended', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const desat = (v: number): Condition => ({ id: 'DESAT', level: 1, category: 'physiological', text: `***DESAT ${v}`, delayS: 0 });
    run(s, 0, 4, (t) => (t < 2 ? [desat(t < 1 ? 80 : 75)] : []));
    expect(s.active.DESAT).toMatchObject({ latched: true, text: '***DESAT 75' });
  });
  it('after setLimit the text prints the limit in force, not the skin default (ABPm low 70 → 60: "**ABPm 55<60")', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    applyAlarmAction(s, { device: 'alarm', action: 'setLimit', param: 'ART_M', low: 60 } as never, 0, []);
    const inp = createInputs(0);
    inp.abp = 'connected' as never;
    inp.measured.abpMean = { value: 55, flag: 'valid', at: 10 };
    const c = buildConditions(s, inp, 10).find((x) => x.id === 'ART_M_LOW');
    expect(c?.text).toBe('**ABPm 55<60');
  });
  it('R50 F6: through the clear hysteresis the entry keeps its last VIOLATING text — no "**ABPs 90<90" (ABPs low 90: 85 → 90 → 92)', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs(0);
    inp.abp = 'connected' as never;
    let v = 85;
    const conds = (t: number) => {
      inp.measured.abpSys = { value: v, flag: 'valid', at: t };
      return buildConditions(s, inp, t).filter((x) => x.id === 'ART_S_LOW');
    };
    run(s, 0, 20, conds);
    expect(s.active.ART_S_LOW?.text).toBe('**ABPs 85<90');
    v = 90; // at the limit: held by the one-unit hysteresis, not beyond it
    expect(conds(20.02)[0]?.held).toBe(true);
    run(s, 20.02, 25, conds);
    expect(s.active.ART_S_LOW?.text).toBe('**ABPs 85<90');
    v = 92;
    run(s, 25.02, 30, conds);
    expect(s.active.ART_S_LOW?.text ?? '').not.toMatch(/9\d<90/);
  });
});
