// Wire protocol v1 (brief §7.5, §3.7). One device (the host) owns the simulation: commands go in, events and
// low-rate state come out, snapshots serve late joiners. Raw samples never cross the wire — the types below
// have no field that can hold one, and guard.ts refuses any message that tries (typed arrays, long numeric runs).
import type {
  AlarmEntry,
  Command,
  DispatchResult,
  EngineEvent,
  NumericId,
  PatientSnapshot,
  Ramp,
  RhythmId,
  SimSeconds,
  StateVar,
  Tick,
} from '@pme/engine-core';

export type Role = 'host' | 'controller' | 'viewer';
export type TransportKind = 'in-process' | 'postMessage' | 'broadcastChannel' | 'websocket' | 'webrtc';
export type TransportStatus = 'connecting' | 'open' | 'closed' | 'error';
export type ModelInput = 'hrFactor' | 'svrFactor' | 'contractilityFactor' | 'vo2Factor' | 'vco2Factor';
export type ControlFlag = 'modeled' | 'pinned' | 'ramping' | 'override';

type CommandBase = { id: string; issuedBy: string; atTick?: Tick; stageGroup?: string };

/** Brief §7.2 `ClinicalEvent`, verbatim (drug ids stay strings). */
export type ClinicalEvent =
  | {
      kind: 'drug'; drugId: string; dose: number; unit: 'mcg' | 'mg' | 'mcg/kg' | 'mg/kg' | 'mEq' | 'units' | 'mcg/kg/min';
      route: 'iv' | 'io' | 'im' | 'inh'; infusion?: boolean;
    }
  | { kind: 'fluid'; fluid: 'crystalloid' | 'colloid' | 'blood'; volumeMl: number; overS: number }
  | { kind: 'bleed'; rateMlPerMin?: number; volumeMl?: number; overS?: number }
  | {
      kind: 'airway'; state: 'patent' | 'obstructed' | 'apnoea' | 'disconnected' | 'oesophageal' | 'endobronchial' | 'bronchospasm';
      severity?: number;
    }
  | {
      kind: 'ventilation'; source: 'spontaneous' | 'bvm' | 'ventilator' | 'none'; rr?: number; vtMl?: number;
      fio2?: number; peep?: number; ie?: number;
    }
  | { kind: 'preoxygenate'; fio2: number; durationS: number }
  | { kind: 'cpr'; active: boolean; rate?: number; quality?: number; ventilation?: '30:2' | 'continuous' }
  | {
      kind: 'defib'; action: 'selectEnergy' | 'charge' | 'shock' | 'disarm' | 'syncOn' | 'syncOff' | 'preselect'; energyJ?: number;
      outcome?: string; // `preselect` (the instructor's post-shock rhythm, engine-core DefibEvent)
    }
  | { kind: 'pacer'; mode: 'off' | 'demand' | 'fixed'; ratePpm?: number; mA?: number; pause?: boolean }
  | {
      kind: 'line'; line: 'abp' | 'cvp' | 'pap';
      action: 'flush' | 'zero' | 'sample' | 'disconnect' | 'reconnect' | 'damp' | 'level' | 'wedge'; value?: number;
    }
  | { kind: 'surgical'; action: 'diathermy' | 'shiver' | 'motion'; on: boolean; durationS?: number }
  | { kind: 'condition'; id: 'anaphylaxis' | 'mh' | 'last' | 'tamponade' | 'tensionPtx' | 'pe'; severity: number };
export type SensorId = 'ecg' | 'spo2' | 'nibp' | 'abp' | 'cvp' | 'pap' | 'co2' | 'temp';

/**
 * Brief §7.2 Command variants that @pme/engine-core does not export yet (its union is a subset). Shapes are copied
 * verbatim from the brief; `doc` is `unknown` here (ScenarioDoc is the scenario runner's). When engine-core adds a
 * variant, delete it here — the union below stays valid either way.
 */
