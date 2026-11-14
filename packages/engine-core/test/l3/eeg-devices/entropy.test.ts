// EEG E8, the Entropy reader on CONSTRUCTED inputs only (no engine, no generator). Every expected value is derived in
// its comment from [VO04] Viertiö-Oja 2004 (its Eqs 1–8 and pp. 155–159). The engine's signal is in
// test/engine/eeg-entropy-course.test.ts.
// At 125 Hz the 1.92-s epoch is N = 240 samples; its components are k·fs/N = k/1.92 Hz (0.52 Hz apart): R_low 0.8–32 Hz is
// k = 2 … 61 (60 components, 1.04–31.77 Hz), R_high 32–47 Hz is k = 62 … 90 (29, 32.29–46.88 Hz), N[R_low+high] = 89;
// SE's longest window holds k = 2, 3 (below 2 Hz: k < 3.84).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { componentBins, createEntropy, ENTROPY_SPEC, entropyRead, presented, rowsIn, shannon, stateResponse, windowSpectra } from '../../../src/l3/eeg-devices/entropy.ts';
import type { EegReading } from '../../../src/types-eeg.ts';

const FS = 125;
const N = 240;
const K = ENTROPY_SPEC.constants;
/** A seeded Gaussian stream (LCG + Box–Muller): the tests' own noise, not the engine's. */
function gauss(seed: number): () => number {
  let s = seed >>> 0;
  const u = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) + 0.5) / 4294967296;
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}
const readAll = (x: number[], z: number[] = [2, 2, 2]) => entropyRead(createEntropy(FS), x, z);
const num = (r: EegReading | undefined, k: string) => (r?.numerics as Record<string, number | null>)[k];
/** A sum of cosines exactly on the components ks (amplitude a, fixed seeded phases): periodic in N samples, so every
 * epoch's |X_k| is the same: N·a/2 at each k in ks, 0 elsewhere (the DFT of a whole number of cycles, Eq 1). */
function comb(ks: number[], seconds: number, a = 5, seed = 41): number[] {
  const n = gauss(seed);
  const ph = ks.map(() => n() * Math.PI);
  return Array.from({ length: Math.round(seconds * FS) }, (_, i) => ks.reduce((s, k, j) => s + a * Math.cos((2 * Math.PI * k * i) / N + (ph[j] as number)), 0));
}
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

describe('the spec row: every number has its source', () => {
  it('each constant is tagged with the paper and its page/figure, the generic reader\'s sourced row, or an engineering tag of kind device or display', () => {
    const eng = 'EN' + 'G'; // spelled apart: the marker linter (scripts/ci/markers.mjs) reads a literal tag here as one
    const tagged = new RegExp(`\\[(VO04|TXT|P-\\d+)[^\\]]*\\]|\\[${eng}: (device|display)[^\\]]*\\]`);
    for (const [k, c] of Object.entries(K)) expect(c.tag, k).toMatch(tagged);
    expect(ENTROPY_SPEC.label).toBe('Entropy-type SE and RE, computed from published components'); // Q8
    expect(ENTROPY_SPEC.updateS).toBe(K.updateS.value);
  });
  it('no number in the reader\'s code outside the spec block but 0, 1, 2, 10 (dB, one decimal) and the cubic Hermite basis\'s 3 and Fritsch–Carlson\'s 9 (3²)', () => {
    const src = readFileSync(new URL('../../../src/l3/eeg-devices/entropy.ts', import.meta.url), 'utf8');
    const code = src
      .replace(/\/\/ <spec>[\s\S]*?\/\/ <\/spec>/, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, "''");
    const lits = [...code.matchAll(/(?<![\w.])\d+(?:\.\d+)?(?:e-?\d+)?/g)].map((m) => Number(m[0]));
    expect(lits.filter((v) => ![0, 1, 2, 3, 9, 10].includes(v))).toEqual([]);
  });
});

describe('Eqs 3–5 on the paper\'s own examples (Figs. 1 and 3, pp. 156–157)', () => {
  it('a perfect sine has one nonzero component: entropy 0 (Fig. 1); white noise\'s 7 equal components: 7·(1/7)·log 7 / log 7 = 1 (Fig. 3)', () => {
    expect(shannon([0, 0, 3, 0, 0, 0, 0])).toBe(0);
    expect(shannon(Array(7).fill(2)) / Math.log(7)).toBeCloseTo(1, 12);
    expect(shannon([0, 0, 0])).toBe(0); // no power: perfectly regular (p. 158)
  });
  it('Eq 7 and Eq 8: SE = S[R_low] / log N[R_low+high], RE = S[R_low+high] / log N[R_low+high]; RE = SE when R_high is empty', () => {
    const low = Array(60).fill(1);
    const flat = stateResponse(low, [...low, ...Array(29).fill(1)]);
    expect(flat.re).toBeCloseTo(1, 12); // log 89 / log 89
    expect(flat.se).toBeCloseTo(Math.log(60) / Math.log(89), 12); // SE's top: 0.9121 (p. 158: "< 1")
    const noHigh = stateResponse(low, [...low, ...Array(29).fill(0)]);
    expect(noHigh.re).toBeCloseTo(noHigh.se, 12);
  });
});

