// Plan learner-action-remote.md L5 (§6): the /2 format learns who gave a drug and how it was prepared. Each line of §6
// is a case here: a learner's give is `source: 'learner'` with its device key `by` and its preparation's record; an
// infusion change records the rate it replaced and who had set it (LQ4); a card's `diluent` criterion gives a deviation
// line; a staged wrong-diluent preparation not delivered is a `preparations` deviation, delivered it is a `formulary`
// violation with `harm` per §6 (an incompatible admixture follows the same two steps); a learner's `lab abg` satisfies a
// card's sample action with `sample: { panel: ['abg'] }` in its window; an old runner state restores. And the guard of
// the acceptance: a card that uses none of it grades with exactly the shape it had (no `preparations`, no `source`).
import { describe, expect, it } from 'vitest';
import type { Command } from '@pme/engine-core';
import type { Finding } from '../../src/formulary/findings.ts';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { grade } from '../../src/scenario/grade.ts';
import { PhaseRunner } from '../../src/scenario/phase-runner.ts';
import type { Action, Administration, PhaseEntry, PhaseRunnerState, PrepRecord, ScenarioDocV2, StagedPrep } from '../../src/scenario/types-v2.ts';
import { validateScenario } from '../../src/scenario/validate.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { minimalV2 } from './fixtures-v2.ts';

const KEY = 'bed2remote01';
const WRONG: Finding = { kind: 'wrongDiluent', drugId: 'dantrolene', against: 'diluent', other: 'saline', statement: null, src: null };
const NOT_TESTED: Finding = { kind: 'notTested', drugId: 'dantrolene', against: 'diluent', other: 'saline', statement: null, src: null };
const INCOMPATIBLE: Finding = { kind: 'incompatible', drugId: 'calciumChloride', against: 'admixture', other: 'sodiumBicarbonate', statement: 'a precipitate of calcium carbonate', src: 'trissel2013' };

/** A staged preparation of dantrolene by the learner's device, with these findings. */
const staged = (id: string, t: number, findings: Finding[], extra: Partial<StagedPrep> = {}): StagedPrep => ({
  id, by: KEY, t, drugId: 'dantrolene', productId: 'dantrium-20mg', diluent: 'water',
  concentration: { amount: 20, unit: 'mg', perMl: 0.333 }, volumeMl: 60, findings, notice: null, ...extra,
});
/** Its record at a give: the active amount at `remaining`. */
const given = (s: StagedPrep, remaining: number): PrepRecord => {
  const { t: _t, by: _by, ...rest } = s;
  return { ...rest, remaining, activeAmount: 200 * remaining, unit: 'mg' };
};

/** A card of two phases (`base` initial, `early` from 100 s) for an 80-kg patient. */
const card = (actions: Array<Partial<Action>>): ScenarioDocV2 => ({
  schema: 'pme-scenario/2', id: 'l5', title: 'L5', patient: { weightKg: 80 },
  phases: [{ id: 'base', label: 'Base', initial: true, next: ['early'] }, { id: 'early', label: 'Early' }],
  actions: actions.map((a) => ({ id: 'x', label: 'X', kind: 'drug', phases: ['early'], ...a }) as Action),
});
const PH: PhaseEntry[] = [{ id: 'base', t: 0, exitT: 100, rule: 'initial' }, { id: 'early', t: 100, rule: 'enter:early' }];
let seq = 0;
const adm = (t: number, x: Partial<Administration>): Administration => ({ seq: ++seq, t, source: 'learner', by: KEY, kind: 'drug', result: { accepted: true }, ...x });
const dan = (t: number, x: Partial<Administration> = {}) => adm(t, { drugId: 'dantrolene', dose: 200, unit: 'mg', perKg: 2.5, route: 'iv', ...x });
const DAN: Partial<Action> = { drug: { id: 'dantrolene', dose: { min: 2, max: 3, unit: 'mg/kg' } }, window: { anchor: 'phase:early', withinS: 300 } };

