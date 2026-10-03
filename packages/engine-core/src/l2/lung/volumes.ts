// Stage 7k (R57): static lung volumes and the forced expiration. Pure functions; mL and s.
//
// PREDICTED (seated, healthy, the "% predicted" reference a PFT lab prints):
//   adults 18–70 y: ECSC/ERS 1993 (Quanjer et al., Eur Respir J 1993;6 Suppl 16:5 — Table 8 of Stocks & Quanjer,
//     Eur Respir J 1995;8:492, for TLC/RV/FRC; the ECSC spirometry equations for FVC/FEV1), H in metres; age 18–25 is
//     entered as 25 and age > 70 as 70 (the equations' stated range); height is clamped to 1.45–1.95 m.
//   children < 18 y: Zapletal et al. (plethysmographic; the ERS recommendation in Stocks & Quanjer 1995, Table 7),
//     power laws in stature (cm); below the 5 y lower bound they are extrapolated [ENG]. Children's spirometry: FVC =
//     0.95 × VC and FEV1/FVC 0.90 [ENG; preschool FEV1/FVC ≈ 0.9 (GLI-2012 direction)]. 16–20 y: the two sets are
//     BLENDED linearly (the switch at 18 y otherwise jumps TLC +15–24 % at one birthday) [ENG]. v1.0 uses ECSC with the
//     fixed FEV1/FVC ratio (orchestrator ruling on Q-7k-3); GLI with the lower limit of normal is v1.1. FEV1/FVC
//     predicted is FEV1pred/FVCpred (82.4 % at 40 y), not ECSC's separate ratio equation (87.21 − 0.18A = 80.0 %).
//   PEF predicted: ECSC (men 6.14H − 0.043A + 0.15, women 5.50H − 0.030A − 1.11 L/s); children: the model's own
//     healthy peak (FVCpred/τf,ref) [ENG].
// ACTUAL (this patient today) = predicted × the pathology the lung resolves:
//   aeration   — lung that holds no gas (consolidation, compression, collapse: the conditions' atel + consol) scales
//                TLC, RV and VC by the whole-lung aerated fraction;
//   VOLUME_EFFECTS — the conditions whose static-volume change is not an aeration change (hyperinflation and gas
//                trapping in COPD/asthma, parenchymal and chest-wall restriction), severity knots with their source;
//   strength   — respiratory-muscle weakness (lp.pMax < 1: neuromuscular weakness, diaphragm paralysis) lowers TLC and
//                raises RV (the classic restrictive pattern of weakness) [ENG].
// Two FRCs, two owners, two labels: the BEDSIDE FRC (supine, awake → anaesthetised: FU-6's `frcNow` × the conditions'
// `frc` × aeration — the O2 store, not computed here) and the PFT lab's SEATED FRC below (predicted × pathology), which
// ERV (= FRCsit − RV) and IC (= TLC − FRCsit) are defined against, as a lab reports them (ATS/ERS 2005 lung volumes).
//
// THE FORCED EXPIRATION (FEV1, FVC, PEF, FEV1/FVC) — a model, not a lookup. From TLC each lung unit empties toward
// RV with its own forced-expiratory time constant τf,u (the classic "lung as emptying compartments" view of the
// maximal expiratory flow–volume curve: Mead 1978; Pride, Permutt, Riley & Bromberger-Barnea 1967 — flow limited by
// the unit's elastic recoil over its upstream resistance, V̇max ≈ (V − RV)/τf):
//   τf,u = τf,ref × (Rex,u·Crs,u) / (Rex·Crs)healthy        (the unit's expiratory R·C against the same patient's
//                                                             healthy lung — the tube is not in a spirometer)
//   τf,ref = −1 / ln(1 − FEV1/FVC predicted)                   (so the healthy patient reproduces the reference ratio)
//   V_u(t) = VC_u·e^(−t/τf,u);  FEV1 = Σ VC_u(1 − e^(−1/τf,u))
//   FVC = Σ VC_u(1 − e^(−T/τf,u)), T = end of test: total flow < 0.025 L/s or 15 s (ATS/ERS 2019 end-of-forced-
//   expiration criteria) — slow units still holding gas at T is gas trapping (FVC < VC).
// PEF is NOT the curve's t = 0 value: the peak is effort-dependent and wave-speed limited in the CENTRAL airways
// (Dawson & Elliott 1977 J Appl Physiol 43:498; Mead 1978), so it is less sensitive to peripheral resistance than the
// rest of the forced expiration: PEF = PEFpred × Σ VC_u·r_u^(−PEAK_TAU_EXP) / FVCpred, r_u = (Rex,u·Crs,u)/(Rex·Crs)
// healthy — restriction scales it by the forced VC, obstruction by a weaker power of the R·C ratio than FEV1's.
// PEAK_TAU_EXP [ENG; fit: PEF % predicted tracks FEV1 % predicted within ±15 points in acute severe asthma and COPD
// GOLD 2–4 (BTS/SIGN 2019 and GINA grade acute asthma by PEF % of predicted/best: 33–50 % acute severe, < 33 %
// life-threatening)]. The 7h PFT device draws the rise to PEF and then joins the effort-independent curve below.
// Obstruction (raised R, fast/slow heterogeneity: asthma, COPD, bronchospasm) therefore lowers FEV1/FVC and scoops the
// flow–volume curve (the slow units' tail); restriction lowers FVC and FEV1 together and keeps the ratio. The four
// (VC_u, τf,u) pairs are published so a PFT device (7h) redraws the loop: V̇(t) = Σ VC_u/τf,u·e^(−t/τf,u).
import type { LungConditionSpec } from '../../types-lung.ts';
import { conditionData, effectValue, interp } from './conditions.ts';
import type { Knots } from '../../../data/lung-pathology.ts';
import { mechParams, healthyParams, type LungParams } from './side.ts';
import { N_UNITS, SIDE_SHARE } from './params.ts';
import { complianceAt } from './venegas.ts';

