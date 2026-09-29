// Pleural (intrathoracic) pressure as a continuous input to the heart (audit R-B, A2; tables §2.1 thorax line):
//   positive-pressure breath: pIt = P_PL0 + T_IT·Palv(t)·0.7356, Palv = PEEP + ΔV(t)/C (breath driver volume) or the
//     external drive's stored frame pressure (Paw on main; alveolar pressure once Stage V stores palv ?? paw there)
//   spontaneous breath: pIt = P_PL0 − SPONT_SWING·(ΔV(t)/VT)·0.7356 (more negative in inspiration)
//   none / apnoea: pIt = P_PL0
import { cycleAt, cycleVolume, frameAt, type DriverState } from '../resp/driver.ts';
import { CMH2O_TO_MMHG, P_PL0, SPONT_SWING_CMH2O, T_IT } from './params.ts';

/**
 * FU-6 R3(b) (E-FU6-3): the pleural pressure (mmHg, ≥ 0, subtracted) of an effort against an obstructed upper airway —
 * the muscle pressure spent there (Mueller manoeuvre: with no flow the whole Pmus appears in the pleural space), a
 * half-sine over the effort's inspiration.
 */
export function obstructedSwingMmHg(d: DriverState, t: number): number {
  const c = cycleAt(d, t);
  if (!c || c.mech || !((c.pmus ?? 0) > 0)) return 0;
  const u = t - c.t0;
  return u < c.ti ? (c.pmus as number) * Math.sin((Math.PI * u) / Math.max(0.1, c.ti)) * CMH2O_TO_MMHG : 0;
}

export function pleuralPressureMmHg(d: DriverState, t: number, complianceMl: number): number {
  if (d.source === 'external' && d.ext) return P_PL0 + T_IT * frameAt(d.ext, t, 1) * CMH2O_TO_MMHG;
  const c = cycleAt(d, t);
  const obs = obstructedSwingMmHg(d, t); // FU-6 R3(b)
  if (obs > 0 && c && (!(c.vt > 0) || t >= c.cutAt)) return P_PL0 - obs;
  if (!c || !(c.vt > 0) || t >= c.cutAt) {
    const peep = d.source === 'ventilator' ? d.vent.peep : 0;
    return P_PL0 + T_IT * peep * CMH2O_TO_MMHG;
  }
  const dv = cycleVolume(c, t);
  if (c.mech) {
    const peep = d.source === 'ventilator' ? d.vent.peep : 0;
    return P_PL0 + T_IT * (peep + dv / Math.max(1, complianceMl)) * CMH2O_TO_MMHG;
  }
  return P_PL0 - SPONT_SWING_CMH2O * (dv / Math.max(1, c.vt)) * CMH2O_TO_MMHG - obs;
}
