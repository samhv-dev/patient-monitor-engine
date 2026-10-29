// card-read.ts on the two demo cards (Instructor v2, IP3): the strip's stages with the hops folded in, the ACTION rows of
// the fan-out and PEA moments, the mixed transition as a step, every manual label resolving to its own transition as
// today's Scenario tab resolves it, every press of the two showcase slow tests found as a step of the state it is
// pressed in, the objectives that ride on a step (answer 6) and reachability (answer 7).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { manualLabel, type ScenarioDoc } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { conditionNotMet, isHop, objectivesOf, reachable, rowsOf, stageOf, stagesOf, stepCommand, type Row } from './card-read.ts';
import { showcaseDoc } from './showcase/harness.ts';

const MH = showcaseDoc('showcase-mh');
const HAEM = showcaseDoc('showcase-haemorrhage');
const kinds = (rows: Row[]) => rows.map((r) => r.kind);
const of = (rows: Row[], k: Row['kind']) => rows.filter((r) => r.kind === k);
const state = (doc: ScenarioDoc, id: string) => doc.states.find((s) => s.id === id);
const tr = (doc: ScenarioDoc, id: string) => doc.states.flatMap((s) => s.transitions ?? []).find((t) => t.id === id)!;

describe('stagesOf (answer 2: hops fold into the state their exit leads to)', () => {
  it('MH: 14 stages in document order; the five 2-second treatment states fold into treating; triggerOff and treating are two stages', () => {
    const st = stagesOf(MH);
    expect(st.map((s) => s.id)).toEqual(['awake', 'premedicated', 'preoxygenated', 'induced', 'intubated', 'surgery', 'earlySigns', 'established', 'triggerOff', 'treating', 'recovering', 'normoventilated', 'arrest', 'cpr']);
    expect(st.find((s) => s.id === 'treating')?.states).toEqual(['treating', 'dantrolene', 'dantroleneAgain', 'cooling', 'potassium', 'bicarbonate']);
    expect(st.filter((s) => s.states.length > 1).map((s) => s.id)).toEqual(['treating']);
    expect(st.find((s) => s.id === 'treating')?.label).toBe('MH treatment under way');
    expect(MH.states.filter(isHop).length + st.length).toBe(MH.states.length);
  });

  it('MH: "auto" on the stages a rule enters (early signs, established, recovering, arrest), not on those only a press enters', () => {
    expect(stagesOf(MH).filter((s) => s.byRule).map((s) => s.id)).toEqual(['earlySigns', 'established', 'recovering', 'arrest']);
  });

  it('haemorrhage: the epinephrine and volume hops fold into the "continuing" states; junctional is entered by its rule too', () => {
    const st = stagesOf(HAEM);
    expect(st.map((s) => s.id)).toEqual(['bleeding', 'bleedingO2', 'ventilated', 'junctional', 'pea', 'asystole', 'cpr', 'cprRunning', 'vf', 'postShock1', 'vf2', 'postShock2', 'postShock1Running', 'postShock2Running', 'rosc']);
    expect(st.find((s) => s.id === 'cprRunning')?.states).toEqual(['cprRunning', 'cprVolume', 'cprEpi']);
    expect(st.find((s) => s.id === 'postShock1Running')?.states).toEqual(['postShock1Running', 'postShock1Epi']);
    expect(st.find((s) => s.id === 'postShock2Running')?.states).toEqual(['postShock2Running', 'postShock2Epi']);
    expect(st.filter((s) => s.byRule).map((s) => s.id)).toEqual(['junctional', 'pea', 'asystole', 'postShock1', 'postShock2']);
  });

  it('stageOf: a hop belongs to the stage it folds into; an unknown state to none', () => {
    expect(stageOf(MH, 'dantroleneAgain')?.id).toBe('treating');
    expect(stageOf(MH, 'triggerOff')?.id).toBe('triggerOff');
    expect(stageOf(HAEM, 'cprEpi')?.id).toBe('cprRunning');
    expect(stageOf(MH, 'nowhere')).toBeNull();
  });
});

