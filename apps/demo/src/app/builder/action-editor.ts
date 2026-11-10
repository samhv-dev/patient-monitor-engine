// The builder's Actions section (docs/plans/scenario-builder.md §5.4, mock-up 03-action-editor; piece B4): what the team
// is expected to do, and how each act is graded, one action open at a time. Its kind and the criteria the kind owns (a
// drug's identity, dose, cumulative ceiling, routes with each route's modelled state, rate and diluent; a device's or a
// decision's settings; a fluid; a sample's panels), when it is due (the window's anchor and seconds, a repeat or a
// conditional repeat, a precondition), what counts as a violation, the commands its press sends (from the Drug sheet's own
// form and builders), the switches "not graded" and "preparation", and beside it the row Instructor v2 draws
// (`phaseRowsOf`, its own function) and worked examples of how `grade()` grades a few gives (actions.ts, grade()'s own
// output, unchanged). Every control edits the form in place (B1's `formOf`) and calls `changed()`; the page writes
// through `docOf`; each control is a slot keyed by the validator path it edits, so a line `fieldOf` places shows there.
// Every list is the format's own or the engine's (actions.ts); a number the schema refuses is not written and the field
// says what the card keeps; a block the kind needs is written only complete; so no control makes a card the validator
// refuses. The rules (a precondition, a conditional repeat, a rule anchor, a violation's condition) are B3's rule tree
// (phase-editor.ts `ruleEditor`).
import { confirmDialog, button, h } from '../ui.ts';
import type { ScenarioDocV2 } from '@pme/controller/scenario';
import { describeCommand } from '../describe.ts';
import { PRESETS, unitText } from '../drugs.ts';
import { drugName } from '../glossary.ts';
import { bolus, fluid as fluidCmd, infusion, vaporiser } from '../../physiology-console/actions.ts';
import {
  actionIdFromLabel, actionIdProblem, actionMentions, ANCHORS, anchorKind, amountAll, amountProblem, blockMissing, CLASSES, classWords, DEVICE_KINDS,
  DEVICE_WORDS, draftBlock, DRUG_CHOICES, drugOf, FLUID_IDS, gradeExamples, instructorRow, KIND_INFO, KINDS, PANELS, RECORD_KINDS, renameAction, ROUTE_STATE_WORDS,
  ROUTE_WORDS, ROUTES, routeState, setAmount, setKind, SETTINGS, unitsFor, type AmountKind, type AnchorKind,
} from './actions.ts';
import type { FieldRef } from './fields.ts';
import { docOf, type CardForm } from './form.ts';
import { coded, holderOf, numInput, ruleEditor, select, slot, uid } from './phase-editor.ts';
import { draftLeaf, labelOf, LEAF_KINDS, leafComplete, type LeafKind } from './phases.ts';
import type { SectionView, Slot } from './sections.ts';

type Rec = Record<string, unknown>;

/** The numbers a window may hold (pme-scenario-2.schema.json `window`): `withinS` and `failAfterS` above 0,
 *  `notBeforeS` at least 0; `maxCount` an integer from 1. [ENG: ui] the schema's bounds, so a field can say why a number
 *  is not written. */
const WIN = { withinS: { above: 0 }, notBeforeS: { min: 0, optional: true }, failAfterS: { above: 0, optional: true }, maxCount: { min: 1, optional: true } } as const;
/** The give form's numbers: a dose or a rate above 0 (the engine refuses a dose of 0), a volume and a time above 0, the
 *  vaporiser's dial from 0. [ENG: ui] the engine's own command checks (validatePkCommand), stated before a command is
 *  written. */
const GIVE_NUM = { above: 0 } as const;

export interface ActionSectionView extends SectionView {
  slotFor(at: FieldRef): Slot;
  reveal(at: FieldRef): void;
  placed(lines: ReadonlyArray<{ kind: 'refusal' | 'warning'; at: FieldRef }>): void;
}

/** A validator path, whole, from a placed line's field (its path and what is left under it). */
const fullPath = (at: FieldRef) => (at.part ? `${at.path}/${at.part.split('/').map((s) => s.replace(/~/g, '~0').replace(/\//g, '~1')).join('/')}` : at.path);

