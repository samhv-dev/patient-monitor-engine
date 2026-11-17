// The brain's energy state (docs/plans/brain-energy-consciousness-recovery.md §1): one entry per compartment, stepped on
// the brain's 10 Hz grid from the organ model's own flow and blood gases, and read by the EEG. Every compartment shares
// these equations; only its thresholds (data) differ.
//   delivery = CBF/CBF0 × CaO2 ÷ the reference CaO2
//   metabolic = the share of function lost: 0 above the compartment's abnormal delivery, 1 below its failure level,
//               linear between;  fn = 1 − metabolic
import { caO2 } from './flow.ts';
import { DO2_EEG_ABNORMAL, DO2_EEG_LOST } from './params.ts';

/** A compartment's delivery thresholds, relative to normal delivery. */
export interface Compartment {
  /** Function starts to fail below this delivery. */
  abnormal: number;
  /** Function is gone below this delivery. */
  lost: number;
}
export const CORTEX: Compartment = { abnormal: DO2_EEG_ABNORMAL, lost: DO2_EEG_LOST };

/** What every compartment publishes. */
export interface EnergyEntry {
  /** O2 delivery relative to normal (1 = normal). */
  delivery: number;
  /** Function, 0–1 (1 = normal). */
  fn: number;
}
/** The cortex also publishes its loss of function as the EEG reads it. */
export interface CortexEntry extends EnergyEntry {
  metabolic: number;
}
export interface BrainEnergy {
  cortex: CortexEntry;
}
/** The blood supply a compartment sees: flow relative to normal and the arterial O2 content's terms. */
export interface Supply {
  cbfRel: number;
  hb: number;
  sao2: number;
  pao2: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** O2 delivery relative to normal: CBF/CBF0 × CaO2 ÷ the brain model's reference CaO2 (Hb 14, SaO2 0.97, PaO2 95). */
export function brainDo2Rel(cbfRel: number, hb: number, sao2: number, pao2: number): number {
  return (Math.max(0, cbfRel) * caO2(hb, sao2, pao2)) / caO2(14, 0.97, 95);
}

/** The share of a compartment's function lost at `delivery`. */
export function functionLoss(delivery: number, c: Compartment): number {
  return clamp01((c.abnormal - delivery) / (c.abnormal - c.lost));
}

export function createBrainEnergy(): BrainEnergy {
  return { cortex: { delivery: 1, fn: 1, metabolic: 0 } };
}

/** Set the energy state from the supply now (no stored energy yet: each entry follows its delivery). */
export function stepBrainEnergy(e: BrainEnergy, s: Supply): void {
  const delivery = brainDo2Rel(s.cbfRel, s.hb, s.sao2, s.pao2);
  const metabolic = functionLoss(delivery, CORTEX);
  e.cortex.delivery = delivery;
  e.cortex.metabolic = metabolic;
  e.cortex.fn = 1 - metabolic;
}
