// L10a (plan docs/plans/learner-action-remote.md §L10a): the engine's lab panels on the analyser rows — each result
// after its row's turnaround, with only its row's computed analytes, and pending samples kept by snapshot and restore.
import { describe, expect, it } from 'vitest';
import { DEFAULT_ANALYSER, LABORATORY, turnaroundFor } from '../../src/l2/blood/analysers.ts';
import { createEngine } from '../../src/index.ts';
import type { EngineEvent, MonitorEngine } from '../../src/types.ts';
import { evB, MAN } from '../helpers/blood.ts';

type LabResult = Extract<EngineEvent, { type: 'labResult' }>;
const results = (e: MonitorEngine) => {
  const out: LabResult[] = [];
  e.on((x) => void (x.type === 'labResult' && out.push(x)));
  return out;
};

describe('lab panels on the analyser rows (L10a)', { timeout: 300_000 }, () => {
  it('abg, vbg, chem and coag: each returns after its turnaround with its row id and only its analytes', () => {
    const e = createEngine({ seed: 7, patient: MAN });
    const got = results(e);
    e.advanceTo(5);
    for (const panel of ['abg', 'vbg']) expect(e.dispatch(evB({ kind: 'lab', panel })).accepted).toBe(true);
    expect(e.dispatch(evB({ kind: 'lab', panel: 'chem', turnaroundS: 60 })).accepted).toBe(true); // a card's override
    expect(e.dispatch(evB({ kind: 'lab', panel: 'coag', turnaroundS: 90 })).accepted).toBe(true);
    e.advanceTo(5 + turnaroundFor('abg') + 1);
    const by = (p: string) => got.find((r) => r.panel === p);
    expect(by('abg')?.t).toBeCloseTo(by('abg')!.drawnAt + turnaroundFor('abg'), 6);
    expect(by('abg')?.analyser).toBe(DEFAULT_ANALYSER);
    expect(by('abg')?.values).not.toHaveProperty('mg');
    expect(by('vbg')?.values.pco2).toBeGreaterThan(by('abg')!.values.pco2!);
    expect(by('chem')?.t).toBeCloseTo(by('chem')!.drawnAt + 60, 6);
    expect(by('chem')?.analyser).toBe(LABORATORY.id);
    expect(Object.keys(by('chem')!.values).sort()).toEqual(['cl', 'glucose', 'k', 'mg', 'na']);
    expect(by('coag')?.values).toEqual({ inr: 1 }); // the liver model's INR, a healthy liver
  });
  it('snapshot and restore keep pending samples: the restored engine returns the same results at the same tick', () => {
    const a = createEngine({ seed: 7, patient: MAN });
    a.advanceTo(5);
    a.dispatch(evB({ kind: 'lab', panel: 'abg' }));
    a.dispatch(evB({ kind: 'lab', panel: 'chem', turnaroundS: 40 }));
    a.advanceTo(10);
    const s = JSON.parse(JSON.stringify(a.snapshot()));
    const b = createEngine({ seed: 7, patient: MAN });
    b.restore(s);
    const ra = results(a);
    const rb = results(b);
    a.advanceTo(5 + turnaroundFor('abg') + 1);
    b.advanceTo(5 + turnaroundFor('abg') + 1);
    expect(ra.map((r) => r.panel).sort()).toEqual(['abg', 'chem']);
    expect(rb).toEqual(ra);
  });
});
