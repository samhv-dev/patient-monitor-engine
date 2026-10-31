// The controller end (same-screen panel over in-process, or a remote over BroadcastChannel/WebSocket/WebRTC).
// Commands carry a unique id; unacked ones are re-sent on every reconnect and host hello, and the host
// de-duplicates by id, so a Wi-Fi drop never applies a command twice.
// While the link is open an unanswered command is also re-sent every COMMAND_RESEND_MS (a message lost on the way:
// Playwright Linux WebKit's BroadcastChannel), and refused after COMMAND_ANSWER_TIMEOUT_MS with no answer (a host
// that stopped answering) — a sender always hears back; it never waits forever.
import type { RhythmId, SimSeconds } from '@pme/engine-core';
import {
  createStamper,
  newPeerId,
  fastForwardDone,
  SeqFilter,
  type AckResult,
  type AppliedResolution,
  type CommandInput,
  type FastForwardDone,
  type ManagedTransport,
  type MeasuredMap,
  type StateEvent,
  type TransportStatus,
  type WireBody,
  type WireCommand,
  type WireEvent,
  type WireMessage,
} from '../protocol.ts';
import { ScenarioView } from '../scenario/view.ts';

export interface LogEntry {
  /** Wall time (epoch ms) the entry was made. */
  at: number;
  /** Host sim time, when known. */
  simT: SimSeconds | null;
  kind: 'command' | 'ack' | 'applied' | 'note' | 'status' | 'alarm' | 'marker' | 'scenario';
  text: string;
  commandId?: string;
}

export interface ControllerSessionOptions {
  session: string;
  transport: ManagedTransport;
  peerId?: string;
  /** issuedBy on every command (default 'controller:<peerId>'). */
  issuedBy?: string;
  wallNow?: () => number;
  logMax?: number;
  /** FX-2: re-send an unanswered command this often while the link is open (default COMMAND_RESEND_MS). */
  resendMs?: number;
  /** FX-2: refuse a command after this long open with no answer (default COMMAND_ANSWER_TIMEOUT_MS). */
  answerTimeoutMs?: number;
}

/** FX-2: an unanswered command goes again this often while the link is open; the host de-duplicates by id [ENG]. */
export const COMMAND_RESEND_MS = 2000;
/** FX-2: …and is refused ("no answer from the host") after this long open with no answer [ENG: a restore under load takes ≤ 2 s]. */
export const COMMAND_ANSWER_TIMEOUT_MS = 15_000;

interface Pending {
  cmd: WireCommand;
  sentAt: number;
  resolve: (r: AckResult) => void;
  reject: (e: Error) => void;
  /** FX-2: how long the link has been open with this command unanswered, ms (time without a link does not count). */
  waitedMs: number;
}

export class ControllerSession {
  readonly peerId: string;
  readonly log: LogEntry[] = [];
  readonly measurements: MeasuredMap = {};
  state: StateEvent | null = null;
  simT: SimSeconds | null = null;
  hostOnline = false;
  hostEngineVersion: string | null = null;
  bookmarks: string[] = [];
  /** The host's current rhythm: from `rhythmSegment` events, applied `setRhythm` commands and the 1 Hz `state` event;
   * null until seen. */
  rhythm: RhythmId | null = null;
  /** The host's scenario as seen from here. */
  readonly scenario = new ScenarioView();
  /** The host's simulation speed and pause, from its applied `time` commands (sticky replays included). */
  timeScale = 1;
  hostPaused = false;
  /** The host's fast-forward while it runs (null otherwise), and the last one that ended. */
  fastForward: { fromT: SimSeconds; toT: SimSeconds } | null = null;
  lastFastForward: FastForwardDone | null = null;
  private readonly o: ControllerSessionOptions;
  private readonly stamp: (b: WireBody) => WireMessage;
  private readonly now: () => number;
  private readonly pending = new Map<string, Pending>();
  /** Staged deliveries being answered, by batch id: each item's line, in send order, and the answers so far. */
  private readonly batches = new Map<string, { n: number; items: Map<string, string>; answered: Set<string> }>();
  private readonly seqs = new SeqFilter();
  private readonly fns = new Set<() => void>();
  private readonly offs: Array<() => void>;
  private n = 0;
  private closed = false;
  private retryTimer: ReturnType<typeof setInterval> | null = null;

