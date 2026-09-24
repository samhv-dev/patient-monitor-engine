// Viewer role (brief §3.7): a second monitor that runs its OWN engine and never receives samples. It restores
// the host's snapshot, then mirrors every applied engine command at the host's tick (commandApplied with
// resolved.command.atTick), while its clock follows the host's 1 Hz `state` anchors a fixed delay behind.
// On the same build this is sample-identical (the engine is deterministic, brief §3.3). If a mirrored command
// arrives too late, a beat's time disagrees with the host's, the link reconnects or the host says hello again,
// it resyncs by saying hello (→ fresh snapshot).
import type { Command, DispatchResult, EngineEvent, PatientSnapshot, SimSeconds } from '@pme/engine-core';
import {
  createStamper,
  newPeerId,
  SeqFilter,
  type AppliedResolution,
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
    if (this.hostPaused) return t.setPaused(true);
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
    t.setRate(Math.min(4, Math.max(0.25, this.hostRate * (1 + Math.max(-0.1, Math.min(0.1, 0.5 * err))))));
  }

  close(): void {
    for (const off of this.offs) off();
  }

  // --- internals ---------------------------------------------------------------------------------------------
  private requestSync(): void {
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
    if (m.kind === 'hello' && m.role === 'host') return this.requestSync(); // host (re)started or restored a bookmark
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
      if (c.action === 'resume') this.hostPaused = false;
      if (c.action === 'scale' && typeof c.value === 'number') this.hostRate = c.value;
      return;
    }
    if (c.type === 'scenario' || c.type === 'pin' || c.type === 'release' || c.type === 'setFactor' || c.type === 'setMode') return;
    if (res?.replay) {
      if (this.awaiting) this.replays.push(c);
      return;
    }
    if (this.awaiting) {
      this.early.push(c);
      return;
    }
    if (this.status !== 'synced' || this.mirrored.has(e.commandId)) return;
    if ((c.atTick ?? 0) <= this.o.target.tick()) return this.requestSync(); // too late to mirror exactly
    this.mirrored.add(e.commandId);
    if (this.mirrored.size > 256) this.mirrored.delete(this.mirrored.values().next().value as string);
    this.o.target.dispatch(c);
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
