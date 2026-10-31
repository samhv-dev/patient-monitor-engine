// Plan F2: the pme-scenario/2 phase runner on SYNTHETIC inputs (no engine). Phase rules read rank 3 (truth) only; each
// tick the current phase's `next` is tried in its written order, the first rule that holds wins, at most one change per
// tick; every named rule's edges, the timeline and the slope rings live in the runner's plain-JSON state; the script
// fires as card-set command batches.
import { describe, expect, it } from 'vitest';
import { PhaseRunner, type PhaseRunnerEffect } from '../../src/scenario/phase-runner.ts';
import { replayRunLog, runLog } from '../../src/scenario/replay.ts';
import type { Phase, PhaseRule, RunnerInputV2, ScenarioDocV2, ScriptEntry } from '../../src/scenario/types-v2.ts';

const truth = (values: Record<string, number>): RunnerInputV2 => ({ kind: 'values', rank: 3, values });
const display = (values: Record<string, number>): RunnerInputV2 => ({ kind: 'values', rank: 2, values });
const signals = (s: Partial<{ pulse: boolean; dantroleneE: number; setMinuteVentilationLMin: number | null; map: number; mhActivity: number; mhExcess: number | null }>): RunnerInputV2 =>
  ({ kind: 'signals', signals: { pulse: true, dantroleneE: 0, setMinuteVentilationLMin: 6, map: 80, mhActivity: 0, ...s } });
const rhythm = (id: string): RunnerInputV2 => ({ kind: 'rhythm', id });

/** A /2 document from phases (the first is initial) and an optional script. */
function card(phases: Array<Omit<Phase, 'label'> & { label?: string }>, extra: Partial<ScenarioDocV2> = {}): ScenarioDocV2 {
  return {
    schema: 'pme-scenario/2', id: 'syn', title: 'Synthetic',
    phases: phases.map((p, i) => ({ label: p.id.toUpperCase(), ...(i === 0 ? { initial: true as const } : {}), ...p })),
    actions: [], ...extra,
  };
}
/** Two phases: `a` (initial) → `b` entered by `rule`. */
const ab = (rule: PhaseRule, extra: Partial<ScenarioDocV2> = {}) => card([{ id: 'a', next: ['b'] }, { id: 'b', enter: rule }], extra);

/** Advance every `dt` from `from` (exclusive) to `to` (inclusive); `feed(t)` gives the inputs of each call. */
function run(r: PhaseRunner, from: number, to: number, feed: (t: number) => RunnerInputV2[] = () => [], dt = 0.1): PhaseRunnerEffect[] {
  const out: PhaseRunnerEffect[] = [];
  for (let n = Math.round(from / dt) + 1; n <= Math.round(to / dt); n++) {
    const t = Math.round(n * dt * 1000) / 1000;
    out.push(...r.advance(t, feed(t)));
  }
  return out;
}
const entered = (r: PhaseRunner) => r.phases.map((p) => [p.id, p.t] as const);