  constructor(o: ControllerSessionOptions) {
    this.o = o;
    this.peerId = o.peerId ?? newPeerId('ctl');
    this.now = o.wallNow ?? (() => performance.timeOrigin + performance.now());
    this.stamp = createStamper(o.session, this.peerId, this.now);
    this.offs = [
      o.transport.onStatus((s) => this.onStatus(s)),
      o.transport.onMessage((m) => this.onMessage(m)),
      // The relay says the host left — the panel stops showing it as connected
      o.transport.onPresence?.((p) => {
        if (p.hostOnline || !this.hostOnline) return;
        this.hostOnline = false;
        this.addLog('status', 'host offline');
      }) ?? (() => undefined),
    ];
  }

  get status(): TransportStatus {
    return this.o.transport.status;
  }
  get pendingCount(): number {
    return this.pending.size;
  }

  /** Send a command; resolves on the host's ack (accepted or not). Survives reconnects. */
  send(input: CommandInput): Promise<AckResult> {
    if (this.closed) return Promise.reject(new Error('session closed'));
    const cmd = { ...input, id: input.id ?? `${this.peerId}-${++this.n}`, issuedBy: this.o.issuedBy ?? `controller:${this.peerId}` } as WireCommand;
    return new Promise<AckResult>((resolve, reject) => {
      this.pending.set(cmd.id, { cmd, sentAt: this.now(), resolve, reject, waitedMs: 0 });
      if (cmd.batch) this.batchItem(cmd.batch, cmd);
      else this.addLog('command', describe(cmd), cmd.id);
      this.transmit(cmd);
      this.retryTimer ??= setInterval(() => this.retry(), this.o.resendMs ?? COMMAND_RESEND_MS);
    });
  }

  /** An instructor note in the event log (a debrief marker; not sent to the host). */
  note(text: string): void {
    this.addLog('note', text);
  }

  onChange(fn: () => void): () => void {
    this.fns.add(fn);
    return () => {
      this.fns.delete(fn);
    };
  }

  close(): void {
    this.closed = true;
    this.stopRetry();
    for (const off of this.offs) off();
    for (const p of this.pending.values()) p.reject(new Error('session closed'));
    this.pending.clear();
    // a staged delivery still being answered gets its one line with the answers received so far (IP9 review L7)
    for (const [id, g] of this.batches) this.batchLine(id, g, ' (no answer: the session closed)');
    this.batches.clear();
  }

  // --- internals ---------------------------------------------------------------------------------------------
  private transmit(cmd: WireCommand): void {
    if (this.o.transport.status === 'open') this.o.transport.send(this.stamp({ kind: 'command', body: cmd }));
  }

  private resendPending(): void {
    for (const p of this.pending.values()) this.transmit(p.cmd);
  }

  /** FX-2: every unanswered command again, or its refusal once it has waited out the timeout on an open link. */
  private retry(): void {
    if (this.pending.size === 0) return this.stopRetry();
    if (this.o.transport.status !== 'open') return; // a reconnect sends them again; time without a link does not count
    const every = this.o.resendMs ?? COMMAND_RESEND_MS;
    const limit = this.o.answerTimeoutMs ?? COMMAND_ANSWER_TIMEOUT_MS;
    for (const [id, p] of [...this.pending]) {
      p.waitedMs += every;
      if (p.waitedMs < limit) this.transmit(p.cmd);
      else this.answer(id, p, { accepted: false, tick: -1, reason: `no answer from the host in ${Math.round(limit / 1000)} s` });
    }
  }

  private stopRetry(): void {
    if (this.retryTimer !== null) clearInterval(this.retryTimer);
    this.retryTimer = null;
  }

  private answer(id: string, p: Pending, a: { accepted: boolean; tick: number; reason?: string }): void {
    this.pending.delete(id);
    const r: AckResult = { commandId: id, accepted: a.accepted, tick: a.tick, rttMs: this.now() - p.sentAt, ...(a.reason !== undefined ? { reason: a.reason } : {}) };
    if (p.cmd.batch) this.batchAnswered(p.cmd.batch.id, id, a);
    else this.addLog('ack', a.accepted ? `ok (${Math.round(r.rttMs)} ms)` : `rejected: ${a.reason ?? ''}`, id);
    p.resolve(r);
  }

