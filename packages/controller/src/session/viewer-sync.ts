// Viewer role (brief §3.7): a second monitor that runs its OWN engine and never receives samples. It restores
// the host's snapshot, then mirrors every applied engine command at the host's tick (commandApplied with
// resolved.command.atTick), while its clock follows the host's 1 Hz `state` anchors a fixed delay behind.
// On the same build this is sample-identical (the engine is deterministic, brief §3.3). If a mirrored command
// arrives too late, a beat's time disagrees with the host's, the link reconnects or the host says hello again,
// it resyncs by saying hello (→ fresh snapshot).
import { MAX_TIME_SCALE, MIN_TIME_SCALE, type Command, type DispatchResult, type EngineEvent, type PatientSnapshot, type SimSeconds } from '@pme/engine-core';
import {
  createStamper,
  newPeerId,
  fastForwardDone,
  SeqFilter,
  type AppliedResolution,
  type FastForwardDone,
  type ManagedTransport,
  type WireBody,
  type WireEvent,
  type WireMessage,
} from '../protocol.ts';

/** What the viewer needs from its local monitor. */
export interface ViewerTarget {
  /** engine.restore(s) and move the render clock to s.tick. */
  restore(s: PatientSnapshot): void;
  /** Mirror a host command (also updates lane chrome for lead/filter commands). */
  dispatch(cmd: Command): DispatchResult;
  on(fn: (e: EngineEvent) => void, types?: EngineEvent['type'][]): () => void;
  /** The sim time currently drawn. */
  renderT(): SimSeconds;
  /** Engine tick (commands must arrive before the viewer reaches their tick). */
  tick(): number;
  setRate(k: number): void;
  setPaused(p: boolean): void;
  /** Move the clock forward to simT (engine catches up without drawing the gap). */
  jumpTo(simT: SimSeconds): void;
}

export type ViewerStatus = 'waiting' | 'synced' | 'incompatible';

export interface ViewerSyncOptions {
  session: string;
  transport: ManagedTransport;
  target: ViewerTarget;
  /** Engine build of this viewer; a snapshot from a different build cannot be mirrored. */
  engineVersion: string;
  /** How far behind the host the viewer draws (default 0.1 s) — the jitter budget for mirrored commands [ENG]. */
  delayS?: number;
  peerId?: string;
  wallNow?: () => number;
}

const BEAT_TOLERANCE_S = 0.001; // same build ⇒ identical times; anything above this is divergence [ENG]
const MAX_EXTRAPOLATE_S = 3; // stop running ahead of a silent host after this long [ENG]
const TICK_S = 0.02;

export class ViewerSync {
  readonly peerId: string;
  status: ViewerStatus = 'waiting';
  resyncs = 0;
  /** Last measured |viewer beat − host beat| for the same seq, ms (0 when mirrored exactly). */
  beatDriftMs = 0;
  /** Wall-clock lag behind the host's anchored now, s (≈ delayS when locked). */
  lagS = 0;
  /** Stage 10: the host's fast-forward while it runs, and the last one that ended (a second screen's marker reads them). */
  fastForward: { fromT: SimSeconds; toT: SimSeconds } | null = null;
  lastFastForward: FastForwardDone | null = null;
  /** Stage 10: the host's sim time during its fast-forward (from its events; the second screen's panel runs its clock). */
  fastForwardAt: SimSeconds | null = null;
  private readonly o: ViewerSyncOptions;
  private readonly delayS: number;
  private readonly stamp: (b: WireBody) => WireMessage;
  private readonly now: () => number;
  private readonly seqs = new SeqFilter();
  private readonly offs: Array<() => void>;
  private awaiting = false;
  private replays: Command[] = [];
  private early: Command[] = [];
  private anchor: { simT: number; wallMs: number } | null = null;
  private hostPaused = false;
  private hostFastForward = false; // Stage 10: the host is fast-forwarding — wait, then take a fresh snapshot
  private hostRate = 1;
  private readonly mirrored = new Set<string>(); // commandIds already applied (an engine that emits its own
  // commandApplied from Stage 5 on must not make the viewer apply a command twice)
  private readonly hostBeats = new Map<number, number>();
  private readonly localBeats = new Map<number, number>();

