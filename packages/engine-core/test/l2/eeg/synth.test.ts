// EEG E3 (plan §7 E3): the signal generator — the spectral description (spectra.ts) turned into microvolt samples.
// Self-check: a Welch spectrum of 60 s of output reproduces spectrumOf's peaks within ±1 Hz and its slope within 10 %
// [ENG: test; tolerance]; the amplitudes Miller gives (awake 5–10 µV, alpha–delta ≈ 40 µV, suppression < 5 µV); the
// burst-suppression process (P-8); burstiness and the forme fruste; continuity across block edges; determinism (D3).
// Acceptance cells C1–C4 and C12 at the signal level, by spectral analysis of generated samples (helpers/eeg-welch.ts).
import { describe, expect, it } from 'vitest';
import { agentMixOf, cortexStep } from '../../../src/l2/eeg/state.ts';
import { psdDb, spectrumOf } from '../../../src/l2/eeg/spectra.ts';
import { BS_BURST_S, BS_MIN_SUPP_S, createSynth, synthNext } from '../../../src/l2/eeg/synth.ts';
import { seedStream } from '../../../src/rng/sfc32.ts';
import type { CortexInputs, EegSpectrum } from '../../../src/types-eeg.ts';
import { absQuantile, argmaxIn, band, db, medianF, rms, slopeFit, suppressedRuns, welch } from '../../helpers/eeg-welch.ts';

const FS = 125;
const H0 = { gabaIv: 0, barbiturate: 0, etomidate: 0, benzo: 0, dissociative: 0 };
const M0 = { sevoflurane: 0, isoflurane: 0, desflurane: 0, n2o: 0 };
type Patch = Partial<Omit<CortexInputs, 'hyp' | 'mac'>> & { hyp?: Partial<CortexInputs['hyp']>; mac?: Partial<CortexInputs['mac']> };
const inp = (p: Patch = {}): CortexInputs => ({
  ageY: 40, alpha2Eq: 0, opioidFentEq: 0, stimulus: 0, antinoc: 0, do2Rel: 1, tempC: 37,
  ...p, hyp: { ...H0, ...(p.hyp ?? {}) }, mac: { ...M0, ...(p.mac ?? {}) },
});
const sp = (p: Patch = {}): EegSpectrum => { const x = inp(p); return spectrumOf(cortexStep(undefined, x, 1), agentMixOf(x)); };
const prop = (ugMl: number, extra: Patch = {}) => sp({ ...extra, hyp: { gabaIv: 1000 * ugMl } });

/** `seconds` of generator output for a constant spectrum (or one per sample index). */
function gen(spec: EegSpectrum | ((n: number) => EegSpectrum), seconds: number, seed = 11): number[] {
  const at = typeof spec === 'function' ? spec : () => spec;
  const s = createSynth(seedStream(seed, 'eeg'), FS, at(0));
  const out: number[] = [];
  for (let n = 0; n < seconds * FS; n++) out.push(synthNext(s, () => at(n)));
  return out;
}
/** The model's PSD (µV²/Hz) at the Welch frequencies. */
const model = (s: EegSpectrum, f: number[]) => f.map((v) => 10 ** (psdDb(s, v) / 10));

const AWAKE = sp();
const GA = prop(3.5);

