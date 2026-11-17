// @vitest-environment happy-dom
// Plan learner-action-remote.md L13: the Debrief view draws the learner remotes' preparations in a section of its own on
// page 2, after the violations, from the record (debrief.ts preparationsOf); the timeline and the drugs table name the
// remote by the name Room setup gives it now, else by the record's number for it; a run with no learner remote prints
// no such section and no such words. A rate change reads as a change, and a record saved before either still opens.
import type { Administration, StagedPrep } from '@pme/controller/scenario';
import { afterEach, describe, expect, it } from 'vitest';
import type { Link } from '../link.ts';
import { emptyRun, type Row, type RunData } from '../record.ts';
import mhV2 from '../showcase/showcase-mh-v2.json';
import type { AppSession } from '../session.ts';
import { debriefView } from './debrief.ts';

const KEY = 'bed2remote01';
function open(data: RunData, deviceName: (k: string) => string | null = () => null): { el: HTMLElement; leave?: () => void } {
  const link = { onChange: () => () => undefined, ctl: { scenario: {} } } as unknown as Link;
  const view = debriefView({ record: { data }, deviceName, formulary: null } as unknown as AppSession, link);
  document.body.append(view.el);
  view.enter?.('');
  return { el: view.el, leave: view.leave };
}

const PREP: StagedPrep = {
  id: 'p0000002', by: KEY, t: 100, drugId: 'dantrolene', productId: 'agilus-120mg', diluent: 'water', concentration: { amount: 120, unit: 'mg', perMl: 120 / 22.6 }, volumeMl: 22.6,
  findings: [], notice: null, actives: [{ drugId: 'dantrolene', amount: 120, unit: 'mg', perMl: 120 / 22.6 }], ready: { atS: 150, gap: null, src: ['emc-15912'] },
};
function remoteRun(): RunData {
  const d = emptyRun('P', 70);
  d.doc = structuredClone(mhV2) as never;
  d.format = 2;
  d.phases = [{ id: (mhV2 as { phases: Array<{ id: string }> }).phases[0]!.id, t: 0, rule: 'initial' }];
  d.edges = [];
  const give: Administration = {
    seq: 1, t: 160, source: 'learner', by: KEY, kind: 'drug', drugId: 'dantrolene', dose: 120, unit: 'mg', route: 'iv', result: { accepted: true },
    prep: { ...PREP, remaining: 1, activeAmount: 120, unit: 'mg', basis: { src: null, beyondData: false, note: 'loss not known' } },
  };
  d.admin = [give];
  d.preps = [PREP];
  d.rows.push({ t: 160, kind: 'learner', remote: true, by: KEY, name: 'old name', text: 'Dantrolene 120 mg IV', ev: 'drug:dantrolene', prepId: PREP.id, dose: { drugId: 'dantrolene', dose: 120, unit: 'mg' } });
  for (let t = 0; t <= 200; t++) d.samples.push({ t, hr: 80, map: 80, spo2: 98, etco2: 40, rr: 12, temp: 37, k: null, lactate: null, ph: null, glucose: null, tcore: null });
  return d;
}

describe('L13: the Debrief view', () => {
  let leave: (() => void) | undefined;
  afterEach(() => (leave?.(), document.body.replaceChildren()));

  it('page 2 has a Preparations section after the violations, one item per preparation with its lines', () => {
    const v = open(remoteRun(), (k) => (k === KEY ? 'bed 2' : null));
    leave = v.leave;
    const sec = v.el.querySelector('#db-preparations');
    expect(sec?.querySelector('h2')?.textContent).toBe('Preparations');
    expect(sec?.closest('#db-live-2')).not.toBeNull();
    const order = [...v.el.querySelectorAll('#db-live-2 > section')].map((s) => s.id);
    expect(order.indexOf('db-preparations')).toBe(order.indexOf('db-violations') + 1);
    const items = [...(sec?.querySelectorAll('.db-preps > li') ?? [])];
    expect(items).toHaveLength(1);
    expect(items[0]?.querySelector('.db-prep-head')?.textContent).toMatch(/^01:40 · bed 2 staged Dantrolene 120 mg \(5\.31 mg\/mL\) in .+, 22\.6 mL$/);
    expect(items[0]?.querySelector('.db-prep-ready')?.textContent).toMatch(/^Ready at 02:30 \(.+\)$/);
    expect([...(items[0]?.querySelectorAll('.db-prep-give') ?? [])].map((x) => x.textContent)).toEqual(['Given at 02:40: Dantrolene 120 mg active of 120 mg prepared (100 % intact)']);
  });

  it("the timeline and the drugs table name the remote by the session's name source, not the name the row kept", () => {
    const v = open(remoteRun(), (k) => (k === KEY ? 'bed 2' : null));
    leave = v.leave;
    const line = [...v.el.querySelectorAll('#db-timeline tbody tr[data-kind="learner"] td:last-child')].map((x) => x.textContent);
    expect(line).toEqual(['Dantrolene 120 mg IV at 02:40, by bed 2']);
    expect([...v.el.querySelectorAll('#db-drugs tbody td:last-child')].map((x) => x.textContent)).toEqual(['Dantrolene 120 mg IV, by bed 2']);
  });

  it("no name in Room setup: the record's number for the remote, as the Log and the Room page say it; never its key", () => {
    const d = remoteRun();
    d.rows = d.rows.map(({ name: _n, ...r }) => r);
    d.devices = { learner: ['otherphone01', KEY] };
    const v = open(d);
    leave = v.leave;
    expect([...v.el.querySelectorAll('#db-timeline tbody tr[data-kind="learner"] td:last-child')].map((x) => x.textContent)).toEqual(['Dantrolene 120 mg IV at 02:40, by Learner remote 2']);
    expect(v.el.querySelector('.db-prep-head')?.textContent).toMatch(/^01:40 · Learner remote 2 staged /);
    expect(v.el.textContent).not.toContain(KEY);
  });

  it('no learner remote: no Preparations section, and no learner words anywhere', () => {
    const d = remoteRun();
    d.admin = d.admin!.map(({ prep: _p, by: _b, ...a }) => ({ ...a, source: 'panel' as const }));
    d.preps = [];
    d.rows = d.rows.map(({ remote: _r, by: _b, name: _n, prepId: _i, ...r }) => ({ ...r, kind: 'action' as const }));
    const v = open(d);
    leave = v.leave;
    expect(v.el.querySelector('#db-preparations')).toBeNull();
    expect(v.el.textContent).not.toMatch(/Learner remote|staged|Notice (not )?shown/);
  });
});

