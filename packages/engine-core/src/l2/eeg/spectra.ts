// EEG stage E2: the spectral description of a cortical state — an aperiodic 1/f background plus named oscillations,
// burst suppression and its forme fruste (docs/plans/stage-eeg-depth-of-anaesthesia.md §7 E2; research/43 P-7).
// Pure functions. Units: power spectral density in dB re 1 µV²/Hz; amplitudes in µV.
//   PSD(f) = 10^((offsetDb − 10·slope·log10 f)/10) + Σ 10^(powerDb/10)·exp(−(f − fHz)²/(2·widthHz²))
// HOW THE NUMBERS ARE ANCHORED. Absolute level from Miller in µV (awake ≈ 5–10 µV, Ch36 p. 1138); the relations between
// states from the published dB of Akeju 2014 (Anesthesiology 121:978 and 121:990), used as DIFFERENCES because their
// montage and reference differ from Miller's (research/43 P-7 note [INF]): slow power rises 15.7 dB from propofol
// sedation to propofol general anaesthesia (−2.5 → 13.2 dB); propofol's alpha sits 12.1 dB below its slow power
// (1.1 vs 13.2 dB); sevoflurane's alpha 2.2 dB above propofol's (4.3 vs 2.1 dB); dexmedetomidine's spindles 11.9 dB
// below propofol's alpha (−10.8 vs 1.1 dB) and its slow power 13.6 dB below propofol GA's (−0.4 vs 13.2 dB).
// The engine's band names follow Ch36 Table 36.1 (slow 0.1–2, delta 0.5–4, theta 4–8, alpha 8–12, beta 12–30 Hz;
// the owner's Q6 ruling); every device will use its own bands. Magnitudes between the anchors are [FIT: spectral magnitudes between the sourced anchors; brief research/43 P-7]:
// direction-only acceptance.
import type { AgentMix, CortexState, EegPeak, EegPeakName, EegSpectrum } from '../../types-eeg.ts';
import { ageFactors } from './state.ts';

// --- the aperiodic background (Ch36 p. 1139; Obert 2022; research/43 P-7) ---
/** Awake RMS over 0.5–50 Hz, µV: Miller Ch36 p. 1138 "∼5 to 10 µV" (the mid-point). Sets the aperiodic offset. */
export const AWAKE_RMS_UV = 7.5; // µV
/** Aperiodic exponent awake [FIT: awake aperiodic exponent, flatter than under anaesthesia; brief research/43 P-7; Ch36 p. 1139 "steeper with dose"; no awake value in
 * the sources read]. */
export const SLOPE_AWAKE = 0.6;
/** Aperiodic exponent at ≈ 1 MAC sevoflurane maintenance: κ 0.899 (Obert 2022, 180 adults) — taken at hyper = 1 and at
 * the reference age [INF]. */
export const SLOPE_MAINT = 0.9;
/** The slope stops steepening past this `hyper` [FIT: slope cap, the suppression range takes over; brief research/43 P-7]. */
export const SLOPE_HYPER_CAP = 2;
/** The age at which the amplitude and slope anchors above hold (the engine's standard adult) [INF: Miller and Obert
 * give adult values without an age]. */
export const REF_AGE_Y = 40;
/** The band the RMS anchors are integrated over, Hz (Miller's spectrograms run to 50 Hz, Ch36 Fig. 36.3). */
export const RMS_LO_HZ = 0.5;
/** Upper edge of the RMS band, Hz (Miller Ch36 Fig. 36.3 legend: 50-Hz waves furthest). */
export const RMS_HI_HZ = 50;

// --- slow oscillation / delta (Ch36 pp. 1139, 1144; Akeju 2014) ---
/** Slow-oscillation centre, Hz, inside the slow band 0.1–2 Hz (Miller Ch36 Table 36.1) [FIT: slow-oscillation centre; brief research/43 P-7]. */
export const SLOW_HZ = 0.8;
/** Its Gaussian σ, Hz [FIT: slow-peak width; brief research/43 P-7]. */
export const SLOW_WIDTH_HZ = 0.5;
/** Slow power rises 15.7 dB from sedation to general anaesthesia (Akeju 2014 121:978: −2.5 → 13.2 dB, propofol). */
export const SLOW_GA_RISE_DB = 15.7;
/** The rise runs from this `hyper` (sedation) … [FIT: sedation start of the slow rise; brief research/43 P-7] */
export const SLOW_ON_HYPER = 0.3;
/** … to this one (general anaesthesia: the propofol BIS-50 Ce50, 1 MAC) [INF]. */
export const SLOW_GA_HYPER = 1;
/** Dexmedetomidine's slow power is 13.6 dB below propofol GA's (Akeju 2014 121:978: −0.4 vs 13.2 dB), i.e. 2.1 dB above
 * the sedation level, reached at alpha2Eq = 1. */
