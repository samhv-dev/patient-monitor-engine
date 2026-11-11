// The cockpit core's alarm view (plan vent-skin-edp-ts.md §4.3, piece V3), on a clock the test drives: a face's alarm
// profile (which ids, their priority, their delay, which latch, the silence presses) applied to the model's alarm
// conditions. The behaviours are the EDP-TS manual's (research/57 A-03, A-09, A-15, A-16, A-19, A-20, H-06, H-25); the
// numbers here are the test's own profile, the device's are walked in faces/edp-ts/alarms.test.ts.
import type { VentAlarm, VentConfig } from '@pme/ventilator';
import { describe, expect, it } from 'vitest';
import { createAlarmView, type AlarmEvent } from './alarms-view.ts';
import type { AlarmProfile } from './types.ts';

const P: AlarmProfile = {
  show: ['disconnection', 'lowPressure', 'mvLow', 'vtLow', 'fHigh'],
  priority: { disconnection: 'high', lowPressure: 'high', mvLow: 'medium', vtLow: 'medium', fHigh: 'low' },
  delayS: { disconnection: 5, lowPressure: 0, mvLow: 10, vtLow: 20, fHigh: 30 },
  latch: ['disconnection', 'lowPressure', 'mvLow', 'vtLow', 'fHigh'],
  enabled: { vtLow: (c) => c.ps !== 0 },
  silenceS: [30, 60],
};
const cfg = { ps: 5 } as VentConfig;
const A = (...ids: Array<VentAlarm['id']>): VentAlarm[] => ids.map((id) => ({ id, text: id, priority: 'high' }));
/** Step the view every 5 ms from t0 to t1 with the same raw conditions. */
const hold = (v: ReturnType<typeof createAlarmView>, t0: number, t1: number, raw: VentAlarm[], c = cfg) => {
  for (let t = t0; t <= t1 + 1e-9; t += 0.005) v.step(t, raw, c);
};

