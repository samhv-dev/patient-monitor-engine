// FU-3 item 16 (E-FU3-9, R50 review finding 1): with nothing ejected (cardiac output 0) no blood leaves the lungs for
// the arteries, so the arterial PaO2/SaO2 are not re-computed from the alveolar gas — before this, the O2 side's
// 0.05 L/min flow floor (7b, "arrest: q = 0 gave NaN") equilibrated a phantom flow with re-ventilated alveoli and an
// arrested patient's SaO2 climbed 0.2 → 90 %.
import { describe, expect, it } from 'vitest';
import { createO2Lung, stepO2Lung, type O2LungInputs } from '../../../src/l2/lung/mix-o2.ts';

const base: O2LungInputs = {
  va: 4.2, vent: [0.45, 0, 0.55, 0], perf: [2.2, 0, 2.7, 0], vdAlv: [0.075, 0.075, 0.075, 0.075], qLow: [0.05, 0.05], qShunt: 0.1,
  fio2: 0.4, massFlowFio2: null, blocked: [false, false], vo2: 210, paco2: 40, pA: [40, 40, 40, 40], tempC: 37,
  frcSide: [630, 770], bloodL: 4.9, dl: [1, 1], coRatio: 1,
};
/** Arrest at the floor flow (0.05 L/min split as lung.ts does), breathing room air again after an anoxic apnoea. */
const arrest: O2LungInputs = {
  ...base, va: 6, fio2: 0.21, perf: [0.0198, 0, 0.0242, 0], qLow: [0.0023, 0.0023], qShunt: 0.0014, paco2: 90, pA: [90, 90, 90, 90], coRatio: 0,
};
const anoxic = () => {
  const st = createO2Lung(0.006, 0);
  st.sa = 0.003;
  st.pao2 = 4;
  return st;
};

describe('FU-3 item 16: no ejection, no new arterial blood (E-FU3-9)', () => {
  it('arterialHold: PaO2/SaO2 hold while the alveoli re-oxygenate; without it the floor flow re-saturates the arteries', () => {
    const held = anoxic();
    const free = anoxic();
    for (let t = 0; t < 120; t += 0.1) {
      stepO2Lung(held, { ...arrest, arterialHold: true }, 0.1);
      stepO2Lung(free, arrest, 0.1);
    }
    expect(held.sa).toBe(0.003);
    expect(held.pao2).toBe(4);
    expect(held.fa[0]).toBeGreaterThan(0.1); // the alveolar gas itself is refreshed by the breaths
    expect(free.sa).toBeGreaterThan(0.5); // the pre-FU-3 behaviour the review measured
  });
  it('arterialHold false/absent: bit-identical to the 7b mixing point', () => {
    const a = createO2Lung(0.5, 150);
    const b = createO2Lung(0.5, 150);
    for (let t = 0; t < 60; t += 0.1) {
      stepO2Lung(a, base, 0.1);
      stepO2Lung(b, { ...base, arterialHold: false }, 0.1);
    }
    expect(b).toEqual(a);
  });
});
