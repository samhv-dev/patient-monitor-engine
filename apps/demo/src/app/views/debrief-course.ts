// The Debrief's course strip: the run on one time axis as an SVG string (no DOM state).
// The report's strip, the owner's design of 1–2 November, top to bottom: the events row (the numbered key moments as
// down arrows: team blue, patient vermillion, a scenario state outlined; the numbers are those of the key-moments
// table), each with a thin dotted line in its colour down through the vital panels; the trends HR, MAP, SpO₂ and EtCO₂
// as small multiples (E56), each in its own panel one big square high, its scale rounded outward to fives, and a grey
// band over each pulseless span; the time labels between two short dashes (no axis line); and the marks row (every
// bookmark of the run: the dock's own icon for its kind, a ribbon for a plain bookmark, white inside, its number
// inside, a line up to the row's top at its time; no words: they are the title, shown on hover, and the numbered
// Bookmarks list). Under it all ECG paper (`gridMajorS`): five fine squares to a big one, square, drawn inside each
// panel and row, each outlined in full.
// The learner handout's strip is as it was (rc.3): the badges over the lanes, no marks, no paper.
// Every line is what the monitor showed: the SpO₂ line breaks where the oximeter showed its dash and runs through the
// compression-generated reading during CPR (E126; E60 broke it over the whole band). A trend never measured is left
// out. The legend is the view's.
import { axisRange, endOf, mmss, span, trendMeta } from '../debrief.ts';
import { pulselessSpans, type KeyMoment } from '../debrief-moments.ts';
import type { RunData, TrendKey } from '../record.ts';

export interface CourseOptions {
  trends: TrendKey[];
  /** The learner handout's copy: the rc.3 strip, labelled as the learner's run, without marks. */
  learner?: boolean;
  /** The instructor's marks (the run's bookmark rows), drawn at their times on the report's strip. */
  marks?: CourseMark[];
}

/** A mark on the strip: its time, its number (the marks in time order, as the Bookmarks list numbers them), its kind
 *  (the dock's `good` / `bad` / `discuss`, or `bookmark` for a plain one), its words (the title, shown on hover),
 *  whether a return undid it, and its icon (a 24-unit path, the dock's own). */
export interface CourseMark { t: number; n: number; kind: string; title: string; undone: boolean; icon: string }

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const TEAM = '#0072B2';
const PATIENT = '#D55E00';
const SCENARIO = '#767676';
/** The strip's drawing units: 4 per mm of the 182 mm content width, so height ≤ 320 is ≤ 80 mm. */
export const COURSE_W = 728;
/** L: the label column (rc.3: 108, was 92, so "ART M / NIBP M" in bold clears its scale values); AXIS: the time labels
 *  under the last panel. BADGES, GAP: the learner's strip (its badge row; the white gap between its lanes). */
const L = 108, R = 10, AXIS = 18, BADGES = 24, GAP = 4;
/** The plot's width in drawing units. */
const PLOT = COURSE_W - L - R;
/** The learner's lane height: its copy prints at the full 182 mm width so its 9-unit labels read at 6.4 pt (rc.3; at
 *  90 mm they were ≈ 3.2 pt), with lanes about half as tall so the strip stays ≈ 40 mm high. */
const LANE_LEARNER = 26;
/** The learner's badges: centres at least this far apart (UI review #19: a 14-unit badge, a two-digit number, a gap)
 *  and no nearer the plot's edges than half a badge. */
const BADGE_MIN = 18, BADGE_HALF = 7;
/** An event's down arrow (width, height; drawing units) and its number's size. */
const ARROW = { w: 22, h: 19, font: 10 };
/** A mark's icon (drawing units), its number inside. */
const MARK_ICON = 22;
/** Each icon's visual body in its 24-unit coordinates, put on the mark's time and the row's middle: a thumb's palm and
 *  cuff (not the thumb above or below it), the speech bubble without its tail, the whole ribbon; where its top is (the
 *  line up to the row's top ends there); and where its number sits (in the palm, in the bubble, in the ribbon:
 *  the centre of the open space, the baseline). */
