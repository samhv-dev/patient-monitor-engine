// The builder's first three sections (docs/plans/scenario-builder.md §5.2; piece B2): Header and story, Patient and
// sensors, Case briefing. Each control edits the form B1 builds (`formOf`) in place and calls `changed()`; the page
// writes the card through `docOf`. Every control is a slot keyed by the field it edits, so a validator line placed by
// `fieldOf` shows on that field (or on its row: a take-home line), and a line that names no control of the section shows
// under the section's heading. Lossless: a control writes only when the author changes it; an optional field emptied is
// removed (as if never written), a required one (title, id, a briefing's text) is kept empty so the validator names it.
import { CATEGORIES } from '../scenario-meta.ts';
import { button, h } from '../ui.ts';
import type { CardForm } from './form.ts';

type Rec = Record<string, unknown>;
/** The sections the builder edits: B2's three here, B3's Phases in phase-editor.ts. */
export type SectionId = 'header' | 'patient' | 'briefing' | 'phases';

/** A place a message shows: the field's wrapper, its messages, its controls (one per row for a list). */
export interface Slot {
  el: HTMLElement;
  msgs: HTMLElement;
  controls: HTMLElement[];
}

export interface SectionView {
  id: SectionId;
  title: string;
  el: HTMLElement;
  /** Messages that name no control of the section (a whole block, the card). */
  head: Slot;
  /** By field: `title`, `takeHome`, `patient/ageY`, `briefing/text`. */
  slots: Map<string, Slot>;
}

/** The take-home lines the schema accepts (`takeHome.maxItems`): "Add a line" stops there. [ENG: ui] */
export const TAKE_HOME_MAX = 4;
/** The briefing's longest text (`briefing.text.maxLength`), counted live under the field. [ENG: ui] */
export const BRIEFING_MAX = 4000;

/** The sensors the card's patient block names (the schema's `sensorId`) in the app's words, each with the states the
 *  engine accepts for it (its `attachSensor` checks: device-layer.ts for the ECG, hemo/pipeline.ts for SpO₂, the cuff
 *  and the three lines, resp/pipeline.ts for CO₂ and temperature), so the builder offers no state the engine refuses. */
export const SENSORS: ReadonlyArray<[id: string, label: string, states: readonly string[]]> = [
  ['ecg', 'ECG', ['on', 'off', 'motion']],
  ['spo2', 'Pulse oximeter', ['on', 'off', 'motion']],
  ['nibp', 'Blood pressure cuff', ['on', 'off']],
  ['abp', 'Arterial line', ['connected', 'none', 'atmosphere', 'zeroing', 'damped']],
  ['cvp', 'Central venous line', ['connected', 'none', 'atmosphere', 'zeroing', 'damped']],
  ['pap', 'Pulmonary artery line', ['connected', 'none', 'atmosphere', 'zeroing', 'damped']],
  ['co2', 'Capnograph', ['on', 'off', 'warmup', 'occluded']],
  ['temp', 'Temperature probe', ['on', 'off']],
];
const STATE_WORDS: Record<string, string> = {
  on: 'on', off: 'off', motion: 'on, with motion artefact', connected: 'connected', none: 'not placed', atmosphere: 'open to air',
  zeroing: 'zeroing', damped: 'damped', warmup: 'warming up', occluded: 'line occluded',
};
/** The patient block's other parts, kept as the card has them, in words (never the engine's keys). */
const PATIENT_KEPT: Record<string, string> = {
  neuro: 'neuromuscular profile', blood: 'blood values', baseline: 'starting values', rhythm: 'rhythm', profile: 'conditions', endo: 'endocrine profile',
};

let seq = 0;
const uid = (p: string) => `${p}-${(++seq).toString(36)}`;

function slotOf(el: HTMLElement, controls: HTMLElement[]): Slot {
  const msgs = h('div', { class: 'sb-msgs', id: uid('sbm') });
  el.append(msgs);
  return { el, msgs, controls };
}

