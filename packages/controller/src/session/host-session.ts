// The host end of every transport (brief §3.7, R7): it owns the engine. Commands in → dispatch → ack; engine
// events out, batched per frame; a `state` event at 1 Hz; a snapshot for anyone who says hello.
import { MAX_TIME_SCALE, MIN_TIME_SCALE, type Command, type DispatchResult, type EngineEvent, type PatientSnapshot, type SimSeconds, type StateVar, type Tick } from '@pme/engine-core';
import {
  createStamper,
  instructorMay,
  LEARNER_ISSUED_BY,
  learnerDefibMay,
  learnerMay,
  newPeerId,
  SeqFilter,
  type AppliedResolution,
  type ControlFlag,
  type FastForwardAlarm,
  type ManagedTransport,
  type NoteEvent,
  type Role,
  type ScenarioCommand,
  type StateEvent,
  type TimeCommand,
  type TimelineCause,
  type VentLinkBody,
  type WireBody,
  type WireCommand,
  type WireEvent,
  type WireMessage,
} from '../protocol.ts';
import { bolusDrugOf, givenByOf, type DrugLock, lockReason, RecentGives } from './drug-lock.ts';
import type { Formulary } from '../formulary/types.ts';
import type { PrepRecord, StagedPrep } from '../scenario/types-v2.ts';
import {
  deliverPrep, infusePrep, instructorView, learnerView, prepRecord, PREPS_PER_DEVICE, setInfusion, stagePrep, stagedOf,
  type HostPrep, type InstructorPrepNews, type InstructorPrepView, type LearnerPrepNews, type PrepNewsKind, type Running, type Translated,
} from './preparations.ts';

/** What a host needs from the monitor it owns. Sync or async (a worker-backed monitor returns promises). */
export interface HostTarget {
  dispatch(cmd: Command): DispatchResult | Promise<DispatchResult>;
  snapshot(): PatientSnapshot | Promise<PatientSnapshot>;
  restore(s: PatientSnapshot): void | Promise<void>;
  on(fn: (e: EngineEvent) => void): () => void;
  now(): { tick: Tick; simT: SimSeconds };
  /** Remote equivalents of the lifecycle calls (brief §7.2 `time`): pause, resume, scale (0.25–8, the engine clock's range). */
  time(action: 'pause' | 'resume' | 'scale', value?: number): void;
  /**
   * Run `ticks` sim ticks now without drawing; resolve once their events reached the `on` listeners (fast-forward). The
   * monitor holds its clock from the first step to the `last`. Absent: this monitor cannot fast-forward.
   */
  fastForwardStep?(ticks: number, last: boolean): { tick: Tick; simT: SimSeconds } | Promise<{ tick: Tick; simT: SimSeconds }>;
  /**
   * R15: dispatch several commands in ONE engine task, in order (the worker-backed monitor: one message), so the engine
   * cannot run a tick between them and a stage group's commands land on its one tick. Absent: the host dispatches them
   * one by one, and a group can split when the engine passes its tick between two round trips.
   */
  dispatchGroup?(cmds: Command[]): DispatchResult[] | Promise<DispatchResult[]>;
}

/** What the scenario hook answers; `applied` replaces the command in commandApplied (e.g. a load with its doc). */
export type ScenarioHookResult = DispatchResult & { applied?: ScenarioCommand };
/**
 * The ScenarioDriver plugs in here. With a hook, EVERY scenario action (bookmarks included: they then hold the runner
 * state too) goes to it; without one, bookmarks are engine snapshots and the rest is rejected.
 */
export type ScenarioHook = (cmd: ScenarioCommand) => ScenarioHookResult | Promise<ScenarioHookResult>;

export interface HostSessionOptions {
  session: string;
  target: HostTarget;
  peerId?: string;
  wallNow?: () => number;
  /** Synthesised `state` period (brief §7.3: 1 Hz). 0 disables the timer (tests call emitState()). */
  stateIntervalMs?: number;
  scenario?: ScenarioHook;
  /** Extra events sent to a peer that says hello, after the sticky replays (the scenario's current state). */
  welcomeEvents?: () => WireEvent[];
  /** Latency instrumentation: called when a remote command has been dispatched. */
  onCommand?: (info: { commandId: string; from: string; receivedAt: number; tick: Tick; accepted: boolean }) => void;
  /**
   * The wall time a whole fast-forward takes at least, ms — paced so the room sees the clock run (the app:
   * FF_WALL_MS, ≈ 10 s). 0 (default): as fast as the monitor runs.
   */
  fastForwardWallMs?: number;
  /**
   * The fast-forward pacer's wait, read with `wallNow`, so a test drives the pace on a fake clock. Default: a real
   * `setTimeout`.
   */
  sleep?: (ms: number) => Promise<void>;
  /**
   * The instructor's PIN (plan instructor-peer-role.md §1), read at every instructor hello, so a change applies at once.
   * Absent or null (no PIN set, or an older app): every instructor is denied. Never logged, never sent.
   */
  instructorPin?: () => string | null;
  /** A `note` command (plan §6): the remote's judged objective or note, at the host's sim time `t`, with the run event
   *  it carries (`ev`, brief 52; undefined when none). Absent: refused. */
  onNote?: (t: SimSeconds, text: string, kind: 'note' | 'marker', ev?: NoteEvent) => void;
  /** How many instructor phones are granted (0 or 1: the newest takes over), called at every grant and revocation. */
  onInstructors?: (n: number) => void;
  /**
   * R8c (plan room-and-instruments.md): a link message from the GRANTED remote ventilator (a cockpit on another device,
   * signed in with the instructor's PIN), with its peer id. Absent: this app drives from no remote cockpit, and every
   * ventilator is denied. Nothing from an ungranted one ever reaches it.
   */
  onVent?: (from: string, body: VentLinkBody) => void;
  /** R8c: the granted ventilator changed — its id, or null when it was revoked, taken over by none, or left. */
  onVentilator?: (from: string | null) => void;
  /** The drugs a scenario command would give as a bolus (ScenarioDriver.triggerGives: a /1 step press's onEnter); a press
   *  while one is locked is refused `recent`, as a bolus is (drug-lock.ts). Absent: a scenario command gives none. */
  scenarioGives?: (cmd: ScenarioCommand) => string[];
  /**
   * The LEARNER PIN (plan learner-action-remote.md §4 D9, LQ1 ruled 9 November), read at every learner hello and every
   * learner command, so a change applies at once. It grants the `learner` role only; the instructor's PIN never grants it,
   * nor it the instructor's. Absent or null: every learner remote is denied. Never logged, never sent.
   */
  learnerPin?: () => string | null;
  /** L4: the formulary layer every preparation is made from (null while it loads). Absent or null: a `prep stage` is refused. */
  formulary?: () => Formulary | null;
  /** L4 (§6): a preparation as staged, for the scenario driver's record (ScenarioDriver.recordPreparation). */
  onPreparation?: (p: StagedPrep) => void;
  /**
   * B6 (plan scenario-builder.md §6, "To the next phase"): a token of the running /2 card's last phase entry (its id and
   * entry time, so two entries inside one step still differ), or null while no /2 card runs. Absent or null:
   * `fastForwardToNextPhase` is refused.
   */
  phaseMark?: () => string | null;
  /** L9: the name Room setup gave a learner's device key (null: none), on the instructor's copy of a preparation's news. */
  deviceName?: (key: string) => string | null;
}

/** What the host answers an instructor (the grant's reason, or the refused command's ack). */
export const INSTRUCTOR_REASONS = {
  noPhone: 'this computer does not take an instructor phone',
  wrongPin: 'wrong PIN',
  takenOver: 'taken over',
  pinChanged: 'the PIN was changed',
  notSignedIn: 'the instructor phone is not signed in',
  noNotes: 'this computer does not take notes from a remote',
} as const;
/** L4: what the host answers a learner remote (the grant's reason, or the refused command's ack). */
export const LEARNER_REASONS = {
  noRemote: 'this computer does not take a learner remote',
  noDevice: 'the learner remote names its device',
  /** Both PINs equal (the app keeps them apart; the host refuses rather than let one open the other's role). */
  samePins: "the learner PIN is the instructor's PIN: draw a new learner PIN",
  pinChanged: 'the learner PIN was changed',
  notSignedIn: 'the learner remote is not signed in',
  noFormulary: 'this computer has no formulary loaded yet',
  full: `this remote holds ${PREPS_PER_DEVICE} preparations: discard one first`,
} as const;
/** "01:15" for 75 s: the case clock as the app's screens write it (apps/demo ui.ts clock). */
const caseClock = (t: number): string => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
/** R8c: what the host answers a remote ventilator (with INSTRUCTOR_REASONS' wrong PIN, taken over, PIN changed). */
export const VENTILATOR_REASONS = {
  noVentilator: 'this computer does not take a remote ventilator',
  noCommands: 'a ventilator drives through its link, not with commands',
  /**
   * The hand-over contract (R8c/R8d): the cockpit fell silent and the engine's own ventilator took the patient, so that
   * socket id no longer drives; frames its browser held arrive late and are refused; the device signs in again on a
   * new socket, from the engine's settings then (a change made meanwhile is never undone by the old id).
   */
  silent: 'handed over: the ventilator was silent; sign in again',
} as const;
/** The span `instructorDenials()` counts over, ms (the Room page: "3 wrong PINs in the last minute"). */
export const DENIAL_WINDOW_MS = 60_000;
/**
 * The most wrong PINs the host remembers; the oldest go first. A second wall behind the relay's limit (20 hello
 * attempts per address per 60 s): a hello flood cannot grow host memory, and the Room page needs a count, not
 * every try — above 100 in a minute it says the same thing (review G1) [ENG: network].
 */
