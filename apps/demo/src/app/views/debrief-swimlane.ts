// The Debrief's swimlane, "The run, lane by lane" (Debrief 2, D7a): the run on one time axis as an SVG string (no DOM
// state), lanes top to bottom, each named in words at its left: Patient (the patient's key moments, ● vermillion, and
// the pulseless band in grey, as the course strip draws it; a scenario state □ outlined grey), Team (the team's key
// moments, ■ blue, the recognition ◇ outlined), Expected windows (one thin row per timed action: its window from the
// anchor to the deadline as a band, open to the run's end when the deadline is beyond it, the act as a tick inside or
// outside it — each repeat its own — with the verdict's glyph and words beside the tick; an act that never came has no
// tick and its words at the deadline), Monitor alarms (one bar per raise, from the raise to the end of its condition,
// open to the run's end when it has none, a small ring where it was acknowledged; a record that did not keep alarm
// ends draws each raise as a tick, and the lane says "end not recorded") and Drugs and fluids (one ▲ per kept drug or
// fluid row). No pressures lane (DQ11, ruled 5 November). A lane with nothing in this record is left out, except
// Patient and Team. No colour without a shape (E45): the two accents only on the moments' shapes; a window band and its
// tick carry the verdict as the objectives' chips do (Decision 13): solid, bold, dashed grey, grey fill.
// The windows are one reading each, never a second bookkeeping (`windowsOf`): a pme-scenario/2 run's from
// `report3(d).actions` (grade()'s own `dueT`, `windowS`, `givenT`, `repeats`), a /1 run's from its `eventWithin`
// verdicts (`Verdict.window`, `measure`); this file computes no window of its own.
import { endOf, mmss, objectives, report3, span, type Status } from '../debrief.ts';
import { pulselessSpans, type KeyMoment } from '../debrief-moments.ts';
import { placeBadges } from './debrief-course.ts';
import type { Grade } from '@pme/controller/scenario';
import type { Row, RunData } from '../record.ts';

/** The four verdict styles of the objectives' chips (E43; `views/debrief.css` `.db-chip`). */
export type Mark = 'observed' | 'not-observed' | 'not-assessable' | 'discuss';
/** A /1 verdict's ruled words with their glyph (E42, Decision 11) and its chip style. */
export function verdictMark(status: Status, discuss = false): { mark: Mark; words: string } {
  if (status === 'met') return { mark: 'observed', words: '✓ Observed' };
  if (status === 'not met') return discuss ? { mark: 'discuss', words: '◆ Discuss' } : { mark: 'not-observed', words: '✗ Not observed' };
  return { mark: 'not-assessable', words: '– Not assessable' };
}
/** A /2 action's grade words (grade.ts `Grade`), each with a glyph so no colour is needed to read it. */
export const GRADE_WORDS: Readonly<Record<Grade, string>> = { met: '✓ met', deviation: '◆ deviation', overdue: '! overdue', failed: '✗ failed', due: '… due', 'not applicable': '– not applicable' };
/** A grade's chip style on the swimlane (Decision 13): met solid; a deviation grey fill, as Discuss; overdue and failed
 *  bold, as Not observed; due and not applicable dashed grey, as Not assessable. */
const GRADE_MARK: Readonly<Record<Grade, Mark>> = { met: 'observed', deviation: 'discuss', overdue: 'not-observed', failed: 'not-observed', due: 'not-assessable', 'not applicable': 'not-assessable' };

/** A timed action's expected window: its row's words, the band (`fromT` → `toT`, the deadline; null: no deadline,
 *  open to the end), its acts (a tick each, with the verdict) and, when the act never came, the verdict at the deadline. */
export interface SwimWindow {
  label: string;
  fromT: number;
  toT: number | null;
  /** The band's style: the first act's verdict (the row's own verdict when no act came). */
  mark: Mark;
  ticks: Array<{ t: number; mark: Mark; words: string; repeat?: number }>;
  /** The verdict where no act came: at the deadline (or the run's end). */
  missed?: { mark: Mark; words: string };
  /** A repeat graded with no act of its own (`/2`): its words at the row's end. */
  open?: Array<{ n: number; mark: Mark; words: string }>;
}