describe('the components and the windows (pp. 155, 158)', () => {
  it('on the 1.92-s grid at 125 Hz: R_low k = 2 … 61, the long window k < 4, R_high k = 62 … 90', () => {
    expect(componentBins(FS, N)).toEqual({ lo: 2, long: 4, mid: 62, hi: 90 });
    expect(Math.round(FS * K.epochS.value)).toBe(N);
    expect(Math.round(FS * K.updateS.value)).toBe(80); // 0.64 s = 80 samples here (256 at 400 Hz, p. 160)
  });
  it('the windows hold (W − 1.92)/0.64 + 1 periodograms: 60.16 s → 92, 15.36 s → 22, 1.92 s → 1', () => {
    expect([rowsIn(K.seLongS.value), rowsIn(K.midS.value), rowsIn(K.shortS.value)]).toEqual([92, 22, 1]);
  });
  it('each component is the mean over its window: with periodogram j holding the value j (j = 1 … 92), SE reads 46.5 below 2 Hz and 81.5 above; RE 81.5 in R_low and 92 in R_high', () => {
    // mean of 1 … 92 = 46.5; of the last 22 (71 … 92) = 81.5; the last alone = 92
    const b = componentBins(FS, N);
    const rows = Array.from({ length: 92 }, (_, j) => Array(b.hi - b.lo + 1).fill(j + 1));
    const { se, re } = windowSpectra(rows, b);
    expect(se.length).toBe(60);
    expect(re.length).toBe(89);
    expect(se.slice(0, 2)).toEqual([46.5, 46.5]);
    expect(new Set(se.slice(2))).toEqual(new Set([81.5]));
    expect(new Set(re.slice(0, 60))).toEqual(new Set([81.5]));
    expect(new Set(re.slice(60))).toEqual(new Set([92]));
    // while the windows fill: 5 held → each longer window is their mean, 3; R_high's one-periodogram window the newest, 5
    const early = windowSpectra(rows.slice(0, 5), b);
    expect(new Set([...early.se, ...early.re.slice(0, 60)])).toEqual(new Set([3]));
    expect(new Set(early.re.slice(60))).toEqual(new Set([5]));
  });
});

