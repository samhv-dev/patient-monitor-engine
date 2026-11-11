// The engine (brief §3.3 tick model, §7.1 API). One committed pipeline state advances with sim time;
// every tick a CLONE of it is run ahead by the look-ahead L (100 ms) to fill the ring buffers and to find
// QRS detections early enough to schedule beeps. A command changes the committed state, so the next
// look-ahead pass regenerates everything after "now" (look-ahead invalidation) and a toneCancel revokes
// tones already posted. All pipeline state is plain JSON-safe data (snapshot/restore, structuredClone).
import { Clock, frameBudgetMs, runOwed, TICK_MS } from './clock/clock.ts';
import { RingBuffer } from './buffers/ring.ts';
import { constantRamp, rampValue, retarget, type RampState } from './l1/ramp.ts';
import { ECG_RATE, pruneEvents } from './l2/ecg/generator.ts';
import { ecgFrontEnd, ecgGenInputs, generateEcg } from './l2/ecg/ecg-gen.ts';
import { drawHrvPhase, type HrvPhase } from './l2/ecg/hrv.ts';
import { applyRhythm, createRhythmState, planUntil, type RhythmCtx, type RhythmState } from './l2/ecg/rhythm-engine.ts';
import { DEFAULT_FLUTTER_ATRIAL_BPM, RHYTHMS } from './l2/ecg/rhythms.ts';
import { projectLead } from './l2/ecg/vcg.ts';
import { advanceEeg, applyEegSetting, createEegState, EEG_RATE, validateEegCommand, type EegCtx, type EegState } from './l2/eeg/pipeline.ts';
import { EEG_DEFAULT_MODEL, EEG_DEVICES, EEG_MODEL_IDS, type EegModelId } from './l3/eeg-devices/registry.ts';
import type { EegDeviceAction, EegReading } from './types-eeg.ts';
import { createFilterState, designEcgFilter, filterBand, filterSample, type Biquad } from './l3/ecg-filter.ts';
import { createHrState, hrAveragingOf, hrMeasure, hrOnQrs, type HrAveraging, type HrMethod, type HrState } from './l3/hr.ts';
import { resolveSkin } from '@pme/skins'; // Data-only dependency
import { createQrsState, PACE_LEAD_N, qrsPaceGate, qrsPacePulse, qrsStep, type QrsState } from './l3/qrs.ts';
import { defaultModifiers, mergeModifiers, validateModifiers } from './modifiers.ts';
import { createRngState, seedStream, type Sfc32State, type StreamName } from './rng/sfc32.ts';
import {
  LEAD_IDS,
  type ChannelId,
  type Command,
  type DispatchResult,
  type EcgFilterMode,
  type EngineEvent,
  type EngineEventType,
  type EngineOptions,
  type LeadId,
  type Measured,
  type Modifiers,
  type MonitorEngine,
  type NumericId,
  type PatientProfile,
  type PatientSnapshot,
  type Ramp,
  type RhythmId,
  type RhythmOpts,
  type SimSeconds,
} from './types.ts';
import type { SensorId, StateSignals } from './types-hemo.ts';
import { engineKey } from './version.ts';
import { createL1State, l1Target, l1Value, setL1Target, type L1State, type L1Var } from './l1/state.ts'; // l1Value, setL1Target
import {
  advanceHemo,
  applyHemoCommand,
  createHemoState,
  HEMO_CHANNELS,
  MANUAL_TRACK_MAX_S,
  HEMO_TEACHING,
  type HemoTeachingChannel,
  hemoChannelActive,
  validateHemoCommand,
  type HemoChannel,
  type HemoState,
} from './l2/hemo/pipeline.ts';
import { ARREST_AFTER_S, HEMO_RATE } from './l2/hemo/params.ts';
import { applyDeviceCommand, createDevice, deviceOnQrs, stepDevice, validateDeviceCommand, type DeviceHost, type DeviceState } from './l3/device-layer.ts';
import {
  advanceResp,
  applyRespCommand,
  createRespState,
  respBreathU,
  respPleural,
  RESP_RATE,
  validateRespCommand,
  type RespChannel,
  type RespState,
} from './l2/resp/pipeline.ts';
import { advanceEndo, applyEndoCommand, createEndoState, validateEndoCommand, type EndoState } from './l2/endo/pipeline.ts';
import { ecgDeltas, writeBlood, writeCirc, writeCond, writeLung } from './l2/endo/adapters.ts';
import { upgradeThermal } from './l2/thermal/heat.ts';
import { mhActivity } from './l2/thermal/mh.ts';
import { gasPatient } from './l2/gas/params.ts';
import { SINUS_FAMILY } from './l2/circ/rate-rule.ts'; // The rate rule: only the sinus node takes the endocrine HR factor
import { advancePk, applyPkCommand, createPkState, NEUTRAL_PK_CTX, pkPatientOf, validatePkCommand, type PkCtx, type PkState } from './l2/pk/pipeline.ts';
import { createHookState, rhythmRequest, type RhythmHookState } from './l2/pk/hooks.ts';
import { obstructiveAlias } from './l2/circ/aliases.ts';
import { applyNeuroCommand, createNeuroState, fasciculating, STIM_FULL, stepNeuroTo, validateNeuroCommand, type NeuroState } from './l2/neuro/pipeline.ts'; // STIM_FULL
import { pcheOf } from './l2/neuro/bus.ts';
import { circCardiacOutput, circVagalStimulus, type CircModelState } from './l2/circ/model.ts'; // The stimulus observer
import { heldRate } from './l2/circ/rate-rule.ts';
import { betaVenousUnits } from './l2/circ/venous.ts';
import { BEEP_BASE_HZ, spo2PitchHz } from './l3/spo2/spo2.ts';
import { VF_CONFIRM_S } from './l3/alarms/conditions.ts';
import { advanceBlood, applyBloodCommand, bloodEcgTargets, createBloodState, validateBloodCommand, type BloodState } from './l2/blood/pipeline.ts';
import { cycleBreathClock, fixedBreathClock, type BreathClock } from './l2/ecg/breath-clock.ts';
import { lastCycleBefore } from './l2/resp/driver.ts';
import { advanceOrgans, applyOrgansCommand, createOrgansState, ICP_RATE, organChannelActive, rebaselineOrgans, validateOrgansCommand, type OrganChannel, type OrgansCtx, type OrgansState } from './l2/organs/pipeline.ts';
import { pruneTruth } from './truth.ts';
import { decodeState, encodeState } from './snapshot-codec.ts';

export const SAMPLES_PER_TICK = (ECG_RATE * TICK_MS) / 1000; // 10
export const BUFFER_SECONDS = 120; // brief §3.5
/** Tone at detected R + 30 ms. */
export const BEEP_DELAY_S = 0.03;
/** A committed detection re-posted after a command is still worth a (late) beep this long after its tone time. */
const LATE_TONE_POST_S = 0.12;
export const QRS_TONE_HZ = BEEP_BASE_HZ; // Fixed pitch until SpO2 exists (brief §3.6); then pitch(SpO2)
const PLAN_LEAD_S = 0.15; // plan rhythm events this far beyond the last generated sample (kernel lead-in)
const DEFAULT_LANES: LeadId[] = ['ecgII', 'V5'];
/**
 * The primary (detection) lead: the QRS detector and HR run on lead II, monitor-filtered with its own filter state,
 * whatever lead lane 0 shows. Detecting on lane 0 kept thresholds learned on II after a switch to a small lead (aVL:
 * QRS ~23 %), so HR read 0 within 4 s, a false asystole [ENG: device].
 */
const DETECTION_LEAD: LeadId = 'ecgII';

interface PipelineState {
  n: number; // next ECG sample index to generate
  rng: Record<StreamName, Sfc32State>;
  hr: RampState;
  mods: Modifiers;
  hrv: HrvPhase;
  rhythm: RhythmState;
  filterMode: EcgFilterMode;
  lanes: LeadId[];
  laneFilter: number[][];
  detFilter: number[]; // filter state of the detection lead
  qrs: QrsState;
  hrm: HrState;
  out: EngineEvent[]; // measurement events waiting for their time
  detections: Detection[]; // QRS detections found during this pass
  l1: L1State; // PatientState targets and flags (brief §4.9)
  hemo: HemoState; // Pressures, pleth, NIBP (brief §4.2–§4.5)
  resp: RespState; // Breathing, gas exchange, SpO2/CO2/RR/temperature (brief §4.3–§4.7)
  endo: EndoState; // Stress hormones, glucose–insulin, thyroid, conditions (the heat model lives in resp.temp)
  endoHrF: number; // HR factor on the rhythm clock in MANUAL (1 in MODELED: the circulation model takes circ.ext.endo*)
  cond: { vasoResp: number }; // The endocrine model → the drug model: catecholamine responsiveness, mirrors endo.core.out.vasoResp
  blood: BloodState; // Fluids, acid–base, electrolytes, O2 delivery, labs
  pk: PkState;
  pkHooks: RhythmHookState;
  neuro: NeuroState; // NMB, depth, drive depression
  organs: OrgansState; // Brain, kidney, liver
  eeg?: EegState & { dev: EegDev }; // The frontal EEG and the device reading it, only while on (l2/eeg/pipeline.ts, D4)
}

/** The EEG device reading the channel (l3/eeg-devices/registry.ts, plan D8): its model, the 125 Hz sample it started
 * at, the reader's own state and its readings not yet due. */
interface EegDev {
  model: EegModelId;
  m0: number;
  st: unknown;
  out: EngineEvent[];
}
const newEegDev = (model: EegModelId, m0: number): EegDev => ({ model, m0, st: EEG_DEVICES[model].create(EEG_RATE), out: [] });

/**
 * The sensor-state map the `state` event carries. The states live with four owners — the ECG front end (the device
 * layer's lead-off/motion artefact, `mods.artefact`), the respiratory signals (co2, temp), the hemo pipeline (spo2,
 * nibp, the three lines, the teaching channels) and the organ model (icp, pbto2, urometer) — and are read here, where
 * all four are visible; no new state. Values are the `attachSensor` state strings.
 */
function sensorMap(ps: PipelineState): Partial<Record<SensorId, string>> {
  const a = ps.mods.artefact;
  const h = ps.hemo;
  return {
    ecg: a.leadOff ? 'off' : a.motion > 0 ? 'motion' : 'on',
    spo2: h.pleth.state, nibp: h.nibp.sensor, abp: h.lines.abp.sensor, cvp: h.lines.cvp.sensor, pap: h.lines.pap.sensor,
    co2: ps.resp.co2Sensor, temp: ps.resp.tempSensor, pv: h.pvOn ? 'on' : 'off',
    icp: ps.organs.sensors.icp, pbto2: ps.organs.sensors.pbto2, urometer: ps.organs.sensors.urometer,
  };
}

