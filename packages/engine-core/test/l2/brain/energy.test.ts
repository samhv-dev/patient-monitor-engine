// The brain's energy state: the cortex entry from its O2 delivery (Miller Ch35 pp. 1105, 1122, 1126), and its place in
// the brain model's step.
import { describe, expect, it } from 'vitest';
import { brainDo2Rel, CORTEX, createBrainEnergy, functionLoss, stepBrainEnergy } from '../../../src/l2/brain/energy.ts';
import { NO_DRUGS } from '../../../src/l2/brain/flow.ts';
import { brainParams, createBrain, stepBrain, type BrainInputs } from '../../../src/l2/brain/model.ts';
import { BRAIN_DT_S } from '../../../src/l2/brain/params.ts';

// The EEG cortex's own definitions before the state existed, written out as the reference the entry must equal.
const caRef = (hb: number, sao2: number, pao2: number) => 1.34 * hb * sao2 + 0.003 * pao2;
const refDelivery = (cbfRel: number, hb: number, sao2: number, pao2: number) => (Math.max(0, cbfRel) * caRef(hb, sao2, pao2)) / caRef(14, 0.97, 95);
const refMetabolic = (d: number) => Math.max(0, Math.min(1, (20 / 50 - d) / (20 / 50 - 12 / 50)));
const GASES = [
  { hb: 14, sao2: 0.97, pao2: 95 },
  { hb: 7, sao2: 0.97, pao2: 95 },
  { hb: 14, sao2: 0.65, pao2: 35 },
];

describe('the cortex entry', () => {
  it('C34: function fails below CBF 20 of 50 mL/100 g/min of delivery (0.4) and is gone toward 12 (0.24) (Ch35 p. 1122)', () => {
    expect(functionLoss(0.45, CORTEX)).toBe(0);
    expect(functionLoss(0.4, CORTEX)).toBe(0);
    expect(functionLoss(0.32, CORTEX)).toBeCloseTo(0.5, 9);
    expect(functionLoss(0.24, CORTEX)).toBe(1);
    // hypoxaemia acts through the same delivery: compensated by flow it changes nothing (Ch35 p. 1126)
    expect(brainDo2Rel(1, 14, 0.97, 95)).toBeCloseTo(1, 9);
    expect(brainDo2Rel(1.5, 14, 0.65, 35)).toBeGreaterThan(0.95);
    expect(brainDo2Rel(1, 14, 0.3, 20)).toBeLessThan(0.4);
  });

  it('metabolic is bit-identical to the EEG cortex\'s own definition over delivery 0…1.2', () => {
    for (let i = 0; i <= 2400; i++) {
      const d = i / 2000;
      expect(Object.is(functionLoss(d, CORTEX), refMetabolic(d)), `delivery ${d}`).toBe(true);
    }
  });

  it('stepped on a supply: delivery and metabolic bit-identical to the reference, fn = 1 − metabolic, fn exactly 1 at normal supply', () => {
    const e = createBrainEnergy();
    for (const g of GASES)
      for (let i = 0; i <= 1500; i++) {
        const cbfRel = i / 1000 - 0.1;
        stepBrainEnergy(e, { cbfRel, ...g });
        const d = refDelivery(cbfRel, g.hb, g.sao2, g.pao2);
        expect(Object.is(e.cortex.delivery, d), `cbf ${cbfRel}`).toBe(true);
        expect(Object.is(e.cortex.metabolic, refMetabolic(d)), `cbf ${cbfRel}`).toBe(true);
        expect(e.cortex.fn).toBe(1 - e.cortex.metabolic);
        if (d >= CORTEX.abnormal) expect(e.cortex.fn).toBe(1);
      }
  });
});

describe('in the brain model', () => {
  const REST: BrainInputs = { map: 90, cvp: 6, paco2: 40, pao2: 95, sao2: 0.97, hb: 14, tempC: 37, drugs: NO_DRUGS };
  it('created and stepped: the entry reads the step\'s own flow and blood gases', () => {
    const b = createBrain(brainParams(), REST);
    expect(b.energy.cortex.delivery).toBe(refDelivery(b.cbfRel, 14, 0.97, 95));
    expect(b.energy.cortex.fn).toBe(1);
    const shock = { ...REST, map: 25, hb: 9, sao2: 0.9, pao2: 60 };
    for (let k = 0; k < 300; k++) {
      stepBrain(b, shock, BRAIN_DT_S);
      expect(b.energy.cortex.delivery).toBe(refDelivery(b.cbfRel, 9, 0.9, 60));
      expect(b.energy.cortex.metabolic).toBe(refMetabolic(b.energy.cortex.delivery));
    }
    expect(b.energy.cortex.metabolic).toBe(1);
  });
});
