// Mechanical support devices as circuit elements (R42; R28; tables §8.1–§8.2). The seam: a device contributes a
// volume source in the aorta (IABP), an LV → aorta pump flow (LVAD), or — 7h — a venous → arterial pump flow
// (VA-ECMO, CPB). Devices are plain data; their flow functions are built per interval by the hemo pipeline.

export interface CircuitDevice {
  kind: 'iabp' | 'lvad' | 'vaEcmo' | 'cpb';
  on: boolean;
}

// --- IABP (tables §8.1: 40 mL, trigger ECG/pressure, 1:1–1:3, timing errors) ---
export const IABP_VOLUME_ML = 40;
export const IABP_INFLATE_S = 0.08;
export const IABP_DEFLATE_S = 0.06;
/** Default deflation lead before the next R (so the balloon is empty at aortic opening) [ENG]. */
export const IABP_DEFLATE_LEAD_S = 0.04;

export interface IabpState extends CircuitDevice {
  kind: 'iabp';
  ratio: 1 | 2 | 3;
  volumeMl: number;
  inflateOffsetMs: number; // − = early (inflation in systole), + = late
  deflateOffsetMs: number; // − = early (U-shaped dip), + = late (LV ejects against the balloon)
  beatN: number;
  inflateAt: number;
  deflateAt: number;
}

export function createIabp(): IabpState {
  return { kind: 'iabp', on: false, ratio: 1, volumeMl: IABP_VOLUME_ML, inflateOffsetMs: 0, deflateOffsetMs: 0, beatN: 0, inflateAt: -1, deflateAt: -1 };
}

/**
 * A beat starting at beatT (R) with RR rr and the previous beat's aortic closure at avCloseS after its onset:
 * inflate at the dicrotic notch (beatT + avCloseS) + offset; deflate before the next R + offset. Every ratio-th beat.
 */
export function iabpOnBeat(d: IabpState, beatT: number, rr: number, avCloseS: number): void {
  if (!d.on) return;
  d.beatN++;
  if ((d.beatN - 1) % d.ratio !== 0) return;
  d.inflateAt = beatT + avCloseS + d.inflateOffsetMs / 1000;
  d.deflateAt = beatT + rr - IABP_DEFLATE_LEAD_S - IABP_DEFLATE_S + d.deflateOffsetMs / 1000;
}

const halfSine = (u: number, dur: number) => (u >= 0 && u < dur ? (Math.PI / (2 * dur)) * Math.sin((Math.PI * u) / dur) : 0);

/** Balloon dV/dt (mL/s): + during inflation, − during deflation. */
export function iabpFlow(d: IabpState, t: number): number {
  if (d.inflateAt < 0) return 0; // (a stopped pump still finishes the deflation it owes: volume is conserved)
  return d.volumeMl * (halfSine(t - d.inflateAt, IABP_INFLATE_S) - halfSine(t - d.deflateAt, IABP_DEFLATE_S));
}

/** Stop at time t: an inflated balloon deflates now; an inflation not yet begun is cancelled. */
export function iabpStop(d: IabpState, t: number): void {
  d.on = false;
  if (d.inflateAt < 0) return;
  if (t < d.inflateAt) d.inflateAt = -1;
  else if (t < d.deflateAt) d.deflateAt = t;
}

// --- LVAD (tables §8.2: HeartMate-3-like continuous flow, 5400 rpm, 4–6 L/min; suction when the LV empties) ---
export const LVAD_RPM = 5400;
export const LVAD_KH = 0.45; // mL/s per mmHg of (P_ao − P_LV) [ENG HQ slope]
export const LVAD_SUCTION_ML = 40; // LV volume below which the inflow cannula sucks (tables §8.2) [ENG]

export interface LvadState extends CircuitDevice {
  kind: 'lvad';
  rpm: number;
  suction: boolean;
  qMin: number;
  qMax: number;
  qSum: number;
  n: number;
}

export function createLvad(): LvadState {
  return { kind: 'lvad', on: false, rpm: LVAD_RPM, suction: false, qMin: Infinity, qMax: -Infinity, qSum: 0, n: 0 };
}

/** Pump flow LV → aorta (mL/s) at LV pressure pLv, aortic pressure pAo and LV volume vLv (mL). */
export function lvadFlow(d: LvadState, pLv: number, pAo: number, vLv: number): number {
  if (!d.on) return 0;
  const q0 = 0.022 * d.rpm - 30;
  let q = Math.max(0, q0 - LVAD_KH * (pAo - pLv));
  d.suction = vLv < LVAD_SUCTION_ML;
  if (d.suction) q *= 0.3;
  d.qMin = Math.min(d.qMin, q);
  d.qMax = Math.max(d.qMax, q);
  d.qSum += q;
  d.n++;
  return q;
}

/** Console numerics over the interval since the last call (flow L/min, PI, power W), then reset the window. */
export function lvadNumerics(d: LvadState): { flowLpm: number; pi: number; powerW: number } {
  const mean = d.n > 0 ? d.qSum / d.n : 0;
  const out = { flowLpm: mean * 0.06, pi: mean > 0 ? ((d.qMax - d.qMin) / mean) * 10 : 0, powerW: 0.8 + mean * 0.06 * 0.7 };
  d.qMin = Infinity;
  d.qMax = -Infinity;
  d.qSum = 0;
  d.n = 0;
  return out;
}

// --- VA-ECMO / CPB (R42 interface; implemented in 7h) ---
export interface BypassDevice extends CircuitDevice {
  kind: 'vaEcmo' | 'cpb';
  flowLpm: number;
}
export function bypassFlow(_d: BypassDevice, _pSv: number, _pAo: number): number {
  throw new Error('VA-ECMO/CPB arrive in Stage 7h');
}
