// Resolved per-lung parameters (what the pathology conditions and the profile produce; conditions.ts builds them)
// and their translation into unit mechanics (mechanics.ts). Healthy defaults from HEALTHY (data/lung-pathology.ts).
import { CCW_ML, N_UNITS, R_TUBE, RV_ML_KG, SIDE_SHARE, TLC_ML_KG } from './params.ts';
import type { MechParams, UnitParams } from './mechanics.ts';
import { sigmoidFor } from './venegas.ts';

/** One lung's resolved parameters. Multipliers are relative to the healthy adult (HEALTHY). */
export interface SideParams {
  cL: number; // lung compliance of this side at its reference aeration, mL/cmH2O
  aerRef: number; // aerated fraction at which cL was specified (1 − condition atel − consol)
  rLung: number; // this side's airway resistance (carina → alveoli, parallel of its units), cmH2O·s/L
  rawExp: number; // expiratory / inspiratory resistance ratio of the WHOLE airway incl. the tube (catalogue lead `rawExpMult`; Pulse/Officer 1998 totals)
  fSlow: number; // slow-unit volume fraction
  tauSlowS: number; // slow-unit time constant (s)
  atel: number; // recruitable non-aerated fraction from conditions
  consol: number; // non-recruitable non-aerated fraction
  pOpen: number; // cmH2O at which the whole recruitable fraction is open
  tauRecS: number;
  vqLow: number; // low-V/Q admixture, fraction of this side's flow
  vdAlv: number; // unperfused fraction of this side's alveolar ventilation
  dl: number; // diffusion factor
  hpv: number; // regional HPV maximum
  perf: number; // perfusion share multiplier
}
export interface LungParams {
  side: SideParams[];
  ccw: number; // mL/cmH2O
  rTube: number; // cmH2O·s/L
  extraShunt: number; // extrapulmonary / extra true shunt, fraction of CO
  frcMult: number;
  ibwKg: number;
  /** Values the lung module only passes on (7a, 7f): */
  pvr: number;
  tIt: number;
  pPtx: number;
  leakFrac: number;
  co2Slope: number;
  pMax: number;
}

/** Healthy adult (crs 55 incl. chest wall 200, raw 10 incl. tube 4) scaled to IBW. */
export function healthyParams(ibwKg = 70): LungParams {
  const w = ibwKg / 70;
  const crs = 55 * w;
  const ccw = CCW_ML * w;
  const cL = 1 / (1 / crs - 1 / ccw);
  const rLungTot = (10 - R_TUBE) / w;
  const side = SIDE_SHARE.map((sh) => ({
    cL: cL * sh, aerRef: 1, rLung: rLungTot / sh, rawExp: 1.2, fSlow: 0, tauSlowS: 0.5, atel: 0, consol: 0,
    pOpen: 40, tauRecS: 2.6, vqLow: 0.02, vdAlv: 0.075, dl: 1, hpv: 0.5, perf: 1,
  }));
  return { side, ccw, rTube: R_TUBE / w, extraShunt: 0, frcMult: 1, ibwKg, pvr: 1, tIt: 0.4, pPtx: 0, leakFrac: 0, co2Slope: 1, pMax: 1 };
}

/**
 * Unit mechanics for the current aeration `aer[s]` (1 − atel − consol, dynamic) and blocked sides. Slow units get
 * R = τ_slow / C_unit; fast units take the rest of the side's conductance (never below 25 % of it) [ENG].
 */
export function mechParams(lp: LungParams, aer: number[], blocked: boolean[]): MechParams {
  const units: UnitParams[] = [];
  const range = (TLC_ML_KG - RV_ML_KG) * lp.ibwKg;
  for (let s = 0; s < 2; s++) {
    const sp = lp.side[s] as SideParams;
    const a = Math.max(0.02, aer[s] as number);
    const cSide = (sp.cL * a) / Math.max(0.05, sp.aerRef);
    const gSide = 1 / sp.rLung; // L/s per cmH2O
    const cSlow = sp.fSlow * cSide;
    const cFast = cSide - cSlow;
    // unit respiratory-system compliance for τ: the unit's lung compliance in series with its share of the chest wall
    const crsU = (c: number) => (c > 0 ? 1 / (1 / c + 1 / (lp.ccw * (SIDE_SHARE[s] as number))) : 0);
    const gSlow = cSlow > 0 ? crsU(cSlow) / 1000 / sp.tauSlowS : 0; // (L/cmH2O)/s = L/s/cmH2O
    const gFast = Math.max(0.25 * gSide, gSide - gSlow);
    // expiratory lung-airway ratio so that the TOTAL (tube + lung) ratio equals rawExp (tube resistance is symmetric)
    const rTot = lp.rTube + 1 / (1 / sp.rLung + 1 / ((lp.side[1 - s] as SideParams).rLung));
    const kx = Math.max(1, (sp.rawExp * rTot - lp.rTube) / (rTot - lp.rTube));
    const b = range * (SIDE_SHARE[s] as number) * a;
    units.push({ sig: sigmoidFor(b * (1 - sp.fSlow), Math.max(0.1, cFast)), rIn: 1 / gFast / 1000, rEx: kx / gFast / 1000 });
    units.push({ sig: sigmoidFor(Math.max(1, b * sp.fSlow), Math.max(0.01, cSlow)), rIn: gSlow > 0 ? 1 / gSlow / 1000 : 1e6, rEx: gSlow > 0 ? kx / gSlow / 1000 : 1e6 });
  }
  const bl = [0, 1, 2, 3].map((u) => blocked[u >> 1] === true);
  void N_UNITS;
  return { units, rTube: lp.rTube / 1000, ccw: lp.ccw, blocked: bl };
}
