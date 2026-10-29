// The debrief's record of one run — what happened, in order, at the simulated time the monitor showed: every command
// applied (from the panel, a Remote or the scenario), the scenario's states, the alarms raised, bookmarks and returns
// to them (a mark's kind and note with it), the pulse lost and back (from the model), runs of ventricular tachycardia (≥ 3 consecutive PVCs on the drawn
// ECG, the model's or the instructor's), ventilated breaths beginning, the instructor's notes, and a 1 Hz
// trend of six numerics and five laboratory values of the model (K⁺, lactate, pH, glucose, core temperature). A state
// row names the transition that entered it and whether a press, its rule or a jump did; an item of a staged delivery
// keeps its own row with the delivery's id (Instructor v2, IP8; all additive). It lives
// beside the engine, NOT in its snapshot: a return to a bookmark rewinds the engine, the trends and the clocks but not
// this record — the discarded course stays, marked undone, so the debrief shows the run as it happened, and its rules
// and charts read the course that was kept. A new patient or scenario (a 'restart' timeline) starts a new record. Plain
// JSON data; no DOM.
import type { EngineEvent } from '@pme/engine-core';
import type { AppliedResolution, MarkKind, WireEvent } from '@pme/controller';
import type { ScenarioDoc } from '@pme/controller/scenario';
import { alarmLine } from './alarms.ts';
import { describeCommand } from './describe.ts';

export type RowKind = 'action' | 'remote' | 'scenario' | 'alarm' | 'bookmark' | 'restore' | 'patient' | 'note';
export interface Row {
  /** Simulated seconds, as the monitor's clock showed them. */
  t: number;
  kind: RowKind;
  text: string;
  /** The run event a debrief rule can name (types.ts `RunEventId`). */
  ev?: string;
  /** A bolus, for the drug totals. */
  dose?: { drugId: string; dose: number; unit: string };
  /** A bookmark's label (bookmark rows). */
  mark?: string;
  /** Set when the n-th return to a bookmark discarded this row (it happened, on a course that was then undone). */
  undone?: number;
  /** A state row (Instructor v2): the transition that entered the state, as the scenario published it (`<id>:else` for
   *  a failed probability roll); absent for the first state and a jump. */
  tr?: string;
  /** A state row: how the state was entered — the instructor's button (the transition's trigger was pressed), the
   *  transition's own rule, or a jump (`goto`). Absent for the first state. */
  by?: 'press' | 'rule' | 'goto';
  /** A bookmark row (Instructor v2 marks): the mark's kind, and the note the instructor wrote with it. */
  markKind?: Exclude<MarkKind, 'stage'>;
  note?: string;
  /** An action row given in a staged delivery: the delivery's id and its number of items. Each item keeps its own row
   *  (a rule still sees its `drug:<id>`); the Debrief's timeline prints one line per delivery. */
  batch?: { id: string; n: number };
}
/** A mark's kind (Instructor v2): a good moment, a bad one, or one to discuss. */
/** The instructor's mark kinds (the controller's `MarkKind` without the driver's own `stage`). */
const MARK_KINDS: readonly string[] = ['good', 'bad', 'discuss'] satisfies Array<Exclude<MarkKind, 'stage'>>;

/** The six trended numerics; each reads the first valid of its monitor numerics (glossary keys `mon.<id>`). */
export const TREND = { hr: ['hr'], map: ['abpMean', 'nibpMean'], spo2: ['spo2'], etco2: ['etco2'], rr: ['awrr', 'rr'], temp: ['tempCore', 'tempSite'] } as const;
export type TrendKey = keyof typeof TREND;
export const TREND_KEYS = Object.keys(TREND) as TrendKey[];
/**
 * The model's laboratory values, 1 Hz, each with the glossary key that labels it: K⁺, lactate and pH from
 * the engine's `labs` event (the arterial panel the Labs view shows), glucose from its `endo` event, the core
 * temperature from the truth. They are the model's values, not samples the instructor drew.
 */
