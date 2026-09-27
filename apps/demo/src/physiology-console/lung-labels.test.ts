// 7x.1 (FU-3 item 12): the 7b lung tree (`resp.lung`) is labelled for a clinician — per side (0 = L, 1 = R) and per
// mechanical unit (0/1 = L fast/slow, 2/3 = R fast/slow: engine-core l2/lung/side.ts `mechParams`) — instead of raw
// keys and bare indices ("cL", "0").
import { describe, expect, it } from 'vitest';
import { createEngine } from '@pme/engine-core';
import { PRESETS } from './actions.ts';
import { ConsoleModel } from './model.ts';
import { metaOf } from './meta.ts';
import { isInternal } from './organs.ts';

describe('7b lung paths: curated labels and units', () => {
  it.each([
    ['resp.lung.lp.side.0.cL', 'L lung compliance', 'mL/cmH₂O', 1],
    ['resp.lung.lp.side.1.rLung', 'R airway resistance', 'cmH₂O/L/s', 1],
    ['resp.lung.lp.side.1.atel', 'R atelectasis (condition)', '%', 100],
    ['resp.lung.aer.1', 'R aerated fraction', '%', 100],
    ['resp.lung.perf.f.0', 'L perfusion share', '%', 100],
    ['resp.lung.perf.shunt.1', 'R shunt', '%', 100],
    ['resp.lung.o2.fa.1', 'R FAO₂', '%', 100],
    ['resp.lung.hpv.a1.0', 'L HPV activation (fast)', '', 1],
    ['resp.lung.rec.ind.1', 'R induction atelectasis', '%', 100],
    ['resp.lung.mech.v.2', 'R fast unit volume', 'mL', 1],
    ['resp.lung.co2.pA.0', 'L fast unit PACO₂', 'mmHg', 1],
    ['resp.lung.mp.units.3.rIn', 'R slow unit R insp', 'cmH₂O/L/s', 1000],
    ['resp.lung.lp.ccw', 'Chest-wall compliance', 'mL/cmH₂O', 1],
    ['resp.lung.peepTot', 'Total PEEP', 'cmH₂O', 1],
  ] as const)('%s → "%s" (%s)', (path, label, unit, scale) => {
    expect(metaOf(path)).toMatchObject({ label, unit, scale });
    expect(metaOf(path).rank).toBeLessThan(Number.POSITIVE_INFINITY);
  });

  it('every visible resp.lung leaf of a running MODELED engine is curated; per-lung rows name their side', () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: PRESETS[0]?.profile, truthHz: 1 });
    const m = new ConsoleModel();
    e.on((x) => void m.ingest(x));
    e.advanceTo(10);
    const lung = [...m.cur.keys()].filter((p) => p.startsWith('resp.lung') && !isInternal(p));
    expect(lung.length).toBeGreaterThan(100);
    const raw = lung.filter((p) => metaOf(p).rank === Number.POSITIVE_INFINITY);
    expect(raw).toEqual([]);
    for (const p of lung.filter((x) => /\.\d+(\.|$)/.test(x))) expect(metaOf(p).label, p).toMatch(/^[LR] /);
  });
});
