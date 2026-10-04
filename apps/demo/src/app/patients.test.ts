import { describe, expect, it } from 'vitest';
import { COMORBIDITIES, PATIENT_PRESETS, oneLiner, profileOf } from './patients.ts';

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
    expect(Object.values(profileOf(base).sensors ?? {}).every((s) => s === 'on')).toBe(true);
  });
  it('writes the session-bar one-liner in clinical words', () => {
    expect(oneLiner({ ageY: 60, sex: 'M', weightKg: 80, heightCm: 175, comorbid: ['hfref', 'betaBlocked'], attached: true })).toBe('M 60 y 80 kg, heart failure (reduced EF), β-blocked');
  });
});
