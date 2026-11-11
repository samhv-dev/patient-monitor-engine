// The builder's Script section (docs/plans/scenario-builder.md §5.2; piece B5): what the card does itself, card-set and
// never graded. Each entry fires at an anchor (the anchor picker, anchor-picker.ts: a phase's entry, the nth taking of
// an action, a time after the start; only this card's phases and actions) and sends its commands. A new command comes
// from B4's command form (action-editor.ts `commandForm`: the Drug sheet's drugs, fluids and vaporisers) with the
// card-set events the library's scripts use (a condition, the Drug sheet's blood loss, a rhythm; the console's own
// builders), so the builder writes the commands the app itself sends. A command of another kind is kept as the card
// has it, read in the app's words, and can be reordered or removed. Every control edits the form in place and calls
// `changed()`; an entry is written only complete (an id, an anchor, a command), and its last command stays.
import { describeCommand, CONDITIONS } from '../describe.ts';
import { bleed, condition, CONDITION_IDS, rhythm } from '../../physiology-console/actions.ts';
import { rhythmGroups, rhythmLabel } from '../rhythms.ts';
import { button, confirmDialog, h } from '../ui.ts';
import { commandForm, type CommandFormOpts } from './action-editor.ts';
import { anchorPicker, endSection, hint, textField, type EndSectionView } from './anchor-picker.ts';
import { anchorWords, entryIdFrom, entryIdProblem, firstAnchor, writeAnchor } from './anchors.ts';
import type { CardForm } from './form.ts';

type Rec = Record<string, unknown>;

/** The card-set events the script adds besides the Drug sheet's items. [ENG: ui] the groups' words are the builder's. */
const CARD_SET: NonNullable<CommandFormOpts['more']> = {
  groups: [
    ['Conditions', CONDITION_IDS.map((c) => [`cond:${c}`, CONDITIONS[c] ?? c] as [string, string])],
    ['Blood loss', [['bleed:', 'Blood loss (the Drug sheet’s)']]],
    ...rhythmGroups().map(([g, ids]) => [`Rhythm: ${g}`, ids.map((id) => [`rhythm:${id}`, rhythmLabel(id)] as [string, string])] as [string, Array<[string, string]>]),
  ],
  fields(kind, _id, st, numIn) {
    if (kind === 'cond') {
      st.sev = 1;
      return [h('span', { class: 'sb-hint' }, 'Severity'), numIn('sev', 'severity, from 0 (removed) to 1'), h('span', { class: 'sb-hint' }, 'from 0 (removed) to 1')];
    }
    if (kind === 'bleed') {
      st.vol = 500;
      st.min = 10;
      return [numIn('vol', 'blood lost, mL'), h('span', { class: 'sb-hint' }, 'mL over'), numIn('min', 'over how many minutes'), h('span', { class: 'sb-hint' }, 'min')];
    }
    return kind === 'rhythm' ? [] : null;
  },
  build(kind, id, st) {
    const n = (k: string) => (typeof st[k] === 'number' && Number.isFinite(st[k]) ? (st[k] as number) : Number.NaN);
    if (kind === 'cond') return n('sev') >= 0 && n('sev') <= 1 ? (condition(id, n('sev')) as Rec) : null;
    if (kind === 'bleed') return n('vol') > 0 && n('min') > 0 ? (bleed(n('vol'), n('min') * 60) as Rec) : null;
    if (kind === 'rhythm') return rhythm(id) as Rec;
    return null;
  },
};

