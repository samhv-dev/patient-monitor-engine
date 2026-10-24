// Respiratory pipeline: the per-tick work the engine calls BEFORE the haemodynamics (brief §3.3 order):
//   driver cycles → 10 Hz gas exchange (O2 store/ODC/shunt, 2-compartment CO2, circulatory delay, SpO2 chain),
//   1 Hz temperature → 62.5 Hz co2 (sampled capnogram) and resp (impedance) samples → L3 numerics → events
//   (breath, lungState, measurement, alarm) and L1 coupled truths (spo2, etco2, rr, vt, fio2, shunt, tempCore,
//   and the mean-airway-pressure coupling on cvp/sbp/dbp/volumeStatus).
// Reads the haemodynamics' HemoState (CO, pleth feet, PI, cuff, CPR) and never writes it. All state is plain data.
import { l1Target, setL1Target, type L1State } from '../../l1/state.ts';
import type { NeuroResp } from '../neuro/drive.ts';
import { P_MAX_CMH2O, PMUS_REST_CMH2O, wakeShiftMmHg } from '../lung/drive.ts'; // wakeShiftMmHg
import { createSpontDrive, stepSpontDrive, type SpontDrive } from '../neuro/spont.ts'; // MODELED spontaneous drive
import type { RampState } from '../../l1/ramp.ts';
import { co2NumStep, co2Numerics, createCo2Num, type Co2Num } from '../../l3/co2-numerics/co2-numerics.ts';
import { createImpNum, impedanceSample, impRr, impStep, type ImpNum } from '../../l3/resp/impedance.ts';
import { createSpo2, spo2Measured, stepSpo2, type Spo2State } from '../../l3/spo2/spo2.ts';
import { createTempNum, tempMeasured, tempNumStep, type TempNum } from '../../l3/temp/temp-numerics.ts';
import { piNumeric } from '../../l3/pressure-numerics/numerics.ts';
import { normal, seedStream, uniform } from '../../rng/sfc32.ts'; // Uniform (the wake draw)
import type { AirwayState, RespClinicalEvent, TempSite, VentSource } from '../../types-resp.ts';
import type { VentFrameExt } from '../../types-vent-link.ts'; // Stage V
import type { ChannelId, Command, EngineEvent, NumericId, Measured, PatientProfile } from '../../types.ts';
import { airwayCo2, createSampler, CO2_RATE, sampleCo2, type CapnoCtx, type SamplerState } from '../co2/capno.ts';
import { cardiacOutput } from '../gas/coupling.ts';
import { obstructedSwingMmHg, pleuralPressureMmHg } from '../circ/pleural.ts'; // NPPE input
import { NO_BEAT_RHYTHMS } from '../circ/coronary.ts'; // The engine's no-beat rhythms
import { CMH2O_TO_MMHG, P_PL0, T_IT } from '../circ/params.ts';
import { HEALTHY } from '../../../data/lung-pathology.ts';
import { createCo2State, etco2Mixed, lowFlowFactor, stepCo2, vaForPaco2, type Co2State } from '../gas/co2.ts'; // etco2Mixed
import { createDelay, delayStep, siteDelay, type DelayLine } from '../gas/delay.ts';
import { o2Steady, solveShunt, type O2Inputs, type O2State } from '../gas/o2.ts';
import { pulseOxApparent, type OdcCtx } from '../blood/odc.ts';
import { apparatusDeadSpaceMl, CI_LPM_PER_KG, coRefLpm, defaultHeightCm, FRC_AWAKE_ML_KG, GA_METABOLIC, GAS_DT_S, gasPatient, PA_ET_GRADIENT, PACO2_REST_MMHG, physicalDeadSpace, PREG_PACO2_SHIFT_MMHG, PREG_VO2_TERM, tempFactor, ventDefaults, type GasPatient } from '../gas/params.ts';
import type { HemoState, RhythmView } from '../hemo/pipeline.ts';
import { createTemp, setCoreTarget, stepTemp, type TempState } from '../temp/temp.ts';
import { thermalMetabolic } from '../thermal/metabolic.ts';
import { HIST_SPASM, resolveLung, SMOOTH_MUSCLE, spasmSeverity } from '../lung/conditions.ts'; // SMOOTH_MUSCLE; spasmSeverity; HIST_SPASM
import { blockedSides, capnoTerms, createLung, lungGasStep, lungMechStep, shuntFraction, staticCompliance, type LungState, type Mainstem } from '../lung/lung.ts';
import { circPericardial, circPtx, circSideFlows, writeCircPvr } from '../lung/circ-link.ts';
import { tamponadeSwingF } from '../circ/conditions.ts'; // The tamponade effort factor (E118)
import { mechParams } from '../lung/side.ts';
import { chestWallPressure, unitPressure } from '../lung/mechanics.ts'; // The one-way valve's driving pressure
import { PTX_DRAIN_TAU_S, PTX_VALVE_PER_CMH2O_S } from '../lung/params.ts';
import { aeratedFrc, lungStatePayload } from '../lung/state-event.ts'; // aeratedFrc (one bedside FRC)
import { breathMechanics, deadSpaceSet, expHold, inspHold, pesEstimate, type DeadSpace, type Mechanics } from '../lung/breath.ts';
import { actualVolumes, closingCapacity, pattern, predictedVolumes, type Actual, type Predicted } from '../lung/volumes.ts';
import { LUNG_CONDITION_IDS, type LungClinicalEvent, type LungConditionSpec } from '../../types-lung.ts';
import {
  alveolarVentilation, breathSignal, chestVolume, checkDrive, createDriver, cycleAt, frameAt, nominalRate,
  onVentFrame, planCycles, preoxActive, pruneCycles, replan, VCV_PMAX_DEFAULT, alveolarFraction, type DriverCtx, type DriverState,
} from './driver.ts';

export const RESP_CHANNELS = ['co2', 'resp'] as const satisfies readonly ChannelId[];
export type RespChannel = (typeof RESP_CHANNELS)[number];
export const RESP_RATE = CO2_RATE; // 62.5 Hz
const DT = 1 / RESP_RATE;
const PLAN_AHEAD_S = 0.6; // Cycles exist this far ahead: the haemodynamics plans beats ≈ 0.25 s ahead and reads u(t)
const KEEP_S = 15; // history kept for the sidestream delay, u(t − 2·RR) and the 10 s EtCO2 window
const CO2_WARMUP_S = 10; // brief §6.2 [ENG]
const AIRWAYS: readonly AirwayState[] = ['patent', 'obstructed', 'apnoea', 'disconnected', 'oesophageal', 'endobronchial', 'bronchospasm'];
const SOURCES: readonly VentSource[] = ['spontaneous', 'bvm', 'ventilator', 'none'];
const TEMP_SITES: readonly TempSite[] = ['oesophageal', 'nasopharyngeal', 'tympanic', 'bladder', 'rectal', 'axilla'];
const LOSS: readonly AirwayState[] = ['obstructed', 'disconnected', 'oesophageal'];

export interface RespCtx {
  l1: L1State;
  hemo: HemoState;
  rhythm: RhythmView;
  hr: RampState;
  /** What the gas step reads from the blood (absent → the behaviour without the blood model, byte-identical). */
  blood?: BloodView;
  neuro?: NeuroResp; // Drug and NMB effects on spontaneous breathing
  hco3?: number; // blood.core.ab.hco3 for Winter's compensation (MODELED spontaneous drive)
  cbfRel?: number; // organs.brain.cbfRel — the brainstem-perfusion gate on the MODELED drive
  /** The drug model's bus (the lung reads PD outputs, never PK) — bronchodilation B and HPV inhibition, 0–1. */
  bronchoDil?: number;
  /** The drug model's `bus.airway.histamine` (0–1) — the drug-driven bronchoconstriction. */
  histamine?: number;
  hpvInhibit?: number;
  /** The endocrine model is writing the anaphylaxis lung condition with its own β2 relief (endo.lungSev > 0). */
  anaphEndo?: boolean;
}

/**
 * The blood's ODC context, a CO factor (blood-volume fallback without the circulation model) and extra CO2 (mL/min).
 */
export interface BloodView {
  odc: OdcCtx;
  coFactor: number;
  co2LoadMlMin: number;
}

