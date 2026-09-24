// The engine (brief §3.3 tick model, §7.1 API). One committed pipeline state advances with sim time;
// every tick a CLONE of it is run ahead by the look-ahead L (100 ms) to fill the ring buffers and to find
// QRS detections early enough to schedule beeps. A command changes the committed state, so the next
// look-ahead pass regenerates everything after "now" (look-ahead invalidation) and a toneCancel revokes
// tones already posted. All pipeline state is plain JSON-safe data (snapshot/restore, structuredClone).
import { Clock, TICK_MS } from './clock/clock.ts';
import { RingBuffer } from './buffers/ring.ts';
import { constantRamp, rampValue, retarget, type RampState } from './l1/ramp.ts';
import { ECG_RATE, generateVcg, pruneEvents } from './l2/ecg/generator.ts';
import { drawHrvPhase, type HrvPhase } from './l2/ecg/hrv.ts';
import { applyRhythm, createRhythmState, planUntil, type RhythmCtx, type RhythmState } from './l2/ecg/rhythm-engine.ts';
import { DEFAULT_FLUTTER_ATRIAL_BPM, RHYTHMS } from './l2/ecg/rhythms.ts';
import { projectLead } from './l2/ecg/vcg.ts';
import { createFilterState, designEcgFilter, filterSample, type Biquad } from './l3/ecg-filter.ts';
import { createHrState, hrMeasure, hrOnQrs, type HrState } from './l3/hr.ts';
import { createQrsState, qrsStep, type QrsState } from './l3/qrs.ts';
import { defaultModifiers } from './modifiers.ts';
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
import { version } from './version.ts';

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
const MOD_KEYS = new Set(['pvc', 'rsa', 'hrvScale', 'qtc', 'artefact']);

function rhythmCtx(ps: PipelineState): RhythmCtx {
  return { hrAt: (t) => rampValue(ps.hr, t), mods: ps.mods, rng: ps.rng, hrv: ps.hrv };
}

