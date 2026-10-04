// CircModel: the L1-owned "haemodynamic integrator" (audit A4, R-A risk row) — the circuit state, its resolved
// parameters, the activations scheduled from the rhythm engine's beat/atrial records, the 10 Hz control layer
// (baroreflex, drugs, volume events, conditions) and per-beat truths. Stepped at 2 ms by the Stage 2 hemo pipeline
// inside the 20 ms tick; everything is plain JSON-safe data (the engine clones it every tick for the look-ahead).
import { activationPeriodS, pruneActivations, type Activation } from './activation.ts';
import { brainstemOutF, createBaro, K_PP, stepBaro, V0_RECRUIT_MAX_ML_KG, type BaroState } from './baroreflex.ts'; // FU-2 F4: V0_RECRUIT_MAX_ML_KG; FU-4 F1(b): brainstemOutF
import { createOut, evaluate, S, stepCirc, type CircDrive, type CircOut, type CircParams } from './circuit.ts';
import { bolusScale, drugEffect, pruneBoluses, type Bolus, type DrugEffect, type DrugId } from './drugs.ts';
import { betaBlunt } from '../pk/pd.ts'; // Stage 7g
import { ATRIAL_DELAY_S, ATRIAL_T_S, DYSSYNC, H_S, HIST_SVR, HIST_V0, K_PVR_CO2, P_PL0 } from './params.ts';
import { DEFAULT_PROFILE, resolveProfile, type CircProfile, type ResolvedProfile } from './profile.ts';
import { stabilise, type Stabilised } from './stabilise.ts';
import { createCoronary, G_ISCH, type CoronaryState } from './coronary.ts';
import { NO_FLOW_S } from './arrest.ts'; // FU-4 G-FU4-1: the declaration's no-flow window (type-only cycle: arrest.ts imports model.ts types only)
import { TAMPONADE_MAX_ML } from './conditions.ts'; // FU-4 G6 (type-only cycle: conditions.ts imports model.ts types only)
import type { RampState } from '../../l1/ramp.ts'; // FU-2
import { betaDV0Ml } from './venous.ts'; // FU-2

// hot-loop locals (imported bindings are getters under the vitest transform) [perf]
const L_H = H_S;
const L_evaluate = evaluate;
const L_stepCirc = stepCirc;
export const CTL_DT = 0.1; // control layer at 10 Hz (tables §2.1 step 6)
/**
 * R45(a) post-extrasystolic potentiation is a contractility (calcium) effect, not only Frank–Starling (research 03
 * §8.3, JAHA 2015): the beat after a premature one (RR < PESP_PREMATURE × the running normal RR, perfused or not)
 * gets its Emax raised by up to PESP_MAX for that one beat, scaled by prematurity [ENG magnitude, fitted to the
 * Stage 2 band +8–15 mmHg post-PVC SBP].
 */
/** Cardiac-output averaging time constant (CO follows compressions and beats alike) [ENG]. */
export const CO_TAU_S = 4;
export const PESP_MAX = 0.5;
export const PESP_PREMATURE = 0.8;
/**
 * FU-4 Task 17 (ruling 5 / review F14, attempt 1): MECHANICAL RESTITUTION — a beat's contractility recovers
 * exponentially with the interval since the previous activation (the force–interval relation; research 03 §8.2/§8.3,
 * AF "per-beat SV depends on preceding RR; pulse deficit for RR < ~350 ms", Annu Rev Med 1988, PubMed 3285783), so a
 * beat that arrives EARLIER than the running normal RR is weaker as well as under-filled. Applied to supraventricular
 * beats only (ventricular beats already carry the rhythm engine's k_rhythm) and only below the running normal RR, so
 * every steady rhythm is unchanged. Recovery 1 − exp(−(RR − REST_ERP_S)/REST_TAU_S), normalised to the running RR [ENG
 * sizes; fit: AF 150/min non-ejecting beats 10–20 %].
 */
export const REST_ERP_S = 0.2;
export const REST_TAU_S = 0.06;
function restitution(rr: number, rrRef: number): number {
  const f = (x: number) => 1 - Math.exp(-Math.max(0, x - REST_ERP_S) / REST_TAU_S);
  return rr >= 0.97 * rrRef ? 1 : f(rr) / Math.max(1e-6, f(rrRef)); // within 3 % of the running RR (steady rhythms, the EMA lag): exactly 1
}
/** FU-3 item 16: sinus-rate loss per unit of the hypoxic myocardial deficit `cor.hyp` [ENG, fitted: HR < 40 held within 6 min of SaO2 < 60 %, before the arrest]. */
export const G_SA = 1.5;
/** FU-3 item 16: floor of the hypoxic contractility factor 1 − cor.hyp (anoxic myocardium stops ejecting) [ENG]. */
export const K_HYP_MIN = 0.02;
/** FU-4 G4: the continuous MAP's averaging time constant (7d, 7e and the arrest's no-flow rule read it) [ENG]. */
export const MAP_NOW_TAU_S = 2;
/** FU-4 G1/G7: the ischaemic SA node slows once the LV flow share falls below K_BRADY (pre-arrest, "terminal" bradycardia
 * of decompensating shock) by G_SA_ISCH per unit of kIsch below it [ENG: HR at the arrest ≤ 60 % of its shock peak]. */