describe('EEG E3 generator: self-check against the spectral description', () => {
  it('a background-only spectrum: the Welch slope is the aperiodic slope within 10 % (0.6, 0.9, 1.3)', () => {
    for (const k of [0.6, 0.9, 1.3]) {
      const s: EegSpectrum = { ...AWAKE, aperiodic: { offsetDb: AWAKE.aperiodic.offsetDb, slope: k }, peaks: AWAKE.peaks.map((p) => ({ ...p, powerDb: -200 })) };
      const w = welch(gen(s, 60), FS);
      expect(Math.abs(slopeFit(w.f, w.psd, 1, 60) - k) / k, `κ ${k}`).toBeLessThanOrEqual(0.1);
    }
  });

  it('real states: peaks within ±1 Hz and the fitted slope within 10 % of the model; the level within 1.5 dB', () => {
    const states: [string, EegSpectrum, [number, number] | null][] = [
      ['awake', AWAKE, null],
      ['propofol sedation 1.0', prop(1.0), [15, 25]],
      ['propofol GA 3.5', GA, [7, 14]],
      ['sevoflurane 0.85 MAC', sp({ mac: { sevoflurane: 0.85 } }), [7, 14]],
      // past the alpha-to-delta shift, short of the forme fruste (whose drop-outs this stationary check would count
      // as missing power: it is tested below)
      ['sevoflurane 1.15 MAC', sp({ mac: { sevoflurane: 1.15 } }), [6, 12]],
      ['dexmedetomidine', sp({ alpha2Eq: 1.2 }), [10, 16]],
    ];
    for (const [name, s, peakWin] of states) {
      const w = welch(gen(s, 60), FS);
      const m = model(s, w.f);
      const kw = slopeFit(w.f, w.psd, 1, 60);
      const km = slopeFit(w.f, m, 1, 60);
      expect(Math.abs(kw - km) / Math.abs(km), `${name}: slope ${kw} vs ${km}`).toBeLessThanOrEqual(0.1);
      expect(Math.abs(db(band(w, 0.5, 50), m.reduce((a, v, i) => a + ((w.f[i] as number) >= 0.5 && (w.f[i] as number) < 50 ? v : 0), 0) * ((w.f[1] as number) - (w.f[0] as number)))), `${name}: level`).toBeLessThan(1.5);
      if (peakWin) {
        const fw = argmaxIn(w.f, w.psd, ...peakWin);
        const fm = argmaxIn(w.f, m, ...peakWin);
        expect(Math.abs(fw - fm), `${name}: peak ${fw} vs ${fm}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('continuous across block edges: no step at the hop boundaries, even when the spectrum changes there', () => {
    const s = createSynth(seedStream(3, 'eeg'), FS, AWAKE);
    const x: number[] = [];
    for (let n = 0; n < 60 * FS; n++) x.push(synthNext(s, () => (Math.floor(n / FS) % 2 === 0 ? AWAKE : GA)));
    const d = x.slice(1).map((v, i) => Math.abs(v - (x[i] as number)));
    const edges = d.filter((_, i) => (i + 1) % s.H === 0);
    const sd = rms(d);
    expect(Math.max(...edges)).toBeLessThan(4 * sd);
    expect(rms(edges)).toBeLessThan(1.5 * sd);
  });

  it('deterministic (D3): the same seed gives the same samples; another seed different ones', () => {
    const a = gen(GA, 20, 5);
    const b = gen(GA, 20, 5);
    const c = gen(GA, 20, 6);
    expect(b).toEqual(a);
    expect(c).not.toEqual(a);
  });
});

describe('EEG E3 generator: acceptance cells at the signal level', () => {
  it('C1 awake: RMS ≈ 5–10 µV, a beta base above the background, no frontal alpha (Ch36 p. 1138)', () => {
    const x = gen(AWAKE, 60);
    expect(rms(x)).toBeGreaterThanOrEqual(5);
    expect(rms(x)).toBeLessThanOrEqual(10);
    const w = welch(x, FS);
    const bg = { ...AWAKE, peaks: [] }; // the aperiodic background alone
    const df = (w.f[1] as number) - (w.f[0] as number);
    const bgBeta = model(bg, w.f).reduce((a, v, i) => a + ((w.f[i] as number) >= 15 && (w.f[i] as number) < 25 ? v * df : 0), 0);
    expect(db(band(w, 15, 25), bgBeta)).toBeGreaterThan(1); // a beta base above the 1/f background
    expect(db(band(w, 8, 12), band(welch(gen(prop(2.6), 60), FS), 8, 12))).toBeLessThan(-3);
  });

  it('C2 propofol to sedation: 15–25 Hz power rises before loss of response (Ch36 p. 1138)', () => {
    expect(db(band(welch(gen(prop(1.0), 60), FS), 15, 25), band(welch(gen(AWAKE, 60), FS), 15, 25))).toBeGreaterThan(3);
  });

  it('C3 through loss of responsiveness: frontal alpha 8–12 Hz appears (Ch36 p. 1138)', () => {
    expect(db(band(welch(gen(prop(2.6), 60), FS), 8, 12), band(welch(gen(prop(1.2), 60), FS), 8, 12))).toBeGreaterThan(3);
  });

  it('C4 propofol at surgical depth: alpha–delta, beta and gamma down, peaks ≈ 40 µV (Ch36 pp. 1139, 1145)', () => {
    const x = gen(GA, 60);
    const w = welch(x, FS);
    const aw = welch(gen(AWAKE, 60), FS);
    expect(db(band(w, 0.5, 4), band(aw, 0.5, 4))).toBeGreaterThan(10);
    expect(db(band(w, 8, 12), band(aw, 8, 12))).toBeGreaterThan(3);
    expect(band(w, 20, 30)).toBeLessThan(band(aw, 20, 30));
    expect(band(w, 30, 45)).toBeLessThan(band(aw, 30, 45));
    // "peak amplitudes ≈ 40 µV" read as the ≈ 3σ excursion (spectra.test.ts C4 [INF]): over 0.5–50 Hz as there, and
    // in the raw trace, which also carries the spectrum's slow power below 0.5 Hz (the slow band starts at 0.1 Hz,
    // Ch36 Table 36.1): measured 52–56 µV over four seeds, so the raw window is 30–60
    expect(3 * Math.sqrt(band(w, 0.5, 50))).toBeGreaterThan(30);
    expect(3 * Math.sqrt(band(w, 0.5, 50))).toBeLessThan(55);
    expect(absQuantile(x, 0.997)).toBeGreaterThan(30);
    expect(absQuantile(x, 0.997)).toBeLessThan(60);
  });

  it('C12 a fentanyl bolus on a hypnotic: little change, median frequency down or unchanged (Ch36 p. 1145)', () => {
    // the same seed for both: common random numbers, so the difference is the spectra's, not the noise's
    const a = welch(gen(GA, 60, 9), FS);
    const b = welch(gen(prop(3.5, { opioidFentEq: 3 }), 60, 9), FS);
    const d = medianF(b, 0.5, 30) - medianF(a, 0.5, 30);
    expect(d).toBeLessThanOrEqual(0.5);
    expect(d).toBeGreaterThan(-1);
    expect(Math.abs(db(band(b, 0.5, 30), band(a, 0.5, 30)))).toBeLessThan(1);
  });
});

describe('EEG E3 generator: burst suppression, burstiness and the forme fruste', () => {
  it('suppressed stretches < 5 µV; the time suppressed (|x| < 5 µV for > 0.5 s) matches suppression.p; p 0 none, p 1 isoelectric', () => {
    for (const m of [1.5, 2.0]) {
      const s = sp({ mac: { sevoflurane: m } });
      const x = gen(s, 600);
      const runs = suppressedRuns(x, FS);
      const frac = runs.reduce((a, [p, q]) => a + q - p, 0) / x.length;
      expect(Math.abs(frac - s.suppression.p), `${m} MAC: ${frac} vs ${s.suppression.p}`).toBeLessThan(0.1);
    }
    expect(suppressedRuns(gen(GA, 120), FS).length).toBe(0);
    const iso = gen(sp({ mac: { sevoflurane: 2.6 } }), 60);
    expect(absQuantile(iso.slice(2 * FS), 0.99)).toBeLessThan(5);
  });

  it('bursts last ≈ BS_BURST_S (Jones 2023: 3.58 s) at established suppression; no suppression shorter than BS_MIN_SUPP_S', () => {
    expect(BS_BURST_S).toBe(3.58);
    expect(BS_MIN_SUPP_S).toBe(0.5);
    const runsOf = (p: number) => {
      const spec = sp({ mac: { sevoflurane: 1.5 } });
      const g = createSynth(seedStream(21, 'eeg'), FS, spec);
      const s = { ...spec, suppression: { ...spec.suppression, p } };
      const on: boolean[] = [];
      for (let n = 0; n < 1200 * FS; n++) { synthNext(g, () => s); on.push(g.bs.on); }
      const runs: { on: boolean; s: number }[] = [];
      let start = 0;
      for (let n = 1; n <= on.length; n++) if (n === on.length || on[n] !== on[n - 1]) { runs.push({ on: on[n - 1] as boolean, s: (n - start) / FS }); start = n; }
      return runs.slice(1, -1); // whole runs only
    };
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    const r = runsOf(0.5);
    expect(mean(r.filter((x) => x.on).map((x) => x.s))).toBeGreaterThan(0.85 * BS_BURST_S);
    expect(mean(r.filter((x) => x.on).map((x) => x.s))).toBeLessThan(1.15 * BS_BURST_S);
    // light suppression: suppressions at their minimum, the bursts shorten so the suppressed fraction is still p
    const light = runsOf(0.05);
    expect(Math.min(...light.filter((x) => !x.on).map((x) => x.s))).toBeGreaterThanOrEqual(BS_MIN_SUPP_S);
    const f = light.reduce((a, x) => a + (x.on ? 0 : x.s), 0) / light.reduce((a, x) => a + x.s, 0);
    expect(Math.abs(f - 0.05)).toBeLessThan(0.02);
  });

  it('dexmedetomidine spindles come in bursts, propofol alpha is almost continuous (Ch36 p. 1144)', () => {
    // the envelope: time in a burst ≈ the duty the burstiness gives (spindle 0.8 → 0.36; alpha 0.1 → 0.92)
    const duty = (s: EegSpectrum, name: string) => {
      const g = createSynth(seedStream(4, 'eeg'), FS, s);
      const j = s.peaks.findIndex((p) => p.name === name);
      let on = 0;
      for (let n = 0; n < 600 * FS; n++) { synthNext(g, () => s); on += (g.osc[j] as { level: number }).level; }
      return on / (600 * FS);
    };
    const dex = sp({ alpha2Eq: 1.2 });
    expect(duty(dex, 'spindle')).toBeGreaterThan(0.28);
    expect(duty(dex, 'spindle')).toBeLessThan(0.44);
    expect(duty(GA, 'alpha')).toBeGreaterThan(0.86);
    // in the signal: the oscillation alone (background and the other peaks removed) — 1 s windows with almost no power
    const silent = (s: EegSpectrum, name: string, lo: number, hi: number) => {
      const only = { ...s, aperiodic: { ...s.aperiodic, offsetDb: -200 }, peaks: s.peaks.map((p) => (p.name === name ? p : { ...p, powerDb: -200 })) };
      const x = gen(only, 300, 4);
      const p: number[] = [];
      for (let i = 0; i + FS <= x.length; i += 62) p.push(band(welch(x.slice(i, i + FS), FS, FS), lo, hi));
      const med = [...p].sort((a, b) => a - b)[Math.floor(p.length / 2)] as number;
      return p.filter((v) => v < 0.1 * med).length / p.length;
    };
    expect(silent(dex, 'spindle', 11, 15)).toBeGreaterThan(0.15);
    expect(silent(GA, 'alpha', 9, 13)).toBeLessThan(0.05);
  });

  it('the forme fruste: brief drops of power above 2 Hz while 0.5–2 Hz is sustained (Ch36 pp. 1140–1141)', () => {
    const drops = (s: EegSpectrum) => {
      const x = gen(s, 300, 8);
      const hi: number[] = []; // 0.5 s windows: a drop is brief
      for (let i = 0; i + 62 <= x.length; i += 31) hi.push(band(welch(x.slice(i, i + 62), FS, 62), 3, 40));
      const lo: number[] = []; // 2 s windows: three bins in 0.5–2 Hz
      for (let i = 0; i + 250 <= x.length; i += 125) lo.push(band(welch(x.slice(i, i + 250), FS, 250), 0.5, 2));
      const med = (a: number[]) => [...a].sort((p, q) => p - q)[Math.floor(a.length / 2)] as number;
      return { hi: hi.filter((v) => v < 0.1 * med(hi)).length / hi.length, lo: lo.filter((v) => v < 0.1 * med(lo)).length / lo.length };
    };
    const pre = sp({ mac: { sevoflurane: 1.35 } });
    expect(pre.formeFruste).toBeGreaterThan(0);
    expect(pre.suppression.p).toBe(0);
    const d = drops(pre);
    expect(d.hi).toBeGreaterThan(0.05);
    expect(d.lo).toBeLessThan(0.02);
    expect(drops(sp({ mac: { sevoflurane: 0.8 } })).hi).toBeLessThan(0.01);
  });
});