describe('rowsOf (the ACTION list of a state, in the card\'s order)', () => {
  it('MH treating (the fan-out): 4 steps and 2 automatic rows, plus the card\'s one judged objective', () => {
    const rows = rowsOf(MH, 'treating');
    expect(of(rows, 'step')).toHaveLength(4);
    expect(of(rows, 'auto')).toHaveLength(2);
    expect(kinds(rows)).toEqual(['step', 'step', 'step', 'step', 'judged', 'auto', 'auto']);
    expect(rows.map((r) => ('n' in r ? r.n : 'A'))).toEqual([1, 2, 3, 4, 5, 'A', 'A']);
    expect(of(rows, 'step').map((r) => r.kind === 'step' && r.tr.id)).toEqual(['dant-treating', 'cool-treating', 'kTreat-treating', 'bicarb-treating']);
    const [dant] = rows;
    expect(dant).toMatchObject({ title: 'Dantrolene 2.5 mg/kg', subtitle: '→ Dantrolene 2.5 mg/kg given' });
    expect(of(rows, 'auto').map((r) => [r.title, r.subtitle, r.kind === 'auto' && r.trigger])).toEqual([
      ['Recovering: EtCO₂ below 45', 'when EtCO₂ < 45 mmHg for 1 min', 'vital'],
      ['Cardiac arrest', 'when ART S < 25 mmHg for 10 s', 'vital'],
    ]);
    expect(rows[4]).toMatchObject({ kind: 'judged', objective: 0, subtitle: 'you judge it' });
  });

  it('haemorrhage pea: 1 step and 1 automatic row, plus the card\'s one judged objective (a plain string objective)', () => {
    const rows = rowsOf(HAEM, 'pea');
    expect(of(rows, 'step')).toHaveLength(1);
    expect(of(rows, 'auto')).toHaveLength(1);
    expect(rows.map((r) => r.kind === 'judged' ? `${r.n} judged` : r.kind === 'step' ? `${r.n} ${r.tr.id}` : `A ${r.tr.id}`)).toEqual(['1 cpr-pea', '2 judged', 'A asystole']);
    expect(rows[1]).toMatchObject({ objective: 0, text: HAEM.objectives?.[0] });
  });

  it('the mixed transition "junctional" (any of a press and a rule) is a step, with "or by itself when <rule>" (answer 4)', () => {
    const [step] = rowsOf(HAEM, 'ventilated');
    expect(step).toMatchObject({ kind: 'step', n: 1, label: 'Pre-arrest: junctional rhythm', subtitle: '→ Pre-arrest: junctional rhythm 50/min · or by itself when ART S < 60 mmHg for 10 s' });
    expect(step?.kind === 'step' && step.tr.id).toBe('junctional');
  });

  it('an `event` transition is an automatic row "when … is given (from the Defib sheet)" (answer 5); a hop shows its 2 s', () => {
    expect(rowsOf(HAEM, 'vf').filter((r) => r.kind !== 'judged')).toEqual([expect.objectContaining({ kind: 'auto', trigger: 'event', title: 'Shocked: CPR on for 2 min', subtitle: 'when a shock is given (from the Defib sheet)' })]);
    expect(rowsOf(MH, 'dantrolene').filter((r) => r.kind !== 'judged')).toEqual([expect.objectContaining({ kind: 'auto', trigger: 'afterS', title: 'MH treatment under way', subtitle: 'after 2 s in this state' })]);
  });

  it('no step is left out: the step rows of every state are its manual and mixed transitions, in array order', () => {
    for (const doc of [MH, HAEM])
      for (const s of doc.states) {
        const steps = rowsOf(doc, s.id).flatMap((r) => (r.kind === 'step' ? [r.tr.id] : []));
        expect(steps, s.id).toEqual((s.transitions ?? []).filter((t) => manualLabel(t.when) !== null).map((t) => t.id));
        expect(rowsOf(doc, s.id).filter((r) => r.kind !== 'judged')).toHaveLength(s.transitions?.length ?? 0);
      }
  });
});

describe('stepCommand (the same resolution as today\'s press)', () => {
  it('every manual label of both cards resolves, in its state, to its own transition id', () => {
    let n = 0;
    for (const doc of [MH, HAEM])
      for (const s of doc.states)
        for (const t of s.transitions ?? []) {
          const label = manualLabel(t.when);
          if (label === null) continue;
          n++;
          expect(stepCommand(s, label), `${s.id} ${label}`).toEqual({ type: 'scenario', action: 'trigger', target: t.id });
        }
    expect(n).toBe(29 + 24); // the plan's R13: MH has 29 manual transitions; the haemorrhage card 24 (one of them mixed)
  });

  it('a label the state does not offer, or no state: null (today\'s "Not available now" toast)', () => {
    expect(stepCommand(state(MH, 'treating'), 'Start CPR')).toBeNull();
    expect(stepCommand(undefined, 'Start CPR')).toBeNull();
  });
});

