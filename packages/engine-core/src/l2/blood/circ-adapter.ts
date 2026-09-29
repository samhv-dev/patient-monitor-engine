// The blood's contacts with the circulation and the lungs (plan decision 10; G7b ruling 8). Stage 7a's
// CircModelState is read by DUCK TYPING (`hemo.circ` with a numeric `t`, a `vol` array and `ext`), so 7c never
// imports from l2/circ/**; on main `hs.circ` always exists, the Stage 2 fallback serves unit rigs without a circuit.
import { l1Target, type L1State } from '../../l1/state.ts';

/** The part of Stage 7a's CircModelState this adapter touches (`t`, `vol`, `ext`, the resting reference `ref.co`). */
export interface CircLike {
  t: number;
  vol: { rate: number; until: number }[]; // mL/s until sim time
  ext: Record<string, unknown>;
  ref?: { co: number }; // L/min, the stabilised resting reference
}

export function circOf(hemo: unknown): CircLike | null {
  const c = (hemo as { circ?: unknown } | null)?.circ as Partial<CircLike> | undefined;
  return c && typeof c.t === 'number' && Array.isArray(c.vol) && typeof c.ext === 'object' && c.ext !== null ? (c as CircLike) : null;
}

/**
 * 7a present: the blood-volume change of this step (mL) enters the circuit over the next `dtS`. `until` sits 1 µs
 * early so float round-off in the circuit's 2 ms clock never counts a 51st step (the prototype lost 500.7 mL for a
 * 500 mL bleed without it: 7a's circ-events test).
 */
export function pushCircVolume(c: CircLike, dMl: number, dtS: number): void {
  if (Math.abs(dMl) < 1e-9) return;
  c.vol.push({ rate: dMl / dtS, until: c.t + dtS - 1e-6 });
}

/**
 * FU-6 R11 (E-FU6-4): blood viscosity follows the haematocrit, so the systemic resistance does: SVR × (Hb/Hb_ref)^0.6
 * (Weiskopf 1998 JAMA 279:217, acute isovolaemic Hb 14 → 5: SVR −47 %) [ENG exponent]; 7a's optional `ext.viscF`.
 */
export const VISC_EXP = 0.6;
export function setCircViscosity(c: CircLike, hbRel: number): void {
  c.ext.viscF = Math.max(0.2, hbRel) ** VISC_EXP;
}

/** 7a present: the chemistry contractility multiplier (7a's optional `ext.kChem`, written unconditionally; R50 F3). */
export function setCircChemistry(c: CircLike, k: number): void {
  c.ext.kChem = k;
}

/**
 * 7a ABSENT (unit rigs): cardiac-output factor from blood volume [ENG]: none for the first 10 % loss (compensated),
 * then −16 % per further 10 % (class III, 35 % → 0.6), +6 % per 10 % overload, clamped 0.2–1.15.
 */
export function volumeCoFactor(bvRatio: number): number {
  const loss = 1 - bvRatio;
  return Math.max(0.2, Math.min(1.15, 1 - 1.6 * Math.max(0, loss - 0.1) + 0.6 * Math.max(0, -loss)));
}

/**
 * 7a ABSENT (unit rigs): Stage 2's `volumeStatus` coupled truth = min(current, target × volume factor), factor 1 at
 * BV0 and 0 at 35 % loss [ENG]; `contractility` coupled truth = target × chemistry factor (cleared at 1).
 */
export function applyL1Fallback(l1: L1State, t: number, bvRatio: number, kChem: number): void {
  const c = (l1.coupled ??= {});
  const f = Math.max(0, Math.min(1, 1 - (1 - bvRatio) / 0.35));
  if (f < 0.995) c.volumeStatus = Math.min(c.volumeStatus ?? l1Target(l1, 'volumeStatus', t), l1Target(l1, 'volumeStatus', t) * f);
  if (kChem < 0.995) c.contractility = l1Target(l1, 'contractility', t) * kChem;
  else delete c.contractility;
}

/**
 * Chemistry → contractility (tables §5b.1 Q44, §5b.2 Q46): ×(1 − 1.5·(7.2 − pH)) below pH 7.2 (floor 0.3) and
 * ×min(1, (iCa/1.1)^1.5).
 */
export function chemistryContractility(ph: number, iCa: number, kEcg = 4.2): number {
  const acid = ph < 7.2 ? Math.max(0.3, 1 - 1.5 * (7.2 - ph)) : 1;
  const kF = kEcg > K_CONTRACT ? Math.max(0.3, 1 - K_CONTRACT_SLOPE * (kEcg - K_CONTRACT)) : 1; // FU-4 G3
  return acid * Math.min(1, (iCa / 1.1) ** 1.5) * kF;
}
/** FU-4 G3: severe hyperkalaemia depresses contractility above K_CONTRACT (membrane-effective), −20 %/mmol/L [ENG, Q5]. */
export const K_CONTRACT = 8;
export const K_CONTRACT_SLOPE = 0.2;

// --- lung water (G7b ruling 8): the blood's COP and capillary leak → 7b's EVLWI key ---------------------------
/** Pulmonary capillary pressure (mmHg): 7a's pulmonary venous pressure `circOut.pPv`, or null without a circuit. */
export function pulmCapPressure(hemo: unknown): number | null {
  const o = (hemo as { circOut?: { pPv?: unknown } } | null)?.circOut;
  return o && typeof o.pPv === 'number' ? o.pPv : null;
}
/** Lung-water filtration, mL/kg/min per mmHg above the oedema threshold [ENG, Q25]: EVLWI +10 mL/kg at steady state for 10 mmHg. */
export const LW_GAIN = 1 / 60;
/** Lung lymph clearance time constant, min [ENG, Q25]. */
export const LW_TAU_MIN = 60;

/**
 * One step of the extra lung water W (mL/kg above the conditions' EVLWI). Threshold = tables §2 `pOedema` (COP − 2,
 * acute), scaled by the protein reflection coefficient σ/σ0 (a leak lowers it); filtration × the capillary-leak
 * multiplier `kfMult`; clearance W/τ.
 */
export function lungWaterStep(w: number, pCap: number, cop: number, kfMult: number, sigmaRel: number, dtS: number): number {
  const excess = Math.max(0, pCap - (sigmaRel * cop - 2));
  const dtM = dtS / 60;
  return Math.max(0, w + (LW_GAIN * kfMult * excess - w / LW_TAU_MIN) * dtM);
}
