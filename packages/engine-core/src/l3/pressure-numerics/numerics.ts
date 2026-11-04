// Device pressure numerics (brief §4.2 "Numerics (L3)", §6.1; research 03 §2.2): per-beat SBP/DBP = max/min of the
// DISPLAYED (transducer + 12 Hz filter) waveform between two detected feet; MAP = the INTEGRAL of the beat (never a
// formula); values averaged over the last 6 beats (4–8) and emitted at 1 Hz. Also the pleth PI (mean peak-to-trough of
// the last 6 pulses) and the pulse rate from the chosen source. Only FRESH beats (≤ 6 s old) are averaged — a PEA
// showed the 5 pre-arrest beats as a valid 118/79 for 6 s once one ventilator swing was taken for a beat. A pressure is
// pulsatile with ≥ 2 fresh beats of amplitude ≥ 3 mmHg at ≥ 25/min (the Philips NON-PULSATILE rule, research/05 §6 [S2]
// p. 57); otherwise it is a STATIC pressure, shown per skin: S/D/M kept with the pulse "-?-" (Philips, [S2] p. 57) or
// the mean only with S/D invalid (Saadat, research/06 §4.1: "static pressure hides SYS/DIA and shows a larger mean").
import type { Measured } from '../../types.ts';
import { createPulseDet, DET_RATE, MISSED_AVG_N, MISSED_LIMIT, pulseRate, pulseStep, type PulseDetState } from '../pulse/detector.ts';

export const AVG_BEATS = 6; // 4–8 beats (brief §4.2) [ENG]
const RING = 400; // 3.2 s at 125 Hz: the longest beat measured (HR ≥ 19)
const STALE_S = 6; // no beat for 6 s → non-pulsatile [ENG]
/** Pulse rate < 25/min or amplitude < 3 mmHg is non-pulsatile (research/05 §6 [S2] p. 57). */
export const NONPULSATILE = { minRateBpm: 25, minAmpMmHg: 3 } as const;
/** A line that started sampling searches this long before it calls itself static (Saadat "IBP1 SEARCH") [ENG]. */
export const SEARCH_S = 10;
/**
 * A static line is pulsatile again only after this long of pulsatile beats — at MAP 13 / PP 3 one ventilator swing
 * taken for a beat flipped ABP NON-PULSATILE off for 1 s every 5 s [ENG].
 */
export const REPULSE_S = 3;
/**
 * Amplitude hysteresis on the 3 mmHg rule — a static line is pulsatile again only at this amplitude (a case at PP
 * 3–4 mmHg flipped pulsatile ↔ static ≈ 10 times in 11 min on the single 3 mmHg threshold) [ENG].
 */
export const REPULSE_AMP_MMHG = 4;
/**
 * A pulse's own window (pleth). The perfusion index is the pulsatile (AC) over the non-pulsatile (DC) signal of ONE
 * pulse (Lima AP, Beelen P, Bakker J, Crit Care Med 2002;30:1210–1213: PI = AC/DC × 100 per pulse; the Masimo SET
 * definition). When the detector misses a foot, the interval to the next found foot spans two or more pulses and its
 * max − min is not one pulse's amplitude (in a low-flow tamponade run the interval 755.78–758.34 s spanned two pulses
 * and read 0.336 — a missed pulse's peak over the found one's trough — among pulses of 0.20–0.25; the found pulse's own
 * amplitude is 0.168). The interval holds a missed beat when it exceeds the RR MISSED LIMIT (detector.ts MISSED_LIMIT,
 * Pan & Tompkins 1985); the pulse is then measured over one average period from its own foot — its upstroke, peak and
 * run-off, as a pulse whose next foot had been found. The pressure lines do not use it: over a genuine long diastole
 * one median period would truncate the diastole (MAP 71 → 83 at an HR step 120 → 40 in the 2026-10-27 shadow run), and
 * the arterial line's detector recovers the missed pulse itself (detector.ts search-back).
 */
export { MISSED_LIMIT };

export interface BeatValues {
  t: number; // foot time of the beat's end (s)
  sys: number;
  dia: number;
  mean: number;
  dur: number; // s
}