export interface VolPatient { ageY: number; sex: 'M' | 'F'; heightCm: number }
export interface Predicted { tlc: number; rv: number; frc: number; vc: number; fvc: number; fev1: number; ratio: number; pef: number }

/** Children below this age use the Zapletal power laws (Stocks & Quanjer 1995 Table 7, 5–18 y). */
export const ADULT_FROM_Y = 18;

/** 16–20 y: Zapletal and ECSC blended linearly by age (F11) [ENG]. */
export const BLEND_FROM_Y = 16;
export const BLEND_TO_Y = 20;

export function predictedVolumes(p: VolPatient): Predicted {
  if (p.ageY > BLEND_FROM_Y && p.ageY < BLEND_TO_Y) {
    const w = (p.ageY - BLEND_FROM_Y) / (BLEND_TO_Y - BLEND_FROM_Y);
    const c = predictedRaw({ ...p, ageY: BLEND_FROM_Y });
    const a = predictedRaw({ ...p, ageY: ADULT_FROM_Y });
    const m = (k: keyof Predicted) => (1 - w) * c[k] + w * a[k];
    return { tlc: m('tlc'), rv: m('rv'), frc: m('frc'), vc: m('vc'), fvc: m('fvc'), fev1: m('fev1'), ratio: m('fev1') / m('fvc'), pef: m('pef') };
  }
  return predictedRaw(p);
}

function predictedRaw(p: VolPatient): Predicted {
  const male = p.sex !== 'F';
  if (p.ageY < ADULT_FROM_Y) {
    const h = Math.max(45, p.heightCm);
    // Zapletal (plethysmography), mL, H in cm — boys / girls
    const tlc = male ? 9.96e-3 * h ** 2.5698 : 9.17e-3 * h ** 2.5755;
    const frc = male ? 3.22e-3 * h ** 2.6523 : 3.7e-3 * h ** 2.6149;
    const rv = 21.06e-3 * h ** 2.1314;
    const vc = tlc - rv;
    const fvc = 0.95 * vc;
    return { tlc, rv, frc, vc, fvc, fev1: 0.9 * fvc, ratio: 0.9, pef: fvc / tauRef(0.9) };
  }
  const a = Math.min(70, Math.max(25, p.ageY));
  const h = Math.min(male ? 1.95 : 1.8, Math.max(male ? 1.55 : 1.45, p.heightCm / 100));
  const L = 1000;
  const tlc = L * (male ? 7.99 * h - 7.08 : 6.6 * h - 5.79);
  const rv = L * (male ? 1.31 * h + 0.022 * a - 1.23 : 1.81 * h + 0.016 * a - 2.0);
  const frc = L * (male ? 2.34 * h + 0.01 * a - 1.09 : 2.24 * h + 0.001 * a - 1.0);
  const fvc = L * (male ? 5.76 * h - 0.026 * a - 4.34 : 4.43 * h - 0.026 * a - 2.89);
  const fev1 = L * (male ? 4.3 * h - 0.029 * a - 2.49 : 3.95 * h - 0.025 * a - 2.6);
  const pef = L * (male ? 6.14 * h - 0.043 * a + 0.15 : 5.5 * h - 0.03 * a - 1.11); // mL/s
  return { tlc, rv, frc, vc: tlc - rv, fvc, fev1, ratio: fev1 / fvc, pef };
}

