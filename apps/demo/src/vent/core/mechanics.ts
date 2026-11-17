// Respiratory mechanics from the breath record and the holds (plan vent-skin-edp-ts.md §3.3 GD16, GD17, GX13): the
// formulas the EDP-TS manual states (research/57 K-15, K-16, N-07 to N-12, N-16), pure, in the device's units:
// volumes mL, pressures cmH2O, compliance mL/cmH2O, resistance cmH2O/(L/s), times s, minute volumes L/min.
import type { BreathRecord, HoldResult } from './types.ts';

/** Static compliance: VT / (Pplateau − PEEP total) (K-16). */
export const staticCompliance = (insp: HoldResult, peepTotal: number): number => (insp.breath?.vtMl ?? Number.NaN) / (insp.paw - peepTotal);

/** Inspiratory resistance: (Pmax − Pplateau) / (VT / Ti), Ti the inspiratory flow's time (K-16). */
export const inspiratoryResistance = (insp: HoldResult): number => {
  const b = insp.breath;
  return b ? (b.pmax - insp.paw) / (b.vtMl / 1000 / b.tiFlow) : Number.NaN;
};

/** Expiratory resistance: TCexp / static compliance (K-16). */
export const expiratoryResistance = (tcexp: number, cstMl: number): number => tcexp / (cstMl / 1000);

/** Dynamic compliance of a breath: VT / (Pmax − PEEP) (K-16, N-12). */
export const dynamicCompliance = (b: BreathRecord, peep: number): number => b.vtMl / (b.pmax - peep);

/** Intrinsic PEEP: the end-expiratory occlusion's pressure minus the set PEEP (K-15). */
export const autoPeep = (exp: HoldResult): number => exp.paw - exp.peep;

/**
 * PEEP total for a plateau made at `peep` in `mode`: the last end-expiratory occlusion's pressure when it was made at the
 * same set PEEP in the same mode, otherwise the measured PEEP of the last breath (R-23), which has no intrinsic part.
 */
export const peepTotal = (exp: HoldResult | null, peep: number, mode: string, last: BreathRecord | null): number =>
  exp && exp.peep === peep && exp.mode === mode ? exp.paw : last?.peepEnd ?? peep;

const span = (bs: readonly BreathRecord[]) => bs.reduce((s, b) => s + b.ti + b.te, 0);
/** A minute volume of the given breaths: their volume over their time (N-07, N-08), L/min. NaN with none. */
export const minuteVolume = (bs: readonly BreathRecord[]): number => (bs.length ? (bs.reduce((s, b) => s + b.vtMl, 0) / 1000) * (60 / span(bs)) : Number.NaN);
/** Breaths a minute of the given breaths, over their time (N-09). NaN with none. */
export const breathRate = (bs: readonly BreathRecord[]): number => (bs.length ? (60 * bs.length) / span(bs) : Number.NaN);