/**
 * The `state` event's signals at time `t` (scenario-format-v2 plan F4, Q21/Q22): values the models already hold, read,
 * never computed anew. `pulse` is the debrief's rule (no arrest state); `map` is the last site beat's MAP, or while no
 * beat has ejected for the arrest window the circuit's `mapNow` — the rule `l2/hemo/pipeline.ts` `isArrested` gives
 * the state's sbp/dbp (restated here, not imported: the physiology module is not touched).
 */
function stateSignals(ps: PipelineState, t: number): StateSignals {
  const h = ps.hemo;
  const d = ps.resp.driver;
  const flat = t - h.circ.lastEjT > Math.max(ARREST_AFTER_S, 2.2 * h.lastRR);
  return {
    pulse: h.circ.arrest === null || h.circ.arrest === undefined,
    dantroleneE: ps.pk.bus.metabolic.dantroleneE,
    setMinuteVentilationLMin: d.source === 'ventilator' ? (d.vent.rr * d.vent.vt) / 1000 : null,
    map: flat ? h.circ.mapNow : h.lastSite.map,
    mhActivity: mhActivity(ps.resp.temp.mh, t),
    mhExcess: ps.resp.temp.mh ? (ps.resp.temp.mh.s ?? 1) : null,
  };
}

/**
 * Transcutaneous pacing is painful (research/20, gap V6). The pacer's output current is a nociceptive input on the
 * endocrine stimulus scale — none up to TCP_PAIN_MA_0, rising linearly to TCP_PAIN_MAX ("laryngoscopy-grade", the
 * endocrine model's 1.5) at TCP_PAIN_MA_FULL and above [FIT: research/20 V6's smallest mechanism, fit target: an awake
 * patient paced at 50–100 mA needs analgesia/sedation (ERC 2021 ALS); brief research/20 V6; src ERC 2021 ALS]. It is ADDED to the instructor's held stimulus
 * through the one `stimulus` shape for the duration of each pass, so the endocrine catecholamines and the neuro
 * model's arousal answer it and antinociception (opioid, hypnotic) removes it; no new effector, no new state.
 */
const TCP_PAIN_MA_0 = 40;
const TCP_PAIN_MA_FULL = 100;
const TCP_PAIN_MAX = 1.5;
function tcpNoxious(mods: Modifiers, lastPulseT: number | undefined, t: number): number {
  const tcp = mods.tcp;
  // only DELIVERED pulses hurt: a demand pacer the patient's own rhythm inhibits fires nothing (final review I-1) —
  // pain while the last pulse is within 1.5 pacing intervals of now
  if (!tcp || lastPulseT === undefined || t - lastPulseT > (1.5 * 60) / Math.max(1, tcp.ratePpm)) return 0;
  const mA = tcp.mA;
  return TCP_PAIN_MAX * Math.min(1, Math.max(0, (mA - TCP_PAIN_MA_0) / (TCP_PAIN_MA_FULL - TCP_PAIN_MA_0)));
}

/** One QRS detection: the detected R sample and the sample at which the detector reported it. */
interface Detection {
  r: number;
  n: number;
}

/** A tone posted to listeners whose R might still change (its detection is not safely in the past). */
interface PostedTone {
  t: number;
  n: number;
}

const toneId = (d: Detection) => `qrs-${d.r}`;

type Listener = { fn: (e: EngineEvent) => void; types: Set<EngineEventType> | null };

const ECG_CHANNELS = new Set<ChannelId>([...LEAD_IDS, 'vcgX', 'vcgY', 'vcgZ']);

/** The ECG's RSA, wander and QRS modulation follow the breath driver. */
function breathOf(ps: PipelineState): BreathClock {
  return cycleBreathClock((t) => lastCycleBefore(ps.resp.driver, t), fixedBreathClock(ps.hrv));
}

/** Transcutaneous pacing pulses to announce to the QRS detector while generating samples [from, to]: key = the
 * sample at which to announce (PACE_LEAD_N early), value = the pulse's sample. */
function tcpPulseAnnouncements(records: readonly EngineEvent[], from: number, to: number): Map<number, number> {
  const out = new Map<number, number>();
  for (const r of records) {
    if (r.type !== 'marker' || r.kind !== 'paceSpike' || r.data?.tcp !== true) continue;
    const n = Math.round(r.t * ECG_RATE);
    const at = Math.max(from, n - PACE_LEAD_N);
    if (n >= from && at <= to) out.set(at, n);
  }
  return out;
}

function rhythmCtx(ps: PipelineState): RhythmCtx {
  // The endocrine/fever HR factor scales only the sinus node (rate rule); exactly 1 at rest
  const endoF = SINUS_FAMILY.has(ps.rhythm.id) ? ps.endoHrF : 1;
  return {
    hrAt: (t) => rampValue(ps.hr, t) * endoF,
    pacerLowerAt: (t) => rampValue(ps.hemo.circ.hrSet ?? ps.hr, t), // The held rate is a pacer's lower rate
    mods: ps.mods, rng: ps.rng, hrv: ps.hrv, breath: breathOf(ps), // Breath
  };
}

/** Record the rate just written to ps.hr for MODELED mode's rate rule (explicit = the instructor's own rate). */
function holdRate(ps: PipelineState, rhythmId: string, explicit: boolean): void {
  ps.hemo.circ.hrSet = heldRate(rhythmId, explicit, ps.hr);
}

/** hr truth when a rhythm starts: RhythmOpts.rateBpm, else the rhythm default (flutter: atrial/ratio). */
function startRate(id: RhythmId, opts: RhythmOpts): number {
  if (opts.rateBpm !== undefined) return opts.rateBpm;
  if (opts.pacer?.ratePpm !== undefined && RHYTHMS[id].rateDrives === 'pacer') return opts.pacer.ratePpm; // a programmed lower rate
  if (id === 'aflutter') {
    const r = opts.ratio ?? 2;
    return (opts.atrialRateBpm ?? DEFAULT_FLUTTER_ATRIAL_BPM) / (r === 'variable' ? 3 : r);
  }
  return RHYTHMS[id].defaultRateBpm;
}

/**
 * SV₀, the reference of the pleth's PI × SVᵢ/SV₀ rule (brief §4.3), is the patient's OWN settled resting stroke volume:
 * what this engine reaches for this patient at rest — spontaneously breathing, unventilated, in sinus rhythm — once
 * its own stabilisation (the MANUAL trackers, or MODELED's reflexes) has run. It is MEASURED here by running the real
 * engine on that resting patient, not typed and not taken from the stand-alone stabiliser, so the pulse equals the
 * instructor's PI exactly at that rest and departs from it only as the stroke volume departs from it.
 *
 * Why the stand-alone stabiliser's `circ.ref.sv` (79.1 mL for the default adult) is not that value — the running
 * engine settles the same MANUAL patient at ≈ 89 mL (brief 76, research/45; measured below): `stabilise.ts` solves the
 * bare circuit for the PROFILE's targets (HR 70, CVP 5, the band's SBP/DBP) at a CONSTANT end-expiratory pleural
 * pressure (P_PL0 −4 mmHg). Three couplings of the running engine are missing from it:
 *  1. MANUAL: the instructor's own numbers (L1 defaults HR 75, CVP 6, 120/80), which the MANUAL trackers then impose
 *     with THEIR knobs — the venous unstressed volume (≈ −400 mL) and LV Emax (×0.74) — not the stabiliser's (R_sys,
 *     C_art). Measured at seed 42, 45–90 s: HR 75/CVP 6 → 88 mL; HR 70/CVP 4.85 (the stabiliser's own targets) → 86 mL.
 *  2. The breath driver: spontaneous breathing swings the pleural pressure from −4 to ≈ −7 mmHg (mean ≈ −5), which
 *     raises venous return, and the MANUAL CVP tracker holds the breath-AVERAGED right-atrial pressure, so it fills by
 *     a further ≈ 130 mL to lift the inspiratory dips (that residual 86 against 79 mL).
 *  3. MODELED: the same breathing, and the baroreflex settling at its own point (81.5 mL at rest: SV₀; 70.8 mL on IPPV).
 * The same fault — the trackers starting from a circulation that is not the instructor's patient and taking ≈ 40–60 s
 * to reach it — is behind the MANUAL PEEP 0 < PEEP 5 stroke volume (84.0 against 85.5 mL): a ventilator started at
 * t = 0 runs while the trackers are still converging. Under PEEP 5 the pressure tracker kept running to 38 s (LV Emax
 * ×0.80) and the volume tracker, which subtracts the pleural RISE from its CVP, transfused 665 mL; under PEEP 0 the
 * pressure tracker released at ≈ 10 s (Emax ×1.00, SBP then drifting to 129) and the volume tracker gave 367 mL. The
 * order PEEP 0 < PEEP 5 is that race, not physiology; it is left to the trackers' own brief (no waveform here changes).
 *
 * The rest is the patient as configured at t = 0 (profile, conditions and the instructor's baseline values) with its
 * scripted arrhythmia removed: a rhythm and its rate are the scenario's (the AF pulse deficit must show against the
 * patient's sinus stroke volume, research/45), so a non-sinus `rhythm` drops with its `baseline.hr`, and the monitor's
 * `sensors` drop too. The settling ends
 * when both MANUAL trackers have released (each releases by MANUAL_TRACK_MAX_S of its own run), or after
 * REST_SETTLE_MODELED_S in MODELED; SV₀ is then the mean pleth stroke-volume estimate (EDV − the previous beat's ESV, the
 * numerator the pleth uses) over REST_AVG_S of beats. A patient property, not the scenario's random stream: the run uses
 * REST_SEED, so it is deterministic and cached per resting patient and mode, and it runs ONCE, when the engine is
 * created — never inside a step, whatever the time scale. The run steps only the three pipelines that set a resting
 * stroke volume (`restAdvance`: the rhythm engine, the breath driver, the haemodynamics), tick by tick as the engine
 * does; it reproduces the whole engine's resting value exactly (88.90 / 81.29 mL, MANUAL / MODELED, measured with a
 * 20-s mean after a 60-s MODELED settle) at ≈ 60 % of its cost. The resting patient carries no sensors (their transducers are not physiology: SV₀ is
 * the same with or without them) and MODELED settles REST_SETTLE_MODELED_S, so a run is ≈ 0.03–0.17 s in Node and
 * Chromium (SV₀ 88.59 / 81.45 mL); the whole engine's 80 s took 0.23–0.29 s and, on the CI runner, delayed a case's monitor by 1–2 s.
 * A restored snapshot carries its own SV₀. [ENG: measurement; REST_AVG_S, two spontaneous breaths at the default
 * 15/min; REST_SEED, the engine's default seed; REST_SETTLE_MODELED_S, the measured settling]
 */
export const REST_AVG_S = 8;
export const REST_SEED = 1;
/** MODELED has no tracker to wait for: its resting SV is within ± 0.5 % (the breath-to-breath spread) from 8 s on
 * (8-s means 81.0, 81.9, 81.8, 81.5, 81.3, 81.8 mL from 8 to 56 s, seed 1). */
export const REST_SETTLE_MODELED_S = 8;
const restSvCache = new Map<string, number>();

