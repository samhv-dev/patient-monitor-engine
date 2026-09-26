// Ventilator-style measurements on the unit model (Pulse's ventilator outputs, audit 03 §5; Arnal 2018 method):
// Ppeak at end-inspiratory flow, Pplat after a 0.3 s end-inspiratory hold, total PEEP after a 2 s end-expiratory hold,
// Cstat = VT/(Pplat − PEEPtot), Rinsp = (Ppeak − Pplat)/flow, auto-PEEP = PEEPtot − PEEP. The holds run on a COPY of
// the unit state, so measuring never disturbs the patient.
import { mechSubstep, type MechParams, type MechState } from './mechanics.ts';
import { MECH_H } from './params.ts';

export interface VcSettings { vtMl: number; rr: number; peep: number; flowLps: number; pauseS: number }
export interface Breath { ppeak: number; pplat: number; peepTot: number; autoPeep: number; cstat: number; rInsp: number; drivingP: number; vtUnits: number[] }

function copy(ms: MechState): MechState {
  return { v: ms.v.slice(), q: ms.q.slice(), paw: ms.paw, pcar: ms.pcar };
}

/** Hold the airway closed for `s` seconds on a copy; return the final airway (= carina, no flow) pressure. */
export function holdPressure(mp: MechParams, ms: MechState, s: number, peepOffset: number): number {
  const c = copy(ms);
  for (let t = 0; t < s; t += MECH_H) mechSubstep(mp, c, 'closed', 0);
  return c.pcar + peepOffset;
}

/**
 * Run one volume-controlled breath (square flow, pause, passive expiration to PEEP) on `ms` in place. Pressures are
 * reported relative to atmosphere: the unit model is relative to the FRC state at ZEEP, so PEEP enters as the
 * expiratory airway pressure.
 */
export function vcBreath(mp: MechParams, ms: MechState, s: VcSettings, measure: boolean): Breath | null {
  const period = 60 / s.rr;
  const ti = s.vtMl / 1000 / s.flowLps;
  const v0 = ms.v.slice();
  let t = 0;
  let ppeak = 0;
  for (; t < ti - 1e-9; t += MECH_H) mechSubstep(mp, ms, 'flow', s.flowLps * 1000);
  ppeak = ms.paw;
  const vtUnits = ms.v.map((v, u) => v - (v0[u] as number));
  const pplat = measure ? holdPressure(mp, ms, 0.3, 0) : 0;
  for (let k = 0; k < s.pauseS; k += MECH_H, t += MECH_H) mechSubstep(mp, ms, 'closed', 0);
  for (; t < period - 1e-9; t += MECH_H) mechSubstep(mp, ms, 'pressure', s.peep);
  if (!measure) return null;
  const peepTot = holdPressure(mp, ms, 2, 0);
  const vt = vtUnits.reduce((a, b) => a + b, 0);
  return {
    ppeak, pplat, peepTot, autoPeep: Math.max(0, peepTot - s.peep), cstat: vt / Math.max(0.1, pplat - peepTot),
    rInsp: (ppeak - pplat) / s.flowLps, drivingP: pplat - peepTot, vtUnits,
  };
}

/** Settle `n` breaths then measure one (the reference run of Task 12). */
export function referenceRun(mp: MechParams, ms: MechState, s: VcSettings, n = 30): Breath {
  for (let i = 0; i < n; i++) vcBreath(mp, ms, s, false);
  return vcBreath(mp, ms, s, true) as Breath;
}
