// Four alveolar units (left/right × fast/slow; R43, tables §4.3) behind one tube, sharing one linear chest wall.
// Each unit: Venegas lung P–V (venegas.ts), its own inspiratory/expiratory airway resistance. The airway is driven by
// a FLOW source (volume-controlled or spontaneous inspiration: the breath driver's flow), a PRESSURE source
// (expiration to PEEP, a VentFrame's Paw) or is CLOSED (an inspiratory or expiratory hold). Explicit Euler at
// MECH_H = 4 ms; plain JSON-safe data.
import { MECH_H, N_UNITS } from './params.ts';
import { pressureAt, type Sigmoid } from './venegas.ts';

export interface UnitParams {
  sig: Sigmoid;
  rIn: number; // cmH2O·s/mL (airway from the carina to this unit)
  rEx: number;
}
export interface MechParams {
  units: UnitParams[];
  rTube: number; // cmH2O·s/mL
  ccw: number; // mL/cmH2O, shared chest wall
  /** Units behind a blocked main bronchus (OLV, endobronchial) exchange no gas with the airway. */
  blocked: boolean[];
}
export interface MechState {
  v: number[]; // mL above the FRC state, per unit
  q: number[]; // mL/s into each unit (last sub-step)
  paw: number; // airway-opening pressure, cmH2O (relative to atmosphere)
  pcar: number; // carina pressure
}

export function createMech(): MechState {
  return { v: [0, 0, 0, 0], q: [0, 0, 0, 0], paw: 0, pcar: 0 };
}

/** Alveolar pressure of unit u: lung recoil + shared chest-wall recoil (relative to the FRC state). */
export function unitPressure(mp: MechParams, ms: MechState, u: number, pcw: number): number {
  return pressureAt((mp.units[u] as UnitParams).sig, ms.v[u] as number) + pcw;
}

export function chestWallPressure(mp: MechParams, ms: MechState): number {
  let s = 0;
  for (let u = 0; u < N_UNITS; u++) s += ms.v[u] as number;
  return s / mp.ccw;
}

/**
 * One sub-step. mode 'flow': `x` = total inspiratory flow (mL/s) forced through the tube; 'pressure': `x` = airway
 * opening pressure (cmH2O); 'closed': no flow at the airway (units still redistribute: pendelluft).
 */
export function mechSubstep(mp: MechParams, ms: MechState, mode: 'flow' | 'pressure' | 'closed', x: number, h = MECH_H): void {
  const pcw = chestWallPressure(mp, ms);
  let gSum = 0;
  let gp = 0;
  const pa = [0, 0, 0, 0];
  const g = [0, 0, 0, 0];
  for (let u = 0; u < N_UNITS; u++) {
    const up = mp.units[u] as UnitParams;
    pa[u] = pressureAt(up.sig, ms.v[u] as number) + pcw;
    g[u] = mp.blocked[u] ? 0 : 1 / ((ms.q[u] as number) < 0 ? up.rEx : up.rIn);
    gSum += g[u] as number;
    gp += (g[u] as number) * (pa[u] as number);
  }
  let pc: number;
  if (mode === 'flow') pc = gSum > 0 ? (x + gp) / gSum : 0;
  else if (mode === 'pressure') pc = (x / mp.rTube + gp) / (1 / mp.rTube + gSum);
  else pc = gSum > 0 ? gp / gSum : 0;
  let qt = 0;
  for (let u = 0; u < N_UNITS; u++) {
    const q = (g[u] as number) * (pc - (pa[u] as number));
    ms.q[u] = q;
    ms.v[u] = (ms.v[u] as number) + q * h;
    qt += q;
  }
  ms.pcar = pc;
  ms.paw = mode === 'pressure' ? x : pc + mp.rTube * qt;
}

/** Total flow at the airway opening, mL/s. */
export function airwayFlow(ms: MechState): number {
  return (ms.q[0] as number) + (ms.q[1] as number) + (ms.q[2] as number) + (ms.q[3] as number);
}
