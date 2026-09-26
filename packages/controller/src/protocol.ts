// Wire protocol v1 (brief §7.5, §3.7). One device (the host) owns the simulation: commands go in, events and
// low-rate state come out, snapshots serve late joiners. Raw samples never cross the wire — the types below
// have no field that can hold one, and guard.ts refuses any message that tries (typed arrays, long numeric runs).
import type {
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

/** Brief §7.2 `ClinicalEvent`, verbatim (drug ids stay strings until Stage 7 defines DrugId). */
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
      outcome?: string; // Stage 4b: `preselect` (the instructor's post-shock rhythm, engine-core DefibEvent)
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
 * Brief §7.2 Command variants that @pme/engine-core does not export yet (its Stage 1 union is a subset).
 * Shapes are copied verbatim from the brief; `doc` is `unknown` until Stage 6b defines ScenarioDoc.
 * When engine-core adds a variant, delete it here — the union below stays valid either way.
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

/** Brief §7.3 EngineEvent variants not yet in engine-core's Stage 1 union (verbatim shapes). */
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
    }
  | { type: 'scenario'; t: SimSeconds; stateId: string; transitionId?: string }
  | { type: 'commandApplied'; commandId: string; tick: Tick; resolved: unknown; ignored?: string[] };
/** Brief §7.3 `EngineEvent` as it travels on the wire. */
export type WireEvent = EngineEvent | ExtraEvent;
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
