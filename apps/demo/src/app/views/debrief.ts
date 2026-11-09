// Debrief: the report of the run, read from the session's run record — the case, the objectives judged by their rules,
// the measured facts, trend charts drawn as inline SVG, drugs and fluids, the timeline (the discarded course of a
// return to a bookmark included, struck through as undone; a staged delivery on one line), the card's steps with
// their status (Instructor v2, IP8) — for a pme-scenario/2 run the action table with its grades, the outcomes, the
// violations (plan F7; a team act the instructor observes is a record action in the table: judged rows are retired,
// the owner's ruling of 5 November) —, bookmarks with a mark's kind and note and the instructor's notes (the printed
// one-row-per-minute appendix was deleted by the owner on 9 November; the JSON keeps `minutes`); page 1 reads the key
// times and the course strip (the instructor's marks on it at their times) with the swimlane under it (the owner, 9
// November), page 2 the objectives and the key moments with what the monitor showed (Debrief redesign B; a run with
// no key moment keeps its objectives on page 1), and a learner handout without verdicts prints on its own (E51). The browser PRINTS it to PDF (debrief.css: A4 portrait, the app's chrome hidden, no colour needed to read
// it; the footer and the build on every page); no PDF library. "Download the record (JSON)" saves the same data. Opened
// from the session bar; when a scenario reaches a state with no way out, a toast says the debrief is ready.
// The archive (board "Finish 2", archive.ts): a debrief "Finish the case" saved opens here (#/debrief/archive/<id>, and
// …/print prints it), with the resident's name in the header band and the handout's; the view lists the archive in its
// own section (screen only), exports it all as one JSON file and clears it behind a confirm.
// Persian (Debrief 2, D13): a switch beside the print buttons (per browser, English by default; i18n/lang.ts, also the
// Briefing's language) draws the two live containers, the talking points, the notes' heading, the handout and the
// footer through the one table and matcher the
// handout script uses (i18n/fa-dom.ts), right to left in the bundled Vazirmatn; while an entry printed is unread by the
// owner, "Persian draft: not yet read by the clinical owner" stands under the switch and on every printed page (DQ10).
import { asV1, type MarkKind } from '@pme/controller';
import { archive, hhmm, type ArchiveMeta } from '../archive.ts';
import './debrief.css';
import { drugName } from '../glossary.ts';
import type { Link } from '../link.ts';
import { axisRange, drugTotals, endOf, facts, learnerWho, mmss, objectives, PRESSURE_KEYS, report3, span, steps, trendMeta, type DebriefExport, type Pressure, type Report3, type Step, type StepStatus } from '../debrief.ts';
import { debriefJson } from '../debrief-export.ts';
import { handoutQuestionsAt, keyMoments, keyTimes, openersAt, recognitionAt, RECOGNISED, type KeyMoment, type KeyTime, type Who } from '../debrief-moments.ts';
import { TREND_KEYS, type PressureKey, type Row, type RunData, type TrendKey } from '../record.ts';
import { COURSE_W, courseSvg, tracePath, type CourseMark } from './debrief-course.ts';
import { GRADE_WORDS, swimlaneSvg, verdictMark, windowsOf } from './debrief-swimlane.ts';
import { MARKS } from '../teach2/dock.ts';
import { hrefOf } from '../router.ts';
import { cardOf } from '../scenarios.ts';
import type { AppSession } from '../session.ts';
import { version } from '@pme/renderer';
import type { View } from '../shell.ts';
import { button, confirmDialog, download, h, seg, toast } from '../ui.ts';
import TABLE from '../../../../../docs/showcase/i18n/fa-debrief.json';
import { DRAFT_LINE, faPass, translateTree, unreviewed, type FaPass } from '../i18n/fa-dom.ts';
import { LTR_RUN } from '../i18n/fa-match.mjs';
import { hostLang, setHostLang, type HostLang } from '../i18n/lang.ts';
import { archiveHref, archiveList, downloadEntry, entryTitle, exportAll } from './archive-list.ts';
import { readLayout } from '../room-layout.ts';
import { store } from '../store.ts';

/** The build this page was served from (vite.config.ts `define`: the git commit, "+" with uncommitted changes, the date). */
declare const __PME_BUILD__: string;
const BUILD = typeof __PME_BUILD__ === 'string' ? __PME_BUILD__ : 'development';
const FOOT = `For educational use only; Not to be used in patient care. Version ${version}${version.includes('-') ? ' (pre-release)' : ''}, build ${BUILD}.`;

/** The talking points (PEARLS phases, E46: fixed, non-clinical text the owner confirms; never interpolated). */
const PEARLS: ReadonlyArray<readonly [string, string]> = [
  ['Reactions', 'How did that feel? What stands out for you?'],
  ['Description', 'In a sentence or two: what was the problem, and when did you know?'],
  ['Analysis', 'Take one key moment: what did you see, what did you think, what did you do?'],
  ['Summary', 'One thing to keep doing, one thing to do differently next time.'],
];
const KIND: Readonly<Record<Row['kind'], string>> = { action: 'Action', remote: 'Remote', learner: 'Learner', scenario: 'Scenario', alarm: 'Alarm', bookmark: 'Bookmark', restore: 'Return', patient: 'Patient', note: 'Note' };
/** The verdict words (E42–E44): the mark (`data-mark`), its words with a glyph, and the reason printed under it. A
 *  rule-less objective the instructor ticked reads Observed, with the tick's time as its reason. */
function markOf(o: ReturnType<typeof objectives>[number]): { mark: 'observed' | 'not-observed' | 'not-assessable' | 'discuss'; words: string; why: string } {
  const v = o.verdict;
  if (v.status === 'not assessable' && v.tickedT !== undefined) return { mark: 'observed', words: '✓ Observed', why: `Observed by the instructor at ${mmss(v.tickedT)}.` };
  return { ...verdictMark(v.status, o.discuss), why: v.why };
}
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const undoneText = (r: Row): string => (r.undone ? ` — undone by return ${r.undone}` : '');
/** A set-up row of the timeline (speed, alarms on, airway and ventilator settings): given or scripted, with no run
 *  event, and not the scenario's load. Printed grey, its words unchanged (class `db-setup`: the app's own `.setup` is
 *  the Start screen's card). */
const setup = (r: Row): boolean => (r.kind === 'action' || r.kind === 'remote' || r.kind === 'scenario') && !r.ev && !r.text.startsWith('Scenario loaded: ');

/** The steps table's status words (`StepStatus`), each with a glyph so no colour is needed to read it. */
const STEP_WORDS: Readonly<Record<StepStatus, string>> = { taken: '✓ taken', 'out of order': '✓ out of order', failed: '✗ failed', overdue: '! overdue', 'not done': '– not done' };
const MARK_WORDS: Readonly<Record<Exclude<MarkKind, 'stage'>, string>> = { good: 'good', bad: 'bad', discuss: 'discuss' };
/** The card's steps taken, and those not taken that an objective asks for (debrief.ts `steps`; an alternative not
 *  chosen is not listed), one row each, in the card's order within each stage entered: the stage and its first entry on
 *  the stage's first row, the order due, the button's words, when it was taken (and its place among the stage's taken
 *  steps), and its status. */
function stepsTable(ss: Step[], d: RunData): HTMLElement {
  const label = (id: string) => asV1(d.doc)?.states.find((s) => s.id === id)?.label ?? id;
  return h('table', { class: 'db-table db-steps' },
    h('thead', {}, h('tr', {}, ...['Stage', 'n', 'Step', 'Taken (order)', 'Status'].map((c) => h('th', { scope: 'col' }, c)))),
    h('tbody', {}, ...ss.map((x, i) => h('tr', { 'data-status': x.status, ...(ss[i - 1]?.stateId !== x.stateId ? { class: 'db-stage' } : {}) },
      h('td', {}, ss[i - 1]?.stateId === x.stateId ? '' : `${label(x.stateId)} · ${mmss(x.dueT)}`),
      h('td', { class: 'num' }, String(x.n)), h('td', {}, x.label),
      h('td', { class: 'num' }, x.takenT === null ? '–' : `${mmss(x.takenT)} (${x.order})`),
      h('td', {}, STEP_WORDS[x.status], x.ruleT !== undefined ? ` (its rule, ${mmss(x.ruleT)})` : '')))));
}
const at = (t: number | null): string => (t === null ? '–' : mmss(t));
/** A /2 run's action table (plan F7): each graded action in the card's order with its first administration's grade,
 *  when it was due (the window's opening and length) and given, the criteria it was off on lines under it, then its
 *  repeats, each with its own grade. */
