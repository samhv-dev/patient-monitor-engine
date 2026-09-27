import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '@pme/engine-core';
import { flatten, foldEvent, type Leaves } from './flatten.ts';

describe('flatten', () => {
  it('turns a nested tree into dotted paths, arrays by index', () => {
    const out: Leaves = new Map();
    flatten({ hemo: { circ: { p: { rSys: 0.9 } }, open: true }, resp: { aer: [0.9, 0.8], site: 'radial', man: null } }, '', out);
    expect([...out]).toEqual([
      ['hemo.circ.p.rSys', 0.9], ['hemo.open', true], ['resp.aer.0', 0.9], ['resp.aer.1', 0.8], ['resp.site', 'radial'], ['resp.man', null],
    ]);
  });
  it('skips arrays longer than 16 and typed arrays', () => {
    const out: Leaves = new Map();
    flatten({ a: Array.from({ length: 17 }, () => 1), b: new Float32Array(2), c: 1 }, 'x', out);
    expect([...out]).toEqual([['x.c', 1]]);
  });
});

describe('foldEvent', () => {
  it('puts summary events under ev.<type> without t/seq/tick, and measurements under mon.<id>', () => {
    const out: Leaves = new Map();
    const circ = { type: 'circ', t: 3, co: 5.1, svr: 0.9, iabp: { ratio: 1, augmentation: 110 } } as unknown as EngineEvent;
    expect(foldEvent(circ, out)).toBe(true);
    expect(foldEvent({ type: 'measurement', t: 3, values: { hr: { value: 72, flag: 'valid', at: 3 }, spo2: { value: null, flag: 'invalid', at: 3 } } }, out)).toBe(true);
    expect(foldEvent({ type: 'state', t: 3, tick: 150, mode: 'modeled', values: { hr: 71 }, control: { hr: 'modeled' } }, out)).toBe(true);
    expect([...out]).toEqual([
      ['ev.circ.co', 5.1], ['ev.circ.svr', 0.9], ['ev.circ.iabp.ratio', 1], ['ev.circ.iabp.augmentation', 110],
      ['mon.hr', 72], ['mon.spo2', null],
      ['ev.state.mode', 'modeled'], ['ev.state.values.hr', 71], ['ev.state.control.hr', 'modeled'],
    ]);
  });
  it('ignores tones, markers, alarms and truth; folds an event type it has never seen', () => {
    const out: Leaves = new Map();
    expect(foldEvent({ type: 'tone', t: 1, id: 'q', kind: 'qrs' }, out)).toBe(false);
    expect(foldEvent({ type: 'truth', t: 1, tree: {}, leaves: 0, dropped: 0, truncated: false }, out)).toBe(false);
    expect(foldEvent({ type: 'organs', t: 1, kidney: { gfr: 110 } } as unknown as EngineEvent, out)).toBe(true);
    expect([...out]).toEqual([['ev.organs.kidney.gfr', 110]]);
  });
  it('keys object arrays by id/drugId/agent, and a new event of a type replaces that type\'s old leaves', () => {
    const out: Leaves = new Map([['ev.drugsX.a', 1]]);
    const drugs = (rows: object[]) => ({ type: 'drugs', t: 1, drugs: rows, volatile: null, macTotal: 0 }) as unknown as EngineEvent;
    foldEvent(drugs([{ id: 'propofol', ce: 2.1 }, { id: 'fentanyl', ce: 1.2 }]), out);
    expect(out.get('ev.drugs.drugs.propofol.ce')).toBe(2.1);
    expect(out.get('ev.drugs.drugs.fentanyl.ce')).toBe(1.2);
    foldEvent(drugs([{ id: 'fentanyl', ce: 1.1 }]), out); // propofol stopped and left the panel: its row goes
    expect([...out.keys()].filter((k) => k.startsWith('ev.drugs.'))).toEqual(['ev.drugs.drugs.fentanyl.id', 'ev.drugs.drugs.fentanyl.ce', 'ev.drugs.volatile', 'ev.drugs.macTotal']);
    expect(out.get('ev.drugsX.a')).toBe(1); // whole segments: another type's leaves stay
    const keyed: Leaves = new Map();
    flatten({ rows: [{ drugId: 'rocuronium', v: 1 }, { agent: 'sevoflurane', v: 2 }, { v: 3 }] }, 'x', keyed);
    expect([...keyed.keys()]).toEqual(['x.rows.rocuronium.drugId', 'x.rows.rocuronium.v', 'x.rows.sevoflurane.agent', 'x.rows.sevoflurane.v', 'x.rows.2.v']);
  });
});