describe('PhaseRunner: the leaves on truth, each at its edge', () => {
  it('value: true just past its threshold, false at it; a displayed (rank 2) value never moves a phase', () => {
    const r = new PhaseRunner(ab({ value: { var: 'etco2', op: '>', value: 45 } }));
    r.start(0);
    r.advance(1, [display({ etco2: 60 })]);
    expect(r.stateId).toBe('a');
    r.advance(2, [truth({ etco2: 45 })]);
    expect(r.stateId).toBe('a');
    r.advance(3, [truth({ etco2: 45.001 })]);
    expect(r.stateId).toBe('b');
    expect(r.phases).toEqual([{ id: 'a', t: 0, exitT: 3, rule: 'initial' }, { id: 'b', t: 3, rule: 'enter:b' }]);
    const ge = new PhaseRunner(ab({ value: { var: 'etco2', op: '>=', value: 45 } }));
    ge.start(0);
    ge.advance(1, [truth({ etco2: 44.999 })]);
    expect(ge.stateId).toBe('a');
    ge.advance(2, [truth({ etco2: 45 })]);
    expect(ge.stateId).toBe('b');
  });

  it('value with forS: held for the whole hold enters; broken for one tick starts the hold again', () => {
    const r = new PhaseRunner(ab({ value: { var: 'etco2', op: '>', value: 45, forS: 20 } }));
    r.start(0);
    // true from 1 s, broken at 20.5 s (19.5 s held), true again from 20.6 s: enters 20 s later, at 40.6 s
    run(r, 0, 60, (t) => [truth({ etco2: t >= 1 && Math.abs(t - 20.5) > 1e-9 ? 50 : 40 })]);
    expect(entered(r)).toEqual([['a', 0], ['b', 40.6]]);
    const held = new PhaseRunner(ab({ value: { var: 'etco2', op: '>', value: 45, forS: 20 } }));
    held.start(0);
    run(held, 0, 30, (t) => [truth({ etco2: t >= 1 ? 50 : 40 })]);
    expect(entered(held)).toEqual([['a', 0], ['b', 21]]);
  });

  it('slope: the window\'s least-squares slope, once the window is full; a slower rise never holds', () => {
    const rise = (perMin: number) => (t: number) => [truth({ etco2: 40 + (perMin / 60) * t })];
    const fast = new PhaseRunner(ab({ slope: { var: 'etco2', op: '>', perMin: 0.2, overS: 120 } }));
    fast.start(0);
    run(fast, 0, 200, rise(0.3));
    // 1 Hz samples from 1 s: the window of 120 s is full at the sample of 121 s
    expect(entered(fast)).toEqual([['a', 0], ['b', 121]]);
    const slow = new PhaseRunner(ab({ slope: { var: 'etco2', op: '>', perMin: 0.2, overS: 120 } }));
    slow.start(0);
    run(slow, 0, 400, rise(0.1));
    expect(slow.stateId).toBe('a');
    const falling = new PhaseRunner(ab({ slope: { var: 'etco2', op: '<', perMin: 0, overS: 60 } }));
    falling.start(0);
    run(falling, 0, 100, rise(-1));
    expect(entered(falling)).toEqual([['a', 0], ['b', 61]]);
  });

  it('unchanged: every sample of the window within ± withinPct of the current value; a missing value restarts it', () => {
    const mv = (first: number) => (t: number) => [signals({ setMinuteVentilationLMin: t < 30 ? first : 6 })];
    const rule: PhaseRule = { unchanged: { var: 'setMinuteVentilationLMin', withinPct: 5, overS: 60 } };
    const at = new PhaseRunner(ab(rule));
    at.start(0);
    run(at, 0, 100, mv(6.3)); // 6.3 is +5.0 % of 6
    expect(entered(at)).toEqual([['a', 0], ['b', 61]]);
    const past = new PhaseRunner(ab(rule));
    past.start(0);
    run(past, 0, 100, mv(6.31)); // +5.17 %: the window holds once the last 6.31 (the sample of 30 s) has left it
    expect(entered(past)).toEqual([['a', 0], ['b', 91]]);
    const gap = new PhaseRunner(ab(rule));
    gap.start(0);
    run(gap, 0, 120, (t) => [signals({ setMinuteVentilationLMin: Math.abs(t - 40) < 1e-9 ? null : 6 })]);
    expect(entered(gap)).toEqual([['a', 0], ['b', 101]]); // the null at 40 s: the window starts again at 41 s
  });

  it('not: the negation of its rule', () => {
    const r = new PhaseRunner(ab({ not: { value: { var: 'hr', op: '>', value: 100 } } }));
    r.start(0);
    r.advance(1, [truth({ hr: 120 })]);
    expect(r.stateId).toBe('a');
    r.advance(2, [truth({ hr: 100 })]);
    expect(r.stateId).toBe('b');
  });

  it('visited: a phase in the timeline', () => {
    const doc = card([
      { id: 'a', next: ['c', 'b'] },
      { id: 'b', enter: { value: { var: 'hr', op: '>', value: 100 } }, next: ['a2'] },
      { id: 'a2', enter: { value: { var: 'hr', op: '<=', value: 100 } }, next: ['c'] },
      { id: 'c', enter: { all: [{ visited: 'b' }, { value: { var: 'hr', op: '<', value: 60 } }] } },
    ]);
    const never = new PhaseRunner(doc);
    never.start(0);
    run(never, 0, 10, () => [truth({ hr: 50 })]);
    expect(never.stateId).toBe('a'); // c needs b in the timeline
    const r = new PhaseRunner(doc);
    r.start(0);
    r.advance(1, [truth({ hr: 50 })]);
    r.advance(2, [truth({ hr: 120 })]);
    r.advance(3, [truth({ hr: 50 })]);
    r.advance(4, [truth({ hr: 50 })]);
    expect(entered(r)).toEqual([['a', 0], ['b', 2], ['a2', 3], ['c', 4]]);
  });

  it('signal: VF is told from VT and asystole from PEA by the rhythm id, not by its group; rosc follows a pulse loss', () => {
    const arrest = () => new PhaseRunner(card([
      { id: 'pulse', next: ['vf', 'pvt', 'asystole', 'pea'] },
      // VF by the rhythm id alone: an instructor-selected VF does not set the engine's arrest state (F4), so the
      // pulse may still read present through it
      { id: 'vf', enter: { any: [{ signal: 'rhythm:vfCoarse' }, { signal: 'rhythm:vfFine' }] }, next: ['rosc'] },
      { id: 'pvt', enter: { all: [{ signal: 'pulseLoss' }, { signal: 'rhythm:vtMono' }] }, next: ['rosc'] },
      { id: 'asystole', enter: { all: [{ signal: 'pulseLoss' }, { signal: 'rhythm:asystole' }] }, next: ['rosc'] },
      { id: 'pea', enter: { signal: 'pulseLoss' }, next: ['rosc'] },
      { id: 'rosc', enter: { signal: 'rosc' } },
    ]));
    const at = (rh: string) => {
      const r = arrest();
      r.start(0);
      r.advance(1, [rhythm('sinus'), signals({ pulse: true })]);
      expect(r.stateId).toBe('pulse');
      r.advance(2, [rhythm(rh), signals({ pulse: false })]);
      return r;
    };
    expect(at('vfCoarse').stateId).toBe('vf');
    const vfWithPulse = arrest();
    vfWithPulse.start(0);
    vfWithPulse.advance(1, [rhythm('vfCoarse'), signals({ pulse: true })]);
    expect(vfWithPulse.stateId).toBe('vf'); // no pulseLoss needed
    vfWithPulse.advance(2, [rhythm('sinus'), signals({ pulse: true })]);
    expect(vfWithPulse.stateId).toBe('vf'); // and no rosc without a pulse loss
    expect(at('vtMono').stateId).toBe('pvt'); // the same 'ventricular' group as VF
    expect(at('asystole').stateId).toBe('asystole');
    expect(at('junctionalEscape').stateId).toBe('pea'); // an organised rhythm without a pulse
    const r = at('vfFine');
    expect(r.stateId).toBe('vf');
    r.advance(3, [rhythm('sinus'), signals({ pulse: true })]);
    expect(r.stateId).toBe('rosc');
    // rosc is a pulse AFTER a loss: never true before one
    expect(r.edges.filter((e) => e.rule === 'rosc')).toEqual([{ rule: 'rosc', t: 3, value: true }]);
    expect(r.edges.filter((e) => e.rule === 'pulseLoss')).toEqual([{ rule: 'pulseLoss', t: 2, value: true }, { rule: 'pulseLoss', t: 3, value: false }]);
  });
});

