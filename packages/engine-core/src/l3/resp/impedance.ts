// Impedance respiration (brief §4.7; research 03 §7): the `resp` channel is chest volume (relative to a 500 mL
// breath) plus a cardiogenic ripple at the heart rate (5–20 % of a normal breath, band 0.3–2.5 Hz) — and its own
// detector: an adaptive threshold on a high-passed signal, so ripple can be counted when breaths are shallow
// (apnoea postponed, as on a real monitor). Also the pleth-derived RR estimator (brief §6.2 fallback source).
import type { Measured } from '../../types.ts';

export const RIPPLE_FRACTION = 0.1; // cardiogenic ripple = 10 % of a 500 mL breath (5–20 %) [ENG]
export const IMP_HP_TAU_S = 4; // high-pass removing drift [ENG]
export const IMP_THRESHOLD = 0.35; // fraction of the recent breath amplitude [ENG]
export const IMP_FLOOR = 0.08; // absolute floor (ripple 0.1 exceeds it once breaths vanish) [ENG]
export const IMP_APNOEA_S = 20; // impedance apnoea 20 s (Philips; saadat 10 s) (brief §4.4)
export const IMP_INTERVALS = 6;

export interface ImpNum {
  mean: number; // high-pass state
  amp: number; // recent breath amplitude (decaying)
  high: boolean;
  peak: number;
  edges: number[];
  apnoea: boolean;
}

export function createImpNum(): ImpNum {
  return { mean: 0, amp: 1, high: false, peak: 0, edges: [], apnoea: false };
}

/**
 * Impedance sample (arbitrary units, 1 = 500 mL breath) from chest volume and beat times. The default 10 %
 * ripple stays under the detector floor; a larger one (20 %: small or obese chests) is counted once breaths are
 * shallow or absent, postponing the apnoea alarm as on a real monitor (research 03 §7).
 */
export function impedanceSample(volMl: number, t: number, beats: readonly number[], ripple = RIPPLE_FRACTION): number {
  let r = 0;
  for (const tb of beats) {
    const z = (t - tb - 0.2) / 0.12;
    if (z > -4 && z < 4) r += Math.exp(-z * z);
  }
  return volMl / 500 + ripple * r;
}

export function impStep(st: ImpNum, t: number, x: number, dt: number): 'apnoea' | 'resumed' | null {
  st.mean += (x - st.mean) * (1 - Math.exp(-dt / IMP_HP_TAU_S));
  const y = x - st.mean;
  st.amp = Math.max(Math.abs(y) * 2, st.amp * Math.exp(-dt / 8));
  const thr = Math.max(IMP_FLOOR, IMP_THRESHOLD * st.amp * 0.5);
  let ev: 'apnoea' | 'resumed' | null = null;
  if (!st.high && y > thr) {
    st.high = true;
    st.edges.push(t);
    if (st.edges.length > IMP_INTERVALS + 1) st.edges.shift();
    if (st.apnoea) {
      st.apnoea = false;
      ev = 'resumed';
    }
  } else if (st.high && y < 0) st.high = false;
  const last = st.edges[st.edges.length - 1] ?? 0; // the timer starts at power-on
  if (!st.apnoea && t - last > IMP_APNOEA_S) {
    st.apnoea = true;
    ev = 'apnoea';
  }
  return ev;
}

export function impRr(st: ImpNum, t: number): Measured {
  const e = st.edges;
  if (st.apnoea) return { value: 0, flag: 'valid', at: t };
  if (e.length < 3) return { value: null, flag: 'invalid', at: t };
  return { value: Math.round((60 * (e.length - 1)) / ((e[e.length - 1] as number) - (e[0] as number))), flag: 'valid', at: t };
}

/**
 * Pleth-derived RR (research 03 §7 "RRp"): count the respiratory cycles of the pulse-amplitude series (RIAV).
 * `beats` are completed pleth beats {t, amp}; the series is detrended with its mean over the window and the
 * upward zero crossings are counted (≥ 2 needed). Slow by design (a 30–60 s window).
 */
export function plethRr(beats: ReadonlyArray<{ t: number; amp: number }>, t: number, windowS = 60): number | null {
  const w = beats.filter((b) => b.t > t - windowS);
  if (w.length < 8) return null;
  const m = w.reduce((a, b) => a + b.amp, 0) / w.length;
  const s = w.map((b) => b.amp - m);
  // smooth over 3 beats so a single beat's jitter does not make a crossing
  const sm = s.map((_, i) => ((s[i - 1] ?? s[i] as number) + (s[i] as number) + (s[i + 1] ?? s[i] as number)) / 3);
  const cross: number[] = [];
  for (let i = 1; i < sm.length; i++) if ((sm[i - 1] as number) < 0 && (sm[i] as number) >= 0) cross.push((w[i] as { t: number }).t);
  if (cross.length < 3) return null;
  return (60 * (cross.length - 1)) / ((cross[cross.length - 1] as number) - (cross[0] as number));
}
