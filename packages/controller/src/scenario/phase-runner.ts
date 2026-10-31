// The pme-scenario/2 phase runner (docs/plans/scenario-format-v2.md §4, §8.1; plan F2). A PURE machine like the /1
// runner (no engine, no clock, no DOM), chosen by the driver from `doc.schema`; the /1 runner (runner.ts) is untouched.
// - Phases are entered by their own rules on engine truth (rank 3, rules.ts), never by a press or a goto (Q5). Each
//   advance the entry rules of the current phase's `next` are tried in their written order; the first that holds wins;
//   at most one phase change per call (§4, Q6). A phase never re-enters itself.
// - Every rule named anywhere in the card (rules.ts namedRules) is evaluated on every advance that is not paused, and its
//   true/false edges are appended to `edges` (Q17): grade() (F3) reads them instead of the values' history.
// - Timers as /1's: the interval since the last call is credited with the values held BEFORE this call's inputs (hold
//   counters, the scenario clock, and the 1 Hz ring samples at each whole second crossed), so the result does not depend
//   on how often advance() is called. Hold counters are NOT reset on a phase entry: a rule reads the course, not the
//   phase it is tried from.
// - The script (§3, Q4): an entry fires once, on the first time its anchor happens (its phase's first entry, the nth
//   taking of an action, the scenario clock), as one command batch labelled card-set, never graded. An entry anchored on
//   an action's taking carries the press's stage group, so the driver sends it with the press, on the press's tick.
// - A phase with `holdS` (the owner's 60-s boundary hold, 31 October) is entered only once its rule has held without a
//   break for that long (unpaused sim seconds, counted from the rule's true edge). An `unchanged` leaf is the rule's
//   guard that the team has not changed what it reads (the set ventilation: "rising at unchanged ventilation"); a hold
//   once started is NOT broken by that guard's change, which is the team's response to what the rule saw, nor by what
//   follows from it (decision D1, review B1): when the rule falls with one of its guards false, the hold is latched and
//   runs on to its end. A rule that falls with every guard still true (the course itself turned) starts the hold again.
// - The phase timeline, the administration record (record(); the driver fills it, F3), the edges, the rings and the script entries fired are
//   all in the plain-JSON state (`pme-scenario-runner/2`): a bookmark restores them and the run log replays them.
import type { ScenarioEvent, SensorId } from '../protocol.ts';
import type { VitalHold } from './runner.ts';
import { compare } from './runner.ts';
import { EPS, holds, namedRules, slopePerMin, spreadPct, walkLeaves, windowOf, type NamedRule, type RuleCtx } from './rules.ts';
import type { DocCommand } from './types.ts';
import type { Administration, Phase, PhaseEntry, PhaseRule, PhaseRunnerState, RuleEdge, RunnerInputV2, ScenarioDocV2, ScriptEntry } from './types-v2.ts';

export type PhaseRunnerEffect =
  | {
      kind: 'commands';
      batch: number;
      /** 'start': the patient's setup; 'script': a script entry, always card-set. */
      reason: 'start' | 'script';
      commands: DocCommand[];
      cardSet?: true;
      scriptId?: string;
      /** The stage group of the press whose taking fired it: the driver sends the entry in that group. */
      group?: string;
    }
  | { kind: 'event'; event: ScenarioEvent };

export type PhaseRunLogEntry =
  | { op: 'start'; t: number; seed: number }
  | { op: 'advance'; t: number; inputs: RunnerInputV2[] }
  | { op: 'take'; t: number; actionId: string; group?: string }
  | { op: 'pause' | 'resume'; t: number }
  | { op: 'restore'; t: number; state: PhaseRunnerState }
  | { op: 'enter'; t: number; stateId: string; transitionId?: string }
  | { op: 'script'; t: number; scriptId: string; anchor: string }
  | { op: 'dispatch'; t: number; commandId: string; type: string; accepted: boolean; tick: number; reason?: string; cardSet?: true };

/** A leaf of a rule out of the current phase as it reads now (Instructor v2's A-row bar): a value leaf's hold, or a slope
 *  or unchanged leaf's window fill (`heldS` of `forS` = the seconds the ring spans of the window). */
