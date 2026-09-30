// Stage V.1 seams in the 7b lung module: the pleural pressure the ventilator must see (ventReference, G7b ruling 5) and
// the lung-water shunt's PEEP response (E-V1-2: tables §4.5 / catalogue §13 "PEEP ×(1 − 0.04·PEEP)").
import { describe, expect, it } from 'vitest';
import { resolveLung } from '../../../src/l2/lung/conditions.ts';
import { extraShuntAt } from '../../../src/l2/lung/lung.ts';
import { ventReference } from '../../../src/l2/lung/vent-reference.ts';

describe('ventReference carries the pleural-space pressure (cmH2O above normal)', () => {
  it('tension pneumothorax 0.8: pPtx 20 mmHg → 27.2; haemothorax 1.5 L → 4.1; effusion 1.5 L → 1.5; healthy lungs 0', () => {
    expect(ventReference({ id: 'ptxTension', severity: 0.8 }).pleuralCmH2O).toBeCloseTo(27.2, 1);
    expect(ventReference({ id: 'haemothorax', severity: 0.5 }).pleuralCmH2O).toBeCloseTo(4.1, 1);
    expect(ventReference({ id: 'effusion', severity: 0.5 }).pleuralCmH2O).toBeCloseTo(1.5, 1);
    expect(ventReference({ id: 'ards', severity: 0.67 }).pleuralCmH2O).toBe(0);
  });
});

describe('E-V1-2: the lung-water part of the extra shunt falls with PEEP ×(1 − 0.04·PEEP)', () => {
  it('pulmonary oedema 1: water shunt 0.175 → 0.14 at PEEP 5, 0.091 at 12, 0 from 25 cmH2O', () => {
    const { lp } = resolveLung([{ id: 'pulmOedema', severity: 1 }], 70);
    expect(lp.waterShunt).toBeCloseTo(0.175, 6);
    expect(extraShuntAt(lp, 0)).toBeCloseTo(0.175, 6);
    expect(extraShuntAt(lp, 5)).toBeCloseTo(0.14, 6);
    expect(extraShuntAt(lp, 12)).toBeCloseTo(0.091, 6);
    expect(extraShuntAt(lp, 30)).toBeCloseTo(0, 6);
  });
  it('aspiration pneumonitis counts (data: "lung-water shunt"); the ILD/chest-wall/PE extra shunts do not move with PEEP', () => {
    expect(resolveLung([{ id: 'aspiration', severity: 1, side: 'R' }], 70).lp.waterShunt).toBeCloseTo(0.2, 6);
    for (const id of ['ild', 'chestWall', 'pe'] as const) {
      const { lp } = resolveLung([{ id, severity: 1 }], 70);
      expect(lp.waterShunt, id).toBe(0);
      expect(extraShuntAt(lp, 15), id).toBeCloseTo(lp.extraShunt, 9);
    }
  });
  it('7c\'s lung water (EVLWI above 10 mL/kg) is water shunt too', () => {
    const { lp } = resolveLung([], 70, 6); // EVLWI 7 + 6 = 13 → +0.09 (FU-6 R6: the Stage 3 `rawEvent` argument is retired)
    expect(lp.waterShunt).toBeCloseTo(0.09, 6);
    expect(extraShuntAt(lp, 10)).toBeCloseTo(0.09 * 0.6, 6);
  });
});
