// EEG E7, the BIS-type reader on CONSTRUCTED inputs only (no engine, no generator: a finding of the EEG plan, N120).
// Every expected value is derived in its comment from the papers' formulas: [CON22] Connor 2022 Table 1 (openibis,
// "l. n" = its line n) and p. 6; [RAM98] Rampil 1998 Eqs 6–8 (pp. 994–995). The engine's signal is in
// test/engine/eeg-bis-course.test.ts.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BIS_TYPE_SPEC, bispectrumAt, bisTypeRead, components, createBisType, epochSpectrum, mixer, piecewise, sawtoothDetector, scurve } from '../../../src/l3/eeg-devices/bis-type.ts';
import { blackman, butterHighpass2, detrend } from '../../../src/l3/eeg-devices/spectral.ts';
import type { EegReading } from '../../../src/types-eeg.ts';

const FS = 125;
const K = BIS_TYPE_SPEC.constants;
/** A seeded Gaussian stream (LCG + Box–Muller): the tests' own noise, not the engine's. */
function gauss(seed: number): () => number {
  let s = seed >>> 0;
  const u = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) + 0.5) / 4294967296;
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}
const readAll = (x: number[], z: number[] = [2, 2, 2]) => bisTypeRead(createBisType(FS), x, z);
const num = (r: EegReading | undefined, k: string) => (r?.numerics as Record<string, number | null>)[k];

describe('the spec row: every number has its source', () => {
  it('each constant is tagged with a paper and its page/line, the generic reader\'s sourced row, or a marked [ENG]', () => {
    for (const [k, c] of Object.entries(K)) expect(c.tag, k).toMatch(/\[(CON22|RAM98|TXT|P-\d+)[^\]]*\]|\[ENG: (device|display)[^\]]*\]/);
    expect(BIS_TYPE_SPEC.label).toBe('BIS-type index, computed from published components'); // Q8
    expect(BIS_TYPE_SPEC.updateS).toBe(K.updateS.value);
  });
  it('no number in the reader\'s code outside the spec block but 0, 1, 2, 10 (dB) and 100 (%)', () => {
    const src = readFileSync(new URL('../../../src/l3/eeg-devices/bis-type.ts', import.meta.url), 'utf8');
    const code = src
      .replace(/\/\/ <spec>[\s\S]*?\/\/ <\/spec>/, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, "''");
    const lits = [...code.matchAll(/(?<![\w.])\d+(?:\.\d+)?(?:e-?\d+)?/g)].map((m) => Number(m[0]));
    expect(lits.filter((v) => ![0, 1, 2, 10, 100].includes(v))).toEqual([]);
  });
});

describe('the functions Table 1 names without defining (spectral.ts), against their definitions', () => {
  it('butter(2, 0.65/(fs/2), "high"): |H| = 0 at 0 Hz, 1/√2 at 0.65 Hz, 1 at fs/2', () => {
    const { b, a } = butterHighpass2(K.hpHz.value, FS);
    const H = (f: number) => {
      const w = (2 * Math.PI * f) / FS;
      const re = (c: number[]) => c.reduce((s, v, i) => s + v * Math.cos(-w * i), 0);
      const im = (c: number[]) => c.reduce((s, v, i) => s + v * Math.sin(-w * i), 0);
      const den = [1, ...a];
      return Math.hypot(re(b), im(b)) / Math.hypot(re(den), im(den));
    };
    expect(H(0)).toBeCloseTo(0, 12);
    expect(H(K.hpHz.value)).toBeCloseTo(Math.SQRT1_2, 10);
    expect(H(FS / 2)).toBeCloseTo(1, 10);
  });
  it('blackman(n) is 0 at both ends and 1 in the middle (n odd); detrend removes a straight line exactly', () => {
    const w = blackman(251);
    expect(w[0]).toBeCloseTo(0, 12);
    expect(w[250]).toBeCloseTo(0, 12);
    expect(w[125]).toBeCloseTo(1, 12);
    expect(Math.max(...detrend(Array.from({ length: 125 }, (_, i) => 30 - 0.7 * i)).map(Math.abs))).toBeLessThan(1e-9);
  });
  it('piecewise and scurve are l. 63 and l. 64', () => {
    expect(piecewise(-5, [0, 100], [50, 0])).toBe(50); // clamped
    expect(piecewise(30, [0, 100], [50, 0])).toBe(35);
    expect(scurve(-13.9, 104.4, 49.4, -13.9, 5.29)).toBeCloseTo(104.4 - 49.4 / 2, 12); // at x50 the curve is half way
  });
});