export const K_BRADY = 0.5;
export const G_SA_ISCH = 1.2;
/** FU-4 G3: sinus-rate depression per mmol/L of the membrane-effective K above 7 (hyperkalaemic sinus bradycardia) [ENG]. */
export const G_SA_K = 0.12;
/**
 * FU-4 G7 (Task 12 Step 3, Task 18f Step 3): the STIMULUS-driven vagal reflexes — laryngoscopy, the oculocardiac reflex
 * (traction on the extra-ocular muscles, pressure on the globe) and peritoneal/mesenteric traction — add a vagal RR
 * increment at the SA node, the same additive ms term as the drug bus's `vagalMs`, and × (1 − muscarinic occupancy)
 * so that atropine or glycopyrrolate given first abolishes them (Miller, ophthalmic anaesthesia: bradycardia or
 * asystole on traction, abolished by atropine; the reflex FATIGUES on sustained or repeated traction) [P direction].
 * Sizes [ENG]: laryngoscopy 300 ms, oculocardiac and peritoneal traction 600 ms × the stimulus intensity; fatigue τ.
 */
export const VAGAL_STIM_MS: Readonly<Record<string, number>> = { laryngoscopy: 300, oculocardiac: 600, peritoneal: 600 };
export const VAGAL_STIM_PER_INTENSITY: Readonly<Record<string, boolean>> = { laryngoscopy: false, oculocardiac: true, peritoneal: true };
export const VAGAL_STIM_FATIGUE_S = 120; // the reflex fades on sustained traction [ENG]
// FU-4 G7 (Task 12 Step 3): the empty-ventricle (Bezold–Jarisch) term was prototyped (800 ms × (0.35 − EDV/rest)/0.35)
// and NOT landed: it met nothing the ischaemic pre-arrest bradycardia (K_BRADY) does not already meet (class IV HR < 100
// before the arrest), and by slowing the obstructed heart it lowered the myocardial demand enough to move the tension
// pneumothorax's PEA from +10.45 to +16.75 min (band 3–10). Measured and withdrawn under R45; an open question.

/** Per-beat truths published by the model (tables §2.1 step 5). */
export interface CircBeat {
  t: number; // activation onset
  sbp: number; dbp: number; map: number; // radial truth
  aoSys: number; aoDia: number;
  sv: number; // forward LV stroke volume (aortic valve), mL
  svRv: number;
  lvedv: number; lvesv: number; lvedp: number; lvsp: number;
  avOpen: number; avClose: number; // s after onset (−1 = did not open)
  dur: number; // to the next beat
  origin?: string; // rhythm-engine origin of the beat (sinus, ventricular, paced, …)
  pItEd?: number; // FU-4 G1: intrathoracic pressure at end-diastole (LVEDP above is transmural)
  rvsp?: number; // FU-4 G5: RV peak pressure, mmHg (absolute)
  rvMean?: number; // FU-4 G5: RV mean pressure over the beat, mmHg (absolute) — the RV's intramural back-pressure
  rvedv?: number; // FU-4 G6 (Task 11 Step 1b): RV end-diastolic volume, mL — the RV wall-stress term of its O2 demand
}

interface BeatAcc {
  t: number; sbp: number; dbp: number; sum: number; n: number; aoS: number; aoD: number; sv: number; svRv: number;
  edv: number; esv: number; edp: number; lvsp: number; open: number; close: number; prevQ: number; origin?: string; pItEd: number;
  rvsp: number; rvSum: number; rvEdv: number; // FU-4 G5; Task 11 (b)
}

export interface VolumeEvent {
  rate: number; // mL/s (+ fluid, − bleed)
  until: number;
}