function actionsTable(r: Report3): HTMLElement {
  return h('table', { class: 'db-table db-actions' },
    h('thead', {}, h('tr', {}, ...['Action', 'Due', 'Given', 'Grade'].map((c) => h('th', { scope: 'col' }, c)))),
    h('tbody', {}, ...r.actions.flatMap((a) => [
      // the row: the first administration's own grade; each repeat's grade on its own row (F11: the worst read "overdue")
      h('tr', { 'data-grade': a.firstGrade, class: 'db-act' },
        h('td', {}, a.label, ...a.lines.map((l) => h('div', { class: 'db-why' }, l))),
        h('td', { class: 'num' }, a.dueT === null ? '–' : `${mmss(a.dueT)}${a.windowS !== null ? ` + ${span(a.windowS)}` : ''}`),
        h('td', { class: 'num' }, at(a.givenT)), h('td', {}, GRADE_WORDS[a.firstGrade])),
      ...a.repeats.map((x) => h('tr', { 'data-grade': x.grade, class: 'db-repeat' },
        h('td', {}, `repeat ${x.n}`, ...x.lines.map((l) => h('div', { class: 'db-why' }, l))), h('td', {}), h('td', { class: 'num' }, at(x.t)), h('td', {}, GRADE_WORDS[x.grade]))),
    ])));
}

/** The name Room setup keeps for a device key on this computer (R7's remembered layout; R5d's who line). */
const deviceName = (key: string): string | null => readLayout(store)[key]?.name ?? null;
/** The timeline's rows, a staged delivery's items on one line (each item keeps its own row in the record); a learner
 *  defibrillator press reads its who line (R5d). */
function timelineRows(d: RunData): HTMLElement[] {
  const line = (r: Row, text: string | string[], isSetup: boolean) => h('tr', { 'data-kind': r.kind, ...(r.undone ? { class: 'undone' } : isSetup ? { class: 'db-setup' } : {}) },
    h('td', { class: 'num' }, mmss(r.t)), h('td', {}, KIND[r.kind]), h('td', {}, ...[text].flat(), undoneText(r))); // separate texts: the Persian page reads each (D13)
  const done = new Set<string>();
  return d.rows.flatMap((r) => {
    const b = r.batch?.id;
    if (r.kind === 'learner') return [line(r, learnerWho(d.rows, r, deviceName), false)];
    if (b === undefined) return [line(r, r.text, setup(r))];
    if (done.has(b)) return [];
    done.add(b);
    const items = d.rows.filter((x) => x.batch?.id === b);
    return [line(r, ['Delivered together: ', ...items.flatMap((x, i) => (i ? ['; ', x.text] : [x.text]))], items.every(setup))];
  });
}
/** A bookmark's line: its time and words, a mark's kind and note, and its undoing. */
const markLine = (r: Row): string => `${mmss(r.t)} ${r.text}${r.markKind ? ` · ${MARK_WORDS[r.markKind]}` : ''}${r.note ? `: “${r.note}”` : ''}${undoneText(r)}`;

/** The marks' numbers: every bookmark row in time order (record order within a second), 1…n; the course strip draws
 *  each number inside its mark and the Bookmarks list prints the same. */
const markNumbers = (d: RunData): Map<Row, number> =>
  new Map(d.rows.filter((r) => r.kind === 'bookmark').map((r, i) => [r, i] as const).sort((a, b) => a[0].t - b[0].t || a[1] - b[1]).map(([r], i) => [r, i + 1]));
/** A bookmark's line in the list and its title on the course strip: its number, then its words. */
const numberedLine = (r: Row, n: number): string => `${n} · ${markLine(r)}`;
/** The course strip's marks (debrief-course.ts): every bookmark row, the dock's icon for its kind (a ribbon for a plain
 *  bookmark, the session bar's and the Log's), its number, the Bookmarks list's words as its title; an undone one is
 *  drawn struck. */
const MARK_ICON: Readonly<Record<string, string>> = { ...Object.fromEntries(MARKS.map(([k, , d]) => [k, d])), bookmark: 'M6 3h12v18l-6-5-6 5z' };
const courseMarks = (nums: Map<Row, number>): CourseMark[] => [...nums].map(([r, n]) => {
  const kind = r.markKind ?? 'bookmark';
  return { t: r.t, n, kind, title: numberedLine(r, n), undone: r.undone !== undefined, icon: MARK_ICON[kind] as string };
});
/** The marks' part of the course's legend (only when the run has marks): each kind drawn, its icon and its word. */
const markKeys = (cm: CourseMark[]): Array<Node | string> => {
  const kinds = ['good', 'bad', 'discuss', 'bookmark'].filter((k) => cm.some((m) => m.kind === k));
  return kinds.length ? [' · marks:', ...kinds.map((k) => {
    const s = h('span', { class: 'db-bm-key', 'data-kind': k });
    s.innerHTML = ` <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="${MARK_ICON[k]}"/></svg>${k}`;
    return s;
  })] : [];
};

/** A mark on a chart, one per key moment: a thin dashed line with a shape on top, ■ team (blue), ● patient (vermillion),
 *  │ scenario (grey), and the moment's number (the numbers of Key moments and the course strip). */
const MARK_SVG: Readonly<Record<Who, (x: number, top: number) => string>> = {
  team: (x, top) => `<rect x="${(x - 3.5).toFixed(1)}" y="${top - 1}" width="7" height="7" fill="#0072B2"/>`,
  patient: (x, top) => `<circle cx="${x.toFixed(1)}" cy="${top + 2.5}" r="3.8" fill="#D55E00"/>`,
  scenario: () => '',
};
const MARK_INK: Readonly<Record<Who, string>> = { team: '#0072B2', patient: '#D55E00', scenario: '#777' };

/** A chart's caption takes its direction from its own first letter (P-S5): a trend's label and unit are Latin
 *  throughout, so in the Persian page they read left to right ("HR bpm", not "bpmHR" laid right to left); the Pressures
 *  caption, which the table puts into Persian, stays right to left. The unit is its own isolated run (debrief.css). */
const CAPTION = { dir: 'auto' } as const;
/** One trend as inline SVG over the kept course: a black line with gaps where nothing was measured, the first and
 *  last value of the axis, minutes on the time axis, a dashed line at each return to a bookmark, and the numbered key
 *  moments. */