export const DEX_SLOW_RISE_DB = SLOW_GA_RISE_DB - 13.6;

// --- alpha and spindles (Ch36 pp. 1138, 1143–1144; Akeju 2014) ---
/** Propofol's alpha peak at GA, dB below the GA slow power (Akeju 2014 121:978: 1.1 vs 13.2 dB). */
export const ALPHA_PROP_BELOW_SLOW_DB = 12.1;
/** Sevoflurane's alpha above propofol's (Akeju 2014 121:990: 4.3 vs 2.1 dB); isoflurane and desflurane the same
 * ("common to all ethers", Ch36 p. 1143) [INF]. */
export const ALPHA_ETHER_ABOVE_PROP_DB = 2.2;
/** Dexmedetomidine's spindle power below propofol's alpha (Akeju 2014 121:978: −10.8 vs 1.1 dB). */
export const DEX_SPINDLE_BELOW_PROP_DB = 11.9;
/** Dexmedetomidine spindle frequency ≈ 13 Hz (Akeju 2014 121:978; Miller Ch36 p. 1144 "near 12 Hz"). */
export const SPINDLE_HZ = 13;
/** Spindles are short bursts, propofol/sevoflurane alpha "often almost continuous" (Miller Ch36 p. 1144) [FIT: spindle burstiness; brief research/43 P-7]. */
export const SPINDLE_BURSTINESS = 0.8;
/** Propofol / ether alpha: "often almost continuous" (Miller Ch36 p. 1144) [FIT: alpha burstiness; brief research/43 P-7]. */
export const ALPHA_BURSTINESS = 0.1;
/** Frontal alpha appears through loss of responsiveness (Ch36 p. 1138): from lor 0.8 to full at lor 1.2 [FIT: alpha onset ramp; brief research/43 P-7]. */
export const ALPHA_LOR_ON = 0.8;
/** Alpha at full height from this lor (Miller Ch36 p. 1138) [FIT: alpha onset ramp; brief research/43 P-7]. */
export const ALPHA_LOR_FULL = 1.2;
/** GABA-ergic IV alpha frequency: ≈ 12 Hz light, ≈ 10 Hz deep, never below 10 (Ch36 p. 1143); ≈ 11 Hz at GA (Akeju 2014
 * 121:978). Linear in `hyper` from 0.7 to 1.5 [FIT: alpha-frequency ramp; brief research/43 P-7]; it rises on emergence before alpha fades (Ch36 p. 1142). */
export const ALPHA_IV_LIGHT_HZ = 12;
/** GABA-ergic IV alpha at depth: not below 10 Hz (Miller Ch36 p. 1143). */
export const ALPHA_IV_DEEP_HZ = 10;
/** Ether alpha ≈ 10 Hz, slowing to ≈ 7–8 Hz (7.5) past the alpha-to-delta shift and fading into delta (Ch36 p. 1143,
 * Fig. 36.7). */
export const ALPHA_ETHER_HZ = 10;
/** Ether alpha past the alpha-to-delta shift: ≈ 7–8 Hz (Miller Ch36 p. 1143, Fig. 36.7), the mid-point. */
export const ALPHA_ETHER_DEEP_HZ = 7.5;
/** The slowing and the fade complete over this much `deep`, MAC [FIT: alpha-to-delta span; brief research/43 P-7]. */
export const DEEP_SPAN_MAC = 0.5;
/** The ether alpha's fade over DEEP_SPAN_MAC, dB [FIT: ether alpha fade; brief research/43 P-7]. */
export const ALPHA_FADE_DB = 10;
/** Alpha and spindle σ, Hz [FIT: narrowband peak width; brief research/43 P-7; src Miller Ch36 p. 1143]. */
export const ALPHA_WIDTH_HZ = 1.2;
/** Sevoflurane's theta peak ≈ 4.9 Hz (Akeju 2014 121:990: theta coherence 4.9 ± 0.6 Hz; Miller: peaks near 3, 8, 11 Hz;
 * "less common with propofol"), at the ether alpha's level minus this [FIT: ether theta level; brief research/43 P-7]. */