const MARK_BODY: Readonly<Record<string, readonly [number, number]>> = { good: [12, 15], bad: [12, 9], discuss: [12, 10.5], bookmark: [12, 12] };
const MARK_TOP: Readonly<Record<string, number>> = { good: 3, bad: 3, discuss: 5, bookmark: 3 };
const MARK_NUM: Readonly<Record<string, readonly [number, number]>> = { good: [14.2, 18.9], bad: [9.8, 12], discuss: [12, 13.8], bookmark: [12, 12.8] };
/** The spans a big square may stand for (seconds). */
const SPANS = [5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];

/**
 * The grid's big square, in seconds of the time axis (the owner, 1 November): one minute while a minute is at least
 * 20 drawing units of the 610-unit plot (fine squares ≥ 4 units, 0.8 mm on the printed report: a run up to ≈ 30½
 * min), else five minutes. A big square is also a panel's height, so it is held between 20 and 60 units: a run so
 * short that a minute is wider than 60 units (under ≈ 10 min) steps down to 30, 15, 10 or 5 s; a run so long that
 * five minutes are wider than 60 units (≈ 30½ to 51 min) steps down to two minutes; one so long that five minutes are
 * under 20 units steps up to 10, 15, 30 or 60 min.
 */
export function gridMajorS(end: number): number {
  const w = (s: number): number => (s / Math.max(end, 1)) * PLOT;
  let i = SPANS.indexOf(w(60) >= 20 ? 60 : 300);
  while (w(SPANS[i] as number) < 20 && i < SPANS.length - 1) i++;
  while (w(SPANS[i] as number) > 60 && i > 0) i--;
  return SPANS[i] as number;
}

/**
 * A panel's scale (the owner, 2 November): the trend's least span (`axisRange`) rounded outward to fives (43 → 40,
 * 153 → 155); where the trace's lowest or highest value lies within half a small square of that round value (a tenth
 * of the panel), the next five beyond (153 → 160), so the trace does not touch the frame. Never below 0, nor SpO₂ above
 * 100 (its trace may then run along the top).
 */
export function panelScale(k: TrendKey, min: number, max: number): [number, number] {
  const [a, b] = axisRange(k, min, max);
  const lo = Math.max(0, Math.floor(a / 5) * 5), hi = Math.max(Math.ceil(b / 5) * 5, lo + 5);
  const half = (hi - lo) / 10;
  return [min - lo < half ? Math.max(0, lo - 5) : lo, hi - max < half ? Math.min(k === 'spo2' ? 100 : Infinity, hi + 5) : hi];
}

/** A trend's line on a lane from y0 (its highest value) to y1 (its lowest): broken where nothing was measured. */
function tracePath(d: RunData, k: TrendKey, x: (t: number) => number, y: (v: number) => number): string {
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
  return path;
}

/**
 * UI review #19: badge centres for moments at plot positions `at` (sorted), at least `gap` apart and inside [lo, hi],
 * each as near its moment as the others allow. Badges that would collide form a run placed `gap` apart and centred on
 * the mean of their moments (the least total shift), then held inside the plot; runs that then meet merge. A record
 * with more badges than the plot holds at `gap` shares the width evenly. The dashed line stays at the moment; a short
 * leader joins it to its badge.
 */
export function placeBadges(at: readonly number[], lo: number, hi: number, gap: number): number[] {
  const g = Math.min(gap, at.length > 1 ? (hi - lo) / (at.length - 1) : gap);
  // a run of n badges from moment `first`: badge k at x0 + k·g; the x0 with the least squared shift is the mean of
  // (moment − k·g), held so the run stays inside [lo, hi]
  type Run = { first: number; n: number; x0: number };
  const start = (first: number, n: number): number => {
    let sum = 0;
    for (let k = 0; k < n; k++) sum += (at[first + k] as number) - k * g;
    return Math.min(Math.max(sum / n, lo), hi - g * (n - 1));
  };
  const runs: Run[] = [];
  at.forEach((_, i) => {
    runs.push({ first: i, n: 1, x0: start(i, 1) });
    for (let p = runs.at(-2), q = runs.at(-1); p && q && p.x0 + g * p.n > q.x0 + 1e-6; p = runs.at(-2), q = runs.at(-1)) {
      runs.splice(-2, 2, { first: p.first, n: p.n + q.n, x0: start(p.first, p.n + q.n) });
    }
  });
  return runs.flatMap((r) => Array.from({ length: r.n }, (_, k) => r.x0 + k * g));
}

