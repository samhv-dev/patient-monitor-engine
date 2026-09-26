// Correction C1: a volume-controlled breath delivers the set VT on top of trapped gas (v1.9 cut it short).
import { describe, expect, it } from 'vitest';
import { advanceVent, createVent, loadPreset, runScenario } from '../src/index.ts';

describe('correction C1 — VC volume cycling measures the breath, not the lung', () => {
  it('COPD at RR 20, VT 560 (Pmax 60): every breath delivers 560 mL (± one 5 ms step of flow) while auto-PEEP climbs above 8 cmH2O', () => {
    const vs = createVent({ rate: 20, vt: 560, pmax: 60, pause: 0, flowPattern: 'decel' });
    loadPreset(vs, 'copd');
    advanceVent(vs, 60);
    expect(Math.abs(vs.p.measured.VTE - 560)).toBeLessThanOrEqual(5);
    expect(vs.p.measured.autoPEEP).toBeGreaterThan(8);
  });
  it('breath stacking: the stacked breath is a second full VT (v1.9 delivered ≈ 100 mL)', () => {
    const vs = createVent();
    runScenario(vs, 'breathStack');
    advanceVent(vs, 20);
    expect(vs.p.measured.VTE).toBeGreaterThan(340);
  });
});