export const THETA_HZ = 4.9;
/** The ether theta peak below the ether alpha, dB [FIT: ether theta level; brief research/43 P-7]. */
export const THETA_BELOW_ALPHA_DB = 3;

// --- beta and gamma (Ch36 pp. 1138–1139, 1141, 1144–1145) ---
/** Beta centre, Hz: the "beta buzz" over ≈ 15–25 Hz (Miller Ch36 p. 1138). */
export const BETA_HZ = 20;
/** Beta σ, Hz: spans 15–25 Hz (Miller Ch36 p. 1138) [FIT: beta width; brief research/43 P-7]. */
export const BETA_WIDTH_HZ = 4;
/** Awake beta base (Ch36 p. 1138; Ch35 p. 1104), dB above the background [FIT: awake beta level; brief research/43 P-7]. */
export const BETA_AWAKE_DB = 3;
/** Sedation beta rise, peaking at lor 0.6 and gone by lor 1.1 [FIT: sedation beta rise; brief research/43 P-7]; benzodiazepines "mainly increased beta" (Ch36
 * p. 1144): × (1 + 0.5·share) and kept past LOR [FIT: benzodiazepine beta share; brief research/43 P-7]. */
export const BETA_SED_RISE_DB = 10;
/** The marked fall of beta at surgical depth (Ch36 p. 1139), per lor unit past 1, dB [FIT: beta fall at depth; brief research/43 P-7]. */
export const BETA_GA_FALL_DB = 6;
/** Noxious arousal: beta up (and alpha drop-out below), at arousal 1, dB [FIT: arousal beta rise; brief research/43 P-7] (Ch36 pp. 1141, 1151). */
export const BETA_AROUSAL_DB = 8;
/** Noxious arousal: alpha drop-out at arousal 1, dB [FIT: arousal alpha drop-out; brief research/43 P-7] (Miller Ch36 pp. 1141, 1151). */
export const ALPHA_AROUSAL_DROP_DB = 10;
/** Opioids at low dose lose beta (Ch35 Table 35.1), at opioid = 1, dB [FIT: opioid beta loss; brief research/43 P-7]. */
export const OPIOID_BETA_DROP_DB = 3;
/** Opioid alone above 8 ng/mL: delta up (Ch36 p. 1144), dB above the sedation slow level at opioid 2; little change
 * with a hypnotic (p. 1145): gated by (1 − lor) [FIT: opioid delta rise; brief research/43 P-7]. */
export const OPIOID_DELTA_DB = 10;
/** Gamma centre, Hz: gamma > 30 Hz (Miller Ch36 Table 36.1) [FIT: gamma centre; brief research/43 P-7]. */
export const GAMMA_HZ = 35;
/** Gamma σ, Hz [FIT: gamma width; brief research/43 P-7]. */
export const GAMMA_WIDTH_HZ = 6;
/** Ketamine: alpha loss (−10 dB by ketDepol 0.3 — the 25–50 mg adjunct range), theta and gamma up, and at hypnotic
 * doses huge slow waves (GA-sized) alternating with gamma bursts (Ch36 p. 1144) [FIT: ketamine spectral sizes; brief research/43 P-7]. */
export const KET_ALPHA_LOSS_DB = 10;
/** ketDepol at which ketamine's alpha loss and theta rise are complete: the 25–50 mg adjunct range (Miller Ch36 p. 1144:
 * adjunct boluses most consistently decrease alpha) [FIT: ketamine saturation; brief research/43 P-7]. */
export const KET_SAT = 0.3;
/** Ketamine's theta rise above the background at KET_SAT, dB (Miller Ch36 p. 1144: theta up) [FIT: ketamine theta rise; brief research/43 P-7]. */
export const KET_THETA_DB = 6;
/** Ketamine's gamma above the background at ketDepol 1, dB (Miller Ch36 p. 1144: gamma up) [FIT: ketamine gamma rise; brief research/43 P-7]. */
export const KET_GAMMA_DB = 10;
/** N2O alone: frontal fast activity > 30 Hz (Ch35 Table 35.1), dB at 0.6 MAC [FIT: N2O fast activity; brief research/43 P-7]; its transient: a GA-sized slow-delta
 * ("coherent large-amplitude", Pavone 2016 [INF]) with alpha loss (Ch36 p. 1144), dB at transient 1 [FIT: N2O transient size; brief research/43 P-2]. */