export const DENIAL_RECORD_MAX = 100;

/**
 * The PIN comparison: equal length, then the XOR of every char code folded into one value, so every candidate of the
 * PIN's length is read in full whichever digit differs first (constant time by construction, no early exit).
 */
export function samePin(candidate: string, pin: string): boolean {
  if (candidate.length !== pin.length || pin.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < pin.length; i++) diff |= candidate.charCodeAt(i) ^ pin.charCodeAt(i);
  return diff === 0;
}

/** A host-issued command waiting in a gathered stage group, with its caller's answer (R15). */
interface Gathered {
  cmd: WireCommand;
  resolve: (r: DispatchResult) => void;
}
/** An engine command (time and scenario commands are the host's own, never part of a group's one dispatch). */
const groupable = (c: WireCommand): boolean => c.type !== 'time' && c.type !== 'scenario';

/** Commands that share a stageGroup land on one tick this many ticks after the first arrives (60 ms) [ENG: network]. */
export const STAGE_LEAD_TICKS = 3;
const STAGE_GROUP_TTL_MS = 5000;
/**
 * R15: how long the host holds the items of a staged delivery (`batch`, n items) that have arrived while it waits for the
 * rest. The items leave the controller in one synchronous loop (StageBuffer.commit), so they arrive back to back; one
 * still missing after this is lost in transit (the controller resends it on its own), and the ones held are applied
 * without it rather than held longer. It bounds a delay only; no tick depends on it [ENG: network].
 */
export const BATCH_HOLD_MS = 500;
const SEEN_MAX = 500;
/** The ack of a command from a relay peer whose role a peer-left forgot and that has not said hello again. */
export const NO_HELLO = 'say hello first';
/** The most departed peer ids a transport remembers for NO_HELLO (a long class of reconnecting phones) [ENG: network]. */
const LEFT_MAX = 1000;
/**
 * A hidden-tab catch-up arrives as ONE batch, and the app's 1 Hz truth events are up to 27 KB each (200 events reached
 * 379 KB) — every wire message holds at most this much JSON and this many events, so it passes the receivers' 256 KB
 * budget (guard.ts) [ENG: network; half the budget].
 */
export const MESSAGE_BUDGET_BYTES = 128 * 1024;
export const EVENTS_PER_MESSAGE = 200;
/** Events that stay on the host: audio is scheduled locally by every monitor from its own engine. */
const LOCAL_ONLY = new Set<WireEvent['type']>(['tone', 'toneCancel']);
const TICK_S = 0.02;
/** A viewer that said hello this recently still gets the mirrored link commands (it re-hellos on every
 *  resync) [ENG: network]. */
const VIEWER_TTL_MS = 600_000;
/** While the Ventilator view drives the patient, a `cockpit` event goes to the network at most this often [ENG: network]. */
export const COCKPIT_EVENT_MS = 1000;
/**
 * A fast-forward runs in steps of this many ticks (0.5 s of sim); the host's scenario is polled after each and its
 * commands land before the next — finer than the app's own 100 ms wall poll at ×8 (0.8 s of sim) [ENG: network].
 */
export const FF_STEP_TICKS = 25;
/** The longest fast-forward the host accepts, s (the owner asked for 5 min) [ENG: network]. */
export const FF_MAX_S = 600;
/** The longest "To the next phase" (`fastForwardToNextPhase`), s: the plan's 30 min (scenario-builder.md §6) [ENG: ui]. */
export const FF_PHASE_MAX_S = 1800;
/** The end's `stopped` when "To the next phase" met its phase change. */
export const FF_PHASE_STOP = 'the next phase began';

type AckBody = Extract<WireBody, { kind: 'ack' }>;
/** The roles that sign in with the instructor's PIN, each in its own single place (P3; R8c). */
type SignsIn = 'instructor' | 'ventilator';
type Holder = { t: ManagedTransport; from: string; pin: string };
/** The ack's words when a fast-forward runs: a controller's command waits for nothing. */
const FF_REFUSAL = 'the simulation is fast-forwarding; try again when it ends';

export class HostSession {
  private nextPhaseN = 0;
  readonly peerId: string;
  private readonly o: HostSessionOptions;
  private readonly stamp: (b: WireBody) => WireMessage;
  private readonly now: () => number;
  private readonly transports = new Map<ManagedTransport, () => void>();
  /**
   * Per transport, each peer's sequence filter and the role its last hello said — keyed by (transport, from), so a
   * frame on one transport (a phone on the relay claiming the panel's id) never touches a peer on another (the
   * in-process panel). A detached transport's peers are forgotten with it (verification 2026-10-29), and one peer when
   * the relay says its socket left (R29), so a hello forged under its id dies with the forger's socket. `devices`: the
   * device key a `defib` peer's last hello said (R5d), carried as `by` on its applied presses.
   */
  private readonly peers = new WeakMap<ManagedTransport, { seqs: SeqFilter; roles: Map<string, Role>; left: Set<string>; devices: Map<string, string> }>();
  /**
   * The one granted instructor phone, by (transport, from), and the PIN it proved (plan §3 option B: the newest right
   * PIN takes over). The laptop's own panels are controllers: they need no grant and are never revoked.
   * R8c: the one granted remote ventilator has its own single place beside it, option B within its own role only.
   */
  private readonly signedIn: Record<SignsIn, Holder | null> = { instructor: null, ventilator: null };
  /** L4: the granted learner remotes, each by (transport, from), with the learner PIN it proved and its device key. */
  private readonly learners = new Map<ManagedTransport, Map<string, { pin: string; device: string }>>();
  private learnerDenied: number[] = []; // Wall ms of the last DENIAL_RECORD_MAX wrong learner PINs (no lockout)
  /** L4 (§4 D3): the preparations the learner remotes staged, by device key and the device's own id. */
  private readonly preps = new Map<string, Map<string, HostPrep>>();
  /** L4: a learner's delivery waiting for its ack: the preparation and the volume it takes once applied. */
  private readonly pushing = new Map<string, { h: HostPrep; volumeMl: number; news: Extract<PrepNewsKind, 'delivered' | 'infusing'> }>();
  /** L4 (LQ4): the infusion running of each drug, as applied (any device's): its rate, its syringe, who set it. */
  private readonly infusions = new Map<string, Running>();
  /** The ventilator ids revoked for their silence, and their transports: their late `vent` is answered again, never heard. */
  private readonly silentVents = new Map<string, ManagedTransport>();
  private denials: number[] = []; // Wall ms of the last DENIAL_RECORD_MAX wrong PINs within DENIAL_WINDOW_MS (no lockout)
  private readonly seen = new Map<string, AckBody>();
  private readonly groups = new Map<string, { tick: Tick; at: number }>();
  private readonly sticky = new Map<string, WireCommand>();
  private readonly marks = new Map<string, PatientSnapshot>();
  private readonly targets = new Map<StateVar, { value: number; untilT: number }>();
  private batch: WireEvent[] = [];
  private flushQueued = false;
  private chain: Promise<void> = Promise.resolve();
  /** R15: the host's own stage group being gathered (`submit` calls in one synchronous run), until its chain step runs. */
  private gathering: { group: string; items: Gathered[] } | null = null;
  /** R15: staged deliveries whose items are arriving (by batch id), held until all n are here. */
  private readonly held = new Map<string, { n: number; items: Array<{ t: ManagedTransport; cmd: WireCommand; from: string; receivedAt: number }>; timer: ReturnType<typeof setTimeout> | null }>();
  private engineState = false;
  private readonly offEngine: () => void;
  private readonly timer: ReturnType<typeof setInterval> | null;
  private bookmarkN = 0;
  private viewerSeenAt = -Infinity; // Wall ms of the last viewer hello
  private cockpitSaidAt = -Infinity; // Wall ms of the last `cockpit` event (-Infinity: none since the view opened)
  private cockpitTick: Tick = 0; // The tick of the last mirrored command (the `off` notice carries it)
  private ff: { fromTick: Tick; toTick: Tick; alarms: FastForwardAlarm[] } | null = null; // The fast-forward running
  private activeAlarms = new Set<string>(); // The alarm ids of the last alarmStatus (what is NEW during a span)
  private timelines = 0; // newTimeline() count — a fast-forward stops when its timeline ends
  /** The last bolus of each drug (drug-lock.ts): a device's second one within SAME_DRUG_LOCK_S is refused. */
  private readonly gives = new RecentGives();
  readonly stats = { applied: 0, rejected: 0, duplicates: 0, snapshotsSent: 0 };

