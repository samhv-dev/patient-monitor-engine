// engine → vent: the R27 `lungState` event updates the ventilator's lung. Until Stage 7's profiles put COPD/ARDS
// mechanics into `lungState` itself, the comorbidity profile's mechanics are the BASE and lungState acts as a
// RELATIVE change from the engine's own baseline (the first lungState): bronchospasm ×4 resistance, endobronchial
// ×0.5 compliance, etc. autoPeepTendency switches on expiratory flow limitation; effort drives the patient's Pmus.
// shunt, dead space and FRC are passed through for display (the Dynamic Lung view).
import type { EngineEvent } from '@pme/engine-core';
import type { VentConfig, VentState } from './types.ts';

export type LungStateEvent = Extract<EngineEvent, { type: 'lungState' }>;
export const LUNG_KEYS = ['compliance', 'resistance', 'efl', 'eflSeverity', 'spont', 'pmus'] as const;
export type LungBase = Pick<VentConfig, (typeof LUNG_KEYS)[number]>;
export const lungBaseOf = (c: VentConfig): LungBase => ({ compliance: c.compliance, resistance: c.resistance, efl: c.efl, eflSeverity: c.eflSeverity, spont: c.spont, pmus: c.pmus });

export const EFFORT_PMUS_CMH2O = 8; // effort 1 → Pmus 8 cmH2O [ENG: the v1.9 default spontaneous effort is 6–8]

export interface LungLink {
  base: LungBase;
  ref: LungStateEvent | null; // the engine's first lungState (its own baseline)
  last: LungStateEvent | null;
}
export const createLungLink = (c: VentConfig): LungLink => ({ base: lungBaseOf(c), ref: null, last: null });

export function applyLungState(vs: VentState, ll: LungLink, ls: LungStateEvent): void {
  ll.ref ??= ls;
  ll.last = ls;
  const c = vs.cfg;
  const b = ll.base;
  c.compliance = Math.round(b.compliance * (ls.complianceMlPerCmH2O / ll.ref.complianceMlPerCmH2O));
  c.resistance = Math.round(b.resistance * (ls.resistanceCmH2OPerLps / ll.ref.resistanceCmH2OPerLps));
  const a = ls.autoPeepTendency;
  if (a > 0) {
    c.efl = true;
    c.eflSeverity = a >= 0.6 ? 'severe' : a >= 0.3 ? 'moderate' : b.efl ? b.eflSeverity : 'mild';
  } else {
    c.efl = b.efl;
    c.eflSeverity = b.eflSeverity;
  }
  // effort only ADDS a patient: a profile that breathes keeps its own effort
  c.spont = b.spont || ls.effort > 0.05;
  c.pmus = b.spont ? b.pmus : EFFORT_PMUS_CMH2O * ls.effort;
}
