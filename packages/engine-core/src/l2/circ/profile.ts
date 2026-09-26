// Minimal Stage 7a profile layer (R22 via tables §1.1–§1.5; R44 evidence defaults): age band, sex and weight set
// blood volume, chamber and vessel scaling, arterial stiffness, baroreflex gain, MAP set point and resting HR;
// conditions (HFrEF, HFpEF, HTN, valve grades, CAD grade, β-blockade) apply multipliers in list order. The result
// is the base CircParams plus the targets the stabiliser tunes to (tables A19). Pure, deterministic, plain data.
import type { CircParams } from './circuit.ts';
import {
  A_LV, A_RV, AVA_REF, BETA_LV, BETA_RV, BV_ML_KG_F, BV_ML_KG_M, C_PA, C_PV, C_SV, EES_LV, EES_RV, EMAX_LA, EMAX_RA, EMIN_LA,
  EMIN_RA, GORLIN_AV, GORLIN_MV, MVA_REF, PERI_A, PERI_LAMBDA, PVR, R_AV, R_MV, R_PV, R_PVLA, R_TV, R_VR, RIGHT_LUNG_FLOW, V0_LA,
  V0_LV, V0_RA, V0_RV, Z_PA,
} from './params.ts';
import { stenosisK } from './valves.ts';
import { WK_R0 } from '../hemo/params.ts';

export type AgeBand = 'neonate' | 'infant' | 'child' | 'adolescent' | 'adult' | 'elderly';
export type ConditionId = 'hfref' | 'hfpef' | 'htn' | 'as' | 'ar' | 'mr' | 'ms' | 'tr' | 'cad' | 'betaBlocked' | 'rvFailure' | 'ph';
export interface CircCondition {
  id: ConditionId;
  /** 0–1 severity, or a named grade (see GRADES). */
  grade?: string;
  severity?: number;
}
export interface CircProfile {
  ageY: number;
  sex: 'M' | 'F';
  weightKg: number;
  conditions: CircCondition[];
}

/** Resolved profile: base circuit parameters plus the set points the stabiliser and the reflexes use. */
export interface ResolvedProfile {
  band: AgeBand;
  params: CircParams;
  bloodVolumeMl: number;
  stressedFrac: number;
  targets: { sbp: number; dbp: number; hr: number; cvp: number };
  mapSet: number;
  hrRest: number;
  hrMax: number;
  hrIntrinsic: number;
  gVagal: number; // ms/mmHg
  gSymp: number; // × on the sympathetic gains
  cfr: number; // coronary flow reserve (tables §3)
  betaBlock: number; // 0–1 fraction of the reflex β1 chronotropic gain removed (g_hs)
  betaBlockC: number; // 0–1 fraction of the β contractility gain and β-agonist drug response removed (g_c, betaResp)
  lvedpTarget: number;
  /** R45(c): the stabiliser anchors the LV EDPVR at the EDV the ventricle actually reaches (conditions that set an LVEDP). */
  tuneLvedp: boolean;
}

export function ageBand(ageY: number): AgeBand {
  if (ageY < 28 / 365) return 'neonate';
  if (ageY < 1) return 'infant';
  if (ageY < 12) return 'child';
  if (ageY < 18) return 'adolescent';
  if (ageY < 65) return 'adult';
  return 'elderly';
}

/** Grade tables (tables §1.5). Values: AVA/MVA cm², EROA cm² (ASE 2017: severe MR ≥ 0.40, AR ≥ 0.30), CFR. */
export const GRADES = {
  as: { mild: 1.6, moderate: 1.2, severe: 0.7, critical: 0.5 },
  ms: { mild: 2.0, moderate: 1.6, severe: 1.2, verySevere: 0.9 },
  mr: { mild: 0.1, moderate: 0.25, severe: 0.45 },
  ar: { mild: 0.08, moderate: 0.18, severe: 0.32 },
  tr: { mild: 0.1, moderate: 0.25, severe: 0.45 },
  cad: { none: 3.5, stable: 2.0, severe: 1.4, recentMI: 1.4 },
} as const;
/** LV stiffness multiplier by AS grade (tables §1.5 Q15: β ×1.0 / 1.3 / 1.6 / 2.0). */
const AS_BETA: Record<string, number> = { mild: 1.0, moderate: 1.3, severe: 1.6, critical: 2.0 };
/**
 * R45(c): concentric LV hypertrophy in AS raises end-systolic elastance with the grade (the hypertrophied LV
 * normalises wall stress and keeps ESV near normal at LVSP 170–200) [ENG, magnitude for Ali's R44 calibration pass].
 */
