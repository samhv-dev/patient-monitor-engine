// The host end of every transport (brief §3.7, R7): it owns the engine. Commands in → dispatch → ack; engine
// events out, batched per frame; a `state` event at 1 Hz; a snapshot for anyone who says hello.
import { MAX_TIME_SCALE, MIN_TIME_SCALE, type Command, type DispatchResult, type EngineEvent, type PatientSnapshot, type SimSeconds, type StateVar, type Tick } from '@pme/engine-core';
import {
  createStamper,
  newPeerId,
  SeqFilter,
  type AppliedResolution,
  type ControlFlag,
  type FastForwardAlarm,
  type ManagedTransport,
  type ScenarioCommand,
  type StateEvent,
  type TimeCommand,
  type TimelineCause,
  type WireBody,
  type WireCommand,
  type WireEvent,
  type WireMessage,
} from '../protocol.ts';

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
}

/** Commands that share a stageGroup land on one tick this many ticks after the first arrives (60 ms) [ENG]. */
export const STAGE_LEAD_TICKS = 3;
const STAGE_GROUP_TTL_MS = 5000;
const SEEN_MAX = 500;
/**
 * A hidden-tab catch-up arrives as ONE batch, and the app's 1 Hz truth events are up to 27 KB each (200 events reached
 * 379 KB) — every wire message holds at most this much JSON and this many events, so it passes the receivers' 256 KB
 * budget (guard.ts) [ENG: half the budget].
 */
export const MESSAGE_BUDGET_BYTES = 128 * 1024;
export const EVENTS_PER_MESSAGE = 200;
/** Events that stay on the host: audio is scheduled locally by every monitor from its own engine. */
const LOCAL_ONLY = new Set<WireEvent['type']>(['tone', 'toneCancel']);
const TICK_S = 0.02;
/** A viewer that said hello this recently still gets the mirrored link commands (it re-hellos on every
 *  resync) [ENG]. */
const VIEWER_TTL_MS = 600_000;
/** While the Ventilator view drives the patient, a `cockpit` event goes to the network at most this often [ENG]. */
export const COCKPIT_EVENT_MS = 1000;
/**
 * A fast-forward runs in steps of this many ticks (0.5 s of sim); the host's scenario is polled after each and its
 * commands land before the next — finer than the app's own 100 ms wall poll at ×8 (0.8 s of sim) [ENG].
 */
export const FF_STEP_TICKS = 25;
/** The longest fast-forward the host accepts, s (the owner asked for 5 min) [ENG]. */
export const FF_MAX_S = 600;

type AckBody = Extract<WireBody, { kind: 'ack' }>;