/** The expected windows of a run, one per timed action, read once: a /2 run's from `report3(d).actions` (an action with
 *  no `dueT` draws no band), a /1 run's from its objectives' `eventWithin` verdicts whose anchor was found
 *  (`Verdict.window`). Its label: the action's (/2), "Objective n" (/1, its place in the card's list). */
export function windowsOf(d: RunData): SwimWindow[] {
  const r3 = report3(d);
  if (r3) {
    return r3.actions.flatMap((a): SwimWindow[] => {
      if (a.dueT === null) return [];
      const first = { mark: GRADE_MARK[a.firstGrade], words: GRADE_WORDS[a.firstGrade] };
      const reps = a.repeats.map((x) => ({ n: x.n, t: x.t, mark: GRADE_MARK[x.grade], words: `${GRADE_WORDS[x.grade]} (repeat ${x.n})` }));
      const open = reps.filter((x) => x.t === null).map(({ n, mark, words }) => ({ n, mark, words }));
      return [{
        label: a.label, fromT: a.dueT, toT: a.windowS === null ? null : a.dueT + a.windowS, mark: first.mark,
        ticks: [...(a.givenT === null ? [] : [{ t: a.givenT, ...first }]), ...reps.flatMap((x) => (x.t === null ? [] : [{ t: x.t, mark: x.mark, words: x.words, repeat: x.n }]))],
        ...(a.givenT === null ? { missed: first } : {}),
        ...(open.length ? { open } : {}),
      }];
    });
  }
  return objectives(d).flatMap((o, i): SwimWindow[] => {
    const w = o.verdict.window;
    if (!w) return [];
    const v = verdictMark(o.verdict.status, o.discuss);
    const t = o.verdict.measure?.toT;
    return [{ label: `Objective ${i + 1}`, fromT: w.fromT, toT: w.fromT + w.askedS, mark: v.mark, ticks: t === undefined ? [] : [{ t, ...v }], ...(t === undefined ? { missed: v } : {}) }];
  });
}