/** The learner handout's strip (rc.3, unchanged): the numbered badges over the lanes, a dashed line from each down to
 *  the axis, the lanes, the axis and its minutes. */
function learnerSvg(d: RunData, moments: KeyMoment[], trends: TrendKey[]): string {
  const end = Math.max(endOf(d), 1);
  const spans = pulselessSpans(d);
  const lanes = trends.filter((k) => d.samples.some((s) => s[k] !== null));
  const LANE_H = LANE_LEARNER;
  const H = BADGES + lanes.length * (LANE_H + GAP) + AXIS;
  const x = (t: number) => L + (t / end) * PLOT;
  const top = BADGES, bottom = BADGES + lanes.length * (LANE_H + GAP);

  const bands = spans.map(([a, b]) => `<rect class="db-pulseless" x="${x(a).toFixed(1)}" y="${top}" width="${Math.max(1, x(b) - x(a)).toFixed(1)}" height="${bottom - top}" fill="#e9e9e9"/>`).join('');
  const bandLabels = spans.map(([a, b]) => {
    const text = `pulseless ${span(b - a)}`;
    return `<g class="db-pulseless-l"><rect x="${(x(a) + 1).toFixed(1)}" y="${bottom - 13}" width="${(text.length * 4.7 + 4).toFixed(1)}" height="11" fill="#e9e9e9"/>`
      + `<text x="${(x(a) + 3).toFixed(1)}" y="${bottom - 4}">${text}</text></g>`;
  }).join('');
  const rows = lanes.map((k, i) => {
    const m = trendMeta(k);
    const y0 = top + i * (LANE_H + GAP) + 2, y1 = y0 + LANE_H - 4;
    const vals = d.samples.map((s) => s[k]).filter((v): v is number => v !== null);
    const [lo, hi] = axisRange(k, Math.min(...vals), Math.max(...vals));
    const path = tracePath(d, k, x, (v) => y0 + (1 - (v - lo) / (hi - lo)) * (y1 - y0));
    const f = (v: number) => v.toFixed(m.digits);
    return `<g class="db-lane" data-trend="${k}"><line class="grid" x1="${L}" x2="${COURSE_W - R}" y1="${y1}" y2="${y1}"/>`
      + `<text x="4" y="${y0 + 11}" class="db-lane-l">${esc(m.label)}</text><text x="4" y="${y0 + 22}" class="unit">${esc(m.unit)}</text>`
      + `<text x="${L - 4}" y="${y0 + 8}" text-anchor="end">${f(hi)}</text><text x="${L - 4}" y="${y1}" text-anchor="end">${f(lo)}</text>`
      + `<path d="${path}" fill="none" stroke="#000"/></g>`;
  }).join('');
  const step = [60, 120, 300, 600, 900, 1800, 3600].find((st) => end / st <= 8) ?? 3600;
  let ticks = '';
  for (let t = 0; t <= end; t += step) ticks += `<line x1="${x(t).toFixed(1)}" x2="${x(t).toFixed(1)}" y1="${bottom}" y2="${bottom + 4}"/><text x="${x(t).toFixed(1)}" y="${H - 2}" text-anchor="middle">${mmss(t)}</text>`;
  const placed = placeBadges(moments.map((mo) => x(mo.t)), L + BADGE_HALF, COURSE_W - R - BADGE_HALF, BADGE_MIN);
  const badges = moments.map((mo, i) => {
    const at = x(mo.t);
    const bx = placed[i] as number;
    const c = mo.who === 'team' ? TEAM : mo.who === 'patient' ? PATIENT : SCENARIO;
    const shape = mo.who === 'team'
      ? `<rect x="${(bx - 6.5).toFixed(1)}" y="5" width="13" height="13" fill="${c}"/>`
      : mo.who === 'patient'
        ? `<circle cx="${bx.toFixed(1)}" cy="11.5" r="7" fill="${c}"/>`
        : `<rect x="${(bx - 6.5).toFixed(1)}" y="5" width="13" height="13" fill="#fff" stroke="${c}"/>`;
    const num = `<text x="${bx.toFixed(1)}" y="15" text-anchor="middle" class="db-badge-n" fill="${mo.who === 'scenario' ? '#000' : '#fff'}">${mo.n}</text>`;
    return `<g class="db-badge db-${mo.who}" data-n="${mo.n}"><line x1="${at.toFixed(1)}" x2="${at.toFixed(1)}" y1="${BADGES - 6}" y2="${bottom}" stroke="${c}" stroke-dasharray="2 2"/>`
      + `${bx !== at ? `<line x1="${at.toFixed(1)}" x2="${bx.toFixed(1)}" y1="${BADGES - 6}" y2="18" stroke="${c}"/>` : ''}${shape}${num}</g>`;
  }).join('');
  const label = `Your run, ${mmss(0)} to ${mmss(end)}${moments.length ? `: ${moments.map((m) => `${m.n} at ${mmss(m.t)}, ${m.who}, ${m.text}`).join('; ')}` : ''}`;
  return `<svg class="db-course-svg learner" viewBox="0 0 ${COURSE_W} ${H}" role="img" aria-label="${esc(label)}">`
    + `${bands}${rows}<line class="axis" x1="${L}" x2="${COURSE_W - R}" y1="${bottom}" y2="${bottom}"/><g class="ticks">${ticks}</g>${bandLabels}${badges}</svg>`;
}