/** The resting patient whose settled stroke volume is SV₀ (see REST_AVG_S). */
export function restingPatient(p: PatientProfile | undefined): PatientProfile | undefined {
  if (!p) return p;
  // the monitor's sensors are not the patient (and their transducers are most of a run's cost)
  const { sensors: _sensors, ...q } = p;
  if (!q.rhythm || q.rhythm.id === 'sinus') return q;
  const { rhythm: _rhythm, ...rest } = q;
  if (!rest.baseline || rest.baseline.hr === undefined) return rest;
  const { hr: _hr, ...baseline } = rest.baseline;
  return { ...rest, baseline };
}

class Engine implements MonitorEngine {
  readonly version = engineKey; // `${version}+${build}`, the snapshot compatibility key
  private readonly seed: number;
  private readonly lookTicks: number;
  private readonly mainsHz: 50 | 60;
  private st: PipelineState;
  private tick = 0;
  private queue: Array<{ cmd: Command; tick: number }> = [];
  private readonly listeners = new Set<Listener>();
  private readonly bufs = new Map<ChannelId, RingBuffer>();
  /** Tones posted to listeners, by id, until they are safely in the past (never re-post one). */
  private readonly posted = new Map<string, PostedTone>();
  /** Committed detections since the last speculation that might match or replace a posted tone. */
  private committedDet: Detection[] = [];
  /** First sample regenerated by a command since the last speculation (Infinity: none). */
  private dirtyFromN = Number.POSITIVE_INFINITY;
  private readonly clock = new Clock();
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastWall = 0;
  private readonly sections = new Map<EcgFilterMode, Biquad[]>();
  private groupTicks = new Map<string, number>(); // stageGroup → tick (brief §4.9); in the snapshot
  private dev: DeviceState; // Alarms, defibrillator, pacer (brief §6.4–§6.5)
  private readonly devOpts: EngineOptions['device']; // For restoring older snapshots
  private readonly truthEvery: number; // Ticks between truth events, 0 = off

  /** `rest`: this engine IS the resting run that measures SV₀ (no recursion). */
  constructor(opts: EngineOptions, rest = false) {
    // MODELED is accepted (the circulation's reflexes run)
    this.seed = (opts.seed ?? 1) >>> 0;
    const look = opts.lookaheadS ?? 0.1;
    this.lookTicks = Math.round((look * 1000) / TICK_MS);
    if (this.lookTicks < 1 || Math.abs(this.lookTicks * TICK_MS - look * 1000) > 1e-6) {
      throw new RangeError(`lookaheadS must be a positive multiple of 0.020 s, got ${look}`);
    }
    this.mainsHz = opts.device?.mainsHz ?? 50;
    this.devOpts = opts.device;
    const truthHz = opts.truthHz ?? 0;
    if (!(truthHz >= 0 && truthHz <= 2)) throw new RangeError(`truthHz must be 0–2, got ${truthHz}`);
    this.truthEvery = truthHz > 0 ? Math.round(1000 / TICK_MS / truthHz) : 0;
    this.dev = createDevice(opts.device?.skin, opts.device?.ageBand); // Throws for an unknown skin
    const rng = createRngState(this.seed);
    const rhythmId = opts.patient?.rhythm?.id ?? 'sinus';
    const rhythmOpts = opts.patient?.rhythm?.opts ?? {};
    const hr0 = opts.patient?.baseline?.hr ?? startRate(rhythmId, rhythmOpts);
    const lanes = [...DEFAULT_LANES];
    const hr = constantRamp(hr0);
    const mods = defaultModifiers();
    const hrv = drawHrvPhase(rng.hrv);
    const ctx: RhythmCtx = { hrAt: (t) => rampValue(hr, t), mods, rng, hrv };
    const l1 = createL1State(opts.patient);
    if (opts.mode === 'modeled') l1.mode = 'modeled';
    this.st = {
      n: 0,
      rng,
      hr,
      mods,
      hrv,
      rhythm: createRhythmState(rhythmId, rhythmOpts, 0, ctx),
      filterMode: 'monitor',
      lanes,
      laneFilter: lanes.map(() => createFilterState(this.filter('monitor'))),
      detFilter: createFilterState(this.filter('monitor')),
      qrs: createQrsState(0),
      hrm: createHrState(),
      out: [],
      detections: [],
      l1,
      hemo: createHemoState(opts.patient, l1, hr0),
      resp: createRespState(opts.patient, l1, this.seed),
      endo: createEndoState(opts.patient, gasPatient(opts.patient).effKg),
      endoHrF: 1,
      cond: { vasoResp: 1 },
      blood: createBloodState(opts.patient),
      pk: createPkState({ ...pkPatientOf(opts.patient), pche: pcheOf(opts.patient) }), // Drug PK, with the neuro model's cholinesterase phenotype
      pkHooks: createHookState(),
      neuro: createNeuroState(opts.patient, this.seed),
      organs: createOrgansState(opts.patient, l1),
    };
    holdRate(this.st, rhythmId, rhythmOpts.rateBpm !== undefined);
    if (!rest) this.st.hemo.circ.svRest = Engine.restingSv(opts); // SV₀, once per resting patient (REST_AVG_S)
    rebaselineOrgans(this.st.organs, this.organsCtx(this.st)); // Calibrate on the pipelines' t = 0 truths
    this.syncCo2Sampler();
    for (const ch of ['vcgX', 'vcgY', 'vcgZ', ...lanes] as ChannelId[]) this.bufs.set(ch, new RingBuffer(ECG_RATE, BUFFER_SECONDS));
    this.advance(this.st, 0);
    this.st.detections.length = 0;
    this.speculate();
  }

  /** SV₀: the settled resting stroke volume of this patient in the real engine (see REST_AVG_S). */
  private static restingSv(opts: EngineOptions): number {
    const ro: EngineOptions = { seed: REST_SEED, mode: opts.mode ?? 'manual', ...(opts.patient ? { patient: restingPatient(opts.patient) as PatientProfile } : {}) };
    const key = JSON.stringify(ro);
    const hit = restSvCache.get(key);
    if (hit !== undefined) return hit;
    const e = new Engine(ro, true);
    const manual = ro.mode !== 'modeled';
    const mh = () => e.st.hemo.manHold;
    let t = 0;
    const STEP_S = 4; // read the beats every 4 s: ≤ the 16-beat buffer up to 240/min
    const go = (to: number) => {
      // tick by tick, as the engine couples its pipelines (in 4 s chunks the MODELED chemoreflex read the gas exchange
      // late: 82.16 against the full engine's 81.29 mL)
      for (let n = e.st.n - 1 + SAMPLES_PER_TICK; n <= Math.round(to * ECG_RATE); n += SAMPLES_PER_TICK) e.restAdvance(e.st, n);
    };
    while (manual ? (mh().active || mh().pActive) && t < 2 * MANUAL_TRACK_MAX_S : t < REST_SETTLE_MODELED_S) go((t += STEP_S));
    const t0 = t;
    const seen = new Map<number, { t: number; lvedv: number; lvesv: number }>();
    while (t < t0 + REST_AVG_S) {
      go((t += STEP_S));
      for (const b of e.st.hemo.circ.beats) if (b.t > t0) seen.set(b.t, b);
    }
    const bs = [...seen.values()].sort((a, b) => a.t - b.t);
    let sum = 0;
    for (let i = 1; i < bs.length; i++) sum += Math.max(0, (bs[i] as { lvedv: number }).lvedv - (bs[i - 1] as { lvesv: number }).lvesv);
    const sv = bs.length > 1 ? sum / (bs.length - 1) : e.st.hemo.circ.ref.sv;
    restSvCache.set(key, sv);
    return sv;
  }