export interface SwimOptions {
  /** The recognition's time (the one reading of it), drawn ◇ on the Team lane; absent: none recorded. */
  recognisedT?: number;
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const TEAM = '#0072B2';
const PATIENT = '#D55E00';
const SCENARIO = '#767676';
/** The swimlane's drawing units: 4 per mm of the 182 mm content width (as the course strip), so 360 units are 90 mm. */
export const SWIM_W = 728;
/** L: the label column (an action's label up to `LABEL_MAX` characters at 8 units); R: the right margin; AXIS: the time
 *  labels under the last lane. */
const L = 140, R = 10, AXIS = 16;
const PLOT = SWIM_W - L - R;
/** Lane heights (units): a moments lane (its number over its shape), a window row (≤ six windows: 5 mm; more: 3 mm),
 *  an alarm track, the drugs lane; the gap between lanes. */
const MOMENTS_H = 26, WIN_H = 20, WIN_H_TIGHT = 12, WIN_TIGHT_FROM = 7, TRACK_H = 11, DRUGS_H = 16, GAP = 4, WIN_HEAD = 12;
/** A label longer than this is cut with "…" (its whole words in the title, shown on hover, and in the aria-label). */
const LABEL_MAX = 30;
/** Moment numbers: centres at least this far apart (a two-digit number at 8 units and a gap). */
const NUM_GAP = 11;
/** The rough width of a character of the 8-unit labels (an alarm's words take room on its track). */
const CHAR_W = 4.2;
/** The chip styles (debrief.css `.db-chip`): stroke, its width and dash, and the fill. */
const STYLE: Readonly<Record<Mark, { stroke: string; w: number; dash?: string; fill: string }>> = {
  observed: { stroke: '#000', w: 1, fill: '#fff' },
  'not-observed': { stroke: '#000', w: 2.2, fill: '#fff' },
  'not-assessable': { stroke: '#767676', w: 1, dash: '3 2', fill: '#fff' },
  discuss: { stroke: '#000', w: 1, fill: '#ececec' },
};
const cut = (s: string): string => (s.length > LABEL_MAX ? `${s.slice(0, LABEL_MAX - 1).trimEnd()}…` : s);

/** The swimlane of a run as an SVG string: `moments` are the key moments (`keyMoments`), `windows` the run's expected
 *  windows (`windowsOf`). */
export function swimlaneSvg(d: RunData, moments: KeyMoment[], windows: SwimWindow[], o: SwimOptions = {}): string {
  const end = Math.max(endOf(d), 1);
  const x = (t: number): number => L + (Math.min(Math.max(t, 0), end) / end) * PLOT;
  const f = (v: number): string => v.toFixed(1);
  const rows = d.rows.filter((r) => r.undone === undefined);
  const alarms = rows.filter((r) => r.kind === 'alarm');
  const meds = rows.filter((r) => r.ev?.startsWith('drug:') || r.ev === 'fluid');
  const endsKept = !!d.keeps?.includes('alarmEnd');
  let y = 2;
  let out = '';
  let bgs = ''; // each lane's background, under the minute lines
  const lanes: string[] = [];
  /** A lane: its words at the left (a second line under them when given), its body. */
  const lane = (id: string, h: number, words: string, body: string, sub = ''): void => {
    lanes.push(id);
    bgs += `<rect class="db-swim-bg" fill="#f4f4f4" x="${L}" y="${f(y)}" width="${PLOT}" height="${f(h)}"/>`;
    out += `<g class="db-swim-lane" data-lane="${id}">`
      + `<text class="db-swim-l" x="${L - 6}" y="${f(y + Math.min(h / 2 + 3, 13))}" text-anchor="end">${esc(words)}</text>`
      + `${sub ? `<text class="db-swim-sub" x="${L - 6}" y="${f(y + Math.min(h / 2 + 3, 13) + 9)}" text-anchor="end">${esc(sub)}</text>` : ''}${body}</g>`;
    y += h + GAP;
  };

  // Patient: the pulseless band, the patient's moments ●, a scenario state □
  const spans = pulselessSpans(d);
  /** A lane's moments: each shape at its time, its number above it, numbers that would meet moved apart (the course
   *  strip's `placeBadges`), so 5 and 7 a second apart never read "57". */
  const momentsAt = (ms: KeyMoment[], top: number, shape: (m: KeyMoment) => string): string => {
    const nx = placeBadges(ms.map((m) => x(m.t)), L + NUM_GAP / 2, SWIM_W - R - NUM_GAP / 2, NUM_GAP);
    return ms.map((m, i) => `<g class="db-swim-m db-${m.who}" data-n="${m.n}" data-t="${m.t}"><title>${esc(`${m.n} · ${mmss(m.t)} ${m.text}`)}</title>${shape(m)}`
      + `<text class="db-swim-n" x="${f(nx[i] as number)}" y="${f(top + 8)}" text-anchor="middle">${m.n}</text></g>`).join('');
  };
  {
    const top = y, cy = top + 17;
    const band = spans.map(([a, b]) => `<rect class="db-pulseless" x="${f(x(a))}" y="${f(top)}" width="${f(Math.max(1, x(b) - x(a)))}" height="${MOMENTS_H}" fill="#e9e9e9"/>`
      + `<text class="db-swim-sub" x="${f(x(a) + 2)}" y="${f(top + 8)}">pulseless ${span(b - a)}</text>`).join('');
    const ms = momentsAt(moments.filter((m) => m.who !== 'team'), top, (m) => (m.who === 'patient'
      ? `<circle cx="${f(x(m.t))}" cy="${f(cy)}" r="4.5" fill="${PATIENT}"/>`
      : `<rect x="${f(x(m.t) - 4)}" y="${f(cy - 4)}" width="8" height="8" fill="#fff" stroke="${SCENARIO}"/>`));
    lane('patient', MOMENTS_H, 'Patient', band + ms);
  }
  // Team: the team's moments ■, the recognition ◇ (on its moment when one is at its time)
  {
    const top = y, cy = top + 17;
    const diamond = (t: number) => `<polygon class="db-swim-rec" points="${f(x(t))},${f(cy - 6)} ${f(x(t) + 6)},${f(cy)} ${f(x(t))},${f(cy + 6)} ${f(x(t) - 6)},${f(cy)}" fill="#fff" stroke="${TEAM}" stroke-width="1.6"/>`;
    const team = moments.filter((m) => m.who === 'team');
    const ms = momentsAt(team, top, (m) => (m.t === o.recognisedT ? diamond(m.t) : `<rect x="${f(x(m.t) - 4)}" y="${f(cy - 4)}" width="8" height="8" fill="${TEAM}"/>`));
    const rec = o.recognisedT !== undefined && !team.some((m) => m.t === o.recognisedT)
      ? `<g class="db-swim-m db-team" data-recognised="${o.recognisedT}"><title>${esc(`Recognised ${mmss(o.recognisedT)}`)}</title>${diamond(o.recognisedT)}</g>` : '';
    lane('team', MOMENTS_H, 'Team', ms + rec);
  }
  // Expected windows: one row each, the band, the ticks, the words
  if (windows.length) {
    const rh = windows.length >= WIN_TIGHT_FROM ? WIN_H_TIGHT : WIN_H;
    const head = y; // the lane's words on a line of their own, the rows' labels under them in the same column
    const top = y + WIN_HEAD;
    const body = windows.map((w, i) => {
      const y0 = top + i * rh, mid = y0 + rh / 2, bh = rh - 4;
      const s = STYLE[w.mark];
      const to = w.toT ?? end;
      const openEnd = to > end; // the deadline beyond the run: the band runs open to the end
      const bx = x(w.fromT), bw = Math.max(1, x(to) - bx);
      const dash = s.dash ? ` stroke-dasharray="${s.dash}"` : '';
      const band = `<rect class="db-swim-band${openEnd || w.toT === null ? ' open' : ''}" data-from="${w.fromT}" data-to="${w.toT ?? ''}" x="${f(bx)}" y="${f(y0 + 2)}" width="${f(bw)}" height="${f(bh)}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.w}"${dash}/>`;
      const word = (t: number, words: string, k: Mark): string => {
        const tx = x(t);
        const right = tx + 4 + words.length * CHAR_W <= SWIM_W - R;
        return `<text class="db-swim-v" data-mark="${k}" x="${f(right ? tx + 4 : tx - 4)}" y="${f(mid + 3)}" text-anchor="${right ? 'start' : 'end'}">${esc(words)}</text>`;
      };
      const ticks = w.ticks.map((k) => {
        const ts = STYLE[k.mark];
        return `<g class="db-swim-tick" data-t="${k.t}" data-mark="${k.mark}"${k.repeat ? ` data-repeat="${k.repeat}"` : ''}><line x1="${f(x(k.t))}" x2="${f(x(k.t))}" y1="${f(y0 + 1)}" y2="${f(y0 + rh - 1)}" stroke="#000" stroke-width="${Math.max(1.4, ts.w)}"/>${word(k.t, k.words, k.mark)}</g>`;
      }).join('');
      const missed = w.missed ? `<g class="db-swim-missed" data-mark="${w.missed.mark}">${word(Math.min(to, end), w.missed.words, w.missed.mark)}</g>` : '';
      const open = (w.open ?? []).map((r) => `<g class="db-swim-missed" data-mark="${r.mark}" data-repeat="${r.n}">${word(end, r.words, r.mark)}</g>`).join('');
      return `<g class="db-swim-win" data-mark="${w.mark}"><title>${esc(w.label)}</title><text class="db-swim-wl" x="${L - 6}" y="${f(mid + 3)}" text-anchor="end">${esc(cut(w.label))}</text>${band}${ticks}${missed}${open}</g>`;
    }).join('');
    const h = windows.length * rh;
    lanes.push('windows');
    bgs += `<rect class="db-swim-bg" fill="#f4f4f4" x="${L}" y="${f(top)}" width="${PLOT}" height="${f(h)}"/>`;
    out += `<g class="db-swim-lane" data-lane="windows"><text class="db-swim-l" x="${L - 6}" y="${f(head + 9)}" text-anchor="end">Expected windows</text>${body}</g>`;
    y = top + h + GAP;
  }
  // Monitor alarms: each raise a bar to its end on the first track it fits (its words after its start)
  if (alarms.length) {
    const tracks: number[] = []; // each track's right edge so far
    const bars = alarms.map((a) => {
      const words = a.text;
      const x0 = x(a.t);
      const x1 = endsKept ? x(a.endT ?? end) : x0;
      const right = Math.max(x1, x0 + 3 + words.length * CHAR_W) + 4;
      let k = tracks.findIndex((r) => r <= x0);
      if (k < 0) k = tracks.push(0) - 1;
      tracks[k] = right;
      return { a, words, x0, x1, k };
    });
    const top = y;
    const body = bars.map(({ a, words, x0, x1, k }) => {
      const y0 = top + k * TRACK_H, mid = y0 + TRACK_H / 2;
      const open = endsKept && a.endT === undefined;
      const bar = endsKept
        ? `<rect class="db-swim-alarm${open ? ' open' : ''}" x="${f(x0)}" y="${f(mid - 1.5)}" width="${f(Math.max(1.5, x1 - x0))}" height="3" fill="#000"/>`
        : '';
      const tick = `<line x1="${f(x0)}" x2="${f(x0)}" y1="${f(y0 + 1)}" y2="${f(y0 + TRACK_H - 1)}" stroke="#000" stroke-width="1.2"/>`;
      const ack = endsKept && a.ackT !== undefined ? `<circle class="db-swim-ack" cx="${f(x(a.ackT))}" cy="${f(mid)}" r="2.6" fill="#fff" stroke="#000" stroke-width="1"/>` : '';
      const title = `${words} ${mmss(a.t)}${endsKept ? (a.endT !== undefined ? ` ▸ ${mmss(a.endT)}` : ' ▸ (still on)') : ''}${endsKept && a.ackT !== undefined ? ` · acknowledged ${mmss(a.ackT)}` : ''}`;
      return `<g class="db-swim-a" data-t="${a.t}"${a.endT !== undefined && endsKept ? ` data-end="${a.endT}"` : ''}${a.ackT !== undefined && endsKept ? ` data-ack="${a.ackT}"` : ''}><title>${esc(title)}</title>${bar}${tick}${ack}`
        + `<text class="db-swim-at" x="${f(x0 + 3)}" y="${f(mid - 2)}">${esc(words)}</text></g>`;
    }).join('');
    lane('monitor', Math.max(tracks.length * TRACK_H, 22), 'Monitor alarms', body, endsKept ? '' : 'end not recorded');
  }
  // Drugs and fluids: one ▲ each
  if (meds.length) {
    const top = y, base = top + DRUGS_H - 3;
    const body = meds.map((r: Row) => `<g class="db-swim-d" data-t="${r.t}"><title>${esc(`${mmss(r.t)} ${r.text}`)}</title>`
      + `<polygon points="${f(x(r.t) - 4.5)},${f(base)} ${f(x(r.t) + 4.5)},${f(base)} ${f(x(r.t))},${f(base - 9)}" fill="#000"/></g>`).join('');
    lane('drugs', DRUGS_H, 'Drugs and fluids', body);
  }
  // the minutes: a faint line through every lane, the label under the last
  const bottom = y - GAP;
  const step = [60, 120, 300, 600, 900, 1800, 3600].find((st) => end / st <= 12) ?? 3600;
  let ticks = '';
  for (let t = 0; t <= end; t += step) ticks += `<line class="db-swim-grid" stroke="#bbb" x1="${f(x(t))}" x2="${f(x(t))}" y1="2" y2="${f(bottom + 3)}"/><text x="${f(x(t))}" y="${f(bottom + AXIS - 4)}" text-anchor="middle">${mmss(t)}</text>`;
  const H = bottom + AXIS;

  const winWords = windows.map((w) => `${w.label}, ${mmss(w.fromT)} to ${w.toT === null ? 'the end' : mmss(w.toT)}: ${[
    ...w.ticks.map((k) => `${mmss(k.t)} ${k.words}`), ...(w.missed ? [`no act, ${w.missed.words}`] : []), ...(w.open ?? []).map((r) => `no act, ${r.words}`),
  ].join(', ')}`);
  const label = `The run, lane by lane, ${mmss(0)} to ${mmss(end)}; lanes: ${lanes.join(', ')}`
    + `${windows.length ? `; expected windows: ${winWords.join('; ')}` : ''}`
    + `${alarms.length ? `; ${alarms.length} alarm ${alarms.length === 1 ? 'raise' : 'raises'}${endsKept ? '' : ' (end not recorded)'}` : ''}`
    + `${meds.length ? `; ${meds.length} ${meds.length === 1 ? 'drug or fluid' : 'drugs and fluids'}` : ''}`;
  return `<svg class="db-swim-svg" viewBox="0 0 ${SWIM_W} ${f(H)}" role="img" aria-label="${esc(label)}">${bgs}<g class="ticks">${ticks}</g>${out}</svg>`;
}