export interface RespState {
  vaLpm?: number; // Alveolar ventilation of the last gas step (volatile uptake)
  evlwiExtra?: number; // Lung water from the blood's COP/capillary leak, mL/kg above the conditions'
  palvObs?: number; // 10 s mean alveolar pressure of obstructed efforts, mmHg (≤ 0; absent = 0) — the blood's NPPE input
  gaLvl?: number; // The anaesthetised-lung state 0 awake … 1 anaesthetised (absent until first anaesthetised)
  spont?: SpontDrive; // MODELED spontaneous drive (the lungs' drive/pti/fatigue + Winter's), absent in older snapshots
  m: number; // next 62.5 Hz sample index
  gasK: number; // next gas step (time gasK·0.1 s)
  pat: GasPatient;
  driver: DriverState;
  o2: O2State;
  co2: Co2State;
  delay: DelayLine;
  temp: TempState;
  shunt: number; // model shunt (MANUAL-calibrated or the `shunt` input)
  etco2: number; // current true EtCO2
  coRatio: number;
  seen: { spo2: number; etco2: number; shunt: number; tempCore: number }; // last targets acted on
  sampler: SamplerState;
  co2Sensor: 'off' | 'warmup' | 'on' | 'occluded'; // 'occluded' = the sampling line is blocked (CO2 OCCLUSION INOP)
  warmUntil: number;
  tempSensor: 'off' | 'on';
  tempSite: TempSite;
  num: { co2: Co2Num; imp: ImpNum; spo2: Spo2State; temp: TempNum };
  beats: number[];
  beatSeq: number;
  shownCo2: number;
  lungKey: string;
  lungCore: string; // The seven respiratory-signal fields of the last emission
  lungT: number; // Time of the last emission
  // The lung module and what configures it
  lung: LungState;
  lungSpecs: LungConditionSpec[];
  bd?: number; // The bronchodilation state B the lung was last resolved with (absent = 0; truth budget)
  bdExempt?: string[]; // Condition ids whose relief their owner applies (the endocrine anaphylaxis); absent = none
  histSev?: number; // The drug-driven bronchospasm severity last applied; absent = none
  /** Onset (sim s, earlier by the spec's `ageMin`) of each smooth-muscle condition and the sim time the lung was last
   * resolved at (ages are read there); absent while no smooth-muscle condition is present (truth budget). */
  sm?: { onsetS: Record<string, number>; atS: number };
  /** This patient's wakefulness shift (mmHg), drawn once from the 'resp-wake' stream (lung/drive.ts `wakeShiftMmHg`);
   * absent in older snapshots (= WAKE_MMHG). Out of truth: a patient constant. */
  wakeMmHg?: number;
  mainstemCmd: Mainstem | null; // Explicit `mainstem` command or an endobronchial airway; null = from conditions
  recruit: { p: number; until: number } | null; // sustained-inflation manoeuvre in progress
  /** The spontaneous pleural-swing multiplier of the tamponade effort (circ/conditions.ts tamponadeSwingF); absent = 1. */
  pplF?: number;
  circPtx: number; // The circulation model's own ext.pPtx (mmHg), read at 10 Hz, for the max-combined pleural pressure
  /** The tension pneumothorax's ACCUMULATED hemithorax pressure (mmHg) — what `lp.pPtx` delivers. */
  ptxAcc: number;
  /** The catalogue ceiling the accumulation climbs toward (mmHg, 0 = no pneumothorax). */
  ptxCeil: number;
  /** The last breath's mechanics (per breath; `kind` 'spont' leaves the positive-pressure fields null). */
  mechanics?: Mechanics;
  /** The dead-space set of the last breath (VD anat/app/alv/phys, Enghoff VD/VT, PĒCO2). */
  vd?: DeadSpace;
  /** Static volumes (1 Hz): the bedside FRC, the PFT set (seated) and the forced expiration; `pred` = ECSC/Zapletal. */
  volumes?: Omit<Actual, 'fe'> & { frc: number; cc: number | null; pattern: string; pred: Predicted; fe: Actual['fe'] };
  /** Respiratory-mechanics machinery (out of truth): the running Ppeak, the end-expiratory hold of the breath in
   * progress, the patient constants. */
  brk: { pk: number; peepTot: number; pesEe: number; ageY: number; bmi: number; pred: Predicted };
  out: EngineEvent[];
}

export function createRespState(profile: PatientProfile | undefined, l1: L1State, seed: number): RespState {
  const pat = gasPatient(profile);
  const rng = seedStream(seed, 'resp'); // Its own stream: drawing here never shifts the other streams (brief §3.3)
  const sens = profile?.sensors ?? {};
  const t0 = l1Target(l1, 'tempCore', 0);
  const rs: RespState = {
    m: 0, gasK: 0, pat, driver: createDriver(rng),
    o2: { fa: 0.14, cv: 140, sa: 0.97, pao2: 95 },
    // The blood model builds the patient's CHRONIC renal compensation on `paco2Rest` (45/55 mmHg at GOLD 3/4), so a
    // retainer whose CO2 compartments start from the generic EtCO2 target begins with the chronic HCO3 and a normal
    // PaCO2 — an alkalaemia (pH 7.49, PaCO2 37 at 10 s against the settled 7.39 / 49) that no patient has. A retainer's
    // stores start at his own resting PaCO2; every other patient (`paco2Rest` = PACO2_REST_MMHG) keeps the
    // EtCO2-derived start exactly.
    co2: createCo2State(pat.paco2Rest > PACO2_REST_MMHG ? pat.paco2Rest : l1Target(l1, 'etco2', 0) + PA_ET_GRADIENT),
    delay: createDelay(l1Target(l1, 'spo2', 0) / 100),
    temp: createTemp(t0, pat.effKg),
    shunt: l1Target(l1, 'shunt', 0), etco2: l1Target(l1, 'etco2', 0), coRatio: 1,
    seen: { spo2: Number.NaN, etco2: Number.NaN, shunt: l1Target(l1, 'shunt', 0), tempCore: t0 },
    sampler: createSampler('sidestream', (profile?.ageY ?? 40) < 28 / 365),
    co2Sensor: sens.co2 === 'on' || sens.co2 === 'warmup' ? 'on' : 'off', warmUntil: 0,
    tempSensor: sens.temp === 'off' ? 'off' : 'on', tempSite: 'axilla',
    num: {
      co2: createCo2Num(), imp: createImpNum(),
      spo2: createSpo2(l1Target(l1, 'spo2', 0) / 100, Math.max(-2, Math.min(2, normal(rng)))), // bias ±2–3 % RMS [ENG]
      temp: createTempNum(t0),
    },
    beats: [], beatSeq: -1, shownCo2: 0, lungKey: '', lungCore: '', lungT: -1e12, out: [],
    lung: createLung(resolveLung(profile?.lungConditions ?? [], pat.ibwKg).lp, pat.frcGaMl, 0.14, 140),
    lungSpecs: [...(profile?.lungConditions ?? [])], mainstemCmd: null, recruit: null, circPtx: 0, ptxAcc: 0, ptxCeil: 0,
    brk: createBrk(profile, pat),
  };
  rs.driver.vent = { ...rs.driver.vent, ...ventDefaults(pat, profile?.ageY ?? 40) }; // Per-patient ventilator defaults
  applyLungSpecs(rs); // Mainstem from the profile's conditions
  // ONE seeded draw per patient on its own stream (drawing it never shifts the 'resp' stream's SpO2 bias and breath
  // jitter): whether and how long this patient is apnoeic after an induction dose (the Diprivan label's spread)
  rs.wakeMmHg = wakeShiftMmHg(uniform(seedStream(seed, 'resp-wake')));
  return rs;
}

// --- helpers ----------------------------------------------------------------------------------------------
function driverCtx(rs: RespState, l1: L1State, t: number, neuro?: NeuroResp): DriverCtx {
  const n = neuro; // The instructor's rr/vt × the drug/NMB multipliers; apnoea → rr 0
  const sp = modeledSpont(rs, l1) ? rs.spont : undefined; // MODELED — the chemoreflex drive's own rr/vt (spont.ts)
  return {
    rr: sp ? sp.rr : n ? (n.apnoea ? 0 : l1Target(l1, 'rr', t) * n.rrMult) : l1Target(l1, 'rr', t),
    vt: sp ? sp.vt : n ? l1Target(l1, 'vt', t) * n.vtMult : l1Target(l1, 'vt', t),
    fio2: l1Target(l1, 'fio2', t), etco2: rs.etco2, complianceMl: compliance(rs),
    obstructed: n ? n.obstruction >= 0.9 : false,
    cleft: n && n.cleft > 0.15 ? n.cleft : 0,
    ...obstructedEffort(rs, n),
    vdSeriesMl: physicalDeadSpace(rs.pat, rs.driver.source !== 'spontaneous' && rs.driver.source !== 'none'), // ONE dead space — the physical VD, not a second expression
    // Assist-control and bucking — the MODELED drive runs on the ventilator too (gasStep)
    triggerRr: l1.mode === 'modeled' && rs.driver.source === 'ventilator' && (rs.spont?.rr ?? 0) > 0 ? (rs.spont as SpontDrive).rr : 0,
    buck: l1.mode === 'modeled' && rs.driver.source === 'ventilator' && !!n && n.pMaxMult > 0.5 && n.loc < 0.5 && n.pain > 0.2,
  };
}
/** The pleural swing of an effort against an obstructed airway (partial: × obstruction; complete: all). */
function obstructedEffort(rs: RespState, n?: NeuroResp): { pmusObs: number; pmusFull: number } {
  const cap = P_MAX_CMH2O * (n?.pMaxMult ?? 1) * rs.lung.lp.pMax * (rs.spont?.fatigue ?? 1);
  const full = Math.min(cap, PMUS_REST_CMH2O * (rs.spont?.effort ?? 1));
  return { pmusObs: full * Math.min(1, n?.obstruction ?? 0), pmusFull: full };
}
/** MODELED spontaneous breathing follows the chemoreflex drive once it has been evaluated. */
function modeledSpont(rs: RespState, l1: L1State): boolean {
  return l1.mode === 'modeled' && rs.driver.source === 'spontaneous' && (rs.spont?.rr ?? -1) >= 0;
}
function compliance(rs: RespState): number {
  return staticCompliance(rs.lung); // The lung module (endobronchial ×0.5 emerges from the mainstem block)
}
function deadSpace(rs: RespState, l1?: L1State): number {
  const mech = rs.driver.source !== 'spontaneous' && rs.driver.source !== 'none';
  // The EtCO2 → dead-space fit belongs to MANUAL. It is an instructor's calibration of a DISPLAYED number, never a
  // MODELED patient's anatomy, and in MODELED it would inflate the dead space of every patient — including
  // spontaneously breathing women, children and the elderly, who would keep the adult RR 15 / VT 500 / EtCO2 36 fit
  // (265 / 329 / 459 mL).
  const fit = l1?.mode === 'modeled' ? 0 : rs.co2.vdExtraMl;
  // The ONE physical dead space (anatomical − ETT bypass + apparatus); the artificial airway is taken to be present
  // exactly when the apparatus is (the resp module has no airway-device seam of its own)
  return physicalDeadSpace(rs.pat, mech) + fit;
}
/**
 * A kinked tube multiplies the tube resistance by 1 + (KINK_R_MULT − 1)·severity — a complete kink (severity 1) × 150,
 * so a 40 cmH2O Pmax moves ≤ 20 % of the set VT [ENG, fit target RS9 "VT ≤ 20 % delivered"; partial kinks scale].
 */
