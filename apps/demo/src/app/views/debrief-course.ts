// The Debrief's course strip: the run on one time axis as an SVG string (no DOM state). It draws the trends HR, MAP,
// SpO₂ and EtCO₂ as small multiples (E56), with the numbered key moments as badges (■ team in blue, ● patient in
// vermillion, □ an open grey square for a scenario state; the numbers are those of the key-moments table), a grey band
// over each pulseless span, and the instructor's marks (every bookmark of the run: the dock's good / bad / discuss
// flags with the dock's own icons, a plain bookmark as a ribbon) in rows above the badges, each with a thin tick down
// to the axis at its time. Every line is what the monitor showed: the SpO₂ line breaks where the oximeter showed its
// dash and runs through the compression-generated reading during CPR (E126; E60 broke it over the whole band). A trend
// never measured is left out. The legend is the view's.
import { axisRange, endOf, mmss, span, trendMeta } from '../debrief.ts';
import { pulselessSpans, type KeyMoment } from '../debrief-moments.ts';
import type { RunData, TrendKey } from '../record.ts';

export interface CourseOptions {
  trends: TrendKey[];
  /** The learner handout's copy: the same strip, labelled as the learner's run. */
  learner?: boolean;
  /** The instructor's marks (the run's bookmark rows), drawn at their times; none on the learner's copy. */
  marks?: CourseMark[];
}

/** A mark on the strip: its time, its kind (the dock's `good` / `bad` / `discuss`, or `bookmark` for a plain one),
 *  its label, the words of the Bookmarks list (its title, shown on hover), whether a return undid it, and its icon (a
 *  24-unit path, the dock's own). */
export interface CourseMark { t: number; kind: string; label: string; title: string; undone: boolean; icon: string }

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const TEAM = '#0072B2';
const PATIENT = '#D55E00';
const SCENARIO = '#767676';
/** The strip's drawing units: 4 per mm of the 182 mm content width, so height ≤ 320 is ≤ 80 mm. */
export const COURSE_W = 728;
/** L: the label column (rc.3: 108, was 92, so "ART M / NIBP M" in bold clears its scale values). */
const L = 108, R = 10, BADGES = 24, GAP = 4, AXIS = 18;
/** A trend's lane height. The learner's copy prints at the full 182 mm width so its 9-unit labels read at 6.4 pt
 *  (rc.3; at 90 mm they were ≈ 3.2 pt), with lanes about half as tall so the strip stays ≈ 40 mm high. */
const LANE = 46, LANE_LEARNER = 26;
/** Badge centres are at least this far apart (drawing units): a 14-unit badge, a two-digit bold number inside, and a
 *  clear gap (UI review #19: at 15 the MH badges 9–12 touched). */
const BADGE_MIN = 18;
/** Half a badge: no badge centre nearer the plot's edges than this (the haemorrhage's 18 and 19 ran past the right). */
const BADGE_HALF = 7;
/** A row of mark glyphs (10-unit icons) above the badges (row 0 over their top margin, its glyphs ending 1 unit above
 *  them), so a mark never covers a key moment's badge; a mark whose glyph or printed label would meet an earlier one's
 *  goes a row up (at most MARK_ROWS rows: page 1 of the printed report keeps within one A4 page). */
const MARK_ROW = 12, MARK_ROWS = 2, MARK_ICON = 10, MARK_TOP = -6;
/** A printed label's width in drawing units (8-unit text, ≈ 4.4 per character) after the glyph. */
const labelW = (s: string): number => MARK_ICON / 2 + 3 + s.length * 4.4;

/** Is a mark's label printed left of its glyph (it would run past the strip's right edge)? */
const labelLeft = (x: number, label: string): boolean => x + labelW(label) > COURSE_W - 2;
/** The row of each mark (marks sorted by time, at plot positions `at`): the lowest row whose last glyph and label end
 *  before this one's start; when none, the row that ends first. */