export const LABS = { k: 'ev.labs.values.k', lactate: 'ev.labs.values.lactate', ph: 'ev.labs.values.ph', glucose: 'ev.endo.glucoseMmolL', tcore: 'resp.temp.tc' } as const;
export type LabKey = keyof typeof LABS;
export const LAB_KEYS = Object.keys(LABS) as LabKey[];
/** A value a sample holds (a trend or a lab), as a debrief rule names it (scenario/types.ts `TrendValue`). */
export type ValueKey = TrendKey | LabKey;
export type Sample = { t: number } & Record<ValueKey, number | null>;

export interface RunData {
  /** Wall clock (ms since 1970) when the run began, and of the last thing recorded. */
  startedAt: number;
  lastWall: number;
  patient: string;
  weightKg: number;
  doc: ScenarioDoc | null;
  rows: Row[];
  /** One per simulated second of the kept course. */
  samples: Sample[];
  /** Returns to a bookmark so far. */
  returns: number;
}

/** Ventilated breaths "begin" after this long without one [ENG: longer than any set rate's interval, 6/min = 10 s]. */
const VENT_GAP_S = 15;
/** A state published this long before the newest row is a return's re-publish, not a new state [ENG: > the app's
 *  poll lag of 0.8 s of sim at ×8]. */
const RESYNC_S = 2;
/** Samples kept: 4 h of a run [ENG]. ponytail: oldest dropped beyond it; a longer run needs a coarser trend. */
const SAMPLES_MAX = 4 * 3600;
const EPS = 1e-6;
/** Consecutive PVCs that make a run of ventricular tachycardia (non-sustained VT: ≥ 3 beats; Katritsis 2012). */
const VT_RUN = 3;
/** The host's tick (s): a press and the state it leads to are applied in one tick. */
const TICK_S = 0.02;

/** The bookmark label of the return to a position kept across a reload (position.ts; never one the instructor sees). */
export const RELOAD_MARK = 'pme.reload';

/** What `RunRecord.keep()` returns. */
export interface KeptRecord {
  data: RunData;
  active: string[];
  lastVent: number | null;
  pulse: boolean | null;
}

export const emptyRun = (patient = '', weightKg = 70, now = Date.now()): RunData => ({ startedAt: now, lastWall: now, patient, weightKg, doc: null, rows: [], samples: [], returns: 0 });

export class RunRecord {
  data: RunData;
  private active = new Set<string>();
  private lastVent = -Infinity;
  private pulse: boolean | null = null;
  /** The PVCs in a row so far, the first one's time, and the run's row once it is one. */
  private pvcRun: { n: number; t: number; row: Row | null } = { n: 0, t: 0, row: null };
  private held: WireEvent | null = null;
  /** The engine time of the last return to a bookmark (-∞: none this run). */
  private since = -Infinity;
  /** The trackers as they stood at each bookmark of this run. */
  private readonly marks = new Map<string, { lastVent: number; pulse: boolean | null; active: string[] }>();
  /** Triggers pressed whose transition has not fired yet (the runner keeps a press until the state is left). */
  private pressed = new Set<string>();
  /** A jump acknowledged before the state it entered was published (null: none pending). */
  private jump: string | null = null;
  private readonly cur: Record<string, number | null> = {};
  private readonly lab: Partial<Record<LabKey, number | null>> = {};

  private readonly who: () => { patient: string; weightKg: number };
  private readonly now: () => number;

  constructor(who: () => { patient: string; weightKg: number }, now: () => number = Date.now) {
    this.who = who;
    this.now = now;
    const w = who();
    this.data = emptyRun(w.patient, w.weightKg, now());
  }