/**
 * Static-volume effects that are not an aeration change, as multipliers on the predicted TLC and RV at severity knots
 * (piecewise linear, like the catalogue's). Each row cites its source; [ENG] rows name their fit target.
 */
export const VOLUME_EFFECTS: Readonly<Record<string, { tlc?: Knots; rv?: Knots; frc?: Knots; gaAtel?: true; src: string }>> = {
  // hyperinflation and gas trapping: GOLD 1–4 at severity 0.25/0.5/0.75/1
  copd: { tlc: [[0, 1], [0.25, 1.0], [0.5, 1.05], [0.75, 1.15], [1, 1.25]], rv: [[0, 1], [0.25, 1.15], [0.5, 1.4], [0.75, 1.75], [1, 2.2]], frc: [[0, 1], [0.25, 1.05], [0.5, 1.15], [0.75, 1.35], [1, 1.6]], src: 'COPD hyperinflation: TLC > 120 % and RV > 150–250 % pred in severe disease (ATS/ERS 2005 interpretation, Pellegrino; O\'Donnell 2001 AJRCCM 164:770 direction) [ENG knots; fit: GOLD 3–4 RV/TLC > 0.55]' },
  asthma: { tlc: [[0, 1], [0.6, 1], [1, 1.1]], rv: [[0, 1], [0.4, 1.1], [0.6, 1.2], [1, 2.0]], frc: [[0, 1], [0.6, 1.05], [1, 1.3]], src: 'acute severe asthma: RV ≈ 200 % pred (gas trapping; McFadden & Lyons 1968 J Clin Invest 47:1566 direction) [ENG knots]' },
  bronchospasm: { rv: [[0, 1], [1, 1.8]], frc: [[0, 1], [1, 1.25]], src: 'acute bronchospasm traps gas like acute asthma [ENG, the asthma row at the same airway resistance]' },
  // restriction
  ild: { tlc: [[0, 1], [0.3, 0.75], [0.6, 0.6], [0.9, 0.45], [1, 0.45]], rv: [[0, 1], [0.3, 0.75], [0.6, 0.6], [0.9, 0.45], [1, 0.45]], src: "the catalogue's §7 GRADES: FVC 70–80 / 50–70 / < 50 % at severity 0.3/0.6/0.9 → TLC and RV at the band middles 0.75/0.6/0.45 (proportional restriction, RV/TLC preserved) [ENG; the §7 'FRC / TLC' row's 0.85/0.7/0.55 stays the O2-store FRC multiplier]" },
  chestWall: { tlc: [[0, 1], [0.33, 0.85], [0.67, 0.7], [1, 0.5]], src: "catalogue §9 row 'FRC, VC' 0.85/0.7/0.5 (Stoelting 8e ch. 3); RV preserved (RV/TLC rises) [TXT]" },
  obesity: { tlc: [[0, 1], [0.5, 0.97], [1, 0.9]], frc: [[0, 1], [0.5, 0.85], [1, 0.7]], gaAtel: true, src: 'obesity: TLC falls little (≈ 90 % at BMI 40) while ERV falls steeply (Jones & Nzekwu 2006 Chest 130:827) — seated FRC 70 % and ERV ≈ 25–35 % at BMI 40 [ENG knots]' },
  pregnancy: { tlc: [[0, 1], [1, 0.95]], rv: [[0, 1], [0.33, 1], [1, 0.8]], frc: [[0, 1], [0.33, 1], [1, 0.8]], gaAtel: true, src: 'term pregnancy: TLC −0–5 %, RV −20 %, FRC −20 % (Hegewald & Crapo 2011 Clin Chest Med 32:1) [TXT]' },
};

