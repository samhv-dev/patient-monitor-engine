// R50 review F4: the alarm mirror speaks glossary words, never the vendor's aliases.
import { describe, expect, it } from 'vitest';
import type { NumericId } from '@pme/engine-core';
import { alarmLine, FIXED_ALARM_WORDS, limitsOffTitle } from './alarms.ts';

describe('alarm mirror wording', () => {
  it('limit alarms: the glossary label of the numeric and the side', () => {
    expect(alarmLine({ id: 'ART_S_LOW', text: '**ABPs 21<90', numeric: 'abpSys' })).toEqual({ text: 'ART S low', known: true });
    expect(alarmLine({ id: 'SpO2_LOW', text: '%SPO2 LOW', numeric: 'spo2' })).toEqual({ text: 'SpO₂ low', known: true });
    expect(alarmLine({ id: 'NIBP_S_HIGH', text: '**NBPs 190>160', numeric: 'nibpSys' }).text).toBe('NIBP S high');
    expect(alarmLine({ id: 'EtCO2_HIGH', text: '**etCO2 50>45', numeric: 'etco2' }).text).toBe('EtCO₂ high');
    expect(alarmLine({ id: 'TEMP_LOW', text: '**Temp 35.9<36.0', numeric: 'tempCore' }).text).toBe('T1 low');
  });
  it('every limit numeric the device layer watches has a glossary label', () => {
    const numerics: NumericId[] = ['hr', 'spo2', 'nibpSys', 'nibpDia', 'nibpMean', 'abpSys', 'abpDia', 'abpMean', 'cvpMean', 'icpMean', 'cpp', 'papSys', 'papDia', 'papMean', 'rr', 'awrr', 'etco2', 'tempCore', 'tempSite', 'stII', 'prAbp'];
    for (const n of numerics) expect(alarmLine({ id: `X_HIGH`, text: 'vendor', numeric: n }).known, n).toBe(true);
  });
  it('fixed alarms in clinical words; the vendor alias never reaches the mirror', () => {
    expect(alarmLine({ id: 'abpNonPulsatile', text: 'ABP NON-PULSATILE' }).text).toBe('ART: no pulsatile pressure');
    expect(alarmLine({ id: 'DESAT', text: '***DESAT' }).text).toBe('Desaturation');
    for (const w of Object.values(FIXED_ALARM_WORDS)) expect(w).not.toMatch(/\bABP\b|NBP|etCO2|\*/);
  });
  it('an unknown alarm keeps the monitor text without its stars, flagged', () => {
    expect(alarmLine({ id: 'somethingNew', text: '**NEW THING' })).toEqual({ text: 'NEW THING', known: false });
  });
});

describe('FU-11 (owner ruling Q4): the "Limit alarms off" tooltip', () => {
  it('names what the skin lists as always on, in the table\'s words; drops apnoea under APNEA LIMIT OFF; generic when none', () => {
    expect(limitsOffTitle(['ASYSTOLE', 'VFIB', 'VTAC', 'APNEA'])).toBe('Limit alarms are off on this monitor. Still alarming: Asystole, Ventricular fibrillation or tachycardia, Ventricular tachycardia, Apnoea.');
    expect(limitsOffTitle(['ASYSTOLE', 'APNEA'], true)).toBe('Limit alarms are off on this monitor. Still alarming: Asystole.');
    expect(limitsOffTitle([])).toBe('Limit alarms are off on this monitor; the alarms it cannot switch off still sound.');
  });
});