describe('§6: a learner\'s give in the administration record (driver.ts administrationOf)', () => {
  const CARD = {
    schema: 'pme-scenario/2', id: 'l5rec', title: 'L5 record', patient: { weightKg: 80 },
    phases: [{ id: 'calm', label: 'Calm', initial: true }],
    actions: [
      { id: 'dantrolene', label: 'Dantrolene', kind: 'drug', phases: ['calm'], drug: { id: 'dantrolene' } },
      // a card's give cannot send a lab event (the /1 command schema has none); the A press below is the panel's own lab
      // command stamped with the action's id, as an A press is
      { id: 'abg', label: 'Send an ABG', kind: 'sample', phases: ['calm'] },
    ],
  };
  function rig(preps: Record<string, PrepRecord> = {}) {
    const host = manualHost({ seed: 42 });
    const driver = new ScenarioDriver({ target: host, preparation: (by, id) => (by === KEY ? preps[id] : undefined) });
    expect(driver.load(CARD).ok).toBe(true);
    host.engine.advanceTo(1);
    driver.poll();
    return { host, driver };
  }
  const cmd = (id: string, issuedBy: string, event: object, extra: object = {}) => ({ id, issuedBy, type: 'applyEvent', event, ...extra }) as unknown as Command;

  it('a learner\'s give is source "learner" with the device key as `by`; an instructor\'s stays "panel", a phone\'s "remote", without `by`', () => {
    const { host, driver } = rig();
    const t = host.engine.now().simT;
    const GIVE = { kind: 'drug', drugId: 'dantrolene', dose: 200, unit: 'mg', route: 'iv' };
    driver.host.dispatch(cmd('l1', 'learner', GIVE, { by: KEY }));
    driver.host.dispatch(cmd('p1', 'instructor', GIVE));
    driver.host.dispatch(cmd('r1', 'remote', GIVE, { by: 'ignored' }));
    expect(driver.phaseRunner!.admin.map((a) => [a.source, a.by])).toEqual([['learner', KEY], ['panel', undefined], ['remote', undefined]]);
    expect(driver.phaseRunner!.admin[0]).toEqual({ seq: 1, t, source: 'learner', by: KEY, kind: 'drug', drugId: 'dantrolene', cls: 'dantrolene', dose: 200, unit: 'mg', perKg: 2.5, route: 'iv', result: { accepted: true } });
  });

  it('a give that names its preparation (`prepId`) copies the host\'s record of it; an unknown or foreign one copies nothing', () => {
    const p = given(staged('ab12cd34', 0, [WRONG, NOT_TESTED]), 1);
    const { driver } = rig({ ab12cd34: p });
    const GIVE = { kind: 'drug', drugId: 'dantrolene', dose: 200, unit: 'mg', route: 'iv' };
    driver.host.dispatch(cmd('l1', 'learner', GIVE, { by: KEY, prepId: 'ab12cd34' }));
    driver.host.dispatch(cmd('l2', 'learner', GIVE, { by: KEY, prepId: 'zz99zz99' }));
    driver.host.dispatch(cmd('l3', 'learner', GIVE, { by: 'otherdevice1', prepId: 'ab12cd34' }));
    const [a, b, c] = driver.phaseRunner!.admin;
    expect(a!.prep).toEqual(p);
    expect(a!.prep).not.toBe(p); // a copy: the host's table may change after the give
    expect(b!.prep).toBeUndefined();
    expect(c!.prep).toBeUndefined();
  });

  it('a learner\'s infusion change records the rate it replaced and who had set it (LQ4); the first start replaces nothing', () => {
    const { driver } = rig();
    const inf = (rate: number) => ({ kind: 'infusion', drugId: 'propofol', rate, unit: 'mL/h', concentration: { amount: 10, unit: 'mg', perMl: 1 } });
    driver.host.dispatch(cmd('p1', 'instructor', inf(20)));
    driver.host.dispatch(cmd('l1', 'learner', inf(30), { by: KEY }));
    driver.host.dispatch(cmd('l2', 'learner', inf(0), { by: 'bed2remote02' }));
    const [p, l1, l2] = driver.phaseRunner!.admin;
    expect(p!.replaced).toBeUndefined(); // an instructor's record is as it was
    expect(l1!.replaced).toEqual({ rate: 20, rateUnit: 'mL/h', by: 'panel' });
    expect(l2!.replaced).toEqual({ rate: 30, rateUnit: 'mL/h', by: KEY });
    driver.host.dispatch(cmd('l3', 'learner', { ...inf(10), drugId: 'remifentanil' }, { by: KEY }));
    expect(driver.phaseRunner!.admin.at(-1)!.replaced).toBeUndefined();
  });

  it('a lab sample from the learner or the panel is a `sample` record with its panel; an A press of a sample action is recorded by its taking, as before', () => {
    const { host, driver } = rig();
    const t = host.engine.now().simT;
    driver.host.dispatch(cmd('l1', 'learner', { kind: 'lab', panel: 'abg' }, { by: KEY }));
    driver.host.dispatch(cmd('p1', 'instructor', { kind: 'lab', panel: 'vbg' }));
    driver.host.dispatch(cmd('a1', 'instructor', { kind: 'lab', panel: 'abg' }, { actionId: 'abg', stageGroup: 'press-1' }));
    expect(driver.phaseRunner!.admin).toEqual([
      { seq: 1, t, source: 'learner', by: KEY, kind: 'sample', settings: { panel: 'abg' }, result: { accepted: true } },
      { seq: 2, t, source: 'panel', kind: 'sample', settings: { panel: 'vbg' }, result: { accepted: true } },
      { seq: 3, t, source: 'action', actionId: 'abg', kind: 'sample', result: { accepted: true } },
    ]);
  });

  it('a staged preparation goes into the runner state (recordPreparation), replacing its earlier copy (the notice shown later)', () => {
    const { driver } = rig();
    const s = staged('ab12cd34', 1, [WRONG]);
    driver.recordPreparation(s);
    driver.recordPreparation({ ...s, notice: { shownAt: 5 } });
    driver.recordPreparation(staged('ab12cd34', 2, [], { by: 'bed2remote02' })); // another device's own id space
    expect(driver.phaseRunner!.preps).toEqual([{ ...s, notice: { shownAt: 5 } }, staged('ab12cd34', 2, [], { by: 'bed2remote02' })]);
  });
});