export class HostSession {
  readonly peerId: string;
  private readonly o: HostSessionOptions;
  private readonly stamp: (b: WireBody) => WireMessage;
  private readonly now: () => number;
  private readonly transports = new Map<ManagedTransport, () => void>();
  /**
   * Per transport, each peer's sequence filter and whether its last hello said `viewer` — keyed by (transport, from),
   * so a frame on one transport (a phone on the relay claiming the panel's id) never touches a peer on another (the
   * in-process panel). A detached transport's peers are forgotten with it (verification 2026-10-29).
   */
  private readonly peers = new WeakMap<ManagedTransport, { seqs: SeqFilter; viewers: Set<string> }>();
  private readonly seen = new Map<string, AckBody>();
  private readonly groups = new Map<string, { tick: Tick; at: number }>();
  private readonly sticky = new Map<string, WireCommand>();
  private readonly marks = new Map<string, PatientSnapshot>();
  private readonly targets = new Map<StateVar, { value: number; untilT: number }>();
  private batch: WireEvent[] = [];
  private flushQueued = false;
  private chain: Promise<void> = Promise.resolve();
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
    this.transports.set(t, () => {
      offMsg();
      offStatus();
    });
    return () => this.detach(t);
  }

  bookmarks(): string[] {
    return [...this.marks.keys()];
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
    const run = this.chain.then(async () => {
      const { result, applied } = await this.apply(cmd);
      if (!result.accepted) {
        this.stats.rejected++;
        return result;
      }
      this.stats.applied++;
      this.queue({ type: 'commandApplied', commandId: cmd.id, tick: result.tick, resolved: { command: applied } satisfies AppliedResolution });
      return result;
    });
    this.chain = run.then(() => undefined, (err) => console.error('[pme host]', err));
    return run;
  }

  /**
   * A command the host's monitor applied OUTSIDE this session (the Ventilator view's link drives it directly,
   * up to 400 commands a second at ×8) — sent as a `mirror` commandApplied so a second-screen viewer applies it at the
   * same tick, and only while a viewer has said hello (no traffic in a session without one) [ENG: 10 min].
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
    this.offEngine();
    for (const t of [...this.transports.keys()]) this.detach(t);
  }

  // --- internals ---------------------------------------------------------------------------------------------
  private detach(t: ManagedTransport): void {
    this.transports.get(t)?.();
    this.transports.delete(t);
    this.peers.delete(t);
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
    if (!p) this.peers.set(t, (p = { seqs: new SeqFilter(), viewers: new Set() }));
    if (p.seqs.check(m) === 'duplicate') return;
    // A peer that said hello as a viewer sends no commands — the relay already refuses them on a WebSocket; a
    // BroadcastChannel peer is held to the same rule (one trust model per role, whatever the transport). Only a hello
    // the sequence check accepted counts: a stale frame carrying a peer's id changes nothing
    if (m.kind === 'hello') (m.role === 'viewer' ? p.viewers.add(m.from) : p.viewers.delete(m.from));
    if (m.kind === 'hello' && m.role === 'viewer') this.viewerSeenAt = this.now();
    if (m.kind === 'hello' && m.role !== 'host') return this.welcome(t);
    if (m.kind === 'command' && p.viewers.has(m.from)) {
      t.send(this.stamp({ kind: 'ack', commandId: m.body.id, accepted: false, tick: this.o.target.now().tick, reason: 'a viewer cannot command' }));
      return;
    }
    if (m.kind === 'command') return this.command(t, m.body, m.from);
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
    // While the host fast-forwards, a controller's command waits for nothing — it is refused with the reason
    const { result, applied } = this.ff ? { result: { accepted: false, tick: this.o.target.now().tick, reason: 'the simulation is fast-forwarding; try again when it ends' }, applied: cmd } : await this.apply(cmd);
    const ack: AckBody = {
      kind: 'ack', commandId: cmd.id, accepted: result.accepted, tick: result.tick,
      ...(result.reason !== undefined ? { reason: result.reason } : {}),
    };
    if (this.seen.size >= SEEN_MAX) this.seen.delete(this.seen.keys().next().value as string);
    this.seen.set(cmd.id, ack);
    t.send(this.stamp(ack));
    this.o.onCommand?.({ commandId: cmd.id, from, receivedAt, tick: result.tick, accepted: result.accepted });
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

  /** Dispatch one command; returns the result and the command as applied (with atTick). */
  private async applyOnce(cmd: WireCommand): Promise<{ result: DispatchResult; applied: WireCommand }> {
    const { tick, simT } = this.o.target.now();
    const reject = (reason: string) => ({ result: { accepted: false, tick, reason }, applied: cmd });
    if (cmd.type === 'time') return this.time(cmd);
    if (cmd.type === 'scenario') return this.scenario(cmd);
    // Pin, release and setMode go to the engine, which validates them. setFactor reaches the engine too and is refused
    // there with its own reason until the engine models factors.
    // applyEvent/attachSensor are not in engine-core's Command union yet; the engine validates them at run time.
    let c = cmd as Command;
    if (cmd.stageGroup) {
      const g = this.groups.get(cmd.stageGroup);
      const at = g && this.now() - g.at < STAGE_GROUP_TTL_MS ? g.tick : tick + STAGE_LEAD_TICKS;
      if (!g) this.groups.set(cmd.stageGroup, { tick: at, at: this.now() });
      c = { ...c, atTick: at };
    }
    const result = await this.o.target.dispatch(c);
    const applied: Command = { ...c, atTick: result.tick };
    if (result.accepted) {
      if (c.type === 'setTarget') {
        const r = c.ramp;
        const untilT = result.tick * TICK_S + (r ? (r.delayS ?? 0) + r.durationS : 0);
        this.targets.set(c.variable, { value: c.value, untilT });
      }
      if (c.type === 'device' && c.action.device === 'ecg' && c.action.action === 'filter') this.sticky.set('ecg.filter', applied);
      if (c.type === 'device' && c.action.device === 'ecg' && c.action.action === 'lead') this.sticky.set(`ecg.lead.${c.action.lane}`, applied);
    }
    this.pruneGroups();
    return { result, applied };
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
  private fastForward(cmd: TimeCommand): { result: DispatchResult; applied: WireCommand } {
    const { tick } = this.o.target.now();
    const no = (reason: string) => ({ result: { accepted: false, tick, reason }, applied: cmd });
    const target = this.o.target;
    if (!target.fastForwardStep) return no('this monitor cannot fast-forward');
    if (!(typeof cmd.value === 'number' && cmd.value > 0 && cmd.value <= FF_MAX_S)) return no(`fast-forward must be 0–${FF_MAX_S} s`);
    if (this.ff) return no('a fast-forward is already running');
    const ff = { fromTick: tick, toTick: tick + Math.round(cmd.value / TICK_S), alarms: [] };
    this.ff = ff;
    const applied: TimeCommand = { ...cmd, atTick: tick };
    void this.runFastForward(ff, applied, (n, last) => (target.fastForwardStep as NonNullable<HostTarget['fastForwardStep']>)(n, last));
    return { result: { accepted: true, tick }, applied };
  }

  private async runFastForward(ff: { fromTick: Tick; toTick: Tick; alarms: FastForwardAlarm[] }, cmd: TimeCommand, advance: NonNullable<HostTarget['fastForwardStep']>): Promise<void> {
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
      const w0 = this.now();
      while (tick < ff.toTick) {
        if (this.timelines !== timeline) {
          stopped = 'a new patient or scenario started';
          break;
        }
        const n = Math.min(FF_STEP_TICKS, ff.toTick - tick);
        tick = (await advance(n, tick + n >= ff.toTick)).tick;
        await this.chain; // the scenario's commands of this step are applied before the next step
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

  private async scenario(cmd: ScenarioCommand): Promise<{ result: DispatchResult; applied: WireCommand }> {
    const { tick } = this.o.target.now();
    if (this.o.scenario) {
      const { applied: a, ...result } = await this.o.scenario(cmd);
      const applied = a ?? cmd;
      if (result.accepted) this.scenarioApplied(applied);
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
  private scenarioApplied(c: ScenarioCommand): void {
    if (c.action === 'bookmark') this.sticky.set(`bookmark.${c.target}`, c);
    if (c.action === 'load') {
      this.sticky.delete('scenario.run');
      this.sticky.set('scenario.load', c);
    }
    if (c.action === 'pause' || c.action === 'resume') this.sticky.set('scenario.run', c);
    if (c.action === 'restoreBookmark') {
      this.newTimeline('restore');
      queueMicrotask(() => this.broadcast({ kind: 'hello', role: 'host' }));
    }
  }

  private pruneGroups(): void {
    const now = this.now();
    for (const [k, g] of this.groups) if (now - g.at > STAGE_GROUP_TTL_MS) this.groups.delete(k);
  }
}