export interface CircModelState {
  prof: ResolvedProfile;
  weightKg: number;
  base: CircParams; // stabilised profile parameters
  p: CircParams; // effective parameters (base × reflex × drugs × conditions)
  s: number[];
  t: number; // time of s
  vent: Activation[];
  atria: Activation[];
  kLv: number;
  kRv: number;
  baro: BaroState;
  boluses: Bolus[];
  vol: VolumeEvent[];
  hrModel: number; // bpm the reflex/drugs ask the rhythm engine for (MODELED)
  /** FU-4 G7: the stimulus-driven vagal event (engine observer → `circVagalStimulus`); absent until a site is seen. */
  vagalStim?: { t0: number; ms: number } | null;
  /** FU-2 (NR-7g-5): the rate the instructor or the rhythm set (rate-rule.ts); null = the reflex owns a sinus-family rate. */
  hrSet: RampState | null;
  ctlNext: number;
  mapSum: number;
  mapN: number;
  raTmSum: number; // R45(b): transmural RA pressure accumulator for the cardiopulmonary limb
  acc: BeatAcc | null;
  beats: CircBeat[]; // last 16
  /** Aortic-valve openings since the pipeline last looked: time, EDV and the stroke volume they will eject (estimate). */
  opens: { t: number; sv: number }[];
  lastEjT: number;
  qFwd: number; // LPF (τ CO_TAU_S) of the forward aortic-valve + LVAD flow, mL/s: CO for beats AND compressions
  mapSetPinned: boolean;
  /**
   * MANUAL tracker outputs (Task 14; neutral in MODELED): LV Emax ×, systemic R (null = base), venous V0 +, RV Emax ×,
   * PVR (null = base); kIschRef (FU-3 item 4) = the coronary kIsch the tracker's LV Emax was set against (1 = none).
   */
  man: { eesF: number; rSys: number | null; dV0: number; eesRvF: number; pvr: number | null; kIschRef: number };
  lastVentT: number; // R45(a): last ventricular depolarisation (perfused or not)
  rrRef: number; // R45(a): running normal RR, s
  pespNext: number; // R45(a): Emax boost for the next beat
  ref: Stabilised['ref']; // the stabilised resting reference (coronary demand, pulsatile sensing)
  cor: CoronaryState; // R23 coronary supply/demand (stepped at 1 Hz by the pipeline)
  /** FU-4 G4: sum and count of the relaxation-phase aortic − RA pressure since the coronary step last read it (2 ms). */
  cppAcc: { sum: number; n: number };
  /** FU-4 G4: mean radial pressure, low-passed (τ 2 s) at the 10 Hz control step in both modes — beats or none. */
  mapNow: number;
  /** FU-4 G1: the arrest this model declared (cause, time, the organised rhythm it came from), null while beating. */
  arrest: { cause: string; t: number; from: string; roscS: number; rate0: number; rateNow: number; cppLp?: number } | null; // FU-4 F5: rate0/rateNow drive the PEA decay; FU-8 (G-FU8A-1): cppLp, the CoPP trend
  noFlowS: number; // FU-4 G1: seconds the continuous MAP has been below arrest.ts MAP_NO_FLOW
  saF: number; // FU-4 (G-FU3 ruling 1): the sinus-node factor of the last control step (MODELED; 1 in MANUAL) — the escape foci follow it
  chemo: { sao2: number; paco2: number }; // chemoreflex inputs (written at 1 Hz by the pipeline from L1 truths)
  /**
   * Extra multipliers owned by other modules (coronary ischaemia, conditions; 7b lungs via R46): applied at the next
   * control step. pvrLung × both beds, pvrLungL/R × one bed (HPV, one-lung ventilation, unilateral disease); default 1.
   */
  ext: {
    kLv: number; kRv: number; pvr: number; vFluid: number; pPtx: number; kIsch: number;
    vFluidRate?: number; // FU-4 G6: pericardial fluid accumulation (+) or drainage (−), mL/s (conditions.ts)
    pvrLung?: number; pvrLungL?: number; pvrLungR?: number; // R46 (7b)
    rSysF?: number; hrF?: number; // R48 (7d, Cushing response): systemic resistance and HR set-point multipliers
    endoHrF?: number; endoSvrF?: number; endoEesF?: number; endoDV0Frac?: number; // R49 (7e endocrine stress response)
    surgeF?: number; // FU-7 (addendum 22; ruling 1): 7e's NOCICEPTIVE set-point factor, multiplied into FU-4's setF
    histamine?: number; // FU-7 (addendum 24 / audit D15): 7g's bus.airway.histamine, 0–1 — vasodilation and venodilation
    endoHumDV0Frac?: number; // FU-4 F2(a) (7e): the humoral arm's venous recruitment, fraction of blood volume (− = venoconstriction)
    endoHumSvrF?: number; // FU-4 G-FU4-1 (7e): the humoral arm's × on SVR, already inside endoSvrF
    kChem?: number; // 7c: blood-chemistry contractility multiplier (K, Ca, pH) on all four chambers, default 1
    viscF?: number; // FU-6 R11 (7c): blood-viscosity factor on the systemic resistance, default 1
    kEcg?: number; // FU-4 G3 (7c): the membrane-effective K (calcium-stabilised), mmol/L — sinus node and the arrest hazard
    cbfRel?: number; // FU-4 F1(b) (7d): relative cerebral blood flow — the brainstem perfusion of the vasomotor centre
    tempC?: number; // FU-4 G12 (engine, from Stage 3/7e): core temperature for the hypothermic VF hazard
    drug?: DrugEffect; betaBlockAdd?: number; // Stage 7g: the PK/PD layer's multipliers
    betaAgonistU?: number; // FU-2 (NR-7g-2): β-agonist venous potency units from the drug bus (venous.ts)
    avNodeBlock?: number; // FU-2 (AF rate control): the drug bus's AV-nodal block 0–1 (rate-rule.ts)
  };
}