  constructor(o: HostSessionOptions) {
    this.o = o;
    this.peerId = o.peerId ?? newPeerId('host');
    this.now = o.wallNow ?? (() => performance.timeOrigin + performance.now());
    this.stamp = createStamper(o.session, this.peerId, this.now);
    this.offEngine = o.target.on((e) => {
      if (e.type === ('state' as EngineEvent['type'])) this.engineState = true; // the engine emits its own (E1)
      if (e.type === 'alarmStatus') {
        // An alarm raised during a fast-forward did not sound — the end event lists it (banner, log, monitor)
        if (this.ff) for (const a of e.active) if (!this.activeAlarms.has(a.id) && !this.ff.alarms.some((x) => x.id === a.id)) this.ff.alarms.push({ ...a, ended: false });
        this.activeAlarms = new Set(e.active.map((a) => a.id));
      }
      if (!LOCAL_ONLY.has(e.type)) this.queue(e);
    });
    const period = o.stateIntervalMs ?? 1000;
    this.timer = period > 0 ? setInterval(() => this.emitState(), period) : null;
  }

  /** Serve peers on this transport. Returns a detach function. */
  addTransport(t: ManagedTransport): () => void {
    const offMsg = t.onMessage((m) => {
      this.chain = this.chain.then(() => this.receive(t, m)).catch((err) => console.error('[pme host]', err));
    });
    const offStatus = t.onStatus((s) => {
      if (s === 'open') t.send(this.stamp({ kind: 'hello', role: 'host' }));
      if (s === 'closed') this.detach(t);
    });
    // R29: the relay says a peer's socket left; frames are handled in order on this.chain, so the forgetting is too
    const offLeft = t.onPeerLeft?.((from) => {
      this.chain = this.chain.then(() => this.forget(t, from));
    });
    this.transports.set(t, () => {
      offMsg();
      offStatus();
      offLeft?.();
    });
    return () => this.detach(t);
  }

  bookmarks(): string[] {
    return [...this.marks.keys()];
  }

  /** Wrong PINs in the last DENIAL_WINDOW_MS, at most DENIAL_RECORD_MAX (the Room page's count; no host lockout). */
  instructorDenials(): number {
    const since = this.now() - DENIAL_WINDOW_MS;
    this.denials = this.denials.filter((at) => at > since);
    return this.denials.length;
  }

  /** The instructor's PIN changed: every grant is revoked at once (the phone and the ventilator sign in again). */
  instructorPinChanged(): void {
    this.revoke('instructor', INSTRUCTOR_REASONS.pinChanged);
    this.revoke('ventilator', INSTRUCTOR_REASONS.pinChanged);
  }

  /** Wrong learner PINs in the last DENIAL_WINDOW_MS, at most DENIAL_RECORD_MAX (no host lockout; the relay limits tries). */
  learnerDenials(): number {
    const since = this.now() - DENIAL_WINDOW_MS;
    this.learnerDenied = this.learnerDenied.filter((at) => at > since);
    return this.learnerDenied.length;
  }

  /** L4 (§4 D9): the learner PIN changed: every granted learner remote is revoked at once (each signs in again). */
  learnerPinChanged(): void {
    for (const [t, m] of this.learners) for (const from of m.keys()) this.grant(t, from, false, LEARNER_REASONS.pinChanged);
    this.learners.clear();
  }

  /** How many learner remotes are granted now. */
  learnerRemotes(): number {
    let n = 0;
    for (const m of this.learners.values()) n += m.size;
    return n;
  }

  /**
   * L4 (§6): the record of the preparation `prepId` of the device `by` for one of its drugs (absent: its first), at its
   * last give — the scenario driver's `preparation` lookup (ScenarioDriverOptions.preparation). Undefined: none.
   */
  preparation(by: string, prepId: string, drugId?: string): PrepRecord | undefined {
    const h = this.preps.get(by)?.get(prepId);
    return h ? prepRecord(h, drugId) : undefined;
  }

  /**
   * L7 (§4 D7, LQ3 ruled): the instructor shows the incompatibility notice of the preparation `prepId` of the device `by`:
   * the host records when (the scenario driver's record of the preparation carries it: prepRecord's `notice`) and tells
   * that remote, whose `prep` news now carries the findings; the remote sounds the notice once and shows them. A second
   * call changes nothing. Nothing is removed or blocked: a Give is given whether or not the notice was shown. L9's card
   * (an instructor-only `prep notice` command, on the laptop and the instructor's phone) is what calls it; until then
   * it is this method alone. False: no such preparation (or already shown).
   */
  showPrepNotice(by: string, prepId: string): boolean {
    const h = this.preps.get(by)?.get(prepId);
    if (!h || h.notice) return false;
    h.notice = { shownAt: this.o.target.now().simT };
    this.prepNews('notice', h);
    this.o.onPreparation?.(stagedOf(h)); // L9: the /2 record's copy of the preparation now carries the notice's time
    return true;
  }

  /** R8c: the granted remote ventilator's peer id (null: none). */
  get ventilator(): string | null {
    return this.signedIn.ventilator?.from ?? null;
  }

  /**
   * The hand-over contract: revoke the granted ventilator `from` (a silence hand-over: `reason` VENTILATOR_REASONS.silent).
   * It is told so; its place is free; a `vent` from it later is not heard and is answered with the same refusal, so the
   * device signs in again on a new socket. False: `from` is not the holder (nothing changes).
   */
  revokeVentilator(from: string, reason: string): boolean {
    const h = this.signedIn.ventilator;
    if (!h || h.from !== from) return false;
    if (this.silentVents.size >= 16) this.silentVents.delete(this.silentVents.keys().next().value as string); // [ENG: network] bounded: one tablet, a few outages
    this.silentVents.set(from, h.t);
    this.revoke('ventilator', reason);
    return true;
  }

  /** R8c: send a link message to the granted remote ventilator only (`to` its id). False: none is granted. */
  ventPost(body: VentLinkBody): boolean {
    const h = this.signedIn.ventilator;
    if (!h) return false;
    h.t.send(this.stamp({ kind: 'vent', to: h.from, body }));
    return true;
  }

  /** A fast-forward is running (controllers' commands are refused until it ends). */
  get fastForwarding(): boolean {
    return this.ff !== null;
  }

  /**
   * Apply a command issued on the host itself (the scenario runner): the same path as a remote command — stage
   * groups, sticky state, stats and a commandApplied that viewers mirror — minus the ack.
   */
  submit(cmd: WireCommand): Promise<DispatchResult> {
    // R15: the commands of one stage group submitted together (the scenario runner sends a batch in one loop) go to the
    // engine in one dispatch, so they land on one tick however long the monitor's round trip takes
    const open = this.gathering;
    if (open && open.group === cmd.stageGroup && groupable(cmd)) return new Promise((resolve) => open.items.push({ cmd, resolve }));
    this.gathering = null; // another command: the group gathered so far is complete (order is kept)
    let first!: Gathered;
    const done = new Promise<DispatchResult>((resolve) => (first = { cmd, resolve }));
    const g = { group: cmd.stageGroup ?? '', items: [first] };
    if (cmd.stageGroup && groupable(cmd) && this.o.target.dispatchGroup) this.gathering = g;
    const run = this.chain.then(async () => {
      if (this.gathering === g) this.gathering = null; // later commands of this group go on their own
      const outs = await this.applyTogether(g.items.map((i) => i.cmd));
      g.items.forEach((item, i) => {
        const { result, applied } = outs[i] as { result: DispatchResult; applied: WireCommand };
        if (!result.accepted) this.stats.rejected++;
        else {
          this.stats.applied++;
          this.queue({ type: 'commandApplied', commandId: item.cmd.id, tick: result.tick, resolved: { command: applied } satisfies AppliedResolution });
        }
        item.resolve(result);
      });
    });
    this.chain = run.then(() => undefined, (err) => console.error('[pme host]', err));
    return done;
  }

  /**
   * A command the host's monitor applied OUTSIDE this session (the Ventilator view's link drives it directly,
   * up to 400 commands a second at ×8) — sent as a `mirror` commandApplied so a second-screen viewer applies it at the
   * same tick, and only while a viewer has said hello (no traffic in a session without one) [ENG: network; 10 min].
   * A DECLARED deviation from brief §3.7: these are the ventilator's frames — pressure,
   * flow and volume every 20 ms of sim, i.e. samples — so they go ONLY to same-browser BroadcastChannel transports,
   * never to the relay, WebRTC or the in-process panel (and the relay refuses them, relay/server.ts). Mirroring the
   * cockpit's SETTINGS instead cannot be exact: a frame one tick off moves the beats 3.5 ms (five ticks: 18 ms; the
   * viewer resyncs above 1 ms), and a follower-side cockpit learns its own tick offset.
   * `notice: false` — the Ventilator view is off screen: its cockpit may still ventilate, but a phone follows (UI-A #2).
   */
  mirror(cmd: Command, result: DispatchResult, notice = true): void {
    if (!result.accepted || this.ff) return; // A viewer waits out a fast-forward
    this.cockpitTick = result.tick;
    if (notice) this.cockpitNotice(result.tick); // Whether or not a viewer said hello lately (a phone that joined long ago)
    if (this.now() - this.viewerSeenAt > VIEWER_TTL_MS) return;
    const m = this.stamp({ kind: 'event', body: [{ type: 'commandApplied', commandId: cmd.id, tick: result.tick, resolved: { command: { ...cmd, atTick: result.tick }, mirror: true } satisfies AppliedResolution }] });
    for (const t of this.transports.keys()) if (t.kind === 'broadcastChannel') t.send(m);
  }

