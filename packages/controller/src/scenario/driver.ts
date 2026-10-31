// The host-side glue between a ScenarioRunner and the monitor the host owns (brief §3.7: the host owns the
// simulation, so the scenario runs there). It
// - wraps the HostTarget (`driver.host`): every accepted command is also a runner input (applyEvent → latched
//   event, attachSensor → sensor level, setTarget → target value), and applyEvent/attachSensor that the engine
//   rejects as "not implemented" are accepted as scenario-only until the engine models them;
// - feeds engine `measurement` and `state` events to the vital triggers;
// - handles every `scenario` command through `driver.hook` (load/goto/trigger/pause/resume, and bookmarks that
//   hold the engine snapshot AND the runner state);
// - on poll() advances the runner at the engine's sim time and dispatches each command batch as one stage group.
// A pme-scenario/2 document (plan F2) runs on a PhaseRunner instead (chosen by `load` from `doc.schema`): its phases go
// out as today's `scenario` event (stateId = the phase id, transitionId = `enter:<id>`, Q20), one stage mark per phase
// entry (no hops in /2), its script entries as card-set groups (ids `card-set-<n>-<i>`), and an entry anchored on an
// action's taking (a command stamped with `actionId`) in that press's own stage group, on its tick. A /2 phase is never
// entered by a goto or a trigger (Q5). The /1 runner never receives a /2-only input.
import { RHYTHM_IDS, type Command, type DispatchResult, type EngineEvent, type PatientSnapshot } from '@pme/engine-core';
import type { ClinicalEvent, ScenarioCommand, ScenarioEvent, WireCommand, WireEvent } from '../protocol.ts';
import type { HostTarget, ScenarioHookResult } from '../session/host-session.ts';
import { PhaseRunner, type PhaseRunnerEffect } from './phase-runner.ts';
import { ScenarioRunner, type RunnerEffect, type RunnerInput, type RunnerState, type VitalHold } from './runner.ts';
import { BUILTIN_SCENARIOS } from './builtins.ts';
import { resolveRhythm } from './standins.ts';
import { isV2, type AnyScenarioDoc, type DocCommand, type ScenarioState } from './types.ts';
import type { PhaseRunnerState, RunnerInputV2 } from './types-v2.ts';
import { validateScenario } from './validate.ts';

export interface ScenarioDriverOptions {
  target: HostTarget;
  /** Where runner commands go. Host page: HostSession.submit (so viewers mirror them). Default: `driver.host`. */
  submit?: (cmd: Command) => DispatchResult | Promise<DispatchResult>;
  /** Where `scenario` events go (HostSession.publish on a host page). */
  publish?: (e: ScenarioEvent) => void;
  /** Built-in documents by id (`scenario load` with `target` = id). Default: BUILTIN_SCENARIOS. */
  builtins?: Record<string, unknown>;
  /** Rhythm ids of the host engine (default: this build's RHYTHM_IDS). */
  rhythms?: readonly string[];
  /** Place the automatic stage marks (Instructor v2, the owner's ruling on answer 3): a snapshot at every stage entry.
   *  Default off, so a run that no view reads them for takes no extra snapshots; `markStages(true)` turns them on. */
  stageMarks?: boolean;
}

interface Mark {
  snapshot: PatientSnapshot;
  doc: AnyScenarioDoc | null;
  seed: number;
  runner: RunnerState | PhaseRunnerState | null;
}

/** Where a run stands, as a bookmark holds it, minus the document (plain JSON: an app keeps it across a reload). */
export interface RunPosition {
  snapshot: PatientSnapshot;
  seed: number;
  /** `pme-scenario-runner/1` for a /1 card, `pme-scenario-runner/2` for a /2 card. */
  runner: RunnerState | PhaseRunnerState;
}

/** Either runner: the /1 state machine or the /2 phase runner. */
type AnyRunner = ScenarioRunner | PhaseRunner;

const NOT_IMPLEMENTED = /not implemented/;
/** A hop (answer 2): a state whose only exit is `afterS` ≤ HOP_MAX_S — it folds into the stage it leads to [ENG]. */
export const HOP_MAX_S = 2;
export function isHop(s: ScenarioState): boolean {
  const t = s.transitions ?? [];
  const w = t[0]?.when;
  return t.length === 1 && w !== undefined && 'afterS' in w && w.afterS <= HOP_MAX_S;
}

