// The /1 → /2 converter (docs/plans/scenario-builder.md §7.2, piece B7), row by row of §7.2's table: what has an exact
// /2 form is carried and a test here proves the carried form means the same; what has none is a flag and nothing in its
// place (the owner's ruling BQ9 = C: no guessed rule, no placeholder threshold, no "equivalent" delay). Then the sixteen
// library cards: each converts to a draft the validator accepts apart from its flagged places, and its flags are counted
// against §7.2's census. Where the counts differ from what §7.2 lists, the difference is written in FINDINGS below with
// its reason, as a finding for the plan's owner: neither the plan's table nor any card is edited to make them agree.
import { PhaseRunner, ScenarioRunner, validateScenario, type RunnerInputV2, type ScenarioDoc, type ScenarioDocV2 } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../scenarios.ts';
import { convertV1, FLAG_KINDS, flagCovers, type FlagKind, type PortFlag } from './convert.ts';

const card = (states: ScenarioDoc['states'], extra: Partial<ScenarioDoc> = {}): ScenarioDoc => ({
  schema: 'pme-scenario/1', id: 'probe', title: 'Probe', seed: 5, initialState: states[0]!.id, states, ...extra,
});
const kinds = (flags: readonly PortFlag[]) => flags.map((f) => f.kind);
const SET_HR = (v: number) => ({ type: 'setTarget' as const, variable: 'hr' as const, value: v });