// Every press of the two showcase slow tests (their `Act` lists) and the states it is pressed in, read from each act's
// `when` (`s.state === …`, inCrisis = triggerOff, treating or recovering) or, for a timed act, from the card's path at
// that time. The source files are parsed below, so a press added to a slow test without a line here fails this test.
const PRESSED_IN: Record<string, { card: string; states: string[] }> = {
  'Premedicate: midazolam 2 mg, fentanyl 100 µg': { card: 'showcase-mh', states: ['awake'] },
  'Preoxygenate: 100 % O₂ by face mask': { card: 'showcase-mh', states: ['premedicated'] },
  'Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg': { card: 'showcase-mh', states: ['preoxygenated', 'premedicated'] }, // the second: the run without preoxygenation
  'Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %': { card: 'showcase-mh', states: ['induced'] },
  'Start surgery: rocuronium 0.6 mg/kg': { card: 'showcase-mh', states: ['intubated'] },
  'MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate': { card: 'showcase-mh', states: ['earlySigns', 'established'] },
  'Dantrolene 2.5 mg/kg': { card: 'showcase-mh', states: ['triggerOff', 'treating', 'recovering'] },
  'Cool: refrigerated saline 20 mL/kg (1.6 L)': { card: 'showcase-mh', states: ['triggerOff', 'treating', 'recovering'] },
  'Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose': { card: 'showcase-mh', states: ['triggerOff', 'treating', 'recovering'] },
  'Sodium bicarbonate 1 mmol/kg': { card: 'showcase-mh', states: ['triggerOff', 'treating', 'recovering'] },
  'EtCO₂ normal: ventilation back to 12 × 500': { card: 'showcase-mh', states: ['recovering'] },
  'Dantrolene 2.5 mg/kg; hyperventilate again (20 × 600, O₂ 100 %)': { card: 'showcase-mh', states: ['normoventilated'] },
  'Oxygen by face mask, FiO₂ 1.0': { card: 'showcase-haemorrhage', states: ['bleeding'] },
  'Intubate and ventilate, FiO₂ 1.0': { card: 'showcase-haemorrhage', states: ['bleedingO2'] },
  'Start CPR: compressions, bag via the tube 10/min, FiO₂ 1.0': { card: 'showcase-haemorrhage', states: ['asystole'] },
  'Surgeon controls the bleeding; massive transfusion: 1 L warmed crystalloid, then red cells and plasma by rapid infuser; TXA 1 g': { card: 'showcase-haemorrhage', states: ['cpr'] },
  'Epinephrine 1 mg': { card: 'showcase-haemorrhage', states: ['cprRunning', 'postShock1'] },
  'Rhythm check': { card: 'showcase-haemorrhage', states: ['cprRunning', 'postShock1Running'] },
  'Rhythm check: pulse back, stop CPR': { card: 'showcase-haemorrhage', states: ['postShock2'] },
  'Give epinephrine 100 µg': { card: 'showcase-anaphylaxis', states: ['anaphylaxis'] },
};
/** The `send` acts (the Defib tab's Charge and Shock) and the states they are sent in: the card's `event` row there. */
const SENT_IN = ['vf', 'vf2'];

