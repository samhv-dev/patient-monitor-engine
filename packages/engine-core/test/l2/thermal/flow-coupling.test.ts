// E131: the heat model follows the oxygen consumed and the blood flow — the MH muscle heat is the achieved MH VO2 × the
// caloric equivalent of O2 (energy closes), the basal heat follows the delivered share of the VO2 demand, the core–skin
// conductance falls to tissue conduction with no flow, and sweating and shivering need a perfused brain (the vasomotor
// centre's gate). At full perfusion and a perfused brain every flow is exactly what it was.
import { describe, expect, it } from 'vitest';
import { createThermal, stepThermal, type ThermalState } from '../../../src/l2/thermal/heat.ts';
import { mhO2Demand, oxyKjPerL } from '../../../src/l2/thermal/metabolic.ts';
import { MH_RQ, TISSUE_K_W_M2_C } from '../../../src/l2/thermal/params.ts';

const VO2 = 245; // mL/min, the gas model's 70 kg adult (3.5 mL/kg/min)

function mh(o2Frac?: number): ThermalState {
  const st = createThermal(36.8, 70);
  st.anaesthesia = 'general';
  st.mh = { severity: 1, t0: 0 };
  if (o2Frac !== undefined) st.o2Frac = o2Frac;
  return st;
}

describe('E131 heat from the oxygen consumed, transfer from the flow', () => {
  it('MH heat = the achieved MH VO2 × Weir at the muscle RQ (≈ 130 W at 70 kg, full activity); it never exceeds the oxygen energy', () => {
    for (const f of [undefined, 0.6, 0]) {
      const st = mh(f);
      stepThermal(st, 900, 1, { vo2Rest: VO2 });
      const oxygenW = (mhO2Demand(st, 900, VO2) * (f ?? 1) * oxyKjPerL(MH_RQ)) / 60;
      expect(st.out.mhW).toBeCloseTo(oxygenW, 9);
    }
    const full = mh();
    stepThermal(full, 900, 1, { vo2Rest: VO2 });
    expect(full.out.mhW).toBeGreaterThan(120);
    expect(full.out.mhW).toBeLessThan(140);
  });

  it('basal heat follows the delivered share: half at o2Frac 0.5, none with no flow', () => {
    const a = createThermal(36.8, 70);
    const b = createThermal(36.8, 70);
    const c = createThermal(36.8, 70);
    b.o2Frac = 0.5;
    c.o2Frac = 0;
    for (const s of [a, b, c]) stepThermal(s, 1, 1);
    expect(b.out.metabolicW).toBeCloseTo(0.5 * a.out.metabolicW, 9);
    expect(c.out.metabolicW).toBe(0);
  });

  it('k_cp: unchanged at full perfusion; the blood-borne part above tissue conduction (5.28 W/m²/°C × BSA) scales with skin perfusion (flow), not with oxygen delivery', () => {
    const a = createThermal(39.5, 70); // hot and awake: vasodilated, k_cp well above tissue conduction
    const b = createThermal(39.5, 70);
    const c = createThermal(39.5, 70);
    b.perfFrac = 0.5;
    c.perfFrac = 0;
    for (const s of [a, b, c]) stepThermal(s, 1, 1);
    const kt = TISSUE_K_W_M2_C * a.env.bsa;
    expect(a.out.kcp).toBeGreaterThan(kt);
    expect(c.out.kcp).toBeCloseTo(kt, 9);
    expect(b.out.kcp).toBeCloseTo(kt + 0.5 * (a.out.kcp - kt), 9);
    // a constricted k_cp already below tissue conduction stays where it is
    // oxygen delivery alone (hypoxaemia at full flow) does not touch k_cp
    const hypox = createThermal(39.5, 70);
    hypox.o2Frac = 0.3;
    stepThermal(hypox, 1, 1);
    expect(hypox.out.kcp).toBe(a.out.kcp);
    const cold = createThermal(35.0, 70);
    cold.perfFrac = 0;
    stepThermal(cold, 1, 1);
    expect(cold.out.kcp).toBeLessThanOrEqual(TISSUE_K_W_M2_C * cold.env.bsa);
  });

  it('sweating and shivering × the brain-perfusion gate: none with an unperfused brain, unchanged with a perfused one', () => {
    const hot = () => createThermal(38.5, 70); // awake, above the sweating threshold of its set point + …
    const cold = () => { const s = createThermal(36.8, 70); s.tc = 35.2; return s; }; // below the shivering threshold
    const [h1, h0, hh] = [hot(), hot(), hot()];
    for (const s of [h1, h0, hh]) s.setShift = 0;
    stepThermal(h1, 1, 1);
    stepThermal(h0, 1, 1, { brainF: 0 });
    stepThermal(hh, 1, 1, { brainF: 0.5 });
    expect(h1.out.sweatW).toBeGreaterThan(0);
    expect(h0.out.sweatW).toBe(0);
    expect(hh.out.sweatW).toBeCloseTo(0.5 * h1.out.sweatW, 9);
    const [c1, c0] = [cold(), cold()];
    stepThermal(c1, 1, 1);
    stepThermal(c0, 1, 1, { brainF: 0 });
    expect(c1.out.shiverW).toBeGreaterThan(0);
    expect(c0.out.shiverW).toBe(0);
  });

  it('a body with no flow and no brain perfusion cools by conduction only: from 40 °C at 21 °C ambient ≈ 0.3–1.5 °C in the first hour', () => {
    const st = createThermal(40, 70);
    st.setShift = 0;
    st.tp = 38.5;
    st.o2Frac = 0;
    st.perfFrac = 0;
    st.vent = { veLpm: 0, dryGas: false, hme: false };
    for (let s = 1; s <= 3600; s++) stepThermal(st, s, 1, { brainF: 0 });
    expect(st.out.sweatW).toBe(0);
    expect(40 - st.tc).toBeGreaterThan(0.3);
    expect(40 - st.tc).toBeLessThan(1.5);
  });
});
