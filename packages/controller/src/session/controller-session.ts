// The controller end (same-screen panel over in-process, or a remote over BroadcastChannel/WebSocket/WebRTC).
// Commands carry a unique id; unacked ones are re-sent on every reconnect and host hello, and the host
// de-duplicates by id, so a Wi-Fi drop never applies a command twice (BUILD-PLAN Stage 6 acceptance 3).
import type { SimSeconds } from '@pme/engine-core';
import {
  createStamper,
  newPeerId,
  SeqFilter,
  type AckResult,
  type AppliedResolution,
  type CommandInput,
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
}

interface Pending {
  cmd: WireCommand;
  sentAt: number;
  resolve: (r: AckResult) => void;
  reject: (e: Error) => void;
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
  /** The host's scenario as seen from here (Stage 6b). */
  readonly scenario = new ScenarioView();
  private readonly o: ControllerSessionOptions;
  private readonly stamp: (b: WireBody) => WireMessage;
  private readonly now: () => number;
  private readonly pending = new Map<string, Pending>();
  private readonly seqs = new SeqFilter();
  private readonly fns = new Set<() => void>();
  private readonly offs: Array<() => void>;
  private n = 0;
  private closed = false;

  constructor(o: ControllerSessionOptions) {
    this.o = o;
    this.peerId = o.peerId ?? newPeerId('ctl');
    this.now = o.wallNow ?? (() => performance.timeOrigin + performance.now());
    this.stamp = createStamper(o.session, this.peerId, this.now);
    this.offs = [
      o.transport.onStatus((s) => this.onStatus(s)),
      o.transport.onMessage((m) => this.onMessage(m)),
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
      this.pending.set(cmd.id, { cmd, sentAt: this.now(), resolve, reject });
      this.addLog('command', describe(cmd), cmd.id);
      this.transmit(cmd);
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
    for (const off of this.offs) off();
    for (const p of this.pending.values()) p.reject(new Error('session closed'));
    this.pending.clear();
  }

  // --- internals ---------------------------------------------------------------------------------------------
  private transmit(cmd: WireCommand): void {
    if (this.o.transport.status === 'open') this.o.transport.send(this.stamp({ kind: 'command', body: cmd }));
  }

  private resendPending(): void {
    for (const p of this.pending.values()) this.transmit(p.cmd);
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
        if (!p) return;
        this.pending.delete(m.commandId);
        const r: AckResult = { commandId: m.commandId, accepted: m.accepted, tick: m.tick, rttMs: this.now() - p.sentAt, ...(m.reason !== undefined ? { reason: m.reason } : {}) };
        this.addLog('ack', m.accepted ? `ok (${Math.round(r.rttMs)} ms)` : `rejected: ${m.reason ?? ''}`, m.commandId);
        p.resolve(r);
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
    if ('t' in e && typeof e.t === 'number') this.simT = Math.max(this.simT ?? 0, e.t);
    this.scenario.onEvent(e);
    if (e.type === 'state') this.state = e;
    else if (e.type === 'measurement') Object.assign(this.measurements, e.values);
    else if (e.type === 'alarm') this.addLog('alarm', `${e.priority} ${e.state}: ${e.text}`);
    else if (e.type === 'marker') this.addLog('marker', e.kind);
    else if (e.type === 'scenario') this.addLog('scenario', `→ ${e.stateId}${e.transitionId ? ` (${e.transitionId})` : ''}`);
    else if (e.type === 'commandApplied') {
      const res = e.resolved as AppliedResolution | undefined;
      const c = res?.command;
      if (c?.type === 'scenario' && c.action === 'bookmark' && c.target && !this.bookmarks.includes(c.target)) this.bookmarks = [...this.bookmarks, c.target];
      const mine = e.commandId.startsWith(`${this.peerId}-`); // our own commands are already logged with their ack
      if (c && !res?.replay && !mine) this.addLog('applied', describe(c), e.commandId);
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
      if (c.action.device === 'nibp') return `nibp ${c.action.action}${c.action.intervalMin !== undefined ? ` every ${c.action.intervalMin} min` : ''}`; // Stage 2
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
    case 'applyEvent': // generic: every ClinicalEvent kind logs its fields (Stage 6b), e.g. "event cpr true 110"
      return `event ${Object.values(c.event).join(' ')}`;
    case 'attachSensor': // Stage 2 adds the site
      return `sensor ${c.sensor} ${c.state}${c.site ? ` @${c.site}` : ''}`;
  }
}
