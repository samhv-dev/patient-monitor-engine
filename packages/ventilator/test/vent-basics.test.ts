// The ported engine's headline behaviours (the exact traces are Task 4's fidelity test).
import { describe, expect, it } from 'vitest';
import { advanceVent, createVent, manualBreath, MODE_MAP, modeName, runScenario, setMode, toggleHold } from '../src/index.ts';

describe('ventilator engine', () => {
  it('default (S)CMV+: 5 breaths in 20 s, VTE 500, PIP 24.9, plateau 15, 4 steps per 20 ms', () => {
    const vs = createVent();
    advanceVent(vs, 20);
    expect(vs.n).toBe(4000);
    expect(vs.p.breathCount).toBe(5);
    expect(vs.p.measured.VTE).toBeCloseTo(500, 0);
    expect(vs.p.measured.PIP).toBeCloseTo(24.88, 1);
    expect(vs.p.measured.PLAT).toBeCloseTo(15, 0);
    expect(modeName(vs.cfg)).toBe('(S)CMV+');
  });
  it('APVcmv (PRVC) converges on its 450 mL target in 60 s at C 35', () => {
    const vs = createVent({ compliance: 35, rate: 16 });
    setMode(vs, 'PRVC');
    advanceVent(vs, 60);
    expect(Math.abs(vs.p.measured.VTE - 450)).toBeLessThan(5);
  });
  it('holds: an inspiratory hold stops flow at the next cycle point; a manual breath is patient-type', () => {
    const vs = createVent();
    toggleHold(vs, 'insp');
    advanceVent(vs, 5);
    expect(vs.hold).toBe('insp');
    expect(vs.p.Q).toBe(0);
    toggleHold(vs, 'insp');
    advanceVent(vs, 8);
    while (vs.p.phase !== 'exp') advanceVent(vs, vs.n * 0.005 + 0.005);
    manualBreath(vs);
    expect(vs.p.markers.at(-1)?.type).toBe('pt');
  });
  it('asynchrony scenarios load and run; Hamilton names map to engine modes', () => {
    const vs = createVent();
    runScenario(vs, 'autoTrig');
    advanceVent(vs, 20);
    expect(vs.p.breathCount).toBe(11);
    expect([MODE_MAP.DuoPAP, MODE_MAP.ASV, MODE_MAP['NIV-ST']]).toEqual(['PC', 'PAV', 'PSV']);
  });
});