/** hr truth when a rhythm starts: RhythmOpts.rateBpm, else the rhythm default (flutter: atrial/ratio). */
function startRate(id: RhythmId, opts: RhythmOpts): number {
  if (opts.rateBpm !== undefined) return opts.rateBpm;
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

  constructor(opts: EngineOptions) {
    if (opts.mode === 'modeled') throw new Error('MODELED mode arrives in Stage 7');
    this.seed = (opts.seed ?? 1) >>> 0;
    const look = opts.lookaheadS ?? 0.1;
    this.lookTicks = Math.round((look * 1000) / TICK_MS);
    if (this.lookTicks < 1 || Math.abs(this.lookTicks * TICK_MS - look * 1000) > 1e-6) {
      throw new RangeError(`lookaheadS must be a positive multiple of 0.020 s, got ${look}`);
    }
    this.mainsHz = opts.device?.mainsHz ?? 50;
    const rng = createRngState(this.seed);
    const rhythmId = opts.patient?.rhythm?.id ?? 'sinus';
    const rhythmOpts = opts.patient?.rhythm?.opts ?? {};
    const hr0 = opts.patient?.baseline?.hr ?? startRate(rhythmId, rhythmOpts);
    const lanes = [...DEFAULT_LANES];
    const hr = constantRamp(hr0);
    const mods = defaultModifiers();
    const hrv = drawHrvPhase(rng.hrv);
    const ctx: RhythmCtx = { hrAt: (t) => rampValue(hr, t), mods, rng, hrv };
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
    };
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
    const tick = Math.max(cmd.atTick ?? this.tick + 1, this.tick + 1);
    if (reason) return { accepted: false, tick: this.tick, reason };
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
      state: structuredClone({ st: this.st, queue: this.queue }),
    };
  }
  restore(s: PatientSnapshot): void {
    if (s.schema !== 'pme-snapshot/1') throw new Error(`unknown snapshot schema ${String(s.schema)}`);
    const data = structuredClone(s.state) as { st: PipelineState; queue: Array<{ cmd: Command; tick: number }> };
    this.st = data.st;
    this.queue = data.queue;
    this.tick = s.tick;
    this.syncLaneBuffers();
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
    let maxPostedN = -1;
    for (const p of this.posted.values()) maxPostedN = Math.max(maxPostedN, p.n);
    for (const d of this.st.detections) if (this.dirtyFromN < Infinity || d.n <= maxPostedN) this.committedDet.push(d);
    this.st.detections.length = 0;
    this.flush(simT);
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
      this.emit({ type: 'tone', t, id, kind: 'qrs', freqHz: QRS_TONE_HZ, refT });
    }
    this.committedDet = [];
    this.dirtyFromN = Number.POSITIVE_INFINITY;
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
    generateVcg(
      { events: ps.rhythm.events, fwaves: ps.rhythm.fwaves, hrv: ps.hrv, noiseLevel: ps.mods.artefact.noise, noise: ps.rng.noise },
      ps.n,
      end,
      (n, x, y, z) => {
        bx.write(n, x);
        by.write(n, y);
        bz.write(n, z);
        for (let i = 0; i < ps.lanes.length; i++) {
          const v = filterSample(sections, ps.laneFilter[i] as number[], projectLead(ps.lanes[i] as LeadId, x, y, z));
          (laneBufs[i] as RingBuffer).write(n, v);
        }
        const r = qrsStep(ps.qrs, filterSample(sections, ps.detFilter, projectLead(DETECTION_LEAD, x, y, z)));
        if (r >= 0) {
          hrOnQrs(ps.hrm, r / ECG_RATE);
          ps.detections.push({ r, n });
        }
        if (n > 0 && n % ECG_RATE === 0) {
          const t = n / ECG_RATE;
          ps.out.push({ type: 'measurement', t, values: { hr: hrMeasure(ps.hrm, t) } });
        }
      },
    );
    ps.n = end + 1;
  }

  /** Emit committed records whose time has come, in time order. */
  private flush(simT: number): void {
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
    due.sort((a, b) => (a as { t: number }).t - (b as { t: number }).t);
    for (const e of due) this.emit(e);
  }

  private emit(e: EngineEvent): void {
    for (const l of this.listeners) if (l.types === null || l.types.has(e.type)) l.fn(e);
  }

  private validate(cmd: Command): string | undefined {
    // Every numeric input is range-checked: a NaN or Infinity used to reach min(...) and the IIR/QRS state and
    // freeze or poison the pipeline for good (review M5).
    if (cmd.atTick !== undefined && !(Number.isInteger(cmd.atTick) && cmd.atTick >= 0)) return 'atTick must be a whole tick ≥ 0';
    switch (cmd.type) {
      case 'setTarget':
        if (cmd.variable !== 'hr') return `setTarget ${cmd.variable} is not implemented until Stage 2`;
        if (!Number.isFinite(cmd.value) || cmd.value < 0 || cmd.value > 300) return 'hr must be 0–300 bpm';
        return rampReason(cmd.ramp);
      case 'setRhythm': {
        if (!(cmd.rhythm in RHYTHMS)) return `unknown rhythm ${String(cmd.rhythm)}`;
        if (cmd.when !== undefined && cmd.when !== 'now' && cmd.when !== 'nextBeat') return 'when must be now or nextBeat';
        const o = cmd.opts ?? {};
        return (
          numReason('opts.rateBpm', o.rateBpm, 0, 300) ??
          numReason('opts.atrialRateBpm', o.atrialRateBpm, 20, 400) ??
          numReason('opts.prMs', o.prMs, 80, 600) ??
          (o.groupSize !== undefined && ![3, 4, 5, 6].includes(o.groupSize) ? 'opts.groupSize must be 3, 4, 5 or 6' : undefined) ??
          (o.ratio !== undefined && ![2, 3, 4, 'variable'].includes(o.ratio) ? "opts.ratio must be 2, 3, 4 or 'variable'" : undefined)
        );
      }
      case 'setModifiers': {
        const m = cmd.modifiers;
        const bad = Object.keys(m).filter((k) => !MOD_KEYS.has(k));
        if (bad.length) return `modifiers not implemented until later stages: ${bad.join(', ')}`;
        const p = m.pvc;
        if (p && !(p.pattern === 'single' || p.pattern === 'bigeminy')) return 'pvc.pattern must be single or bigeminy in Stage 1';
        if (p && !(p.probability >= 0 && p.probability <= 0.9)) return 'pvc.probability must be 0–0.9';
        return (
          numReason('rsa', m.rsa, 0, 1) ??
          numReason('hrvScale', m.hrvScale, 0, 3) ??
          numReason('qtc', m.qtc, 300, 650) ??
          numReason('artefact.noise', m.artefact?.noise, 0, 10) ??
          rampReason(cmd.ramp)
        );
      }
      case 'device': {
        const a = cmd.action;
        if (a.device !== 'ecg') return `device ${String(a.device)} is not implemented until later stages`;
        if (a.action === 'filter') return a.value === 'monitor' || a.value === 'diagnostic' ? undefined : 'filter must be monitor or diagnostic';
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
    switch (cmd.type) {
      case 'setTarget':
        ps.hr = retarget(ps.hr, simT, cmd.value, cmd.ramp);
        return;
      case 'setRhythm': {
        const opts = cmd.opts ?? {};
        ps.hr = constantRamp(startRate(cmd.rhythm, opts));
        const respect = cmd.respectRefractory ?? true;
        if (cmd.when === 'nextBeat') ps.rhythm.pendingSwitch = { id: cmd.rhythm, opts, respectRefractory: respect };
        else applyRhythm(ps.rhythm, cmd.rhythm, opts, simT, respect, rhythmCtx(ps));
        return;
      }
      case 'setModifiers': {
        const m = cmd.modifiers;
        ps.mods = { ...ps.mods, ...m, artefact: { ...ps.mods.artefact, ...(m.artefact ?? {}) } };
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

  /** Make the lane buffers match the current lanes (new leads start empty). */
  private syncLaneBuffers(): void {
    const want = new Set<ChannelId>(this.st.lanes);
    for (const ch of [...this.bufs.keys()]) if (!ch.startsWith('vcg') && !want.has(ch)) this.bufs.delete(ch);
    for (const ch of want) if (!this.bufs.has(ch)) this.bufs.set(ch, new RingBuffer(ECG_RATE, BUFFER_SECONDS));
  }
}

/** undefined, or a reason when `v` is present but not a finite number in [lo, hi]. */
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
