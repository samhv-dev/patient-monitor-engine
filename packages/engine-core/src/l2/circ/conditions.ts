// Circulatory conditions (tables §2.2 rows pPtx, vFluid, peFrac, peVaso; §7 checks 12–15; B §4.9
// conditions): each writes the CircModel's `ext` multipliers, which the 10 Hz control layer applies. Severity 0–1.
//   tamponade   vFluid = 250 mL × severity (acute tamponade 150–250 mL, Q29)
//   pe          φ = 0.8 × severity; PVR × 1/(1 − φ) × (1 + peVaso·φ), peVaso 0.5 (McIntyre–Sasahara; Q27)
//   tensionPtx  an alias of the lungs' lungCondition ptxTension (engine aliases.ts) — the lungs' per-side pPtx is the
//               one pleural source; `ext.pPtx` is not written (it stays 0 unless a test pokes it)
//   rvInfarct   right-ventricular infarction with inferior STEMI (brief 94): a REGIONAL infarct of RV_INFARCT_RM of the
//               RV myocardium (and LV_INFARCT_RM of the LV, the inferior wall) shifts the ESPVR rightward (Sunagawa
//               1983) — the RV dilates past the shared pericardium's free volume and raises the pericardial pressure on
//               both ventricles (interdependence: Goldstein 1982, 1983); the inferior wall adds the
//               Bezold–Jarisch vagal drive (Mark 1983), which keeps the rate from the baroreflex tachycardia
import type { CircModelState } from './model.ts';

export type CircConditionId = 'tamponade' | 'pe' | 'tensionPtx' | 'rvInfarct';
export const CIRC_CONDITIONS: readonly CircConditionId[] = ['tamponade', 'pe', 'tensionPtx', 'rvInfarct'];
export const TAMPONADE_ML = 250;
/** The most pericardial fluid the accumulation integrates to [ENG: scenario; beyond Q29's acute 150–250 mL]. */
export const TAMPONADE_MAX_ML = 500;
/** Optional fields of the tamponade condition — an absolute volume and an accumulation (− drainage) rate. */
export interface TamponadeOpts {
  volumeMl?: number;
  rateMlPerMin?: number;
}
export const PE_MAX_FRAC = 0.8;
export const PE_VASO = 1.0;
export const PTX_MMHG = 20;
/**
 * Infarcted fraction of the RV myocardium at severity 1. Sunagawa, Maughan & Sagawa 1983 (Circ Res 52:170): regional
 * ischaemia shifts the ESPVR rightward in parallel, ΔV0 = 50.7·Rm − 0.6 mL in the canine LV (slope unchanged in the
 * physiological range); global ischaemia lowers the slope instead (the RV Emax × 0.35 this condition used until
 * brief 94 was that global form, and it shrank the heart instead of dilating it). The engine takes ΔV0 = Rm × the
 * resting EDV of the chamber (the ischaemic segment keeps its share of the cavity; the canine 50.7 mL is that LV's
 * operating volume) [ENG: conversion; the canine slope read as size-free]. Rm 0.65, the tables-H8 65 %
 * [FIT: RVEF 30 ± 8 % before volume loading, the engine reads 31 %; src Dell'Italia 1985 Circulation 72:1327; brief 94]
 * (n 10, PCWP < 18; RVEF 27 ± 7 % in Dell'Italia 1984 JACC 4:931).
 */
export const RV_INFARCT_RM = 0.65;
/**
 * The inferior LV wall the same right-coronary occlusion infarcts: the RCA territory of the AHA 17-segment model is
 * segments 3, 4, 9, 10 and 15, 5/17 of the LV (Cerqueira 2002 Circulation 105:539), taken whole [ENG: scenario; a
 * transmural infarct of the whole territory, as in Dell'Italia 1984's inferior transmural series]. Same Sunagawa shift.
 */
export const LV_INFARCT_RM = 5 / 17;
/**
 * Bezold–Jarisch reflex of the inferior wall: the inferoposterior LV is the principal site of the inhibitory vagal
 * afferents, and their stimulation gives bradycardia and hypotension (Mark 1983 JACC 1:90); 55 % of patients seen
 * within 30 min of an infarct had excessive vagal activity (Webb, Adgey & Pantridge 1972 BMJ 3:89). Additive vagal RR
 * increment at the SA node, × (1 − muscarinic occupancy) like every vagal term (atropine reverses it), held while the
 * infarct is present
 * [FIT: HR ≈ 66 bpm = CI 1.9 / SVI 29 mL/m², the engine reads 65; src Dell'Italia 1985 Circulation 72:1327; brief 94].
 * The reflex's sympathetic inhibition (Mark 1983) is not modelled.
 */
export const BJ_VAGAL_MS = 420;

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
      m.ext.rvIschFrac = RV_INFARCT_RM * s;
      m.ext.lvIschFrac = LV_INFARCT_RM * s;
      m.ext.bjVagalMs = BJ_VAGAL_MS * s;
      return;
  }
}
