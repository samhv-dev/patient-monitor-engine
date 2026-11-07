// @vitest-environment happy-dom
// Debrief 2, D6 (plan §7; the owner's cuff rule of 5 November, DQ1): the key-moments table reads the pressures and the
// alarm ends the record now keeps. Columns n · Time · Who · What happened · HR · SBP/DBP · MAP · CVP · SpO₂ · EtCO₂; a
// cuff value is its last reading with its age; each alarm "raised ▸ cleared · acknowledged", or "(still on)". A pre-D
// file prints "not recorded in this file" once under the table and "·" in the new cells; the minute table gains SBP,
// DBP and CVP the same way.
import { afterEach, describe, expect, it } from 'vitest';
import a31 from '../__fixtures__/debrief-2/tamponade-a31-v1.json';
import type { Link } from '../link.ts';
import { emptyRun, type Row, type RunData, type Sample } from '../record.ts';
import type { AppSession } from '../session.ts';
import { debriefView } from './debrief.ts';

function open(data: RunData): HTMLElement {
  const link = { onChange: () => () => undefined, ctl: { scenario: {} } } as unknown as Link;
  const view = debriefView({ record: { data: structuredClone(data) } } as unknown as AppSession, link);
  document.body.append(view.el);
  view.enter?.('');
  return view.el;
}
const cells = (tr: Element | null | undefined) => [...(tr?.querySelectorAll('th, td') ?? [])].map((c) => c.textContent);
const base = (t: number): Sample => ({ t, hr: 80, map: 72, spo2: 98, etco2: 35, rr: 12, temp: 37, k: null, lactate: null, ph: null, glucose: null, tcore: null });

afterEach(() => document.body.replaceChildren());

describe('D6: the key moments read the new facts', () => {
  // the arterial line to 99 s (92/58), a cuff cycle at 150 s (98/60), the CVP transducer throughout (17)
  const samples = Array.from({ length: 400 }, (_, t) => ({ ...base(t), ...(t < 100 ? { sys: 92, dia: 58 } : t === 150 ? { sys: 98, dia: 60 } : { sys: null, dia: null }), cvp: 17 }));
  const rows: Row[] = [
    { t: 50, kind: 'action', text: 'Fluid 500 mL', ev: 'fluid' },
    { t: 362, kind: 'alarm', text: 'CVP high', ev: 'alarm:cvp-high', endT: 460, ackT: 380 },
    { t: 365, kind: 'alarm', text: 'HR high', ev: 'alarm:hr-high' },
    { t: 280, kind: 'action', text: 'Epinephrine 10 µg IV', ev: 'drug:epinephrine' },
    { t: 370, kind: 'action', text: 'Crystalloid 250 mL', ev: 'fluid' },
  ];
  const now: RunData = { ...emptyRun('free', 70, 0), samples, rows };

  it('the columns; the arterial value; a cuff value with its age; CVP', () => {
    const el = open(now);
    expect(cells(el.querySelector('#db-moments thead tr'))).toEqual(['n', 'Time', 'Who', 'What happened', 'HR', 'SBP/DBP', 'MAP', 'CVP', 'SpO₂', 'EtCO₂']);
    const r = [...el.querySelectorAll('#db-moments tbody tr[data-n]')].map(cells);
    expect(r[0]?.slice(4)).toEqual(['80', '92/58', '72', '17', '98', '35']);
    expect(r[1]?.slice(4)).toEqual(['80', '98/60 (cuff, 2 min 10 s before)', '72', '17', '98', '35']);
    expect(el.querySelector('#db-moments')?.textContent).not.toMatch(/not recorded in this file/);
  });

  it('each alarm with its end and acknowledgement; one still on says so', () => {
    const el = open(now);
    expect(el.querySelector('#db-moments tr.db-alarms')?.textContent).toBe('Alarms since the last row: CVP high 06:02 ▸ cleared 07:40 · acknowledged 06:20; HR high 06:05 ▸ (still on)');
  });

  it('the minute table gains SBP, DBP and CVP (the first measured in the minute; – when none was)', () => {
    const el = open(now);
    expect(cells(el.querySelector('#db-minutes thead tr')).slice(0, 6)).toEqual(['Time', 'HRbpm', 'ART M / NIBP MmmHg', 'SBPmmHg', 'DBPmmHg', 'CVPmmHg']);
    const r = [...el.querySelectorAll('#db-minutes tbody tr')].map(cells);
    expect(r.slice(0, 3).map((x) => x.slice(3, 6))).toEqual([['92', '58', '17'], ['92', '58', '17'], ['98', '60', '17']]);
    expect(r[3]?.slice(3, 6)).toEqual(['–', '–', '17']);
  });

  it('a pre-D file (the A3.1 export): "·" in the new cells, "not recorded in this file" once under each table, alarms as before', () => {
    const el = open(a31.record as unknown as RunData);
    const r = [...el.querySelectorAll('#db-moments tbody tr[data-n]')].map(cells);
    expect(r.map((x) => [x[5], x[7]])).toEqual(Array.from({ length: 7 }, () => ['·', '·']));
    expect(r.map((x) => x[6])).toEqual(['71', '21', '20', '28', '45', '63', '90']); // MAP as before
    expect(el.querySelectorAll('#db-moments .db-norecord')).toHaveLength(1);
    expect(el.querySelector('#db-moments .db-norecord')?.textContent).toBe('SBP/DBP and CVP, and when an alarm ended or was acknowledged: not recorded in this file.');
    expect(el.querySelector('#db-moments tr.db-alarms')?.textContent).toBe('Alarms since the last row: CVP high, SpO₂: low perfusion, ART S low');
    expect([...el.querySelectorAll('#db-minutes tbody tr')].every((tr) => cells(tr).slice(3, 6).every((c) => c === '·'))).toBe(true);
    expect(el.querySelectorAll('#db-minutes .db-norecord')).toHaveLength(1);
  });
});

