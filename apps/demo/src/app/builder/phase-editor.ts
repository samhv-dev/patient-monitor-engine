// The builder's Phases section (docs/plans/scenario-builder.md §5.3, mock-up 02-phase-editor; piece B3): the course of the
// case, one phase open at a time. A phase's entry rule is a tree an author reads and changes (ALL OF / ANY OF / NOT and
// the five leaves on the engine's truth), how long it must hold, where the phase may lead (in order: the first rule that
// holds wins), a line that draws where it sits, and beside each rule the words Instructor v2 will show for it, from its
// own functions. Every control edits the form in place (B1's `formOf`) and calls `changed()`; the page writes through
// `docOf`. Each control is a slot keyed by the validator path it edits, so a line `fieldOf` places shows on that phase, rule
// node or `next` row. Every list is the format's own (phases.ts): no free text where a list exists, and a control
// offers only what the validator accepts. A number the schema would refuse is not written (the card keeps its number and
// the field says why), so typing never makes a rule the validator refuses.
import { rhythmGroups, rhythmLabel } from '../rhythms.ts';
import { button, confirmDialog, h } from '../ui.ts';
import type { ScenarioDocV2 } from '@pme/controller/scenario';
import type { FieldRef } from './fields.ts';
import { docOf, type CardForm } from './form.ts';
import {
  CONC_VARS, courseWarnings, draftLeaf, editsAt, flowOf, GROUP_WORDS, idFromLabel, idProblem, instructorWords, kindOf, labelOf, LEAF_KINDS, leafComplete,
  mentionsOf, nodeAt, nodeWords, NUM, numProblem, OPS, rawNames, renamePhase, RULE_VARS, SLOPE_OPS, tree, varChoice,
  type LeafKind, type NodePath, type NumSpec,
} from './phases.ts';
import type { SectionView, Slot } from './sections.ts';

type Rec = Record<string, unknown>;
type Phase = Rec;

let seq = 0;
/** A page-unique id for a control or a message box. */
export const uid = (p: string) => `${p}-${(++seq).toString(36)}`;
/** A slot on `el`: its message box appended, its controls. */
export const slot = (el: HTMLElement, controls: HTMLElement[] = []): Slot => {
  const msgs = h('div', { class: 'sb-msgs', id: uid('sbm') });
  el.append(msgs);
  return { el, msgs, controls };
};

/** Text with the format's own names (a variable `phaseRuleWords` prints by name, a rhythm id) in `<code>`. */
export function coded(text: string, names: readonly string[]): Array<string | HTMLElement> {
  if (!names.length) return [text];
  const esc = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length);
  const re = new RegExp(`(?<![A-Za-z0-9_.:-])(${esc.join('|')})(?![A-Za-z0-9_.-])`, 'g');
  const out: Array<string | HTMLElement> = [];
  let at = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > at) out.push(text.slice(at, m.index));
    out.push(h('code', {}, m[0]));
    at = m.index! + m[0].length;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

/** A select over `groups` of [value, text]; the card's own value is kept (and named) when no list has it. */
export function select(value: string, groups: Array<[label: string | null, Array<[string, string]>]>, label: string, unknown = 'not in this list'): HTMLSelectElement {
  const s = h('select', { class: 'input', 'aria-label': label });
  const all = groups.flatMap(([, xs]) => xs.map(([v]) => v));
  for (const [g, xs] of all.includes(value) ? groups : [...groups, [null, [[value, unknown]]] as [null, Array<[string, string]>]]) {
    const opts = xs.map(([v, t]) => h('option', { value: v }, t));
    if (g) s.append(h('optgroup', { label: g }, ...opts));
    else s.append(...opts);
  }
  s.value = value;
  return s;
}

/** A number field over `o[k]`: a number the schema accepts is written; another is not (with `keep`, the card keeps its
 *  number and the field says so; without, the field is left out, as an add form's leaf stays incomplete). `extra`: a
 *  check across fields the spec cannot state (B4: a fail-after time greater than the window). */
export function numInput(o: Rec, k: string, spec: NumSpec, label: string, write: () => void, keep: boolean, attrs: Record<string, string> = {}, extra?: (n: number | undefined) => string | null): { input: HTMLInputElement; why: HTMLElement } {
  const i = h('input', { type: 'number', inputmode: 'decimal', class: 'input sb-num', 'aria-label': label, step: 'any', ...attrs });
  const why = h('span', { class: 'sb-numwhy', id: uid('sbw'), 'aria-live': 'polite' });
  i.value = typeof o[k] === 'number' ? String(o[k]) : '';
  // the page's placing of the validator's lines resets aria-*; these data-* tell it what the field itself says
  i.dataset.describedby = why.id;
  i.setAttribute('aria-describedby', why.id);
  i.addEventListener('input', () => {
    const n = i.value.trim() === '' ? undefined : Number(i.value);
    const p = numProblem(spec, n) ?? extra?.(n) ?? null;
    if (p === null) {
      if (n === undefined) delete o[k];
      else o[k] = n;
      why.textContent = '';
      i.removeAttribute('aria-invalid');
      delete i.dataset.invalid;
    } else {
      if (!keep) delete o[k];
      why.textContent = keep && typeof o[k] === 'number' ? `${p}: not written, the card keeps ${o[k]}` : p;
      i.setAttribute('aria-invalid', 'true');
      i.dataset.invalid = 'true';
    }
    write();
  });
  return { input: i, why };
}

