// Respiratory mechanics from the breath record and the holds (plan vent-skin-edp-ts.md §3.3 GD16, GD17, GX13): the
// formulas the EDP-TS manual states (research/57 K-15, K-16, N-07 to N-12, N-16), pure, in the device's units:
// volumes mL, pressures cmH2O, compliance mL/cmH2O, resistance cmH2O/(L/s), times s, minute volumes L/min.
import { DT } from '@pme/ventilator';
import type { BreathRecord, HoldResult } from './types.ts';

/** Static compliance: VT / (Pplateau − PEEP total) (K-16). */
export const staticCompliance = (insp: HoldResult, peepTotal: number): number => (insp.breath?.vtMl ?? Number.NaN) / (insp.paw - peepTotal);

/**
 * Inspiratory resistance as the manual states it: (Pmax − Pplateau) / (VT / Ti), Ti the inspiratory flow's time (K-16).
 * VT / Ti is the mean inspiratory flow; Pmax − Pplateau is the resistance times the flow at the end of inspiration. The
 * two flows are one only when the ventilator gave the breath at a constant flow, so the value is the airway's resistance
 * for such a breath and NaN for any other (face.json mechanics.riFlow).
 */
export const inspiratoryResistance = (insp: HoldResult): number => {
  const b = insp.breath;
  return b?.constFlow ? (b.pmax - insp.paw) / (b.vtMl / 1000 / b.tiFlow) : Number.NaN;
};

/** Expiratory resistance: TCexp / static compliance (K-16), both of the one held breath. */
export const expiratoryResistance = (tcexp: number, cstMl: number): number => tcexp / (cstMl / 1000);

/** Dynamic compliance of a breath: VT / (Pmax − PEEP), the PEEP it was given at (K-16, N-12). */
export const dynamicCompliance = (b: BreathRecord): number => b.vtMl / (b.pmax - b.peep);

/** Intrinsic PEEP: the end-expiratory occlusion's pressure minus the set PEEP (K-15). */
export const autoPeep = (exp: HoldResult): number => exp.paw - exp.peep;

/**
 * PEEP total under the breath an inspiratory hold held: the pressure of the end-expiratory occlusion that ended where
 * that breath began (the compliance test's), otherwise the measured PEEP (R-23) of the breath before it, which has no
 * intrinsic part.
 */
export const peepTotal = (insp: HoldResult, exp: HoldResult | null): number =>
  exp && insp.breath && Math.abs(insp.breath.t0 - exp.t) < DT / 2 ? exp.paw : insp.breath?.peepBefore ?? insp.peep;

const span = (bs: readonly BreathRecord[]) => bs.reduce((s, b) => s + b.ti + b.te, 0);
/** A minute volume of the given breaths: their volume over their time (N-07, N-08), L/min. NaN with none. */
export const minuteVolume = (bs: readonly BreathRecord[]): number => (bs.length ? (bs.reduce((s, b) => s + b.vtMl, 0) / 1000) * (60 / span(bs)) : Number.NaN);
/** Breaths a minute of the given breaths, over their time (N-09). NaN with none. */
export const breathRate = (bs: readonly BreathRecord[]): number => (bs.length ? (60 * bs.length) / span(bs) : Number.NaN);
