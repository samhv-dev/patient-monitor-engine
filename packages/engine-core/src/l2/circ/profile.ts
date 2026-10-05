// Minimal Stage 7a profile layer (R22 via tables §1.1–§1.5; R44 evidence defaults): age band, sex and weight set
// blood volume, chamber and vessel scaling, arterial stiffness, baroreflex gain, MAP set point and resting HR;
// conditions (HFrEF, HFpEF, HTN, valve grades, CAD grade, β-blockade) apply multipliers in list order. The result
// is the base CircParams plus the targets the stabiliser tunes to (tables A19). Pure, deterministic, plain data.
import { V_EMPTY_ML, type CircParams } from './circuit.ts';
import {
  A_LV, A_RV, AVA_REF, BETA_LV, BETA_RV, BV_ML_KG_F, BV_ML_KG_M, C_PA, C_PV, C_SV, EES_LV, EES_RV, EMAX_LA, EMAX_RA, EMIN_LA,
  EMIN_RA, GORLIN_AV, GORLIN_MV, MVA_REF, PERI_A, PERI_LAMBDA, PVR, R_AV, R_MV, R_PV, R_PVLA, R_TV, R_VR, RIGHT_LUNG_FLOW, V0_LA,
  V0_LV, V0_RA, V0_RV, V_CPR_REF_FRAC, Z_PA,
} from './params.ts';
import { stenosisK } from './valves.ts';
import { WK_R0 } from '../hemo/params.ts';
import { sizeWeightKg } from '../body-size.ts';

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
  /** FU-8 (C4): height, for the body-size rule (l2/body-size.ts); absent = the band's default height. */
  heightCm?: number;
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
  /** FU-7 (addendum 21): chronic β-blockade as RECEPTOR OCCUPANCY (0–1) — the dose-ratio input of 7g's competitive
   * β-agonist EC50 shift, separate from the reflex gains above (which stay the tables' ×0.4 / ×0.5). */
  betaOcc: number;
  /** FU-7 (addendum 21): non-selective blockade (propranolol-like) occupies β2 too — adrenaline's vasodilator arm. */
  betaNonSel: boolean;
  lvedpTarget: number;
  ageY: number; // the profile's age (drug sensitivity)
  /** R45(c): the stabiliser anchors the LV EDPVR at the EDV the ventricle actually reaches (conditions that set an LVEDP). */
  tuneLvedp: boolean;
  /**
   * FU-8 (C1, Part B): the tonic SYMPATHETIC share of resting SVR (baroreflex.ts `tonic`); MSNA-graded [ENG]. A constant
   * of the profile — never a function of the arrest or perfusion state (research/23 §6.3 note 4: those act through the
   * delivered output `outF × brainF`). A VAGAL twin (`tonicVagal`: the resting cardiac vagal level an antimuscarinic
   * removes, the resting BRS and its age decline) is expected from FU-12's autonomic hub; this number does not cover it.
   */
  tonicSymp: number;
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
  ph: { mild: 3, moderate: 5, severe: 10 }, // FU-8 (C8): PVR in Wood units (tables §1.5; ESC/ERS 2022)
} as const;
/** FU-8 (C8): the resting circuit's total PVR in Wood units (PVR 0.1 mmHg·s/mL × 1000/60). */
const PVR_REST_WU = (PVR * 1000) / 60;
/** FU-8 (C8): RV Ees multiplier by PH grade (tables §1.5: × 1.3 / 1.6 / 2.0, adapted hypertrophy). */
const PH_EES_RV: Record<string, number> = { mild: 1.3, moderate: 1.6, severe: 2.0 };
/** LV stiffness multiplier by AS grade (tables §1.5 Q15: β ×1.0 / 1.3 / 1.6 / 2.0). */
const AS_BETA: Record<string, number> = { mild: 1.0, moderate: 1.3, severe: 1.6, critical: 2.0 };
/**
 * R45(c): concentric LV hypertrophy in AS raises end-systolic elastance with the grade (the hypertrophied LV
 * normalises wall stress and keeps ESV near normal at LVSP 170–200) [ENG, magnitude for Ali's R44 calibration pass].
 */
const AS_EES: Record<string, number> = { mild: 1.0, moderate: 1.3, severe: 1.7, critical: 2.0 };
/** FU-8 (C1, Part B): tonic sympathetic share of resting SVR by profile [ENG; MSNA: Sundlöf & Wallin 1978, Grassi 1998]. */
export const TONIC_ADULT = 0.2;
export const TONIC_ELDERLY = 0.3;
export const TONIC_HTN = 0.1;
export const TONIC_HFREF = 0.25;

/** FU-8 (C5): the stabiliser's resting MAP (radial) sits this far above the reflex set point — the adult default
 * 120/80 (MAP 93.3) against 90 [ENG: kept so no adult row moves]. */
export const TARGET_MAP_ABOVE_SET = 10 / 3;

const BAND = {
  // bvMlKg (M), MAP set, resting HR, vagal gain ms/mmHg, sympathetic ×, arterial compliance × (tables §1.1);
  // pp: FU-8 (C5) the resting pulse pressure the stabiliser targets [TXT: PALS normal ranges — neonate 60–75/30–45,
  // infant 72–104/37–56, child 86–120/42–80, adolescent 110–131/64–83 mmHg; adult 120/80; elderly 140/80, ISH]
  neonate: { bv: 87, map: 45, hr: 140, gv: 4, gs: 0.7, c: 1.0, pp: 30 },
  infant: { bv: 78, map: 55, hr: 130, gv: 7, gs: 0.8, c: 1.0, pp: 30 },
  child: { bv: 72, map: 68, hr: 100, gv: 12, gs: 1, c: 1.0, pp: 35 },
  adolescent: { bv: 70, map: 80, hr: 75, gv: 17, gs: 1, c: 1.0, pp: 40 },
  adult: { bv: BV_ML_KG_M, map: 90, hr: 70, gv: 15, gs: 1, c: 1.0, pp: 40 },
  elderly: { bv: 62, map: 95, hr: 65, gv: 6.5, gs: 0.6, c: 0.5, pp: 60 },
} as const;

