// Circulatory conditions 7a implements (tables §2.2 rows pPtx, vFluid, peFrac, peVaso; §7 checks 12–15; B §4.9
// conditions): each writes the CircModel's `ext` multipliers, which the 10 Hz control layer applies. Severity 0–1.
//   tamponade   vFluid = 250 mL × severity (acute tamponade 150–250 mL, Q29)
//   pe          φ = 0.8 × severity; PVR × 1/(1 − φ) × (1 + peVaso·φ), peVaso 0.5 (McIntyre–Sasahara; Q27)
//   tensionPtx  FU-4 G6: an alias of 7b's lungCondition ptxTension (engine aliases.ts) — the lungs' per-side pPtx is the
//               one pleural source; `ext.pPtx` is no longer written (it stays 0 unless a test pokes it)
//   rvInfarct   RV Emax × (1 − 0.65 × severity) (tables H8: Ees_RV × 0.35)
import type { CircModelState } from './model.ts';

export type CircConditionId = 'tamponade' | 'pe' | 'tensionPtx' | 'rvInfarct';
export const CIRC_CONDITIONS: readonly CircConditionId[] = ['tamponade', 'pe', 'tensionPtx', 'rvInfarct'];
export const TAMPONADE_ML = 250;
/** FU-4 G6: the most pericardial fluid the accumulation integrates to [ENG: beyond Q29's acute 150–250 mL]. */
export const TAMPONADE_MAX_ML = 500;
/** FU-4 G6: optional fields of the tamponade condition — an absolute volume and an accumulation (− drainage) rate. */
export interface TamponadeOpts {
  volumeMl?: number;
  rateMlPerMin?: number;
}
export const PE_MAX_FRAC = 0.8;
export const PE_VASO = 1.0;
export const PTX_MMHG = 20;
export const RV_INFARCT_LOSS = 0.65;

export function applyCircCondition(m: CircModelState, id: CircConditionId, severity: number, opts: TamponadeOpts = {}): void {
  const s = Math.min(1, Math.max(0, severity));
  switch (id) {
    case 'tamponade':
      // FU-4 G6: an absolute volume (else 250 mL × severity, unchanged) and an optional accumulation/drainage rate
      m.ext.vFluid = opts.volumeMl !== undefined ? Math.min(TAMPONADE_MAX_ML, Math.max(0, opts.volumeMl)) : TAMPONADE_ML * s;
      m.ext.vFluidRate = (opts.rateMlPerMin ?? 0) / 60;
      return;
    case 'pe': {
      const phi = PE_MAX_FRAC * s;
      m.ext.pvr = (1 / (1 - phi)) * (1 + PE_VASO * phi);
      return;
    }
    case 'tensionPtx':
      void PTX_MMHG; // FU-4 G6: the engine routes this condition to 7b (aliases.ts); 7a keeps no second pleural source
      return;
    case 'rvInfarct':
      m.ext.kRv = 1 - RV_INFARCT_LOSS * s;
      return;
  }
}
