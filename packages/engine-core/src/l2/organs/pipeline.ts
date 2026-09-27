// Stage 7d organ pipeline (plan "Architecture"): one plain-data OrgansState in the engine's PipelineState, advanced
// by the engine right BEFORE the haemodynamics in every pass (after 7g's PK, Stage 3/7b's gas and 7c/7e's inserts),
// so the Cushing surge written into L1 `coupled` reaches the same pass's beats after Stage 3's gas step has refreshed
// its own couplings. 7d owns no drug ids: once per pass it OBSERVES 7g's `bus.doses` (mannitol, hypertonic saline).
//   10 Hz: stepBrain → effects (effects.ts) · 125 Hz: `icp` samples (wave.ts) · 1 Hz: kidney, liver, 7c seams,
//   published `kidney.gfrRel` (7g) and `liver.glucoseF` (7e), `organs` event and measurement {icpMean, cpp, pbto2, uop}.
import { l1Target, type L1State } from '../../l1/state.ts';
import type { Command, EngineEvent, Measured, PatientProfile } from '../../types.ts';
import type { OrgansEvent } from '../../types-organs.ts';
import { caO2, drugsOf, NO_ANAESTHESIA, NO_DRUGS, type BrainDrugs } from '../brain/flow.ts';
import { brainParams, createBrain, giveOsmotherapy, stepBrain, type BrainInputs, type BrainState } from '../brain/model.ts';
import { BRAIN_DT_S, ICP_THRESHOLD, MANNITOL_MOSM_PER_G, NACL_MOSM_PER_G } from '../brain/params.ts';
import { icpSample } from '../brain/wave.ts';
import type { HemoState, RhythmView } from '../hemo/pipeline.ts';
import { createLiver, lacProdBasal, stepLiver, type LiverInputs, type LiverState } from '../liver/liver.ts';
import { createRenal, giveMannitolRenal, stepRenal, uopOver, type RenalInputs, type RenalState } from '../renal/model.ts';
import { OLIGURIA_ML_KG_H, RENAL_REF_CO_L_KG, UOP0_ML_KG_H } from '../renal/params.ts';
import { respBreathU, type RespState } from '../resp/pipeline.ts';
import { applyOrganEffects, createEffects, type EffectsState } from './effects.ts';
import { ALPHA_E_FULL, alphaExcess, bloodCore, readDrugView, readOrganView, type OrganDose, type OrganSources, type OrganView, type RenalSeam } from './inputs.ts';

export const ICP_RATE = 125;
export const ORGAN_CHANNELS = ['icp'] as const;
export type OrganChannel = (typeof ORGAN_CHANNELS)[number];
const ICP_MEAN_WINDOW_S = 4; // displayed ICP mean over 4 s [ENG]
const PBTO2_PROBE_TAU_S = 60; // Clark-type probe response [ENG]
/** MAP and CVP the organs see: a 4 s mean [ENG]. 7a's `hemo.pv` is the instantaneous RA pressure (0–9 mmHg within a
 *  cycle in the prototype) and `lastSite.map` one beat, so the 1 Hz kidney sampled noise (GFR 49–187 in MODELED HFrEF). */
const ORGAN_LP_TAU_S = 4;
/** Decision 6: Stage 3 `thermal` general anaesthesia with no hypnotic on 7g's bus ≈ propofol E 0.6 (CMRO2 ×0.7). */
const GA_FALLBACK: BrainDrugs = drugsOf({ ...NO_ANAESTHESIA, propofolE: 0.6 });
const URINE_NA = 100; // mmol/L [ENG] — 7c seam only
const URINE_K = 50; // mmol/L [ENG]
const FUROSEMIDE_NA_BOOST = 0.5; // urine Na × (1 + 0.5·E) [ENG]
const GLUCONATE_EXCRETED = 0.9; // fraction of the filtered gluconate excreted (renal clearance ≈ 0.9·GFR) [ENG]
const MG_PER_G: Record<string, number> = { mg: 1000, g: 1 };
const OWN_CONDITIONS: readonly string[] = ['tbi', 'hepaticFailure', 'aki'];
const OWN_SENSORS: readonly string[] = ['icp', 'pbto2', 'urometer'];

