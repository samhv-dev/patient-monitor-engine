// Stage 7f pipeline (R32): the neuro state, its commands, and the 10 Hz step the engine runs inside advance() AFTER
// Stage 7g's advancePk (it reads ps.pk.bus) and BEFORE Stage 3's respiratory pipeline (R51 §3 chain order). 7f has NO
// PK (R51 §1) and consumes no drug or vaporiser event: it observes 7g's accepted doses on `bus.doses`. Plain JSON-safe
// data throughout (look-ahead clone, snapshots).
// `stimulus` is Stage 7e's event (R51 addenda 12, 17: `{ kind: 'stimulus', intensity: 0–2 }`, held until the next one):
// 7f OBSERVES it (apply returns false) and maps intensity → its 0–1 depth stimulus (STIM_FULL). 7e validates it (7f's
// temporary validator was deleted when 7e merged, R-7f-4). 7e's two outputs 7f reads are duck-typed
// seams with neutral fallbacks (NeuroEnv.neuroglycopenia, NeuroEnv.macF).
//   step: doses (bus.doses) → bus (bus.ts) → NMB block + TOF (nmb.ts, neostigmine.ts, interactions.ts) → depth
//         (depth.ts) → drive (drive.ts: ns.resp is the hook Stage 3/7b read) → outputs (outputs.ts; ns.antinoc/nmb/
//         thermoDepth for 7e) → marks, TOF device, depth/agent numerics (1 Hz) and the instructor `anaesthesia` event (1 Hz).
import { seedStream } from '../../rng/sfc32.ts';
import type { Command, EngineEvent, Measured, NumericId, PatientProfile } from '../../types.ts';
import { DRUG_BUS_NEUTRAL, type DrugBus } from '../../types-pk.ts';
import type { NeuroClinicalEvent, NeuroDeviceAction, NeuroMarkKind, NeuroProfile, StimulusEvent } from '../../types-neuro.ts';
import { newDoses, NMB_AGENTS, readBus, VOLATILE_IDS, type NeuroAgentId, type NeuroInputs, type NmbAgent, type VolatileId } from './bus.ts';
import { phase2Fraction, siteBlock, tofFrom, type TofReading } from './nmb.ts';
import { neoEc50Mult } from './neostigmine.ts';
import { ec50Multipliers, type NmProfile } from './interactions.ts';
import { depth, opioidFentEq, smoothDi, type DepthOut } from './depth.ts';
import { neuroResp, type NeuroResp } from './drive.ts';
import { neuroOutputs, type NeuroOutputs } from './outputs.ts';
import { createTofDevice, tofAction, tofStep, validateTofAction, type TofDevice } from './tof-device.ts';

export const NEURO_DT_S = 0.1;
/** Fasciculations after succinylcholine: from 25 s to 45 s after the dose (block is complete at ~60 s) [TXT; ENG timing]. */
export const FASC_FROM_S = 25;
export const FASC_TO_S = 45;
/** Potent-volatile brain MAC above which an MH-susceptible patient is exposed (mhTrigger mark; MH itself is 7e's) [ENG]. */
export const MH_VOLATILE_MAC = 0.1;
/** 7e's stimulus intensity that is 7f's full (1.0) noxious stimulus: 1.5 = laryngoscopy/sternotomy (7e's scale) [ENG]. */
export const STIM_FULL = 1.5;

export interface NeuroEnv {
  tempC: number;
  mechanical: boolean;
  /** Stage 7e `endo.core.out.neuroglycopenia` 0–1 (duck-typed by the engine; 0 without 7e). */
  neuroglycopenia?: number;
  /** Stage 7e `cascade(th).macF` — MAC requirement × (−5 %/°C below 37; tables §5.3); 1 without 7e (request R-7f-8). */
  macF?: number;
  /** FU-7 (D7): `resp.spont.rr` as committed by the previous pass (MODELED only — spontaneous OR ventilated; undefined
   * in MANUAL and before the drive has run once). */
  spontRr?: number;
  /** FU-7 (addendum 24 / audit D12): 7c's `blood.out.mg` / `blood.out.iCa` (mmol/L) — ONE magnesium and ONE calcium
   * state; undefined without 7c (the profile's mgMmolL is then the fallback). */
  mgMmolL?: number;
  iCaMmolL?: number;
}

