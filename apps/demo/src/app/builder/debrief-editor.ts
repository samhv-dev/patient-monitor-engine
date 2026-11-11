// The builder's Debrief hints and Handout questions sections (docs/plans/scenario-builder.md §5.2; piece B5): the card
// author's words for the instructor's Debrief page 2 (`debriefHints.show`, `.openers`) and the questions the learner
// handout prints (`.handoutQuestions`), each opener and question timed from a run event of this card (the anchor picker,
// anchor-picker.ts: the start, the pulse loss, ROSC, one of this card's phases or actions). The limits are the schema's
// own, read from it: at most 4 lines, 4 openers, 3 questions, and a question at most 92 characters, counted live (the
// measured A4 line, the schema's own note); a 93rd character is written and the validator refuses it with its own line,
// so Export waits. Every control edits the form in place and calls `changed()`; an emptied list is removed, and the
// block with its last list, so a card is written as if never touched.
import { SCENARIO_SCHEMA_V2 } from '@pme/controller/scenario';
import { button, h } from '../ui.ts';
import { anchorPicker, endSection, hint, textField, type EndSectionView } from './anchor-picker.ts';
import { anchorWords } from './anchors.ts';
import type { CardForm } from './form.ts';

type Rec = Record<string, unknown>;
type Lim = { maxItems: number; items: { properties?: { text?: { maxLength?: number } } } };
const DH = (SCENARIO_SCHEMA_V2 as { definitions: { debriefHints: { properties: Record<'show' | 'openers' | 'handoutQuestions', Lim> } } }).definitions.debriefHints.properties;
/** The schema's limits (`debriefHints`): `show` and `openers` at most 4 each, `handoutQuestions` at most 3, a question's
 *  text at most 92 characters (the measured A4 line). Read from the schema, so the form and the validator agree. */
export const DEBRIEF_LIMITS = {
  show: DH.show.maxItems,
  openers: DH.openers.maxItems,
  handoutQuestions: DH.handoutQuestions.maxItems,
  questionChars: DH.handoutQuestions.items.properties!.text!.maxLength!,
} as const;
const WORDS: Record<number, string> = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five' };
const upTo = (n: number) => `up to ${WORDS[n] ?? n}`;

/** The block's lists in place: made when the author first adds, removed with their last entry. */
function block(F: Rec) {
  const get = (): Rec | undefined => F.debriefHints as Rec | undefined;
  const list = <T>(k: string): T[] => (Array.isArray(get()?.[k]) ? (get()![k] as T[]) : []);
  const push = (k: string, v: unknown) => {
    const d = (F.debriefHints ??= {}) as Rec;
    ((d[k] ??= []) as unknown[]).push(v);
  };
  const remove = (k: string, i: number) => {
    const xs = list(k);
    xs.splice(i, 1);
    if (!xs.length) delete get()![k];
    if (get() && !Object.keys(get()!).length) delete F.debriefHints;
  };
  return { list, push, remove };
}

/** The anchored lines of `k` (openers, handout questions): each an anchor and its words, Remove, and Add up to `max`. */
function anchoredRows(F: Rec, k: 'openers' | 'handoutQuestions', name: string, max: number, put: ReturnType<typeof endSection>['put'], changed: () => void, redraw: (focus?: string) => void, count?: { max: number; words: string }) {
  const b = block(F);
  const xs = b.list<Rec>(k);
  const at = `/debriefHints/${k}`;
  const rows = xs.map((x, i) => {
    const n = `${name} ${i + 1}`;
    const pick = anchorPicker(F, 'debrief', x, 'at', `${n}: timed from`, () => (changed(), (says.textContent = `Timed from ${anchorWords(F, x.at, 'debrief')}.`)));
    const says = h('span', { class: 'sb-hint' }, `Timed from ${anchorWords(F, x.at, 'debrief')}.`);
    const text = textField(x, 'text', `${n}: its words`, { required: true, count, changed });
    return put(`${at}/${i}`, h('li', { class: 'sb-endrow' },
      h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-n', 'aria-hidden': 'true' }, String(i + 1)), put(`${at}/${i}/at`, pick.el, ...pick.controls), says),
      put(`${at}/${i}/text`, h('div', { class: 'field' }, text.t, text.why, text.count ?? ''), text.t),
      h('div', { class: 'sb-acts' }, button('Remove', () => (b.remove(k, i), changed(), redraw(`[data-add="${k}"]`)), 'small ghost', { 'aria-label': `Remove ${n.toLowerCase()}` }))));
  });
  const add = button(k === 'openers' ? 'Add an opener' : 'Add a question', () => {
    b.push(k, { at: 'start', text: '' });
    changed();
    redraw(`[aria-label="${name} ${xs.length + 1}: its words"]`);
  }, 'small', { disabled: xs.length >= max, 'data-add': k });
  return put(at, h('div', { class: 'field' }, xs.length ? h('ol', { class: 'sb-endlist' }, ...rows) : hint('None.'),
    h('div', { class: 'sb-line-add' }, add, xs.length >= max ? h('span', { class: 'sb-hint' }, `The format takes at most ${max}.`) : '')));
}

