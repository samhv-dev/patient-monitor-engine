// Debrief: the report of the run, read from the session's run record — the case, the objectives judged by their rules,
// the measured facts, trend charts drawn as inline SVG, drugs and fluids, the timeline (the discarded course of a
// return to a bookmark included, struck through as undone), bookmarks, the instructor's notes and a one-row-per-minute
// appendix. The browser PRINTS it to PDF (debrief.css: A4 portrait, the app's chrome hidden, no colour needed to read
// it; the footer and the build on every page); no PDF library. "Download the record (JSON)" saves the same data. Opened
// from the session bar; when a scenario reaches a state with no way out, a toast says the debrief is ready.
import './debrief.css';
import { drugName } from '../glossary.ts';
import type { Link } from '../link.ts';
import { axisRange, debriefJson, drugTotals, endOf, facts, mmss, objectives, perMinute, span, trendMeta } from '../debrief.ts';
import { LAB_KEYS, TREND_KEYS, type Row, type RunData, type TrendKey } from '../record.ts';
import { cardOf } from '../scenarios.ts';
import type { AppSession } from '../session.ts';
import { version } from '@pme/renderer';
import type { View } from '../shell.ts';
import { button, download, h, toast } from '../ui.ts';

/** The build this page was served from (vite.config.ts `define`: the git commit, "+" with uncommitted changes, the date). */
declare const __PME_BUILD__: string;
const BUILD = typeof __PME_BUILD__ === 'string' ? __PME_BUILD__ : 'development';
const FOOT = `For education only. Not a medical device and not clinically validated: never use it for patient care. Version ${version}${version.includes('-') ? ' (pre-release)' : ''}, build ${BUILD}.`;

/** The talking points (PEARLS phases, E46: fixed, non-clinical text the owner confirms; never interpolated). */
const PEARLS: ReadonlyArray<readonly [string, string]> = [
  ['Reactions', 'How did that feel? What stands out for you?'],
  ['Description', 'In a sentence or two: what was the problem, and when did you know?'],
  ['Analysis', 'Take one key moment: what did you see, what did you think, what did you do?'],
  ['Summary', 'One thing to keep doing, one thing to do differently next time.'],
];
const KIND: Readonly<Record<Row['kind'], string>> = { action: 'Action', remote: 'Remote', scenario: 'Scenario', alarm: 'Alarm', bookmark: 'Bookmark', restore: 'Return', patient: 'Patient', note: 'Note' };
/** The verdict words (E42–E44): the mark (`data-mark`), its words with a glyph, and the reason printed under it. A
 *  rule-less objective the instructor ticked reads Observed, with the tick's time as its reason. */
function markOf(o: ReturnType<typeof objectives>[number]): { mark: 'observed' | 'not-observed' | 'not-assessable' | 'discuss'; words: string; why: string } {
  const v = o.verdict;
  if (v.status === 'met') return { mark: 'observed', words: '✓ Observed', why: v.why };
  if (v.status === 'not met') return o.discuss ? { mark: 'discuss', words: '◆ Discuss', why: v.why } : { mark: 'not-observed', words: '✗ Not observed', why: v.why };
  if (v.tickedT !== undefined) return { mark: 'observed', words: '✓ Observed', why: `Observed by the instructor at ${mmss(v.tickedT)}.` };
  return { mark: 'not-assessable', words: '– Not assessable', why: v.why };
}
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const undoneText = (r: Row): string => (r.undone ? ` — undone by return ${r.undone}` : '');
/** A set-up row of the timeline (speed, alarms on, airway and ventilator settings): given or scripted, with no run
 *  event, and not the scenario's load. Printed grey, its words unchanged (class `db-setup`: the app's own `.setup` is
 *  the Start screen's card). */
const setup = (r: Row): boolean => (r.kind === 'action' || r.kind === 'remote' || r.kind === 'scenario') && !r.ev && !r.text.startsWith('Scenario loaded: ');

