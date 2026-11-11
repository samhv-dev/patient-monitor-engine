// @vitest-environment happy-dom
// Plan learner-action-remote.md L13: the Debrief view draws the learner remotes' preparations in a section of its own on
// page 2, after the violations, from the record (debrief.ts preparationsOf); the timeline and the drugs table name the
// remote through the session's one name source (AppSession.deviceName, PR 423), never a copy of their own; a run with no
// learner remote prints no such section and no such words.
import type { Administration, StagedPrep } from '@pme/controller/scenario';
import { afterEach, describe, expect, it } from 'vitest';
import type { Link } from '../link.ts';
import { emptyRun, type RunData } from '../record.ts';
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
    expect(items[0]?.querySelector('.db-prep-head')?.textContent).toMatch(/^01:40 · Learner remote \(bed 2\) staged Dantrolene 120 mg \(5\.31 mg\/mL\) in .+, 22\.6 mL$/);
    expect(items[0]?.querySelector('.db-prep-ready')?.textContent).toMatch(/^Ready at 02:30 \(.+\)$/);
    expect([...(items[0]?.querySelectorAll('.db-prep-give') ?? [])].map((x) => x.textContent)).toEqual(['Given at 02:40: Dantrolene 120 mg active of 120 mg prepared (100 % intact)']);
  });

  it("the timeline and the drugs table name the remote by the session's name source, not the name the row kept", () => {
    const v = open(remoteRun(), (k) => (k === KEY ? 'bed 2' : null));
    leave = v.leave;
    const line = [...v.el.querySelectorAll('#db-timeline tbody tr[data-kind="learner"] td:last-child')].map((x) => x.textContent);
    expect(line).toEqual(['Dantrolene 120 mg IV at 02:40, by Learner remote (bed 2)']);
    expect([...v.el.querySelectorAll('#db-drugs tbody td:last-child')].map((x) => x.textContent)).toEqual(['Dantrolene 120 mg IV, by Learner remote (bed 2)']);
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
