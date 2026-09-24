import { describe, expect, it } from 'vitest';
import { chargeReadyTone, chargeTone, PITCH_MAPS, pitchHz, toneDurationMs, type PitchMapId } from '../src/profiles/index.ts';

describe('pitch maps', () => {
  it.each(Object.keys(PITCH_MAPS) as PitchMapId[])('%s is monotonic non-decreasing in SpO2 and 880 Hz at 100 %%', (m) => {
    let prev = 0;
    for (let s = 0; s <= 100; s++) {
      const f = pitchHz(m, s) as number;
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
    expect(pitchHz(m, 100)).toBeCloseTo(880, 9);
  });

  it('nellcor-like: ≈ 5 Hz per % near 100 %, 830 Hz ± 1 at 90 % (BUILD-PLAN Stage 3 test 9)', () => {
    expect(880 - (pitchHz('nellcor-like', 99) as number)).toBeCloseTo(5.07, 1);
    expect(pitchHz('nellcor-like', 90)).toBeCloseTo(830.6, 0);
  });

  it('enhanced drops faster than nellcor-like; none is fixed; no SpO2 = no tone', () => {
    expect(pitchHz('enhanced', 85) as number).toBeLessThan(pitchHz('nellcor-like', 85) as number);
    expect(pitchHz('none', 70)).toBe(880);
    expect(pitchHz('nellcor-like', null)).toBeNull();
    expect(pitchHz('nellcor-like', 120)).toBe(880);
  });
});

describe('device tones', () => {
  it('charge tone lasts the charge time (LIFEPAK-like ramp, ZOLL-like pips)', () => {
    expect(toneDurationMs(chargeTone('lifepak-like', 7))).toBe(7000);
    expect(chargeTone('lifepak-like', 7)[0]).toMatchObject({ startHz: 400, endHz: 1000 });
    expect(toneDurationMs(chargeTone('zoll-like', 5))).toBe(5000);
  });

  it('ZOLL-like ready tone: 50 s then a higher tone for 10 s; LIFEPAK-like 60 s', () => {
    const z = chargeReadyTone('zoll-like');
    expect(z.map((s) => s.durMs)).toEqual([50_000, 10_000]);
    expect(z[1]!.startHz).toBeGreaterThan(z[0]!.startHz);
    expect(toneDurationMs(chargeReadyTone('lifepak-like'))).toBe(60_000);
  });
});