export function createCircModel(profile: CircProfile = DEFAULT_PROFILE): CircModelState {
  const prof = resolveProfile(profile);
  const st = stabilise(prof);
  return {
    prof, weightKg: profile.weightKg, base: st.params, p: structuredClone(st.params), s: st.s, t: 0,
    vent: [], atria: [], kLv: 1, kRv: 1, baro: createBaro(st.ref.map, st.ref.cvp - P_PL0), boluses: [], vol: [], hrModel: prof.targets.hr, hrSet: null,
    ctlNext: 0, mapSum: 0, mapN: 0, raTmSum: 0, acc: null, beats: [], opens: [], lastEjT: 0, qFwd: st.ref.co / 0.06, mapSetPinned: false, man: { eesF: 1, rSys: null, dV0: 0, eesRvF: 1, pvr: null, kIschRef: 1 }, lastVentT: -1, rrRef: 60 / prof.targets.hr, pespNext: 0, ref: st.ref, cor: createCoronary(st.ref), cppAcc: { sum: 0, n: 0 }, mapNow: st.ref.map, arrest: null, noFlowS: 0, saF: 1, chemo: { sao2: 0.97, paco2: 40 },
    ext: { kLv: 1, kRv: 1, pvr: 1, vFluid: 0, pPtx: 0, kIsch: 1 },
  };
}

/** A mechanical beat at time t (the rhythm engine's R time). Pulseless beats schedule nothing (activation off). */
/**
 * `eff` (0–1): mechanical efficiency of a dyssynchronous ventricular rhythm relative to a well-conducted VT ≤ 150/min,
 * from the rhythm engine's k_rhythm (brief §4.8, "shared by both modes": VT 0.6 → 0.2 above 200/min, torsades 0.1);
 * the filling part of k_rhythm is NOT used — filling is emergent here.
 */
export function circOnBeat(m: CircModelState, t: number, hr: number, origin: string, perfused: boolean, eff = 1): void {
  // R45(a): prematurity → potentiation of the NEXT beat; normal intervals update the reference RR
  const boost = m.pespNext;
  m.pespNext = 0;
  let restF = 1; // FU-4 Task 17: mechanical restitution of a premature supraventricular beat
  if (m.lastVentT >= 0 && origin !== 'ventricular' && origin !== 'paced') restF = restitution(t - m.lastVentT, m.rrRef);
  if (m.lastVentT >= 0) {
    const q = (t - m.lastVentT) / m.rrRef;
    if (q < PESP_PREMATURE) m.pespNext = PESP_MAX * Math.min(1, (PESP_PREMATURE - q) / (PESP_PREMATURE - 0.4));
    else if (q < 1.25) m.rrRef += (t - m.lastVentT - m.rrRef) * 0.2;
  }
  m.lastVentT = t;
  if (!perfused) return;
  const amp = (origin === 'ventricular' || origin === 'paced' ? DYSSYNC : 1) * Math.min(1, Math.max(0, eff)) * (1 + boost) * restF;
  m.vent.push({ t0: t, T: activationPeriodS(Math.max(30, Math.min(250, hr))), amp, origin });
}

/** An atrial depolarisation (P onset): atrial contraction, whatever the ventricles are doing (cannon waves emerge). */
export function circOnAtrial(m: CircModelState, tP: number): void {
  m.atria.push({ t0: tP + ATRIAL_DELAY_S, T: ATRIAL_T_S, amp: 1 });
}

export function circGiveDrug(m: CircModelState, drug: DrugId, doseMg: number): void {
  m.boluses.push({ drug, t: m.t, scale: bolusScale(drug, doseMg, m.weightKg, m.boluses) });
}

/** Bleed (negative) or infuse (positive) `ml` over `overS` seconds from now. */
export function circVolume(m: CircModelState, ml: number, overS: number): void {
  m.vol.push({ rate: ml / Math.max(0.1, overS), until: m.t + Math.max(0.1, overS) });
}

/** Environment the pipeline supplies each interval: pleural pressure, CPR, devices. */
export interface CircEnv {
  pIt: (t: number) => number;
  cprCardiac: (t: number) => number;
  cprThoracic: (t: number) => number;
  cprRelease: (t: number) => number;
  qVad: (lvp: number, aop: number) => number;
  qAortaSrc: (t: number) => number;
  modeled: boolean; // reflexes and the HR request run only in MODELED mode
}

const NEUTRAL_MAN = { eesF: 1, rSys: null, dV0: 0, eesRvF: 1, pvr: null, kIschRef: 1 } as const;
const zero = () => 0;
export const RESTING_ENV: CircEnv = { pIt: () => P_PL0, cprCardiac: zero, cprThoracic: zero, cprRelease: zero, qVad: () => 0, qAortaSrc: zero, modeled: true };

