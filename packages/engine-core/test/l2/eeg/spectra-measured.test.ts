// EEG generator against PUBLISHED MEASURED frontal spectra under propofol (brief 172): the generator's spectrum
// (spectrumOf) at each depth beside what three papers measured. Every expected value is read off the paper's figure
// (digitised: scratch/172-tools, the figure's own axis ticks as calibration, ≈ 0.3 dB) or quoted from its text, with the
// figure and page beside it. Nothing here was chosen from what any device's index reads.
//   [AKE14] Akeju 2014, Anesthesiology 121:990–8, Fig. 3C p. 995: the median frontal (Fp1, Sedline, reference ≈ 1 cm
//           above Fpz) spectrum of propofol general anaesthesia, n = 30, with 95 % jackknife confidence bands; multitaper,
//           spectral resolution 3 Hz (p. 992).
//   [PUR15] Purdon 2015, Br J Anaesth 115 (S1):i46–57, Fig. 3A p. i52: the median spectra of propofol general
//           anaesthesia, young (18–38 y, n = 18, mean 27.7 y) and elderly (70–90 y, n = 8, mean 80 y), an approximate
//           Laplacian of Fp1, Fp2, F7, F8 (Sedline); bootstrap confidence bands; multitaper 2W = 3 Hz (p. i49).
//   [PUR13] Purdon 2013, PNAS 110:E1142–51, Fig. 2C p. E1145: the group median power in 0.1–1, 8–12 and 25–35 Hz
//           relative to the awake eyes-closed baseline, aligned at loss of consciousness (LOC); frontal channel ≈ Fz,
//           nearest-neighbour Laplacian; propofol effect-site targets 0–5 µg/mL in 14-min steps (p. E1149).
// HOW THE UNITS ARE MATCHED. The papers' absolute level depends on their montage (short Sedline bipolar or Laplacian)
// and the engine's on Miller's awake amplitude (spectra.ts), so absolute dB are NOT compared. The comparisons are
// within one spectrum: the level at f relative to the same spectrum's alpha peak, and a band's share of the
// 0.5–39.5 Hz power (both cancel any frequency-independent gain); and the power-law exponent between two frequencies.
// The engine's PSD is first smoothed to the papers' 3 Hz spectral resolution (a ±1.5 Hz boxcar, the multitaper's
// bandwidth) so its narrow peaks are seen as the papers' estimator sees them. Above 39.5 Hz no paper measures.
// THE STATE MATCHED. The papers recorded surgical maintenance on propofol, depth unstated; read as the engine's
// propofol 3.5 µg/mL at 40 y (the BIS-type course's surgical target) [INF]. Opioid none (the papers' patients had
// fentanyl at induction, [PUR15] Table 1; the engine's fentanyl lowers beta only, OPIOID_BETA_DROP_DB).
// TOLERANCE. The engine's standard adult is set against the two independent cohorts' medians: the envelope of
// [AKE14] and [PUR15]-young, widened by 1 dB (the drawn 95 % bands ≤ 0.5 dB wide plus the digitisation, rounded up).
// For an exponent between f1 and f2 the same 1 dB is 1/(10·log10(f2/f1)).
import { describe, expect, it } from 'vitest';
import { agentMixOf, cortexStep } from '../../../src/l2/eeg/state.ts';
import { psdDb, spectrumOf } from '../../../src/l2/eeg/spectra.ts';
import { ce50Propofol, locPropofol } from '../../../src/l2/neuro/depth.ts';
import type { CortexInputs, EegSpectrum } from '../../../src/types-eeg.ts';