  /** The host's wire events (its own panel's end of the in-process hub): commands applied, states, timelines. */
  wire(e: WireEvent): void {
    if (e.type === 'timeline') return e.cause === 'restore' ? this.restored(e.t) : this.reset();
    if (e.type === 'scenario') {
      if (!this.data.doc) return void (this.held = e); // a load publishes its first state before its own commandApplied
      // a return to a bookmark re-publishes the bookmark's state, with the time it was entered, BEFORE the timeline
      // event: it is not a new state (the return's row says where the run went back to)
      if (e.t < (this.data.rows.at(-1)?.t ?? 0) - RESYNC_S) return;
      const kept = this.data.rows.filter((r) => r.kind === 'scenario' && r.undone === undefined).at(-1);
      if (kept?.ev === `state:${e.stateId}`) return; // a resync's repeat of the state we are in
      const label = this.data.doc?.states.find((s) => s.id === e.stateId)?.label ?? 'next state';
      const row: Row = { t: e.t, kind: 'scenario', text: `Scenario state: ${label}`, ev: `state:${e.stateId}` };
      // how it was entered: the host publishes the state before it acknowledges the press or the jump that caused it
      // (driver.hook evaluates on the press's own tick), so trigger() and goto() below may still turn 'rule' into
      // 'press' and set 'goto'; a press whose transition waits for the rest of its condition is pending here
      if (e.transitionId) Object.assign(row, { tr: e.transitionId, by: this.pressed.has(e.transitionId.replace(/:else$/, '')) ? 'press' : 'rule' });
      else if (this.jump === e.stateId) row.by = 'goto';
      this.pressed.clear(); // a new state: the runner forgets the presses of the last one
      this.jump = null;
      return this.add(row);
    }
    if (e.type !== 'commandApplied') return;
    const r = e.resolved as AppliedResolution | undefined;
    if (!r?.command || r.replay || r.mirror) return; // a late-join replay or a cockpit frame is not an action
    const c = r.command as unknown as Record<string, unknown>;
    if (c.issuedBy === 'ventilator') return; // E128: the Ventilator view's hand-over to the engine's ventilator, not an action
    const bySc = c.issuedBy === 'scenario';
    // the scenario's own set-up (mode, sensors, device settings) is not part of the case; a manual trigger is shown
    // by the state it leads to
    if (bySc && (c.type === 'setMode' || c.type === 'attachSensor' || c.type === 'device')) return;
    const t = e.tick * TICK_S;
    if (c.type === 'scenario' && c.action === 'trigger') return this.trigger(String(c.target), t);
    const text = describeCommand(c);
    if (c.type === 'scenario') {
      if (c.action === 'load' && c.doc) {
        this.data.doc = c.doc as ScenarioDoc;
        this.add({ t, kind: 'scenario', text });
        if (this.held) this.wire(this.held);
        return void (this.held = null);
      }
      if (c.action === 'restoreBookmark' && c.target === RELOAD_MARK) return; // the reload's own return: resume() says it
      if (c.action === 'restoreBookmark') this.undo(String(c.target), t);
      if (c.action === 'bookmark') {
        this.marks.set(String(c.target), { lastVent: this.lastVent, pulse: this.pulse, active: [...this.active] });
        return this.add({
          t, kind: 'bookmark', text, mark: String(c.target),
          ...(MARK_KINDS.includes(String(c.kind)) ? { markKind: c.kind as Exclude<MarkKind, 'stage'> } : {}),
          ...(typeof c.note === 'string' && c.note.trim() ? { note: c.note.trim() } : {}),
        });
      }
      if (c.action === 'goto') this.jumped(String(c.target), t);
      return this.add({ t, kind: c.action === 'restoreBookmark' ? 'restore' : 'scenario', text });
    }
    const ev = c.type === 'applyEvent' ? (c.event as Record<string, unknown>) : null;
    const row: Row = { t, kind: bySc ? 'scenario' : c.issuedBy === 'remote' ? 'remote' : 'action', text };
    const b = c.batch as { id?: unknown; n?: unknown } | undefined;
    if (!bySc && typeof b?.id === 'string' && typeof b.n === 'number') row.batch = { id: b.id, n: b.n };
    if (ev?.kind === 'drug' || ev?.kind === 'infusion' || ev?.kind === 'tci') row.ev = `drug:${String(ev.drugId)}`;
    if (ev?.kind === 'drug' && !ev.infusion) row.dose = { drugId: String(ev.drugId), dose: Number(ev.dose), unit: String(ev.unit) };
    if (ev?.kind === 'fluid') row.ev = 'fluid';
    if (ev?.kind === 'cpr' && ev.active) row.ev = 'cpr';
    if (ev?.kind === 'defib' && ev.action === 'shock') row.ev = 'shock';
    if (ev?.kind === 'condition' && Number(ev.severity) > 0) row.ev = `condition:${String(ev.id)}`;
    if (ev?.kind === 'airway') row.ev = `airway:${String(ev.state)}`;
    this.add(row);
  }