function chart(d: RunData, k: TrendKey, end: number, marks: ReadonlyArray<{ t: number; who: Who; n: number }> = []): HTMLElement {
  const m = trendMeta(k);
  const fig = h('figure', { class: 'db-chart', 'data-trend': k }, h('figcaption', CAPTION, m.label, m.unit ? h('span', { class: 'unit' }, m.unit) : null));
  const pts = d.samples.filter((s) => s[k] !== null);
  if (!pts.length) return fig.appendChild(h('p', { class: 'muted' }, 'Not measured during the run.')), fig;
  const vals = pts.map((s) => s[k] as number);
  const [lo, hi] = axisRange(k, Math.min(...vals), Math.max(...vals)); // DV-2: a least span per trend
  const { W, H, L, R, T, B } = BOX;
  const x = (t: number) => L + (t / Math.max(end, 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const path = tracePath(d, k, x, y);
  const f = (v: number) => v.toFixed(m.digits);
  const min = pts.reduce((b, s) => ((s[k] as number) < (b[k] as number) ? s : b));
  const max = pts.reduce((b, s) => ((s[k] as number) > (b[k] as number) ? s : b));
  const label = `${m.label}, ${mmss(0)} to ${mmss(end)}: lowest ${f(min[k] as number)} at ${mmss(min.t)}, highest ${f(max[k] as number)} at ${mmss(max.t)} ${m.unit}`;
  fig.append(frame(d, end, marks, label, `<text x="${L - 4}" y="${T + 4}" text-anchor="end">${f(hi)}</text><text x="${L - 4}" y="${H - B}" text-anchor="end">${f(lo)}</text>`, `<path d="${path}"/>`));
  return fig;
}

/** A trend chart's frame (the axes, the top grid line, the minutes, the instructor's marks, a dashed line at each
 *  return to a bookmark) around its value labels and traces, in the chart's viewBox. */
function frame(d: RunData, end: number, marks: ReadonlyArray<{ t: number; who: Who; n: number }>, label: string, values: string, traces: string): HTMLElement {
  const { W, H, L, R, T, B } = BOX;
  const x = (t: number) => L + (t / Math.max(end, 1)) * (W - L - R);
  const step = [60, 120, 300, 600, 900, 1800, 3600].find((st) => end / st <= 8) ?? 3600;
  let ticks = '';
  for (let t = 0; t <= end; t += step) ticks += `<line x1="${x(t)}" x2="${x(t)}" y1="${H - B}" y2="${H - B + 4}"/><text x="${x(t)}" y="${H - 4}" text-anchor="middle">${mmss(t)}</text>`;
  const returns = d.rows.filter((r) => r.kind === 'restore' && r.undone === undefined)
    .map((r) => `<line class="ret" x1="${x(r.t)}" x2="${x(r.t)}" y1="${T}" y2="${H - B}"/><text x="${x(r.t) + 3}" y="${T + 9}">↺</text>`).join('');
  const mks = marks.map((mk) => `<g class="db-mk" data-who="${mk.who}"><line x1="${x(mk.t).toFixed(1)}" x2="${x(mk.t).toFixed(1)}" y1="${T}" y2="${H - B}" stroke="${MARK_INK[mk.who]}" stroke-width="1" stroke-dasharray="3 2" vector-effect="non-scaling-stroke"/>${MARK_SVG[mk.who](x(mk.t), T)}<text x="${(x(mk.t) + 5).toFixed(1)}" y="${T + 7}" class="db-mk-n">${mk.n}</text></g>`).join('');
  const svg = h('div', { class: 'db-svg' });
  svg.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" preserveAspectRatio="none">
<line class="axis" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/><line class="axis" x1="${L}" x2="${L}" y1="${T}" y2="${H - B}"/>
<line class="grid" x1="${L}" x2="${W - R}" y1="${T}" y2="${T}"/>
${values}<g class="ticks">${ticks}</g>${mks}${returns}${traces}</svg>`;
  return svg;
}
/** Every trend chart's viewBox and margins: the Pressures panel shares them, so its minutes line up with the others'. */
const BOX = { W: 640, H: 130, L: 44, R: 10, T: 8, B: 20 } as const;

/** A lone reading's mark: a dot of radius 1 around the point the path is at (two arcs; a bare `M` draws nothing). */
const DOT = 'm-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0';
/** One pressure's trace, as a trend's (broken where nothing was measured, or over more than 5 s between readings): a
 *  cuff reading, kept only in its cycle's second (D1), has no neighbour to join and is a dot; an arterial run is a
 *  line. The same rule as PR #294's (map-cuff-stale) shared `tracePath`, which takes the trends' keys only. */
function pressurePath(d: RunData, k: PressureKey, x: (t: number) => number, y: (v: number) => number): string {
  let path = '';
  let prev: number | null = null;
  let n = 0; // the readings in the subpath being drawn
  for (const s of d.samples) {
    const v = s[k];
    if (v === null || v === undefined) {
      prev = null;
      continue;
    }
    const move = prev === null || s.t - prev > 5;
    if (move && n === 1) path += DOT;
    n = move ? 1 : n + 1;
    path += `${move ? 'M' : 'L'}${x(s.t).toFixed(1)} ${y(v).toFixed(1)}`;
    prev = s.t;
  }
  return n === 1 ? path + DOT : path;
}

/** The pressures' panel among the trend charts (the owner's ruling of 6 November, question 2 = B), in their style:
 *  SBP and DBP as two lines on the left axis, CVP dashed on its own right-hand axis — a shared 0–200 mmHg axis would
 *  draw a CVP of 5–20 mmHg as a flat line. A record made before Debrief 2 (no 'pressures' in `keeps`) has no panel. */
function pressuresChart(d: RunData, end: number, marks: ReadonlyArray<{ t: number; who: Who; n: number }>): HTMLElement | null {
  if (!d.keeps?.includes('pressures')) return null;
  const fig = h('figure', { class: 'db-chart', 'data-trend': 'pressures' }, h('figcaption', CAPTION, 'Pressures', h('span', { class: 'unit' }, PRESSURES_UNIT)));
  const vals = (k: PressureKey) => d.samples.map((s) => s[k]).filter((v): v is number => typeof v === 'number');
  const [sys, dia, cvp] = PRESSURE_KEYS.map(vals) as [number[], number[], number[]];
  if (!sys.length && !dia.length && !cvp.length) return fig.appendChild(h('p', { class: 'muted' }, 'Not measured during the run.')), fig;
  const { W, H, L, R, T, B } = BOX;
  const x = (t: number) => L + (t / Math.max(end, 1)) * (W - L - R);
  const scale = ([lo, hi]: [number, number]) => (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const both = [...sys, ...dia];
  const left = both.length ? axisRange('sys', Math.min(...both), Math.max(...both)) : null;
  const right = cvp.length ? axisRange('cvp', Math.min(...cvp), Math.max(...cvp)) : null;
  const yl = left ? scale(left) : () => 0;
  const yr = right ? scale(right) : () => 0;
  const words = (name: string, v: number[]) => (v.length ? `${name} ${Math.min(...v)} to ${Math.max(...v)}` : `${name} not measured`);
  const label = `Pressures, ${mmss(0)} to ${mmss(end)}: ${words('SBP', sys)}, ${words('DBP', dia)}, ${words('CVP', cvp)} mmHg`;
  const f = (v: number) => v.toFixed(0);
  const values = (left ? `<text class="l" x="${L - 4}" y="${T + 4}" text-anchor="end">${f(left[1])}</text><text class="l" x="${L - 4}" y="${H - B}" text-anchor="end">${f(left[0])}</text>` : '')
    + (right ? `<line class="axis" x1="${W - R}" x2="${W - R}" y1="${T}" y2="${H - B}"/><text class="r" x="${W - R - 3}" y="${T + 9}" text-anchor="end">CVP ${f(right[1])}</text><text class="r" x="${W - R - 3}" y="${H - B - 3}" text-anchor="end">CVP ${f(right[0])}</text>` : '');
  const traces = `<path data-p="sys" d="${pressurePath(d, 'sys', x, yl)}"/><path data-p="dia" d="${pressurePath(d, 'dia', x, yl)}"/><path data-p="cvp" class="cvp" d="${right ? pressurePath(d, 'cvp', x, yr) : ''}"/>`;
  fig.append(frame(d, end, marks, label, values, traces));
  return fig;
}
/** The panel's unit and how to read its two axes (the one table the Persian handout reads holds these words too). */
const PRESSURES_UNIT = 'mmHg · SBP and DBP on the left axis, CVP (dashed) on the right';

const section = (id: string, title: string, ...kids: Array<Node | null>): HTMLElement =>
  h('section', { class: 'db-sec', id: `db-${id}`, 'aria-labelledby': `db-${id}-h` }, h('h2', { id: `db-${id}-h` }, title), ...kids);
/** The footer line printed before each forced page break where the browser has no @page margin boxes (WebKit). */
const runFoot = (): HTMLElement => h('p', { class: 'db-runfoot', 'aria-hidden': 'true' }, FOOT);
/** The page footer where the browser prints @page margin boxes (Chromium): the footer and the build left, page n of N
 *  right, on every page. A <style> because the build is known only at run time. */
const PAGE_CSS = `@page { @bottom-left { content: "${FOOT}"; font: 7pt 'Inter Print', sans-serif; color: #000; vertical-align: top; padding-top: 2mm; border-top: 0.5pt solid #000; }
@bottom-right { content: "Page " counter(page) " of " counter(pages); font: 7pt 'Inter Print', sans-serif; color: #000; vertical-align: top; padding-top: 2mm; border-top: 0.5pt solid #000; } }`;

/** The bundled print font (debrief.css @font-face): loaded on entering the view, and awaited before the print buttons
 *  print, so a print never lays out in a fallback font. A failed load still prints (in the system font). */
const loadPrintFont = (): Promise<unknown> => Promise.all([document.fonts?.load("1em 'Inter Print'"), hostLang() === 'fa' ? document.fonts?.load('1em Vazirmatn') : undefined]).catch(() => undefined);
const printWithFont = (): void => void loadPrintFont().then(() => window.print());

/** D13: the Persian page's @page boxes: the footer (the table's footer entry, as the foot line printed it) right,
 *  «صفحه‌ی n از N» left in Persian digits (the table's "Page {c} of {c}"), and, while an entry printed is unread by the
 *  owner, DQ10's line at the top of every page. Each Latin run (the version, the build) is one left-to-right run. */
function pageCssFa(foot: string, draft: boolean, p: FaPass): string {
  const page = (TABLE.templates as Array<{ en: string; fa: string | null; reviewed: boolean }>).find((e) => e.en === 'Page {c} of {c}');
  const [pa = '', pb = ''] = (page?.fa ?? 'صفحه‌ی {c} از {c}').split('{c}');
  if (page) p.used.add(page as never);
  const iso = (x: string) => x.replace(LTR_RUN, (m) => `\u2066${m.replace(/ /g, '\u00a0')}\u2069`);
  const css = (x: string) => `"${x.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  const box = "font: 7pt 'Vazirmatn', sans-serif; color: #000; vertical-align: top; padding-top: 2mm; border-top: 0.5pt solid #000;";
  return `@page { @bottom-right { content: ${css(iso(foot))}; ${box} direction: rtl; text-align: right; }
@bottom-left { content: ${css(pa)} counter(page, persian) ${css(pb)} counter(pages, persian); ${box} direction: rtl; white-space: nowrap; }${draft ? `
@top-center { content: ${css(DRAFT_LINE)}; font: 7pt 'Inter Print', sans-serif; color: #000; vertical-align: bottom; }` : ''} }`;
}

/** What a record made before Debrief 2 lacks, said once under a table (plan §3: a missing fact is "not recorded in this
 *  file", never a dash, which means "not measured"). */
const NOT_RECORDED = ' not recorded in this file.';
const notRecorded = (what: string): HTMLElement => h('p', { class: 'db-norecord' }, `${what}:${NOT_RECORDED}`);

/** The shapes of the moments: the report's course strip (`debrief-course.ts`) draws each as a down arrow, a scenario
 *  state's outlined; the learner's strip a square, a dot and an open square; a trend chart a square, a dot and a bare
 *  line for a scenario state (R-B N2). */
const SHAPES = { course: ['▼', '▼', '▽'], learner: ['■', '●', '□'], charts: ['■', '●', '│'] } as const;
/** The legend of the course strip and the trend charts: each accent with its shape and its words (E45), and on the
 *  course strip the marks drawn (`more`). */
const legend = (shapes: keyof typeof SHAPES, tail = '', more: Array<Node | string> = []): HTMLElement => {
  const [team, patient, scen] = SHAPES[shapes];
  return h('p', { class: 'db-legend' }, h('span', { class: 'db-team' }, team), ' team action · ', h('span', { class: 'db-patient' }, patient), ' patient event · ', h('span', { class: 'db-scen' }, scen), ` scenario state${tail}`, ...more);
};
/** The swimlane's legend line (D7b): each shape and what it is, the window band and its tick, the verdict glyphs. */
const swimLegend = (r3: boolean): HTMLElement => h('p', { class: 'db-legend' },
  h('span', { class: 'db-patient' }, '●'), ' patient event · ', h('span', { class: 'db-team' }, '■'), ' team action · ', h('span', { class: 'db-scen' }, '□'), ' scenario state · ',
  h('span', { class: 'db-team' }, '◇'), ' recognised · ▭ expected window, │ the act, with its verdict ',
  r3 ? '(✓ met · ◆ deviation · ! overdue · ✗ failed · … due)' : '(✓ Observed · ✗ Not observed · – Not assessable · ◆ Discuss)',
  ' · ▬ alarm, raised to ended, ○ acknowledged · ▲ drug or fluid · numbers match Key moments');
const WHO: Readonly<Record<Who, string>> = { team: 'Team', patient: 'Patient', scenario: 'Scenario' };
const whoCell = (w: Who): HTMLElement => h('td', { class: 'db-whocell' }, w === 'scenario' ? null : h('span', { class: `db-${w}` }, w === 'team' ? '■ ' : '● '), WHO[w]);
const TRENDS4: TrendKey[] = ['hr', 'map', 'spo2', 'etco2']; // E56: the same four for every case
/** The printed course strip: at most this tall (mm), at 80 % of the 182 mm content width or less. A strip whose squares
 *  would print it taller (the owner's big squares of 40–60 units on a 25-min run, with its marks) prints narrower, so
 *  its squares are smaller in print only and page 1 keeps to one A4 page (the owner, 2 November). */
const PRINT_MM = 52;
/** The strip's printed width (% of the content width) from its viewBox: its height is width × H / 728. */
const printWidth = (svg: string): string => {
  const h = Number(/viewBox="0 0 \d+ ([\d.]+)"/.exec(svg)?.[1] ?? 0);
  return Math.min(80, h > 0 ? (PRINT_MM * COURSE_W * 100) / (182 * h) : 80).toFixed(1);
};
/** The fixed sentence under the key moments when a row is pulseless (E60; the owner's list, item 11; reworded for E126). */
const SPO2_DASH = 'SpO₂ as the monitor showed it: – while pulseless without compressions (no pulsatile signal); a number during CPR reflects compression-generated flow and is unreliable.';
/** The learner handout's fixed text (E51; the owner's list, item 3: non-clinical, as drafted unless he changes it). */
const HANDOUT = {
  intro: 'This sheet is yours to keep. It shows what happened and when; it does not mark you. The conversation, not this page, is the debrief.',
  prompts: [
    'What did you notice first on the monitor, and when?',
    'Take one key moment: what were you thinking then, and what did you do?',
    'One thing you will keep doing, and one thing you will do differently.',
  ],
  next: 'Next time, run the case again from its start and compare your key moments.',
} as const;
/** Above this many key moments the handout's table prints compact (debrief.css `.db-long`), so the haemorrhage course's
 *  19 rows keep the handout on one A4 page; a longer table runs on to page 2 with its header repeated. */
const HANDOUT_ROWS = 12;
const kids = (...xs: Array<Node | null>): Node[] => xs.filter((x): x is Node => x !== null);
const ruled = (n: number): HTMLElement[] => Array.from({ length: n }, () => h('div', { class: 'db-ruled', 'aria-hidden': 'true' }));
/** The handout's "Questions to think about" (D16, Decision 14): the card's reviewed questions whose anchor happened on
 *  the kept course take the places of fixed prompts 1–2 (at most two, in the card's order), each labelled with its
 *  anchor's mm:ss; a place no question fills keeps its fixed prompt; fixed prompt 3 always closes the list. Three ruled
 *  lines under each, so the handout keeps its one-page shape. */
export function handoutQuestions(d: RunData): HTMLElement {
  const qs = handoutQuestionsAt(d).slice(0, 2);
  const fixed = HANDOUT.prompts.slice(qs.length).map((q) => h('li', {}, q, ...ruled(3)));
  return h('section', { class: 'db-hsec' }, h('h3', {}, 'Questions to think about'), h('ol', { class: 'db-qs' },
    ...qs.map((q) => h('li', { class: 'db-q-card' }, h('span', { class: 'db-q-at' }, mmss(q.t)), ' ', h('span', { class: 'db-q-text' }, q.text), ...ruled(3))),
    ...fixed));
}
/** The handout's take-home section: the card's `takeHome` lines as written (the owner's words), else blank lines to
 *  write on (Decision 6). */
export const takeHomeSection = (take: readonly string[] = []): HTMLElement =>
  h('section', { class: 'db-hsec' }, h('h3', {}, 'Take-home points'), take.length
    ? h('ol', { class: 'db-take' }, ...take.map((t) => h('li', {}, t)))
    : h('div', {}, h('p', { class: 'db-subhead' }, 'Your take-home points'), ...ruled(3)));

/** One key-time tile: its caption, the interval as a big value, and the times it runs between. A tile whose end is
 *  absent is not drawn, except the recognition tile, which reads "–" "not ticked" (E44), or on a /2 card its timed
 *  action's window and grade words (D5). */
function tile(k: KeyTime, moments: KeyMoment[]): HTMLElement | null {
  if (k.state === 'noneAfter') return null;
  const ticked = k.state !== 'notTicked';
  const taken = k.totalS ?? (k.toT !== null && k.fromT !== null ? k.toT - k.fromT : null);
  let sub = '';
  if (k.grade) sub = `${k.fromT === null ? '–' : mmss(k.fromT)} ${k.fromLabel ?? 'start'} → ${k.toT === null ? '–' : mmss(k.toT)}${k.askedS !== undefined ? ` · asked ≤ ${span(k.askedS)}` : ''} · ${GRADE_WORDS[k.grade]}`; // D5: a /2 card's timed action
  else if (!ticked) sub = 'not ticked';
  else if (k.id === 'pulseless') sub = `first lost ${mmss(k.fromT ?? 0)}`;
  else if (k.id === 'handsOff') sub = `compression fraction ${Math.round((k.fraction ?? 0) * 100)} %`;
  else if (k.id === 'recognition' && k.fromT !== null && k.toT !== null) sub = `${mmss(k.fromT)} ${k.fromLabel ?? 'start'} → ${mmss(k.toT)} ${k.label === RECOGNISED.press.tile ? 'pressed' : 'ticked'}`; // #18: from the early signs, not Load; D5: the /1 press
  else if (k.fromT !== null && k.toT !== null) {
    const action = k.id === 'firstTeam' ? moments.find((m) => m.t === k.toT)?.text : undefined;
    sub = `${mmss(k.fromT)} → ${mmss(k.toT)}${k.askedS !== undefined ? ` · asked ≤ ${span(k.askedS)}` : ''}${action ? ` (${action})` : ''}`;
  }
  const met = k.askedS !== undefined && taken !== null && taken <= k.askedS;
  return h('div', { class: `db-tile${met ? ' met' : ''}${ticked ? '' : ' unticked'}`, 'data-key': k.id, 'data-state': k.state, ...(k.id === 'recognition' ? { 'data-recognised': '' } : {}) },
    h('div', { class: 'db-tile-cap', title: k.label }, k.label),
    h('div', { class: 'db-tile-v' }, taken === null ? '–' : span(taken)),
    h('div', { class: 'db-tile-sub' }, sub),
    k.id === 'handsOff' ? fractionBar(k.fraction ?? 0) : null);
}

/** Reference lines of the compression-fraction bar (DQ3, ruled 5 November): the owner's values, drawn and labelled
 *  alike; the bar carries no grade and no colour change at either. */
const FRACTION_REFS = [60, 80] as const;
/** The hands-off tile's compression fraction as a small bar: the outline is 100 %, the fill the fraction, with a
 *  labelled line at each reference value. */
function fractionBar(f: number): HTMLElement {
  const W = 60, x = (p: number) => (0.5 + (p / 100) * W).toFixed(1);
  const svg = h('span', { class: 'db-bar db-fraction' });
  svg.innerHTML = `<svg viewBox="0 0 ${W + 1} 15" width="${W + 1}" height="15" aria-hidden="true">`
    + `<rect x="0.5" y="0.5" width="${(Math.min(Math.max(f, 0), 1) * W).toFixed(1)}" height="7" fill="#000"/>`
    + `<rect x="0.5" y="0.5" width="${W}" height="7" fill="none" stroke="#000" stroke-width="1"/>`
    + FRACTION_REFS.map((p) => `<line data-ref="${p}" x1="${x(p)}" y1="0" x2="${x(p)}" y2="9" stroke="#000" stroke-width="0.6" stroke-dasharray="1 1"/>`
      + `<text x="${x(p)}" y="14.5" font-size="5.5" text-anchor="middle">${p} %</text>`).join('')
    + '</svg>';
  return svg;
}

/** An objective's measured interval as a bar: the outline is the time asked, the fill the time taken; time past the
 *  asked is drawn hatched beyond the outline (at most as long again). */
function bar(m: { fromT: number; toT: number; askedS: number }): HTMLElement {
  const taken = m.toT - m.fromT;
  const W = 60, over = Math.min(Math.max(taken - m.askedS, 0) / m.askedS, 1) * W, fill = Math.min(taken / m.askedS, 1) * W;
  const vw = (W + 1 + (over > 0 ? over + 1 : 0)).toFixed(1);
  const svg = h('span', { class: 'db-bar' });
  svg.innerHTML = `<svg viewBox="0 0 ${vw} 8" width="${vw}" height="8" aria-hidden="true"><defs><pattern id="db-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="3" stroke="#000" stroke-width="1.2"/></pattern></defs>`
    + `<rect x="0.5" y="0.5" width="${fill.toFixed(1)}" height="7" fill="#000"/>${over > 0 ? `<rect x="${W + 0.5}" y="0.5" width="${over.toFixed(1)}" height="7" fill="url(#db-hatch)" stroke="#000" stroke-width="0.6"/>` : ''}`
    + `<rect x="0.5" y="0.5" width="${W}" height="7" fill="none" stroke="#000" stroke-width="1"/></svg>`;
  return h('span', { class: 'db-measure' }, svg, ` ${span(taken)} of ${span(m.askedS)}`);
}

/** Every key moment (UI review #3: no cap; on paper the table runs on with its header repeated) with what the monitor
 *  showed at that second (values rounded; SpO₂ "–" where the oximeter showed its dash, E126), and the alarms raised since the row before. */
/** A moment's SBP/DBP cell (D6): "92/58" from the arterial line; a cuff reading with its age, "98/60 (cuff, 2 min 10 s
 *  before)" (the owner's rule of 5 November, DQ1); "–" when none; "·" in a file that did not record them. */
function bpText(m: KeyMoment): string {
  const { sys, dia } = m.values;
  if (sys === undefined) return '·';
  if (sys === null) return '–';
  const num = (x: Pressure | undefined) => (x === null || x === undefined ? '–' : String(Math.round(typeof x === 'number' ? x : x.v)));
  if (typeof sys === 'number') return `${num(sys)}/${num(dia)}`;
  return `${num(sys)}/${num(dia)} (cuff${sys.ageS < 0.5 ? '' : `, ${span(sys.ageS)} before`})`;
}
/** An alarm under a moment (D6): its raise, and when it cleared and was acknowledged when the record kept them. */
function alarmText(m: KeyMoment, i: number): string {
  const text = m.alarms[i] as string;
  const a = m.alarmTimes?.[i];
  if (!a) return text;
  return `${text} ${mmss(a.t)} ▸ ${a.endT === null ? '(still on)' : `cleared ${mmss(a.endT)}`}${a.ackT === null ? '' : ` · acknowledged ${mmss(a.ackT)}`}`;
}

/** Every key moment (UI review #3: no cap; on paper the table runs on with its header repeated) with what the monitor
 *  showed at that second (values rounded; SpO₂ "–" where the oximeter showed its dash, E126; SBP/DBP and CVP, D6), and
 *  the alarms raised since the row before, each with its end and acknowledgement. A file made before the record kept
 *  them prints "·" in the new cells and says so once under the table. */
function momentsTable(ms: KeyMoment[], d: RunData): Node[] {
  const v = (x: number | null | undefined) => h('td', { class: 'num' }, x === undefined ? '·' : x === null ? '–' : String(Math.round(x)));
  const missing = [d.keeps?.includes('pressures') ? '' : 'SBP/DBP and CVP', d.keeps?.includes('alarmEnd') ? '' : 'when an alarm ended or was acknowledged'].filter(Boolean);
  return kids(
    h('p', { class: 'db-subhead' }, 'values at that second'),
    h('table', { class: 'db-table db-moments' },
      h('thead', {}, h('tr', {}, ...['n', 'Time', 'Who', 'What happened', 'HR', 'SBP/DBP', 'MAP', 'CVP', 'SpO₂', 'EtCO₂'].map((c) => h('th', { scope: 'col' }, c)))),
      h('tbody', {}, ...ms.flatMap((m) => [
        h('tr', { 'data-n': String(m.n), ...(m.pulseless ? { 'data-pulseless': 'true' } : {}), ...(m.recognised ? { 'data-recognised': '' } : {}) }, h('td', { class: 'num' }, String(m.n)), h('td', { class: 'num' }, mmss(m.t)), whoCell(m.who), h('td', {}, m.text),
          v(m.values.hr), h('td', { class: 'num db-bp' }, bpText(m)), v(m.values.map), v(m.values.cvp), v(m.values.spo2), v(m.values.etco2)),
        ...(m.alarms.length ? [h('tr', { class: 'db-alarms' }, h('td', {}), h('td', { colspan: '9' }, 'Alarms since the last row: ', ...m.alarms.flatMap((_, i) => (i ? [m.alarmTimes ? '; ' : ', ', alarmText(m, i)] : [alarmText(m, i)]))))] : []),
      ]))),
    missing.length ? notRecorded(missing.join(', and ').replace(/^./, (c) => c.toUpperCase())) : null,
    ms.some((m) => m.pulseless) ? h('p', { class: 'db-note60' }, SPO2_DASH) : null,
  );
}

/** "From the card's author" (D9; the two blocks only, DQ6): the card's `show` lines and its openers, each printed as the
 *  card writes it (Decision 8: never interpolated; the opener's time and key-moment number are a separate label), an
 *  opener whose anchor did not happen on the kept course left out and counted. Null when the card has no debriefHints. */
export function hintsSection(d: RunData, ms: KeyMoment[]): HTMLElement | null {
  const show = d.doc?.debriefHints?.show ?? [];
  const op = openersAt(d, ms);
  if (!show.length && !op) return null;
  const n = op?.left ?? 0;
  return section('hints', "From the card's author",
    show.length ? h('div', { class: 'db-hint-block' }, h('h3', {}, 'What this case is built to show'), h('ul', { class: 'db-hint-show' }, ...show.map((x) => h('li', {}, x)))) : null,
    op ? h('div', { class: 'db-hint-block' }, h('h3', {}, 'Openers for the analysis'),
      op.shown.length ? h('ol', { class: 'db-hint-openers' }, ...op.shown.map((o) => h('li', {},
        h('span', { class: 'db-hint-at' }, o.n === null ? mmss(o.t) : `${mmss(o.t)} · moment ${o.n}`), ' ', h('span', { class: 'db-hint-text' }, o.text)))) : null,
      n ? h('p', { class: 'db-hint-left muted' }, n === 1 ? '1 opener not shown: its event did not happen in this run' : `${n} openers not shown: their events did not happen in this run`) : null) : null);
}

export function debriefView(session: AppSession, link: Link): View {
  const who = h('input', { class: 'input', id: 'db-who', autocomplete: 'off', placeholder: 'Instructor and learners' });
  const notes = h('div', { class: 'db-notes', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-labelledby': 'db-notes-h' });
  // Decision 11: render() rebuilds only the two live containers; the Run by field, the talking points and the notes
  // between them are created once here and never re-created or re-appended, so typing in them is never interrupted
  const live1 = h('div', { id: 'db-live-1' });
  const live2 = h('div', { id: 'db-live-2' });
  const PEARLS_H = 'Talking points';
  const pearlBoxes = (): HTMLElement => h('div', { class: 'db-pearls' }, ...PEARLS.map(([phase, prompt]) => h('div', { class: 'db-pearl' }, h('b', {}, phase), h('p', {}, prompt))));
  const pearls = section('pearls', PEARLS_H, pearlBoxes());
  const NOTES_H = 'Notes';
  const notesSec = section('notes', NOTES_H, notes);
  const notesH = notesSec.firstElementChild as HTMLElement;
  const handout = h('div', { class: 'db-handout-live' });
  const HANDOUT_H = 'Learner handout (printed separately)';
  const handoutH = h('h2', { id: 'db-handout-h' }, HANDOUT_H);
  const handoutSec = h('section', { class: 'db-sec', id: 'db-handout', 'aria-labelledby': 'db-handout-h' }, handoutH, handout);
  const foot = h('footer', { class: 'db-foot db-runfoot' }, FOOT);
  // D13: the language of the report and the handout (per browser, English by default; Decision 15: the host's one
  // setting, also the Briefing's language). The two live containers, the talking points, the notes' heading, the
  // handout and the footer change with it.
  const draft = h('p', { class: 'db-draft', lang: 'en', dir: 'ltr', hidden: true }, DRAFT_LINE);
  const faMissing = h('details', { class: 'db-fa-missing', hidden: true }, h('summary', {}), h('ul', {}));
  const langSwitch = seg<HostLang>('Language of the report', [['en', 'English'], ['fa', 'فارسی']], hostLang(), (l) => (setHostLang(l), render()));
  langSwitch.lang = 'en'; // the Persian option names itself in Persian
  const pageStyle = h('style', { id: 'db-page-style' }, PAGE_CSS);
  /** The page in the host's language: Persian puts the containers right to left and through the table, counts what
   *  the table lacks (listed on screen) and, while an entry printed is unread, shows DQ10's line. The talking points
   *  and the notes' heading, made once outside the live containers (Decision 11), go through it too (P-S3: they
   *  printed in English): the talking points hold no typing and are drawn afresh in English first; of the notes only
   *  the heading is touched, the typed notes never. */
  const applyLang = (): void => {
    const fa = hostLang() === 'fa';
    langSwitch.set(fa ? 'fa' : 'en');
    handoutH.textContent = HANDOUT_H;
    foot.textContent = FOOT;
    pearls.replaceChildren(h('h2', { id: 'db-pearls-h' }, PEARLS_H), pearlBoxes());
    notesH.textContent = NOTES_H;
    const parts = [live1, live2, pearls, notesH, handoutSec, foot];
    for (const x of parts) {
      if (fa) x.setAttribute('lang', 'fa'), x.setAttribute('dir', 'rtl');
      else x.removeAttribute('lang'), x.removeAttribute('dir');
    }
    if (!fa) {
      draft.hidden = faMissing.hidden = true;
      pageStyle.textContent = PAGE_CSS;
      return;
    }
    const p = faPass();
    for (const x of parts) translateTree(x, p);
    pageStyle.textContent = pageCssFa(foot.textContent ?? FOOT, false, p);
    const unread = unreviewed(p);
    draft.hidden = !unread;
    if (unread) {
      pageStyle.textContent = pageCssFa(foot.textContent ?? FOOT, true, p);
      // where the browser prints no @page boxes (WebKit), the line goes with each footer line and heads the handout
      for (const f of [...live1.querySelectorAll('.db-runfoot'), ...live2.querySelectorAll('.db-runfoot'), foot]) f.append(h('span', { class: 'db-draftline', lang: 'en', dir: 'ltr' }, DRAFT_LINE));
      handout.prepend(h('p', { class: 'db-draftline', lang: 'en', dir: 'ltr' }, DRAFT_LINE));
    }
    faMissing.hidden = p.missing.size === 0;
    (faMissing.firstElementChild as HTMLElement).textContent = `${p.missing.size} ${p.missing.size === 1 ? 'string prints' : 'strings print'} in English: not in the Persian table yet`;
    (faMissing.lastElementChild as HTMLElement).replaceChildren(...[...p.missing].map(([en, n]) => h('li', {}, `${n}× ${en}`)));
  };
  const runBy = (): void => {
    const s = live1.querySelector('.db-runby');
    if (s) s.textContent = who.value;
  };
  who.addEventListener('input', runBy);
  let started = -1;
  let lastSeen = 0; // the rows and samples of the run this view last drew
  /** A saved debrief of the archive on screen (#/debrief/archive/<id>), or null: the live run. */
  let viewing: { meta: ArchiveMeta; n: number; data: RunData } | null = null;
  const shown = (): RunData => viewing?.data ?? session.record.data;
  /** The resident of the debrief on screen: the saved one's, or the live run's once "Finish the case" saved it. */
  const residentOf = (d: RunData): string => (viewing ? viewing.meta.resident : (archive.forRun(d.startedAt)?.resident ?? ''));
  const residentLine = (d: RunData): HTMLElement | null => {
    const who = residentOf(d);
    return who ? h('p', { class: 'db-sub db-resident' }, `Resident: ${who}`) : null;
  };
  const render = () => {
    const d = shown();
    if (!viewing && d.startedAt !== started) {
      // a new run: its notes start empty (the record of the last run is gone with it) — unless the run the view last
      // drew was still empty: the record's own restart at load (FX-20) is not a new run for the notes typed meanwhile
      started = d.startedAt;
      if (lastSeen > 0) notes.replaceChildren();
    }
    if (!viewing) lastSeen = d.rows.length + d.samples.length;
    drawViewing();
    drawArchive();
    const end = endOf(d);
    const card = d.doc ? cardOf(d.doc) : null;
    const wall = Math.max(0, (d.lastWall - d.startedAt) / 1000);
    // the header band: the kicker (the h1 keeps its accessible name "Debrief"), the case, one sub-line
    const band = h('header', { class: 'db-band' },
      h('h1', { id: 'db-h' }, 'Debrief', h('span', { 'aria-hidden': 'true' }, ' · Simulated case')),
      h('div', { class: 'db-title' }, card ? card.title : 'No scenario (free run)'),
      ...kids(residentLine(d)),
      h('p', { class: 'db-sub' }, `${d.patient} · ${mmss(end)} simulated (${span(wall)} on the clock) · ${new Date(d.startedAt).toLocaleString()} · Run by: `,
        h('span', { class: 'db-runby' }, who.value)));
    const obj = objectives(d);
    const r3 = report3(d); // a pme-scenario/2 run (F7)
    const fs = facts(d);
    const meds = d.rows.filter((r) => r.ev?.startsWith('drug:') || r.ev === 'fluid');
    const totals = drugTotals(d);
    const marks = d.rows.filter((r) => r.kind === 'bookmark' || r.kind === 'restore');
    const ss = steps(d);
    const ms = keyMoments(d);
    const kt = keyTimes(d, ms);
    const tiles = kt.map((k) => tile(k, ms)).filter((x): x is HTMLElement => x !== null);
    const nums = markNumbers(d);
    const cm = courseMarks(nums);
    const course = h('div', { class: 'db-course' });
    course.innerHTML = courseSvg(d, ms, { trends: TRENDS4, marks: cm });
    course.style.setProperty('--db-print-w', `${printWidth(course.innerHTML)}%`);
    const swim = h('div', { class: 'db-swim' });
    const rec = recognitionAt(d)?.t; // the one reading of the recognition (D5): drawn ◇ on the Team lane
    swim.innerHTML = swimlaneSvg(d, ms, windowsOf(d), rec === null || rec === undefined ? {} : { recognisedT: rec });
    live1.replaceChildren(...kids(
      band,
      tiles.length ? section('keytimes', 'Key times', h('div', { class: 'db-tiles' }, ...tiles)) : null,
      // the owner, 9 November (decision B): the swimlane under the course strip, in its section, with no heading of its own
      d.samples.length ? section('course', 'The course', legend('course', ' · numbers match Key moments', markKeys(cm)), course,
        ms.length ? h('div', { id: 'db-swimlane', class: 'db-swimlane' }, swimLegend(r3 !== null), swim) : null) : null,
      // page 1 is then full (the swimlane is 47–60 mm high on the recorded runs): the objectives open page 2, the key
      // moments follow them there; a run without key moments has no swimlane and keeps its objectives on page 1
      ms.length && !r3 ? runFoot() : null,
      r3 ? null
      : section('objectives', 'Objectives', h('p', { class: 'db-subhead' }, 'What the record shows: it reads the run, it does not grade the person'), obj.length
        ? h('ol', { class: 'db-obj' }, ...obj.map((o) => {
          const m = markOf(o);
          return h('li', { 'data-status': o.verdict.status, 'data-mark': m.mark }, h('b', { class: 'db-mark db-chip' }, m.words), ' ', o.text,
            o.verdict.measure ? bar(o.verdict.measure) : null, h('div', { class: 'db-why' }, m.why));
        }))
        : h('p', { class: 'muted' }, 'This run has no objectives.')),
      // the key moments: page 2's head on a /2 run (no objectives), after the objectives on page 2 otherwise
      ...(ms.length ? [r3 ? runFoot() : null, section('moments', 'Key moments and what the monitor showed', ...momentsTable(ms, d))] : []),
      hintsSection(d, ms),
      section('facts', 'Measured facts', fs.length
        ? h('dl', { class: 'db-facts' }, ...fs.flatMap((x) => [h('dt', {}, x.label), h('dd', {}, x.value)]))
        : h('p', { class: 'muted' }, 'Nothing was measured yet.')),
    ));
    live2.replaceChildren(
      runFoot(),
      section('trends', 'Trends',
        legend('charts'),
        h('div', { class: 'db-charts' }, ...kids(...TREND_KEYS.flatMap((k) => (k === 'map' ? [chart(d, k, end, ms), pressuresChart(d, end, ms)] : [chart(d, k, end, ms)])))),
        d.keeps?.includes('pressures') ? null : notRecorded('SBP, DBP and CVP')),
      section('drugs', 'Drugs and fluids', meds.length
        ? h('table', { class: 'db-table' }, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Time'), h('th', { scope: 'col' }, 'Given'))),
          h('tbody', {}, ...meds.map((r) => h('tr', r.undone ? { class: 'undone' } : {}, h('td', { class: 'num' }, mmss(r.t)), h('td', {}, r.text, undoneText(r))))))
        : h('p', { class: 'muted' }, 'No drugs or fluids were given.'),
        totals.length ? h('ul', { class: 'db-totals' }, ...totals.map((x) => h('li', {}, `${drugName(x.drugId)}: ${x.total} in ${x.n} ${x.n === 1 ? 'bolus' : 'boluses'}`))) : null),
      ...(r3 ? [
        section('actions', 'Actions on the card', h('p', { class: 'db-subhead' }, 'What the record shows: each action against its prescription and window; it does not grade the person'), actionsTable(r3)),
        ...(r3.outcomes.length ? [section('outcomes', 'Outcomes', h('ul', { class: 'db-outcomes' }, ...r3.outcomes.map((o) => h('li', { 'data-status': o.status }, h('b', {}, o.status === 'reached' ? '✓ reached' : o.status === 'pending' ? '… pending' : '✗ not reached'), ` ${o.text}`, h('div', { class: 'db-why' }, o.why)))))] : []),
        section('violations', 'Violations', r3.violations.length
          ? h('ul', { class: 'db-violations' }, ...r3.violations.map((v) => h('li', {}, `${mmss(v.t)} ${v.text}${v.harm === 'not modelled' ? ' (harm not modelled)' : ''}`)))
          : h('p', { class: 'muted' }, 'No contraindicated administration.')),
      ] : []),
      ...(ss.length ? [section('steps', 'Steps on the card', h('p', { class: 'db-subhead' }, 'What the record shows: each step in the card’s order and when it was taken; it does not grade the person'), stepsTable(ss, d))] : []),
      section('timeline', 'Timeline', h('table', { class: 'db-table db-timeline' },
        h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Time'), h('th', { scope: 'col' }, 'Kind'), h('th', { scope: 'col' }, 'Event'))),
        h('tbody', {}, ...timelineRows(d)))),
      section('bookmarks', 'Bookmarks', marks.length
        ? h('ul', {}, ...marks.map((r) => h('li', r.undone ? { class: 'undone' } : {}, nums.has(r) ? numberedLine(r, nums.get(r) as number) : markLine(r))))
        : h('p', { class: 'muted' }, 'No bookmarks.')),
    );
    // the learner handout (E51): what happened and when, no verdict, no objective, no value
    const learnerCourse = h('div', { class: 'db-course' });
    learnerCourse.innerHTML = courseSvg(d, ms, { trends: TRENDS4, learner: true });
    handout.classList.toggle('db-long', ms.length > HANDOUT_ROWS);
    handout.replaceChildren(...kids(
      h('header', { class: 'db-band' },
        h('div', { class: 'db-kicker' }, 'Learner handout · Your case · No marks'),
        h('div', { class: 'db-htitle' }, card ? card.title : 'No scenario (free run)'),
        ...kids(residentLine(d)),
        h('p', { class: 'db-sub' }, `${d.patient} · ${mmss(end)} simulated`)),
      h('p', { class: 'db-intro' }, HANDOUT.intro),
      h('section', { class: 'db-hsec' }, h('h3', {}, 'Your run at a glance'), legend('learner'), learnerCourse),
      ms.length ? h('section', { class: 'db-hsec' }, h('h3', {}, 'Key moments'), h('table', { class: 'db-table db-hmoments' },
        h('thead', {}, h('tr', {}, ...['n', 'Time', 'Who', 'What happened'].map((c) => h('th', { scope: 'col' }, c)))),
        h('tbody', {}, ...ms.map((m) => h('tr', { 'data-n': String(m.n) }, h('td', { class: 'num' }, String(m.n)), h('td', { class: 'num' }, mmss(m.t)), whoCell(m.who), h('td', {}, m.text)))))) : null,
      handoutQuestions(d),
      takeHomeSection(d.doc?.takeHome),
      h('p', { class: 'db-next' }, HANDOUT.next),
    ));
    applyLang();
  };

  // a saved debrief on screen: which one, and the way back to the live run (screen only)
  const viewingText = h('span', {});
  const viewingBar = h('p', { class: 'db-viewing', hidden: true }, viewingText, h('a', { href: hrefOf('debrief') }, 'Back to the current run'));
  const drawViewing = () => {
    viewingBar.hidden = !viewing;
    if (viewing) viewingText.textContent = `Saved debrief ${viewing.n}: ${entryTitle(viewing.meta)}, saved at ${hhmm(viewing.meta.savedAt)}. `;
  };
  // the archive (board "Finish 2"): every saved debrief, export all, and a quiet clear behind a confirm (screen only)
  const arcCount = h('p', { class: 'db-arc-count' });
  const arcList = archiveList({ p: 'db-arc', current: () => viewing?.meta.id ?? null });
  const drawArchive = () => {
    const all = archive.list().length;
    const today = archive.savedToday();
    arcCount.textContent = all ? `${archive.holdsLine()}, ${today} today · ${archive.whereLine()}` : 'Nothing saved in this browser. “Finish the case” in Instructor v2 saves each run here.';
    arcList.draw();
  };
  const clearArchive = async () => {
    if (!(await confirmDialog('Clear the archive?', 'Every saved debrief in this browser is deleted, for good. Export them first to keep them.', 'Clear', true, 'Keep them'))) return;
    await archive.clear();
    if (viewing) location.hash = hrefOf('debrief');
    render();
  };
  const archiveSec = section('archive', 'Archive', arcCount, arcList.el,
    h('div', { class: 'db-arc-tools' }, button('Export all (one JSON file)', () => void exportAll(), 'ghost small'), button('Clear the archive', () => void clearArchive(), 'ghost small db-arc-clear')));

  const el = h('section', { class: 'debrief', 'aria-labelledby': 'db-h' },
    h('div', { class: 'page wide' },
      h('div', { class: 'db-tools' }, button('Print or save as PDF', printWithFont, 'primary'),
        button('Download the record (JSON)', () => {
          if (viewing) return void downloadEntry(viewing.meta); // the saved debrief, with its resident
          const d = session.record.data;
          download(`debrief-${d.doc?.id ?? 'free-run'}-${new Date(d.startedAt).toISOString().slice(0, 10)}.json`, debriefJson(d, BUILD), 'application/json');
        }, 'ghost'),
        button('Print the learner handout', () => {
          const d = shown();
          const title = document.title;
          el.dataset.print = 'handout';
          document.title = `Learner handout ${d.doc ? cardOf(d.doc).title : 'free run'} ${new Date(d.startedAt).toISOString().slice(0, 10)}`;
          addEventListener('afterprint', () => {
            delete el.dataset.print;
            document.title = title;
          }, { once: true });
          printWithFont();
        }, 'ghost'),
        h('span', { class: 'hint' }, 'Choose "Save as PDF" as the printer. The report reads the run so far; it refreshes while open. The JSON holds the record, not the "Run by" line or the notes.'),
        langSwitch),
      draft,
      faMissing,
      viewingBar,
      live1,
      h('div', { class: 'field db-who' }, h('label', { for: 'db-who' }, 'Run by'), who),
      pearls,
      notesSec,
      live2,
      handoutSec,
      archiveSec,
      foot));
  // WebKit (Safari) prints no @page margin boxes: there the footer lines before each page break stand in
  el.classList.toggle('db-nomargin', typeof (window as { CSSMarginRule?: unknown }).CSSMarginRule !== 'function');

  // the end of a run: a state with no way out (the toast once per state reached)
  let ended = '';
  link.onChange(() => {
    const sv = link.ctl.scenario;
    const key = `${sv.docVersion}:${sv.stateId}`;
    if (!asV1(sv.doc) || key === ended || sv.current()?.transitions?.length) return; // /2: no end known until F2's ended()
    ended = key;
    toast('The scenario has ended: the debrief is ready (Debrief, in the session bar)');
  });

  let iv: ReturnType<typeof setInterval> | null = null;
  /** Bumped by each enter and leave: an archive read answers only the visit that asked. */
  let entered = 0;
  return {
    id: 'debrief', el, bench: true,
    enter: (sub = '') => {
      document.head.append(pageStyle);
      void loadPrintFont();
      // #/debrief/archive: the Archive section; #/debrief/archive/<id>: that saved debrief; …/print: printed on arrival
      const m = /^archive(?:\/([^/]+)(\/print)?)?$/.exec(sub);
      viewing = null;
      const go = ++entered;
      const show = () => {
        render();
        iv ??= setInterval(() => viewing || render(), 5000); // a saved debrief does not change
        if (m && !m[1]) archiveSec.scrollIntoView?.({ block: 'start' });
        const d = shown();
        const who = residentOf(d);
        // the print file's name (Save as PDF): the shell sets the title after enter()
        const title = `Debrief ${d.doc ? cardOf(d.doc).title : 'free run'}${who ? ` ${who}` : ''} ${new Date(d.startedAt).toISOString().slice(0, 10)}`;
        queueMicrotask(() => (document.title = title));
        if (m?.[2] && viewing) {
          history.replaceState(null, '', `${location.pathname}${location.search}${archiveHref(viewing.meta.id)}`); // a reload does not print again
          printWithFont();
        }
      };
      // the archive's place known (IndexedDB, or localStorage where it is unavailable) and an earlier build's bodies moved
      void archive.ready().then(() => go === entered && drawArchive());
      if (!m?.[1]) return show();
      const id = m[1];
      // a saved debrief's body is read asynchronously (IndexedDB): the view draws it once it is here, unless left meanwhile
      void archive.debrief(id).then((body) => {
        if (go !== entered) return;
        const list = archive.list();
        const i = list.findIndex((x) => x.id === id);
        if (body && i >= 0) viewing = { meta: list[i] as ArchiveMeta, n: i + 1, data: (JSON.parse(body) as DebriefExport).record };
        else toast('That saved debrief is not in this browser’s archive', 'alert');
        show();
      });
    },
    leave: () => {
      entered++; // a saved debrief still being read is not drawn
      pageStyle.remove();
      if (iv) clearInterval(iv);
      iv = null;
    },
  };
}