describe('PhaseRunner: one phase at a time', () => {
  it('next order wins: of two rules that hold on the same tick, the one written first in `next`', () => {
    const r = new PhaseRunner(card([
      { id: 'a', next: ['c', 'b'] },
      { id: 'b', enter: { value: { var: 'hr', op: '>', value: 100 } } },
      { id: 'c', enter: { value: { var: 'hr', op: '>', value: 90 } } },
    ]));
    r.start(0);
    r.advance(1, [truth({ hr: 120 })]);
    expect(r.stateId).toBe('c'); // b is first in the document, c first in a's next
  });

  it('one change per tick: a chain whose rules all hold moves one phase per call', () => {
    const r = new PhaseRunner(card([
      { id: 'a', next: ['b'] },
      { id: 'b', enter: { value: { var: 'hr', op: '>', value: 100 } }, next: ['c'] },
      { id: 'c', enter: { value: { var: 'hr', op: '>', value: 100 } } },
    ]));
    r.start(0);
    const fx = r.advance(1, [truth({ hr: 120 })]);
    expect(r.stateId).toBe('b');
    expect(fx).toEqual([{ kind: 'event', event: { type: 'scenario', t: 1, stateId: 'b', transitionId: 'enter:b' } }]);
    r.advance(1.1);
    expect(r.stateId).toBe('c');
    expect(r.entries).toBe(3);
  });
});