export const KINK_R_MULT = 150;
/** Bucking — an expiratory muscle pressure (cmH2O) over the first BUCK_S of a mechanical inspiration [ENG; McCool 2006 Chest 129:48S]. */
export const BUCK_CMH2O = 30;
export const BUCK_S = 0.5;
/** The cough pressure of a bucking breath at time t (cmH2O, ≥ 0). */
function buckPressure(rs: RespState, t: number): number {
  const c = cycleAt(rs.driver, t);
  if (!c || !c.buck) return 0;
  const u = t - c.t0;
  return u < BUCK_S ? BUCK_CMH2O * Math.sin((Math.PI * u) / BUCK_S) : 0;
}
/**
 * ONE dead space. The series dead space the sampled expirate must wash out is the same PHYSICAL dead space the gas
 * exchange uses: the exported `physicalDeadSpace(rs.pat, mechanical)` (anatomical with the artificial airway's bypass
 * credited, `ETT_BYPASS_ML_PER_KG` 1.1 mL/kg IBW floored at 30 %, + the apparatus) — NEVER the MANUAL EtCO2 fit
 * `co2.vdExtraMl`, which is a display calibration and not gas (a 3.5 kg neonate on the adult MANUAL defaults carries a
 * ≈ 400 mL fit), and never a second expression of its own, which would compute the plateau against a washout volume
 * the gas exchange does not have.
 */
// Bronchospasm carries no separate gradient or shunt: the airway event is an alias
// of the lung condition, whose dead space (vdAlv) and low-V/Q admixture carry the gap and the desaturation once.
function extraGradient(_rs: RespState): number {
  return 0;
}
function extraShunt(_rs: RespState): number {
  return 0; // Endobronchial shunt emerges (mainstem block)
}
function currentFio2(rs: RespState, l1: L1State, t: number): number {
  const d = rs.driver;
  if (preoxActive(d, t)) return (d.preox as { fio2: number }).fio2;
  if (d.source === 'external' && d.ext) return d.ext.fio2;
  const c = cycleAt(d, t);
  return c ? c.fio2 : l1Target(l1, 'fio2', t);
}
function sameLimbCuff(h: HemoState): boolean {
  const s = h.pleth.site;
  return h.nibp.cuff > 0 && ((s === 'leftFinger' && h.nibp.site === 'leftArm') || (s === 'rightFinger' && h.nibp.site === 'rightArm'));
}

/** The seam the haemodynamics reads: u(t) (see driver.breathSignal). */
export function respBreathU(rs: RespState, t: number): number {
  return breathSignal(rs.driver, t, compliance(rs));
}

/** Re-resolve the lung from its condition specs, the bronchospasm multiplier and the mainstem state. */
/** Each smooth-muscle condition's age (min) at the last re-resolve — the non-reversible share grows with it. */
function smAges(rs: RespState): Record<string, number> {
  const out: Record<string, number> = {};
  const sm = rs.sm;
  if (sm) for (const [id, t0] of Object.entries(sm.onsetS)) out[id] = Math.max(0, (sm.atS - t0) / 60);
  return out;
}

/** Stamp each new smooth-muscle condition's onset (now − its `ageMin`), forget ended ones. */
function syncSmOnset(rs: RespState, t: number): void {
  const specs = rs.lungSpecs.filter((s) => SMOOTH_MUSCLE[s.id] !== undefined);
  if (!specs.length) { delete rs.sm; return; }
  const sm = (rs.sm ??= { onsetS: {}, atS: t });
  for (const s of specs) sm.onsetS[s.id] ??= t - 60 * (s.ageMin ?? 0);
  for (const id of Object.keys(sm.onsetS)) if (!specs.some((s) => s.id === id)) delete sm.onsetS[id];
}

/** The lung specs with the drug-driven bronchospasm ADDED to the side-less `bronchospasm` spec (created when
 * absent). It is relievable — never in `bdExempt` — so salbutamol reverses it through `relaxed()`; the
 * instructor's own spec list is not edited. */
function withDrugSpasm(specs: readonly LungConditionSpec[], sev: number): readonly LungConditionSpec[] {
  if (!(sev > 0)) return specs;
  const i = specs.findIndex((s) => s.id === 'bronchospasm' && s.side === undefined);
  if (i < 0) return [...specs, { id: 'bronchospasm', severity: sev }];
  return specs.map((s, k) => (k === i ? { ...s, severity: s.severity + sev } : s));
}

export function applyLungSpecs(rs: RespState): void {
  const ages = smAges(rs);
  const specs = withDrugSpasm(rs.lungSpecs, rs.histSev ?? 0); // Histamine release constricts
  const r = resolveLung(specs, rs.pat.ibwKg, rs.evlwiExtra ?? 0, rs.bd ?? 0, rs.bdExempt ?? [], ages); // + lung water; B (+ condition ages)
  const spasm = spasmSeverity(specs, rs.bd ?? 0, rs.bdExempt ?? [], ages); // The shark fin follows the lung
  if (spasm > 0) rs.driver.spasm = spasm;
  else delete rs.driver.spasm;
  const ls = rs.lung;
  // The catalogue value is the CEILING of the one-way-valve build-up, not the pressure itself. `lp.pPtx` keeps its
  // name, place and unit and delivers the accumulated pressure (0 at onset).
  rs.ptxCeil = r.lp.pPtx;
  r.lp.pPtx = Math.min(rs.ptxAcc, rs.ptxCeil);
  if (rs.driver.airway === 'obstructed' && rs.driver.source === 'ventilator') r.lp.rTube *= 1 + (KINK_R_MULT - 1) * Math.min(1, rs.driver.severity); // Kinked tube
  ls.lp = r.lp;
  ls.mainstem = rs.mainstemCmd ?? (r.blocked.includes('L') ? 'right' : r.blocked.includes('R') ? 'left' : 'both');
  ls.mp = mechParams(r.lp, ls.aer, blockedSides(ls.mainstem));
}

/** Induction-atelectasis factor by body size (catalogue §10: atel 0.11 at BMI 40 vs 0.06 lean) [ENG]. */
export function inductionFactor(pat: GasPatient): number {
  const bmi = pat.weightKg / (pat.ibwKg > 0 ? (pat.ibwKg / 22) : 1); // ≈ BMI from IBW at BMI 22
  return Math.min(3, 1 + 0.05 * Math.max(0, bmi - 25));
}

/**
 * How the breath driver drives the lung units at time t. Positive-pressure inspiration and spontaneous inspiration are
 * flow sources (the driver's volume curve); expiration returns to PEEP (ventilator) or 0; a recruitment manoeuvre holds
 * its pressure.
 */
export function lungDrive(rs: RespState, t: number): { mode: 'flow' | 'pressure'; x: number; pLimit?: number } { // pLimit
  const d = rs.driver;
  const peep = d.source === 'ventilator' ? d.vent.peep : d.source === 'external' && d.ext ? d.ext.peep : 0;
  if (rs.recruit && t < rs.recruit.until) return { mode: 'pressure', x: rs.recruit.p };
  if (d.source === 'external' && d.ext) {
    const dt = 0.016;
    const q = (frameAt(d.ext, t, 2) - frameAt(d.ext, t - dt, 2)) / dt; // mL/s from the frames' volume
    return q > 50 ? { mode: 'flow', x: q } : { mode: 'pressure', x: d.ext.peep };
  }
  const c = cycleAt(d, t);
  if (!c || !c.exch || t >= c.cutAt || !(c.vt > 0)) return { mode: 'pressure', x: peep };
  const u = t - c.t0;
  if (u >= c.ti) return { mode: 'pressure', x: c.mech ? peep : 0 };
  if (c.mech) {
    // Volume control is a flow source limited at Pmax — the mechanics hold the airway AT Pmax in any sub-step where the
    // set flow would push it above (lung/mechanics.ts mechSubstep pLimit)
    return { mode: 'flow', x: c.vt / Math.max(1e-3, c.ti), pLimit: d.source === 'ventilator' ? (d.vent.pmax ?? VCV_PMAX_DEFAULT) : Infinity };
  }
  return { mode: 'flow', x: ((c.vt * Math.PI) / (2 * c.ti)) * Math.sin((Math.PI * u) / c.ti) };
}

/**
 * One step of the tension pneumothorax's one-way valve. Air crosses while the alveolar pressure exceeds the pleural
 * pressure, and the hemithorax's pressure–volume relation makes the rise slow as it approaches the catalogue ceiling.
 * Under PPV the driving pressure is the whole inspiratory alveolar pressure, so the ceiling is reached in minutes; a
 * spontaneously breathing patient's inspiration is negative at the alveolus and only the expiratory phase drives the
 * valve, so it takes far longer — which is the clinical difference.
 */
