// The host-side glue between a ScenarioRunner and the monitor the host owns (brief §3.7: the host owns the
// simulation, so the scenario runs there). It
// - wraps the HostTarget (`driver.host`): every accepted command is also a runner input (applyEvent → latched
//   event, attachSensor → sensor level, setTarget → target value), and applyEvent/attachSensor that the engine
//   rejects as "not implemented" are accepted as scenario-only until Stages 3/4/7 model them;
// - feeds engine `measurement` (and, from Stage 2, `state`) events to the vital triggers;
// - handles every `scenario` command through `driver.hook` (load/goto/trigger/pause/resume, and bookmarks that
//   hold the engine snapshot AND the runner state);
// - on poll() advances the runner at the engine's sim time and dispatches each command batch as one stage group.
import { RHYTHM_IDS, type Command, type DispatchResult, type EngineEvent, type PatientSnapshot } from '@pme/engine-core';
import type { ClinicalEvent, ScenarioCommand, ScenarioEvent, WireCommand, WireEvent } from '../protocol.ts';
import type { HostTarget, ScenarioHookResult } from '../session/host-session.ts';
import { ScenarioRunner, type RunnerEffect, type RunnerInput, type RunnerState } from './runner.ts';
import { BUILTIN_SCENARIOS } from './builtins.ts';
import { resolveRhythm } from './standins.ts';
import type { DocCommand, ScenarioDoc } from './types.ts';
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
}

interface Mark {
  snapshot: PatientSnapshot;
  doc: ScenarioDoc | null;
  seed: number;
  runner: RunnerState | null;
}

const NOT_IMPLEMENTED = /not implemented/;

export class ScenarioDriver {
  readonly host: HostTarget;
  runner: ScenarioRunner | null = null;
  /** Load-time warnings and stand-in notes for the current document. */
  notes: string[] = [];
  private readonly o: ScenarioDriverOptions;
  private readonly known: ReadonlySet<string>;
  private readonly marks = new Map<string, Mark>();
  private pending: RunnerInput[] = [];
  private n = 0; // batch counter; never restored, so ids and stage groups stay unique across bookmark restores
  private k = 0;
  private readonly off: () => void;

  constructor(o: ScenarioDriverOptions) {
    this.o = o;
    this.known = new Set(o.rhythms ?? RHYTHM_IDS);
    this.host = this.wrap(o.target);
    this.off = o.target.on((e) => this.onEngine(e));
  }

  /** Advance the runner to the engine's current sim time (call once per frame, or per tick in tests). */
  poll(): RunnerEffect[] {
    const inputs = this.pending;
    this.pending = [];
    if (!this.runner) return [];
    const fx = this.runner.advance(this.o.target.now().simT, inputs);
    this.exec(fx);
    return fx;
  }

  /** Validate and start a document (or a built-in id). */
  load(input: unknown): { ok: true; doc: ScenarioDoc } | { ok: false; reason: string } {
    const raw = typeof input === 'string' ? (this.o.builtins ?? BUILTIN_SCENARIOS)[input] : input;
    if (raw === undefined) return { ok: false, reason: `no built-in scenario ${String(input)}` };
    const v = validateScenario(raw, { rhythms: [...this.known] });
    if (!v.ok) return { ok: false, reason: `invalid scenario: ${v.errors.join('; ')}` };
    this.notes = [...v.warnings];
    this.pending = [];
    this.runner = new ScenarioRunner(v.doc);
    this.exec(this.runner.start(this.o.target.now().simT));
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
        const r = this.runner;
        this.marks.set(label, { snapshot, doc: r?.doc ?? null, seed: r?.seed ?? 0, runner: r?.getState() ?? null });
        return yes({ ...cmd, target: label });
      }
      case 'restoreBookmark': {
        const m = cmd.target !== undefined ? this.marks.get(cmd.target) : undefined;
        if (!m) return no(`no bookmark ${String(cmd.target)}`);
        await this.o.target.restore(m.snapshot);
        this.pending = [];
        if (m.doc && m.runner) {
          if (this.runner?.doc !== m.doc) this.runner = new ScenarioRunner(m.doc, { seed: m.seed });
          this.runner.setState(m.runner);
          this.o.publish?.({ type: 'scenario', t: this.runner.enteredT, stateId: this.runner.stateId });
        } else this.runner = null;
        return yes(undefined, m.snapshot.tick);
      }
    }
    const r = this.runner;
    if (!r) return no('no scenario loaded');
    switch (cmd.action) {
      case 'goto':
        if (!cmd.target || !r.doc.states.some((s) => s.id === cmd.target)) return no(`no state ${String(cmd.target)}`);
        this.poll();
        this.exec(r.goto(simT, cmd.target));
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
    const r = this.runner;
    return r ? [{ type: 'scenario', t: r.enteredT, stateId: r.stateId }] : [];
  }

  bookmarks(): string[] {
    return [...this.marks.keys()];
  }

  close(): void {
    this.off();
  }

  // --- internals ---------------------------------------------------------------------------------------------
  private exec(fx: RunnerEffect[]): void {
    for (const f of fx) {
      if (f.kind === 'event') {
        this.o.publish?.(f.event);
        continue;
      }
      const group = `scenario-${++this.n}`;
      f.commands.forEach((dc, i) => this.send({ ...this.standIn(dc), id: `${group}-${i}`, issuedBy: 'scenario', stageGroup: group } as Command));
    }
  }

  private send(cmd: Command): void {
    const r = this.runner;
    const t = this.o.target.now().simT;
    const rec = (res: DispatchResult) =>
      r?.log.push({ op: 'dispatch', t, commandId: cmd.id, type: cmd.type, accepted: res.accepted, tick: res.tick, ...(res.reason ? { reason: res.reason } : {}) });
    const res = (this.o.submit ?? ((c: Command) => this.host.dispatch(c)))(cmd);
    if (res instanceof Promise) void res.then(rec, (err: unknown) => rec({ accepted: false, tick: -1, reason: String(err) }));
    else rec(res);
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
      let res = r;
      if ((w.type === 'applyEvent' || w.type === 'attachSensor') && !r.accepted && NOT_IMPLEMENTED.test(r.reason ?? '')) {
        res = { accepted: true, tick: Math.max(c.atTick ?? 0, r.tick + 1), reason: `scenario only: the engine does not model ${w.type} yet` };
      }
      if (!res.accepted) return res;
      // Stage 3: engine-core's event union adds `thermal` and ventilation fico2/effort (plan decisions 6 and 8), outside the brief's verbatim ClinicalEvent.
      if (w.type === 'applyEvent') this.pending.push({ kind: 'clinical', event: structuredClone(w.event) as ClinicalEvent });
      else if (w.type === 'attachSensor' && w.sensor !== 'pv') this.pending.push({ kind: 'sensor', sensor: w.sensor, state: w.state }); // Stage 7a: 'pv' (teaching channels) is not a scenario sensor
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
    };
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
    }
  }
}
