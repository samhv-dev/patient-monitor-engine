// @vitest-environment happy-dom
// The builder's last sections (piece B5, docs/plans/scenario-builder.md §5.2): Script, Outcomes, Debrief hints, Handout
// questions, and the Header's take-home lines. B1's property, extended: each section drawn over every library card that
// uses its block, and every one of its controls touched with its own value, writes the card again, deep-equal and in the
// same JSON text. No library card has outcomes or debrief hints yet, so a copy of the MH card carrying both (with every
// anchor form) proves those two. Then, through the page: a handout question counted live against 92 characters and
// refused at 93 with the validator's own line (Export waits); the debrief's anchor picker offers this card's own phases
// and actions only; the script is labelled card-set, never graded, and a new entry built in the form is the library's
// own shape; a new outcome is written only complete; the schema's limits (4 take-home lines, 4 lines to show, 4
// openers, 3 questions) stop the form's Add.
import { SCENARIO_SCHEMA_V2, validateScenario } from '@pme/controller/scenario';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { asFactory, MemoryIDB } from '../memory-idb.ts';
import { MemoryStorage } from '../memory-storage.ts';
import { LIBRARY } from '../scenarios.ts';
import mhCard from '../showcase/showcase-mh-v2.json';
import { CHECK_DELAY_MS } from './checks.ts';
import { DEBRIEF_LIMITS, debriefSection, handoutSection } from './debrief-editor.ts';
import { Drafts, type Body } from './drafts.ts';
import { docOf, formOf } from './form.ts';
import { outcomeSection } from './outcome-editor.ts';
import { builderPage, SAVE_DELAY_MS } from './page.ts';
import { scriptSection } from './script-editor.ts';
import { sections, TAKE_HOME_MAX } from './sections.ts';
import type { SectionView } from './sections.ts';

type Rec = Record<string, unknown>;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const settled = () => wait(Math.max(CHECK_DELAY_MS, SAVE_DELAY_MS) + 60);
const MH = mhCard as unknown as Rec;

/** A copy of the MH card with outcomes (a string anchor, a rule anchor, a `$comment`, a `src`) and debrief hints (lines
 *  to show, openers, handout questions, each anchor form a debrief line takes). Its numbers are a test's, never a card's. */
const FIXTURE: Rec = {
  ...MH,
  id: 'mh-b5-fixture',
  outcomes: [
    { id: 'etco2Down', text: 'EtCO₂ back under 45 mmHg', $comment: 'a test fixture', rule: { value: { var: 'etco2', op: '<', value: 45, forS: 60 } }, anchor: 'action:dantrolene', withinS: 900, src: 'PLACEHOLDER: a test fixture' },
    { id: 'cooled', text: 'Core temperature falling', rule: { all: [{ slope: { var: 'tempCore', op: '<', perMin: 0, overS: 120 } }, { not: { signal: 'pulseLoss' } }] }, anchor: { rule: { value: { var: 'tempCore', op: '>', value: 39 } } }, withinS: 1200 },
    { id: 'early', text: 'Treated from early signs', rule: { visited: 'treated' }, anchor: 'phase:earlySigns', withinS: 600 },
  ],
  debriefHints: {
    show: ['A rising EtCO₂ at the same ventilation is MH until shown otherwise.', 'Dantrolene early.'],
    openers: [{ at: 'phase:earlySigns', text: 'What did you see first?' }, { at: 'action:dantrolene', text: 'How long to dantrolene?' }, { at: 'pulseLoss', text: 'What changed?' }, { at: 'start', text: 'Your plan at the start?' }],
    handoutQuestions: [{ at: 'phase:earlySigns', text: 'What told you this was MH and not light anaesthesia?' }, { at: 'rosc', text: 'What next after ROSC?' }],
  },
};