const AS_EES: Record<string, number> = { mild: 1.0, moderate: 1.3, severe: 1.7, critical: 2.0 };

const BAND = {
  // bvMlKg (M), MAP set, resting HR, vagal gain ms/mmHg, sympathetic ×, arterial compliance × (tables §1.1)
  neonate: { bv: 87, map: 45, hr: 140, gv: 4, gs: 0.7, c: 1.0 },
  infant: { bv: 78, map: 55, hr: 130, gv: 7, gs: 0.8, c: 1.0 },
  child: { bv: 72, map: 68, hr: 100, gv: 12, gs: 1, c: 1.0 },
  adolescent: { bv: 70, map: 80, hr: 75, gv: 17, gs: 1, c: 1.0 },
  adult: { bv: BV_ML_KG_M, map: 90, hr: 70, gv: 15, gs: 1, c: 1.0 },
  elderly: { bv: 62, map: 95, hr: 65, gv: 6.5, gs: 0.6, c: 0.5 },
} as const;

const sev = (c: CircCondition): number => Math.min(1, Math.max(0, c.severity ?? 1));

export const DEFAULT_PROFILE: CircProfile = { ageY: 40, sex: 'M', weightKg: 70, conditions: [] };

export function resolveProfile(pr: CircProfile = DEFAULT_PROFILE): ResolvedProfile {
  const band = ageBand(pr.ageY);
  const b = BAND[band];
  const w = pr.weightKg / 70; // tables §2.2: volumes/compliances ×W/70, resistances and elastances ×70/W
  const bvKg = pr.sex === 'F' && (band === 'adult' || band === 'elderly') ? BV_ML_KG_F : b.bv;
  const lvScale = pr.sex === 'F' ? 0.9 : 1; // tables §1.2 LV size
  const p: CircParams = {
    eesLv: EES_LV / (w * lvScale), v0Lv: V0_LV * w, aLv: A_LV, betaLv: BETA_LV / (w * lvScale),
    eesRv: EES_RV / w, v0Rv: V0_RV * w, aRv: A_RV, betaRv: BETA_RV / w,
    eminRa: EMIN_RA / w, emaxRa: EMAX_RA / w, v0Ra: V0_RA * w,
    eminLa: EMIN_LA / w, emaxLa: EMAX_LA / w, v0La: V0_LA * w,
    rSys: WK_R0 / w, cArt: b.c * w,
    cSv: C_SV * w, v0Sv: 0, rVr: R_VR / w,
    cPa: C_PA * w, zPa: Z_PA / w, pvrL: PVR / w / (1 - RIGHT_LUNG_FLOW), pvrR: PVR / w / RIGHT_LUNG_FLOW, cPv: C_PV * w, rPvla: R_PVLA / w,
    tv: { r: R_TV / w, k: 0, eroa: 0 }, pv: { r: R_PV / w, k: 0, eroa: 0 }, mv: { r: R_MV / w, k: 0, eroa: 0 }, av: { r: R_AV / w, k: 0, eroa: 0 },
    periA: PERI_A, periLambda: PERI_LAMBDA / w, v0Peri: 0, vFluid: 0,
  };
  const r: ResolvedProfile = {
    band, params: p, bloodVolumeMl: bvKg * pr.weightKg, stressedFrac: band === 'elderly' ? 0.22 : 0.25,
    targets: { sbp: 120, dbp: 80, hr: b.hr, cvp: 5 }, mapSet: b.map, hrRest: b.hr,
    hrMax: 208 - 0.7 * pr.ageY, hrIntrinsic: 118 - 0.57 * pr.ageY, gVagal: b.gv, gSymp: b.gs, cfr: GRADES.cad.none, betaBlock: 0, betaBlockC: 0,
    lvedpTarget: 8,
    tuneLvedp: false,
  };
  if (band === 'elderly') r.targets = { sbp: 140, dbp: 80, hr: b.hr, cvp: 5 };
  let edvRef = 120 * w * lvScale; // mL, the EDV at which the EDPVR passes through the profile's LVEDP [ENG anchor]
  for (const c of pr.conditions) {
    applyCondition(r, c);
    if (c.id === 'hfref') edvRef *= 1 + 0.5 * sev(c); // eccentric dilatation (tables §1.5 HFrEF)
  }
  // Anchor the LV EDPVR: stiffness conditions steepen β, and A is refitted so P(EDV_ref) = LVEDP target. Without it
  // β multipliers compound on the exponential (AS + HTN: LVEDP 67 at EDV 119 in the prototype) [ENG, plan decision 5].
  p.aLv = r.lvedpTarget / (Math.exp(p.betaLv * (edvRef - p.v0Lv)) - 1);
  return r;
}