export interface NeuroState {
  k: number; // next step index (time k·0.1 s)
  ageY: number;
  profile: { nm: NmProfile; mhSusceptible: boolean; mgMmolL: number };
  doseSeenT: number; // latest bus.doses time already observed (R51 §3)
  stim: { intensity: number; level: number }; // 7e's intensity 0–2 (held) and 7f's 0–1 level
  airway: 'auto' | 'none' | 'ett' | 'sga';
  depthOn: boolean;
  diShown: number;
  tof: TofDevice;
  last: { tof: TofReading; thumb: number; dia: number; d: DepthOut; x: NeuroInputs };
  resp: NeuroResp;
  outputs: NeuroOutputs;
  /** Read by Stage 7e as ps.neuro.{antinoc, nmb, thermoDepth} (R51 §6; the 7e plan's Requests): mirrors of `outputs`. */
  antinoc: number;
  /** FU-7 (R51 addendum 25): the OPIOID + lidocaine share of `antinoc` — 7e's nociceptive surge state reads it. */
  antinocOp: number;
  nmb: number;
  thermoDepth: number;
  flags: { conscious: boolean; aware: boolean; moved: boolean; recovered: boolean; recurarised: boolean; mhMarked: boolean };
  fasc: { from: number; to: number };
  emgBase: number | null; // ECG EMG artefact before fasciculations (engine)
  out: EngineEvent[];
}

const IDLE_RESP: NeuroResp = {
  opioidDep: 0, hypnoticDep: 0, totalDep: 0, veRest: 1, rrMult: 1, vtMult: 1, apnoea: false, pMaxMult: 1, obstruction: 0, nmbVtMult: 1, cleft: 0,
  loc: 0, pain: 0, hvrDep: 0, // FU-6
};

export function createNeuroState(profile: PatientProfile | undefined, seed: number): NeuroState {
  const np: NeuroProfile = profile?.neuro ?? {};
  const ageY = profile?.ageY ?? 40;
  const x0 = readBus(DRUG_BUS_NEUTRAL);
  const d0 = depth({ ageY, ce: x0.brain, macPotent: 0, macN2o: 0, t1: 1, stimulus: 0, glyco: 0 });
  return {
    k: 0, ageY,
    profile: { nm: np.nm ?? 'normal', mhSusceptible: np.mhSusceptible ?? false, mgMmolL: np.mgMmolL ?? 0.9 },
    doseSeenT: -1, stim: { intensity: 0, level: 0 }, airway: 'auto', depthOn: false,
    diShown: d0.diRaw, tof: createTofDevice(seedStream(seed, 'neuro-tof')),
    last: { tof: tofFrom(0, 0, 0), thumb: 0, dia: 0, d: d0, x: x0 },
    resp: { ...IDLE_RESP },
    outputs: neuroOutputs({ diRaw: d0.diRaw, opioidFentEq: 0, antinoc: 0, thumbBlock: 0, hypEq: 0 }),
    antinoc: 0, antinocOp: 0, nmb: 0, thermoDepth: 0, // FU-7 (addendum 25): antinocOp
    flags: { conscious: true, aware: false, moved: false, recovered: false, recurarised: false, mhMarked: false },
    fasc: { from: -1, to: -1 }, emgBase: null, out: [],
  };
}

// --- commands ------------------------------------------------------------------------------------------------

/**
 * Validation hook: a reason, undefined (accepted) or null (not a Stage 7f command). Every `drug` and `vaporiser` event
 * is 7g's — null here; the engine runs this hook AFTER 7g's (R51 §3), so 7f never sees one it could consume.
 */
