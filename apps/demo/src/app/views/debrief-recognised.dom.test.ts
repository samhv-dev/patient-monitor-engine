// @vitest-environment happy-dom
// Debrief 2, D5: the /1 fallback press on the page: the recognition tile reads "pressed" (not "ticked"), and its key
// moment is the team's, marked data-recognised.
import { afterEach, expect, it } from 'vitest';
import type { Link } from '../link.ts';
import { emptyRun, type RunData } from '../record.ts';
import type { AppSession } from '../session.ts';
import { debriefView } from './debrief.ts';

afterEach(() => document.body.replaceChildren());

it('a free run with the Recognised press at 00:31: the tile "31 s, 00:00 start → 00:31 pressed" and the team moment', () => {
  const data: RunData = {
    ...emptyRun('free', 70, 0),
    samples: Array.from({ length: 60 }, (_, t) => ({ t, hr: 80, map: 80, spo2: 98, etco2: 35, rr: 12, temp: 37, k: null, lactate: null, ph: null, glucose: null, tcore: null, sys: 120, dia: 70, cvp: 6 })),
    rows: [{ t: 31.2, kind: 'note', text: 'Recognised (instructor)', ev: 'recognised' }],
  };
  const link = { onChange: () => () => undefined, ctl: { scenario: {} } } as unknown as Link;
  const view = debriefView({ record: { data } } as unknown as AppSession, link);
  document.body.append(view.el);
  view.enter?.('');
  const tile = view.el.querySelector('#db-keytimes [data-key=recognition]');
  expect(tile?.hasAttribute('data-recognised')).toBe(true);
  expect([tile?.querySelector('.db-tile-cap')?.textContent, tile?.querySelector('.db-tile-v')?.textContent, tile?.querySelector('.db-tile-sub')?.textContent])
    .toEqual(["Recognition (instructor's press)", '31 s', '00:00 start → 00:31 pressed']);
  const row = view.el.querySelector('#db-moments tbody tr[data-recognised]');
  expect([...(row?.querySelectorAll('td') ?? [])].slice(0, 4).map((td) => td.textContent)).toEqual(['1', '00:31', '■ Team', 'Recognised (instructor)']);
  view.leave?.();
});