  // --- lifecycle -------------------------------------------------------------------------------
  start(): void {
    if (this.timer !== null) return;
    this.lastWall = performance.now();
    this.timer = setInterval(() => {
      const now = performance.now();
      const gap = now - this.lastWall;
      this.clock.credit(gap); // in full: a late interval owes its whole gap (brief 105)
      this.lastWall = now;
      let ran = this.clock.tick;
      runOwed(this.clock, () => (this.runTicks(this.clock.tick - ran), (ran = this.clock.tick)), frameBudgetMs(gap)); // the ticks each chunk took
    }, TICK_MS);
  }
  pause(): void {
    this.clock.pause();
  }
  /**
   * End start()'s interval. Idempotent; start() may run the engine again afterwards (the state is kept). Engines a
   * renderer drives (advanceTo per frame) never start a timer and need no stop.
   */
  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }
  resume(): void {
    this.clock.resume();
    this.lastWall = performance.now();
  }
  setTimeScale(k: number): void {
    this.clock.timeScale = k; // throws RangeError outside 0.25–8 (MIN_TIME_SCALE–MAX_TIME_SCALE)
  }
  step(ticks = 1): void {
    if (this.timer !== null && !this.clock.paused) return;
    this.runTicks(Math.max(0, Math.floor(ticks)));
  }
  advanceTo(simT: SimSeconds, lookAhead = true): void {
    const target = Math.floor(simT * (1000 / TICK_MS) + 1e-6);
    this.runTicks(target - this.tick, lookAhead);
  }
  now(): { tick: number; simT: SimSeconds } {
    return { tick: this.tick, simT: (this.tick * TICK_MS) / 1000 };
  }

  // --- commands and events ---------------------------------------------------------------------
  dispatch(input: Command): DispatchResult {
    // The queue keeps its OWN copy — a caller that edits its command object after dispatch (a staging buffer, a UI
    // form) can no longer change what was validated and accepted. Not plain data → refused.
    let cmd: Command;
    try {
      cmd = structuredClone(input);
    } catch {
      return { accepted: false, tick: this.tick, reason: 'a command must be plain data (no functions or class instances)' };
    }
    const reason = this.validate(cmd);
    let tick = Math.max(cmd.atTick ?? this.tick + 1, this.tick + 1);
    if (reason) return { accepted: false, tick: this.tick, reason };
    if (cmd.stageGroup !== undefined) {
      // Commands sharing a stageGroup apply on the same tick (brief §4.9 "stage then commit")
      for (const [k, at] of this.groupTicks) if (at <= this.tick) this.groupTicks.delete(k); // Committed groups end
      const g = this.groupTicks.get(cmd.stageGroup);
      if (g !== undefined && g > this.tick) tick = g;
      else this.groupTicks.set(cmd.stageGroup, tick);
    }
    let i = this.queue.length;
    while (i > 0 && (this.queue[i - 1] as { tick: number }).tick > tick) i--;
    this.queue.splice(i, 0, { cmd, tick });
    return { accepted: true, tick };
  }

  on(fn: (e: EngineEvent) => void, types?: EngineEventType[]): () => void {
    const l: Listener = { fn, types: types ? new Set(types) : null };
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }

  // --- samples ---------------------------------------------------------------------------------
  readSamples(ch: ChannelId, fromIndex: number, out: Float32Array): number {
    // A sample index is whole — a fractional one read NaN past the ring's slots; none for NaN/±∞
    if (!Number.isFinite(fromIndex)) return 0;
    return this.bufs.get(ch)?.read(Math.floor(fromIndex), out) ?? 0;
  }
  latestSampleIndex(ch: ChannelId): number {
    return this.bufs.get(ch)?.latest ?? -1;
  }
  sampleRate(ch: ChannelId): 500 | 125 | 62.5 {
    if (ECG_CHANNELS.has(ch)) return 500;
    return ch === 'co2' || ch === 'resp' ? 62.5 : 125;
  }

  // --- snapshot --------------------------------------------------------------------------------
  snapshot(): PatientSnapshot {
    return {
      schema: 'pme-snapshot/1',
      engineVersion: this.version,
      seed: this.seed,
      tick: this.tick,
      // The device layer's `dev`; the pending stage groups and a JSON-safe encoding (snapshot-codec.ts)
      state: encodeState({ st: this.st, queue: this.queue, mainsHz: this.mainsHz, dev: this.dev, groups: [...this.groupTicks].filter(([, at]) => at > this.tick) }),
    };
  }
  restore(s: PatientSnapshot): void {
    if (s.schema !== 'pme-snapshot/1') throw new Error(`unknown snapshot schema ${String(s.schema)}`);
    // Exact replay is promised only on the same build and the same filter design.
    if (s.engineVersion !== this.version) throw new Error(`snapshot is from engine version ${s.engineVersion}, this is ${this.version}`);
    const data = decodeState(s.state) as { st: PipelineState; queue: Array<{ cmd: Command; tick: number }>; mainsHz?: number; dev?: DeviceState; groups?: Array<[string, number]> };
    data.st.pk ??= createPkState(pkPatientOf(undefined)); // Absent in older snapshots
    data.st.pkHooks ??= createHookState();
    data.st.endo ??= createEndoState(undefined, 70); // Absent in older snapshots
    data.st.endoHrF ??= 1;
    data.st.cond ??= { vasoResp: 1 };
    data.st.resp.temp = upgradeThermal(data.st.resp.temp); // Older snapshots' TempState → ThermalState
    if (!data.st.organs) {
      data.st.organs = createOrgansState(undefined, data.st.l1); // Absent in older snapshots
      rebaselineOrgans(data.st.organs, this.organsCtx(data.st));
    }
    data.st.blood ??= createBloodState(undefined); // Absent in older snapshots
    data.st.neuro ??= createNeuroState(undefined, this.seed); // Absent in older snapshots
    data.st.rng.ectopyHazard ??= seedStream(this.seed, 'ectopyHazard'); // E133's stream, absent in older snapshots
    if (data.mainsHz !== undefined && data.mainsHz !== this.mainsHz) {
      throw new Error(`snapshot was taken with ${data.mainsHz} Hz mains filtering, this engine uses ${this.mainsHz} Hz`);
    }
    data.st.hemo.circ.svRest ??= data.st.hemo.circ.ref.sv; // a snapshot without SV₀ keeps the reference it was drawn with
    this.st = data.st;
    this.queue = data.queue;
    this.groupTicks = new Map(data.groups ?? []); // The bookmark's pending groups, never the discarded future's
    this.dev = data.dev ?? createDevice(this.devOpts?.skin, this.devOpts?.ageBand);
    this.syncCo2Sampler();
    this.tick = s.tick;
    this.syncLaneBuffers();
    this.syncHemoBuffers();
    this.syncRespBuffers();
    this.syncOrganBuffers();
    if (!this.st.eeg) this.bufs.delete('eeg'); // EEG off in the bookmark: no channel
    for (const b of this.bufs.values()) b.clear(); // The discarded timeline's samples are not history
    const simT = this.now().simT;
    this.emit({ type: 'toneCancel', after: simT }); // a different timeline: every tone after now is void
    this.posted.clear();
    this.committedDet = [];
    this.dirtyFromN = Number.POSITIVE_INFINITY;
    this.speculate();
  }

  // --- internals -------------------------------------------------------------------------------
  private filter(mode: EcgFilterMode): Biquad[] {
    let f = this.sections.get(mode);
    if (!f) {
      f = designEcgFilter(mode, ECG_RATE, this.mainsHz);
      this.sections.set(mode, f);
    }
    return f;
  }

  /** `lookAhead` false: the run's last tick does not run the look-ahead either, so a run cut in pieces of which only the
   *  last looks ahead is the uncut run, operation for operation (brief 126: the main thread's fast-forward slices). */
  private runTicks(n: number, lookAhead = true): void {
    for (let i = 0; i < n; i++) this.tickOnce(lookAhead && i === n - 1);
  }

  private tickOnce(speculate: boolean): void {
    this.tick++;
    const simT = (this.tick * TICK_MS) / 1000;
    const firstN = this.st.n;
    while (this.queue.length > 0 && (this.queue[0] as { tick: number }).tick <= this.tick) {
      this.apply((this.queue.shift() as { cmd: Command }).cmd, simT);
      this.dirtyFromN = Math.min(this.dirtyFromN, firstN);
    }
    this.advance(this.st, this.tick * SAMPLES_PER_TICK);
    this.syncNeuro(simT); // Fasciculation artefact on the committed state
    const stp = this.st.hemo.stPatch; // Coronary ST hook through the existing modifiers, committed state only
    if (stp) {
      this.st.mods = mergeModifiers(this.st.mods, stp);
      this.st.hemo.stPatch = null;
      this.dirtyFromN = Math.min(this.dirtyFromN, this.st.n);
    }
    let maxPostedN = -1;
    for (const p of this.posted.values()) maxPostedN = Math.max(maxPostedN, p.n);
    for (const d of this.st.detections) if (this.dirtyFromN < Infinity || d.n <= maxPostedN) this.committedDet.push(d);
    for (const d of this.st.detections) deviceOnQrs(this.dev, d.r / ECG_RATE);
    this.st.detections.length = 0;
    const devOut: EngineEvent[] = [];
    for (const e of stepDevice(this.dev, this.deviceHost(simT), this.flush(simT), devOut)) this.emit(e);
    for (const e of devOut) this.emit(e);
    if (this.truthEvery > 0 && this.tick % this.truthEvery === 0) this.emit({ type: 'truth', t: simT, ...pruneTruth(this.st, this.dev) });
    if (speculate) this.speculate();
  }

  /**
   * Run a clone of the committed state L ahead: fills the look-ahead samples and posts QRS tones. Tone ids are the
   * detected R sample (`qrs-<r>`), so a tone is posted once. Tones whose detection lies after the first sample a
   * command regenerated (or after the committed frontier) are re-checked against the new detections; only those that
   * disappeared are revoked, by id.
   */
  private speculate(): void {
    const simT = this.now().simT;
    const spec = structuredClone({ ...this.st, eeg: undefined }); // the look-ahead pass skips the EEG, so it is not cloned
    this.advance(spec, (this.tick + this.lookTicks) * SAMPLES_PER_TICK, true);
    const fresh = new Map<string, Detection>();
    for (const d of this.committedDet) if (d.n >= this.dirtyFromN) fresh.set(toneId(d), d);
    for (const d of spec.detections) fresh.set(toneId(d), d);
    const uncertainFrom = Math.min(this.dirtyFromN, this.st.n);
    const stale: string[] = [];
    for (const [id, p] of this.posted) {
      if (p.n >= uncertainFrom && !fresh.has(id)) stale.push(id);
      else if (p.t < simT - 1) this.posted.delete(id); // safely played
    }
    if (stale.length > 0) {
      for (const id of stale) this.posted.delete(id);
      this.emit({ type: 'toneCancel', after: simT, ids: stale });
    }
    for (const [id, d] of fresh) {
      const refT = d.r / ECG_RATE;
      const t = refT + BEEP_DELAY_S;
      if (this.posted.has(id) || t < simT - LATE_TONE_POST_S) continue;
      this.posted.set(id, { t, n: d.n });
      this.emit({ type: 'tone', t, id, kind: 'qrs', freqHz: spo2PitchHz(this.st.resp.num.spo2.shown), refT }); // pitch(SpO2)
    }
    this.committedDet = [];
    this.dirtyFromN = Number.POSITIVE_INFINITY;
  }

  /** The PK/PD context read from the other modules (duck-typed; neutral when a module is absent). */
  private pkCtx(ps: PipelineState): PkCtx {
    const circ = (ps.hemo as { circ?: CircModelState }).circ;
    const resp = ps.resp as unknown as { vaLpm?: number; pat?: { frcGaMl?: number; effKg?: number }; temp?: { tc?: number } };
    const blood = (ps as unknown as { blood?: { out?: { hbfRel?: number }; core?: { liver?: number; co0?: number; ab?: { ph?: number } } } }).blood;
    const organs = (ps as unknown as { organs?: { kidney?: { gfrRel?: number }; liver?: { liverFn?: number } } }).organs;
    const cond = (ps as unknown as { cond?: { vasoResp?: number } }).cond;
    return {
      ...NEUTRAL_PK_CTX,
      coLpm: circ ? circCardiacOutput(circ) : NEUTRAL_PK_CTX.coLpm,
      // The SETTLED resting output distFactor divides by — the blood model's latched co0 (the same reference its hbfRel
      // uses); `circ.ref.co` sits −9…+10 % from where rigs settle and would move propofol's distribution in every
      // healthy induction. co0 is in L/min (the blood model also STARTS it in L/min), so it is read as is — the old
      // gas-unit conversion gave a drug dosed after the first seconds q = CO/ref ≈ effKg/70 (a 16 kg child 0.20:
      // propofol's V1 and CL2/CL3 shrunk)
      ...(circ ? { coRefLpm: (blood?.core?.co0 ?? 0) > 0 ? (blood?.core?.co0 as number) : circ.ref.co } : {}),
      vaLpm: resp.vaLpm ?? NEUTRAL_PK_CTX.vaLpm,
      frcL: (resp.pat?.frcGaMl ?? 2100) / 1000,
      tempC: resp.temp?.tc ?? 37,
      ph: blood?.core?.ab?.ph ?? 7.4,
      hepFlow: blood?.out?.hbfRel ?? 1,
      hepFn: blood?.core?.liver ?? 1,
      hepFnTemp: blood?.core?.liver !== undefined && organs?.liver !== undefined, // The organ model's liverFn·tempF carries the temperature
      ...(organs?.liver?.liverFn !== undefined ? { liverFn: organs.liver.liverFn } : {}), // Without tempF: the CYP450 share's own slope
      renal: organs?.kidney?.gfrRel ?? 1,
      betaBlockC: circ?.prof.betaBlockC ?? 0,
      betaOcc: circ?.prof.betaOcc ?? 0, // The profile's own β-receptor occupancy
      betaNonSel: circ?.prof.betaNonSel ?? false,
      // The endocrine model's nociceptive catecholamine release (its previous 1 Hz pass — the drug model runs first in
      // the chain; the surge's 25 s onset τ makes the lag irrelevant). MODELED only: MANUAL's instructor owns the
      // pressures.
      ...(circ ? { endoCat: (ps as unknown as { endo?: { core?: { out?: { surgeCat?: { ne: number; epi: number } } } } }).endo?.core?.out?.surgeCat ?? { ne: 0, epi: 0 } } : {}),
      vasoResp: cond?.vasoResp ?? 1,
    };
  }

  /** What the organ pipeline reads (duck-typed state; absent modules are undefined). */
  private organsCtx(ps: PipelineState): OrgansCtx {
    const x = ps as unknown as { blood?: unknown; pk?: unknown; neuro?: unknown; endo?: unknown };
    return {
      l1: ps.l1, hemo: ps.hemo, resp: ps.resp, rhythm: ps.rhythm, blood: x.blood, pk: x.pk, neuro: x.neuro, endo: x.endo,
      hrNow: (t) => rampValue(ps.hr, t),
      setHr: (bpm, t) => {
        ps.hr = retarget(ps.hr, t, bpm, { durationS: 1 });
        holdRate(ps, ps.rhythm.pendingSwitch?.id ?? ps.rhythm.id, false); // An engine-initiated rate belongs to the reflex
      },
    };
  }

  /**
   * The resting run's step (REST_AVG_S): the three pipelines that set a resting stroke volume, in `advance`'s own
   * order and with its own contexts — the rhythm engine's beats, the breath driver (its pleural pressure) and the
   * haemodynamics with the MANUAL trackers or MODELED's reflexes. No ECG synthesis, drug, neuro, blood, endocrine or
   * organ step, and no samples written: at rest, unventilated and undrugged, those hold their t = 0 state (measured:
   * adding the blood, endocrine, organ, drug, neuro steps and the ECG synthesis back moves SV₀ by < 0.01 mL).
   */
  private restAdvance(ps: PipelineState, end: number): void {
    if (end < ps.n) return;
    planUntil(ps.rhythm, end / ECG_RATE + PLAN_LEAD_S, rhythmCtx(ps));
    ps.rhythm.events = pruneEvents(ps.rhythm.events, ps.n / ECG_RATE);
    ps.rhythm.fwaves = ps.rhythm.fwaves.filter((f) => f.end >= ps.n / ECG_RATE);
    const none = () => {};
    advanceResp(ps.resp, {
      l1: ps.l1, hemo: ps.hemo, rhythm: ps.rhythm, hr: ps.hr, blood: ps.blood.view, neuro: ps.neuro.resp, hco3: ps.blood.core.ab.hco3, cbfRel: ps.organs.brain.cbfRel,
      bronchoDil: ps.pk.bus.airway.bronchodilation, hpvInhibit: ps.pk.bus.hpvInhibit, anaphEndo: ps.endo.lungSev > 0, histamine: ps.pk.bus.airway.histamine,
    }, Math.floor(end / 8), none);
    const resp = ps.resp;
    advanceHemo(ps.hemo, {
      l1: ps.l1, hr: ps.hr, rhythm: ps.rhythm, rng: ps.rng, phi: ps.hrv.phi, u: (t) => respBreathU(resp, t), pIt: (t) => respPleural(resp, t),
      requestHr: (bpm) => {
        ps.hr = constantRamp(bpm);
      },
      ph: ps.blood.core.ab.ph,
    }, Math.floor(end / 4), none);
    ps.n = end + 1;
  }

  /**
   * Generate samples up to and including absolute ECG index `end` for pipeline state `ps`. `lookahead`: the
   * speculative pass (speculate()), which the EEG skips — it has no tone to post, so its samples are committed ones
   * only and the look-ahead costs it nothing.
   */
  private advance(ps: PipelineState, end: number, lookahead = false): void {
    if (end < ps.n) return;
    const ctx = rhythmCtx(ps);
    planUntil(ps.rhythm, end / ECG_RATE + PLAN_LEAD_S, ctx);
    ps.rhythm.events = pruneEvents(ps.rhythm.events, ps.n / ECG_RATE);
    ps.rhythm.fwaves = ps.rhythm.fwaves.filter((f) => f.end >= ps.n / ECG_RATE);
    const sections = this.filter(ps.filterMode);
    const bx = this.bufs.get('vcgX') as RingBuffer;
    const by = this.bufs.get('vcgY') as RingBuffer;
    const bz = this.bufs.get('vcgZ') as RingBuffer;
    const laneBufs = ps.lanes.map((l) => this.bufs.get(l) as RingBuffer);
    const pacePulses = tcpPulseAnnouncements(ps.rhythm.records, ps.n, end); // QRS detector pace blanking
    generateEcg(
      ecgGenInputs({ ...ps, breath: breathOf(ps) }, this.mainsHz),
      ps.n,
      end,
      (n, x, y, z) => {
        const pulse = pacePulses.get(n);
        if (pulse !== undefined) qrsPacePulse(ps.qrs, pulse);
        bx.write(n, x);
        by.write(n, y);
        bz.write(n, z);
        for (let i = 0; i < ps.lanes.length; i++) {
          const lead = ps.lanes[i] as LeadId;
          const v = filterSample(sections, ps.laneFilter[i] as number[], ecgFrontEnd(ps.mods, this.mainsHz, lead, n, projectLead(lead, x, y, z)));
          (laneBufs[i] as RingBuffer).write(n, v);
        }
        const det = qrsPaceGate(ps.qrs, ecgFrontEnd(ps.mods, this.mainsHz, DETECTION_LEAD, n, projectLead(DETECTION_LEAD, x, y, z)));
        const r = qrsStep(ps.qrs, filterSample(sections, ps.detFilter, det));
        if (r >= 0) {
          hrOnQrs(ps.hrm, r / ECG_RATE);
          ps.detections.push({ r, n });
        }
        if (n > 0 && n % ECG_RATE === 0) {
          const t = n / ECG_RATE;
          const hra = this.hrAveraging();
          // With the leads off the ECG measures nothing — HR is invalid ("-?-"), never a valid 0 — and the RR history is
          // dropped, so the beats after reconnection start a fresh average (no `HR 0<50` on reconnect)
          const off = ps.mods.artefact.leadOff;
          if (off) ps.hrm = createHrState(ps.hrm.method);
          // E126 (owner ruling 2026-10-26, the Saadat B9): in VF the monitor finds no QRS complexes, so once its VF analysis
          // stands (the VFIB alarm's VF_CONFIRM_S) the HR field is empty — no 8 s average left over, no count of
          // fibrillation waves (or compressions) — and the RR history restarts, keeping the last detection for asystole
          const vfSince = this.dev.inputs.vfSince;
          const vf = vfSince !== null && t - vfSince >= VF_CONFIRM_S;
          if (vf) ps.hrm = { ...createHrState(ps.hrm.method), lastR: ps.hrm.lastR };
          const hr = off || vf ? { value: null, flag: 'invalid' as const, at: t } : hrMeasure(ps.hrm, t, hra.avg, hra.method, this.dev.alarms.profile.arrhythmia.asystoleS);
          ps.out.push({ type: 'measurement', t, values: { hr } }); // The skin's averaging
        }
      },
    );
    advancePk(ps.pk, this.pkCtx(ps), end / ECG_RATE); // Drugs first, every consumer reads this instant's effects
    const circ7g = (ps.hemo as { circ?: CircModelState }).circ;
    if (circ7g) {
      circ7g.ext.drug = ps.pk.fx;
      circ7g.ext.betaBlockAdd = ps.pk.betaBlockAdd;
      circ7g.ext.betaAgonistU = betaVenousUnits(ps.pk.bus.agents);
      circ7g.ext.avNodeBlock = ps.pk.bus.avNodeBlock; // AF rate control
      circ7g.ext.histamine = ps.pk.bus.airway.histamine; // Histamine release acts on the circulation
      circ7g.ext.tempC = ps.resp.temp.tc; // Core temperature for the hypothermic (and hyperthermic) arrest hazard
    }
    // The hook needs to know whether the rhythm PERFUSES (the device host's own definition, plus the arrest state) and
    // the `outcome` stream for its hazards
    const pulseless7g = ps.rhythm.opts.pulseless === true || ((circ7g as { arrest?: unknown } | undefined)?.arrest ?? null) !== null;
    const req7g = rhythmRequest(ps.pk, ps.pkHooks, { id: ps.rhythm.id, pinned: false, pulseless: pulseless7g }, end / ECG_RATE, ps.rng.outcome); // The repeat-sux draw uses the `outcome` stream
    if (req7g) {
      // exactly as the engine's setRhythm and device paths: the rhythm clock restarts at the new rhythm's rate
      ps.hr = constantRamp(startRate(req7g.id, req7g.opts));
      holdRate(ps, req7g.id, req7g.hold ?? false); // An engine-initiated sinus rate belongs to the reflex (a vagal event's own rate is held)
      applyRhythm(ps.rhythm, req7g.id, req7g.opts, end / ECG_RATE, true, rhythmCtx(ps));
    }
    // The pacer's current joins the instructor's stimulus for this pass (the neuro and endocrine models read it), then
    // the held value is restored
    const tcpNox = tcpNoxious(ps.mods, ps.rhythm.tcpLastPulseT, end / ECG_RATE);
    const stimHeld = ps.neuro.stim;
    const noxHeld = ps.endo.noxious;
    if (tcpNox > 0) {
      const i = stimHeld.intensity + tcpNox;
      ps.neuro.stim = { intensity: i, level: Math.min(1, i / STIM_FULL) };
      ps.endo.noxious = noxHeld + tcpNox;
    }
    const src7f = ps.resp.driver.source; // Neuro step: after pk (reads ps.pk.bus), before the breath driver (its hook shapes the next breaths)
    const endo7f = (ps as unknown as { endo?: { core?: { out?: { neuroglycopenia?: number } }; cascade?: { macF?: number } } }).endo; // Endocrine seams, duck-typed (neutral without them)
    stepNeuroTo(ps.neuro, end / ECG_RATE, {
      tempC: ps.resp.temp.tc, mechanical: src7f === 'ventilator' || src7f === 'external' || src7f === 'bvm',
      neuroglycopenia: endo7f?.core?.out?.neuroglycopenia ?? 0, macF: endo7f?.cascade?.macF ?? 1,
      // The chemoreflex's committed rate is the respiratory-effort truth WHATEVER the ventilator is doing — the apnoeic
      // patient is the one being ventilated. MODELED only; `rr < 0` = not yet evaluated.
      spontRr: ps.l1.mode === 'modeled' && (ps.resp.spont?.rr ?? -1) >= 0 ? ps.resp.spont?.rr : undefined,
      mgMmolL: ps.blood.out.mg > 0 ? ps.blood.out.mg : undefined, iCaMmolL: ps.blood.out.iCa > 0 ? ps.blood.out.iCa : undefined, kMmolL: ps.blood.out.k > 0 ? ps.blood.out.k : undefined, // ONE Mg and Ca state (0 before the blood model's first step); the blood model's K beside them
    }, ps.pk.bus);
    advanceResp(ps.resp, {
      l1: ps.l1, hemo: ps.hemo, rhythm: ps.rhythm, hr: ps.hr, blood: ps.blood.view, neuro: ps.neuro.resp, hco3: ps.blood.core.ab.hco3, cbfRel: ps.organs.brain.cbfRel,
      bronchoDil: ps.pk.bus.airway.bronchodilation, hpvInhibit: ps.pk.bus.hpvInhibit, anaphEndo: ps.endo.lungSev > 0, // Drug PD outputs; endocrine anaphylaxis relief
      histamine: ps.pk.bus.airway.histamine, // The drug-driven bronchoconstriction
    }, Math.floor(end / 8), (ch, m, v) => this.respWrite(ch, m, v)); // Blood view; neuro, HCO3 for Winter's; the organs' CBF, one step late — organs advance after resp
    advanceBlood(ps.blood, { resp: ps.resp, hemo: ps.hemo, l1: ps.l1, pk: ps.pk, neuroProfile: ps.neuro.profile }, Math.floor(end / 8) / RESP_RATE); // After pk and resp, before hemo (the neuro model's profile)
    this.pushBloodEcg(ps); // K / QTc deltas into Modifiers
    const endoCtx = { l1: ps.l1, hemo: ps.hemo, resp: ps.resp, ps }; // Endocrine step: after blood, before organs and the haemodynamics
    advanceEndo(ps.endo, endoCtx, Math.floor(end / 8) / RESP_RATE); // 1 Hz steps; the drug model's doses every pass
    if (tcpNox > 0) {
      ps.neuro.stim = stimHeld; // The instructor's stimulus is the held state
      ps.endo.noxious = noxHeld;
    }
    ps.endoHrF = writeCirc(endoCtx, ps.endo); // MODELED → circ.ext.endo*; MANUAL → the rhythm-clock factor
    writeBlood(ps, ps.endo); // The endocrine model → the blood model (endogenous K, lab glucose, capillary leak)
    writeCond(ps, ps.endo); // The endocrine model → the drug model (ps.cond.vasoResp)
    writeLung(ps.resp, ps.endo); // The endocrine model → the lung model (lungCondition anaphylaxis)
    ps.mods = ecgDeltas(ps.endo, ps.resp.temp, ps.mods); // tempC / shivering deltas
    const resp = ps.resp;
    advanceOrgans(ps.organs, this.organsCtx(ps), Math.floor(end / 4), (ch, m, v) => this.organWrite(ch, m, v)); // After pk/resp/blood/endo, before the haemodynamics
    advanceHemo(
      ps.hemo,
      {
        l1: ps.l1, hr: ps.hr, rhythm: ps.rhythm, rng: ps.rng, phi: ps.hrv.phi, u: (t) => respBreathU(resp, t),
        pIt: (t) => respPleural(resp, t),
        requestHr: (bpm) => {
          ps.hr = constantRamp(bpm); // MODELED mode drives the rhythm engine's rate
        },
        requestRhythm: (id, opts) => {
          // The MODELED hypoxaemic arrest, applied exactly as the drug model's rhythm requests
          ps.hr = constantRamp(startRate(id, opts));
          holdRate(ps, id, false);
          applyRhythm(ps.rhythm, id, opts, end / ECG_RATE, true, rhythmCtx(ps));
        },
        requestEctopy: (n) => {
          ps.rhythm.physPvc ??= n; // One pending ectopic event; the planner places it after the next supraventricular beat
        },
        ph: ps.blood.core.ab.ph,
      },
      Math.floor(end / 4),
      (ch, m, v) => this.hemoWrite(ch, m, v),
    );
    // The EEG (only while on, committed pass only): after the neuro and organ steps, reading what they published
    if (ps.eeg && !lookahead) {
      const fresh: number[] = [];
      advanceEeg(ps.eeg, this.eegCtx(ps), Math.floor((end * EEG_RATE) / ECG_RATE), (m, v) => {
        this.eegWrite(m, v);
        fresh.push(v);
      });
      if (fresh.length > 0) this.readEeg(ps.eeg, fresh);
    }
    ps.n = end + 1;
  }

  /** Committed records whose time has come, in time order (returned for the device layer to see first). */
  private flush(simT: number): EngineEvent[] {
    const due: EngineEvent[] = [];
    const keep = (list: EngineEvent[]) =>
      list.filter((e) => {
        const t = (e as { t: number }).t;
        if (t <= simT) {
          due.push(e);
          return false;
        }
        return true;
      });
    this.st.rhythm.records = keep(this.st.rhythm.records);
    this.st.out = keep(this.st.out);
    this.st.hemo.out = keep(this.st.hemo.out);
    this.st.resp.out = keep(this.st.resp.out);
    this.st.blood.events = keep(this.st.blood.events);
    this.st.pk.out = keep(this.st.pk.out);
    this.st.neuro.out = keep(this.st.neuro.out);
    this.st.endo.out = keep(this.st.endo.out);
    this.st.organs.out = keep(this.st.organs.out);
    if (this.st.eeg) this.st.eeg.dev.out = keep(this.st.eeg.dev.out);
    due.sort((a, b) => (a as { t: number }).t - (b as { t: number }).t);
    for (const e of due) {
      if (e.type !== 'state') continue;
      e.sensors = sensorMap(this.st); // 1 Hz, built only here
      const dev = this.st.neuro.airway;
      e.breathing = { source: this.st.resp.driver.source, device: dev === 'auto' ? 'none' : dev }; // E121b
      e.signals = stateSignals(this.st, e.t); // scenario-format-v2 F4
      const g = this.st.eeg; // E12 (Q9): the EEG's switched settings, a copy
      if (g) e.eeg = { model: g.dev.model, impedanceKOhm: [...g.impedanceKOhm], ecgPickup: g.ecgPickup };
    }
    return due;
  }

  /** The committed state as the device layer sees it; its writes invalidate the look-ahead. */
  private deviceHost(simT: number): DeviceHost {
    const ps = this.st;
    const dirty = () => {
      this.dirtyFromN = Math.min(this.dirtyFromN, ps.n);
    };
    const bx = this.bufs.get('vcgX') as RingBuffer;
    const by = this.bufs.get('vcgY') as RingBuffer;
    const bz = this.bufs.get('vcgZ') as RingBuffer;
    return {
      simT,
      rhythmId: ps.rhythm.id,
      pulseless: ps.rhythm.opts.pulseless === true,
      spo2Probe: ps.hemo.pleth.state,
      leadsOff: ps.mods.artefact.leadOff,
      co2: ps.resp.co2Sensor,
      abp: ps.hemo.lines.abp.sensor === 'connected' && simT < ps.hemo.lines.abp.zeroUntil ? 'zeroing' : ps.hemo.lines.abp.sensor,
      temp: ps.resp.tempSensor,
      committedN: ps.n,
      vcgAt: (n) => {
        const x = bx.at(n);
        return Number.isNaN(x) ? null : [x, by.at(n), bz.at(n)];
      },
      outcomeRng: ps.rng.outcome,
      shockState: () => ({
        antiarrhythmicU: (ps.pk.bus as { rhythm?: { antiarrhythmicU?: number } }).rhythm?.antiarrhythmicU ?? 0,
        kEcg: (ps as unknown as { blood?: { out?: { kEcg?: number } } }).blood?.out?.kEcg,
        ph: (ps as unknown as { blood?: { core?: { ab?: { ph?: number } } } }).blood?.core?.ab?.ph,
        // DV amendment: the CONTINUOUS no-beat CoPP only (hemo/pipeline.ts `cppCont` → cor.cpp while no beat is read),
        // never a beat's aoDia − LVEDP, which an IABP's post-deflation dip distorts (research/20 DV-13d)
        cppMmHg: (() => {
          const c = (ps.hemo as unknown as { circ?: { cor?: { cpp?: number }; beats?: { t: number }[] } }).circ;
          const lb = c?.beats?.[c.beats.length - 1];
          return ps.rhythm.opts.pulseless === true || !lb || simT - lb.t > 3 ? c?.cor?.cpp : undefined;
        })(),
        arrestS: (() => {
          const a = (ps.hemo as unknown as { circ?: { arrest?: { t?: number } | null } }).circ?.arrest;
          return a && typeof a.t === 'number' ? Math.max(0, simT - a.t) : undefined;
        })(),
        tempC: (ps.resp as { temp?: { tc?: number } }).temp?.tc, // Core temperature (the arrest hazard reads the same)
      }), // Every field duck-typed — the blood, circulation, drug and respiratory models publish them all already
      l1: (v) => (v === 'hr' ? rampValue(ps.hr, simT) : l1Value(ps.l1, v as L1Var, simT)),
      setModifiers: (patch) => {
        ps.mods = mergeModifiers(ps.mods, patch);
        dirty();
      },
      setRhythm: (id, opts) => {
        ps.hr = constantRamp(startRate(id, opts));
        holdRate(ps, id, false); // Device outcomes (shock, ROSC) hand a sinus rate to the reflex
        applyRhythm(ps.rhythm, id, opts, simT, true, rhythmCtx(ps));
        dirty();
      },
      setHr: (value, ramp) => {
        ps.hr = retarget(ps.hr, simT, value, ramp);
        holdRate(ps, ps.rhythm.pendingSwitch?.id ?? ps.rhythm.id, false);
        dirty();
      },
      setL1: (v, value, ramp) => {
        if (v === 'hr') {
          ps.hr = retarget(ps.hr, simT, value, ramp);
          holdRate(ps, ps.rhythm.pendingSwitch?.id ?? ps.rhythm.id, false);
        } else setL1Target(ps.l1, v as L1Var, simT, value, ramp);
        dirty();
      },
    };
  }

  private emit(e: EngineEvent): void {
    for (const l of this.listeners) if (l.types === null || l.types.has(e.type)) l.fn(e);
  }

  private validate(cmd: Command): string | undefined {
    // Every numeric input is range-checked: a NaN or Infinity used to reach min(...) and the IIR/QRS state and freeze
    // or poison the pipeline for good.
    if (cmd.atTick !== undefined && !(Number.isInteger(cmd.atTick) && cmd.atTick >= 0)) return 'atTick must be a whole tick ≥ 0';
    const dev = validateDeviceCommand(this.dev, cmd);
    if (dev !== null) return dev;
    const pkV = validatePkCommand(cmd, this.st.pk); // Every library drug event is the drug model's — an error is final, ok = accepted
    if (pkV !== null) return pkV;
    const neuro = validateNeuroCommand(cmd); // After pk (the chain); null for every drug/vaporiser event
    if (neuro !== null) return neuro;
    const eeg = validateEegCommand(cmd, this.st.eeg !== undefined, EEG_MODEL_IDS); // `device eeg …` only (null otherwise)
    if (eeg !== null) return eeg;
    const organs = validateOrgansCommand(cmd); // After pk (and neuro), before blood/endo/resp — its own ids only (null otherwise)
    if (organs !== null) return organs;
    const blood = validateBloodCommand(cmd); // After pk — which owns `drug` — and before resp, whose `condition` rejects unknown ids
    if (blood !== null) return blood;
    const endo = validateEndoCommand(cmd); // After pk/neuro/organs/blood, before resp: its condition ids and `stimulus`
    if (endo !== null) return endo;
    const resp = validateRespCommand(cmd); // Before hemo: attachSensor co2/temp
    if (resp !== null) return resp;
    const hemo = validateHemoCommand(cmd, this.st.hemo);
    if (hemo !== null) return hemo;
    switch (cmd.type) {
      case 'setTarget':
        if (cmd.variable !== 'hr') return `setTarget ${cmd.variable} is not implemented until Stage 2`;
        if (!Number.isFinite(cmd.value) || cmd.value < 0 || cmd.value > 300) return 'hr must be 0–300 bpm';
        return rampReason(cmd.ramp);
      case 'setRhythm': {
        // `in` also finds 'toString', 'constructor' … on the prototype — accepted, then the rhythm engine threw
        if (typeof cmd.rhythm !== 'string' || !Object.hasOwn(RHYTHMS, cmd.rhythm)) return `unknown rhythm ${String(cmd.rhythm)}`;
        if (cmd.when !== undefined && cmd.when !== 'now' && cmd.when !== 'nextBeat') return 'when must be now or nextBeat';
        const o = cmd.opts ?? {};
        return (
          unknownKeys('opts', o, RHYTHM_OPT_KEYS) ?? // An unknown option is refused, not dropped (research/19 C12)
          unknownKeys('opts.pacer', o.pacer ?? {}, PACER_OPT_KEYS) ??
          // The pacer's numbers are numbers (a NaN rate was accepted and the next beat time became NaN)
          numReason('opts.pacer.ratePpm', o.pacer?.ratePpm, 30, 200) ??
          numReason('opts.pacer.avDelayMs', o.pacer?.avDelayMs, 50, 350) ??
          numReason('opts.pacer.faultRate', o.pacer?.faultRate, 0, 1) ??
          numReason('opts.rateBpm', o.rateBpm, 0, 300) ??
          numReason('opts.atrialRateBpm', o.atrialRateBpm, 20, 400) ??
          numReason('opts.prMs', o.prMs, 80, 600) ??
          (o.groupSize !== undefined && ![3, 4, 5, 6].includes(o.groupSize) ? 'opts.groupSize must be 3, 4, 5 or 6' : undefined) ??
          (o.ratio !== undefined && ![2, 3, 4, 'variable'].includes(o.ratio) ? "opts.ratio must be 2, 3, 4 or 'variable'" : undefined)
        );
      }
      case 'setModifiers': {
        // No modifier has a ramp consumer — a delayed or gradual change happened at once; refused, not ignored
        if (cmd.ramp !== undefined && ((cmd.ramp.durationS ?? 0) > 0 || (cmd.ramp.delayS ?? 0) > 0)) return 'setModifiers applies at once: a ramp (delayS, durationS) is not supported';
        return validateModifiers(cmd.modifiers) ?? rampReason(cmd.ramp);
      }
      case 'device': {
        const a = cmd.action;
        if (a.device !== 'ecg') return `device ${String(a.device)} is not implemented until later stages`;
        if (a.action === 'filter') return typeof a.value === 'string' && filterBand(a.value as EcgFilterMode) ? undefined : "filter must be monitor, diagnostic or 'band:<lo>-<hi>' (lo 0.01–10 Hz, hi 10–200 Hz)";
        if (a.action === 'lead') {
          if (!LEAD_IDS.includes(a.value as LeadId)) return 'lead must be a LeadId';
          return a.lane === 0 || a.lane === 1 || a.lane === 2 ? undefined : 'lane must be 0, 1 or 2';
        }
        return `ecg ${a.action} is not implemented until Stage 4`;
      }
      default:
        return `command type ${(cmd as { type: string }).type} is not implemented until later stages`;
    }
  }

  private apply(cmd: Command, simT: number): void {
    const ps = this.st;
    const setHr = (v: number, r?: Ramp) => {
      ps.hr = retarget(ps.hr, simT, v, r);
      holdRate(ps, ps.rhythm.pendingSwitch?.id ?? ps.rhythm.id, true); // The instructor's rate
    };
    const devOut: EngineEvent[] = [];
    if (applyDeviceCommand(this.dev, cmd, this.deviceHost(simT), devOut)) {
      this.syncCo2Sampler(); // A skin switch changes the sidestream module
      for (const e of devOut) this.emit(e);
      return;
    }
    if (cmd.type === 'device' && (cmd.action as { device: string }).device === 'eeg') {
      this.applyEeg(ps, cmd.action as EegDeviceAction);
      return;
    }
    const alias = obstructiveAlias(cmd); // One PE event, one tension-PTX source — both owners, before the chain
    if (alias) {
      applyRespCommand(ps.resp, ps.l1, alias.lung, simT);
      this.syncRespBuffers();
      if (alias.circ) {
        applyHemoCommand(ps.hemo, ps.l1, alias.circ, simT, setHr, ps.rng);
        this.syncHemoBuffers();
      }
      return;
    }
    if (applyPkCommand(ps.pk, cmd, simT)) return; // Consumes every drug/infusion/tci/vaporiser event
    if (applyNeuroCommand(ps.neuro, cmd, simT)) return; // Never a drug/vaporiser/stimulus event: the drug model consumed those, the endocrine model consumes stimulus
    if (applyOrgansCommand(ps.organs, cmd, simT)) {
      this.syncOrganBuffers();
      return;
    }
    if (applyBloodCommand(ps.blood, cmd, simT, ps.resp, { inr: ps.organs.liver.inr })) return; // a lab sample carries the liver's INR
    if (cmd.type === 'applyEvent' && (cmd.event as { kind: string }).kind === 'stimulus') {
      const sv = cmd.event as { intensity: number; site?: string }; // The circulation sees the vagal site before the endocrine model consumes the stimulus
      circVagalStimulus(ps.hemo.circ, sv.site, sv.intensity, simT);
    }
    if (applyEndoCommand(ps.endo, ps.resp, cmd, simT)) return; // After pk/neuro/organs/blood, before resp
    if (applyRespCommand(ps.resp, ps.l1, cmd, simT)) {
      this.syncRespBuffers();
      return;
    }
    // "Return to model" in MODELED mode (pin/release semantics only, no physiology). A hold moves the value's target
    // (SpO₂: the shunt is solved for it; HR: the instructor's rate is recorded); a release puts the pre-hold target
    // back and hands HR to the reflex again, so the model's own value returns.
    const modeled = ps.l1.mode === 'modeled';
    if (modeled && cmd.type === 'pin' && cmd.variable !== 'hr' && !ps.l1.pinned.includes(cmd.variable)) {
      (ps.l1.preHold ??= {})[cmd.variable as L1Var] = l1Target(ps.l1, cmd.variable as L1Var, simT);
      if (cmd.variable === 'spo2') ps.resp.seen.spo2 = Number.NaN; // a hold re-solves even at the value last held
    }
    if (modeled && cmd.type === 'release' && ps.l1.preHold) {
      for (const [v, x] of Object.entries(ps.l1.preHold) as [L1Var, number][]) {
        if (cmd.variable !== 'all' && cmd.variable !== v) continue;
        setL1Target(ps.l1, v, simT, x);
        delete ps.l1.preHold[v];
      }
    }
    const releasesHr = cmd.type === 'release' && (cmd.variable === 'hr' || cmd.variable === 'all');
    if (applyHemoCommand(ps.hemo, ps.l1, cmd, simT, setHr, ps.rng)) {
      if (modeled && releasesHr) holdRate(ps, ps.rhythm.pendingSwitch?.id ?? ps.rhythm.id, false); // E-S9-5: the reflex rate again
      // FX-10: a rate set in MANUAL is not an instructor's hold (in MANUAL every value is set): entering MODELED hands a
      // sinus-family rate to the reflex, as a rhythm set without a rate does. A focus keeps its own rate; a pin stays.
      if (!modeled && cmd.type === 'setMode' && cmd.mode === 'modeled' && !ps.l1.pinned.includes('hr')) holdRate(ps, ps.rhythm.pendingSwitch?.id ?? ps.rhythm.id, false);
      this.syncHemoBuffers();
      return;
    }
    switch (cmd.type) {
      case 'setTarget':
        ps.hr = retarget(ps.hr, simT, cmd.value, cmd.ramp);
        holdRate(ps, ps.rhythm.pendingSwitch?.id ?? ps.rhythm.id, true); // The instructor's rate
        return;
      case 'setRhythm': {
        const opts = cmd.opts ?? {};
        ps.hr = constantRamp(startRate(cmd.rhythm, opts));
        holdRate(ps, cmd.rhythm, opts.rateBpm !== undefined);
        const respect = cmd.respectRefractory ?? true;
        if (cmd.when === 'nextBeat') ps.rhythm.pendingSwitch = { id: cmd.rhythm, opts, respectRefractory: respect };
        else applyRhythm(ps.rhythm, cmd.rhythm, opts, simT, respect, rhythmCtx(ps));
        return;
      }
      case 'setModifiers': {
        ps.mods = mergeModifiers(ps.mods, cmd.modifiers);
        return;
      }
      case 'device': {
        const a = cmd.action;
        if (a.action === 'filter') {
          ps.filterMode = a.value as EcgFilterMode;
          ps.laneFilter = ps.lanes.map(() => createFilterState(this.filter(ps.filterMode)));
          ps.detFilter = createFilterState(this.filter(ps.filterMode));
        } else if (a.action === 'lead') {
          const lane = Math.min(a.lane as number, ps.lanes.length);
          ps.lanes[lane] = a.value as LeadId;
          ps.laneFilter[lane] = createFilterState(this.filter(ps.filterMode));
          this.syncLaneBuffers();
        }
        return;
      }
    }
  }

  /**
   * The succinylcholine fasciculation EMG artefact on the ECG modifiers, saved and restored on the committed state only
   * (the look-ahead is marked dirty). The neuro model touches no potassium (the blood model's) and no circulation (the
   * drug model's).
   */
  private syncNeuro(simT: number): void {
    const ps = this.st;
    const ns = ps.neuro;
    const fasc = fasciculating(ns, simT);
    if (fasc && ns.emgBase === null) {
      ns.emgBase = ps.mods.artefact.emg;
      ps.mods = mergeModifiers(ps.mods, { artefact: { emg: Math.max(ns.emgBase, 0.8) } });
      this.dirtyFromN = Math.min(this.dirtyFromN, ps.n);
    } else if (!fasc && ns.emgBase !== null) {
      ps.mods = mergeModifiers(ps.mods, { artefact: { emg: ns.emgBase } });
      ns.emgBase = null;
      this.dirtyFromN = Math.min(this.dirtyFromN, ps.n);
    }
  }

  /**
   * The capnograph's sidestream delay/rise come from the active skin (research 09 §5). So do the other device settings
   * a skin declares (SpO2 averaging/update, …), applied on creation, restore and skin switch.
   */
  private syncCo2Sampler(): void {
    const p = this.dev.alarms.profile;
    this.st.resp.sampler.side = { ...p.co2Sidestream };
    this.st.resp.num.spo2.avgS = p.spo2.averagingS;
    this.st.resp.num.spo2.updS = p.spo2.updateS;
    for (const wn of [this.st.hemo.num.abp, this.st.hemo.num.pap]) wn.staticDisplay = p.ibpStaticDisplay;
    for (const ls of [this.st.hemo.lines.abp, this.st.hemo.lines.cvp, this.st.hemo.lines.pap]) ls.fHz = p.ibpFilterHz;
    this.st.hemo.nibp.cfg = { ...p.nibp };
    if (p.apneaS !== null) this.st.resp.num.imp.apneaS = p.apneaS; // null (APNEA LIMIT OFF): the detector keeps its time, the alarm is off
    if (p.gasApneaS !== null) this.st.resp.num.co2.apneaS = p.gasApneaS;
  }

  /**
   * The active skin's optional `hr.averaging`, and its 12-RR method — philips-like's disclosed plain mean, the
   * IEC-default trimmed mean otherwise — cached per skin id (a skin switch picks them up).
   */
  private hrAvgCache: { skin: string; avg: HrAveraging | undefined; method: HrMethod } | null = null;
  private hrAveraging(): { avg: HrAveraging | undefined; method: HrMethod } {
    const skin = this.dev.alarms.profile.skin;
    if (this.hrAvgCache?.skin !== skin) {
      const r = resolveSkin(skin);
      this.hrAvgCache = { skin, avg: hrAveragingOf(r.skin), method: r.render.hrMethod.engine ?? 'dropMaxMin' };
    }
    return this.hrAvgCache;
  }

  /**
   * Push the CHANGE of the blood's ECG K (incl. succinylcholine, calcium stabilisation) and of its iCa QTc effect since
   * the last push into Modifiers — never overwrite an instructor's setModifiers value.
   */
  private pushBloodEcg(ps: PipelineState): void {
    const tg = bloodEcgTargets(ps.blood, (ps.pk.bus as { qtcMsAdd?: number }).qtcMsAdd ?? 0); // Ondansetron's QTc
    const a = ps.blood.ecg;
    if (Math.abs(tg.k - a.k) < 0.05 && Math.abs(tg.qtc - a.qtc) < 2) return;
    ps.mods = mergeModifiers(ps.mods, {
      k: Math.min(10, Math.max(1.5, ps.mods.k + tg.k - a.k)),
      qtc: Math.min(650, Math.max(300, ps.mods.qtc + tg.qtc - a.qtc)),
    });
    ps.blood.ecg = tg;
  }

  /** Make the lane buffers match the current lanes (new leads start empty). */
  private syncLaneBuffers(): void {
    const want = new Set<ChannelId>(this.st.lanes);
    for (const ch of [...this.bufs.keys()]) if (ECG_CHANNELS.has(ch) && !ch.startsWith('vcg') && !want.has(ch)) this.bufs.delete(ch);
    for (const ch of want) if (!this.bufs.has(ch)) this.bufs.set(ch, new RingBuffer(ECG_RATE, BUFFER_SECONDS));
  }

  /** Write one 125 Hz sample; the buffer is created on the first write (brief §3.5 ring buffers). */
  private hemoWrite(ch: HemoChannel | HemoTeachingChannel, m: number, v: number): void {
    let b = this.bufs.get(ch);
    if (!b) {
      b = new RingBuffer(HEMO_RATE, BUFFER_SECONDS);
      this.bufs.set(ch, b);
    }
    b.write(m, v);
  }

  /** Write one 62.5 Hz sample (co2, resp); the buffer is created on the first write. */
  private respWrite(ch: RespChannel, m: number, v: number): void {
    let b = this.bufs.get(ch);
    if (!b) {
      b = new RingBuffer(RESP_RATE, BUFFER_SECONDS);
      this.bufs.set(ch, b);
    }
    b.write(m, v);
  }

  /** Write one 125 Hz icp sample; the buffer is created on the first write. */
  private organWrite(ch: OrganChannel, m: number, v: number): void {
    let b = this.bufs.get(ch);
    if (!b) {
      b = new RingBuffer(ICP_RATE, BUFFER_SECONDS);
      this.bufs.set(ch, b);
    }
    b.write(m, v);
  }

  /** What the EEG reads (l2/eeg/pipeline.ts): the drug bus, the neuro and organ models' last published state, the ECG
   * model's artefact state and the heart's own VCG (for the ECG pickup). Read only. */
  private eegCtx(ps: PipelineState): EegCtx {
    const v = ps.organs.view;
    const bx = this.bufs.get('vcgX') as RingBuffer;
    const by = this.bufs.get('vcgY') as RingBuffer;
    const bz = this.bufs.get('vcgZ') as RingBuffer;
    const endo = (ps as unknown as { endo?: { cascade?: { macF?: number } } }).endo;
    return {
      bus: ps.pk.bus, ageY: ps.neuro.ageY, stimulus: ps.neuro.stim.level, antinoc: ps.neuro.antinoc, t1: ps.neuro.last.tof.t1,
      tube: ps.neuro.airway === 'ett', cbfRel: ps.organs.brain.cbfRel, hb: v?.hb ?? 14, sao2: v?.sao2 ?? 0.97, pao2: v?.pao2 ?? 95,
      tempC: ps.resp.temp.tc, macF: endo?.cascade?.macF ?? 1, art: ps.mods.artefact, mainsHz: this.mainsHz,
      ecgMvAt: (tS) => {
        const n = Math.round(tS * ECG_RATE);
        const a = projectLead('aVF', bx.at(n), by.at(n), bz.at(n));
        return Number.isFinite(a) ? a : 0;
      },
    };
  }

  /** `device eeg on|off` creates or drops the EEG state, its device and its channel; `model` starts the chosen device
   * afresh (a different instrument on the same electrodes); the other actions set the running EEG. */
  private applyEeg(ps: PipelineState, a: EegDeviceAction): void {
    if (a.action === 'on') {
      if (!ps.eeg) {
        const es = createEegState(this.seed, Math.ceil((ps.n * EEG_RATE) / ECG_RATE), this.eegCtx(ps));
        ps.eeg = { ...es, dev: newEegDev(EEG_DEFAULT_MODEL, es.m) };
      }
    } else if (a.action === 'off') {
      delete ps.eeg;
      this.bufs.delete('eeg');
    } else if (a.action === 'model') {
      if (ps.eeg && ps.eeg.dev.model !== a.value) ps.eeg.dev = newEegDev(a.value as EegModelId, ps.eeg.m);
    } else if (ps.eeg) applyEegSetting(ps.eeg, a);
  }

  /** Hand the device this pass's new samples; each reading becomes its numerics (a `measurement` with the device's own
   * ids, D6) and an `eegReading` (the display), stamped at the end of the samples it read. */
  private readEeg(es: EegState & { dev: EegDev }, fresh: number[]): void {
    const d = es.dev;
    const dev = EEG_DEVICES[d.model];
    for (const r of dev.read(d.st as never, fresh, es.impedanceKOhm) as EegReading[]) {
      const t = (d.m0 + r.n) / EEG_RATE;
      const values: Partial<Record<NumericId, Measured>> = {};
      for (const [id, v] of Object.entries(r.numerics)) {
        const flag = id === 'eegImp' ? (r.flags.questionable ? 'questionable' : 'valid') : r.flags.invalid ? 'invalid' : r.flags.questionable ? 'questionable' : 'valid';
        values[id as NumericId] = { value: v ?? null, flag, at: t };
      }
      d.out.push({ type: 'measurement', t, values });
      d.out.push({ type: 'eegReading', t, model: d.model, label: dev.spec.label, flags: r.flags, bands: r.bands, display: r.display });
    }
  }

  /** Write one EEG sample; the buffer is created on the first write. */
  private eegWrite(m: number, v: number): void {
    let b = this.bufs.get('eeg');
    if (!b) {
      b = new RingBuffer(EEG_RATE, BUFFER_SECONDS);
      this.bufs.set('eeg', b);
    }
    b.write(m, v);
  }

  /** The icp sensor 'off' has no trace. */
  private syncOrganBuffers(): void {
    if (!organChannelActive(this.st.organs, 'icp')) this.bufs.delete('icp');
  }

  /** The co2 sensor 'off' has no trace (brief §6.2). */
  private syncRespBuffers(): void {
    if (this.st.resp.co2Sensor === 'off') this.bufs.delete('co2');
  }

  /** A channel whose sensor is 'none' has no trace, so its buffer is dropped (brief §6.2). */
  private syncHemoBuffers(): void {
    for (const ch of HEMO_CHANNELS) if (!hemoChannelActive(this.st.hemo, ch)) this.bufs.delete(ch);
    if (!this.st.hemo.pvOn) for (const ch of HEMO_TEACHING) this.bufs.delete(ch);
  }
}