  /** A viewer on the network gets no frames — it is told the cockpit drives (once a second), and holds. */
  private cockpitNotice(tick: Tick): void {
    const now = this.now();
    if (now - this.cockpitSaidAt < COCKPIT_EVENT_MS) return;
    const net = [...this.transports.keys()].filter((t) => t.kind === 'websocket' || t.kind === 'webrtc');
    if (net.length === 0) return; // Nothing stamped for nobody
    this.cockpitSaidAt = now;
    const c = this.stamp({ kind: 'event', body: [{ type: 'cockpit', t: tick * TICK_S, tick }] });
    for (const t of net) t.send(c);
  }

  /**
   * The Ventilator view closed: a phone holding for it is told at once (`off`) and follows again (UI-A #2, demo review
   * 24 Oct #2: one click on "Ventilator" held every phone for the rest of the case). Once per notice run; the next
   * notice goes at once.
   */
  cockpitOff(): void {
    if (this.cockpitSaidAt === -Infinity) return;
    this.cockpitSaidAt = -Infinity;
    const net = [...this.transports.keys()].filter((t) => t.kind === 'websocket' || t.kind === 'webrtc');
    if (net.length === 0) return;
    const c = this.stamp({ kind: 'event', body: [{ type: 'cockpit', t: this.cockpitTick * TICK_S, tick: this.cockpitTick, off: true }] });
    for (const t of net) t.send(c);
  }

  /** Broadcast an event that did not come from the engine (e.g. `scenario`), batched with this frame's events. */
  publish(e: WireEvent): void {
    this.queue(e);
  }

  /** Send the queued events now (normally a microtask after the frame that produced them). */
  flush(): void {
    this.flushQueued = false;
    if (this.batch.length === 0) return;
    const all = this.batch;
    this.batch = [];
    let body: WireEvent[] = [];
    let bytes = 0;
    for (const e of all) {
      const n = JSON.stringify(e).length;
      if (body.length > 0 && (body.length >= EVENTS_PER_MESSAGE || bytes + n > MESSAGE_BUDGET_BYTES)) {
        this.broadcast({ kind: 'event', body });
        body = [];
        bytes = 0;
      }
      body.push(e);
      bytes += n;
    }
    if (body.length > 0) this.broadcast({ kind: 'event', body });
  }

  /**
   * The target's engine was replaced (patient restart, scenario load): sim time starts again. The old timeline's queued
   * events go out first, then a `timeline` event every peer restarts its clock on (a controller's time is otherwise
   * monotonic, so without it the session clock froze at the old high-water time — showcase rehearsal 2026-10-04).
   * Per-timeline host state (stage groups, set targets, the scenario run) ends with the old engine.
   */
  newTimeline(cause: TimelineCause = 'restart'): void {
    this.timelines++; // A fast-forward on the old timeline stops
    this.flush();
    this.groups.clear();
    this.targets.clear();
    this.gives.clear(); // the lock's clock is the old engine's
    // L4: a preparation's age and ready time, and what the pumps run, are the old engine's clock and patient
    this.preps.clear();
    this.pushing.clear();
    this.infusions.clear();
    if (cause === 'restart') {
      this.sticky.delete('scenario.load');
      this.sticky.delete('scenario.run');
      // The old engine's lead and filter choices are not the new monitor's
      for (const k of [...this.sticky.keys()]) if (k.startsWith('ecg.')) this.sticky.delete(k);
    }
    const { tick, simT } = this.o.target.now();
    this.queue({ type: 'timeline', t: simT, tick, cause });
    this.flush();
  }

  /** Emit a `state` event (brief §7.3). Target-derived until the engine emits its own (engine request E1). */
  emitState(): void {
    if (this.engineState) return;
    const { tick, simT } = this.o.target.now();
    const values: Partial<Record<StateVar, number>> = {};
    const control: Partial<Record<StateVar, ControlFlag>> = {};
    for (const [v, r] of this.targets) {
      values[v] = r.value;
      if (simT < r.untilT) control[v] = 'ramping';
    }
    const ev: StateEvent = { type: 'state', t: simT, tick, mode: 'manual', values, control };
    this.queue(ev);
  }

  close(): void {
    if (this.timer !== null) clearInterval(this.timer);
    for (const h of this.held.values()) if (h.timer !== null) clearTimeout(h.timer);
    this.held.clear();
    this.offEngine();
    for (const t of [...this.transports.keys()]) this.detach(t);
  }

  // --- internals ---------------------------------------------------------------------------------------------
  private detach(t: ManagedTransport): void {
    this.transports.get(t)?.();
    this.transports.delete(t);
    this.peers.delete(t);
    this.learners.delete(t);
    for (const r of ['instructor', 'ventilator'] as const) if (this.signedIn[r]?.t === t) this.setHolder(r, null);
  }

  private setHolder(role: SignsIn, h: Holder | null): void {
    const was = this.signedIn[role];
    this.signedIn[role] = h;
    if (was?.t === h?.t && was?.from === h?.from) return;
    if (role === 'instructor') this.o.onInstructors?.(h ? 1 : 0);
    else this.o.onVentilator?.(h ? h.from : null);
  }

  private grant(t: ManagedTransport, to: string, granted: boolean, reason?: string): void {
    t.send(this.stamp({ kind: 'grant', to, granted, ...(reason !== undefined ? { reason } : {}) }));
  }

  /** Tell the role's holder it is no longer granted, and forget it. */
  private revoke(role: SignsIn, reason: string): void {
    const h = this.signedIn[role];
    if (!h) return;
    this.grant(h.t, h.from, false, reason);
    this.setHolder(role, null);
  }

  /**
   * An instructor or ventilator hello: verify its PIN and answer with a grant, before the welcome (the relay routes by
   * it). Each role has its own single place (option B within it: the newest right PIN takes over that role only, R8c).
   */
  private verify(t: ManagedTransport, from: string, pin: string | undefined, role: SignsIn): void {
    // R8c: an app that drives from no remote cockpit takes no ventilator, whatever the PIN
    const want = role === 'ventilator' && !this.o.onVent ? null : (this.o.instructorPin?.() ?? null);
    const h = this.signedIn[role];
    const isHolder = h?.t === t && h.from === from;
    const learnerPin = this.o.learnerPin?.() ?? null;
    if (want !== null && learnerPin !== null && samePin(want, learnerPin)) {
      if (isHolder) this.setHolder(role, null);
      return this.grant(t, from, false, LEARNER_REASONS.samePins); // L4: the learner PIN never opens this role
    }
    if (want === null || pin === undefined || !samePin(pin, want)) {
      if (want !== null) this.denials.push(this.now());
      if (this.denials.length > DENIAL_RECORD_MAX) this.denials.splice(0, this.denials.length - DENIAL_RECORD_MAX);
      this.instructorDenials(); // prunes the window
      if (isHolder) this.setHolder(role, null); // its own hello no longer proves the PIN
      const none = role === 'instructor' ? INSTRUCTOR_REASONS.noPhone : VENTILATOR_REASONS.noVentilator;
      this.grant(t, from, false, want === null ? none : INSTRUCTOR_REASONS.wrongPin);
      return;
    }
    if (!isHolder && h) this.grant(h.t, h.from, false, INSTRUCTOR_REASONS.takenOver); // option B
    this.grant(t, from, true);
    this.setHolder(role, { t, from, pin: want });
    if (role === 'instructor') this.instructorPreps(); // L9: a phone that signs in (or again) sees what was already staged
  }

  /**
   * L4 (§4 D9): a learner hello: grant it on the LEARNER PIN, and only that (the instructor's PIN is a wrong PIN here).
   * Many remotes may be granted at once; each is (transport, from), with the device key its gives are filed under. A
   * hello under the host's own peer id is refused: the instructor's copy of a preparation's news is addressed to it.
   */
  private verifyLearner(t: ManagedTransport, from: string, pin: string | undefined, device: string | undefined): void {
    const want = this.o.learnerPin?.() ?? null;
    const instructor = this.o.instructorPin?.() ?? null;
    this.learners.get(t)?.delete(from); // its own hello proves the PIN again, or it is no longer granted
    const deny = (reason: string) => this.grant(t, from, false, reason);
    if (want === null) return deny(LEARNER_REASONS.noRemote);
    if (instructor !== null && samePin(want, instructor)) return deny(LEARNER_REASONS.samePins);
    if (pin === undefined || !samePin(pin, want) || from === this.peerId) {
      this.learnerDenied.push(this.now());
      if (this.learnerDenied.length > DENIAL_RECORD_MAX) this.learnerDenied.splice(0, this.learnerDenied.length - DENIAL_RECORD_MAX);
      this.learnerDenials(); // prunes the window
      return deny(INSTRUCTOR_REASONS.wrongPin);
    }
    if (device === undefined) return deny(LEARNER_REASONS.noDevice);
    let m = this.learners.get(t);
    if (!m) this.learners.set(t, (m = new Map()));
    m.set(from, { pin: want, device });
    this.grant(t, from, true);
  }

  /** The device key of (t, from) if it is a granted learner remote with the learner PIN as it is now; a PIN changed unannounced revokes it here. */
  private learnerDevice(t: ManagedTransport, from: string): string | null {
    const g = this.learners.get(t)?.get(from);
    if (!g) return null;
    const pin = this.o.learnerPin?.() ?? null;
    if (pin !== null && samePin(pin, g.pin)) return g.device;
    this.learners.get(t)?.delete(from);
    this.grant(t, from, false, LEARNER_REASONS.pinChanged);
    return null;
  }