const TOGGLE = card(
  [
    { id: 'a', next: ['b'] },
    { id: 'b', enter: { value: { var: 'hr', op: '>', value: 100 } }, next: ['a2'] },
    { id: 'a2', enter: { value: { var: 'hr', op: '<=', value: 100, forS: 2 } } },
  ],
  {
    outcomes: [{ id: 'fast', text: 'HR above 110', rule: { value: { var: 'hr', op: '>', value: 110 } }, anchor: 'start', withinS: 600 }],
    script: [{ id: 'onB', on: 'phase:b', commands: [{ type: 'setTarget', variable: 'hr', value: 90 }] }],
  },
);
const toggleFeed = (t: number) => [truth({ hr: t >= 10 && t < 20 ? 120 : 80 })];

describe('PhaseRunner: the timeline, the record and the edges are state', () => {
  it('every named rule\'s true/false edges are logged (phases, outcomes, pulseLoss, rosc)', () => {
    const r = new PhaseRunner(TOGGLE);
    r.start(0);
    run(r, 0, 30, toggleFeed);
    expect(r.edges.filter((e) => e.rule === 'phase:b')).toEqual([{ rule: 'phase:b', t: 10, value: true }, { rule: 'phase:b', t: 20, value: false }]);
    expect(r.edges.filter((e) => e.rule === 'outcome:fast')).toEqual([{ rule: 'outcome:fast', t: 10, value: true }, { rule: 'outcome:fast', t: 20, value: false }]);
    expect(r.edges.filter((e) => e.rule === 'phase:a2')).toEqual([
      { rule: 'phase:a2', t: 2.1, value: true }, { rule: 'phase:a2', t: 10, value: false }, { rule: 'phase:a2', t: 22, value: true },
    ]);
    expect(entered(r)).toEqual([['a', 0], ['b', 10], ['a2', 22]]);
  });

  it('timeline, administration record and edges survive getState/setState as plain JSON', () => {
    const r = new PhaseRunner(TOGGLE);
    r.start(0);
    run(r, 0, 30, toggleFeed);
    const st = r.getState();
    expect(st.schema).toBe('pme-scenario-runner/2');
    st.admin.push({ seq: 1, t: 12, source: 'sheet', kind: 'drug', drugId: 'esmolol', dose: 0.5, unit: 'mg/kg', route: 'iv', result: { accepted: true } });
    const copy = new PhaseRunner(TOGGLE);
    copy.setState(JSON.parse(JSON.stringify(st)));
    expect(copy.getState()).toEqual(st);
    expect(copy.phases).toEqual(r.phases);
    expect(copy.edges).toEqual(r.edges);
    expect(copy.admin).toEqual(st.admin);
    expect(copy.stateId).toBe('a2');
    expect(() => copy.setState({ ...st, docId: 'other' })).toThrow(/runner state is for other/);
    expect(() => copy.setState({ ...st, schema: 'pme-scenario-runner/1' } as never)).toThrow();
  });

  it('a restore rewinds them, and the run from there decides as before', () => {
    const r = new PhaseRunner(TOGGLE);
    r.start(0);
    run(r, 0, 5, toggleFeed);
    const at5 = r.getState();
    run(r, 5, 30, toggleFeed);
    const at30 = r.getState();
    expect(r.phases.length).toBe(3);
    r.setState(at5);
    expect(r.stateId).toBe('a');
    expect(r.phases).toEqual(at5.phases);
    expect(r.edges).toEqual(at5.edges);
    expect(r.getState().fired).toEqual([]);
    run(r, 5, 30, toggleFeed);
    expect(r.getState()).toEqual(at30);
  });

  it('the bounds: 500 timeline entries, the /1 history\'s 200, edges per rule (the first edge kept)', () => {
    const r = new PhaseRunner(card([
      { id: 'a', next: ['b'] },
      { id: 'b', enter: { value: { var: 'hr', op: '>', value: 100 } }, next: ['a2'] },
      { id: 'a2', enter: { value: { var: 'hr', op: '<=', value: 100 } }, next: ['b'] },
    ]));
    r.start(0);
    for (let i = 1; i <= 1400; i++) r.advance(i, [truth({ hr: i % 2 ? 120 : 80 })]);
    expect(r.phases.length).toBe(500);
    expect(r.phases.at(-1)).toEqual({ id: 'a2', t: 1400, rule: 'enter:a2' });
    expect(r.history.length).toBe(200);
    const b = r.edges.filter((e) => e.rule === 'phase:b');
    expect(b.length).toBeLessThanOrEqual(PhaseRunner.EDGES_PER_RULE);
    expect(b[0]).toEqual({ rule: 'phase:b', t: 1, value: true });
    expect(b.at(-1)).toEqual({ rule: 'phase:b', t: 1400, value: false });
  });

  it('replayRunLog reproduces the decisions (phase entries and script firings), through a pause and a restore', () => {
    const r = new PhaseRunner(TOGGLE);
    r.start(0);
    run(r, 0, 12, toggleFeed);
    const mark = r.getState();
    r.pause(12);
    run(r, 12, 15, toggleFeed);
    r.resume(15);
    run(r, 15, 30, toggleFeed);
    r.setState(mark);
    run(r, 12, 40, toggleFeed);
    const log = runLog(r);
    expect(log.schema).toBe('pme-scenario-log/2');
    const rep = replayRunLog(TOGGLE, log);
    expect(rep.ok).toBe(true);
    expect(rep.decisions.filter((d) => d.op === 'script').length).toBe(1);
    expect(rep.decisions.filter((d) => d.op === 'enter').map((d) => (d as { stateId: string }).stateId)).toEqual(['a', 'b', 'a2', 'a2']);
    // a log whose inputs were changed decides otherwise
    const bent = structuredClone(log);
    for (const e of bent.entries) if (e.op === 'advance') for (const i of e.inputs) if (i.kind === 'values') i.values.hr = 80;
    expect(replayRunLog(TOGGLE, bent).ok).toBe(false);
  });
});