describe('§6: an old runner state restores', () => {
  it('a pme-scenario-runner/2 state written before L5 (no `preps`) restores, grades and takes a preparation', () => {
    const doc = minimalV2() as unknown as ScenarioDocV2;
    const r = new PhaseRunner(doc);
    r.start(0);
    const old = r.getState();
    expect('preps' in old).toBe(false); // a run that stages nothing writes the state it wrote before L5
    const r2 = new PhaseRunner(doc);
    r2.setState(JSON.parse(JSON.stringify(old)) as PhaseRunnerState);
    expect(r2.preps).toEqual([]);
    r2.stage(staged('ab12cd34', 1, [WRONG]));
    expect(r2.getState().preps).toHaveLength(1);
    r2.setState(old); // and a restore rewinds the preparations with the course
    expect(r2.preps).toEqual([]);
  });
});

describe('§6: grading a learner\'s preparation (grade.ts)', () => {
  it('a card\'s `diluent` criterion gives the deviation line "diluent saline, water asked"', () => {
    const act: Partial<Action> = { ...DAN, drug: { ...DAN.drug!, diluent: { set: ['water'] } } };
    const bad = given(staged('ab12cd34', 110, [WRONG], { diluent: 'saline' }), 1);
    const g = grade(card([act]), PH, [dan(150, { prep: bad })], [], 200);
    expect(g.actions[0]).toMatchObject({ grade: 'deviation', lines: ['diluent saline, water asked'], live: 'deviation: diluent saline, water asked' });
    const good = given(staged('ab12cd35', 110, []), 1);
    expect(grade(card([act]), PH, [dan(150, { prep: good })], [], 200).actions[0]!.grade).toBe('met');
    // a give with no preparation (the laptop's Drug sheet, LQ10) cannot show the diluent asked
    expect(grade(card([act]), PH, [dan(150, { source: 'panel' })], [], 200).actions[0]!.lines).toEqual(['diluent not recorded, water asked']);
    // drawn as it is (no diluent) when one is asked
    const neat = given(staged('ab12cd36', 110, [], { diluent: undefined }), 1);
    delete (neat as { diluent?: string }).diluent;
    expect(grade(card([act]), PH, [dan(150, { prep: neat })], [], 200).actions[0]!.lines).toEqual(['no diluent, water asked']);
  });

  it('a staged wrong-diluent preparation never delivered is a `preparations` deviation, and no violation', () => {
    const s = staged('ab12cd34', 120, [WRONG, NOT_TESTED], { diluent: 'saline' });
    const g = grade(card([DAN]), PH, [], [], 200, { preparations: [s] });
    expect(g.preparations).toEqual([{ prepId: 'ab12cd34', t: 120, by: KEY, drugId: 'dantrolene', findings: [WRONG, NOT_TESTED], delivered: false, grade: 'deviation' }]);
    expect(g.violations).toEqual([]);
  });

  it('delivered (any volume), it is a `formulary` violation: harm "modelled" when the source\'s figures reduced the active amount, else "not modelled"', () => {
    const s = staged('ab12cd34', 120, [WRONG], { diluent: 'saline' });
    const full = dan(150, { prep: given(s, 1) });
    const g = grade(card([DAN]), PH, [full], [], 200, { preparations: [s] });
    expect(g.preparations).toEqual([{ prepId: 'ab12cd34', t: 120, by: KEY, drugId: 'dantrolene', findings: [WRONG], delivered: true, grade: 'violation' }]);
    expect(g.violations).toEqual([{ t: 150, seq: full.seq, action: 'prep:ab12cd34', text: 'dantrolene prepared in saline, a diluent its label does not list', harm: 'not modelled', source: 'formulary' }]);
    const lost = dan(160, { prep: given(s, 0.8) });
    expect(grade(card([DAN]), PH, [lost], [], 200, { preparations: [s] }).violations[0]).toMatchObject({ harm: 'modelled', source: 'formulary' });
    // the give itself still satisfies the card's action: the formulary grades the preparation, the card the dose
    expect(g.actions[0]!.grade).toBe('met');
  });

  it('an incompatible admixture follows the same two steps; a give the engine refused delivered nothing', () => {
    const s = staged('ef56gh78', 120, [INCOMPATIBLE], { drugId: 'calciumChloride', diluent: undefined });
    expect(grade(card([DAN]), PH, [], [], 200, { preparations: [s] }).preparations![0]!.grade).toBe('deviation');
    const give = adm(150, { drugId: 'calciumChloride', dose: 1, unit: 'g', route: 'iv', prep: given(s, 1) });
    const g = grade(card([DAN]), PH, [give], [], 200, { preparations: [s] });
    expect(g.preparations![0]).toMatchObject({ delivered: true, grade: 'violation' });
    expect(g.violations[0]!.text).toBe('calciumChloride incompatible with sodiumBicarbonate in the preparation: a precipitate of calcium carbonate');
    const refused = { ...give, result: { accepted: false as const, reason: 'no', routeNotModelled: false } };
    const r = grade(card([DAN]), PH, [refused], [], 200, { preparations: [s] });
    expect(r.preparations![0]).toMatchObject({ delivered: false, grade: 'deviation' });
    expect(r.violations).toEqual([]);
  });

  it('a delivered preparation the run did not see staged is still graded, from the give\'s own record; a clean one is "ok"', () => {
    const clean = staged('ok00ok00', 120, []);
    const g = grade(card([DAN]), PH, [dan(150, { prep: given(staged('ab12cd34', 0, [WRONG]), 1) })], [], 200, { preparations: [clean] });
    expect(g.preparations!.map((p) => [p.prepId, p.t, p.delivered, p.grade])).toEqual([['ok00ok00', 120, false, 'ok'], ['ab12cd34', 150, true, 'violation']]);
  });

  it('a learner\'s `lab abg` satisfies a card\'s sample action with `sample: { panel: [\'abg\'] }` in its window; another panel does not', () => {
    const SAMPLE: Partial<Action> = { kind: 'sample', sample: { panel: ['abg'] }, window: { anchor: 'phase:early', withinS: 120 } };
    const lab = (t: number, panel: string) => adm(t, { kind: 'sample', settings: { panel } });
    expect(grade(card([SAMPLE]), PH, [lab(150, 'abg')], [], 200).actions[0]).toMatchObject({ grade: 'met', givenT: 150 });
    expect(grade(card([SAMPLE]), PH, [lab(150, 'vbg')], [], 200).actions[0]!.grade).toBe('due');
    expect(grade(card([SAMPLE]), PH, [lab(260, 'abg')], [], 300).actions[0]!.grade).toBe('overdue');
    // the A press of the action itself still counts; a sample action without `sample` is recorded by its taking only (as today)
    expect(grade(card([SAMPLE]), PH, [adm(150, { source: 'action', actionId: 'x', kind: 'sample' })], [], 200).actions[0]!.grade).toBe('met');
    const bare: Partial<Action> = { kind: 'sample', window: { anchor: 'phase:early', withinS: 120 } };
    expect(grade(card([bare]), PH, [lab(150, 'abg')], [], 200).actions[0]!.grade).toBe('due');
  });

  it('a card that uses none of it grades with the shape it had: no `preparations` key, no violation `source`', () => {
    const act: Partial<Action> = { ...DAN, contraindications: [{ text: 'propofol', match: { drugId: 'propofol' } }] };
    const g = grade(card([act]), PH, [dan(150, { source: 'panel', by: undefined }), adm(160, { source: 'panel', drugId: 'propofol', dose: 1, unit: 'mg/kg', route: 'iv' })], [], 200);
    expect(Object.keys(g)).toEqual(['actions', 'outcomes', 'violations']);
    expect(Object.keys(g.violations[0]!)).toEqual(['t', 'seq', 'action', 'text', 'harm']);
  });
});