describe('§7.2 row by row', () => {
  it('the header is carried as it is; the format line becomes /2', () => {
    const doc = card([{ id: 'a', label: 'A' }], {
      $comment: 'c', notes: 'n', category: 'Airway', story: 's', durationMin: 12, takeHome: ['t'], mode: 'modeled',
      patient: { ageY: 40, weightKg: 70, baseline: { hr: 80 } }, device: { skin: 'x' }, briefing: { text: 'b', lang: 'en' },
    });
    const { draft, flags } = convertV1(doc);
    expect(draft.schema).toBe('pme-scenario/2');
    for (const k of ['$comment', 'id', 'title', 'notes', 'category', 'story', 'durationMin', 'takeHome', 'seed', 'mode', 'patient', 'device', 'briefing'] as const) expect(draft[k as keyof ScenarioDocV2], k).toEqual(doc[k as keyof ScenarioDoc]);
    expect(draft.phases).toEqual([{ id: 'a', label: 'A', initial: true }]);
    expect(flags).toEqual([]);
    expect(validateScenario(draft).ok).toBe(true);
  });

  it('the initial state’s onEnter becomes a script entry on the initial phase (the start’s commands, same tick)', () => {
    const { draft } = convertV1(card([{ id: 'a', label: 'A', onEnter: [SET_HR(90)] }]));
    expect(draft.script).toEqual([{ id: 'enter-a', on: 'phase:a', commands: [SET_HR(90)] }]);
  });

  it('manual: an action whose give is the commands /1 sends on that press (the source’s onExit, then the target’s onEnter), never graded, open in the phase the press is offered in', () => {
    const { draft, flags } = convertV1(card([
      { id: 'a', label: 'A', onExit: [SET_HR(70)], transitions: [{ id: 'go', to: 'b', when: { manual: { label: 'Give it' } } }] },
      { id: 'b', label: 'B', onEnter: [SET_HR(110)], transitions: [{ id: 'again', to: 'b', when: { manual: { label: 'Stay' } } }] },
    ]));
    expect(draft.actions).toEqual([
      { id: 'go', label: 'Give it', kind: 'procedure', graded: false, phases: ['a'], give: [SET_HR(70), SET_HR(110)] },
      // a press to the state it is in is a stay in /1: no command
      { id: 'again', label: 'Stay', kind: 'procedure', graded: false, phases: ['a'] },
    ]);
    // the press-entered state is not a phase: a /2 phase is entered only by its rule
    expect(draft.phases.map((p) => p.id)).toEqual(['a']);
    expect(flags).toEqual([]);
    expect(validateScenario(draft).ok).toBe(true);
    // what an A press sends equals what the /1 runner sends on the press, command for command
    const r1 = new ScenarioRunner(card([
      { id: 'a', label: 'A', onExit: [SET_HR(70)], transitions: [{ id: 'go', to: 'b', when: { manual: { label: 'Give it' } } }] },
      { id: 'b', label: 'B', onEnter: [SET_HR(110)] },
    ]));
    r1.start(0);
    r1.trigger(1, 'go');
    const sent = r1.advance(1).flatMap((e) => (e.kind === 'commands' ? e.commands : []));
    expect(sent).toEqual(draft.actions[0]!.give);
  });

  it('manual: the same press offered in several states is one action, open in each of their phases', () => {
    const { draft } = convertV1(card([
      { id: 'a', label: 'A', transitions: [{ id: 'fix1', to: 'z', when: { manual: { label: 'Fix' } } }, { id: 'worse', to: 'b', when: { vital: { var: 'spo2', op: '<', value: 90 } } }] },
      { id: 'b', label: 'B', transitions: [{ id: 'fix2', to: 'z', when: { manual: { label: 'Fix' } } }] },
      { id: 'z', label: 'Z', onEnter: [SET_HR(80)] },
    ]));
    expect(draft.actions).toEqual([{ id: 'fix1', label: 'Fix', kind: 'procedure', graded: false, phases: ['a', 'b'], give: [SET_HR(80)] }]);
  });

  it('event: flagged, and nothing in its place — a /2 script entry fires only on an A press, never on the learner’s own act', () => {
    const doc = card([
      { id: 'a', label: 'A', transitions: [{ id: 'prop', to: 'b', when: { event: { kind: 'drug', drugId: 'propofol' } } }] },
      { id: 'b', label: 'B', onEnter: [SET_HR(60)] },
    ]);
    const { draft, flags } = convertV1(doc);
    expect(kinds(flags)).toEqual(['event']);
    expect(flags[0]).toMatchObject({ from: '/states/0/transitions/0/when', at: '/actions' });
    expect(draft.actions).toEqual([]);
    expect(draft.script ?? []).toEqual([]);
    // why: in /1 the learner's own propofol fires the transition and its commands …
    const drug = { kind: 'drug', drugId: 'propofol', dose: 100, unit: 'mg', route: 'iv' } as never;
    const r1 = new ScenarioRunner(doc);
    r1.start(0);
    expect(r1.advance(1, [{ kind: 'clinical', event: drug }]).some((e) => e.kind === 'commands')).toBe(true);
    // … while the /2 form the table names (an action matched by the drug, the target's onEnter as a script entry on its
    // taking) fires that entry only when an A press takes the action (the driver counts a taking by its actionId), and
    // only on the first taking
    const v2: ScenarioDocV2 = {
      schema: 'pme-scenario/2', id: 'probe2', title: 'P', phases: [{ id: 'a', label: 'A', initial: true }],
      actions: [{ id: 'prop', label: 'Propofol', kind: 'drug', drug: { id: 'propofol' }, phases: ['a'] }],
      script: [{ id: 's', on: 'action:prop#1', commands: [SET_HR(60)] }],
    };
    expect(validateScenario(v2).ok).toBe(true);
    const r2 = new PhaseRunner(v2);
    r2.start(0);
    expect(r2.advance(1, [{ kind: 'clinical', event: drug } as RunnerInputV2]).some((e) => e.kind === 'commands')).toBe(false);
    expect(r2.take(2, 'prop').some((e) => e.kind === 'commands')).toBe(true);
    expect(r2.take(3, 'prop').some((e) => e.kind === 'commands')).toBe(false);
  });

  it('vital: a phase rule on the TRUTH variable of the same name, carried, and flagged for its change of rank', () => {
    const doc = card([
      { id: 'a', label: 'A', transitions: [{ id: 'down', to: 'b', when: { vital: { var: 'spo2', op: '<', value: 90, forS: 10 } } }] },
      { id: 'b', label: 'B', onEnter: [SET_HR(50)] },
    ]);
    const { draft, flags } = convertV1(doc);
    expect(draft.phases).toEqual([
      { id: 'a', label: 'A', initial: true, next: ['b'] },
      { id: 'b', label: 'B', enter: { value: { var: 'spo2', op: '<', value: 90, forS: 10 } } },
    ]);
    expect(draft.script).toEqual([{ id: 'enter-b', on: 'phase:b', commands: [SET_HR(50)] }]);
    expect(kinds(flags)).toEqual(['vital']);
    expect(flags[0]).toMatchObject({ from: '/states/0/transitions/0/when', at: '/phases/1/enter' });
    expect(validateScenario(draft).ok).toBe(true);
    // the rank: /1 reads the displayed number (rank 2) where /2 reads the truth (rank 3) — the same threshold and hold,
    // read on another value. A displayed SpO₂ of 85 for 10 s enters /1's state and not /2's phase; the truth enters both.
    const shown = (_t: number) => ({ kind: 'values' as const, rank: 2 as const, values: { spo2: 85 } });
    const truth = (_t: number) => ({ kind: 'values' as const, rank: 3 as const, values: { spo2: 85 } });
    const r1 = new ScenarioRunner(doc);
    const r2 = new PhaseRunner(draft);
    r1.start(0);
    r2.start(0);
    for (let t = 1; t <= 12; t++) {
      r1.advance(t, [shown(t)]);
      r2.advance(t, [shown(t)]);
    }
    expect([r1.stateId, r2.stateId]).toEqual(['b', 'a']);
    const r3 = new PhaseRunner(draft);
    r3.start(0);
    for (let t = 1; t <= 12; t++) r3.advance(t, [truth(t)]);
    expect(r3.stateId).toBe('b');
  });

  it('afterS: flagged, and no rule, delay or number in its place', () => {
    const { draft, flags } = convertV1(card([
      { id: 'a', label: 'A', transitions: [{ id: 'later', to: 'b', when: { afterS: 437 } }] },
      { id: 'b', label: 'B', onEnter: [SET_HR(50)] },
    ]));
    expect(kinds(flags)).toEqual(['afterS']);
    expect(flags[0]).toMatchObject({ at: '/phases/1/enter' });
    expect(flags[0]!.was).toContain('437');
    expect(JSON.stringify(draft)).not.toContain('437');
    expect(draft.phases[1]).toEqual({ id: 'b', label: 'B' });
    expect(draft.phases[0]!.next).toBeUndefined();
    // the validator refuses the draft only at the flagged place
    const v = validateScenario(draft);
    expect(v.ok).toBe(false);
    if (!v.ok) for (const e of v.errors) expect(flagCovers(flags, e), e).toBe(true);
  });

  it('afterS beside a press: the press is carried, the timer is flagged; the press entered a phase, so it is flagged too', () => {
    const { draft, flags } = convertV1(card([
      { id: 'a', label: 'A', transitions: [{ id: 'go', to: 'b', when: { any: [{ afterS: 60 }, { manual: { label: 'Start now' } }] } }] },
      { id: 'b', label: 'B', onEnter: [SET_HR(50)] },
    ]));
    expect(kinds(flags).sort()).toEqual(['afterS', 'pressIntoPhase']);
    expect(draft.actions).toEqual([{ id: 'go', label: 'Start now', kind: 'procedure', graded: false, phases: ['a'], give: [SET_HR(50)] }]);
    expect(JSON.stringify(draft)).not.toMatch(/afterS|holdS|atScenarioS/);
  });

  it('probability / else: flagged, and nothing of the transition in its place', () => {
    const { draft, flags } = convertV1(card([
      { id: 'a', label: 'A', transitions: [{ id: 'shock', to: 'b', probability: 0.3, else: 'c', when: { manual: { label: 'Shock' } } }] },
      { id: 'b', label: 'B', onEnter: [SET_HR(80)] },
      { id: 'c', label: 'C' },
    ]));
    expect(kinds(flags).sort()).toEqual(['manual', 'probability']);
    expect(draft.actions).toEqual([]);
    expect(JSON.stringify(draft)).not.toContain('0.3');
  });

  it('objectives: each flagged with what it was, nothing in its place', () => {
    const { draft, flags } = convertV1(card([{ id: 'a', label: 'A' }], {
      objectives: ['Watch the tidal volume', { text: 'Give epinephrine within 2 min', rule: { kind: 'eventWithin', after: 'state:a', event: 'drug:epinephrine', withinS: 120 } }, { text: 'Name it', debrief: 'recognition' }],
    }));
    expect(kinds(flags)).toEqual(['objective', 'objective', 'objective']);
    expect(flags.map((f) => f.from)).toEqual(['/objectives/0', '/objectives/1', '/objectives/2']);
    expect(flags[1]!.was).toContain('Give epinephrine within 2 min');
    expect(draft.actions).toEqual([]);
    expect(draft.outcomes).toBeUndefined();
  });

  it('a rule tried only after a press in /1, but from the phase’s entry in /2, is carried and flagged', () => {
    const { draft, flags } = convertV1(card([
      { id: 'a', label: 'A', transitions: [{ id: 'induce', to: 'i', when: { manual: { label: 'Induce' } } }] },
      { id: 'i', label: 'I', transitions: [{ id: 'desat', to: 'd', when: { vital: { var: 'spo2', op: '<', value: 90 } } }] },
      { id: 'd', label: 'D' },
    ]));
    expect(draft.phases.map((p) => [p.id, p.next])).toEqual([['a', ['d']], ['d', undefined]]);
    expect(kinds(flags).sort()).toEqual(['pressScope', 'vital']);
    expect(flags.find((f) => f.kind === 'pressScope')).toMatchObject({ at: '/phases/0/next/0' });
  });

  it('a command is carried verbatim, whatever its kind: the converter flags no command', () => {
    const cmds = [{ type: 'applyEvent' as const, event: { kind: 'condition', condition: 'anaphylaxis', severity: 0.8 } as never }, { type: 'device' as const, action: { device: 'nibp' as const, action: 'auto', intervalMin: 5 } }];
    const { draft, flags } = convertV1(card([
      { id: 'a', label: 'A', onEnter: cmds, transitions: [{ id: 'go', to: 'b', when: { manual: { label: 'Go' } } }] },
      { id: 'b', label: 'B', onEnter: cmds },
    ]));
    expect(flags).toEqual([]);
    expect(draft.script![0]!.commands).toEqual(cmds);
    expect(draft.actions[0]!.give).toEqual(cmds);
  });

  it('bookmarks: flagged (a /2 card has a stage mark at each phase entry, no authored bookmark)', () => {
    const { draft, flags } = convertV1(card([{ id: 'a', label: 'A' }], { bookmarks: [{ id: 'm', label: 'Mark', state: 'a' }] }));
    expect(kinds(flags)).toEqual(['bookmark']);
    expect('bookmarks' in draft).toBe(false);
  });

  it('every flag kind has its words', () => {
    for (const k of FLAG_KINDS) expect(k).toMatch(/^[a-z][A-Za-z]+$/);
  });
});

