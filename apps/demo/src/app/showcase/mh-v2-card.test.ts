// Decision D4 (review S1) on the MH /2 card: Arrest and ROSC are exempt from the 60-s hold (a pulseless patient is shown
// pulseless at once), and the CPR row is open in every phase, its window running from the model's pulse loss, so a
// press from its row can be in time. Pure: the phase runner and grade() on the card, no engine.
import { describe, expect, it } from 'vitest';
import { grade, PhaseRunner, type RunnerInputV2, type ScenarioDocV2 } from '@pme/controller/scenario';
import { phaseRowsOf } from '../card-read.ts';
import { anyShowcaseDoc } from './harness.ts';

const doc = anyShowcaseDoc('showcase-mh-v2') as ScenarioDocV2;
const sig = (pulse: boolean): RunnerInputV2 => ({ kind: 'signals', signals: { pulse, dantroleneE: 0, setMinuteVentilationLMin: 6, map: pulse ? 80 : 20, mhActivity: 0, mhExcess: null } });

describe('showcase-mh-v2: Arrest at once, CPR from the pulse loss in every phase (D4)', () => {
  it('Arrest and ROSC carry no hold; every other phase but Baseline keeps the owner\'s 60 s', () => {
    expect(doc.phases.filter((p) => p.holdS === undefined).map((p) => p.id)).toEqual(['baseline', 'arrest', 'rosc']);
    expect(new Set(doc.phases.filter((p) => p.holdS !== undefined).map((p) => p.holdS))).toEqual(new Set([60]));
  });

  it('a pulse loss in Baseline enters Arrest on the next advance, and its return enters ROSC at once', () => {
    const r = new PhaseRunner(doc);
    r.start(0);
    for (let t = 1; t <= 100; t++) r.advance(t, [sig(t < 50 || t >= 80)]);
    expect(r.phases.map((p) => [p.id, p.t])).toEqual([['baseline', 0], ['arrest', 50], ['rosc', 80]]);
  });

  it('the CPR row is a row of every phase; a press 20 s after a pulse loss in Latent is met', () => {
    for (const p of doc.phases) expect(phaseRowsOf(doc, p.id).some((row) => row.kind === 'step' && row.actionId === 'cpr'), p.id).toBe(true);
    const phases = [{ id: 'baseline', t: 0, exitT: 400, rule: 'initial' }, { id: 'latent', t: 400, rule: 'enter:latent' }];
    const edges = [{ rule: 'pulseLoss', t: 600, value: true }];
    const admin = [{ seq: 1, t: 620, source: 'action' as const, actionId: 'cpr', kind: 'cpr' as const, settings: { active: 1, rate: 110 }, result: { accepted: true } }];
    const cpr = grade(doc, phases, admin, edges, 700, { final: true }).actions.find((a) => a.id === 'cpr');
    expect(cpr).toMatchObject({ grade: 'met', dueT: 600, givenT: 620 });
    expect(grade(doc, phases, [], [], 700, { final: true }).actions.find((a) => a.id === 'cpr')?.grade).toBe('not applicable');
  });
});