export interface OrgansState {
  k: number; // next 10 Hz step (time k·0.1 s)
  m: number; // next 125 Hz icp sample index
  weightKg: number;
  conds: { id: string; severity?: number }[];
  co0: number;
  brain: BrainState;
  renal: RenalState;
  liver: LiverState; // publishes `liver.glucoseF` (7e reads `organs.liver.glucoseF`)
  kidney: { gfrRel: number }; // PUBLISHED key (7g's pkCtx reads `organs.kidney.gfrRel`); the model is `renal`
  iap: number;
  lp: { map: number; cvp: number }; // ORGAN_LP_TAU_S means
  sensors: { icp: 'on' | 'off'; pbto2: 'on' | 'off'; urometer: 'on' | 'off' };
  beats: number[]; // perfused beat times (s), last 4
  num: { sec: number[]; acc: number; accN: number; pbto2: number };
  view: OrganView | null;
  fx: EffectsState;
  out: EngineEvent[];
}
/** OrganSources (l1, hemo, resp, and the duck-typed blood/pk/neuro/endo) plus the rhythm and the HR hooks. */
export interface OrgansCtx extends OrganSources {
  rhythm: RhythmView;
  hrNow: (t: number) => number;
  setHr: (bpm: number, t: number) => void;
}

/** Brain drug input: 7f/7g when they carry an effect, else the Stage 3 `thermal` GA fallback (decision 6). */
function brainDrugs(v: OrganView): BrainDrugs {
  const d = v.drugs;
  if (d.cmro2Mult !== 1 || d.cbfVaso !== 1) return { cmro2Mult: d.cmro2Mult, cbfVaso: d.cbfVaso };
  return v.anaesthesia === 'general' ? GA_FALLBACK : NO_DRUGS;
}
const brainIn = (v: OrganView): BrainInputs => ({
  map: v.map, cvp: v.cvp, paco2: v.paco2, pao2: v.pao2, sao2: v.sao2, hb: v.hb, tempC: v.tempC, drugs: brainDrugs(v),
});
const renalIn = (os: OrgansState, v: OrganView): RenalInputs => ({
  map: v.map, cvp: v.cvp, iap: os.iap, coLpm: v.coLpm, bvRel: v.bvRel, albuminGL: v.albuminGL, anaesthesia: v.anaesthesia,
  pawExcessCmH2O: v.pawExcessCmH2O, alphaExcess: alphaExcess(v), sepsis: v.drugs.sepsis,
  ...(v.drugs.furoCe !== undefined ? { furoCe: v.drugs.furoCe } : {}),
});
function liverIn(os: OrgansState, v: OrganView): LiverInputs {
  const do2 = (v.coLpm * 10 * caO2(v.hb, v.sao2, v.pao2)) / os.weightKg; // mL O2/kg/min (CaO2 mL/dL × 10 dL/L)
  return {
    coLpm: v.coLpm, co0Lpm: os.co0, bvRel: v.bvRel, alphaE: Math.min(1, v.drugs.alphaNe / ALPHA_E_FULL), volatileMac: v.drugs.volatileMac,
    tempC: v.tempC, gfrRel: os.kidney.gfrRel, do2MlKgMin: do2, ...(v.hbfRel !== null ? { hbfRel: v.hbfRel } : {}),
  };
}