/** Chemoreflex → circulation (B §4.9; tables §1.1). Hypoxic HR sign by age band; hypercapnic pressor response. */
export function chemoFactors(c: { sao2: number; paco2: number }, band: string): { hrF: number; svrF: number } {
  let hrF = 1;
  const hyp = Math.max(0, 0.85 - c.sao2); // below 85 %
  if (hyp > 0) {
    const brady = band === 'neonate' || band === 'infant' || c.sao2 < 0.6;
    hrF = brady ? Math.max(0.5, 1 - 2.5 * hyp) : Math.min(1.3, 1 + 1.2 * hyp); // plan slope 1.6 failed its own test (SaO2 75 % infant → HR ×0.84, wanted < 0.8) [ENG]
  }
  const hcap = Math.min(0.2, Math.max(0, c.paco2 - 50) * 0.01); // +1 %/mmHg above 50, capped at +20 % [ENG]
  return { hrF: hrF * (1 + hcap), svrF: 1 + hcap };
}

/** FU-4 G7: the engine's stimulus observer (7e consumes the event; 7a only sees the site). A stimulus without a site, or
 * intensity 0, ends the vagal event — the stimulus holds until the next one (addendum 12). */
export function circVagalStimulus(m: CircModelState, site: string | undefined, intensity: number, t: number): void {
  const ms = site === undefined ? 0 : (VAGAL_STIM_MS[site] ?? 0) * (VAGAL_STIM_PER_INTENSITY[site] ? intensity : 1);
  m.vagalStim = ms > 0 && intensity > 0 ? { t0: t, ms } : null;
}
function vagalEventMs(m: CircModelState): number {
  const v = m.vagalStim;
  return v ? v.ms * Math.exp(-Math.max(0, m.t - v.t0) / VAGAL_STIM_FATIGUE_S) : 0;
}

