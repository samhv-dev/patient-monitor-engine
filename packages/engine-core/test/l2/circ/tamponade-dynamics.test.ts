// FU-4 G6 (Task 9): tamponade as a pericardial fluid volume that accumulates and drains. Targets (R45; Spodick 2003):
// severity-only commands unchanged; accumulation raises CVP ≈ PAWP and lowers CO; draining 50 mL from a 360 mL
// tamponade at MAP < 60 raises MAP ≥ 15 mmHg within 1 min.
import { describe, expect, it } from 'vitest';
import { createOut } from '../../../src/l2/circ/circuit.ts';
import { applyCircCondition, TAMPONADE_MAX_ML, TAMPONADE_ML } from '../../../src/l2/circ/conditions.ts';
import { circOnBeat, createCircModel, RESTING_ENV, stepCircModel, type CircModelState } from '../../../src/l2/circ/model.ts';

/** Beat at the model's own requested rate for `s` seconds; returns the mean radial pressure of the last 5 s. */
function advance(m: CircModelState, s: number): number {
  const o = createOut();
  const t1 = m.t + s;
  let next = m.t;
  let sum = 0;
  let n = 0;
  while (m.t < t1 - 1e-9) {
    if (m.t >= next) {
      circOnBeat(m, next, m.hrModel, 'sinus', true);
      next += 60 / m.hrModel;
    }
    stepCircModel(m, Math.min(t1, m.t + 0.02), RESTING_ENV, o);
    if (m.t > t1 - 5) { sum += o.pRad; n++; }
  }
  return sum / Math.max(1, n);
}

describe('FU-4 G6: tamponade dynamics', () => {
  it('severity only: the same static 250 mL × severity as before', () => {
    const m = createCircModel();
    applyCircCondition(m, 'tamponade', 0.8);
    expect(m.ext.vFluid).toBe(TAMPONADE_ML * 0.8);
    expect(m.ext.vFluidRate ?? 0).toBe(0);
  });
  it('accumulates at rateMlPerMin, bounded by TAMPONADE_MAX_ML; a negative rate drains to 0', () => {
    const m = createCircModel();
    applyCircCondition(m, 'tamponade', 0, { rateMlPerMin: 60 });
    advance(m, 60);
    expect(m.ext.vFluid).toBeGreaterThan(55);
    expect(m.ext.vFluid).toBeLessThan(65);
    applyCircCondition(m, 'tamponade', 1, { volumeMl: 490, rateMlPerMin: 60 });
    advance(m, 30);
    expect(m.ext.vFluid).toBe(TAMPONADE_MAX_ML);
    applyCircCondition(m, 'tamponade', 1, { rateMlPerMin: -200 });
    advance(m, 180);
    expect(m.ext.vFluid).toBe(0);
  });
  it('draining 50 mL from a decompensated 360 mL tamponade raises MAP ≥ 15 mmHg within 1 min (Spodick 2003; prototype 47 → 77)', () => {
    const m = createCircModel();
    applyCircCondition(m, 'tamponade', 1, { volumeMl: 360 });
    const before = advance(m, 120);
    applyCircCondition(m, 'tamponade', 1, { volumeMl: 310 });
    const after = advance(m, 60);
    console.log(`tamponade 360 → 310 mL: MAP ${before.toFixed(0)} → ${after.toFixed(0)}`);
    expect(before).toBeLessThan(60);
    expect(after - before).toBeGreaterThanOrEqual(15);
  });
});