// ------------------------------------------------------------------------------------------------- the sixteen cards
/** §7.2's census: the leaves by kind in each card's `when` (and its objectives), as the plan counts them. */
const CENSUS: Record<string, { manual: number; event: number; vital: number; afterS: number; probability: number; objectives: number }> = {
  'acls-bradycardia-unstable': { manual: 2, event: 7, vital: 0, afterS: 2, probability: 2, objectives: 0 },
  'acls-pea-hypovolaemia': { manual: 3, event: 3, vital: 0, afterS: 3, probability: 1, objectives: 0 },
  'acls-vf-witnessed': { manual: 5, event: 4, vital: 1, afterS: 3, probability: 2, objectives: 0 },
  'depth-awareness': { manual: 0, event: 1, vital: 0, afterS: 1, probability: 0, objectives: 0 },
  'depth-light-anaesthesia': { manual: 0, event: 1, vital: 0, afterS: 1, probability: 0, objectives: 0 },
  'depth-opioid-apnoea': { manual: 1, event: 0, vital: 0, afterS: 0, probability: 0, objectives: 0 },
  'nmb-mh-trigger': { manual: 1, event: 0, vital: 0, afterS: 0, probability: 0, objectives: 0 },
  'nmb-residual-block': { manual: 0, event: 1, vital: 0, afterS: 1, probability: 0, objectives: 0 },
  'nmb-sux-burn': { manual: 1, event: 0, vital: 0, afterS: 0, probability: 0, objectives: 0 },
  'or-induction-hypotension': { manual: 1, event: 5, vital: 1, afterS: 1, probability: 0, objectives: 0 },
  'svt-adenosine': { manual: 1, event: 2, vital: 0, afterS: 2, probability: 1, objectives: 0 },
  'showcase-anaphylaxis': { manual: 2, event: 1, vital: 0, afterS: 1, probability: 0, objectives: 3 },
  'showcase-bronchospasm': { manual: 1, event: 1, vital: 0, afterS: 0, probability: 0, objectives: 3 },
  'showcase-induction': { manual: 17, event: 0, vital: 6, afterS: 1, probability: 0, objectives: 5 },
  'showcase-induction-premed': { manual: 7, event: 0, vital: 0, afterS: 3, probability: 0, objectives: 4 },
  'showcase-tamponade': { manual: 22, event: 0, vital: 3, afterS: 0, probability: 0, objectives: 5 },
};
/** The four cards §7.2 calls mechanical as they stand. */
const MECHANICAL = ['depth-opioid-apnoea', 'nmb-mh-trigger', 'nmb-sux-burn', 'showcase-bronchospasm'];