/** The variable picker: RULE_VARS' groups, then the concentrations, each "words (unit)". [ENG: ui] */
const VAR_GROUPS = (): Array<[string, Array<[string, string]>]> => {
  const g = new Map<string, Array<[string, string]>>();
  for (const x of [...RULE_VARS, ...CONC_VARS]) {
    if (!g.has(x.group)) g.set(x.group, []);
    g.get(x.group)!.push([x.v, `${x.words} (${x.unit})`]);
  }
  return [...g];
};
/** The signal leaf's choices: the pulse's two and every rhythm the engine draws, in the rhythm picker's groups and words
 *  (rhythms.ts). [ENG: ui] the pulse wording is the builder's. */
const SIGNALS = (): Array<[string, Array<[string, string]>]> => [
  ['The pulse', [['pulseLoss', 'No pulse (the model’s pulse loss)'], ['rosc', 'A pulse again (return of circulation)']]],
  ...rhythmGroups().map(([g, ids]) => [`Rhythm: ${g}`, ids.map((id) => [`rhythm:${id}`, rhythmLabel(id)] as [string, string])] as [string, Array<[string, string]>]),
];

/** A truth rule's place in the card: an object and its key (a phase's `enter`, an action's `precondition`, a window's
 *  `anchor.rule`). The tree's edits (phases.ts `tree`) read and write it as `enter`. */
export type RuleHolder = Rec & { enter?: unknown };
/** The holder of `o[k]`, for the tree's edits: its `enter` is `o[k]`, read and written in place (the key keeps its place). */
export const holderOf = (o: Rec, k: string): RuleHolder => ({
  get enter() { return o[k]; },
  set enter(v: unknown) { o[k] = v; },
});

/** What a rule tree's view needs from the section it is drawn in. */
export interface RuleEditCtx {
  phases(): Phase[];
  doc(): ScenarioDocV2;
  /** Every node's slot is put here, keyed by its validator path (`root` + the node's path). */
  slots: Map<string, Slot>;
  /** A leaf's field changed: written in place; the words beside the rule follow. */
  leafChanged(): void;
  /** The tree changed shape: written, then drawn again with the focus on node `focus` of rule `root`. */
  restructure(root: string, focus: NodePath): void;
  /** Drawn again, nothing written (an add form opened or closed). */
  redraw(): void;
}

/** A truth rule as a tree an author reads and changes (§5.3: ALL OF / ANY OF / NOT and the five leaves), for any rule of
 *  the card: B3's phase entry rules, and B4's action preconditions, conditional repeats, rule anchors and violations'
 *  `when`. Each node is a slot keyed by its validator path, so a line `fieldOf` places shows on the node it names. */