function control(m: CircModelState, env: CircEnv): void {
  const map = m.mapN > 0 ? m.mapSum / m.mapN : m.baro.mapLp;
  m.mapNow += (map - m.mapNow) * (1 - Math.exp(-CTL_DT / MAP_NOW_TAU_S)); // FU-4 G4
  // R45(b): pulsatile sensing — the last three beats' pulse pressure relative to the resting one (K_PP)
  const lb = m.beats.slice(-3);
  const ppNow = lb.length ? lb.reduce((a, x) => a + x.sbp - x.dbp, 0) / lb.length : m.ref.sbp - m.ref.dbp;
  const sensed = map + K_PP * (ppNow - (m.ref.sbp - m.ref.dbp));
  const raTm = m.mapN > 0 ? m.raTmSum / m.mapN : m.baro.cpLp;
  m.raTmSum = 0;
  m.mapSum = 0;
  m.mapN = 0;
  const de = drugEffect(m.boluses, m.t, m.prof.betaBlockC);
  const d7 = m.ext.drug; // Stage 7g: multipliers from l2/pk (the 7a bolus list stays empty once 7g consumes drug events)
  if (d7) {
    de.hr *= d7.hr; de.ees *= d7.ees; de.svr *= d7.svr; de.v0Frac += d7.v0Frac; de.pvr *= d7.pvr; de.gv *= d7.gv; de.gvHr *= d7.gvHr;
    de.symp *= d7.symp ?? 1; de.setF *= d7.setF ?? 1; // FU-4 G2
    de.vagalMs = (de.vagalMs ?? 0) + (d7.vagalMs ?? 0); // FU-4 G7/F10: the vagal RR increment is ADDITIVE (ms), already × (1 − muscarinic occupancy) by 7g
    de.muscBlock = d7.muscBlock ?? 0; // FU-4 G7: muscarinic occupancy — blocks the vagal limb and the stimulus/empty-ventricle events
  }
  // FU-7 (addendum 24 / audit D15): histamine (morphine, atracurium, mivacurium) — vasodilation and venodilation with a
  // reflex tachycardia that EMERGES from the pressure fall. Sizes [ENG; fit target: fast morphine 10 mg lowers SVR
  // 10–20 % (M10 ch. 22) and MAP 8–25 % (T6.3), with HR +3 to +25 (DI-42's PL item)].
  const hist = Math.min(1, Math.max(0, m.ext.histamine ?? 0));
  if (hist > 0) {
    de.svr *= 1 - HIST_SVR * hist;
    de.v0Frac += HIST_V0 * hist;
  }
  const w = m.weightKg / 70;
  const b = env.modeled
    ? stepBaro(m.baro, sensed, { gVagal: m.prof.gVagal * de.gv * (1 - (de.muscBlock ?? 0)), gSymp: m.prof.gSymp * de.gv, betaBlock: Math.min(0.95, m.prof.betaBlock + (m.ext.betaBlockAdd ?? 0) * (1 - m.prof.betaBlock)), betaBlockC: Math.min(0.95, m.prof.betaBlockC + (m.ext.betaBlockAdd ?? 0) * (1 - m.prof.betaBlockC)), hrGain: de.gvHr, weightScale: w, pinnedSet: m.mapSetPinned, outF: de.symp, setF: de.setF * (m.ext.surgeF ?? 1), brainF: brainstemOutF(m.ext.cbfRel), tonic: m.prof.tonicSymp }, raTm) // FU-7 (addendum 22): the nociceptive surge rides FU-4's set-point path; FU-8 (C1): tonic
    : { rrMs: 0, hrF: 1, svrF: 1, eesF: 1, dV0: 0, cSvF: 1 };
  const ch = env.modeled ? chemoFactors(m.chemo, m.prof.band) : { hrF: 1, svrF: 1 }; // Task 19
  const p = m.p;
  const base = m.base;
  const man = env.modeled ? NEUTRAL_MAN : m.man; // Stage 7a Task 14: the MANUAL tracker's solution
  const x = m.ext; // R48/R49 multipliers (default 1; endoDV0Frac default 0)
  // FU-4 gate finding G-FU4-1 (orchestrator ruling, third mechanism): the humoral arm's EFFECT at the vessel is
  // withdrawn in the PULSELESS state — under arrest AVP/angiotensin are not delivered to the vascular smooth muscle and
  // hypoxic, acidotic muscle stops responding (ischaemic vasoplegia). The index is the arrest state itself (non-null
  // only once the arrest is declared; every perfusing state, induction hypotension and class III included, keeps 1 —
  // bit-identical), ramped over the declaration's own no-flow window NO_FLOW_S; ROSC restores it. The hormone level
  // (7e `h.hum`) is untouched. No new constant.
  const humF = env.modeled && m.arrest ? Math.max(0, 1 - (m.t - m.arrest.t) / NO_FLOW_S) : 1;
  const hsv = x.endoHumSvrF ?? 1;
  const endoSvr = humF === 1 || hsv === 1 ? (x.endoSvrF ?? 1) : ((x.endoSvrF ?? 1) / hsv) * (1 + (hsv - 1) * humF);
  p.rSys = (man.rSys ?? base.rSys) * b.svrF * de.svr * ch.svrF * (x.rSysF ?? 1) * endoSvr * (x.viscF ?? 1); // FU-6 R11: viscosity
  const betaOcc = 1 - (1 - (x.betaBlockAdd ?? 0)) * (1 - m.prof.betaBlockC); // FU-2: as 7g's competitive β shift
  const dv0Beta = betaDV0Ml(x.betaAgonistU ?? 0, betaOcc, m.weightKg); // FU-2 (NR-7g-2)
  // FU-2 F4 + FU-4 F2(a): the baroreflex, the β-agonists and the HUMORAL arm all recruit from ONE splanchnic reservoir.
  // Because the humoral arm is not scaled by `outF`, it holds part of that recruited volume when an anaesthetic
  // suppresses the neural arm — which is the difference between "profound hypotension" and "instant PEA" in a bleeding
  // patient (before this, propofol's `outF` returned the reflex's whole ≈ 840 mL recruitment at once, an acute bleed of
  // the same size on top of the haemorrhage).
  const humMl = (m.ext.endoHumDV0Frac ?? 0) * m.prof.bloodVolumeMl * humF; // negative = recruited; × the ischaemic withdrawal (G-FU4-1)
  const recruit = Math.max(-V0_RECRUIT_MAX_ML_KG * m.weightKg, Math.min(b.dV0 - dv0Beta, humMl));
  p.v0Sv = base.v0Sv * (1 - (x.endoDV0Frac ?? 0)) + recruit + de.v0Frac * m.prof.bloodVolumeMl + man.dV0;
  p.cSv = base.cSv * b.cSvF;
  const pvrF = man.pvr === null ? 1 : man.pvr / ((base.pvrL * base.pvrR) / (base.pvrL + base.pvrR));
  const lung = m.ext.pvrLung ?? 1; // R46 (7b): per-lung PVR multipliers on the per-lung flow split
  // FU-6 R14: hypercapnic pulmonary vasoconstriction (not while the instructor pins PVR)
  const co2F = man.pvr === null ? 1 + K_PVR_CO2 * Math.max(0, m.chemo.paco2 - 40) : 1;
  p.pvrL = base.pvrL * de.pvr * m.ext.pvr * pvrF * lung * (m.ext.pvrLungL ?? 1) * co2F;
  p.pvrR = base.pvrR * de.pvr * m.ext.pvr * pvrF * lung * (m.ext.pvrLungR ?? 1) * co2F;
  if (m.ext.vFluidRate) m.ext.vFluid = Math.min(TAMPONADE_MAX_ML, Math.max(0, m.ext.vFluid + m.ext.vFluidRate * CTL_DT)); // FU-4 G6
  p.vFluid = base.vFluid + m.ext.vFluid;
  const kc = x.kChem ?? 1;
  // FU-3 item 4: in MANUAL the tracker's LV Emax was set against the ischaemia present while it tracked (kIschRef):
  // new ischaemia below that level still acts on top of the held picture, but recovery above it does not raise the
  // delivered contractility past what the instructor's pressures were built on (MODELED: kIschRef 1, kIsch as is)
  const kHyp = env.modeled ? Math.max(K_HYP_MIN, 1 - m.cor.hyp) : 1; // FU-3 item 16: hypoxic myocardial depression (both ventricles)
  m.kLv = b.eesF * de.ees * m.ext.kLv * Math.min(m.ext.kIsch, man.kIschRef) * man.eesF * betaBlunt(x.endoEesF ?? 1, x.betaBlockAdd ?? 0) * kc * kHyp; // Stage 7g: β-blockade blunts the surge
  // tables §3 "Effects": ischaemic diastolic stiffening, β_LV × (1 + 0.5·δ) — with δ taken from the filtered
  // contractility loss (kIsch = 1 − G_ISCH·δ), so LVEDP rises as the ischaemic spiral develops (R23)
  p.betaLv = base.betaLv * (1 + (0.5 * (1 - m.ext.kIsch)) / G_ISCH);
  m.kRv = b.eesF * de.ees * m.ext.kRv * man.eesRvF * betaBlunt(x.endoEesF ?? 1, x.betaBlockAdd ?? 0) * kc * kHyp * (env.modeled ? m.cor.kIschRv : 1); // Stage 7g: β-blockade blunts the surge; FU-4 G5: RV ischaemia (MODELED)
  p.emaxRa = base.eminRa + (base.emaxRa - base.eminRa) * kc * kHyp; // atrial active elastance (7c kChem; FU-3 item 16 kHyp)
  p.emaxLa = base.eminLa + (base.emaxLa - base.eminLa) * kc * kHyp;
  const kSa = Math.max(0, K_BRADY - m.ext.kIsch) * G_SA_ISCH + Math.max(0, (x.kEcg ?? 4) - 7) * G_SA_K; // FU-4 G1/G3
  const hypF = env.modeled ? Math.max(0.05, 1 - G_SA * m.cor.hyp - kSa) : 1; // FU-3 item 16: hypoxic SA-node depression (FU-4: + ischaemic, K)
  m.saF = hypF; // FU-4: every pacemaker, subsidiary ones included, shares the myocardial depression
  // FU-4 G7/F10: the drug bus's VAGAL RR increment is additive at the SA node, exactly like the baroreflex's vagal
  // limb (`b.rrMs`) — an opioid bolus or neostigmine lengthens the cycle rather than scaling the rate, which is why an
  // anticholinergic abolishes it (7g already multiplies `vagalMs` by 1 − muscarinic occupancy) and why the bradycardia
  // is deeper in a patient whose rate is already low.
  // FU-4 G7 (Task 12 Step 3): the stimulus-driven vagal event, the same additive term, MODELED only
  const vStim = env.modeled ? vagalEventMs(m) : 0;
  const rr = 60 / (m.prof.hrRest * b.hrF * de.hr * ch.hrF * (x.hrF ?? 1) * betaBlunt(x.endoHrF ?? 1, x.betaBlockAdd ?? 0) * hypF) + b.rrMs / 1000 + ((de.vagalMs ?? 0) + vStim * (1 - (de.muscBlock ?? 0))) / 1000; // Stage 7g: β-blockade blunts the surge
  m.hrModel = Math.min(m.prof.hrMax, Math.max(30, 60 / rr));
  m.boluses = pruneBoluses(m.boluses, m.t);
  m.vol = m.vol.filter((v) => v.until > m.t);
}