  /** The last kept state row, when it was entered within one tick of `t` (the tick a press or a jump is applied in). */
  private enteredAt(t: number): Row | undefined {
    const r = this.data.rows.filter((x) => x.kind === 'scenario' && x.ev?.startsWith('state:') && x.undone === undefined).at(-1);
    return r && Math.abs(r.t - t) <= TICK_S + EPS ? r : undefined;
  }

  /** A trigger pressed (not printed: the state it leads to is): the state its transition entered on this tick, else
   *  pending until it fires. */
  private trigger(id: string, t: number): void {
    const r = this.enteredAt(t);
    if (r?.by === 'rule' && (r.tr === id || r.tr === `${id}:else`)) r.by = 'press';
    else this.pressed.add(id);
  }

  /** A jump: the state it entered on this tick, else the next state published, if it is the jump's. */
  private jumped(stateId: string, t: number): void {
    const r = this.enteredAt(t);
    if (r && r.ev === `state:${stateId}` && r.tr === undefined && r.by === undefined) r.by = 'goto';
    else this.jump = stateId;
  }

  /** The host's engine events (truth included: it stays on this page). */
  engine(e: EngineEvent): void {
    if (e.type === 'alarmStatus') {
      for (const a of e.active) if (!this.active.has(a.id)) this.add({ t: e.t, kind: 'alarm', text: alarmLine(a).text, ev: `alarm:${a.id}` });
      this.active = new Set(e.active.map((a) => a.id));
    } else if (e.type === 'beat') {
      // a run of VT is recorded at its third PVC and its row counts the beats until a beat that is not a PVC
      const r = this.pvcRun;
      if (e.template !== 'pvc') return void (this.pvcRun = { n: 0, t: 0, row: null });
      if (r.n++ === 0) r.t = e.t;
      if (r.n < VT_RUN) return;
      const text = `Run of ventricular tachycardia (${r.n} beats)`;
      if (r.row) r.row.text = text;
      else this.add((r.row = { t: r.t, kind: 'patient', text, ev: 'vtRun' }));
    } else if (e.type === 'breath') {
      const b = e as unknown as { t: number; kind: string };
      if (b.kind !== 'mech' && b.kind !== 'bvm') return;
      // after a return, a breath that began before the snapshot is the restored engine finishing one under way
      if (b.t < this.since - EPS) return void (this.lastVent = Math.max(this.lastVent, b.t));
      if (b.t - this.lastVent > VENT_GAP_S) this.add({ t: b.t, kind: 'patient', text: b.kind === 'bvm' ? 'Bag-mask breaths began' : 'Ventilated breaths began', ev: 'ventilation' });
      this.lastVent = b.t;
    } else if (e.type === 'truth') {
      const circ = (e.tree.hemo as Record<string, Record<string, unknown>> | undefined)?.circ;
      if (!circ) return;
      const pulse = circ.arrest === null || circ.arrest === undefined;
      if (this.pulse !== null && pulse !== this.pulse) this.add({ t: e.t, kind: 'patient', text: pulse ? 'Circulation returned (the model)' : 'Pulse lost (the model)', ev: pulse ? 'rosc' : 'pulseLoss' });
      if (this.pulse === null && !pulse) this.add({ t: e.t, kind: 'patient', text: 'Pulse lost (the model)', ev: 'pulseLoss' });
      this.pulse = pulse;
      const tc = (e.tree.resp as Record<string, Record<string, unknown>> | undefined)?.temp?.tc;
      this.lab.tcore = typeof tc === 'number' ? Math.round(tc * 10) / 10 : null;
      this.sample(e.t);
    } else if (e.type === 'measurement') {
      for (const [k, m] of Object.entries(e.values)) this.cur[k] = m && m.value !== null && m.flag !== 'invalid' ? m.value : null;
      this.sample(e.t);
    } else if (e.type === 'labs') {
      Object.assign(this.lab, { k: e.values.k, lactate: e.values.lactate, ph: e.values.ph });
      this.sample(e.t);
    } else if (e.type === 'endo') {
      this.lab.glucose = e.glucoseMmolL;
      this.sample(e.t);
    }
  }

