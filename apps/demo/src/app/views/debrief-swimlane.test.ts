// The swimlane (Debrief 2, D7a) on the D0 fixtures and on synthetic runs: the lanes and their words, every timed
// action's window as a band whose ends are the times report3 or the verdict carries (to the second), the act as a tick
// with the verdict's words, an act that never came, a run that ended inside a window, the alarms' ends and
// acknowledgements (and a record that did not keep them), the aria-label, the height.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { report3 } from '../debrief.ts';
import { keyMoments } from '../debrief-moments.ts';
import { emptyRun, type Row, type RunData, type Sample } from '../record.ts';
import { SWIM_W, swimlaneSvg, windowsOf } from './debrief-swimlane.ts';

const DIR = join(import.meta.dirname, '..', '__fixtures__', 'debrief-2');
const fixture = (name: string): RunData => (JSON.parse(readFileSync(join(DIR, `${name}.json`), 'utf8')) as { record: RunData }).record;
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;
const attrs = (s: string, re: RegExp) => [...s.matchAll(re)].map((m) => m[1]);
const label = (s: string) => /aria-label="([^"]*)"/.exec(s)?.[1] ?? '';
const heightOf = (s: string) => Number(/viewBox="0 0 \d+ ([\d.]+)"/.exec(s)?.[1]);
const svgOf = (d: RunData, o = {}) => swimlaneSvg(d, keyMoments(d), windowsOf(d), o);