export const N2O_FAST_DB = 5;
/** The N2O transient's alpha loss at transient 1, dB (Miller Ch36 p. 1144) [FIT: N2O transient alpha loss; brief research/43 P-2]. */
export const N2O_ALPHA_LOSS_DB = 10;
/** Ischaemic / hypoxic / hypothermic slowing: fast activity lost, low frequencies dominate (Ch35 pp. 1105, 1126),
 * dB at slowing 1 [FIT: metabolic fast-activity loss; brief research/43 P-7]. */
export const SLOWING_FAST_LOSS_DB = 10;
/** The same slowing's delta rise above the sedation slow level at slowing 1, dB (Miller Ch35 p. 1126: low frequencies
 * dominate) [FIT: metabolic delta rise; brief research/43 P-7]. */
export const SLOWING_DELTA_DB = 10;

// --- burst suppression (research/43 P-8; Ch36 pp. 1139–1141, 1145) ---
/** Suppressed stretches < 5 µV (Miller Ch36 Fig. 36.6): the suppressed level, RMS µV [FIT: suppressed level, below the criterion; brief research/43 P-8]. */
export const SUPPRESSED_UV = 1.5; // µV
/** First-burst amplitude, propofol: 31.97 − 0.26·age µV (Kratzer 2020, Ch36 ref 101). */
export const BURST_PROP_UV_AT0 = 31.97; // µV
/** Its fall with age, µV per year (Kratzer 2020: max amplitude 31.97 − 0.26 × age µV). */
export const BURST_PROP_UV_PER_Y = 0.26;
/** Ether bursts larger than propofol's (Fleischmann 2018, 99th percentile: isoflurane 42.5, sevoflurane 32.5, propofol
 * 22 µV) — as ratios to propofol [INF]; desflurane as isoflurane (Hoffman 1995) [INF]. */
export const BURST_ISO_RATIO = 42.5 / 22;
/** Sevoflurane burst amplitude ÷ propofol's (Fleischmann 2018: 32.5 vs 22 µV, 99th percentile) [INF: as a ratio]. */
export const BURST_SEVO_RATIO = 32.5 / 22;
/** The forme fruste (Ch36 pp. 1140–1141) from this fraction of the suppression onset drive [FIT: forme fruste onset; brief research/43 P-8]; it fades as the
 * suppression becomes established. */
export const FORME_FRUSTE_ON = 0.85;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lin = (dB: number) => 10 ** (dB / 10);
const dbOf = (p: number) => (p > 0 ? 10 * Math.log10(p) : -100);
const apDb = (offsetDb: number, slope: number, f: number) => offsetDb - 10 * slope * Math.log10(f);

/** The awake aperiodic offset that gives AWAKE_RMS_UV over RMS_LO_HZ–RMS_HI_HZ: ∫ A·f^−κ df = A·(hi^(1−κ) − lo^(1−κ))/(1 − κ). */
export const AWAKE_OFFSET_DB = dbOf((AWAKE_RMS_UV ** 2 * (1 - SLOPE_AWAKE)) / (RMS_HI_HZ ** (1 - SLOPE_AWAKE) - RMS_LO_HZ ** (1 - SLOPE_AWAKE)));
/** The sedation-level slow power: the awake background at the slow centre (Akeju's "sedation" ≈ the background). */
const SLOW_BASE_DB = apDb(AWAKE_OFFSET_DB, SLOPE_AWAKE, SLOW_HZ);
/** Propofol's GA alpha height (absolute, before age). */
const ALPHA_PROP_DB = SLOW_BASE_DB + SLOW_GA_RISE_DB - ALPHA_PROP_BELOW_SLOW_DB;

