import { describe, expect, it } from 'vitest';
import { formatDate, PRESET_IDS, PRESETS, provenanceGaps, resolveSkin } from '../src/index.ts';
import { validate } from '../src/validate.ts';

describe('preset iran-icu-as-found (brief §6.9)', () => {
  it.each(PRESET_IDS)('%s validates and every override is sourced', (id) => {
    const p = PRESETS[id]!;
    expect(validate('preset', p).errors).toEqual([]);
    const doc = { overrides: p.overrides, alarmSwitches: p.alarmSwitches, startState: p.startState };
    expect(provenanceGaps(doc, p.provenance)).toEqual({ uncovered: [], dangling: [] });
  });

  it('MONITOR filter, lead II ×2 on two lanes, HR 16 s from ECG, beep off, solar date, HR/RR alarms off, APNEA LIMIT OFF', () => {
    const r = resolveSkin('iran-icu-as-found');
    expect(r.skinId).toBe('saadat-like');
    expect(r.presetId).toBe('iran-icu-as-found');
    expect(r.render.ecgFilter).toMatchObject({ name: 'MONITOR', band: [0.5, 24], exact: false });
    expect(r.skin.hr).toMatchObject({ windowDefault: 16, source: 'ECG' });
    expect(r.audio.beep.enabled).toBe(false);
    expect(r.skin.calendar.default).toBe('solar');
    expect(r.render.lanes.map((l) => l.label)).toEqual(['II  X2  MONITOR', 'II  X2  MONITOR', 'PLETH', 'RESP']);
    expect(r.preset).toEqual({ alarmSwitches: { HR: false, RR: false, NIBP: true, SpO2: true }, startState: { apneaLimit: 'OFF' } });
    expect(r.provenance['ecg.filterDefault']?.source).toContain('F7');
  });

  it('the base skin stays factory (the preset does not leak)', () => {
    resolveSkin('iran-icu-as-found');
    expect(resolveSkin('saadat-like').skin.calendar.default).toBe('gregorian');
  });
});

describe('formatDate', () => {
  const d = new Date(Date.UTC(2023, 5, 25));
  it('solar = Jalali YYYY/MM/DD with Latin digits (research 06 F7 shows 1402/04/04)', () => {
    expect(formatDate(d, 'solar')).toBe('1402/04/04');
  });
  it('gregorian formats', () => {
    expect(formatDate(d, 'gregorian', 'DD/MM/YYYY')).toBe('25/06/2023');
    expect(formatDate(d, 'gregorian', 'MM/DD/YYYY')).toBe('06/25/2023');
    expect(formatDate(d, 'gregorian', 'YYYY-MM-DD')).toBe('2023-06-25');
  });
});
