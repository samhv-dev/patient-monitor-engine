// The scenario runner (DESIGN-BRIEF §7.4; research 01 §2.3: CAE states + transitions, Laerdal handlers, REALITi
// steps). A PURE state machine: no engine, no clock, no DOM. The host calls advance(simT, inputs) once per tick
// (or frame); the runner answers with effects — command batches to dispatch and `scenario` events to publish.
// Semantics (docs/plans/stage-6b-scenario-runner.md "Decisions"):
// - Timers are accumulators of sim time while the scenario is not paused: stateT (afterS), scenarioT (atScenarioS),
//   and one "continuously true for" counter per vital leaf (forS). The interval since the last call is credited
//   with the values held BEFORE this call's inputs, so the result does not depend on how often advance() is called.
// - Events (applyEvent) latch from state entry until consumed by the transition they fire; vitals and sensors are
//   levels. Transitions are tried in document order; the first that holds fires; at most one per call.
// - probability: one draw on the `scenario` sfc32 stream (seeded from hash(seed, 'scenario'), brief §3.3) when the
//   condition holds; failure goes to `else`, or stays when `else` is absent.
// - A transition to the CURRENT state stays: no onExit/onEnter, timers keep running, matched events are consumed.
//   goto always re-enters.
// - trigger(id) presses the transition's manual button; a transition without a manual leaf is forced instead.
import { seedStream, uniform, type Sfc32State } from '@pme/engine-core';
import type { ClinicalEvent, ScenarioEvent, SensorId } from '../protocol.ts';
import type { DocCommand, EventFilter, Op, ScenarioDoc, ScenarioState, Transition, When } from './types.ts';

export type RunnerInput =
  | { kind: 'clinical'; event: ClinicalEvent }
  /** Values by variable. rank: 3 engine `state` (truth), 2 `measurement` (displayed), 1 a target the host accepted. */
  | { kind: 'values'; rank: 1 | 2 | 3; values: Record<string, number> }
  | { kind: 'sensor'; sensor: SensorId; state: string };

export type RunnerEffect =
  | { kind: 'commands'; batch: number; reason: 'start' | 'transition' | 'goto'; commands: DocCommand[] }
  | { kind: 'event'; event: ScenarioEvent };

export type RunLogEntry =
  | { op: 'start'; t: number; seed: number }
  | { op: 'advance'; t: number; inputs: RunnerInput[] }
  | { op: 'goto'; t: number; stateId: string }
  | { op: 'trigger'; t: number; transitionId: string }
  | { op: 'pause' | 'resume'; t: number }
  | { op: 'restore'; t: number; state: RunnerState }
  | { op: 'enter'; t: number; stateId: string; transitionId?: string }
  | { op: 'roll'; t: number; transitionId: string; u: number; p: number; success: boolean }
  | { op: 'dispatch'; t: number; commandId: string; type: string; accepted: boolean; tick: number; reason?: string };

/** Plain JSON: a bookmark stores it next to the engine snapshot. */
export interface RunnerState {
  schema: 'pme-scenario-runner/1';
  docId: string;
  started: boolean;
  stateId: string;
  lastT: number;
  stateT: number;
  scenarioT: number;
  paused: boolean;
  rng: Sfc32State;
  seq: number;
  batch: number;
  latched: Array<{ seq: number; event: ClinicalEvent }>;
  pressed: string[];
  trueFor: Record<string, number>;
  values: Record<string, { v: number; rank: number; t: number }>;
  sensors: Record<string, string>;
  enteredT: number;
  history: Array<{ t: number; stateId: string; transitionId?: string }>;
}

const EPS = 1e-6;
/** A lower-rank source takes over a variable once the higher one has been silent this long [ENG]. */
const STALE_S = 5;
/** Lower-bound filters on `event` triggers → the ClinicalEvent field they bound. */
const MIN_FILTERS: Record<string, string> = { minJ: 'energyJ', minDose: 'dose', minVolumeMl: 'volumeMl', minMa: 'mA' };
/** Measured numerics also count as the StateVar they display (sbp ← abpSys or nibpSys, …). */
const ALIAS: Record<string, string> = {
  abpSys: 'sbp', abpDia: 'dbp', abpMean: 'map', nibpSys: 'sbp', nibpDia: 'dbp', nibpMean: 'map', cvpMean: 'cvp',
  awrr: 'rr',
};
const HISTORY_MAX = 200;

