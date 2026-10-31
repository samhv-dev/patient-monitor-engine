// The MH sympathetic surge constricts the skin, so the heat the crisis makes stays in the core. In porcine MH the
// circulating catecholamines reach ≈ 20 × normal (Gronert GA, Theye RA, Milde JH, Tinker JH, Anesthesiology
// 1978;49:330–337) and the peripheral vasoconstriction they cause is intense (Sessler DI, Anesthesiology
// 2008;109:318–338, "Hyperthermia"); clinically the skin is mottled (EMHG, Glahn K, Girard T, Hellblom A, Hopkins P et
// al., v2024: "profuse sweating and mottling of skin" among the early metabolic signs). The anaesthetic's lowered
// vasoconstriction threshold leaves the thermoregulatory tone dilated (Sessler 2008), so the surge acts on the vessel,
// not through the hypothalamus. The core–skin conductance falls toward the maximally constricted value of the two-node
// model, (K + c_bl·SKBF_min)·BSA = (5.28 + 1.163 × 0.5) W/m²/°C × BSA (Gagge AP, Fobelets AP, Berglund LG, ASHRAE
// Trans 1986;92(2B):709–731, as implemented in pythermalcomfort `two_nodes_gagge`); without MH every flow is today's.
import { describe, expect, it } from 'vitest';
import { createThermal, stepThermal, type ThermalState } from '../../../src/l2/thermal/heat.ts';
import { mhSympDrive } from '../../../src/l2/thermal/mh.ts';
import { GA_KCP, MH_SYMP_TAU_S, VASOCONSTRICT_KCP } from '../../../src/l2/thermal/params.ts';

/** Gagge 1986's maximally constricted core–skin conductance, W/°C: tissue conduction + blood at the minimum skin flow. */
const kMinOf = (st: ThermalState) => st.env.bsa * (5.28 + 1.163 * 0.5);

/** A 70 kg patient under GA with the core and periphery held at a fixed gradient; MH from t = 0 when asked. */
function gaAt(mh: boolean, tc = 36.8, tp = 34.2): ThermalState {
  const st = createThermal(36.8, 70);
  st.anaesthesia = 'general';
  st.depth = 1;
  st.tc = tc;
  st.tp = tp;
  if (mh) st.mh = { severity: 1, t0: 0 };
  return st;
}
/** The flows at time t without moving the state (a 1 µs step). */
const flowsAt = (st: ThermalState, t: number) => {
  stepThermal(st, t, 1e-6);
  return st.out;
};
const run = (st: ThermalState, seconds: number, at: number[]): Record<number, number> => {
  const out: Record<number, number> = {};
  for (let s = 1; s <= seconds; s++) {
    stepThermal(st, s, 1);
    if (at.includes(s)) out[s] = st.tc;
  }
  return out;
};

describe('MH: the sympathetic surge constricts the skin (core–periphery conductance)', () => {
  it('at full MH sympathetic drive k_cp falls from the GA-dilated value to the constricted core–skin conductance, and the periphery takes up that much less of the MH heat', () => {
    const t = 30 * 60; // drive = 1 − e^(−15)
    const mh = gaAt(true);
    const ctl = gaAt(false);
    const a = flowsAt(mh, t);
    const b = flowsAt(ctl, t);
    expect(mhSympDrive(mh.mh, t)).toBeGreaterThan(0.999_999);
    expect(b.kcp).toBeCloseTo(GA_KCP * ctl.k0, 1); // the control stays dilated under GA (Sessler's lowered threshold)
    expect(a.kcp).toBeCloseTo(kMinOf(mh), 3);
    const uptakeMh = a.kcp * (mh.tc - mh.tp);
    const uptakeCtl = b.kcp * (ctl.tc - ctl.tp);
    if (process.env.PME_SHOWCASE_PRINT) console.log(`k_cp GA ${b.kcp.toFixed(2)} → MH ${a.kcp.toFixed(2)} W/°C; uptake at ΔT 2.6 °C ${uptakeCtl.toFixed(1)} → ${uptakeMh.toFixed(1)} W; MH heat ${a.mhW.toFixed(1)} W`);
    expect(uptakeMh / uptakeCtl).toBeCloseTo(kMinOf(mh) / b.kcp, 3);
    expect(uptakeCtl - uptakeMh).toBeGreaterThan(80); // most of the MH heat now stays in the core
  });

  it('the constriction follows the sympathetic drive: half the drive, half the way; dantrolene\'s suppression of the surge re-dilates', () => {
    const tHalf = MH_SYMP_TAU_S * Math.LN2; // drive 0.5
    const mh = gaAt(true);
    const kGa = flowsAt(gaAt(false), tHalf).kcp;
    expect(flowsAt(mh, tHalf).kcp).toBeCloseTo(kGa - 0.5 * (kGa - kMinOf(mh)), 3);
    const treated = gaAt(true);
    treated.mh = { severity: 1, t0: 0, s: 0, sSymp: 0 }; // the sympathetic share fully suppressed
    expect(flowsAt(treated, 1800).kcp).toBeCloseTo(kGa, 6);
  });

  it('the surge never dilates: a patient already constricted below the floor keeps his conductance', () => {
    const awakeCold = createThermal(36.8, 70);
    awakeCold.tc = 35.5; // awake, well below the vasoconstriction threshold: k_cp at VASOCONSTRICT_KCP·k0
    const ctl = createThermal(36.8, 70);
    ctl.tc = 35.5;
    awakeCold.mh = { severity: 1, t0: 0 };
    const k = flowsAt(awakeCold, 1800).kcp;
    expect(k).toBeCloseTo(flowsAt(ctl, 1800).kcp, 9);
    expect(k).toBeCloseTo(VASOCONSTRICT_KCP * ctl.k0, 1);
  });

  it('no MH: the GA redistribution course and the awake course are today\'s (core at 15, 35 and 60 min)', () => {
    const ga = createThermal(36.8, 70);
    ga.anaesthesia = 'general';
    const g = run(ga, 3600, [900, 2100, 3600]);
    // measured on main 6d19b8b3 before the change
    expect(g[900]).toBeCloseTo(36.18862, 5);
    expect(g[2100]).toBeCloseTo(35.800664, 5);
    expect(g[3600]).toBeCloseTo(35.551803, 5);
    const aw = run(createThermal(36.8, 70), 3600, [900, 2100, 3600]);
    for (const s of [900, 2100, 3600]) expect(aw[s]).toBeCloseTo(36.8, 6);
  });
});
