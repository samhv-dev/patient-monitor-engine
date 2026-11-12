// The debrief's record of one run — what happened, in order, at the simulated time the monitor showed: every command
// applied (from the panel, a Remote or the scenario), the scenario's states, the alarms raised (each with when it ended
// and was acknowledged), bookmarks and returns
// to them (a mark's kind and note with it), the pulse lost and back (from the model), runs of ventricular tachycardia (≥ 3 consecutive PVCs on the drawn
// ECG, the model's or the instructor's), ventilated breaths beginning, the instructor's notes (the /1 Recognised press
// among them, as its own run event), and a 1 Hz
// trend of six numerics, the systolic, diastolic and CVP the monitor measured, and five laboratory values of the model
// (K⁺, lactate, pH, glucose, core temperature). `keeps` names the facts this build records, so a reader can tell an
// older file's "not recorded" from a value that was not measured (Debrief 2, plan §3). A state
// row names the transition that entered it and whether a press, its rule or a jump did, as the scenario's event says
// the runner took it (never a match of a press to a state's time); an item of a staged delivery
// keeps its own row with the delivery's id (Instructor v2, IP8; all additive). A pme-scenario/2 run also keeps a copy
// of the phase runner's grade inputs (phases, administrations, rule edges; plan F7), taken each second and on every
// phase, so the debrief, its export and a reload never need the driver. It lives
// beside the engine, NOT in its snapshot: a return to a bookmark rewinds the engine, the trends and the clocks but not
// this record — the discarded course stays, marked undone, so the debrief shows the run as it happened, and its rules
// and charts read the course that was kept. A new patient or scenario (a 'restart' timeline) starts a new record. Plain
// JSON data; no DOM.
import type { EngineEvent } from '@pme/engine-core';
import { asV1, isV2, LEARNER_ISSUED_BY, PUMP_ISSUED_BY, type AnyScenarioDoc, type AppliedResolution, type MarkKind, type PumpMeta, type PumpReplaced, type WireEvent } from '@pme/controller';
import type { Administration, PhaseEntry, RuleEdge, StagedPrep } from '@pme/controller/scenario';
import { alarmLine } from './alarms.ts';
import { describeCommand } from './describe.ts';

/** How a state row's state was entered (`Row.by` on a state row). */
export type StateBy = 'press' | 'rule' | 'goto';
/** `learner` (Room plan R5d): a press of the learner defibrillator window, applied by the host as the instructor's own;
 *  (learner-action-remote.md L4) a give, an infusion change or a sample from a learner remote, the same way. */
/** `pump` (pump-rack-tci.md C2): a press of the pump tablet, or the host's mismatch finding on one of its channels. */
export type RowKind = 'action' | 'remote' | 'learner' | 'pump' | 'scenario' | 'alarm' | 'bookmark' | 'restore' | 'patient' | 'note';
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
   *  transition's own rule, or a jump (`goto`), copied from the scenario event's `by` (the runner's own account of the
   *  transition it took). Absent for the first state. A `learner` row (R5d): the device key of the window that pressed,
   *  as the host carried it (8 to 16 letters and digits, so never one of the three words). */
  by?: StateBy | (string & {});
  /** A `learner` row (R5d): the name the instructor gave that device in Room setup when it pressed (absent: none). */
  name?: string;
  /** A `learner` row (L4): it came from a learner remote, not the defibrillator window (absent: the window's, R5d). */
  remote?: true;
  /** A `learner` row (L4): the preparation the give came from (the remote's own id; the host's record of it is the /2
   *  administration's `prep`). */
  prepId?: string;
  /** A `learner` row (L4, LQ4): an infusion change's replaced rate, and who had set it (a device key or the laptop,
   *  phone or card), as the host wrote it on the command. */
  replaced?: { rate: number; rateUnit: string; by: string };
  /** A pump channel's row (C2, §7 "Record"): its channel, whoever pressed (the tablet, a remote or the laptop, D9). */
  channel?: number;
  /** A pump channel's row: the values the change replaced and who had set each (a device key, or laptop, phone, card),
   *  as the host wrote them on the command; for a load, where the syringe or bag came from. */
  pump?: { replaced?: PumpReplaced[]; origin?: PumpMeta['origin']; mismatch?: true };
  /** A bookmark row (Instructor v2 marks): the mark's kind, and the note the instructor wrote with it. */
  markKind?: Exclude<MarkKind, 'stage'>;
  note?: string;
  /** An action row given in a staged delivery: the delivery's id and its number of items. Each item keeps its own row
   *  (a rule still sees its `drug:<id>`); the Debrief's timeline prints one line per delivery. */
  batch?: { id: string; n: number };
  /** An alarm raise row (D2): when its condition cleared — the first status where it left the active list or was
   *  latched (`AlarmEntry.latched`), whichever came first; absent while it is active (drawn open to the end). */
  endT?: number;
  /** An alarm raise row (D2): the first status reporting it acknowledged (`AlarmEntry.acked`). */
  ackT?: number;
}
/** A mark's kind (Instructor v2): a good moment, a bad one, or one to discuss. */
/** The instructor's mark kinds (the controller's `MarkKind` without the driver's own `stage`). */
const MARK_KINDS: readonly string[] = ['good', 'bad', 'discuss'] satisfies Array<Exclude<MarkKind, 'stage'>>;

