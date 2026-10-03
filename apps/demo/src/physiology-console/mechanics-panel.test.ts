// Stage 7k (R57): the Ventilation panel — the console group "Respiratory mechanics and volumes" (Stage 9's Explore
// section title) with glossary labels (research/11 §5.6), fed by a running engine on the internal ventilator.
import { describe, expect, it } from 'vitest';
import { createEngine, type Command } from '@pme/engine-core';
import { ConsoleModel } from './model.ts';
import { metaOf } from './meta.ts';
import { GROUPS, groupOf, isInternal } from './organs.ts';

const ev = (event: Record<string, unknown>) => ({ id: `c${Math.random()}`, issuedBy: 'test', type: 'applyEvent', event }) as unknown as Command;

describe('Stage 7k: Ventilation panel', () => {
  it('the group follows "Lungs & gas exchange" and takes resp.mechanics, resp.vd and resp.volumes', () => {
    const ids = GROUPS.map((g) => g.id as string);
    expect(ids.indexOf('mechanics')).toBe(ids.indexOf('lungs') + 1);
    expect(GROUPS.find((g) => g.id === 'mechanics')?.title).toBe('Respiratory mechanics and volumes');
    for (const p of ['resp.mechanics.dp', 'resp.vd.vdvt', 'resp.volumes.fev1', 'resp.volumes.pred.tlc']) expect(groupOf(p), p).toBe('mechanics');
    expect(isInternal('resp.volumes.fe.tau.1')).toBe(true);
    expect(isInternal('resp.mechanics.kind')).toBe(true);
    expect(isInternal('resp.mechanics.t')).toBe(true);
  });
  it.each([
    ['resp.mechanics.ppeak', 'Ppeak', 'cmH₂O', 1], ['resp.mechanics.pplat', 'Pplat', 'cmH₂O', 1], ['resp.mechanics.peepi', 'PEEPi (auto-PEEP)', 'cmH₂O', 1],
    ['resp.mechanics.dp', 'ΔP', 'cmH₂O', 1], ['resp.mechanics.cstat', 'Cstat', 'mL/cmH₂O', 1], ['resp.mechanics.pesEe', 'Pes,ee est.', 'cmH₂O', 1],
    ['resp.vd.vdvt', 'VD/VT', '%', 100], ['resp.volumes.ratio', 'FEV₁/FVC', '%', 100], ['resp.volumes.pef', 'PEF', 'L/min', 0.06],
  ] as const)('%s → "%s" (%s)', (path, label, unit, scale) => expect(metaOf(path)).toMatchObject({ label, unit, scale }));
  it('a ventilated engine fills the panel: ΔP and Cstat rows (Stage 9 timed task 5), every visible leaf labelled', () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175 }, truthHz: 1 });
    const m = new ConsoleModel();
    e.on((x) => void m.ingest(x));
    e.dispatch(ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 }));
    e.advanceTo(30);
    const paths = [...m.cur.keys()].filter((p) => groupOf(p) === 'mechanics' && !isInternal(p));
    const labels = paths.map((p) => metaOf(p).label);
    expect(labels).toEqual(expect.arrayContaining(['ΔP', 'Cstat', 'Ppeak', 'Pplat', 'PEEPtot', 'VD/VT', 'FRC', 'TLC', 'FEV₁/FVC']));
    expect(paths.filter((p) => metaOf(p).rank === Number.POSITIVE_INFINITY)).toEqual([]);
  });
});