  constructor(o: ViewerSyncOptions) {
    this.o = o;
    this.delayS = o.delayS ?? 0.1;
    this.peerId = o.peerId ?? newPeerId('view');
    this.now = o.wallNow ?? (() => performance.timeOrigin + performance.now());
    this.stamp = createStamper(o.session, this.peerId, this.now);
    o.target.setPaused(true);
    this.offs = [
      o.transport.onStatus((s) => {
        if (s === 'open') this.requestSync();
      }),
      o.transport.onMessage((m) => this.onMessage(m)),
      o.target.on((e) => {
        if (e.type === 'beat') {
          this.localBeats.set(e.seq, e.t);
          this.compareBeat(e.seq);
        }
      }, ['beat']),
    ];
  }

  /** Call once per animation frame, before the monitor draws: steers the local clock onto the host's. */
  follow(): void {
    const t = this.o.target;
    if (this.status !== 'synced' || !this.anchor) return t.setPaused(true);
    if (this.hostPaused || this.hostFastForward) return t.setPaused(true);
    const since = (this.now() - this.anchor.wallMs) / 1000;
    const hostNow = this.anchor.simT + Math.min(since, MAX_EXTRAPOLATE_S) * this.hostRate;
    const want = hostNow - this.delayS;
    const err = want - t.renderT();
    this.lagS = hostNow - t.renderT();
    if (err > 1) {
      t.jumpTo(want);
      t.setPaused(false);
      return;
    }
    if (err < -0.05) return t.setPaused(true); // ahead of the host: wait for it
    t.setPaused(false);
    t.setRate(Math.min(MAX_TIME_SCALE, Math.max(MIN_TIME_SCALE, this.hostRate * (1 + Math.max(-0.1, Math.min(0.1, 0.5 * err)))))); // Stage 10: ×8
  }

  close(): void {
    for (const off of this.offs) off();
  }

  // --- internals ---------------------------------------------------------------------------------------------
  /** `newTimeline`: the host's clock may have gone back — the old anchor must not steer the restored engine (F04, BA04). */
  private requestSync(newTimeline = false): void {
    if (newTimeline) this.anchor = null;
    if (this.status === 'synced') this.resyncs++;
    this.awaiting = true;
    this.replays = [];
    this.early = [];
    if (this.status !== 'incompatible') this.status = 'waiting';
    this.o.target.setPaused(true);
    this.o.transport.send(this.stamp({ kind: 'hello', role: 'viewer' }));
  }

  private onMessage(m: WireMessage): void {
    // Gaps are normal here (the relay routes acks and snapshots only to the peers that need them), so only
    // duplicates are dropped; a lost connection shows up as a transport 'open' → requestSync().
    if (this.seqs.check(m) === 'duplicate') return;
    if (m.kind === 'hello' && m.role === 'host') {
      // host (re)started, reloaded or restored a bookmark. R50 F5: a reloaded host has its own speed and pause — the old
      // host's are forgotten here; the sticky time commands it replays to our hello set them again
      this.hostRate = 1;
      this.hostPaused = false;
      return this.requestSync(true);
    }
    if (m.kind === 'snapshot') return this.onSnapshot(m.body);
    if (m.kind === 'event') for (const e of m.body) this.onEvent(e);
  }

  private onSnapshot(s: PatientSnapshot): void {
    if (!this.awaiting) return; // someone else's late-join snapshot
    this.awaiting = false;
    if (s.engineVersion !== this.o.engineVersion) {
      this.status = 'incompatible';
      return;
    }
    for (const c of this.replays) this.o.target.dispatch(c); // lane chrome only: restore() replaces engine state
    this.o.target.restore(s);
    for (const c of this.early) if ((c.atTick ?? 0) > s.tick) this.o.target.dispatch(c);
    this.replays = [];
    this.early = [];
    this.hostBeats.clear();
    this.localBeats.clear();
    this.anchor ??= { simT: s.tick * TICK_S, wallMs: this.now() };
    this.status = 'synced';
  }