function applyCondition(r: ResolvedProfile, c: CircCondition): void {
  const p = r.params;
  const s = sev(c);
  const lerp = (m: number) => 1 + (m - 1) * s;
  switch (c.id) {
    case 'hfref': // tables §1.5: Ees ×0.45, β ×1.3, V ×1.10, G_v ×0.5, MAP_set 75
      p.eesLv *= lerp(0.45);
      p.betaLv *= lerp(1.3);
      r.bloodVolumeMl *= lerp(1.1);
      r.gVagal *= lerp(0.5);
      r.mapSet = 75;
      r.targets = { ...r.targets, sbp: 105, dbp: 65 };
      r.lvedpTarget = 18;
      r.tuneLvedp = true;
      return;
    case 'hfpef': // β ×2.5, arterial C ×0.7
      p.betaLv *= lerp(2.5);
      p.cArt *= lerp(0.7);
      r.lvedpTarget = 18;
      r.tuneLvedp = true;
      return;
    case 'htn': // +20 MAP_set, C ×0.7, R ×1.2, G_v ×0.6, β ×1.3
      r.mapSet += 20 * s;
      p.cArt *= lerp(0.7);
      p.rSys *= lerp(1.2);
      r.gVagal *= lerp(0.6);
      p.betaLv *= lerp(1.3);
      r.targets = { ...r.targets, sbp: r.targets.sbp + 15 * s, dbp: r.targets.dbp + 5 * s };
      return;
    case 'as': {
      const g = (c.grade ?? 'severe') as keyof typeof GRADES.as;
      const ava = GRADES.as[g];
      p.av = { ...p.av, k: stenosisK(ava, GORLIN_AV, AVA_REF) };
      p.betaLv *= AS_BETA[g] ?? 1;
      p.eesLv *= AS_EES[g] ?? 1;
      // R45(c): a compensated severe AS rests at LVEDP ≈ 18 (tables §3 worked example; 15–20), milder grades lower [ENG].
      // The stabiliser anchors the EDPVR at the EDV the hypertrophied LV actually reaches (the analytic 120 mL anchor
      // left the prototype at LVEDP 40 at CVP 5, 30 at CVP 3), so the CVP target stays 5.
      r.lvedpTarget = Math.max(r.lvedpTarget, g === 'severe' || g === 'critical' ? 18 : 12);
      r.tuneLvedp = true;
      return;
    }
    case 'ms': {
      const g = (c.grade ?? 'severe') as keyof typeof GRADES.ms;
      p.mv = { ...p.mv, k: stenosisK(GRADES.ms[g], GORLIN_MV, MVA_REF) };
      return;
    }
    case 'mr':
      p.mv = { ...p.mv, eroa: GRADES.mr[(c.grade ?? 'severe') as keyof typeof GRADES.mr] };
      if ((c.grade ?? 'severe') === 'severe' && c.severity !== undefined && c.severity < 0.5) p.emaxLa = p.eminLa = 0.1; // chronic big LA [ENG]
      return;
    case 'ar':
      p.av = { ...p.av, eroa: GRADES.ar[(c.grade ?? 'severe') as keyof typeof GRADES.ar] };
      return;
    case 'tr':
      p.tv = { ...p.tv, eroa: GRADES.tr[(c.grade ?? 'severe') as keyof typeof GRADES.tr] };
      return;
    case 'cad':
      r.cfr = GRADES.cad[(c.grade ?? 'severe') as keyof typeof GRADES.cad];
      if (c.grade === 'recentMI') p.eesLv *= 0.8;
      return;
    case 'betaBlocked': // tables §1.5: HR 55–65, g_hs ×0.4 (range ×0.2–0.7), g_c ×0.5, β-agonist ×0.5
      // g_hs ×0.2 (low end of the tables' range): the 7a reflex needs more sympathetic drive in class III than the
      // tables' linear sketch, and "HR stays < 100 in class III" (tables §1.5, §7 17b) holds only at ×0.2 [ENG, R44]
      r.betaBlock = 0.8 * s;
      r.betaBlockC = 0.5 * s;
      r.hrRest = 60;
      r.targets = { ...r.targets, hr: 60 };
      return;
    case 'rvFailure':
      p.eesRv *= lerp(0.5);
      return;
    case 'ph': // PVR 3/5/10 WU by grade (tables §1.5), RV Ees ×1.3–2
      p.pvrL *= lerp(3);
      p.pvrR *= lerp(3);
      p.eesRv *= lerp(1.6);
      return;
  }
}