/** The Actions section over `form`; `changed()` after every edit, `redrawn()` after the open action is drawn again. */
export function actionSection(form: CardForm, changed: () => void, redrawn: () => void): ActionSectionView {
  const F = form.fields as Rec;
  const actions = (): Rec[] => (Array.isArray(F.actions) ? (F.actions as Rec[]) : []);
  const phases = (): Rec[] => (Array.isArray(F.phases) ? (F.phases as Rec[]) : []);
  const doc = (): ScenarioDocV2 => docOf(form);
  let cur = 0;
  let adding: { label: string; id: string; idTouched: boolean; kind: string; phase: string; block: Rec | null } | null = null;
  let focusNext: string | null = null;
  /** Inline forms open in the action: the kind being changed, a window, a repeat, a rule, a violation, a give. */
  const forms: Record<string, unknown> = {};

  const headMsgs = h('div', { class: 'sb-msgs', id: uid('sbm') });
  const head: Slot = { el: h('div', { class: 'sb-head' }, h('h2', { id: 'sb-sec-actions' }, 'Actions ', h('small', {}, 'what the team is expected to do, and how grade() grades each act')), headMsgs), msgs: headMsgs, controls: [] };
  const list = h('ol', { class: 'sb-phases sb-actions', 'aria-label': 'The card’s actions' });
  const viol = h('p', { class: 'sb-hint' });
  const box = h('div', { class: 'sb-phase' });
  const el = h('section', { class: 'sb-panel sb-edit', 'aria-labelledby': 'sb-sec-actions', 'data-section': 'actions' }, head.el, list, viol, box);
  const slots = new Map<string, Slot>();
  const listSlots: Slot[] = [];
  const view: ActionSectionView = {
    id: 'actions', title: 'Actions', el, head, slots,
    slotFor(at) {
      if (at.entry === undefined) return head;
      if (at.entry !== cur || adding) return listSlots[at.entry] ?? head;
      for (let p = fullPath(at); p.length >= `/actions/${cur}`.length; p = p.slice(0, Math.max(0, p.lastIndexOf('/')))) {
        const s = slots.get(p);
        if (s) return s;
      }
      return slots.get(`/actions/${cur}`) ?? head;
    },
    reveal(at) {
      if (at.entry !== undefined && (at.entry !== cur || adding) && at.entry < actions().length) open(at.entry);
    },
    placed(lines) {
      actions().forEach((_, i) => {
        const mine = lines.filter((l) => l.at.section === 'actions' && l.at.entry === i);
        const d = mine.some((l) => l.kind === 'refusal') ? 'bad' : mine.length ? 'warn' : '';
        const dot = list.children[i]?.querySelector('.sb-dot');
        if (dot) dot.className = `sb-dot ${d}`;
        const sr = list.children[i]?.querySelector('.sb-phase-state');
        if (sr) sr.textContent = d === 'bad' ? ' (refused)' : d === 'warn' ? ' (warning)' : '';
      });
    },
  };

  const restructure = (focus?: string) => {
    changed();
    focusNext = focus ?? null;
    draw();
    redrawn();
  };
  const redraw = (focus?: string) => {
    focusNext = focus ?? null;
    draw();
    redrawn();
  };
  let refresh = (): void => undefined;
  const leafChanged = () => {
    changed();
    refresh();
  };
  const rules = ruleEditor({ phases, doc, slots, leafChanged, restructure: (root, f) => restructure(`rule:${root}:${f}`), redraw: () => redraw() });

  // --------------------------------------------------------------------------------------------- small controls
  const field = (label: string, ctl: HTMLElement, hint?: string | HTMLElement) => {
    const id = ctl.id || (ctl.id = uid('sbf'));
    return h('div', { class: 'field' }, h('label', { for: id }, label), ctl, hint ? (typeof hint === 'string' ? h('p', { class: 'sb-hint' }, hint) : hint) : null);
  };
  const put = (path: string, wrap: HTMLElement, ...controls: HTMLElement[]) => {
    slots.set(path, slot(wrap, controls));
    return wrap;
  };
  const text = (o: Rec, k: string, rows: number, required: boolean, label: string, after?: () => void) => {
    const t = rows ? h('textarea', { rows, class: 'input' }) : h('input', { type: 'text', class: 'input', autocomplete: 'off' });
    t.value = typeof o[k] === 'string' ? (o[k] as string) : '';
    const why = h('span', { class: 'sb-numwhy', id: uid('sbw'), 'aria-live': 'polite' });
    t.dataset.describedby = why.id;
    t.setAttribute('aria-describedby', why.id);
    t.addEventListener('input', () => {
      if (t.value === '' && required) {
        // a required text (a label, a violation's words) is never written empty: the card keeps its words
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
      changed();
      after?.();
    });
    return { t, why };
  };
  const checkbox = (label: string, on: boolean, change: (on: boolean) => void, attrs: Record<string, string | boolean | undefined> = {}) => {
    const c = h('input', { type: 'checkbox', ...attrs }) as HTMLInputElement;
    c.checked = on;
    c.addEventListener('change', () => change(c.checked));
    return { c, el: h('label', { class: 'sb-check' }, c, h('span', {}, label)) };
  };
  const hint = (t: string | Array<string | HTMLElement>) => h('p', { class: 'sb-hint' }, ...(Array.isArray(t) ? t : [t]));
  const box2 = (title: string, ...kids: Array<HTMLElement | string | null>) => h('div', { class: 'sb-crit', role: 'group', 'aria-label': title }, h('span', { class: 'sb-crit-k' }, title), ...kids);

  /** A drug picker over the engine's rows (the Drug sheet's names); the card's own id is kept when not listed. */
  const drugSelect = (value: string, label: string, none?: string) =>
    select(value, [...(none !== undefined ? [[null, [['', none]]] as [null, Array<[string, string]>]] : []), [null, DRUG_CHOICES.map((d) => [d.id, d.name] as [string, string])]], label, 'not a drug of this engine');
  const classSelect = (value: string, label: string, none?: string) =>
    select(value, [...(none !== undefined ? [[null, [['', none]]] as [null, Array<[string, string]>]] : []), [null, CLASSES.filter((c) => c.cls !== 'placeholder').map((c) => [c.cls, `The class of ${classWords(c.cls)}`] as [string, string])]], label, 'not a class of this engine');
  const phaseChoices = () => phases().map((p) => [String(p.id), labelOf(p)] as [string, string]);
  const actionLabel = (id: string) => String(actions().find((a) => a.id === id)?.label ?? id);

  /** An amount's numbers (value ± tolerance, lowest, highest; a dose's unit) over `get()`; `make(a)` writes a block that
   *  did not exist. Each number is written only if the block stays one the schema accepts. */
  const amountFields = (o: { get(): Rec | undefined; make(a: Rec): void; remove?: () => void }, kind: AmountKind, name: string, units?: { list: string[]; def: string }, extra?: (a: Rec) => string | null) => {
    const draft: Rec = units ? { unit: o.get()?.unit ?? units.def } : {};
    const controls: HTMLElement[] = [];
    const why = h('span', { class: 'sb-numwhy', id: uid('sbw'), 'aria-live': 'polite' });
    const parts: Array<HTMLElement | string> = [];
    const keys: Array<[string, string]> = kind === 'cumulative' ? [['max', 'at most'], ['min', 'at least']] : [['value', ''], ['tolerance', '±'], ['min', 'accepted from'], ['max', 'to']];
    for (const [k, w] of keys) {
      const i = h('input', { type: 'number', inputmode: 'decimal', step: 'any', class: 'input sb-num', 'aria-label': `${name}: ${k === 'value' ? 'the value' : k === 'tolerance' ? 'tolerance either side' : k === 'min' ? 'the lowest accepted' : 'the highest accepted'}` });
      i.value = typeof o.get()?.[k] === 'number' ? String(o.get()![k]) : '';
      i.dataset.describedby = why.id;
      i.setAttribute('aria-describedby', why.id);
      i.addEventListener('input', () => {
        const n = i.value.trim() === '' ? undefined : Number(i.value);
        const cur = o.get();
        const next: Rec = { ...(cur ?? draft), [k]: n };
        if (n === undefined) delete next[k];
        // a block not written yet keeps what is typed, and is written once it is complete
        if (!cur) Object.assign(draft, { [k]: n }), n === undefined && delete draft[k];
        const p = Number.isNaN(n) ? 'not a number' : (amountProblem(next, kind) ?? extra?.(next) ?? null);
        if (p === null) {
          if (cur) setAmount(cur, k, n, kind);
          else o.make({ ...next });
          why.textContent = '';
          for (const c of controls) (c.removeAttribute('aria-invalid'), delete c.dataset.invalid);
          changed();
          refresh();
        } else {
          why.textContent = cur ? `${p}: not written, the card keeps ${amountAll(cur, String(cur.unit ?? '')) || 'its numbers'}` : `${p}: not written yet`;
          i.setAttribute('aria-invalid', 'true');
          i.dataset.invalid = 'true';
        }
      });
      controls.push(i);
      if (w) parts.push(h('span', { class: 'sb-hint' }, w));
      parts.push(i);
    }
    if (units) {
      const all = [...new Set([...units.list, String(o.get()?.unit ?? units.def)])].filter(Boolean);
      const u = select(String(o.get()?.unit ?? units.def), [[null, all.map((x) => [x, unitText(x)] as [string, string])]], `${name}: unit`);
      u.addEventListener('change', () => {
        const cur = o.get();
        if (cur) {
          cur.unit = u.value;
          changed();
          refresh();
        } else draft.unit = u.value;
      });
      controls.push(u);
      parts.push(u);
    }
    if (o.remove && o.get()) parts.push(button('Remove', () => (o.remove!(), restructure()), 'small ghost', { 'aria-label': `Remove ${name}` }));
    return { el: h('div', { class: 'sb-leafrow' }, ...parts, why), controls };
  };

  /** A rule that does not exist yet: a first condition and "Add" (written only complete). */
  const leafForm = (name: string, done: (leaf: Rec) => void, cancel?: () => void, addWords = 'Add') => {
    let leaf = draftLeaf('value', String(phases()[0]?.id ?? ''));
    const kind = select('value', [[null, LEAF_KINDS.map(([k, w]) => [k, w])]], `${name}: its first condition`);
    const fields = h('div', {});
    const ok = button(addWords, () => leafComplete(leaf) && done(leaf), 'small primary');
    const ready = () => (ok.disabled = !leafComplete(leaf));
    const drawFields = () => fields.replaceChildren(rules.leafFields(leaf, ready, false, name).el);
    kind.addEventListener('change', () => {
      leaf = draftLeaf(kind.value as LeafKind, String(phases()[0]?.id ?? ''));
      drawFields();
      ready();
    });
    drawFields();
    ready();
    return h('div', { class: 'sb-adder', role: 'group', 'aria-label': name }, h('div', { class: 'sb-leafrow' }, kind), fields,
      h('div', { class: 'sb-acts' }, ok, cancel ? button('Cancel', cancel, 'small ghost') : null), hint('Waits until every number the condition needs is typed.'));
  };
  /** A rule shown as B3's tree, with "Instructor v2 reads" beside each node; `remove` takes the whole rule away. */
  const ruleBlock = (o: Rec, k: string, root: string, name: string, remove?: () => void) =>
    h('div', { class: 'sb-rulewrap' }, rules.tree(holderOf(o, k), root, name), remove ? button(`Remove ${name}`, () => (remove(), restructure()), 'small ghost') : null);

  // ------------------------------------------------------------------------------------------------ the blocks
  /** The criteria a kind starts with, as a small form (the add form and a change of kind): complete before written. */
  const blockForm = (kind: string, b: Rec | null, ready: () => void, name: string): HTMLElement | null => {
    if (!b) return null;
    if (kind === 'drug') {
      const s = drugSelect(String(b.id ?? ''), `${name}: the drug`, 'choose a drug');
      s.addEventListener('change', () => ((b.id = s.value), ready()));
      return h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'The drug'), s);
    }
    if (kind === 'device' || kind === 'decision') {
      const dk = select(String(b.kind), [[null, DEVICE_KINDS.map((k) => [k, DEVICE_WORDS[k] ?? k] as [string, string])]], `${name}: the device`);
      const row = h('div', { class: 'sb-leafrow' });
      const drawSetting = () => {
        const opts = SETTINGS[String(b.kind)] ?? [];
        b.settings = {};
        const ks = select(opts[0]?.k ?? '', [[null, opts.map((x) => [x.k, `${x.words}${x.unit ? ` (${x.unit})` : ''}`] as [string, string])]], `${name}: the setting`);
        const valueIn = h('div', { class: 'sb-leafrow' });
        const drawValue = () => {
          const spec = opts.find((x) => x.k === ks.value);
          b.settings = {};
          if (spec?.word) {
            const ws = select('', [[null, [['', 'choose'], ...spec.word.map((x) => [x, x] as [string, string])]]], `${name}: the setting’s word`);
            ws.addEventListener('change', () => ((b.settings = ws.value ? { [ks.value]: ws.value } : {}), ready()));
            valueIn.replaceChildren(ws);
          } else {
            const n = h('input', { type: 'number', step: 'any', inputmode: 'decimal', class: 'input sb-num', 'aria-label': `${name}: the setting’s value` });
            n.addEventListener('input', () => ((b.settings = n.value.trim() === '' || Number.isNaN(Number(n.value)) ? {} : { [ks.value]: { value: Number(n.value) } }), ready()));
            valueIn.replaceChildren(n, h('span', { class: 'sb-hint' }, 'the accepted value (a range can be set once it is added)'));
          }
          ready();
        };
        ks.addEventListener('change', drawValue);
        drawValue();
        row.replaceChildren(h('span', { class: 'sb-hint' }, 'Setting'), ks, valueIn);
      };
      dk.addEventListener('change', () => ((b.kind = dk.value), drawSetting()));
      drawSetting();
      return h('div', {}, h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, kind === 'decision' ? 'Its effect on' : 'The device'), dk), row);
    }
    if (kind === 'fluid') {
      const s = select('', [[null, [['', 'choose a fluid'], ...FLUID_IDS.map((x) => [x, x] as [string, string])]]], `${name}: the fluid`);
      s.addEventListener('change', () => ((b.type = s.value ? [s.value] : []), ready()));
      return h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'The fluid'), s);
    }
    if (kind === 'physical') {
      const t = h('input', { type: 'text', class: 'input', autocomplete: 'off', spellcheck: false, 'aria-label': `${name}: the measure’s name` });
      t.addEventListener('input', () => ((b.measure = t.value.trim()), ready()));
      return h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'The measure (a name, such as cooling)'), t);
    }
    return null;
  };

  /** A settings block (a device's, an effect's): each setting with its accepted amount or word; add one; remove one
   *  while another stays (the schema's minProperties 1). */
  const settingsEditor = (s: Rec, kind: string, path: string, name: string): HTMLElement => {
    const rows: HTMLElement[] = [];
    const specs = SETTINGS[kind] ?? [];
    for (const [k, v] of Object.entries(s)) {
      const spec = specs.find((x) => x.k === k);
      const words = `${spec?.words ?? k}${spec?.unit ? ` (${spec.unit})` : ''}`;
      const rm = Object.keys(s).length > 1 ? button('Remove', () => (delete s[k], restructure()), 'small ghost', { 'aria-label': `Remove the setting ${spec?.words ?? k} from ${name}` }) : null;
      if (typeof v === 'string') {
        const ws = select(v, [[null, (spec?.word ?? [v]).map((x) => [x, x] as [string, string])]], `${name}: ${spec?.words ?? k}`);
        ws.addEventListener('change', () => ((s[k] = ws.value), changed(), refresh()));
        rows.push(put(`${path}/${k}`, h('div', { class: 'sb-leafrow sb-setting' }, h('span', { class: 'sb-hint' }, words), h('code', {}, k), ws, rm), ws));
      } else {
        const f = amountFields({ get: () => s[k] as Rec, make: (a) => (s[k] = a) }, 'amount', `${name}: ${spec?.words ?? k}`);
        rows.push(put(`${path}/${k}`, h('div', { class: 'sb-setting' }, h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, words), h('code', {}, k), rm), f.el), ...f.controls));
      }
    }
    const left = specs.filter((x) => !(x.k in s));
    if (left.length) {
      const key = `setting:${path}`;
      if (forms[key]) {
        const b: Rec = { kind, settings: {} };
        const ok = button('Add the setting', () => {
          Object.assign(s, b.settings as Rec);
          delete forms[key];
          restructure();
        }, 'small primary');
        const ready = () => (ok.disabled = blockMissing('device', b) !== null || Object.keys(b.settings as Rec).some((x) => x in s));
        const f = blockForm('device', b, ready, `New setting of ${name}`)!;
        // the device is the block's own: only the setting is chosen here
        f.querySelector('select')?.closest('.sb-leafrow')?.remove();
        ready();
        rows.push(h('div', { class: 'sb-adder' }, f, h('div', { class: 'sb-acts' }, ok, button('Cancel', () => (delete forms[key], redraw()), 'small ghost'))));
      } else rows.push(button('Add a setting', () => ((forms[key] = true), redraw()), 'small', { 'aria-label': `Add a setting to ${name}` }));
    }
    return h('div', { class: 'sb-settings' }, ...rows);
  };

  const drugBlock = (a: Rec, at: string): HTMLElement[] => {
    const d = a.drug as Rec;
    const out: HTMLElement[] = [];
    const how = typeof d.id === 'string' ? 'id' : typeof d.cls === 'string' ? 'cls' : 'alternatives';
    // identity: exactly one of a drug, a class, alternatives (the schema's oneOf)
    const by = select(how, [[null, [['id', 'this drug'], ['cls', 'any drug of a class'], ['alternatives', 'one of several drugs, each with its dose']]]], 'Drug: identified by');
    const idRow = h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'Identified by'), by);
    const swap = (to: string) => {
      const first = drugOf(d) ?? DRUG_CHOICES[0]!.id;
      const vals: Rec = to === 'id' ? { id: first } : to === 'cls' ? { cls: CLASSES.find((c) => c.members.includes(first))?.cls ?? CLASSES[0]!.cls } : { alternatives: [{ id: first }, { id: DRUG_CHOICES.find((x) => x.id !== first)!.id }] };
      // the new identity takes the old one's place in the block's key order
      const entries = Object.entries(d);
      const at = entries.findIndex(([k]) => k === 'id' || k === 'cls' || k === 'alternatives');
      const rest = entries.filter(([k]) => k !== 'id' && k !== 'cls' && k !== 'alternatives');
      for (const k of Object.keys(d)) delete d[k];
      Object.assign(d, Object.fromEntries([...rest.slice(0, Math.max(0, at)), ...Object.entries(vals), ...rest.slice(Math.max(0, at))]));
      restructure('[aria-label="Drug: identified by"]');
    };
    by.addEventListener('change', () => swap(by.value));
    const idControls: HTMLElement[] = [by];
    if (how === 'id') {
      const s = drugSelect(String(d.id), 'Drug: which drug');
      s.addEventListener('change', () => ((d.id = s.value), restructure('[aria-label="Drug: which drug"]')));
      idRow.append(s, h('code', {}, String(d.id)));
      idControls.push(s);
    } else if (how === 'cls') {
      const s = classSelect(String(d.cls), 'Drug: which class');
      s.addEventListener('change', () => ((d.cls = s.value), restructure('[aria-label="Drug: which class"]')));
      idRow.append(s, h('code', {}, String(d.cls)));
      idControls.push(s);
    }
    const idBox = put(`${at}/drug/id`, box2('Drug', idRow), ...idControls);
    slots.set(`${at}/drug/cls`, slots.get(`${at}/drug/id`)!);
    out.push(idBox);
    if (how === 'alternatives') {
      const alts = d.alternatives as Rec[];
      const rows = alts.map((x, k) => {
        const s = drugSelect(String(x.id), `Alternative ${k + 1}: the drug`);
        s.addEventListener('change', () => ((x.id = s.value), changed(), refresh()));
        const dose = amountFields({ get: () => x.dose as Rec | undefined, make: (v) => (x.dose = v), remove: () => delete x.dose }, 'dose', `Alternative ${k + 1}: its dose`, { list: unitsFor(String(x.id), false), def: unitsFor(String(x.id), false)[0] ?? 'mg' });
        const rm = alts.length > 2 ? button('Remove', () => (alts.splice(k, 1), restructure()), 'small ghost', { 'aria-label': `Remove alternative ${k + 1}` }) : null;
        return put(`${at}/drug/alternatives/${k}`, h('div', { class: 'sb-setting' }, h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-n' }, String(k + 1)), s, h('code', {}, String(x.id)), rm), dose.el), s, ...dose.controls);
      });
      out.push(put(`${at}/drug/alternatives`, box2('Alternatives (at least two)', ...rows, button('Add an alternative', () => (alts.push({ id: DRUG_CHOICES.find((y) => !alts.some((z) => z.id === y.id))!.id }), restructure()), 'small'))));
    }
    // the dose
    const first = drugOf(d);
    const rateInf = (d.rate as Rec | undefined)?.infusion !== undefined;
    if (!rateInf) {
      const f = amountFields({ get: () => d.dose as Rec | undefined, make: (v) => (d.dose = v), remove: () => delete d.dose }, 'dose', 'Dose', { list: unitsFor(first, false), def: unitsFor(first, false)[0] ?? 'mg' });
      out.push(put(`${at}/drug/dose`, box2('Dose', f.el, hint('The value is the prescription; a range is what grade() accepts (it reads the range when there is one). A per-kg unit is per the card’s weight.')), ...f.controls));
    }
    // the cumulative ceiling
    const cu = amountFields({ get: () => d.cumulative as Rec | undefined, make: (v) => (d.cumulative = v), remove: () => delete d.cumulative }, 'cumulative', 'Cumulative', { list: unitsFor(first, false), def: unitsFor(first, false)[0] ?? 'mg' });
    out.push(put(`${at}/drug/cumulative`, box2('Cumulative', cu.el, hint('Summed over the run; grade() grades its highest only (its lowest and its window are not graded yet).')), ...cu.controls));
    // routes: the set, each with its modelled state for this drug, and the preferred one
    const route = d.route as { set: string[]; preferred?: string } | undefined;
    const ids = typeof d.id === 'string' ? [d.id] : Array.isArray(d.alternatives) ? (d.alternatives as Rec[]).map((x) => String(x.id)) : [];
    const routeControls: HTMLElement[] = [];
    const routeRows = ROUTES.map((r) => {
      const on = !!route?.set.includes(r);
      const states = ids.map((id) => `${ids.length > 1 ? `${drugName(id)}: ` : ''}${ROUTE_STATE_WORDS[routeState(id, r)]}`).join('; ');
      const c = checkbox(`${ROUTE_WORDS[r] ?? r}`, on, (v) => {
        if (v) {
          if (route) route.set.push(r);
          else d.route = { set: [r] };
        } else {
          if (route!.set.length === 1) {
            // an empty set is refused (minItems 1): the route block goes, every route is then accepted
            delete d.route;
          } else {
            route!.set.splice(route!.set.indexOf(r), 1);
            if (route!.preferred === r) delete route!.preferred;
          }
        }
        restructure(`[data-route="${r}"]`);
      }, { 'data-route': r });
      routeControls.push(c.c);
      return h('div', { class: `sb-route${states.includes('not modelled') ? ' off' : ''}` }, c.el, h('span', { class: 'sb-hint' }, states || ''));
    });
    const pref = select(route?.preferred ?? '', [[null, [['', 'none preferred'], ...(route?.set ?? []).map((r) => [r, ROUTE_WORDS[r] ?? r] as [string, string])]]], 'Route: preferred');
    pref.disabled = !route;
    pref.addEventListener('change', () => {
      if (!route) return;
      if (pref.value) route.preferred = pref.value;
      else delete route.preferred;
      changed();
      refresh();
    });
    routeControls.push(pref);
    out.push(put(`${at}/drug/route`, box2('Route', h('div', { class: 'sb-routes' }, ...routeRows), h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'Preferred (another route of the set is a deviation)'), pref),
      hint(route ? 'A route outside the set leaves the row open with its line; a contraindication makes it a timed violation as well. The validator warns on a route the engine does not model for the drug.' : 'No route set: every route is accepted.')), ...routeControls));
    // the rate: bolus, over a time, an infusion (the schema's one of three), or none
    const rate = d.rate as Rec | undefined;
    const rk = rate ? Object.keys(rate)[0]! : '';
    const rs = select(rk, [[null, [['', 'not graded'], ['bolus', 'a bolus'], ['overS', 'given over a time'], ['infusion', 'an infusion at a rate']]]], 'Rate: how it is given');
    const rateParts: HTMLElement[] = [h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'Given as'), rs)];
    const rateCtl: HTMLElement[] = [rs];
    const rateKey = `rate:${cur}`;
    if (forms[rateKey]) {
      // a rate needing numbers: written when complete
      const want = String(forms[rateKey]);
      const draft: Rec = {};
      const ok = button('Set the rate', () => {
        d.rate = { [want]: draft[want] };
        if (want === 'infusion') delete d.dose;
        delete forms[rateKey];
        restructure();
      }, 'small primary');
      ok.disabled = true;
      const f = amountFields({ get: () => draft[want] as Rec | undefined, make: (v) => ((draft[want] = v), (ok.disabled = false)) }, want === 'infusion' ? 'dose' : 'amount', want === 'infusion' ? 'Infusion rate' : 'Given over, seconds', want === 'infusion' ? { list: unitsFor(first, true), def: unitsFor(first, true)[0] ?? 'mcg/kg/min' } : undefined);
      rateParts.push(h('div', { class: 'sb-adder' }, f.el, h('div', { class: 'sb-acts' }, ok, button('Cancel', () => (delete forms[rateKey], redraw()), 'small ghost'))));
    } else if (rate && 'infusion' in rate) {
      const f = amountFields({ get: () => rate.infusion as Rec, make: () => undefined }, 'dose', 'Infusion rate', { list: unitsFor(first, true), def: unitsFor(first, true)[0] ?? 'mcg/kg/min' });
      rateParts.push(f.el);
      rateCtl.push(...f.controls);
    } else if (rate && 'overS' in rate) {
      const f = amountFields({ get: () => rate.overS as Rec, make: () => undefined }, 'amount', 'Given over, seconds');
      rateParts.push(f.el, hint('seconds'));
      rateCtl.push(...f.controls);
    }
    rs.addEventListener('change', () => {
      delete forms[rateKey];
      if (rs.value === '') delete d.rate;
      else if (rs.value === 'bolus') d.rate = { bolus: true };
      else {
        forms[rateKey] = rs.value;
        return redraw('[aria-label="Rate: how it is given"]');
      }
      restructure('[aria-label="Rate: how it is given"]');
    });
    out.push(put(`${at}/drug/rate`, box2('Rate', ...rateParts, hint('An infusion is matched only by an infusion record and a bolus only by a bolus: the form is part of the identity.')), ...rateCtl));
    // the diluent (L5): the formulary's diluent ids; the app ships no list of them, so the card's are kept and can be removed
    const dil = (d.diluent as { set: string[] } | undefined)?.set;
    if (dil) {
      out.push(put(`${at}/drug/diluent`, box2('Diluent', h('div', { class: 'sb-leafrow' }, ...dil.map((x) => h('code', {}, x)),
        button('Remove the diluent criterion', () => (delete d.diluent, restructure()), 'small ghost')),
      hint('A give from a preparation in another diluent, with none, or with no preparation on record (the laptop’s Drug sheet makes none) is a deviation. The formulary’s diluent ids are not in the app yet, so a new one is not offered here.'))));
    }
    return out;
  };

  const criteria = (a: Rec, at: string): HTMLElement[] => {
    const kind = String(a.kind);
    if (kind === 'drug' && a.drug) return drugBlock(a, at);
    if (kind === 'device' && a.device) {
      const dv = a.device as Rec;
      return [put(`${at}/device`, box2('Device', h('div', { class: 'sb-leafrow' }, h('span', {}, DEVICE_WORDS[String(dv.kind)] ?? String(dv.kind)), h('code', {}, String(dv.kind))),
        settingsEditor(dv.settings as Rec, String(dv.kind), `${at}/device/settings`, 'the device'), hint('Graded on the first record whose settings are all in range, once its window opened.')))];
    }
    if (kind === 'decision' && Array.isArray(a.effect)) {
      const ef = a.effect as Rec[];
      return [put(`${at}/effect`, box2('Effect', ...ef.map((e, k) => h('div', { class: 'sb-setting' },
        h('div', { class: 'sb-leafrow' }, h('span', {}, DEVICE_WORDS[String(e.kind)] ?? String(e.kind)), h('code', {}, String(e.kind)),
          ef.length > 1 ? button('Remove', () => (ef.splice(k, 1), restructure()), 'small ghost', { 'aria-label': `Remove effect ${k + 1}` }) : null),
        settingsEditor(e.settings as Rec, String(e.kind), `${at}/effect/${k}/settings`, `effect ${k + 1}`))),
      hint('A decision is graded on its engine-visible effect, never on a button; with several effects, on the first of the record’s kind.')))];
    }
    if (kind === 'fluid' && a.fluid) {
      const f = a.fluid as Rec;
      const types = (f.type as string[] | undefined) ?? [];
      const boxes = FLUID_IDS.map((x) => checkbox(x, types.includes(x), (on) => {
        if (on) (f.type ??= []) && (f.type as string[]).push(x);
        else if (types.length > 1 || Object.keys(f).length > 1) {
          const left = types.filter((y) => y !== x);
          if (left.length) (f.type as string[]).splice(0, types.length, ...left);
          else delete f.type;
        }
        restructure();
      }));
      const vol = amountFields({ get: () => f.volumeMl as Rec | undefined, make: (v) => (f.volumeMl = v), remove: Object.keys(f).length > 1 ? () => delete f.volumeMl : undefined }, 'amount', 'Volume, mL');
      const rate = amountFields({ get: () => f.rateMlMin as Rec | undefined, make: (v) => (f.rateMlMin = v), remove: Object.keys(f).length > 1 ? () => delete f.rateMlMin : undefined }, 'amount', 'Rate, mL/min');
      return [put(`${at}/fluid`, box2('Fluid', h('div', { class: 'sb-routes' }, ...boxes.map((b) => b.el)), h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'Volume (mL)')), vol.el,
        h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'Rate (mL/min)')), rate.el), ...boxes.map((b) => b.c), ...vol.controls, ...rate.controls)];
    }
    if (kind === 'physical' && a.physical) {
      const p = a.physical as Rec;
      return [put(`${at}/physical`, box2('Physical measure', h('div', { class: 'sb-leafrow' }, h('span', {}, 'Measure'), h('code', {}, String(p.measure))),
        p.settings ? h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'Its settings, kept as the card has them:'), ...Object.keys(p.settings as Rec).map((k) => h('code', {}, k))) : null,
        hint('Matched by a fluid or physical record (cooling is the cold fluid).')))];
    }
    if (kind === 'sample') {
      const panels = (a.sample as { panel: string[] } | undefined)?.panel;
      const boxes = PANELS.map((x) => checkbox(x.toUpperCase(), !!panels?.includes(x), (on) => {
        if (on) {
          if (panels) panels.push(x);
          else a.sample = { panel: [x] };
        } else if (panels!.length > 1) panels!.splice(panels!.indexOf(x), 1);
        else delete a.sample;
        restructure();
      }));
      return [put(`${at}/sample`, box2('Sample', h('div', { class: 'sb-routes' }, ...boxes.map((b) => b.el)),
        hint(panels ? 'A lab sample of a listed panel (the learner’s or the instructor’s) satisfies it, as a drug satisfies a drug action; a press is still recorded.' : 'No panel: matched by its own press only.')), ...boxes.map((b) => b.c))];
    }
    return [box2('Matched', hint(`${KIND_INFO[kind]?.matched ?? 'by its own press'}: no criteria block (the guide’s “How a press is recorded”).`))];
  };

  // ------------------------------------------------------------------------------------------------ when
  const whenBlock = (a: Rec, at: string, i: number): HTMLElement[] => {
    const out: HTMLElement[] = [];
    const w = a.window as Rec | undefined;
    const others = actions().filter((x, k) => k !== i).map((x) => [String(x.id), String(x.label)] as [string, string]);
    if (a.preparation === true) out.push(box2('Window', hint('A preparation step is recorded with its time, never graded: it has no window.')));
    else if (!w) {
      const key = `window:${i}`;
      if (forms[key]) {
        const draft: Rec = { anchor: 'start' };
        const ok = button('Add the window', () => {
          a.window = { anchor: draft.anchor, withinS: draft.withinS };
          delete forms[key];
          restructure();
        }, 'small primary');
        const ready = () => (ok.disabled = !(typeof draft.withinS === 'number' && draft.withinS > 0));
        const kinds = ANCHORS.filter(([k]) => k !== 'rule' && k !== 'display' && k !== 'first' && ((k !== 'action' && k !== 'each') || others.length));
        const ks = select('start', [[null, kinds.map(([k, x]) => [k, x])]], 'New window: opens at');
        const target = h('span', {});
        const drawTarget = () => {
          const k = ks.value as AnchorKind;
          if (k === 'phase' || k === 'action' || k === 'each') {
            const choices = k === 'phase' ? phaseChoices() : others;
            const ts = select(choices[0]![0], [[null, choices]], 'New window: which');
            const set = () => (draft.anchor = `${k === 'phase' ? 'phase:' : k === 'action' ? 'action:' : 'each:action:'}${ts.value}`);
            ts.addEventListener('change', set);
            set();
            target.replaceChildren(ts);
          } else {
            draft.anchor = k;
            target.replaceChildren();
          }
        };
        ks.addEventListener('change', drawTarget);
        drawTarget();
        const within = numInput(draft, 'withinS', WIN.withinS, 'New window: within how many seconds', ready, false, { min: '0' });
        ready();
        out.push(box2('Window', h('div', { class: 'sb-adder' }, h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'Opens at'), ks, target),
          h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'Within'), within.input, h('span', { class: 'sb-hint' }, 's'), within.why),
          h('div', { class: 'sb-acts' }, ok, button('Cancel', () => (delete forms[key], redraw()), 'small ghost')), hint('A rule anchor can be chosen once the window exists.'))));
      } else {
        out.push(put(`${at}/window`, box2('Window', hint('Recorded, not timed: met when taken at any time after the action opened; live it reads “due” with no clock, and at the end it is failed if never taken.'),
          button('Add a window', () => ((forms[key] = true), redraw('[aria-label="New window: opens at"]')), 'small'))));
      }
    } else {
      // the anchor
      const an = w.anchor;
      const k = anchorKind(an);
      const hasFail = w.failAfterS !== undefined;
      const kinds = ANCHORS.filter(([x]) => (x !== 'display' && x !== 'first') || x === k).filter(([x]) => (x !== 'action' && x !== 'each') || others.length || x === k);
      const ks = select(k ?? '', [[null, kinds.map(([x, words]) => [x, x === 'each' && hasFail && k !== 'each' ? `${words} (not with a fail-after time)` : words])]], 'Window: opens at');
      for (const o of ks.options) if (o.value === 'each' && hasFail && k !== 'each') o.disabled = true;
      const anchorParts: Array<HTMLElement | string> = [h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'Opens at'), ks)];
      const ctl: HTMLElement[] = [ks];
      const ruleKey = `anchor-rule:${i}`;
      if (k === 'phase' || k === 'action' || k === 'each') {
        const id = String(an).replace(/^(each:)?(phase|action):/, '');
        const ts = select(id, [[null, k === 'phase' ? phaseChoices() : others]], 'Window: which', k === 'phase' ? 'not a phase of this card' : 'not an action of this card');
        ts.addEventListener('change', () => ((w.anchor = `${k === 'phase' ? 'phase:' : k === 'action' ? 'action:' : 'each:action:'}${ts.value}`), changed(), refresh()));
        (anchorParts[0] as HTMLElement).append(ts, h('code', {}, String(an)));
        ctl.push(ts);
      } else if (k === 'rule') {
        anchorParts.push(ruleBlock(an as Rec, 'rule', `${at}/window/anchor/rule`, 'the anchor’s rule'));
      } else if (k === 'display' || k === 'first') {
        anchorParts.push(hint('Kept as the card has it (the builder reads it and does not write a new one):'), h('p', { class: 'sb-says' }, ...anchorRead(an)));
      }
      if (forms[ruleKey]) anchorParts.push(leafForm('The anchor’s rule', (leaf) => ((w.anchor = { rule: leaf }), delete forms[ruleKey], restructure(`rule:${at}/window/anchor/rule:`)), () => (delete forms[ruleKey], redraw()), 'Use this rule'));
      ks.addEventListener('change', () => {
        const to = ks.value as AnchorKind;
        delete forms[ruleKey];
        if (to === 'rule') {
          forms[ruleKey] = true;
          return redraw('[aria-label="The anchor’s rule: its first condition"]');
        }
        w.anchor = to === 'phase' ? `phase:${String((a.phases as string[])[0])}` : to === 'action' ? `action:${others[0]![0]}` : to === 'each' ? `each:action:${others[0]![0]}` : to;
        restructure('[aria-label="Window: opens at"]');
      });
      out.push(put(`${at}/window/anchor`, box2('Anchor', ...anchorParts), ...ctl));
      // the numbers
      const within = numInput(w, 'withinS', WIN.withinS, 'Window: within how many seconds', () => (changed(), refresh()), true, { min: '0' }, (n) => (n !== undefined && typeof w.failAfterS === 'number' && n >= w.failAfterS ? `less than the fail-after time ${w.failAfterS} s` : null));
      const nb = numInput(w, 'notBeforeS', WIN.notBeforeS, 'Window: not before how many seconds (optional)', () => (changed(), refresh()), true, { min: '0' });
      const fa = numInput(w, 'failAfterS', WIN.failAfterS, 'Window: failed after how many seconds (optional)', () => (changed(), refresh()), true, { min: '0' }, (n) => (n !== undefined && n <= Number(w.withinS) ? `more than the window, ${w.withinS} s` : null));
      fa.input.disabled = k === 'each';
      out.push(h('div', { class: 'sb-crit', role: 'group', 'aria-label': 'Window' }, h('span', { class: 'sb-crit-k' }, 'Within'),
        put(`${at}/window/withinS`, h('div', { class: 'sb-leafrow' }, within.input, h('span', { class: 'sb-hint' }, 's'), within.why), within.input),
        put(`${at}/window/notBeforeS`, h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'not before'), nb.input, h('span', { class: 'sb-hint' }, 's (sooner is a deviation)'), nb.why), nb.input),
        put(`${at}/window/failAfterS`, h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'failed after'), fa.input, h('span', { class: 'sb-hint' }, k === 'each' ? 's (not with an each-taking anchor)' : 's (later is failed though done)'), fa.why), fa.input),
        button('Remove the window', () => (delete a.window, restructure()), 'small ghost', { 'aria-label': 'Remove the window: recorded, not timed' })));
      slots.set(`${at}/window`, slots.get(`${at}/window/anchor`)!);
    }
    // the repeat: none, unconditional, conditional (never both: the validator refuses both)
    const rkey = `repeat:${i}`;
    const mode = a.repeat ? 'repeat' : a.repeatWhile ? 'repeatWhile' : '';
    const ms = select(String(forms[rkey] ?? mode), [[null, [['', 'no repeat'], ['repeat', 'again every interval, while its phases hold'], ['repeatWhile', 'again while a rule holds']]]], 'Repeat: how');
    const rParts: Array<HTMLElement | string> = [h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'Repeat'), ms)];
    const rCtl: HTMLElement[] = [ms];
    const needMin = (x: Rec) => (x.min === undefined && x.value === undefined ? 'a repeat needs its shortest interval (the lowest or the value)' : null);
    if (forms[rkey]) {
      const want = String(forms[rkey]);
      const draft: Rec = {};
      let leaf: Rec | null = null;
      const ok = button('Set the repeat', () => {
        delete a.repeat;
        delete a.repeatWhile;
        if (want === 'repeat') a.repeat = { intervalS: draft.intervalS };
        else a.repeatWhile = { rule: leaf, intervalS: draft.intervalS };
        delete forms[rkey];
        restructure();
      }, 'small primary');
      const ready = () => (ok.disabled = !draft.intervalS || (want === 'repeatWhile' && !(leaf && leafComplete(leaf))));
      const f = amountFields({ get: () => draft.intervalS as Rec | undefined, make: (v) => ((draft.intervalS = v), ready()) }, 'amount', 'New repeat: interval, seconds', undefined, want === 'repeat' ? needMin : undefined);
      const kids: HTMLElement[] = [h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'Interval (s)')), f.el];
      if (want === 'repeatWhile') {
        leaf = draftLeaf('visited', String(phases()[0]?.id ?? ''));
        const kind = select('visited', [[null, LEAF_KINDS.map(([k2, x]) => [k2, x])]], 'New repeat: while');
        const fields = h('div', {});
        const drawFields = () => fields.replaceChildren(rules.leafFields(leaf!, ready, false, 'New repeat: while').el);
        kind.addEventListener('change', () => ((leaf = draftLeaf(kind.value as LeafKind, String(phases()[0]?.id ?? ''))), drawFields(), ready()));
        drawFields();
        kids.unshift(h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'While'), kind), fields);
      }
      ready();
      rParts.push(h('div', { class: 'sb-adder' }, ...kids, h('div', { class: 'sb-acts' }, ok, button('Cancel', () => (delete forms[rkey], redraw()), 'small ghost'))));
    } else if (a.repeat) {
      const r = a.repeat as Rec;
      const f = amountFields({ get: () => r.intervalS as Rec, make: () => undefined }, 'amount', 'Repeat: interval, seconds', undefined, needMin);
      const mc = numInput(r, 'maxCount', WIN.maxCount, 'Repeat: at most how many rows (optional)', () => (changed(), refresh()), true, { min: '1', step: '1' }, (n) => (n !== undefined && !Number.isInteger(n) ? 'a whole number' : null));
      rParts.push(put(`${at}/repeat/intervalS`, h('div', {}, h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'Every (s), from the previous dose as given')), f.el), ...f.controls),
        put(`${at}/repeat/maxCount`, h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'At most'), mc.input, h('span', { class: 'sb-hint' }, 'rows (optional)'), mc.why), mc.input));
    } else if (a.repeatWhile) {
      const r = a.repeatWhile as Rec;
      const f = amountFields({ get: () => r.intervalS as Rec, make: () => undefined }, 'amount', 'Repeat: interval, seconds');
      rParts.push(h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'While')), ruleBlock(r, 'rule', `${at}/repeatWhile/rule`, 'the repeat’s rule'),
        put(`${at}/repeatWhile/intervalS`, h('div', {}, h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'Due from the later of the previous dose + the lowest and the rule’s next rise, within (highest − lowest) s')), f.el), ...f.controls));
    }
    ms.addEventListener('change', () => {
      if (ms.value === '') {
        delete forms[rkey];
        delete a.repeat;
        delete a.repeatWhile;
        return restructure('[aria-label="Repeat: how"]');
      }
      if (ms.value === mode) {
        delete forms[rkey];
        return redraw('[aria-label="Repeat: how"]');
      }
      forms[rkey] = ms.value;
      redraw('[aria-label="Repeat: how"]');
    });
    out.push(put(`${at}/repeat`, box2('Again', ...rParts), ...rCtl));
    slots.set(`${at}/repeatWhile`, slots.get(`${at}/repeat`)!);
    // the precondition
    const pkey = `pre:${i}`;
    if (a.precondition) out.push(put(`${at}/precondition`, box2('Precondition', hint('Must hold at some time before the press; if it never held from the opening the row is not applicable.'), ruleBlock(a, 'precondition', `${at}/precondition`, 'the precondition', () => delete a.precondition))));
    else if (forms[pkey]) out.push(box2('Precondition', leafForm('The precondition', (leaf) => ((a.precondition = leaf), delete forms[pkey], restructure(`rule:${at}/precondition:`)), () => (delete forms[pkey], redraw()))));
    else out.push(put(`${at}/precondition`, box2('Precondition', hint('None.'), button('Add a precondition', () => ((forms[pkey] = true), redraw('[aria-label="The precondition: its first condition"]')), 'small'))));
    return out;
  };

  /** A display or first anchor in words, with the format's names in <code> (kept, not edited). */
  const anchorRead = (an: unknown): Array<string | HTMLElement> => {
    const walk = (x: unknown): Array<string | HTMLElement> => {
      if (typeof x === 'string') return [h('code', {}, x)];
      const o = x as Rec;
      if ('first' in o) return ['the earliest of ', ...(o.first as unknown[]).flatMap((y, k) => [k ? ' or ' : '', ...walk(y)])];
      if ('display' in o) return ['the monitor showing ', ...walk(o.display)];
      if ('rule' in o) return walk(o.rule);
      if ('phaseEntered' in o) return [`${labelOf(phases().find((p) => p.id === o.phaseEntered))} entered `, h('code', {}, String(o.phaseEntered))];
      for (const g of ['all', 'any'] as const) if (g in o) return ['(', ...(o[g] as unknown[]).flatMap((y, k) => [k ? (g === 'all' ? ' and ' : ' or ') : '', ...walk(y)]), ')'];
      if ('not' in o) return ['not ', ...walk(o.not)];
      const v = (o.value ?? {}) as Rec;
      return [h('code', {}, String(v.var)), ` ${v.op} ${v.value}${v.forS ? ` for ${v.forS} s` : ''}`];
    };
    return walk(an);
  };

  // ------------------------------------------------------------------------------------------------ violations
  const violations = (a: Rec, at: string, i: number): HTMLElement => {
    const cs = (a.contraindications as Rec[] | undefined) ?? [];
    const rows = cs.map((c, k) => {
      const cp = `${at}/contraindications/${k}`;
      const m = c.match as Rec;
      const n = `Violation ${k + 1}`;
      const tx = text(c, 'text', 0, true, `${n}: what it says`);
      tx.t.setAttribute('aria-label', `${n}: what it says`);
      const setMatch = (key: string, v: unknown) => {
        if (v === undefined || v === '') {
          if (Object.keys(m).length === 1 && key in m) return false; // minProperties 1: the last filter stays
          delete m[key];
        } else m[key] = v;
        return true;
      };
      const mk = select(String(m.kind ?? ''), [[null, [['', 'any kind'], ...RECORD_KINDS]]], `${n}: if given as`);
      const md = drugSelect(String(m.drugId ?? ''), `${n}: if the drug is`, 'any drug');
      const mc = classSelect(String(m.cls ?? ''), `${n}: if the class is`, 'any class');
      const why = h('span', { class: 'sb-numwhy', 'aria-live': 'polite' });
      for (const [s, key] of [[mk, 'kind'], [md, 'drugId'], [mc, 'cls']] as Array<[HTMLSelectElement, string]>) s.addEventListener('change', () => {
        if (!setMatch(key, s.value)) {
          why.textContent = 'a violation matches on at least one thing: not removed';
          s.value = String(m[key]);
          return;
        }
        restructure(`[aria-label="${s.getAttribute('aria-label')}"]`);
      });
      const routes = (m.route as string[] | undefined) ?? [];
      const rbox = ROUTES.map((r) => checkbox(ROUTE_WORDS[r] ?? r, routes.includes(r), (on) => {
        const next = on ? [...routes, r] : routes.filter((x) => x !== r);
        if (next.length && Array.isArray(m.route)) (m.route as string[]).splice(0, routes.length, ...next);
        else if (!setMatch('route', next.length ? next : undefined)) why.textContent = 'a violation matches on at least one thing: not removed';
        restructure();
      }, { 'aria-label': `${n}: by the route ${ROUTE_WORDS[r] ?? r}` }));
      const dose = amountFields({ get: () => m.dose as Rec | undefined, make: (v) => (m.dose = v), remove: Object.keys(m).length > 1 ? () => delete m.dose : undefined }, 'dose', `${n}: if the dose is`, { list: unitsFor(String(m.drugId || drugOf(a.drug as Rec) || ''), false), def: unitsFor(String(m.drugId || drugOf(a.drug as Rec) || ''), false)[0] ?? 'mg' });
      const inPh = ((c.inPhases as string[] | undefined) ?? []);
      const pbox = phases().map((p) => checkbox(labelOf(p), inPh.includes(String(p.id)), (on) => {
        const next = on ? [...inPh, String(p.id)] : inPh.filter((x) => x !== p.id);
        if (next.length && Array.isArray(c.inPhases)) (c.inPhases as string[]).splice(0, inPh.length, ...next);
        else if (next.length) c.inPhases = next;
        else delete c.inPhases;
        restructure();
      }, { 'aria-label': `${n}: only in ${labelOf(p)}` }));
      const aa = select(String(c.afterAction ?? ''), [[null, [['', 'at any time'], ...actions().map((x) => [String(x.id), `after ${String(x.label)}`] as [string, string])]]], `${n}: only after`, 'not an action of this card');
      aa.addEventListener('change', () => {
        if (aa.value) c.afterAction = aa.value;
        else delete c.afterAction;
        changed();
        refresh();
      });
      const harm = checkbox('The physiology does not carry the harm (the line says so)', c.harm === 'notModelled', (on) => {
        if (on) c.harm = 'notModelled';
        else delete c.harm;
        changed();
        refresh();
      });
      const wkey = `when:${i}:${k}`;
      const whenEl = c.when ? ruleBlock(c, 'when', `${cp}/when`, `${n}’s condition`, () => delete c.when)
        : forms[wkey] ? leafForm(`${n}’s condition`, (leaf) => ((c.when = leaf), delete forms[wkey], restructure(`rule:${cp}/when:`)), () => (delete forms[wkey], redraw()))
          : button('Add a condition', () => ((forms[wkey] = true), redraw()), 'small', { 'aria-label': `Add a condition to ${n}` });
      return put(cp, h('li', { class: 'sb-viol' },
        put(`${cp}/text`, field(`${n}: what the line says`, tx.t), tx.t), tx.why,
        put(`${cp}/match`, h('div', { class: 'sb-crit', role: 'group', 'aria-label': `${n}: what it matches` }, h('span', { class: 'sb-crit-k' }, 'If given'),
          h('div', { class: 'sb-leafrow' }, mk, md, mc), h('div', { class: 'sb-routes' }, ...rbox.map((b) => b.el)), dose.el, why), mk, md, mc, ...rbox.map((b) => b.c), ...dose.controls),
        put(`${cp}/inPhases`, h('div', { class: 'sb-crit', role: 'group', 'aria-label': `${n}: in which phases` }, h('span', { class: 'sb-crit-k' }, 'Only in'), h('div', { class: 'sb-routes' }, ...pbox.map((b) => b.el)), inPh.length ? null : hint('every phase')), ...pbox.map((b) => b.c)),
        put(`${cp}/afterAction`, h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'Only'), aa), aa),
        put(`${cp}/when`, h('div', {}, h('span', { class: 'sb-hint' }, 'Only while'), whenEl)),
        put(`${cp}/harm`, harm.el, harm.c),
        button(`Remove ${n.toLowerCase()}`, () => (cs.splice(k, 1), cs.length || delete a.contraindications, restructure()), 'small ghost')), tx.t);
    });
    const key = `viol:${i}`;
    let adder: HTMLElement | string = button('Add a violation', () => ((forms[key] = true), redraw('[aria-label="New violation: what the line says"]')), 'small');
    if (forms[key]) {
      const draft: Rec = { text: '', match: {} };
      const t = h('input', { type: 'text', class: 'input', autocomplete: 'off', 'aria-label': 'New violation: what the line says' });
      const dId = drugOf(a.drug as Rec | undefined) ?? '';
      const md = drugSelect(dId, 'New violation: if the drug is', 'any drug');
      const routes = new Set<string>();
      const rbox = ROUTES.map((r) => checkbox(ROUTE_WORDS[r] ?? r, false, (on) => ((on ? routes.add(r) : routes.delete(r)), ready()), { 'aria-label': `New violation: by the route ${ROUTE_WORDS[r] ?? r}` }));
      const ok = button('Add the violation', () => {
        const m: Rec = {};
        if (md.value) m.drugId = md.value;
        if (routes.size) m.route = ROUTES.filter((r) => routes.has(r));
        (a.contraindications ??= []) && (a.contraindications as Rec[]).push({ text: t.value, match: m });
        delete forms[key];
        restructure();
      }, 'small primary');
      const ready = () => (ok.disabled = !t.value.trim() || (!md.value && !routes.size));
      t.addEventListener('input', ready);
      md.addEventListener('change', ready);
      ready();
      void draft;
      adder = h('div', { class: 'sb-adder', role: 'group', 'aria-label': 'New violation' }, field('New violation: what the line says', t),
        h('div', { class: 'sb-leafrow' }, h('span', { class: 'sb-hint' }, 'If given'), md), h('div', { class: 'sb-routes' }, ...rbox.map((b) => b.el)),
        h('div', { class: 'sb-acts' }, ok, button('Cancel', () => (delete forms[key], redraw()), 'small ghost')), hint('Add waits for the words and a drug or a route; more filters once it exists.'));
    }
    return put(`${at}/contraindications`, h('div', { class: 'field' }, h('span', {}, 'Violations (an administration that matches is a timed line: never a grade, never blocked)'),
      cs.length ? h('ol', { class: 'sb-viols' }, ...rows) : hint('None.'), adder));
  };

  // ------------------------------------------------------------------------------------------------ the give
  const gives = (a: Rec, at: string, i: number): HTMLElement => {
    const g = (a.give as Rec[] | undefined) ?? [];
    const rows = g.map((c, k) => {
      const e = (c.event ?? {}) as Rec;
      const words = describeCommand(c);
      const ctl: HTMLElement[] = [];
      const parts: Array<HTMLElement | string> = [h('span', { class: 'sb-n', 'aria-hidden': 'true' }, String(k + 1)), h('span', {}, words)];
      if (c.type === 'applyEvent' && (e.kind === 'drug' || e.kind === 'infusion')) {
        const key = e.kind === 'drug' ? 'dose' : 'rate';
        const n = numInput(e, key, GIVE_NUM, `Press, command ${k + 1}: ${key === 'dose' ? 'the dose' : 'the rate'} of ${drugName(String(e.drugId))}`, () => (changed(), refresh()), true, { min: '0' });
        parts.push(n.input, h('span', { class: 'sb-hint' }, unitText(String(e.unit))), h('code', {}, String(e.drugId)), n.why);
        ctl.push(n.input);
      }
      const move = (d: number) => {
        [g[k], g[k + d]] = [g[k + d]!, g[k]!];
        restructure(`[data-f="give:${k + d}:${d < 0 ? 'up' : 'down'}"]`);
      };
      parts.push(
        button('Up', () => move(-1), 'small ghost', { 'aria-label': `Move command ${k + 1} up`, disabled: k === 0, 'data-f': `give:${k}:up` }),
        button('Down', () => move(1), 'small ghost', { 'aria-label': `Move command ${k + 1} down`, disabled: k === g.length - 1, 'data-f': `give:${k}:down` }),
        button('Remove', () => (g.splice(k, 1), g.length || delete a.give, restructure()), 'small ghost', { 'aria-label': `Remove command ${k + 1} from the press` }));
      return put(`${at}/give/${k}`, h('li', { class: 'sb-nextrow' }, ...parts), ...ctl);
    });
    const key = `give:${i}`;
    let adder: HTMLElement = button('Add from the Drug sheet', () => ((forms[key] = true), redraw('[aria-label="New command: what"]')), 'small');
    if (forms[key]) adder = giveForm(a, () => (delete forms[key], restructure()), () => (delete forms[key], redraw()));
    return put(`${at}/give`, h('div', { class: 'field' }, h('span', {}, 'A press gives (the commands Instructor v2’s A row sends, stamped with this action)'),
      g.length ? h('ol', { class: 'sb-next' }, ...rows) : hint(String(a.kind) === 'communication' || String(a.kind) === 'procedure' ? 'Nothing: the press is recorded (the scenario record command).' : 'Nothing.'), adder,
      hint('Ventilation, CPR, airway and other device commands are kept as the card has them and can be reordered or removed; a new one comes from the Drug sheet’s form (drugs, fluids, the vaporiser).')));
  };
  /** The Drug sheet's form for a new command: its items (drugs by name, the fluids, the vaporisers), a bolus or an infusion,
   *  the dose with the sheet's units and presets; the command is the sheet's own (physiology-console/actions.ts `bolus`,
   *  `infusion`, `fluid`, `vaporiser`, which the sheet sends). */
  const giveForm = (a: Rec, done: () => void, cancel: () => void): HTMLElement => {
    const drugId = drugOf(a.drug as Rec | undefined) ?? '';
    const what = select(drugId ? `drug:${drugId}` : '', [[null, [['', 'choose']]], ['Drugs', DRUG_CHOICES.map((d) => [`drug:${d.id}`, d.name] as [string, string])],
      ['Fluids', FLUID_IDS.map((f) => [`fluid:${f}`, f] as [string, string])], ['Vaporiser', ['sevoflurane', 'isoflurane', 'desflurane'].map((x) => [`vap:${x}`, x] as [string, string])]], 'New command: what');
    const form = h('div', { class: 'sb-leafrow' });
    const ok = button('Add to the press', () => {
      const c = build();
      if (!c) return;
      ((a.give ??= []) as Rec[]).push(c as Rec);
      done();
    }, 'small primary');
    const st: Rec = { route: 'bolus' };
    const numIn = (k: string, label: string) => {
      const i = h('input', { type: 'number', step: 'any', inputmode: 'decimal', class: 'input sb-num', 'aria-label': `New command: ${label}` });
      i.value = typeof st[k] === 'number' ? String(st[k]) : '';
      i.addEventListener('input', () => ((st[k] = i.value.trim() === '' ? undefined : Number(i.value)), ready()));
      return i;
    };
    const pos = (k: string) => typeof st[k] === 'number' && Number.isFinite(st[k]) && (st[k] as number) > 0;
    const build = (): Rec | null => {
      const [kind, id] = what.value.split(':') as [string, string];
      if (kind === 'drug' && pos('dose')) return (st.route === 'infusion' ? infusion(id, st.dose as number, String(st.unit)) : bolus(id, st.dose as number, String(st.unit))) as Rec;
      if (kind === 'fluid' && pos('vol') && pos('min')) return fluidCmd(id, st.vol as number, (st.min as number) * 60) as Rec;
      if (kind === 'vap' && typeof st.dial === 'number' && st.dial >= 0 && pos('fgf')) return vaporiser(id, st.dial, st.fgf as number) as Rec;
      return null;
    };
    const preview = h('span', { class: 'sb-hint' });
    const ready = () => {
      const c = build();
      ok.disabled = !c;
      preview.textContent = c ? `The press will send: ${describeCommand(c)}` : 'Waits for every number.';
    };
    const drawForm = () => {
      const [kind, id] = what.value.split(':') as [string, string];
      for (const k of Object.keys(st)) if (k !== 'route') delete st[k];
      if (kind === 'drug') {
        const units = () => unitsFor(id, st.route === 'infusion');
        const p = PRESETS[id] ?? {};
        if (!(st.route === 'bolus' ? p.bolus : p.infusion) && (st.route === 'bolus' ? p.infusion : p.bolus)) st.route = st.route === 'bolus' ? 'infusion' : 'bolus';
        const rs = select(String(st.route), [[null, [['bolus', 'IV bolus'], ['infusion', 'Infusion']]]], 'New command: given as');
        const first = (st.route === 'bolus' ? p.bolus : p.infusion)?.[0];
        st.unit = first?.[1] ?? units()[0];
        if (first) st.dose = first[0];
        const us = select(String(st.unit), [[null, units().map((u) => [u, unitText(u)] as [string, string])]], 'New command: unit');
        us.addEventListener('change', () => ((st.unit = us.value), ready()));
        const dose = numIn('dose', st.route === 'bolus' ? 'the dose' : 'the rate');
        const presets = ((st.route === 'bolus' ? p.bolus : p.infusion) ?? []).map(([v, u]) => button(`${v} ${unitText(u)}`, () => {
          st.dose = v;
          st.unit = u;
          dose.value = String(v);
          us.value = u;
          ready();
        }, 'small ghost', { 'aria-label': `Preset ${v} ${unitText(u)}` }));
        rs.addEventListener('change', () => ((st.route = rs.value), drawForm()));
        form.replaceChildren(rs, dose, us, ...(presets.length ? [h('span', { class: 'sb-hint' }, 'Presets'), ...presets] : []));
      } else if (kind === 'fluid') {
        st.vol = 500;
        st.min = 10;
        form.replaceChildren(numIn('vol', 'volume, mL'), h('span', { class: 'sb-hint' }, 'mL over'), numIn('min', 'over how many minutes'), h('span', { class: 'sb-hint' }, 'min'));
      } else if (kind === 'vap') {
        st.dial = 2;
        st.fgf = 2;
        form.replaceChildren(h('span', { class: 'sb-hint' }, 'Dial'), numIn('dial', 'dial, %'), h('span', { class: 'sb-hint' }, '% at'), numIn('fgf', 'fresh gas, L/min'), h('span', { class: 'sb-hint' }, 'L/min'));
      } else form.replaceChildren();
      ready();
    };
    what.addEventListener('change', drawForm);
    drawForm();
    return h('div', { class: 'sb-adder', role: 'group', 'aria-label': 'New command, from the Drug sheet’s form' }, h('div', { class: 'sb-leafrow' }, what), form, preview,
      h('div', { class: 'sb-acts' }, ok, button('Cancel', cancel, 'small ghost')));
  };

  // ------------------------------------------------------------------------------------------------ one action
  const drawAction = (i: number): HTMLElement[] => {
    const as = actions();
    const a = as[i]!;
    const at = `/actions/${i}`;
    const kind = String(a.kind);
    const graded = a.graded !== false && a.preparation !== true;
    const headMsgs = h('div', { class: 'sb-msgs', id: uid('sbm') });
    const head = h('div', { class: 'sb-phase-head' },
      h('h3', { id: 'sb-action-h' }, 'Action: ', h('span', { class: 'sb-pt' }, String(a.label || 'untitled')), ' ',
        h('small', {}, `${KIND_INFO[kind]?.words ?? kind}; ${graded ? 'graded met · deviation · overdue · failed · not applicable' : a.preparation === true ? 'a preparation step: recorded, no verdict' : 'not graded: offered and recorded'}`)),
      headMsgs);
    slots.set(at, { el: head, msgs: headMsgs, controls: [] });

    // label, id, kind
    const label = text(a, 'label', 0, true, 'A row title', () => {
      const t = box.querySelector('#sb-action-h .sb-pt');
      if (t) t.textContent = String(a.label || 'untitled');
      drawList();
      refresh();
      redrawn();
    });
    const idIn = h('input', { type: 'text', class: 'input', autocomplete: 'off', spellcheck: false });
    idIn.value = String(a.id ?? '');
    const idWhy = h('p', { class: 'sb-hint sb-idwhy', 'aria-live': 'polite' });
    idIn.addEventListener('change', () => {
      const to = idIn.value.trim();
      const why = actionIdProblem(F, i, to);
      if (why) {
        idWhy.textContent = `Not renamed: ${why}. The action keeps its id.`;
        idIn.setAttribute('aria-invalid', 'true');
        return;
      }
      renameAction(F, i, to);
      restructure();
    });
    const idField = field('Action id', idIn, 'Renaming changes every place the card names it (anchors, violations, script, debrief).');
    idField.append(idWhy);
    const kkey = `kind:${i}`;
    const ks = select(String(forms[kkey] ?? kind), [[null, KINDS.map((k) => [k, KIND_INFO[k]?.words ?? k] as [string, string])]], 'Kind');
    const kindField = field('Kind', ks, KIND_INFO[kind] ? `Matched ${KIND_INFO[kind]!.matched}.` : undefined);
    ks.addEventListener('change', () => void (async () => {
      const to = ks.value;
      if (to === kind) {
        delete forms[kkey];
        return redraw('[aria-label="Kind"]');
      }
      const own = KIND_INFO[kind]?.block;
      if (own && a[own] !== undefined && !(await confirmDialog('Change the kind?', `The action’s ${own} criteria are removed (the draft’s snapshots keep them).`, 'Change the kind', true, 'Keep the kind'))) {
        ks.value = kind;
        return;
      }
      if (draftBlock(to)) {
        forms[kkey] = to;
        return redraw('[aria-label="Kind"]');
      }
      setKind(a, to, null);
      restructure('[aria-label="Kind"]');
    })());
    if (forms[kkey]) {
      const to = String(forms[kkey]);
      const b = draftBlock(to);
      const ok = button('Change the kind', () => {
        setKind(a, to, b);
        delete forms[kkey];
        restructure('[aria-label="Kind"]');
      }, 'small primary');
      const ready = () => (ok.disabled = blockMissing(to, b) !== null);
      const f = blockForm(to, b, ready, `The new kind’s criteria`);
      ready();
      kindField.append(h('div', { class: 'sb-adder' }, f ?? '', h('div', { class: 'sb-acts' }, ok, button('Cancel', () => (delete forms[kkey], redraw()), 'small ghost'))));
    }
    const row1 = [put(`${at}/label`, field('Row title', label.t), label.t), put(`${at}/id`, idField, idIn), put(`${at}/kind`, kindField, ks)];
    row1[0]!.append(label.why);

    // its phases
    const ph = a.phases as string[];
    const pboxes = phases().map((p) => checkbox(labelOf(p), ph.includes(String(p.id)), (on) => {
      if (on) ph.push(String(p.id));
      else if (ph.length > 1) ph.splice(ph.indexOf(String(p.id)), 1);
      restructure(`[data-phase="${String(p.id)}"]`);
    }, { 'data-phase': String(p.id), disabled: ph.length === 1 && ph.includes(String(p.id)) ? true : undefined }));
    const phField = put(`${at}/phases`, h('div', { class: 'field' }, h('span', {}, 'Open in phases (its row is offered once one of them is first entered)'), h('div', { class: 'sb-routes' }, ...pboxes.map((b) => b.el)),
      hint('At least one: the last one stays.')), ...pboxes.map((b) => b.c));

    // the switches
    const others = actions().some((x, k) => k !== i && x.recognition === true);
    const g = checkbox('Not graded: a setup action, offered and recorded (as the induction)', a.graded === false, (on) => ((on ? (a.graded = false) : delete a.graded), restructure()));
    const p = checkbox('A preparation step (monitoring, lines): recorded with its time, no verdict, no window', a.preparation === true, (on) => ((on ? (a.preparation = true) : delete a.preparation), restructure()), { disabled: a.window !== undefined && a.preparation !== true ? true : undefined });
    const r = checkbox('The card’s recognition: the Debrief’s recognition tile reads this action', a.recognition === true, (on) => ((on ? (a.recognition = true) : delete a.recognition), restructure()), { disabled: others && a.recognition !== true ? true : undefined });
    const switches = h('div', { class: 'field sb-switches' }, h('span', {}, 'How it counts'),
      put(`${at}/graded`, g.el, g.c), put(`${at}/preparation`, h('div', {}, p.el, a.window !== undefined && a.preparation !== true ? hint('Remove the window first: a preparation step has none.') : null), p.c),
      put(`${at}/recognition`, h('div', {}, r.el, others && a.recognition !== true ? hint('Another action is the card’s recognition (a card has at most one).') : null), r.c));

    // criteria and when, side by side as the mock-up draws them
    const cols = h('div', { class: 'sb-cols' },
      h('div', { class: 'field' }, h('span', {}, 'Acceptance criteria'), h('div', { class: 'sb-crits' }, ...criteria(a, at))),
      h('div', { class: 'field' }, h('span', {}, 'When (the window and the repeat)'), h('div', { class: 'sb-crits' }, ...whenBlock(a, at, i))));
    const ord = a.order as Rec | undefined;
    const orderEl = ord ? hint(['Order (not graded yet), kept as the card has it: ', ...(['after', 'before'] as const).flatMap((k) => (Array.isArray(ord[k]) ? [`${k} `, ...(ord[k] as string[]).flatMap((x, j) => [j ? ', ' : '', actionLabel(x)]), ' '] : []))]) : null;

    // notes, sources, the preview, the examples
    const notes = text(a, 'notes', 2, false, 'Notes');
    const src = text(a, 'src', 3, false, 'Sources');
    const preview = h('div', { class: 'sb-preview', role: 'group', 'aria-label': 'As Instructor v2 will show this action, and how grade() grades it' });
    refresh = () => {
      const d = doc();
      const row = instructorRow(d, i);
      const ex = gradeExamples(d, i);
      const lineOf = (x: string) => h('span', {}, ...coded(x, [...new Set(x.match(/\b[a-z]+[A-Z][A-Za-z0-9]*\b/g) ?? [])]));
      preview.replaceChildren(
        h('p', { class: 'sb-preview-l' }, 'The row as Instructor v2 draws it (its own words, from the same function)'),
        'error' in row ? h('div', { class: 'sb-preview-row' }, h('span', {}, `Instructor v2 could not word this row: ${row.error}. Reported; its words are not changed here.`))
          : h('div', { class: 'sb-preview-row' }, h('b', {}, row.title), lineOf(row.subtitle), h('small', {}, `In ACTION, from ${labelOf(phases().find((x) => x.id === row.phase))}${ex.due ? ` · reads “${ex.due}” when it opens (grade()’s live words)` : ''}`)),
        h('p', { class: 'sb-preview-l' }, 'How it grades (grade()’s own rows)'),
        h('p', { class: 'sb-hint' }, ex.note),
        ex.examples.length ? h('ul', { class: 'sb-examples' }, ...ex.examples.map((e) => h('li', { class: `sb-ex ${e.grade === 'met' ? 'ok' : e.grade === 'deviation' || e.grade === 'overdue' || e.grade === 'due' ? 'warn' : e.grade === 'failed' ? 'bad' : ''}` },
          h('span', { class: 'sb-ex-give' }, e.give, e.afterS !== null && e.give !== 'nothing yet' ? h('small', {}, ` · ${Math.floor(e.afterS / 60)}:${String(Math.round(e.afterS) % 60).padStart(2, '0')} after it opened`) : ''),
          h('span', { class: 'sb-ex-grade' }, lineOf(e.live), e.first !== e.grade ? h('small', {}, ` (the first give: ${e.first}; a repeat makes the row ${e.grade})`) : ''),
          ...e.lines.filter((l) => !e.live.endsWith(l)).map((l) => h('small', { class: 'sb-ex-line' }, lineOf(l))),
          ...e.violations.map((v) => h('small', { class: 'sb-ex-viol' }, 'Violation: ', v))))) : '',
      );
    };
    refresh();

    // remove the action
    const named = actionMentions(F, String(a.id));
    const removeBox = h('div', { class: 'sb-phase-remove' });
    if (named.length) removeBox.append(hint(['Named elsewhere in the card (', ...named.flatMap((x, k) => [k ? ', ' : '', h('code', {}, x)]), '): change those first, then the action can be removed.']));
    else removeBox.append(button('Remove this action', () => void (async () => {
      if (!(await confirmDialog('Remove this action?', `“${String(a.label)}” is removed from the card. The draft’s snapshots keep it.`, 'Remove action', true, 'Keep the action'))) return;
      as.splice(i, 1);
      cur = Math.min(i, as.length - 1);
      restructure('h');
    })(), 'ghost', { 'aria-label': `Remove the action ${String(a.label)}` }));

    return [head, h('div', { class: 'sb-row', style: '--n:3' }, ...row1), phField, switches, cols, ...(orderEl ? [orderEl] : []), violations(a, at, i), gives(a, at, i),
      h('div', { class: 'sb-row' }, put(`${at}/notes`, field('Notes (the instructor reads them)', notes.t), notes.t), put(`${at}/src`, field('Sources of its numbers', src.t, 'Every number with its quote and page; a number no source states is a placeholder, marked for the owner.'), src.t)),
      preview, removeBox];
  };

  // ------------------------------------------------------------------------------------------------ a new action
  const drawAdding = (): HTMLElement[] => {
    const n = adding!;
    const label = h('input', { type: 'text', class: 'input', autocomplete: 'off', value: n.label });
    const idIn = h('input', { type: 'text', class: 'input', autocomplete: 'off', spellcheck: false, value: n.id });
    const idWhy = h('p', { class: 'sb-hint', 'aria-live': 'polite' });
    const ks = select(n.kind, [[null, KINDS.map((k) => [k, KIND_INFO[k]?.words ?? k] as [string, string])]], 'New action: kind');
    const ps = select(n.phase, [[null, phaseChoices()]], 'New action: open in');
    const blockBox = h('div', {});
    const ok = button('Add the action', () => {
      const a: Rec = { id: n.id, label: n.label, kind: n.kind, phases: [n.phase] };
      setKind(a, n.kind, n.block);
      actions().push(a);
      adding = null;
      cur = actions().length - 1;
      restructure('h');
    }, 'primary');
    const ready = () => {
      const why = n.label.trim() === '' ? 'a row title is needed' : actionIdProblem(F, -1, n.id) ?? (blockMissing(n.kind, n.block) ? `its criteria need ${blockMissing(n.kind, n.block)}` : null);
      idWhy.textContent = why && n.label.trim() !== '' ? `${why[0]!.toUpperCase()}${why.slice(1)}.` : '';
      ok.disabled = !!why;
    };
    const drawBlock = () => {
      n.block = draftBlock(n.kind);
      blockBox.replaceChildren(blockForm(n.kind, n.block, ready, 'New action') ?? hint(`${KIND_INFO[n.kind]?.words ?? n.kind}: matched ${KIND_INFO[n.kind]?.matched ?? ''}; no criteria to set.`));
      ready();
    };
    label.addEventListener('input', () => {
      n.label = label.value;
      if (!n.idTouched) idIn.value = n.id = actionIdFromLabel(F, n.label || 'action');
      ready();
    });
    idIn.addEventListener('input', () => ((n.idTouched = true), (n.id = idIn.value.trim()), ready()));
    ks.addEventListener('change', () => ((n.kind = ks.value), drawBlock()));
    ps.addEventListener('change', () => (n.phase = ps.value));
    drawBlock();
    queueMicrotask(() => label.focus());
    const idField = field('Action id', idIn);
    idField.append(idWhy);
    return [
      h('div', { class: 'sb-phase-head' }, h('h3', { id: 'sb-action-h' }, 'A new action ', h('small', {}, 'added at the end of the list; written into the card when Add is pressed'))),
      h('div', { class: 'sb-row', style: '--n:3' }, field('Row title', label), idField, field('Kind', ks)),
      h('div', { class: 'sb-row' }, field('Open in (more phases once it exists)', ps), h('div', { class: 'field' }, h('span', {}, 'Its criteria (the rest once it exists)'), blockBox)),
      h('div', { class: 'sb-acts' }, ok, button('Cancel', () => ((adding = null), redraw()), 'ghost')),
      hint('Add waits for a row title, an id of its own and what its kind is matched by.'),
    ];
  };

  // ------------------------------------------------------------------------------------------------ the list
  function drawList() {
    const as = actions();
    listSlots.length = 0;
    list.replaceChildren(...as.map((a, i) => {
      const msgs = h('div', { class: 'sb-msgs', id: uid('sbm') });
      const b = h('button', { type: 'button', class: 'sb-out', 'aria-current': i === cur && !adding ? 'true' : undefined, onclick: () => open(i) },
        h('span', { class: 'sb-dot', 'aria-hidden': 'true' }), h('span', { class: 'sb-pl' }, String(a.label || 'untitled')),
        h('small', {}, a.preparation === true ? 'preparation' : a.graded === false ? 'not graded' : (KIND_INFO[String(a.kind)]?.words ?? '').replace(/^An? /, '').replace(/, graded on its effect$/, '')),
        h('span', { class: 'sr-only sb-phase-state' }));
      const li = h('li', {}, b, msgs);
      listSlots[i] = { el: li, msgs, controls: [b] };
      return li;
    }), h('li', {}, button('Add an action', () => {
      adding = { label: '', id: actionIdFromLabel(F, 'action'), idTouched: false, kind: 'drug', phase: String(as[cur]?.phases && (as[cur]!.phases as string[])[0] || phases()[0]?.id || ''), block: draftBlock('drug') };
      redraw();
    }, 'small', { 'aria-label': 'Add an action' })));
    const cs = as.flatMap((a, i) => ((a.contraindications as unknown[] | undefined) ?? []).length ? [[i, (a.contraindications as unknown[]).length] as const] : []);
    viol.replaceChildren(...(cs.length ? ['Violations on this card, each edited in its action: ', ...cs.flatMap(([i, n], k) => [k ? ' · ' : '', button(`${String(as[i]!.label)} (${n})`, () => open(i), 'small ghost sb-inline', { 'aria-label': `Open ${String(as[i]!.label)}: ${n} ${n === 1 ? 'violation' : 'violations'}` })])] : ['No violations on this card.']));
  }

  function draw() {
    slots.clear();
    drawList();
    const as = actions();
    if (!adding && !as[cur]) cur = 0;
    box.replaceChildren(...(adding ? drawAdding() : as[cur] ? drawAction(cur) : [hint('This card has no actions.')]));
    const f = focusNext;
    focusNext = null;
    if (f !== null) queueMicrotask(() => {
      let target: HTMLElement | null = null;
      if (f === 'h') target = box.querySelector<HTMLElement>('#sb-action-h');
      else if (f.startsWith('rule:')) {
        const [, root, node] = /^rule:([^:]*):(.*)$/.exec(f) ?? [];
        const at = node!.endsWith('/new') ? node!.slice(0, -4) : node!;
        const lis = [...box.querySelectorAll<HTMLElement>(`[data-rule="${root}"]`)];
        const li = (node!.endsWith('/new') ? lis.filter((x) => x.dataset.node!.startsWith(`${at}/`)).at(-1) : lis.find((x) => x.dataset.node === at)) ?? lis[0];
        target = li?.querySelector<HTMLElement>('select, input, button') ?? null;
      } else target = box.querySelector<HTMLElement>(`${f}:not([disabled])`) ?? box.querySelector<HTMLElement>(f);
      if (target && target.tagName === 'H3' && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target?.focus();
    });
  }

  function open(i: number) {
    adding = null;
    rules.closeAdder();
    for (const k of Object.keys(forms)) delete forms[k];
    cur = i;
    draw();
    redrawn();
    queueMicrotask(() => {
      const hd = box.querySelector<HTMLElement>('#sb-action-h');
      if (hd) {
        hd.setAttribute('tabindex', '-1');
        hd.focus();
      }
    });
  }

  // the first graded drug action opens first (the mock-up's), else the first action
  cur = Math.max(0, actions().findIndex((a) => a.kind === 'drug' && a.graded !== false && a.preparation !== true));
  draw();
  return view;
}