/** Nominal t = 0 view from the L1 targets (replaced by rebaselineOrgans once the pipelines exist). */
function nominalView(l1: L1State, w: number): OrganView {
  const sbp = l1Target(l1, 'sbp', 0);
  const dbp = l1Target(l1, 'dbp', 0);
  return {
    map: dbp + 0.4 * (sbp - dbp), pp: sbp - dbp, cvp: l1Target(l1, 'cvp', 0), coLpm: (5.6 * w) / 70, paco2: 40, pao2: 95, sao2: 0.97,
    tempC: l1Target(l1, 'tempCore', 0), hb: 14, albuminGL: 42, bvRel: 1, hbfRel: null, lactate: null, gluconate: 0, anaesthesia: 'none',
    pawExcessCmH2O: 0, drugs: readDrugView({}), circ: false, blood: false,
  };
}

function build(os: OrgansState, v: OrganView): void {
  const sev = (id: string) => os.conds.find((c) => c.id === id)?.severity ?? (os.conds.some((c) => c.id === id) ? 1 : 0);
  os.co0 = Math.max(RENAL_REF_CO_L_KG * os.weightKg, v.coLpm); // healthy reference: a low-output start is not "normal"
  os.kidney = { gfrRel: 1 };
  os.brain = createBrain(brainParams(os.conds), brainIn(v));
  os.renal = createRenal(renalIn(os, v), os.weightKg, sev('aki'));
  os.liver = createLiver(os.weightKg, liverIn(os, v), sev('hepaticFailure'));
}

export function createOrgansState(profile: PatientProfile | undefined, l1: L1State): OrgansState {
  const w = profile?.weightKg ?? 70;
  const v = nominalView(l1, w);
  const os = {
    k: 0, m: 0, weightKg: w, conds: (profile?.conditions ?? []).map((c) => ({ id: c.id, severity: c.severity })), co0: v.coLpm,
    kidney: { gfrRel: 1 }, iap: 0, lp: { map: v.map, cvp: v.cvp },
    sensors: { icp: 'off', pbto2: 'off', urometer: 'off' }, beats: [], num: { sec: [], acc: 0, accN: 0, pbto2: 25 }, view: null,
    fx: createEffects(), out: [],
  } as unknown as OrgansState; // brain/renal/liver are created by build() on the next line
  build(os, v);
  os.num.pbto2 = os.brain.pbto2;
  return os;
}

/** Recalibrate on the running pipelines' t = 0 truths (the engine calls this once, right after creating its state). */
export function rebaselineOrgans(os: OrgansState, ctx: OrganSources): void {
  const v = readOrganView(ctx, 0);
  os.lp = { map: v.map, cvp: v.cvp };
  os.view = v;
  build(os, v);
  os.num.pbto2 = os.brain.pbto2;
}

export function organChannelActive(os: OrgansState, ch: OrganChannel): boolean {
  return ch === 'icp' && os.sensors.icp === 'on';
}

function collectBeats(os: OrgansState, rhythm: RhythmView, tEnd: number): void {
  const last = os.beats.length > 0 ? (os.beats[os.beats.length - 1] as number) : -1;
  const fresh: number[] = [];
  for (const r of rhythm.records) if (r.type === 'beat' && r.mech.perfused && r.t > last && r.t <= tEnd) fresh.push(r.t);
  fresh.sort((a, b) => a - b);
  os.beats.push(...fresh);
  if (os.beats.length > 4) os.beats.splice(0, os.beats.length - 4);
}

function icpAt(os: OrgansState, rs: RespState, ts: number): number {
  let tb = -1;
  let prev = -1;
  for (let i = os.beats.length - 1; i >= 0; i--) {
    const x = os.beats[i] as number;
    if (x <= ts) {
      tb = x;
      prev = i > 0 ? (os.beats[i - 1] as number) : x - 0.8;
      break;
    }
  }
  const since = tb < 0 ? 10 : ts - tb;
  const rr = tb < 0 ? 0.8 : Math.max(0.3, Math.min(2, tb - prev));
  const pp = since < 2 ? (os.view?.pp ?? 40) : 0; // no beat for 2 s → no arterial pulse in the ICP
  return icpSample(os.brain.icp, os.brain.elast, pp, since, rr, respBreathU(rs, ts));
}