export class ScenarioDriver {
  readonly host: HostTarget;
  /** The run: a /1 card's ScenarioRunner or a /2 card's PhaseRunner. */
  private cur: AnyRunner | null = null;
  /** Load-time warnings and stand-in notes for the current document. */
  notes: string[] = [];
  private readonly o: ScenarioDriverOptions;
  private readonly known: ReadonlySet<string>;
  private readonly marks = new Map<string, Mark>();
  /** Inputs since the last poll. Only a /2 runner is ever given a `signals` input or the labs/endo truths (truthInputs):
   *  they are queued only while one runs, and `load`/`restoreBookmark` empty the queue when the runner changes. */
  private pending: RunnerInputV2[] = [];
  private n = 0; // batch counter; never restored, so ids and stage groups stay unique across bookmark restores
  private k = 0;
  private inFlight = 0; // runner commands sent and not yet answered by the monitor
  /** Stage marks placed (owner's ruling on answer 3), oldest first: the bookmark commands a late joiner is replayed. */
  private stageMarkList: ScenarioCommand[] = [];
  private stageN = 0; // never restored, so stage-mark labels stay unique across restores
  /** A stage entered whose mark is not placed yet: the runner and its entry count (placed once position() is consistent). */
  private stageWanted: { runner: AnyRunner; entry: number; stateId: string } | null = null;
  private placing = false;
  /** Whether stage marks are placed (option `stageMarks`, or `markStages`). */
  private marking: boolean;
  /** The stage last entered on the current course: a return into it from one of its hops is not a new stage entry. */
  private lastStage: string | null = null;
  /** The last press seen (actionId and stage group, or command id): its further commands are the same taking. */
  private lastTaking: string | null = null;
  private readonly off: () => void;

  constructor(o: ScenarioDriverOptions) {
    this.o = o;
    this.known = new Set(o.rhythms ?? RHYTHM_IDS);
    this.marking = o.stageMarks ?? false;
    this.host = this.wrap(o.target);
    this.off = o.target.on((e) => this.onEngine(e));
  }

  /** The /1 card's runner (null while a /2 card runs, or none). Setting it to null ends the run, of either format. */
  get runner(): ScenarioRunner | null {
    return this.cur instanceof ScenarioRunner ? this.cur : null;
  }
  set runner(r: ScenarioRunner | null) {
    this.cur = r;
  }
  /** The /2 card's runner (null while a /1 card runs, or none). */
  get phaseRunner(): PhaseRunner | null {
    return this.cur instanceof PhaseRunner ? this.cur : null;
  }

  /** Advance the runner to the engine's current sim time (call once per frame, or per tick in tests). */
  poll(): Array<RunnerEffect | PhaseRunnerEffect> {
    const inputs = this.pending;
    this.pending = [];
    const r = this.cur;
    if (!r) return [];
    const simT = this.o.target.now().simT;
    // the /1 runner takes today's kinds only (its take() reads any other input as values and would throw)
    const fx = this.step(r, () => (r instanceof PhaseRunner ? r.advance(simT, inputs) : r.advance(simT, inputs.filter(v1Input))));
    this.placeStageMark().catch((e: unknown) => console.warn('[pme] stage mark not placed:', e));
    return fx;
  }

  /** Turn the automatic stage marks on (the Instructor v2 view, when it is shown on the host) or off. Turned on, the
   *  next stage entry is marked; the stage already running is not (a mark taken now would not be its start). */
  markStages(on: boolean): void {
    this.marking = on;
    if (!on) this.stageWanted = null;
  }

  /** Validate and start a document (or a built-in id): a /1 card on a ScenarioRunner, a /2 card on a PhaseRunner. */
  load(input: unknown): { ok: true; doc: AnyScenarioDoc } | { ok: false; reason: string } {
    const raw = typeof input === 'string' ? (this.o.builtins ?? BUILTIN_SCENARIOS)[input] : input;
    if (raw === undefined) return { ok: false, reason: `no built-in scenario ${String(input)}` };
    const v = validateScenario(raw, { rhythms: [...this.known] });
    if (!v.ok) return { ok: false, reason: `invalid scenario: ${v.errors.join('; ')}` };
    this.notes = [...v.warnings];
    this.pending = [];
    for (const c of this.stageMarkList) this.marks.delete(c.target as string); // a new run: the old run's stage marks go
    this.stageMarkList = [];
    this.lastStage = null;
    this.lastTaking = null;
    const r = (this.cur = runnerFor(v.doc));
    this.step(r, () => r.start(this.o.target.now().simT));
    return { ok: true, doc: v.doc };
  }

