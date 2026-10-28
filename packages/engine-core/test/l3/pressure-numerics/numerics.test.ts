import { describe, expect, it } from 'vitest';
import { createWaveNumerics, numericsStep, pressureNumerics, prNumeric } from '../../../src/l3/pressure-numerics/numerics.ts';

describe('l3/pressure-numerics (brief §4.2 numerics)', () => {
  it('per-beat max/min and MAP by INTEGRAL, averaged, then the flat-line fallback', () => {
    const wn = createWaveNumerics(3);
    const x = (t: number) => {
      const u = (t % 1) / 1;
      return u < 0.1 ? 80 + 400 * u : 80 + 40 * Math.exp(-(u - 0.1) * 6);
    };
    let sum = 0;
    let n = 0;
    for (let m = 0; m < 125 * 20; m++) {
      const v = x(m / 125);
      numericsStep(wn, m, v);
      if (m >= 125 * 12) {
        sum += v;
        n++;
      }
    }
    const p = pressureNumerics(wn, 20);
    expect(p.sys.flag).toBe('valid');
    expect(Math.abs(p.sys.value! - 120)).toBeLessThan(1.5); // the 125 Hz grid can miss the exact peak
    expect(Math.abs(p.dia.value! - 80)).toBeLessThan(1.5);
    expect(Math.abs(p.mean.value! - sum / n)).toBeLessThan(1);
    expect(prNumeric(wn, 20).value).toBe(60);
    for (let m = 125 * 20; m < 125 * 30; m++) numericsStep(wn, m, 12);
    const flat = pressureNumerics(wn, 30);
    // FU-5: a static pressure shows its mean; S/D are not measurable (research/06 §4.1; audit M5)
    expect(flat.mean.flag).toBe('valid');
    expect(flat.mean.value).toBeCloseTo(12, 6);
    expect(flat.sys.flag).toBe('invalid');
    expect(flat.dia.flag).toBe('invalid');
    expect(prNumeric(wn, 30).flag).toBe('invalid');
  });
});

