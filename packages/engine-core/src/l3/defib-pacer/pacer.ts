// Transcutaneous pacer device (brief §6.5 "Pacer (TCP)"; research/05 §2.6): mode, rate, output, pause, and the
// instructor faults. It only decides the Modifiers.tcp the ECG draws (Stage 5 l2/ecg/tcp.ts: spikes, capture iff
// mA ≥ threshold, demand inhibition); captured beats carry k_rhythm 0.9, which Stage 2's haemodynamics ejects.
import type { PacerEvent } from '../../types-device.ts';
import type { TcpSpec } from '../../types.ts';
import type { DeviceProfile } from '../alarms/profile.ts';

export type PacerSpec = NonNullable<DeviceProfile['pacer']>;
/** Skins without a pacer take ZOLL-like values (research/05 §2.6) [ENG choice]. */
export const FALLBACK_PACER: PacerSpec = { rateDefault: 70, rateRange: [30, 180], mADefault: 0, mARange: [0, 140], mAStep: { up: 10, down: 5 }, modeDefault: 'demand', pausePct: null };
/** failureToCapture: a threshold no output reaches. */
export const NO_CAPTURE_MA = 1e6;

export interface PacerState {
  mode: 'off' | 'demand' | 'fixed';
  ratePpm: number;
  mA: number;
  paused: boolean;
  fault: 'none' | 'failureToSense' | 'failureToCapture';
}

export function createPacer(spec: PacerSpec): PacerState {
  return { mode: 'off', ratePpm: spec.rateDefault, mA: spec.mADefault, paused: false, fault: 'none' };
}

export function validatePacer(ev: PacerEvent, spec: PacerSpec): string | undefined {
  if (!['off', 'demand', 'fixed'].includes(ev.mode)) return 'pacer mode must be off, demand or fixed';
  const [r0, r1] = spec.rateRange;
  if (ev.ratePpm !== undefined && !(Number.isFinite(ev.ratePpm) && ev.ratePpm >= r0 && ev.ratePpm <= r1)) return `ratePpm must be ${r0}–${r1}`;
  const [m0, m1] = spec.mARange;
  if (ev.mA !== undefined && !(Number.isFinite(ev.mA) && ev.mA >= m0 && ev.mA <= m1)) return `mA must be ${m0}–${m1}`;
  if (ev.fault !== undefined && !['none', 'failureToSense', 'failureToCapture'].includes(ev.fault)) return 'fault must be none, failureToSense or failureToCapture';
  return undefined;
}

export function applyPacer(p: PacerState, ev: PacerEvent): void {
  p.mode = ev.mode;
  if (ev.ratePpm !== undefined) p.ratePpm = ev.ratePpm;
  if (ev.mA !== undefined) p.mA = ev.mA;
  if (ev.pause !== undefined) p.paused = ev.pause;
  if (ev.fault !== undefined) p.fault = ev.fault;
}

/**
 * The TCP modifier for this pacer state. Demand pacing turns asynchronous with failureToSense or when the ECG leads
 * are off (LIFEPAK-like "leads-off → automatic non-demand", research/05 §2.6). PAUSE paces at pausePct % of the rate
 * (LIFEPAK-like 25 %) or, where the skin has no pause rate, drops the output to 0 mA (ZOLL-like "0 when paused").
 */
export function tcpSpec(p: PacerState, spec: PacerSpec, thresholdMa: number, leadsOff: boolean): TcpSpec | null {
  if (p.mode === 'off') return null;
  const mode = p.fault === 'failureToSense' || leadsOff ? 'fixed' : p.mode;
  let ratePpm = p.ratePpm;
  let mA = p.mA;
  if (p.paused) {
    if (spec.pausePct !== null) ratePpm = (p.ratePpm * spec.pausePct) / 100;
    else mA = 0;
  }
  return { mode, ratePpm, mA, thresholdMa: p.fault === 'failureToCapture' ? NO_CAPTURE_MA : thresholdMa };
}
