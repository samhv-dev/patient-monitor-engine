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
  /** FU-8 (DV-13d): the previous cycle, while its deflation is still owed (−1 = none). */
  prevInflateAt?: number;
  prevDeflateAt?: number;
}

export function createIabp(): IabpState {
  return { kind: 'iabp', on: false, ratio: 1, volumeMl: IABP_VOLUME_ML, inflateOffsetMs: 0, deflateOffsetMs: 0, beatN: 0, inflateAt: -1, deflateAt: -1 };
}

/**
 * A beat starting at beatT (R) with RR rr and the previous beat's aortic closure at avCloseS after its onset:
 * inflate at the dicrotic notch (beatT + avCloseS) + offset; deflate before the next R + offset. Every ratio-th beat.
 * (The R wave stands in for the valve opening; the hemo pipeline uses `iabpSchedule` with the valve events.)
 */
export function iabpOnBeat(d: IabpState, beatT: number, rr: number, avCloseS: number): void {
  iabpSchedule(d, beatT, rr, beatT - rr + avCloseS, beatT - rr);
}

/**
 * FU-8 (research/20 DV-13d, DV-M5; the tables' §8.1 pressure trigger): schedule the next balloon cycle at `now`, when a
 * beat has completed. `notchT` / `openT` are the absolute times of the LAST aortic-valve closure and opening; each is
 * carried forward by whole R–R intervals `rr` to the first one still to come: inflate at the next notch (+ offset),
 * deflate so the balloon is empty IABP_DEFLATE_LEAD_S before the next opening (+ offset). Before, the schedule was
 * built from the completed beat record (R + the record's own closure): in the MANUAL cardiogenic-shock rig, whose
 * ejection starts ≈ 400 ms after R and spills into the next record, every "correctly timed" balloon deflated ≈ 270 ms
 * AFTER the valve opened. A deflation still owed by the previous cycle is KEPT (brought forward to end before the new
 * inflation if it had not begun): overwriting it left up to 40 mL in the aorta, 7 of 63 cycles a minute in the HFrEF +
 * MI rig, and the patient arrested at +8.8 min. Every ratio-th beat.
 */
export function iabpSchedule(d: IabpState, now: number, rr: number, notchT: number, openT: number): void {
  if (!d.on) return;
  d.beatN++;
  if ((d.beatN - 1) % d.ratio !== 0) return;
  const next = (x: number, t: number): number => (x > t ? x : x + rr * Math.ceil((t - x) / rr + 1e-9));
  const inflateAt = Math.max(now, next(notchT, now) + d.inflateOffsetMs / 1000);
  const deflateAt = next(openT, inflateAt) - IABP_DEFLATE_LEAD_S - IABP_DEFLATE_S + d.deflateOffsetMs / 1000;
  if (deflateAt < inflateAt + IABP_INFLATE_S) return; // no diastole to fill this cycle
  // an owed deflation is never later than just before the new inflation (and never earlier than now)
  const owe = (defl: number): number => (now >= defl ? defl : Math.max(now, Math.min(defl, inflateAt - IABP_DEFLATE_S)));
  if (d.inflateAt >= 0 && now >= d.inflateAt) {
    // the current balloon has inflated: it becomes the previous cycle while its deflation is owed
    const owed = now < d.deflateAt + IABP_DEFLATE_S;
    d.prevInflateAt = owed ? d.inflateAt : -1;
    d.prevDeflateAt = owed ? owe(d.deflateAt) : -1;
  } else if ((d.prevInflateAt ?? -1) >= 0) {
    d.prevDeflateAt = owe(d.prevDeflateAt as number); // a cycle that never inflated is dropped; an older owed one stays
  }
  d.inflateAt = inflateAt;
  d.deflateAt = deflateAt;
}

const halfSine = (u: number, dur: number) => (u >= 0 && u < dur ? (Math.PI / (2 * dur)) * Math.sin((Math.PI * u) / dur) : 0);

/** Balloon dV/dt (mL/s): + during inflation, − during deflation (the owed deflation of the previous cycle included). */
export function iabpFlow(d: IabpState, t: number): number {
  const prev = (d.prevInflateAt ?? -1) >= 0 ? halfSine(t - (d.prevInflateAt as number), IABP_INFLATE_S) - halfSine(t - (d.prevDeflateAt as number), IABP_DEFLATE_S) : 0;
  if (d.inflateAt < 0) return d.volumeMl * prev; // (a stopped pump still finishes the deflation it owes: volume is conserved)
  return d.volumeMl * (halfSine(t - d.inflateAt, IABP_INFLATE_S) - halfSine(t - d.deflateAt, IABP_DEFLATE_S) + prev);
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