export function ptxStep(rs: RespState, dt: number): void {
  const ceil = rs.ptxCeil;
  if (ceil <= 0) {
    if (rs.ptxAcc > 0) rs.ptxAcc = Math.max(0, rs.ptxAcc - (rs.ptxAcc * dt) / PTX_DRAIN_TAU_S);
    rs.lung.lp.pPtx = rs.ptxAcc;
    return;
  }
  const ls = rs.lung;
  const pcw = chestWallPressure(ls.mp, ls.mech);
  let pAlv = -Infinity;
  for (let u = 0; u < ls.mech.v.length; u++) pAlv = Math.max(pAlv, unitPressure(ls.mp, ls.mech, u, pcw));
  const pPl = rs.ptxAcc / CMH2O_TO_MMHG; // the pleural pressure the valve works against, in cmH2O
  const drive = Math.max(0, pAlv - pPl);
  // one brake only: the valve itself. Once the pleural pressure reaches the PEAK alveolar pressure no more air can
  // cross, so the pressure a tension pneumothorax reaches is bounded by the airway pressure — which is why it is a
  // ventilated patient's emergency. The catalogue value is the ceiling that bound is clamped to.
  if (drive > 0) rs.ptxAcc = Math.min(ceil, rs.ptxAcc + PTX_VALVE_PER_CMH2O_S * drive * dt);
  ls.lp.pPtx = rs.ptxAcc;
}

/** Circulation seam: continuous pleural pressure (mmHg). */
export function respPleural(rs: RespState, t: number): number {
  // The circulation's continuous pleural shape, carried by the lung module — the condition's own airway-to-pleura
  // transmission (tIt relative to the healthy 0.4, so a healthy lung keeps the circulation's calibrated T_IT 0.65;
  // Q78, catalogue §5/§6/§10), the trapped-gas pressure (auto-PEEP) on the internal ventilator, and the lungs' pleural
  // pressure (effusion, haemothorax, pneumothorax) max-combined with the circulation's own ext.pPtx so a scenario that
  // sends both commands does not count it twice. External frames already carry the ventilator's alveolar pressure
  // (palv), so no auto-PEEP term is added there.
  const d = rs.driver;
  const lp = rs.lung.lp;
  const k = lp.tIt / HEALTHY.tIt;
  const base = pleuralPressureMmHg(d, t, compliance(rs), rs.pplF ?? 1);
  let p = P_PL0 + k * (base - P_PL0);
  if (d.source === 'ventilator') p += k * T_IT * Math.max(0, rs.lung.peepTot - d.vent.peep) * CMH2O_TO_MMHG;
  return p + Math.max(0, lp.pPtx - rs.circPtx) + (rs.lung.mech.pMus ?? 0) * CMH2O_TO_MMHG; // A cough raises the intrathoracic pressure
}

/**
 * Metabolic factor: temperature, general anaesthesia and shivering, MH (VO2 × 2.5 / VCO2 × 3 at activity 1) and the
 * endocrine rate (thyroid, sepsis, hypermetabolic: `temp.extraX`). Exported for the blood's VO2
 * demand; `gas` selects the O2 or CO2 factor (they differ in MH).
 */
export function metabolic(rs: RespState, t: number, gas: 'o2' | 'co2' = 'co2'): number {
  const m = thermalMetabolic(rs.temp, t);
  return tempFactor(rs.temp.tc) * (gas === 'o2' ? m.vo2F : m.vco2F) * rs.temp.extraX * (1 - (1 - GA_METABOLIC) * gaLevel(rs)) * (1 + PREG_VO2_TERM * pregnancy(rs));
}

/** Pregnancy severity (the `pregnancy` lung condition, 0–1). */
export function pregnancy(rs: RespState): number {
  return Math.min(1, rs.lungSpecs.reduce((m, s) => (s.id === 'pregnancy' ? Math.max(m, s.severity) : m), 0));
}

/**
 * "Anaesthetised lungs" follow the anaesthetic state. Loss of consciousness or a paralysed diaphragm drops FRC by loss
 * of inspiratory muscle tone within minutes of induction (Hedenstierna & Edmark, BJA 2010;104:16 — FRC −0.4–0.5 L,
 * atelectasis within 5 min; Westbrook 1973 J Appl Physiol 34:81), and VO2 falls ~15 %. The `thermal` event's
 * `anaesthesia: 'general'` stays an explicit override (1). τ 20 s on (FRC falls within the first minute), 300 s off
 * [ENG].
 */
export const GA_TAU_ON_S = 20;
export const GA_TAU_OFF_S = 300;
export function gaLevel(rs: RespState): number {
  return rs.temp.anaesthesia === 'general' ? 1 : (rs.gaLvl ?? 0);
}
function frcNow(rs: RespState): number {
  return rs.pat.frcMl + (rs.pat.frcGaMl - rs.pat.frcMl) * gaLevel(rs);
}

function o2Inputs(rs: RespState, l1: L1State, t: number, vaLpm: number, blood?: BloodView): O2Inputs { // Blood
  const a = rs.driver.airway;
  const open = a === 'patent' || a === 'apnoea' || a === 'disconnected' || a === 'bronchospasm' || a === 'endobronchial';
  return {
    vaLpm, fio2: currentFio2(rs, l1, t),
    massFlowFio2: vaLpm > 0 || !open ? null : preoxActive(rs.driver, t) ? (rs.driver.preox as { fio2: number }).fio2 : 0.21,
    qLpm: rs.coRatio * CI_LPM_PER_KG * rs.pat.effKg, vo2: rs.pat.vo2 * metabolic(rs, t, 'o2'), shunt: Math.min(0.9, rs.shunt + extraShunt(rs)),
    paco2: rs.co2.pf, tempC: rs.temp.tc, frcMl: frcNow(rs), bloodL: rs.pat.bloodL,
    ...(blood ? { odc: blood.odc } : {}),
  };
}

/** Nominal alveolar ventilation of the current settings (MANUAL calibration). */
function nominalVa(rs: RespState, l1: L1State, t: number): number {
  const n = nominalRate(rs.driver, driverCtx(rs, l1, t));
  return (n.rr * Math.max(0, n.vt - deadSpace(rs, l1))) / 1000;
}

