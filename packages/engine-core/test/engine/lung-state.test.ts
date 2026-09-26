import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
import { ev3, rig3 } from '../helpers/resp.ts';

type LS = Extract<EngineEvent, { type: 'lungState' }>;
const last = (ev: EngineEvent[]): LS => ev.filter((x): x is LS => x.type === 'lungState').at(-1)!;

describe('lungState (R27) with per-lung fields (R43)', { timeout: 300_000 }, () => {
  it('healthy ventilated adult: C ≈ 55, R ≈ 10, two ventilated lungs 45/55', () => {
    const r = rig3({ patient: { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M' } });
    r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr: 14, vtMl: 490, peep: 5, ie: 2, fio2: 0.4 }));
    r.e.advanceTo(60);
    const s = last(r.ev);
    expect(s.complianceMlPerCmH2O).toBeGreaterThan(48);
    expect(s.complianceMlPerCmH2O).toBeLessThan(62);
    expect(s.resistanceCmH2OPerLps).toBeGreaterThan(8);
    expect(s.resistanceCmH2OPerLps).toBeLessThan(12);
    expect(s.lungs?.map((l) => l.ventilated)).toEqual([true, true]);
    expect(s.lungs?.[0]?.perfusionFrac).toBeCloseTo(0.45, 1);
    expect(s.chestWallComplianceMlPerCmH2O).toBeGreaterThan(150);
  });
  it('COPD GOLD 3 at RR 20: auto-PEEP > 5 cmH2O, tendency > 0.5, slow compartment reported', () => {
    const r = rig3({ patient: { ageY: 65, weightKg: 70, heightCm: 175, sex: 'M', lungConditions: [{ id: 'copd', severity: 0.75 }] } });
    r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr: 20, vtMl: 560, peep: 5, ie: 2, fio2: 0.4 }));
    r.e.advanceTo(90);
    const s = last(r.ev);
    expect(s.autoPeepCmH2O ?? 0).toBeGreaterThan(5);
    expect(s.autoPeepTendency).toBeGreaterThan(0.5);
    expect(s.fSlow).toBeCloseTo(0.5, 2);
    expect(s.tauSlowS).toBeCloseTo(2, 1);
    expect(s.conditions).toEqual([{ id: 'copd', severity: 0.75 }]);
  });
  it('OLV: one lung not ventilated, whole compliance falls to 0.55–0.7 of two-lung', () => {
    const r = rig3({ patient: { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M' } });
    r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr: 14, vtMl: 490, peep: 5, ie: 2, fio2: 1 }));
    r.e.advanceTo(30);
    const two = last(r.ev).complianceMlPerCmH2O;
    r.e.dispatch(ev3({ kind: 'lungCondition', id: 'olv', severity: 1, side: 'L' }));
    r.e.advanceTo(60);
    const s = last(r.ev);
    expect(s.lungs?.map((l) => l.ventilated)).toEqual([false, true]);
    expect(s.complianceMlPerCmH2O / two).toBeGreaterThan(0.55);
    expect(s.complianceMlPerCmH2O / two).toBeLessThan(0.7);
  });
});
