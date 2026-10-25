// @vitest-environment happy-dom
// UI review 24 October, #3 and #18, on the two A4 kit-round records (the live-demo cards): the report's and the learner
// handout's Key moments tables print every moment, one row per marker of the course (haemorrhage 19, MH 13), with no
// "N more" note; the MH report's recognition tile counts from the early signs, its anchors named.
import { afterEach, describe, expect, it } from 'vitest';
import haem from '../../../../../docs/showcase/kit-round-a/debrief-a4-haemorrhage-e120-course-kit-round-chromium.json';
import mh from '../../../../../docs/showcase/kit-round-a/debrief-a4-mh-e119-induction-sequence-and-early-call-kit-round-chromium.json';
import type { Link } from '../link.ts';
import type { RunData } from '../record.ts';
import type { AppSession } from '../session.ts';
import { debriefView } from './debrief.ts';

function open(record: unknown): { el: HTMLElement; leave?: () => void } {
  const data = structuredClone(record) as RunData;
  const link = { onChange: () => () => undefined, ctl: { scenario: {} } } as unknown as Link;
  const view = debriefView({ record: { data } } as unknown as AppSession, link);
  document.body.append(view.el);
  view.enter?.('');
  return { el: view.el, leave: view.leave };
}
const nums = (el: Element, sel: string) => [...el.querySelectorAll(sel)].map((tr) => tr.getAttribute('data-n'));

describe('Debrief print: every key moment (#3) and recognition from the early signs (#18)', () => {
  let leave: (() => void) | undefined;
  afterEach(() => (leave?.(), document.body.replaceChildren()));

  it.each([['haemorrhage', 19, haem], ['MH', 13, mh]] as const)('%s: the report and the handout print all %i moments, 1…n, no "more" note', (_, n, j) => {
    const v = open(j.record);
    leave = v.leave;
    const want = Array.from({ length: n }, (_x, i) => String(i + 1));
    expect(nums(v.el, '#db-moments tbody tr[data-n]')).toEqual(want);
    expect(nums(v.el, '.db-hmoments tbody tr[data-n]')).toEqual(want);
    expect(nums(v.el, '#db-handout .db-course .db-badge')).toEqual(want); // rows = the course strip's markers
    expect(v.el.textContent).not.toMatch(/\d+ more in the timeline/);
    expect(v.el.querySelector('.db-handout-live')?.classList.contains('db-long')).toBe(true); // > 12 rows: the compact print layout
  });

  it('haemorrhage: the handout ends with both shocks and the return of circulation', () => {
    const v = open(haem.record);
    leave = v.leave;
    const rows = [...v.el.querySelectorAll('.db-hmoments tbody tr')].map((tr) => tr.querySelectorAll('td')[3]?.textContent);
    expect(rows.slice(12)).toEqual(expect.arrayContaining(['Shocked: CPR on for 2 min', 'Shocked again: CPR on']));
    expect(rows.at(-1)).toMatch(/^Return of circulation/);
  });

  it('MH: the handout keeps row 13, "Ventilation back" (the E22 objective)', () => {
    const v = open(mh.record);
    leave = v.leave;
    expect(v.el.querySelector('.db-hmoments tbody tr[data-n="13"]')?.textContent).toMatch(/Ventilation back to 12 × 500/);
  });

  it('MH: "Recognition (instructor\'s tick)" reads 2 s, 08:38 early signs → 08:40 ticked', () => {
    const v = open(mh.record);
    leave = v.leave;
    const tile = v.el.querySelector('#db-keytimes [data-key=recognition]');
    expect(tile?.querySelector('.db-tile-v')?.textContent).toBe('2 s');
    expect(tile?.querySelector('.db-tile-sub')?.textContent).toBe('08:38 early signs → 08:40 ticked');
  });
});