export function ruleEditor(ctx: RuleEditCtx) {
  /** The add form open: its rule's root and node, as one key. */
  let openAdder: string | null = null;

  /** The fields of leaf `r` (edited in place); `write()` after each change; `keep`: see numInput. */
  const leafFields = (r: Rec, write: () => void, keep: boolean, n: string): { el: HTMLElement; controls: HTMLElement[] } => {
    const k = kindOf(r) as LeafKind;
    const controls: HTMLElement[] = [];
    const parts: Array<HTMLElement | string> = [];
    const c = <T extends HTMLElement>(x: T) => (controls.push(x), x);
    const hint = (t: string) => h('span', { class: 'sb-hint' }, t);
    if (k === 'value' || k === 'slope' || k === 'unchanged') {
      const x = r[k] as Rec;
      const unit = h('span', { class: 'sb-hint' });
      const code = h('code', {});
      const showVar = () => {
        const v = varChoice(String(x.var));
        unit.textContent = k === 'slope' ? `${v.unit === 'no unit' ? '' : `${v.unit} `}per min` : v.unit;
        code.textContent = String(x.var);
      };
      const vs = c(select(String(x.var), VAR_GROUPS(), `${n}: what it reads`));
      vs.addEventListener('change', () => {
        x.var = vs.value;
        showVar();
        write();
      });
      showVar();
      parts.push(vs, code);
      if (k === 'value') {
        const op = c(select(String(x.op), [[null, OPS.map(([o, w]) => [o, `${o} ${w}`])]], `${n}: compared how`));
        op.addEventListener('change', () => ((x.op = op.value), write()));
        const v = numInput(x, 'value', NUM['value/value']!, `${n}: threshold`, write, keep);
        const f = numInput(x, 'forS', NUM['value/forS']!, `${n}: for how many seconds (optional)`, write, keep, { min: '0' });
        parts.push(op, c(v.input), unit, hint('for'), c(f.input), hint('s (optional)'), v.why, f.why);
      } else if (k === 'slope') {
        const op = c(select(String(x.op), [[null, SLOPE_OPS.map(([o, w]) => [o, `${o} ${w}`])]], `${n}: compared how`));
        op.addEventListener('change', () => ((x.op = op.value), write()));
        const v = numInput(x, 'perMin', NUM['slope/perMin']!, `${n}: rate per minute`, write, keep);
        const o = numInput(x, 'overS', NUM['slope/overS']!, `${n}: over how many seconds`, write, keep, { min: '0' });
        parts.push(hint('changing by'), op, c(v.input), unit, hint('over the last'), c(o.input), hint('s'), v.why, o.why);
      } else {
        const w = numInput(x, 'withinPct', NUM['unchanged/withinPct']!, `${n}: within how many per cent`, write, keep, { min: '0' });
        const mode = c(select(x.since === 'phaseStart' ? 'since' : 'over', [[null, [['since', 'since the phase began'], ['over', 'over the last…']]]], `${n}: unchanged since when`));
        const o = c(h('input', { type: 'number', inputmode: 'decimal', class: 'input sb-num', 'aria-label': `${n}: over how many seconds`, step: 'any', min: '0' }));
        const why = h('span', { class: 'sb-numwhy', 'aria-live': 'polite', id: uid('sbw') });
        o.dataset.describedby = why.id;
        o.setAttribute('aria-describedby', why.id);
        const sUnit = hint('s');
        o.value = typeof x.overS === 'number' ? String(x.overS) : '';
        // the schema's oneOf: exactly one of `since` and `overS`; a switch writes only a complete one
        const apply = () => {
          why.textContent = '';
          o.removeAttribute('aria-invalid');
          delete o.dataset.invalid;
          if (mode.value === 'since') {
            if (x.since !== 'phaseStart' || 'overS' in x) {
              delete x.overS;
              x.since = 'phaseStart';
            }
          } else {
            const v = o.value.trim() === '' ? undefined : Number(o.value);
            const p = numProblem(NUM['unchanged/overS']!, v);
            if (p === null) {
              delete x.since;
              x.overS = v;
            } else {
              if (!keep) {
                delete x.since;
                delete x.overS;
              }
              why.textContent = keep ? `${p}: not written, the card keeps ${x.since === 'phaseStart' ? '“since the phase began”' : `${x.overS} s`}` : p;
              o.setAttribute('aria-invalid', 'true');
              o.dataset.invalid = 'true';
            }
          }
          o.hidden = sUnit.hidden = mode.value !== 'over';
          write();
        };
        mode.addEventListener('change', apply);
        o.addEventListener('input', apply);
        o.hidden = sUnit.hidden = mode.value !== 'over';
        parts.push(hint('within ±'), c(w.input), hint('%'), mode, o, sUnit, w.why, why);
      }
    } else if (k === 'visited') {
      const ps = ctx.phases().map((p) => [String(p.id), labelOf(p)] as [string, string]);
      const s = c(select(String(r.visited), [[null, ps]], `${n}: which phase`, 'not a phase of this card'));
      const code = h('code', {}, String(r.visited));
      s.addEventListener('change', () => ((r.visited = s.value), (code.textContent = s.value), write()));
      parts.push(hint('after the case has been in'), s, code);
    } else {
      const s = c(select(String(r.signal), SIGNALS(), `${n}: which signal`, 'not in this engine'));
      const code = h('code', {}, String(r.signal));
      s.addEventListener('change', () => ((r.signal = s.value), (code.textContent = s.value), write()));
      parts.push(s, code);
    }
    return { el: h('div', { class: 'sb-leafrow' }, ...parts), controls };
  };

  /** "Instructor v2 reads: …" for node `r`. */
  const says = (r: Rec): HTMLElement => {
    const d = ctx.doc();
    const w = nodeWords(r, d);
    return h('p', { class: 'sb-says' }, h('span', { class: 'sb-says-l' }, 'Instructor v2 reads: '), ...coded(w, rawNames(r, d, w)));
  };
  /** The "add a condition" form inside node `p` of the rule at `root`. */
  const adder = (holder: RuleHolder, root: string, p: NodePath, n: string): HTMLElement => {
    const first = String(ctx.phases()[0]?.id ?? '');
    let leaf = draftLeaf('value', first);
    const kind = select('value', [[null, LEAF_KINDS.map(([k, w]) => [k, w])]], `New condition in ${n}: its kind`);
    const fields = h('div', {});
    const add = button('Add the condition', () => {
      if (!tree.add(holder, p, leaf)) return;
      openAdder = null;
      ctx.restructure(root, `${p}/new`);
    }, 'small primary');
    const ready = () => (add.disabled = !leafComplete(leaf));
    const drawFields = () => fields.replaceChildren(leafFields(leaf, ready, false, `New condition in ${n}`).el);
    kind.addEventListener('change', () => {
      leaf = draftLeaf(kind.value as LeafKind, first);
      drawFields();
      ready();
    });
    drawFields();
    ready();
    const f = h('div', { class: 'sb-adder', role: 'group', 'aria-label': `New condition in ${n}` },
      h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'New condition:'), kind), fields,
      h('div', { class: 'sb-acts' }, add, button('Cancel', () => ((openAdder = null), ctx.redraw()), 'small ghost')),
      h('p', { class: 'sb-hint' }, 'Add waits until every number the format needs is typed.'));
    queueMicrotask(() => kind.focus());
    return f;
  };

  /** Node `p` of the rule held by `holder`, whose validator path is `root`; `n` names it for the controls' labels. */
  const node = (holder: RuleHolder, root: string, p: NodePath, n: string): HTMLElement => {
    const r = nodeAt(holder.enter, p)!;
    const k = kindOf(r);
    const edits = editsAt(holder.enter, p);
    const msgs = h('div', { class: 'sb-msgs', id: uid('sbm') });
    const acts: HTMLElement[] = [];
    const act = (label: string, aria: string, go: () => boolean | void, focus?: string) =>
      acts.push(button(label, () => {
        if (go() === false) return;
        ctx.restructure(root, focus ?? p);
      }, 'small ghost', { 'aria-label': aria }));
    const isGroup = k === 'all' || k === 'any';
    const here = root + p;
    const adding = () => (openAdder === here ? adder(holder, root, p, n) : '');
    if (isGroup || p === '') act('Add a condition', `Add a condition to ${n}`, () => {
      openAdder = here;
      ctx.redraw();
      return false;
    });
    if (k !== 'not') act('Not', `Negate ${n}: wrap it in NOT`, () => tree.wrap(holder, p, 'not'));
    if (!isGroup && k !== 'not') act('Group', `Put ${n} in a group of its own (ALL OF)`, () => tree.wrap(holder, p, 'all'));
    if (edits.ungroup) act(k === 'not' ? 'Remove NOT' : 'Ungroup', k === 'not' ? `Remove the NOT around ${n}` : `Ungroup ${n}: its one condition in its place`, () => tree.ungroup(holder, p));
    if (edits.remove) act('Remove', `Remove ${n}`, () => tree.remove(holder, p), p.replace(/\/\d+$/, (m) => `/${Math.max(0, Number(m.slice(1)) - 1)}`));
    const bar = h('div', { class: 'sb-node-acts' }, ...acts);
    let li: HTMLElement;
    let controls: HTMLElement[] = [];
    if (isGroup) {
      const kids = r[k] as Rec[];
      const ks = select(k, [[null, [['all', 'ALL OF'], ['any', 'ANY OF']]]], `${n}: all or any`);
      ks.addEventListener('change', () => {
        tree.setGroup(holder, p, ks.value as 'all' | 'any');
        ctx.restructure(root, p);
      });
      controls = [ks];
      li = h('li', { class: 'sb-node sb-group', role: 'group', 'aria-label': `${n}: ${GROUP_WORDS[k]} ${kids.length} ${kids.length === 1 ? 'condition' : 'conditions'}` },
        h('div', { class: 'sb-node-head' }, ks, h('span', { class: 'sb-hint' }, k === 'all' ? 'every condition holds' : 'at least one condition holds'), bar), msgs, says(r),
        h('ol', { class: 'sb-kids' }, ...kids.map((_, j) => node(holder, root, `${p}/${k}/${j}`, `condition ${p === '' ? '' : `${n.replace(/^condition /, '')}.`}${j + 1}`))),
        adding());
    } else if (k === 'not') {
      li = h('li', { class: 'sb-node sb-group sb-not', role: 'group', 'aria-label': `${n}: NOT` },
        h('div', { class: 'sb-node-head' }, h('span', { class: 'sb-op' }, 'NOT'), h('span', { class: 'sb-hint' }, 'the condition inside does not hold'), bar), msgs, says(r),
        h('ol', { class: 'sb-kids' }, node(holder, root, `${p}/not`, `${n} (inside NOT)`)),
        adding());
    } else {
      const f = leafFields(r, ctx.leafChanged, true, n);
      controls = f.controls;
      const kindWords = LEAF_KINDS.find(([x]) => x === k)?.[1] ?? '';
      li = h('li', { class: 'sb-node sb-leaf', role: 'group', 'aria-label': `${n}: ${kindWords}` },
        h('div', { class: 'sb-node-head' }, h('span', { class: 'sb-kind' }, kindWords), bar), f.el, msgs, says(r),
        adding());
    }
    li.dataset.node = p;
    li.dataset.rule = root;
    ctx.slots.set(here, { el: li, msgs, controls });
    return li;
  };

  return {
    leafFields,
    says,
    /** The whole rule held by `holder` (its validator path `root`), as the tree's list; `n` names its root node. */
    tree: (holder: RuleHolder, root: string, n: string, labelledBy?: string) =>
      h('ol', { class: 'sb-rule', ...(labelledBy ? { 'aria-labelledby': labelledBy } : { 'aria-label': n }) }, node(holder, root, '', n)),
    closeAdder: () => void (openAdder = null),
  };
}

