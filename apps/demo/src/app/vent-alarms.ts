// The ventilator's alarms as the instructor reads them (the host's `ventAlarms` event): each named with the ventilator
// as every page names it (device-names.ts), its priority as the monitor's alarm level, and what changed between two
// reports, for the Log and the Debrief. No DOM here.
import type { VentAlarmEntry, VentScreen, WireEvent } from '@pme/controller';
import { VENT_SCREEN_WORDS } from './device-names.ts';

export type VentAlarmsEvent = Extract<WireEvent, { type: 'ventAlarms' }>;

/** A ventilator priority as the monitor's alarm level (1 = high). */
export const VENT_LEVEL: Readonly<Record<VentAlarmEntry['priority'], 1 | 2 | 3>> = { high: 1, medium: 2, low: 3 };

/** "Ventilator window: High pressure (Pmax)": the Log, the Debrief and the alarm list. */
export const ventAlarmName = (a: Pick<VentAlarmEntry, 'text'>, screen: VentScreen): string => `${VENT_SCREEN_WORDS[screen]}: ${a.text}`;
/** "Ventilator: High pressure (Pmax)": the one-line places (the alarm line, the top bar's count). */
export const ventAlarmShort = (a: Pick<VentAlarmEntry, 'text'>): string => `${VENT_SCREEN_WORDS.device}: ${a.text}`;

export type VentAlarmChangeKind = 'raised' | 'priority' | 'silenced' | 'sounding' | 'ended';
export interface VentAlarmChange {
  kind: VentAlarmChangeKind;
  alarm: VentAlarmEntry;
}

/** What changed from one report to the next, per alarm: raised, ended, a new priority, its sound silenced or back. */
export function ventAlarmChanges(prev: readonly VentAlarmEntry[], next: readonly VentAlarmEntry[]): VentAlarmChange[] {
  const was = new Map(prev.map((a) => [a.id, a]));
  const out: VentAlarmChange[] = [];
  for (const a of next) {
    const p = was.get(a.id);
    was.delete(a.id);
    if (!p) out.push({ kind: 'raised', alarm: a });
    else {
      if (p.priority !== a.priority) out.push({ kind: 'priority', alarm: a });
      if (p.silenced !== a.silenced) out.push({ kind: a.silenced ? 'silenced' : 'sounding', alarm: a });
    }
  }
  for (const a of was.values()) out.push({ kind: 'ended', alarm: a });
  return out;
}

/** The Log's line for one change. */
export function ventAlarmLogLine(c: VentAlarmChange, screen: VentScreen): string {
  const name = ventAlarmName(c.alarm, screen);
  switch (c.kind) {
    case 'raised':
      return `${name} raised, ${c.alarm.priority} priority${c.alarm.silenced ? ', sound silenced' : ''}`;
    case 'priority':
      return `${name} now ${c.alarm.priority} priority`;
    case 'silenced':
      return `${name} sound silenced on the ventilator`;
    case 'sounding':
      return `${name} sounding again`;
    case 'ended':
      return `${name} ended`;
  }
}
