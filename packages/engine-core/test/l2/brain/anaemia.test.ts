// The cerebral flow rise with anaemia: the factor, its place in the target flow, and the sourced cells it must meet.
import { describe, expect, it } from 'vitest';
import { ODC_DEFAULT, satDB } from '../../../src/l2/blood/odc.ts';
import { CORTEX } from '../../../src/l2/brain/energy.ts';
import { anaemiaFactor, autoreg, CAO2_REF, caO2, NO_DRUGS, o2Factor } from '../../../src/l2/brain/flow.ts';
import { brainParams, createBrain, stepBrain, type BrainInputs, type BrainState } from '../../../src/l2/brain/model.ts';
import { ANAEMIA_FLOW_HB_MIN, ANAEMIA_FLOW_K, ANAEMIA_FLOW_SOURCE, BRAIN_DT_S, CBF_LL, CBF_UL, HB_REF } from '../../../src/l2/brain/params.ts';

const REST: BrainInputs = { map: 90, cvp: 6, paco2: 40, pao2: 95, sao2: 0.97, hb: HB_REF, tempC: 37, drugs: NO_DRUGS };

function hold(b: BrainState, inp: BrainInputs, s: number): void {
  for (let k = 0; k < s / BRAIN_DT_S; k++) stepBrain(b, inp, BRAIN_DT_S);
}
function steady(inp: BrainInputs): BrainState {
  const b = createBrain(brainParams(), REST);
  hold(b, inp, 120);
  return b;
}
/** The x in [lo, hi] at which f, monotonic, reaches the target. */
function solve(f: (x: number) => number, target: number, lo: number, hi: number): number {
  const rising = f(hi) > f(lo);
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > target === rising) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

describe('anaemiaFactor', () => {
  it('is 1 at the reference Hb exactly, falls as Hb rises, and is held below the lowest sourced Hb', () => {
    expect(anaemiaFactor(HB_REF)).toBe(1);
    const hbs = [ANAEMIA_FLOW_HB_MIN, 5, 7, 10, 12, 14, 15, 17, 19];
    for (let i = 1; i < hbs.length; i++) expect(anaemiaFactor(hbs[i]!)).toBeLessThan(anaemiaFactor(hbs[i - 1]!));
    expect(anaemiaFactor(2)).toBe(anaemiaFactor(ANAEMIA_FLOW_HB_MIN));
    expect(anaemiaFactor(ANAEMIA_FLOW_HB_MIN)).toBeGreaterThan(anaemiaFactor(5));
  });

  it('enters the target flow as one more factor and relaxes with the vascular time constant', () => {
    const b = createBrain(brainParams(), REST);
    const inp = { ...REST, hb: 7 };
    hold(b, inp, 10);
    const tenS = b.cbfRel;
    hold(b, inp, 110);
    expect(b.cbfRel).toBeCloseTo(anaemiaFactor(7), 2);
    expect((tenS - 1) / (b.cbfRel - 1)).toBeCloseTo(1 - Math.exp(-1), 1);
  });
});

describe('sourced cells', () => {
  const { hbBefore: hb0, hbAfter: hb1, vmBefore: v0, vmAfter: v1 } = ANAEMIA_FLOW_SOURCE;
  it('Mühling 1999: the flow ratio at Hb 10.3 ÷ 14.5 reproduces the measured velocity ratio 77.3/61.2 (k is taken from it)', () => {
    expect(steady({ ...REST, hb: hb1 }).cbfRel / steady({ ...REST, hb: hb0 }).cbfRel).toBeCloseTo(v1 / v0, 2);
    expect(ANAEMIA_FLOW_K).toBeCloseTo(0.683, 3);
  });

  it('Mühling 1999: about 2 % more flow per haematocrit point fallen, over the source\'s Hct 41.8 → 29.6 %', () => {
    const perPoint = (anaemiaFactor(hb1) / anaemiaFactor(hb0) - 1) / (41.8 - 29.6);
    expect(perPoint).toBeGreaterThanOrEqual(0.015);
    expect(perPoint).toBeLessThan(0.025);
  });

  it('Ibaraki 2010: brain O2 delivery still rises with Hb (the flow rise compensates only in part)', () => {
    const d = [5, 7, 10, 12, 14, 16, 18].map((hb) => steady({ ...REST, hb }).energy.cortex.delivery);
    for (let i = 1; i < d.length; i++) expect(d[i]!).toBeGreaterThan(d[i - 1]!);
  });

  it('Todd 1992 (rats, halothane), a check of direction: flow rises when Hct falls from 43 to 20 %', () => {
    expect(anaemiaFactor((14 * 20) / 43) / anaemiaFactor(14)).toBeGreaterThan(1);
  });

  it('Weiskopf 2000 / Lieberman 2000: normotensive and normoxic at Hb 5 and 4.8, the cortex keeps a normal EEG supply', () => {
    for (const hb of [5, 4.8]) {
      const e = steady({ ...REST, hb }).energy.cortex;
      expect(e.delivery).toBeGreaterThan(CORTEX.abnormal);
      expect(e.metabolic).toBe(0);
    }
  });

  it('hypoxaemia acts through o2Factor alone: the hypoxaemic ÷ normoxic flow is the same at every Hb', () => {
    const ratio = (hb: number) => steady({ ...REST, hb, pao2: 40, sao2: 0.75 }).cbfRel / steady({ ...REST, hb }).cbfRel;
    expect(Math.abs(ratio(7) / ratio(HB_REF) - 1)).toBeLessThan(0.01); // the rest is the larger volume's ICP
    expect(ratio(HB_REF)).toBeCloseTo(o2Factor(40), 1);
  });
});

describe('limits and loops', () => {
  it('below the autoregulation limit the factor still multiplies the pressure-passive flow (no shared dilator reserve)', () => {
    const cpp = 40;
    expect(cpp).toBeLessThan(CBF_LL);
    const passive = autoreg(cpp, CBF_LL, CBF_UL, 1);
    expect(passive * anaemiaFactor(7)).toBeCloseTo(passive * (7 / HB_REF) ** -ANAEMIA_FLOW_K, 12);
  });

  it('no latch: delivery taken to 0.30 by MAP, to 0.35 by Hb and by PaO2 for 60 s, and restored, gives the function back', () => {
    const at = (inp: BrainInputs) => steady(inp).energy.cortex.delivery;
    const map = solve((m) => at({ ...REST, map: m }), 0.3, 15, 90);
    const hb = solve((h) => anaemiaFactor(h) * (caO2(h, REST.sao2, REST.pao2) / CAO2_REF), 0.35, 0.5, HB_REF);
    const hypox = (p: number): BrainInputs => ({ ...REST, pao2: p, sao2: satDB(p, 40, 37, { ...ODC_DEFAULT, hb: HB_REF }) });
    const pao2 = solve((p) => at(hypox(p)), 0.35, 5, 95);
    expect(hb).toBeLessThan(ANAEMIA_FLOW_HB_MIN);
    for (const low of [{ ...REST, map }, { ...REST, hb }, hypox(pao2)]) {
      const b = createBrain(brainParams(), REST);
      hold(b, low, 120);
      expect(b.energy.cortex.delivery).toBeLessThan(CORTEX.abnormal);
      expect(b.energy.cortex.fn).toBeLessThan(1);
      hold(b, REST, 120);
      expect(b.energy.cortex.fn).toBe(1);
      expect(b.energy.cortex.metabolic).toBe(0);
    }
  });
});