export function validateNeuroCommand(cmd: Command): string | undefined | null {
  if (cmd.type === 'device') {
    const a = cmd.action as NeuroDeviceAction | { device: string };
    if (a.device === 'tof') {
      const t = a as Extract<NeuroDeviceAction, { device: 'tof' }>;
      return validateTofAction(t.action, t.intervalS);
    }
    if (a.device === 'depth') return ['on', 'off'].includes((a as { action: string }).action) ? undefined : 'depth action must be on or off';
    return null;
  }
  if (cmd.type !== 'applyEvent') return null;
  const ev = cmd.event as NeuroClinicalEvent | { kind: string };
  switch (ev.kind) {
    case 'airwayDevice': {
      const a = ev as Extract<NeuroClinicalEvent, { kind: 'airwayDevice' }>;
      return ['none', 'ett', 'sga'].includes(a.device) ? undefined : 'device must be none, ett or sga';
    }
    case 'neuroProfile': {
      const p = ev as Extract<NeuroClinicalEvent, { kind: 'neuroProfile' }>;
      if (p.nm !== undefined && !['normal', 'myasthenia', 'lambertEaton', 'burn', 'denervation'].includes(p.nm)) return 'unknown nm profile';
      if (p.mgMmolL !== undefined && !(Number.isFinite(p.mgMmolL) && p.mgMmolL >= 0.3 && p.mgMmolL <= 6)) return 'mgMmolL must be 0.3–6';
      return p.cholinesterase === undefined ? undefined : 'cholinesterase is a patient-profile field (set at creation; 7g\'s PK reads it)';
    }
    default:
      return null; // drug, vaporiser, …: 7g validates and consumes them; 7f observes bus.doses
  }
}

/** Apply a validated command at sim time t. Returns true when it was consumed (never for drug/vaporiser/stimulus events). */
export function applyNeuroCommand(ns: NeuroState, cmd: Command, t: number): boolean {
  if (cmd.type === 'device') {
    const a = cmd.action as NeuroDeviceAction | { device: string };
    if (a.device === 'tof') {
      const x = a as Extract<NeuroDeviceAction, { device: 'tof' }>;
      tofAction(ns.tof, x.action, t, x.intervalS);
      return true;
    }
    if (a.device === 'depth') {
      ns.depthOn = (a as { action: string }).action === 'on';
      return true;
    }
    return false;
  }
  if (cmd.type !== 'applyEvent') return false;
  const ev = cmd.event as NeuroClinicalEvent | { kind: string };
  switch (ev.kind) {
    case 'stimulus': {
      // OBSERVED, never consumed (7e's event, R51 addenda 12/17): held until the next stimulus event
      const i = Math.max(0, (ev as StimulusEvent).intensity);
      ns.stim = { intensity: i, level: Math.min(1, i / STIM_FULL) };
      ns.flags.moved = false;
      return false;
    }
    case 'airwayDevice':
      ns.airway = (ev as Extract<NeuroClinicalEvent, { kind: 'airwayDevice' }>).device;
      return true;
    case 'neuroProfile': {
      const p = ev as Extract<NeuroClinicalEvent, { kind: 'neuroProfile' }>;
      if (p.nm !== undefined) ns.profile.nm = p.nm;
      if (p.mhSusceptible !== undefined) ns.profile.mhSusceptible = p.mhSusceptible;
      if (p.mgMmolL !== undefined) ns.profile.mgMmolL = p.mgMmolL;
      return true;
    }
    default:
      return false;
  }
}

// --- the step ------------------------------------------------------------------------------------------------
function mark(ns: NeuroState, t: number, kind: NeuroMarkKind): void {
  ns.out.push({ type: 'neuroMark', t, kind });
}

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Doses 7g accepted since the last pass (R51 §3): succinylcholine → fasciculation window and, if susceptible, the MH mark. */
function observeDoses(ns: NeuroState, bus: DrugBus): void {
  const { doses, seenT } = newDoses(bus, ns.doseSeenT);
  ns.doseSeenT = seenT;
  for (const d of doses) {
    if (d.agent !== 'succinylcholine') continue;
    ns.fasc = { from: d.t + FASC_FROM_S, to: d.t + FASC_TO_S };
    if (ns.profile.mhSusceptible && !ns.flags.mhMarked) {
      mark(ns, d.t, 'mhTrigger');
      ns.flags.mhMarked = true;
    }
  }
}

