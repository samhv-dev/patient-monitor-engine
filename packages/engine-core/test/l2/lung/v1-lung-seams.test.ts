// Stage V.1 seams in the 7b lung module: the pleural pressure the ventilator must see (ventReference, G7b ruling 5) and
// the lung-water shunt's PEEP response (E-V1-2: tables §4.5 / catalogue §13 "PEEP ×(1 − 0.04·PEEP)").
import { describe, expect, it } from 'vitest';
import { ventReference } from '../../../src/l2/lung/vent-reference.ts';

describe('ventReference carries the pleural-space pressure (cmH2O above normal)', () => {
  it('tension pneumothorax 0.8: pPtx 20 mmHg → 27.2; haemothorax 1.5 L → 4.1; effusion 1.5 L → 1.5; healthy lungs 0', () => {
    expect(ventReference({ id: 'ptxTension', severity: 0.8 }).pleuralCmH2O).toBeCloseTo(27.2, 1);
    expect(ventReference({ id: 'haemothorax', severity: 0.5 }).pleuralCmH2O).toBeCloseTo(4.1, 1);
    expect(ventReference({ id: 'effusion', severity: 0.5 }).pleuralCmH2O).toBeCloseTo(1.5, 1);
    expect(ventReference({ id: 'ards', severity: 0.67 }).pleuralCmH2O).toBe(0);
  });
});