/** The six trended numerics; each reads the first valid of its monitor numerics (glossary keys `mon.<id>`). The cuff's
 *  `nibpMean` counts only in the second of its cycle, as the cuff pressures do (`PRESSURES`). */
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
/**
 * The pressures (Debrief 2, D1), outside `TREND` so that the trend charts and the debrief's value rules do not change:
 * systolic and diastolic each the first valid of the arterial line then the cuff (the order `TREND.map` reads), and
 * the CVP. A value counts only in the second it was measured in (its `at`): the arterial line and the CVP report every
 * second, the cuff once per cycle (`l2/hemo/pipeline.ts` `nibpEvents`), so a cuff value sits in the sample of its
 * cycle's second and the seconds between cycles are null (a trend draws the gap blank; DQ1, ruled 5 November). A line
 * that stops reporting is null from its first silent second, never its last value. Stored in whole mmHg, the
 * monitor's displayed precision (the debrief shows what the monitor showed).
 */
export const PRESSURES = { sys: ['abpSys', 'nibpSys'], dia: ['abpDia', 'nibpDia'], cvp: ['cvpMean'] } as const;
export type PressureKey = keyof typeof PRESSURES;
const PRESSURE_KEYS = Object.keys(PRESSURES) as PressureKey[];
/** One second of the record. The pressures are optional: a record made before D1 has none ("not recorded"). */
export type Sample = { t: number } & Record<ValueKey, number | null> & Partial<Record<PressureKey, number | null>>;
/** The facts this build's recorder keeps beyond the first record's (plan §3): a reader treats a word missing from a
 *  file's `keeps`, or no `keeps`, as "not recorded in this file". 'pressures': `Sample.sys`, `dia`, `cvp`; 'alarmEnd':
 *  `Row.endT` and `Row.ackT` on alarm rows; 'cprStop': `ev: 'cprStop'` on the command
 *  row that stops compressions (a record without it kept no stop, so its hands-off time is unknown); 'recognised': the
 *  instructor's "Recognised" press on a /1 card without a recognition objective or a free run is a note row with
 *  `ev: 'recognised'` (a record without it had no such press, so its absence says nothing). */
export const KEEPS = ['pressures', 'alarmEnd', 'cprStop', 'recognised'] as const;