/** A labelled control in a `.field`, its value read and written through `get`/`set`. */
function control(label: string, ctl: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, hint?: string): HTMLElement {
  ctl.id = uid('sbf');
  ctl.classList.add('input');
  return h('div', { class: 'field' }, h('label', { for: ctl.id }, label), ctl, hint ? h('p', { class: 'sb-hint' }, hint) : null);
}

/** The three sections over `form`; `changed()` after every edit. */
export function sections(form: CardForm, changed: () => void): SectionView[] {
  const F = form.fields as Rec;
  const block = (k: 'patient' | 'briefing'): Rec | undefined => F[k] as Rec | undefined;
  /** Write `k` in `o` (an emptied optional field removed), then `changed()`. */
  const put = (o: Rec, k: string, v: unknown, required = false) => {
    if ((v === '' || v === undefined) && !required) delete o[k];
    else o[k] = v;
    changed();
  };
  /** The patient or briefing block, made when the author first writes into it, removed when its last field empties. */
  const into = (k: 'patient' | 'briefing', f: string, v: unknown, required = false) => {
    const o = block(k) ?? {};
    if ((v === '' || v === undefined) && !required) delete o[f];
    else o[f] = v;
    if (Object.keys(o).length) F[k] = o;
    else delete F[k];
    changed();
  };
  const num = (v: string): number | undefined => (v.trim() === '' ? undefined : Number(v));
  const textIn = (value: unknown, onInput: (v: string) => void, attrs: Rec = {}) => {
    const i = h('input', { type: 'text', autocomplete: 'off', spellcheck: false, ...(attrs as Record<string, string>) });
    i.value = typeof value === 'string' ? value : '';
    i.addEventListener('input', () => onInput(i.value));
    return i;
  };
  const numIn = (value: unknown, onInput: (v: number | undefined) => void, attrs: Rec = {}) => {
    const i = h('input', { type: 'number', inputmode: 'decimal', ...(attrs as Record<string, string>) });
    i.value = typeof value === 'number' ? String(value) : '';
    i.addEventListener('input', () => onInput(num(i.value)));
    return i;
  };
  const area = (value: unknown, onInput: (v: string) => void, rows = 4, attrs: Rec = {}) => {
    const t = h('textarea', { rows, ...(attrs as Record<string, string>) });
    t.value = typeof value === 'string' ? value : '';
    t.addEventListener('input', () => onInput(t.value));
    return t;
  };
  /** A select over `opts`; the card's own value is kept as an option when the list does not have it. */
  const pick = (value: unknown, opts: Array<[string, string]>, onChange: (v: string) => void) => {
    const s = h('select', {});
    const v = typeof value === 'string' ? value : '';
    const all = opts.some(([x]) => x === v) ? opts : [...opts, [v, v] as [string, string]];
    for (const [x, t] of all) s.append(h('option', { value: x }, t));
    s.value = v;
    s.addEventListener('change', () => onChange(s.value));
    return s;
  };
  const row = (n: number, ...kids: HTMLElement[]) => h('div', { class: 'sb-row', style: `--n:${n}` }, ...kids);

  const view = (id: SectionId, title: string, sub: string) => {
    const head = slotOf(h('div', { class: 'sb-head' }, h('h2', { id: `sb-sec-${id}` }, title, ' ', h('small', {}, sub))), []);
    return { id, title, el: h('section', { class: 'sb-panel sb-edit', 'aria-labelledby': `sb-sec-${id}`, 'data-section': id }, head.el), head, slots: new Map<string, Slot>() } satisfies SectionView;
  };
  const add = (v: SectionView, key: string, el: HTMLElement, ...controls: HTMLElement[]) => (v.slots.set(key, slotOf(el, controls)), el);

  // ------------------------------------------------------------------------------------------------ Header and story
  const hd = view('header', 'Header and story', 'what the library and the Case details show');
  const title = textIn(F.title, (v) => put(F, 'title', v, true));
  const id = textIn(F.id, (v) => put(F, 'id', v, true));
  const cat = pick(F.category, [['', 'No category'], ...CATEGORIES.map((c) => [c, c] as [string, string])], (v) => put(F, 'category', v));
  const mode = pick(F.mode, [['', 'Not set'], ['modeled', 'Modeled'], ['manual', 'Manual']], (v) => put(F, 'mode', v));
  const dur = numIn(F.durationMin, (v) => put(F, 'durationMin', v), { min: '0', step: '1' });
  const seed = numIn(F.seed, (v) => put(F, 'seed', v), { min: '0', step: '1' });
  const story = area(F.story, (v) => put(F, 'story', v), 4);
  const notes = area(F.notes, (v) => put(F, 'notes', v), 3);
  const lines = h('div', { class: 'sb-lines' });
  const homeField = h('div', { class: 'field sb-takehome' }, h('span', { id: 'sb-th-l' }, `Take-home lines (the learner handout; at most ${TAKE_HOME_MAX})`), lines);
  const homeSlot = slotOf(homeField, []);
  hd.slots.set('takeHome', homeSlot);
  const drawLines = () => {
    const xs = Array.isArray(F.takeHome) ? (F.takeHome as unknown[]) : [];
    homeSlot.controls = [];
    lines.replaceChildren(...xs.map((x, i) => {
      const inp = textIn(x, (v) => {
        (F.takeHome as unknown[])[i] = v;
        changed();
      }, { 'aria-label': `Take-home line ${i + 1}`, class: 'input' });
      homeSlot.controls.push(inp);
      return h('div', { class: 'sb-line' }, inp, button('Remove', () => {
        (F.takeHome as unknown[]).splice(i, 1);
        if (!(F.takeHome as unknown[]).length) delete F.takeHome;
        drawLines();
        changed();
      }, 'small ghost', { 'aria-label': `Remove take-home line ${i + 1}` }));
    }), h('div', { class: 'sb-line-add' }, button('Add a line', () => {
      F.takeHome = [...xs, ''];
      drawLines();
      changed();
      (lines.querySelectorAll('input')[xs.length] as HTMLInputElement | undefined)?.focus();
    }, 'small', { disabled: xs.length >= TAKE_HOME_MAX })));
  };
  drawLines();
  hd.el.append(
    row(3, add(hd, 'title', control('Title', title), title), add(hd, 'id', control('Card id', id, 'A library card’s id is refused; a copy gets its own.'), id), add(hd, 'category', control('Category', cat), cat)),
    row(4, add(hd, 'mode', control('Physiology', mode), mode), add(hd, 'durationMin', control('About, minutes', dur), dur), add(hd, 'seed', control('Seed', seed, 'The same seed gives the same course.'), seed),
      add(hd, 'schema', h('div', { class: 'field' }, h('span', {}, 'Format'), h('p', { class: 'sb-fixed' }, h('code', {}, 'pme-scenario/2'))))),
    add(hd, 'story', control('Story (the library’s one sentence is its first)', story), story),
    homeField,
    add(hd, 'notes', control('Notes (the author’s; not shown to learners)', notes), notes),
  );

  // --------------------------------------------------------------------------------------------- Patient and sensors
  const pt = view('patient', 'Patient and sensors', 'who is on the table, and what is attached at the start');
  const P = () => block('patient') ?? {};
  const pf = (f: string) => (v: unknown) => into('patient', f, v);
  const age = numIn(P().ageY, pf('ageY'), { min: '0', max: '120', step: '1' });
  const sex = pick(P().sex, [['', 'Not set'], ['F', 'Female'], ['M', 'Male']], pf('sex'));
  const wt = numIn(P().weightKg, pf('weightKg'), { min: '0', max: '300', step: '1' });
  const ht = numIn(P().heightCm, pf('heightCm'), { min: '0', max: '250', step: '1' });
  const band = pick(P().ageBand, [['', 'Not set'], ['adult', 'Adult'], ['paediatric', 'Paediatric'], ['neonatal', 'Neonatal']], pf('ageBand'));
  const sensorBox = h('fieldset', { class: 'sb-sensors' }, h('legend', {}, 'Sensors at the start'));
  const sensorCtls: HTMLElement[] = [];
  for (const [sid, label, states] of SENSORS) {
    const cur = (P().sensors as Rec | undefined)?.[sid];
    const s = pick(cur, [['', 'Not set'], ...states.map((x) => [x, STATE_WORDS[x] ?? x] as [string, string])], (v) => {
      const o = { ...((P().sensors as Rec | undefined) ?? {}) };
      if (v) o[sid] = v;
      else delete o[sid];
      into('patient', 'sensors', Object.keys(o).length ? o : undefined);
    });
    sensorCtls.push(s);
    sensorBox.append(control(label, s));
  }
  const kept = Object.keys(P()).filter((k) => k in PATIENT_KEPT).map((k) => PATIENT_KEPT[k]);
  pt.el.append(
    row(5, add(pt, 'patient/ageY', control('Age, years', age), age), add(pt, 'patient/sex', control('Sex', sex), sex), add(pt, 'patient/weightKg', control('Weight, kg', wt), wt),
      add(pt, 'patient/heightCm', control('Height, cm', ht), ht), add(pt, 'patient/ageBand', control('Age band', band), band)),
    add(pt, 'patient/sensors', sensorBox, ...sensorCtls),
    ...(kept.length || F.device !== undefined
      ? [h('p', { class: 'sb-hint' }, `Kept as the card has them (edited in the card file for now): ${[...kept, ...(F.device !== undefined ? ['the monitor’s look'] : [])].join(', ')}.`)]
      : []),
  );

  // ---------------------------------------------------------------------------------------------------- Case briefing
  const br = view('briefing', 'Case briefing', 'what every learner screen shows over the monitor when the card loads');
  const B = () => block('briefing') ?? {};
  const count = h('span', { class: 'sb-count' });
  const counted = () => {
    const n = typeof B().text === 'string' ? (B().text as string).length : 0;
    count.textContent = `${n} of ${BRIEFING_MAX} characters`;
    count.classList.toggle('over', n > BRIEFING_MAX);
  };
  const btext = area(B().text, (v) => {
    into('briefing', 'text', v, Object.keys(B()).some((k) => k !== 'text'));
    counted();
  }, 8);
  const est = numIn(B().estimatedMinutes, (v) => into('briefing', 'estimatedMinutes', v), { min: '0', step: '1' });
  const show = numIn(B().durationS, (v) => into('briefing', 'durationS', v), { min: '0', max: '600', step: '1' });
  const lang = pick(B().lang, [['', 'English (not set)'], ['en', 'English'], ['fa', 'Persian']], (v) => into('briefing', 'lang', v));
  const fa = area(B().textFa, (v) => into('briefing', 'textFa', v), 5, { dir: 'rtl', lang: 'fa' });
  counted();
  br.el.append(
    add(br, 'briefing/text', h('div', { class: 'field' }, h('label', { for: (btext.id = uid('sbf')) }, 'Briefing'), (btext.classList.add('input'), btext),
      h('p', { class: 'sb-hint' }, 'Who the learner is, the patient, what has happened, what is connected, what to do; paragraphs separated by a blank line. It never names the diagnosis. ', count)), btext),
    row(3, add(br, 'briefing/estimatedMinutes', control('Estimated time, minutes', est, 'Its “about N minutes” line; empty: no line.'), est),
      add(br, 'briefing/durationS', control('Shown for, seconds', show, 'At most 600; 60 when empty. A tap ends it earlier.'), show),
      add(br, 'briefing/lang', control('Language', lang), lang)),
    add(br, 'briefing/textFa', control('Persian text (shown in place of the text when the room is set to Persian)', fa), fa),
  );
  return [hd, pt, br];
}