export class ScenarioRunner {
  readonly doc: ScenarioDoc;
  readonly seed: number;
  readonly log: RunLogEntry[] = [];
  private s: RunnerState;
  private readonly states = new Map<string, ScenarioState>();

  constructor(doc: ScenarioDoc, opts: { seed?: number } = {}) {
    this.doc = doc;
    this.seed = (opts.seed ?? doc.seed ?? 1) >>> 0;
    for (const st of doc.states) this.states.set(st.id, st);
    const sensors: Record<string, string> = {};
    for (const [k, v] of Object.entries(doc.patient?.sensors ?? {})) if (v !== undefined) sensors[k] = v;
    this.s = {
      schema: 'pme-scenario-runner/1', docId: doc.id, started: false, stateId: doc.initialState, lastT: 0, stateT: 0,
      scenarioT: 0, paused: false, rng: seedStream(this.seed, 'scenario'), seq: 0, batch: 0, latched: [], pressed: [],
      trueFor: {}, values: {}, sensors, enteredT: 0, history: [],
    };
  }

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
  get history(): ReadonlyArray<{ t: number; stateId: string; transitionId?: string }> {
    return this.s.history;
  }
  state(): ScenarioState {
    return this.states.get(this.s.stateId) as ScenarioState;
  }

  /** Setup batch from `patient` (rhythm, baseline targets, sensors, mode) + the initial state's onEnter. */
  start(t: number): RunnerEffect[] {
    if (this.s.started) throw new Error('scenario already started');
    this.log.push({ op: 'start', t, seed: this.seed });
    this.s.started = true;
    this.s.lastT = t;
    const p = this.doc.patient;
    const setup: DocCommand[] = [];
    if (this.doc.mode === 'modeled') setup.push({ type: 'setMode', mode: 'modeled' });
    if (p?.rhythm) setup.push({ type: 'setRhythm', rhythm: p.rhythm.id, when: 'now', ...(p.rhythm.opts ? { opts: p.rhythm.opts } : {}) });
    for (const [variable, value] of Object.entries(p?.baseline ?? {})) {
      if (value !== undefined) setup.push({ type: 'setTarget', variable: variable as never, value });
    }
    for (const [sensor, state] of Object.entries(p?.sensors ?? {})) {
      if (state !== undefined) setup.push({ type: 'attachSensor', sensor: sensor as SensorId, state });
    }
    return this.enter(t, this.doc.initialState, undefined, setup, 'start');
  }

  /** One step: credit timers, take inputs, then try the current state's transitions (at most one fires). */
  advance(t: number, inputs: RunnerInput[] = []): RunnerEffect[] {
    if (!this.s.started) return [];
    const at = this.log.length;
    this.sync(t);
    for (const i of inputs) this.take(t, i);
    this.trackVitals(0);
    const out = this.s.paused ? [] : this.evaluate(t);
    if (inputs.length || out.length) this.log.splice(at, 0, { op: 'advance', t, inputs: structuredClone(inputs) });
    return out;
  }

  goto(t: number, stateId: string): RunnerEffect[] {
    if (!this.states.has(stateId)) throw new Error(`no state ${stateId}`);
    this.sync(t);
    this.log.push({ op: 'goto', t, stateId });
    return this.enter(t, stateId, undefined, [], 'goto');
  }