export interface Actual {
  tlc: number; rv: number; vc: number;
  /** Seated FRC (the PFT lab's), ERV and IC relative to it. The bedside (supine, awake → anaesthetised) FRC is the lung's own, not this. */
  frcSit: number; erv: number; ic: number;
  fvc: number; fev1: number; ratio: number; pef: number; fet: number;
  /** Forced-expiration units: VC_u (mL) and τf,u (s) — V̇(t) = Σ v[u]/tau[u]·e^(−t/tau[u]). */
  fe: { v: number[]; tau: number[] };
}

/** Forced-expiratory sensitivity to the unit's passive R·C ratio [ENG; fit: the catalogue's COPD grades = GOLD FEV1 ≥ 80 / 50–79 / 30–49 / < 30 % pred with FEV1/FVC < 0.70, and the ILD grades' FVC bands]. */
export const FORCED_TAU_EXP = 0.6;
/** F3: the peak's weaker dependence on the R·C ratio [ENG; fit as the header says — 0.2/0.3/0.4/0.5 tried: 0.3 puts acute severe asthma at PEF 39 % with FEV1 35 % and COPD GOLD 1–4 at 72/58/47/35 % with FEV1 71/55/41/28 %]. */
export const PEAK_TAU_EXP = 0.3;
/** τf,ref (s) for a predicted FEV1/FVC. */
export function tauRef(ratio: number): number {
  return -1 / Math.log(1 - Math.min(0.95, Math.max(0.3, ratio)));
}
/** ATS/ERS 2019 end of forced expiration: flow < 25 mL/s, or 15 s. */
export const EOFE_FLOW_ML_S = 25;
export const EOFE_MAX_S = 15;

/** Unit expiratory time constant (s) as the lung module defines it: Rex × (unit lung C in series with its chest-wall share). */
function unitTaus(lp: LungParams, aer: number[]): { tau: number[]; share: number[] } {
  const mp = mechParams(lp, aer, [false, false]);
  const tau: number[] = [];
  const share: number[] = [];
  for (let u = 0; u < N_UNITS; u++) {
    const un = mp.units[u]!;
    const c = complianceAt(un.sig, 0);
    const crs = 1 / (1 / Math.max(1e-3, c) + 1 / (lp.ccw * (SIDE_SHARE[u >> 1] as number)));
    tau.push(un.rIn < 1e3 ? un.rEx * crs : Infinity);
    const sp = lp.side[u >> 1]!;
    share.push((SIDE_SHARE[u >> 1] as number) * (aer[u >> 1] as number) * ((u & 1) === 1 ? sp.fSlow : 1 - sp.fSlow));
  }
  return { tau, share };
}

/** The healthy reference unit τ per IBW (F16: cached — it depends on the IBW only). */
const REF_TAU = new Map<number, number>();
function refTau(ibwKg: number): number {
  let t = REF_TAU.get(ibwKg);
  if (t === undefined) { t = unitTaus(healthyParams(ibwKg), [1, 1]).tau[0] as number; if (REF_TAU.size < 64) REF_TAU.set(ibwKg, t); }
  return t;
}
/** Non-aerated share the GA/supine-only conditions (`gaAtel`: induction and supine atelectasis — not a seated PFT loss) add. */
function gaAtelShare(specs: readonly LungConditionSpec[]): number {
  let x = 0;
  for (const s of specs) {
    if (!VOLUME_EFFECTS[s.id]?.gaAtel || !(s.severity > 0)) continue;
    for (const e of conditionData(s.id)?.effects ?? []) if (e.key === 'atel' || e.key === 'consol') x += effectValue(e, Math.min(1, s.severity));
  }
  return x;
}

/**
 * This patient's static volumes and forced expiration now. `frc` = the lung's current FRC (mL, from the resp
 * pipeline); `lp` = the resolved lung; `specs` = the conditions (for VOLUME_EFFECTS); `aerCond` = the conditions'
 * aerated fraction per side (1 − atel − consol, before induction atelectasis).
 */
