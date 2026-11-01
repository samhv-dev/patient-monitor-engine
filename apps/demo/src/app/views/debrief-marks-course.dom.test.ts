// @vitest-environment happy-dom
// The owner's course strip of 1–2 November, on the A3.1 tamponade record (11:29): the events (the numbered key moments)
// as down arrows in a row at the top; each vital in its own panel one big square high on ECG paper (a big square one
// minute of the time axis here), its scale rounded outward to fives; no axis line; the time labels between two dashes;
// the instructor's marks at the bottom: the dock's icon, white inside, the mark's number inside (the marks in time
// order, as the Bookmarks list numbers them), a line up to the row's top at the time, no words (the title on hover); an
// undone mark struck as the list strikes it; the learner handout's strip as it was, without marks. The record's own
// session-bar bookmark (00:13) is taken out and two marks put in: a bad one a return undid, and a discuss one with a
// note 2 s after key moment 2.
import type { ScenarioDoc } from '@pme/controller/scenario';
import { afterEach, describe, expect, it } from 'vitest';
import a31 from '../../../../../docs/showcase/kit-round-a/fa/debrief-a3-tamponade-cue-card-path-kit-round-chromium.json';
import { keyMoments } from '../debrief-moments.ts';
import { endOf } from '../debrief.ts';
import type { Link } from '../link.ts';
import { emptyRun, type RunData } from '../record.ts';
import type { AppSession } from '../session.ts';
import tamponade from '../showcase/showcase-tamponade.json';
import { MARKS } from '../teach2/dock.ts';
import { COURSE_W, courseSvg, gridMajorS, panelScale } from './debrief-course.ts';
import { debriefView } from './debrief.ts';

