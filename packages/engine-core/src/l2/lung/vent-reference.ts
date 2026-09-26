// Stage 7b (Task 27): one condition's ventilator reference numbers from the lung module's resolved parameters — for
// Stage V's generated catalogue copy (the ventilator's own single-compartment model then shows plateau, ΔP and
// peak − plateau from them). The condition's mainstem block (OLV, endobronchial) is applied: only the ventilated
// side's lung compliance and airway count, in series with the whole (shared) chest wall and the tube.
import type { LungConditionSpec } from '../../types-lung.ts';
import { resolveLung } from './conditions.ts';

export interface VentReference {
  crs: number; // static respiratory-system compliance, mL/cmH2O
  rInsp: number; // tube + ventilated airways, cmH2O·s/L
  rExp: number; // rInsp × the whole-airway expiratory ratio
  nonAerated: number; // whole-lung non-aerated fraction (volume-weighted)
  extraShunt: number;
  vdAlv: number; // volume-weighted unperfused fraction of alveolar ventilation
}

export function ventReference(spec: LungConditionSpec, pbwKg = 70): VentReference {
  const { lp, blocked } = resolveLung([spec], pbwKg);
  let cL = 0;
  let g = 0;
  lp.side.forEach((s, k) => {
    if (blocked.includes(k === 0 ? 'L' : 'R')) return;
    cL += s.cL;
    g += 1 / s.rLung;
  });
  const rInsp = lp.rTube + 1 / Math.max(1e-6, g);
  const s0 = lp.side[0]!;
  const s1 = lp.side[1]!;
  return {
    crs: 1 / (1 / cL + 1 / lp.ccw), rInsp, rExp: rInsp * Math.max(s0.rawExp, s1.rawExp),
    nonAerated: 0.45 * (s0.atel + s0.consol) + 0.55 * (s1.atel + s1.consol), extraShunt: lp.extraShunt,
    vdAlv: 0.45 * s0.vdAlv + 0.55 * s1.vdAlv,
  };
}