export type ExtraCommand = CommandBase &
  (
    | { type: 'pin'; variable: StateVar; value?: number; ramp?: Ramp }
    | { type: 'release'; variable: StateVar | 'all'; ramp?: Ramp }
    | { type: 'setFactor'; input: ModelInput; factor: number; ramp?: Ramp }
    | { type: 'setMode'; mode: 'manual' | 'modeled' }
    | {
        type: 'scenario';
        action: 'load' | 'goto' | 'trigger' | 'pause' | 'resume' | 'bookmark' | 'restoreBookmark';
        target?: string;
        doc?: unknown;
      }
    // `jump` = fast-forward `value` sim seconds (> 0, ≤ 600) as fast as the host's monitor runs; `step` is refused
    | { type: 'time'; action: 'pause' | 'resume' | 'scale' | 'step' | 'jump'; value?: number }
    | { type: 'applyEvent'; event: ClinicalEvent }
    | {
        type: 'attachSensor'; sensor: SensorId; state: string; site?: string; leadSet?: 3 | 5 | 12;
        sampling?: 'sidestream' | 'mainstream';
      }
  );
/** Brief §7.2 `Command` as it travels on the wire. */
export type WireCommand = Command | ExtraCommand;
export type TimeCommand = Extract<ExtraCommand, { type: 'time' }>;
export type ScenarioCommand = Extract<ExtraCommand, { type: 'scenario' }>;
/** applyEvent / attachSensor: the host passes them to the engine, which validates them (Stages 3, 4 and 7 model them). */
export type ClinicalCommand = Extract<ExtraCommand, { type: 'applyEvent' | 'attachSensor' }>;
export type ScenarioEvent = Extract<ExtraEvent, { type: 'scenario' }>;

/** Brief §7.3 EngineEvent variants not yet in engine-core's union (verbatim shapes). */
export type ExtraEvent =
  | { type: 'rhythmSegment'; t: SimSeconds; rhythm: RhythmId; seed: number; templateId?: string }
  | {
      type: 'breath'; t: SimSeconds; seq: number; kind: 'spont' | 'mech' | 'bvm' | 'gasp';
      tiS: number; teS: number; vtMl: number; etco2True: number;
    }
  | {
      type: 'marker'; t: SimSeconds; kind: 'paceSpike' | 'syncR' | 'shock' | 'chargeStart' | 'chargeReady' | 'disarm';
      data?: Record<string, number | boolean>;
    }
  | {
      type: 'nibp'; t: SimSeconds; phase: 'idle' | 'inflating' | 'deflating' | 'done' | 'failed'; cuffMmHg?: number;
      nextInS?: number; result?: { sys: number; dia: number; map: number; pr: number };
    }
  | {
      type: 'alarm'; t: SimSeconds; id: string; priority: 'high' | 'medium' | 'low'; category: 'physiological' | 'technical';
      state: 'raised' | 'cleared' | 'acked' | 'silenced' | 'paused'; text: string;
    }
  | {
      type: 'state'; t: SimSeconds; tick: Tick; mode: 'manual' | 'modeled';
      values: Partial<Record<StateVar, number>>; control: Partial<Record<StateVar, ControlFlag>>;
      rhythm?: { id: RhythmId; rateBpm: number }; // The engine's running rhythm (absent from a host-synthesised state)
    }
  | { type: 'scenario'; t: SimSeconds; stateId: string; transitionId?: string }
  | { type: 'commandApplied'; commandId: string; tick: Tick; resolved: unknown; ignored?: string[] }
  /** The host replaced its engine (patient restart, scenario load): sim time starts again at `t` on a new timeline.
   *  Within one timeline a peer's clock only moves forward; across this boundary it restarts (showcase hotfix). */
  | { type: 'timeline'; t: SimSeconds; tick: Tick; cause?: TimelineCause }
  /**
   * The host's fast-forward from `fromT` to `toT` began (`wallMs`: the wall time it is paced to), or ended at `t`
   * (`stopped`: why it ended early; `alarms`: every alarm raised during it, once, `ended` = no longer active at its end).
   */
  | { type: 'fastForward'; t: SimSeconds; tick: Tick; phase: 'start' | 'end'; fromT: SimSeconds; toT: SimSeconds; wallMs?: number; stopped?: string; alarms?: FastForwardAlarm[] }
  /**
   * The host's Ventilator view drives the patient (its frames reach same-browser viewers only): sent at most once a
   * second to every other transport while it does, so a phone on the relay knows it cannot follow.
   */
  | { type: 'cockpit'; t: SimSeconds; tick: Tick }
  /**
   * The instructor's monitor style, for a phone on the relay (the second screen has its own same-browser style channel).
   * Sent with every answer to a hello (`replay: true`: the relay routes it as the welcome) and at every change.
   * Presentation only.
   */
  | { type: 'style'; skin: string; theme: string; replay?: true };

