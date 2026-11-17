// The pump channels' alarms as the instructor's screens read them. The engine says when one is raised (`pumpAlarm`), a
// command on the channel clears it (the engine's applyPump: a load or an unload clears every alarm, a start clears
// Infusion Complete), and its channel table (`drugs.pumps`, once a second) lists the alarms that stand. Edges come from
// the event and the command at their own times; the table only catches what neither said (a command the engine refused
// when it came to apply it, a phone that joined late). An alarm is named by what the syringe or bag holds, and by its
// programme too when that differs, as the amounts are filed by what it holds.
import type { PumpAlarmEvent, PumpAlarmId, PumpPanelRow } from '@pme/engine-core';
import { drugName } from './glossary.ts';
import { FACE_LABELS } from './pump/face.ts';

export interface PumpAlarmNow {
  /** `pump:<channel>:<alarm>`, the run event `alarm:<id>` names. */
  id: string;
  ch: number;
  alarm: PumpAlarmId;
  text: string;
}

export const PUMP_ALARM_PREFIX = 'pump:';

export const pumpAlarmId = (ch: number, alarm: PumpAlarmId): string => `${PUMP_ALARM_PREFIX}${ch}:${alarm}`;

/** The channel number of a pump alarm's id. */
export const channelOfAlarm = (id: string): number => Number(id.split(':')[1]);

type Held = Pick<PumpPanelRow, 'contents' | 'programmed'> | undefined;

export function pumpAlarmText(ch: number, row: Held, alarm: PumpAlarmId): string {
  const holds = row?.contents?.drugId ?? null;
  const prog = row?.programmed?.drugId ?? null;
  const drug = holds ?? prog;
  const as = holds && prog && prog !== holds ? `, programmed as ${drugName(prog)}` : '';
  return `Pump channel ${ch}${drug ? ` (${drugName(drug)}${as})` : ''}: ${FACE_LABELS.alarm[alarm]}`;
}

const now = (ch: number, row: Held, alarm: PumpAlarmId): PumpAlarmNow => ({ id: pumpAlarmId(ch, alarm), ch, alarm, text: pumpAlarmText(ch, row, alarm) });

/** Every alarm the channel rows list. */
export function pumpAlarmsOf(rows: readonly PumpPanelRow[]): PumpAlarmNow[] {
  return rows.flatMap((r) => r.alarms.map((a) => now(r.ch, r, a)));
}

/** The alarms a command on a channel clears, of those standing on it (the engine's applyPump). */
export function clearedBy(action: unknown, standing: readonly PumpAlarmId[]): PumpAlarmId[] {
  if (action === 'load' || action === 'unload') return [...standing];
  return action === 'start' ? standing.filter((a) => a === 'infusionComplete') : [];
}

/** A pump command's channel and action, from a command as the host applied it; null for any other command. */
export function pumpCommandOf(c: Record<string, unknown> | undefined): { ch: number; action: string } | null {
  const ev = c?.type === 'applyEvent' ? (c.event as Record<string, unknown> | undefined) : undefined;
  return ev?.kind === 'pump' && typeof ev.ch === 'number' ? { ch: ev.ch, action: String(ev.action) } : null;
}

/**
 * The standing pump alarms, from the event stream. `event` takes a `pumpAlarm` and `command` a pump command, each at its
 * own time; `rows` takes a `drugs` event's channels and returns what they show that the events did not. After `forget`
 * (a new patient) the next rows are taken as they stand, with no edge; after `returned` (a return to a bookmark) the
 * next rows' edges are the return's.
 */
export class PumpAlarmEdges {
  private readonly standing = new Map<string, PumpAlarmNow>();
  private last = new Map<number, PumpPanelRow>();
  private fresh = true;
  private back = false;

  event(e: PumpAlarmEvent): PumpAlarmNow | null {
    const a = now(e.ch, this.last.get(e.ch), e.alarm);
    if (this.standing.has(a.id)) return null;
    this.standing.set(a.id, a);
    return a;
  }

  command(ch: number, action: string): PumpAlarmNow[] {
    const on = [...this.standing.values()].filter((a) => a.ch === ch);
    const gone = new Set(clearedBy(action, on.map((a) => a.alarm)));
    const ended = on.filter((a) => gone.has(a.alarm));
    for (const a of ended) this.standing.delete(a.id);
    return ended;
  }

  rows(rows: readonly PumpPanelRow[]): { raised: PumpAlarmNow[]; ended: PumpAlarmNow[]; returned: boolean } {
    this.last = new Map(rows.map((r) => [r.ch, r]));
    const listed = pumpAlarmsOf(rows);
    const ids = new Set(listed.map((a) => a.id));
    const raised = listed.filter((a) => !this.standing.has(a.id));
    const ended = [...this.standing.values()].filter((a) => !ids.has(a.id));
    for (const a of raised) this.standing.set(a.id, a);
    for (const a of ended) this.standing.delete(a.id);
    const returned = this.back;
    this.back = false;
    if (!this.fresh) return { raised, ended, returned };
    this.fresh = false;
    return { raised: [], ended: [], returned };
  }

  get now(): PumpAlarmNow[] {
    return [...this.standing.values()];
  }

  /** The row a channel last showed (its contents and programme name its alarms). */
  row(ch: number): PumpPanelRow | undefined {
    return this.last.get(ch);
  }

  forget(): void {
    this.standing.clear();
    this.last.clear();
    this.fresh = true;
  }

  returned(): void {
    this.back = true;
  }
}
