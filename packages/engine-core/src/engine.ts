// The engine (brief §3.3 tick model, §7.1 API). One committed pipeline state advances with sim time;
// every tick a CLONE of it is run ahead by the look-ahead L (100 ms) to fill the ring buffers and to find
// QRS detections early enough to schedule beeps. A command changes the committed state, so the next
// look-ahead pass regenerates everything after "now" (look-ahead invalidation) and a toneCancel revokes
// tones already posted. All pipeline state is plain JSON-safe data (snapshot/restore, structuredClone).
import { Clock, TICK_MS } from './clock/clock.ts';
import { RingBuffer } from './buffers/ring.ts';
import { constantRamp, rampValue, retarget, type RampState } from './l1/ramp.ts';
import { ECG_RATE, pruneEvents } from './l2/ecg/generator.ts';
import { ecgFrontEnd, ecgGenInputs, generateEcg } from './l2/ecg/ecg-gen.ts';
import { drawHrvPhase, type HrvPhase } from './l2/ecg/hrv.ts';
import { applyRhythm, createRhythmState, planUntil, type RhythmCtx, type RhythmState } from './l2/ecg/rhythm-engine.ts';
import { DEFAULT_FLUTTER_ATRIAL_BPM, RHYTHMS } from './l2/ecg/rhythms.ts';
import { projectLead } from './l2/ecg/vcg.ts';
import { createFilterState, designEcgFilter, filterBand, filterSample, type Biquad } from './l3/ecg-filter.ts';
import { createHrState, hrAveragingOf, hrMeasure, hrOnQrs, type HrAveraging, type HrMethod, type HrState } from './l3/hr.ts';
import { resolveSkin } from '@pme/skins'; // FU-1 (E-4a-2): data-only dependency (R30)
import { createQrsState, PACE_LEAD_N, qrsPaceGate, qrsPacePulse, qrsStep, type QrsState } from './l3/qrs.ts';
import { defaultModifiers, mergeModifiers, validateModifiers } from './modifiers.ts';
import { createRngState, type Sfc32State, type StreamName } from './rng/sfc32.ts';
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
  type Modifiers,
  type MonitorEngine,
  type PatientSnapshot,
  type Ramp,
  type RhythmId,
  type RhythmOpts,
  type SimSeconds,
} from './types.ts';
import type { SensorId } from './types-hemo.ts'; // FU-8 (B2)
import { version } from './version.ts';
import { createL1State, l1Target, l1Value, setL1Target, type L1State, type L1Var } from './l1/state.ts'; // Stage 2 (Stage 4b: l1Value, setL1Target)
import {
  advanceHemo,
  applyHemoCommand,
  createHemoState,
  HEMO_CHANNELS,
  HEMO_TEACHING, // Stage 7a
  type HemoTeachingChannel, // Stage 7a
  hemoChannelActive,
  validateHemoCommand,
  type HemoChannel,
  type HemoState,
} from './l2/hemo/pipeline.ts'; // Stage 2
import { HEMO_RATE } from './l2/hemo/params.ts'; // Stage 2
import { applyDeviceCommand, createDevice, deviceOnQrs, stepDevice, validateDeviceCommand, type DeviceHost, type DeviceState } from './l3/device-layer.ts'; // Stage 4b
import {
  advanceResp,
  applyRespCommand,
  createRespState,
  respBreathU,
  respPleural, // Stage 7a
  RESP_RATE,
  validateRespCommand,
  type RespChannel,
  type RespState,
} from './l2/resp/pipeline.ts'; // Stage 3
import { advanceEndo, applyEndoCommand, createEndoState, validateEndoCommand, type EndoState } from './l2/endo/pipeline.ts'; // Stage 7e
import { ecgDeltas, writeBlood, writeCirc, writeCond, writeLung } from './l2/endo/adapters.ts'; // Stage 7e
import { upgradeThermal } from './l2/thermal/heat.ts'; // Stage 7e
import { gasPatient } from './l2/gas/params.ts'; // Stage 7e
import { SINUS_FAMILY } from './l2/circ/rate-rule.ts'; // FU-2's rate rule (NR-7g-5): only the sinus node takes the endocrine HR factor
import { advancePk, applyPkCommand, createPkState, NEUTRAL_PK_CTX, pkPatientOf, validatePkCommand, type PkCtx, type PkState } from './l2/pk/pipeline.ts'; // Stage 7g
import { createHookState, rhythmRequest, type RhythmHookState } from './l2/pk/hooks.ts'; // Stage 7g
import { obstructiveAlias } from './l2/circ/aliases.ts'; // FU-4 G6 (Task 11)
import { applyNeuroCommand, createNeuroState, fasciculating, STIM_FULL, stepNeuroTo, validateNeuroCommand, type NeuroState } from './l2/neuro/pipeline.ts'; // Stage 7f (FU-8 B5: STIM_FULL)
import { pcheOf } from './l2/neuro/bus.ts'; // Stage 7f
import { circCardiacOutput, circVagalStimulus, type CircModelState } from './l2/circ/model.ts'; // Stage 7g; FU-4 G7: the stimulus observer
import { heldRate } from './l2/circ/rate-rule.ts'; // FU-2
import { betaVenousUnits } from './l2/circ/venous.ts'; // FU-2
import { spo2PitchHz } from './l3/spo2/spo2.ts'; // Stage 3
import { advanceBlood, applyBloodCommand, bloodEcgTargets, createBloodState, validateBloodCommand, type BloodState } from './l2/blood/pipeline.ts'; // Stage 7c
import { cycleBreathClock, fixedBreathClock, type BreathClock } from './l2/ecg/breath-clock.ts'; // Stage 5.1 (R-S3-3)
import { lastCycleBefore } from './l2/resp/driver.ts'; // Stage 5.1 (R-S3-3)
import { advanceOrgans, applyOrgansCommand, createOrgansState, ICP_RATE, organChannelActive, rebaselineOrgans, validateOrgansCommand, type OrganChannel, type OrgansCtx, type OrgansState } from './l2/organs/pipeline.ts'; // Stage 7d
import { pruneTruth } from './truth.ts'; // Stage 7x (R52)

