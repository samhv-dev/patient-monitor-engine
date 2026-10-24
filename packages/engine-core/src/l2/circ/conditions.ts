// Circulatory conditions (tables §2.2 rows pPtx, vFluid, peFrac, peVaso; §7 checks 12–15; B §4.9
// conditions): each writes the CircModel's `ext` multipliers, which the 10 Hz control layer applies. Severity 0–1.
//   tamponade   vFluid = 250 mL × severity (acute tamponade 150–250 mL, Q29)
//   pe          φ = 0.8 × severity; PVR × 1/(1 − φ) × (1 + peVaso·φ), peVaso 0.5 (McIntyre–Sasahara; Q27)
//   tensionPtx  an alias of the lungs' lungCondition ptxTension (engine aliases.ts) — the lungs' per-side pPtx is the
//               one pleural source; `ext.pPtx` is not written (it stays 0 unless a test pokes it)
//   rvInfarct   RV Emax × (1 − 0.65 × severity) (tables H8: Ees_RV × 0.35)
import type { CircModelState } from './model.ts';
import { SPONT_SWING_CMH2O } from './params.ts';

export type CircConditionId = 'tamponade' | 'pe' | 'tensionPtx' | 'rvInfarct';
export const CIRC_CONDITIONS: readonly CircConditionId[] = ['tamponade', 'pe', 'tensionPtx', 'rvInfarct'];
export const TAMPONADE_ML = 250;
/** The most pericardial fluid the accumulation integrates to [ENG: beyond Q29's acute 150–250 mL]. */
export const TAMPONADE_MAX_ML = 500;
/** Optional fields of the tamponade condition — an absolute volume and an accumulation (− drainage) rate. */
export interface TamponadeOpts {
  volumeMl?: number;
  rateMlPerMin?: number;
}
/**
 * The breathing of severe tamponade (E118). The tamponade patient is dyspnoeic and tachypnoeic (dyspnoea 87–89 % in
 * Roy, Minor, Brookhart & Choudhry, JAMA 2007;297:1810; Spodick, NEJM 2003;349:684), and the inspiratory fall of
 * systolic pressure grows with the depth of the inspiratory effort — small with quiet breathing, large with deep
 * breaths (Shabetai, Fowler & Guntheroth, Am J Cardiol 1970;26:480). The model of the same class (Ramachandran, Luo, Ma
 * & Clark, Theor Biol Med Model 2009;6:15) gives an 11 % systolic variation at a pleural swing of −1 to −10 mmHg and
 * 16 % at −1 to −15 mmHg (≈ 19 cmH2O); in the oesophageal-manometry literature a spontaneous effort above 15 cmH2O
 * is a high one and distressed patients reach 20–30 [TXT, a search summary, not re-read]. The MODELED drive cannot give that
 * effort: it is chemical (PaCO2, PaO2, Winter's HCO3, the J-receptor terms), the compensated tamponade patient's blood
 * gases are normal (measured 15–16 × 500–520 mL, PaCO2 ≈ 40, HCO3 24.3), and its spontaneous pleural swing is a fixed
 * 4 cmH2O whatever the tidal volume. The condition therefore carries its own effort factor: the spontaneous pleural
 * swing rises from the resting 4 cmH2O to TAMPONADE_SWING_CMH2O as the diastolic pericardial pressure (the effusion's
 * haemodynamic severity) rises from TAMPONADE_EFFORT_P_LO to TAMPONADE_EFFORT_P_HI mmHg (100 mL: 2.8 → none; 250 mL:
 * ≈ 26 → full). The tidal volume and rate stay the chemical drive's, so gas exchange is unchanged (a stated
 * simplification: the deeper effort is not given a larger breath). [ENG ramp and size; fit targets: severe ≥ 10 mmHg,
 * mild ≤ 5. 8–12 cmH2O gives 6–7.5 mmHg here (run report E118); 20 is the distressed-effort size above.]
 */
export const TAMPONADE_SWING_CMH2O = 20;
export const TAMPONADE_EFFORT_P_LO = 5;
export const TAMPONADE_EFFORT_P_HI = 20;
/** The spontaneous pleural-swing multiplier for a diastolic pericardial pressure (mmHg). */
export function tamponadeSwingF(periMmHg: number): number {
  const x = Math.min(1, Math.max(0, (periMmHg - TAMPONADE_EFFORT_P_LO) / (TAMPONADE_EFFORT_P_HI - TAMPONADE_EFFORT_P_LO)));
  return 1 + (TAMPONADE_SWING_CMH2O / SPONT_SWING_CMH2O - 1) * x;
}
export const PE_MAX_FRAC = 0.8;
export const PE_VASO = 1.0;
export const PTX_MMHG = 20;
export const RV_INFARCT_LOSS = 0.65;

export function applyCircCondition(m: CircModelState, id: CircConditionId, severity: number, opts: TamponadeOpts = {}): void {
  const s = Math.min(1, Math.max(0, severity));
  switch (id) {
    case 'tamponade':
      // An absolute volume (else 250 mL × severity, unchanged) and an optional accumulation/drainage rate
      m.ext.vFluid = opts.volumeMl !== undefined ? Math.min(TAMPONADE_MAX_ML, Math.max(0, opts.volumeMl)) : TAMPONADE_ML * s;
      m.ext.vFluidRate = (opts.rateMlPerMin ?? 0) / 60;
      return;
    case 'pe': {
      const phi = PE_MAX_FRAC * s;
      m.ext.pvr = (1 / (1 - phi)) * (1 + PE_VASO * phi);
      return;
    }
    case 'tensionPtx':
      void PTX_MMHG; // The engine routes it to the lungs (aliases.ts); the circulation keeps no second pleural source
      return;
    case 'rvInfarct':
      m.ext.kRv = 1 - RV_INFARCT_LOSS * s;
      return;
  }
}