function stepOnce(ns: NeuroState, t: number, env: NeuroEnv, x: NeuroInputs): void {
  // NMB
  // FU-7 (addendum 24 / audit D12): ONE magnesium state and ONE calcium state — 7c's blood, with the profile as the
  // baseline when 7c is absent (`env.mgMmolL`/`env.iCaMmolL` are duck-typed in engine.ts's neuro context).
  const m = ec50Multipliers({ profile: ns.profile.nm, volatileMac: x.macPotent, mgMmolL: env.mgMmolL ?? ns.profile.mgMmolL, iCaMmolL: env.iCaMmolL, tempC: env.tempC });
  const neo = neoEc50Mult(x.achGain);
  const mult: Record<NmbAgent, number> = { rocuronium: m.rocuronium * neo, vecuronium: m.vecuronium * neo, cisatracurium: m.cisatracurium * neo, succinylcholine: m.succinylcholine };
  const th = siteBlock(x.nmj, 'thumb', mult);
  const di = siteBlock(x.dia, 'dia', mult);
  const ndShare = th.b > 0 ? th.nd / Math.max(1e-9, th.nd + th.dep) : 0;
  const tof = tofFrom(th.b, ndShare, phase2Fraction(x.suxCumMgPerKg));
  // depth
  // 7e's hypothermic MAC reduction (cascade macF: the same brain tension is a larger MAC fraction) and neuroglycopenia
  const macF = Math.max(0.3, env.macF ?? 1);
  const d = depth({ ageY: ns.ageY, ce: x.brain, macPotent: x.macPotent / macF, macN2o: x.macN2o / macF, t1: tof.t1, stimulus: ns.stim.level, glyco: env.neuroglycopenia ?? 0,
    hypPropEq: x.hypPropEq, opioidFentEqIn: x.opioidFentEq, dissoc: x.dissoc, antinocAdd: x.antinocAdd }); // FU-7 (addenda 20, 22)
  ns.diShown = smoothDi(ns.diShown, d.diRaw, NEURO_DT_S);
  // drive
  const natural = ns.airway === 'none' || (ns.airway === 'auto' && !env.mechanical);
  const wasApnoeic = ns.resp.apnoea;
  ns.resp = neuroResp({ vent: x.vent, hypVentPropEq: x.hypVentPropEq, benzoShare: x.benzoShare, macVolatile: x.macPotent, diaBlock: di.b, tofr: tof.count === 4 ? tof.ratio : 0, di: d.diRaw, naturalAirway: natural, wasApnoeic, spontRr: env.spontRr, hypnotic: d.hypnotic, stress: d.stress }); // FU-6: consciousness and nociception reach the drive; FU-7 (addendum 20; D7): the hypnotic equivalent, its benzodiazepine share and the chemoreflex's committed rate
  // outputs (7d, 7e)
  ns.outputs = neuroOutputs({ diRaw: d.diRaw, opioidFentEq: opioidFentEq(x.brain), antinoc: d.antinoc, thumbBlock: th.b, hypEq: d.hypEq });
  ns.antinoc = ns.outputs.antinoc;
  ns.antinocOp = d.antinocOp; // FU-7 (R51 addendum 25): 7e reads this for the catecholamine release
  ns.nmb = ns.outputs.nmb;
  ns.thermoDepth = ns.outputs.thermoDepth;
  // MH exposure to a potent volatile: a mark only (MH is 7e's, R51 §6)
  if (ns.profile.mhSusceptible && !ns.flags.mhMarked && x.macPotent > MH_VOLATILE_MAC) {
    mark(ns, t, 'mhTrigger');
    ns.flags.mhMarked = true;
  }
  // marks
  if (ns.flags.conscious && !d.conscious) mark(ns, t, 'lossOfConsciousness');
  if (!ns.flags.conscious && d.conscious) mark(ns, t, 'emergence');
  ns.flags.conscious = d.conscious;
  const paralysed = tof.t1 < 0.1;
  if (d.conscious && paralysed && !ns.flags.aware) mark(ns, t, 'awareness');
  ns.flags.aware = d.conscious && paralysed;
  if (d.movement && !ns.flags.moved) {
    mark(ns, t, 'movement');
    ns.flags.moved = true;
  }
  if (ns.resp.apnoea !== wasApnoeic) mark(ns, t, ns.resp.apnoea ? 'apnoea' : 'breathing');
  if (tof.count === 4 && tof.ratio >= 0.9) ns.flags.recovered = true;
  else if (ns.flags.recovered && !ns.flags.recurarised && (tof.count < 4 || tof.ratio < 0.8)) {
    mark(ns, t, 'recurarisation');
    ns.flags.recurarised = true;
  }
  if (t >= ns.fasc.from && t - NEURO_DT_S < ns.fasc.from) mark(ns, t, 'fasciculation');
  ns.last = { tof, thumb: th.b, dia: di.b, d, x };
  // devices and 1 Hz events
  tofStep(ns.tof, t, tof, ns.out);
  if (ns.k > 0 && ns.k % 10 === 0) emitSecond(ns, t);
}