const TRENDS = ['hr', 'map', 'spo2', 'etco2'] as const;
const LEGEND = '▼ team action · ▼ patient event · ▽ scenario state · numbers match Key moments';
const run = (): RunData => {
  const d = structuredClone(a31.record) as unknown as RunData;
  (d.doc as ScenarioDoc).objectives = structuredClone((tamponade as unknown as ScenarioDoc).objectives);
  d.rows = d.rows.filter((r) => r.kind !== 'bookmark');
  d.rows.push(
    { t: 300, kind: 'bookmark', text: 'Bookmark: Mark 1 at 05:00', mark: 'Mark 1 at 05:00', markKind: 'bad', undone: 1 },
    { t: 470, kind: 'bookmark', text: 'Bookmark: Mark 2 at 07:50', mark: 'Mark 2 at 07:50', markKind: 'discuss', note: 'what did the monitor show here?' },
  );
  d.rows.sort((a, b) => a.t - b.t);
  return d;
};
function open(data: RunData): { el: HTMLElement; leave?: () => void } {
  const link = { onChange: () => () => undefined, ctl: { scenario: {} } } as unknown as Link;
  const view = debriefView({ record: { data } } as unknown as AppSession, link);
  document.body.append(view.el);
  view.enter?.('');
  return { el: view.el, leave: view.leave };
}
const parse = (svg: string): SVGSVGElement => {
  const host = document.createElement('div');
  host.innerHTML = svg;
  return host.querySelector('svg') as SVGSVGElement;
};
/** The strip's x of second t on run d (L 108, R 10). */
const xOf = (d: RunData) => (t: number) => 108 + (t / endOf(d)) * (COURSE_W - 108 - 10);
/** Every vertical line ("M x y V y'") of a path, its x once. */
const verticals = (p: string): number[] => [...new Set([...p.matchAll(/M([\d.]+) [\d.]+V/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
const num = (e: Element | null | undefined, a: string): number => Number(e?.getAttribute(a));

describe('the Debrief course strip: events at the top, ECG paper, marks at the bottom', () => {
  let leave: (() => void) | undefined;
  afterEach(() => (leave?.(), document.body.replaceChildren()));

  it('two marks (one undone): two icons at their times under the time labels, numbered inside, joined up to the row; the undone one struck', () => {
    const d = run();
    const x = xOf(d);
    const v = open(d);
    leave = v.leave;
    const svg = v.el.querySelector('#db-course .db-course svg') as SVGSVGElement;
    const glyphs = [...svg.querySelectorAll('g.db-bm')];
    expect(glyphs.map((g) => [g.getAttribute('data-kind'), g.getAttribute('data-t'), g.getAttribute('data-n'), g.classList.contains('undone')]))
      .toEqual([['bad', '300', '1', true], ['discuss', '470', '2', false]]);
    const labelsFoot = Math.max(...[...svg.querySelectorAll('.ticks text')].map((t) => num(t, 'y')));
    glyphs.forEach((g, i) => {
      const t = [300, 470][i] as number;
      // the line from the row's top edge at the mark's second, straight down to the icon (they are far apart: no move)
      const lead = g.querySelector('line.db-bm-lead');
      expect(num(lead, 'x1'), `mark ${i + 1}: its line at its time`).toBeCloseTo(x(t), 1);
      expect(num(lead, 'x2')).toBeCloseTo(x(t), 1);
      expect(num(lead, 'y1'), `mark ${i + 1}: from the row's top, under the time labels`).toBeGreaterThan(labelsFoot);
      // the 22-unit icon (scale 22/24) with its body (x 12 of 24) on the time, under the line, white inside
      const icon = g.querySelector('path');
      const tr = /translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)/.exec(icon?.getAttribute('transform') ?? '');
      expect(Number(tr?.[3])).toBeCloseTo(22 / 24, 3);
      expect(Number(tr?.[1]) + 12 * (22 / 24), `mark ${i + 1}: the icon on its time`).toBeCloseTo(x(t), 0);
      expect(Number(tr?.[2])).toBeGreaterThan(num(lead, 'y1'));
      expect(icon?.getAttribute('fill')).toBe('#fff');
      // its number inside the icon's 22-unit box
      const n = g.querySelector('text.db-bm-n');
      expect(n?.textContent).toBe(String(i + 1));
      expect(num(n, 'x')).toBeGreaterThan(Number(tr?.[1]));
      expect(num(n, 'x')).toBeLessThan(Number(tr?.[1]) + 22);
      expect(num(n, 'y')).toBeGreaterThan(Number(tr?.[2]));
      expect(num(n, 'y')).toBeLessThan(Number(tr?.[2]) + 22);
    });
    const icon = Object.fromEntries(MARKS.map(([k, , p]) => [k, p]));
    expect(glyphs.map((g) => g.querySelector('path')?.getAttribute('d'))).toEqual([icon.bad, icon.discuss]);
    expect(glyphs.map((g) => !!g.querySelector('line.db-bm-x'))).toEqual([true, false]);
    // nothing of the marks on the axis or in the panels; no words in the row
    expect(svg.querySelectorAll('.db-bm-t')).toHaveLength(0);
    expect(svg.querySelectorAll('g.db-bm text:not(.db-bm-n)')).toHaveLength(0);
    // the title on hover and the Bookmarks list, numbered the same
    expect(glyphs[1]?.querySelector('title')?.textContent).toBe('2 · 07:50 Bookmark: Mark 2 at 07:50 · discuss: “what did the monitor show here?”');
    expect([...v.el.querySelectorAll('#db-bookmarks li')].map((li) => [li.textContent?.slice(0, 9), li.classList.contains('undone')])).toEqual([['1 · 05:00', true], ['2 · 07:50', false]]);
    expect(v.el.querySelector('#db-course .db-legend')?.textContent).toBe(`${LEGEND} · marks: bad discuss`);
    // the learner handout: its rc.3 strip, the badges, no marks
    expect(v.el.querySelectorAll('#db-handout .db-bm')).toHaveLength(0);
    expect(v.el.querySelectorAll('#db-handout .db-badge')).toHaveLength(7);
    expect(v.el.querySelector('#db-handout .db-course svg')?.classList.contains('learner')).toBe(true);
    expect(v.el.querySelector('#db-handout .db-legend')?.textContent).toBe('■ team action · ● patient event · □ scenario state');
  });

  it('two marks a second apart: moved apart by an icon\'s width, each on a slanted line to its own time', () => {
    const d = run();
    d.rows.push({ t: 471, kind: 'bookmark', text: 'Bookmark: Mark 3 at 07:51', mark: 'Mark 3 at 07:51', markKind: 'good' });
    const x = xOf(d);
    const s = parse(courseSvg(d, keyMoments(d), {
      trends: [...TRENDS],
      marks: d.rows.filter((r) => r.kind === 'bookmark').map((r, i) => ({ t: r.t, n: i + 1, kind: r.markKind ?? 'bookmark', title: r.text, undone: !!r.undone, icon: 'M6 3h12v18l-6-5-6 5z' })),
    }));
    const [a, b] = [...s.querySelectorAll('g.db-bm')].slice(1).map((g) => g.querySelector('line.db-bm-lead') as Element);
    expect(num(a, 'x1')).toBeCloseTo(x(470), 1);
    expect(num(b, 'x1')).toBeCloseTo(x(471), 1);
    expect(num(b, 'x2') - num(a, 'x2'), 'an icon\'s width and 2 apart').toBeCloseTo(24, 1);
  });

  it('the events row at the top: seven numbered down arrows above the HR panel, their dotted lines down to the axis; no axis line', () => {
    const d = run();
    const x = xOf(d);
    const s = parse(courseSvg(d, keyMoments(d), { trends: [...TRENDS] }));
    const hrTop = Math.min(...[...(s.querySelector('[data-trend=hr] path')?.getAttribute('d') ?? '').matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((m) => Number(m[1])));
    const foot = Math.max(...[...(s.querySelector('[data-trend=etco2] path')?.getAttribute('d') ?? '').matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((m) => Number(m[1])));
    const labels = Math.min(...[...s.querySelectorAll('.ticks text')].map((t) => num(t, 'y')));
    const arrows = [...s.querySelectorAll('g.db-badge')];
    expect(arrows.map((a) => a.querySelector('text.db-badge-n')?.textContent)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(arrows.map((a) => a.getAttribute('class'))).toEqual(['db-badge db-patient', 'db-badge db-patient', 'db-badge db-team', 'db-badge db-team', 'db-badge db-patient', 'db-badge db-team', 'db-badge db-team']);
    for (const a of arrows) {
      const pts = (a.querySelector('polygon')?.getAttribute('points') ?? '').split(' ').map((p) => p.split(',').map(Number));
      expect(pts[2]?.[1], 'the third point is the tip: a down arrow').toBeGreaterThan(pts[0]?.[1] as number);
      expect(Math.max(...pts.map((p) => p[1] as number)), 'above the HR trace').toBeLessThan(hrTop);
      const line = a.querySelector('line.db-ev-line');
      expect(num(line, 'x1')).toBeCloseTo(x(Number(a.getAttribute('data-t'))), 1);
      expect(num(line, 'y2'), 'down to the last panel\'s foot').toBeGreaterThanOrEqual(foot);
      expect(num(line, 'y2'), 'not into the time labels').toBeLessThan(labels - 8);
    }
    expect(s.querySelector('.axis')).toBeNull();
  });

  it('the grid: a big square a minute on this run (five fine squares), each panel one big square high, outlined', () => {
    const d = run();
    const x = xOf(d);
    const s = parse(courseSvg(d, keyMoments(d), { trends: [...TRENDS] }));
    const big = x(60) - x(0);
    const bold = s.querySelector('path.db-paper-b')?.getAttribute('d') ?? '';
    const fine = s.querySelector('path.db-paper:not(.db-paper-b)')?.getAttribute('d') ?? '';
    const b = verticals(bold);
    expect((b[1] as number) - (b[0] as number)).toBeCloseTo(big, 0);
    expect(verticals(fine).filter((v) => v > (b[0] as number) && v < (b[1] as number))).toHaveLength(4);
    // each panel's outline: a big square high, its scale's labels at its top and foot
    const frames = [...bold.matchAll(/M108 ([\d.]+)H718V([\d.]+)H108Z/g)].map((m) => Number(m[2]) - Number(m[1]));
    expect(frames).toHaveLength(4 + 1); // the events row and the four panels (no marks here)
    expect(frames.slice(1).every((h) => Math.abs(h - big) < 0.2), `panels ${frames.slice(1)} vs ${big}`).toBe(true);
    expect(frames[0], 'the events row: three fine squares').toBeCloseTo((3 * big) / 5, 0);
  });

  it('the grid rule: a minute to ≈ 30½ min, five minutes beyond; a big square held to 20–60 units', () => {
    expect(gridMajorS(689)).toBe(60); // the tamponade, 53 units
    expect(gridMajorS(1483)).toBe(60); // the MH recording, 24.7 units
    expect(gridMajorS(1830)).toBe(60); // a minute is 20.0 units of the 610-unit plot
    expect(gridMajorS(1831)).toBe(120); // five minutes would be 100 units: two
    expect(gridMajorS(3060)).toBe(300); // ≈ 51 min: five minutes, 59.8 units
    expect(gridMajorS(300)).toBe(15); // a 5-min run: a minute would be 122 units
    // a 60-min run on the page: five-minute squares
    const long: RunData = { ...emptyRun('x', 70, 0), samples: Array.from({ length: 3600 }, (_, t) => ({ t, hr: 80, map: 70, spo2: 97, etco2: 35, rr: null, temp: null, k: null, lactate: null, ph: null, glucose: null, tcore: null })) };
    const b = verticals(parse(courseSvg(long, [], { trends: [...TRENDS] })).querySelector('path.db-paper-b')?.getAttribute('d') ?? '');
    expect((b[1] as number) - (b[0] as number)).toBeCloseTo((300 / 3599) * 610, 0);
  });

  it('the scales: rounded outward to fives, one five further when the trace would touch the frame; SpO₂ never past 100', () => {
    expect(panelScale('etco2', 9, 36)).toEqual([5, 40]); // the owner's example: 4 and 4 clear of a 35-wide panel's 3.5
    expect(panelScale('hr', 43, 153)).toEqual([35, 160]); // 40 and 155 are within 11.5 (a tenth of 115) of the trace
    expect(panelScale('spo2', 94, 100)).toEqual([80, 100]); // its least span, 20; the top stays at 100
    expect(panelScale('etco2', 0, 8)).toEqual([0, 20]); // its least span from 0 (never below), 20; the trace clears it
  });
});
