// Explore physiology (research/13 §4.5; R56): the Stage 7x console's data, re-presented for residents in the light
// bench theme. Every row is labelled from the glossary (label, tooltip with the full name, unit and adult normal) and
// grouped by organ; a change from the baseline is marked with an arrow and a tint, not colour alone. Values the
// glossary does not name are model internals: collapsed, with their engine keys, for the curious. The respiratory
// mechanics section is the slot the mechanics stage fills; labs beyond the blood gas are placeholders until v1.1.
import type { EngineEvent } from '@pme/engine-core';
import { ConsoleModel, type Row } from '../../physiology-console/model.ts';
import { fmtDelta, fmtValue } from '../../physiology-console/format.ts';
import type { GroupId } from '../../physiology-console/organs.ts';
import { DISPLAY_SCALE, entry, labelOf, lookup, rowKey, shortLabel, unitOf } from '../glossary.ts';
import { hrefOf } from '../router.ts';
import type { AppSession } from '../session.ts';
import type { SiteProfile } from '../site.ts';
import { button, clock, h, setText, throttle, tip, toggle } from '../ui.ts';
import type { View } from '../shell.ts';

interface Section {
  id: string;
  title: string;
  groups: GroupId[];
  intro: string;
  /** Glossary sections whose rows belong here even if the console files them elsewhere. */
  gloss?: string[];
  placeholder?: string;
}

export const SECTIONS: readonly Section[] = [
  { id: 'overview', title: 'At the bedside', groups: ['monitor'], intro: 'What the monitor shows, with the adult normal range beside each value.' },
  { id: 'haemodynamics', title: 'Heart and circulation', groups: ['circulation'], intro: 'Pressures, flows and resistances behind the monitor numbers: cardiac output, stroke volume, SVR, filling pressures.' },
  { id: 'respiratory', title: 'Respiratory mechanics and volumes', groups: ['lungs'], gloss: ['5.6'], intro: 'Airway pressures, compliance and resistance, dead space and lung volumes.',
    placeholder: 'Pressure–volume and flow–volume loops, driving and transpulmonary pressure and the full set of lung volumes arrive in a coming update. The values the model computes today are listed below.' },
  { id: 'gas', title: 'Gas exchange and oxygen delivery', groups: ['lungs'], gloss: ['5.4', '5.5'], intro: 'Shunt, oxygen content, delivery and consumption.' },
  { id: 'blood', title: 'Blood, acid–base and temperature', groups: ['blood'], intro: 'Blood gas, electrolytes, haemoglobin and temperature.' },
  { id: 'brain', title: 'Brain', groups: ['brain'], intro: 'Intracranial pressure, cerebral perfusion and oxygenation.' },
  { id: 'kidney', title: 'Kidney', groups: ['kidney'], intro: 'Renal blood flow, filtration and urine output.' },
  { id: 'liver', title: 'Liver and metabolism', groups: ['liver'], intro: 'Hepatic blood flow, clearance and lactate.' },
  { id: 'endocrine', title: 'Endocrine', groups: ['endocrine'], intro: 'Glucose, stress hormones and thermoregulation.' },
  { id: 'neuro', title: 'Anaesthetic depth and neuromuscular block', groups: ['neuro'], intro: 'Depth index, MAC, train-of-four and drive depression.' },
  { id: 'drugs', title: 'Drugs', groups: ['drugs'], intro: 'Plasma and effect-site concentrations of the drugs given.' },
  { id: 'labs', title: 'Labs', groups: ['blood'], gloss: ['5.7'], intro: 'The arterial blood gas the model computes today.',
    placeholder: 'Full blood count, chemistry, coagulation and TEG/ROTEM panels are coming in version 1.1.' },
];

const displayOf = (r: Row): { value: string; unit: string; delta: string } => {
  const l = lookup(r.path);
  const scale = DISPLAY_SCALE[r.path] ?? r.meta.scale;
  const m = { digits: r.meta.digits, scale } as { digits?: number; scale: number };
  const ref = typeof r.base === 'number' ? r.base : typeof r.value === 'number' ? r.value : 0;
  return { value: fmtValue(r.value, m), unit: l ? unitOf(l.e) : r.meta.unit, delta: r.delta === null ? '' : fmtDelta(r.delta, m, ref) };
};