export interface RunData {
  /** Wall clock (ms since 1970) when the run began, and of the last thing recorded. */
  startedAt: number;
  lastWall: number;
  patient: string;
  weightKg: number;
  /** Either format; a `pme-scenario/2` card's phase rows read the phase's label. */
  doc: AnyScenarioDoc | null;
  rows: Row[];
  /** One per simulated second of the kept course. */
  samples: Sample[];
  /** Returns to a bookmark so far. */
  returns: number;
  /** The facts this file's recorder kept (`KEEPS` of its build); absent on a record made before Debrief 2. */
  keeps?: string[];
  /** A pme-scenario/2 run (plan F7): the host's phase runner's grade inputs as of the last copy (none on a /1 run). */
  format?: 2;
  phases?: PhaseEntry[];
  admin?: Administration[];
  edges?: RuleEdge[];
  /** A pme-scenario/2 run (learner-action-remote.md L13): the preparations the learner remotes staged, given or not, as
   *  the runner keeps them (absent: none staged, or a record made before L13). */
  preps?: StagedPrep[];
}
/** What the record copies from the host's phase runner (`ScenarioDriver.phaseRunner`). */
export interface GradeInputs {
  readonly phases: readonly PhaseEntry[];
  readonly admin: readonly Administration[];
  readonly edges: readonly RuleEdge[];
  /** L13: the staged preparations (the phase runner's `preps`). */
  readonly preps?: readonly StagedPrep[];
}

/** Ventilated breaths "begin" after this long without one [ENG: ui; longer than any set rate's interval, 6/min = 10 s]. */
const VENT_GAP_S = 15;
/** A state published this long before the newest row is a return's re-publish, not a new state [ENG: ui; > the app's
 *  poll lag of 0.8 s of sim at ×8]. */
const RESYNC_S = 2;
/** Samples kept: 4 h of a run [ENG: ui]. ponytail: oldest dropped beyond it; a longer run needs a coarser trend. */
const SAMPLES_MAX = 4 * 3600;
const EPS = 1e-6;
/** Consecutive PVCs that make a run of ventricular tachycardia (non-sustained VT: ≥ 3 beats; Katritsis 2012). */
const VT_RUN = 3;
/** The host's tick (s). */
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

export const emptyRun = (patient = '', weightKg = 70, now = Date.now()): RunData => ({ startedAt: now, lastWall: now, patient, weightKg, doc: null, rows: [], samples: [], returns: 0, keeps: [...KEEPS] });

export class RunRecord {
  data: RunData;
  private active = new Set<string>();
  /** The kept raise row of each alarm still in the engine's active list (its end and acknowledgement go on it). */
  private open = new Map<string, Row>();
  private lastVent = -Infinity;
  private pulse: boolean | null = null;
  /** The PVCs in a row so far, the first one's time, and the run's row once it is one. */
  private pvcRun: { n: number; t: number; row: Row | null } = { n: 0, t: 0, row: null };
  private held: WireEvent | null = null;
  /** The engine time of the last return to a bookmark (-∞: none this run). */
  private since = -Infinity;
  /** The trackers as they stood at each bookmark of this run. */
  private readonly marks = new Map<string, { lastVent: number; pulse: boolean | null; active: string[] }>();
  private readonly cur: Record<string, number | null> = {};
  /** The time each monitor numeric in `cur` was measured at (its `at`). */
  private readonly curAt: Record<string, number> = {};
  private readonly lab: Partial<Record<LabKey, number | null>> = {};
  /** The defibrillator's energy as its last deviceStatus said (R5d: a learner's press carries none; the device's is it). */
  private defibJ: number | null = null;

  private readonly who: () => { patient: string; weightKg: number };
  private readonly now: () => number;
  private readonly runner: () => GradeInputs | null;
  private readonly deviceName: (key: string) => string | null;

  /** `runner`: the host's phase runner (a follower has none). `deviceName`: the name the instructor gave a device key in
   *  Room setup (R7's remembered layout), for a learner's press (R5d). */
  constructor(who: () => { patient: string; weightKg: number }, now: () => number = Date.now, runner: () => GradeInputs | null = () => null, deviceName: (key: string) => string | null = () => null) {
    this.who = who;
    this.now = now;
    this.runner = runner;
    this.deviceName = deviceName;
    const w = who();
    this.data = emptyRun(w.patient, w.weightKg, now());
  }

