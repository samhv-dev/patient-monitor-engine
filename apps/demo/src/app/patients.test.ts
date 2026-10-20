import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { COMORBIDITIES, PATIENT_PRESETS, nibpStartCommand, oneLiner, profileOf } from './patients.ts';

describe('patient profiles', () => {
  it('map comorbidities 1:1 onto the engine profile and never include a later (v1.1) condition', () => {
    const p = profileOf({ ageY: 72, sex: 'F', weightKg: 64, heightCm: 160, comorbid: ['htn', 'as', 'copd', 'pregnancy'], attached: true });
    expect(p.conditions).toEqual([{ id: 'htn' }, { id: 'as', grade: 'severe' }]);
    expect(p.lungConditions).toEqual([{ id: 'copd', severity: 0.5 }]);
    expect(COMORBIDITIES.find((c) => c.id === 'pregnancy')?.later).toBe('v1.1');
  });
  it('sensors start off when the learner attaches them (traces appear only then)', () => {
    const base = PATIENT_PRESETS[0]?.spec;
    expect(base).toBeDefined();
    if (!base) return;
    expect(Object.values(profileOf({ ...base, attached: false }).sensors ?? {})).toEqual(['off', 'off', 'off', 'off', 'off']);
    expect(profileOf(base).sensors).toEqual({ ecg: 'on', spo2: 'on', nibp: 'on', co2: 'off', temp: 'on' });
  });
  it('O4: a spontaneously breathing patient starts without the CO2 line (research/34 §8 O4; the Ventilator view attaches it)', () => {
    for (const p of PATIENT_PRESETS) expect(profileOf(p.spec).sensors?.co2).toBe('off');
  });
  it('O2: the NIBP start command follows the skin (saadat-like and its preset AUTO 5 min; every other skin none)', () => {
    for (const id of ['saadat-like', 'iran-icu-as-found']) expect(nibpStartCommand(resolveSkin(id).skin)).toEqual({ device: 'nibp', action: 'auto', intervalMin: 5 });
    for (const id of ['philips-like', 'ge-like', 'mindray-like', 'zoll-like', 'lifepak-like']) expect(nibpStartCommand(resolveSkin(id).skin)).toBeNull();
  });
  it('O3: no invasive line is attached by default', () => {
    const s = profileOf(PATIENT_PRESETS[0]!.spec).sensors ?? {};
    for (const k of ['abp', 'cvp', 'pap']) expect(s).not.toHaveProperty(k);
  });
  it('writes the session-bar one-liner in clinical words', () => {
    expect(oneLiner({ ageY: 60, sex: 'M', weightKg: 80, heightCm: 175, comorbid: ['hfref', 'betaBlocked'], attached: true })).toBe('M 60 y 80 kg, heart failure (reduced EF), β-blocked');
  });
});