describe('the components (l. 28–34) and the mixer (l. 45–53)', () => {
  const N = 95; // bins 0 … 47 Hz
  const flat = (f: (k: number) => number) => Array.from({ length: N }, (_, k) => f(k));
  it('the sedation component is the 30–47 Hz mean dB minus the upper half of the 11–20 Hz bins: 10·log10(Ph/Pm) (Eq 1)', () => {
    // P = Pm in 11–20 Hz, Ph in 30–47 Hz: every bin of a band has the same dB, so meanBandPower and prctmean give it
    const row = flat((k) => (k >= 60 ? 4 : k >= 22 && k <= 40 ? 0.25 : 1));
    const c = components([row, row])!;
    expect(c.beta).toBeCloseTo(10 * Math.log10(4 / 0.25), 10); // 12.04 dB
    expect(c.lowMid).toBeCloseTo(10 * Math.log10(1 / 0.25), 10); // 0.5–4 Hz at 1: 6.02 dB
  });
  it('the power concentration (Eq 2): 40–47 Hz at g, the rest at 1 → 10·log10(g / √((77 + g + 15g²)/93))', () => {
    // vhigh: n = 40 … 47 Hz (bins 80–94), P(n−1)·P(n) = g² (bin 79 = 39.5 Hz is in it too) → √g² = g
    // whole: n = 1 … 47 Hz (bins 2–94), 93 pairs: 77 pairs 1·1 (n ≤ bin 78), one 1·g (n = bin 79), 15 g·g
    const g = 0.01;
    const row = flat((k) => (k >= 79 ? g : 1));
    expect(components([row])!.conc).toBeCloseTo(10 * Math.log10(g / Math.sqrt((77 + g + 15 * g * g) / 93)), 10);
  });
  it('excluded (suppressed) epochs are left out of the averages (CON22 p. 6); none left → no components', () => {
    const row = flat(() => 1);
    expect(components([null, row, null])).toEqual(components([row]));
    expect(components([null, null])).toBeNull();
  });
  it('white noise reads ≈ 98: c1 ≈ 0 and c2 ≈ 0 dB → sedation 101.07, general 104.3 (not lower: weight 0) → 97 + 4.07·3/13', () => {
    // sed = 104.4 − 49.4/(1 + e^(13.9/5.29)) = 101.07; gen = 43.1 + 61.3 − 72.6/(1 + e^(24/3.55)) = 104.32;
    // gen ≥ sed → generalWeight 0 → x = 101.07; l. 53 compresses [97, 110] → [97, 100]: 97.94
    expect(mixer({ beta: 0, conc: 0, lowMid: 0 }, 0)).toBeCloseTo(97 + ((101.0699 - 97) * 3) / 13, 2);
    const n = gauss(11);
    const rs = readAll(Array.from({ length: 40 * FS }, () => 20 * n()));
    const last = rs.at(-1);
    expect(Math.abs(num(last, 'bisBeta') as number)).toBeLessThan(1); // dB: both bands of χ²₂ periodograms, same bias
    expect(Math.abs(num(last, 'bisConc') as number)).toBeLessThan(1);
    expect(num(last, 'bis') as number).toBeGreaterThan(97);
    expect(num(last, 'bis') as number).toBeLessThan(99);
  });
  it('the general score wins when lower, weighted by low − mid: 0 dB → half, ≥ 5 dB → all (l. 50, 52)', () => {
    // conc −40 dB: gen = piecewise(−40, [−60.89, −30], [−40, 43.1]) = −40 + 83.1·20.89/30.89 = 16.20 (no S-curve below −30)
    const gen = -40 + (83.1 * 20.89) / 30.89;
    const sed = scurve(0, 104.4, 49.4, -13.9, 5.29);
    const out = (x: number) => (x < 10 ? piecewise(x, [-40, 10], [0, 10]) : x);
    expect(mixer({ beta: 0, conc: -40, lowMid: 5 }, 0)).toBeCloseTo(out(gen), 8);
    expect(mixer({ beta: 0, conc: -40, lowMid: 0 }, 0)).toBeCloseTo(out((sed + gen) / 2), 8);
  });
  it('the BSR (l. 49, 51; p. 6): no weight below 10 %, the whole output from 50 % on: exactly 50 − BSR/2', () => {
    const c = { beta: 0, conc: 0, lowMid: 0 };
    expect(mixer(c, 5)).toBe(mixer(c, 0));
    expect(mixer(c, 60)).toBeCloseTo(50 - 60 / 2, 12);
    expect(mixer(null, 100)).toBe(0);
    expect(mixer(null, 30)).toBeNull(); // nothing left to mix and the BSR not yet the whole output: no index
  });
});