  /** The host's wire events (its own panel's end of the in-process hub): commands applied, states, timelines. */
  wire(e: WireEvent): void {
    if (e.type === 'timeline') return e.cause === 'restore' ? this.restored(e.t) : this.reset();
    if (e.type === 'scenario') {
      if (!this.data.doc) return void (this.held = e); // a load publishes its first state before its own commandApplied
      this.copy(); // a phase entered (or a resync's repeat of it)
      // a return to a bookmark re-publishes the bookmark's state, with the time it was entered, BEFORE the timeline
      // event: it is not a new state (the return's row says where the run went back to)
      if (e.t < (this.data.rows.at(-1)?.t ?? 0) - RESYNC_S) return;
      const kept = this.data.rows.filter((r) => r.kind === 'scenario' && r.undone === undefined).at(-1);
      if (kept?.ev === `state:${e.stateId}`) return; // a resync's repeat of the state we are in
      const doc = this.data.doc;
      // a /1 state's label, or a /2 phase's (F11: a phase read "next state")
      const label = (doc && isV2(doc) ? doc.phases.find((p) => p.id === e.stateId)?.label : asV1(doc)?.states.find((s) => s.id === e.stateId)?.label) ?? 'next state';
      // how it was entered, as the runner took it (the event's `by`: the press of this transition held when it fired,
      // its rule alone, or a jump). Not matched from the press's acknowledgement: the host reads its clock once for the
      // acknowledgement's tick and again for the state's time, and at ×8 the two can be more than a tick apart. A /2
      // phase is always entered by its own rule (Q5), so its entry (`enter:<id>`) reads 'rule'
      const by = e.by ?? (doc && isV2(doc) && e.transitionId ? 'rule' : undefined);
      const row: Row = {
        t: e.t, kind: 'scenario', text: `Scenario state: ${label}`, ev: `state:${e.stateId}`,
        ...(e.transitionId ? { tr: e.transitionId } : {}), ...(by ? { by } : {}),
      };
      return this.add(row);
    }
    if (e.type === 'prep') {
      const b = e.body as Record<string, unknown> | null;
      if (b && (b.news === 'pumpMismatch' || b.news === 'pumpMismatchCleared')) this.pumpFinding(e.t, b);
      return;
    }
    if (e.type !== 'commandApplied') return;
    const r = e.resolved as AppliedResolution | undefined;
    if (!r?.command || r.replay || r.mirror) return; // a late-join replay or a cockpit frame is not an action
    const c = r.command as unknown as Record<string, unknown>;
    if (c.issuedBy === 'ventilator') return; // E128: the Ventilator view's hand-over to the engine's ventilator, not an action
    if (c.type === 'note') return; // a remote's note: the host files it as its own (Link.note → note()), not as an action
    const bySc = c.issuedBy === 'scenario';
    // the scenario's own set-up (mode, sensors, device settings) is not part of the case; a manual trigger is shown
    // by the state it leads to
    if (bySc && (c.type === 'setMode' || c.type === 'attachSensor' || c.type === 'device')) return;
    const t = e.tick * TICK_S;
    if (c.type === 'scenario' && c.action === 'trigger') return; // shown by the state it leads to, entered 'press'
    const text = describeCommand(c);
    if (c.type === 'scenario') {
      if (c.action === 'load' && c.doc) {
        this.data.doc = c.doc as AnyScenarioDoc;
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
      return this.add({ t, kind: c.action === 'restoreBookmark' ? 'restore' : 'scenario', text });
    }
    const ev = c.type === 'applyEvent' ? (c.event as Record<string, unknown>) : null;
    if (c.issuedBy === LEARNER_ISSUED_BY && ev?.kind === 'defib') return this.add(this.learnerRow(t, c, ev));
    if (ev?.kind === 'pump') return this.add(this.pumpRow(t, c, ev, text));
    const learner = c.issuedBy === LEARNER_ISSUED_BY;
    const row: Row = { t, kind: bySc ? 'scenario' : learner ? 'learner' : c.issuedBy === 'remote' ? 'remote' : 'action', text };
    // L4: a learner remote's give names its device (and the name Room setup gave it), its preparation and, for an
    // infusion change, the rate it replaced — all as the host wrote them on the command, never as the phone sent them
    if (learner) Object.assign(row, this.learnerOf(c));
    const b = c.batch as { id?: unknown; n?: unknown } | undefined;
    if (!bySc && typeof b?.id === 'string' && typeof b.n === 'number') row.batch = { id: b.id, n: b.n };
    if (ev?.kind === 'drug' || ev?.kind === 'infusion' || ev?.kind === 'tci') row.ev = `drug:${String(ev.drugId)}`;
    if (ev?.kind === 'drug' && !ev.infusion) row.dose = { drugId: String(ev.drugId), dose: Number(ev.dose), unit: String(ev.unit) };
    if (ev?.kind === 'fluid') row.ev = 'fluid';
    if (ev?.kind === 'cpr' && ev.active) row.ev = 'cpr';
    if (ev?.kind === 'cpr' && !ev.active) row.ev = 'cprStop'; // D3: the hands-off time reads the stops
    if (ev?.kind === 'defib' && ev.action === 'shock') row.ev = 'shock';
    if (ev?.kind === 'condition' && Number(ev.severity) > 0) row.ev = `condition:${String(ev.id)}`;
    if (ev?.kind === 'airway') row.ev = `airway:${String(ev.state)}`;
    this.add(row);
  }

  /**
   * R5d: a press of the learner defibrillator window (the host applied only Charge and Shock, bare: host-session.ts) —
   * its words with the device's energy, the device key the host carried and the name the instructor gave it.
   */
  private learnerRow(t: number, c: Record<string, unknown>, ev: Record<string, unknown> | null): Row {
    const shock = ev?.kind === 'defib' && ev.action === 'shock';
    const by = typeof c.by === 'string' ? c.by : undefined;
    const name = by !== undefined ? this.deviceName(by) : null;
    return {
      t, kind: 'learner', text: `${shock ? 'Shock' : 'Charge'}${this.defibJ !== null ? ` ${this.defibJ} J` : ''}`,
      ...(shock ? { ev: 'shock' } : {}), ...(by !== undefined ? { by } : {}), ...(name ? { name } : {}),
    };
  }

  /**
   * C2 (§7 "Record"): a pump channel's act, as the host applied it: the tablet's own (kind `pump`, its device key and the
   * name Room setup gave it), or a remote's or the laptop's change routed to the channel (D9: that sender's kind); the
   * channel, the values replaced and who had set them, a load's origin; the drug is the channel's TRUE contents (`ev`,
   * and a bolus's true dose for the drug totals).
   */
  private pumpRow(t: number, c: Record<string, unknown>, ev: Record<string, unknown>, text: string): Row {
    const meta = c.pump as PumpMeta | undefined;
    const kind: RowKind = c.issuedBy === PUMP_ISSUED_BY ? 'pump' : c.issuedBy === LEARNER_ISSUED_BY ? 'learner' : c.issuedBy === 'remote' ? 'remote' : 'action';
    const by = kind === 'pump' || kind === 'learner' ? (typeof c.by === 'string' ? c.by : undefined) : undefined;
    const name = by !== undefined ? this.deviceName(by) : null;
    const drug = meta?.contents?.drugId;
    const gives = ev.action === 'bolus' || ev.action === 'tci' || meta?.infusion !== undefined;
    const extra: Row['pump'] = { ...(meta?.replaced ? { replaced: meta.replaced } : {}), ...(meta?.origin ? { origin: meta.origin } : {}), ...(meta?.mismatch ? { mismatch: true as const } : {}) };
    return {
      t, kind, text, channel: Number(ev.ch), ...(by !== undefined ? { by } : {}), ...(name ? { name } : {}), ...(kind === 'learner' ? { remote: true as const } : {}),
      ...(drug && gives ? { ev: `drug:${drug}` } : {}),
      ...(drug && ev.action === 'bolus' && meta?.bolus ? { dose: { drugId: drug, dose: meta.bolus.dose, unit: meta.bolus.unit } } : {}),
      ...(Object.keys(extra).length ? { pump: extra } : {}),
    };
  }

  /** C2 (§8): the host's mismatch finding on a channel, as the instructor's screens hear it (never the pump's). */
  private pumpFinding(t: number, b: Record<string, unknown>): void {
    const ch = Number(b.ch);
    if (b.news === 'pumpMismatchCleared') return this.add({ t, kind: 'pump', channel: ch, text: `Channel ${ch}: contents and programme agree` });
    const what = b.kind === 'drip' ? 'Bag' : 'Syringe';
    const n = b.notice as { shownAt?: number } | null;
    if (n && typeof n.shownAt === 'number') return this.add({ t: n.shownAt, kind: 'pump', channel: ch, text: `Channel ${ch}: mismatch notice shown on the pump` });
    this.add({ t, kind: 'pump', channel: ch, text: `Channel ${ch}: ${what} and programme differ (${String(b.text)})` });
  }

  /** L4: a learner remote's device key, the name Room setup gave it, its preparation and an infusion change's replaced rate. */
  private learnerOf(c: Record<string, unknown>): Pick<Row, 'remote' | 'by' | 'name' | 'prepId' | 'replaced'> {
    const by = typeof c.by === 'string' ? c.by : undefined;
    const name = by !== undefined ? this.deviceName(by) : null;
    const r = c.replaced as { rate?: unknown; rateUnit?: unknown; by?: unknown } | undefined;
    return {
      remote: true, ...(by !== undefined ? { by } : {}), ...(name ? { name } : {}), ...(typeof c.prepId === 'string' ? { prepId: c.prepId } : {}),
      ...(r && typeof r.rate === 'number' && typeof r.rateUnit === 'string' && typeof r.by === 'string' ? { replaced: { rate: r.rate, rateUnit: r.rateUnit, by: r.by } } : {}),
    };
  }

  /** The host's engine events (truth included: it stays on this page). */
  engine(e: EngineEvent): void {
    if (e.type === 'deviceStatus' && e.defib) this.defibJ = e.defib.energyJ;
    if (e.type === 'alarmStatus') {
      for (const a of e.active) {
        if (!this.active.has(a.id)) {
          const row: Row = { t: e.t, kind: 'alarm', text: alarmLine(a).text, ev: `alarm:${a.id}` };
          this.add(row);
          this.open.set(a.id, row);
        }
        const row = this.open.get(a.id);
        if (!row) continue;
        if (a.latched) row.endT ??= e.t;
        else delete row.endT; // the condition came back while latched (the manager un-latches it): not ended yet
        if (a.acked) row.ackT ??= e.t;
      }
      this.active = new Set(e.active.map((a) => a.id));
      for (const [id, row] of this.open) {
        if (this.active.has(id)) continue;
        row.endT ??= e.t;
        this.open.delete(id);
      }
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
      for (const [k, m] of Object.entries(e.values)) {
        this.cur[k] = m && m.value !== null && m.flag !== 'invalid' ? m.value : null;
        this.curAt[k] = m?.at ?? e.t;
      }
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
    const now = (id: string) => (Math.floor((this.curAt[id] ?? -Infinity) + EPS) === s ? this.cur[id] : null); // measured in this second
    // the cuff's MAP, like its systolic and diastolic, only in the second of its cycle (research/41 row 53)
    const read = (id: string) => (id === 'nibpMean' ? now(id) : this.cur[id]);
    for (const k of TREND_KEYS) row[k] = TREND[k].map(read).find((v) => typeof v === 'number') ?? null;
    for (const k of PRESSURE_KEYS) {
      const v = PRESSURES[k].map(now).find((x) => typeof x === 'number');
      row[k] = typeof v === 'number' ? Math.round(v) : null; // whole mmHg, as the monitor prints it
    }
    for (const k of LAB_KEYS) row[k] = this.lab[k] ?? null;
    const last = this.data.samples.at(-1);
    if (last && last.t === s) Object.assign(last, row);
    else if (!last || s > last.t) {
      this.data.samples.push(row);
      this.copy(); // once a second, with the sample
    }
    if (this.data.samples.length > SAMPLES_MAX) this.data.samples.splice(0, this.data.samples.length - SAMPLES_MAX);
    this.data.lastWall = this.now();
  }

  /** A /2 run: the runner's grade inputs, copied (the runner closes a phase entry in place). */
  private copy(): void {
    const r = this.runner();
    if (!r || !this.data.doc || !isV2(this.data.doc)) return;
    Object.assign(this.data, { format: 2, phases: r.phases.map((p) => ({ ...p })), admin: structuredClone([...r.admin]), edges: [...r.edges] });
    if (r.preps?.length) this.data.preps = structuredClone([...r.preps]); // L13: absent until the first, as in the runner
    else delete this.data.preps;
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
    this.reopen(t);
    this.lastVent = k.lastVent ?? -Infinity;
    this.pulse = k.pulse;
    this.held = null;
    this.since = t;
    this.add({ t, kind: 'restore', text: 'Restored after a reload of the page' });
  }

  /** An instructor note or an objective ticked in the Scenario tab (the Link's log); `ev` the run event a note is (D5:
   *  'recognised', the /1 Recognised press). */
  note(t: number, text: string, ev?: 'recognised'): void {
    this.add({ t, kind: 'note', text, ...(ev ? { ev } : {}) });
  }

  private add(r: Row): void {
    this.data.rows.push(r);
    this.data.lastWall = this.now();
  }

  private reset(): void {
    const w = this.who();
    this.data = emptyRun(w.patient, w.weightKg, this.now());
    this.active = new Set();
    this.open.clear();
    this.lastVent = -Infinity;
    this.pulse = null;
    this.pvcRun = { n: 0, t: 0, row: null };
    this.held = null;
    this.since = -Infinity;
    this.marks.clear();
    for (const k of Object.keys(this.cur)) delete this.cur[k];
    for (const k of Object.keys(this.curAt)) delete this.curAt[k];
    for (const k of LAB_KEYS) delete this.lab[k];
  }

  /** The engine went back to simulated time t (a return to a bookmark): the trend rewinds as the monitor's does. */
  private restored(t: number): void {
    this.data.samples = this.data.samples.filter((s) => s.t <= t + EPS);
    this.since = t;
    this.copy(); // the runner went back with the engine
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
  /** The alarm rows after the engine went back to time `t`: an end or an acknowledgement later than `t` is undone on
   *  every kept row, and each alarm the trackers hold active is open again on its latest kept raise row. */
  private reopen(t: number): void {
    const rows = this.data.rows.filter((r) => r.kind === 'alarm' && r.undone === undefined);
    for (const r of rows) {
      if (r.endT !== undefined && r.endT > t + EPS) delete r.endT;
      if (r.ackT !== undefined && r.ackT > t + EPS) delete r.ackT;
    }
    this.open = new Map();
    for (const r of rows) {
      const id = (r.ev ?? '').slice('alarm:'.length);
      if (r.endT === undefined && this.active.has(id)) this.open.set(id, r);
    }
  }

  private undo(label: string, t: number): void {
    const n = ++this.data.returns;
    const rows = this.data.rows;
    let i = rows.length - 1;
    while (i >= 0 && !(rows[i]?.mark === label && rows[i]?.undone === undefined)) i--;
    rows.forEach((r, k) => {
      if (r.undone === undefined && k > i && r.t > t - EPS && (i >= 0 || r.t > t + EPS)) r.undone = n;
    });
    const m = this.marks.get(label);
    this.lastVent = m ? m.lastVent : -Infinity;
    this.active = new Set(m?.active ?? []);
    this.reopen(t);
    this.pulse = m ? m.pulse : rows.filter((r) => r.undone === undefined && (r.ev === 'pulseLoss' || r.ev === 'rosc')).at(-1)?.ev !== 'pulseLoss';
  }
}
