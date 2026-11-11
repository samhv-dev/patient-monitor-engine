// The anchor picker and the frame of the builder's last sections (docs/plans/scenario-builder.md §5.2; piece B5). One
// picker for the three places an anchor is written (a script entry's `on`, an outcome's `anchor`, a debrief line's
// `at`): the forms the place's schema accepts (anchors.ts), and for a phase or an action only this card's own. A number
// the schema refuses (a taking below 1, a time below 0) is not written and the field says what the card keeps. The frame
// is a section whose every control is a slot keyed by the validator path it edits, so a line `fieldOf` places shows on
// the entry, field or row it names (the longest path that has a slot), else under the section's heading.
import { h } from '../ui.ts';
import { anchorPicks, anchorTargets, firstAnchor, PICK_WORDS, readAnchor, writeAnchor, type AnchorPick, type AnchorUse } from './anchors.ts';
import type { FieldRef } from './fields.ts';
import { select, slot, uid } from './phase-editor.ts';
import type { SectionId, SectionView, Slot } from './sections.ts';

type Rec = Record<string, unknown>;

/** A section of B5: the page places its lines through `slotFor`, as it does for B3's and B4's. */
export interface EndSectionView extends SectionView {
  slotFor(at: FieldRef): Slot;
  reveal(at: FieldRef): void;
  placed(lines: ReadonlyArray<{ kind: 'refusal' | 'warning'; at: FieldRef }>): void;
  /** Drawn again from the card as it now is (a phase or an action renamed in its own section), when the page shows it. */
  shown(): void;
}

/** A validator path, whole, from a placed line's field. */
const fullPath = (at: FieldRef) => (at.part ? `${at.path}/${at.part.split('/').map((s) => s.replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}` : at.path);

/** The frame: a heading slot, a body drawn by `draw()` (all slots made anew each time), and slot lookup by path. */
export function endSection(id: SectionId, title: string, sub: string) {
  const headMsgs = h('div', { class: 'sb-msgs', id: uid('sbm') });
  const head: Slot = { el: h('div', { class: 'sb-head' }, h('h2', { id: `sb-sec-${id}` }, title, ' ', h('small', {}, sub)), headMsgs), msgs: headMsgs, controls: [] };
  const body = h('div', { class: 'sb-endbody' });
  const el = h('section', { class: 'sb-panel sb-edit', 'aria-labelledby': `sb-sec-${id}`, 'data-section': id }, head.el, body);
  const slots = new Map<string, Slot>();
  const view: EndSectionView = {
    id, title, el, head, slots,
    slotFor(at) {
      for (let p = fullPath(at); p.length > 1; p = p.slice(0, Math.max(0, p.lastIndexOf('/')))) {
        const s = slots.get(p);
        if (s) return s;
      }
      return head;
    },
    reveal: () => undefined,
    placed: () => undefined,
    shown: () => undefined,
  };
  /** `wrap` is the slot of `path`, its controls the ones a line on it marks. */
  const put = <T extends HTMLElement>(path: string, wrap: T, ...controls: HTMLElement[]): T => {
    slots.set(path, slot(wrap, controls));
    return wrap;
  };
  const fill = (...kids: Array<HTMLElement | string>) => {
    body.replaceChildren(...kids);
  };
  return { view, put, fill, slots };
}

/** A hint line. */
export const hint = (...t: Array<string | HTMLElement>) => h('p', { class: 'sb-hint' }, ...t);

/** A text field over `o[k]`; `required`: never written empty (the card keeps its words and the field says so); an
 *  optional one emptied is removed. `count`: a live count against that many characters (the text is written past it, so
 *  the validator refuses it with its own line, as the briefing's count does). */
export function textField(o: Rec, k: string, label: string, opts: { rows?: number; required?: boolean; count?: { max: number; words: string }; changed: () => void }) {
  const t = opts.rows ? h('textarea', { rows: opts.rows, class: 'input' }) : h('input', { type: 'text', class: 'input', autocomplete: 'off' });
  t.id = uid('sbf');
  t.setAttribute('aria-label', label);
  t.value = typeof o[k] === 'string' ? (o[k] as string) : '';
  const why = h('span', { class: 'sb-numwhy', id: uid('sbw'), 'aria-live': 'polite' });
  const count = opts.count ? h('span', { class: 'sb-count', id: uid('sbc'), 'aria-live': 'polite' }) : null;
  const ids = [why.id, count?.id].filter(Boolean).join(' ');
  t.dataset.describedby = ids;
  t.setAttribute('aria-describedby', ids);
  const counted = () => {
    if (!count || !opts.count) return;
    const n = [...t.value].length;
    count.textContent = n > opts.count.max ? `${n} of ${opts.count.max} characters: ${n - opts.count.max} over; ${opts.count.words}` : `${n} of ${opts.count.max} characters`;
    count.classList.toggle('over', n > opts.count.max);
  };
  t.addEventListener('input', () => {
    counted();
    if (t.value === '' && opts.required) {
      why.textContent = `${label} is needed: not written, the card keeps “${String(o[k] ?? '')}”`;
      t.setAttribute('aria-invalid', 'true');
      t.dataset.invalid = 'true';
      return;
    }
    why.textContent = '';
    t.removeAttribute('aria-invalid');
    delete t.dataset.invalid;
    if (t.value === '') delete o[k];
    else o[k] = t.value;
    opts.changed();
  });
  counted();
  return { t, why, count };
}