const H0 = { gabaIv: 0, barbiturate: 0, etomidate: 0, benzo: 0, dissociative: 0 };
const M0 = { sevoflurane: 0, isoflurane: 0, desflurane: 0, n2o: 0 };
const inp = (ageY: number, ugMl: number): CortexInputs => ({
  ageY, alpha2Eq: 0, opioidFentEq: 0, stimulus: 0, antinoc: 0, do2Rel: 1, tempC: 37, hyp: { ...H0, gabaIv: 1000 * ugMl }, mac: M0,
});
const prop = (ugMl: number, ageY = 40): EegSpectrum => { const x = inp(ageY, ugMl); return spectrumOf(cortexStep(undefined, x, 0.1), agentMixOf(x)); };
const db = (x: number) => 10 * Math.log10(x);
const lin = (dB: number) => 10 ** (dB / 10);
/** The PSD as the papers' estimator sees it: the mean over f ± 1.5 Hz (multitaper resolution 3 Hz), dB. */
const seen = (s: EegSpectrum, f: number) => { let p = 0; let n = 0; for (let g = f - 1.5; g <= f + 1.5 + 1e-9; g += 0.05, n++) p += lin(psdDb(s, Math.max(0.05, g))); return db(p / n); };
/** Band power on a 0.25 Hz grid of the smoothed PSD (as the digitised curves are integrated). */
const band = (s: EegSpectrum, lo: number, hi: number) => { let p = 0; for (let f = lo; f < hi - 1e-9; f += 0.25) p += lin(seen(s, f)) * 0.25; return p; };
const share = (s: EegSpectrum, lo: number, hi: number) => db(band(s, lo, hi) / band(s, 0.5, 39.5));
const alphaPeak = (s: EegSpectrum) => { let m = -Infinity; for (let f = 8; f <= 12; f += 0.25) m = Math.max(m, seen(s, f)); return m; };
const exponent = (s: EegSpectrum, f1: number, f2: number) => -(seen(s, f2) - seen(s, f1)) / (10 * Math.log10(f2 / f1));
/** Within the envelope of the two cohorts' values, widened by `tol`. */
const within = (v: number, [a, b]: readonly [number, number], tol: number, what: string) => {
  expect(v, `${what}: ${v.toFixed(2)} vs ${a}…${b} ± ${tol.toFixed(2)}`).toBeGreaterThanOrEqual(Math.min(a, b) - tol);
  expect(v, `${what}: ${v.toFixed(2)} vs ${a}…${b} ± ${tol.toFixed(2)}`).toBeLessThanOrEqual(Math.max(a, b) + tol);
};
const TOL_DB = 1;
const expTol = (f1: number, f2: number) => TOL_DB / (10 * Math.log10(f2 / f1));

const GA_UG_ML = 3.5;
const GA = prop(GA_UG_ML);

describe('the propofol GA spectrum above the alpha band against the measured spectra (AKE14 Fig. 3C, PUR15 Fig. 3A)', () => {
  // [AKE14] Fig. 3C, [PUR15] Fig. 3A young: dB below the alpha peak (AKE14 peak 1.0 dB at 10.3 Hz; PUR15 5.0 dB at 11 Hz)
  const BELOW_ALPHA: Record<string, readonly [number, number]> = { 25: [-16.1, -16.1], 30: [-19.6, -20.3], 35: [-22.2, -23.7], 39.5: [-24.1, -25.9] };
  it('25–39.5 Hz: the level below the alpha peak (AKE14 Fig. 3C p. 995; PUR15 Fig. 3A p. i52)', () => {
    const pk = alphaPeak(GA);
    for (const [f, env] of Object.entries(BELOW_ALPHA)) within(seen(GA, Number(f)) - pk, env, TOL_DB, `${f} Hz below the alpha peak`);
  });

  // shares of the 0.5–39.5 Hz power, dB: [AKE14], [PUR15] young (integrated from the digitised curves)
  const SHARES: Array<[number, number, readonly [number, number]]> = [[25, 39.5, [-21.2, -22.5]], [30, 39.5, [-24.9, -26.8]], [35, 39.5, [-29.5, -31.7]]];
  it('25–39.5, 30–39.5 and 35–39.5 Hz: the band\'s share of the 0.5–39.5 Hz power (AKE14 Fig. 3C; PUR15 Fig. 3A)', () => {
    for (const [lo, hi, env] of SHARES) within(share(GA, lo, hi), env, TOL_DB, `${lo}–${hi} Hz share`);
  });

  it('the power-law exponent above beta: 20–39.5 Hz 4.12 / 4.69, 30–39.5 Hz 3.76 / 4.65 (AKE14 Fig. 3C; PUR15 Fig. 3A)', () => {
    within(exponent(GA, 20, 39.5), [4.12, 4.69], expTol(20, 39.5), 'exponent 20–39.5 Hz');
    within(exponent(GA, 30, 39.5), [3.76, 4.65], expTol(30, 39.5), 'exponent 30–39.5 Hz');
  });

  // Age, [PUR15] Fig. 3A: the elderly cohort's 20–39.5 Hz exponent is 3.86 against the young's 4.69 (ratio 0.82); the
  // digitised ends carry the drawn bands' ± 0.5 dB, ± 0.07 on the ratio. Same age-adjusted dose (the engine's `hyper`).
  it('age: the 20–39.5 Hz exponent at 80 y is ≈ 0.82 of that at 28 y (PUR15 Fig. 3A p. i52)', () => {
    const at = (ageY: number) => prop((GA_UG_ML * ce50Propofol(ageY)) / ce50Propofol(40), ageY);
    within(exponent(at(80), 20, 39.5) / exponent(at(28), 20, 39.5), [0.82, 0.82], 0.07, 'exponent ratio 80 y / 28 y');
  });

  // The beta range below the corner: the measured spectra keep more power on the alpha's upper flank than the engine's
  // narrow alpha and its fallen 20 Hz beta give. [AKE14] / [PUR15]: 15 Hz −7.5 / −6.1 and 20 Hz −11.9 / −12.0 dB below
  // the alpha peak; 12–25 Hz share −10.5 / −9.8 dB. Not corrected here (see the PR: the travelled peak, PUR13 p. E1144).
  it.fails('12–25 Hz (beta): 15 and 20 Hz below the alpha peak and the 12–25 Hz share (AKE14 Fig. 3C; PUR15 Fig. 3A) — measured 15 Hz −12.1, 20 Hz −13.4, share −12.3 dB: the engine\'s alpha is a narrow peak and its beta (20 Hz) falls at depth, so the alpha\'s upper flank the papers show is missing', () => {
    const pk = alphaPeak(GA);
    within(seen(GA, 15) - pk, [-7.5, -6.1], TOL_DB, '15 Hz below the alpha peak');
    within(seen(GA, 20) - pk, [-11.9, -12.0], TOL_DB, '20 Hz below the alpha peak');
    within(share(GA, 12, 25), [-10.5, -9.8], TOL_DB, '12–25 Hz share');
  });
});