export function actualVolumes(pred: Predicted, lp: LungParams, specs: readonly LungConditionSpec[], aerCond: number[]): Actual {
  let tlcM = 1;
  let rvM = 1;
  let frcM = 1;
  let frcOwn = false;
  for (const s of specs) {
    const v = VOLUME_EFFECTS[s.id];
    if (!v || !(s.severity > 0)) continue;
    const sev = Math.min(1, s.severity);
    if (v.tlc) tlcM *= interp(v.tlc, sev);
    if (v.rv) rvM *= interp(v.rv, sev);
    if (v.frc) { frcM *= interp(v.frc, sev); frcOwn = true; }
  }
  if (!frcOwn) frcM = lp.frcMult; // conditions without a seated row: the catalogue's own FRC multiplier
  // F13: a seated PFT does not see the GA/supine atelectasis of the obesity and pregnancy rows
  const aerW = Math.min(1, SIDE_SHARE[0] * (aerCond[0] as number) + SIDE_SHARE[1] * (aerCond[1] as number) + gaAtelShare(specs));
  const weak = Math.min(1, Math.max(0, lp.pMax)); // respiratory-muscle strength
  const tlc = pred.tlc * tlcM * aerW * (0.6 + 0.4 * weak); // [ENG] weakness: TLC 60 % at no strength
  const rv = Math.min(tlc * 0.95, pred.rv * rvM * aerW * (1 + 0.5 * (1 - weak))); // [ENG] weakness: RV 150 %
  const vc = Math.max(0, tlc - rv);
  const frcSit = Math.min(tlc, Math.max(rv, pred.frc * frcM * aerW));
  // forced expiration
  const { tau: tauU, share } = unitTaus(lp, aerCond);
  const tauH = refTau(lp.ibwKg);
  const tauF0 = tauRef(pred.ratio);
  const sSum = share.reduce((a, b) => a + b, 0) || 1;
  const vcF = vc * Math.min(1, pred.fvc / Math.max(1, pred.vc)); // the forced VC: dynamic compression of the healthy lung (FVC < VC by the reference equations' own margin)
  const v = share.map((s) => (vcF * s) / sSum);
  const tau = tauU.map((t) => (Number.isFinite(t) ? tauF0 * (t / tauH) ** FORCED_TAU_EXP : 1e3));
  const pef = (pred.pef * v.reduce((a, vu, u) => a + (Number.isFinite(tauU[u] as number) ? vu * ((tauU[u] as number) / tauH) ** -PEAK_TAU_EXP : 0), 0)) / Math.max(1, pred.fvc);
  const flowAt = (t: number) => v.reduce((a, vu, u) => a + (vu / (tau[u] as number)) * Math.exp(-t / (tau[u] as number)), 0);
  let fet = EOFE_MAX_S;
  for (let t = 0.5; t <= EOFE_MAX_S; t += 0.05) if (flowAt(t) < EOFE_FLOW_ML_S) { fet = t; break; }
  const out = (t: number) => v.reduce((a, vu, u) => a + vu * (1 - Math.exp(-t / (tau[u] as number))), 0);
  const fvc = out(fet);
  const fev1 = out(1);
  return {
    tlc, rv, vc, frcSit, erv: frcSit - rv, ic: tlc - frcSit,
    fvc, fev1, ratio: fvc > 0 ? fev1 / fvc : 0, pef, fet,
    fe: { v, tau },
  };
}

/** Closing capacity (mL, supine reference): equals the supine FRC at 44 y and the seated FRC at 66 y (Leblanc,
 * Ruff & Milic-Emili 1970 J Appl Physiol 28:448), linear in age between and beyond [ENG line through the two anchors]. */
export function closingCapacity(pred: Predicted, ageY: number, supineFrcMl: number): number {
  const k = (ageY - 44) / (66 - 44);
  return supineFrcMl + k * (pred.frc - supineFrcMl);
}

/** ATS/ERS 2005 pattern: obstructive FEV1/FVC < 0.70 (GOLD fixed ratio; the LLN is the ERS/ATS 2022 choice — the
 * fixed ratio is the one residents are examined on); restrictive TLC < 80 % predicted; mixed both. */
export function pattern(a: Actual, pred: Predicted): 'normal' | 'obstructive' | 'restrictive' | 'mixed' {
  const obs = a.ratio < 0.7;
  const res = a.tlc < 0.8 * pred.tlc;
  return obs && res ? 'mixed' : obs ? 'obstructive' : res ? 'restrictive' : 'normal';
}