// --- 10 Hz gas step ----------------------------------------------------------------------------------------
function gasStep(rs: RespState, ctx: RespCtx, t: number): void {
  const l1 = ctx.l1;
  const h = ctx.hemo;
  const d = rs.driver;
  checkDrive(d, t);
  // The ratio is to THIS patient's normal output (the module's own convention, Q = coRatio × CI_LPM_PER_KG × effKg),
  // not to the adult 5.25 L/min — against the adult reference a 16 kg child at rest reads 0.21 and an infant 0.10, so
  // the low-flow CO2 compression (lowFlowFactor 0.40 / 0.24) would treat every small patient as in low-flow shock
  // (PaCO2 67 / 81 on 7 mL/kg). The 70 kg adult is bit-identical. CPR flow scales with the patient's size too, so the
  // CPR case uses the same per-patient reference as the perfusing case.
  rs.coRatio = (cardiacOutput(h, t) / coRefLpm(rs.pat)) * (ctx.blood?.coFactor ?? 1); // Blood-volume fallback
  // The anaesthetised-lung state relaxes toward max(unconscious, diaphragm block)
  const gaT = Math.max(ctx.neuro?.loc ?? 0, 1 - (ctx.neuro?.pMaxMult ?? 1));
  const gaTau = gaT > (rs.gaLvl ?? 0) ? GA_TAU_ON_S : GA_TAU_OFF_S;
  const gaNext = (rs.gaLvl ?? 0) + (gaT - (rs.gaLvl ?? 0)) * (1 - Math.exp(-GAS_DT_S / gaTau));
  if (gaNext > 1e-4 || rs.gaLvl !== undefined) rs.gaLvl = gaNext; // Absent until first anaesthetised (truth budget)
  // Airway smooth muscle follows the drug model's bronchodilation (re-resolved when B moves by ≥ 0.01, as the endocrine
  // model's writeLung does)
  const bd = Math.min(1, Math.max(0, ctx.bronchoDil ?? 0));
  const exempt = ctx.anaphEndo ? ['anaphylaxis'] : [];
  syncSmOnset(rs, t); // The attack ages; under a bronchodilator the lung is re-resolved once a sim-minute for it
  // The drug-driven bronchospasm severity, re-resolved on the same ≥ 0.01 rule as B
  const hs = HIST_SPASM * Math.min(1, Math.max(0, ctx.histamine ?? 0));
  const histMoved = Math.abs(hs - (rs.histSev ?? 0)) >= 0.01 || (hs === 0 && (rs.histSev ?? 0) > 0);
  if (histMoved) {
    if (hs > 0) rs.histSev = hs;
    else delete rs.histSev; // Absent until a releaser acts (truth budget)
  }
  if (histMoved || Math.abs(bd - (rs.bd ?? 0)) >= 0.01 || (bd === 0 && (rs.bd ?? 0) > 0) || exempt.length !== (rs.bdExempt ?? []).length
    || (bd > 0 && rs.sm !== undefined && t - rs.sm.atS >= 60)) {
    if (rs.sm) rs.sm.atS = t;
    if (bd > 0 || rs.bd !== undefined) rs.bd = bd; // Absent until a bronchodilator acts (truth budget)
    if (exempt.length) rs.bdExempt = exempt;
    else delete rs.bdExempt;
    applyLungSpecs(rs);
  }
  // temperature at 1 Hz; MANUAL tempCore target places the model (plan decision 2)
  if (rs.gasK % 10 === 0) {
    const tc = l1Target(l1, 'tempCore', t);
    if (tc !== rs.seen.tempCore) {
      setCoreTarget(rs.temp, tc);
      rs.seen.tempCore = tc;
    }
    // The respiratory heat loss follows the actual ventilation; machine gas is dry, an HME is assumed unless
    // `thermal7e { hme: false }` removed it
    const mech = d.source === 'ventilator' || d.source === 'bvm' || d.source === 'external';
    const nv = nominalRate(d, driverCtx(rs, l1, t));
    rs.temp.vent = { veLpm: d.airway === 'apnoea' || d.source === 'none' ? 0 : (nv.rr * nv.vt) / 1000, dryGas: mech, hme: mech ? rs.temp.vent.hme || !rs.temp.vent.dryGas : false };
    stepTemp(rs.temp, t, 1);
    tempNumStep(rs.num.temp, rs.temp.sites, rs.tempSite, 1);
  }
  const vco2 = rs.pat.vco2 * metabolic(rs, t) + (ctx.blood?.co2LoadMlMin ?? 0); // Bicarbonate CO2
  // The lung module's 10 Hz step (recruitment, HPV, perfusion, CO2 mix, O2 stores) before the CO2 store. It runs
  // BEFORE the MANUAL etco2 calibration, so the calibration at t = 0 already sees the profile's own mixing-point ratios
  // (g, e) rather than the healthy defaults.
  const va0 = alveolarVentilation(d, t, deadSpace(rs, l1));
  const x = o2Inputs(rs, l1, t, va0, ctx.blood); // Blood
  const ga = gaLevel(rs) >= 0.5; // Induction atelectasis once anaesthetised
  rs.lung.frcGaMl = frcNow(rs);
  const side = circSideFlows(h);
  lungGasStep(rs.lung, {
    va: va0, q: side ? (side[0] as number) + (side[1] as number) : x.qLpm, baseShunt: x.shunt, fio2: x.fio2, massFlowFio2: x.massFlowFio2,
    vo2: x.vo2, vco2, paco2: rs.co2.pf, tempC: x.tempC, bloodL: x.bloodL, coRatio: rs.coRatio, ga, indFactor: inductionFactor(rs.pat), hpvInhibit: ctx.hpvInhibit ?? 0, sideFlow: side,
    qRef: CI_LPM_PER_KG * rs.pat.effKg, // Reference flow for the CO2 mix (low flow keeps the gas model's φ)
    ...(x.odc ? { odc: x.odc } : {}), // The blood's ODC reaches SaO2/PaO2 truth
  }, GAS_DT_S);
  writeCircPvr(h, rs.lung.perf.pvrMult, rs.lung.lp.pvr); // Per-lung + global lung PVR (circulation seams, duck-typed)
  rs.circPtx = circPtx(h);
  const awake = 1 - Math.max(ctx.neuro?.loc ?? 0, gaLevel(rs)); // The dyspnoeic effort is the conscious patient's
  const swingF = l1.mode === 'modeled' ? tamponadeSwingF(circPericardial(h), ctx.cbfRel ?? 1, awake) : 1; // The breathing of severe tamponade (E118)
  if (swingF > 1) rs.pplF = swingF;
  else delete rs.pplF;
  // MANUAL etco2 target → physiological dead space that holds it at the current settings. Calibrate only in MANUAL; in
  // MODELED the resting PaCO2 is the PATIENT's set point, not one derived from L1's adult EtCO2 default plus a gradient
  const etT = l1Target(l1, 'etco2', t);
  if (l1.mode === 'modeled') {
    if (rs.seen.etco2 !== etT) {
      rs.seen.etco2 = etT;
      rs.co2.vdExtraMl = 0;
      const rest = rs.pat.paco2Rest;
      if (!Number.isFinite(rs.co2.pf) || rs.co2.pf <= 0) { rs.co2.pf = rest; rs.co2.ps = rest; }
      (rs.spont ??= createSpontDrive()).paco2Rest = rest;
    }
  } else if (etT !== rs.seen.etco2) {
    rs.seen.etco2 = etT;
    const n = nominalRate(d, driverCtx(rs, l1, t));
    rs.co2.flow = lowFlowFactor(rs.coRatio); // calibrate against the settled low-flow factor
    const pf = (etT / Math.max(0.05, rs.co2.flow) + extraGradient(rs)) / Math.max(0.5, rs.lung.co2.g); // The mixing point's gap
    if (n.rr > 0) {
      const base = deadSpace(rs) - rs.co2.vdExtraMl;
      const need = n.vt - (vaForPaco2(vco2, pf) / Math.max(0.3, rs.lung.co2.e) * 1000) / n.rr; // ÷ the lung's elimination efficiency
      rs.co2.vdExtraMl = Math.min(0.8 * n.vt, Math.max(-0.5 * rs.pat.deadSpaceMl, need - base));
    }
    rs.co2.pf = pf;
    rs.co2.ps = pf;
    (rs.spont ??= createSpontDrive()).paco2Rest = pf; // The resting PaCO2 is the MODELED drive's set point
  }
  if (l1.mode === 'modeled' && (d.source === 'spontaneous' || d.source === 'ventilator')) { // The lung model's chemoreflex drive, 1 Hz (spont.ts); also on the ventilator (triggering)
    const lp = rs.lung.lp;
    stepSpontDrive((rs.spont ??= createSpontDrive()), {
      t, paco2: rs.co2.pf, pao2: rs.o2.pao2, hco3: ctx.hco3 ?? 24, rr0: l1Target(l1, 'rr', t), vt0: l1Target(l1, 'vt', t),
      wakeMmHg: rs.wakeMmHg,
      co2SlopeMult: lp.co2Slope, pMaxMult: lp.pMax, evlwi: 7 + (rs.evlwiExtra ?? 0), complianceMl: compliance(rs),
      resistance: lp.rTube + 1 / lp.side.reduce((g, sd) => g + 1 / Math.max(0.1, sd.rLung), 0), neuro: ctx.neuro,
      noFlow: ctx.rhythm.opts?.pulseless === true || rs.coRatio <= 0, cbfRel: ctx.cbfRel,
      pulseless: ctx.rhythm.opts?.pulseless === true || NO_BEAT_RHYTHMS.has(ctx.rhythm.id),
      ibwKg: rs.pat.ibwKg, airwayObs: d.airway === 'obstructed' ? 1 : 0,
      setShift: PREG_PACO2_SHIFT_MMHG * pregnancy(rs), // Progesterone
      jDrive: Math.min(1, rs.lungSpecs.reduce((m, s) => (s.id === 'pe' ? Math.max(m, s.severity) : m), 0)),
    });
  }
  const va = alveolarVentilation(d, t, deadSpace(rs, l1));
  rs.vaLpm = va;
  const palvNow = -obstructedSwingMmHg(d, t); // Alveolar ≈ pleural during a no-flow effort
  if (palvNow < 0 || rs.palvObs !== undefined) {
    rs.palvObs = (rs.palvObs ?? 0) + (palvNow - (rs.palvObs ?? 0)) * (GAS_DT_S / 10);
    if (rs.palvObs > -0.01 && palvNow === 0) delete rs.palvObs;
  }
  stepCo2(rs.co2, { vaLpm: va * rs.lung.co2.e, vco2, coRatio: rs.coRatio, cf: rs.pat.cf, cs: rs.pat.cs, kfs: rs.pat.kfs, extraGradient: extraGradient(rs), pico2: d.fico2, alvVolL: frcNow(rs) / 1000 }, GAS_DT_S); // The inspired CO2 of the breaths
  rs.etco2 = etco2Mixed(rs.co2, rs.lung.co2.g, extraGradient(rs));
  // MANUAL shunt input and spo2 target (spo2 wins when both change; decision 2)
  const sh = l1Target(l1, 'shunt', t);
  if (sh !== rs.seen.shunt) {
    rs.seen.shunt = sh;
    rs.shunt = sh;
  }
  const spT = l1Target(l1, 'spo2', t);
  if (spT !== rs.seen.spo2) {
    rs.seen.spo2 = spT;
    const x = o2Inputs(rs, l1, t, Math.max(0.3, nominalVa(rs, l1, t)), ctx.blood);
    rs.shunt = Math.max(0, solveShunt(x, spT / 100) - extraShunt(rs));
    const ss = o2Steady({ ...x, shunt: rs.shunt + extraShunt(rs) }, rs.shunt + extraShunt(rs));
    if (ss && (va > 0 || rs.gasK === 0)) Object.assign(rs.o2, ss);
    if (ss && (va > 0 || rs.gasK === 0)) { rs.lung.o2.fa = [ss.fa, ss.fa]; rs.lung.o2.cv = ss.cv; } // Place both stores
  }
  // The O2 truth is the lung's two stores (stepped inside lungGasStep); rs.o2 mirrors it for the respiratory-signal
  // readers
  const lo = rs.lung.o2;
  rs.o2.sa = lo.sa;
  rs.o2.pao2 = lo.pao2;
  rs.o2.cv = lo.cv;
  rs.o2.fa = (lo.fa[0] as number) * 0.45 + (lo.fa[1] as number) * 0.55;
  const pinned = l1.pinned.includes('spo2');
  const sa = pinned ? spT / 100 : rs.o2.sa; // M5: an instructor pin on spo2 disables autoDesat
  const piM = piNumeric(h.num.pleth, t);
  const shownSa = ctx.blood && !pinned ? pulseOxApparent(sa, ctx.blood.odc) : sa; // What the oximeter reads (dyshaemoglobins)
  const siteSa = delayStep(rs.delay, shownSa, siteDelay(h.pleth.site, rs.coRatio, piM.value), GAS_DT_S);
  stepSpo2(rs.num.spo2, {
    siteSa, probe: h.pleth.state, lastFootT: h.num.pleth.beats[h.num.pleth.beats.length - 1]?.t ?? -1e12, // a completed pulse
    pi: piM.value, cuffOnLimb: sameLimbCuff(h), cpr: h.cpr.active,
  }, t);
  // Coupled truths (brief §4.9: the `state` event shows truth; flags show 'override' when it departs from target).
  // Heart–lung interaction is emergent through respPleural(); the MANUAL mean-Paw coupling is retired. Clear any
  // coupled truths a restored older snapshot might carry.
  const c = (l1.coupled ??= {});
  delete c.cvp;
  delete c.sbp;
  delete c.dbp;
  delete c.volumeStatus;
  const n = nominalRate(d, driverCtx(rs, l1, t));
  c.spo2 = sa * 100;
  c.etco2 = rs.etco2;
  c.fio2 = currentFio2(rs, l1, t);
  c.shunt = shuntFraction(rs.lung, Math.min(0.9, rs.shunt + extraShunt(rs)));
  c.tempCore = rs.temp.tc;
  if (d.source === 'spontaneous' && d.airway !== 'apnoea') {
    delete c.rr; // the spontaneous driver breathes at the rr/vt targets
    delete c.vt;
  } else {
    const breathing = d.source !== 'none' && d.source !== 'spontaneous';
    c.rr = breathing ? n.rr : 0;
    c.vt = breathing ? n.vt : 0;
  }
  if (rs.gasK % 10 === 0) updateVolumes(rs);
  lungStateEvent(rs, t, l1);
  if (rs.gasK % 10 === 0 && rs.gasK > 0) emitSecond(rs, t);
}