  /** Whether (t, from) holds `role` with the PIN as it is now; a PIN changed unannounced revokes it here. */
  private holds(role: SignsIn, t: ManagedTransport, from: string): boolean {
    const h = this.signedIn[role];
    if (h?.t !== t || h.from !== from) return false;
    const pin = this.o.instructorPin?.() ?? null;
    if (pin !== null && samePin(pin, h.pin)) return true;
    this.revoke(role, INSTRUCTOR_REASONS.pinChanged); // changed without instructorPinChanged(): caught at the next message
    return false;
  }

  /** Null when (t, from) is the granted phone and may send `cmd` (plan §2), else the reason its ack carries. */
  private instructorRefusal(t: ManagedTransport, from: string, cmd: WireCommand): string | null {
    return this.holds('instructor', t, from) ? instructorMay(cmd) : INSTRUCTOR_REASONS.notSignedIn;
  }

  /**
   * R29: a relay peer left: its sequence and role on this transport are forgotten (its next socket starts fresh). If it
   * was the granted instructor phone, its grant goes with it (P3): a socket under its id must prove the PIN again.
   */
  private forget(t: ManagedTransport, from: string): void {
    const p = this.peers.get(t);
    p?.seqs.forget(from);
    p?.roles.delete(from);
    p?.devices.delete(from);
    p?.left.add(from);
    this.learners.get(t)?.delete(from); // L4: a socket under its id signs in again
    if (p && p.left.size > LEFT_MAX) p.left.delete(p.left.values().next().value as string); // the oldest goes first
    for (const r of ['instructor', 'ventilator'] as const) if (this.signedIn[r]?.t === t && this.signedIn[r]?.from === from) this.setHolder(r, null);
    if (this.silentVents.get(from) === t) this.silentVents.delete(from); // its socket is gone: nothing more can come from it
  }

  private queue(e: WireEvent): void {
    this.batch.push(e);
    if (!this.flushQueued) {
      this.flushQueued = true;
      queueMicrotask(() => this.flush());
    }
  }

  private broadcast(b: WireBody): void {
    const m = this.stamp(b);
    for (const t of this.transports.keys()) t.send(m);
  }

  private async receive(t: ManagedTransport, m: WireMessage): Promise<void> {
    if (m.session !== this.o.session) return; // A message for another session is not ours, whatever channel it came on
    if (m.from === this.peerId) return;
    let p = this.peers.get(t);
    if (!p) this.peers.set(t, (p = { seqs: new SeqFilter(), roles: new Map(), left: new Set(), devices: new Map() }));
    if (p.seqs.check(m) === 'duplicate') return;
    // A peer that said hello as a viewer sends no commands — the relay already refuses them on a WebSocket; a
    // BroadcastChannel peer is held to the same rule (one trust model per role, whatever the transport). Only a hello
    // the sequence check accepted counts: a stale frame carrying a peer's id changes nothing
    if (m.kind === 'hello') {
      p.roles.set(m.from, m.role);
      p.left.delete(m.from);
      if ((m.role === 'defib' || m.role === 'learner') && m.device !== undefined) p.devices.set(m.from, m.device);
      else p.devices.delete(m.from);
    }
    // R5d: the defibrillator window follows as a viewer does (a second screen of this computer gets the cockpit's frames)
    if (m.kind === 'hello' && (m.role === 'viewer' || m.role === 'defib' || m.role === 'learner')) this.viewerSeenAt = this.now();
    if (m.kind === 'hello' && (m.role === 'instructor' || m.role === 'ventilator')) this.verify(t, m.from, m.pin, m.role);
    if (m.kind === 'hello' && m.role === 'learner') this.verifyLearner(t, m.from, m.pin, m.device);
    if (m.kind === 'hello' && m.role === 'ventilator') return; // R8c: it follows nothing (no welcome, no snapshot)
    if (m.kind === 'hello' && m.role !== 'host') return this.welcome(t);
    // R8c: only the granted ventilator's link messages reach the app, while its PIN holds
    if (m.kind === 'vent') {
      // a late frame from an id revoked for its silence: answered again (it signs in anew), never heard
      if (this.silentVents.get(m.from) === t) return this.grant(t, m.from, false, VENTILATOR_REASONS.silent);
      return void (this.o.onVent && this.holds('ventilator', t, m.from) && this.o.onVent(m.from, m.body));
    }
    if (m.kind !== 'command') return;
    const role = p.roles.get(m.from);
    const refuse = (reason: string) => t.send(this.stamp({ kind: 'ack', commandId: m.body.id, accepted: false, tick: this.o.target.now().tick, reason }));
    if (role === 'viewer') return refuse('a viewer cannot command');
    if (role === 'ventilator') return refuse(VENTILATOR_REASONS.noCommands); // the relay refuses it too (R8b)
    // forgotten by a peer-left (R29) and no hello since: not the controller path (the relay refuses it too)
    if (role === undefined && p.left.has(m.from)) return refuse(NO_HELLO);
    // R5d: the learner defibrillator window — Charge and Shock only, bare, checked here whatever the relay did (a
    // same-browser window has no relay), then the instructor's own path; filed as the learner's, with its device key
    if (role === 'defib') {
      const no = learnerDefibMay(m.body);
      if (no !== null) return refuse(no);
      const by = p.devices.get(m.from);
      return this.command(t, { ...m.body, issuedBy: LEARNER_ISSUED_BY, ...(by !== undefined ? { by } : {}) }, m.from);
    }
    // L4: the learner action remote — granted on the learner PIN, its shapes checked here again (learnerMay; a same-browser
    // page has no relay), then turned into the instructor's own commands, filed as the learner's with its device key
    if (role === 'learner') {
      const by = this.learnerDevice(t, m.from);
      if (by === null) return refuse(LEARNER_REASONS.notSignedIn);
      const no = learnerMay(m.body);
      if (no !== null) return refuse(no);
      return this.learnerCommand(t, m.from, by, m.body, refuse);
    }
    // L9 (LQ3): the incompatibility notice is the instructor's, from the laptop or the granted phone (instructorMay), and
    // the host's own table's: acked here, never dispatched
    if (m.body.type === 'prep' && m.body.action === 'notice') {
      const why = role === 'instructor' ? this.instructorRefusal(t, m.from, m.body) : null;
      return why !== null ? refuse(why) : this.prepNotice(t, m.body, refuse);
    }
    // §4 D3: a preparation and an infusion's mL/h are the learner remote's shapes only, and never reach the engine as sent
    if (m.body.type === 'prep' || m.body.type === 'infusion') return refuse(LEARNER_REASONS.notSignedIn);
    if (role !== 'instructor') return this.command(t, m.body, m.from);
    // An instructor phone: granted, on the allow-list, and filed as the Remote's rows whatever it wrote (record.ts)
    const why = this.instructorRefusal(t, m.from, m.body);
    if (why !== null) return refuse(why);
    return this.command(t, { ...m.body, issuedBy: 'remote' }, m.from);
  }

  /**
   * L4 (§4 D3): a granted learner remote's command. A sample goes to the engine as it is. A `prep` stage or discard is
   * the host's own table (acked, never dispatched: no commandApplied, so no follower applies it). A delivery, an infusion
   * from a preparation and an infusion change become the instructor's `applyEvent drug` / `infusion`, with every
   * quantity computed here from the formulary, and go through `command()`: the drug lock, staged delivery, the engine's
   * validation and the record are the laptop's own. Each is filed `issuedBy: 'learner'`, `by` = the device key, `prepId`.
   */
  private async learnerCommand(t: ManagedTransport, from: string, by: string, c: WireCommand, refuse: (reason: string) => void): Promise<void> {
    const prior = this.seen.get(c.id);
    if (prior) {
      this.stats.duplicates++;
      return t.send(this.stamp(prior)); // idempotent: a resend changes nothing
    }
    if (this.ff) return refuse(FF_REFUSAL);
    const base = { id: c.id, issuedBy: LEARNER_ISSUED_BY, by, ...(c.stageGroup !== undefined ? { stageGroup: c.stageGroup } : {}), ...(c.batch !== undefined ? { batch: c.batch } : {}) } as WireCommand;
    if (c.type === 'applyEvent') return this.command(t, { ...c, issuedBy: LEARNER_ISSUED_BY, by }, from);
    const { simT } = this.o.target.now();
    if (c.type === 'infusion') return this.learnerApply(t, from, setInfusion(c, base, this.infusions), null, refuse);
    if (c.type !== 'prep' || c.action === 'notice') return refuse('not a learner command'); // learnerMay admitted none other
    const f = this.o.formulary?.() ?? null;
    const mine = this.preps.get(by);
    for (const h of mine?.values() ?? []) h.from = from; // a remote that signed in again on a new socket: its news follows it
    if (c.action === 'stage') {
      if (!f) return refuse(LEARNER_REASONS.noFormulary);
      if (mine?.has(c.prep.id)) return refuse(`this remote already has a preparation ${c.prep.id}`);
      if ((mine?.size ?? 0) >= PREPS_PER_DEVICE) return refuse(LEARNER_REASONS.full);
      const made = stagePrep(f, c, by, from, simT);
      if (!made.ok) return refuse(made.why);
      if (mine) mine.set(c.prep.id, made.prep);
      else this.preps.set(by, new Map([[c.prep.id, made.prep]]));
      this.acked(t, c.id);
      this.prepNews('made', made.prep);
      return this.o.onPreparation?.(stagedOf(made.prep));
    }
    const h = mine?.get(c.prepId);
    if (!h) return refuse(`this remote has no preparation ${c.prepId}`);
    if (c.action === 'discard') {
      mine?.delete(c.prepId);
      this.acked(t, c.id);
      return this.prepNews('discarded', h);
    }
    if (!f) return refuse(LEARNER_REASONS.noFormulary);
    const withPrep = { ...base, prepId: h.id } as WireCommand;
    if (c.action === 'deliver') return this.learnerApply(t, from, deliverPrep(f, h, c, withPrep, simT), h, refuse);
    return this.learnerApply(t, from, infusePrep(f, h, c, withPrep, simT, this.infusions), h, refuse);
  }