describe('§6: the schema and the validator (pme-scenario-2.schema.json, validate.ts)', () => {
  const withAction = (a: Record<string, unknown>) => ({ ...minimalV2(), actions: [...minimalV2().actions, a] });
  it('accepts `drug.diluent` and `sample` on a sample action', () => {
    const doc = minimalV2();
    doc.actions[0].drug.diluent = { set: ['water'] };
    const r = validateScenario(withAction({ id: 'abg', label: 'ABG', kind: 'sample', phases: ['early'], sample: { panel: ['abg', 'vbg'] } }));
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect(validateScenario(doc).ok).toBe(true);
  });
  it('refuses an empty diluent set or panel list, an unknown key, and `sample` on another kind', () => {
    const doc = minimalV2();
    doc.actions[0].drug.diluent = { set: [] };
    expect(validateScenario(doc).ok).toBe(false);
    expect(validateScenario(withAction({ id: 'abg', label: 'ABG', kind: 'sample', phases: ['early'], sample: { panel: [] } })).ok).toBe(false);
    expect(validateScenario(withAction({ id: 'abg', label: 'ABG', kind: 'sample', phases: ['early'], sample: { panel: ['abg'], extra: 1 } })).ok).toBe(false);
    const r = validateScenario(withAction({ id: 'abg', label: 'ABG', kind: 'procedure', phases: ['early'], sample: { panel: ['abg'] } }));
    expect(r.ok).toBe(false);
    expect(r.ok ? [] : r.errors).toContain('/actions/1/sample: only a sample action has "sample"');
  });
  it('warns of a panel the engine does not draw (the card stays valid; no sample can ever satisfy it)', () => {
    const r = validateScenario(withAction({ id: 'chem', label: 'Chemistry', kind: 'sample', phases: ['early'], sample: { panel: ['chem'] } }));
    expect(r.ok).toBe(true);
    expect(r.warnings).toContain('/actions/1/sample/panel/0: "chem" is not a panel the engine draws (abg, vbg)');
  });
});