describe('PhaseRunner: the script, card-set', () => {
  const scripted = (script: ScriptEntry[]) =>
    card([
      { id: 'a', next: ['b'] },
      { id: 'b', enter: { value: { var: 'hr', op: '>', value: 100 } }, next: ['a2'] },
      { id: 'a2', enter: { value: { var: 'hr', op: '<=', value: 100 } }, next: ['b'] },
    ], { script, actions: [{ id: 'induce', label: 'Induce', kind: 'procedure', phases: ['a'] }] });
  const commandsOf = (fx: PhaseRunnerEffect[]) => fx.filter((f) => f.kind === 'commands');

  it('a phase-entry entry fires once, on the first entry, as its own batch labelled card-set', () => {
    const r = new PhaseRunner(scripted([{ id: 'junctional', on: 'phase:b', commands: [{ type: 'setRhythm', rhythm: 'junctionalEscape', $comment: 'dropped' }] }]));
    r.start(0);
    expect(commandsOf(r.advance(1, [truth({ hr: 120 })]))).toEqual([
      { kind: 'commands', batch: 1, reason: 'script', cardSet: true, scriptId: 'junctional', commands: [{ type: 'setRhythm', rhythm: 'junctionalEscape' }] },
    ]);
    r.advance(2, [truth({ hr: 80 })]);
    expect(commandsOf(r.advance(3, [truth({ hr: 120 })]))).toEqual([]); // b again: not again
    expect(r.log.filter((l) => l.op === 'script')).toEqual([{ op: 'script', t: 1, scriptId: 'junctional', anchor: 'phase:b' }]);
  });

  it('a scenario-time entry fires once when the scenario clock reaches it (paused time does not count)', () => {
    const r = new PhaseRunner(scripted([{ id: 'bleed', on: { atScenarioS: 30 }, commands: [{ type: 'setTarget', variable: 'hr', value: 130 }] }, { id: 'zero', on: { atScenarioS: 0 }, commands: [{ type: 'setTarget', variable: 'sbp', value: 90 }] }]));
    const start = r.start(0);
    expect(start.filter((f) => f.kind === 'commands').map((f) => (f as { scriptId?: string }).scriptId)).toEqual(['zero']);
    r.pause(10);
    run(r, 10, 20);
    r.resume(20);
    expect(commandsOf(run(r, 20, 39.9))).toEqual([]);
    expect(commandsOf(run(r, 39.9, 41)).map((f) => (f as { scriptId: string }).scriptId)).toEqual(['bleed']);
    expect(commandsOf(run(r, 41, 100))).toEqual([]);
  });

  it('an entry anchored on an action\'s nth taking fires with that taking, in the press\'s stage group', () => {
    const r = new PhaseRunner(scripted([
      { id: 'mh', on: 'action:induce#1', commands: [{ type: 'applyEvent', event: { kind: 'condition', condition: 'mh', severity: 1 } as never }] },
      { id: 'second', on: 'action:induce#2', commands: [{ type: 'setTarget', variable: 'hr', value: 100 }] },
    ]));
    r.start(0);
    expect(r.take(5, 'induce', 'press-1')).toEqual([
      { kind: 'commands', batch: 1, reason: 'script', cardSet: true, scriptId: 'mh', group: 'press-1', commands: [{ type: 'applyEvent', event: { kind: 'condition', condition: 'mh', severity: 1 } }] },
    ]);
    expect(r.take(9, 'induce').map((f) => (f as { scriptId: string }).scriptId)).toEqual(['second']);
    expect(r.take(12, 'induce')).toEqual([]);
    expect(r.take(13, 'nosuch')).toEqual([]);
    expect(r.getState().takings).toEqual({ induce: 3 });
  });
});

