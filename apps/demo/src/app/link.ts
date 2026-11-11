// What the instructor panel talks to (research/13 brief §4.4: the same panel same-screen and as a Remote). A Link is a
// ControllerSession (commands, acks, state, measurements, scenario view, bookmarks) plus a tap on the same transport
// for the engine events the session does not keep (alarmStatus, deviceStatus), plus the clinical log. On the host
// document `host` is the AppSession (patient restart, skin, sound); a Remote has none of those.
import { TICK_S, type AlarmEntry, type EngineEvent } from '@pme/engine-core';
import { asV1, isV2, manualLabel, StageBuffer, WIRE_LIMITS, type AckResult, type CommandInput, type ControllerSession, type InstructorPrepNews, type ManagedTransport, type NoteEvent, type ScenarioView, type WireEvent, type WireMessage } from '@pme/controller';
import { describeCommand, spanText, timeText } from './describe.ts';
import type { AppSession } from './session.ts';
import type { ViewFeed } from './teach2/feed.ts';
import { PrepBoard } from './teach2/prep-board.ts';

export type AlarmStatusEvent = Extract<EngineEvent, { type: 'alarmStatus' }>;
export type DeviceStatusEvent = Extract<EngineEvent, { type: 'deviceStatus' }>;

export interface ClinicalLogEntry {
  simT: number | null;
  kind: 'instructor' | 'learner' | 'scenario' | 'alarm' | 'marker' | 'note' | 'system';
  text: string;
  /** Rejected by the engine: the reason, in the log only. */
  refused?: string;
  /** The run event a note is, into the record with it (D5: 'recognised', the /1 Recognised press). */
  ev?: NoteEvent;
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
  /**
   * The host's view feed (plan instructor-peer-role.md §6, teach2/feed.ts): the last `instructorView` body, on a remote
   * only (the host reads its originals). Instructor v2 reads it through `viewNow()`.
   */
  view: ViewFeed | null = null;
  /** L9 (§4 D7): the learner remotes' preparations as the instructor sees them (the host's copy to its own id), on the
   *  laptop and on the instructor's phone alike. */
  readonly preps = new PrepBoard();
  private readonly fns = new Set<() => void>();
  private readonly offs: Array<() => void>;
  private lastRaised = new Set<string>();
  /** The staged deliveries' stage groups (sendBatch): one buffer per Link, so each delivery has its own group id. */
  private batchBuf: StageBuffer | null = null;

  constructor(ctl: ControllerSession, transport: ManagedTransport, host: AppSession | null = null) {
    this.ctl = ctl;
    this.host = host;
    host?.onMount(() => {
      // a new body (restart, scenario) starts with no acute events and no onsets in progress (their t0 was on the old timeline)
      this.conditions.clear();
      this.ramps.clear();
    });
    this.offs = [
      transport.onMessage((m: WireMessage) => {
        if (m.kind !== 'event') return;
        for (const e of m.body) this.onEvent(e, m.from);
      }),
      ctl.onChange(() => this.changed()),
    ];
  }

  get simT(): number {
    return this.ctl.simT ?? 0;
  }

  /** Send with a log line; resolves with the ack (rejections are logged with the engine's reason). */
  async send(c: CommandInput, kind: ClinicalLogEntry['kind'] = 'instructor'): Promise<AckResult> {
    const text = describeCommand(c as Record<string, unknown>, scenarioStep(this.ctl.scenario, c)); // read before the press moves the state
    const r = await this.ctl.send(c);
    this.track(c, r);
    this.add({ simT: this.simT, kind, text, ...(r.accepted ? {} : { refused: r.reason ?? 'refused' }) });
    return r;
  }