/** An alarm raised during a fast-forward (it did not sound); `ended`: it came and went inside the span. */
export type FastForwardAlarm = AlarmEntry & { ended: boolean };
/** A fast-forward that ended, as a controller or a viewer keeps it (the banner and the monitor read it). */
export interface FastForwardDone {
  fromT: SimSeconds;
  toT: SimSeconds;
  endT: SimSeconds;
  stopped?: string;
  alarms: FastForwardAlarm[];
}
/** The `fastForward` end event as a FastForwardDone. */
export const fastForwardDone = (e: { t: SimSeconds; fromT: SimSeconds; toT: SimSeconds; stopped?: string; alarms?: FastForwardAlarm[] }): FastForwardDone => ({
  fromT: e.fromT, toT: e.toT, endT: e.t, ...(e.stopped ? { stopped: e.stopped } : {}), alarms: e.alarms ?? [],
});
/**
 * Why a timeline began. 'restart' (the default): a new engine — the scenario run ended with the old body. 'restore':
 * the same engine went back to a bookmark — the scenario run continues from the bookmark's state (the driver publishes
 * it). Either way every clock restarts at `t`.
 */
export type TimelineCause = 'restart' | 'restore';
/** Brief §7.3 `EngineEvent` as it travels on the wire. */
export type WireEvent = EngineEvent | ExtraEvent;

/**
 * The events a VIEWER uses — it runs its own engine from the host's snapshot, so it needs the clock anchor (`state`),
 * the beats it checks its own against, the commands it mirrors, the host's timeline and fast-forward (ViewerSync; the
 * follower page's liveness and pause read the same), the scenario's state (small, 1 Hz at most), the Ventilator view's
 * `cockpit` notice and the instructor's monitor `style`. The relay sends a viewer on the network only these (at ×8 the
 * rest — measurements, alarm and organ status its own engine computes — was 4/5 of a phone's traffic).
 */
export const VIEWER_EVENTS: ReadonlySet<WireEvent['type']> = new Set<WireEvent['type']>(['state', 'beat', 'commandApplied', 'timeline', 'fastForward', 'scenario', 'cockpit', 'style']);
export type StateEvent = Extract<ExtraEvent, { type: 'state' }>;
export type CommandAppliedEvent = Extract<ExtraEvent, { type: 'commandApplied' }>;

/**
 * What a host puts in `commandApplied.resolved` (this plan's definition; the brief leaves `resolved` open).
 * `command` carries `atTick` = the tick the host applies it on, so viewers can mirror it exactly.
 * `replay: true` marks the sticky display/time/bookmark commands a host re-sends before a snapshot.
 */
export interface AppliedResolution {
  command: WireCommand;
  replay?: boolean;
  /** Applied outside the session (the Ventilator view's link) and sent only so a viewer mirrors it; not a log line. */
  mirror?: boolean;
}

/** Brief §7.5, exactly. */
export type WireMessage = { v: 1; session: string; from: string; seq: number; sentAt: number } & (
  | { kind: 'hello'; role: Role }
  | { kind: 'command'; body: WireCommand }
  | { kind: 'ack'; commandId: string; accepted: boolean; tick: Tick; reason?: string }
  | { kind: 'event'; body: WireEvent[] } // batched per frame, never samples
  | { kind: 'snapshot'; body: PatientSnapshot }
);
export type WireKind = WireMessage['kind'];
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
/** A WireMessage without its envelope header (what callers build; a Stamper adds the header). */
export type WireBody = DistributiveOmit<WireMessage, 'v' | 'session' | 'from' | 'seq' | 'sentAt'>;
/** A command without id/issuedBy (ControllerSession fills them). */
export type CommandInput = DistributiveOmit<WireCommand, 'id' | 'issuedBy'> & { id?: string };