  /** Apply a learner command's translation: refused as a whole, or every command through `command()` (one stage group). */
  private async learnerApply(t: ManagedTransport, from: string, out: Translated, h: HostPrep | null, refuse: (reason: string) => void): Promise<void> {
    if (!out.ok) return refuse(out.why);
    // a preparation of two drugs is given whole or not at all: a locked drug refuses the delivery before any dose goes
    const now = this.o.target.now();
    const first = out.cmds[0] as WireCommand;
    const locked = out.cmds.length > 1 && !this.ff ? (out.cmds.map((x) => this.lockOf(x, now.simT, this.gives)).find((l) => l !== null) ?? null) : null;
    if (locked) return this.answer(t, first, from, this.now(), { result: { accepted: false, tick: now.tick, reason: lockReason(locked) }, applied: first }, locked);
    if (h) this.pushing.set(first.id, { h, volumeMl: out.volumeMl, news: out.volumeMl > 0 ? 'delivered' : 'infusing' });
    for (const x of out.cmds) await this.command(t, x, from);
  }

  /**
   * L9 (§4 D7, LQ3): an instructor's press of the card's one control: the notice of the preparation `prepId` of the device
   * `by` is shown (showPrepNotice), once. A second press, from the other screen, is refused with the time it was shown;
   * a resend of the same press gets its first answer. Nothing is removed or blocked.
   */
  private prepNotice(t: ManagedTransport, c: Extract<WireCommand, { type: 'prep'; action: 'notice' }>, refuse: (reason: string) => void): void {
    const prior = this.seen.get(c.id);
    if (prior) {
      this.stats.duplicates++;
      return t.send(this.stamp(prior));
    }
    const h = this.preps.get(c.by)?.get(c.prepId);
    if (!h) return refuse(`no preparation ${c.prepId} on that remote`);
    if (h.notice) return refuse(`the notice was shown at ${caseClock(h.notice.shownAt)}`);
    this.acked(t, c.id);
    this.showPrepNotice(c.by, c.prepId);
  }

  /** An accepted ack for a command the host handled itself (a preparation staged or discarded): no commandApplied. */
  private acked(t: ManagedTransport, id: string): void {
    const ack: AckBody = { kind: 'ack', commandId: id, accepted: true, tick: this.o.target.now().tick };
    if (this.seen.size >= SEEN_MAX) this.seen.delete(this.seen.keys().next().value as string);
    this.seen.set(id, ack);
    t.send(this.stamp(ack));
  }

  /**
   * §4 D7: a preparation's news, twice: to the remote that staged it (`to` its peer id; never the findings, which the
   * instructor decides to show, LQ3), and to the host's own screens and granted instructors (`to` the host's own id, which
   * no learner may sign in under: verifyLearner), with the findings and the device. The relay routes the first to that one
   * learner socket and both to granted instructors; no other learner, viewer or defibrillator window gets either.
   */
  /** L9: the instructor's copy of every preparation on the table, again (a phone granted after the staging, or after a
   *  reload of its page), as `made` news: the card takes each as it stands (its notice, its given time). */
  private instructorPreps(): void {
    const t = this.o.target.now().simT;
    for (const m of this.preps.values()) for (const h of m.values()) this.queue({ type: 'prep', t, to: this.peerId, body: { news: 'made', prep: this.instructorCopy(h) } satisfies InstructorPrepNews });
  }

  private instructorCopy(h: HostPrep): InstructorPrepView {
    const name = this.o.deviceName?.(h.by) ?? null; // L9: the card says "Bed 2 remote staged", on the laptop and the phone
    return { ...instructorView(h), ...(name ? { name } : {}) };
  }

  private prepNews(news: PrepNewsKind, h: HostPrep): void {
    const t = this.o.target.now().simT;
    this.queue({ type: 'prep', t, to: h.from, body: { news, prep: learnerView(h) } satisfies LearnerPrepNews });
    this.queue({ type: 'prep', t, to: this.peerId, body: { news, prep: this.instructorCopy(h) } satisfies InstructorPrepNews });
  }

  /** A peer said hello: replay sticky commands, then a fresh snapshot (brief §3.7 late join). */
  private async welcome(t: ManagedTransport): Promise<void> {
    const { tick } = this.o.target.now();
    const replay: WireEvent[] = [...this.sticky.values()].map((command) => ({
      type: 'commandApplied',
      commandId: command.id,
      tick,
      resolved: { command, replay: true } satisfies AppliedResolution,
    }));
    const body = [...replay, ...(this.o.welcomeEvents?.() ?? [])];
    this.flush();
    if (body.length) t.send(this.stamp({ kind: 'event', body }));
    t.send(this.stamp({ kind: 'snapshot', body: await this.o.target.snapshot() }));
    this.stats.snapshotsSent++;
  }

  private async command(t: ManagedTransport, cmd: WireCommand, from: string): Promise<void> {
    const receivedAt = this.now();
    const prior = this.seen.get(cmd.id);
    if (prior) {
      this.stats.duplicates++;
      t.send(this.stamp(prior)); // idempotent: same ack, no second application
      return;
    }
    // While the host fast-forwards, a controller's command waits for nothing — it is refused with the reason. A bolus
    // of a drug given within SAME_DRUG_LOCK_S of sim time, from any device, is refused `recent` (drug-lock.ts): never
    // dispatched, so neither the engine nor the scenario driver's record sees it, and no commandApplied goes out
    const now = this.o.target.now();
    const lock = this.ff ? null : this.lockOf(cmd, now.simT, this.gives);
    const refused = this.ff ? FF_REFUSAL : lock ? lockReason(lock) : null;
    // R15: a staged delivery's items (one stageGroup, `batch` of n) are held until all n are here, then go to the engine
    // in one dispatch: one tick, whatever the monitor's round trip. An item refused on arrival is answered at once and
    // the delivery waits for one item fewer
    const b = cmd.batch;
    const batched = !!(b && b.n > 1 && cmd.stageGroup && groupable(cmd) && this.o.target.dispatchGroup);
    if (refused !== null) {
      this.answer(t, cmd, from, receivedAt, { result: { accepted: false, tick: now.tick, reason: refused }, applied: cmd }, lock);
      if (!batched || !b) return;
      const h = this.held.get(b.id) ?? { n: b.n, items: [], timer: null };
      h.n--;
      this.held.set(b.id, h);
      if (h.items.length > 0 && h.items.length >= h.n) return this.release(b.id);
      if (h.n <= 0) this.held.delete(b.id);
      return;
    }
    if (batched && b) {
      const h = this.held.get(b.id) ?? { n: b.n, items: [], timer: null };
      if (h.items.some((i) => i.cmd.id === cmd.id)) return void this.stats.duplicates++; // a resend of an item held: answered with the batch
      h.items.push({ t, cmd, from, receivedAt });
      this.held.set(b.id, h);
      if (h.items.length < h.n) {
        h.timer ??= setTimeout(() => void (this.chain = this.chain.then(() => this.release(b.id)).catch((err) => console.error('[pme host]', err))), BATCH_HOLD_MS);
        return;
      }
      return this.release(b.id);
    }
    return this.answer(t, cmd, from, receivedAt, await this.apply(cmd));
  }

  /** The drug lock a command meets at sim time `t` in `gives` (the first of the drugs it gives that is locked), or null. */
  private lockOf(cmd: WireCommand, t: number, gives: RecentGives): DrugLock | null {
    const drugs = cmd.type === 'scenario' ? (this.o.scenarioGives?.(cmd) ?? []) : [bolusDrugOf(cmd) ?? []].flat();
    return drugs.map((d) => gives.lock(d, t)).find((l) => l !== null) ?? null;
  }