  /** HostSession `scenario` option: every scenario command lands here. */
  readonly hook = async (cmd: ScenarioCommand): Promise<ScenarioHookResult> => {
    const { tick, simT } = this.o.target.now();
    const no = (reason: string): ScenarioHookResult => ({ accepted: false, tick, reason });
    const yes = (applied?: ScenarioCommand, at = tick): ScenarioHookResult => ({ accepted: true, tick: at, ...(applied ? { applied } : {}) });
    switch (cmd.action) {
      case 'load': {
        const r = this.load(cmd.doc ?? cmd.target);
        return r.ok ? yes({ ...cmd, target: r.doc.id, doc: r.doc }) : no(r.reason);
      }
      case 'bookmark': {
        const label = cmd.target ?? `Bookmark ${++this.k}`;
        const snapshot = await this.o.target.snapshot();
        const r = this.cur;
        this.marks.set(label, { snapshot, doc: r?.doc ?? null, seed: r?.seed ?? 0, runner: r?.getState() ?? null });
        return yes({ ...cmd, target: label });
      }
      case 'restoreBookmark': {
        const m = cmd.target !== undefined ? this.marks.get(cmd.target) : undefined;
        if (!m) return no(`no bookmark ${String(cmd.target)}`);
        await this.o.target.restore(m.snapshot);
        this.pending = [];
        this.stageWanted = null; // the stage left behind is not marked now
        // the course after this mark is discarded: so are its stage marks (the ones taken later than the mark)
        for (const c of this.stageMarkList.filter((x) => (x.atTick ?? 0) > m.snapshot.tick)) this.marks.delete(c.target as string);
        this.stageMarkList = this.stageMarkList.filter((x) => (x.atTick ?? 0) <= m.snapshot.tick);
        this.lastTaking = null;
        if (m.doc && m.runner) {
          const r = this.cur?.doc === m.doc ? this.cur : runnerFor(m.doc, m.seed);
          if (r instanceof PhaseRunner) r.setState(m.runner as PhaseRunnerState);
          else r.setState(m.runner as RunnerState);
          this.cur = r;
          this.lastStage = this.stageOf(r);
          this.o.publish?.({ type: 'scenario', t: r.enteredT, stateId: r.stateId });
        } else this.cur = null;
        return yes(undefined, m.snapshot.tick);
      }
    }
    const r = this.cur;
    if (!r) return no('no scenario loaded');
    if (r instanceof PhaseRunner) {
      switch (cmd.action) {
        // Q5: a phase is entered by its own rule, never by an action, and a goto or a trigger is one
        case 'goto':
          return no('a pme-scenario/2 phase is entered by its own rule, never by goto');
        case 'trigger':
          return no('a pme-scenario/2 card has no transitions to trigger');
        case 'pause':
          r.pause(simT);
          return yes();
        case 'resume':
          r.resume(simT);
          return yes();
      }
      return no(`unknown scenario action ${String(cmd.action)}`);
    }
    switch (cmd.action) {
      case 'goto':
        if (!cmd.target || !r.doc.states.some((s) => s.id === cmd.target)) return no(`no state ${String(cmd.target)}`);
        this.poll();
        this.step(r, () => r.goto(simT, cmd.target as string));
        return yes();
      case 'trigger': {
        const t = r.trigger(simT, cmd.target ?? '');
        if (!t.ok) return no(t.reason ?? 'trigger refused');
        this.poll(); // evaluate now, so a button press acts on this tick
        return yes();
      }
      case 'pause':
        r.pause(simT);
        return yes();
      case 'resume':
        r.resume(simT);
        return yes();
    }
    return no(`unknown scenario action ${String(cmd.action)}`);
  };

