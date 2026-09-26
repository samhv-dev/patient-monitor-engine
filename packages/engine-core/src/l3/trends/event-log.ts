// Event log (brief §6.7): every command (with issuedBy), alarm, sensor event, shock and NIBP result, exportable as
// CSV and JSON for the debrief. Fed with commands as they are dispatched and with engine events as they arrive.
import type { Command, EngineEvent } from '../../types.ts';

export type LogKind = 'command' | 'sensor' | 'alarm' | 'defib' | 'nibp' | 'rhythm';

export interface LogEntry {
  t: number;
  kind: LogKind;
  text: string;
  issuedBy?: string;
}

/** Entries kept (oldest dropped first) [ENG]: 8 h of a busy scenario is a few thousand. */
export const LOG_MAX = 20_000;

function describe(c: Command): string {
  switch (c.type) {
    case 'setTarget':
      return `${c.variable} → ${c.value}${c.ramp ? ` over ${c.ramp.durationS} s` : ''}`;
    case 'setRhythm':
      return `rhythm ${c.rhythm}`;
    case 'device':
      return `${c.action.device} ${c.action.action}${'value' in c.action && c.action.value !== undefined ? ` ${String(c.action.value)}` : ''}${'param' in c.action && c.action.param ? ` ${c.action.param}` : ''}`;
    case 'applyEvent':
      return `${c.event.kind} ${'action' in c.event ? c.event.action : ''} ${JSON.stringify(c.event)}`.trim();
    case 'attachSensor':
      return `sensor ${c.sensor} ${c.state}`;
    default:
      return `${c.type} ${JSON.stringify(c)}`;
  }
}

export class EventLog {
  readonly entries: LogEntry[] = [];

  private push(e: LogEntry): void {
    this.entries.push(e);
    if (this.entries.length > LOG_MAX) this.entries.splice(0, this.entries.length - LOG_MAX);
  }

  /** An accepted command, logged at the sim time it was dispatched. */
  command(c: Command, t: number): void {
    const kind: LogKind = c.type === 'attachSensor' ? 'sensor' : c.type === 'setRhythm' ? 'rhythm' : 'command';
    this.push({ t, kind, text: describe(c), issuedBy: c.issuedBy });
  }

  /** An engine event: alarms (every state change), shocks and charge/disarm markers, NIBP results and failures. */
  event(e: EngineEvent): void {
    if (e.type === 'alarm' && e.level !== undefined) this.push({ t: e.t, kind: 'alarm', text: `${e.state} ${e.id} L${e.level} ${e.text}` });
    else if (e.type === 'marker' && (e.kind === 'shock' || e.kind === 'chargeStart' || e.kind === 'chargeReady' || e.kind === 'disarm')) {
      this.push({ t: e.t, kind: 'defib', text: `${e.kind}${e.data ? ` ${JSON.stringify(e.data)}` : ''}` });
    } else if (e.type === 'nibp' && (e.result || e.phase === 'failed')) {
      this.push({ t: e.t, kind: 'nibp', text: e.result ? `NIBP ${e.result.sys}/${e.result.dia} (${e.result.map})` : 'NIBP failed' });
    }
  }

  count(kind: LogKind): number {
    return this.entries.filter((e) => e.kind === kind).length;
  }

  toJSON(): LogEntry[] {
    return this.entries.map((e) => ({ ...e }));
  }

  /** RFC 4180 CSV: t,kind,issuedBy,text. */
  toCSV(): string {
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows = this.entries.map((e) => [e.t.toFixed(2), e.kind, q(e.issuedBy ?? ''), q(e.text)].join(','));
    return ['t,kind,issuedBy,text', ...rows].join('\n');
  }
}