  /**
   * R15: apply a held staged delivery (complete, or as far as it got) in one dispatch, and answer each item in the
   * delivery's order. The drug lock is read here, item by item, as the delivery's own earlier items set it: an item was
   * checked on arrival against the gives applied by then, but the items held before it were not yet given, so a
   * delivery carrying the same bolus twice (or a bolus pressed elsewhere while its item was held) would apply both.
   */
  private async release(id: string): Promise<void> {
    const h = this.held.get(id);
    if (!h) return;
    this.held.delete(id);
    if (h.timer !== null) clearTimeout(h.timer);
    if (this.ff) {
      const tick = this.o.target.now().tick;
      for (const i of h.items) this.answer(i.t, i.cmd, i.from, i.receivedAt, { result: { accepted: false, tick, reason: FF_REFUSAL }, applied: i.cmd });
      return;
    }
    const now = this.o.target.now();
    const given = new RecentGives(); // the delivery's own gives so far: they all land on its one tick
    const locks = h.items.map((i) => {
      const lock = this.lockOf(i.cmd, now.simT, this.gives) ?? this.lockOf(i.cmd, now.simT, given);
      if (!lock) given.note(i.cmd, now.simT);
      return lock;
    });
    const go = h.items.filter((_, k) => !locks[k]);
    const outs = await this.applyTogether(go.map((i) => i.cmd));
    let k = 0;
    h.items.forEach((i, j) => {
      const lock = locks[j] ?? null;
      if (lock) this.answer(i.t, i.cmd, i.from, i.receivedAt, { result: { accepted: false, tick: now.tick, reason: lockReason(lock) }, applied: i.cmd }, lock);
      else this.answer(i.t, i.cmd, i.from, i.receivedAt, outs[k++] as { result: DispatchResult; applied: WireCommand });
    });
  }

  /** Ack a controller's command and, applied, tell every peer; `lock`: the drug lock that refused it. */
  private answer(t: ManagedTransport, cmd: WireCommand, from: string, receivedAt: number, out: { result: DispatchResult; applied: WireCommand }, lock: DrugLock | null = null): void {
    const { result, applied } = out;
    const ack: AckBody = {
      kind: 'ack', commandId: cmd.id, accepted: result.accepted, tick: result.tick,
      ...(result.reason !== undefined ? { reason: result.reason } : {}),
      ...(lock ? { code: 'recent' as const, recent: { drugId: lock.drugId, agoS: Math.round(lock.agoS), by: lock.by } } : {}),
    };
    // the host's log only: the pressing device is answered by the ack; the run record never sees it
    if (lock) console.info(`[pme host] ${lock.drugId} not given from ${from}: ${result.reason}`);
    if (this.seen.size >= SEEN_MAX) this.seen.delete(this.seen.keys().next().value as string);
    this.seen.set(cmd.id, ack);
    t.send(this.stamp(ack));
    this.o.onCommand?.({ commandId: cmd.id, from, receivedAt, tick: result.tick, accepted: result.accepted });
    const push = this.pushing.get(cmd.id); // L4: a learner's delivery takes its volume once applied, and its remote is told
    if (push) {
      this.pushing.delete(cmd.id);
      if (result.accepted) push.h.leftMl = Math.max(0, push.h.leftMl - push.volumeMl);
      if (result.accepted) push.h.givenAt ??= this.o.target.now().simT; // L9: the card's "given at"
      if (result.accepted) this.prepNews(push.news, push.h);
    }
    if (!result.accepted) {
      this.stats.rejected++;
      return;
    }
    this.stats.applied++;
    this.queue({ type: 'commandApplied', commandId: cmd.id, tick: result.tick, resolved: { command: applied } satisfies AppliedResolution });
    if (cmd.type === 'time') this.emitState();
  }

  /**
   * A target that throws or rejects (a failed or destroyed worker) answers with a refusal — the controller gets its ack
   * and the host's command chain moves on instead of waiting behind a promise that never settles.
   */
  private async apply(cmd: WireCommand): Promise<{ result: DispatchResult; applied: WireCommand }> {
    try {
      return await this.applyOnce(cmd);
    } catch (err) {
      const reason = `the monitor could not apply it: ${err instanceof Error ? err.message : String(err)}`;
      return { result: { accepted: false, tick: this.o.target.now().tick, reason }, applied: cmd };
    }
  }

  /**
   * R15: apply commands of one stage group together — in ONE dispatch when the target can (dispatchGroup), so the engine
   * applies them in one task, on the group's tick; one by one otherwise (and for one command).
   */
  private async applyTogether(cmds: WireCommand[]): Promise<Array<{ result: DispatchResult; applied: WireCommand }>> {
    const many = this.o.target.dispatchGroup;
    if (cmds.length < 2 || !many) {
      const outs: Array<{ result: DispatchResult; applied: WireCommand }> = [];
      for (const c of cmds) outs.push(await this.apply(c));
      return outs;
    }
    const cs = cmds.map((c) => this.stamped(c));
    try {
      const rs = await many(cs);
      return cs.map((c, i) => ({ result: rs[i] as DispatchResult, applied: this.settled(c, rs[i] as DispatchResult) }));
    } catch (err) {
      const reason = `the monitor could not apply it: ${err instanceof Error ? err.message : String(err)}`;
      return cmds.map((c) => ({ result: { accepted: false, tick: this.o.target.now().tick, reason }, applied: c }));
    }
  }

  /** An engine command with its stage group's tick (the group's first command sets it, STAGE_LEAD_TICKS ahead). */
  private stamped(cmd: WireCommand): Command {
    const c = cmd as Command;
    if (!cmd.stageGroup) return c;
    const g = this.groups.get(cmd.stageGroup);
    const at = g && this.now() - g.at < STAGE_GROUP_TTL_MS ? g.tick : this.o.target.now().tick + STAGE_LEAD_TICKS;
    if (!g) this.groups.set(cmd.stageGroup, { tick: at, at: this.now() });
    return { ...c, atTick: at };
  }

  /** Dispatch one command; returns the result and the command as applied (with atTick). */
  private async applyOnce(cmd: WireCommand): Promise<{ result: DispatchResult; applied: WireCommand }> {
    if (cmd.type === 'time') return this.time(cmd);
    if (cmd.type === 'scenario') return this.scenario(cmd);
    if (cmd.type === 'note') {
      // A remote's judged objective or note (plan §6), recorded by the host app at the host's sim time
      const { tick, simT } = this.o.target.now();
      if (!this.o.onNote) return { result: { accepted: false, tick, reason: INSTRUCTOR_REASONS.noNotes }, applied: cmd };
      this.o.onNote(simT, cmd.text, cmd.kind, cmd.ev);
      return { result: { accepted: true, tick }, applied: cmd };
    }
    // Pin, release and setMode go to the engine, which validates them. setFactor reaches the engine too and is refused
    // there with its own reason until the engine models factors.
    // applyEvent/attachSensor are not in engine-core's Command union yet; the engine validates them at run time.
    const c = this.stamped(cmd);
    const result = await this.o.target.dispatch(c);
    return { result, applied: this.settled(c, result) };
  }

  /** The command as applied (with the tick it landed on), and the host state it sets. */
  private settled(c: Command, result: DispatchResult): Command {
    const applied: Command = { ...c, atTick: result.tick };
    if (result.accepted) {
      this.gives.note(c, result.tick * TICK_S); // every device's bolus, and the card's own (a press after it is locked)
      this.noteInfusion(c as WireCommand);
      if (c.type === 'setTarget') {
        const r = c.ramp;
        const untilT = result.tick * TICK_S + (r ? (r.delayS ?? 0) + r.durationS : 0);
        this.targets.set(c.variable, { value: c.value, untilT });
      }
      if (c.type === 'device' && c.action.device === 'ecg' && c.action.action === 'filter') this.sticky.set('ecg.filter', applied);
      if (c.type === 'device' && c.action.device === 'ecg' && c.action.action === 'lead') this.sticky.set(`ecg.lead.${c.action.lane}`, applied);
    }
    this.pruneGroups();
    return applied;
  }

  /** L4 (LQ4): the infusion each drug runs at, as applied by any device: what a learner's `infusion set` changes and replaces. */
  private noteInfusion(c: WireCommand): void {
    if (c.type !== 'applyEvent') return;
    const e = c.event as { kind: string; drugId?: unknown; rate?: unknown; dose?: unknown; unit?: unknown; infusion?: unknown; concentration?: Running['concentration'] };
    if (typeof e.drugId !== 'string') return;
    const by = (c as { by?: string }).by ?? givenByOf(c.issuedBy);
    if (e.kind === 'tci') return void this.infusions.delete(e.drugId); // a TCI pump drives it now, not a rate
    const rate = e.kind === 'infusion' ? e.rate : e.kind === 'drug' && (e.infusion === true || /\/(min|h)$/.test(String(e.unit))) ? e.dose : undefined;
    if (typeof rate !== 'number') return;
    if (rate === 0) return void this.infusions.delete(e.drugId);
    this.infusions.set(e.drugId, { rate, unit: String(e.unit), ...(e.kind === 'infusion' && e.concentration ? { concentration: e.concentration } : {}), by });
  }

  private time(cmd: TimeCommand): { result: DispatchResult; applied: WireCommand } {
    const { tick } = this.o.target.now();
    if (cmd.action === 'step') return { result: { accepted: false, tick, reason: 'time step is not supported' }, applied: cmd };
    if (cmd.action === 'jump') return this.fastForward(cmd);
    if (cmd.action === 'scale' && !(typeof cmd.value === 'number' && cmd.value >= MIN_TIME_SCALE && cmd.value <= MAX_TIME_SCALE)) {
      return { result: { accepted: false, tick, reason: `scale must be ${MIN_TIME_SCALE}–${MAX_TIME_SCALE}` }, applied: cmd }; // The clock's own range (×8)
    }
    this.o.target.time(cmd.action, cmd.value);
    this.sticky.set(cmd.action === 'scale' ? 'time.scale' : 'time.run', cmd);
    return { result: { accepted: true, tick }, applied: cmd };
  }

