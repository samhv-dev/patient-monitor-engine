// Couplings Stage 3 owns (brief §4.9 M4–M6; §4.9 "Ventilation → haemodynamics"; research 03 §8.7):
//  • cardiac output READ from Stage 2's state (never written): drives gas uptake, low-flow EtCO2, SpO2 delay;
//  • mean airway pressure → effective RAP: CVP truth rises, venous return (so SV/CO) falls, PPV rises. In MANUAL
//    this acts through L1 `coupled` truths on cvp/sbp/dbp/volumeStatus, which Stage 2's pipeline reads through
//    l1Value (its M2 tracker then meets the coupled pressures).
import { l1Target, type L1State } from '../../l1/state.ts';
import { CPR_SV_FRAC, SV_REF_ML } from '../hemo/params.ts';
import type { HemoState } from '../hemo/pipeline.ts';
import { CMH2O_TO_MMHG } from './params.ts';

/** Effective RAP rises by 30–50 % of the mean-airway-pressure change (brief §4.9) → 0.4 [ENG]. */
export const RAP_FRACTION = 0.4;
/** Only mean Paw above 10 cmH2O acts in MANUAL ("High PEEP (> 10–15) … lowers CO and MAP", research 03 §8.7). */
export const PAW_REF_CMH2O = 10;
/**
 * Venous-return driving pressure Pmsf − RAP by volume status [ENG]: 15 mmHg normovolaemic, 4 mmHg empty. PEEP
 * 5 → 15 (mean Paw ≈ 8 → 18) gives f = 0.84 normovolaemic and 0.68 at volumeStatus 0.3 (prototype: CO −9 % and
 * −23 %, MAP 97 → 83 and 97 → 68 mmHg once Stage 2's tracker has met the coupled pressures).
 */
export function venousGradient(vs: number): number {
  return 4 + 11 * Math.min(1, Math.max(0, vs));
}

/**
 * Net forward flow of CPR vs compression quality, as the gas exchange sees it (R39-2, research 09 §2) [ENG, fitted]:
 * below guideline quality flow falls off steeply (quality^1.9), above it the gain is linear. With the low-flow
 * compression this gives EtCO2 ≈ 12 / 20 / 25 / 29 mmHg at quality 0.5 / 0.8 / 1.0 / 1.2 (10 breaths/min, minutes
 * 1–10). The pressure waveforms (Stage 2) keep scaling linearly with quality.
 */
export const CPR_FLOW_EXP = 1.9;
export const cprFlowFactor = (q: number): number => (q < 1 ? Math.max(0, q) ** CPR_FLOW_EXP : q);

/** CO (L/min) from Stage 2's completed site beats over the last 10 s; CPR pump flow; 0 in arrest. */
export function cardiacOutput(hs: HemoState, t: number): number {
  if (hs.cpr.active) return (SV_REF_ML * CPR_SV_FRAC * cprFlowFactor(hs.cpr.quality) * hs.cpr.rate) / 1000;
  if (t - hs.lastEjT > Math.max(3, 2.2 * hs.lastRR)) return 0;
  const bs = hs.siteBeats.filter((b) => !b.cpr && t - b.t < 10);
  if (bs.length < 2) return (SV_REF_ML * hs.sys.g * 60) / Math.max(0.3, hs.lastRR) / 1000;
  const sv = bs.reduce((a, b) => a + b.sv, 0);
  const dur = bs.reduce((a, b) => a + b.dur, 0);
  return (sv / Math.max(0.1, dur)) * 0.06;
}

/** Apply the mean-airway-pressure coupling to the L1 coupled truths at time t (MANUAL). */
export function applyPawCoupling(l1: L1State, meanPawCmH2O: number, t: number): number {
  const c = (l1.coupled ??= {});
  const excess = Math.max(0, meanPawCmH2O - PAW_REF_CMH2O);
  if (excess <= 0) {
    delete c.cvp;
    delete c.sbp;
    delete c.dbp;
    delete c.volumeStatus;
    return 1;
  }
  const dRap = RAP_FRACTION * CMH2O_TO_MMHG * excess;
  const vs = l1Target(l1, 'volumeStatus', t);
  const f = Math.max(0.3, 1 - dRap / venousGradient(vs));
  const cvp = l1Target(l1, 'cvp', t) + dRap;
  c.cvp = cvp;
  c.sbp = cvp + (l1Target(l1, 'sbp', t) - cvp) * f;
  c.dbp = cvp + (l1Target(l1, 'dbp', t) - cvp) * f;
  c.volumeStatus = vs * f;
  return f;
}
