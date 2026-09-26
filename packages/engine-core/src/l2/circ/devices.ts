// Mechanical support devices as circuit elements (R42; R28; tables §8.1–§8.2). The seam: a device contributes a
// volume source in the aorta (IABP), an LV → aorta pump flow (LVAD), or — 7h — a venous → arterial pump flow
// (VA-ECMO, CPB). Devices are plain data; their flow functions are built per interval by the hemo pipeline.
import { valveFlow } from './valves.ts';

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

// --- LVAD (tables §8.2; Task 21) and ECMO/CPB interfaces (7h) follow in this file. ---
export { valveFlow as _valveFlowForDevices };
