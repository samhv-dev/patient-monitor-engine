// What the instructor panel talks to (research/13 brief §4.4: the same panel same-screen and as a Remote). A Link is a
// ControllerSession (commands, acks, state, measurements, scenario view, bookmarks) plus a tap on the same transport
// for the engine events the session does not keep (alarmStatus, deviceStatus), plus the clinical log. On the host
// document `host` is the AppSession (patient restart, skin, sound); a Remote has none of those.
import type { AlarmEntry, EngineEvent } from '@pme/engine-core';
import type { AckResult, CommandInput, ControllerSession, ManagedTransport, WireEvent, WireMessage } from '@pme/controller';
import { describeCommand } from './describe.ts';
import type { AppSession } from './session.ts';

export type AlarmStatusEvent = Extract<EngineEvent, { type: 'alarmStatus' }>;
export type DeviceStatusEvent = Extract<EngineEvent, { type: 'deviceStatus' }>;

export interface ClinicalLogEntry {
  simT: number | null;
  kind: 'instructor' | 'learner' | 'scenario' | 'alarm' | 'marker' | 'note' | 'system';
  text: string;
  /** Rejected by the engine: the reason, in the log only. */
  refused?: string;
}

export class Link {
  readonly ctl: ControllerSession;
  readonly host: AppSession | null;
  alarms: AlarmStatusEvent | null = null;
  device: DeviceStatusEvent | null = null;
  readonly log: ClinicalLogEntry[] = [];
  /** Per-target onset in progress (REALITi's trend arc): the panel draws progress from sim time. */
  readonly ramps = new Map<string, { t0: number; dur: number; to: number }>();
  /** Acute events started from this panel (Task 26): id → severity. The engine does not report them, so a Remote sees only its own. */
  readonly conditions = new Map<string, number>();
  private readonly fns = new Set<() => void>();
  private readonly offs: Array<() => void>;
  private lastRaised = new Set<string>();

  constructor(ctl: ControllerSession, transport: ManagedTransport, host: AppSession | null = null) {
    this.ctl = ctl;
    this.host = host;
    host?.onMount(() => this.conditions.clear()); // a new body (restart, scenario) starts with none
    this.offs = [
      transport.onMessage((m: WireMessage) => {
        if (m.kind !== 'event') return;
        for (const e of m.body) this.onEvent(e);
      }),
      ctl.onChange(() => this.changed()),
    ];
  }

  get simT(): number {
    return this.ctl.simT ?? 0;
  }

  /** Send with a log line; resolves with the ack (rejections are logged with the engine's reason). */
  async send(c: CommandInput, kind: ClinicalLogEntry['kind'] = 'instructor'): Promise<AckResult> {
    const text = describeCommand(c as Record<string, unknown>);
    const r = await this.ctl.send(c);
    const ramp = (c as { ramp?: { durationS?: number } }).ramp?.durationS;
    if (r.accepted && (c.type === 'setTarget' || c.type === 'pin') && ramp) this.ramps.set(c.variable, { t0: this.simT, dur: ramp, to: c.value ?? 0 });
    if (r.accepted && (c.type === 'setTarget' || c.type === 'pin' || c.type === 'release') && !ramp) this.ramps.delete(c.variable);
    const ev = c.type === 'applyEvent' ? (c.event as { kind?: string; id?: string; severity?: number }) : null;
    if (r.accepted && ev?.kind === 'condition' && typeof ev.id === 'string') {
      if ((ev.severity ?? 0) > 0) this.conditions.set(ev.id, ev.severity ?? 0);
      else this.conditions.delete(ev.id);
    }
    this.add({ simT: this.simT, kind, text, ...(r.accepted ? {} : { refused: r.reason ?? 'refused' }) });
    return r;
  }

  note(text: string, kind: ClinicalLogEntry['kind'] = 'note'): void {
    this.add({ simT: this.simT, kind, text });
  }

  onChange(fn: () => void): () => void {
    this.fns.add(fn);
    return () => void this.fns.delete(fn);
  }

  close(): void {
    for (const off of this.offs) off();
  }

  /** The highest active alarm level (1 = high) and how many alarms are active. */
  get alarmSummary(): { level: 1 | 2 | 3 | null; n: number; top: AlarmEntry | null } {
    const act = (this.alarms?.active ?? []).filter((a) => !a.acked || a.latched);
    const top = [...act].sort((a, b) => a.level - b.level)[0] ?? null;
    return { level: top ? top.level : null, n: act.length, top };
  }

  private onEvent(e: WireEvent): void {
    if (e.type === 'alarmStatus') {
      const a = e as unknown as AlarmStatusEvent;
      this.alarms = a;
      const now = new Set(a.active.map((x) => x.id));
      for (const x of a.active) if (!this.lastRaised.has(x.id)) this.add({ simT: a.t, kind: 'alarm', text: x.text });
      this.lastRaised = now;
      this.changed();
    } else if (e.type === 'deviceStatus') {
      this.device = e as unknown as DeviceStatusEvent;
    } else if (e.type === 'scenario') {
      const st = this.ctl.scenario.doc?.states.find((s) => s.id === e.stateId);
      this.add({ simT: e.t, kind: 'scenario', text: `Scenario state: ${st?.label ?? 'next state'}` });
    }
  }

  private add(x: ClinicalLogEntry): void {
    this.log.push(x);
    if (this.log.length > 1000) this.log.splice(0, this.log.length - 1000);
    this.changed();
  }

  private changed(): void {
    for (const fn of [...this.fns]) fn();
  }
}

/** CSV of the clinical log (the debrief export). */
export function logCsv(log: readonly ClinicalLogEntry[]): string {
  const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const rows = log.map((e) => [e.simT === null ? '' : e.simT.toFixed(1), e.kind, e.text, e.refused ?? ''].map(q).join(','));
  return `${['time_s,kind,event,refused', ...rows].join('\n')}\n`;
}
