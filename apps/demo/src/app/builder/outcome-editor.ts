// The builder's Outcomes section (docs/plans/scenario-builder.md §5.2; piece B5): what the physiology should reach,
// reported reached or not reached in the debrief and never an action's grade. Each outcome is its words, a truth rule
// (B3's rule tree, phase-editor.ts `ruleEditor`: ALL / ANY / NOT and the five leaves), the anchor its window opens at
// (the anchor picker, anchor-picker.ts: the start, a phase's entry, an action's taking, the pulse loss, ROSC, or the first
// second a truth rule holds) and the window's seconds, with the sources of its numbers. Every control edits the form in
// place and calls `changed()`; a new outcome is written only complete (words, an id, a rule whose numbers are typed, a
// window above 0 s), as the schema requires every field but `src`.
import type { ScenarioDocV2 } from '@pme/controller/scenario';
import { button, confirmDialog, h } from '../ui.ts';
import { anchorPicker, endSection, hint, textField, type EndSectionView } from './anchor-picker.ts';
import { anchorWords, entryIdFrom, entryIdProblem } from './anchors.ts';
import { docOf, type CardForm } from './form.ts';
import { holderOf, numInput, ruleEditor, select } from './phase-editor.ts';
import { draftLeaf, LEAF_KINDS, leafComplete, type LeafKind } from './phases.ts';

type Rec = Record<string, unknown>;
/** The window's seconds (the schema's `outcome.withinS`: above 0). */
const WITHIN = { above: 0 } as const;