describe('PhaseRunner: vitalHolds() on a /2 card (the A rows of Instructor v2)', () => {
  it('each value leaf with forS, and the window fill of each slope and unchanged leaf, of the current phase\'s next', () => {
    const doc = card([
      { id: 'a', next: ['early', 'quiet'] },
      {
        id: 'early',
        enter: { all: [
          { value: { var: 'etco2', op: '>', value: 45, forS: 20 } },
          { slope: { var: 'etco2', op: '>', perMin: 0.2, overS: 120 } },
          { unchanged: { var: 'setMinuteVentilationLMin', withinPct: 5, overS: 120 } },
          { value: { var: 'hr', op: '>', value: 50 } },
        ] },
      },
      { id: 'quiet', enter: { value: { var: 'spo2', op: '<', value: 80, forS: 10 } } },
      { id: 'other', enter: { value: { var: 'k', op: '>', value: 6, forS: 5 } } },
    ]);
    const r = new PhaseRunner(doc);
    r.start(0);
    run(r, 0, 60, (t) => [truth({ etco2: 40 + t / 6, hr: 80, spo2: 98, k: 7 }), signals({ setMinuteVentilationLMin: 6 })]);
    const h = r.vitalHolds();
    expect(h.map((x) => [x.transitionId, x.key, x.leaf, x.variable])).toEqual([
      ['enter:early', 'phase:early.0', 'value', 'etco2'],
      ['enter:early', 'phase:early.1', 'slope', 'etco2'],
      ['enter:early', 'phase:early.2', 'unchanged', 'setMinuteVentilationLMin'],
      ['enter:quiet', 'phase:quiet', 'value', 'spo2'],
    ]);
    // etco2 = 40 + t/6 passes 45 at 30 s: held 30 s of 20 at 60 s; the windows hold 59 of 120 s (samples from 1 s)
    expect(h[0]).toMatchObject({ op: '>', threshold: 45, met: true, heldS: expect.closeTo(29.9, 6), forS: 20, fraction: 1 });
    expect(h[1]).toMatchObject({ threshold: 0.2, value: undefined, met: false, heldS: 59, forS: 120, fraction: 59 / 120 });
    expect(h[2]).toMatchObject({ met: false, heldS: 59, forS: 120, fraction: 59 / 120 });
    expect(h[3]).toMatchObject({ value: 98, met: false, heldS: 0, forS: 10, fraction: 0 });
    run(r, 60, 125, (t) => [truth({ etco2: 40 + t / 6, hr: 80, spo2: 98, k: 7 }), signals({ setMinuteVentilationLMin: 6 })]);
    expect(r.stateId).toBe('early'); // at 121 s
    expect(r.vitalHolds()).toEqual([]); // early has no next
  });
});

