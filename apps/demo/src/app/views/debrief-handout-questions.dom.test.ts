// @vitest-environment happy-dom
// Debrief 2, D16 (Decision 14): the learner handout prints a card's reviewed questions in place of fixed prompts 1–2,
// each with its anchor's mm:ss as a label and three ruled lines, then fixed prompt 3; a question whose anchor did not
// happen on the kept course is left out and a fixed prompt takes its place; without questions the handout is as it
// was. Its text still carries no verdict word and no objective text (the A/B plan's DOM check). The questions are TEST
// strings on a test copy of a card: no showcase card carries handoutQuestions until the owner has reviewed them.
import { afterEach, describe, expect, it } from 'vitest';
import mh from '../../../../../docs/showcase/kit-round-a/debrief-a4-mh-e119-induction-sequence-and-early-call-kit-round-chromium.json';
import type { Link } from '../link.ts';
import { emptyRun, type RunData } from '../record.ts';
import mhV2 from '../showcase/showcase-mh-v2.json';
import type { AppSession } from '../session.ts';
import { debriefView } from './debrief.ts';

function open(data: RunData): { el: HTMLElement; leave?: () => void } {
  const link = { onChange: () => () => undefined, ctl: { scenario: {} } } as unknown as Link;
  const view = debriefView({ record: { data } } as unknown as AppSession, link);
  document.body.append(view.el);
  view.enter?.('');
  return { el: view.el, leave: view.leave };
}
/** The MH kit-round record (a /1 run) on a test copy of its card, given these hints. */
const mhWith = (debriefHints: unknown): RunData => {
  const d = structuredClone(mh.record) as unknown as RunData;
  (d.doc as unknown as Record<string, unknown>).debriefHints = debriefHints;
  return d;
};
const FIXED = [
  'What did you notice first on the monitor, and when?',
  'Take one key moment: what were you thinking then, and what did you do?',
  'One thing you will keep doing, and one thing you will do differently.',
];
const Q1 = { at: 'state:earlySigns', text: 'Test question one: what did you see here?' };
const Q2 = { at: 'state:normoventilated', text: 'Test question two: what told you it was time?' };
const NEVER = { at: 'state:arrest', text: 'Test question: this anchor never happens on the kept course.' };
const VERDICT = /Observed|Not observed|Not assessable|Discuss|✓|✗|◆/;

const items = (el: HTMLElement) => [...el.querySelectorAll('#db-handout ol.db-qs > li')];
const read = (el: HTMLElement) => items(el).map((li) => ({
  at: li.querySelector('.db-q-at')?.textContent ?? null,
  text: li.querySelector('.db-q-text')?.textContent ?? li.firstChild?.textContent,
  ruled: li.querySelectorAll('.db-ruled').length,
}));
const momentAt = (el: HTMLElement, text: string) =>
  [...el.querySelectorAll('#db-moments tbody tr[data-n]')].find((tr) => tr.textContent?.includes(text))?.querySelectorAll('td')[1]?.textContent;

describe('learner handout: the card\'s questions (D16)', () => {
  let leave: (() => void) | undefined;
  afterEach(() => (leave?.(), document.body.replaceChildren()));

  it('two reviewed questions print in place of fixed prompts 1–2, with their anchor times and three ruled lines, then fixed prompt 3', () => {
    const v = open(mhWith({ handoutQuestions: [Q1, Q2] }));
    leave = v.leave;
    const got = read(v.el);
    expect(got.map((x) => x.text)).toEqual([Q1.text, Q2.text, FIXED[2]]);
    expect(got.map((x) => x.ruled)).toEqual([3, 3, 3]);
    // the labels: each anchor's mm:ss on this run, the times its key moments show (08:38, 14:28)
    expect(got.map((x) => x.at)).toEqual([momentAt(v.el, 'Early signs'), momentAt(v.el, 'Ventilation back'), null]);
    expect(got[0]?.at).toBe('08:38');
    expect(got[1]?.at).toBe('14:28');
    expect(items(v.el)[0]?.textContent).toBe(`08:38 ${Q1.text}`); // the label, then the card's text as written
  });

  it('a question whose anchor did not happen is left out and a fixed prompt prints instead', () => {
    const v = open(mhWith({ handoutQuestions: [NEVER, Q1] }));
    leave = v.leave;
    expect(read(v.el).map((x) => x.text)).toEqual([Q1.text, FIXED[1], FIXED[2]]);
    expect(v.el.querySelector('#db-handout')?.textContent).not.toContain(NEVER.text);
    v.leave?.();
    document.body.replaceChildren();
    const w = open(mhWith({ handoutQuestions: [NEVER] }));
    leave = w.leave;
    expect(read(w.el).map((x) => x.text)).toEqual(FIXED);
    expect(w.el.querySelector('#db-handout .db-q-at')).toBeNull();
  });

  it('three questions that all happened: the first two print; the list keeps its three places', () => {
    const v = open(mhWith({ handoutQuestions: [Q1, Q2, { at: 'drug:dantrolene', text: 'Test question three.' }] }));
    leave = v.leave;
    expect(read(v.el).map((x) => x.text)).toEqual([Q1.text, Q2.text, FIXED[2]]);
  });

  it('without questions the handout is as it was (show lines and openers alone change nothing in it)', () => {
    const a = open(mhWith(undefined));
    const before = a.el.querySelector('#db-handout')?.innerHTML;
    expect(read(a.el).map((x) => x.text)).toEqual(FIXED);
    a.leave?.();
    document.body.replaceChildren();
    const b = open(mhWith({ show: ['A show line.'], openers: [Q1] }));
    leave = b.leave;
    expect(b.el.querySelector('#db-handout')?.innerHTML).toBe(before);
  });

  it('the handout with questions still has no verdict word and no objective text', () => {
    const v = open(mhWith({ handoutQuestions: [Q1, Q2] }));
    leave = v.leave;
    const text = v.el.querySelector('#db-handout')?.textContent ?? '';
    expect(text).toContain('Questions to think about');
    expect(text).not.toMatch(VERDICT);
    for (const o of mh.record.doc.objectives as Array<string | { text: string }>) expect(text).not.toContain(typeof o === 'string' ? o : o.text);
  });

  it("/2: a question's anchor is read as the openers read it (a phase's first entry, an action's graded taking)", () => {
    const doc = { ...structuredClone(mhV2), debriefHints: { handoutQuestions: [
      { at: 'rosc', text: 'Not on this run.' },
      { at: 'phase:earlySigns', text: 'Test question: the early signs.' },
      { at: 'action:nameMh', text: 'Test question: you named it here.' },
    ] } };
    const v = open({
      ...emptyRun('M 35 y 80 kg', 80, 0), doc, format: 2,
      admin: [{ seq: 1, t: 492, source: 'action', actionId: 'nameMh', kind: 'communication', result: { accepted: true } }],
      phases: [{ id: 'baseline', t: 0, exitT: 377, rule: 'initial' }, { id: 'latent', t: 377, exitT: 483.2, rule: 'enter:latent' }, { id: 'earlySigns', t: 483.2, rule: 'enter:earlySigns' }],
      edges: [{ rule: 'phase:earlySigns', t: 463.2, value: true }],
      rows: [{ t: 0, kind: 'scenario', text: 'Scenario loaded: MH' }],
    } as unknown as RunData);
    leave = v.leave;
    expect(read(v.el).map((x) => [x.at, x.text])).toEqual([['08:03', 'Test question: the early signs.'], ['08:12', 'Test question: you named it here.'], [null, FIXED[2]]]);
  });
});