export interface PhaseSectionView extends SectionView {
  /** The slot a placed line shows in: a rule node, a field, a `next` row, the phase's heading, or its entry in the list. */
  slotFor(at: FieldRef): Slot;
  /** Open the phase a line names. */
  reveal(at: FieldRef): void;
  /** After the page placed its lines: each phase's entry in the list marked. */
  placed(lines: ReadonlyArray<{ kind: 'refusal' | 'warning'; at: FieldRef }>): void;
}

/** The Phases section over `form`; `changed()` after every edit, `redrawn()` after the open phase is drawn again (the
 *  page places its lines on the new slots). */
export function phaseSection(form: CardForm, changed: () => void, redrawn: () => void): PhaseSectionView {
  const F = form.fields as Rec;
  const phases = (): Phase[] => (Array.isArray(F.phases) ? (F.phases as Phase[]) : []);
  const doc = (): ScenarioDocV2 => docOf(form);
  let cur = Math.max(0, phases().findIndex((p) => p.initial !== true));
  let adding: { label: string; id: string; idTouched: boolean; leaf: Rec; from: string } | null = null;
  let focusNext: string | null = null;

  const headMsgs = h('div', { class: 'sb-msgs', id: uid('sbm') });
  const head: Slot = { el: h('div', { class: 'sb-head' }, h('h2', { id: 'sb-sec-phases' }, 'Phases ', h('small', {}, 'the course of the case: each phase entered by its own rule on the engine’s truth, never by a press')), headMsgs), msgs: headMsgs, controls: [] };
  const list = h('ol', { class: 'sb-phases', 'aria-label': 'The card’s phases' });
  const box = h('div', { class: 'sb-phase' });
  const el = h('section', { class: 'sb-panel sb-edit', 'aria-labelledby': 'sb-sec-phases', 'data-section': 'phases' }, head.el, list, box);
  const slots = new Map<string, Slot>();
  const listSlots: Slot[] = [];
  const view: PhaseSectionView = {
    id: 'phases', title: 'Phases', el, head, slots,
    slotFor(at) {
      if (at.entry === undefined) return head;
      if (at.entry !== cur || adding) return listSlots[at.entry] ?? head;
      for (let p = at.path; p.length > `/phases/${cur}`.length - 1; p = p.slice(0, Math.max(0, p.lastIndexOf('/')))) {
        const s = slots.get(p);
        if (s) return s;
      }
      return slots.get(`/phases/${cur}`) ?? head;
    },
    reveal(at) {
      if (at.entry !== undefined && (at.entry !== cur || adding) && at.entry < phases().length) open(at.entry);
    },
    placed(lines) {
      phases().forEach((_, i) => {
        const mine = lines.filter((l) => l.at.section === 'phases' && l.at.entry === i);
        const d = mine.some((l) => l.kind === 'refusal') ? 'bad' : mine.length ? 'warn' : '';
        const dot = list.children[i]?.querySelector('.sb-dot');
        if (dot) dot.className = `sb-dot ${d}`;
        const sr = list.children[i]?.querySelector('.sb-phase-state');
        if (sr) sr.textContent = d === 'bad' ? ' (refused)' : d === 'warn' ? ' (warning)' : '';
      });
    },
  };

  /** Edits that change the tree's shape or the list: written, then the phase drawn again. */
  const restructure = (focus?: string) => {
    changed();
    focusNext = focus ?? null;
    draw();
    redrawn();
  };
  let refreshWords = (): void => undefined;
  /** A leaf's field changed: written; the words beside it and the phase's preview follow. */
  const leafChanged = () => {
    changed();
    refreshWords();
  };
  const rules = ruleEditor({ phases, doc, slots, leafChanged, restructure: (_root, f) => restructure(f), redraw: () => (draw(), redrawn()) });


  // ------------------------------------------------------------------------------------------------ one phase
  const field = (label: string, ctl: HTMLElement, hint?: string) => {
    const id = ctl.id || (ctl.id = uid('sbf'));
    return h('div', { class: 'field' }, h('label', { for: id }, label), ctl, hint ? h('p', { class: 'sb-hint' }, hint) : null);
  };
  const text = (o: Rec, k: string, rows: number, required = false) => {
    const t = rows ? h('textarea', { rows, class: 'input' }) : h('input', { type: 'text', class: 'input', autocomplete: 'off', spellcheck: false });
    t.value = typeof o[k] === 'string' ? (o[k] as string) : '';
    t.addEventListener('input', () => {
      if (t.value === '' && !required) delete o[k];
      else o[k] = t.value;
      changed();
      if (k === 'label') {
        const t = box.querySelector('#sb-phase-h .sb-pt');
        if (t) t.textContent = labelOf(o) || 'untitled';
        drawList();
        refreshWords();
        redrawn();
      }
    });
    return t;
  };
  const add = (path: string, wrap: HTMLElement, ...controls: HTMLElement[]) => {
    slots.set(path, slot(wrap, controls));
    return wrap;
  };

  const drawPhase = (i: number): HTMLElement[] => {
    const ps = phases();
    const p = ps[i]!;
    const at = `/phases/${i}`;
    // heading and the flow line
    const headMsgs = h('div', { class: 'sb-msgs', id: uid('sbm') });
    const flow = flowOf(F, i);
    const chip = (j: number | string, current = false) => {
      const k = typeof j === 'number' ? j : ps.findIndex((q) => q.id === j);
      const words = k >= 0 ? labelOf(ps[k]) : 'not a phase of this card';
      return k >= 0 && !current ? button(words, () => open(k), 'small sb-ph', { 'aria-label': `Open the phase ${words}` }) : h('span', { class: 'sb-ph', 'aria-current': current ? 'true' : undefined }, words, k < 0 ? h('code', {}, String(j)) : '');
    };
    const arrow = () => h('span', { class: 'sb-ar', 'aria-hidden': 'true' }, '→');
    const flowEl = h('div', { class: 'sb-flow', role: 'group', 'aria-label': 'Where this phase sits: the phases that may lead here, this phase, the phases it may lead to' },
      ...(p.initial === true ? [h('span', { class: 'sb-hint' }, 'the case starts here')] : flow.from.length ? flow.from.flatMap((j, x) => (x ? [h('span', { class: 'sb-hint' }, '·'), chip(j)] : [chip(j)])) : [h('span', { class: 'sb-hint sb-warntext' }, 'no phase leads here')]),
      arrow(), chip(i, true), arrow(),
      ...(flow.to.length ? flow.to.flatMap((id, x) => (x ? [h('span', { class: 'sb-hint' }, '·'), chip(id)] : [chip(id)])) : [h('span', { class: 'sb-hint' }, 'leads nowhere: the case stays here')]));
    const head = h('div', { class: 'sb-phase-head' },
      h('h3', { id: 'sb-phase-h' }, 'Phase: ', h('span', { class: 'sb-pt' }, labelOf(p) || 'untitled'), ' ', h('small', {}, p.initial === true ? 'the starting phase' : 'entered by its own rule on the engine’s truth, never by a press')),
      headMsgs, flowEl);
    slots.set(at, { el: head, msgs: headMsgs, controls: [] });

    // label, id, hold
    const label = text(p, 'label', 0, true);
    const idIn = h('input', { type: 'text', class: 'input', autocomplete: 'off', spellcheck: false });
    idIn.value = String(p.id ?? '');
    const idWhy = h('p', { class: 'sb-hint sb-idwhy', 'aria-live': 'polite' });
    idIn.addEventListener('change', () => {
      const to = idIn.value.trim();
      const why = idProblem(F, i, to);
      if (why) {
        idWhy.textContent = `Not renamed: ${why}. The phase keeps its id.`;
        idIn.setAttribute('aria-invalid', 'true');
        return;
      }
      renamePhase(F, i, to);
      idWhy.textContent = '';
      idIn.removeAttribute('aria-invalid');
      restructure();
    });
    const idField = field('Phase id', idIn, 'Renaming changes every place the card names it (the lists below, rules, actions, script, debrief).');
    idField.append(idWhy);
    const row1: HTMLElement[] = [add(`${at}/label`, field('Label (the strip and ACTION)', label), label), add(`${at}/id`, idField, idIn)];
    if (p.enter !== undefined) {
      const hold = numInput(p, 'holdS', NUM.holdS!, 'Hold, seconds', () => changed(), true, { min: '0', step: '1' });
      hold.input.id = uid('sbf');
      const hf = field('Hold, seconds (optional)', hold.input, 'The rule must hold this long without a break before the phase changes.');
      hf.append(hold.why);
      row1.push(add(`${at}/holdS`, hf, hold.input));
    }
    const cue = text(p, 'cue', 0);
    const notes = text(p, 'notes', 2);
    const row2 = [add(`${at}/cue`, field('Learners see (the cue)', cue), cue), add(`${at}/notes`, field('Say line (the cue box)', notes), notes)];

    // the rule
    const ruleBox = h('div', { class: 'field sb-rulefield' }, h('span', { id: 'sb-rule-l' }, 'Entered when'));
    if (p.enter !== undefined && p.enter !== null && typeof p.enter === 'object') {
      ruleBox.append(rules.tree(p, `${at}/enter`, 'the rule', 'sb-rule-l'));
    } else {
      ruleBox.append(h('p', { class: 'sb-fixed' }, 'The case starts in this phase: the starting phase has no entry rule.'));
      slots.set(`${at}/enter`, slot(ruleBox));
    }
    ruleBox.append(h('p', { class: 'sb-hint' }, 'Each condition reads the engine’s truth: the format’s own variables, the patient’s drug concentrations, the pulse and the rhythm. There is no press, event or timer to choose: the validator refuses ', h('code', {}, 'manual'), ', ', h('code', {}, 'event'), ' and ', h('code', {}, 'afterS'), ' in a phase rule.'));

    // next
    const nextList = h('ol', { class: 'sb-next' });
    const nextField = h('div', { class: 'field' }, h('span', { id: 'sb-next-l' }, 'May lead to (the first of these whose rule holds wins, in this order)'), nextList);
    const nextSlot = slot(nextField);
    slots.set(`${at}/next`, nextSlot);
    const nx = (): string[] => (Array.isArray(p.next) ? (p.next as string[]) : []);
    const setNext = (xs: string[]) => {
      if (xs.length) {
        if (Array.isArray(p.next)) (p.next as string[]).splice(0, (p.next as string[]).length, ...xs);
        else p.next = xs;
      } else delete p.next;
    };
    const others = (except: string | null) => ps.filter((q, j) => j !== i && (q.id === except || !nx().includes(String(q.id)))).map((q) => [String(q.id), labelOf(q)] as [string, string]);
    nx().forEach((id, r) => {
      const s = select(id, [[null, others(id)]], `May lead to, row ${r + 1}`, 'not a phase of this card');
      s.addEventListener('change', () => {
        (p.next as string[])[r] = s.value;
        restructure();
      });
      nextSlot.controls.push(s);
      const lbl = labelOf(ps.find((q) => q.id === id)) || 'this row';
      const move = (d: number) => {
        const xs = [...nx()];
        [xs[r], xs[r + d]] = [xs[r + d]!, xs[r]!];
        setNext(xs);
        restructure();
        focusNext = `next:${r + d}:${d < 0 ? 'up' : 'down'}`;
      };
      nextList.append(h('li', { class: 'sb-nextrow' }, h('span', { class: 'sb-n', 'aria-hidden': 'true' }, String(r + 1)), s,
        ps.some((q) => q.id === id) ? '' : h('code', {}, id),
        button('Up', () => move(-1), 'small ghost', { 'aria-label': `Move ${lbl} up`, disabled: r === 0, 'data-f': `next:${r}:up` }),
        button('Down', () => move(1), 'small ghost', { 'aria-label': `Move ${lbl} down`, disabled: r === nx().length - 1, 'data-f': `next:${r}:down` }),
        button('Remove', () => (setNext(nx().filter((_, k) => k !== r)), restructure()), 'small ghost', { 'aria-label': `Remove ${lbl} from the list` })));
    });
    const rest = others(null);
    if (rest.length) {
      const s = select(rest[0]![0], [[null, rest]], 'Add a phase it may lead to');
      nextField.append(h('div', { class: 'sb-line-add sb-leafrow' }, s, button('Add to the list', () => {
        setNext([...nx(), s.value]);
        restructure(`next-add`);
      }, 'small', { 'data-f': 'next-add' })));
    }

    // sources and the words Instructor v2 will show
    const src = text(p, 'src', 2);
    const srcField = add(`${at}/src`, field('Sources of this phase’s numbers', src, 'Its thresholds, windows and hold: the source’s own words with the document and page; a number no source states is named as a placeholder for the owner.'), src);
    const preview = h('div', { class: 'sb-preview', role: 'group', 'aria-label': 'As Instructor v2 will show this phase' });
    refreshWords = () => {
      const d = doc();
      const w = instructorWords(d, i);
      const raw = (s: string) => rawNames(d.phases[i]?.enter, d, s);
      const names = raw(`${w.cue} ${w.row?.subtitle ?? ''}`);
      preview.replaceChildren(
        h('p', { class: 'sb-preview-l' }, 'As Instructor v2 will show it (its own words, from the same functions)'),
        w.row
          ? h('div', { class: 'sb-preview-row' }, h('b', {}, w.row.title), ' ', h('span', {}, ...coded(w.row.subtitle, names)), h('small', {}, `In ACTION, under ${labelOf(ps.find((q) => Array.isArray(q.next) && (q.next as string[]).includes(String(p.id))))}`))
          : h('div', { class: 'sb-preview-row' }, h('span', {}, p.initial === true ? 'The starting phase is not offered in ACTION: the case starts in it.' : 'No phase leads here, so ACTION never offers it.')),
        h('div', { class: 'sb-preview-row' }, h('span', {}, 'Once entered, the cue box: ', ...coded(w.cue, names))),
        names.length ? h('p', { class: 'sb-hint' }, 'Instructor v2 has no words yet for ', ...names.flatMap((x, k) => [k ? ', ' : '', h('code', {}, x)]), ': its sentence shows the format’s name. Reported; the sentence is not changed here.') : '',
      );
      for (const [path, s] of slots) {
        const n = path.startsWith(`${at}/enter`) ? nodeAt(p.enter, path.slice(`${at}/enter`.length)) : undefined;
        const old = s.el.querySelector(':scope > .sb-says');
        if (n && old) old.replaceWith(rules.says(n));
      }
    };
    refreshWords();

    // remove the phase
    const named = p.initial === true ? [] : mentionsOf(F, String(p.id));
    const removeBox = h('div', { class: 'sb-phase-remove' });
    if (p.initial === true) removeBox.append(h('p', { class: 'sb-hint' }, 'The starting phase is not removed: a card has exactly one.'));
    else if (named.length) removeBox.append(h('p', { class: 'sb-hint' }, 'Named elsewhere in the card (', ...named.flatMap((x, k) => [k ? ', ' : '', h('code', {}, x)]), '): change those first, then the phase can be removed.'));
    else removeBox.append(button('Remove this phase', () => void (async () => {
      if (!(await confirmDialog('Remove this phase?', `“${labelOf(p)}” is removed, and taken out of every phase’s list of where it may lead. The draft’s snapshots keep it.`, 'Remove phase', true, 'Keep the phase'))) return;
      const id = String(p.id);
      for (const q of ps) if (Array.isArray(q.next) && (q.next as string[]).includes(id)) {
        const xs = (q.next as string[]).filter((x) => x !== id);
        if (xs.length) (q.next as string[]).splice(0, (q.next as string[]).length, ...xs);
        else delete q.next;
      }
      ps.splice(i, 1);
      cur = Math.min(i, ps.length - 1);
      restructure();
    })(), 'ghost', { 'aria-label': `Remove the phase ${labelOf(p)}` }));

    return [head, h('div', { class: 'sb-row', style: `--n:${row1.length}` }, ...row1), h('div', { class: 'sb-row' }, ...row2), ruleBox, nextField, preview, srcField, removeBox];
  };

  // ------------------------------------------------------------------------------------------------ a new phase
  const drawAdding = (): HTMLElement[] => {
    const a = adding!;
    const ps = phases();
    const label = h('input', { type: 'text', class: 'input', autocomplete: 'off', value: a.label });
    const idIn = h('input', { type: 'text', class: 'input', autocomplete: 'off', spellcheck: false, value: a.id });
    const idWhy = h('p', { class: 'sb-hint', 'aria-live': 'polite' });
    const kind = select(kindOf(a.leaf) ?? 'value', [[null, LEAF_KINDS.map(([k, w]) => [k, w])]], 'Entered when: the kind of its first condition');
    const fields = h('div', {});
    const from = select(a.from, [[null, [['', 'no phase yet'], ...ps.map((q) => [String(q.id), labelOf(q)] as [string, string])]]], 'Reached from');
    const ok = button('Add the phase', () => {
      const p: Phase = { id: a.id, label: a.label, enter: a.leaf };
      ps.push(p);
      if (a.from) {
        const q = ps.find((x) => x.id === a.from);
        if (q) {
          if (Array.isArray(q.next)) (q.next as string[]).push(a.id);
          else q.next = [a.id];
        }
      }
      adding = null;
      cur = ps.length - 1;
      restructure('h');
    }, 'primary');
    const ready = () => {
      const why = a.label.trim() === '' ? 'a label is needed' : idProblem(F, -1, a.id);
      idWhy.textContent = why && a.label.trim() !== '' ? `Id: ${why}.` : '';
      ok.disabled = !!why || !leafComplete(a.leaf);
    };
    label.addEventListener('input', () => {
      a.label = label.value;
      if (!a.idTouched) idIn.value = a.id = idFromLabel(F, a.label || 'phase');
      ready();
    });
    idIn.addEventListener('input', () => {
      a.idTouched = true;
      a.id = idIn.value.trim();
      ready();
    });
    from.addEventListener('change', () => (a.from = from.value));
    const drawFields = () => fields.replaceChildren(rules.leafFields(a.leaf, ready, false, 'The new phase’s first condition').el);
    kind.addEventListener('change', () => {
      a.leaf = draftLeaf(kind.value as LeafKind, String(ps[0]?.id ?? ''));
      drawFields();
      ready();
    });
    drawFields();
    ready();
    queueMicrotask(() => label.focus());
    const idField = field('Phase id', idIn);
    idField.append(idWhy);
    return [
      h('div', { class: 'sb-phase-head' }, h('h3', { id: 'sb-phase-h' }, 'A new phase ', h('small', {}, 'added at the end of the list; it is written into the card when Add is pressed'))),
      h('div', { class: 'sb-row', style: '--n:3' }, field('Label', label), idField, field('Reached from (added to its list)', from)),
      h('div', { class: 'field' }, h('span', {}, 'Entered when (more conditions can be added once it exists)'), h('div', { class: 'sb-adder' }, h('div', { class: 'sb-leafrow' }, kind), fields)),
      h('div', { class: 'sb-acts' }, ok, button('Cancel', () => {
        adding = null;
        draw();
        redrawn();
      }, 'ghost')),
      h('p', { class: 'sb-hint' }, 'Add waits for a label, an id of its own and every number its condition needs.'),
    ];
  };

  // ------------------------------------------------------------------------------------------------ the list
  function drawList() {
    const ps = phases();
    for (const k of [...slots.keys()]) if (k.startsWith('list:')) slots.delete(k);
    listSlots.length = 0;
    list.replaceChildren(...ps.map((p, i) => {
      const msgs = h('div', { class: 'sb-msgs', id: uid('sbm') });
      const b = h('button', { type: 'button', class: 'sb-out', 'aria-current': i === cur && !adding ? 'true' : undefined, onclick: () => open(i) },
        h('span', { class: 'sb-dot', 'aria-hidden': 'true' }), h('span', { class: 'sb-pl' }, labelOf(p) || 'untitled'),
        h('small', {}, p.initial === true ? 'starts here' : typeof p.holdS === 'number' && p.holdS ? `held ${p.holdS} s` : ''),
        h('span', { class: 'sr-only sb-phase-state' }));
      const li = h('li', {}, b, msgs);
      listSlots[i] = { el: li, msgs, controls: [b] };
      slots.set(`list:${i}`, listSlots[i]!);
      return li;
    }), h('li', {}, button('Add a phase', () => {
      adding = { label: '', id: idFromLabel(F, 'phase'), idTouched: false, leaf: draftLeaf('value', ''), from: String(phases()[cur]?.id ?? '') };
      draw();
      redrawn();
    }, 'small', { 'aria-label': 'Add a phase' })));
  }

  function draw() {
    slots.clear();
    drawList();
    const ps = phases();
    if (!adding && !ps[cur]) cur = 0;
    box.replaceChildren(...(adding ? drawAdding() : ps[cur] ? drawPhase(cur) : [h('p', { class: 'sb-hint' }, 'This card has no phases.')]));
    const f = focusNext;
    focusNext = null;
    if (f !== null) queueMicrotask(() => {
      const target = f === 'h' ? box.querySelector<HTMLElement>('#sb-phase-h')
        : f.startsWith('next') ? box.querySelector<HTMLElement>(`[data-f="${f}"]:not([disabled])`) ?? box.querySelector<HTMLElement>('.sb-next select')
          : (() => {
            // the node edited, or (after Add) the group's last child, or the nearest node still there
            const at = f.endsWith('/new') ? f.slice(0, -4) : f;
            const n = nodeAt(ps[cur]?.enter, at);
            const k = n ? kindOf(n) : null;
            const path = f.endsWith('/new') && (k === 'all' || k === 'any') ? `${at}/${k}/${(n![k] as unknown[]).length - 1}` : f.endsWith('/new') && n === undefined ? '' : at;
            const li = box.querySelector<HTMLElement>(`[data-node="${path}"]`) ?? box.querySelector<HTMLElement>('[data-node=""]');
            return li?.querySelector<HTMLElement>('select, input, button') ?? null;
          })();
      if (target && !target.hasAttribute('tabindex') && target.tagName === 'H3') target.setAttribute('tabindex', '-1');
      target?.focus();
    });
  }

  function open(i: number) {
    adding = null;
    rules.closeAdder();
    cur = i;
    draw();
    redrawn();
    queueMicrotask(() => {
      const hd = box.querySelector<HTMLElement>('#sb-phase-h');
      if (hd) {
        hd.setAttribute('tabindex', '-1');
        hd.focus();
      }
    });
  }

  draw();
  return view;
}

/** The builder's own warnings about the course, as validator-shaped lines (`<path>: <words>`). */
export const phaseWarnings = (form: CardForm): string[] => courseWarnings(form.fields as Rec);
