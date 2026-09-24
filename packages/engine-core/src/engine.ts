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
  type RhythmId,
  type RhythmOpts,
  type SimSeconds,
} from './types.ts';
import { version } from './version.ts';

export const SAMPLES_PER_TICK = (ECG_RATE * TICK_MS) / 1000; // 10
export const BUFFER_SECONDS = 120; // brief §3.5
export const BEEP_DELAY_S = 0.04; // tone at detected R + 40 ms: "beep minus R is 20–60 ms" (BUILD-PLAN Stage 1) [ENG]
export const QRS_TONE_HZ = 880; // fixed pitch until SpO2 exists (brief §3.6; Stage 3 adds pitch(SpO2))
const PLAN_LEAD_S = 0.15; // plan rhythm events this far beyond the last generated sample (kernel lead-in)
const DEFAULT_LANES: LeadId[] = ['ecgII', 'V5'];

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
  qrs: QrsState;
  hrm: HrState;
  out: EngineEvent[]; // measurement events waiting for their time
  detections: number[]; // R times (s) found during this pass
}

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
  private lastToneT = -1;
  private toneSeq = 0;
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
      state: structuredClone({ st: this.st, queue: this.queue, toneSeq: this.toneSeq }),
    };
  }
  restore(s: PatientSnapshot): void {
    if (s.schema !== 'pme-snapshot/1') throw new Error(`unknown snapshot schema ${String(s.schema)}`);
    const data = structuredClone(s.state) as { st: PipelineState; queue: Array<{ cmd: Command; tick: number }>; toneSeq: number };
    this.st = data.st;
    this.queue = data.queue;
    this.toneSeq = data.toneSeq;
    this.tick = s.tick;
    this.syncLaneBuffers();
    const simT = this.now().simT;
    this.emit({ type: 'toneCancel', after: simT });
    this.lastToneT = simT;
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
    let changed = false;
    while (this.queue.length > 0 && (this.queue[0] as { tick: number }).tick <= this.tick) {
      this.apply((this.queue.shift() as { cmd: Command }).cmd, simT);
      changed = true;
    }
    this.advance(this.st, this.tick * SAMPLES_PER_TICK);
    this.st.detections.length = 0;
    this.flush(simT);
    if (changed) {
      this.emit({ type: 'toneCancel', after: simT });
      this.lastToneT = simT;
    }
    if (speculate) this.speculate();
  }

  /** Run a clone of the committed state L ahead: fills the look-ahead samples and posts QRS tones. */
  private speculate(): void {
    const spec = structuredClone(this.st);
    this.advance(spec, (this.tick + this.lookTicks) * SAMPLES_PER_TICK);
    for (const tR of spec.detections) {
      const t = tR + BEEP_DELAY_S;
      if (t <= this.lastToneT) continue;
      this.lastToneT = t;
      this.emit({ type: 'tone', t, id: `qrs-${++this.toneSeq}`, kind: 'qrs', freqHz: QRS_TONE_HZ });
    }
  }

  /** Generate samples up to and including absolute ECG index `end` for pipeline state `ps`. */
  private advance(ps: PipelineState, end: number): void {
    if (end < ps.n) return;
    const ctx = rhythmCtx(ps);
    planUntil(ps.rhythm, end / ECG_RATE + PLAN_LEAD_S, ctx);
    ps.rhythm.events = pruneEvents(ps.rhythm.events, ps.n / ECG_RATE);
    const sections = this.filter(ps.filterMode);
    const bx = this.bufs.get('vcgX') as RingBuffer;
    const by = this.bufs.get('vcgY') as RingBuffer;
    const bz = this.bufs.get('vcgZ') as RingBuffer;
    const laneBufs = ps.lanes.map((l) => this.bufs.get(l) as RingBuffer);
    generateVcg(
      { events: ps.rhythm.events, fwave: ps.rhythm.fwave, hrv: ps.hrv, noiseLevel: ps.mods.artefact.noise, noise: ps.rng.noise },
      ps.n,
      end,
      (n, x, y, z) => {
        bx.write(n, x);
        by.write(n, y);
        bz.write(n, z);
        for (let i = 0; i < ps.lanes.length; i++) {
          const v = filterSample(sections, ps.laneFilter[i] as number[], projectLead(ps.lanes[i] as LeadId, x, y, z));
          (laneBufs[i] as RingBuffer).write(n, v);
          if (i === 0) {
            const r = qrsStep(ps.qrs, v);
            if (r >= 0) {
              hrOnQrs(ps.hrm, r / ECG_RATE);
              ps.detections.push(r / ECG_RATE);
            }
          }
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
    switch (cmd.type) {
      case 'setTarget':
        if (cmd.variable !== 'hr') return `setTarget ${cmd.variable} is not implemented until Stage 2`;
        if (!Number.isFinite(cmd.value) || cmd.value < 0 || cmd.value > 300) return 'hr must be 0–300 bpm';
        if (cmd.ramp && !(cmd.ramp.durationS >= 0)) return 'ramp.durationS must be ≥ 0';
        return undefined;
      case 'setRhythm':
        return cmd.rhythm in RHYTHMS ? undefined : `unknown rhythm ${String(cmd.rhythm)}`;
      case 'setModifiers': {
        const bad = Object.keys(cmd.modifiers).filter((k) => !MOD_KEYS.has(k));
        if (bad.length) return `modifiers not implemented until later stages: ${bad.join(', ')}`;
        const p = cmd.modifiers.pvc;
        if (p && !(p.pattern === 'single' || p.pattern === 'bigeminy')) return 'pvc.pattern must be single or bigeminy in Stage 1';
        if (p && !(p.probability >= 0 && p.probability <= 0.9)) return 'pvc.probability must be 0–0.9';
        return undefined;
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

export function createEngine(opts: EngineOptions = {}): MonitorEngine {
  return new Engine(opts);
}