function markRows(at: readonly number[], labels: readonly string[]): number[] {
  const ends: number[] = [];
  return at.map((x, i) => {
    const l = labels[i] as string;
    const left = labelLeft(x, l);
    const from = (left ? x - labelW(l) : x - MARK_ICON / 2) - 2;
    let r = ends.findIndex((e) => e <= from);
    if (r < 0) r = ends.length < MARK_ROWS ? ends.length : ends.indexOf(Math.min(...ends));
    ends[r] = left ? x + MARK_ICON / 2 : x + labelW(l);
    return r;
  });
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

/** The course strip of a run as an SVG string. */
export function courseSvg(d: RunData, moments: KeyMoment[], o: CourseOptions): string {
  const end = Math.max(endOf(d), 1);
  const spans = pulselessSpans(d);
  const lanes = o.trends.filter((k) => d.samples.some((s) => s[k] !== null));
  const LANE_H = o.learner ? LANE_LEARNER : LANE;
  const mks = [...(o.marks ?? [])].sort((a, b) => a.t - b.t);
  const x = (t: number) => L + (t / end) * (COURSE_W - L - R);
  const rowOf = markRows(mks.map((mk) => x(mk.t)), mks.map((mk) => mk.label));
  // the marks' rows sit above the badges: everything else moves down by their height (none without marks)
  const MK = mks.length ? -MARK_TOP + Math.max(...rowOf) * MARK_ROW + 1 : 0;
  const H = MK + BADGES + lanes.length * (LANE_H + GAP) + AXIS;
  const top = BADGES, bottom = BADGES + lanes.length * (LANE_H + GAP);

  const bands = spans.map(([a, b]) => `<rect class="db-pulseless" x="${x(a).toFixed(1)}" y="${top}" width="${Math.max(1, x(b) - x(a)).toFixed(1)}" height="${bottom - top}" fill="#e9e9e9"/>`).join('');
  // each band's label over the lines, on a patch of the band's own grey
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
    const y = (v: number) => y0 + (1 - (v - lo) / (hi - lo)) * (y1 - y0);
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

  // a mark: its tick from its glyph to the axis (under the lanes' lines and the badges), its icon, its label (printed;
  // on screen the title shows on hover); an undone one grey and struck through, as the Bookmarks list strikes it
  const markTicks = mks.map((mk, i) => {
    const at = x(mk.t).toFixed(1);
    return `<line class="db-bm-t${mk.undone ? ' undone' : ''}" data-t="${mk.t}" x1="${at}" x2="${at}" y1="${(MARK_TOP - (rowOf[i] as number) * MARK_ROW + MARK_ICON + 1).toFixed(1)}" y2="${bottom}"/>`;
  }).join('');
  const markGlyphs = mks.map((mk, i) => {
    const at = x(mk.t);
    const gy = MARK_TOP - (rowOf[i] as number) * MARK_ROW; // row 0 just above the badges, row 1 over it
    const half = MARK_ICON / 2 + 1;
    const strike = mk.undone ? `<line class="db-bm-x" x1="${(at - half).toFixed(1)}" x2="${(at + half).toFixed(1)}" y1="${(gy + MARK_ICON).toFixed(1)}" y2="${gy.toFixed(1)}"/>` : '';
    return `<g class="db-bm${mk.undone ? ' undone' : ''}" data-kind="${esc(mk.kind)}" data-t="${mk.t}"><title>${esc(mk.title)}</title>`
      + `<rect x="${(at - half).toFixed(1)}" y="${(gy - 1).toFixed(1)}" width="${2 * half}" height="${MARK_ICON + 2}" fill="#fff"/>`
      + `<path transform="translate(${(at - MARK_ICON / 2).toFixed(1)} ${gy.toFixed(1)}) scale(${MARK_ICON / 24})" d="${esc(mk.icon)}" fill="none"/>${strike}`
      + (labelLeft(at, mk.label)
        ? `<text class="db-bm-l" x="${(at - MARK_ICON / 2 - 3).toFixed(1)}" y="${(gy + 8).toFixed(1)}" text-anchor="end">${esc(mk.label)}</text></g>`
        : `<text class="db-bm-l" x="${(at + MARK_ICON / 2 + 3).toFixed(1)}" y="${(gy + 8).toFixed(1)}">${esc(mk.label)}</text></g>`);
  }).join('');

  const label = `${o.learner ? 'Your run' : 'The course'}, ${mmss(0)} to ${mmss(end)}${moments.length ? `: ${moments.map((m) => `${m.n} at ${mmss(m.t)}, ${m.who}, ${m.text}`).join('; ')}` : ''}${mks.length ? `; marks: ${mks.map((mk) => mk.title).join('; ')}` : ''}`;
  const body = `${bands}${markTicks}${rows}<line class="axis" x1="${L}" x2="${COURSE_W - R}" y1="${bottom}" y2="${bottom}"/><g class="ticks">${ticks}</g>${bandLabels}${badges}${markGlyphs}`;
  return `<svg class="db-course-svg${o.learner ? ' learner' : ''}" viewBox="0 0 ${COURSE_W} ${H}" role="img" aria-label="${esc(label)}">`
    + `${MK ? `<g transform="translate(0 ${MK})">${body}</g>` : body}</svg>`;
}