  /** HostSession `welcomeEvents` option: a late joiner learns the current state (the doc comes as a sticky load). */
  welcomeEvents(): WireEvent[] {
    const r = this.cur;
    // the stage marks as sticky bookmark replays (they are never announced live: today's panel and record list every
    // live bookmark, and these are not the instructor's)
    const marks: WireEvent[] = this.stageMarkList.map((c) => ({ type: 'commandApplied', commandId: c.id, tick: c.atTick ?? 0, resolved: { command: c, replay: true } }));
    return [...(r ? [{ type: 'scenario' as const, t: r.enteredT, stateId: r.stateId }] : []), ...marks];
  }

  /**
   * Host side, read-only: the stage marks of this run, oldest first — `bookmark` commands of kind `stage` whose note is
   * the state id and whose target is the label `restoreBookmark` takes (the mark at the start of a stage is the last one
   * with its note).
   */
  stageMarks(): ScenarioCommand[] {
    return this.stageMarkList.map((c) => ({ ...c }));
  }

  bookmarks(): string[] {
    return [...this.marks.keys()];
  }

  /**
   * Host side, read-only (Instructor v2 auto rows, answer 8): how far each `vital` rule of the current state has got —
   * the value it reads, its threshold and its hold fraction, from the runner's own hold counters, as of the last poll.
   * [] without a scenario. A follower has no runner; its view shows value against threshold only.
   */
  vitalHolds(): VitalHold[] {
    return this.cur?.vitalHolds() ?? [];
  }

  /**
   * Where the run stands now, as a bookmark would hold it — or null when no position is consistent at this moment: no
   * scenario, a state's commands still on their way to the monitor, an event the runner has not yet read, or a new
   * state (or a new run) entered while the snapshot was taken. A caller takes it again a little later.
   */
  async position(): Promise<RunPosition | null> {
    const r = this.cur;
    // levels (values, the rhythm, the signals) are read again next poll; an event or a sensor change would be lost
    if (!r || this.inFlight > 0 || this.pending.some((p) => p.kind === 'clinical' || p.kind === 'sensor')) return null;
    const runner = r.getState();
    const snapshot = await this.o.target.snapshot();
    if (this.cur !== r || r.getState().batch !== runner.batch || r.stateId !== runner.stateId) return null;
    return { snapshot, seed: r.seed, runner };
  }

  /**
   * Hold `p` under `label` on the document now loaded, so `restoreBookmark` returns to it like to any bookmark (an app
   * restores a run kept across a reload this way). False when no document is loaded or `p` is another document's.
   */
  hold(label: string, p: RunPosition): boolean {
    const doc = this.cur?.doc;
    if (!doc || p.runner.docId !== doc.id || (p.runner.schema === 'pme-scenario-runner/2') !== isV2(doc)) return false;
    this.marks.set(label, { snapshot: p.snapshot, doc, seed: p.seed, runner: p.runner });
    return true;
  }

  close(): void {
    this.off();
  }

  // --- internals ---------------------------------------------------------------------------------------------
  /** Run one runner call and dispatch its effects; a stage it entered (not a hop: a /2 phase never is) wants its mark. */
  private step(r: AnyRunner, call: () => Array<RunnerEffect | PhaseRunnerEffect>): Array<RunnerEffect | PhaseRunnerEffect> {
    const before = r.entries;
    const fx = call();
    this.exec(fx);
    if (r.entries > before && !(r instanceof ScenarioRunner && isHop(r.state()))) {
      // one mark per stage entry: the return from one of the stage's own hops (treating → potassium → treating) is not one
      if (this.marking && r.stateId !== this.lastStage) this.stageWanted = { runner: r, entry: r.entries, stateId: r.stateId };
      this.lastStage = r.stateId;
    }
    return fx;
  }

  /** The stage `r` is in: its state (a /2 card: its phase), or for a hop the state its exit leads to (answer 2's fold). */
  private stageOf(r: AnyRunner): string {
    if (r instanceof PhaseRunner) return r.stateId;
    const s = r.state();
    return isHop(s) ? ((s.transitions?.[0] as { to: string }).to) : s.id;
  }

