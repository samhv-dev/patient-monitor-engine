// @vitest-environment happy-dom
// D3 (Debrief 2 plan; DQ3, ruled 5 November): the "Hands-off time" tile prints the seconds without compressions inside
// the pulseless spans and the compression fraction, with a small fraction bar carrying reference lines at 60 % and
// 80 %; no grade, no verdict word, no colour change at either line.
import { afterEach, describe, expect, it } from 'vitest';
import type { Link } from '../link.ts';
import { emptyRun, type Row, type RunData, type Sample } from '../record.ts';
import type { AppSession } from '../session.ts';
import { debriefView } from './debrief.ts';

const sample = (t: number): Sample => ({ t, hr: 80, map: 80, spo2: 98, etco2: 35, rr: 12, temp: 37, k: null, lactate: null, ph: null, glucose: null, tcore: null });
function open(rows: Row[]): { el: HTMLElement; leave?: () => void } {
  const data: RunData = { ...emptyRun('free', 70, 0), samples: Array.from({ length: 200 }, (_, t) => sample(t)), rows };
  const link = { onChange: () => () => undefined, ctl: { scenario: {} } } as unknown as Link;
  const view = debriefView({ record: { data } } as unknown as AppSession, link);
  document.body.append(view.el);
  view.enter?.('');
  return { el: view.el, leave: view.leave };
}
// pulseless 60–160 (100 s); compressions 70–130 and 140–160 (80 s): 20 s hands off, fraction 80 %
const ROWS: Row[] = [
  { t: 60, kind: 'patient', text: 'Pulse lost (the model)', ev: 'pulseLoss' },
  { t: 70, kind: 'action', text: 'CPR started, 110 /min', ev: 'cpr' },
  { t: 130, kind: 'action', text: 'CPR stopped', ev: 'cprStop' },
  { t: 140, kind: 'action', text: 'CPR started, 110 /min', ev: 'cpr' },
  { t: 160, kind: 'patient', text: 'Circulation returned (the model)', ev: 'rosc' },
  { t: 161, kind: 'action', text: 'CPR stopped', ev: 'cprStop' },
];
/** Every verdict and grade word the Debrief prints elsewhere (E42, GRADE_WORDS), and the glyphs that carry them. */
const VERDICT = /observed|assessable|discuss|\bmet\b|deviation|overdue|failed|\bdue\b|not applicable|good|poor|adequate|target|[✓✗◆!…]/i;

describe('D3: the hands-off tile', () => {
  let leave: (() => void) | undefined;
  afterEach(() => (leave?.(), document.body.replaceChildren()));

  it('prints the seconds, the compression fraction and the 60 % and 80 % reference lines, and no verdict', () => {
    const v = open(ROWS);
    leave = v.leave;
    const tile = v.el.querySelector('#db-keytimes [data-key=handsOff]') as HTMLElement;
    expect(tile).not.toBeNull();
    expect(tile.querySelector('.db-tile-cap')?.textContent).toBe('Hands-off time');
    expect(tile.querySelector('.db-tile-v')?.textContent).toBe('20 s');
    const text = tile.textContent ?? '';
    expect(text).toContain('compression fraction 80 %');
    expect(text).toContain('60 %');
    expect(text).toContain('80 %');
    expect(text).not.toMatch(VERDICT);
    expect(tile.className).toBe('db-tile'); // no "met", no other state class
    // the bar: the fill to the fraction, two reference lines drawn alike (no colour change at either)
    const lines = [...tile.querySelectorAll('svg line[data-ref]')];
    expect(lines.map((l) => l.getAttribute('data-ref'))).toEqual(['60', '80']);
    expect(new Set(lines.map((l) => `${l.getAttribute('stroke')} ${l.getAttribute('stroke-width')}`)).size).toBe(1);
    expect([...tile.querySelectorAll('svg [fill]')].map((x) => x.getAttribute('fill')).every((f) => f === '#000' || f === 'none')).toBe(true);
  });

  it('a fraction above 80 % or below 60 % prints the same way: the number, the bar, the two lines', () => {
    for (const [stopAt, want] of [[150, 'compression fraction 90 %'], [100, 'compression fraction 50 %']] as const) {
      const v = open(ROWS.map((r) => (r.t === 130 ? { ...r, t: stopAt } : r)).map((r) => (r.t === 140 ? { ...r, t: stopAt === 150 ? 150 : 140 } : r)));
      const tile = v.el.querySelector('#db-keytimes [data-key=handsOff]') as HTMLElement;
      expect(tile.textContent).toContain(want);
      expect(tile.className).toBe('db-tile');
      expect(tile.textContent).not.toMatch(VERDICT);
      v.leave?.();
      document.body.replaceChildren();
    }
  });
});
