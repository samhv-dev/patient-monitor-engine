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

/** A pump command's channel and action, from a command as the host applied it, and for a load what it puts on the
 *  channel; null for any other command. */
export function pumpCommandOf(c: Record<string, unknown> | undefined): { ch: number; action: string; holds?: string } | null {
  const ev = c?.type === 'applyEvent' ? (c.event as Record<string, unknown> | undefined) : undefined;
  if (ev?.kind !== 'pump' || typeof ev.ch !== 'number') return null;
  const holds = (ev.contents as { drugId?: unknown } | undefined)?.drugId;
  return { ch: ev.ch, action: String(ev.action), ...(ev.action === 'load' && typeof holds === 'string' ? { holds } : {}) };
}

/** What a channel holds and is programmed with as its alarm names them: the engine's event names the programme; the
 *  contents are the channel's last row's, or what a load put on it since (an alarm in the second after a load). */
export function heldOf(row: PumpPanelRow | undefined, loaded: string | null | undefined, programmed: string | null): Pick<PumpPanelRow, 'contents' | 'programmed'> {
  const drugId = loaded !== undefined ? loaded : (row?.contents?.drugId ?? null);
  const unit = { amount: 0, unit: 'mg' as const, perMl: 1 };
  return { contents: drugId ? { drugId, concentration: unit } : null, programmed: programmed ? { drugId: programmed, concentration: unit } : null };
}

/** A raise or an end, at its own time; `returned`: read from the state a return to a bookmark restored. */
export interface PumpAlarmEdge { kind: 'raised' | 'ended'; a: PumpAlarmNow; t: number; returned?: true }

/** A command's tick and the engine's refusal of it share a time to within a tick. */
const SAME_T = 0.03;

/**
 * The standing pump alarms, from the event stream. `event` takes a `pumpAlarm` (a raise at its own time). `command`
 * takes a pump command at the tick it applies; the engine checks it again then and may refuse it (`pumpRefused`), so
 * the end it makes is written only once a later event of the engine shows it was not refused (`refused` drops it).
 * `rows` takes a `drugs` panel's channels and returns, after those, what the channels show that the events did not.
 * `restored` takes the channels a return to a bookmark restored. After `forget` (a new patient, or a reconnection) the
 * next channels are taken as they stand, with no edge.
 */
export class PumpAlarmEdges {
  private readonly standing = new Map<string, PumpAlarmNow>();
  private last = new Map<number, PumpPanelRow>();
  private pending: Array<{ ch: number; action: string; t: number }> = [];
  /** What a load put on a channel since its last row (null: an unload). */
  private loaded = new Map<number, string | null>();
  private fresh = true;

  event(e: PumpAlarmEvent): PumpAlarmEdge[] {
    const out = this.settle(e.t);
    const a = now(e.ch, heldOf(this.last.get(e.ch), this.loaded.get(e.ch), e.programmed), e.alarm);
    if (this.standing.has(a.id)) return out;
    this.standing.set(a.id, a);
    return [...out, { kind: 'raised', a, t: e.t }];
  }

  command(ch: number, action: string, t: number, holds?: string): void {
    this.pending.push({ ch, action, t });
    if (action === 'load') this.loaded.set(ch, holds ?? null);
    if (action === 'unload') this.loaded.set(ch, null);
  }

  refused(e: { ch: number; action: string; t: number }): void {
    this.pending = this.pending.filter((p) => !(p.ch === e.ch && p.action === e.action && Math.abs(p.t - e.t) < SAME_T));
  }

  rows(rows: readonly PumpPanelRow[], t: number): PumpAlarmEdge[] {
    const out = this.settle(t);
    return [...out, ...this.take(rows, t, false)];
  }

  restored(rows: readonly PumpPanelRow[], t: number): PumpAlarmEdge[] {
    this.pending = [];
    return this.take(rows, t, true);
  }

  /** The commands applied by `t` and not refused: the alarms each clears end at its tick. */
  private settle(t: number): PumpAlarmEdge[] {
    const due = this.pending.filter((p) => p.t <= t + 1e-6);
    this.pending = this.pending.filter((p) => p.t > t + 1e-6);
    const out: PumpAlarmEdge[] = [];
    for (const p of due) {
      const on = [...this.standing.values()].filter((a) => a.ch === p.ch);
      const gone = new Set(clearedBy(p.action, on.map((a) => a.alarm)));
      for (const a of on.filter((x) => gone.has(x.alarm))) {
        this.standing.delete(a.id);
        out.push({ kind: 'ended', a, t: p.t });
      }
    }
    return out;
  }

  private take(rows: readonly PumpPanelRow[], t: number, returned: boolean): PumpAlarmEdge[] {
    this.last = new Map(rows.map((r) => [r.ch, r]));
    this.loaded.clear();
    const listed = pumpAlarmsOf(rows);
    const ids = new Set(listed.map((a) => a.id));
    const raised = listed.filter((a) => !this.standing.has(a.id));
    const ended = [...this.standing.values()].filter((a) => !ids.has(a.id));
    for (const a of raised) this.standing.set(a.id, a);
    for (const a of ended) this.standing.delete(a.id);
    if (this.fresh) {
      this.fresh = false;
      return [];
    }
    const r = returned ? { returned: true as const } : {};
    return [...ended.map((a) => ({ kind: 'ended' as const, a, t, ...r })), ...raised.map((a) => ({ kind: 'raised' as const, a, t, ...r }))];
  }

  get now(): PumpAlarmNow[] {
    return [...this.standing.values()];
  }

  forget(): void {
    this.standing.clear();
    this.last.clear();
    this.loaded.clear();
    this.pending = [];
    this.fresh = true;
  }
}