/** 7c's renal seam (R51 addendum 14): the water (mL/h) and solutes (mmol/h) the urine takes out of 7c's body water. Na,
 *  K, Cl from fixed urine concentrations [ENG]; gluconate filtered at GFR × 7c's plasma gluconate, 90 % excreted [ENG].
 *  §10 of the 7d gate (on the real 7c): 7c's water and electrolyte balance has no intake term — its own fallback
 *  eliminates only blood volume ABOVE BV0, i.e. it assumes the basal urine is replaced by a basal intake. So the seam
 *  carries the urine ABOVE that basal turnover (the reference flow UOP0 = 1 mL/kg/h at the kidney's urine composition);
 *  below it the balance is neutral, as in 7c's fallback (no retention term). Reporting the whole urine drained a resting
 *  patient by 1 mL/kg/h with no intake: blood volume −2.8 % in 6 h at rest, lactate drifting +0.09 (soak band ±0.02). */
function renalSeam(s: RenalState, gluconate: number): RenalSeam {
  const lH = Math.max(0, s.uopMlMin * 60 - UOP0_ML_KG_H * s.p.weightKg) / 1000;
  const na = lH * URINE_NA * (1 + FUROSEMIDE_NA_BOOST * s.furoE);
  const k = lH * URINE_K;
  return { uopAboveBasalMlH: lH * 1000, excretion: { k, na, cl: 0.9 * (na + k), gluconate: ((s.gfr * 60) / 1000) * gluconate * GLUCONATE_EXCRETED } };
}

/** 7g's accepted boluses (R51 §3: 7d OBSERVES, never consumes): mannitol → brain water and osmotic diuresis; hypertonic
 *  saline → brain water (its sodium load is 7c's, from the same log entry). Other agents are not ours. */
function observeDoses(os: OrgansState, doses: readonly OrganDose[]): void {
  for (const d of doses) {
    if (d.agent === 'mannitol') {
      const g = d.amount / (MG_PER_G[d.amountUnit] ?? 1000);
      giveOsmotherapy(os.brain, 'mannitol', g * MANNITOL_MOSM_PER_G);
      giveMannitolRenal(os.renal, g);
    } else if (d.agent === 'hypertonicSaline' && d.amountUnit === 'mL') {
      giveOsmotherapy(os.brain, 'hypertonicSaline', ((d.amount * (d.concentrationPct ?? 3)) / 100) * NACL_MOSM_PER_G);
    }
  }
}

const meas = (value: number | null, t: number, flag: Measured['flag'] = 'valid'): Measured =>
  value === null ? { value: null, flag: 'invalid', at: t } : { value: Math.round(value * 10) / 10, flag, at: t };