export function scriptSection(form: CardForm, changed: () => void, redrawn: () => void): EndSectionView {
  const F = form.fields as Rec;
  const entries = (): Rec[] => (Array.isArray(F.script) ? (F.script as Rec[]) : []);
  const { view, put, fill, slots } = endSection('script', 'Script', 'card-set, never graded: what the card does itself at an anchor');
  /** The command form open: an entry's index, or 'new'. */
  let adding: number | 'new' | null = null;
  let draft: Rec | null = null;

  const commands = (s: Rec, at: string, i: number): HTMLElement => {
    const cs = s.commands as Rec[];
    const rows = cs.map((c, k) => {
      const move = (d: number) => {
        [cs[k], cs[k + d]] = [cs[k + d]!, cs[k]!];
        changed();
        draw(`[data-f="cmd:${i}:${k + d}:${d < 0 ? 'up' : 'down'}"]`);
      };
      return put(`${at}/commands/${k}`, h('li', { class: 'sb-nextrow' }, h('span', { class: 'sb-n', 'aria-hidden': 'true' }, String(k + 1)), h('span', {}, describeCommand(c)),
        button('Up', () => move(-1), 'small ghost', { 'aria-label': `Entry ${i + 1}: move command ${k + 1} up`, disabled: k === 0, 'data-f': `cmd:${i}:${k}:up` }),
        button('Down', () => move(1), 'small ghost', { 'aria-label': `Entry ${i + 1}: move command ${k + 1} down`, disabled: k === cs.length - 1, 'data-f': `cmd:${i}:${k}:down` }),
        button('Remove', () => (cs.splice(k, 1), changed(), draw()), 'small ghost', { 'aria-label': `Entry ${i + 1}: remove command ${k + 1}`, disabled: cs.length === 1 })));
    });
    const add = adding === i
      ? commandForm({ add: (c) => (cs.push(c), (adding = null), changed(), draw()), cancel: () => ((adding = null), draw()), addWords: 'Add to the entry', sends: 'The entry will send', more: CARD_SET })
      : button('Add a command', () => ((adding = i), draw('[aria-label="New command: what"]')), 'small', { 'aria-label': `Entry ${i + 1}: add a command` });
    return put(`${at}/commands`, h('div', { class: 'field' }, h('span', {}, 'Sends'), h('ol', { class: 'sb-next' }, ...rows), add,
      cs.length === 1 ? hint('An entry sends at least one command: its last one stays (remove the entry instead).') : ''));
  };

  const entry = (s: Rec, i: number): HTMLElement => {
    const at = `/script/${i}`;
    const n = `Entry ${i + 1}`;
    const idIn = h('input', { type: 'text', class: 'input', autocomplete: 'off', spellcheck: false, 'aria-label': `${n}: id` });
    idIn.value = String(s.id ?? '');
    const idWhy = h('span', { class: 'sb-numwhy', 'aria-live': 'polite' });
    idIn.addEventListener('change', () => {
      const why = entryIdProblem(entries(), i, idIn.value.trim());
      idWhy.textContent = why ? `${why}: not written, the entry keeps ${String(s.id)}` : '';
      if (why) return void idIn.setAttribute('aria-invalid', 'true');
      idIn.removeAttribute('aria-invalid');
      s.id = idIn.value.trim();
      changed();
    });
    const says = h('span', { class: 'sb-hint' }, `Fires at ${anchorWords(F, s.on, 'script')}.`);
    const pick = anchorPicker(F, 'script', s, 'on', `${n}: fires at`, () => (changed(), (says.textContent = `Fires at ${anchorWords(F, s.on, 'script')}.`)));
    const src = textField(s, 'src', `${n}: sources of its numbers`, { rows: 2, changed });
    return put(at, h('li', { class: 'sb-endrow' },
      h('h3', {}, n, ' ', h('small', {}, 'card-set, never graded')),
      h('div', { class: 'sb-row', style: '--n:2' }, put(`${at}/id`, h('div', { class: 'field' }, h('span', {}, 'Entry id'), idIn, idWhy), idIn),
        put(`${at}/on`, h('div', { class: 'field' }, h('span', {}, 'Fires at'), pick.el, says), ...pick.controls)),
      commands(s, at, i),
      put(`${at}/src`, h('div', { class: 'field' }, h('span', {}, 'Sources of its numbers'), src.t, src.why, hint('Every number with its quote and page; a number no source states is a placeholder, marked for the owner.')), src.t),
      h('div', { class: 'sb-acts' }, button('Remove this entry', () => void (async () => {
        if (!(await confirmDialog('Remove this script entry?', `${String(s.id)} is removed from the card. The draft’s snapshots keep it.`, 'Remove entry', true, 'Keep the entry'))) return;
        entries().splice(i, 1);
        if (!entries().length) delete F.script;
        changed();
        draw('[data-add="script"]');
      })(), 'ghost', { 'aria-label': `Remove script entry ${i + 1}` }))));
  };

  const newEntry = (): HTMLElement => {
    const d = draft!;
    const idIn = h('input', { type: 'text', class: 'input', autocomplete: 'off', spellcheck: false, 'aria-label': 'New entry: id', value: String(d.id) });
    const why = h('span', { class: 'sb-numwhy', 'aria-live': 'polite' });
    idIn.addEventListener('input', () => {
      d.id = idIn.value.trim();
      why.textContent = entryIdProblem(entries(), -1, String(d.id)) ?? '';
    });
    const pick = anchorPicker(F, 'script', d, 'on', 'New entry: fires at', () => undefined);
    const form2 = commandForm({
      add: (c) => {
        if (entryIdProblem(entries(), -1, String(d.id))) return void (why.textContent = `${entryIdProblem(entries(), -1, String(d.id))}: the entry is not added`);
        F.script = [...entries(), { id: d.id, on: d.on, commands: [c] }];
        adding = null;
        draft = null;
        changed();
        draw(`[aria-label="Entry ${entries().length}: id"]`);
      },
      cancel: () => ((adding = null), (draft = null), draw('[data-add="script"]')),
      addWords: 'Add the entry', sends: 'The entry will send', more: CARD_SET,
    });
    return h('div', { class: 'sb-adder', role: 'group', 'aria-label': 'A new script entry' },
      h('div', { class: 'sb-row', style: '--n:2' }, h('div', { class: 'field' }, h('span', {}, 'Entry id'), idIn, why), h('div', { class: 'field' }, h('span', {}, 'Fires at'), pick.el)),
      h('p', { class: 'sb-hint' }, 'Its first command (more once it exists):'), form2);
  };

  const draw = (focus?: string) => {
    slots.clear();
    const xs = entries();
    fill(
      hint('Events the card imposes on the patient at an anchor: a condition, a bleed, a rhythm, a drug the story gives. Card-set and never graded: no row, no verdict; the team’s acts are Actions.'),
      xs.length ? h('ol', { class: 'sb-endlist' }, ...xs.map(entry)) : hint('This card has no script.'),
      adding === 'new' ? newEntry() : button('Add a script entry', () => {
        adding = 'new';
        draft = { id: entryIdFrom(xs, 'entry', 'entry'), on: writeAnchor(firstAnchor(F, Array.isArray(F.phases) && (F.phases as unknown[]).length ? 'phase' : 'atScenarioS')) };
        draw('[aria-label="New entry: id"]');
      }, 'small', { 'data-add': 'script' }),
    );
    redrawn();
    if (focus) queueMicrotask(() => view.el.querySelector<HTMLElement>(`${focus}:not([disabled])`)?.focus() ?? view.el.querySelector<HTMLElement>(focus)?.focus());
  };
  draw();
  view.shown = () => {
    adding = null;
    draft = null;
    draw();
  };
  return view;
}