  /**
   * Place the wanted stage mark once the run's position is consistent (the stage's onEnter commands answered by the
   * monitor: position()), a frame or so after the entry, so a restore gives the stage with its onEnter applied. A stage
   * left before that gets no mark.
   */
  private async placeStageMark(): Promise<void> {
    const w = this.stageWanted;
    if (!w || this.placing) return;
    if (this.cur !== w.runner || w.runner.entries !== w.entry) return void (this.stageWanted = null);
    this.placing = true;
    try {
      const p = await this.position();
      if (!p || this.stageWanted !== w || this.cur !== w.runner || w.runner.entries !== w.entry) return; // the next poll tries again
      this.stageWanted = null;
      const n = ++this.stageN;
      const label = `stage:${w.stateId}:${n}`;
      this.marks.set(label, { snapshot: p.snapshot, doc: w.runner.doc, seed: p.seed, runner: p.runner });
      this.stageMarkList.push({ id: `stage-mark-${n}`, issuedBy: 'scenario', type: 'scenario', action: 'bookmark', target: label, kind: 'stage', note: w.stateId, atTick: p.snapshot.tick });
    } finally {
      this.placing = false;
    }
  }

  /** Dispatch effects: a batch is one stage group (`scenario-<n>`); a script entry is labelled card-set (`card-set-<n>`)
   *  and goes in the press's group when a press fired it. */
  private exec(fx: Array<RunnerEffect | PhaseRunnerEffect>): void {
    for (const f of fx) {
      if (f.kind === 'event') {
        this.o.publish?.(f.event);
        continue;
      }
      const card = 'cardSet' in f && f.cardSet === true;
      const id = `${card ? 'card-set' : 'scenario'}-${++this.n}`;
      const group = ('group' in f && f.group) || id;
      f.commands.forEach((dc, i) => this.send({ ...this.standIn(dc), id: `${id}-${i}`, issuedBy: 'scenario', stageGroup: group } as Command, card));
    }
  }

  private send(cmd: Command, cardSet = false): void {
    const r = this.cur;
    const t = this.o.target.now().simT;
    const rec = (res: DispatchResult) => {
      const e = { op: 'dispatch' as const, t, commandId: cmd.id, type: cmd.type, accepted: res.accepted, tick: res.tick, ...(res.reason ? { reason: res.reason } : {}) };
      if (r instanceof PhaseRunner) r.log.push({ ...e, ...(cardSet ? { cardSet: true as const } : {}) });
      else r?.log.push(e);
    };
    const res = (this.o.submit ?? ((c: Command) => this.host.dispatch(c)))(cmd);
    if (!(res instanceof Promise)) return void rec(res);
    this.inFlight++;
    void res.then(rec, (err: unknown) => rec({ accepted: false, tick: -1, reason: String(err) })).finally(() => this.inFlight--);
  }

  private standIn(dc: DocCommand): DocCommand {
    if (dc.type !== 'setRhythm') return dc;
    const s = resolveRhythm(dc.rhythm, dc.opts, this.known);
    if (s.note && !this.notes.includes(s.note)) this.notes.push(s.note);
    const { opts: _o, ...rest } = dc;
    return { ...rest, rhythm: s.rhythm, ...(s.opts ? { opts: s.opts } : {}) };
  }