  /**
   * A staged delivery (Instructor v2's cache, design §4.2): every command in ONE stageGroup with one batch id
   * (`StageBuffer.commit` with `batch`), so the host applies them on one tick and the controller logs one line; here too
   * one clinical-log line names each item, a refused item with its reason. Resolves with the acks in `cmds` order.
   */
  async sendBatch(cmds: readonly CommandInput[], kind: ClinicalLogEntry['kind'] = 'instructor'): Promise<AckResult[]> {
    if (!cmds.length) return [];
    this.batchBuf ??= new StageBuffer(`${this.ctl.peerId}-cache`);
    cmds.forEach((c, i) => this.batchBuf?.stage(c, String(i)));
    const rs = await this.batchBuf.commit((c) => this.ctl.send(c), { batch: true });
    cmds.forEach((c, i) => this.track(c, rs[i] as AckResult));
    const items = cmds.map((c, i) => `${describeCommand(c as Record<string, unknown>)}${rs[i]?.accepted ? '' : ` (not applied: ${rs[i]?.reason ?? 'refused'})`}`);
    const none = rs.every((r) => !r.accepted);
    this.add({ simT: this.simT, kind, text: `Staged delivery, ${cmds.length} at one instant: ${items.join(' · ')}`, ...(none ? { refused: rs[0]?.reason ?? 'refused' } : {}) });
    return rs;
  }

  /** What the panel keeps of an answered command: the onsets in progress and the acute events started. */
  private track(c: CommandInput, r: AckResult): void {
    const rampOf = (c as { ramp?: { durationS?: number; delayS?: number } }).ramp;
    const ramp = rampOf?.durationS;
    // Brief 105: the onset runs on sim time from the tick the engine applies the command at (the ack's tick), plus its
    // delay, not from the moment the ack reached this page (the round trip and the clock estimate are wall time)
    if (r.accepted && (c.type === 'setTarget' || c.type === 'pin') && ramp) this.ramps.set(c.variable, { t0: r.tick * TICK_S + (rampOf?.delayS ?? 0), dur: ramp, to: c.value ?? 0 });
    if (r.accepted && (c.type === 'setTarget' || c.type === 'pin' || c.type === 'release') && !ramp) this.ramps.delete(c.variable);
    const ev = c.type === 'applyEvent' ? (c.event as { kind?: string; id?: string; severity?: number }) : null;
    if (r.accepted && ev?.kind === 'condition' && typeof ev.id === 'string') {
      if ((ev.severity ?? 0) > 0) this.conditions.set(ev.id, ev.severity ?? 0);
      else this.conditions.delete(ev.id);
    }
  }

  /**
   * A line of the clinical log. A note or a marker (a judged objective) goes into the debrief: on the host into its
   * record (`add`), and from a remote as the `note` command (plan §6), which the host files with this same call, at its
   * own sim time `t`. `ev`: the run event the note is (D5: 'recognised', the /1 Recognised press), into the record
   * with it; a remote's `note` command carries it (brief 52), so the host files the phone's press as the laptop's.
   */
  note(text: string, kind: ClinicalLogEntry['kind'] = 'note', t: number = this.simT, ev?: ClinicalLogEntry['ev']): void {
    this.add({ simT: t, kind, text, ...(ev ? { ev } : {}) });
    if (this.host || (kind !== 'note' && kind !== 'marker')) return;
    // the guard's limit (guard.ts): a longer note would be dropped on the wire and re-sent until it timed out
    if (text.length > WIRE_LIMITS.noteChars) return this.add({ simT: t, kind: 'system', text: `Not sent to the debrief: the note is longer than ${WIRE_LIMITS.noteChars} characters` });
    void this.ctl.send({ type: 'note', kind, text, ...(ev ? { ev } : {}) });
  }

  /** The host's view feed for the state this remote's scenario view is in, else null (on the host, with no feed yet,
   *  or while the state event has outrun the next feed): the reader then reads what it has, as before the feed. */
  viewNow(): ViewFeed | null {
    const v = this.view;
    const sv = this.ctl.scenario;
    return !this.host && v && v.stateId === sv.stateId && v.docId === (sv.doc?.id ?? null) ? v : null;
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
    const act = (this.alarms?.active ?? []).filter((a) => (!a.acked || a.latched) && !a.prompt); // A prompt is not an alarm (MUI-7)
    const top = [...act].sort((a, b) => a.level - b.level)[0] ?? null;
    return { level: top ? top.level : null, n: act.length, top };
  }