export interface PhaseHold extends VitalHold {
  leaf: 'value' | 'slope' | 'unchanged' | 'hold';
}

const HISTORY_MAX = 200;
const PHASES_MAX = 500;
/** Measured numerics also count as the StateVar they display, as in the /1 runner (rank 2 only here). */
const ALIAS: Record<string, string> = {
  abpSys: 'sbp', abpDia: 'dbp', abpMean: 'map', nibpSys: 'sbp', nibpDia: 'dbp', nibpMean: 'map', cvpMean: 'cvp', awrr: 'rr',
};
const SIGNAL_VALUES = ['dantroleneE', 'setMinuteVentilationLMin', 'map', 'mhActivity', 'mhExcess'] as const;

export class PhaseRunner {
  /** Edges kept per rule; past it the oldest are dropped, except the rule's first edge (its first true). */
  static readonly EDGES_PER_RULE = 100;
  readonly doc: ScenarioDocV2;
  readonly seed: number;
  readonly log: PhaseRunLogEntry[] = [];
  private s: PhaseRunnerState;
  private readonly byId = new Map<string, Phase>();
  private readonly rules: NamedRule[];
  private readonly actions: Set<string>;
  /** The longest slope/unchanged window per variable: how long its ring is kept. */
  private readonly ringSpan = new Map<string, number>();
  /** The variables an `unchanged` leaf reads against the phase's start. */
  private readonly sinceVars = new Set<string>();
  private entered = 0; // phase entries by this instance (not in the state, so a restore does not rewind it)
  private readonly ctx: RuleCtx;

  constructor(doc: ScenarioDocV2, opts: { seed?: number } = {}) {
    this.doc = doc;
    this.seed = (opts.seed ?? doc.seed ?? 1) >>> 0;
    for (const p of doc.phases) this.byId.set(p.id, p);
    this.rules = namedRules(doc);
    this.actions = new Set(doc.actions.map((a) => a.id));
    for (const nr of this.rules) {
      walkLeaves(nr.rule, nr.name, (leaf) => {
        if ('unchanged' in leaf && leaf.unchanged.since) return void this.sinceVars.add(leaf.unchanged.var);
        const w = 'slope' in leaf ? leaf.slope : 'unchanged' in leaf ? leaf.unchanged : null;
        if (w?.overS) this.ringSpan.set(w.var, Math.max(this.ringSpan.get(w.var) ?? 0, w.overS));
      });
    }
    const initial = (doc.phases.find((p) => p.initial) ?? doc.phases[0]) as Phase;
    this.s = {
      schema: 'pme-scenario-runner/2', docId: doc.id, started: false, stateId: initial.id, lastT: 0, stateT: 0, scenarioT: 0,
      paused: false, batch: 0, enteredT: 0, truth: {}, display: {}, rhythm: null, pulse: null, pulseLost: false, trueFor: {},
      rings: {}, ruleNow: {}, history: [], phases: [], admin: [], edges: [], fired: [], takings: {},
    };
    const self = this;
    this.ctx = {
      value: (name, rank) => (rank === 3 ? self.s.truth : self.s.display)[name]?.v,
      held: (key) => self.s.trueFor[key] ?? 0,
      ring: (name) => self.s.rings[name] ?? [],
      visited: (id) => self.s.phases.some((p) => p.id === id),
      phaseRef: (name) => self.s.phaseRef?.[name],
      get rhythm() {
        return self.s.rhythm;
      },
      get pulse() {
        return self.s.pulse;
      },
      get pulseLost() {
        return self.s.pulseLost;
      },
    };
  }

