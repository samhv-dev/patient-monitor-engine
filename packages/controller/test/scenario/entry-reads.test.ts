// Plan scenario-builder.md §6 (B6, "What fired, and why"): at each phase entry the runner records, on the timeline's
// entry, every leaf of the rule that fired as it read on that tick (the value, its threshold, the hold it had), and each
// script entry's firing time beside `fired`. Read from the runner's own state at the edge, so the builder's log
// recomputes nothing, and a fast-forward that crosses several phases between two page polls loses none.
import { describe, expect, it } from 'vitest';
import { PhaseRunner } from '../../src/scenario/phase-runner.ts';
import type { Phase, PhaseRule, RunnerInputV2, ScenarioDocV2 } from '../../src/scenario/types-v2.ts';

const truth = (values: Record<string, number>): RunnerInputV2 => ({ kind: 'values', rank: 3, values });

function card(phases: Array<Omit<Phase, 'label'>>, extra: Partial<ScenarioDocV2> = {}): ScenarioDocV2 {
  return {
    schema: 'pme-scenario/2', id: 'syn', title: 'Synthetic',
    phases: phases.map((p, i) => ({ label: p.id.toUpperCase(), ...(i === 0 ? { initial: true as const } : {}), ...p })),
    actions: [], ...extra,
  };
}
const ab = (rule: PhaseRule, more: Partial<Phase> = {}, extra: Partial<ScenarioDocV2> = {}) =>
  card([{ id: 'a', next: ['b'] }, { id: 'b', enter: rule, ...more }], extra);

function run(r: PhaseRunner, from: number, to: number, feed: (t: number) => RunnerInputV2[], dt = 0.1): void {
  for (let n = Math.round(from / dt) + 1; n <= Math.round(to / dt); n++) r.advance(Math.round(n * dt * 1000) / 1000, feed(Math.round(n * dt * 1000) / 1000));
}

describe('PhaseRunner: what each entry read (B6)', () => {
  it('the initial entry reads nothing; an entry by its rule keeps each leaf with the value it read and its threshold', () => {
    const r = new PhaseRunner(ab({ all: [{ value: { var: 'etco2', op: '>', value: 45, forS: 5 } }, { value: { var: 'hr', op: '>', value: 100 } }] }));
    r.start(0);
    run(r, 0, 20, (t) => [truth({ etco2: t >= 2 ? 50 : 40, hr: 110 })]);
    expect(r.stateId).toBe('b');
    expect(r.phases[0]?.why).toBeUndefined();
    const why = r.phases[1]?.why ?? [];
    expect(why).toEqual([
      { key: 'phase:b.0', leaf: 'value', variable: 'etco2', op: '>', threshold: 45, value: 50, forS: 5, heldS: expect.closeTo(5, 6), met: true },
      { key: 'phase:b.1', leaf: 'value', variable: 'hr', op: '>', threshold: 100, value: 110, met: true },
    ]);
  });

  it('a slope leaf keeps the slope the ring gave and its window; an unchanged leaf its spread', () => {
    const rule: PhaseRule = { all: [{ slope: { var: 'etco2', op: '>', perMin: 0.2, overS: 60 } }, { unchanged: { var: 'setMinuteVentilationLMin', withinPct: 5, overS: 60 } }] };
    const r = new PhaseRunner(ab(rule));
    r.start(0);
    run(r, 0, 100, (t) => [truth({ etco2: 40 + (0.6 / 60) * t, setMinuteVentilationLMin: 6 })]);
    expect(r.stateId).toBe('b');
    const [slope, flat] = r.phases[1]?.why ?? [];
    expect(slope).toMatchObject({ leaf: 'slope', variable: 'etco2', op: '>', threshold: 0.2, forS: 60, met: true });
    expect(slope?.value).toBeCloseTo(0.6, 6);
    expect(flat).toMatchObject({ leaf: 'unchanged', variable: 'setMinuteVentilationLMin', op: '<=', threshold: 5, value: 0, forS: 60, met: true });
  });

  it('a phase hold is its own leaf, read before the entry resets it', () => {
    const r = new PhaseRunner(ab({ value: { var: 'etco2', op: '>', value: 45 } }, { holdS: 10 }));
    r.start(0);
    run(r, 0, 30, () => [truth({ etco2: 50 })]);
    expect(r.stateId).toBe('b');
    const hold = r.phases[1]?.why?.find((l) => l.leaf === 'hold');
    expect(hold).toMatchObject({ key: 'phase:b:hold', variable: 'b', op: '>=', threshold: 10, met: true });
    expect(hold?.value).toBeGreaterThanOrEqual(10 - 1e-6);
  });

  it('a leaf under `not`, a visited and a signal leaf are kept with the truth they gave', () => {
    const r = new PhaseRunner(card([
      { id: 'a', next: ['b'] },
      { id: 'b', enter: { all: [{ not: { value: { var: 'map', op: '<', value: 50 } } }, { visited: 'a' }, { signal: 'rhythm:sinus' }] } },
    ]));
    r.start(0);
    r.advance(1, [truth({ map: 70 }), { kind: 'rhythm', id: 'sinus' }]);
    expect(r.stateId).toBe('b');
    const why = r.phases[1]?.why ?? [];
    expect(why.map((l) => [l.key, l.leaf, l.met, l.not ?? false])).toEqual([
      ['phase:b.0.0', 'value', false, true], ['phase:b.1', 'visited', true, false], ['phase:b.2', 'signal', true, false],
    ]);
  });

  it('each script entry keeps the sim time it fired, beside `fired`; a restore rewinds both', () => {
    const doc = ab({ value: { var: 'etco2', op: '>', value: 45 } }, {}, { script: [{ id: 's1', on: 'phase:b', commands: [{ type: 'setCondition', condition: 'mh', severity: 1 } as never] }] });
    const r = new PhaseRunner(doc);
    r.start(0);
    const at2 = r.getState();
    r.advance(3, [truth({ etco2: 50 })]);
    expect(r.getState().firedT).toEqual({ s1: 3 });
    r.setState(at2);
    expect(r.getState().firedT).toBeUndefined();
  });

  it('a state written before B6 (no `why`, no `firedT`) restores and runs on; its later entries carry their reads', () => {
    const doc = card([{ id: 'a', next: ['b'] }, { id: 'b', enter: { value: { var: 'etco2', op: '>', value: 45 } }, next: ['c'] }, { id: 'c', enter: { value: { var: 'etco2', op: '>', value: 60 } } }],
      { script: [{ id: 's1', on: 'phase:b', commands: [{ type: 'setCondition', condition: 'mh', severity: 1 } as never] }] });
    const r = new PhaseRunner(doc);
    r.start(0);
    r.advance(3, [truth({ etco2: 50 })]);
    const old = r.getState();
    for (const p of old.phases) delete p.why;
    delete old.firedT; // as a bookmark, a position or a saved record written before B6 holds it
    const back = new PhaseRunner(doc);
    back.setState(old);
    back.advance(4, [truth({ etco2: 70 })]);
    expect(back.stateId).toBe('c');
    expect(back.phases.map((p) => [p.id, p.why?.length ?? 0])).toEqual([['a', 0], ['b', 0], ['c', 1]]);
    expect(back.getState().fired).toEqual(['s1']);
  });
});