export interface WaveNumerics {
  det: PulseDetState;
  ring: number[];
  n: number; // absolute index of the next sample
  prevFoot: number;
  beats: BeatValues[];
  feet: number[]; // foot times (s), last 10
  /** Absolute index of the first sample of this sampling run (absent in older snapshots). */
  first?: number;
  /** The line has shown a static pressure; since when its beats are pulsatile again (REPULSE_S). */
  wasStatic?: boolean;
  pulsSince?: number;
  /**
   * How a static pressure is shown (skin `ibp.staticDisplay`, set by the engine): 'keep' = S/D/M stay, only the pulse
   * is "-?-" (Philips, research/05 §6 [S2] IFU p. 57); 'mean-only' = S/D invalid, the mean shown (Saadat, research/06
   * §4.1). Absent = 'mean-only'.
   */
  staticDisplay?: 'keep' | 'mean-only';
}

export function createWaveNumerics(floor: number): WaveNumerics {
  return { det: createPulseDet(floor), ring: new Array<number>(RING).fill(0), n: 0, prevFoot: -1, beats: [], feet: [] };
}

/** The end (absolute sample index) of the pulse whose foot is p: the next found foot f, or p + one average period when
 *  [p, f) holds a missed beat (MISSED_LIMIT). `feet` (s) ends with f. */
function ownPulseEnd(feet: readonly number[], p: number, f: number): number {
  const iv: number[] = [];
  for (let i = feet.length - 2; i > 0 && iv.length < MISSED_AVG_N; i--) iv.push((feet[i] as number) - (feet[i - 1] as number));
  if (iv.length === 0) return f;
  iv.sort((a, b) => a - b);
  const mid = iv.length >> 1;
  const period = (iv.length % 2 ? (iv[mid] as number) : ((iv[mid - 1] as number) + (iv[mid] as number)) / 2) * DET_RATE;
  return f - p > MISSED_LIMIT * period ? Math.min(f, p + Math.round(period)) : f;
}

/** Feed one displayed sample (absolute index m, 125 Hz). Returns the completed beat, if any. `ownPulse` (the pleth):
 *  a beat's amplitude is its own pulse's, never the max − min of an interval that spans missed beats (MISSED_LIMIT).
 *  `searchBack` (the systemic arterial line): the detector recovers a missed pulse itself (detector.ts `pulseStep`). */
export function numericsStep(wn: WaveNumerics, m: number, x: number, ownPulse = false, searchBack = false): BeatValues | null {
  if (wn.n !== m) {
    // a gap (sensor detached/re-attached): restart detection at m
    wn.det = createPulseDet(wn.det.floor, m);
    wn.prevFoot = -1;
    wn.first = m;
  }
  wn.first ??= m;
  wn.n = m + 1;
  wn.ring[m % RING] = x;
  const f = pulseStep(wn.det, x, searchBack);
  if (f < 0) return null;
  wn.feet.push(f / 125);
  if (wn.feet.length > 10) wn.feet.shift();
  const p = wn.prevFoot;
  wn.prevFoot = f;
  // A beat whose foot precedes this sampling run (the restarted detector's zero-filled history places the first foot
  // before the restart) would average samples from before the gap — dropped
  if (p < 0 || p < (wn.first ?? 0) || f - p < 25 || f - p > RING - 16 || m - p >= RING) return null;
  const end = ownPulse ? ownPulseEnd(wn.feet, p, f) : f;
  let mx = -Infinity;
  let mn = Infinity;
  let sum = 0;
  for (let k = p; k < end; k++) {
    const v = wn.ring[k % RING] as number;
    if (v > mx) mx = v;
    if (v < mn) mn = v;
    sum += v;
  }
  const b = { t: f / 125, sys: mx, dia: mn, mean: sum / (end - p), dur: (f - p) / 125 };
  wn.beats.push(b);
  if (wn.beats.length > AVG_BEATS) wn.beats.shift();
  return b;
}

/** The beats that ended in the last STALE_S seconds (pre-arrest beats are never re-averaged). */
function freshBeats(wn: WaveNumerics, t: number): BeatValues[] {
  return wn.beats.filter((b) => t - b.t <= STALE_S);
}

