// Device heart rate (brief §6.1 "HR"; research 03 §1.12):
//   average the last 12 RR, dropping the max and the min (IEC-style; the Philips-like skin uses the plain
//   mean of 12); if the last 3 RR are all > 1200 ms use the last 4; update at most once per second.
// Asystole: with no QRS for 4.0 s (Philips adult asystole delay, brief §6.4) the HR reads 0.
// The "up to 8 RR during PVC runs" rule needs arrhythmia classification and arrives in Stage 4.
// FU-1 (E-4a-2): a skin may set `hr.averaging: { kind: 'beats' | 'seconds', n }` — the plain mean of the last n RR,
// or of the RR ending in the last n seconds (at least the last 2). Without it the HR is computed as above.
import type { Measured } from '../types.ts';

export type HrMethod = 'dropMaxMin' | 'mean12';

export const HR_WINDOW = 12;
/** RR kept for the averaging option (the longest 'beats' window; 'seconds' windows up to 60 s at ≥ 64 bpm). */
const RR_KEEP = 64;

/** Skin `hr.averaging` (FU-1, E-4a-2). */
export interface HrAveraging {
  kind: 'beats' | 'seconds';
  n: number;
}

/** The skin's HR averaging option, or undefined (the default method). */
export function hrAveragingOf(skin: { hr: { averaging?: HrAveraging } }): HrAveraging | undefined {
  return skin.hr.averaging;
}
const SLOW_RR_S = 1.2;
const ASYSTOLE_S = 4.0;
const MIN_RR_S = 0.2; // shorter intervals are double counts and are ignored

export interface HrState {
  method: HrMethod;
  rrs: number[]; // seconds, oldest first, at most HR_WINDOW
  lastR: number; // sim seconds of the last detected R, or -1
  /** FU-1 averaging option: the last RR_KEEP RR and the R time ending each (absent in pre-FU-1 snapshots). */
  long?: { rr: number[]; end: number[] };
}

export function createHrState(method: HrMethod = 'dropMaxMin'): HrState {
  return { method, rrs: [], lastR: -1 };
}

/** Feed one detected R time (sim seconds). */
export function hrOnQrs(st: HrState, tR: number): void {
  if (st.lastR >= 0) {
    const rr = tR - st.lastR;
    if (rr < MIN_RR_S) return;
    st.rrs.push(rr);
    if (st.rrs.length > HR_WINDOW) st.rrs.shift();
    const h = (st.long ??= { rr: [], end: [] });
    h.rr.push(rr);
    h.end.push(tR);
    if (h.rr.length > RR_KEEP) {
      h.rr.shift();
      h.end.shift();
    }
  }
  st.lastR = tR;
}

/** The HR numeric at time t (call once per second); `avg` is the skin's optional averaging (FU-1). */
export function hrMeasure(st: HrState, t: number, avg?: HrAveraging): Measured {
  if (st.lastR >= 0 && t - st.lastR >= ASYSTOLE_S) return { value: 0, flag: 'valid', at: t };
  if (avg) return averaged(st, t, avg);
  const rrs = st.rrs;
  if (rrs.length < 2) return { value: null, flag: 'invalid', at: t };
  const last3 = rrs.slice(-3);
  let sel: number[];
  if (last3.length === 3 && last3.every((rr) => rr > SLOW_RR_S)) sel = rrs.slice(-4);
  else if (st.method === 'dropMaxMin' && rrs.length >= 4) {
    const sorted = [...rrs].sort((a, b) => a - b);
    sel = sorted.slice(1, -1);
  } else sel = rrs;
  const mean = sel.reduce((a, b) => a + b, 0) / sel.length;
  return { value: Math.round(60 / mean), flag: 'valid', at: t };
}

function averaged(st: HrState, t: number, avg: HrAveraging): Measured {
  const { rr, end } = st.long ?? { rr: [], end: [] };
  if (rr.length < 2) return { value: null, flag: 'invalid', at: t };
  let from: number;
  if (avg.kind === 'beats') from = rr.length - Math.max(1, Math.round(avg.n));
  else {
    from = rr.length;
    while (from > 0 && (end[from - 1] as number) > t - avg.n) from--;
    from = Math.min(from, rr.length - 2); // at least the last 2 RR, so slow rates still read
  }
  const sel = rr.slice(Math.max(0, from));
  const mean = sel.reduce((a, b) => a + b, 0) / sel.length;
  return { value: Math.round(60 / mean), flag: 'valid', at: t };
}
