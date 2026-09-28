// FU-5 (monitor fidelity): the vendor alarm semantics and the mindray-like limit table are skin DATA with a source.
import { describe, expect, it } from 'vitest';
import { resolveSkin, SKIN_IDS } from '../src/index.ts';

describe('FU-5: alarm latching, silence and limits per vendor', () => {
  it('latching: philips-like red/off (#H30), mindray-like and saadat-like off, the IEC default lethal/off', () => {
    expect(resolveSkin('philips-like').skin.alarms.latching).toEqual({ visual: 'red', audible: 'off' });
    expect(resolveSkin('mindray-like').skin.alarms.latching).toEqual({ visual: 'off', audible: 'off' });
    expect(resolveSkin('saadat-like').skin.alarms.latching).toEqual({ visual: 'off', audible: 'off' });
    expect(resolveSkin('zoll-like').skin.alarms.latching).toEqual({ visual: 'lethal', audible: 'off' });
  });

  it('silence: Philips and Mindray acknowledge (no timer), Saadat mutes 120 s with visuals, ZOLL-like mutes 90 s', () => {
    expect(resolveSkin('philips-like').skin.alarms.silence).toMatchObject({ mode: 'acknowledge', durationS: null, cancelOnNewAlarm: true, headerCountdown: false });
    expect(resolveSkin('mindray-like').skin.alarms.silence).toMatchObject({ mode: 'acknowledge', durationS: null });
    expect(resolveSkin('saadat-like').skin.alarms.silence).toMatchObject({ mode: 'mute', durationS: 120, suppressesVisual: true });
    expect(resolveSkin('zoll-like').skin.alarms.silence).toMatchObject({ mode: 'mute', durationS: 90 });
    expect(resolveSkin('philips-like').audio.alarm.silence).toEqual({ durationS: 0, cancelOnNewAlarm: true });
    expect(resolveSkin('philips-like').skin.alarms.pause).toEqual({ durationS: 120 });
  });

  it('mindray-like has its documented factory limit table (BeneVision N App. C) and extreme thresholds', () => {
    const r = resolveSkin('mindray-like');
    expect(r.limits.adult).toMatchObject({ HR: [50, 120], HR_extremeBrady: 35, HR_extremeTachy: 160, SpO2: [90, 100], NIBP_S: [90, 160], ART_M: [70, 110], CVP_M: [0, 10], RR: [8, 30], apneaS: 20, EtCO2: [25, 50], TEMP: [35, 38] });
    expect(r.limits.neo).toMatchObject({ HR: [100, 200], HR_extremeTachy: 220, SpO2: [90, 95], apneaS: 15 });
    expect(r.skin.arrhythmia.asystoleS).toEqual({ adult: 5, neo: 5 });
    expect(r.provenance.limits?.source).toMatch(/\[S4\] Mindray/);
  });

  it('philips-like: SpO2 10 s / 2 s, NIBP 165 mmHg, HR (alarm) source AUTO with the HR tile kept (no relabel), -?- glyphs', () => {
    const s = resolveSkin('philips-like').skin;
    expect(s.spo2).toMatchObject({ avgDefault: 10, updateHz: 0.5 });
    expect(s.nibp.initialInflation).toEqual({ adult: 165, paed: 130, neo: 100 });
    expect(s.hr).toMatchObject({ source: 'AUTO', relabelNonEcgAs: null });
    expect(s.glyphs).toMatchObject({ hrUnavailable: '-?-', nibpFail: '-?-', inop: '-?-', questionable: '?' });
  });

  it('the documented NIBP mode defaults are kept as data, recorded not modelled (FU-5 review: never delete documented data)', () => {
    expect(resolveSkin('philips-like').skin.nibp).toMatchObject({ modeDefault: 'AUTO', autoIntervalMin: 15 });
    expect(resolveSkin('saadat-like').skin.nibp).toMatchObject({ modeDefault: 'MANUAL', autoIntervalMin: null });
    expect(resolveSkin('lifepak-like').skin.nibp).toMatchObject({ modeDefault: 'MANUAL', autoIntervalMin: null });
    expect(resolveSkin('mindray-like').provenance['nibp.autoIntervalMin']?.source).toMatch(/C\.1\.5/);
  });

  it('mindray-like: HR/PR alarm source Auto, V-Tach PVCs 6, Pause alarm off ([S4] App. C.1.1); saadat-like: IBP disconnect alarm off, static pressure mean-only; philips-like keeps S/D', () => {
    const mr = resolveSkin('mindray-like').skin;
    expect(mr.hr).toMatchObject({ source: 'AUTO', relabelNonEcgAs: null });
    expect(mr.arrhythmia).toMatchObject({ vtac: { rate: 130, count: 6 }, pauseAlarm: false });
    expect(resolveSkin('saadat-like').skin.alarms.abpDisconnectDefault).toBe(false);
    expect(resolveSkin('philips-like').skin.alarms.abpDisconnectDefault).toBe(true);
    expect(resolveSkin('saadat-like').skin.ibp.staticDisplay).toBe('mean-only');
    expect(resolveSkin('philips-like').skin.ibp.staticDisplay).toBe('keep');
  });
});