  /** The current phase's id. */
  get stateId(): string {
    return this.s.stateId;
  }
  get stateT(): number {
    return this.s.stateT;
  }
  get scenarioT(): number {
    return this.s.scenarioT;
  }
  get paused(): boolean {
    return this.s.paused;
  }
  get started(): boolean {
    return this.s.started;
  }
  get enteredT(): number {
    return this.s.enteredT;
  }
  /** How many phases this runner has entered (the start's included). Grows only. */
  get entries(): number {
    return this.entered;
  }
  get history(): ReadonlyArray<{ t: number; stateId: string; transitionId?: string }> {
    return this.s.history;
  }
  get phases(): ReadonlyArray<PhaseEntry> {
    return this.s.phases;
  }
  get edges(): ReadonlyArray<RuleEdge> {
    return this.s.edges;
  }
  /** How many times each action has been taken (Instructor v2's "given ×n", F6). */
  get takings(): Readonly<Record<string, number>> {
    return this.s.takings;
  }
  get admin(): ReadonlyArray<Administration> {
    return this.s.admin;
  }
  /** The current phase. */
  state(): Phase {
    return this.byId.get(this.s.stateId) as Phase;
  }
  /** The truth (rank 3) value a rule reads now, and the displayed (rank 2) one. */
  value(name: string): number | undefined {
    return this.s.truth[name]?.v;
  }
  displayed(name: string): number | undefined {
    return this.s.display[name]?.v;
  }

  /** The patient's setup batch (as /1's start), the initial phase, and the script entries due at once. */
  start(t: number): PhaseRunnerEffect[] {
    if (this.s.started) throw new Error('scenario already started');
    this.log.push({ op: 'start', t, seed: this.seed });
    this.s.started = true;
    this.s.lastT = t;
    const p = this.doc.patient;
    const setup: DocCommand[] = [];
    if (this.doc.mode) setup.push({ type: 'setMode', mode: this.doc.mode });
    if (p?.rhythm) setup.push({ type: 'setRhythm', rhythm: p.rhythm.id, when: 'now', ...(p.rhythm.opts ? { opts: p.rhythm.opts } : {}) });
    for (const [variable, value] of Object.entries(p?.baseline ?? {})) {
      if (value !== undefined) setup.push({ type: 'setTarget', variable: variable as never, value });
    }
    for (const [sensor, state] of Object.entries(p?.sensors ?? {})) {
      if (state !== undefined) setup.push({ type: 'attachSensor', sensor: sensor as SensorId, state });
    }
    const out: PhaseRunnerEffect[] = setup.length ? [{ kind: 'commands', batch: ++this.s.batch, reason: 'start', commands: setup }] : [];
    return [...out, ...this.enter(t, this.s.stateId, 'initial'), ...this.clockScript(t)];
  }

  /** One step: credit the timers, take the inputs, evaluate every named rule, then try the current phase's `next`. */
  advance(t: number, inputs: RunnerInputV2[] = []): PhaseRunnerEffect[] {
    if (!this.s.started) return [];
    const at = this.log.length;
    const dt = this.sync(t);
    for (const i of inputs) this.take1(t, i);
    this.track(0);
    this.refs();
    let out: PhaseRunnerEffect[] = [];
    let edged = false;
    if (!this.s.paused) {
      const now = new Map<string, boolean>();
      const candidates = new Set(this.state().next ?? []);
      for (const nr of this.rules) {
        const v = holds(nr.rule, nr.name, nr.rank, this.ctx);
        const was = this.s.ruleNow[nr.name] ?? false;
        if (v !== was) {
          this.edge({ rule: nr.name, t, value: v });
          edged = true;
        }
        this.s.ruleNow[nr.name] = v;
        now.set(nr.name, v);
        if (nr.name.startsWith('phase:')) {
          const id = nr.name.slice(6);
          const hf = (this.s.holdFor ??= {});
          // D1: the guard's change during a running hold of a phase that may follow this one latches the hold (it started
          // on a true rule: `was`)
          if (!v && was && candidates.has(id) && (this.byId.get(id)?.holdS ?? 0) > 0 && this.guardBroken(nr)) (this.s.latched ??= {})[id] = true;
          const latched = this.s.latched?.[id] === true;
          hf[id] = (v && was) || latched ? (hf[id] ?? 0) + dt : 0;
          if (latched) now.set(nr.name, true);
        }
      }
      const held = (id: string) => (this.s.holdFor?.[id] ?? 0) >= (this.byId.get(id)?.holdS ?? 0) - EPS;
      const to = (this.state().next ?? []).find((id) => id !== this.s.stateId && now.get(`phase:${id}`) && held(id));
      if (to !== undefined) out = this.enter(t, to, `enter:${to}`);
      out.push(...this.clockScript(t));
    }
    if (inputs.length || out.length || edged) this.log.splice(at, 0, { op: 'advance', t, inputs: structuredClone(inputs) });
    return out;
  }

