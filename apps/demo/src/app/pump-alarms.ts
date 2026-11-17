// The pump channels' alarms as the instructor's screens read them. The one record is the engine's channel table
// (`drugs.pumps`): a channel lists an alarm while it stands and drops it when a command clears it. The `pumpAlarm` event
// says the instant one is raised, so a raise is dated by it when it has come and by the row otherwise.
import type { PumpAlarmEvent, PumpAlarmId, PumpPanelRow } from '@pme/engine-core';
import { drugName } from './glossary.ts';
import { FACE_LABELS } from './pump/face.ts';

export interface PumpAlarmNow {
  /** `pump:<channel>:<alarm>`, the run event `alarm:<id>` names. */
  id: string;
  ch: number;
  alarm: PumpAlarmId;
  /** The drug the channel is programmed with (what the pump shows), or null. */
  drugId: string | null;
  text: string;
}

export const PUMP_ALARM_PREFIX = 'pump:';

export const pumpAlarmId = (ch: number, alarm: PumpAlarmId): string => `${PUMP_ALARM_PREFIX}${ch}:${alarm}`;

export function pumpAlarmText(ch: number, drugId: string | null, alarm: PumpAlarmId): string {
  return `Pump channel ${ch}${drugId ? ` (${drugName(drugId)})` : ''}: ${FACE_LABELS.alarm[alarm]}`;
}

const now = (ch: number, drugId: string | null, alarm: PumpAlarmId): PumpAlarmNow => ({ id: pumpAlarmId(ch, alarm), ch, alarm, drugId, text: pumpAlarmText(ch, drugId, alarm) });

/** Every alarm the channel rows list. */
export function pumpAlarmsOf(rows: readonly PumpPanelRow[]): PumpAlarmNow[] {
  return rows.flatMap((r) => r.alarms.map((a) => now(r.ch, r.programmed?.drugId ?? null, a)));
}

export const pumpAlarmOfEvent = (e: PumpAlarmEvent): PumpAlarmNow => now(e.ch, e.programmed, e.alarm);

/**
 * Raises and ends from the event stream. `event` takes a `pumpAlarm` (a raise at its own time); `rows` takes a `drugs`
 * event's channels (a listed alarm not yet raised is raised at the row's time, a raised one no longer listed has ended).
 * `forget` after a new timeline: the next rows are the new engine's and are taken as they stand, with no edge.
 */
export class PumpAlarmEdges {
  private readonly standing = new Map<string, PumpAlarmNow>();
  private fresh = true;

  event(e: PumpAlarmEvent): PumpAlarmNow | null {
    const a = pumpAlarmOfEvent(e);
    if (this.standing.has(a.id)) return null;
    this.standing.set(a.id, a);
    return a;
  }

  rows(rows: readonly PumpPanelRow[]): { raised: PumpAlarmNow[]; ended: PumpAlarmNow[] } {
    const listed = pumpAlarmsOf(rows);
    const ids = new Set(listed.map((a) => a.id));
    const raised = listed.filter((a) => !this.standing.has(a.id));
    const ended = [...this.standing.values()].filter((a) => !ids.has(a.id));
    for (const a of raised) this.standing.set(a.id, a);
    for (const a of ended) this.standing.delete(a.id);
    if (!this.fresh) return { raised, ended };
    this.fresh = false;
    return { raised: [], ended: [] };
  }

  get now(): PumpAlarmNow[] {
    return [...this.standing.values()];
  }

  forget(): void {
    this.standing.clear();
    this.fresh = true;
  }
}