function closeBeat(m: CircModelState, t: number): void {
  const a = m.acc;
  if (!a || a.n < 5) return;
  m.beats.push({
    t: a.t, sbp: a.sbp, dbp: a.dbp, map: a.sum / a.n, aoSys: a.aoS, aoDia: a.aoD, sv: a.sv, svRv: a.svRv, lvedv: a.edv, lvesv: a.esv,
    lvedp: a.edp, lvsp: a.lvsp, avOpen: a.open, avClose: a.close, dur: t - a.t, origin: a.origin, pItEd: a.pItEd,
    rvsp: a.rvsp, rvMean: a.rvSum / a.n, rvedv: a.rvEdv, // FU-4 G5; Task 11 (b)
  });
  if (m.beats.length > 16) m.beats.shift();
}

const newAcc = (t: number, edv: number, edp: number, pItEd: number, rvEdv = NaN): BeatAcc => ({
  t, sbp: -Infinity, dbp: Infinity, sum: 0, n: 0, aoS: -Infinity, aoD: Infinity, sv: 0, svRv: 0, edv, esv: edv, edp, lvsp: -Infinity, open: -1, close: -1, prevQ: 0, pItEd, rvsp: -Infinity, rvSum: 0, rvEdv,
});

/**
 * Advance the model to time tEnd in 2 ms RK4 steps; `o` receives the algebraic outputs at each step end and
 * `onStep(o, t)` (optional) sees every one of them (the pipeline samples the radial pressure for its transducer).
 */