export const SAMPLES_PER_TICK = (ECG_RATE * TICK_MS) / 1000; // 10
export const BUFFER_SECONDS = 120; // brief §3.5
/** Tone at detected R + 30 ms (Gate 1 ruling R15 with the review's refinement; was 40 ms). */
export const BEEP_DELAY_S = 0.03;
/** A committed detection re-posted after a command is still worth a (late) beep this long after its tone time. */
const LATE_TONE_POST_S = 0.12;
export const QRS_TONE_HZ = 880; // fixed pitch until SpO2 exists (brief §3.6; Stage 3 adds pitch(SpO2))
const PLAN_LEAD_S = 0.15; // plan rhythm events this far beyond the last generated sample (kernel lead-in)
const DEFAULT_LANES: LeadId[] = ['ecgII', 'V5'];
/**
 * The primary (detection) lead: the QRS detector and HR run on lead II, monitor-filtered with its own filter state,
 * whatever lead lane 0 shows. Detecting on lane 0 kept thresholds learned on II after a switch to a small lead
 * (aVL: QRS ~23 %), so HR read 0 within 4 s, a false asystole (review M3) [ENG].
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
  l1: L1State; // Stage 2: PatientState targets and flags (brief §4.9)
  hemo: HemoState; // Stage 2: pressures, pleth, NIBP (brief §4.2–§4.5)
  resp: RespState; // Stage 3: breathing, gas exchange, SpO2/CO2/RR/temperature (brief §4.3–§4.7)
  endo: EndoState; // Stage 7e: stress hormones, glucose–insulin, thyroid, conditions (the heat model lives in resp.temp)
  endoHrF: number; // Stage 7e: HR factor on the rhythm clock in MANUAL (1 in MODELED: 7a takes circ.ext.endo*)
  cond: { vasoResp: number }; // Stage 7e → 7g (R51 addendum 16): catecholamine responsiveness, mirrors endo.core.out.vasoResp
  blood: BloodState; // Stage 7c: fluids, acid–base, electrolytes, O2 delivery, labs
  pk: PkState; // Stage 7g
  pkHooks: RhythmHookState; // Stage 7g
  neuro: NeuroState; // Stage 7f: NMB, depth, drive depression (R32)
  organs: OrgansState; // Stage 7d: brain, kidney, liver
}

/**
 * FU-8 (B2, R-S9-6): the sensor-state map the `state` event carries. The states live with four owners — the ECG front
 * end (the device layer's lead-off/motion artefact, `mods.artefact`), Stage 3 (co2, temp), the hemo pipeline (spo2,
 * nibp, the three lines, the teaching channels) and 7d (icp, pbto2, urometer) — and are read here, where all four are
 * visible; no new state. Values are the `attachSensor` state strings.
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
 * FU-8 (B5, research/20 DV-08c, gap V6): transcutaneous pacing is painful. The pacer's output current is a nociceptive
 * input on 7e's stimulus scale — none up to TCP_PAIN_MA_0, rising linearly to TCP_PAIN_MAX ("laryngoscopy-grade", 7e's
 * 1.5) at TCP_PAIN_MA_FULL and above [ENG; research/20 V6's smallest mechanism, fit target: an awake patient paced at
 * 50–100 mA needs analgesia/sedation (ERC 2021 ALS)]. It is ADDED to the instructor's held stimulus through the one
 * `stimulus` shape (R51 addenda 12/17) for the duration of each pass, so 7e's catecholamines and 7f's arousal answer it and
 * antinociception (opioid, hypnotic) removes it; no new effector, no new state.
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

/** Stage 5.1 (R-S3-3): the ECG's RSA, wander and QRS modulation follow Stage 3's breath driver. */
function breathOf(ps: PipelineState): BreathClock {
  return cycleBreathClock((t) => lastCycleBefore(ps.resp.driver, t), fixedBreathClock(ps.hrv));
}

/** FU-1 (R-51-3): transcutaneous pacing pulses to announce to the QRS detector while generating samples
 * [from, to]: key = the sample at which to announce (PACE_LEAD_N early), value = the pulse's sample. */
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
  // Stage 7e: the endocrine/fever HR factor scales only the sinus node (FU-2 rate rule, NR-7g-5); exactly 1 at rest
  const endoF = SINUS_FAMILY.has(ps.rhythm.id) ? ps.endoHrF : 1;
  return {
    hrAt: (t) => rampValue(ps.hr, t) * endoF,
    pacerLowerAt: (t) => rampValue(ps.hemo.circ.hrSet ?? ps.hr, t), // FU-3 (Q-FU2-10): the held rate is a pacer's lower rate
    mods: ps.mods, rng: ps.rng, hrv: ps.hrv, breath: breathOf(ps), // Stage 5.1: breath
  };
}

/** FU-2 (NR-7g-5): record the rate just written to ps.hr for MODELED mode's rate rule (explicit = the instructor's own rate). */
function holdRate(ps: PipelineState, rhythmId: string, explicit: boolean): void {
  ps.hemo.circ.hrSet = heldRate(rhythmId, explicit, ps.hr);
}

/** hr truth when a rhythm starts: RhythmOpts.rateBpm, else the rhythm default (flutter: atrial/ratio). */
function startRate(id: RhythmId, opts: RhythmOpts): number {
  if (opts.rateBpm !== undefined) return opts.rateBpm;
  if (opts.pacer?.ratePpm !== undefined && RHYTHMS[id].rateDrives === 'pacer') return opts.pacer.ratePpm; // FU-3: a programmed lower rate
  if (id === 'aflutter') {
    const r = opts.ratio ?? 2;
    return (opts.atrialRateBpm ?? DEFAULT_FLUTTER_ATRIAL_BPM) / (r === 'variable' ? 3 : r);
  }
  return RHYTHMS[id].defaultRateBpm;
}

class Engine implements MonitorEngine {
  readonly version = version;
  private readonly seed: number;
  private readonly lookTicks: number;
  private readonly mainsHz: 50 | 60;
  private st: PipelineState;
  private tick = 0;
  private queue: Array<{ cmd: Command; tick: number }> = [];
  private readonly listeners = new Set<Listener>();
  private readonly bufs = new Map<ChannelId, RingBuffer>();
  /** Tones posted to listeners, by id, until they are safely in the past (review H3: never re-post one). */
  private readonly posted = new Map<string, PostedTone>();
  /** Committed detections since the last speculation that might match or replace a posted tone. */
  private committedDet: Detection[] = [];
  /** First sample regenerated by a command since the last speculation (Infinity: none). */
  private dirtyFromN = Number.POSITIVE_INFINITY;
  private readonly clock = new Clock();
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastWall = 0;
  private readonly sections = new Map<EcgFilterMode, Biquad[]>();
  private readonly groupTicks = new Map<string, number>(); // Stage 2: stageGroup → tick (brief §4.9)
  private dev: DeviceState; // Stage 4b: alarms, defibrillator, pacer (brief §6.4–§6.5)
  private readonly devOpts: EngineOptions['device']; // Stage 4b: for restoring pre-4b snapshots
  private readonly truthEvery: number; // Stage 7x (R52): ticks between truth events, 0 = off