function oneHz(os: OrgansState, ctx: OrgansCtx, v: OrganView, t: number): void {
  stepRenal(os.renal, renalIn(os, v), 1);
  os.kidney.gfrRel = os.renal.gfr / Math.max(1, os.renal.p.gfrSet);
  const core = bloodCore(ctx.blood);
  stepLiver(os.liver, liverIn(os, v), 1, core ? lacProdBasal() : undefined); // with 7c its pool is authoritative (decision 12)
  if (core) {
    core.liver = os.liver.liverFn * os.liver.tempF; // function only: 7c multiplies its own hbfRel (addendum 14)
    core.renal = renalSeam(os.renal, v.gluconate);
  }
  if (os.num.accN > 0) {
    os.num.sec.push(os.num.acc / os.num.accN);
    if (os.num.sec.length > ICP_MEAN_WINDOW_S) os.num.sec.shift();
  }
  os.num.acc = 0;
  os.num.accN = 0;
  os.num.pbto2 += (os.brain.pbto2 - os.num.pbto2) * (1 - Math.exp(-1 / PBTO2_PROBE_TAU_S));
  const icpOn = os.sensors.icp === 'on' && os.num.sec.length > 0;
  const icpMean = icpOn ? os.num.sec.reduce((a, x) => a + x, 0) / os.num.sec.length : null;
  const abpOn = ctx.hemo.lines.abp.sensor !== 'none';
  const uopOn = os.sensors.urometer === 'on';
  os.out.push({
    type: 'measurement', t,
    values: {
      icpMean: meas(icpMean, t),
      cpp: meas(icpMean !== null && abpOn ? v.map - icpMean : null, t),
      pbto2: meas(os.sensors.pbto2 === 'on' ? os.num.pbto2 : null, t),
      uop: meas(uopOn ? uopOver(os.renal, 60) * os.weightKg : null, t, os.renal.bins.length < 1 ? 'questionable' : 'valid'),
    },
  });
  const b = os.brain;
  const ev: OrgansEvent = {
    type: 'organs', t,
    brain: {
      icp: b.icp, cpp: b.cpp, mapHead: b.mapHead, cbf: b.cbfRel, cbvMl: b.cbv, cmro2: b.cmro2Rel, pbto2: b.pbto2, sjvo2: b.sjvo2, elastance: b.elast, paco2: v.paco2,
      state: b.herniated ? 'herniated' : b.cush.active ? 'cushing' : b.icp > ICP_THRESHOLD ? 'raisedIcp' : 'normal', cushing: b.cush.drive,
    },
    kidney: {
      rbf: os.renal.rbf, gfr: os.renal.gfr, gfrRel: os.kidney.gfrRel, uopMlKgH: (os.renal.uopMlMin * 60) / os.weightKg, uop1hMlKgH: uopOver(os.renal, 60),
      cumMl: os.renal.cumMl, bagMl: os.renal.bagMl, bladderMl: os.renal.bladderMl,
      oliguria: uopOver(os.renal, 60 / os.renal.timeScale) < OLIGURIA_ML_KG_H, akiStage: os.renal.akiStage,
    },
    liver: {
      hbfRel: os.liver.hbfRel, kLacPerH: os.liver.kLacPerH, lactate: v.lactate ?? os.liver.lactate, tempF: os.liver.tempF,
      liverFn: os.liver.liverFn, inr: os.liver.inr,
    },
  };
  os.out.push(ev);
}

export function advanceOrgans(os: OrgansState, ctx: OrgansCtx, mEnd: number, write: (ch: OrganChannel, m: number, v: number) => void): void {
  const tEnd = mEnd / ICP_RATE;
  observeDoses(os, readDrugView(ctx).doses); // once per engine pass: 7g lists each accepted bolus for exactly one pass
  while (os.k * BRAIN_DT_S <= tEnd + 1e-9) {
    const t = os.k * BRAIN_DT_S;
    if (os.k > 0) {
      const v = readOrganView(ctx, t);
      const k = 1 - Math.exp(-BRAIN_DT_S / ORGAN_LP_TAU_S);
      os.lp.map += (v.map - os.lp.map) * k;
      os.lp.cvp += (v.cvp - os.lp.cvp) * k;
      v.map = os.lp.map;
      v.cvp = os.lp.cvp;
      os.view = v;
      stepBrain(os.brain, brainIn(v), BRAIN_DT_S);
      applyOrganEffects(os.fx, os.brain, ctx, t);
      if (os.k % 10 === 0) oneHz(os, ctx, v, t);
    }
    os.k++;
  }
  // FU-2 item 6 (the MANUAL "tracker ringing" at HR 48): Stage 3's gas step deletes L1 `coupled` sbp/dbp every 100 ms
  // (its retired Paw coupling) and its 62.5 Hz grid can run a gas step one engine pass before the brain's 10 Hz step
  // at the same time, so the haemodynamics saw the surge vanish for part of every 100 ms and 7a's per-beat tracker
  // chased 110/72 ↔ 162/106. Re-assert the (idempotent) effects on every pass, after Stage 3 and before the haemodynamics.
  if (os.k > 1) applyOrganEffects(os.fx, os.brain, ctx, tEnd);
  collectBeats(os, ctx.rhythm, tEnd);
  for (; os.m <= mEnd; os.m++) {
    const v = icpAt(os, ctx.resp, os.m / ICP_RATE);
    os.num.acc += v;
    os.num.accN++;
    if (os.sensors.icp === 'on') write('icp', os.m, v);
  }
}