  /** An item of a staged delivery is sent: no line of its own (the batch gets one). */
  private batchItem(b: { id: string; n: number }, cmd: WireCommand): void {
    const g = this.batches.get(b.id) ?? { n: b.n, items: new Map<string, string>(), answered: new Set<string>() };
    g.items.set(cmd.id, describe(cmd));
    this.batches.set(b.id, g);
  }

  /** …and answered: once all n are, ONE `command` line names every item and each refusal. */
  private batchAnswered(batchId: string, id: string, a: { accepted: boolean; reason?: string }): void {
    const g = this.batches.get(batchId);
    if (!g) return;
    if (!a.accepted) g.items.set(id, `${g.items.get(id) ?? id} (refused: ${a.reason ?? 'no reason given'})`);
    g.answered.add(id);
    if (g.answered.size < g.n) return;
    this.batches.delete(batchId);
    this.batchLine(batchId, g, '');
  }

  /** The batch's one `command` line: every item, a refusal named; an item not answered gets `unanswered`. */
  private batchLine(batchId: string, g: { n: number; items: Map<string, string>; answered: Set<string> }, unanswered: string): void {
    this.addLog('command', `staged ×${g.n}: ${[...g.items].map(([id, t]) => (g.answered.has(id) ? t : `${t}${unanswered}`)).join(' · ')}`, batchId);
  }

  private onStatus(s: TransportStatus): void {
    if (s === 'open') {
      this.o.transport.send(this.stamp({ kind: 'hello', role: 'controller' }));
      this.resendPending();
    } else this.hostOnline = false;
    this.addLog('status', `link ${s}`);
  }

  private onMessage(m: WireMessage): void {
    if (this.seqs.check(m) === 'duplicate') return;
    switch (m.kind) {
      case 'hello':
        if (m.role === 'host') {
          this.hostOnline = true;
          this.resendPending();
          this.changed();
        }
        return;
      case 'ack': {
        const p = this.pending.get(m.commandId);
        if (p) this.answer(m.commandId, p, m);
        return;
      }
      case 'event':
        for (const e of m.body) this.onEvent(e);
        this.changed();
        return;
      case 'snapshot':
        this.hostEngineVersion = m.body.engineVersion;
        this.hostOnline = true;
        this.changed();
        return;
      case 'command':
        return;
    }
  }

  private onEvent(e: WireEvent): void {
    if (e.type === 'timeline') {
      // a new engine (patient restart, scenario load): the clock restarts; the old run ended with the old body.
      // A bookmark restore starts a timeline too — the clock goes back, the scenario run continues.
      this.simT = e.t;
      if (e.cause !== 'restore') this.scenario.reset();
      this.fastForward = null; // A fast-forward ends with its timeline
      return;
    }
    if ('t' in e && typeof e.t === 'number') this.simT = Math.max(this.simT ?? 0, e.t); // monotonic within one timeline
    this.scenario.onEvent(e);
    if (e.type === 'state') {
      this.state = e;
      if (e.rhythm) this.rhythm = e.rhythm.id; // Engine-initiated changes (shock outcome, drug conversion) too
    }
    else if (e.type === 'rhythmSegment') this.rhythm = e.rhythm;
    else if (e.type === 'measurement') Object.assign(this.measurements, e.values);
    else if (e.type === 'alarm') this.addLog('alarm', `${e.priority} ${e.state}: ${e.text}`);
    else if (e.type === 'marker') this.addLog('marker', e.kind);
    else if (e.type === 'scenario') this.addLog('scenario', `→ ${e.stateId}${e.transitionId ? ` (${e.transitionId})` : ''}`);
    else if (e.type === 'fastForward') {
      // Every controller sees the host's fast-forward, like its speed and pause
      if (e.phase === 'start') this.fastForward = { fromT: e.fromT, toT: e.toT };
      else {
        this.fastForward = null;
        this.lastFastForward = fastForwardDone(e);
      }
      this.addLog('marker', e.phase === 'start' ? `fast-forward ${Math.round(e.toT - e.fromT)} s` : `fast-forward ended${e.stopped ? `: ${e.stopped}` : ''}`);
    } else if (e.type === 'commandApplied') {
      const res = e.resolved as AppliedResolution | undefined;
      const c = res?.command;
      if (c?.type === 'time' && c.action === 'scale' && typeof c.value === 'number') this.timeScale = c.value;
      if (c?.type === 'time' && (c.action === 'pause' || c.action === 'resume')) this.hostPaused = c.action === 'pause';
      // A late joiner learns a running fast-forward from the sticky jump (its atTick = where it began)
      if (c?.type === 'time' && c.action === 'jump' && res?.replay && typeof c.value === 'number') this.fastForward = { fromT: (c.atTick ?? e.tick) * 0.02, toT: (c.atTick ?? e.tick) * 0.02 + c.value };
      // The driver's own stage marks are not the instructor's bookmarks (the marks list shows the instructor's only)
      if (c?.type === 'scenario' && c.action === 'bookmark' && c.kind !== 'stage' && c.target && !this.bookmarks.includes(c.target)) this.bookmarks = [...this.bookmarks, c.target];
      if (c?.type === 'setRhythm') this.rhythm = c.rhythm;
      const mine = e.commandId.startsWith(`${this.peerId}-`); // our own commands are already logged with their ack
      if (c && !res?.replay && !res?.mirror && !mine) this.addLog('applied', describe(c), e.commandId); // Link traffic is not a log line
    }
  }

