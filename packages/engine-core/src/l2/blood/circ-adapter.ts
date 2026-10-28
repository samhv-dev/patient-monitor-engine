// The blood's contacts with the circulation and the lungs. The circulation's CircModelState is read by DUCK TYPING
// (`hemo.circ` with a numeric `t`, a `vol` array and `ext`), so the blood model never imports from l2/circ/**; on main
// `hs.circ` always exists, the haemodynamics-only fallback serves unit rigs without a circuit.
import { l1Target, type L1State } from '../../l1/state.ts';

/**
 * The part of the circulation model's CircModelState this adapter touches (`t`, `vol`, `ext`, the resting reference
 * `ref.co`).
 */
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
 * The circulation model present: the blood-volume change of this step (mL) enters the circuit over the next `dtS`.
 * `until` sits 1 µs early so float round-off in the circuit's 2 ms clock never counts a 51st step (the prototype lost
 * 500.7 mL for a 500 mL bleed without it: the circulation model's circ-events test).
 */
export function pushCircVolume(c: CircLike, dMl: number, dtS: number): void {
  if (Math.abs(dMl) < 1e-9) return;
  c.vol.push({ rate: dMl / dtS, until: c.t + dtS - 1e-6 });
}

/**
 * Blood viscosity follows the haematocrit, so the systemic resistance does: SVR × (Hb/Hb_ref)^0.6 (Weiskopf 1998 JAMA
 * 279:217, acute isovolaemic Hb 14 → 5: SVR −47 %) [ENG exponent]; the circulation model's optional `ext.viscF`.
 */
export const VISC_EXP = 0.6;
/**
 * Blood is SHEAR-THINNING — at the very low shear rates of CPR and no-flow states its apparent viscosity rises (Chien
 * S, Science 1970;168:977–979; Merrill EW, Physiol Rev 1969;49:863), so haemodilution's resistance reduction does not
 * hold there. The factor fades with the patient's own flow ratio (the resp pipeline's `coRatio`, the one the low-flow
 * CO2 code reads): full effect at the resting output (1.0), none at CPR-level flow (0.3 — CPR delivers 25–33 % of
 * normal output, the CPR coRatio band). Two anchors, no other constant.
 */
export const VISC_FLOW_FULL = 1.0;
export const VISC_FLOW_NONE = 0.3;
export function setCircViscosity(c: CircLike, hbRel: number, flowRatio = 1): void {
  const fade = Math.min(1, Math.max(0, (flowRatio - VISC_FLOW_NONE) / (VISC_FLOW_FULL - VISC_FLOW_NONE)));
  c.ext.viscF = 1 + (Math.max(0.2, hbRel) ** VISC_EXP - 1) * fade;
}

/**
 * The circulation model present: the chemistry contractility multiplier (the circulation model's optional `ext.kChem`,
 * written unconditionally).
 */
export function setCircChemistry(c: CircLike, k: number): void {
  c.ext.kChem = k;
}

/**
 * The circulation model ABSENT (unit rigs): cardiac-output factor from blood volume [ENG]: none for the first 10 % loss
 * (compensated), then −16 % per further 10 % (class III, 35 % → 0.6), +6 % per 10 % overload, clamped 0.2–1.15.
 */
export function volumeCoFactor(bvRatio: number): number {
  const loss = 1 - bvRatio;
  return Math.max(0.2, Math.min(1.15, 1 - 1.6 * Math.max(0, loss - 0.1) + 0.6 * Math.max(0, -loss)));
}

/**
 * The circulation model ABSENT (unit rigs): the `volumeStatus` coupled truth = min(current, target × volume factor),
 * factor 1 at BV0 and 0 at 35 % loss [ENG]; `contractility` coupled truth = target × chemistry factor (cleared at 1).
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
export function chemistryContractility(ph: number, iCa: number, kEcg = 4.2, paco2 = CO2_REF_MMHG): number {
  const acid = ph < 7.2 ? Math.max(0.3, 1 - 1.5 * (7.2 - ph)) : 1;
  const kF = kEcg > K_CONTRACT ? Math.max(0.3, 1 - K_CONTRACT_SLOPE * (kEcg - K_CONTRACT)) : 1;
  const co2 = 1 - CO2_EES_PER_MMHG * (Math.min(CO2_SOURCE_MAX_MMHG, Math.max(CO2_REF_MMHG, paco2)) - CO2_REF_MMHG);
  // NOT multiplied together: the acidaemia term (any cause, below pH 7.2) and the CO2 term (Walley's respiratory
  // acidosis, where the arterial pH fell with the PCO2) are the same depression measured two ways, so the LARGER of
  // the two carries it and neither is counted twice. For a pure acute respiratory acidosis they cross at PaCO2 ≈ 78
  // (pH ≈ 7.10): below it the CO2 slope is the larger, above it the pH term is, and nothing below pH 7.2 from a
  // METABOLIC cause changes at all.
  return Math.min(acid, co2) * Math.min(1, (iCa / 1.1) ** 1.5) * kF;
}
/**
 * Hypercapnic MYOCARDIAL DEPRESSION, direct and non-sympathetic: CO2_EES_PER_MMHG of contractility per mmHg of PaCO2
 * above CO2_REF_MMHG, held at the source's measured end CO2_SOURCE_MAX_MMHG. In fentanyl-anaesthetised dogs,
 * respiratory acidosis at PCO2 92 / pH 7.09 took Emax 11.4 → 9.2 mmHg/mL (−19 %) with the β-adrenergic response
 * intact, and 4.6 → 3.6 (−22 %) AFTER propranolol — ≈ 0.4 % per mmHg over PCO2 40 → 92, i.e. ≈ 4 % per 10 mmHg or
 * ≈ 7 % per 0.1 pH unit (Walley KR, Lewis TH, Wood LDH, Circ Res 1990;67:628–635, PMID 2118837) [P]. It runs through
 * the EXISTING contractility path, so it is opposed where there is inotropic reserve and unopposed where there is not
 * — which is why relieving venous hypercarbia raised cardiac output in exsanguinated dogs with no volume given
 * (Karnad DR, Apte SJ, Supe AN, J Postgrad Med 1993;39:68–71, PMID 8169865) [P].
 * The same CO2 excess the circulation's `co2VascularF` uses (l2/circ/params.ts `CO2_SVR_PER_MMHG`); the constants are
 * repeated here because the blood model never imports from l2/circ (see the file header).
 */
export const CO2_EES_PER_MMHG = 0.004;
export const CO2_REF_MMHG = 40;
export const CO2_SOURCE_MAX_MMHG = 92;
/** Severe hyperkalaemia depresses contractility above K_CONTRACT (membrane-effective), −20 %/mmol/L [ENG, Q5]. */
export const K_CONTRACT = 8;
export const K_CONTRACT_SLOPE = 0.2;

// --- lung water: the blood's COP and capillary leak → the lung model's EVLWI key ------------------------------
/**
 * Pulmonary capillary pressure (mmHg): the circulation model's pulmonary venous pressure `circOut.pPv`, or null without
 * a circuit.
 */
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
