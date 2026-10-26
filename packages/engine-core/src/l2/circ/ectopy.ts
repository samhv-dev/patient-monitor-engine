// Ventricular ectopy from the physiology (E133): PVCs, couplets and non-sustained runs of VT drawn as a hazard from the
// SAME risk inputs the arrest model reads (arrest.ts `riskOf`: the membrane-effective K, core temperature, catecholamine
// inotropy) plus the arterial pH and the coronary ischaemia index kIsch (coronary.ts). The ectopic drive is
//   D = (sK + sT + sPh + sIsch)·(1 + G_CAT·cat) + sCat
// where each substrate term is 0 below its threshold and reaches 1 AT the arrest model's own threshold for the same
// input (K 6.5 → 8.5 = K_HAZARD, T 40 → 42 = T_HOT, T 32 → 28 = T_HAZARD, kIsch: the ST threshold → K_ISCH_ARREST),
// catecholamines multiply the substrate (β-adrenergic calcium loading of acidotic, hyperkalaemic or ischaemic
// myocardium) and add a term of their own only at exogenous-overdose levels. The event rate is λ = LAMBDA_1·D per
// minute (capped); each event is one PVC, a couplet or a non-sustained run, its complexity rising with D (the Lown
// progression). Every term is 0 in a healthy resting patient, so no draw is taken and such runs stay bit-identical.
// Runs are NON-sustained only (3–30 beats, < 30 s): VF onset stays the arrest model's (its hazards and vfShare); ectopy
// is the prodrome the same inputs produce, never a second route to VF.
import { K_HAZARD, K_ISCH_ARREST, T_HAZARD, T_HOT, type ArrestRisk } from './arrest.ts';
import { G_ISCH, ST_DEFICIT_MIN } from './coronary.ts';

/**
 * Hyperkalaemic ectopy starts at severe hyperkalaemia, K ≥ 6.5 mmol/L (the severe band of Durfey N et al., West J Emerg
 * Med 2017;18:963–971: 188 patients with K ≥ 6.5 (mean 7.1), adverse events within 6 h in 15 %, mostly symptomatic
 * bradycardia (22), VT in 2) and is full at the arrest hazard K_HAZARD. Hyperkalaemia is mainly a conduction and
 * bradyarrhythmic disorder, so its ectopic weight is the same as every other input's, never larger [ENG weight].
 */
export const K_ECT = 6.5;
/**
 * Hyperthermic ectopy from 40 °C core (the heat-stroke threshold; MH: arrhythmias are an early sign — Miller 10e Box
 * 31.1; VT/VF score in the MH clinical grading scale, Larach MG et al., Anesthesiology 1994;80:771–779), full at T_HOT 42.
 * Heat stroke without MH shows conduction and ischaemic changes rather than ectopy (Akhtar MJ et al., Chest
 * 1993;104:411–414: 46 patients, QT prolongation 61 %, conduction defects 22 %) [ENG weight].
 */
export const T_ECT_HOT = 40;
/** Hypothermic ectopy below 32 °C (ventricular dysrhythmias of moderate hypothermia: Mattu A et al., Am J Emerg Med
 * 2002;20:314–326), full at T_HAZARD 28 [ENG weight]. */
export const T_ECT_COLD = 32;
/**
 * Acidaemic ectopy below pH 7.20 (severe acidaemia: Jung B et al., Crit Care 2011;15:R238), full at pH 7.00. Acidosis
 * provokes early and delayed afterdepolarisations and triggered activity (Orchard CH & Cingolani HE, Cardiovasc Res
 * 1994;28:1312–1319) [ENG thresholds].
 */
export const PH_ECT = 7.2;
export const PH_FULL = 7.0;
/**
 * Ischaemic ectopy starts where the monitor shows ischaemia — the filtered flow deficit (1 − kIsch)/G_ISCH above
 * ST_DEFICIT_MIN, the same threshold as the ST depression (coronary.ts) — and is full at the low-flow arrest K_ISCH_ARREST.
 * Ischaemia and reperfusion are the classical substrate of ventricular ectopy and VT (Lown B & Wolf M, Circulation
 * 1971;44:130–142; reperfusion VT in 83 % of isolated hearts: Nakata T et al., J Mol Cell Cardiol 1990;22:843–858).
 */