function lungStateEvent(rs: RespState, t: number, l1?: L1State): void {
  const d = rs.driver;
  const ev = lungStatePayload(rs.lung, {
    deadSpaceMl: deadSpace(rs, l1), frcMl: frcNow(rs),
    effort: d.source === 'spontaneous' ? 1 : d.cleft, peep: d.source === 'ventilator' ? d.vent.peep : d.ext ? d.ext.peep : 0,
    baseShunt: Math.min(0.9, rs.shunt + extraShunt(rs)), specs: rs.lungSpecs,
    pleuralMmHg: Math.max(rs.lung.lp.pPtx, rs.circPtx), // Stage V.1: as respPleural combines them
  }); // Absolute + per-lung fields
  const key = JSON.stringify(ev);
  if (key === rs.lungKey) return;
  // The per-lung fields move slowly but continuously: emit at most once per second unless a respiratory-signal field
  // changed
  const core = JSON.stringify([ev.complianceMlPerCmH2O, ev.resistanceCmH2OPerLps, ev.effort, ev.autoPeepTendency, ev.shunt, ev.deadSpaceMl, ev.frcMl]);
  if (core === rs.lungCore && t - rs.lungT < 1) return;
  rs.lungKey = key;
  rs.lungCore = core;
  rs.lungT = t;
  rs.out.push({ type: 'lungState', t, ...ev });
}

// --- Per-breath mechanics and the volume set -------------------------------------------------------------------
const mechSource = (rs: RespState) => rs.driver.source === 'ventilator' || rs.driver.source === 'bvm' || rs.driver.source === 'external';
/**
 * The oesophageal-pressure ESTIMATE (cmH2O; lung/breath.ts). Awake and spontaneous: the lung model's own pleural
 * pressure (West: ≈ −5 at FRC). Supine and ventilated or anaesthetised: the balloon's supine value + the pleural change
 * from the relaxation volume (the lung's chest-wall recoil on a passive breath, the circulation's swing on a
 * spontaneous one).
 */
function pesNow(rs: RespState, t: number): number {
  if (!mechSource(rs) && gaLevel(rs) < 0.5) return respPleural(rs, t) / CMH2O_TO_MMHG;
  const ptx = Math.max(rs.lung.lp.pPtx, rs.circPtx) / CMH2O_TO_MMHG;
  const d = mechSource(rs) ? chestWallPressure(rs.lung.mp, rs.lung.mech) + (rs.lung.mech.pMus ?? 0) + ptx : (respPleural(rs, t) - P_PL0) / CMH2O_TO_MMHG;
  return pesEstimate(d, rs.brk.bmi);
}
/** The patient constants of the measurement (predicted volumes, BMI for the Pes estimate); height as gasPatient's. */
function createBrk(profile: PatientProfile | undefined, pat: GasPatient): RespState['brk'] {
  const ageY = profile?.ageY ?? 40;
  const heightCm = profile?.heightCm ?? defaultHeightCm(ageY);
  return { pk: 0, peepTot: 0, pesEe: 0, ageY, bmi: pat.weightKg / (heightCm / 100) ** 2, pred: predictedVolumes({ ageY, sex: profile?.sex ?? 'M', heightCm }) };
}
const setPeep = (rs: RespState) => (rs.driver.source === 'ventilator' ? rs.driver.vent.peep : rs.driver.source === 'external' && rs.driver.ext ? rs.driver.ext.peep : 0);
/** End-expiration (the next sample starts an inspiration): the expiratory hold on a copy and the end-expiratory Pes. */
function breathStart(rs: RespState, t: number): void {
  rs.brk.peepTot = mechSource(rs) ? expHold(rs.lung.mp, rs.lung.mech) : 0; // a hold needs a ventilator (D3)
  rs.brk.pesEe = pesNow(rs, t);
  rs.brk.pk = rs.lung.mech.paw;
}
/** End-inspiration (the next sample is not inspiratory flow): Ppeak, the inspiratory hold on a copy, the dead-space set. */
function breathEnd(rs: RespState, l1: L1State, t: number): void {
  const ls = rs.lung;
  const vt = ls.mech.v.reduce((a, v, u) => a + Math.max(0, v - (ls.v0[u] as number)), 0);
  // The delivered volume this cycle achieved — the `breath` event reports it instead of the set VT
  const cyc = cycleAt(rs.driver, t - 1e-3);
  if (cyc) cyc.vtDelMl = vt;
  if (!(vt > 5)) return;
  const mech = mechSource(rs) && (cycleAt(rs.driver, t - 1e-3)?.mech ?? true);
  const ppeak = Math.max(rs.brk.pk, ls.mech.paw);
  // Rinsp needs square flow — not a breath held at the VCV Pmax, not an external (link) PCV/PSV frame
  const limited = rs.driver.source === 'external' || (rs.driver.source === 'ventilator' && ppeak >= (rs.driver.vent.pmax ?? VCV_PMAX_DEFAULT) - 0.05);
  rs.mechanics = breathMechanics({
    t, mech, limited, vt, ti: t - ls.tInsp, peep: setPeep(rs), ppeak, pplat: mech ? inspHold(ls.mp, ls.mech) : 0, peepTot: rs.brk.peepTot,
    pesEi: pesNow(rs, t), pesEe: rs.brk.pesEe, elErs: 1 - staticCompliance(ls) / ls.mp.ccw,
  });
  const art = mech || rs.driver.airway !== 'patent';
  const vdS = deadSpace(rs, l1);
  rs.vd = deadSpaceSet({ vt, vdSeries: vdS, vdApp: art && mechSource(rs) ? Math.min(vdS, apparatusDeadSpaceMl(rs.pat.weightKg)) : 0, paco2: rs.co2.pf, pico2: rs.driver.fico2, e: ls.co2.e, phi: rs.co2.flow });
}
/** 1 Hz: the static volumes (predicted × the resolved lung) and the forced expiration; the bedside FRC is the lung's. */
function updateVolumes(rs: RespState): void {
  const ls = rs.lung;
  const aerCond = ls.lp.side.map((sp) => Math.max(0.02, 1 - sp.atel - sp.consol));
  const a = actualVolumes(rs.brk.pred, ls.lp, rs.lungSpecs, aerCond);
  const frc = aeratedFrc(ls, frcNow(rs));
  rs.volumes = { ...a, frc, cc: rs.brk.ageY >= 18 ? closingCapacity(rs.brk.pred, rs.brk.ageY, FRC_AWAKE_ML_KG * rs.pat.ibwKg) : null, pattern: pattern(a, rs.brk.pred), pred: rs.brk.pred };
}

function emitSecond(rs: RespState, t: number): void {
  const v: Partial<Record<NumericId, Measured>> = { spo2: spo2Measured(rs.num.spo2, t) };
  if (rs.co2Sensor === 'on') Object.assign(v, co2Numerics(rs.num.co2, t, rs.shownCo2));
  else if (rs.co2Sensor === 'warmup' || rs.co2Sensor === 'occluded') for (const k of ['etco2', 'imco2', 'awrr'] as const) v[k] = { value: null, flag: 'invalid', at: t };
  v.rr = impRr(rs.num.imp, t);
  v.tempCore = tempMeasured(rs.num.temp.t1, rs.tempSensor === 'on', t);
  v.tempSite = tempMeasured(rs.num.temp.t2, rs.tempSensor === 'on', t);
  rs.out.push({ type: 'measurement', t, values: v });
}