/** The course strip of a run as an SVG string: the report's (the owner's design), or the learner's (`o.learner`). */
export function courseSvg(d: RunData, moments: KeyMoment[], o: CourseOptions): string {
  if (o.learner) return learnerSvg(d, moments, o.trends);
  const end = Math.max(endOf(d), 1);
  const spans = pulselessSpans(d);
  const lanes = o.trends.filter((k) => d.samples.some((s) => s[k] !== null));
  const mks = [...(o.marks ?? [])].sort((a, b) => a.t - b.t);
  const x = (t: number) => L + (t / end) * PLOT;
  const minor = ((gridMajorS(end) / end) * PLOT) / 5; // a fine square's side
  const LANE_H = 5 * minor; // a panel: one big square
  // the events and marks rows: three fine squares high, or the fewest whole fine squares that hold the arrow or icon
  const rowH = (need: number): number => Math.max(3, Math.ceil(need / minor - 1e-9)) * minor;

  // top to bottom: the events row, a fine square, the panels half a fine square apart, the time labels between their
  // two dashes, the marks row
  const eH = moments.length ? rowH(ARROW.h + 4) : 0;
  const top = moments.length ? eH + minor : 2;
  const laneTop = (i: number) => top + i * (LANE_H + minor / 2);
  const bottom = laneTop(lanes.length) - minor / 2; // the last panel's foot: the time axis (no line drawn)
  const mTop = bottom + AXIS + 6, mH = mks.length ? rowH(MARK_ICON + 2) : 0;
  const H = mTop + mH + 1;

  // ECG paper inside each panel and row, each outlined in full: the fine lines every fifth of a big square, the bold
  // ones on the big squares (from the axis's start, so on its minute ticks), the horizontal ones counted up from the
  // foot
  let fine = '', bold = '';
  const paper = (y0: number, y1: number): void => {
    bold += `M${L} ${y0.toFixed(1)}H${COURSE_W - R}V${y1.toFixed(1)}H${L}Z`;
    for (let k = 1; L + k * minor < COURSE_W - R - 1e-6; k++) {
      const v = `M${(L + k * minor).toFixed(1)} ${y0.toFixed(1)}V${y1.toFixed(1)}`;
      if (k % 5) fine += v;
      else bold += v;
    }
    for (let k = 1; y1 - k * minor > y0 + 1e-6; k++) {
      const h = `M${L} ${(y1 - k * minor).toFixed(1)}H${COURSE_W - R}`;
      if (k % 5) fine += h;
      else bold += h;
    }
  };
  if (moments.length) paper(0, eH);
  lanes.forEach((_, i) => paper(laneTop(i), laneTop(i) + LANE_H));
  if (mks.length) paper(mTop, mTop + mH);
  const grid = `<path class="db-paper" d="${fine}"/><path class="db-paper db-paper-b" d="${bold}"/>`;

  const bands = lanes.map((_, i) => spans.map(([a, b]) => `<rect class="db-pulseless" x="${x(a).toFixed(1)}" y="${laneTop(i).toFixed(1)}" width="${Math.max(1, x(b) - x(a)).toFixed(1)}" height="${LANE_H.toFixed(1)}" fill="#e9e9e9"/>`).join('')).join('');
  // each band's label over the lines, on a patch of the band's own grey, at the last panel's foot
  const bandLabels = spans.map(([a, b]) => {
    const text = `pulseless ${span(b - a)}`;
    return `<g class="db-pulseless-l"><rect x="${(x(a) + 1).toFixed(1)}" y="${(bottom - 12).toFixed(1)}" width="${(text.length * 4.7 + 4).toFixed(1)}" height="11" fill="#e9e9e9"/>`
      + `<text x="${(x(a) + 3).toFixed(1)}" y="${(bottom - 3).toFixed(1)}">${text}</text></g>`;
  }).join('');

  // each panel: its scale from the frame's foot to its top (`panelScale`), its labels at the two edges
  const rows = lanes.map((k, i) => {
    const m = trendMeta(k);
    const y0 = laneTop(i), y1 = y0 + LANE_H;
    const vals = d.samples.map((s) => s[k]).filter((v): v is number => v !== null);
    const [lo, hi] = panelScale(k, Math.min(...vals), Math.max(...vals));
    const path = tracePath(d, k, x, (v) => y0 + (1 - (v - lo) / (hi - lo)) * (y1 - y0));
    const f = (v: number) => v.toFixed(m.digits);
    return `<g class="db-lane" data-trend="${k}" data-lo="${lo}" data-hi="${hi}">`
      + `<text x="4" y="${(y0 + 11).toFixed(1)}" class="db-lane-l">${esc(m.label)}</text><text x="4" y="${(y0 + 22).toFixed(1)}" class="unit">${esc(m.unit)}</text>`
      + `<text x="${L - 4}" y="${(y0 + 7).toFixed(1)}" text-anchor="end">${f(hi)}</text><text x="${L - 4}" y="${y1.toFixed(1)}" text-anchor="end">${f(lo)}</text>`
      + `<path d="${path}" fill="none" stroke="#000"/></g>`;
  }).join('');

  // the time labels, each between two short dashes: one down from the last panel's foot, its mirror up from the
  // marks row's top edge (outside the row)
  const step = [60, 120, 300, 600, 900, 1800, 3600].find((st) => end / st <= 8) ?? 3600;
  let ticks = '';
  for (let t = 0; t <= end; t += step) {
    const tx = x(t).toFixed(1);
    ticks += `<line x1="${tx}" x2="${tx}" y1="${bottom.toFixed(1)}" y2="${(bottom + 4).toFixed(1)}"/><text x="${tx}" y="${(bottom + AXIS - 3).toFixed(1)}" text-anchor="middle">${mmss(t)}</text>`
      + `<line x1="${tx}" x2="${tx}" y1="${(mTop - 4).toFixed(1)}" y2="${mTop.toFixed(1)}"/>`;
  }

  // the events row: each moment a down arrow with its number inside, its tip on a short leader to the moment (slanted
  // when arrows that would meet are moved apart, UI review #19), the dotted line on down through the panels
  const placed = placeBadges(moments.map((mo) => x(mo.t)), L + ARROW.w / 2, COURSE_W - R - ARROW.w / 2, ARROW.w + 2);
  const badges = moments.map((mo, i) => {
    const at = x(mo.t);
    const bx = placed[i] as number;
    const c = mo.who === 'team' ? TEAM : mo.who === 'patient' ? PATIENT : SCENARIO;
    const y0 = (eH - ARROW.h) / 2 - 1, tip = y0 + ARROW.h;
    const arrow = `<polygon class="db-arrow" points="${(bx - ARROW.w / 2).toFixed(1)},${y0.toFixed(1)} ${(bx + ARROW.w / 2).toFixed(1)},${y0.toFixed(1)} ${bx.toFixed(1)},${tip.toFixed(1)}" fill="${mo.who === 'scenario' ? 'none' : c}" stroke="${c}" stroke-linejoin="round"/>`;
    const num = `<text x="${bx.toFixed(1)}" y="${(y0 + ARROW.font * 0.85).toFixed(1)}" text-anchor="middle" class="db-badge-n db-arrow-n">${mo.n}</text>`;
    return `<g class="db-badge db-${mo.who}" data-n="${mo.n}" data-t="${mo.t}"><line x1="${bx.toFixed(1)}" x2="${at.toFixed(1)}" y1="${tip.toFixed(1)}" y2="${eH.toFixed(1)}" stroke="${c}"/>`
      + `<line class="db-ev-line" x1="${at.toFixed(1)}" x2="${at.toFixed(1)}" y1="${eH.toFixed(1)}" y2="${bottom.toFixed(1)}" stroke="${c}" stroke-dasharray="1.5 2.5"/>${arrow}${num}</g>`;
  }).join('');

  // the marks row: each icon's visual body centred in the row and on its time (moved apart by an icon's width and 2
  // when two would meet), white inside, its number inside with a white halo, a line up to the row's top edge at the
  // time (slanted when moved); an undone mark grey and struck, as the Bookmarks list strikes it
  const mx = placeBadges(mks.map((mk) => x(mk.t)), L + MARK_ICON / 2, COURSE_W - R - MARK_ICON / 2, MARK_ICON + 2);
  const sc = MARK_ICON / 24;
  const mid = mTop + mH / 2;
  const markGlyphs = mks.map((mk, i) => {
    const at = x(mk.t), gx = mx[i] as number;
    const [bx, by] = MARK_BODY[mk.kind] ?? [12, 12];
    const ox = gx - bx * sc, oy = mid - by * sc; // the icon's 24-unit box, placed so its body sits on (gx, mid)
    const [nx, ny] = MARK_NUM[mk.kind] ?? [12, 13];
    const lead = `<line class="db-bm-lead" x1="${at.toFixed(1)}" x2="${gx.toFixed(1)}" y1="${mTop.toFixed(1)}" y2="${(oy + (MARK_TOP[mk.kind] ?? 3) * sc).toFixed(1)}"/>`;
    const strike = mk.undone ? `<line class="db-bm-x" x1="${(ox - 1).toFixed(1)}" x2="${(ox + MARK_ICON + 1).toFixed(1)}" y1="${(oy + MARK_ICON).toFixed(1)}" y2="${oy.toFixed(1)}"/>` : '';
    return `<g class="db-bm${mk.undone ? ' undone' : ''}" data-kind="${esc(mk.kind)}" data-n="${mk.n}" data-t="${mk.t}"><title>${esc(mk.title)}</title>${lead}`
      + `<path transform="translate(${ox.toFixed(1)} ${oy.toFixed(1)}) scale(${sc})" d="${esc(mk.icon)}" fill="#fff"/>`
      + `<text class="db-bm-n" x="${(ox + nx * sc).toFixed(1)}" y="${(oy + ny * sc).toFixed(1)}" text-anchor="middle">${mk.n}</text>${strike}</g>`;
  }).join('');

  const label = `The course, ${mmss(0)} to ${mmss(end)}${moments.length ? `: ${moments.map((m) => `${m.n} at ${mmss(m.t)}, ${m.who}, ${m.text}`).join('; ')}` : ''}${mks.length ? `; marks: ${mks.map((mk) => mk.title).join('; ')}` : ''}`;
  return `<svg class="db-course-svg" viewBox="0 0 ${COURSE_W} ${H.toFixed(1)}" role="img" aria-label="${esc(label)}">`
    + `${bands}${grid}${rows}<g class="ticks">${ticks}</g>${bandLabels}${badges}${markGlyphs}</svg>`;
}