describe('B1’s property for the last sections: drawn and touched, every card is written again unchanged', () => {
  const cards: Array<[string, Rec]> = [...LIBRARY.map((c) => [c.id, c.doc as unknown as Rec] as [string, Rec]), ['the B5 fixture (outcomes and debrief hints)', FIXTURE]];
  const uses = (d: Rec) => ['script', 'outcomes', 'debriefHints', 'takeHome'].filter((k) => d[k] !== undefined);

  it('the library: which cards use which of these blocks (none uses outcomes or debrief hints yet)', () => {
    expect(Object.fromEntries(LIBRARY.filter((c) => uses(c.doc as unknown as Rec).length).map((c) => [c.id, uses(c.doc as unknown as Rec)]))).toEqual({
      'showcase-bronchospasm': ['takeHome'], 'showcase-haemorrhage': ['takeHome'], 'showcase-haemorrhage-v2': ['script', 'takeHome'], 'showcase-mh': ['takeHome'],
      'showcase-mh-v2': ['script', 'takeHome'], 'showcase-tamponade': ['takeHome'],
    });
    expect(validateScenario(FIXTURE)).toMatchObject({ ok: true });
  });

  for (const [id, doc] of cards) {
    it(`${id}: ${uses(doc).join(', ') || 'none of the blocks'}; every control touched, the card is the same`, () => {
      const form = formOf(doc);
      let changes = 0;
      const changed = () => void changes++;
      const secs: SectionView[] = [scriptSection(form, changed, () => undefined), outcomeSection(form, changed, () => undefined), debriefSection(form, changed, () => undefined), handoutSection(form, changed, () => undefined)];
      const header = sections(form, changed)[0]!;
      document.body.append(...secs.map((s) => s.el), header.el);
      const touched = [...secs.flatMap((s) => [...s.el.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')]), ...header.el.querySelectorAll<HTMLInputElement>('.sb-takehome input')];
      for (const c of touched) {
        const v = c.value;
        c.value = v;
        c.dispatchEvent(new Event(c.tagName === 'SELECT' ? 'change' : 'input'));
        c.dispatchEvent(new Event('change'));
      }
      const back = docOf(form);
      expect(back).toStrictEqual(doc);
      expect(JSON.stringify(back)).toBe(JSON.stringify(doc));
      // the controls are there: one per command, anchor, line and question the card has
      const n = (sel: string) => secs.reduce((a, s) => a + s.el.querySelectorAll(sel).length, 0);
      expect(n('.sb-endrow')).toBe(((doc.script as unknown[] | undefined)?.length ?? 0) + ((doc.outcomes as unknown[] | undefined)?.length ?? 0)
        + (((doc.debriefHints as Rec | undefined)?.openers as unknown[] | undefined)?.length ?? 0) + (((doc.debriefHints as Rec | undefined)?.handoutQuestions as unknown[] | undefined)?.length ?? 0));
      document.body.replaceChildren();
    });
  }
});

describe('the limits are the schema’s', () => {
  it('4 take-home lines, 4 lines to show, 4 openers, 3 questions of 92 characters', () => {
    const P = (SCENARIO_SCHEMA_V2 as { properties: Record<string, Rec> }).properties;
    expect(TAKE_HOME_MAX).toBe(P.takeHome!.maxItems);
    expect(DEBRIEF_LIMITS).toEqual({ show: 4, openers: 4, handoutQuestions: 3, questionChars: 92 });
  });
});

describe('the last sections in the page (B5)', () => {
  let b: { idb: MemoryIDB; ls: MemoryStorage };
  beforeEach(() => {
    b = { idb: new MemoryIDB(), ls: new MemoryStorage() };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(() => {
    document.body.replaceChildren();
    location.hash = '';
    vi.restoreAllMocks();
  });
  const open = async (doc: Rec) => {
    const s = new Drafts(() => b.ls, () => asFactory(b.idb));
    await s.ready();
    const m = await s.create(doc as unknown as Body, 'a test card');
    if ('refused' in m) throw new Error(m.refused);
    const p = builderPage(s);
    document.body.append(p.el);
    await p.enter(m.id);
    const q = <T extends Element = HTMLElement>(sel: string) => p.el.querySelector<T>(sel)!;
    const all = <T extends Element = HTMLElement>(sel: string) => [...p.el.querySelectorAll<T>(sel)];
    const go = (name: string) => all<HTMLButtonElement>('.sb-out').find((x) => x.textContent?.startsWith(name))!.click();
    const byLabel = <T extends HTMLElement = HTMLInputElement>(label: string) => q<T>(`[aria-label="${label}"]`);
    const set = (el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, v: string) => {
      el.value = v;
      el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input'));
    };
    const press = (text: string) => all<HTMLButtonElement>('button').find((x) => x.textContent === text && !x.disabled)!.click();
    const body = async () => (await s.body(m.id)) as unknown as Rec;
    const flush = async () => {
      await wait(0);
      await settled();
    };
    return { p, q, all, go, byLabel, set, press, body, flush };
  };

  it('a handout question: a live count against 92, refused at 93 with the validator’s own line, Export waiting', async () => {
    const e = await open({ ...FIXTURE, id: 'mh-mine' });
    e.go('Handout questions');
    expect(e.q('[data-section="handout"] h2').textContent).toBe('Handout questions printed on the learner handout with their anchor’s time');
    const t = e.byLabel('Question 1: its words');
    expect(t.parentElement!.querySelector('.sb-count')!.textContent).toBe(`${'What told you this was MH and not light anaesthesia?'.length} of 92 characters`);
    e.set(t, 'x'.repeat(92));
    expect(t.parentElement!.querySelector('.sb-count')!.textContent).toBe('92 of 92 characters');
    await e.flush();
    expect(e.q('.sb-checks li').textContent).toMatch(/^The validator accepts this draft/);
    expect(((await e.body()).debriefHints as Rec).handoutQuestions).toEqual([{ at: 'phase:earlySigns', text: 'x'.repeat(92) }, { at: 'rosc', text: 'What next after ROSC?' }]);
    e.set(t, 'x'.repeat(93));
    const count = t.parentElement!.querySelector('.sb-count')!;
    expect(count.textContent).toBe('93 of 92 characters: 1 over; the validator refuses a question longer than one handout line');
    expect(count.classList.contains('over')).toBe(true);
    await e.flush();
    expect(e.q('.sb-checks li').textContent).toMatch(/^The validator refuses this draft: 1 refusal/);
    const here = t.closest('.field')!.querySelector('.sb-refuse')!;
    expect(here.textContent).toContain('/debriefHints/handoutQuestions/0/text: at most 92 characters, about 90 characters — one line of the A4 handout');
    expect(t.getAttribute('aria-invalid')).toBe('true');
    expect(e.all<HTMLButtonElement>('.sb-acts button').find((x) => x.textContent === 'Export file')!.disabled).toBe(true);
    expect(e.all('.sb-out').find((x) => x.textContent?.startsWith('Handout questions'))!.textContent).toBe('Handout questions2 (refused)');
  });

  it('the debrief’s anchor picker offers the run events and this card’s own phases and actions, nothing else', async () => {
    const e = await open({ ...FIXTURE, id: 'mh-mine' });
    e.go('Debrief hints');
    const when = e.byLabel<HTMLSelectElement>('Opener 1: timed from: when');
    expect([...when.options].map((o) => o.value)).toEqual(['start', 'phase', 'action', 'pulseLoss', 'rosc']);
    expect([...e.byLabel<HTMLSelectElement>('Opener 1: timed from: which phase').options].map((o) => o.value)).toEqual((MH.phases as Rec[]).map((p) => p.id));
    expect([...e.byLabel<HTMLSelectElement>('Opener 2: timed from: which action').options].map((o) => o.value)).toEqual((MH.actions as Rec[]).map((a) => a.id));
    // a choice writes the form's first target; the words follow
    e.set(e.byLabel<HTMLSelectElement>('Opener 3: timed from: when'), 'phase');
    e.set(e.byLabel<HTMLSelectElement>('Opener 3: timed from: which phase'), 'arrest');
    await e.flush();
    expect(((await e.body()).debriefHints as Rec).openers).toEqual([...((FIXTURE.debriefHints as Rec).openers as Rec[]).slice(0, 2), { at: 'phase:arrest', text: 'What changed?' }, { at: 'start', text: 'Your plan at the start?' }]);
    expect(e.byLabel('Opener 3: timed from: which phase').closest('li')!.textContent).toContain('Timed from Arrest entered.');
    // the schema's limits stop Add: four openers here; four lines to show once two are added
    expect(e.q<HTMLButtonElement>('[data-add="openers"]').disabled).toBe(true);
    expect(e.q('[data-section="debrief"]').textContent).toContain('The format takes at most 4.');
    e.q<HTMLButtonElement>('[data-add="show"]').click();
    e.set(e.byLabel('Built to show, line 3'), 'Three.');
    e.q<HTMLButtonElement>('[data-add="show"]').click();
    e.set(e.byLabel('Built to show, line 4'), 'Four.');
    expect(e.q<HTMLButtonElement>('[data-add="show"]').disabled).toBe(true);
    // removing every line removes the list; the block stays while it has another
    for (let i = 0; i < 4; i++) e.byLabel<HTMLButtonElement>('Remove built-to-show line 1').click();
    await e.flush();
    expect(Object.keys((await e.body()).debriefHints as Rec)).toEqual(['openers', 'handoutQuestions']);
  });

  it('three questions at most; the last removed takes the block with it when nothing else is left', async () => {
    const doc: Rec = { ...MH, id: 'mh-mine', debriefHints: { handoutQuestions: [{ at: 'start', text: 'One?' }] } };
    const e = await open(doc);
    e.go('Handout questions');
    e.press('Add a question');
    e.set(e.byLabel('Question 2: its words'), 'Two?');
    e.press('Add a question');
    e.set(e.byLabel('Question 3: its words'), 'Three?');
    expect(e.q<HTMLButtonElement>('[data-add="handoutQuestions"]').disabled).toBe(true);
    await e.flush();
    expect(((await e.body()).debriefHints as Rec).handoutQuestions).toEqual([{ at: 'start', text: 'One?' }, { at: 'start', text: 'Two?' }, { at: 'start', text: 'Three?' }]);
    for (let i = 0; i < 3; i++) e.byLabel<HTMLButtonElement>('Remove question 1').click();
    await e.flush();
    const back = await e.body();
    expect('debriefHints' in back).toBe(false);
    expect(JSON.stringify(back)).toBe(JSON.stringify({ ...MH, id: 'mh-mine' }));
  });

  it('the take-home lines stop at the schema’s 4', async () => {
    const e = await open({ ...MH, id: 'mh-mine' });
    expect((MH.takeHome as unknown[]).length).toBe(4);
    expect(e.all<HTMLButtonElement>('.sb-takehome button').find((x) => x.textContent === 'Add a line')!.disabled).toBe(true);
  });

  it('the script: labelled card-set, never graded; a new entry from the form is the library’s own shape', async () => {
    const e = await open({ ...MH, id: 'mh-mine' });
    e.go('Script');
    expect(e.q('[data-section="script"] h2').textContent).toBe('Script card-set, never graded: what the card does itself at an anchor');
    expect(e.q('[data-section="script"] .sb-endrow h3').textContent).toBe('Entry 1 card-set, never graded');
    expect(e.q('[data-section="script"] .sb-endrow').textContent).toContain('Malignant hyperthermia: severe');
    expect(e.byLabel<HTMLSelectElement>('Entry 1: fires at: when').value).toBe('taking');
    expect([...e.byLabel<HTMLSelectElement>('Entry 1: fires at: when').options].map((o) => o.value)).toEqual(['phase', 'taking', 'atScenarioS']);
    expect(e.byLabel('Entry 1: fires at: which taking (1 is the first)').value).toBe('1');
    // the last command stays
    expect(e.byLabel<HTMLButtonElement>('Entry 1: remove command 1').disabled).toBe(true);
    // a new entry: a condition at the first taking of Induce, as the library's own entry is
    e.press('Add a script entry');
    e.set(e.byLabel('New entry: id'), 'mhAgain');
    e.set(e.byLabel<HTMLSelectElement>('New entry: fires at: when'), 'taking');
    e.set(e.byLabel<HTMLSelectElement>('New entry: fires at: which action'), 'induce');
    e.set(e.byLabel('New entry: fires at: which taking (1 is the first)'), '0'); // refused, not written
    expect(e.q('[aria-label="A new script entry"]').textContent).toContain('a whole number from 1: not written, the card keeps 1');
    e.set(e.byLabel('New entry: fires at: which taking (1 is the first)'), '2');
    e.set(e.byLabel<HTMLSelectElement>('New command: what'), 'cond:mh');
    expect(e.q('[aria-label="A new script entry"]').textContent).toContain('The entry will send: Malignant hyperthermia: severe');
    e.press('Add the entry');
    await e.flush();
    const script = (await e.body()).script as Rec[];
    expect(script[1]).toEqual({ id: 'mhAgain', on: 'action:induce#2', commands: (MH.script as Rec[])[0]!.commands });
    expect(e.q('.sb-checks li').textContent).toMatch(/^The validator accepts this draft/);
    // a second command, a rhythm, then the first removed
    e.byLabel<HTMLButtonElement>('Entry 2: add a command').click();
    e.set(e.byLabel<HTMLSelectElement>('New command: what'), 'rhythm:junctionalEscape');
    e.press('Add to the entry');
    e.byLabel<HTMLButtonElement>('Entry 2: remove command 1').click();
    await e.flush();
    expect(((await e.body()).script as Rec[])[1]!.commands).toEqual([{ type: 'setRhythm', rhythm: 'junctionalEscape' }]);
    expect(e.q('.sb-checks li').textContent).toMatch(/^The validator accepts this draft/);
  });

  it('a new outcome is written only complete, and accepted by the validator', async () => {
    const e = await open({ ...MH, id: 'mh-mine' });
    e.go('Outcomes');
    expect(e.q('[data-section="outcomes"]').textContent).toContain('This card has no outcomes.');
    e.press('Add an outcome');
    const add = () => e.all<HTMLButtonElement>('button').find((x) => x.textContent === 'Add the outcome')!;
    e.set(e.byLabel('New outcome: what it says'), 'EtCO₂ under 45');
    expect(e.byLabel('New outcome: id').value).toBe('etco2Under45');
    expect(add().disabled).toBe(true);
    e.set(e.byLabel<HTMLSelectElement>('New outcome: reached when: what it reads'), 'etco2');
    e.set(e.byLabel<HTMLSelectElement>('New outcome: reached when: compared how'), '<');
    e.set(e.byLabel('New outcome: reached when: threshold'), '45');
    expect(add().disabled).toBe(true); // no window yet
    e.set(e.byLabel<HTMLSelectElement>('New outcome: its window opens at: when'), 'action');
    e.set(e.byLabel<HTMLSelectElement>('New outcome: its window opens at: which action'), 'dantrolene');
    e.set(e.byLabel('New outcome: within how many seconds'), '0'); // the schema's: above 0
    expect(add().disabled).toBe(true);
    e.set(e.byLabel('New outcome: within how many seconds'), '900');
    expect(add().disabled).toBe(false);
    add().click();
    await e.flush();
    expect((await e.body()).outcomes).toEqual([{ id: 'etco2Under45', text: 'EtCO₂ under 45', rule: { value: { var: 'etco2', op: '<', value: 45 } }, anchor: 'action:dantrolene', withinS: 900 }]);
    expect(e.q('.sb-checks li').textContent).toMatch(/^The validator accepts this draft/);
    expect(e.all('.sb-out').find((x) => x.textContent?.startsWith('Outcomes'))!.textContent).toBe('Outcomes1');
    // its rule anchor: chosen, then written by its own form
    e.set(e.byLabel<HTMLSelectElement>('Outcome 1: its window opens at: when'), 'rule');
    e.set(e.byLabel<HTMLSelectElement>('Outcome 1: the anchor’s rule: its first condition'), 'signal');
    e.press('Use this rule');
    await e.flush();
    expect(((await e.body()).outcomes as Rec[])[0]!.anchor).toEqual({ rule: { signal: 'pulseLoss' } });
    expect(e.q('.sb-checks li').textContent).toMatch(/^The validator accepts this draft/);
  });

  it('a validator line on an outcome’s rule shows on its rule node', async () => {
    const doc = JSON.parse(JSON.stringify({ ...FIXTURE, id: 'mh-mine' })) as Rec;
    ((doc.outcomes as Rec[])[2]!.rule as Rec).visited = 'nowhere';
    const e = await open(doc);
    e.go('Outcomes');
    await e.flush();
    const node = e.q('[data-rule="/outcomes/2/rule"]');
    expect(node.querySelector('.sb-refuse')!.textContent).toContain('/outcomes/2/rule/visited');
  });
});