/** Brief §7.5, exactly. */
export interface Transport {
  readonly kind: TransportKind;
  send(m: WireMessage): void;
  onMessage(fn: (m: WireMessage) => void): () => void;
  onStatus(fn: (s: TransportStatus) => void): () => void;
  close(): void;
}
/** Every transport in this package also exposes its current status (onStatus replays it on subscribe). */
export interface ManagedTransport extends Transport {
  readonly status: TransportStatus;
  /**
   * Who else is there, when the link knows it (the relay's `peers` frame). Absent on links that cannot tell
   * (BroadcastChannel, in-process): a session then learns presence from the host's hello and its 1 Hz state.
   */
  onPresence?(fn: (p: { hostOnline: boolean }) => void): () => void;
}

export type AckResult = DispatchResult & { commandId: string; rttMs: number };
export type MeasuredMap = Partial<Record<NumericId, import('@pme/engine-core').Measured>>;

// --- session codes ------------------------------------------------------------------------------------------
/** 31 symbols: no 0/O, 1/I/L — unambiguous when read off a projector or typed on a phone [ENG]. */
export const SESSION_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const SESSION_CODE_RE = /^[A-HJKMNP-Z2-9]{6}$/;

/** A random 6-character session code (31^6 ≈ 8.9e8 codes). */
export function newSessionCode(randomValues: (a: Uint32Array) => Uint32Array = (a) => crypto.getRandomValues(a)): string {
  const r = randomValues(new Uint32Array(6));
  let s = '';
  for (let i = 0; i < 6; i++) s += SESSION_ALPHABET[(r[i] as number) % SESSION_ALPHABET.length];
  return s;
}

/** Upper-cases and strips spaces/dashes; returns null unless the result is a valid code. */
export function normalizeSessionCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[\s-]/g, '');
  return SESSION_CODE_RE.test(s) ? s : null;
}

/** A random peer id (per page load; seq numbers restart only with a new id). */
export function newPeerId(prefix: string): string {
  return `${prefix}-${newSessionCode().toLowerCase()}`;
}

// --- envelope stamping and sequence filtering ----------------------------------------------------------------
/** Wall clock used for sentAt: epoch milliseconds (comparable across windows of one machine). */
export const epochNow = (): number => performance.timeOrigin + performance.now();

export type Stamper = (body: WireBody) => WireMessage;
/** Adds {v, session, from, seq, sentAt}. seq starts at 1 and never restarts for this `from`. */
export function createStamper(session: string, from: string, now: () => number = epochNow): Stamper {
  let seq = 0;
  return (body) => ({ v: 1, session, from, seq: ++seq, sentAt: now(), ...body }) as WireMessage;
}

/**
 * Per-sender sequence filter. Transports are ordered, so a seq at or below the last one seen from the same
 * sender is a duplicate (a resend after reconnect, or the same message over two paths) and is dropped.
 * A jump (seq > last + 1) is accepted and counted as a gap; a viewer resyncs on a gap.
 */
export class SeqFilter {
  private readonly last = new Map<string, number>();
  duplicates = 0;
  gaps = 0;

  /** 'accept' | 'gap' (accepted, but messages were missed) | 'duplicate' (drop it). */
  check(m: Pick<WireMessage, 'from' | 'seq'>): 'accept' | 'gap' | 'duplicate' {
    const prev = this.last.get(m.from);
    if (prev !== undefined && m.seq <= prev) {
      this.duplicates++;
      return 'duplicate';
    }
    this.last.set(m.from, m.seq);
    if (prev !== undefined && m.seq > prev + 1) {
      this.gaps++;
      return 'gap';
    }
    return 'accept';
  }

  forget(from: string): void {
    this.last.delete(from);
  }
}
