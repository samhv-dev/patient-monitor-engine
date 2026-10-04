// FU-10 Task A4 (E8; research/14 ET-31): 7c's combined hyperkalaemia-treatment row reaches 7e's glucose model as its
// insulin and its dextrose; the same doses as two rows give the same glucose course.
import { describe, expect, it } from 'vitest';
import { NEUTRAL_ENDO_INPUTS, stepEndoCore } from '../../../src/l2/endo/core.ts';
import { observeDoses, type PkLike } from '../../../src/l2/endo/adapters.ts';
import { createEndoState, type EndoState } from '../../../src/l2/endo/pipeline.ts';

const dose = (agent: string, amount: number, amountUnit: string): PkLike => ({ bus: { doses: [{ agent, amount, amountUnit }] } });
const course = (give: (es: EndoState) => void): number[] => {
  const es = createEndoState({ ageY: 40, weightKg: 70 }, 70);
  give(es);
  const g: number[] = [];
  for (let s = 1; s <= 3 * 3600; s++) {
    stepEndoCore(es.core, { ...NEUTRAL_ENDO_INPUTS, weightKg: 70 }, 1);
    if (s % 60 === 0) g.push(es.core.out.glucoseMmol);
  }
  return g;
};

describe('FU-10 E8: the insulin–dextrose row moves glucose as its two parts do', () => {
  it('the combined row raises glucose at once, then drives it below baseline — within 0.1 mmol/L of the two separate rows', () => {
    const combo = course((es) => observeDoses(es, dose('insulinDextrose', 10, 'units')));
    const two = course((es) => { observeDoses(es, dose('insulin', 10, 'units')); observeDoses(es, dose('dextrose', 25000, 'mg')); });
    expect(Math.max(...combo)).toBeGreaterThan(10);
    expect(Math.min(...combo)).toBeLessThan(5);
    for (let i = 0; i < combo.length; i++) expect(Math.abs(combo[i]! - two[i]!)).toBeLessThan(0.1);
  });
  it('a combined-row dose in another unit is ignored', () => {
    const g = course((es) => observeDoses(es, dose('insulinDextrose', 10, 'mg')));
    expect(Math.max(...g) - Math.min(...g)).toBeLessThan(0.05);
  });
});
