// Defibrillator plan E4a: every measurement of the ECG analysis core is checked on a constructed signal whose answer is
// known before it is trusted on a recording (plan §6, row E4a). Randomness draws from a named stream.
import { describe, expect, it } from 'vitest';
import {
  amplitude,
  autocorrelation,
  bandFractions,
  lzComplexity,
  measureSegment,
  preprocess,
  pulses,
  SEGMENT_S,
  spectrum,
  vfLeakage,
} from '../../../src/l3/ecg-analysis/features.ts';
import { seedStream, uniform } from '../../../src/rng/sfc32.ts';

const FS = 500;
const N = SEGMENT_S * FS;
const sine = (hz: number, a = 1, fs = FS, n = N, ph = 0) => Float64Array.from({ length: n }, (_, i) => a * Math.sin(2 * Math.PI * hz * (i / fs) + ph));
const add = (...xs: Float64Array[]) => Float64Array.from(xs[0] as Float64Array, (_, i) => xs.reduce((s, x) => s + (x[i] as number), 0));
/** Rectangular pulses of `widthS` at the given onsets (s), amplitude 1, on a zero baseline. */
const train = (onsetsS: number[], widthS: number, fs = FS, n = N) => {
  const x = new Float64Array(n);
  for (const t of onsetsS) for (let i = Math.round(t * fs); i < Math.round((t + widthS) * fs) && i < n; i++) x[i] = 1;
  return x;
};

describe('the segment', () => {
  it('is three seconds, as the ZOLL M2 guide says its algorithm divides the ECG [G A-34]', () => {
    expect(SEGMENT_S).toBe(3);
  });
});

describe('preprocessing (Amann 2005: order-5 moving average, 1 Hz drift high-pass, 30 Hz Butterworth low-pass)', () => {
  it('passes a 5 Hz sine, removes a DC offset, and attenuates 0.2 Hz drift and 60 Hz', () => {
    const tail = (x: Float64Array) => x.subarray(FS); // after the filters settle (1 s)
    const rmsOf = (x: Float64Array) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length);
    expect(rmsOf(tail(preprocess(sine(5), FS)))).toBeCloseTo(Math.SQRT1_2, 1);
    expect(Math.abs(preprocess(Float64Array.from({ length: N }, () => 2), FS).reduce((s, v) => s + v, 0) / N)).toBeLessThan(1e-9);
    expect(rmsOf(tail(preprocess(sine(0.2), FS)))).toBeLessThan(0.1 * Math.SQRT1_2);
    expect(rmsOf(tail(preprocess(sine(60), FS)))).toBeLessThan(0.3 * Math.SQRT1_2);
  });
});

describe('spectrum (Barro 1989, as described by Amann 2005)', () => {
  it('a 5 Hz sine: peak Ω at 5 Hz within one bin, normalised first moment ≈ 1, all amplitude near Ω (A2 ≈ 1, A1 = A3 = 0)', () => {
    const s = spectrum(sine(5), FS);
    expect(Math.abs(s.peakHz - 5)).toBeLessThanOrEqual(s.binHz);
    expect(s.moment).toBeGreaterThan(0.9);
    expect(s.moment).toBeLessThan(1.1);
    expect(s.a2).toBeGreaterThan(0.95);
    expect(s.a1).toBe(0);
    expect(s.a3).toBe(0);
  });
  it('a sine at 2 Hz with its 3rd harmonic: Ω at 2 Hz and the harmonic counted in A3', () => {
    const s = spectrum(add(sine(2), sine(6, 0.5)), FS);
    expect(Math.abs(s.peakHz - 2)).toBeLessThanOrEqual(s.binHz);
    expect(s.a3).toBeGreaterThan(0.2);
    expect(s.moment).toBeGreaterThan(1.2);
  });
  it('the peak is searched only in 0.5–9 Hz: a 20 Hz sine beside a smaller 4 Hz one peaks at 4 Hz', () => {
    expect(Math.abs(spectrum(add(sine(20), sine(4, 0.3)), FS).peakHz - 4)).toBeLessThanOrEqual(spectrum(sine(4), FS).binHz);
  });
});

describe('VF-filter leakage (Kuo & Dillman 1978, as described by Amann 2005)', () => {
  it('a 5 Hz sine: half period N = 50 samples at 500 Hz and leakage ≈ 0', () => {
    const v = vfLeakage(sine(5), FS);
    expect(v.halfPeriod).toBe(50);
    expect(v.leakage).toBeLessThan(0.05);
  });
  it('a pulse train leaks: leakage well above the sine’s', () => {
    expect(vfLeakage(train([0.1, 0.9, 1.7, 2.5], 0.08), FS).leakage).toBeGreaterThan(0.5);
  });
});

