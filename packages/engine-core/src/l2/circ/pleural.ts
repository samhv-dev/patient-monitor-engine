// Pleural (intrathoracic) pressure as a continuous input to the heart (tables §2.1 thorax line):
//   positive-pressure breath: pIt = P_PL0 + T_IT·Palv(t)·0.7356, Palv = PEEP + ΔV(t)/C (breath driver volume) or the
//     external drive's stored frame pressure (alveolar pressure: palv ?? paw)
//   spontaneous breath: pIt = P_PL0 − SPONT_SWING·(ΔV(t)/VT)·0.7356 (more negative in inspiration)
//   none / apnoea: pIt = P_PL0
import { cycleAt, cycleVolume, frameAt, type DriverState } from '../resp/driver.ts';
import { CMH2O_TO_MMHG, P_PL0, SPONT_SWING_CMH2O, T_IT } from './params.ts';

/**
 * The pleural pressure (mmHg, ≥ 0, subtracted) of an effort against an obstructed upper airway — the muscle pressure
 * spent there (Mueller manoeuvre: with no flow the whole Pmus appears in the pleural space), a half-sine over the
 * effort's inspiration.
 */
export function obstructedSwingMmHg(d: DriverState, t: number): number {
  const c = cycleAt(d, t);
  if (!c || c.mech || !((c.pmus ?? 0) > 0)) return 0;
  const u = t - c.t0;
  return u < c.ti ? (c.pmus as number) * Math.sin((Math.PI * u) / Math.max(0.1, c.ti)) * CMH2O_TO_MMHG : 0;
}

/**
 * `swingF` scales the spontaneous breath's peak-to-trough pleural swing (the effort; 1 = the resting breath); the part
 * above the resting swing is centred on the breath's mean (circ/conditions.ts TAMPONADE_SWING_CMH2O).
 */
export function pleuralPressureMmHg(d: DriverState, t: number, complianceMl: number, swingF = 1): number {
  if (d.source === 'external' && d.ext) return P_PL0 + T_IT * frameAt(d.ext, t, 1) * CMH2O_TO_MMHG;
  const c = cycleAt(d, t);
  const obs = obstructedSwingMmHg(d, t);
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
  const f = dv / Math.max(1, c.vt);
  // An extra effort is centred on the breath's mean volume (cycleVolume's shape: ti/2 + 0.3·te of the period): a deeper
  // inspiration and an active expiration, so the mean intrathoracic pressure stays the resting breath's
  const extra = swingF > 1 ? (swingF - 1) * (f - (c.ti / 2 + 0.3 * c.te) / Math.max(1e-3, c.ti + c.te)) : 0;
  return P_PL0 - SPONT_SWING_CMH2O * (f + extra) * CMH2O_TO_MMHG - obs;
}