/** undefined, or a reason when `v` is present but not a finite number in [lo, hi]. */
/**
 * The RhythmOpts / PacerOpts keys (l2/ecg/api-types.ts; research/19 C12). `setRhythm` accepted any key and dropped the
 * unknown ones — `pacedVVI` with `{ fault, faultRate }` at the top level was accepted and did nothing (the fault
 * belongs under `opts.pacer`). Every key named here is read by the rhythm engine.
 */
const RHYTHM_OPT_KEYS: ReadonlySet<string> = new Set(['ratio', 'atrialRateBpm', 'prMs', 'groupSize', 'rateBpm', 'pulseless', 'pauseS', 'pauseEveryS', 'retroP', 'twistBeats', 'vfAmplitudeMv', 'autoAsystole', 'pacer']);
const PACER_OPT_KEYS: ReadonlySet<string> = new Set(['ratePpm', 'avDelayMs', 'fault', 'faultRate', 'intrinsic']);
function unknownKeys(name: string, o: object, known: ReadonlySet<string>): string | undefined {
  const bad = Object.keys(o).filter((k) => !known.has(k));
  return bad.length ? `${name}: unknown key${bad.length > 1 ? 's' : ''} ${bad.join(', ')} (known: ${[...known].join(', ')})` : undefined;
}

function numReason(name: string, v: number | undefined, lo: number, hi: number): string | undefined {
  if (v === undefined) return undefined;
  return Number.isFinite(v) && v >= lo && v <= hi ? undefined : `${name} must be a finite number in ${lo}–${hi}`;
}

function rampReason(r: Ramp | undefined): string | undefined {
  if (r === undefined) return undefined;
  if (r.curve !== undefined && !['linear', 'exp', 'sigmoid'].includes(r.curve)) return 'ramp.curve must be linear, exp or sigmoid';
  return numReason('ramp.durationS', r.durationS, 0, 86_400) ?? numReason('ramp.delayS', r.delayS, 0, 86_400);
}

export function createEngine(opts: EngineOptions = {}): MonitorEngine {
  return new Engine(opts);
}
