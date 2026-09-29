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
  // Stage V.1 on FU-4's tree (gate note §8): FU-4 F3 made the tension pneumothorax a one-way-valve BUILD-UP (`lp.pPtx`
  // is the accumulated pressure, the catalogue value its ceiling) and FU-4 G6 made 7a's `tensionPtx` an alias of the
  // lungs' `ptxTension` (7a's ext.pPtx is no longer written). The plan's step to 27.2 at +20 s is therefore replaced by
  // the seam itself: lungState carries the lungs' pleural pressure in cmH2O (max-combined with 7a's ext.pPtx, never
  // summed). Measured: +10 s 7.9, +20 s 11.1, +40 s 14.7, +10 min 20.9 (ceiling 27.2 not reached on this ventilator).
  it('Stage V.1: pleuralCmH2O is 0 in healthy lungs and the lungs\' accumulated pPtx in cmH2O with ptxTension 0.8 (FU-4 valve: 11.1 at +20 s, 20.9 at +10 min, ceiling 27.2) and with 7a\'s tensionPtx 1 (an alias since FU-4 G6: max-combined, not added)', () => {
    const r = rig3({ patient: { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M' } });
    const lungPtx = () => (r.e.snapshot().state as { st: { resp: { lung: { lp: { pPtx: number } }; circPtx: number } } }).st.resp;
    const seam = () => Math.round((Math.max(lungPtx().lung.lp.pPtx, lungPtx().circPtx) / 0.7356) * 10) / 10;
    r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr: 14, vtMl: 490, peep: 5, ie: 2, fio2: 0.5 }));
    r.e.advanceTo(20);
    expect(last(r.ev).pleuralCmH2O).toBe(0);
    r.e.dispatch(ev3({ kind: 'lungCondition', id: 'ptxTension', severity: 0.8 }));
    // each lungState event against the state at its own emission (it is throttled to ≤ 1/s while the valve jumps per breath)
    const atEmission = (t0: number, t1: number): number => {
      let n = r.ev.length;
      for (let t = t0; t <= t1 + 1e-9; t += 0.1) {
        r.e.advanceTo(t);
        if (r.ev.length > n && last(r.ev).t > t - 0.1) expect(Math.abs((last(r.ev).pleuralCmH2O ?? NaN) - seam()), `seam at ${t.toFixed(1)} s`).toBeLessThanOrEqual(0.15);
        n = r.ev.length;
      }
      return last(r.ev).pleuralCmH2O ?? NaN;
    };
    let prev = 0;
    for (const t of [40, 80, 620]) {
      r.e.advanceTo(t - 5);
      const p = atEmission(t - 5, t);
      expect(p, `build-up at ${t} s`).toBeGreaterThan(prev);
      expect(p).toBeLessThanOrEqual(27.2 + 0.05); // the ceiling: 0.8 × 25 mmHg
      prev = p;
    }
    expect(prev).toBeGreaterThan(15);
    r.e.dispatch(ev3({ kind: 'condition', id: 'tensionPtx', severity: 1 }));
    r.e.advanceTo(675);
    const p7a = atEmission(675, 680);
    expect(lungPtx().circPtx).toBe(0); // FU-4 G6: 7a keeps no second pleural source
    expect(p7a).toBeGreaterThan(prev);
    expect(p7a).toBeLessThanOrEqual(34.0 + 0.05); // severity 1 ceiling 25 mmHg — one pressure, not 27.2 + 34
  });
});