function alarm(rs: RespState, t: number, id: string, raised: boolean, text: string): void {
  rs.out.push({ type: 'alarm', t, id, priority: 'high', category: 'physiological', state: raised ? 'raised' : 'cleared', text });
}

// --- the tick ----------------------------------------------------------------------------------------------
/**
 * Generate 62.5 Hz samples up to and including absolute index `mEnd` (= floor(ECG end index / 8)); sample m
 * belongs to time m/62.5 (brief §3.3). `write(ch, m, v)` stores a displayed sample.
 */
export function advanceResp(rs: RespState, ctx: RespCtx, mEnd: number, write: (ch: RespChannel, m: number, v: number) => void): void {
  if (mEnd < rs.m) return;
  for (const r of ctx.rhythm.records) {
    if (r.type === 'beat' && r.seq > rs.beatSeq) {
      rs.beatSeq = r.seq;
      if (r.mech.perfused) rs.beats.push(r.t);
    }
  }
  const tEnd = mEnd / RESP_RATE;
  planCycles(rs.driver, driverCtx(rs, ctx.l1, tEnd, ctx.neuro), tEnd + PLAN_AHEAD_S); // Neuro
  // Stamp newly planned cycles with the lung's expiratory τ and capnogram terms
  const ct = capnoTerms(rs.lung);
  for (const c of rs.driver.cycles) {
    if (c.tauE !== undefined) continue;
    c.tauE = Math.max(0.1, rs.lung.tauBar);
    c.lungTauII = ct.tauII;
    c.lungRiseIII = ct.riseIII;
  }
  const h = ctx.hemo;
  const cap: CapnoCtx = { etco2: rs.etco2, beats: rs.beats, cpr: { active: h.cpr.active, rate: h.cpr.rate, quality: h.cpr.quality, anchor: h.cpr.nextT } };
  const air = (t: number) => airwayCo2(rs.driver, t, cap);
  for (; rs.m <= mEnd; rs.m++) {
    const m = rs.m;
    const t = m / RESP_RATE;
    const ld = lungDrive(rs, t); // Mechanics at 250 Hz (4 sub-steps per sample)
    const inspNext = ld.mode === 'flow' && ld.x > 0; // Breath boundaries for the per-breath measurement
    if (!rs.lung.inInsp && inspNext) breathStart(rs, t);
    else if (rs.lung.inInsp && !inspNext) breathEnd(rs, ctx.l1, t);
    const wasInsp = rs.lung.inInsp;
    const pb = buckPressure(rs, t);
    if (pb > 0) rs.lung.mech.pMus = pb;
    else delete rs.lung.mech.pMus;
    lungMechStep(rs.lung, ld.mode, ld.x, DT, ld.pLimit); // The VCV pressure limit
    if (rs.lung.inInsp && rs.lung.mech.paw > rs.brk.pk) rs.brk.pk = rs.lung.mech.paw; // Ppeak of the breath
    if (wasInsp && !rs.lung.inInsp && rs.driver.source === 'ventilator') {
      // A pressure-limited breath delivers less than the set VT — the cycle carries what the lung received
      const c = cycleAt(rs.driver, t);
      const delivered = rs.lung.tidal.reduce((a, b) => a + b, 0);
      if (c && c.mech && c.exch && delivered < c.vt - 5) {
        c.vt = delivered;
        const f = alveolarFraction(delivered, physicalDeadSpace(rs.pat, true)); // The capnogram follows the delivered breath (a ventilator breath: artificial airway)
        if (f < 1) c.alvFrac = f;
      }
    }
    ptxStep(rs, DT); // The one-way valve fills the pleural space breath by breath
    while (rs.gasK * GAS_DT_S <= t + 1e-9) {
      gasStep(rs, ctx, rs.gasK * GAS_DT_S);
      rs.gasK++;
      cap.etco2 = rs.etco2;
    }
    if (rs.co2Sensor !== 'off') {
      if (rs.co2Sensor === 'warmup' && t >= rs.warmUntil) rs.co2Sensor = 'on';
      const y = sampleCo2(rs.sampler, t, air);
      const shown = rs.co2Sensor === 'on' ? y : 0;
      rs.shownCo2 = shown;
      write('co2', m, shown);
      if (rs.co2Sensor === 'on') {
        const ev = co2NumStep(rs.num.co2, t, shown, DT);
        if (ev === 'apnoea') alarm(rs, t, 'apnoea-co2', true, 'APNEA');
        else if (ev === 'resumed') alarm(rs, t, 'apnoea-co2', false, 'APNEA');
      }
    }
    const imp = impedanceSample(chestVolume(rs.driver, t), t, rs.beats);
    write('resp', m, imp);
    const ie = impStep(rs.num.imp, t, imp, DT, rs.beats); // Cardiac-overlay rejection
    if (ie === 'apnoea') alarm(rs, t, 'apnoea-resp', true, 'APNEA (RESP)');
    else if (ie === 'resumed') alarm(rs, t, 'apnoea-resp', false, 'APNEA (RESP)');
  }
  for (const c of rs.driver.cycles) {
    const ext = rs.driver.source === 'external' && rs.driver.ext?.inInsp && c === rs.driver.cycles[rs.driver.cycles.length - 1];
    // A breath is reported once it HAS BEEN DELIVERED, with the volume the lung received (`vtDelMl`, stamped at
    // end-inspiration) — a pressure-limited VCV breath set to 500 mL delivers 242–303 (research/24).
    if (!c.emitted && c.exch && c.vt > 0 && !ext && c.vtDelMl !== undefined) {
      c.emitted = true;
      rs.out.push({ type: 'breath', t: c.t0, seq: c.seq, kind: c.kind, tiS: c.ti, teS: c.te, vtMl: Math.round(c.vtDelMl), etco2True: Math.round(rs.etco2 * 10) / 10 });
    }
  }
  pruneCycles(rs.driver, tEnd - KEEP_S);
  while (rs.beats.length > 0 && (rs.beats[0] as number) < tEnd - 5) rs.beats.shift();
}

// --- commands ----------------------------------------------------------------------------------------------
const num = (name: string, v: number | undefined, lo: number, hi: number) =>
  v === undefined || (Number.isFinite(v) && v >= lo && v <= hi) ? undefined : `${name} must be a finite number in ${lo}–${hi}`;

/** Validation hook. Returns a rejection reason, undefined (accepted) or null (not a respiratory command). */
export function validateRespCommand(cmd: Command): string | undefined | null {
  if (cmd.type === 'externalDrive') {
    const f = cmd.frame;
    if (cmd.source !== 'ventilator') return "externalDrive source must be 'ventilator'";
    if (!f) return 'externalDrive needs a frame';
    return num('pawCmH2O', f.pawCmH2O, -30, 150) ?? num('flowLps', f.flowLps, -20, 20) ?? num('volumeMl', f.volumeMl, -100, 4000)
      ?? num('fio2', f.fio2, 0.21, 1) ?? num('peepCmH2O', f.peepCmH2O, 0, 40) ?? num('palvCmH2O', (f as VentFrameExt).palvCmH2O, -30, 150)
      // Every frame field the lung reads is required (a paw/flow-only frame left volume, FiO2 and PEEP undefined, VT
      // went NaN and the next beat time threw)
      ?? (f.pawCmH2O === undefined || f.flowLps === undefined || f.volumeMl === undefined || f.fio2 === undefined || f.peepCmH2O === undefined ? 'frame needs pawCmH2O, flowLps, volumeMl, fio2 and peepCmH2O' : undefined);
  }
  if (cmd.type === 'attachSensor') {
    if (cmd.sensor === 'co2') {
      if (!['off', 'warmup', 'on', 'occluded'].includes(cmd.state)) return 'co2 state must be off, warmup, on or occluded';
      return cmd.sampling === undefined || cmd.sampling === 'sidestream' || cmd.sampling === 'mainstream' ? undefined : 'sampling must be sidestream or mainstream';
    }
    if (cmd.sensor === 'temp') {
      if (!['off', 'on'].includes(cmd.state)) return 'temp state must be off or on';
      return cmd.site === undefined || (TEMP_SITES as readonly string[]).includes(cmd.site) ? undefined : `temp site must be one of ${TEMP_SITES.join(', ')}`;
    }
    return null;
  }
  if (cmd.type !== 'applyEvent') return null;
  const ev = cmd.event as RespClinicalEvent | LungClinicalEvent | { kind: string };
  switch (ev.kind) {
    case 'airway': {
      const a = ev as Extract<RespClinicalEvent, { kind: 'airway' }>;
      return (AIRWAYS as readonly string[]).includes(a.state) ? num('severity', a.severity, 0, a.state === 'bronchospasm' ? 1.25 : 1) : `airway state must be one of ${AIRWAYS.join(', ')}`; // Bronchospasm 1–1.25 = near-fatal extreme
    }
    case 'ventilation': {
      const v = ev as Extract<RespClinicalEvent, { kind: 'ventilation' }>;
      if (!(SOURCES as readonly string[]).includes(v.source)) return `source must be one of ${SOURCES.join(', ')}`;
      return num('rr', v.rr, 1, 80) ?? num('vtMl', v.vtMl, 10, 1500) ?? num('fio2', v.fio2, 0.21, 1) ?? num('peep', v.peep, 0, 30)
        ?? num('ie', v.ie, 0.5, 4) ?? num('fico2', v.fico2, 0, 30) ?? num('effort', v.effort, 0, 1) ?? num('pmax', v.pmax, 10, 80);
    }
    case 'preoxygenate': {
      const p = ev as Extract<RespClinicalEvent, { kind: 'preoxygenate' }>;
      return num('fio2', p.fio2, 0.21, 1) ?? num('durationS', p.durationS, 1, 3600) ?? (p.fio2 === undefined || p.durationS === undefined ? 'preoxygenate needs fio2 and durationS' : undefined);
    }
    case 'condition': {
      const c = ev as { id: string; severity: number };
      if (['tamponade', 'pe', 'tensionPtx', 'rvInfarct'].includes(c.id)) return null; // Circulation conditions
      return c.id === 'mh' ? num('severity', c.severity, 0, 1) ?? (c.severity === undefined ? 'severity is required' : undefined) : `condition ${c.id} arrives in Stage 7`;
    }
    case 'thermal': {
      const th = ev as Extract<RespClinicalEvent, { kind: 'thermal' }>;
      if (th.anaesthesia !== undefined && !['none', 'general', 'neuraxial'].includes(th.anaesthesia)) return 'anaesthesia must be none, general or neuraxial';
      if (th.warmAirC !== undefined && ![32, 38, 43].includes(th.warmAirC)) return 'warmAirC must be 32, 38 or 43';
      return num('ambientC', th.ambientC, 5, 40);
    }
    case 'lungCondition': {
      const c = ev as Extract<LungClinicalEvent, { kind: 'lungCondition' }>;
      if (!(LUNG_CONDITION_IDS as readonly string[]).includes(c.id)) return `lungCondition id must be one of ${LUNG_CONDITION_IDS.join(', ')}`;
      if (c.side !== undefined && c.side !== 'L' && c.side !== 'R') return "side must be 'L' or 'R'";
      return num('severity', c.severity, 0, 1) ?? num('recruitFrac', c.recruitFrac, 0, 1) ?? num('ageMin', c.ageMin, 0, 1440)
        ?? (c.severity === undefined ? 'severity is required' : undefined);
    }
    case 'mainstem': {
      const m = ev as Extract<LungClinicalEvent, { kind: 'mainstem' }>;
      return ['both', 'left', 'right'].includes(m.ventilated) ? undefined : "ventilated must be 'both', 'left' or 'right'";
    }
    case 'recruit': {
      const p = ev as Extract<LungClinicalEvent, { kind: 'recruit' }>;
      return num('pressureCmH2O', p.pressureCmH2O, 20, 60) ?? num('durationS', p.durationS, 1, 60) ?? (p.pressureCmH2O === undefined || p.durationS === undefined ? 'recruit needs pressureCmH2O and durationS' : undefined);
    }
    default:
      return null;
  }
}