function emitSecond(ns: NeuroState, t: number): void {
  const { d, x } = ns.last;
  const values: Partial<Record<NumericId, Measured>> = {};
  if (ns.depthOn) {
    const emg = ns.stim.level > 0 && ns.last.tof.t1 > 0.25;
    values.di = { value: emg ? null : Math.round(ns.diShown), flag: emg ? 'questionable' : 'valid', at: t };
    values.sr = { value: Math.round(d.sr), flag: 'valid', at: t };
  }
  // gas monitor: END-TIDAL MAC (Σ fet/macAge, all agents: R51 addendum 17) and the dominant potent agent's Fet,
  // from 7g's bus (decision 13); the brain MAC (7g's macFrac) is the anaesthesia event's `macBrain`
  let dom: VolatileId | null = null;
  for (const a of VOLATILE_IDS) {
    const e = x.et[a];
    if (!e || a === 'n2o') continue;
    if (e.fet > 0.02 && (dom === null || e.fet > (x.et[dom]?.fet ?? 0))) dom = a;
  }
  if (x.macEt > 0.02) {
    values.mac = { value: Math.round(x.macEt * 10) / 10, flag: 'valid', at: t };
    if (dom) values.etAa = { value: Math.round((x.et[dom]?.fet ?? 0) * 10) / 10, flag: 'valid', at: t };
  }
  if (Object.keys(values).length > 0) ns.out.push({ type: 'measurement', t, values });
  const ce: Partial<Record<NeuroAgentId, number>> = {};
  const add = (a: NeuroAgentId, c: number) => {
    if (c > 0.001) ce[a] = r2(c);
  };
  add('propofol', x.brain.propofol);
  add('remifentanil', x.brain.remifentanil);
  add('fentanyl', x.brain.fentanyl);
  add('midazolam', x.brain.midazolam);
  add('ketamine', x.brain.ketamine);
  for (const a of NMB_AGENTS) add(a, x.nmj[a]);
  const etPct: Partial<Record<VolatileId, number>> = {};
  for (const a of VOLATILE_IDS) {
    const e = x.et[a];
    if (e && e.fet > 0.005) etPct[a] = r2(e.fet);
  }
  const tof = ns.last.tof;
  ns.out.push({
    type: 'anaesthesia', t,
    di: Math.round(d.diRaw), sr: Math.round(d.sr), mac: r2(x.macEt), macBrain: r2(d.macFrac), macEff: r2(d.macEff), etPct, ce,
    tof: { count: tof.count, ratio: r2(tof.ratio), ptc: tof.ptc, t1: r2(tof.t1) },
    block: { thumb: r2(ns.last.thumb), dia: r2(ns.last.dia) },
    drive: { opioidDep: r2(ns.resp.opioidDep), hypnoticDep: r2(ns.resp.hypnoticDep), veRest: r2(ns.resp.veRest), apnoea: ns.resp.apnoea, obstruction: r2(ns.resp.obstruction) },
    conscious: d.conscious, awarenessRisk: d.diRaw > 60 && tof.count <= 2, stress: r2(d.stress), movement: d.movement,
    outputs: ns.outputs,
  });
}

/** True while succinylcholine fasciculations show (engine: ECG EMG artefact). */
export function fasciculating(ns: NeuroState, t: number): boolean {
  return t >= ns.fasc.from && t < ns.fasc.to;
}

/**
 * Step the neuro state on its 10 Hz grid up to and including time tEnd (s). `bus` is 7g's DrugBus as `advancePk` left
 * it in the same pass (the engine calls this right after `advancePk`); every sub-step of the pass reads that one bus.
 */
export function stepNeuroTo(ns: NeuroState, tEnd: number, env: NeuroEnv, bus: DrugBus): void {
  observeDoses(ns, bus);
  const x = readBus(bus);
  while (ns.k * NEURO_DT_S <= tEnd + 1e-9) {
    stepOnce(ns, ns.k * NEURO_DT_S, env, x);
    ns.k++;
  }
}