// Brief 63 (the owner's ruling of 6 November, question 2 = B): a "Pressures" panel among the trend charts, after MAP,
// in their style — systolic and diastolic on the left axis, CVP on its own right-hand axis (a shared 0–200 mmHg axis
// would draw CVP as a flat line). A cuff reading is a dot at its cycle with gaps between, never a line to zero; an
// arterial run is a line. A pre-D file draws no panel and says once that the pressures were not recorded.
describe('the Pressures trend panel', () => {
  const panel = (el: HTMLElement) => el.querySelector('#db-trends figure[data-trend="pressures"]');
  const d = (el: Element | null | undefined, k: string) => el?.querySelector(`path[data-p="${k}"]`)?.getAttribute('d') ?? null;
  const run = (f: (t: number) => Partial<Sample>, n = 300): RunData => ({ ...emptyRun('free', 70, 0), samples: Array.from({ length: n }, (_, t) => ({ ...base(t), ...f(t) })) });

  it('a D-era arterial run: the panel after MAP, three traces, SBP and DBP lines on the left axis, CVP on the right', () => {
    const el = open(run((t) => ({ sys: 100 + (t % 20), dia: 60, cvp: 8 + (t > 150 ? 6 : 0) })));
    const fig = panel(el);
    expect(fig).not.toBeNull();
    expect(fig?.previousElementSibling?.getAttribute('data-trend')).toBe('map');
    expect(fig?.querySelectorAll('path[data-p]')).toHaveLength(3);
    expect(fig?.querySelector('figcaption')?.textContent).toBe('PressuresmmHg · SBP and DBP on the left axis, CVP (dashed) on the right');
    for (const k of ['sys', 'dia', 'cvp']) {
      expect(d(fig, k)?.match(/M/g), `${k}: one unbroken line`).toHaveLength(1);
      expect(d(fig, k)).toMatch(/L/);
    }
    expect([...(fig?.querySelectorAll('text.l') ?? [])].map((t) => t.textContent)).toEqual(['119', '60']); // SBP/DBP: its own range
    expect([...(fig?.querySelectorAll('text.r') ?? [])].map((t) => t.textContent)).toEqual(['CVP 16', 'CVP 6']); // 8–14 on its 10 mmHg least span
    expect(fig?.querySelector('svg')?.getAttribute('aria-label')).toBe('Pressures, 00:00 to 04:59: SBP 100 to 119, DBP 60 to 60, CVP 8 to 14 mmHg');
    expect(el.querySelector('#db-trends .db-norecord')).toBeNull();
  });

  it('a cuff run: a dot per cycle, gaps between, never joined and never at zero; no CVP drawn when none was measured', () => {
    const cyc = (t: number) => t === 40 || t === 100 || t === 160;
    const fig = panel(open(run((t) => ({ sys: cyc(t) ? 98 + t / 20 : null, dia: cyc(t) ? 60 : null, cvp: null }))));
    for (const k of ['sys', 'dia']) {
      const p = d(fig, k) ?? '';
      expect(p.match(/M/g), `${k}: three readings, three subpaths`).toHaveLength(3);
      expect(p, k).not.toMatch(/L/);
      expect(p.match(/a/g), `${k}: each a visible dot`).toHaveLength(6);
    }
    expect(d(fig, 'cvp')).toBe('');
    expect(fig?.querySelectorAll('text.r')).toHaveLength(0);
    expect(fig?.querySelector('svg')?.getAttribute('aria-label')).toMatch(/CVP not measured/);
  });

  it('an arterial line taken down to the cuff: a line, then dots', () => {
    const fig = panel(open(run((t) => (t < 100 ? { sys: 92, dia: 58 } : t === 150 || t === 250 ? { sys: 98, dia: 60 } : { sys: null, dia: null }))));
    const p = d(fig, 'sys') ?? '';
    expect(p.match(/M/g)).toHaveLength(3);
    expect(p.match(/L/g)).toHaveLength(99); // seconds 1–99 joined to 0
    expect(p.match(/a/g)).toHaveLength(4); // the two cuff cycles, each a dot
  });

  it('a D-era run with no pressure measured: the panel says so, as the other charts do', () => {
    const fig = panel(open(run(() => ({ sys: null, dia: null, cvp: null }))));
    expect(fig?.querySelector('p.muted')?.textContent).toBe('Not measured during the run.');
    expect(fig?.querySelector('svg')).toBeNull();
  });

  it('a pre-D file (the A3.1 export): no panel, and "not recorded in this file" once among the trends', () => {
    const el = open(a31.record as unknown as RunData);
    expect(panel(el)).toBeNull();
    expect(el.querySelectorAll('#db-trends figure.db-chart')).toHaveLength(6);
    expect([...el.querySelectorAll('#db-trends .db-norecord')].map((p) => p.textContent)).toEqual(['SBP, DBP and CVP: not recorded in this file.']);
  });
});