  /**
   * Fast-forward `value` sim seconds, paced to `fastForwardWallMs` of wall time (the owner: ≈ 10 s, so the room sees the
   * clock run). Accepted at once; the run goes on outside the command chain in steps of FF_STEP_TICKS. A first empty step
   * reads the monitor's own tick, so the span is exact. After each step the host's scenario has polled (ScenarioDriver
   * wraps `fastForwardStep`) and what it submitted is applied before the next step, so the span keeps the engine's event
   * order and gives the patient a run polled every 0.5 s would. Every peer sees a `fastForward` start and end (the end
   * lists the alarms raised during it); a late joiner gets the jump as a sticky replay.
   */
  private fastForward(cmd: TimeCommand, until = false): { result: DispatchResult; applied: WireCommand } {
    const { tick } = this.o.target.now();
    const no = (reason: string) => ({ result: { accepted: false, tick, reason }, applied: cmd });
    const target = this.o.target;
    if (!target.fastForwardStep) return no('this monitor cannot fast-forward');
    const max = until ? FF_PHASE_MAX_S : FF_MAX_S;
    if (!(typeof cmd.value === 'number' && cmd.value > 0 && cmd.value <= max)) return no(`fast-forward${until ? ' to the next phase' : ''} must be 0–${max} s`);
    if (until && !this.o.phaseMark?.()) return no('no phase to wait for: no pme-scenario/2 card is running');
    if (this.ff) return no('a fast-forward is already running');
    const ff = { fromTick: tick, toTick: tick + Math.round(cmd.value / TICK_S), alarms: [] };
    this.ff = ff;
    const applied: TimeCommand = { ...cmd, atTick: tick };
    void this.runFastForward(ff, applied, (n, last) => (target.fastForwardStep as NonNullable<HostTarget['fastForwardStep']>)(n, last), until);
    return { result: { accepted: true, tick }, applied };
  }

  private async runFastForward(ff: { fromTick: Tick; toTick: Tick; alarms: FastForwardAlarm[] }, cmd: TimeCommand, advance: NonNullable<HostTarget['fastForwardStep']>, until = false): Promise<void> {
    const timeline = this.timelines;
    const span = ff.toTick - ff.fromTick;
    const wallMs = this.o.fastForwardWallMs ?? 0;
    let tick = ff.fromTick;
    let stopped: string | undefined;
    try {
      tick = (await advance(0, false)).tick; // the monitor's own tick (the host's is an estimate between its events)
      Object.assign(ff, { fromTick: tick, toTick: tick + span });
      this.sticky.set('time.jump', { ...cmd, atTick: tick });
      this.queue({ type: 'fastForward', t: tick * TICK_S, tick, phase: 'start', fromT: tick * TICK_S, toT: ff.toTick * TICK_S, wallMs });
      const mark0 = until ? this.o.phaseMark?.() : undefined; // B6: the phase entry the span started in
      const w0 = this.now();
      while (tick < ff.toTick) {
        if (this.timelines !== timeline) {
          stopped = 'a new patient or scenario started';
          break;
        }
        const n = Math.min(FF_STEP_TICKS, ff.toTick - tick);
        tick = (await advance(n, tick + n >= ff.toTick)).tick;
        await this.chain; // the scenario's commands of this step are applied before the next step
        // B6: the first phase change ends "To the next phase" here, after the new phase's own entry script landed
        if (until && tick < ff.toTick && this.o.phaseMark?.() !== mark0) {
          stopped = FF_PHASE_STOP;
          tick = (await advance(0, true)).tick; // the monitor's clock back (a full span gives it back on its last step)
          break;
        }
        const wait = w0 + (wallMs * (tick - ff.fromTick)) / span - this.now(); // the pace: ahead of it, wait
        if (wait > 0 && tick < ff.toTick) await (this.o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms))))(wait);
      }
    } catch (err) {
      if (this.timelines !== timeline) stopped = 'a new patient or scenario started'; // its monitor was replaced
      else {
        stopped = `the monitor stopped: ${err instanceof Error ? err.message : String(err)}`;
        try {
          await advance(0, true); // give the monitor its clock back
        } catch {
          // a dead monitor has no clock to give back
        }
      }
    }
    if (this.ff === ff) this.ff = null;
    this.sticky.delete('time.jump');
    const end = this.timelines === timeline ? { t: tick * TICK_S, tick } : this.o.target.now(); // a new timeline's clock
    const alarms = ff.alarms.map((a) => ({ ...a, ended: !this.activeAlarms.has(a.id) }));
    this.queue({ type: 'fastForward', t: 't' in end ? end.t : end.simT, tick: end.tick, phase: 'end', fromT: ff.fromTick * TICK_S, toT: ff.toTick * TICK_S, ...(stopped ? { stopped } : {}), alarms });
  }

  /**
   * B6 (plan scenario-builder.md §6), "To the next phase": a fast-forward of at most `maxS` (≤ FF_PHASE_MAX_S, the
   * plan's 30 min) that also stops at the running /2 card's first phase change (`phaseMark`), with the end's `stopped`
   * FF_PHASE_STOP. Host-local: the builder's run panel on the laptop that hosts calls it; no wire command asks for it
   * (the orchestrator's ruling, 11 November 2026). It runs in the command chain as the host's own commands do, and the
   * peers see a plain `time jump` of the span applied, then the fast-forward's start and end as for any jump.
   */
  fastForwardToNextPhase(maxS: number = FF_PHASE_MAX_S): Promise<DispatchResult> {
    const cmd: TimeCommand = { id: `next-phase-${++this.nextPhaseN}`, issuedBy: 'host', type: 'time', action: 'jump', value: maxS };
    const run = this.chain.then(() => {
      const { result, applied } = this.fastForward(cmd, true);
      if (!result.accepted) {
        this.stats.rejected++;
        return result;
      }
      this.stats.applied++;
      this.queue({ type: 'commandApplied', commandId: cmd.id, tick: result.tick, resolved: { command: applied } satisfies AppliedResolution });
      this.emitState();
      return result;
    });
    this.chain = run.then(() => undefined, (err) => console.error('[pme host]', err));
    return run;
  }

  private async scenario(cmd: ScenarioCommand): Promise<{ result: DispatchResult; applied: WireCommand }> {
    const { tick } = this.o.target.now();
    if (this.o.scenario) {
      const { applied: a, ...result } = await this.o.scenario(cmd);
      const applied = a ?? cmd;
      if (result.accepted) this.scenarioApplied(applied, result.tick);
      return { result, applied };
    }
    if (cmd.action === 'bookmark') {
      const label = cmd.target ?? `Bookmark ${++this.bookmarkN}`;
      this.marks.set(label, await this.o.target.snapshot());
      const applied: ScenarioCommand = { ...cmd, target: label };
      this.sticky.set(`bookmark.${label}`, applied);
      return { result: { accepted: true, tick }, applied };
    }
    if (cmd.action === 'restoreBookmark') {
      const snap = cmd.target !== undefined ? this.marks.get(cmd.target) : undefined;
      if (!snap) return { result: { accepted: false, tick, reason: `no bookmark ${String(cmd.target)}` }, applied: cmd };
      await this.o.target.restore(snap);
      this.newTimeline('restore'); // Every controller's clock goes back with the engine
      queueMicrotask(() => this.broadcast({ kind: 'hello', role: 'host' })); // viewers re-hello and resync
      return { result: { accepted: true, tick: snap.tick }, applied: cmd };
    }
    return { result: { accepted: false, tick, reason: `scenario ${cmd.action}: the scenario runner arrives in Stage 6b` }, applied: cmd };
  }

  /** Sticky scenario state for late joiners, and a viewer resync after a restore. */
  private scenarioApplied(c: ScenarioCommand, tick: Tick): void {
    if (c.action === 'bookmark') this.sticky.set(`bookmark.${c.target}`, c);
    if (c.action === 'load') {
      this.sticky.delete('scenario.run');
      // with the tick it was applied on (a replay is stamped with the join's tick): a late joiner's ScenarioView puts
      // the run's first stage at the load, as the live view did (E141), like the sticky jump's `atTick`
      this.sticky.set('scenario.load', { ...c, atTick: tick });
    }
    if (c.action === 'pause' || c.action === 'resume') this.sticky.set('scenario.run', c);
    if (c.action === 'restoreBookmark') {
      // FX-12: a mark taken in another case (or before a restart ended this one) brings that case back; a late joiner
      // learns it from the sticky load as after any load. A mark with no case ends the run.
      const doc = c.doc as { id?: unknown } | null | undefined;
      const loaded = (this.sticky.get('scenario.load') as ScenarioCommand | undefined)?.doc as { id?: unknown } | undefined;
      if (doc === null) {
        this.sticky.delete('scenario.load');
        this.sticky.delete('scenario.run');
      } else if (doc && typeof doc.id === 'string' && loaded?.id !== doc.id) {
        this.sticky.delete('scenario.run');
        this.sticky.set('scenario.load', { id: c.id, issuedBy: c.issuedBy, type: 'scenario', action: 'load', target: doc.id, doc });
      }
      this.newTimeline('restore');
      queueMicrotask(() => this.broadcast({ kind: 'hello', role: 'host' }));
    }
  }

  private pruneGroups(): void {
    const now = this.now();
    for (const [k, g] of this.groups) if (now - g.at > STAGE_GROUP_TTL_MS) this.groups.delete(k);
  }
}