type Who = 'team' | 'patient' | 'scenario';
/** The event marks on the trend charts, from the kept rows: the pulse loss and return are the patient's; a drug, fluid,
 *  shock or CPR given from the panel or a remote is the team's; every other state after the run's first is the
 *  scenario's. (The redesign's B replaces them with the numbered key moments.) */
export function chartMarks(d: RunData): Array<{ t: number; who: Who }> {
  const rows = d.rows.filter((r) => r.undone === undefined);
  const firstState = rows.find((r) => r.ev?.startsWith('state:'));
  return rows.flatMap((r): Array<{ t: number; who: Who }> => {
    const ev = r.ev ?? '';
    if (ev === 'pulseLoss' || ev === 'rosc') return [{ t: r.t, who: 'patient' }];
    if ((r.kind === 'action' || r.kind === 'remote') && (ev.startsWith('drug:') || ['fluid', 'shock', 'cpr'].includes(ev))) return [{ t: r.t, who: 'team' }];
    if (ev.startsWith('state:') && r !== firstState) return [{ t: r.t, who: 'scenario' }];
    return [];
  });
}
/** A mark on a chart: a thin dashed line with a shape on top, ■ team (blue), ● patient (vermillion), │ scenario (grey). */
const MARK_SVG: Readonly<Record<Who, (x: number, top: number) => string>> = {
  team: (x, top) => `<rect x="${(x - 3.5).toFixed(1)}" y="${top - 1}" width="7" height="7" fill="#0072B2"/>`,
  patient: (x, top) => `<circle cx="${x.toFixed(1)}" cy="${top + 2.5}" r="3.8" fill="#D55E00"/>`,
  scenario: () => '',
};
const MARK_INK: Readonly<Record<Who, string>> = { team: '#0072B2', patient: '#D55E00', scenario: '#777' };

/** One trend as inline SVG over the kept course: a black line with gaps where nothing was measured, the first and
 *  last value of the axis, minutes on the time axis, a dashed line at each return to a bookmark, and the event marks. */
