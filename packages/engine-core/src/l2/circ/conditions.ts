// Circulatory conditions 7a implements (tables §2.2 rows pPtx, vFluid, peFrac, peVaso; §7 checks 12–15; B §4.9
// conditions): each writes the CircModel's `ext` multipliers, which the 10 Hz control layer applies. Severity 0–1.
//   tamponade   vFluid = 250 mL × severity (acute tamponade 150–250 mL, Q29)
//   pe          φ = 0.8 × severity; PVR × 1/(1 − φ) × (1 + peVaso·φ), peVaso 0.5 (McIntyre–Sasahara; Q27)
//   tensionPtx  pPtx = 20 mmHg × severity added to the pleural pressure (one side; 5–25 mmHg, Q28)
//   rvInfarct   RV Emax × (1 − 0.65 × severity) (tables H8: Ees_RV × 0.35)
import type { CircModelState } from './model.ts';

export type CircConditionId = 'tamponade' | 'pe' | 'tensionPtx' | 'rvInfarct';
export const CIRC_CONDITIONS: readonly CircConditionId[] = ['tamponade', 'pe', 'tensionPtx', 'rvInfarct'];
export const TAMPONADE_ML = 250;
export const PE_MAX_FRAC = 0.8;
export const PE_VASO = 1.0;
export const PTX_MMHG = 20;
export const RV_INFARCT_LOSS = 0.65;

export function applyCircCondition(m: CircModelState, id: CircConditionId, severity: number): void {
  const s = Math.min(1, Math.max(0, severity));
  switch (id) {
    case 'tamponade':
      m.ext.vFluid = TAMPONADE_ML * s;
      return;
    case 'pe': {
      const phi = PE_MAX_FRAC * s;
      m.ext.pvr = (1 / (1 - phi)) * (1 + PE_VASO * phi);
      return;
    }
    case 'tensionPtx':
      m.ext.pPtx = PTX_MMHG * s;
      return;
    case 'rvInfarct':
      m.ext.kRv = 1 - RV_INFARCT_LOSS * s;
      return;
  }
}