/** The press labels of a slow test: `press: '…'` literals and `press: NAME` of a `const NAME = '…'`; `send` acts apart. */
function actsOf(file: string): { pressed: string[]; sent: number } {
  const src = readFileSync(resolve(import.meta.dirname, 'showcase', file), 'utf8');
  const consts = new Map([...src.matchAll(/const ([A-Z_0-9]+) = '([^']+)'/g)].map((m) => [m[1] as string, m[2] as string]));
  const pressed: string[] = [];
  let sent = 0;
  for (const m of src.matchAll(/\{ press: (?:'([^']+)'|([A-Z_0-9]+))([^\n]*)/g)) {
    if (/\bsend:/.test(m[3] as string)) {
      sent++;
      continue;
    }
    const label = m[1] ?? consts.get(m[2] as string);
    expect(label, `${file}: press ${m[2]}`).toBeDefined();
    pressed.push(label as string);
  }
  return { pressed, sent };
}

describe('every Act label of the two showcase slow tests is a step of the state it is pressed in', () => {
  const mh = actsOf('malignant-hyperthermia.slow.test.ts');
  const haem = actsOf('haemorrhage-anaphylaxis.slow.test.ts');

  it('the slow tests\' presses are the table\'s, no more and no fewer', () => {
    expect(mh.pressed).toHaveLength(17); // INDUCTION 5, the checklist 7, the demo path 5
    expect(haem.sent).toBe(4);
    expect([...new Set([...mh.pressed, ...haem.pressed])].sort()).toEqual(Object.keys(PRESSED_IN).sort());
  });

  it.each(Object.entries(PRESSED_IN))('%s', (label, { card, states }) => {
    const doc = showcaseDoc(card);
    for (const id of states) {
      const step = rowsOf(doc, id).find((r) => r.kind === 'step' && r.label === label);
      expect(step, `${card} ${id}`).toBeDefined();
      expect(stepCommand(state(doc, id), label)).toEqual({ type: 'scenario', action: 'trigger', target: step?.kind === 'step' && step.tr.id });
    }
  });

  it('the Charge and Shock sends land on the card\'s event row in VF and VF again', () => {
    for (const id of SENT_IN) expect(rowsOf(HAEM, id).some((r) => r.kind === 'auto' && r.trigger === 'event'), id).toBe(true);
  });
});

describe('objectivesOf and conditionNotMet (answer 6)', () => {
  const linked = (doc: ScenarioDoc, id: string) => objectivesOf(doc, tr(doc, id)).map((o) => o.index);

  it('MH: the crisis call carries "within 120 s of the early signs"; dantrolene carries the 300 s dose and the second dose; the potassium step the K⁺ objective', () => {
    expect(linked(MH, 'crisis-earlySigns')).toEqual([1]);
    expect(linked(MH, 'dant')).toEqual([2, 3]);
    expect(linked(MH, 'dant-normoventilated')).toEqual([2, 3]);
    expect(linked(MH, 'kTreat-treating')).toEqual([4]);
    expect(linked(MH, 'normo')).toEqual([5]); // heldThen: its event is state:normoventilated
    expect(linked(MH, 'cool-treating')).toEqual([]);
    expect(linked(MH, 'premed')).toEqual([]);
  });

  it('only a linked objective whose `after` is a `value:` event is a condition: K⁺ above 5.5 on the potassium step', () => {
    expect(objectivesOf(MH, tr(MH, 'kTreat')).map((o) => o.condition)).toEqual([['value:k>5.5']]);
    expect(objectivesOf(MH, tr(MH, 'dant')).map((o) => o.condition)).toEqual([null, null]);
    const k = objectivesOf(MH, tr(MH, 'kTreat'));
    expect(conditionNotMet(k, () => false)).toBe(true);
    expect(conditionNotMet(k, (e) => e === 'value:k>5.5')).toBe(false);
    expect(conditionNotMet(objectivesOf(MH, tr(MH, 'dant')), () => false)).toBe(false);
    expect(conditionNotMet([], () => false)).toBe(false);
  });

  it('haemorrhage: "stop CPR" carries the return-of-circulation objective (state:rosc); the CPR press none (its event is cpr, not a state)', () => {
    expect(linked(HAEM, 'stop')).toEqual([2]);
    expect(linked(HAEM, 'cpr-pea')).toEqual([]);
  });
});

describe('reachable (answer 7: "failed" when the step\'s target cannot be reached any more)', () => {
  it('MH: from treating, the treatment states and arrest are reachable, the induction is not', () => {
    expect(reachable(MH, 'treating', 'dantrolene')).toBe(true);
    expect(reachable(MH, 'treating', 'normoventilated')).toBe(true);
    expect(reachable(MH, 'treating', 'cpr')).toBe(true);
    expect(reachable(MH, 'treating', 'preoxygenated')).toBe(false);
    expect(reachable(MH, 'induced', 'triggerOff')).toBe(true);
    expect(reachable(MH, 'cpr', 'cpr')).toBe(true);
    expect(reachable(MH, 'cpr', 'treating')).toBe(false);
  });

  it('haemorrhage: from VF, the return of circulation is reachable and the oxygen mask is not', () => {
    expect(reachable(HAEM, 'vf', 'rosc')).toBe(true);
    expect(reachable(HAEM, 'vf', 'bleedingO2')).toBe(false);
  });
});
