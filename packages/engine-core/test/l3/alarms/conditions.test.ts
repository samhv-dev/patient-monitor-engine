// Conditions from synthetic monitor inputs (brief §6.4 conditions, §6.4.1 always-on set).
import { describe, expect, it } from 'vitest';
import { buildConditions, createInputs, observeEvent, observeQrs, VF_CONFIRM_S } from '../../../src/l3/alarms/conditions.ts';
import { applyAlarmAction, createAlarmMgr } from '../../../src/l3/alarms/manager.ts';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';
import type { EngineEvent } from '../../../src/types.ts';

const ids = (c: { id: string }[]) => c.map((x) => x.id).sort();
const meas = (t: number, values: Record<string, number>): EngineEvent => ({
  type: 'measurement', t, values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { value: v, flag: 'valid', at: t }])),
});
const beat = (t: number, origin: 'sinus' | 'ventricular', template = origin === 'sinus' ? 'normal' : 'wide'): EngineEvent => ({
  type: 'beat', t, seq: Math.round(t * 100), origin, template, qrsMs: 90, qtMs: 380, mech: { perfused: true, kSV: 1, svMl: 70, lvetMs: 280 },
});

describe('alarm conditions', () => {
  it('limit alarms need the switch ON (saadat-like factory OFF); fresh values only', () => {
    const s = createAlarmMgr(deviceProfile('saadat-like'));
    const inp = createInputs();
    observeQrs(inp, 9.5);
    observeEvent(inp, meas(10, { hr: 170 }));
    expect(ids(buildConditions(s, inp, 10))).toEqual([]);
    applyAlarmAction(s, { device: 'alarm', action: 'enable', param: 'HR', value: true }, 10, []);
    expect(ids(buildConditions(s, inp, 10))).toEqual(['HR_HIGH']);
    expect(ids(buildConditions(s, inp, 19.5))).toContain('ASYSTOLE'); // saadat-like: 10 s without a QRS … and HR 170 is stale
    expect(ids(buildConditions(s, inp, 19.5))).not.toContain('HR_HIGH');
  });

  it('asystole after the skin interval with leads on; leads off gives the INOP and no asystole', () => {
    const ph = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    observeQrs(inp, 1);
    expect(ids(buildConditions(ph, inp, 4.98))).not.toContain('ASYSTOLE');
    expect(ids(buildConditions(ph, inp, 5))).toContain('ASYSTOLE');
    observeEvent(inp, { type: 'alarm', t: 5, id: 'ecgLeadsOff', priority: 'medium', category: 'technical', state: 'raised', text: 'ECG LEADS OFF' });
    expect(ids(buildConditions(ph, inp, 20))).toEqual(['ecgLeadsOff']);
  });

  it('VF after the confirmation time replaces asystole', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    inp.vfSince = 10;
    expect(ids(buildConditions(s, inp, 10 + VF_CONFIRM_S))).toEqual(['VFIB']);
  });

  it('VTAC: a run of ≥ 5 ventricular beats at ≥ the skin rate (100 IEC-style, 120 Saadat-like)', () => {
    const inp = createInputs();
    for (let i = 0; i < 5; i++) observeEvent(inp, beat(10 + i * 0.55, 'ventricular')); // 109 bpm
    observeQrs(inp, 12.2);
    expect(ids(buildConditions(createAlarmMgr(deviceProfile('philips-like')), inp, 12.3))).toContain('VTAC');
    expect(ids(buildConditions(createAlarmMgr(deviceProfile('saadat-like')), inp, 12.3))).not.toContain('VTAC');
    observeEvent(inp, beat(12.8, 'sinus'));
    expect(ids(buildConditions(createAlarmMgr(deviceProfile('philips-like')), inp, 12.9))).not.toContain('VTAC');
  });

  it('extreme brady/tachy (arrhythmia analysis on): HR limit ∓ 20 clamped 40/200', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    applyAlarmAction(s, { device: 'alarm', action: 'arrhythmiaAnalysis', value: true }, 0, []);
    const inp = createInputs();
    observeQrs(inp, 9.9);
    observeEvent(inp, meas(10, { hr: 141 }));
    expect(ids(buildConditions(s, inp, 10))).toEqual(['EXTREME_TACHY', 'HR_HIGH']);
    observeEvent(inp, meas(10, { hr: 39 }));
    expect(ids(buildConditions(s, inp, 10))).toEqual(['EXTREME_BRADY', 'HR_LOW']);
  });

  it('LIFEPAK-like: no HR alarms while pacing; technical SpO2 and NIBP flags', () => {
    const s = createAlarmMgr(deviceProfile('lifepak-like'));
    const inp = createInputs();
    observeQrs(inp, 9.9);
    observeEvent(inp, meas(10, { hr: 10 }));
    inp.pacing = true;
    inp.spo2Probe = 'off';
    observeEvent(inp, { type: 'alarm', t: 10, id: 'nibp-failed', priority: 'low', category: 'technical', state: 'raised', text: 'x' });
    expect(ids(buildConditions(s, inp, 10))).toEqual(['nibp-failed', 'spo2SensorOff']);
    observeEvent(inp, { type: 'nibp', t: 11, phase: 'inflating', cuffMmHg: 20 });
    expect(ids(buildConditions(s, inp, 11))).toEqual(['spo2SensorOff']);
  });
});
