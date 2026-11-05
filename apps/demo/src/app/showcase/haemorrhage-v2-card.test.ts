// The haemorrhage /2 card (plan F9; design §4.2, §11; the owner's rulings of 5 November), pure: the phase runner and
// grade() on the card, no engine. The engine's course on it (and the VF measurement) is haemorrhage-v2.slow.test.ts.
import { describe, expect, it } from 'vitest';
import { grade, PhaseRunner, type Administration, type PhaseEntry, type RuleEdge, type RunnerInputV2, type ScenarioDocV2 } from '@pme/controller/scenario';
import { phaseRowsOf } from '../card-read.ts';
import { anyShowcaseDoc } from './harness.ts';

const doc = anyShowcaseDoc('showcase-haemorrhage-v2') as ScenarioDocV2;
const sig = (pulse: boolean): RunnerInputV2 => ({ kind: 'signals', signals: { pulse, dantroleneE: 0, setMinuteVentilationLMin: 6, map: pulse ? 80 : 10, mhActivity: 0, mhExcess: null } });
const rhythm = (id: string): RunnerInputV2 => ({ kind: 'rhythm', id });
const sbp = (v: number): RunnerInputV2 => ({ kind: 'values', rank: 3, values: { sbp: v } });

describe('showcase-haemorrhage-v2: the phases', () => {
  it('six phases, no VF phase (ruling 1: VF only from the physiology, which draws none on this course); only Post-resuscitation holds (120 s)', () => {
    expect(doc.phases.map((p) => p.id)).toEqual(['bleeding', 'decompensating', 'arrestPea', 'arrestAsystole', 'rosc', 'postResuscitation']);
    expect(doc.phases.filter((p) => p.holdS !== undefined).map((p) => [p.id, p.holdS])).toEqual([['postResuscitation', 120]]);
    expect(JSON.stringify(doc)).not.toMatch(/vfCoarse|vfFine|"defib"/);
  });

  it('the course on truth: systolic below 60 for 10 s → Decompensating; the pulse loss on a junctional rhythm → PEA; asystole → Asystole; a pulse → ROSC, held 120 s → Post-resuscitation', () => {
    const r = new PhaseRunner(doc);
    r.start(0);
    for (let t = 1; t <= 600; t++) {
      const pulse = t < 100 || t >= 300;
      r.advance(t, [sbp(t < 50 ? 90 : 55), sig(pulse), rhythm(t >= 200 && t < 300 ? 'asystole' : 'junctionalEscape')]);
    }
    expect(r.phases.map((p) => [p.id, p.t])).toEqual([['bleeding', 0], ['decompensating', 60], ['arrestPea', 100], ['arrestAsystole', 200], ['rosc', 300], ['postResuscitation', 420]]);
  });

  it('the junctional rhythm is card-set on Decompensating\'s entry, as on the /1 card; nothing else sets a rhythm', () => {
    const sets = [...doc.actions.flatMap((a) => a.give ?? []), ...(doc.script ?? []).flatMap((s) => s.commands)].filter((c) => c.type === 'setRhythm');
    expect(sets).toEqual([{ type: 'setRhythm', rhythm: 'junctionalEscape', opts: { rateBpm: 50 }, when: 'nextBeat' }]);
    expect(doc.script?.find((s) => s.commands.includes(sets[0]!))?.on).toBe('phase:decompensating');
  });

  it('the rhythm check stops the compressions and nothing else (ruling 1)', () => {
    expect(doc.actions.find((a) => a.id === 'rhythmCheck')?.give).toEqual([{ type: 'applyEvent', event: { kind: 'cpr', active: false } }]);
  });

  it('the arrest rows are rows of both arrest phases; stop CPR of ROSC and Post-resuscitation', () => {
    for (const p of ['arrestPea', 'arrestAsystole']) for (const id of ['cpr', 'epinephrine', 'rhythmCheck', 'massiveTransfusion']) expect(phaseRowsOf(doc, p).some((row) => row.kind === 'step' && row.actionId === id), `${p} ${id}`).toBe(true);
    expect(doc.actions.find((a) => a.id === 'stopCpr')?.phases).toEqual(['rosc', 'postResuscitation']);
  });
});

describe('showcase-haemorrhage-v2: the grades of the owner\'s rulings (5 November)', () => {
  const PH: PhaseEntry[] = [
    { id: 'bleeding', t: 0, exitT: 560, rule: 'initial' }, { id: 'decompensating', t: 560, exitT: 660, rule: 'enter:decompensating' },
    { id: 'arrestPea', t: 660, exitT: 900, rule: 'enter:arrestPea' }, { id: 'rosc', t: 900, rule: 'enter:rosc' },
  ];
  const edges: RuleEdge[] = [{ rule: 'pulseLoss', t: 660, value: true }, { rule: 'pulseLoss', t: 900, value: false }, { rule: 'rosc', t: 900, value: true }];
  let seq = 0;
  const a = (t: number, x: Partial<Administration>): Administration => ({ seq: ++seq, t, source: 'action', kind: 'drug', result: { accepted: true }, ...x });
  const cpr = (t: number) => a(t, { actionId: 'cpr', kind: 'cpr', settings: { active: 1, rate: 110 } });
  const epi = (t: number, route: 'iv' | 'im' = 'iv') => a(t, { actionId: 'epinephrine', drugId: 'epinephrine', dose: 1, unit: 'mg', route });
  const row = (admin: Administration[], id: string) => grade(doc, PH, admin, edges, 1200, { final: true }).actions.find((x) => x.id === id)!;

  it('CPR: within 30 s met; at +60 s overdue; at +279 s (the demo\'s) failed though started', () => {
    expect(row([cpr(680)], 'cpr').grade).toBe('met');
    expect(row([cpr(720)], 'cpr').grade).toBe('overdue');
    expect(row([cpr(939)], 'cpr').grade).toBe('failed');
  });
  it('epinephrine: every 180–300 s from the previous dose as given; none due after ROSC; 1 mg IV in ROSC a violation', () => {
    const r = row([epi(700), epi(878)], 'epinephrine');
    expect(r.repeats).toMatchObject([{ n: 2, grade: 'deviation', lines: ['interval 178 s, 180–300 s asked'] }]);
    expect(row([epi(700)], 'epinephrine').repeats).toEqual([]); // ROSC at 900, inside the window (880–1000): none due
    const g = grade(doc, PH, [epi(700), epi(950)], edges, 1200, { final: true });
    expect(g.violations.map((v) => [v.t, v.action])).toEqual([[950, 'epinephrine']]);
  });
  it('epinephrine IM (a route outside the set): the action stays open, no deviation, the dose recorded (ruling 6)', () => {
    const r = row([epi(700, 'im')], 'epinephrine');
    expect(r.grade).toBe('failed'); // the arrest ended with no dose by an allowed route
    expect(r.lines).toEqual(['route im not allowed']);
    expect(r.admin).toHaveLength(1);
  });
  it('call for help: a timed press, within 30 s of the pulse loss [placeholder]; never pressed → failed', () => {
    expect(row([a(670, { actionId: 'callForHelp', kind: 'communication' })], 'callForHelp').grade).toBe('met');
    expect(row([], 'callForHelp').grade).toBe('failed');
  });
  it('stop CPR within 120 s of ROSC (the /1 card\'s objective 3)', () => {
    expect(row([a(960, { actionId: 'stopCpr', kind: 'cpr', settings: { active: 0 } })], 'stopCpr').grade).toBe('met');
  });
});
