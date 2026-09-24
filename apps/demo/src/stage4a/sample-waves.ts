// Sample SHAPES for the skin preview only (not physiology; Stages 2–3 own the real pleth/IBP/CO2/resp models).
// Each returns a value in 0..1 at time t (s) so a lane can scale it to its height.
import type { LaneId } from '@pme/skins';

const HR_HZ = 75 / 60;
const RR_HZ = 15 / 60;
const frac = (x: number) => x - Math.floor(x);
const bump = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));

export function pulseShape(t: number): number {
  const p = frac(t * HR_HZ);
  return Math.min(1, bump(p, 0.18, 0.08) + 0.35 * bump(p, 0.45, 0.1));
}

export function respShape(t: number): number {
  return 0.5 + 0.45 * Math.sin(2 * Math.PI * RR_HZ * t);
}

export function co2Shape(t: number): number {
  const p = frac(t * RR_HZ);
  if (p < 0.05) return p / 0.05;
  if (p < 0.4) return 0.9 + 0.1 * ((p - 0.05) / 0.35);
  if (p < 0.45) return 1 - (p - 0.4) / 0.05;
  return 0;
}

export function shapeFor(lane: LaneId): ((t: number) => number) | null {
  if (lane.startsWith('ECG')) return null; // ECG comes from the engine
  if (lane === 'RESP') return respShape;
  if (lane === 'CO2') return co2Shape;
  return pulseShape; // PLETH, ART, CVP, PAP, IBP1–4
}

/** Sample rate of the preview shapes: 125 Hz like the engine's pressure/pleth channels (brief §3.5). */
export const SHAPE_RATE = 125;