// The owner's rulings of 31 October: every phase boundary holds for 60 s before the phase changes (Q1: without a hold
// the MH replay flapped about ninety times), and "unchanged set ventilation" is the set minute ventilation within 5 % of
// its value at the current phase's start.
describe('PhaseRunner: a phase\'s holdS and unchanged since the phase\'s start (owner, 31 October)', () => {
  it('holdS: the entry rule must hold without a break for holdS before the phase changes; a break starts it again', () => {
    const r = new PhaseRunner(card([{ id: 'a', next: ['b'] }, { id: 'b', enter: { value: { var: 'etco2', op: '>', value: 45 } }, holdS: 60 }]));
    r.start(0);
    // true from 0.1 s, false at 30 s, true again from 30.1 s: enters 60 s after 30.1 s
    run(r, 0, 120, (t) => [truth({ etco2: Math.abs(t - 30) < 1e-9 ? 40 : 50 })]);
    expect(entered(r)).toEqual([['a', 0], ['b', 90.1]]);
  });

  it('holdS: paused time does not count, and vitalHolds() shows the hold\'s fill', () => {
    const r = new PhaseRunner(card([{ id: 'a', next: ['b'] }, { id: 'b', enter: { value: { var: 'etco2', op: '>', value: 45 } }, holdS: 60 }]));
    r.start(0);
    run(r, 0, 30, () => [truth({ etco2: 50 })]);
    const h = r.vitalHolds().find((x) => x.leaf === 'hold');
    expect(h).toMatchObject({ transitionId: 'enter:b', leaf: 'hold', met: true, forS: 60 });
    expect(h!.heldS).toBeCloseTo(29.9, 6);
    r.pause(30);
    run(r, 30, 100, () => [truth({ etco2: 50 })]);
    expect(r.stateId).toBe('a');
    r.resume(100);
    run(r, 100, 140, () => [truth({ etco2: 50 })]);
    expect(entered(r)).toEqual([['a', 0], ['b', 130.1]]);
  });

  it('unchanged since: "phaseStart": within ± withinPct of the value at the current phase\'s entry, not of the newest', () => {
    const rule: PhaseRule = { unchanged: { var: 'setMinuteVentilationLMin', withinPct: 5, since: 'phaseStart' } };
    const r = new PhaseRunner(card([{ id: 'a', next: ['b'] }, { id: 'b', enter: { all: [{ value: { var: 'etco2', op: '>', value: 45 } }, rule] } }]));
    r.start(0);
    r.advance(1, [signals({ setMinuteVentilationLMin: 6 })]); // the first value after the entry is the reference
    r.advance(2, [signals({ setMinuteVentilationLMin: 12 }), truth({ etco2: 50 })]);
    expect(r.stateId).toBe('a'); // doubled: changed
    r.advance(3, [signals({ setMinuteVentilationLMin: 6.29 })]);
    expect(r.stateId).toBe('b'); // within 5 % of 6
  });

  it('unchanged since "phaseStart": the reference is taken again at each phase entry', () => {
    const rule: PhaseRule = { unchanged: { var: 'setMinuteVentilationLMin', withinPct: 5, since: 'phaseStart' } };
    const r = new PhaseRunner(card([
      { id: 'a', next: ['b'] },
      { id: 'b', enter: { value: { var: 'etco2', op: '>', value: 45 } }, next: ['c'] },
      { id: 'c', enter: { all: [{ value: { var: 'etco2', op: '>', value: 50 } }, rule] } },
    ]));
    r.start(0);
    r.advance(1, [signals({ setMinuteVentilationLMin: 6 })]);
    r.advance(2, [signals({ setMinuteVentilationLMin: 12 }), truth({ etco2: 48 })]);
    expect(r.stateId).toBe('b'); // entered at 12 L/min: the reference is 12
    r.advance(3, [truth({ etco2: 55 })]);
    expect(r.stateId).toBe('c');
  });
});