describe("the Debrief view: an infusion's start, change and stop, and who acted", () => {
  let leave: (() => void) | undefined;
  afterEach(() => (leave?.(), document.body.replaceChildren()));
  const PUMP = 'pumptab0001';
  const run = (): RunData => {
    const d = emptyRun('P', 70);
    const inf = (t: number, text: string) => d.rows.push({ t, kind: 'learner', remote: true, by: KEY, text, ev: 'drug:phenylephrine' });
    inf(60, 'Phenylephrine 10 mL/h infusion started');
    inf(90, 'Phenylephrine infusion rate changed from 10 to 20 mL/h');
    (d.rows.at(-1) as Row).replaced = { rate: 10, rateUnit: 'mL/h', by: 'laptop' };
    inf(120, 'Phenylephrine infusion stopped');
    d.rows.push({ t: 130, kind: 'pump', channel: 2, by: PUMP, text: 'Channel 2 (Propofol): rate changed from 20 to 30 mL/h', ev: 'drug:propofol' });
    d.devices = { learner: [KEY], pump: [PUMP] };
    for (let t = 0; t <= 200; t++) d.samples.push({ t, hr: 80, map: 80, spo2: 98, etco2: 40, rr: 12, temp: 37, k: null, lactate: null, ph: null, glucose: null, tcore: null });
    return d;
  };
  const timeline = (el: HTMLElement) => [...el.querySelectorAll('#db-timeline tbody tr td:last-child')].map((x) => x.textContent);

  it('the timeline says a start, a change with the rate it replaced and whose it was, a stop, and the pump tablet by its number', () => {
    const v = open(run());
    leave = v.leave;
    expect(timeline(v.el)).toEqual([
      'Phenylephrine 10 mL/h infusion started at 01:00, by Learner remote 1',
      "Phenylephrine infusion rate changed from 10 to 20 mL/h at 01:30, by Learner remote 1, replacing the instructor's rate",
      'Phenylephrine infusion stopped at 02:00, by Learner remote 1',
      'Channel 2 (Propofol): rate changed from 20 to 30 mL/h, by Pump tablet 1',
    ]);
    expect([...v.el.querySelectorAll('#db-drugs tbody td:last-child')].map((x) => x.textContent)).toEqual([
      'Phenylephrine 10 mL/h infusion started, by Learner remote 1',
      'Phenylephrine infusion rate changed from 10 to 20 mL/h, by Learner remote 1',
      'Phenylephrine infusion stopped, by Learner remote 1',
      'Channel 2 (Propofol): rate changed from 20 to 30 mL/h, by Pump tablet 1',
    ]);
    // the totals count boluses: a rate change adds none
    expect(v.el.querySelector('.db-totals')).toBeNull();
  });

  it('a record saved before device numbers and rate changes were kept still opens: its words, the replaced rate, the remotes in row order', () => {
    const d = run();
    delete d.devices;
    d.keeps = ['pressures', 'alarmEnd', 'cprStop', 'recognised'];
    const change = d.rows[1] as Row;
    change.text = 'Phenylephrine 20 mL/h infusion started';
    const v = open(JSON.parse(JSON.stringify(d)) as RunData);
    leave = v.leave;
    expect(timeline(v.el)).toEqual([
      'Phenylephrine 10 mL/h infusion started at 01:00, by Learner remote 1',
      "Phenylephrine 20 mL/h infusion started at 01:30, by Learner remote 1, replacing the instructor's 10 mL/h",
      'Phenylephrine infusion stopped at 02:00, by Learner remote 1',
      'Channel 2 (Propofol): rate changed from 20 to 30 mL/h, by Pump tablet 1',
    ]);
  });
});
