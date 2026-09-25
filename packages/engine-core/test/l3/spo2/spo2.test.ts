// SpO2 device chain and tone pitch (brief §4.3, research 03 §3.6; BUILD-PLAN Stage 3 acceptance 9).
import { describe, expect, it } from 'vitest';
import { createSpo2, spo2Measured, spo2PitchHz, stepSpo2 } from '../../../src/l3/spo2/spo2.ts';

const ok = { probe: 'on' as const, pi: 2, cuffOnLimb: false, cpr: false };

describe('SpO2 device chain', () => {
  it('pitch: 880·2^(−(100 − SpO2)·0.1/12): 90 % → 830.6 Hz ± 1, 100 % → 880, none → 880', () => {
    expect(Math.abs(spo2PitchHz(90) - 830.6)).toBeLessThanOrEqual(1);
    expect(spo2PitchHz(100)).toBe(880);
    expect(spo2PitchHz(null)).toBe(880);
  });

  it('a site step from 97 to 85 %: lag + 8 s average reach 90 % of the change in ≤ 20 s (brief §6.1 response)', () => {
    const st = createSpo2(0.97, 0);
    let t90 = 0;
    const shown: number[] = [];
    for (let k = 1; k <= 400; k++) {
      const t = k / 10;
      stepSpo2(st, { ...ok, siteSa: 0.85, lastFootT: t }, t);
      if (k % 10 === 0) shown.push(st.shown as number);
      if (!t90 && (st.shown as number) <= 97 - 0.9 * 12) t90 = t;
    }
    expect(t90).toBeGreaterThan(5);
    expect(t90).toBeLessThanOrEqual(20);
    expect(shown[shown.length - 1]).toBe(85); // settled; with bias 0 and ≥ 80 % there is no under-reading
  });

  it('no pulse: held (questionable) after 4 s, invalid after 10 s; probe off: invalid at once; same-limb cuff holds', () => {
    const st = createSpo2(0.97, 0);
    for (let k = 1; k <= 200; k++) stepSpo2(st, { ...ok, siteSa: 0.97, lastFootT: k / 10 }, k / 10);
    for (let k = 201; k <= 260; k++) stepSpo2(st, { ...ok, siteSa: 0.97, lastFootT: 20 }, k / 10);
    expect(spo2Measured(st, 26).flag).toBe('questionable');
    for (let k = 261; k <= 320; k++) stepSpo2(st, { ...ok, siteSa: 0.97, lastFootT: 20 }, k / 10);
    expect(spo2Measured(st, 32).value).toBeNull();
    const c = createSpo2(0.97, 0);
    for (let k = 1; k <= 400; k++) stepSpo2(c, { ...ok, siteSa: 0.97, lastFootT: 1, cuffOnLimb: true }, k / 10);
    expect(spo2Measured(c, 40)).toMatchObject({ value: 97, flag: 'valid' });
    stepSpo2(c, { ...ok, probe: 'off', siteSa: 0.97, lastFootT: 40 }, 41);
    expect(spo2Measured(c, 41).value).toBeNull();
  });
});