describe('the depths before general anaesthesia: the spectrum is the one the engine had (the control)', () => {
  it('awake and propofol sedation short of the alpha onset (lor < 0.8): no high-frequency corner, the PSD as before', () => {
    for (const s of [prop(0), prop(1.0)]) {
      const ap = s.aperiodic;
      expect(ap.hfSlope ?? ap.slope).toBe(ap.slope);
      for (const f of [20, 30, 40, 47]) expect(psdDb(s, f)).toBeCloseTo(10 * Math.log10(10 ** ((ap.offsetDb - 10 * ap.slope * Math.log10(f)) / 10) + s.peaks.reduce((a, p) => a + 10 ** (p.powerDb / 10) * Math.exp(-((f - p.fHz) ** 2) / (2 * p.widthHz ** 2)), 0)), 9);
    }
  });
});

describe('the course of 25–35 Hz power through loss of consciousness (PUR13 Fig. 2C p. E1145)', () => {
  // [PUR13] Fig. 2C, the 25–35 Hz curve, dB over the awake baseline: 15 min before LOC +3.6 (band 2.3–4.8 as drawn),
  // at LOC +4.4 (4.1–4.6), 15 min after +3.7 (2.8–4.7), 29 min after +2.8 (2.5–3.2). Same-subject ratios, so the
  // montage cancels. The engine's LOC is the propofol LOC C50 at 40 y (locPropofol); 15 and 29 min later the targets
  // had risen by one and two 1 µg/mL steps (14 min each, p. E1149) [INF].
  const AWAKE = prop(0);
  const LOC = locPropofol(40) / 1000;
  const p2535 = (s: EegSpectrum) => band(s, 25, 35);
  it.fails('sedation: 25–35 Hz power rises ≈ 3.6 dB over awake before LOC (PUR13 Fig. 2C) — measured +0.5 dB at propofol 1.5 µg/mL: the sedation beta (20 Hz, σ 4 Hz) does not reach 25–35 Hz and the steepening slope (κ 0.6 → 0.75, pivot at 1 Hz) lowers it', () => {
    within(db(p2535(prop(1.5)) / p2535(AWAKE)), [2.3, 4.8], 0, '25–35 Hz, sedation over awake');
  });
  it.fails('unconscious: 25–35 Hz power stays ≈ 3.7 dB over awake 15 min after LOC (PUR13 Fig. 2C) — measured −9 dB at propofol 3.0 µg/mL: the engine\'s awake 25–35 Hz is far above what a measured GA spectrum and this ratio imply, and the slope steepens about a 1 Hz pivot', () => {
    within(db(p2535(prop(LOC + 1)) / p2535(AWAKE)), [2.8, 4.7], 0, '25–35 Hz, LOC + 15 min over awake');
  });
  it.fails('LOC → unconscious: 25–35 Hz power changes by only −0.7 dB (15 min) and −1.6 dB (29 min) after LOC (PUR13 Fig. 2C) — measured −4.7 and −6.4 dB: the slope steepens about a 1 Hz pivot and the high-frequency corner comes on through loss of responsiveness', () => {
    within(db(p2535(prop(LOC + 1)) / p2535(prop(LOC))), [-1.8, 0.6], 0, '25–35 Hz, LOC + 15 min over LOC');
    within(db(p2535(prop(LOC + 2)) / p2535(prop(LOC))), [-2.1, -0.9], 0, '25–35 Hz, LOC + 29 min over LOC');
  });
});