  /** The 1 Hz sample of simulated second ⌊t⌋ from the latest values (several events of one second update one sample). */
  private sample(t: number): void {
    const s = Math.floor(t + EPS);
    const row = { t: s } as Sample;
    for (const k of TREND_KEYS) row[k] = TREND[k].map((id) => this.cur[id]).find((v) => typeof v === 'number') ?? null;
    for (const k of LAB_KEYS) row[k] = this.lab[k] ?? null;
    const last = this.data.samples.at(-1);
    if (last && last.t === s) Object.assign(last, row);
    else if (!last || s > last.t) this.data.samples.push(row);
    if (this.data.samples.length > SAMPLES_MAX) this.data.samples.splice(0, this.data.samples.length - SAMPLES_MAX);
    this.data.lastWall = this.now();
  }

  /** The record and its trackers as plain JSON (kept with the run's position across a reload of the page). */
  keep(): KeptRecord {
    return structuredClone({ data: this.data, active: [...this.active], lastVent: Number.isFinite(this.lastVent) ? this.lastVent : null, pulse: this.pulse });
  }

  /** The page reloaded and the engine came back at sim time `t`: the kept record goes on from there, with one row saying so. */
  resume(k: KeptRecord, t: number): void {
    this.data = structuredClone(k.data);
    this.data.rows = this.data.rows.filter((r) => r.t <= t + EPS);
    this.data.samples = this.data.samples.filter((s) => s.t <= t + EPS);
    this.active = new Set(k.active);
    this.lastVent = k.lastVent ?? -Infinity;
    this.pulse = k.pulse;
    this.held = null;
    this.since = t;
    this.add({ t, kind: 'restore', text: 'Restored after a reload of the page' });
  }

  /** An instructor note or an objective ticked in the Scenario tab (the Link's log). */
  note(t: number, text: string): void {
    this.add({ t, kind: 'note', text });
  }

  private add(r: Row): void {
    this.data.rows.push(r);
    this.data.lastWall = this.now();
  }

  private reset(): void {
    const w = this.who();
    this.data = emptyRun(w.patient, w.weightKg, this.now());
    this.active = new Set();
    this.lastVent = -Infinity;
    this.pulse = null;
    this.pvcRun = { n: 0, t: 0, row: null };
    this.held = null;
    this.since = -Infinity;
    this.pressed.clear();
    this.jump = null;
    this.marks.clear();
    for (const k of Object.keys(this.cur)) delete this.cur[k];
    for (const k of LAB_KEYS) delete this.lab[k];
  }

  /** The engine went back to simulated time t (a return to a bookmark): the trend rewinds as the monitor's does. */
  private restored(t: number): void {
    this.data.samples = this.data.samples.filter((s) => s.t <= t + EPS);
    this.since = t;
  }

  /**
   * The return to bookmark `label`, whose snapshot is at the engine's time `t` (exact: the restore's tick): every kept row
   * recorded after that bookmark at or after `t` is undone. Both tests matter: an action in the snapshot's own tick came
   * after it (same time, later order), and a breath reaches the record when it ends, seconds after the time it carries
   * (earlier time, later order). The breath, pulse and alarm trackers go back to where they stood at the bookmark, so the
   * restored engine's repeat of a breath already under way is no new "began" and an alarm active at the bookmark is not
   * raised again. A bookmark this record never saw: the rows after `t`, the trackers from the kept rows, and every alarm
   * the restored engine reports is raised.
   */
  private undo(label: string, t: number): void {
    const n = ++this.data.returns;
    const rows = this.data.rows;
    let i = rows.length - 1;
    while (i >= 0 && !(rows[i]?.mark === label && rows[i]?.undone === undefined)) i--;
    rows.forEach((r, k) => {
      if (r.undone === undefined && k > i && r.t > t - EPS && (i >= 0 || r.t > t + EPS)) r.undone = n;
    });
    const m = this.marks.get(label);
    this.pressed.clear();
    this.lastVent = m ? m.lastVent : -Infinity;
    this.active = new Set(m?.active ?? []);
    this.pulse = m ? m.pulse : rows.filter((r) => r.undone === undefined && (r.ev === 'pulseLoss' || r.ev === 'rosc')).at(-1)?.ev !== 'pulseLoss';
  }
}