/** The spectrum of a cortical state with its agent mix. */
export function spectrumOf(c: CortexState, m: AgentMix): EegSpectrum {
  const ref = ageFactors(REF_AGE_Y);
  const ampDb = 20 * Math.log10(c.ageAmp / ref.amp);
  const slope = (SLOPE_AWAKE + (SLOPE_MAINT - SLOPE_AWAKE) * Math.min(c.hyper, SLOPE_HYPER_CAP)) * (c.ageSlope / ref.slope);
  const offsetDb = AWAKE_OFFSET_DB + ampDb;
  const bg = (f: number) => apDb(AWAKE_OFFSET_DB, slope, f); // the background before age, for relative heights
  const ivShare = m.gabaIv + m.barbiturate + m.etomidate;
  const volShare = m.sevoflurane + m.isoflurane + m.desflurane;
  const slowing = Math.max(clamp01(c.metabolic / 0.5), c.cold);
  const ket = clamp01(c.ketDepol / KET_SAT);

  // slow / delta
  const u = clamp01((c.hyper - SLOW_ON_HYPER) / (SLOW_GA_HYPER - SLOW_ON_HYPER));
  const base = lin(SLOW_BASE_DB);
  let slow = (1 - m.alpha2) * base * (lin(SLOW_GA_RISE_DB * u) - 1) + m.alpha2 * base * (lin(DEX_SLOW_RISE_DB * Math.min(1, c.hyper)) - 1);
  slow += lin(SLOW_BASE_DB + SLOW_GA_RISE_DB) * clamp01((c.ketDepol - 0.7) / 0.6); // ketamine at hypnotic doses
  slow += lin(SLOW_BASE_DB + SLOW_GA_RISE_DB) * c.n2oTransient; // the N2O transient
  slow += lin(SLOW_BASE_DB + OPIOID_DELTA_DB) * clamp01(c.opioid - 1) * (1 - clamp01(c.lor)); // opioid alone
  slow += lin(SLOW_BASE_DB + SLOWING_DELTA_DB) * slowing;

  // alpha (continuous) and spindles (bursts)
  const aw = clamp01((c.lor - ALPHA_LOR_ON) / (ALPHA_LOR_FULL - ALPHA_LOR_ON));
  const drop = ALPHA_AROUSAL_DROP_DB * c.arousal + KET_ALPHA_LOSS_DB * ket + N2O_ALPHA_LOSS_DB * c.n2oTransient + SLOWING_FAST_LOSS_DB * slowing;
  const dp = clamp01(c.deep / DEEP_SPAN_MAC);
  const aIv = lin(ALPHA_PROP_DB) * aw * ivShare;
  const aVol = lin(ALPHA_PROP_DB + ALPHA_ETHER_ABOVE_PROP_DB - ALPHA_FADE_DB * dp) * aw * volShare;
  const fIv = ALPHA_IV_LIGHT_HZ - (ALPHA_IV_LIGHT_HZ - ALPHA_IV_DEEP_HZ) * clamp01((c.hyper - 0.7) / 0.8);
  const fVol = ALPHA_ETHER_HZ - (ALPHA_ETHER_HZ - ALPHA_ETHER_DEEP_HZ) * dp;
  const fAlpha = aIv + aVol > 0 ? (aIv * fIv + aVol * fVol) / (aIv + aVol) : ALPHA_ETHER_HZ;
  const spindle = (lin(ALPHA_PROP_DB - DEX_SPINDLE_BELOW_PROP_DB) * m.alpha2 + lin(ALPHA_PROP_DB) * m.benzo) * aw;

  // theta: the ethers' peak and ketamine's
  const theta = lin(ALPHA_PROP_DB + ALPHA_ETHER_ABOVE_PROP_DB - THETA_BELOW_ALPHA_DB) * aw * volShare + lin(bg(THETA_HZ) + KET_THETA_DB) * ket;

  // beta
  const bump = c.lor < 0.6 ? c.lor / 0.6 : clamp01((1.1 - c.lor) / 0.5);
  const betaRel = BETA_AWAKE_DB + BETA_SED_RISE_DB * bump * (1 + 0.5 * m.benzo) - BETA_GA_FALL_DB * clamp01(c.lor - 1) * (1 - m.benzo)
    + BETA_AROUSAL_DB * c.arousal - OPIOID_BETA_DROP_DB * clamp01(c.opioid) - SLOWING_FAST_LOSS_DB * slowing;

  // gamma: ketamine (continuous at sub-hypnotic doses, alternating bursts at hypnotic ones) and N2O's fast activity
  const gamma = lin(bg(GAMMA_HZ) + KET_GAMMA_DB) * clamp01(c.ketDepol) + lin(bg(GAMMA_HZ) + N2O_FAST_DB) * clamp01(m.n2oMac / 0.6);

  const pk = (name: EegPeakName, fHz: number, widthHz: number, powerLinOrDb: number, isDb: boolean, burstiness: number): EegPeak => ({
    name, fHz, widthHz, powerDb: (isDb ? powerLinOrDb : dbOf(powerLinOrDb)) + ampDb, burstiness,
  });
  const peaks: EegPeak[] = [
    pk('slow', SLOW_HZ, SLOW_WIDTH_HZ, slow, false, 0),
    pk('theta', THETA_HZ, 1, theta, false, 0),
    { ...pk('alpha', fAlpha, ALPHA_WIDTH_HZ, aIv + aVol, false, ALPHA_BURSTINESS), powerDb: dbOf(aIv + aVol) - drop + ampDb },
    { ...pk('spindle', SPINDLE_HZ, ALPHA_WIDTH_HZ, spindle, false, SPINDLE_BURSTINESS), powerDb: dbOf(spindle) - drop + ampDb },
    pk('beta', BETA_HZ, BETA_WIDTH_HZ, bg(BETA_HZ) + betaRel, true, 0),
    pk('gamma', GAMMA_HZ, GAMMA_WIDTH_HZ, gamma, false, 0.2 + 0.6 * clamp01((c.ketDepol - 0.5) / 0.5)),
  ];

  // burst suppression: the burst amplitude by the suppressing agents' shares (Kratzer's age slope for every agent)
  const prop = Math.max(0, BURST_PROP_UV_AT0 - BURST_PROP_UV_PER_Y * m.ageY);
  const supW = ivShare + volShare;
  const ratio = supW > 0 ? (ivShare + m.sevoflurane * BURST_SEVO_RATIO + (m.isoflurane + m.desflurane) * BURST_ISO_RATIO) / supW : 1;
  const ff = c.suppressDrive < FORME_FRUSTE_ON ? 0 : c.suppressDrive < 1 ? (c.suppressDrive - FORME_FRUSTE_ON) / (1 - FORME_FRUSTE_ON) : 1 - c.suppress;
  return {
    aperiodic: { offsetDb, slope },
    peaks,
    suppression: { p: c.suppress, burstUv: prop * ratio, suppressedUv: SUPPRESSED_UV },
    formeFruste: clamp01(ff),
  };
}