export function stepCircModel(m: CircModelState, tEnd: number, env: CircEnv, o: CircOut, onStep?: (o: CircOut, t: number) => void): void {
  // RK4 asks for the inputs at t, t + h/2 (twice), t + h and again at t + h for the outputs: remember the last two
  // pleural values (the breath-driver lookup is the costliest input) [perf]
  let t1 = Number.NaN, v1 = 0, t2 = Number.NaN, v2 = 0;
  const pIt = (t: number): number => {
    if (t === t1) return v1;
    if (t === t2) return v2;
    const v = env.pIt(t) + m.ext.pPtx;
    t2 = t1;
    v2 = v1;
    t1 = t;
    v1 = v;
    return v;
  };
  const d: CircDrive = {
    vent: m.vent, atria: m.atria, kLv: m.kLv, kRv: m.kRv, pIt, cprCardiac: env.cprCardiac, cprThoracic: env.cprThoracic, cprRelease: env.cprRelease,
    qIn: 0, qVad: env.qVad, qAortaSrc: env.qAortaSrc,
  };
  while (m.t < tEnd - 1e-9) {
    if (m.t >= m.ctlNext - 1e-9) {
      control(m, env);
      m.ctlNext += CTL_DT;
      d.kLv = m.kLv;
      d.kRv = m.kRv;
    }
    let q = 0;
    for (const v of m.vol) if (v.until > m.t) q += v.rate;
    d.qIn = q;
    // a beat window opens at each ventricular activation onset inside this step
    const next = m.vent.find((x) => x.t0 > m.t && x.t0 <= m.t + L_H);
    if (next) {
      closeBeat(m, next.t0);
      L_evaluate(m.s, m.t, m.p, d, o);
      m.acc = newAcc(next.t0, m.s[S.VLV] as number, o.pLv - o.pIt, o.pIt, m.s[S.VRV] as number);
      if (next.origin !== undefined) m.acc.origin = next.origin;
    }
    L_stepCirc(m.s, m.t, L_H, m.p, d);
    m.t += L_H;
    L_evaluate(m.s, m.t, m.p, d, o);
    m.qFwd += (Math.max(0, o.qAv) + o.qVad - m.qFwd) * (L_H / CO_TAU_S);
    if (env.cprCardiac(m.t) <= 0) {
      m.cppAcc.sum += o.pAo - o.pRa; // FU-4 G4: the coronary driving pressure outside compressions (Paradis 1990)
      m.cppAcc.n++;
    }
    if (o.qAv > 1 && env.cprCardiac(m.t) > 0) m.lastEjT = m.t; // a compression that ejects (beats set it below)
    m.mapSum += o.pRad;
    m.raTmSum += o.pRa - o.pIt - o.pPeri; // atrial stretch: transmural across the wall (pericardial pressure compresses)
    m.mapN++;
    const a = m.acc;
    if (a) {
      if (o.pRad > a.sbp) a.sbp = o.pRad;
      if (o.pRad < a.dbp) a.dbp = o.pRad;
      a.sum += o.pRad;
      a.n++;
      if (o.pAo > a.aoS) a.aoS = o.pAo;
      if (o.pAo < a.aoD) a.aoD = o.pAo;
      a.sv += Math.max(0, o.qAv) * L_H;
      a.svRv += Math.max(0, o.qPv) * L_H;
      const v = m.s[S.VLV] as number;
      if (v < a.esv) a.esv = v;
      if (o.pLv > a.lvsp) a.lvsp = o.pLv;
      if (o.pRv > a.rvsp) a.rvsp = o.pRv; // FU-4 G5
      a.rvSum += o.pRv;
      if (a.prevQ <= 1 && o.qAv > 1 && a.open < 0) {
        a.open = m.t - a.t;
        m.lastEjT = m.t;
        // the pleth needs its pulse when the valve opens: SV estimated as EDV − the last beat's ESV
        const lb = m.beats[m.beats.length - 1];
        m.opens.push({ t: m.t, sv: Math.max(0, a.edv - (lb ? lb.lvesv : a.edv * 0.4)) });
        if (m.opens.length > 8) m.opens.shift();
      }
      if (a.prevQ > 1 && o.qAv <= 1 && a.open >= 0) a.close = m.t - a.t;
      a.prevQ = o.qAv;
    }
    onStep?.(o, m.t);
  }
  m.vent = pruneActivations(m.vent, m.t);
  m.atria = pruneActivations(m.atria, m.t);
}

/** Cardiac output (L/min): forward aortic + LVAD flow averaged over ≈ 4 s (beats and CPR alike); 0 when nothing ejected for 3 s. */
export function circCardiacOutput(m: CircModelState): number {
  if (m.t - m.lastEjT > 3) return 0;
  return m.qFwd * 0.06;
}