  /** The nth taking of an action (a press; F3 records it): the script entries anchored on it, in the press's group. */
  take(t: number, actionId: string, group?: string): PhaseRunnerEffect[] {
    if (!this.s.started || !this.actions.has(actionId)) return [];
    this.sync(t);
    this.log.push({ op: 'take', t, actionId, ...(group !== undefined ? { group } : {}) });
    const n = (this.s.takings[actionId] ?? 0) + 1;
    this.s.takings[actionId] = n;
    return this.fire(t, `action:${actionId}#${n}`, group);
  }

  /** Append one clinical act to the administration record (F3; the driver calls it for every act, accepted or refused).
   *  `seq` grows along the course: after a restore it goes on from the restored record's last. Not a decision: the run
   *  log does not carry it, so a replay of the decisions is unchanged. */
  record(a: Omit<Administration, 'seq'>): Administration {
    const out = { seq: (this.s.admin.at(-1)?.seq ?? 0) + 1, ...a } as Administration;
    this.s.admin.push(out);
    return out;
  }

  pause(t: number): void {
    this.sync(t);
    this.log.push({ op: 'pause', t });
    this.s.paused = true;
  }
  resume(t: number): void {
    this.sync(t);
    this.log.push({ op: 'resume', t });
    this.s.paused = false;
  }

  getState(): PhaseRunnerState {
    return structuredClone(this.s);
  }
  setState(st: PhaseRunnerState): void {
    if (st.schema !== 'pme-scenario-runner/2') throw new Error(`runner state ${String(st.schema)} is not pme-scenario-runner/2`);
    if (st.docId !== this.doc.id) throw new Error(`runner state is for ${st.docId}, not ${this.doc.id}`);
    this.s = structuredClone(st);
    this.log.push({ op: 'restore', t: st.lastT, state: structuredClone(st) });
  }

  /**
   * The leaves of the current phase's `next` rules, in order (read-only; as of the last call): each value leaf with a
   * `forS` and its hold, each slope and unchanged leaf and its window fill. `transitionId` is `enter:<phase>`.
   */
  vitalHolds(): PhaseHold[] {
    const out: PhaseHold[] = [];
    for (const id of this.state().next ?? []) {
      const enter = id === this.s.stateId ? undefined : this.byId.get(id)?.enter;
      if (!enter) continue;
      const transitionId = `enter:${id}`;
      const holdS = this.byId.get(id)?.holdS ?? 0;
      if (holdS > 0) {
        const met = (this.s.ruleNow[`phase:${id}`] ?? false) || this.s.latched?.[id] === true;
        const heldS = met ? (this.s.holdFor?.[id] ?? 0) : 0;
        out.push({ transitionId, key: `phase:${id}:hold`, leaf: 'hold', variable: id, op: '>=', threshold: holdS, value: heldS, met, heldS, forS: holdS, fraction: Math.min(1, heldS / holdS) });
      }
      walkLeaves(enter, `phase:${id}`, (leaf, key) => {
        if ('value' in leaf && (leaf.value.forS ?? 0) > 0) {
          const { var: variable, op, value: threshold, forS = 0 } = leaf.value;
          const value = this.s.truth[variable]?.v;
          const met = value !== undefined && compare(value, op, threshold);
          const heldS = met ? (this.s.trueFor[key] ?? 0) : 0;
          out.push({ transitionId, key, leaf: 'value', variable, op, threshold, value, met, heldS, forS, fraction: Math.min(1, heldS / forS) });
        } else if ('unchanged' in leaf && leaf.unchanged.since) {
          const { var: variable, withinPct } = leaf.unchanged;
          const v = this.s.truth[variable]?.v;
          const ref = this.s.phaseRef?.[variable];
          const p = v !== undefined && ref !== undefined ? spreadPct([[0, v], [1, ref]]) : undefined;
          const met = p !== undefined && p <= withinPct + EPS;
          out.push({ transitionId, key, leaf: 'unchanged', variable, op: '<=', threshold: withinPct, value: p, met, heldS: 0, forS: 0, fraction: met ? 1 : 0 });
        } else if ('slope' in leaf || ('unchanged' in leaf && leaf.unchanged.overS)) {
          const w = 'slope' in leaf ? leaf.slope : (leaf as { unchanged: { var: string; overS: number } }).unchanged;
          const win = windowOf(this.s.rings[w.var] ?? [], w.overS);
          const fraction = Math.min(1, win.coveredS / w.overS);
          if ('slope' in leaf) {
            const s = win.full ? slopePerMin(win.samples) : undefined;
            const met = s !== undefined && compare(s, leaf.slope.op, leaf.slope.perMin);
            out.push({ transitionId, key, leaf: 'slope', variable: w.var, op: leaf.slope.op, threshold: leaf.slope.perMin, value: s, met, heldS: win.coveredS, forS: w.overS, fraction });
          } else {
            const p = spreadPct(win.samples);
            const within = (leaf as { unchanged: { withinPct: number } }).unchanged.withinPct;
            const met = win.full && p !== undefined && p <= within + EPS;
            out.push({ transitionId, key, leaf: 'unchanged', variable: w.var, op: '<=', threshold: within, value: p, met, heldS: win.coveredS, forS: w.overS, fraction });
          }
        }
      });
    }
    return out;
  }