describe('the swimlane on the A3.1 tamponade path (the D0 fixture)', () => {
  const d = fixture('tamponade-a31-v1');
  const ws = windowsOf(d);
  const svg = svgOf(d);

  it('three eventWithin windows, each band from its anchor to its deadline (the verdict\'s times), each with its tick', () => {
    expect(ws.map((w) => w.label)).toEqual(['Objective 2', 'Objective 3', 'Objective 4']);
    expect(ws.map((w) => [w.fromT, w.toT])).toEqual([[468, 478], [471.2, 591.2], [655, 685]]);
    expect(ws.map((w) => w.ticks.map((k) => k.t))).toEqual([[471.2], [561.371], [657.2644571225924]]);
    expect(count(svg, /<rect class="db-swim-band/g)).toBe(3);
    expect(attrs(svg, /data-from="([\d.]+)"/g).map(Number)).toEqual([468, 471.2, 655]);
    expect(attrs(svg, /data-to="([\d.]+)"/g).map(Number)).toEqual([478, 591.2, 685]);
    expect(count(svg, /class="db-swim-tick"/g)).toBe(3);
    expect(count(svg, />✓ Observed</g)).toBe(3);
  });

  it('the lanes in order, each with its words; no lane for the pressures; alarm ends not recorded in this pre-D file', () => {
    expect(attrs(svg, /data-lane="(\w+)"/g)).toEqual(['patient', 'team', 'windows', 'monitor', 'drugs']);
    for (const w of ['Patient', 'Team', 'Expected windows', 'Monitor alarms', 'Drugs and fluids', 'end not recorded']) expect(svg).toContain(`>${w}<`);
    expect(svg).not.toMatch(/data-lane="pressures"|>(SBP|DBP|SBP\/DBP, CVP|Pressures)</); // DQ11: no pressures lane
    expect(count(svg, /class="db-swim-alarm/g)).toBe(0); // ticks only: no bar without a recorded end
    expect(count(svg, /class="db-swim-a"/g)).toBe(d.rows.filter((r) => r.kind === 'alarm' && r.undone === undefined).length);
    expect(count(svg, /class="db-swim-d"/g)).toBe(d.rows.filter((r) => r.undone === undefined && (r.ev?.startsWith('drug:') || r.ev === 'fluid')).length);
    expect(count(svg, /class="db-pulseless"/g)).toBe(1);
  });

  it('the moments with their numbers: patient ● in the Patient lane, team ■ in the Team lane', () => {
    const ms = keyMoments(d);
    expect(count(svg, /class="db-swim-m db-team"/g)).toBe(ms.filter((m) => m.who === 'team').length);
    expect(count(svg, /class="db-swim-m db-patient"/g)).toBe(ms.filter((m) => m.who === 'patient').length);
    expect(attrs(svg, /class="db-swim-m db-\w+" data-n="(\d+)"/g).map(Number).sort((a, b) => a - b)).toEqual(ms.map((m) => m.n));
  });

  it('the aria-label lists every window with its verdict', () => {
    expect(label(svg)).toContain('expected windows: Objective 2, 07:48 to 07:58: 07:51 ✓ Observed; Objective 3, 07:51 to 09:51: 09:21 ✓ Observed; Objective 4, 10:55 to 11:25: 10:57 ✓ Observed');
  });

  it('within 90 mm at the 182 mm width', () => {
    expect(heightOf(svg)).toBeLessThanOrEqual(360);
  });

  it('the recognition, drawn ◇ on the Team lane at its time', () => {
    const s = svgOf(d, { recognisedT: 120 });
    expect(count(s, /class="db-swim-rec"/g)).toBe(1);
    expect(s).toContain('data-recognised="120"');
  });
});

describe('the swimlane on the pme-scenario/2 haemorrhage card (the D0 /3 fixture)', () => {
  const d = fixture('haemorrhage-phases-v3');
  const r3 = report3(d);
  const ws = windowsOf(d);
  const svg = svgOf(d);

  it('one window per graded action with a dueT, its ends report3\'s to the second; none for an action without', () => {
    const timed = (r3?.actions ?? []).filter((a) => a.dueT !== null);
    expect(ws.map((w) => w.label)).toEqual(timed.map((a) => a.label));
    expect(ws.map((w) => [w.fromT, w.toT])).toEqual(timed.map((a) => [a.dueT, a.windowS === null ? null : (a.dueT as number) + a.windowS]));
    expect(count(svg, /<rect class="db-swim-band/g)).toBe(timed.length);
    expect(attrs(svg, /data-from="([\d.]+)"/g).map(Number)).toEqual(timed.map((a) => a.dueT));
  });

  it('the act and every repeat a tick with its grade words; an act never given its words at the deadline', () => {
    for (const a of (r3?.actions ?? []).filter((x) => x.dueT !== null)) {
      const w = ws.find((x) => x.label === a.label);
      const ticks = [...(a.givenT === null ? [] : [a.givenT]), ...a.repeats.flatMap((r) => (r.t === null ? [] : [r.t]))];
      expect(w?.ticks.map((k) => k.t), a.id).toEqual(ticks);
      if (a.givenT === null) expect(w?.missed?.words, a.id).toBe({ failed: '✗ failed', due: '… due', overdue: '! overdue' }[a.firstGrade as string]);
    }
    const ann = ws.find((w) => w.label === (r3?.actions.find((a) => a.id === 'announceDiagnosis')?.label));
    expect(ann?.ticks).toEqual([]);
    expect(ann?.missed).toEqual({ mark: 'not-observed', words: '✗ failed' });
    expect(svg).toContain('>! overdue (repeat 2)<');
    expect(label(svg)).toContain('no act, ✗ failed');
  });

  it('within 90 mm at the 182 mm width', () => {
    expect(heightOf(svg)).toBeLessThanOrEqual(360);
  });
});

/** A two-state /1 card with eventWithin objectives (the showcase cards' words may change). */
const doc = (objectives: unknown[]) => ({ schema: 'pme-scenario/1', id: 'case', title: 'Case', initialState: 'a', states: [{ id: 'a', label: 'A' }], objectives });
const sample = (t: number): Sample => ({ t, hr: 80, map: 80, spo2: 98, etco2: 38, rr: 12, temp: 36.8, k: null, lactate: null, ph: null, glucose: null, tcore: null });
const synth = (rows: Row[], endT: number, objectives: unknown[] = [], keeps?: string[]): RunData =>
  ({ ...emptyRun('M 40 y 70 kg', 70, 0), doc: doc(objectives) as never, rows, samples: [sample(0), sample(endT)], ...(keeps ? { keeps } : {}) });
const loss: Row = { t: 100, kind: 'patient', text: 'Pulse lost (the model)', ev: 'pulseLoss' };
const cprWithin = { text: 'CPR within 30 s of the pulse loss', rule: { kind: 'eventWithin', after: 'pulseLoss', event: 'cpr', withinS: 30 } };

describe('the swimlane on synthetic runs', () => {
  it('an act that never came: the band, no tick, "✗ Not observed" at the deadline', () => {
    const d = synth([loss], 400, [cprWithin]);
    const [w] = windowsOf(d);
    expect(w).toEqual({ label: 'Objective 1', fromT: 100, toT: 130, mark: 'not-observed', ticks: [], missed: { mark: 'not-observed', words: '✗ Not observed' } });
    const svg = svgOf(d);
    expect(count(svg, /<rect class="db-swim-band"/g)).toBe(1);
    expect(count(svg, /class="db-swim-tick"/g)).toBe(0);
    expect(svg).toContain('>✗ Not observed<');
    expect(label(svg)).toContain('Objective 1, 01:40 to 02:10: no act, ✗ Not observed');
  });

  it('a run that ended inside a window: the band open to the end, "– Not assessable"', () => {
    const d = synth([loss], 115, [cprWithin]);
    const svg = svgOf(d);
    expect(windowsOf(d)[0]?.missed).toEqual({ mark: 'not-assessable', words: '– Not assessable' });
    expect(count(svg, /<rect class="db-swim-band open"/g)).toBe(1);
    expect(svg).toMatch(/stroke-dasharray="3 2"/); // the chip's dashed grey
    expect(svg).toContain('>– Not assessable<');
  });

  it('a late act: its tick outside the band, "✗ Not observed" beside it', () => {
    const d = synth([loss, { t: 160, kind: 'action', text: 'CPR started', ev: 'cpr' }], 400, [cprWithin]);
    const [w] = windowsOf(d);
    expect(w?.ticks).toEqual([{ t: 160, mark: 'not-observed', words: '✗ Not observed' }]);
    expect(w?.toT).toBe(130);
  });

  it('alarms: a bar from the raise to its end, a ring at the acknowledgement, open to the end without one', () => {
    const alarm = (t: number, o: Partial<Row> = {}): Row => ({ t, kind: 'alarm', text: 'CVP high', ev: 'alarm:CVP_HIGH', ...o });
    const d = synth([alarm(10, { endT: 25 }), alarm(30, { endT: 40, ackT: 32 }), alarm(50)], 100, [], ['pressures', 'alarmEnd', 'cprStop']);
    const svg = svgOf(d);
    expect(count(svg, /<rect class="db-swim-alarm"/g)).toBe(2);
    expect(count(svg, /<rect class="db-swim-alarm open"/g)).toBe(1);
    expect(count(svg, /class="db-swim-ack"/g)).toBe(1);
    expect(attrs(svg, /data-end="([\d.]+)"/g).map(Number)).toEqual([25, 40]);
    expect(attrs(svg, /data-ack="([\d.]+)"/g).map(Number)).toEqual([32]);
    expect(svg).not.toContain('end not recorded');
    expect(svg).toContain('<title>CVP high 00:30 ▸ 00:40 · acknowledged 00:32</title>');
    expect(svg).toContain('<title>CVP high 00:50 ▸ (still on)</title>');
  });

  it('no lane for what the run does not have: no windows, no alarms, no drugs', () => {
    const svg = svgOf(synth([], 100));
    expect(attrs(svg, /data-lane="(\w+)"/g)).toEqual(['patient', 'team']);
    expect(label(svg)).not.toContain('expected windows');
  });

  it('six windows within 90 mm; more windows tighten their rows to 3 mm', () => {
    const objs = (n: number) => Array.from({ length: n }, () => cprWithin);
    const six = svgOf(synth([loss, { t: 110, kind: 'action', text: 'CPR started', ev: 'cpr' }], 400, objs(6)));
    expect(count(six, /<rect class="db-swim-band/g)).toBe(6);
    expect(heightOf(six)).toBeLessThanOrEqual(360);
    const nine = svgOf(synth([loss, { t: 110, kind: 'action', text: 'CPR started', ev: 'cpr' }], 400, objs(9)));
    expect(count(nine, /<rect class="db-swim-band/g)).toBe(9);
    expect(heightOf(nine) - heightOf(six)).toBe(9 * 12 - 6 * 20); // the band rows tighten from 5 mm to 3 mm
    expect(SWIM_W).toBe(728);
  });
});