// Decision D1 (review B1, cause 1): "rising at unchanged ventilation" is the design's own leaf (§4: within ± 5 % over
// 120 s, re-armed after a change), and the 60-s hold, once started by a true rule, is not reset by a change of what an
// `unchanged` leaf guards (the team's response to the rise), nor by what follows from it: the hold is latched and runs
// to its end. A rule that falls while its guards still hold (the course turned by itself) starts the hold again.
describe('PhaseRunner: a running hold is latched by its guard\'s change (D1)', () => {
  const RISE: PhaseRule = { all: [
    { value: { var: 'etco2', op: '>', value: 45 } },
    { unchanged: { var: 'setMinuteVentilationLMin', withinPct: 5, overS: 120 } },
  ] };
  const doc = () => card([{ id: 'a', next: ['b'] }, { id: 'b', enter: RISE, holdS: 60 }]);
  /** EtCO₂ 50 from 200 s; the set MV 6 L/min, doubled at `change` (s); EtCO₂ falls to 40 `fallS` after the change. */
  const feed = (change: number, fallS = 5) => (t: number) => [
    signals({ setMinuteVentilationLMin: t >= change ? 12 : 6 }),
    truth({ etco2: t < 200 ? 40 : t >= change + fallS ? 40 : 50 }),
  ];

  it('the call inside the hold (MV doubled at 220 s, EtCO₂ then falling): the phase is entered 60 s after the rise, not lost', () => {
    const r = new PhaseRunner(doc());
    r.start(0);
    run(r, 0, 400, feed(220));
    expect(entered(r)).toEqual([['a', 0], ['b', 260]]);
    // the rule's own edges are still the truth: true from 200 s, false with the change
    expect(r.edges.filter((e) => e.rule === 'phase:b').map((e) => [e.value, e.t])).toEqual([[true, 200], [false, 221]]); // the window's sample of the new MV at the next whole second
  });

  it('no latch when the course turns by itself (EtCO₂ back below 45 with the ventilation unchanged): the hold starts again', () => {
    const r = new PhaseRunner(doc());
    r.start(0);
    run(r, 0, 400, (t) => [signals({ setMinuteVentilationLMin: 6 }), truth({ etco2: t >= 200 && (t < 230 || t >= 300) ? 50 : 40 })]);
    expect(entered(r)).toEqual([['a', 0], ['b', 360]]);
  });

  it('the unchanged leaf re-arms 120 s after a change: a rise at the new ventilation is a rise again', () => {
    const r = new PhaseRunner(doc());
    r.start(0);
    // MV doubled at 100 s, before any rise: the rule cannot hold until 220 s (the window spans the change until then)
    run(r, 0, 400, (t) => [signals({ setMinuteVentilationLMin: t >= 100 ? 12 : 6 }), truth({ etco2: t >= 150 ? 50 : 40 })]);
    expect(r.edges.filter((e) => e.rule === 'phase:b' && e.value).map((e) => e.t)[0]).toBeGreaterThanOrEqual(220);
    expect(r.stateId).toBe('b');
  });

  it('a latch belongs to the phase\'s hold: a phase that is not a candidate of the current one is never latched, and an entry clears it', () => {
    const r = new PhaseRunner(card([{ id: 'a', next: ['c'] }, { id: 'b', enter: RISE, holdS: 60 }, { id: 'c', enter: { value: { var: 'hr', op: '>', value: 100 } } }]));
    r.start(0);
    run(r, 0, 400, (t) => [...feed(220)(t), truth({ hr: 80 })]);
    expect(r.getState().latched).toBeUndefined();
    expect(r.stateId).toBe('a');
  });
});

// Decision D2 (review B1, cause 2): the engine's mhExcess (the MH's dantrolene-sensitive fraction s) is a truth a rule
// reads, as the other signals; null (no MH) is no value, and its window starts again.
describe('PhaseRunner: mhExcess is read from the signals (D2)', () => {
  it('a slope on mhExcess holds while it falls; a null empties its ring', () => {
    const r = new PhaseRunner(ab({ slope: { var: 'mhExcess', op: '<', perMin: 0, overS: 60 } }));
    r.start(0);
    run(r, 0, 30, (t) => [signals({ mhExcess: t < 20 ? null : 1 })]);
    expect(r.value('mhExcess')).toBe(1);
    run(r, 30, 79, (t) => [signals({ mhExcess: 1 - (t - 30) / 600 })]);
    expect(r.stateId).toBe('a'); // the window (60 s of samples) is not full yet
    run(r, 79, 100, (t) => [signals({ mhExcess: 1 - (t - 30) / 600 })]);
    expect(r.stateId).toBe('b');
  });
});