  // --- internals ---------------------------------------------------------------------------------------------
  /** Credit the time since the last call (not while paused): the clocks, the holds and the 1 Hz ring samples, all with
   *  the values held so far. */
  private sync(t: number): number {
    const from = this.s.lastT;
    const dt = Math.max(0, t - from);
    this.s.lastT = t;
    if (this.s.paused || dt === 0) return 0;
    this.s.stateT += dt;
    this.s.scenarioT += dt;
    this.track(dt);
    const first = Math.floor(from + EPS) + 1; // the whole seconds crossed: (from, t]
    const last = Math.floor(t + EPS);
    if (last < first) return dt;
    for (const [name, span] of this.ringSpan) {
      const ring = (this.s.rings[name] ??= []);
      const v = this.s.truth[name]?.v;
      if (v === undefined) {
        ring.length = 0; // no value: the window starts again
        continue;
      }
      for (let k = Math.max(first, last - Math.ceil(span) - 1); k <= last; k++) ring.push([k, v]);
      const keep = ring.findIndex(([s]) => s >= last - span - EPS);
      if (keep > 0) ring.splice(0, keep);
    }
    return dt;
  }

  /** Is one of the rule's guards (an `unchanged` leaf outside a `not`) false now? */
  private guardBroken(nr: NamedRule): boolean {
    const broken = (r: PhaseRule, key: string): boolean =>
      'unchanged' in r ? !holds(r, key, nr.rank, this.ctx)
      : 'all' in r ? r.all.some((x, i) => broken(x, `${key}.${i}`))
      : 'any' in r ? r.any.some((x, i) => broken(x, `${key}.${i}`))
      : false;
    return broken(nr.rule, nr.name);
  }

  /** The `since: 'phaseStart'` references still missing: the first value after the phase's entry. */
  private refs(): void {
    if (!this.sinceVars.size) return;
    const ref = (this.s.phaseRef ??= {});
    for (const name of this.sinceVars) {
      const v = this.s.truth[name]?.v;
      if (ref[name] === undefined && v !== undefined) ref[name] = v;
    }
  }

  /** Every value leaf with a hold, of every named rule: add dt while true, reset to 0 when false. */
  private track(dt: number): void {
    for (const nr of this.rules) {
      walkLeaves(nr.rule, nr.name, (leaf, key) => {
        if (!('value' in leaf) || !(leaf.value.forS && leaf.value.forS > 0)) return;
        const v = (nr.rank === 3 ? this.s.truth : this.s.display)[leaf.value.var]?.v;
        const ok = v !== undefined && compare(v, leaf.value.op, leaf.value.value);
        this.s.trueFor[key] = ok ? (this.s.trueFor[key] ?? 0) + dt : 0;
      });
    }
  }