function chart(d: RunData, k: TrendKey, end: number, marks: ReadonlyArray<{ t: number; who: Who }> = []): HTMLElement {
  const m = trendMeta(k);
  const fig = h('figure', { class: 'db-chart', 'data-trend': k }, h('figcaption', {}, m.label, m.unit ? h('span', { class: 'unit' }, m.unit) : null));
  const pts = d.samples.filter((s) => s[k] !== null);
  if (!pts.length) return fig.appendChild(h('p', { class: 'muted' }, 'Not measured during the run.')), fig;
  const vals = pts.map((s) => s[k] as number);
  const [lo, hi] = axisRange(k, Math.min(...vals), Math.max(...vals)); // DV-2: a least span per trend
  const W = 640, H = 130, L = 44, R = 10, T = 8, B = 20;
  const x = (t: number) => L + (t / Math.max(end, 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  let path = '';
  let prev: number | null = null;
  for (const s of d.samples) {
    const v = s[k];
    if (v === null) {
      prev = null;
      continue;
    }
    path += `${prev === null || s.t - prev > 5 ? 'M' : 'L'}${x(s.t).toFixed(1)} ${y(v).toFixed(1)}`;
    prev = s.t;
  }
  const step = [60, 120, 300, 600, 900, 1800, 3600].find((st) => end / st <= 8) ?? 3600;
  let ticks = '';
  for (let t = 0; t <= end; t += step) ticks += `<line x1="${x(t)}" x2="${x(t)}" y1="${H - B}" y2="${H - B + 4}"/><text x="${x(t)}" y="${H - 4}" text-anchor="middle">${mmss(t)}</text>`;
  const returns = d.rows.filter((r) => r.kind === 'restore' && r.undone === undefined)
    .map((r) => `<line class="ret" x1="${x(r.t)}" x2="${x(r.t)}" y1="${T}" y2="${H - B}"/><text x="${x(r.t) + 3}" y="${T + 9}">↺</text>`).join('');
  const mks = marks.map((mk) => `<g class="db-mk" data-who="${mk.who}"><line x1="${x(mk.t).toFixed(1)}" x2="${x(mk.t).toFixed(1)}" y1="${T}" y2="${H - B}" stroke="${MARK_INK[mk.who]}" stroke-width="1" stroke-dasharray="3 2" vector-effect="non-scaling-stroke"/>${MARK_SVG[mk.who](x(mk.t), T)}</g>`).join('');
  const f = (v: number) => v.toFixed(m.digits);
  const min = pts.reduce((b, s) => ((s[k] as number) < (b[k] as number) ? s : b));
  const max = pts.reduce((b, s) => ((s[k] as number) > (b[k] as number) ? s : b));
  const label = `${m.label}, ${mmss(0)} to ${mmss(end)}: lowest ${f(min[k] as number)} at ${mmss(min.t)}, highest ${f(max[k] as number)} at ${mmss(max.t)} ${m.unit}`;
  const svg = h('div', { class: 'db-svg' });
  svg.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" preserveAspectRatio="none">
<line class="axis" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/><line class="axis" x1="${L}" x2="${L}" y1="${T}" y2="${H - B}"/>
<line class="grid" x1="${L}" x2="${W - R}" y1="${T}" y2="${T}"/>
<text x="${L - 4}" y="${T + 4}" text-anchor="end">${f(hi)}</text><text x="${L - 4}" y="${H - B}" text-anchor="end">${f(lo)}</text>
<g class="ticks">${ticks}</g>${mks}${returns}<path d="${path}"/></svg>`;
  fig.append(svg);
  return fig;
}

const section = (id: string, title: string, ...kids: Array<Node | null>): HTMLElement =>
  h('section', { class: 'db-sec', id: `db-${id}`, 'aria-labelledby': `db-${id}-h` }, h('h2', { id: `db-${id}-h` }, title), ...kids);
/** The footer line printed before each forced page break where the browser has no @page margin boxes (WebKit). */
const runFoot = (): HTMLElement => h('p', { class: 'db-runfoot', 'aria-hidden': 'true' }, FOOT);
/** The page footer where the browser prints @page margin boxes (Chromium): the footer and the build left, page n of N
 *  right, on every page. A <style> because the build is known only at run time. */
const PAGE_CSS = `@page { @bottom-left { content: "${FOOT}"; font: 7pt sans-serif; color: #000; vertical-align: top; padding-top: 2mm; border-top: 0.5pt solid #000; }
@bottom-right { content: "Page " counter(page) " of " counter(pages); font: 7pt sans-serif; color: #000; vertical-align: top; padding-top: 2mm; border-top: 0.5pt solid #000; } }`;

/** Q1: the appendix table — the six trends and the five labs, the first sample of each minute. */
function minutes(d: RunData): HTMLElement {
  const keys = [...TREND_KEYS, ...LAB_KEYS];
  const head = keys.map((k) => {
    const m = trendMeta(k);
    return h('th', { scope: 'col' }, m.label, m.unit ? h('span', { class: 'unit' }, m.unit) : null);
  });
  return h('div', { class: 'db-scroll' }, h('table', { class: 'db-table db-minutes' },
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Time'), ...head)),
    h('tbody', {}, ...perMinute(d).map((r) => h('tr', {}, h('td', { class: 'num' }, mmss(r.t)),
      ...keys.map((k) => h('td', { class: 'num' }, r.values[k] === null ? '–' : (r.values[k] as number).toFixed(trendMeta(k).digits))))))));
}

export function debriefView(session: AppSession, link: Link): View {
  const who = h('input', { class: 'input', id: 'db-who', autocomplete: 'off', placeholder: 'Instructor and learners' });
  const notes = h('div', { class: 'db-notes', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-labelledby': 'db-notes-h' });
  // Decision 11: render() rebuilds only the two live containers; the Run by field, the talking points and the notes
  // between them are created once here and never re-created or re-appended, so typing in them is never interrupted
  const live1 = h('div', { id: 'db-live-1' });
  const live2 = h('div', { id: 'db-live-2' });
  const pearls = section('pearls', 'Talking points', h('div', { class: 'db-pearls' },
    ...PEARLS.map(([phase, prompt]) => h('div', { class: 'db-pearl' }, h('b', {}, phase), h('p', {}, prompt)))));
  const runBy = (): void => {
    const s = live1.querySelector('.db-runby');
    if (s) s.textContent = who.value;
  };
  who.addEventListener('input', runBy);
  let started = -1;
  let lastSeen = 0; // the rows and samples of the run this view last drew
  const render = () => {
    const d = session.record.data;
    if (d.startedAt !== started) {
      // a new run: its notes start empty (the record of the last run is gone with it) — unless the run the view last
      // drew was still empty: the record's own restart at load (FX-20) is not a new run for the notes typed meanwhile
      started = d.startedAt;
      if (lastSeen > 0) notes.replaceChildren();
    }
    lastSeen = d.rows.length + d.samples.length;
    const end = endOf(d);
    const card = d.doc ? cardOf(d.doc) : null;
    const wall = Math.max(0, (d.lastWall - d.startedAt) / 1000);
    // the header band: the kicker (the h1 keeps its accessible name "Debrief"), the case, one sub-line
    const band = h('header', { class: 'db-band' },
      h('h1', { id: 'db-h' }, 'Debrief', h('span', { 'aria-hidden': 'true' }, ' · Simulated case')),
      h('div', { class: 'db-title' }, card ? card.title : 'No scenario (free run)'),
      h('p', { class: 'db-sub' }, `${d.patient} · ${mmss(end)} simulated (${span(wall)} on the clock) · ${new Date(d.startedAt).toLocaleString()} · Run by: `,
        h('span', { class: 'db-runby' }, who.value)));
    const obj = objectives(d);
    const fs = facts(d);
    const meds = d.rows.filter((r) => r.ev?.startsWith('drug:') || r.ev === 'fluid');
    const totals = drugTotals(d);
    const marks = d.rows.filter((r) => r.kind === 'bookmark' || r.kind === 'restore');
    const cm = chartMarks(d);
    live1.replaceChildren(
      band,
      section('objectives', 'Objectives', obj.length
        ? h('ol', { class: 'db-obj' }, ...obj.map((o) => {
          const m = markOf(o);
          return h('li', { 'data-status': o.verdict.status, 'data-mark': m.mark }, h('b', { class: 'db-mark db-chip' }, m.words), ' ', o.text, h('div', { class: 'db-why' }, m.why));
        }))
        : h('p', { class: 'muted' }, 'This run has no objectives.')),
      section('facts', 'Measured facts', fs.length
        ? h('dl', { class: 'db-facts' }, ...fs.flatMap((x) => [h('dt', {}, x.label), h('dd', {}, x.value)]))
        : h('p', { class: 'muted' }, 'Nothing was measured yet.')),
    );
    live2.replaceChildren(
      runFoot(),
      section('trends', 'Trends',
        h('p', { class: 'db-legend' }, h('span', { class: 'db-team' }, '■'), ' team action · ', h('span', { class: 'db-patient' }, '●'), ' patient event · ', h('span', { class: 'db-scen' }, '│'), ' scenario state'),
        h('div', { class: 'db-charts' }, ...TREND_KEYS.map((k) => chart(d, k, end, cm)))),
      section('drugs', 'Drugs and fluids', meds.length
        ? h('table', { class: 'db-table' }, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Time'), h('th', { scope: 'col' }, 'Given'))),
          h('tbody', {}, ...meds.map((r) => h('tr', r.undone ? { class: 'undone' } : {}, h('td', { class: 'num' }, mmss(r.t)), h('td', {}, r.text + undoneText(r))))))
        : h('p', { class: 'muted' }, 'No drugs or fluids were given.'),
        totals.length ? h('ul', { class: 'db-totals' }, ...totals.map((x) => h('li', {}, `${drugName(x.drugId)}: ${x.total} in ${x.n} ${x.n === 1 ? 'bolus' : 'boluses'}`))) : null),
      section('timeline', 'Timeline', h('table', { class: 'db-table db-timeline' },
        h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Time'), h('th', { scope: 'col' }, 'Kind'), h('th', { scope: 'col' }, 'Event'))),
        h('tbody', {}, ...d.rows.map((r) => h('tr', { 'data-kind': r.kind, ...(r.undone ? { class: 'undone' } : setup(r) ? { class: 'db-setup' } : {}) },
          h('td', { class: 'num' }, mmss(r.t)), h('td', {}, KIND[r.kind]), h('td', {}, r.text + undoneText(r))))))),
      section('bookmarks', 'Bookmarks', marks.length
        ? h('ul', {}, ...marks.map((r) => h('li', r.undone ? { class: 'undone' } : {}, `${mmss(r.t)} ${r.text}${undoneText(r)}`)))
        : h('p', { class: 'muted' }, 'No bookmarks.')),
      runFoot(),
      section('minutes', 'Appendix: one row per minute', minutes(d)),
    );
  };

  const el = h('section', { class: 'debrief', 'aria-labelledby': 'db-h' },
    h('div', { class: 'page wide' },
      h('div', { class: 'db-tools' }, button('Print or save as PDF', () => window.print(), 'primary'),
        button('Download the record (JSON)', () => {
          const d = session.record.data;
          download(`debrief-${d.doc?.id ?? 'free-run'}-${new Date(d.startedAt).toISOString().slice(0, 10)}.json`, debriefJson(d, BUILD), 'application/json');
        }, 'ghost'),
        h('span', { class: 'hint' }, 'Choose "Save as PDF" as the printer. The report reads the run so far; it refreshes while open. The JSON holds the record, not the "Run by" line or the notes.')),
      live1,
      h('div', { class: 'field db-who' }, h('label', { for: 'db-who' }, 'Run by'), who),
      pearls,
      section('notes', 'Notes', notes),
      live2,
      h('footer', { class: 'db-foot db-runfoot' }, FOOT)));
  // WebKit (Safari) prints no @page margin boxes: there the footer lines before each page break stand in
  el.classList.toggle('db-nomargin', typeof (window as { CSSMarginRule?: unknown }).CSSMarginRule !== 'function');
  const pageStyle = h('style', { id: 'db-page-style' }, PAGE_CSS);

  // the end of a run: a state with no way out (the toast once per state reached)
  let ended = '';
  link.onChange(() => {
    const sv = link.ctl.scenario;
    const key = `${sv.docVersion}:${sv.stateId}`;
    if (!sv.doc || key === ended || sv.current()?.transitions?.length) return;
    ended = key;
    toast('The scenario has ended: the debrief is ready (Debrief, in the session bar)');
  });

  let iv: ReturnType<typeof setInterval> | null = null;
  return {
    id: 'debrief', el, bench: true,
    enter: () => {
      document.head.append(pageStyle);
      render();
      iv ??= setInterval(render, 5000);
      // the print file's name (Save as PDF): the shell sets the title after enter()
      queueMicrotask(() => (document.title = `Debrief ${session.record.data.doc ? cardOf(session.record.data.doc).title : 'free run'} ${new Date(session.record.data.startedAt).toISOString().slice(0, 10)}`));
    },
    leave: () => {
      pageStyle.remove();
      if (iv) clearInterval(iv);
      iv = null;
    },
  };
}