export interface AnchorPicker {
  el: HTMLElement;
  /** The controls a line on the anchor marks. */
  controls: HTMLElement[];
}

/** The picker over `o[k]` for `use`: the form, then this card's phase or action, the taking's number or the time. Each
 *  choice writes at once (the form's first target, the first taking, 0 s); `rule` (an outcome's) is handed to
 *  `wantRule`, which opens the rule's own form. The card's own value, a form this place does not take or a phase or
 *  action the card does not have, is shown and kept until the author picks. */
export function anchorPicker(F: Rec, use: AnchorUse, o: Rec, k: string, label: string, changed: () => void, wantRule?: () => void): AnchorPicker {
  const el = h('span', { class: 'sb-anchor', role: 'group', 'aria-label': label });
  const controls: HTMLElement[] = [];
  const draw = () => {
    const a = readAnchor(o[k], use);
    const picks = anchorPicks(F, use).filter((p) => p !== 'rule' || wantRule || a?.pick === 'rule');
    if (a && !picks.includes(a.pick)) picks.push(a.pick);
    const own = typeof o[k] === 'string' ? (o[k] as string) : JSON.stringify(o[k] ?? '');
    const ks = select(a?.pick ?? '', [[null, picks.map((p) => [p, PICK_WORDS[p]] as [string, string])]], `${label}: when`, `the card’s own: ${own}`);
    ks.addEventListener('change', () => {
      const to = ks.value as AnchorPick;
      if (a && to === a.pick) return;
      if (to === 'rule') {
        ks.value = a?.pick ?? '';
        wantRule?.();
        return;
      }
      o[k] = writeAnchor(firstAnchor(F, to));
      changed();
      draw();
      (el.querySelector('select') as HTMLSelectElement | null)?.focus();
    });
    const parts: HTMLElement[] = [ks];
    controls.length = 0;
    controls.push(ks);
    if (a && (a.pick === 'phase' || a.pick === 'action' || a.pick === 'taking')) {
      const ts = select(a.id ?? '', [[null, anchorTargets(F, a.pick)]], `${label}: which ${a.pick === 'phase' ? 'phase' : 'action'}`, a.pick === 'phase' ? 'not a phase of this card' : 'not an action of this card');
      ts.addEventListener('change', () => {
        o[k] = writeAnchor({ ...a, id: ts.value });
        changed();
      });
      parts.push(ts);
      controls.push(ts);
    }
    if (a && (a.pick === 'taking' || a.pick === 'atScenarioS')) {
      const taking = a.pick === 'taking';
      const i = h('input', { type: 'number', inputmode: 'decimal', class: 'input sb-num', step: taking ? '1' : 'any', min: taking ? '1' : '0', 'aria-label': taking ? `${label}: which taking (1 is the first)` : `${label}: seconds after the start` });
      i.value = String(taking ? a.n : a.s);
      const why = h('span', { class: 'sb-numwhy', id: uid('sbw'), 'aria-live': 'polite' });
      i.dataset.describedby = why.id;
      i.setAttribute('aria-describedby', why.id);
      i.addEventListener('input', () => {
        const n = i.value.trim() === '' ? Number.NaN : Number(i.value);
        const bad = taking ? !(Number.isInteger(n) && n >= 1) : !(Number.isFinite(n) && n >= 0);
        if (bad) {
          why.textContent = `${taking ? 'a whole number from 1' : 'a number from 0'}: not written, the card keeps ${taking ? (readAnchor(o[k], use)?.n ?? '') : (readAnchor(o[k], use)?.s ?? '')}`;
          i.setAttribute('aria-invalid', 'true');
          i.dataset.invalid = 'true';
          return;
        }
        why.textContent = '';
        i.removeAttribute('aria-invalid');
        delete i.dataset.invalid;
        const cur = readAnchor(o[k], use)!;
        if (taking) o[k] = writeAnchor({ ...cur, n });
        else (o[k] as Rec).atScenarioS = n;
        changed();
      });
      parts.push(...(taking ? [h('span', { class: 'sb-hint' }, 'taking no.'), i] : [i, h('span', { class: 'sb-hint' }, 's')]), why);
      controls.push(i);
    }
    if (a?.pick !== 'rule') parts.push(h('code', {}, typeof o[k] === 'string' ? (o[k] as string) : JSON.stringify(o[k])));
    el.replaceChildren(...parts);
  };
  draw();
  return { el, controls };
}