  private wrap(inner: HostTarget): HostTarget {
    const observe = (c: Command, r: DispatchResult): DispatchResult => {
      const w = c as WireCommand;
      this.taking(c);
      let res = r;
      if ((w.type === 'applyEvent' || w.type === 'attachSensor') && !r.accepted && NOT_IMPLEMENTED.test(r.reason ?? '')) {
        res = { accepted: true, tick: Math.max(c.atTick ?? 0, r.tick + 1), reason: `scenario only: the engine does not model ${w.type} yet` };
      }
      if (!res.accepted) return res;
      // Engine-core's event union adds `thermal` and ventilation fico2/effort, outside the brief's verbatim
      // ClinicalEvent.
      if (w.type === 'applyEvent') this.pending.push({ kind: 'clinical', event: structuredClone(w.event) as ClinicalEvent });
      else if (w.type === 'attachSensor' && w.sensor !== 'pv' && w.sensor !== 'icp' && w.sensor !== 'pbto2' && w.sensor !== 'urometer') this.pending.push({ kind: 'sensor', sensor: w.sensor, state: w.state }); // 'pv' (teaching channels) is not a scenario sensor; nor are icp/pbto2/urometer (pme-scenario/1 has none)
      else if (w.type === 'setTarget') this.pending.push({ kind: 'values', rank: 1, values: { [w.variable]: w.value } });
      return res;
    };
    return {
      dispatch: (c) => {
        const r = inner.dispatch(c);
        return r instanceof Promise ? r.then((x) => observe(c, x)) : observe(c, r);
      },
      snapshot: () => inner.snapshot(),
      restore: (s) => inner.restore(s),
      on: (fn) => inner.on(fn),
      now: () => inner.now(),
      time: (a, v) => inner.time(a, v),
      // The runner keeps running through a fast-forward — it is polled after every step, at the step's sim time
      ...(inner.fastForwardStep
        ? {
            fastForwardStep: async (n: number, last: boolean) => {
              const r = await (inner.fastForwardStep as NonNullable<HostTarget['fastForwardStep']>)(n, last);
              if (n > 0) this.poll(); // an empty step (the host reading the monitor's tick) runs no time
              return r;
            },
          }
        : {}),
    };
  }

  /**
   * A command stamped with an `actionId` (an A press; F3 types the field, F6 stamps it) is a taking of that action,
   * accepted or not: the script entries it anchors go out now, in the press's stage group, so they land on its tick.
   * The further commands of the same press (same action, same stage group) are the same taking.
   */
  private taking(c: Command): void {
    const actionId = (c as { actionId?: unknown }).actionId;
    const r = this.cur;
    if (typeof actionId !== 'string' || !(r instanceof PhaseRunner)) return;
    const key = `${actionId}|${c.stageGroup ?? c.id}`;
    if (key === this.lastTaking) return;
    this.lastTaking = key;
    this.exec(r.take(this.o.target.now().simT, actionId, c.stageGroup));
  }

  private onEngine(e: EngineEvent): void {
    const w = e as WireEvent;
    if (w.type === 'measurement') {
      const values: Record<string, number> = {};
      for (const [k, m] of Object.entries(w.values)) if (m && m.value !== null) values[k] = m.value;
      if (Object.keys(values).length) this.pending.push({ kind: 'values', rank: 2, values });
    } else if (w.type === 'state') {
      const values: Record<string, number> = {};
      for (const [k, v] of Object.entries(w.values)) if (typeof v === 'number') values[k] = v;
      this.pending.push({ kind: 'values', rank: 3, values });
      // the rhythm id the state event already carries, for a PhaseRunner only (truthInputs adds F4's truths below)
      if (this.cur instanceof PhaseRunner && w.rhythm?.id) this.pending.push({ kind: 'rhythm', id: w.rhythm.id });
    }
    if (this.cur instanceof PhaseRunner) this.pending.push(...truthInputs(w)); // F4: a /2 runner only
  }
}

/** The input kinds a /1 runner takes. */
function v1Input(i: RunnerInputV2): i is RunnerInput {
  return i.kind === 'clinical' || i.kind === 'values' || i.kind === 'sensor';
}

/** The runner a document runs on. */
function runnerFor(doc: AnyScenarioDoc, seed?: number): AnyRunner {
  const o = seed === undefined ? {} : { seed };
  return isV2(doc) ? new PhaseRunner(doc, o) : new ScenarioRunner(doc, o);
}

/**
 * The engine truths a `pme-scenario/2` runner reads beyond the state's values (plan F4, Q21): the state event's
 * `signals`, the labs pH, lactate and K⁺, the endocrine MH activity, as rank 3. Never given to a /1 runner: its take()
 * would throw on a `signals` input, and a rank-3 `k` or `map` would shadow a /1 card's vital vars.
 */
function truthInputs(w: WireEvent): RunnerInputV2[] {
  if (w.type === 'state') return 'signals' in w && w.signals ? [{ kind: 'signals', signals: w.signals }] : []; // not a host-synthesised state
  if (w.type === 'labs') return [{ kind: 'values', rank: 3, values: { ph: w.values.ph, lactate: w.values.lactate, k: w.values.k } }];
  if (w.type === 'endo') return [{ kind: 'values', rank: 3, values: { mhActivity: w.mhActivity } }];
  return [];
}