// --- readers of a spectrum (the generator's and the tests' contract) ---
export function peakOf(s: EegSpectrum, name: EegPeakName): EegPeak {
  const p = s.peaks.find((x) => x.name === name);
  if (!p) throw new Error(`no ${name} peak`);
  return p;
}
/** PSD at f, dB re 1 µV²/Hz. */
export function psdDb(s: EegSpectrum, f: number): number {
  let p = lin(apDb(s.aperiodic.offsetDb, s.aperiodic.slope, f));
  for (const k of s.peaks) p += lin(k.powerDb) * Math.exp(-((f - k.fHz) ** 2) / (2 * k.widthHz ** 2));
  return dbOf(p);
}
/** Power in [lo, hi] Hz, µV² (midpoint rule, 0.01 Hz). */
export function bandPower(s: EegSpectrum, lo: number, hi: number): number {
  const df = 0.01;
  let p = 0;
  for (let f = lo + df / 2; f < hi; f += df) p += lin(psdDb(s, f)) * df;
  return p;
}
/** RMS amplitude over RMS_LO_HZ–RMS_HI_HZ, µV (the continuous activity; suppression is separate). */
export function rmsUv(s: EegSpectrum): number {
  return Math.sqrt(bandPower(s, RMS_LO_HZ, RMS_HI_HZ));
}
/** The frequency below which half the power in [lo, hi] lies, Hz. */
export function medianFreq(s: EegSpectrum, lo: number, hi: number): number {
  const df = 0.01;
  const half = bandPower(s, lo, hi) / 2;
  let p = 0;
  for (let f = lo + df / 2; f < hi; f += df) {
    p += lin(psdDb(s, f)) * df;
    if (p >= half) return f;
  }
  return hi;
}