  private take1(t: number, i: RunnerInputV2): void {
    if (i.kind === 'values') {
      if (i.rank !== 3 && i.rank !== 2) return; // a target the host accepted (rank 1) is not truth: no /2 rule reads it
      const store = i.rank === 3 ? this.s.truth : this.s.display;
      for (const [k, v] of Object.entries(i.values)) {
        if (!Number.isFinite(v)) continue;
        store[k] = { v, t };
        const alias = i.rank === 2 ? ALIAS[k] : undefined;
        if (alias) store[alias] = { v, t };
      }
    } else if (i.kind === 'signals') {
      this.s.pulse = i.signals.pulse;
      if (!i.signals.pulse) this.s.pulseLost = true;
      for (const k of SIGNAL_VALUES) {
        const v = i.signals[k];
        if (typeof v === 'number' && Number.isFinite(v)) this.s.truth[k] = { v, t };
        else {
          delete this.s.truth[k]; // a missing value: its rules read nothing, and its window starts again
          if (this.s.rings[k]) this.s.rings[k] = [];
        }
      }
    } else if (i.kind === 'rhythm') this.s.rhythm = i.id;
    // clinical and sensor inputs: no /2 phase rule reads an event or a sensor (the record is F3's, in the driver)
  }

  private edge(e: RuleEdge): void {
    const edges = this.s.edges;
    edges.push(e);
    const mine: number[] = [];
    for (let i = 0; i < edges.length; i++) if ((edges[i] as RuleEdge).rule === e.rule) mine.push(i);
    if (mine.length > PhaseRunner.EDGES_PER_RULE) {
      // drop the second and third (a pair, so the values still alternate); the first, the rule's first true, stays
      edges.splice(mine[2] as number, 1);
      edges.splice(mine[1] as number, 1);
    }
  }

  private enter(t: number, id: string, rule: string): PhaseRunnerEffect[] {
    const prev = this.s.phases.at(-1);
    if (prev && prev.exitT === undefined) prev.exitT = t;
    this.s.stateId = id;
    this.s.stateT = 0;
    this.s.enteredT = t;
    this.s.phaseRef = {};
    delete this.s.latched; // a latch is the hold of a phase not entered yet: none survives an entry
    this.refs();
    this.entered++;
    const transitionId = rule === 'initial' ? undefined : rule;
    this.s.phases.push({ id, t, rule });
    if (this.s.phases.length > PHASES_MAX) this.s.phases.splice(0, this.s.phases.length - PHASES_MAX);
    const h = { t, stateId: id, ...(transitionId ? { transitionId } : {}) };
    this.s.history.push(h);
    if (this.s.history.length > HISTORY_MAX) this.s.history.splice(0, this.s.history.length - HISTORY_MAX);
    this.log.push({ op: 'enter', ...h });
    return [{ kind: 'event', event: { type: 'scenario', ...h } }, ...this.fire(t, `phase:${id}`)];
  }

  /** The script entries anchored on `anchor` not fired yet, each its own card-set batch. */
  private fire(t: number, anchor: string, group?: string): PhaseRunnerEffect[] {
    return (this.doc.script ?? []).filter((e) => e.on === anchor && !this.s.fired.includes(e.id)).map((e) => this.fireOne(t, e, anchor, group));
  }

  /** The scenario-clock entries now due. */
  private clockScript(t: number): PhaseRunnerEffect[] {
    const due = (this.doc.script ?? []).filter((e) => typeof e.on === 'object' && this.s.scenarioT >= e.on.atScenarioS - EPS && !this.s.fired.includes(e.id));
    return due.map((e) => this.fireOne(t, e, `atScenarioS:${(e.on as { atScenarioS: number }).atScenarioS}`));
  }

  private fireOne(t: number, e: ScriptEntry, anchor: string, group?: string): PhaseRunnerEffect {
    this.s.fired.push(e.id);
    this.log.push({ op: 'script', t, scriptId: e.id, anchor });
    return { kind: 'commands', batch: ++this.s.batch, reason: 'script', cardSet: true, scriptId: e.id, ...(group !== undefined ? { group } : {}), commands: e.commands.map(strip) };
  }
}

/** Drop `$comment` so it never reaches the wire. */
function strip(c: DocCommand): DocCommand {
  const { $comment: _drop, ...rest } = c;
  return rest as DocCommand;
}
