// FU-4 Task 13a (E-FU4-11 widened; orchestrator ruling 5 / review F7): the escape pacemaker and the conducted rhythm
// must never ADD. Expectations as corrected by the ruling: sinus 50 with an intact 40/min junctional focus → 50 QRS/min
// (every escape is reset by a conducted beat); sinus 30 with the same focus → 40 QRS/min (an escape RHYTHM with AV
// dissociation), never 30 and never the sum.
// Measured on the FU-4 tree before any change (Stage 5 alone, hrvScale 0): the escape timer IS already restarted by every
// activated ventricular beat (rhythm-engine.ts `activateVentricle`: `st.escapeNextT = t + 60 / er`), so the reset the
// plan asked for exists. The sum arises elsewhere: after each junctional escape the next sinus P (0.5 s later) still
// conducts, because only a CONDUCTED P sets the AV node's refractory period (atria.ts `conductAt`, AV_NODE_ERP_S 0.25) —
// sinus 30 gives S 20.30, J 21.80, S 22.30, J 23.80 … = 60 QRS/min. The missing mechanism is AV-junctional concealment
// (or retrograde sinus reset) after a junctional escape beat, a Stage 5 conduction change outside E-FU4-11 (R45:
// it.fails with the number, reported to the orchestrator).
import { describe, expect, it } from 'vitest';
import { run5 } from '../../../helpers/s5.ts';

function qrsPerMin(hr: number): { rate: number; origins: Record<string, number> } {
  const r = run5('sinus', 120, { hr, mods: { hrvScale: 0 } });
  const b = r.beats.filter((x) => x.t > 20);
  const origins: Record<string, number> = {};
  for (const x of b) origins[x.origin] = (origins[x.origin] ?? 0) + 1;
  return { rate: (b.length / 100) * 60, origins };
}

describe('FU-4 Task 13a: escape focus and conducted rhythm do not add', () => {
  it('sinus 50 + a 40/min junctional focus → 50 QRS/min, every beat sinus (the escape is reset by each conducted beat)', () => {
    const r = qrsPerMin(50);
    expect(Math.abs(r.rate - 50)).toBeLessThanOrEqual(1);
    expect(r.origins.junctional ?? 0).toBe(0);
  });
  it.fails('sinus 30 + a 40/min junctional focus → 40 QRS/min (escape rhythm, AV dissociation) — measured 60 (30 sinus + 30 junctional: the P after each escape captures)', () => {
    const r = qrsPerMin(30);
    expect(Math.abs(r.rate - 40)).toBeLessThanOrEqual(2);
  });
  it.fails('never the sum: sinus 30 + a 40/min focus stays below 30 + 40 × ½ (45) QRS/min — measured 60', () => {
    expect(qrsPerMin(30).rate).toBeLessThan(45);
  });
});