export const ISCH_FULL_DEFICIT = (1 - K_ISCH_ARREST) / G_ISCH;
/**
 * Catecholamines multiply the substrate: catecholamine inotropy +1 (riskOf `cat`: endogenous surge + drugs) doubles
 * it [ENG]. Mechanism: β-adrenergic calcium loading of the acidotic or ischaemic cell (Orchard & Cingolani 1994).
 * MH-susceptible pigs have far higher plasma catecholamines and more severe ventricular arrhythmias than controls
 * under succinylcholine (Jönsson L et al., Zentralbl Veterinarmed A 1989;36:772–782); adrenaline during CPR raised the
 * number of shocks to ROSC 10 ± 8 vs 1.8 ± 0.4 with phenylephrine (rats, Tang W et al., Circulation 1995;92:3089–3093).
 */
export const G_CAT = 1;
/**
 * On their own catecholamines are ectopic only at exogenous-overdose levels: from inotropy +1 (above every endogenous
 * surge the model makes: MH to its arrest +0.73–0.87) to full at +2 [ENG]. IV-bolus adrenaline in anaphylaxis: CV
 * adverse events (arrhythmia among them) with 3 of 30 IV-bolus doses vs 4 of 316 IM (Campbell RL et al., J Allergy
 * Clin Immunol Pract 2015;3:76–80).
 */
export const CAT_ALONE = 1;
export const CAT_FULL = 2;
/** Ectopic events per minute at drive 1 (one input at its arrest threshold) [ENG]. For scale: Lown's "frequent" PVCs
 * are > 30/h (Lown & Wolf 1971); 6/min is a strip that shows them in every 10-s window. */
export const LAMBDA_1 = 6;
/** Ceiling on the event rate, per minute [ENG]. */
export const LAMBDA_MAX = 30;
/** The share of events that are couplets / runs rises with the drive, per unit, up to its maximum [ENG: the Lown
 * grading's progression single → couplet → run with the severity of the substrate]. */
export const P_COUPLET_PER_D = 0.15;
export const P_COUPLET_MAX = 0.3;
export const P_RUN_PER_D = 0.08;
export const P_RUN_MAX = 0.2;
/**
 * Non-sustained VT: ≥ 3 consecutive ventricular beats at > 100/min lasting < 30 s (Katritsis DG et al., J Am Coll
 * Cardiol 2012;60:1993–2004); drawn as 3 + a geometric excess of mean RUN_EXTRA_MEAN beats, at most RUN_MAX (30 beats at
 * the planner's 160/min ≈ 11 s) [ENG lengths].
 */
export const RUN_EXTRA_MEAN = 2;
export const RUN_MAX = 30;

export interface EctopyInputs extends ArrestRisk {
  ph: number;
  kIsch: number;
}

const ramp = (x: number, lo: number, hi: number) => Math.max(0, (x - lo) / (hi - lo));

/** The ectopic drive D and its terms (0 at rest). */
export function ectopyDrive(r: EctopyInputs): { k: number; t: number; ph: number; isch: number; cat: number; drive: number } {
  const k = ramp(r.kEcg, K_ECT, K_HAZARD);
  const t = ramp(r.tempC, T_ECT_HOT, T_HOT) + ramp(-r.tempC, -T_ECT_COLD, -T_HAZARD);
  const ph = ramp(-r.ph, -PH_ECT, -PH_FULL);
  const isch = ramp((1 - r.kIsch) / G_ISCH, ST_DEFICIT_MIN, ISCH_FULL_DEFICIT);
  const cat = ramp(r.cat, CAT_ALONE, CAT_FULL);
  return { k, t, ph, isch, cat, drive: (k + t + ph + isch) * (1 + G_CAT * Math.max(0, r.cat)) + cat };
}

/** Ectopic events per minute. */
export function ectopyRate(r: EctopyInputs): number {
  return Math.min(LAMBDA_MAX, LAMBDA_1 * ectopyDrive(r).drive);
}

/**
 * One step of dt seconds: the number of consecutive PVCs to place after the next supraventricular beat (1 single, 2 a
 * couplet, ≥ 3 a non-sustained run), or 0. `u` draws one uniform from the ectopy stream; nothing is drawn at drive 0.
 */
export function ectopyStep(r: EctopyInputs, u: () => number, dt: number): number {
  const d = ectopyDrive(r).drive;
  if (d <= 0) return 0;
  const lam = Math.min(LAMBDA_MAX, LAMBDA_1 * d) / 60;
  if (u() >= 1 - Math.exp(-lam * dt)) return 0;
  const x = u();
  const pRun = Math.min(P_RUN_MAX, P_RUN_PER_D * d);
  if (x < pRun) return Math.min(RUN_MAX, 3 + Math.floor(Math.log(1 - u()) / Math.log(RUN_EXTRA_MEAN / (1 + RUN_EXTRA_MEAN))));
  return x < pRun + Math.min(P_COUPLET_MAX, P_COUPLET_PER_D * d) ? 2 : 1;
}