  /** Press a transition's manual button (or force a transition that has none). It is evaluated on the next advance. */
  trigger(t: number, transitionId: string): { ok: boolean; reason?: string } {
    const tr = this.state().transitions?.find((x) => x.id === transitionId);
    if (!tr) return { ok: false, reason: `no transition ${transitionId} in state ${this.s.stateId}` };
    this.sync(t);
    this.log.push({ op: 'trigger', t, transitionId });
    if (!this.s.pressed.includes(transitionId)) this.s.pressed.push(transitionId);
    return { ok: true };
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

  getState(): RunnerState {
    return structuredClone(this.s);
  }
  setState(st: RunnerState): void {
    if (st.schema !== 'pme-scenario-runner/1' || st.docId !== this.doc.id) throw new Error(`runner state is for ${st.docId}, not ${this.doc.id}`);
    this.s = structuredClone(st);
    this.log.push({ op: 'restore', t: st.lastT, state: structuredClone(st) });
  }

  /** The value a vital trigger would read now (for the panel and tests). */
  value(name: string): number | undefined {
    return this.s.values[name]?.v;
  }

  // --- internals ---------------------------------------------------------------------------------------------
  /** Credit the time since the last call to the timers (not while paused), using the values held so far. */
  private sync(t: number): void {
    const dt = Math.max(0, t - this.s.lastT);
    this.s.lastT = t;
    if (this.s.paused || dt === 0) return;
    this.s.stateT += dt;
    this.s.scenarioT += dt;
    this.trackVitals(dt);
  }

  private take(t: number, i: RunnerInput): void {
    if (i.kind === 'clinical') this.s.latched.push({ seq: ++this.s.seq, event: i.event });
    else if (i.kind === 'sensor') this.s.sensors[i.sensor] = i.state;
    else {
      for (const [k, v] of Object.entries(i.values)) {
        if (!Number.isFinite(v)) continue;
        for (const name of ALIAS[k] && ALIAS[k] !== k ? [k, ALIAS[k]] : [k]) {
          const cur = this.s.values[name];
          if (!cur || i.rank >= cur.rank || t - cur.t > STALE_S) this.s.values[name] = { v, rank: i.rank, t };
        }
      }
    }
  }

  /** Walk every vital leaf of the current state: add dt while true, reset to 0 when false. */
  private trackVitals(dt: number): void {
    for (const tr of this.state().transitions ?? []) {
      walk(tr.when, tr.id, (w, key) => {
        if (!('vital' in w)) return;
        const cur = this.s.values[w.vital.var]?.v;
        const ok = cur !== undefined && compare(cur, w.vital.op, w.vital.value);
        this.s.trueFor[key] = ok ? (this.s.trueFor[key] ?? 0) + dt : 0;
      });
    }
  }

  private evaluate(t: number): RunnerEffect[] {
    for (const tr of this.state().transitions ?? []) {
      const pressed = this.s.pressed.includes(tr.id);
      const forced = pressed && !hasManual(tr.when);
      const r = forced ? { ok: true, events: [] as number[] } : this.holds(tr.when, tr.id, pressed, new Set());
      if (!r.ok) continue;
      this.s.latched = this.s.latched.filter((e) => !r.events.includes(e.seq));
      this.s.pressed = this.s.pressed.filter((id) => id !== tr.id);
      let to = tr.to;
      let tid = tr.id;
      if (tr.probability !== undefined) {
        const u = uniform(this.s.rng);
        const success = u < tr.probability;
        this.log.push({ op: 'roll', t, transitionId: tr.id, u, p: tr.probability, success });
        if (!success) {
          to = tr.else ?? this.s.stateId;
          tid = `${tr.id}:else`;
        }
      }
      if (to === this.s.stateId) return [this.stay(t, tid)];
      return this.enter(t, to, tid, [], 'transition');
    }
    return [];
  }

  private holds(w: When, key: string, pressed: boolean, used: Set<number>): { ok: boolean; events: number[] } {
    const no = { ok: false, events: [] };
    if ('afterS' in w) return { ok: this.s.stateT >= w.afterS - EPS, events: [] };
    if ('atScenarioS' in w) return { ok: this.s.scenarioT >= w.atScenarioS - EPS, events: [] };
    if ('vital' in w) {
      const cur = this.s.values[w.vital.var]?.v;
      const ok = cur !== undefined && compare(cur, w.vital.op, w.vital.value) && (this.s.trueFor[key] ?? 0) >= (w.vital.forS ?? 0) - EPS;
      return { ok, events: [] };
    }
    if ('event' in w) {
      const hit = this.s.latched.find((e) => !used.has(e.seq) && matches(e.event, w.event));
      if (!hit) return no;
      used.add(hit.seq);
      return { ok: true, events: [hit.seq] };
    }
    if ('sensor' in w) return { ok: this.s.sensors[w.sensor.sensor] === w.sensor.state, events: [] };
    if ('manual' in w) return { ok: pressed, events: [] };
    if ('all' in w) {
      const events: number[] = [];
      for (let i = 0; i < w.all.length; i++) {
        const r = this.holds(w.all[i] as When, `${key}.${i}`, pressed, used);
        if (!r.ok) return no;
        events.push(...r.events);
      }
      return { ok: true, events };
    }
    for (let i = 0; i < w.any.length; i++) {
      const r = this.holds(w.any[i] as When, `${key}.${i}`, pressed, used);
      if (r.ok) return r;
    }
    return no;
  }

  private stay(t: number, transitionId: string): RunnerEffect {
    this.log.push({ op: 'enter', t, stateId: this.s.stateId, transitionId });
    this.pushHistory({ t, stateId: this.s.stateId, transitionId });
    return { kind: 'event', event: { type: 'scenario', t, stateId: this.s.stateId, transitionId } };
  }

  private enter(t: number, to: string, transitionId: string | undefined, pre: DocCommand[], reason: 'start' | 'transition' | 'goto'): RunnerEffect[] {
    const from = this.states.get(this.s.stateId) as ScenarioState;
    const next = this.states.get(to) as ScenarioState;
    const commands = [...pre, ...(reason === 'start' ? [] : (from.onExit ?? [])), ...(next.onEnter ?? [])].map(strip);
    this.s.stateId = to;
    this.s.stateT = 0;
    this.s.enteredT = t;
    this.s.latched = [];
    this.s.pressed = [];
    this.s.trueFor = {};
    this.trackVitals(0);
    this.log.push({ op: 'enter', t, stateId: to, ...(transitionId ? { transitionId } : {}) });
    this.pushHistory({ t, stateId: to, ...(transitionId ? { transitionId } : {}) });
    const out: RunnerEffect[] = [];
    if (commands.length) out.push({ kind: 'commands', batch: ++this.s.batch, reason, commands });
    out.push({ kind: 'event', event: { type: 'scenario', t, stateId: to, ...(transitionId ? { transitionId } : {}) } });
    return out;
  }

  private pushHistory(h: { t: number; stateId: string; transitionId?: string }): void {
    this.s.history.push(h);
    if (this.s.history.length > HISTORY_MAX) this.s.history.splice(0, this.s.history.length - HISTORY_MAX);
  }
}

export function compare(a: number, op: Op, b: number): boolean {
  switch (op) {
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
    case '==':
      return Math.abs(a - b) < EPS;
    case '!=':
      return Math.abs(a - b) >= EPS;
  }
}

/** Does a clinical event satisfy an `event` trigger? kind equal, min* filters as lower bounds, the rest exact. */
export function matches(e: ClinicalEvent, f: EventFilter): boolean {
  const rec = e as unknown as Record<string, unknown>;
  for (const [k, want] of Object.entries(f)) {
    const field = MIN_FILTERS[k];
    if (field !== undefined) {
      const got = rec[field];
      if (typeof got !== 'number' || got < (want as number)) return false;
    } else if (rec[k] !== want) return false;
  }
  return true;
}

export function hasManual(w: When): boolean {
  if ('manual' in w) return true;
  if ('all' in w) return w.all.some(hasManual);
  if ('any' in w) return w.any.some(hasManual);
  return false;
}

/** Visit every leaf with its key (`<transitionId>` then `.i` per all/any level — the same keys holds() uses). */
function walk(w: When, key: string, fn: (w: When, key: string) => void): void {
  if ('all' in w) w.all.forEach((c, i) => walk(c, `${key}.${i}`, fn));
  else if ('any' in w) w.any.forEach((c, i) => walk(c, `${key}.${i}`, fn));
  else fn(w, key);
}

/** Drop `$comment` so it never reaches the wire. */
function strip(c: DocCommand): DocCommand {
  const { $comment: _drop, ...rest } = c;
  return rest as DocCommand;
}

export type { Transition };