describe('the alarm view', () => {
  it('each delay: the condition must hold that long without a break (10 s, 20 s, 30 s, 5 s, none)', () => {
    for (const [id, d] of [['mvLow', 10], ['vtLow', 20], ['fHigh', 30], ['disconnection', 5], ['lowPressure', 0]] as const) {
      const v = createAlarmView(P);
      hold(v, 0, d - 0.01, A(id));
      expect(v.signals(d - 0.01).message, `${id} before ${d} s`).toBeNull();
      hold(v, d - 0.005, d + 0.005, A(id));
      expect(v.signals(d).message?.id, `${id} at ${d} s`).toBe(id);
    }
  });

  it('a break restarts the delay, and a condition gone before its delay leaves nothing (no lamp, no latch)', () => {
    const v = createAlarmView(P);
    hold(v, 0, 9, A('mvLow'));
    hold(v, 9.005, 9.1, []);
    hold(v, 9.105, 18, A('mvLow'));
    expect(v.signals(18).message).toBeNull();
    hold(v, 18.005, 20, []);
    expect(v.signals(20)).toMatchObject({ message: null, lamps: { high: 'off', medLow: 'off' }, signals: [] });
  });

  it('the lamps: high fast, medium slow, low steady (H-06); a latched lamp steady after its cause ends, until Esc (A-15, A-16, H-25)', () => {
    const v = createAlarmView(P);
    hold(v, 0, 1, A('lowPressure'));
    expect(v.signals(1).lamps).toEqual({ high: 'fast', medLow: 'off' });
    hold(v, 1.005, 2, []);
    const s = v.signals(2);
    expect(s.message, 'the message goes at once (A-19)').toBeNull();
    expect(s.lamps).toEqual({ high: 'steady', medLow: 'off' });
    expect(s.signals).toEqual([{ id: 'lowPressure', priority: 'high', since: 0, active: false }]);
    hold(v, 2.005, 600, []);
    expect(v.signals(600).lamps.high, 'still lit ten minutes on').toBe('steady');
    expect(v.esc()).toBe(true);
    expect(v.signals(600).lamps.high).toBe('off');

    const m = createAlarmView(P);
    hold(m, 0, 31, A('fHigh'));
    expect(m.signals(31).lamps.medLow).toBe('steady');
    hold(m, 31.005, 42, A('fHigh', 'mvLow'));
    expect(m.signals(42).lamps.medLow).toBe('slow');
  });

  it('Esc clears nothing while the cause persists, and only the ended latches when some persist', () => {
    const v = createAlarmView(P);
    hold(v, 0, 11, A('lowPressure', 'mvLow'));
    expect(v.esc()).toBe(false);
    expect(v.signals(11).signals.map((x) => x.id)).toEqual(['lowPressure', 'mvLow']);
    hold(v, 11.005, 12, A('mvLow'));
    expect(v.esc()).toBe(true);
    expect(v.signals(12)).toMatchObject({ lamps: { high: 'off', medLow: 'slow' }, message: { id: 'mvLow' } });
  });

  it('one message: the highest priority; between equals, the profile\'s order (a disconnection is not hidden by the low pressure it causes)', () => {
    const v = createAlarmView(P);
    hold(v, 0, 3, A('lowPressure', 'mvLow'));
    expect(v.signals(3).message?.id).toBe('lowPressure');
    hold(v, 3.005, 11, A('lowPressure', 'disconnection', 'mvLow'));
    expect(v.signals(11).message).toEqual({ id: 'disconnection', priority: 'high' });
    expect(v.signals(11).sounding).toBe('high');
  });

  it('silence: one press 30 s, two presses 60 s from the first; a third changes nothing; then a new press starts at 30 (A-20)', () => {
    const v = createAlarmView(P);
    hold(v, 0, 1, A('lowPressure'));
    expect(v.silence(1)).toBeCloseTo(30, 9);
    expect(v.signals(1).silencedS).toBeCloseTo(30, 9);
    expect(v.signals(1).sounding, 'audio only: the lamp and the message stay').toBe('high');
    expect(v.signals(1).lamps.high).toBe('fast');
    expect(v.signals(1).message?.id).toBe('lowPressure');
    expect(v.silence(3)).toBeCloseTo(58, 9); // 60 s from the first press
    expect(v.silence(4)).toBeCloseTo(57, 9);
    expect(v.signals(61).silencedS).toBe(0);
    expect(v.silence(70)).toBeCloseTo(30, 9);
  });

  it('a row not enabled in this configuration is not raised (VT alarms not in CPAP, A-41, A-42)', () => {
    const v = createAlarmView(P);
    hold(v, 0, 25, A('vtLow'), { ps: 0 } as VentConfig);
    expect(v.signals(25).message).toBeNull();
  });

  it('ids the profile does not show are ignored; its priority is the profile\'s, not the model\'s', () => {
    const v = createAlarmView(P);
    hold(v, 0, 31, [...A('intrinsicPeep'), { id: 'fHigh', text: '', priority: 'high' }]);
    const s = v.signals(31).signals;
    expect(s).toMatchObject([{ id: 'fHigh', priority: 'low', active: true }]);
    expect(s[0]!.since).toBeCloseTo(30, 6);
  });

  it('raised and ended events with their times (the record of activated alarms, V13)', () => {
    const v = createAlarmView(P);
    const ev: AlarmEvent[] = [];
    v.onEvent((e) => ev.push(e));
    hold(v, 0, 6, A('disconnection'));
    hold(v, 6.005, 7, []);
    expect(ev.map((e) => [e.kind, e.id, Math.round(e.t * 1000) / 1000])).toEqual([['raised', 'disconnection', 5], ['ended', 'disconnection', 6.005]]);
    expect(ev[1]!.priority).toBe('high');
  });

  it('a clock that goes back (a new run) starts the view afresh', () => {
    const v = createAlarmView(P);
    hold(v, 0, 2, A('lowPressure'));
    v.silence(2);
    v.step(0, [], cfg);
    expect(v.signals(0)).toMatchObject({ signals: [], silencedS: 0 });
  });
});