/** Pulsatile per the Philips rule (≥ 2 fresh beats, amplitude ≥ 3 mmHg — `minAmp`, rate ≥ 25/min). */
export function isPulsatile(beats: readonly BeatValues[], minAmp: number = NONPULSATILE.minAmpMmHg): boolean {
  if (beats.length < 2) return false;
  const amp = beats.reduce((a, b) => a + (b.sys - b.dia), 0) / beats.length;
  const dur = beats.reduce((a, b) => a + b.dur, 0) / beats.length;
  return amp >= minAmp && 60 / dur >= NONPULSATILE.minRateBpm;
}

const INVALID = (t: number): Measured => ({ value: null, flag: 'invalid', at: t });

/**
 * Sys/dia/mean at time t (call once per second) and whether the line is pulsatile: the average of the fresh beats when
 * pulsatile; otherwise a STATIC pressure over the last 2 s — per the skin, S/D/M of the waveform kept (`'keep'`,
 * Philips: a flat line reads "20/19 (20)", only the pulse is "-?-") or the mean only with S/D invalid (`'mean-only'`,
 * Saadat). Within SEARCH_S of the line starting to sample, a non-pulsatile line is still searching: all invalid (no
 * `ABPd 0<50` at power-on). A static line is pulsatile again after REPULSE_S of beats of at least REPULSE_AMP_MMHG
 * (amplitude and time hysteresis).
 */
export function pressureNumerics(wn: WaveNumerics, t: number): { sys: Measured; dia: Measured; mean: Measured; pulsatile: boolean } {
  const fresh = freshBeats(wn, t);
  const puls = isPulsatile(fresh, wn.wasStatic ? REPULSE_AMP_MMHG : NONPULSATILE.minAmpMmHg);
  wn.pulsSince = puls ? (wn.pulsSince ?? t) : undefined;
  if (puls && (!wn.wasStatic || t - (wn.pulsSince as number) >= REPULSE_S)) {
    wn.wasStatic = false;
    const avg = (k: 'sys' | 'dia' | 'mean') => fresh.reduce((a, b) => a + b[k], 0) / fresh.length;
    return {
      sys: { value: avg('sys'), flag: 'valid', at: t },
      dia: { value: avg('dia'), flag: 'valid', at: t },
      mean: { value: avg('mean'), flag: 'valid', at: t },
      pulsatile: true,
    };
  }
  const sampled = wn.n - (wn.first ?? 0);
  if (sampled < SEARCH_S * 125) return { sys: INVALID(t), dia: INVALID(t), mean: INVALID(t), pulsatile: false };
  wn.wasStatic = true;
  const n = 250; // the static pressure over the last 2 s
  let sum = 0;
  let mx = -Infinity;
  let mn = Infinity;
  for (let k = wn.n - n; k < wn.n; k++) {
    const v = wn.ring[k % RING] as number;
    sum += v;
    if (v > mx) mx = v;
    if (v < mn) mn = v;
  }
  const mean: Measured = { value: sum / n, flag: 'valid', at: t };
  if (wn.staticDisplay !== 'keep') return { sys: INVALID(t), dia: INVALID(t), mean, pulsatile: false };
  return { sys: { value: mx, flag: 'valid', at: t }, dia: { value: mn, flag: 'valid', at: t }, mean, pulsatile: false };
}

/** PI: mean peak-to-trough of the last beats of a pleth WaveNumerics. */
export function piNumeric(wn: WaveNumerics, t: number): Measured {
  const fresh = freshBeats(wn, t); // Fresh pulses only, as for pressures
  if (fresh.length === 0) return { value: null, flag: 'invalid', at: t };
  return { value: fresh.reduce((a, b) => a + (b.sys - b.dia), 0) / fresh.length, flag: 'valid', at: t };
}

/** Pulse rate from a WaveNumerics' feet (brief §6.1 PR: its own average, response ≤ 20 s). */
export function prNumeric(wn: WaveNumerics, t: number): Measured {
  const lastFoot = wn.feet[wn.feet.length - 1];
  const pr = pulseRate(wn.feet);
  if (pr === null || lastFoot === undefined || t - lastFoot > STALE_S) return { value: null, flag: 'invalid', at: t };
  return { value: Math.round(pr), flag: 'valid', at: t };
}
