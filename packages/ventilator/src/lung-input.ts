// engine → vent: the R27 `lungState` event IS the patient's lung. Since Stage 7b the event carries ABSOLUTE values
// (7b plan decision 15) and Stage V.1 (G7b rulings 4+5+13) reads them so: compliance, inspiratory and expiratory
// resistance (flow limitation when R_exp > R_insp, expressed as v1.9's custom factor eflK = R_insp/R_exp with no PEEP
// stenting, exactly as the catalogue rows are), and the pleural pressure the lung must be re-opened against each
// breath (tension pneumothorax, mechanics.ts). The profile's `vent` lung — the catalogue row, generated from the
// same engine data — holds until the first lungState arrives, and stays the stand-alone ventilator's lung. `effort`
// drives the patient's Pmus; shunt, dead space and FRC stay engine-side (the Dynamic Lung view shows them).
import type { EngineEvent } from '@pme/engine-core';
import type { VentConfig, VentState } from './types.ts';

export type LungStateEvent = Extract<EngineEvent, { type: 'lungState' }>;
export const LUNG_KEYS = ['compliance', 'resistance', 'efl', 'eflSeverity', 'eflK', 'peepStent', 'pleural', 'spont', 'pmus'] as const;
export type LungBase = Pick<VentConfig, (typeof LUNG_KEYS)[number]>;
export const lungBaseOf = (c: VentConfig): LungBase => ({
  compliance: c.compliance, resistance: c.resistance, efl: c.efl, eflSeverity: c.eflSeverity, eflK: c.eflK, peepStent: c.peepStent,
  pleural: c.pleural, spont: c.spont, pmus: c.pmus,
});

export const EFFORT_PMUS_CMH2O = 8; // effort 1 → Pmus 8 cmH2O [ENG: the v1.9 default spontaneous effort is 6–8]

/** One lung (C, R_insp, R_exp, pleural) → the ventilator's single compartment (catalogue rows and lungState alike). */
export function lungMechanics(m: { compliance: number; rInsp: number; rExp: number; pleural: number }): Partial<VentConfig> {
  const efl = m.rExp > m.rInsp * 1.05;
  return {
    compliance: Math.max(1, m.compliance), resistance: m.rInsp, efl, eflSeverity: efl ? 'custom' : 'moderate',
    eflK: efl ? m.rInsp / m.rExp : 0.35, peepStent: efl ? 0 : 40, pleural: Math.max(0, m.pleural),
  };
}

export interface LungLink {
  /** The lung before the first lungState (the profile's row) and the patient's own effort; a drawer/page patch moves it. */
  base: LungBase;
  /** The last lungState applied (null until the engine has sent one). */
  last: LungStateEvent | null;
}
export const createLungLink = (c: VentConfig): LungLink => ({ base: lungBaseOf(c), last: null });

export function applyLungState(vs: VentState, ll: LungLink, ls: LungStateEvent): void {
  ll.last = ls;
  const c = vs.cfg;
  const b = ll.base;
  Object.assign(c, lungMechanics({
    compliance: ls.complianceMlPerCmH2O, rInsp: ls.resistanceCmH2OPerLps,
    rExp: ls.resistanceExpCmH2OPerLps ?? ls.resistanceCmH2OPerLps, pleural: ls.pleuralCmH2O ?? 0,
  }));
  // effort only ADDS a patient: a profile that breathes keeps its own effort
  c.spont = b.spont || ls.effort > 0.05;
  c.pmus = b.spont ? b.pmus : EFFORT_PMUS_CMH2O * ls.effort;
}