  private onEvent(e: WireEvent, from: string): void {
    if (e.type === 'prep') {
      // L9: the host addresses the instructor's copy to its own id; a learner's copy (to that remote) is not this card's
      if (e.to !== from) return;
      this.preps.apply(e.body as InstructorPrepNews, e.t);
      this.changed();
    } else if (e.type === 'alarmStatus') {
      const a = e as unknown as AlarmStatusEvent;
      this.alarms = a;
      const now = new Set(a.active.map((x) => x.id));
      for (const x of a.active) if (!this.lastRaised.has(x.id)) this.add({ simT: a.t, kind: 'alarm', text: x.text });
      this.lastRaised = now;
      this.changed();
    } else if (e.type === 'instructorView') {
      if (this.host) return; // the host reads its originals; the body is the host's own
      this.view = e.body as ViewFeed;
      this.changed();
    } else if (e.type === 'deviceStatus') {
      this.device = e as unknown as DeviceStatusEvent;
    } else if (e.type === 'timeline') {
      // A new timeline — onsets in progress began on the old one; a restart also ends the acute events (a Remote has no
      // AppSession.onMount to tell it); a bookmark restore keeps them (the engine does not report them)
      this.ramps.clear();
      this.preps.clear(); // the host's preparation table ends with the old engine, a restore's too (host-session newTimeline)
      if (e.cause !== 'restore') this.conditions.clear();
      this.changed();
    } else if (e.type === 'fastForward') {
      // Where a fast-forward began and ended, and the alarms raised during it (shown, not sounded), with times
      if (e.phase === 'start') this.add({ simT: e.fromT, kind: 'system', text: `Fast-forward ${spanText(e.toT - e.fromT)} started (sound muted until it ends)` });
      else {
        const al = (e.alarms ?? []).map((a) => `${a.text} ${timeText(a.since)}`);
        this.add({ simT: e.t, kind: 'system', text: `Fast-forward ended${e.stopped ? ` early (${e.stopped})` : ''}; ${al.length ? `alarms during it: ${al.join(', ')}` : 'no alarms during it'}` });
      }
    } else if (e.type === 'scenario') {
      // a /1 state's label, or a /2 phase's (F11: a phase read "next state")
      const doc = this.ctl.scenario.doc;
      const name = doc && isV2(doc) ? doc.phases.find((p) => p.id === e.stateId)?.label : asV1(doc)?.states.find((s) => s.id === e.stateId)?.label;
      this.add({ simT: e.t, kind: 'scenario', text: `Scenario state: ${name ?? 'next state'}` });
    }
  }

  private add(x: ClinicalLogEntry): void {
    if (x.kind === 'note' || x.kind === 'marker') this.host?.record.note(x.simT ?? this.simT, x.text, x.ev); // Into the debrief
    this.log.push(x);
    if (this.log.length > 1000) this.log.splice(0, this.log.length - 1000);
    this.changed();
  }

  private changed(): void {
    for (const fn of [...this.fns]) fn();
  }
}

/** The step a scenario trigger presses: its button label (or the transition's label) in the view's current state, the
 *  state the press is made in; undefined for any other command or an unknown transition. */
export function scenarioStep(view: ScenarioView, c: CommandInput | Record<string, unknown>): string | undefined {
  const x = c as { type?: unknown; action?: unknown; target?: unknown };
  if (x.type !== 'scenario' || x.action !== 'trigger') return undefined;
  const tr = view.current()?.transitions?.find((t) => t.id === x.target);
  return tr ? (manualLabel(tr.when) ?? tr.label) : undefined;
}

/** CSV of the clinical log (the debrief export). */
export function logCsv(log: readonly ClinicalLogEntry[]): string {
  const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const rows = log.map((e) => [e.simT === null ? '' : e.simT.toFixed(1), e.kind, e.text, e.refused ?? ''].map(q).join(','));
  return `${['time_s,kind,event,refused', ...rows].join('\n')}\n`;
}