/**
 * FINDINGS: the flags the converter writes that §7.2 does not list, by card and kind, each kind with its reason. §7.2
 * flags a card's `vital`, `afterS` and `probability` leaves and an objective that reads a press; the converter writes
 * those exactly as the census counts them, and these besides. Filled from the converter's output and checked here, so a
 * change in either shows.
 */
const FINDINGS: Record<string, Partial<Record<FlagKind, number>>> = {};

const PORTED = LIBRARY.filter((c) => (c.doc as { schema: string }).schema === 'pme-scenario/1' && !['showcase-mh', 'showcase-haemorrhage'].includes(c.id));

describe('the sixteen library cards (§7.2)', () => {
  it('are the sixteen of the census', () => {
    expect(PORTED.map((c) => c.id).sort()).toEqual(Object.keys(CENSUS).sort());
  });

  for (const c of PORTED) {
    it(`${c.id}: the draft validates apart from its flagged places; its flags are §7.2's, and the findings`, () => {
      const doc = c.doc as ScenarioDoc;
      const { draft, flags } = convertV1(doc);
      const v = validateScenario(draft);
      const errors = v.ok ? [] : v.errors;
      for (const e of errors) expect(flagCovers(flags, e), `${c.id}: ${e} is not a flagged place`).toBe(true);
      const n = (k: FlagKind) => flags.filter((f) => f.kind === k).length;
      const want = CENSUS[c.id]!;
      // §7.2's flags, as the census counts them
      expect({ vital: n('vital'), afterS: n('afterS'), probability: n('probability') }, c.id).toEqual({ vital: want.vital, afterS: want.afterS, probability: want.probability });
      // every objective is flagged (the census's last column); none is carried
      expect(n('objective'), c.id).toBe(want.objectives);
      // what is left over is the finding, kind by kind
      const rest: Partial<Record<FlagKind, number>> = {};
      for (const k of FLAG_KINDS) if (!['vital', 'afterS', 'probability', 'objective'].includes(k) && n(k)) rest[k] = n(k);
      expect(rest, `${c.id}: flags beyond §7.2`).toEqual(FINDINGS[c.id] ?? {});
      // every flag says what the beat was, where, and what a port must decide
      for (const f of flags) {
        expect(f.from, JSON.stringify(f)).toMatch(/^\//);
        expect(f.at, JSON.stringify(f)).toMatch(/^\//);
        expect(f.was.length, JSON.stringify(f)).toBeGreaterThan(0);
        expect(f.decide.length, JSON.stringify(f)).toBeGreaterThan(0);
      }
      // the draft is a pme-scenario/2 document of the same card, carrying every command it carries verbatim
      expect(draft.schema).toBe('pme-scenario/2');
      expect(draft.id).toBe(doc.id);
      const v1Commands = new Set(doc.states.flatMap((s) => [...(s.onEnter ?? []), ...(s.onExit ?? [])]).map((x) => JSON.stringify(x)));
      for (const x of [...draft.actions.flatMap((a) => a.give ?? []), ...(draft.script ?? []).flatMap((s) => s.commands)]) expect(v1Commands.has(JSON.stringify(x)), JSON.stringify(x)).toBe(true);
    });
  }

  it('§7.2’s four mechanical cards: what the converter flags in each', () => {
    // printed into the findings: §7.2 says these four carry over with no flag; the converter's flags on them are listed
    const got = Object.fromEntries(MECHANICAL.map((id) => [id, kinds(convertV1(PORTED.find((c) => c.id === id)!.doc as ScenarioDoc).flags)]));
    expect(Object.keys(got)).toEqual(MECHANICAL);
    for (const id of MECHANICAL) expect(got[id]!.filter((k) => k !== 'objective' && !(k in (FINDINGS[id] ?? {}))), id).toEqual([]);
  });

  it('the converter is pure: the card is unchanged and two runs give the same', () => {
    for (const c of PORTED) {
      const before = JSON.stringify(c.doc);
      expect(JSON.stringify(convertV1(c.doc as ScenarioDoc))).toBe(JSON.stringify(convertV1(c.doc as ScenarioDoc)));
      expect(JSON.stringify(c.doc)).toBe(before);
    }
  });
});