const sev = (c: CircCondition): number => Math.min(1, Math.max(0, c.severity ?? 1));

export const DEFAULT_PROFILE: CircProfile = { ageY: 40, sex: 'M', weightKg: 70, conditions: [] };

export function resolveProfile(pr: CircProfile = DEFAULT_PROFILE): ResolvedProfile {
  const band = ageBand(pr.ageY);
  const b = BAND[band];
  // FU-8 (C4, research/19; R50 F1, ruling 1): ONE continuous body-size rule (l2/body-size.ts, Lemmens-indexed, anchored
  // on the default 70 kg adult). Before, the circulation was sized on the total weight (127 kg / 175 cm: CO × 1.85,
  // BV 8.89 L = 70 mL/kg) while blood/gas held 6.5 L; tables §1.3: resting CO × 1.35 at BMI ≥ 40.
  const sizeKg = sizeWeightKg(band, pr.weightKg, pr.heightCm);
  const w = sizeKg / 70; // tables §2.2: volumes/compliances ×W/70, resistances and elastances ×70/W
  // per kg of ACTUAL weight: the band's blood volume per kg of SIZE weight × the size weight ÷ the weight
  const bvKg = ((pr.sex === 'F' && (band === 'adult' || band === 'elderly') ? BV_ML_KG_F : b.bv) * sizeKg) / pr.weightKg;
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
    vCprRef: V_CPR_REF_FRAC * bvKg * pr.weightKg, // FU-4 F1(a)
    vEmpty: V_EMPTY_ML * w, // FU-8 (F6): the outflow limiter scales with the heart (0.25 mL in a 3.5 kg neonate)
  };
  const r: ResolvedProfile = {
    band, params: p, bloodVolumeMl: bvKg * pr.weightKg, stressedFrac: band === 'elderly' ? 0.22 : 0.25,
    // FU-8 (C5, research/19): the band's resting pressure is centred on the band's reflex set point, with the band's
    // pulse pressure — ONE number per age band. Before, every band was tuned to 120/80 whatever its set point: a term
    // neonate (set point 45) stabilised at MAP 93 and sat at 82–89 at 600 s (SV 1.1 mL, CO 0.15 L/min). The adult
    // (120/80 ↔ 90) is unchanged; conditions then apply their deltas as before (HTN, HFrEF: Waiting on Ali, plan D13).
    targets: { sbp: b.map + TARGET_MAP_ABOVE_SET + (2 * b.pp) / 3, dbp: b.map + TARGET_MAP_ABOVE_SET - b.pp / 3, hr: b.hr, cvp: 5 }, mapSet: b.map, hrRest: b.hr,
    hrMax: 208 - 0.7 * pr.ageY, hrIntrinsic: 118 - 0.57 * pr.ageY, gVagal: b.gv, gSymp: b.gs, cfr: GRADES.cad.none, betaBlock: 0, betaBlockC: 0, betaOcc: 0, betaNonSel: false,
    lvedpTarget: 8,
    ageY: pr.ageY,
    tuneLvedp: false,
    // FU-8 (C1): young adult ≈ 0.2 (the resting SVR fall under autonomic ganglionic blockade); MSNA doubles 25 → 65 y
    // (Sundlöf & Wallin) — elderly 0.3; untreated HTN and HFrEF add below (Grassi 1998) [ENG sizes, Ali's review]
    tonicSymp: band === 'elderly' ? TONIC_ELDERLY : TONIC_ADULT,
  };
  // the elderly keep 140/80 (MAP 100 against the set point 95): 7d's check 18 (75 y HTN CBF plateau) is fitted to it,
  // and the elderly resting pressure is research/19 C5's Ali question (plan "Waiting on Ali")
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
      r.tonicSymp += TONIC_HFREF * s; // FU-8 (C1)
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
      r.tonicSymp += TONIC_HTN * s; // FU-8 (C1)
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
      // FU-7 (addendum 21): chronic metoprolol/bisoprolol — occupancy 0.85 = a dose ratio of ≈ 6.7 on every β-agonist's
      // EC50, which is tables §1.5's "β-agonist ×0.5" read as COMPETITIVE antagonism instead of a gain scale [ENG, Q1].
      // `betaNonSel` stays false (cardioselective is the common case; the scenario/profile may set it — Q1 asks Ali
      // whether the unopposed-α picture should need propranolol).
      r.betaOcc = 0.85 * s;
      r.hrRest = 60;
      r.targets = { ...r.targets, hr: 60 };
      return;
    case 'rvFailure':
      p.eesRv *= lerp(0.5);
      return;
    case 'ph': {
      // PVR 3/5/10 WU by grade (tables §1.5), RV Ees ×1.3–2. FU-8 (research/19 C8): the grade was ignored — PVR × 3 and
      // RV Ees × 1.6 at every grade (measured 5.9 WU for "severe"); the multipliers are now the grade's WU over the
      // resting circuit's PVR (0.1 mmHg·s/mL = 1.67 WU). No grade = moderate, the old behaviour.
      const g = (c.grade ?? 'moderate') as keyof typeof GRADES.ph;
      const m = GRADES.ph[g] / PVR_REST_WU;
      p.pvrL *= lerp(m);
      p.pvrR *= lerp(m);
      p.eesRv *= lerp(PH_EES_RV[g] ?? 1.6);
      return;
    }
  }
}
