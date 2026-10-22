// DeviceProfile from the skins (brief §6.4.1, §6.8 tables).
import { describe, expect, it } from 'vitest';
import { deviceProfile, limitGroup, skinBand } from '../../../src/l3/alarms/profile.ts';

describe('deviceProfile', () => {
  it('saadat-like: factory ON (E114; the as-found preset OFF), the four always-on alarms, 120 s silence that hides visuals, no pause, 10 s asystole', () => {
    const p = deviceProfile('saadat-like');
    expect(p.factoryEnabled).toBe(true);
    expect(deviceProfile('iran-icu-as-found').factoryEnabled).toBe(false);
    expect(p.alwaysOn).toEqual(['ASYSTOLE', 'VFIB', 'VTAC', 'APNEA']);
    expect(p.silence).toEqual({ mode: 'mute', durationS: 120, suppressesVisual: true, cancelOnNewAlarm: true, technicalActsAsAck: true });
    expect(p.pauseS).toBeNull();
    expect(p.latching).toEqual({ visual: 'off', audible: 'off' });
    expect(p.prefix).toBe('none');
    expect(p.arrhythmia.asystoleS).toBe(10);
    expect(p.arrhythmia.vtacRate).toBe(120);
    expect(p.limits.HR).toMatchObject({ numeric: 'hr', low: 50, high: 150, level: 1 });
    expect(p.limits.EtCO2).toMatchObject({ low: 30, high: 50, level: 2 }); // E115: in mmHg, as the CO2 tile prints it (was 2.6–6.5 %V)
    expect(p.limits.EtCO2_pctV).toBeUndefined();
    // E115: the NIBP and ART pairs as the tiles print them
    expect([p.limits.NIBP_S, p.limits.NIBP_D, p.limits.ART_S, p.limits.ART_D, p.limits.T1, p.limits.T2].map((l) => [l?.low, l?.high])).toEqual([[90, 160], [50, 100], [70, 165], [35, 100], [35, 39], [35, 39]]);
    expect(p.defib).toBeNull();
    expect(p.pacer).toBeNull();
  });

  it('philips-like: limits by age band (HR 50–120 / 75–160 / 100–200), desat 80, 4 s / 3 s asystole, Silence = acknowledge, 120 s pause (IntelliVue [S1]/[S2])', () => {
    expect(deviceProfile('philips-like', 'adult').limits.HR).toMatchObject({ low: 50, high: 120, level: 2 });
    expect(deviceProfile('philips-like', 'paed').limits.HR).toMatchObject({ low: 75, high: 160 });
    const neo = deviceProfile('philips-like', 'neo');
    expect(neo.limits.HR).toMatchObject({ low: 100, high: 200 });
    expect(neo.arrhythmia.asystoleS).toBe(3);
    const a = deviceProfile('philips-like');
    expect(a.desat).toBe(80);
    expect(a.arrhythmia.asystoleS).toBe(4);
    expect(a.silence).toMatchObject({ mode: 'acknowledge', durationS: null, suppressesVisual: false });
    expect(a.pauseS).toBe(120);
    expect(a.latching).toEqual({ visual: 'red', audible: 'off' });
    expect(a.prefix).toBe('asterisks');
  });

  it('saadat-like paediatric band marks inherited limits approximate (brief §6.8)', () => {
    const p = deviceProfile('saadat-like', 'paed');
    expect(p.limits.HR?.approximate).toBe(true);
    expect(p.limits.NIBP_S).toMatchObject({ low: 70, high: 120, approximate: false });
  });

  it('zoll-like: no published limits (never invented), defib 120 J, pacer defaults; lifepak-like dashes HR while pacing', () => {
    const z = deviceProfile('zoll-like');
    expect(z.limits).toEqual({});
    expect(z.defib?.energyAdultJ).toBe(120);
    expect(z.pacer?.rateDefault).toBe(70);
    expect(z.syncMarker).toBe('r-above');
    expect(z.hrDashesWhilePacing).toBe(false);
    expect(deviceProfile('lifepak-like').hrDashesWhilePacing).toBe(true);
  });

  it('presets resolve through their base skin; engine age-band names map to skin bands', () => {
    expect(deviceProfile('iran-icu-as-found').prefix).toBe('none');
    expect(deviceProfile('iran-icu-as-found').switches).toEqual({ HR: false, RR: false, NIBP: true, SpO2: true });
    expect(limitGroup('NIBP_S')).toBe('NIBP');
    expect(skinBand('paediatric')).toBe('paed');
    expect(skinBand('neonatal')).toBe('neo');
    expect(skinBand(undefined)).toBe('adult');
    expect(() => deviceProfile('nope-like')).toThrow();
  });
});