describe('the suppression detector and rate (l. 6–13) on a constructed burst-suppression record', () => {
  // 7-s cycles: 2 s of bursts (10 Hz, 50 µV), then 5 s of silence (a 3-µV ripple on a drifting line, 40 µV/s: the
  // detector compares each sample with the second's OWN straight line, l. 11, so a drift is still silence). A stride is
  // suppressed when its last second lies wholly in silence: ends at 3, 3.5, …, 7 s of the cycle → 9 of 14 strides;
  // 63 s = 9 whole cycles, so BSR = 100·9/14 = 64.29 % (± one stride, 0.79 %, for the 62/63-sample strides).
  const record = (cycles: number) => Array.from({ length: cycles * 7 * FS }, (_, i) => {
    const t = (i / FS) % 7;
    return t < 2 ? 50 * Math.sin(2 * Math.PI * 10 * t) : 3 * Math.sin(2 * Math.PI * 7 * t) + 40 * (t - 2);
  });
  it('BSR 64.3 %; the index is then exactly 50 − BSR/2 (p. 6)', () => {
    const last = readAll(record(12)).at(-1);
    expect(Math.abs((num(last, 'bisSr') as number) - (100 * 9) / 14)).toBeLessThanOrEqual(0.8);
    expect(num(last, 'bis') as number).toBeCloseTo(50 - (num(last, 'bisSr') as number) / 2, 0);
  });
  it('the 63-s rate\'s step response: from bursts to silence, the BSR climbs one stride in 126 every 0.5 s', () => {
    const n = gauss(5);
    const x = [...Array.from({ length: 70 * FS }, () => 20 * n()), ...Array.from({ length: 40 * FS }, () => 0.5 * n())];
    const rs = readAll(x);
    const at = (s: number) => rs.find((r) => r.n >= s * FS);
    // silence from 70 s: suppressed strides end at 71, 71.5, … → at 70 + 1 + j/2 s there are j + 1 of the 126
    for (const j of [0, 20, 63]) expect(Math.abs((num(at(71 + j / 2), 'bisSr') as number) - (100 * (j + 1)) / 126)).toBeLessThanOrEqual(0.8);
  });
  it('a silent record reads 0 once its BSR is 100 (every spectrum excluded; p. 6: 50 − 100/2)', () => {
    const n = gauss(9);
    const last = readAll(Array.from({ length: 70 * FS }, () => 0.5 * n())).at(-1);
    expect(num(last, 'bisSr')).toBe(100);
    expect(num(last, 'bis')).toBe(0);
    expect(num(last, 'bisBeta')).toBeNull();
  });
});

describe('the 30-s trimmed mean (l. 33): the smoothing\'s response to a step', () => {
  it('60 epochs, round(60·50/200) = 15 dropped at each end: k new epochs move it by (k − 15)/30 of the step, 15 ≤ k ≤ 45', () => {
    const N = 95;
    const row = (g: number) => Array.from({ length: N }, (_, k) => (k >= 79 ? g : 1));
    const conc = (g: number) => components([row(g)])!.conc;
    const [a, b] = [conc(0.01), conc(0.1)];
    for (const k of [0, 15, 20, 30, 45, 60]) {
      const rows = [...Array.from({ length: 60 - k }, () => row(0.01)), ...Array.from({ length: k }, () => row(0.1))];
      expect(components(rows)!.conc, `k = ${k}`).toBeCloseTo(a + ((b - a) * Math.min(30, Math.max(0, k - 15))) / 30, 10);
    }
  });
});