/** Apply hook. Returns true when the command was a respiratory-signal command. */
export function applyRespCommand(rs: RespState, l1: L1State, cmd: Command, t: number): boolean {
  const d = rs.driver;
  const withdraw = (seqs: number[]) => {
    if (seqs.length) rs.out = rs.out.filter((e) => !(e.type === 'breath' && seqs.includes(e.seq)));
  };
  if (cmd.type === 'externalDrive') {
    const wasExt = d.source === 'external';
    if (!wasExt) withdraw(d.cycles.filter((c) => c.t0 > t).map((c) => c.seq));
    onVentFrame(d, cmd.frame, t);
    return true;
  }
  if (cmd.type === 'attachSensor') {
    if (cmd.sensor === 'co2') {
      if (cmd.sampling) rs.sampler.mode = cmd.sampling;
      rs.co2Sensor = cmd.state === 'warmup' ? 'warmup' : cmd.state === 'on' ? 'on' : cmd.state === 'occluded' ? 'occluded' : 'off';
      rs.warmUntil = t + CO2_WARMUP_S;
      return true;
    }
    if (cmd.sensor === 'temp') {
      rs.tempSensor = cmd.state === 'on' ? 'on' : 'off';
      if (cmd.site) rs.tempSite = cmd.site as TempSite;
      return true;
    }
    return false;
  }
  if (cmd.type !== 'applyEvent') return false;
  const ev = cmd.event as RespClinicalEvent | LungClinicalEvent | { kind: string };
  switch (ev.kind) {
    case 'airway': {
      const a = ev as Extract<RespClinicalEvent, { kind: 'airway' }>;
      if (a.state === 'oesophageal' && d.airway !== 'oesophageal') d.gastricN = 0;
      const prevAirway = d.airway;
      d.airway = a.state;
      d.severity = a.severity ?? 1;
      // Endobronchial is a mainstem block (its shunt/compliance emerge)
      rs.mainstemCmd = a.state === 'endobronchial' ? 'right' : rs.mainstemCmd === 'right' ? null : rs.mainstemCmd;
      // ONE bronchospasm — the airway event is an alias of lungCondition bronchospasm (the same resistance, dead space,
      // V/Q and capnogram whichever command started it; 1–1.25 stays the near-fatal capnogram extreme)
      const rest = rs.lungSpecs.filter((s) => !(s.id === 'bronchospasm' && s.side === undefined));
      if (a.state === 'bronchospasm') rs.lungSpecs = [...rest, { id: 'bronchospasm', severity: d.severity }];
      else if (prevAirway === 'bronchospasm') rs.lungSpecs = rest;
      applyLungSpecs(rs);
      withdraw(replan(d, t, LOSS.includes(a.state), false));
      return true;
    }
    case 'ventilation': {
      const v = ev as Extract<RespClinicalEvent, { kind: 'ventilation' }>;
      d.source = v.source;
      d.ext = null;
      if (v.source === 'bvm') d.vent = { rr: v.rr ?? 10, vt: v.vtMl ?? 500, peep: 0, ie: v.ie ?? 2 };
      if (v.source === 'ventilator') {
        // Read the kept pressure limit BEFORE the settings object is replaced (an RR edit dropped Pmax 25 → 40)
        const pmax = v.pmax ?? d.vent.pmax; // Absent = VCV_PMAX_DEFAULT; kept absent in snapshots that never set it
        d.vent = { rr: v.rr ?? d.vent.rr, vt: v.vtMl ?? d.vent.vt, peep: v.peep ?? d.vent.peep, ie: v.ie ?? d.vent.ie };
        if (pmax !== undefined) d.vent.pmax = pmax;
      }
      if (v.source === 'spontaneous') {
        if (v.rr !== undefined) setL1Target(l1, 'rr', t, v.rr);
        if (v.vtMl !== undefined) setL1Target(l1, 'vt', t, v.vtMl);
      }
      if (v.fio2 !== undefined) setL1Target(l1, 'fio2', t, v.fio2);
      if (v.fico2 !== undefined) d.fico2 = v.fico2;
      if (v.effort !== undefined) d.cleft = v.effort;
      withdraw(replan(d, t, true, true));
      if (d.airway === 'obstructed') applyLungSpecs(rs); // A kink belongs to the ventilator's tube
      return true;
    }
    case 'preoxygenate': {
      const p = ev as Extract<RespClinicalEvent, { kind: 'preoxygenate' }>;
      d.preox = { fio2: p.fio2, until: t + p.durationS };
      withdraw(replan(d, t, false, false));
      return true;
    }
    case 'condition': {
      if ((ev as { id: string }).id !== 'mh') return false; // Circulation conditions
      const c = ev as { severity: number };
      rs.temp.mh = c.severity > 0 ? { severity: c.severity, t0: t } : null;
      return true;
    }
    case 'thermal': {
      const th = ev as Extract<RespClinicalEvent, { kind: 'thermal' }>;
      if (th.anaesthesia !== undefined) rs.temp.anaesthesia = th.anaesthesia;
      if (th.warming !== undefined) rs.temp.warming = th.warming;
      if (th.warmAirC !== undefined) rs.temp.warmAirC = th.warmAirC;
      if (th.ambientC !== undefined) rs.temp.ta = th.ambientC;
      return true;
    }
    case 'lungCondition': {
      const c = ev as Extract<LungClinicalEvent, { kind: 'lungCondition' }>;
      const same = (s: { id: string; side?: string }) => s.id === c.id && (s.side ?? null) === (c.side ?? null);
      const next = { id: c.id, severity: c.severity, ...(c.side ? { side: c.side } : {}), ...(c.recruitFrac !== undefined ? { recruitFrac: c.recruitFrac } : {}), ...(c.ageMin !== undefined ? { ageMin: c.ageMin } : {}) };
      const i = rs.lungSpecs.findIndex(same);
      if (c.severity <= 0) rs.lungSpecs = rs.lungSpecs.filter((s) => !same(s));
      else if (i >= 0) rs.lungSpecs[i] = next;
      else rs.lungSpecs.push(next);
      // A re-sent condition keeps its onset (the same attack) unless the event states its age
      if (c.ageMin !== undefined && rs.sm) delete rs.sm.onsetS[c.id];
      syncSmOnset(rs, t);
      if (rs.sm) rs.sm.atS = t;
      applyLungSpecs(rs);
      return true;
    }
    case 'mainstem': {
      const m = ev as Extract<LungClinicalEvent, { kind: 'mainstem' }>;
      rs.mainstemCmd = m.ventilated === 'both' ? null : m.ventilated;
      applyLungSpecs(rs);
      return true;
    }
    case 'recruit': {
      const p = ev as Extract<LungClinicalEvent, { kind: 'recruit' }>;
      rs.recruit = { p: p.pressureCmH2O, until: t + p.durationS };
      return true;
    }
    default:
      return false;
  }
}