describe('the presented scale F (p. 159, Fig. 7)', () => {
  it('its end points: F(0) = 0, F(1) = 100 (the integer scale [0 … 100]); clamped outside', () => {
    expect(presented(0)).toBe(0);
    expect(presented(1)).toBeCloseTo(100, 10);
    expect(presented(-0.2)).toBe(0);
    expect(presented(1.3)).toBeCloseTo(100, 10);
  });
  it('monotone (p. 159: "a particular monotonous spline function")', () => {
    let prev = -1;
    for (let i = 0; i <= 1000; i++) {
      const v = presented(i / 1000);
      expect(v, `at ${i / 1000}`).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
  it('through Fig. 7\'s two marks, where its slope is 1 (100 per unit): (0.471, 27.5) and (0.889, 92.1), read off the same render; slope > 1 between them, < 1 outside', () => {
    // The marks are the figure's solid lines: "the dashed lines separate the middle range with slope > 1 from the high
    // and low ranges with slope < 1" (caption). Read at 600 dpi to ± 0.003 in x and ± 0.3 in y; the interpolant between
    // knots 0.1 apart is allowed 1 unit and a slope within 25 % of 1 at the marks.
    const slope = (x: number) => (presented(x + 1e-4) - presented(x - 1e-4)) / 2e-4 / 100;
    expect(Math.abs(presented(0.471) - 27.5)).toBeLessThan(1);
    expect(Math.abs(presented(0.889) - 92.1)).toBeLessThan(1);
    for (const x of [0.471, 0.889]) expect(Math.abs(slope(x) - 1), `slope at ${x}`).toBeLessThan(0.25);
    for (const x of [0.55, 0.65, 0.75, 0.85]) expect(slope(x), `slope at ${x}`).toBeGreaterThan(1);
    for (const x of [0.1, 0.2, 0.3, 0.4, 0.95]) expect(slope(x), `slope at ${x}`).toBeLessThan(1);
  });
});

describe('the reader on constructed signals', () => {
  it('readings every 0.64 s (80 samples) from the first full epoch (240 samples); integers; RE − SE published', () => {
    const rs = readAll(comb([20], 5));
    expect(rs.map((r) => r.n).slice(0, 3)).toEqual([240, 320, 400]);
    for (const r of rs) {
      expect(Number.isInteger(num(r, 'se'))).toBe(true);
      expect(num(r, 'reSe')).toBe((num(r, 're') as number) - (num(r, 'se') as number));
    }
  });
  it('a pure sinusoid on a component (k = 20, 10.42 Hz): one nonzero component → SE = RE = 0 (Fig. 1)', () => {
    const last = readAll(comb([20], 10)).at(-1);
    expect([num(last, 'se'), num(last, 're')]).toEqual([0, 0]);
  });
  it('a flat signal (no power at all) reads 0: perfectly regular (p. 158)', () => {
    const last = readAll(Array(10 * FS).fill(0)).at(-1);
    expect([num(last, 'se'), num(last, 're'), num(last, 'reSe')]).toEqual([0, 0, 0]);
  });
  it('equal power in every component (Fig. 3\'s white noise, made exact): RE = F(1) = 100, SE = F(log 60 / log 89)', () => {
    const last = readAll(comb(range(2, 90), 8)).at(-1);
    expect(num(last, 're')).toBe(100);
    expect(num(last, 'se')).toBe(Math.round(presented(Math.log(60) / Math.log(89))));
  });
  it('no power in R_high: RE = SE (p. 158); the same R_low with equal power added in R_high: RE above SE', () => {
    const quiet = readAll(comb(range(2, 61), 70)).at(-1);
    expect(num(quiet, 're')).toBe(num(quiet, 'se'));
    expect(num(quiet, 'reSe')).toBe(0);
    const emg = readAll(comb(range(2, 90), 70)).at(-1);
    expect(num(emg, 'se')).toBe(num(quiet, 'se'));
    expect(num(emg, 'reSe') as number).toBeGreaterThan(0);
  });
  it('Gaussian white noise reads near the top: RE ≥ F(0.93), SE between F(0.86) and F(log 60 / log 89)', () => {
    // A periodogram component of white noise is ≈ exponentially distributed about its mean; the entropy of N such
    // shares falls short of log N by ≈ 1 − γ = 0.42 per component (γ, Euler's constant) for one periodogram (R_high's
    // 1.92 s) and by ≈ v/2 for a mean of periodograms with relative variance v (R_low's 22 overlapping ones: ≈ 7
    // independent, v ≈ 0.14, ≈ 0.07). RE ≈ 1 − (29·0.42 + 60·0.07)/89/log 89 = 0.96; SE ≈ (log 60 − 0.07)/log 89 = 0.90.
    const n = gauss(11);
    const last = readAll(Array.from({ length: 70 * FS }, () => 10 * n())).at(-1);
    expect(num(last, 're') as number).toBeGreaterThanOrEqual(Math.round(presented(0.93)));
    expect(num(last, 'se') as number).toBeGreaterThanOrEqual(Math.round(presented(0.86)));
    expect(num(last, 'se') as number).toBeLessThanOrEqual(Math.round(presented(Math.log(60) / Math.log(89))));
  });
  it('R_high reacts within one epoch (RE\'s 1.92-s window, p. 158: "RE rises first"): a burst of 32–47 Hz power appears in RE at once, not in SE', () => {
    // 69.12 s (36 epochs, 108 readings) of R_low only, then R_high added (the R_low waves continue: same phases, a whole
    // number of their periods): the third reading after the step reads an epoch wholly after it
    const step = 36 * N;
    const x = [...comb(range(2, 61), step / FS), ...comb(range(2, 90), N / FS)];
    const rs = readAll(x);
    const before = rs.find((r) => r.n === step) as EegReading;
    const after = rs.find((r) => r.n === step + N) as EegReading;
    expect(num(before, 'reSe')).toBe(0);
    expect(num(after, 're') as number).toBeGreaterThan(num(before, 're') as number);
    expect(Math.abs((num(after, 'se') as number) - (num(before, 'se') as number))).toBeLessThanOrEqual(1);
  });
  it('electrodes over the limit flag the readings questionable (the generic reader\'s impedance rule)', () => {
    const last = readAll(comb([20], 3), [12, 2, 2]).at(-1);
    expect(last?.flags).toEqual({ questionable: true, invalid: false });
    expect(num(last, 'eegImp')).toBe(12);
  });
  // Not tuned: on the 1.92-s grid SE's top is log 60 / log 89 = 0.912, which F shows as 93 or 94, where the module shows
  // 91 (p. 159): its component counts are not published (the file head).
  it.fails('SE\'s top on screen is 91 (p. 159) — measured F(log 60 / log 89) = F(0.912): the module\'s component counts are not published', () => {
    expect(Math.round(presented(Math.log(60) / Math.log(89)))).toBe(K.seTopShown.value);
  });
});

describe('the reader\'s state', () => {
  it('a JSON snapshot continues the readings identically', () => {
    const n = gauss(23);
    const x = Array.from({ length: 70 * FS }, () => 15 * n());
    const whole = readAll(x);
    const s = createEntropy(FS);
    const a = entropyRead(s, x.slice(0, 4001), [2, 2, 2]);
    const s2 = JSON.parse(JSON.stringify(s));
    const b = entropyRead(s2, x.slice(4001), [2, 2, 2]);
    expect([...a, ...b]).toEqual(whole);
  });
});
