// B6 (scenario-builder.md §6): the run panel's two pure parts. "What fired, and why" formats the runner's own records
// (a phase entry's leaf reads, grade()'s windows, the script's firing times); "Apply from this phase's mark" is allowed
// only when the edit keeps what the mark's state names.
import { describe, expect, it } from 'vitest';
import { grade, PhaseRunner, type PhaseRunnerState, type RunnerInputV2, type ScenarioDocV2 } from '@pme/controller/scenario';
import { leafWords, markCompatible, refit, whatFired } from './run.ts';

const truth = (values: Record<string, number>): RunnerInputV2 => ({ kind: 'values', rank: 3, values });
const CARD: ScenarioDocV2 = {
  schema: 'pme-scenario/2', id: 'draft-mh', title: 'Draft MH', seed: 3, patient: { ageY: 35, weightKg: 80 },
  phases: [
    { id: 'latent', label: 'Latent', initial: true, next: ['early'] },
    { id: 'early', label: 'Early signs', enter: { all: [{ value: { var: 'etco2', op: '>', value: 45, forS: 5 } }, { slope: { var: 'etco2', op: '>', perMin: 0.2, overS: 30 } }] }, holdS: 2 },
  ],
  actions: [{ id: 'call', label: 'Call for help', kind: 'communication', phases: ['early'], window: { anchor: 'phase:early', withinS: 60 } }],
  script: [{ id: 'cond', on: 'phase:early', commands: [{ type: 'setCondition', condition: 'mh', severity: 1 } as never] }],
} as unknown as ScenarioDocV2;

function ran(doc = CARD, until = 120) {
  const r = new PhaseRunner(doc);
  r.start(0);
  for (let t = 1; t <= until; t++) r.advance(t, [truth({ etco2: 40 + 0.5 * t })]);
  return r;
}

describe('whatFired: the log from the runner’s records', () => {
  it('each phase entry with its leaves as read, the script entry at its time, the action opened and come due; newest first', () => {
    const r = ran();
    const st = r.getState();
    const lines = whatFired(CARD, st, grade(CARD, st.phases, st.admin, st.edges, 120), 120);
    const early = st.phases.find((p) => p.id === 'early')!;
    expect(lines.map((l) => [l.kind, l.head])).toEqual([
      ['action', 'Came due, not given: Call for help'],
      ['phase', 'Early signs entered by its rule'],
      ['script', 'Script (card-set) cond, on entering Early signs'],
      ['action', 'Opened: Call for help'],
      ['phase', 'Latent: the card starts here'],
    ]);
    const entry = lines.find((l) => l.kind === 'phase' && l.t === early.t)!;
    // the words carry the runner's own numbers, not new ones
    expect(entry.detail[0]).toBe(leafWords(early.why![0]!));
    expect(entry.detail[0]).toMatch(/^etco2 \S+ > 45, held \S+ of 5 s ✓$/);
    expect(entry.detail[1]).toMatch(/^etco2 slope \+\S+ \/min > 0\.2 \/min over 30 s ✓$/);
    expect(entry.detail[2]).toMatch(/^held \S+ of 2 s without a break ✓$/);
    expect(lines.find((l) => l.kind === 'script')?.detail).toEqual(['setCondition condition mh, severity 1']);
  });

  it('an action not yet due is not on the log; a state written before B6 (no firedT) leaves its script entries off', () => {
    const r = ran(CARD, 40);
    const st = r.getState();
    const early = st.phases.find((p) => p.id === 'early');
    expect(early).toBeDefined();
    const now = early!.t + 1;
    const lines = whatFired(CARD, { ...st, firedT: undefined }, grade(CARD, st.phases, st.admin, st.edges, now), now);
    expect(lines.some((l) => l.head.startsWith('Came due'))).toBe(false);
    expect(lines.some((l) => l.kind === 'script')).toBe(false);
  });

  it('a leaf under `not` marks the negation; no value yet says so', () => {
    expect(leafWords({ key: 'k', leaf: 'value', variable: 'map', op: '<', threshold: 50, value: 70, met: false, not: true })).toBe('not: map 70 < 50 ✓');
    expect(leafWords({ key: 'k', leaf: 'slope', variable: 'etco2', op: '>', threshold: 0.2, forS: 120, heldS: 30, met: false })).toBe('etco2 slope no value yet > 0.2 /min over 120 s ✗');
  });
});

describe('markCompatible: when Apply from this phase’s mark is allowed', () => {
  const edit = (f: (d: ScenarioDocV2) => void) => {
    const d = structuredClone(CARD);
    f(d);
    return d;
  };
  it('a threshold changed in place: allowed, and that leaf’s hold and its phase’s hold start again', () => {
    const fit = markCompatible(CARD, edit((d) => (((d.phases[1]!.enter as { all: Array<{ value?: { value: number } }> }).all[0]!.value!.value = 50))));
    expect(fit).toEqual({ ok: true, reset: { trueFor: ['phase:early.0'], holdFor: ['early'] } });
    expect(markCompatible(CARD, edit((d) => (d.phases[1]!.label = 'Early')))).toEqual({ ok: true, reset: { trueFor: [], holdFor: [] } });
  });
  it('refused, with the reason, when the mark would not mean the same', () => {
    const why = (d: ScenarioDocV2) => (markCompatible(CARD, d) as { why: string }).why;
    expect(why(edit((d) => (d.id = 'other')))).toMatch(/id changed/);
    expect(why(edit((d) => (d.patient = { ageY: 35, weightKg: 90 } as never)))).toMatch(/patient/);
    expect(why(edit((d) => (d.seed = 4)))).toMatch(/seed changed/);
    expect(why(edit((d) => (d.phases[1]!.id = 'early2')))).toMatch(/phase “latent”|phase “early”/);
    expect(why(edit((d) => (d.actions[0]!.id = 'shout')))).toMatch(/action “call”/);
    expect(why(edit((d) => (d.phases[1]!.enter = { all: [{ value: { var: 'hr', op: '>', value: 45, forS: 5 } }, { slope: { var: 'etco2', op: '>', perMin: 0.2, overS: 30 } }] })))).toMatch(/leaves added, removed or moved/);
  });
  it('refit drops the reset holds from a mark’s state and nothing else', () => {
    const st = ran().getState();
    const out: PhaseRunnerState = refit({ ...st, trueFor: { 'phase:early.0': 7, other: 3 }, holdFor: { early: 2 }, latched: { early: true } }, { trueFor: ['phase:early.0'], holdFor: ['early'] });
    expect(out.trueFor).toEqual({ other: 3 });
    expect(out.holdFor).toEqual({});
    expect(out.latched).toEqual({});
    expect(out.phases).toEqual(st.phases);
  });
});