  constructor(opts: EngineOptions) {
    // Stage 7a: MODELED is accepted (the circulation's reflexes run)
    this.seed = (opts.seed ?? 1) >>> 0;
    const look = opts.lookaheadS ?? 0.1;
    this.lookTicks = Math.round((look * 1000) / TICK_MS);
    if (this.lookTicks < 1 || Math.abs(this.lookTicks * TICK_MS - look * 1000) > 1e-6) {
      throw new RangeError(`lookaheadS must be a positive multiple of 0.020 s, got ${look}`);
    }
    this.mainsHz = opts.device?.mainsHz ?? 50;
    this.devOpts = opts.device;
    const truthHz = opts.truthHz ?? 0; // Stage 7x (R52)
    if (!(truthHz >= 0 && truthHz <= 2)) throw new RangeError(`truthHz must be 0–2, got ${truthHz}`);
    this.truthEvery = truthHz > 0 ? Math.round(1000 / TICK_MS / truthHz) : 0;
    this.dev = createDevice(opts.device?.skin, opts.device?.ageBand); // Stage 4b (throws for an unknown skin)
    const rng = createRngState(this.seed);
    const rhythmId = opts.patient?.rhythm?.id ?? 'sinus';
    const rhythmOpts = opts.patient?.rhythm?.opts ?? {};
    const hr0 = opts.patient?.baseline?.hr ?? startRate(rhythmId, rhythmOpts);
    const lanes = [...DEFAULT_LANES];
    const hr = constantRamp(hr0);
    const mods = defaultModifiers();
    const hrv = drawHrvPhase(rng.hrv);
    const ctx: RhythmCtx = { hrAt: (t) => rampValue(hr, t), mods, rng, hrv };
    const l1 = createL1State(opts.patient); // Stage 2
    if (opts.mode === 'modeled') l1.mode = 'modeled'; // Stage 7a
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
      l1, // Stage 2
      hemo: createHemoState(opts.patient, l1, hr0), // Stage 2
      resp: createRespState(opts.patient, l1, this.seed), // Stage 3
      endo: createEndoState(opts.patient, gasPatient(opts.patient).effKg), // Stage 7e
      endoHrF: 1, // Stage 7e
      cond: { vasoResp: 1 }, // Stage 7e
      blood: createBloodState(opts.patient), // Stage 7c
      pk: createPkState({ ...pkPatientOf(opts.patient), pche: pcheOf(opts.patient) }), // Stage 7g (+7f: cholinesterase phenotype for 7g's PK, R51 addendum 10)
      pkHooks: createHookState(), // Stage 7g
      neuro: createNeuroState(opts.patient, this.seed), // Stage 7f
      organs: createOrgansState(opts.patient, l1), // Stage 7d
    };
    holdRate(this.st, rhythmId, rhythmOpts.rateBpm !== undefined); // FU-2
    rebaselineOrgans(this.st.organs, this.organsCtx(this.st)); // Stage 7d: calibrate on the pipelines' t = 0 truths
    this.syncCo2Sampler(); // R39-5
    for (const ch of ['vcgX', 'vcgY', 'vcgZ', ...lanes] as ChannelId[]) this.bufs.set(ch, new RingBuffer(ECG_RATE, BUFFER_SECONDS));
    this.advance(this.st, 0);
    this.st.detections.length = 0;
    this.speculate();
  }

  // --- lifecycle -------------------------------------------------------------------------------
  start(): void {
    if (this.timer !== null) return;
    this.lastWall = performance.now();
    this.timer = setInterval(() => {
      const now = performance.now();
      const n = this.clock.advance(now - this.lastWall);
      this.lastWall = now;
      this.runTicks(n);
    }, TICK_MS);
  }
  pause(): void {
    this.clock.pause();
  }
  resume(): void {
    this.clock.resume();
    this.lastWall = performance.now();
  }
  setTimeScale(k: number): void {
    this.clock.timeScale = k; // throws RangeError outside 0.25–4
  }
  step(ticks = 1): void {
    if (this.timer !== null && !this.clock.paused) return;
    this.runTicks(Math.max(0, Math.floor(ticks)));
  }
  advanceTo(simT: SimSeconds): void {
    const target = Math.floor(simT * (1000 / TICK_MS) + 1e-6);
    this.runTicks(target - this.tick);
  }
  now(): { tick: number; simT: SimSeconds } {
    return { tick: this.tick, simT: (this.tick * TICK_MS) / 1000 };
  }

  // --- commands and events ---------------------------------------------------------------------
  dispatch(cmd: Command): DispatchResult {
    const reason = this.validate(cmd);
    let tick = Math.max(cmd.atTick ?? this.tick + 1, this.tick + 1);
    if (reason) return { accepted: false, tick: this.tick, reason };
    if (cmd.stageGroup !== undefined) {
      // Stage 2: commands sharing a stageGroup apply on the same tick (brief §4.9 "stage then commit")
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
    return this.bufs.get(ch)?.read(fromIndex, out) ?? 0;
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
      state: structuredClone({ st: this.st, queue: this.queue, mainsHz: this.mainsHz, dev: this.dev }), // Stage 4b: dev
    };
  }
  restore(s: PatientSnapshot): void {
    if (s.schema !== 'pme-snapshot/1') throw new Error(`unknown snapshot schema ${String(s.schema)}`);
    // Exact replay is promised only on the same build and the same filter design (review L10).
    if (s.engineVersion !== this.version) throw new Error(`snapshot is from engine version ${s.engineVersion}, this is ${this.version}`);
    const data = structuredClone(s.state) as { st: PipelineState; queue: Array<{ cmd: Command; tick: number }>; mainsHz?: number; dev?: DeviceState };
    data.st.pk ??= createPkState(pkPatientOf(undefined)); // Stage 7g: pre-7g snapshots
    data.st.pkHooks ??= createHookState(); // Stage 7g
    data.st.endo ??= createEndoState(undefined, 70); // Stage 7e: pre-7e snapshots
    data.st.endoHrF ??= 1; // Stage 7e
    data.st.cond ??= { vasoResp: 1 }; // Stage 7e
    data.st.resp.temp = upgradeThermal(data.st.resp.temp); // Stage 7e: Stage 3's TempState → ThermalState
    if (!data.st.organs) {
      data.st.organs = createOrgansState(undefined, data.st.l1); // Stage 7d: pre-7d snapshots
      rebaselineOrgans(data.st.organs, this.organsCtx(data.st));
    }
    data.st.blood ??= createBloodState(undefined); // Stage 7c: pre-7c snapshots
    data.st.neuro ??= createNeuroState(undefined, this.seed); // Stage 7f: pre-7f snapshots
    if (data.mainsHz !== undefined && data.mainsHz !== this.mainsHz) {
      throw new Error(`snapshot was taken with ${data.mainsHz} Hz mains filtering, this engine uses ${this.mainsHz} Hz`);
    }
    this.st = data.st;
    this.queue = data.queue;
    this.dev = data.dev ?? createDevice(this.devOpts?.skin, this.devOpts?.ageBand); // Stage 4b
    this.syncCo2Sampler(); // R39-5
    this.tick = s.tick;
    this.syncLaneBuffers();
    this.syncHemoBuffers(); // Stage 2
    this.syncRespBuffers(); // Stage 3
    this.syncOrganBuffers(); // Stage 7d
    for (const b of this.bufs.values()) b.clear(); // the discarded timeline's samples are not history (review M4)
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

  private runTicks(n: number): void {
    for (let i = 0; i < n; i++) this.tickOnce(i === n - 1);
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
    this.syncNeuro(simT); // Stage 7f: fasciculation artefact on the committed state
    const stp = this.st.hemo.stPatch; // Stage 7a: coronary ST hook (R23) through the existing modifiers, committed state only
    if (stp) {
      this.st.mods = mergeModifiers(this.st.mods, stp);
      this.st.hemo.stPatch = null;
      this.dirtyFromN = Math.min(this.dirtyFromN, this.st.n);
    }
    let maxPostedN = -1;
    for (const p of this.posted.values()) maxPostedN = Math.max(maxPostedN, p.n);
    for (const d of this.st.detections) if (this.dirtyFromN < Infinity || d.n <= maxPostedN) this.committedDet.push(d);
    for (const d of this.st.detections) deviceOnQrs(this.dev, d.r / ECG_RATE); // Stage 4b
    this.st.detections.length = 0;
    const devOut: EngineEvent[] = []; // Stage 4b
    for (const e of stepDevice(this.dev, this.deviceHost(simT), this.flush(simT), devOut)) this.emit(e);
    for (const e of devOut) this.emit(e);
    if (this.truthEvery > 0 && this.tick % this.truthEvery === 0) this.emit({ type: 'truth', t: simT, ...pruneTruth(this.st, this.dev) }); // Stage 7x (R52)
    if (speculate) this.speculate();
  }

  /**
   * Run a clone of the committed state L ahead: fills the look-ahead samples and posts QRS tones.
   * Tone ids are the detected R sample (`qrs-<r>`), so a tone is posted once. Tones whose detection lies after
   * the first sample a command regenerated (or after the committed frontier) are re-checked against the new
   * detections; only those that disappeared are revoked, by id (review H3).
   */
  private speculate(): void {
    const simT = this.now().simT;
    const spec = structuredClone(this.st);
    this.advance(spec, (this.tick + this.lookTicks) * SAMPLES_PER_TICK);
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
      this.emit({ type: 'tone', t, id, kind: 'qrs', freqHz: spo2PitchHz(this.st.resp.num.spo2.shown), refT }); // Stage 3: pitch(SpO2)
    }
    this.committedDet = [];
    this.dirtyFromN = Number.POSITIVE_INFINITY;
  }

  /** Stage 7g: the PK/PD context read from the other modules (duck-typed; neutral when a module is absent). */
  private pkCtx(ps: PipelineState): PkCtx {
    const circ = (ps.hemo as { circ?: CircModelState }).circ;
    const resp = ps.resp as unknown as { vaLpm?: number; pat?: { frcGaMl?: number; effKg?: number }; temp?: { tc?: number } };
    const blood = (ps as unknown as { blood?: { out?: { hbfRel?: number }; core?: { liver?: number; co0?: number; ab?: { ph?: number } } } }).blood;
    const organs = (ps as unknown as { organs?: { kidney?: { gfrRel?: number }; liver?: unknown } }).organs;
    const cond = (ps as unknown as { cond?: { vasoResp?: number } }).cond;
    return {
      ...NEUTRAL_PK_CTX,
      coLpm: circ ? circCardiacOutput(circ) : NEUTRAL_PK_CTX.coLpm,
      // FU-4 G10 (review F12(1)): the SETTLED resting output distFactor divides by — 7c's latched co0 (the same reference
      // its hbfRel uses, R51 addendum 15 #5); `circ.ref.co` sits −9…+10 % from where rigs settle and would move propofol's
      // distribution in every healthy induction. FU-8 (A28; V.1 gate note §10 item 2): co0 is in L/min since FU-4 F4 (7c
      // now also STARTS it in L/min), so it is read as is — the old gas-unit conversion gave a drug dosed after the first
      // seconds q = CO/ref ≈ effKg/70 (a 16 kg child 0.20: propofol's V1 and CL2/CL3 shrunk)
      ...(circ ? { coRefLpm: (blood?.core?.co0 ?? 0) > 0 ? (blood?.core?.co0 as number) : circ.ref.co } : {}),
      vaLpm: resp.vaLpm ?? NEUTRAL_PK_CTX.vaLpm,
      frcL: (resp.pat?.frcGaMl ?? 2100) / 1000,
      tempC: resp.temp?.tc ?? 37,
      ph: blood?.core?.ab?.ph ?? 7.4,
      hepFlow: blood?.out?.hbfRel ?? 1,
      hepFn: blood?.core?.liver ?? 1,
      hepFnTemp: blood?.core?.liver !== undefined && organs?.liver !== undefined, // FU-2 item 9: 7d's liverFn·tempF carries the temperature
      renal: organs?.kidney?.gfrRel ?? 1,
      betaBlockC: circ?.prof.betaBlockC ?? 0,
      betaOcc: circ?.prof.betaOcc ?? 0, // FU-7 (addendum 21): the profile's own β-receptor occupancy
      betaNonSel: circ?.prof.betaNonSel ?? false,
      // FU-7 (R51 addendum 25): 7e's nociceptive catecholamine release (its previous 1 Hz pass — 7g runs first in the
      // chain; the surge's 25 s onset τ makes the lag irrelevant). MODELED only: MANUAL's instructor owns the pressures.
      ...(circ ? { endoCat: (ps as unknown as { endo?: { core?: { out?: { surgeCat?: { ne: number; epi: number } } } } }).endo?.core?.out?.surgeCat ?? { ne: 0, epi: 0 } } : {}),
      vasoResp: cond?.vasoResp ?? 1,
    };
  }

  /** Stage 7d: what the organ pipeline reads (duck-typed 7c/7e/7f/7g state; absent modules are undefined). */
  private organsCtx(ps: PipelineState): OrgansCtx {
    const x = ps as unknown as { blood?: unknown; pk?: unknown; neuro?: unknown; endo?: unknown };
    return {
      l1: ps.l1, hemo: ps.hemo, resp: ps.resp, rhythm: ps.rhythm, blood: x.blood, pk: x.pk, neuro: x.neuro, endo: x.endo,
      hrNow: (t) => rampValue(ps.hr, t),
      setHr: (bpm, t) => {
        ps.hr = retarget(ps.hr, t, bpm, { durationS: 1 });
        holdRate(ps, ps.rhythm.pendingSwitch?.id ?? ps.rhythm.id, false); // Stage 7d (G-FU2 sibling): an engine-initiated rate belongs to the reflex
      },
    };
  }

  /** Generate samples up to and including absolute ECG index `end` for pipeline state `ps`. */
  private advance(ps: PipelineState, end: number): void {
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
    const pacePulses = tcpPulseAnnouncements(ps.rhythm.records, ps.n, end); // FU-1 (R-51-3): QRS detector pace blanking
    generateEcg(
      ecgGenInputs({ ...ps, breath: breathOf(ps) }, this.mainsHz), // Stage 5.1 (R-S3-3)
      ps.n,
      end,
      (n, x, y, z) => {
        const pulse = pacePulses.get(n);
        if (pulse !== undefined) qrsPacePulse(ps.qrs, pulse); // FU-1 (R-51-3)
        bx.write(n, x);
        by.write(n, y);
        bz.write(n, z);
        for (let i = 0; i < ps.lanes.length; i++) {
          const lead = ps.lanes[i] as LeadId;
          const v = filterSample(sections, ps.laneFilter[i] as number[], ecgFrontEnd(ps.mods, this.mainsHz, lead, n, projectLead(lead, x, y, z)));
          (laneBufs[i] as RingBuffer).write(n, v);
        }
        const det = qrsPaceGate(ps.qrs, ecgFrontEnd(ps.mods, this.mainsHz, DETECTION_LEAD, n, projectLead(DETECTION_LEAD, x, y, z))); // FU-1 (R-51-3)
        const r = qrsStep(ps.qrs, filterSample(sections, ps.detFilter, det));
        if (r >= 0) {
          hrOnQrs(ps.hrm, r / ECG_RATE);
          ps.detections.push({ r, n });
        }
        if (n > 0 && n % ECG_RATE === 0) {
          const t = n / ECG_RATE;
          const hra = this.hrAveraging();
          // FU-5 (audit M3): with the leads off the ECG measures nothing — HR is invalid ("-?-"), never a valid 0 — and the
          // RR history is dropped, so the beats after reconnection start a fresh average (no `HR 0<50` on reconnect)
          const off = ps.mods.artefact.leadOff;
          if (off) ps.hrm = createHrState(ps.hrm.method);
          const hr = off ? { value: null, flag: 'invalid' as const, at: t } : hrMeasure(ps.hrm, t, hra.avg, hra.method, this.dev.alarms.profile.arrhythmia.asystoleS);
          ps.out.push({ type: 'measurement', t, values: { hr } }); // FU-1/FU-3: the skin's averaging
        }
      },
    );
    advancePk(ps.pk, this.pkCtx(ps), end / ECG_RATE); // Stage 7g: drugs first, every consumer reads this instant's effects
    const circ7g = (ps.hemo as { circ?: CircModelState }).circ; // Stage 7g
    if (circ7g) {
      circ7g.ext.drug = ps.pk.fx;
      circ7g.ext.betaBlockAdd = ps.pk.betaBlockAdd;
      circ7g.ext.betaAgonistU = betaVenousUnits(ps.pk.bus.agents); // FU-2 (NR-7g-2)
      circ7g.ext.avNodeBlock = ps.pk.bus.avNodeBlock; // FU-2 (AF rate control)
      circ7g.ext.histamine = ps.pk.bus.airway.histamine; // FU-7 (addendum 24 / audit D15): histamine release acts on 7a
      circ7g.ext.tempC = ps.resp.temp.tc; // FU-4 G12: core temperature for the hypothermic (and G8 hyperthermic) arrest hazard
    }
    // FU-7 (addendum 23; ruling 5): the hook needs to know whether the rhythm PERFUSES (the device host's own definition,
    // plus FU-4's arrest state) and the `outcome` stream for its hazards (FU-4 18f passes the same stream)
    const pulseless7g = ps.rhythm.opts.pulseless === true || ((circ7g as { arrest?: unknown } | undefined)?.arrest ?? null) !== null;
    const req7g = rhythmRequest(ps.pk, ps.pkHooks, { id: ps.rhythm.id, pinned: false, pulseless: pulseless7g }, end / ECG_RATE, ps.rng.outcome); // Stage 7g (FU-4 G7: the repeat-sux draw uses the `outcome` stream)
    if (req7g) {
      // exactly as the engine's setRhythm and device paths: the rhythm clock restarts at the new rhythm's rate
      ps.hr = constantRamp(startRate(req7g.id, req7g.opts));
      holdRate(ps, req7g.id, req7g.hold ?? false); // FU-2: an engine-initiated sinus rate belongs to the reflex (FU-4 G7: a vagal event's own rate is held)
      applyRhythm(ps.rhythm, req7g.id, req7g.opts, end / ECG_RATE, true, rhythmCtx(ps));
    }
    // FU-8 (B5): the pacer's current joins the instructor's stimulus for this pass (7f and 7e read it), then the held value is restored
    const tcpNox = tcpNoxious(ps.mods, ps.rhythm.tcpLastPulseT, end / ECG_RATE);
    const stimHeld = ps.neuro.stim;
    const noxHeld = ps.endo.noxious;
    if (tcpNox > 0) {
      const i = stimHeld.intensity + tcpNox;
      ps.neuro.stim = { intensity: i, level: Math.min(1, i / STIM_FULL) };
      ps.endo.noxious = noxHeld + tcpNox;
    }
    const src7f = ps.resp.driver.source; // Stage 7f: after 7g's pk (reads ps.pk.bus), before the breath driver (its hook shapes the next breaths)
    const endo7f = (ps as unknown as { endo?: { core?: { out?: { neuroglycopenia?: number } }; cascade?: { macF?: number } } }).endo; // Stage 7f: 7e seams, duck-typed (neutral without 7e)
    stepNeuroTo(ps.neuro, end / ECG_RATE, {
      tempC: ps.resp.temp.tc, mechanical: src7f === 'ventilator' || src7f === 'external' || src7f === 'bvm',
      neuroglycopenia: endo7f?.core?.out?.neuroglycopenia ?? 0, macF: endo7f?.cascade?.macF ?? 1,
      // FU-7 (D7; review F11): the chemoreflex's committed rate is the respiratory-effort truth WHATEVER the ventilator is
      // doing — the apnoeic patient is the one being ventilated. MODELED only; `rr < 0` = not yet evaluated.
      spontRr: ps.l1.mode === 'modeled' && (ps.resp.spont?.rr ?? -1) >= 0 ? ps.resp.spont?.rr : undefined,
      mgMmolL: ps.blood.out.mg > 0 ? ps.blood.out.mg : undefined, iCaMmolL: ps.blood.out.iCa > 0 ? ps.blood.out.iCa : undefined, kMmolL: ps.blood.out.k > 0 ? ps.blood.out.k : undefined, // FU-7 (addendum 24): ONE Mg and Ca state (0 before 7c's first step); FU-9 F10: 7c's K beside them
    }, ps.pk.bus);
    advanceResp(ps.resp, {
      l1: ps.l1, hemo: ps.hemo, rhythm: ps.rhythm, hr: ps.hr, blood: ps.blood.view, neuro: ps.neuro.resp, hco3: ps.blood.core.ab.hco3, cbfRel: ps.organs.brain.cbfRel,
      bronchoDil: ps.pk.bus.airway.bronchodilation, hpvInhibit: ps.pk.bus.hpvInhibit, anaphEndo: ps.endo.lungSev > 0, // FU-6 R2/R13 (E-FU6-6): 7g's PD outputs; 7e's own anaphylaxis relief
      histamine: ps.pk.bus.airway.histamine, // FU-7 (addendum 24, E-FU7-5): the drug-driven bronchoconstriction
    }, Math.floor(end / 8), (ch, m, v) => this.respWrite(ch, m, v)); // Stage 3 (7c: blood view; 7f: neuro, HCO3 for Winter's; FU-3 E-FU3-10: 7d's CBF, one step late — organs advance after resp)
    advanceBlood(ps.blood, { resp: ps.resp, hemo: ps.hemo, l1: ps.l1, pk: ps.pk, neuroProfile: ps.neuro.profile }, Math.floor(end / 8) / RESP_RATE); // Stage 7c: after pk and resp, before hemo (FU-7: 7f's profile, addendum 24)
    this.pushBloodEcg(ps); // Stage 7c: K / QTc deltas into Modifiers (plan decision 9)
    const endoCtx = { l1: ps.l1, hemo: ps.hemo, resp: ps.resp, ps }; // Stage 7e: after 7c's blood, before 7d's organs and the haemodynamics
    advanceEndo(ps.endo, endoCtx, Math.floor(end / 8) / RESP_RATE); // Stage 7e (1 Hz steps; 7g's doses every pass)
    if (tcpNox > 0) {
      ps.neuro.stim = stimHeld; // FU-8 (B5): the instructor's stimulus is the held state
      ps.endo.noxious = noxHeld;
    }
    ps.endoHrF = writeCirc(endoCtx, ps.endo); // Stage 7e: MODELED → circ.ext.endo*; MANUAL → the rhythm-clock factor
    writeBlood(ps, ps.endo); // Stage 7e → 7c (endogenous K, lab glucose, capillary leak)
    writeCond(ps, ps.endo); // Stage 7e → 7g (ps.cond.vasoResp)
    writeLung(ps.resp, ps.endo); // Stage 7e → 7b (lungCondition anaphylaxis)
    ps.mods = ecgDeltas(ps.endo, ps.resp.temp, ps.mods); // Stage 7e: tempC / shivering deltas
    const resp = ps.resp; // Stage 3
    advanceOrgans(ps.organs, this.organsCtx(ps), Math.floor(end / 4), (ch, m, v) => this.organWrite(ch, m, v)); // Stage 7d: after pk/resp/blood/endo, before the haemodynamics
    advanceHemo(
      ps.hemo,
      {
        l1: ps.l1, hr: ps.hr, rhythm: ps.rhythm, rng: ps.rng, phi: ps.hrv.phi, u: (t) => respBreathU(resp, t), // Stage 3: u
        pIt: (t) => respPleural(resp, t), // Stage 7a
        requestHr: (bpm) => {
          ps.hr = constantRamp(bpm); // Stage 7a: MODELED mode drives the rhythm engine's rate
        },
        requestRhythm: (id, opts) => {
          // FU-3 item 16: the MODELED hypoxaemic arrest, applied exactly as 7g's rhythm requests
          ps.hr = constantRamp(startRate(id, opts));
          holdRate(ps, id, false);
          applyRhythm(ps.rhythm, id, opts, end / ECG_RATE, true, rhythmCtx(ps));
        },
      },
      Math.floor(end / 4),
      (ch, m, v) => this.hemoWrite(ch, m, v),
    ); // Stage 2
    ps.n = end + 1;
  }

  /** Committed records whose time has come, in time order (Stage 4b: returned for the device layer to see first). */
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
    this.st.hemo.out = keep(this.st.hemo.out); // Stage 2
    this.st.resp.out = keep(this.st.resp.out); // Stage 3
    this.st.blood.events = keep(this.st.blood.events); // Stage 7c
    this.st.pk.out = keep(this.st.pk.out); // Stage 7g
    this.st.neuro.out = keep(this.st.neuro.out); // Stage 7f
    this.st.endo.out = keep(this.st.endo.out); // Stage 7e
    this.st.organs.out = keep(this.st.organs.out); // Stage 7d
    due.sort((a, b) => (a as { t: number }).t - (b as { t: number }).t);
    for (const e of due) if (e.type === 'state') e.sensors = sensorMap(this.st); // FU-8 (B2, R-S9-6): 1 Hz, built only here
    return due;
  }

  /** Stage 4b: the committed state as the device layer sees it; its writes invalidate the look-ahead. */
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
      co2: ps.resp.co2Sensor, // FU-5
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
        tempC: (ps.resp as { temp?: { tc?: number } }).temp?.tc, // DV amendment: core temperature (FU-4 G12 reads the same)
      }), // FU-7 (addendum 23): every field duck-typed — 7c, 7a/FU-4, 7g and Stage 3 all publish them already
      l1: (v) => (v === 'hr' ? rampValue(ps.hr, simT) : l1Value(ps.l1, v as L1Var, simT)),
      setModifiers: (patch) => {
        ps.mods = mergeModifiers(ps.mods, patch);
        dirty();
      },
      setRhythm: (id, opts) => {
        ps.hr = constantRamp(startRate(id, opts));
        holdRate(ps, id, false); // FU-2: device outcomes (shock, ROSC) hand a sinus rate to the reflex
        applyRhythm(ps.rhythm, id, opts, simT, true, rhythmCtx(ps));
        dirty();
      },
      setHr: (value, ramp) => {
        ps.hr = retarget(ps.hr, simT, value, ramp);
        holdRate(ps, ps.rhythm.pendingSwitch?.id ?? ps.rhythm.id, false); // FU-2
        dirty();
      },
      setL1: (v, value, ramp) => {
        if (v === 'hr') {
          ps.hr = retarget(ps.hr, simT, value, ramp);
          holdRate(ps, ps.rhythm.pendingSwitch?.id ?? ps.rhythm.id, false); // FU-2
        } else setL1Target(ps.l1, v as L1Var, simT, value, ramp);
        dirty();
      },
    };
  }

  private emit(e: EngineEvent): void {
    for (const l of this.listeners) if (l.types === null || l.types.has(e.type)) l.fn(e);
  }

  private validate(cmd: Command): string | undefined {
    // Every numeric input is range-checked: a NaN or Infinity used to reach min(...) and the IIR/QRS state and
    // freeze or poison the pipeline for good (review M5).
    if (cmd.atTick !== undefined && !(Number.isInteger(cmd.atTick) && cmd.atTick >= 0)) return 'atTick must be a whole tick ≥ 0';
    const dev = validateDeviceCommand(this.dev, cmd); // Stage 4b
    if (dev !== null) return dev;
    const pkV = validatePkCommand(cmd, this.st.pk); // Stage 7g: every library drug event is 7g's (R51 §3) — an error is final, ok = accepted
    if (pkV !== null) return pkV;
    const neuro = validateNeuroCommand(cmd); // Stage 7f (after 7g: R51 §3 chain; null for every drug/vaporiser event)
    if (neuro !== null) return neuro;
    const organs = validateOrgansCommand(cmd); // Stage 7d: after pk (and 7f's neuro), before blood/endo/Stage 3 — its own ids only (null otherwise)
    if (organs !== null) return organs;
    const blood = validateBloodCommand(cmd); // Stage 7c (after 7g — which owns `drug` — and before Stage 3, whose `condition` rejects unknown ids)
    if (blood !== null) return blood;
    const endo = validateEndoCommand(cmd); // Stage 7e (after 7g/7f/7d/7c, before Stage 3: its condition ids and `stimulus`)
    if (endo !== null) return endo;
    const resp = validateRespCommand(cmd); // Stage 3 (before Stage 2: attachSensor co2/temp)
    if (resp !== null) return resp;
    const hemo = validateHemoCommand(cmd, this.st.hemo); // Stage 2
    if (hemo !== null) return hemo;
    switch (cmd.type) {
      case 'setTarget':
        if (cmd.variable !== 'hr') return `setTarget ${cmd.variable} is not implemented until Stage 2`;
        if (!Number.isFinite(cmd.value) || cmd.value < 0 || cmd.value > 300) return 'hr must be 0–300 bpm';
        return rampReason(cmd.ramp);
      case 'setRhythm': {
        // FU-11 (F11): `in` also finds 'toString', 'constructor' … on the prototype — accepted, then the rhythm engine threw
        if (typeof cmd.rhythm !== 'string' || !Object.hasOwn(RHYTHMS, cmd.rhythm)) return `unknown rhythm ${String(cmd.rhythm)}`;
        if (cmd.when !== undefined && cmd.when !== 'now' && cmd.when !== 'nextBeat') return 'when must be now or nextBeat';
        const o = cmd.opts ?? {};
        return (
          unknownKeys('opts', o, RHYTHM_OPT_KEYS) ?? // FU-8 (research/19 C12): an unknown option is refused, not dropped
          unknownKeys('opts.pacer', o.pacer ?? {}, PACER_OPT_KEYS) ??
          // FU-11 (F11): the pacer's numbers are numbers (a NaN rate was accepted and the next beat time became NaN)
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
        // FU-11 (F13): no modifier has a ramp consumer — a delayed or gradual change happened at once; refused, not ignored
        if (cmd.ramp !== undefined && ((cmd.ramp.durationS ?? 0) > 0 || (cmd.ramp.delayS ?? 0) > 0)) return 'setModifiers applies at once: a ramp (delayS, durationS) is not supported';
        return validateModifiers(cmd.modifiers) ?? rampReason(cmd.ramp);
      }
      case 'device': {
        const a = cmd.action;
        if (a.device !== 'ecg') return `device ${String(a.device)} is not implemented until later stages`;
        if (a.action === 'filter') return typeof a.value === 'string' && filterBand(a.value as EcgFilterMode) ? undefined : "filter must be monitor, diagnostic or 'band:<lo>-<hi>' (lo 0.01–10 Hz, hi 10–200 Hz)"; // Stage 4b (E-4a-1)
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
      holdRate(ps, ps.rhythm.pendingSwitch?.id ?? ps.rhythm.id, true); // FU-2: the instructor's rate
    };
    const devOut: EngineEvent[] = []; // Stage 4b
    if (applyDeviceCommand(this.dev, cmd, this.deviceHost(simT), devOut)) {
      this.syncCo2Sampler(); // R39-5: a skin switch changes the sidestream module
      for (const e of devOut) this.emit(e);
      return;
    }
    const alias = obstructiveAlias(cmd); // FU-4 G6 (Task 11): one PE event, one tension-PTX source — both owners, before the chain
    if (alias) {
      applyRespCommand(ps.resp, ps.l1, alias.lung, simT);
      this.syncRespBuffers();
      if (alias.circ) {
        applyHemoCommand(ps.hemo, ps.l1, alias.circ, simT, setHr, ps.rng);
        this.syncHemoBuffers();
      }
      return;
    }
    if (applyPkCommand(ps.pk, cmd, simT)) return; // Stage 7g: consumes every drug/infusion/tci/vaporiser event (R51 §3)
    if (applyNeuroCommand(ps.neuro, cmd, simT)) return; // Stage 7f (never a drug/vaporiser/stimulus event: 7g consumed those, 7e consumes stimulus)
    if (applyOrgansCommand(ps.organs, cmd, simT)) {
      this.syncOrganBuffers(); // Stage 7d
      return;
    }
    if (applyBloodCommand(ps.blood, cmd, simT, ps.resp)) return; // Stage 7c
    if (cmd.type === 'applyEvent' && (cmd.event as { kind: string }).kind === 'stimulus') {
      const sv = cmd.event as { intensity: number; site?: string }; // FU-4 G7 (E-FU4-7): 7a observes the vagal site before 7e consumes the stimulus
      circVagalStimulus(ps.hemo.circ, sv.site, sv.intensity, simT);
    }
    if (applyEndoCommand(ps.endo, ps.resp, cmd, simT)) return; // Stage 7e (after 7g/7f/7d/7c, before Stage 3)
    if (applyRespCommand(ps.resp, ps.l1, cmd, simT)) {
      this.syncRespBuffers(); // Stage 3
      return;
    }
    // Stage 9 (E-S9-5): "Return to model" in MODELED mode (pin/release semantics only, no physiology). A hold moves
    // the value's target (SpO₂: the shunt is solved for it; HR: the instructor's rate is recorded); a release puts the
    // pre-hold target back and hands HR to the reflex again, so the model's own value returns.
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
      this.syncHemoBuffers(); // Stage 2
      return;
    }
    switch (cmd.type) {
      case 'setTarget':
        ps.hr = retarget(ps.hr, simT, cmd.value, cmd.ramp);
        holdRate(ps, ps.rhythm.pendingSwitch?.id ?? ps.rhythm.id, true); // FU-2: the instructor's rate
        return;
      case 'setRhythm': {
        const opts = cmd.opts ?? {};
        ps.hr = constantRamp(startRate(cmd.rhythm, opts));
        holdRate(ps, cmd.rhythm, opts.rateBpm !== undefined); // FU-2
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
   * Stage 7f: the succinylcholine fasciculation EMG artefact on the ECG modifiers, saved and restored on the committed
   * state only (the look-ahead is marked dirty). 7f touches no potassium (7c's, R51 §3/§6) and no circulation (7g's).
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
   * R39-5: the capnograph's sidestream delay/rise come from the active skin (research 09 §5). FU-5: so do the other
   * device settings a skin declares (SpO2 averaging/update, …), applied on creation, restore and skin switch.
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
   * FU-1 (E-4a-2): the active skin's optional `hr.averaging`, and (FU-3, Q-FU2-11) its 12-RR method — philips-like's
   * disclosed plain mean, the IEC-default trimmed mean otherwise — cached per skin id (a skin switch picks them up).
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
   * Stage 7c (plan decision 9): push the CHANGE of the blood's ECG K (incl. succinylcholine, calcium stabilisation) and
   * of its iCa QTc effect since the last push into Modifiers — never overwrite an instructor's setModifiers value.
   */
  private pushBloodEcg(ps: PipelineState): void {
    const tg = bloodEcgTargets(ps.blood, (ps.pk.bus as { qtcMsAdd?: number }).qtcMsAdd ?? 0); // FU-7 (addendum 24): ondansetron's QTc
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

  /** Stage 2: write one 125 Hz sample; the buffer is created on the first write (brief §3.5 ring buffers). */
  private hemoWrite(ch: HemoChannel | HemoTeachingChannel, m: number, v: number): void {
    let b = this.bufs.get(ch);
    if (!b) {
      b = new RingBuffer(HEMO_RATE, BUFFER_SECONDS);
      this.bufs.set(ch, b);
    }
    b.write(m, v);
  }

  /** Stage 3: write one 62.5 Hz sample (co2, resp); the buffer is created on the first write. */
  private respWrite(ch: RespChannel, m: number, v: number): void {
    let b = this.bufs.get(ch);
    if (!b) {
      b = new RingBuffer(RESP_RATE, BUFFER_SECONDS);
      this.bufs.set(ch, b);
    }
    b.write(m, v);
  }

  /** Stage 7d: write one 125 Hz icp sample; the buffer is created on the first write. */
  private organWrite(ch: OrganChannel, m: number, v: number): void {
    let b = this.bufs.get(ch);
    if (!b) {
      b = new RingBuffer(ICP_RATE, BUFFER_SECONDS);
      this.bufs.set(ch, b);
    }
    b.write(m, v);
  }

  /** Stage 7d: the icp sensor 'off' has no trace. */
  private syncOrganBuffers(): void {
    if (!organChannelActive(this.st.organs, 'icp')) this.bufs.delete('icp');
  }

  /** Stage 3: the co2 sensor 'off' has no trace (brief §6.2). */
  private syncRespBuffers(): void {
    if (this.st.resp.co2Sensor === 'off') this.bufs.delete('co2');
  }

  /** Stage 2: a channel whose sensor is 'none' has no trace, so its buffer is dropped (brief §6.2). */
  private syncHemoBuffers(): void {
    for (const ch of HEMO_CHANNELS) if (!hemoChannelActive(this.st.hemo, ch)) this.bufs.delete(ch);
    if (!this.st.hemo.pvOn) for (const ch of HEMO_TEACHING) this.bufs.delete(ch); // Stage 7a
  }
}

/** undefined, or a reason when `v` is present but not a finite number in [lo, hi]. */
/**
 * FU-8 (research/19 C12): the RhythmOpts / PacerOpts keys (l2/ecg/api-types.ts). `setRhythm` accepted any key and
 * dropped the unknown ones — `pacedVVI` with `{ fault, faultRate }` at the top level was accepted and did nothing (the
 * fault belongs under `opts.pacer`). Every key named here is read by the rhythm engine.
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