describe('the sawtooth (K-complex) detector (l. 39–44)', () => {
  // m/v is the squared correlation of the stretch with the zero-mean, unit-sd template: 1 for the template itself
  const L = Math.round(FS * K.sawLenS.value); // 63
  const saw = Array.from({ length: L }, (_, i) => Math.max(0, i - (L - 5) + 1));
  it('finds the template (either direction) in quiet EEG; not in noise; not below 10 µV² of variance', () => {
    const n = gauss(3);
    const bg = () => Array.from({ length: 2 * FS }, () => 0.3 * n());
    const put = (x: number[], at: number, s: number[], g: number) => x.map((v, i) => (i >= at && i < at + s.length ? v + g * (s[i - at] as number) : v));
    expect(sawtoothDetector(put(bg(), 100, saw, 20), L)).toBe(true);
    expect(sawtoothDetector(put(bg(), 100, [...saw].reverse(), 20), L)).toBe(true);
    expect(sawtoothDetector(Array.from({ length: 2 * FS }, () => 20 * n()), L)).toBe(false);
    expect(sawtoothDetector(put(bg(), 100, saw, 1), L)).toBe(false); // variance ≈ 1.6·1² µV² < 10
  });
});

describe('the bispectral term (RAM98 Eqs 6–8, Fig. 12): phase coupling at (3, 10) Hz', () => {
  // Three waves at 3, 10 and 13 Hz, random phases every epoch. Coupled (Fig. 12B): φ13 = φ3 + φ10, so the triple
  // product's phase is the same in every epoch and |mean| = mean |·| with constant amplitudes: BIC = 1. Uncoupled
  // (Fig. 12A): φ13 independent, the triple product's phase is uniform: |mean of 30 unit phasors| ≈ √(π/120) ≈ 0.16.
  const epochs = (coupled: boolean) => {
    const n = gauss(17);
    return Array.from({ length: 30 }, () => {
      const [p3, p10, pr] = [n(), n(), n()].map((v) => v * 2 * Math.PI);
      const p13 = coupled ? (p3 as number) + (p10 as number) : (pr as number);
      return epochSpectrum(Array.from({ length: 2 * FS }, (_, i) => {
        const t = i / FS;
        return 10 * Math.cos(2 * Math.PI * 3 * t + (p3 as number)) + 10 * Math.cos(2 * Math.PI * 10 * t + (p10 as number)) + 10 * Math.cos(2 * Math.PI * 13 * t + p13);
      }));
    });
  };
  it('coupled: BIC(3, 10) ≈ 1; uncoupled: < 0.4; the bispectrum B larger when coupled', () => {
    const c = bispectrumAt(epochs(true), 6, 20); // 0.5-Hz bins: 3 Hz = 6, 10 Hz = 20
    const u = bispectrumAt(epochs(false), 6, 20);
    expect(c.bic).toBeGreaterThan(0.99);
    expect(u.bic).toBeLessThan(0.4);
    expect(c.b).toBeGreaterThan(2 * u.b);
  });
});

describe('the reader\'s state', () => {
  it('readings every 0.5 s (strides of 63 and 62 samples at 125 Hz); a JSON snapshot continues them identically', () => {
    const n = gauss(23);
    const x = Array.from({ length: 50 * FS }, () => 15 * n());
    const whole = readAll(x);
    expect(whole.map((r) => r.n).slice(0, 4)).toEqual([250, 313, 375, 438]); // ⌈k·62.5⌉ from the first full epoch
    const s = createBisType(FS);
    const a = bisTypeRead(s, x.slice(0, 2001), [2, 2, 2]);
    const s2 = JSON.parse(JSON.stringify(s));
    const b = bisTypeRead(s2, x.slice(2001), [2, 2, 2]);
    expect([...a, ...b]).toEqual(whole);
  });
});