describe('pulses at the threshold-crossing rule (Thakor 1990: 20 % of each 1 s maximum, as described by Amann 2005)', () => {
  it('80 ms pulses at 75 /min: rate 75 /min, width 80 ms, interval variability 0', () => {
    const p = pulses(train([0.1, 0.9, 1.7, 2.5], 0.08), FS);
    expect(p.count).toBe(4);
    expect(p.ratePerMin).toBeCloseTo(75, 6);
    expect(p.tciMs).toBeCloseTo(800, 6);
    expect(p.widthMs).toBeCloseTo(80, 6);
    expect(p.intervalCv).toBeCloseTo(0, 9);
  });
  it('intervals alternating 0.6 s and 1.0 s: mean 0.8 s, coefficient of variation 0.25', () => {
    const p = pulses(train([0.1, 0.7, 1.7, 2.3], 0.08), FS);
    expect(p.tciMs).toBeCloseTo(((600 + 1000 + 600) / 3), 6);
    const m = 2200 / 3;
    const sd = Math.sqrt(((600 - m) ** 2 * 2 + (1000 - m) ** 2) / 3);
    expect(p.intervalCv).toBeCloseTo(sd / m, 9);
  });
  it('one pulse or none: no rate, no interval', () => {
    const p = pulses(train([1], 0.08), FS);
    expect(p.count).toBe(1);
    expect(p.ratePerMin).toBeNull();
    expect(p.intervalCv).toBeNull();
    expect(pulses(new Float64Array(N), FS).count).toBe(0);
  });
});

describe('autocorrelation regularity (after Chen 1987, as described by Amann 2005)', () => {
  it('a pulse train at 75 /min is perfectly regular at its 0.8 s period', () => {
    const a = autocorrelation(train([0.1, 0.9, 1.7, 2.5], 0.08), FS);
    expect(a.peak).toBeCloseTo(1, 6);
    expect(a.lagS).toBeCloseTo(0.8, 6);
  });
  it('a sine is regular (peak ≈ 1); noise from a named stream is not (peak < 0.3)', () => {
    expect(autocorrelation(sine(5), FS).peak).toBeGreaterThan(0.99);
    const r = seedStream(212, 'test-ecg-analysis');
    expect(autocorrelation(Float64Array.from({ length: N }, () => uniform(r) - 0.5), FS).peak).toBeLessThan(0.3);
  });
});

describe('complexity (Zhang 1999, as described by Amann 2005)', () => {
  it('a square wave is simple (C < 0.05); white noise from a named stream is complex (C > 0.8)', () => {
    const sq = Float64Array.from(sine(2), (v) => (v >= 0 ? 1 : -1));
    expect(lzComplexity(sq)).toBeLessThan(0.05);
    const r = seedStream(212, 'test-ecg-analysis');
    expect(lzComplexity(Float64Array.from({ length: N }, () => uniform(r) - 0.5))).toBeGreaterThan(0.8);
  });
});

describe('amplitude, baseline and noise content', () => {
  it('peak-to-peak and mean absolute value of a unit sine: 2 and 2/π', () => {
    const a = amplitude(sine(5));
    expect(a.ppMv).toBeCloseTo(2, 3);
    expect(a.meanAbsMv).toBeCloseTo(2 / Math.PI, 3);
  });
  it('equal-power drift (0.5 Hz) and signal (10 Hz): half the power is baseline; equal 10 Hz and 50 Hz: half is noise', () => {
    const b = bandFractions(add(sine(0.5), sine(10)), FS);
    expect(b.baselineFrac).toBeGreaterThan(0.4);
    expect(b.baselineFrac).toBeLessThan(0.6);
    expect(b.noiseFrac).toBeLessThan(0.01);
    const c = bandFractions(add(sine(10), sine(50)), FS);
    expect(c.noiseFrac).toBeGreaterThan(0.45);
    expect(c.noiseFrac).toBeLessThan(0.55);
    expect(c.baselineFrac).toBeLessThan(0.01);
  });
});

describe('measureSegment', () => {
  it('works at any rate (the 250 Hz CUDB as the 500 Hz engine): a 5 Hz sine reads the same at both', () => {
    const a = measureSegment(sine(5), FS);
    const b = measureSegment(sine(5, 1, 250, 750), 250);
    expect(Math.abs(a.peakHz - b.peakHz)).toBeLessThanOrEqual(0.25);
    expect(Math.abs(a.leakage - b.leakage)).toBeLessThan(0.05);
  });
  it('reads only the samples: its input is indices and a length, nothing else (no rhythm id can reach it)', () => {
    const x = add(sine(5), train([0.1, 0.9, 1.7, 2.5], 0.08));
    const seen = new Set<string>();
    const spy = new Proxy(x, {
      get(t, k) {
        if (typeof k === 'string' && !/^\d+$/.test(k)) seen.add(k);
        const v = Reflect.get(t, k);
        return typeof v === 'function' ? v.bind(t) : v;
      },
    });
    expect(measureSegment(spy, FS)).toEqual(measureSegment(x, FS));
    expect([...seen].filter((k) => k !== 'length')).toEqual([]);
  });
  it('refuses a segment that is not three seconds long', () => {
    expect(() => measureSegment(new Float64Array(100), FS)).toThrow(RangeError);
  });
});
