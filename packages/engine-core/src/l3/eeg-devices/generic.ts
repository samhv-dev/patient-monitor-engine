// EEG E5 (plan §7 E5; D8): the generic processed-EEG reader — everything Miller says a monitor shows, computed from the
// samples, the sample rate and the electrode impedance only (the device boundary, plan §5). Not any maker's algorithm:
// the published, generic measures. Pure; its state is plain JSON-safe data (the engine snapshots it).
// Each update (1 s) it reads the last 2-s epoch:
//   PSD = the epoch's periodogram (spectral.ts); invalid when the power above 40 Hz says electrocautery
//   S ← S + (PSD − S)·(1 − e^(−update/τ)) over the valid epochs (the spectrum the numerics read)
//   SEF = the frequency below which 95 % of S's 0.5–30 Hz power lies; MF the same at 50 %; band powers from S
//   SR = 100 × (time with |x| < 5 µV for ≥ 0.5 s) ÷ (valid time) over the last 60 s
// and publishes them with the impedance; a spectrogram column (the epoch's own PSD, 0–50 Hz, dB) every 2 s; the raw
// samples since the last reading. Flags: questionable while an electrode is over the limit or they are unequal;
// invalid during a cautery burst (from the signal's power, not the engine's event).
import type { EegBandName, EegDeviceSpec, EegReading } from '../../types-eeg.ts';
import { bandPower, edgeFrequency, psdOf } from './spectral.ts';

const c = (value: number, unit: string, tag: string, what: string) => ({ value, unit, tag, what });

/** The generic reader's spec row: every constant it uses, with its tag. */
export const GENERIC_SPEC = {
  id: 'generic',
  label: 'Processed EEG (generic)', // plan E5; the owner's Q1 A (6 Nov): the first selectable instrument
  updateS: 1,
  constants: {
    updateS: c(1, 's', '[ENG: plan E6 "the generic reader 1 s"]', 'how often the numerics are published; each update reads the last epoch'),
    epochS: c(2, 's', '[TXT Ch35 p. 1106: 2-s epochs]', 'the epoch each spectrum is computed from'),
    rawWindowS: c(8, 's', '[TXT Ch36 p. 1137: the raw EEG over 5–10 s; ENG: 8 inside it]', 'the raw trace the display keeps'),
    dsaHistoryS: c(3600, 's', '[TXT Ch36 pp. 1138–1139: the spectrogram of about the last hour]', 'the spectrogram the display keeps'),
    dsaMaxHz: c(50, 'Hz', '[TXT Ch36 p. 1139, Fig. 36.3: 0–50 Hz]', 'the spectrogram\'s top frequency'),
    spectrumLoHz: c(0.5, 'Hz', '[ENG: the lowest frequency a 2-s epoch resolves]', 'the lower edge of the SEF and median frequency'),
    spectrumHiHz: c(30, 'Hz', '[ENG: the top of beta (Ch36 Table 36.1); above it EMG dominates (Ch36 p. 1142)]', 'the upper edge of the SEF and median frequency'),
    sefFraction: c(0.95, 'fraction', '[P-14, the owner\'s placeholder: 95 %, the SEF95 of Bruhn 2003 (Miller Ch23 ref. 147, full book); Ch36 gives no percentile]', 'the spectral edge: the fraction of the power below it'),
    smoothingS: c(5, 's', '[ENG: no source; a single 2-s periodogram scatters the edge by several Hz]', 'the time constant of the spectrum the numerics read'),
    suppressionUv: c(5, 'µV', '[TXT Ch36 p. 1139, Fig. 36.6: suppressed stretches < 5 µV]', 'the suppression threshold, |x|'),
    suppressionMinS: c(0.5, 's', '[P-8: > 0.5 s, Rampil 1998 (Ch36 ref. 45) via secondary sources, research/43]', 'the shortest stretch counted as suppression'),
    srWindowS: c(60, 's', '[ENG: Miller\'s 30–60 s (Ch36 p. 1140), the upper bound, the steadier (plan E5)]', 'the suppression ratio\'s window'),
    impedanceLimitKOhm: c(5, 'kΩ', '[P-13, the plan default: Ch36 p. 1145 gives 5 or 8 kΩ]', 'above it the signal is questionable'),
    impedanceUnequalKOhm: c(2.5, 'kΩ', '[ENG: half the limit; Ch36 p. 1145 names inequality without a number]', 'electrodes differing by more are unequal: questionable'),
    cauteryLoHz: c(40, 'Hz', '[ENG: above the EEG and most of the scalp EMG (peak 20–30 Hz, research/43 P-9)]', 'the band the cautery detector reads'),
    cauteryUv2: c(2000, 'µV²', '[ENG: ≈ 7 × the most the scalp EMG puts above 40 Hz, ≈ 1/11 of one diathermy burst (Ch36 p. 1146: power raised at all frequencies)]', 'above it in the cautery band, the epoch is invalid'),
    slowLoHz: c(0.1, 'Hz', '[TXT Ch36 Table 36.1]', 'slow oscillation, lower edge (read from the first bin, 0.5 Hz)'),
    slowHiHz: c(2, 'Hz', '[TXT Ch36 Table 36.1]', 'slow oscillation, upper edge'),
    deltaLoHz: c(0.5, 'Hz', '[TXT Ch36 Table 36.1]', 'delta, lower edge'),
    deltaHiHz: c(4, 'Hz', '[TXT Ch36 Table 36.1]', 'delta, upper edge'),
    thetaLoHz: c(4, 'Hz', '[TXT Ch36 Table 36.1]', 'theta, lower edge'),
    thetaHiHz: c(8, 'Hz', '[TXT Ch36 Table 36.1]', 'theta, upper edge'),
    alphaLoHz: c(8, 'Hz', '[TXT Ch36 Table 36.1]', 'alpha, lower edge'),
    alphaHiHz: c(12, 'Hz', '[TXT Ch36 Table 36.1]', 'alpha, upper edge'),
    betaLoHz: c(12, 'Hz', '[TXT Ch36 Table 36.1]', 'beta, lower edge'),
    betaHiHz: c(30, 'Hz', '[TXT Ch36 Table 36.1]', 'beta, upper edge'),
    gammaLoHz: c(30, 'Hz', '[TXT Ch36 Table 36.1: gamma > 30 Hz]', 'gamma, lower edge'),
    gammaHiHz: c(45, 'Hz', '[ENG: below the 50 Hz mains line]', 'gamma, upper edge'),
  },
} satisfies EegDeviceSpec;

