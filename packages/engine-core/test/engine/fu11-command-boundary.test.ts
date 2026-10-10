// FU-11 Task I1 (external review F11): a malformed command is refused with a reason, never accepted and left to throw
// or poison the state.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/index.ts';

let n = 0;
const cmd = (x: Record<string, unknown>) => ({ id: `b${n++}`, issuedBy: 'test', ...x }) as never;

describe('FU-11 I1: runtime validation (F11)', () => {
  const bad: Array<[string, Record<string, unknown>, RegExp]> = [
    ['an inherited rhythm name', { type: 'setRhythm', rhythm: 'toString' }, /unknown rhythm/],
    ['another inherited name', { type: 'setRhythm', rhythm: 'constructor' }, /unknown rhythm/],
    ['a NaN pacer rate', { type: 'setRhythm', rhythm: 'pacedVVI', opts: { pacer: { ratePpm: Number.NaN } } }, /opts\.pacer\.ratePpm/],
    ['a pacer fault rate above 1', { type: 'setRhythm', rhythm: 'pacedVVI', opts: { pacer: { faultRate: 3 } } }, /opts\.pacer\.faultRate/],
    ['a meal without its grams', { type: 'applyEvent', event: { kind: 'meal' } }, /carbohydrateG is required/],
    ['a ventilator frame with paw and flow only', { type: 'externalDrive', source: 'ventilator', frame: { pawCmH2O: 5, flowLps: 0.1 } }, /frame needs/],
    ['an inherited shock outcome', { type: 'applyEvent', event: { kind: 'defib', action: 'preselect', outcome: 'toString' } }, /outcome must be/],
    ['an inherited sepsis phase', { type: 'applyEvent', event: { kind: 'condition', id: 'sepsis', severity: 0.5, phase: 'toString' } }, /phase must be/],
  ];
  for (const [name, c, reason] of bad) {
    it(`refuses ${name}; the engine runs on with finite outputs`, () => {
      const e = createEngine({ seed: 7, mode: 'modeled' });
      e.advanceTo(2);
      const r = e.dispatch(cmd(c));
      expect(r.accepted).toBe(false);
      expect(r.reason).toMatch(reason);
      expect(() => e.advanceTo(8)).not.toThrow();
      const out = new Float32Array(500);
      expect(e.readSamples('ecgII', 3000, out)).toBe(500);
      expect(Array.from(out).every(Number.isFinite)).toBe(true);
    });
  }
  it('still accepts the valid forms (a real rhythm, a pacer rate, a meal, a full frame)', () => {
    const e = createEngine({ seed: 7, mode: 'modeled' });
    expect(e.dispatch(cmd({ type: 'setRhythm', rhythm: 'pacedVVI', opts: { pacer: { ratePpm: 70 } } })).accepted).toBe(true);
    expect(e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'meal', carbohydrateG: 50 } })).accepted).toBe(true);
    expect(e.dispatch(cmd({ type: 'externalDrive', source: 'ventilator', frame: { pawCmH2O: 5, flowLps: 0, volumeMl: 0, fio2: 0.4, peepCmH2O: 5 } })).accepted).toBe(true);
  });
});
