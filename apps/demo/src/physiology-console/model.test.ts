import { describe, expect, it } from 'vitest';
import type { EngineEvent, TruthTree } from '@pme/engine-core';
import { ConsoleModel } from './model.ts';

const truth = (t: number, tree: TruthTree): EngineEvent => ({ type: 'truth', t, tree, leaves: 0, dropped: 0, truncated: false });
const circ = (t: number, svr: number) => ({ type: 'circ', t, co: 5, sv: 70, svRv: 70, ef: 0.6, lvedv: 120, lvesv: 50, lvedp: 8, lvsp: 120, pmsf: 9, pvr: 0.1, svr, cpp: 80, supplyDemand: 4, kIsch: 1 }) as EngineEvent;

describe('ConsoleModel', () => {
  it('a truth event is the refresh point; other events fold in between', () => {
    const m = new ConsoleModel();
    expect(m.ingest(circ(1, 0.9))).toBe(false);
    expect(m.ingest(truth(1, { hemo: { circ: { p: { rSys: 0.9 } } } }))).toBe(true);
    expect(m.cur.get('ev.circ.svr')).toBe(0.9);
    expect(m.cur.get('hemo.circ.p.rSys')).toBe(0.9);
    expect(m.t).toBe(1);
    expect(m.truth.bytes).toBe(JSON.stringify({ hemo: { circ: { p: { rSys: 0.9 } } } }).length);
  });
  it('fields of stages not merged yet appear in their organ groups, unknown ones in other (fake 7b–7g tree)', () => {
    const m = new ConsoleModel();
    m.ingest(truth(1, {
      hemo: { circ: { p: { rSys: 0.9 } } },
      resp: { lung: { mech: { cL: 25, cR: 25 } } },
      blood: { core: { ab: { ph: 7.4 }, out: { k: 4.1, lactate: 1 } } },
      organs: { brain: { icp: 10 }, renal: { gfr: 110, uopMlMin: 1 }, kidney: { gfrRel: 1 }, liver: { lactate: 1 }, sensors: { icp: 'on' }, iap: 5 },
      endo: { core: { glucose: { g: 5.5 } } },
      neuro: { antinoc: 0.2 },
      pk: { bus: { cns: { propCe: 2.5 }, agents: { propofol: { unit: 'µg/mL', plasma: 3.1, brain: 2.5, cumulativeMgPerKg: 2 } } }, drugs: { propofol: { x: [1, 2, 3], rate: 0 } } },
      ecmo: { flowLpm: 4 },
    }));
    const groups = Object.fromEntries(m.rows().map((r) => [r.path, r.group]));
    expect(groups).toMatchObject({
      'resp.lung.mech.cL': 'lungs', 'blood.core.ab.ph': 'blood', 'blood.core.out.k': 'blood', 'organs.brain.icp': 'brain',
      'organs.renal.gfr': 'kidney', 'organs.liver.lactate': 'liver', 'endo.core.glucose.g': 'endocrine', 'neuro.antinoc': 'neuro',
      'pk.bus.cns.propCe': 'drugs', 'ecmo.flowLpm': 'other', 'organs.iap': 'kidney', // 7x.1: IAP is a kidney input
      'organs.kidney.gfrRel': 'kidney', 'organs.sensors.icp': 'brain', 'pk.bus.agents.propofol.brain': 'drugs',
    });
    expect(m.row('organs.renal.uopMlMin').meta.unit).toBe('mL/min');
    // 7g's bus agents carry their concentration unit as a sibling leaf; the name's own unit wins
    expect(m.row('pk.bus.agents.propofol.brain').meta.unit).toBe('µg/mL');
    expect(m.row('pk.bus.agents.propofol.cumulativeMgPerKg').meta.unit).toBe('mg/kg');
    expect([m.row('pk.drugs.propofol.x.0').internal, m.row('pk.drugs.propofol.rate').internal]).toEqual([true, false]);
  });
  it('within-beat values (circOut) never highlight, however far they move', () => {
    const m = new ConsoleModel();
    m.ingest(truth(1, { hemo: { circOut: { pLv: 5 }, circ: { p: { rSys: 0.9 } } } }));
    m.setBaseline();
    m.ingest(truth(2, { hemo: { circOut: { pLv: 120 }, circ: { p: { rSys: 1.3 } } } }));
    expect([m.row('hemo.circOut.pLv').dir, m.row('hemo.circOut.pLv').phase, m.row('hemo.circ.p.rSys').dir]).toEqual([null, true, 'up']);
  });
  it('rows sort by organ group, curated rows first, then by path', () => {
    const m = new ConsoleModel();
    m.ingest(circ(1, 0.9));
    m.ingest({ type: 'measurement', t: 1, values: { hr: { value: 70, flag: 'valid', at: 1 } } });
    m.ingest(truth(1, { hemo: { circ: { zeta: 1, p: { rSys: 0.9 } } }, zz: { a: 1 } }));
    const paths = m.rows().map((r) => r.path);
    expect(paths[0]).toBe('mon.hr');
    expect(paths.indexOf('ev.circ.co')).toBeLessThan(paths.indexOf('ev.circ.svr'));
    expect(paths.indexOf('hemo.circ.p.rSys')).toBeLessThan(paths.indexOf('hemo.circ.zeta'));
    expect(paths.at(-1)).toBe('zz.a');
  });
  it('baseline, delta, direction and a 60 s history', () => {
    const m = new ConsoleModel();
    for (let t = 1; t <= 70; t++) {
      m.ingest(circ(t, t <= 20 ? 0.9 : 1.3));
      m.ingest(truth(t, {}));
      if (t === 20) m.setBaseline();
    }
    const r = m.row('ev.circ.svr');
    expect(r.base).toBe(0.9);
    expect(r.delta).toBeCloseTo(0.4);
    expect(r.dir).toBe('up');
    expect(r.hist).toHaveLength(60);
    expect(m.baseT).toBe(20);
    m.clearHistory();
    expect(m.row('ev.circ.svr').hist).toHaveLength(0);
  });
  it('a truth path that disappears is removed; clear() forgets everything', () => {
    const m = new ConsoleModel();
    m.ingest(truth(1, { hemo: { lvad: { rpm: 5400 } } }));
    m.ingest(truth(2, { hemo: {} }));
    expect(m.cur.has('hemo.lvad.rpm')).toBe(false);
    m.setBaseline();
    m.clear();
    expect([m.cur.size, m.base, m.baseT, m.t]).toEqual([0, null, null, 0]);
  });
  it('exports JSON (raw values) and CSV (displayed values)', () => {
    const m = new ConsoleModel();
    m.ingest(circ(1, 0.9));
    m.ingest(truth(1, { resp: { site: 'a,b' } }));
    m.setBaseline();
    m.ingest(circ(2, 1.2));
    m.ingest(truth(2, { resp: { site: 'a,b' } }));
    const j = m.toJSON();
    expect(j.schema).toBe('pme-console/1');
    expect(j.values['ev.circ.svr']).toMatchObject({ group: 'circulation', label: 'SVR', unit: 'dyn·s/cm⁵', scale: 1333.22, value: 1.2, baseline: 0.9 });
    const csv = m.toCSV().split('\n');
    expect(csv[0]).toBe('group,path,label,value,unit,baseline,delta');
    expect(csv).toContain('circulation,ev.circ.svr,SVR,1600,dyn·s/cm⁵,1200,+400');
    expect(csv).toContain('lungs,resp.site,site,"a,b",,"a,b",');
  });
});