const K = GENERIC_SPEC.constants;
const BANDS: readonly EegBandName[] = ['slow', 'delta', 'theta', 'alpha', 'beta', 'gamma'];

export interface GenericState {
  fs: number;
  /** Samples read since switch-on. */
  n: number;
  /** The last epoch, a ring of fs·epochS samples, and its next write index. */
  ring: number[];
  head: number;
  /** The samples since the last reading (the raw display). */
  fresh: number[];
  /** The smoothed spectrum (valid epochs only), µV²/Hz; null until the first valid epoch. */
  avg: number[] | null;
  /** The current stretch below the threshold, samples. */
  run: number;
  /** Suppressed samples in the open second, and the closed seconds of the window: suppressed samples, valid. */
  open: number;
  bins: number[];
  valid: boolean[];
}

export function createGeneric(fsHz: number): GenericState {
  return { fs: fsHz, n: 0, ring: new Array<number>(Math.round(fsHz * K.epochS.value)).fill(0), head: 0, fresh: [], avg: null, run: 0, open: 0, bins: [], valid: [] };
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/** Read a block of samples (µV) with the electrode impedances (kΩ); the readings the block completes, in order. */
export function genericRead(s: GenericState, samples: ArrayLike<number>, impedanceKOhm: readonly number[]): EegReading[] {
  const out: EegReading[] = [];
  const perUpdate = Math.round(s.fs * K.updateS.value);
  const minRun = K.suppressionMinS.value * s.fs;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i] as number;
    s.ring[s.head] = x;
    s.head = (s.head + 1) % s.ring.length;
    s.fresh.push(x);
    s.n++;
    // suppression: a stretch counts from the sample that makes it long enough, then every sample of it
    if (Math.abs(x) < K.suppressionUv.value) {
      s.run++;
      if (s.run >= minRun) s.open += s.run === Math.ceil(minRun) ? s.run : 1;
    } else s.run = 0;
    if (s.n % perUpdate === 0) {
      const r = update(s, perUpdate, impedanceKOhm);
      if (r) out.push(r);
    }
  }
  return out;
}

function update(s: GenericState, perUpdate: number, z: readonly number[]): EegReading | null {
  const epochN = s.ring.length;
  const ready = s.n >= epochN;
  const psd = ready ? psdOf([...s.ring.slice(s.head), ...s.ring.slice(0, s.head)], s.fs) : null;
  const df = s.fs / epochN;
  const invalid = psd !== null && bandPower(psd, df, K.cauteryLoHz.value, s.fs) > K.cauteryUv2.value;
  // close this second of the suppression window; an invalid epoch spans this second and the one before
  s.bins.push(s.open);
  s.valid.push(!invalid);
  if (invalid && s.valid.length > 1) s.valid[s.valid.length - 2] = false;
  s.open = 0;
  const keep = Math.round(K.srWindowS.value / K.updateS.value);
  if (s.bins.length > keep) {
    s.bins.splice(0, s.bins.length - keep);
    s.valid.splice(0, s.valid.length - keep);
  }
  if (!psd) return null;
  if (!invalid) {
    const a = 1 - Math.exp(-K.updateS.value / K.smoothingS.value);
    s.avg = s.avg ? s.avg.map((v, k) => v + ((psd[k] as number) - v) * a) : psd;
  }
  const spec = s.avg ?? psd;
  let quiet = 0;
  let total = 0;
  s.bins.forEach((b, k) => {
    if (s.valid[k]) {
      quiet += b;
      total += perUpdate;
    }
  });
  const hi = Math.max(...z);
  const lo = Math.min(...z);
  const questionable = hi > K.impedanceLimitKOhm.value || hi - lo > K.impedanceUnequalKOhm.value;
  const edge = (q: number) => r1(edgeFrequency(spec, df, K.spectrumLoHz.value, K.spectrumHiHz.value, q));
  const bands = Object.fromEntries(BANDS.map((b) => [b, bandPower(spec, df, Math.max(K[`${b}LoHz`].value, df), K[`${b}HiHz`].value)])) as Record<EegBandName, number>;
  const epochsPerCol = Math.round(K.epochS.value / K.updateS.value);
  const col = (s.n / perUpdate) % epochsPerCol === 0
    ? { dfHz: df, db: psd.slice(0, Math.floor(K.dsaMaxHz.value / df) + 1).map((p) => r1(10 * Math.log10(Math.max(p, 1e-4)))) }
    : null;
  const raw = s.fresh;
  s.fresh = [];
  return {
    n: s.n,
    numerics: {
      sef: invalid ? null : edge(K.sefFraction.value),
      mf: invalid ? null : edge(0.5),
      eegSr: invalid ? null : total > 0 ? Math.round((100 * quiet) / total) : 0,
      eegImp: r1(hi),
    },
    flags: { questionable, invalid },
    bands,
    display: { raw, dsa: col },
  };
}
