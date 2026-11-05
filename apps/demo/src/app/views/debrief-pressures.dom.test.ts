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
    expect(cells(el.querySelector('#db-minutes thead tr')).slice(0, 6)).toEqual(['Time', 'HRbpm', 'MAPmmHg', 'SBPmmHg', 'DBPmmHg', 'CVPmmHg']);
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
