// The host end of every transport (brief §3.7, R7): it owns the engine. Commands in → dispatch → ack; engine
// events out, batched per frame; a `state` event at 1 Hz; a snapshot for anyone who says hello.
import type { Command, DispatchResult, EngineEvent, PatientSnapshot, SimSeconds, StateVar, Tick } from '@pme/engine-core';
import {
  createStamper,
  newPeerId,
  SeqFilter,
  type AppliedResolution,
  type ControlFlag,
  type ManagedTransport,
  type ScenarioCommand,
  type StateEvent,
  type TimeCommand,
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
  /** Remote equivalents of the lifecycle calls (brief §7.2 `time`): pause, resume, scale (0.25–4). */
  time(action: 'pause' | 'resume' | 'scale', value?: number): void;
}

/** What the scenario hook answers; `applied` replaces the command in commandApplied (e.g. a load with its doc). */
export type ScenarioHookResult = DispatchResult & { applied?: ScenarioCommand };
/**
 * Stage 6b's ScenarioDriver plugs in here. With a hook, EVERY scenario action (bookmarks included: they then hold
 * the runner state too) goes to it; without one, bookmarks are engine snapshots and the rest is rejected.
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
}

/** Commands that share a stageGroup land on one tick this many ticks after the first arrives (60 ms) [ENG]. */
export const STAGE_LEAD_TICKS = 3;
const STAGE_GROUP_TTL_MS = 5000;
const SEEN_MAX = 500;
/** Events that stay on the host: audio is scheduled locally by every monitor from its own engine. */
const LOCAL_ONLY = new Set<WireEvent['type']>(['tone', 'toneCancel']);
const TICK_S = 0.02;

type AckBody = Extract<WireBody, { kind: 'ack' }>;

export class HostSession {
  readonly peerId: string;
  private readonly o: HostSessionOptions;
  private readonly stamp: (b: WireBody) => WireMessage;
  private readonly now: () => number;
  private readonly transports = new Map<ManagedTransport, () => void>();
  private readonly seqs = new SeqFilter();
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
  readonly stats = { applied: 0, rejected: 0, duplicates: 0, snapshotsSent: 0 };

  constructor(o: HostSessionOptions) {
    this.o = o;
    this.peerId = o.peerId ?? newPeerId('host');
    this.now = o.wallNow ?? (() => performance.timeOrigin + performance.now());
    this.stamp = createStamper(o.session, this.peerId, this.now);
    this.offEngine = o.target.on((e) => {
      if (e.type === ('state' as EngineEvent['type'])) this.engineState = true; // the engine emits its own (E1)
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

  /** Broadcast an event that did not come from the engine (e.g. `scenario`), batched with this frame's events. */
  publish(e: WireEvent): void {
    this.queue(e);
  }

  /** Send the queued events now (normally a microtask after the frame that produced them). */
  flush(): void {
    this.flushQueued = false;
    if (this.batch.length === 0) return;
    const body = this.batch;
    this.batch = [];
    this.broadcast({ kind: 'event', body });
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
    if (m.from === this.peerId || this.seqs.check(m) === 'duplicate') return;
    if (m.kind === 'hello' && m.role !== 'host') return this.welcome(t);
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
    const { result, applied } = await this.apply(cmd);
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

  /** Dispatch one command; returns the result and the command as applied (with atTick). */
  private async apply(cmd: WireCommand): Promise<{ result: DispatchResult; applied: WireCommand }> {
    const { tick, simT } = this.o.target.now();
    const reject = (reason: string) => ({ result: { accepted: false, tick, reason }, applied: cmd });
    if (cmd.type === 'time') return this.time(cmd);
    if (cmd.type === 'scenario') return this.scenario(cmd);
    if (cmd.type === 'pin' || cmd.type === 'release' || cmd.type === 'setFactor' || cmd.type === 'setMode') {
      return reject(`${cmd.type} needs MODELED mode (Stage 7)`);
    }
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
    if (cmd.action === 'step' || cmd.action === 'jump') return { result: { accepted: false, tick, reason: `time ${cmd.action} arrives in Stage 6b` }, applied: cmd };
    if (cmd.action === 'scale' && !(typeof cmd.value === 'number' && cmd.value >= 0.25 && cmd.value <= 4)) {
      return { result: { accepted: false, tick, reason: 'scale must be 0.25–4' }, applied: cmd };
    }
    this.o.target.time(cmd.action, cmd.value);
    this.sticky.set(cmd.action === 'scale' ? 'time.scale' : 'time.run', cmd);
    return { result: { accepted: true, tick }, applied: cmd };
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
    if (c.action === 'restoreBookmark') queueMicrotask(() => this.broadcast({ kind: 'hello', role: 'host' }));
  }

  private pruneGroups(): void {
    const now = this.now();
    for (const [k, g] of this.groups) if (now - g.at > STAGE_GROUP_TTL_MS) this.groups.delete(k);
  }
}
