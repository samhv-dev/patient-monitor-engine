// FU-9 Task A6 (F6): the cellular K pool is finite — a renal K loss lowers plasma K (Sterns: 300 mmol per mmol/L) instead of
// being refilled to the set point.
import { describe, expect, it } from 'vitest';
import { createBloodCore, stepBloodCore } from '../../../src/l2/blood/core.ts';

const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };

describe('FU-9 F6: total-body K (Sterns 1981)', () => {
  it('rest: K stays at the set point; 20 mmol lost in the urine over 1 h lowers K for hours and the cells share the loss', () => {
    const run = (lossMmolH: number) => {
      const bc = createBloodCore(MAN, 5.25, 40);
      const kIcf0 = bc.so.kIcf;
      bc.renal = { uopAboveBasalMlH: 0, excretion: { k: lossMmolH, na: 0, cl: 0, gluconate: 0 } };
      for (let k = 0; k < 3 * 36000; k++) {
        if (k === 36000 && bc.renal) bc.renal.excretion.k = 0; // the loss stops after 1 h; read 2 h later
        stepBloodCore(bc, { t: k / 10, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);
      }
      return { k: bc.out.k, cells: bc.so.kIcf - kIcf0 };
    };
    const r = run(0);
    const l = run(20);
    console.log(`FU-9 F6: 20 mmol over 1 h, read 2 h later → K ${l.k.toFixed(3)} (rest ${r.k.toFixed(3)}), cells ${l.cells.toFixed(1)} mmol`);
    expect(r.k).toBeCloseTo(4.2, 2);
    expect(l.k).toBeLessThan(r.k - 0.05); // Sterns: 20 mmol ÷ K_TBK_MMOL 300 = −0.067 at equilibrium (measured −0.10 two hours on)
    expect(l.k).toBeGreaterThan(r.k - 0.15);
    expect(l.cells).toBeLessThan(-15); // most of the loss has come out of the cells (before FU-9 they refilled the ECF to set.k)
  });
});