  private addLog(kind: LogEntry['kind'], text: string, commandId?: string): void {
    this.log.push({ at: this.now(), simT: this.simT, kind, text, ...(commandId ? { commandId } : {}) });
    const max = this.o.logMax ?? 500;
    if (this.log.length > max) this.log.splice(0, this.log.length - max);
    this.changed();
  }

  private changed(): void {
    for (const fn of [...this.fns]) fn();
  }
}

/** One-line human description of a command, for logs. */
export function describe(c: WireCommand): string {
  switch (c.type) {
    case 'setTarget':
      return `${c.variable} → ${c.value}${c.ramp ? ` over ${c.ramp.durationS} s (${c.ramp.curve ?? 'linear'})` : ''}`;
    case 'setRhythm':
      return `rhythm ${c.rhythm}${c.when === 'nextBeat' ? ' (next beat)' : ''}`;
    case 'setModifiers':
      return `modifiers ${JSON.stringify(c.modifiers)}`;
    case 'device':
      if (c.action.device === 'nibp') return `nibp ${c.action.action}${c.action.intervalMin !== undefined ? ` every ${c.action.intervalMin} min` : ''}`;
      if (c.action.device === 'iabp' || c.action.device === 'lvad') return `${c.action.device} ${c.action.action}`;
      if (c.action.device === 'tof' || c.action.device === 'depth') return `${c.action.device} ${c.action.action}${'intervalS' in c.action && c.action.intervalS !== undefined ? ` every ${c.action.intervalS} s` : ''}`;
      return `${c.action.device} ${c.action.action} ${String(c.action.value ?? '')}${c.action.lane !== undefined ? ` lane ${c.action.lane}` : ''}`;
    case 'time':
      return `time ${c.action}${c.value !== undefined ? ` ${c.value}` : ''}`;
    case 'scenario':
      return `scenario ${c.action}${c.target ? ` ${c.target}` : ''}`;
    case 'pin':
      return `pin ${c.variable}${c.value !== undefined ? ` at ${c.value}` : ''}`;
    case 'release':
      return `release ${c.variable}`;
    case 'setFactor':
      return `${c.input} × ${c.factor}`;
    case 'setMode':
      return `mode ${c.mode}`;
    case 'applyEvent': // Generic: every ClinicalEvent kind logs its fields, e.g. "event cpr true 110"
      return `event ${Object.values(c.event).join(' ')}`;
    case 'attachSensor':
      return `sensor ${c.sensor} ${c.state}${c.site ? ` @${c.site}` : ''}`;
    case 'note': // A remote's judged objective or note (plan instructor-peer-role.md §6; nothing sends it before P6)
      return `${c.kind} ${c.text}`;
    case 'externalDrive':
      return `drive paw ${c.frame.pawCmH2O.toFixed(1)} flow ${c.frame.flowLps.toFixed(2)}`;
  }
}
