// SpO2 device chain and tone pitch (brief §4.3, research 03 §3.6; BUILD-PLAN Stage 3 acceptance 9).
import { describe, expect, it } from 'vitest';
import { BEEP_BASE_HZ, createSpo2, spo2Measured, spo2PitchHz, stepSpo2 } from '../../../src/l3/spo2/spo2.ts';

const ok = { probe: 'on' as const, pi: 2, cuffOnLimb: false, cpr: false };

describe('SpO2 device chain', () => {
  it('pitch: 1245·2^(−(100 − SpO2)·0.1/12): 90 % → 1175.1 Hz ± 1, 100 % → 1245, none → 1245', () => {
    expect(Math.abs(spo2PitchHz(90) - 1175.1)).toBeLessThanOrEqual(1);
    expect(spo2PitchHz(100)).toBe(1245);
    expect(spo2PitchHz(null)).toBe(1245);
  });

  it('the beep base is the measured Saadat 1245 Hz, apart from the 880 Hz alarm pulses down to SpO2 40 %', () => {
    expect(BEEP_BASE_HZ).toBe(1245);
    expect(spo2PitchHz(41)).toBeGreaterThan(880);
    expect(spo2PitchHz(40)).toBeCloseTo(880, 0);
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

  // E126: no held "99?" — the value is shown (valid) until PULSE_LOST_S without a pulse, then blank (invalid)
  it('no pulse: shown until 4 s, then blank and invalid (never a held questionable value); probe off: invalid at once; same-limb cuff holds', () => {
    const st = createSpo2(0.97, 0);
    for (let k = 1; k <= 200; k++) stepSpo2(st, { ...ok, siteSa: 0.97, lastFootT: k / 10 }, k / 10);
    const seen: Array<ReturnType<typeof spo2Measured>> = [];
    for (let k = 201; k <= 320; k++) {
      stepSpo2(st, { ...ok, siteSa: 0.97, lastFootT: 20 }, k / 10);
      seen.push(spo2Measured(st, k / 10));
    }
    expect(seen.map((m) => m.flag)).not.toContain('questionable');
    expect(seen[38]).toMatchObject({ value: 97, flag: 'valid', at: 23.9 });
    expect(seen.at(-1)).toMatchObject({ value: null, flag: 'invalid' });
    const c = createSpo2(0.97, 0);
    for (let k = 1; k <= 400; k++) stepSpo2(c, { ...ok, siteSa: 0.97, lastFootT: 1, cuffOnLimb: true }, k / 10);
    expect(spo2Measured(c, 40)).toMatchObject({ value: 97, flag: 'valid' });
    stepSpo2(c, { ...ok, probe: 'off', siteSa: 0.97, lastFootT: 40 }, 41);
    expect(spo2Measured(c, 41).value).toBeNull();
  });
  // E126 (owner ruling 2026-10-26): pulseless without compressions → blank + invalid; compressions that make a pleth →
  // the model's saturation read through them, questionable (low signal); compressions stop with a pulse → the reading
  // returns valid with no refill (the pulse never stopped); a pulse after a blank spell → the average refills first.
  it('E126 sensor states: pulseless no CPR → blank; CPR pulses → value + questionable; ROSC → valid after the settle', () => {
    const st = createSpo2(0.99, 0);
    let t = 0;
    const step = (s: number, x: Partial<typeof ok> & { lastFootT: (t: number) => number }) => {
      for (const end = t + s; t < end - 1e-9;) {
        t = Math.round((t + 0.1) * 10) / 10;
        stepSpo2(st, { ...ok, ...x, siteSa: 0.99, lastFootT: x.lastFootT(t) }, t);
      }
    };
    step(20, { lastFootT: (u) => u }); // perfusing
    step(30, { lastFootT: () => 20 }); // arrest, no compressions
    expect(spo2Measured(st, t)).toMatchObject({ value: null, flag: 'invalid' });
    step(4, { cpr: true, pi: 0.2, lastFootT: (u) => u }); // compressions: the average refills (8 s)
    expect(spo2Measured(st, t).value).toBeNull();
    step(10, { cpr: true, pi: 0.2, lastFootT: (u) => u });
    expect(spo2Measured(st, t)).toMatchObject({ value: 99, flag: 'questionable' });
    step(5, { lastFootT: (u) => u }); // ROSC: compressions stop, the pulse is the heart's
    expect(spo2Measured(st, t)).toMatchObject({ value: 99, flag: 'valid' });
    const lastBeat = t;
    step(10, { lastFootT: () => lastBeat }); // a pulse check that finds none: blank in 4 s
    expect(spo2Measured(st, t)).toMatchObject({ value: null, flag: 'invalid' });
  });
});