describe('fresh beats, the non-pulsatile rule and the searching start', () => {
  const beat = (t: number) => { const u = t % 1; return u < 0.1 ? 80 + 400 * u : 80 + 40 * Math.exp(-(u - 0.1) * 6); };
  it('one late small bump after a pulseless spell is not averaged with the pre-arrest beats (the PEA 118/79 glitch)', () => {
    const wn = createWaveNumerics(3);
    for (let m = 0; m < 125 * 20; m++) numericsStep(wn, m, beat(m / 125));
    for (let m = 125 * 20; m < 125 * 40; m++) numericsStep(wn, m, 20 + (m >= 125 * 36 && m < 125 * 37 ? 5 * Math.sin((Math.PI * (m - 125 * 36)) / 125) : 0));
    const p = pressureNumerics(wn, 40);
    expect(p.sys.flag).toBe('invalid');
    expect(p.mean.value).toBeGreaterThan(18);
    expect(p.mean.value).toBeLessThan(23);
  });
  it('amplitude < 3 mmHg is non-pulsatile; ≥ 3 mmHg at ≥ 25/min is pulsatile ([S2] p. 57)', () => {
    for (const [amp, want] of [[2, 'invalid'], [6, 'valid']] as const) {
      const wn = createWaveNumerics(1);
      for (let m = 0; m < 125 * 20; m++) numericsStep(wn, m, 30 + amp * Math.max(0, Math.sin((2 * Math.PI * m) / 125)) ** 3);
      expect(pressureNumerics(wn, 20).sys.flag).toBe(want);
    }
  });
  it('a line that has sampled less than 10 s without a beat is still searching: all invalid', () => {
    const wn = createWaveNumerics(3);
    for (let m = 0; m < 125 * 2; m++) numericsStep(wn, m, 0);
    expect(pressureNumerics(wn, 2).mean.flag).toBe('invalid');
    for (let m = 125 * 2; m < 125 * 11; m++) numericsStep(wn, m, 0);
    expect(pressureNumerics(wn, 11).mean).toMatchObject({ value: 0, flag: 'valid' });
  });
  it('a static line needs 3 s of pulsatile beats before S/D return (no NON-PULSATILE flicker)', () => {
    const wn = createWaveNumerics(1);
    for (let m = 0; m < 125 * 12; m++) numericsStep(wn, m, 20);
    expect(pressureNumerics(wn, 12).sys.flag).toBe('invalid'); // static
    let t = 12;
    const flags: string[] = [];
    for (let m = 125 * 12; m < 125 * 20; m++) {
      numericsStep(wn, m, 20 + 10 * Math.max(0, Math.sin((2 * Math.PI * m) / 100)) ** 3);
      if ((m + 1) % 125 === 0) flags.push(pressureNumerics(wn, (t += 1)).sys.flag);
    }
    const first = flags.indexOf('valid');
    expect(first).toBeGreaterThan(0);
    expect(flags.slice(first).every((f) => f === 'valid')).toBe(true);
  });
  it("'keep' (philips-like, [S2] p. 57): a static line keeps S/D/M of the flat line and reports non-pulsatile; 'mean-only' (saadat-like) hides S/D", () => {
    for (const [disp, sd] of [['keep', 'valid'], ['mean-only', 'invalid']] as const) {
      const wn = createWaveNumerics(1);
      wn.staticDisplay = disp;
      for (let m = 0; m < 125 * 12; m++) numericsStep(wn, m, 20 + Math.sin((2 * Math.PI * m) / 625));
      const p = pressureNumerics(wn, 12);
      expect(p.pulsatile).toBe(false);
      expect(p.mean.flag).toBe('valid');
      expect(p.sys.flag).toBe(sd);
      expect(p.dia.flag).toBe(sd);
      if (disp === 'keep') {
        expect(p.sys.value as number).toBeGreaterThan(p.mean.value as number);
        expect(p.dia.value as number).toBeLessThan(p.mean.value as number);
        expect((p.sys.value as number) - (p.dia.value as number)).toBeLessThan(3);
      }
    }
  });
  it('amplitude hysteresis: a static line stays static on 3.5 mmHg beats (≥ 3 but < REPULSE_AMP_MMHG 4), and a pulsatile line stays pulsatile on them', () => {
    const run = (startAmp: number) => {
      const wn = createWaveNumerics(1);
      let p = false;
      for (let m = 0; m < 125 * 20; m++) {
        numericsStep(wn, m, 30 + (m < 125 * 12 ? startAmp : 3.5) * Math.max(0, Math.sin((2 * Math.PI * m) / 125)) ** 3);
        if ((m + 1) % 125 === 0) p = pressureNumerics(wn, (m + 1) / 125).pulsatile; // once per second, as emitSecond
      }
      return p;
    };
    expect(run(0)).toBe(false); // was static: needs ≥ 4 mmHg to leave
    expect(run(8)).toBe(true); // was pulsatile: ≥ 3 mmHg keeps it
  });

  it('a pressure line: a small upstroke after large beats is its own beat (search-back), never merged into the interval before it', () => {
    // 0.6 s beats rising 40 mmHg (80 ms upstroke, run-off, dicrotic notch and wave, diastolic tail); the one at 6.5 s
    // rises 20 mmHg, under 60 % of the SSF peaks. Before the search-back the interval 5.9–7.1 s spanned two beats and
    // read the large beat's systolic over the small beat's end-diastole.
    const pulse = (u: number) => {
      if (u <= 0) return 0;
      if (u < 0.08) return 0.5 * (1 - Math.cos((Math.PI * u) / 0.08));
      const v = u - 0.08;
      return Math.exp(-((v / 0.15) ** 2)) + 0.25 * Math.exp(-v / 1.2) * (1 - Math.exp(-v / 0.05)) + 0.4 * Math.exp(-(((u - 0.36) / 0.045) ** 2));
    };
    const onsets: number[] = [];
    for (let t = 0.5; t < 12; t += 0.6) onsets.push(t);
    const rise = (t: number) => (Math.abs(t - 6.5) < 0.01 ? 20 : 40);
    const x = (t: number) => 60 + onsets.reduce((s, o) => s + rise(o) * pulse(t - o), 0);
    const wn = createWaveNumerics(3);
    const beats: Array<{ t: number; sys: number; dur: number }> = [];
    for (let m = 0; m < 125 * 12; m++) {
      const b = numericsStep(wn, m, x(m / 125), false, true);
      if (b) beats.push(b);
    }
    const end = (t: number) => beats.find((b) => Math.abs(b.t - t) < 0.04);
    const before = end(6.5); // the large beat 5.9–6.5 s
    const small = end(7.1); // the small beat 6.5–7.1 s
    expect(before?.dur).toBeCloseTo(0.6, 1);
    expect(small?.dur).toBeCloseTo(0.6, 1);
    expect((small?.sys as number) - (before?.sys as number)).toBeLessThan(-15); // its own, smaller systolic
    expect(beats.every((b) => b.dur < 0.7)).toBe(true); // no interval spans two beats
  });

  it('pleth (ownPulse): a pulse is measured over its own period when the detector missed the next foot (MISSED_LIMIT, Pan & Tompkins 1985); a pressure line keeps the foot-to-foot beat', () => {
    // 1 Hz pulses of 0.2 (steep upstroke, run-off); the pulse at 10 s rises too slowly to be detected and peaks at 0.3,
    // so the interval from the foot at 9 s to the next found foot (11 s) spans two pulses
    const x = (t: number) => {
      const k = Math.floor(t);
      const u = t - k;
      if (k === 10) return u < 0.9 ? 0.3 * (u / 0.9) ** 2 : (0.3 * (1 - u)) / 0.1;
      return u < 0.1 ? 2 * u : 0.2 * Math.exp(-(u - 0.1) * 6);
    };
    const run = (own: boolean) => {
      const wn = createWaveNumerics(0.03);
      const amp: Record<string, number> = {};
      for (let m = 0; m < 125 * 14; m++) {
        const b = numericsStep(wn, m, x(m / 125), own);
        if (b) amp[b.t.toFixed(0)] = b.sys - b.dia;
      }
      return amp;
    };
    const own = run(true);
    const merged = run(false);
    expect(merged['11']).toBeCloseTo(0.297, 2); // max − min over 9–11 s: the missed pulse's peak over the trough before it
    expect(own['11']).toBeCloseTo(own['9'] as number, 3); // the pulse whose foot is 9 s, as any other
    expect(own['12']).toBeCloseTo(merged['12'] as number, 6); // single-pulse intervals are unchanged
  });
});
