import { describe, expect, it } from 'vitest';
import { ALARM_PROFILES, getAlarmProfile } from '../src/profiles/index.ts';

describe('alarm profiles as data', () => {
  it.each(Object.values(ALARM_PROFILES))('$id: fundamentals in 150–1000 Hz, ≥ 4 harmonics within 15 dB, ramps ≥ 10 ms', (p) => {
    for (const l of Object.values(p.levels)) {
      expect(l.freqHz).toBeGreaterThanOrEqual(150);
      expect(l.freqHz).toBeLessThanOrEqual(1000);
    }
    const top4 = [...p.harmonicsDb].sort((a, b) => b - a).slice(0, 4);
    expect(top4).toHaveLength(4);
    expect((top4[0] as number) - (top4[3] as number)).toBeLessThanOrEqual(15);
    expect(p.rampMs).toBeGreaterThanOrEqual(10);
  });

  it.each(Object.values(ALARM_PROFILES))('$id: priorities are 3–6 dB apart', (p) => {
    expect(p.levels.L1.levelDb - p.levels.L2.levelDb).toBeGreaterThanOrEqual(3);
    expect(p.levels.L1.levelDb - p.levels.L2.levelDb).toBeLessThanOrEqual(6);
    expect(p.levels.L2.levelDb - p.levels.L3.levelDb).toBeGreaterThanOrEqual(3);
    expect(p.levels.L2.levelDb - p.levels.L3.levelDb).toBeLessThanOrEqual(6);
  });

  it.each(Object.values(ALARM_PROFILES))('$id: every provenance source cites a report or brief section', (p) => {
    for (const [k, e] of Object.entries(p.provenance)) expect(e.source, k).toMatch(/(research\/0[0-6] §\d|brief §\d|^ENG)/);
  });

  it('saadat keeps its [assumed] timing and [unverified] pitch tags', () => {
    const p = getAlarmProfile('saadat').provenance;
    expect(p['levels.L1.gapsMs']?.tag).toBe('assumed');
    expect(p['levels.L1.freqHz']?.tag).toBe('unverified');
    expect(p['levels.L3.repeatS']?.tag).toBe('documented');
  });

  it('unknown profile throws', () => {
    expect(() => getAlarmProfile('iso')).toThrow(/unknown alarm sound profile/);
  });

});