/** The Debrief hints section: what the case is built to show, and the openers. */
export function debriefSection(form: CardForm, changed: () => void, redrawn: () => void): EndSectionView {
  const F = form.fields as Rec;
  const { view, put, fill, slots } = endSection('debrief', 'Debrief hints', 'the card author’s words on the instructor’s Debrief page 2, never on the learner handout');
  const draw = (focus?: string) => {
    slots.clear();
    const b = block(F);
    const lines = b.list<string>('show');
    const max = DEBRIEF_LIMITS.show;
    const rows = lines.map((_, i) => {
      const t = textField(lines as unknown as Rec, String(i), `Built to show, line ${i + 1}`, { required: true, changed });
      return put(`/debriefHints/show/${i}`, h('li', { class: 'sb-line' }, t.t, t.why,
        button('Remove', () => (b.remove('show', i), changed(), draw('[data-add="show"]')), 'small ghost', { 'aria-label': `Remove built-to-show line ${i + 1}` })), t.t);
    });
    const showField = put('/debriefHints/show', h('div', { class: 'field' }, h('span', {}, `What the case is built to show (${upTo(max)} lines)`),
      lines.length ? h('ol', { class: 'sb-endlist' }, ...rows) : hint('None.'),
      h('div', { class: 'sb-line-add' }, button('Add a line', () => (b.push('show', ''), changed(), draw(`[aria-label="Built to show, line ${lines.length + 1}"]`)), 'small', { disabled: lines.length >= max, 'data-add': 'show', 'aria-label': 'Add a built-to-show line' }),
        lines.length >= max ? h('span', { class: 'sb-hint' }, `The format takes at most ${max}.`) : '')));
    fill(
      hint('Printed as written under “From the card’s author”. Lines that only the card can say: what the case is built to show, and sentences that open the analysis.'),
      showField,
      h('h3', {}, 'Openers'),
      hint(`${upTo(DEBRIEF_LIMITS.openers)[0]!.toUpperCase()}${upTo(DEBRIEF_LIMITS.openers).slice(1)} sentences that open the analysis, each timed from a run event of this card; an opener whose event did not happen on the kept course is not printed.`),
      anchoredRows(F, 'openers', 'Opener', DEBRIEF_LIMITS.openers, put, changed, draw),
    );
    redrawn();
    if (focus) queueMicrotask(() => view.el.querySelector<HTMLElement>(`${focus}:not([disabled])`)?.focus());
  };
  draw();
  view.shown = () => draw();
  return view;
}

/** The Handout questions section: at most 3, each one printed line of 92 characters, counted live. */
export function handoutSection(form: CardForm, changed: () => void, redrawn: () => void): EndSectionView {
  const F = form.fields as Rec;
  const { view, fill, put, slots } = endSection('handout', 'Handout questions', 'printed on the learner handout with their anchor’s time');
  const max = DEBRIEF_LIMITS.questionChars;
  const draw = (focus?: string) => {
    slots.clear();
    fill(
      hint(`${upTo(DEBRIEF_LIMITS.handoutQuestions)[0]!.toUpperCase()}${upTo(DEBRIEF_LIMITS.handoutQuestions).slice(1)} questions, printed in place of the handout’s first two fixed prompts, each with its anchor’s time; a question whose event did not happen on the kept course is not printed. Only questions the clinical owner has reviewed enter a card.`),
      hint(`At most ${max} characters each: one printed line of the A4 handout after its mm:ss label (measured); a wrapped question pushes the handout over one page.`),
      anchoredRows(F, 'handoutQuestions', 'Question', DEBRIEF_LIMITS.handoutQuestions, put, changed, draw, { max, words: `the validator refuses a question longer than one handout line` }),
    );
    redrawn();
    if (focus) queueMicrotask(() => view.el.querySelector<HTMLElement>(`${focus}:not([disabled])`)?.focus());
  };
  draw();
  view.shown = () => draw();
  return view;
}