export function exploreView(session: AppSession, site: SiteProfile): View {
  const model = new ConsoleModel();
  let cur = 'overview';
  let visible = false;
  let changedOnly = false;
  session.onEvent((e: EngineEvent) => {
    if (model.ingest(e) && visible) draw();
  });
  session.onMount(() => model.clear());

  const nav = h('nav', { class: 'xnav', 'aria-label': 'Body systems' }, ...SECTIONS.map((s) => h('a', { href: hrefOf('explore', s.id), 'data-id': s.id }, s.title)));
  const title = h('h1', { id: 'x-h' });
  const intro = h('p', { class: 'lede' });
  const place = h('div', { class: 'placeholder', hidden: true });
  const vitals = h('div', { class: 'vitals', 'aria-label': 'Vital signs' });
  const stamp = h('p', { class: 'hint num' });
  const body = h('tbody', {});
  const table = h('table', { class: 'values' },
    h('caption', { class: 'sr-only' }, 'Values'),
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Value'), h('th', { scope: 'col', class: 'v' }, 'Now'), h('th', { scope: 'col' }, 'Unit'), h('th', { scope: 'col' }, 'Adult normal'), h('th', { scope: 'col', class: 'd' }, 'Change'))),
    body);
  const internals = h('details', { class: 'internals' }, h('summary', {}, 'Model internals'), h('div', { class: 'internals-body' }));
  const tools = h('div', { class: 'row' },
    button('Set the baseline now', () => ((model.setBaseline()), draw()), 'small'),
    toggle('Changed only', false, (on) => ((changedOnly = on), draw()), 'small'));

  const draw = throttle(() => {
    const s = SECTIONS.find((x) => x.id === cur) ?? (SECTIONS[0] as Section);
    setText(title, s.title);
    setText(intro, s.intro);
    place.hidden = !s.placeholder;
    setText(place, s.placeholder ?? '');
    for (const a of nav.querySelectorAll('a')) a.setAttribute('aria-current', String(a.dataset.id === s.id));
    setText(stamp, model.baseT === null ? `Sim time ${clock(model.t)}. The baseline is set at 1 minute.` : `Sim time ${clock(model.t)}. Changes are from the baseline at ${clock(model.baseT)}.`);
    if (model.baseT === null && model.t >= 60) model.setBaseline();
    const rows = model.rows().filter((r) => {
      const l = lookup(r.path);
      if (s.gloss) return !!l && s.gloss.includes(l.e.s);
      return s.groups.includes(r.group);
    });
    const clinical = rows.filter((r) => labelOf(r.path) !== null && !r.internal && typeof r.value !== 'object');
    // one row per quantity (review F1): the monitor and the truth copy of one value share a row key; two different
    // quantities never do, even when research/11 gives them similar labels
    const seen = new Set<string>();
    const once = (r: Row) => {
      const k = rowKey(r.path) ?? r.path;
      return !seen.has(k) && !!seen.add(k);
    };
    body.replaceChildren(...clinical.filter((r) => (!changedOnly || r.dir) && once(r)).map((r) => {
      const l = lookup(r.path);
      const d = displayOf(r);
      const e = l?.e;
      const label = labelOf(r.path) ?? '';
      return h('tr', r.dir ? { 'data-dir': r.dir } : {},
        h('th', { scope: 'row', class: 'l' }, h('span', { class: 'lbl' }, h('b', {}, label), e ? tip(e, label) : null)),
        h('td', { class: 'v num' }, d.value), h('td', { class: 'u' }, d.unit), h('td', { class: 'n' }, e?.normal && e.normal !== '—' ? e.normal : ''),
        h('td', { class: 'd num' }, r.dir ? d.delta : ''));
    }));
    if (!body.children.length) body.append(h('tr', {}, h('td', { colspan: 5, class: 'muted' }, model.t ? 'No values in this section yet.' : 'Waiting for the first values…')));
    const rest = rows.filter((r) => !clinical.includes(r));
    const ib = internals.querySelector('.internals-body') as HTMLElement;
    (internals.querySelector('summary') as HTMLElement).textContent = `Model internals (${rest.length} values without a clinical name)`;
    if (internals.open) ib.replaceChildren(h('table', { class: 'values dense' }, h('tbody', {}, ...rest.slice(0, 400).map((r) => h('tr', {}, h('td', { class: 'mono key' }, r.path), h('td', { class: 'v num' }, fmtValue(r.value, r.meta)), h('td', {}, r.meta.unit))))));
    // vitals strip (glossary labels; the site's gas unit)
    const v = (n: number, path: string, digits = 0, gasKpa = false) => {
      const raw = model.cur.get(path);
      const x = typeof raw === 'number' ? (gasKpa && site.gasUnit === 'kPa' ? raw / 7.50062 : raw) : null;
      const e = entry(n);
      return h('div', { class: 'vital' }, h('b', {}, shortLabel(e)), h('span', { class: 'num' }, x === null ? '--' : x.toFixed(gasKpa && site.gasUnit === 'kPa' ? 1 : digits)), h('span', { class: 'unit' }, gasKpa ? site.gasUnit : unitOf(e)));
    };
    vitals.replaceChildren(v(1, 'mon.hr'), v(7, 'mon.abpMean'), v(3, 'mon.spo2'), v(15, 'mon.etco2', 0, true), v(18, 'mon.rr'), v(19, 'mon.tempCore', 1));
  }, 500);
  internals.addEventListener('toggle', draw);

  const el = h('section', { 'aria-labelledby': 'x-h' }, h('div', { class: 'page wide' }, h('div', { class: 'xgrid' }, nav,
    h('div', { class: 'xmain' }, title, intro, vitals, place, h('div', { class: 'row between' }, stamp, tools), table, internals))));
  return {
    id: 'explore', el, bench: true,
    enter: (sub) => {
      visible = true;
      cur = SECTIONS.some((s) => s.id === sub) ? sub : 'overview';
      draw();
    },
    leave: () => (visible = false),
  };
}