// --- commands -------------------------------------------------------------------------------------------------
const inRange = (name: string, v: unknown, lo: number, hi: number): string | undefined =>
  v === undefined || (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi) ? undefined : `${name} must be ${lo}–${hi}`;

/** undefined = accepted, string = rejected, null = not a Stage 7d command (plan decision 16). */
export function validateOrgansCommand(cmd: Command): string | undefined | null {
  if (cmd.type === 'attachSensor') {
    if (!OWN_SENSORS.includes(cmd.sensor)) return null;
    return cmd.state === 'on' || cmd.state === 'off' ? undefined : `${cmd.sensor} state must be on or off`;
  }
  if (cmd.type !== 'applyEvent') return null;
  const ev = cmd.event as unknown as Record<string, unknown>;
  switch (ev.kind) {
    case 'brain':
      return inRange('massMl', ev.massMl, 0, 200) ?? inRange('massRateMlPerMin', ev.massRateMlPerMin, -5, 10) ?? inRange('oedemaMl', ev.oedemaMl, 0, 100);
    case 'position':
      return typeof ev.headUpDeg === 'number' ? inRange('headUpDeg', ev.headUpDeg, 0, 90) : 'headUpDeg must be 0–90';
    case 'renal':
      if (ev.catheter !== undefined && ev.catheter !== 'foley' && ev.catheter !== 'none') return 'catheter must be foley or none';
      return inRange('timeScale', ev.timeScale, 1, 24) ?? inRange('iapMmHg', ev.iapMmHg, 0, 40);
    case 'condition':
      if (!OWN_CONDITIONS.includes(ev.id as string)) return null;
      return typeof ev.severity === 'number' ? inRange('severity', ev.severity, 0, 1) : 'severity must be 0–1';
    default:
      return null;
  }
}

export function applyOrgansCommand(os: OrgansState, cmd: Command, _t: number): boolean {
  if (validateOrgansCommand(cmd) !== undefined) return false;
  if (cmd.type === 'attachSensor') {
    const s = cmd.sensor as keyof OrgansState['sensors'];
    os.sensors[s] = cmd.state as 'on' | 'off';
    if (s === 'pbto2') os.num.pbto2 = os.brain.pbto2; // teaching: the probe reads at once (a real one needs a run-in) [ENG]
    return true;
  }
  if (cmd.type !== 'applyEvent') return false;
  const ev = cmd.event as unknown as Record<string, unknown>;
  const b = os.brain;
  switch (ev.kind) {
    case 'brain': {
      if (typeof ev.massMl === 'number') b.mass = ev.massMl;
      if (typeof ev.massRateMlPerMin === 'number') b.massRate = ev.massRateMlPerMin;
      if (typeof ev.oedemaMl === 'number') b.oedema = ev.oedemaMl;
      return true;
    }
    case 'position':
      b.headUpDeg = ev.headUpDeg as number;
      return true;
    case 'renal':
      if (ev.catheter === 'foley' || ev.catheter === 'none') os.renal.catheter = ev.catheter;
      if (ev.emptyBag === true) os.renal.bagMl = 0;
      if (typeof ev.timeScale === 'number') os.renal.timeScale = ev.timeScale;
      if (typeof ev.iapMmHg === 'number') os.iap = ev.iapMmHg;
      return true;
    case 'condition': {
      const id = ev.id as string;
      const s = ev.severity as number;
      os.conds = [...os.conds.filter((c) => c.id !== id), { id, severity: s }];
      if (id === 'tbi') b.p = brainParams(os.conds);
      else if (id === 'hepaticFailure') os.liver.failure = s;
      else os.renal.p.aki = s;
      return true;
    }
    default:
      return false;
  }
}
