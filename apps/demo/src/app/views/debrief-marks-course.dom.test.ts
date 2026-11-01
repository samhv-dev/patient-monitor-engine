// @vitest-environment happy-dom
// The owner, 1 November: the instructor's marks (the dock's flags and the run's bookmarks) on the Debrief's course
// strip at their times, so the debrief can point at a marked moment and the numbers around it. On the A3.1 tamponade
// record, its own session-bar bookmark (00:13) taken out and two marks put in: a discuss mark with a note 2 s after key moment 2, and a bad mark a return undid. Both
// are drawn at their times, the undone one struck as the Bookmarks list strikes it, above the seven badges (none
// hidden), with the dock's icons and the labels for print; the learner handout's copy has no marks. The record as
// recorded draws its one plain bookmark as a ribbon; a run with no bookmark draws the strip as before.
import type { ScenarioDoc } from '@pme/controller/scenario';
import { afterEach, describe, expect, it } from 'vitest';
import a31 from '../../../../../docs/showcase/kit-round-a/fa/debrief-a3-tamponade-cue-card-path-kit-round-chromium.json';
import { endOf } from '../debrief.ts';
import type { Link } from '../link.ts';
import type { RunData } from '../record.ts';
import type { AppSession } from '../session.ts';
import tamponade from '../showcase/showcase-tamponade.json';
import { MARKS } from '../teach2/dock.ts';
import { COURSE_W } from './debrief-course.ts';
import { debriefView } from './debrief.ts';

const LEGEND = '■ team action · ● patient event · □ scenario state · numbers match Key moments';
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

describe('the Debrief course strip shows the instructor\'s marks at their times', () => {
  let leave: (() => void) | undefined;
  afterEach(() => (leave?.(), document.body.replaceChildren()));

  it('two marks, two glyphs at the right x, the undone one struck; the seven badges kept; none on the handout', () => {
    const d = run();
    const v = open(d);
    leave = v.leave;
    const svg = v.el.querySelector('#db-course .db-course svg') as SVGSVGElement;
    const glyphs = [...svg.querySelectorAll('g.db-bm')];
    expect(glyphs.map((g) => [g.getAttribute('data-kind'), g.getAttribute('data-t'), g.classList.contains('undone')])).toEqual([['bad', '300', true], ['discuss', '470', false]]);
    // x: the strip's own time axis (L 108, R 10), the tick at the mark's second and the 10-unit icon centred on it
    const x = (t: number) => 108 + (t / endOf(d)) * (COURSE_W - 108 - 10);
    const ticks = [...svg.querySelectorAll('line.db-bm-t')].map((l) => Number(l.getAttribute('x1')));
    expect(ticks[0]).toBeCloseTo(x(300), 1);
    expect(ticks[1]).toBeCloseTo(x(470), 1);
    glyphs.forEach((g, i) => {
      const tr = /translate\(([\d.]+) (-?[\d.]+)\)/.exec(g.querySelector('path')?.getAttribute('transform') ?? '');
      expect(Number(tr?.[1]) + 5, `glyph ${i + 1} centred on its tick`).toBeCloseTo(ticks[i] as number, 1);
      expect(Number(tr?.[2]) + 10, `glyph ${i + 1} above the badges (their top at 5)`).toBeLessThan(5);
    });
    // the dock's own icons; the undone one struck through, as in the Bookmarks list
    const icon = Object.fromEntries(MARKS.map(([k, , p]) => [k, p]));
    expect(glyphs.map((g) => g.querySelector('path')?.getAttribute('d'))).toEqual([icon.bad, icon.discuss]);
    expect(glyphs.map((g) => !!g.querySelector('line.db-bm-x'))).toEqual([true, false]);
    expect(v.el.querySelectorAll('#db-bookmarks li.undone')).toHaveLength(1);
    // the label for print, the list's words on hover
    expect(glyphs.map((g) => g.querySelector('text.db-bm-l')?.textContent)).toEqual(['Mark 1 at 05:00', 'Mark 2 at 07:50']);
    expect(glyphs[1]?.querySelector('title')?.textContent).toBe('07:50 Bookmark: Mark 2 at 07:50 · discuss: “what did the monitor show here?”');
    expect(glyphs[0]?.querySelector('title')?.textContent).toMatch(/· bad — undone by return 1$/);
    // the key moments' badges all still drawn (moment 2 at 07:48 sits 2 s from the discuss mark)
    expect([...svg.querySelectorAll('.db-badge')].map((b) => b.getAttribute('data-n'))).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(v.el.querySelector('#db-course .db-legend')?.textContent).toBe(`${LEGEND} · marks: bad discuss`);
    // the learner handout: no marks
    expect(v.el.querySelectorAll('#db-handout .db-bm')).toHaveLength(0);
  });

  it('the record as recorded: its session-bar bookmark at 00:13 is a ribbon; without a bookmark, no mark row and no marks legend', () => {
    const d = structuredClone(a31.record) as unknown as RunData;
    let v = open(d);
    expect([...v.el.querySelectorAll('#db-course g.db-bm')].map((g) => [g.getAttribute('data-kind'), g.querySelector('text')?.textContent])).toEqual([['bookmark', 'Bookmark 1 at 00:13']]);
    expect(v.el.querySelector('#db-course .db-legend')?.textContent).toBe(`${LEGEND} · marks: bookmark`);
    v.leave?.();
    document.body.replaceChildren();
    d.rows = d.rows.filter((r) => r.kind !== 'bookmark');
    v = open(d);
    leave = v.leave;
    expect(v.el.querySelectorAll('#db-course .db-bm, #db-course .db-bm-key')).toHaveLength(0);
    expect(v.el.querySelector('#db-course .db-legend')?.textContent).toBe(LEGEND);
    expect(v.el.querySelector('#db-course .db-course svg > g[transform]')).toBeNull();
  });
});