  private onEvent(e: WireEvent): void {
    // FU-11 (showcase hotfix note; F04, BA04): a new timeline (patient restart, bookmark restore) — drop the anchor and
    // take a fresh snapshot; a restart sends no host hello, so without this the viewer mirrored onto the old body
    if (e.type === 'timeline') {
      this.hostFastForward = false; // Stage 10: a fast-forward ends with its timeline
      this.fastForward = null;
      return this.requestSync(true);
    }
    if (e.type === 'fastForward') {
      // Stage 10: the host runs minutes in seconds — this viewer waits (paused) and then starts again from the host's
      // snapshot at the end, rather than running every skipped tick itself on the same machine
      this.hostFastForward = e.phase === 'start';
      this.fastForward = e.phase === 'start' ? { fromT: e.fromT, toT: e.toT } : null;
      if (e.phase === 'end') {
        this.lastFastForward = fastForwardDone(e);
        this.requestSync(true); // Task 6: drops the pre-span anchor; the end snapshot (or the next state) re-anchors at now
      }
      return;
    }
    if (this.hostFastForward) {
      if ('t' in e && typeof e.t === 'number') this.fastForwardAt = e.t;
      return; // the snapshot at the end holds what happens meanwhile
    }
    if (e.type === 'state') {
      this.setAnchor(e.t);
      return;
    }
    if (e.type === 'beat') {
      this.hostBeats.set(e.seq, e.t);
      this.compareBeat(e.seq);
      return;
    }
    if (e.type !== 'commandApplied') return;
    const res = e.resolved as AppliedResolution | undefined;
    const c = res?.command;
    if (!c) return;
    if (c.type === 'time') {
      if (c.action === 'pause') this.hostPaused = true;
      if (c.action === 'resume') {
        this.hostPaused = false;
        // Stage 10 Task 6: the host sent no state while paused (nor while it fast-forwarded), so the old anchor would
        // project the whole pause forward (up to MAX_EXTRAPOLATE_S × rate) and the viewer leapt ahead, then froze.
        // Re-anchor at the host's time of the resume, on the wall clock of now.
        if (this.anchor && !res?.replay) this.anchor = { simT: e.tick * TICK_S, wallMs: this.now() };
      }
      if (c.action === 'scale' && typeof c.value === 'number') this.hostRate = c.value;
      if (c.action === 'jump' && res?.replay && typeof c.value === 'number') {
        this.hostFastForward = true; // Stage 10: joined during a fast-forward (atTick = where it began)
        this.fastForward = { fromT: (c.atTick ?? e.tick) * TICK_S, toT: (c.atTick ?? e.tick) * TICK_S + c.value };
      }
      return;
    }
    if (c.type === 'scenario' || c.type === 'pin' || c.type === 'release' || c.type === 'setFactor' || c.type === 'setMode') return;
    const m = c as Command; // applyEvent/attachSensor are mirrored too; the engine validates them (Stage 6b)
    if (res?.replay) {
      if (this.awaiting) this.replays.push(m);
      return;
    }
    if (this.awaiting) {
      this.early.push(m);
      return;
    }
    if (this.status !== 'synced' || this.mirrored.has(e.commandId)) return;
    if ((m.atTick ?? 0) <= this.o.target.tick()) return this.requestSync(); // too late to mirror exactly
    this.mirrored.add(e.commandId);
    if (this.mirrored.size > 256) this.mirrored.delete(this.mirrored.values().next().value as string);
    this.o.target.dispatch(m);
  }

  /** Blend a new host anchor: small disagreements are smoothed, big ones reset [ENG]. */
  private setAnchor(simT: SimSeconds): void {
    const wallMs = this.now();
    if (!this.anchor || this.hostPaused) {
      this.anchor = { simT, wallMs };
      return;
    }
    const predicted = this.anchor.simT + ((wallMs - this.anchor.wallMs) / 1000) * this.hostRate;
    const d = simT - predicted;
    this.anchor = { simT: Math.abs(d) < 0.05 ? predicted + 0.25 * d : simT, wallMs };
  }

  private compareBeat(seq: number): void {
    const h = this.hostBeats.get(seq);
    const l = this.localBeats.get(seq);
    if (h === undefined || l === undefined) return;
    this.beatDriftMs = Math.abs(h - l) * 1000;
    this.hostBeats.delete(seq);
    this.localBeats.delete(seq);
    if (this.status === 'synced' && this.beatDriftMs > BEAT_TOLERANCE_S * 1000) this.requestSync();
    for (const map of [this.hostBeats, this.localBeats]) if (map.size > 64) map.delete(map.keys().next().value as number);
  }
}