export function outcomeSection(form: CardForm, changed: () => void, redrawn: () => void): EndSectionView {
  const F = form.fields as Rec;
  const outcomes = (): Rec[] => (Array.isArray(F.outcomes) ? (F.outcomes as Rec[]) : []);
  const phases = () => (Array.isArray(F.phases) ? (F.phases as Rec[]) : []) as never[];
  const { view, put, fill, slots } = endSection('outcomes', 'Outcomes', 'what the physiology should reach: reached or not reached, never an action’s grade');
  /** Open forms: a new outcome, a rule anchor being written for outcome i. */
  let adding: { text: string; id: string; idTouched: boolean; leaf: Rec; within?: number } | null = null;
  let ruleFor: number | null = null;

  const rules = ruleEditor({
    phases, doc: (): ScenarioDocV2 => docOf(form), slots,
    leafChanged: changed,
    restructure: (root, node) => (changed(), draw({ root, node })),
    redraw: () => draw(),
  });

  /** A first condition's form (B4's leaf form): the leaf's kind, then its fields; `done` once every number is typed. */
  const leafForm = (name: string, leafOf: () => Rec, set: (l: Rec) => void, ready: () => void) => {
    const kind = select(String(Object.keys(leafOf())[0]), [[null, LEAF_KINDS.map(([k, w]) => [k, w])]], `${name}: its first condition`);
    const fields = h('div', {});
    const drawFields = () => fields.replaceChildren(rules.leafFields(leafOf(), ready, false, name).el);
    kind.addEventListener('change', () => {
      set(draftLeaf(kind.value as LeafKind, String((phases()[0] as Rec | undefined)?.id ?? '')));
      drawFields();
      ready();
    });
    drawFields();
    return h('div', {}, h('div', { class: 'sb-leafrow' }, kind), fields);
  };

  const outcome = (o: Rec, i: number): HTMLElement => {
    const at = `/outcomes/${i}`;
    const n = `Outcome ${i + 1}`;
    const text = textField(o, 'text', `${n}: what it says`, { required: true, changed });
    const idIn = h('input', { type: 'text', class: 'input', autocomplete: 'off', spellcheck: false, 'aria-label': `${n}: id` });
    idIn.value = String(o.id ?? '');
    const idWhy = h('span', { class: 'sb-numwhy', 'aria-live': 'polite' });
    idIn.addEventListener('change', () => {
      const why = entryIdProblem(outcomes(), i, idIn.value.trim());
      idWhy.textContent = why ? `${why}: not written, the outcome keeps ${String(o.id)}` : '';
      if (why) return void idIn.setAttribute('aria-invalid', 'true');
      idIn.removeAttribute('aria-invalid');
      o.id = idIn.value.trim();
      changed();
    });
    // the anchor: a string form by the picker; a rule anchor as its tree (its own form when first chosen)
    const says = h('span', { class: 'sb-hint' });
    const saysNow = () => (says.textContent = `Its window opens at ${anchorWords(F, o.anchor, 'outcome')}, for ${typeof o.withinS === 'number' ? `${o.withinS} s` : 'a time not set'}.`);
    const pick = anchorPicker(F, 'outcome', o, 'anchor', `${n}: its window opens at`, () => (changed(), saysNow(), ruleFor === i && ((ruleFor = null), draw())), () => ((ruleFor = i), draw({ focus: `[aria-label="${n}: the anchor’s rule: its first condition"]` })));
    const anchorParts: Array<HTMLElement | string> = [pick.el];
    if (o.anchor && typeof o.anchor === 'object' && 'rule' in (o.anchor as Rec)) {
      anchorParts.push(h('div', { class: 'sb-rulewrap' }, rules.tree(holderOf(o.anchor as Rec, 'rule'), `${at}/anchor/rule`, `${n}: the anchor’s rule`)));
    }
    if (ruleFor === i) {
      let leaf = draftLeaf('value', String((phases()[0] as Rec | undefined)?.id ?? ''));
      const ok = button('Use this rule', () => {
        if (!leafComplete(leaf)) return;
        o.anchor = { rule: leaf };
        ruleFor = null;
        changed();
        draw({ root: `${at}/anchor/rule`, node: '' });
      }, 'small primary');
      const ready = () => (ok.disabled = !leafComplete(leaf));
      anchorParts.push(h('div', { class: 'sb-adder', role: 'group', 'aria-label': `${n}: the anchor’s rule` }, leafForm(`${n}: the anchor’s rule`, () => leaf, (l) => (leaf = l), ready),
        h('div', { class: 'sb-acts' }, ok, button('Cancel', () => ((ruleFor = null), draw()), 'small ghost')), hint('Waits until every number the condition needs is typed.')));
      ready();
    }
    const within = numInput(o, 'withinS', WITHIN, `${n}: within how many seconds`, () => (changed(), saysNow()), true, { min: '0' });
    const src = textField(o, 'src', `${n}: sources of its numbers`, { rows: 2, changed });
    saysNow();
    return put(at, h('li', { class: 'sb-endrow' },
      h('h3', {}, n, ' ', h('small', {}, 'reached or not reached')),
      h('div', { class: 'sb-row', style: '--n:2' }, put(`${at}/text`, h('div', { class: 'field' }, h('span', {}, 'What it says (the debrief’s line)'), text.t, text.why), text.t),
        put(`${at}/id`, h('div', { class: 'field' }, h('span', {}, 'Outcome id'), idIn, idWhy), idIn)),
      // the rule's slots are its tree's nodes (`${at}/rule` its root), as B3's and B4's
      h('div', { class: 'field' }, h('span', {}, 'Reached when (a truth rule on the patient)'), h('div', { class: 'sb-rulewrap' }, rules.tree(holderOf(o, 'rule'), `${at}/rule`, `${n}: the rule`))),
      put(`${at}/anchor`, h('div', { class: 'field' }, h('span', {}, 'Its window opens at'), ...anchorParts), ...pick.controls),
      put(`${at}/withinS`, h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'Within'), within.input, h('span', { class: 'sb-hint' }, 's'), within.why), within.input),
      says,
      put(`${at}/src`, h('div', { class: 'field' }, h('span', {}, 'Sources of its numbers'), src.t, src.why, hint('Every number with its quote and page; a number no source states is a placeholder, marked for the owner.')), src.t),
      h('div', { class: 'sb-acts' }, button('Remove this outcome', () => void (async () => {
        if (!(await confirmDialog('Remove this outcome?', `“${String(o.text)}” is removed from the card. The draft’s snapshots keep it.`, 'Remove outcome', true, 'Keep the outcome'))) return;
        outcomes().splice(i, 1);
        if (!outcomes().length) delete F.outcomes;
        changed();
        draw({ focus: '[data-add="outcomes"]' });
      })(), 'ghost', { 'aria-label': `Remove outcome ${i + 1}` }))));
  };

  const newOutcome = (): HTMLElement => {
    const a = adding!;
    const words = h('input', { type: 'text', class: 'input', autocomplete: 'off', 'aria-label': 'New outcome: what it says', value: a.text });
    const idIn = h('input', { type: 'text', class: 'input', autocomplete: 'off', spellcheck: false, 'aria-label': 'New outcome: id', value: a.id });
    const why = h('p', { class: 'sb-hint', 'aria-live': 'polite' });
    const holder: Rec = { anchor: 'start' };
    const pick = anchorPicker(F, 'outcome', holder, 'anchor', 'New outcome: its window opens at', () => undefined);
    const w: Rec = {};
    const ok = button('Add the outcome', () => {
      F.outcomes = [...outcomes(), { id: a.id, text: a.text, rule: a.leaf, anchor: holder.anchor, withinS: w.withinS }];
      adding = null;
      changed();
      draw({ focus: `[aria-label="Outcome ${outcomes().length}: what it says"]` });
    }, 'primary');
    const ready = () => {
      const p = a.text.trim() === '' ? 'words are needed' : entryIdProblem(outcomes(), -1, a.id) ?? (!leafComplete(a.leaf) ? 'the rule’s numbers are needed' : typeof w.withinS !== 'number' ? 'a window above 0 s is needed' : null);
      why.textContent = p && a.text.trim() !== '' ? `${p[0]!.toUpperCase()}${p.slice(1)}.` : '';
      ok.disabled = !!p;
    };
    words.addEventListener('input', () => {
      a.text = words.value;
      if (!a.idTouched) idIn.value = a.id = entryIdFrom(outcomes(), a.text || 'outcome', 'outcome');
      ready();
    });
    idIn.addEventListener('input', () => ((a.idTouched = true), (a.id = idIn.value.trim()), ready()));
    const within = numInput(w, 'withinS', WITHIN, 'New outcome: within how many seconds', ready, false, { min: '0' });
    const lf = leafForm('New outcome: reached when', () => a.leaf, (l) => (a.leaf = l), ready);
    ready();
    return h('div', { class: 'sb-adder', role: 'group', 'aria-label': 'A new outcome' },
      h('div', { class: 'sb-row', style: '--n:2' }, h('div', { class: 'field' }, h('span', {}, 'What it says'), words), h('div', { class: 'field' }, h('span', {}, 'Outcome id'), idIn)),
      h('div', { class: 'field' }, h('span', {}, 'Reached when (its first condition; more once it exists)'), lf),
      h('div', { class: 'field' }, h('span', {}, 'Its window opens at (a rule anchor once it exists)'), pick.el),
      h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'Within'), within.input, h('span', { class: 'sb-hint' }, 's'), within.why),
      why, h('div', { class: 'sb-acts' }, ok, button('Cancel', () => ((adding = null), draw({ focus: '[data-add="outcomes"]' })), 'ghost')));
  };

  const draw = (f: { root?: string; node?: string; focus?: string } = {}) => {
    slots.clear();
    const xs = outcomes();
    fill(
      hint('What the physiology should reach, each reported reached or not reached on the Debrief: a truth rule on the patient that holds within a window from an anchor. Never an action’s grade.'),
      xs.length ? h('ol', { class: 'sb-endlist' }, ...xs.map(outcome)) : hint('This card has no outcomes.'),
      adding ? newOutcome() : button('Add an outcome', () => {
        adding = { text: '', id: entryIdFrom(xs, 'outcome', 'outcome'), idTouched: false, leaf: draftLeaf('value', String((phases()[0] as Rec | undefined)?.id ?? '')) };
        draw({ focus: '[aria-label="New outcome: what it says"]' });
      }, 'small', { 'data-add': 'outcomes' }),
    );
    redrawn();
    queueMicrotask(() => {
      let target: HTMLElement | null = null;
      if (f.root !== undefined) {
        const lis = [...view.el.querySelectorAll<HTMLElement>(`[data-rule="${f.root}"]`)];
        const node = f.node ?? '';
        const li = (node.endsWith('/new') ? lis.filter((x) => x.dataset.node!.startsWith(`${node.slice(0, -4)}/`)).at(-1) : lis.find((x) => x.dataset.node === node)) ?? lis[0];
        target = li?.querySelector<HTMLElement>('select, input, button') ?? null;
      } else if (f.focus) target = view.el.querySelector<HTMLElement>(`${f.focus}:not([disabled])`) ?? view.el.querySelector<HTMLElement>(f.focus);
      target?.focus();
    });
  };
  draw();
  view.shown = () => {
    adding = null;
    ruleFor = null;
    rules.closeAdder();
    draw();
  };
  return view;
}
