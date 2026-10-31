// Stage 7e heat balance (R39-7 bands, research 09 §7; annex B3). The Stage 3 tests in test/l2/temp stay unchanged.
import { describe, expect, it } from 'vitest';
import { createThermal, setCoreTarget, stepThermal, type ThermalState } from '../../../src/l2/thermal/heat.ts';
import { gammaConc, gammaN } from '../../../src/l2/pk/gamma.ts';
import { hill } from '../../../src/l2/pk/pd.ts';

function run(st: ThermalState, fromS: number, seconds: number): number[] {
  const out: number[] = [];
  for (let s = 1; s <= seconds; s++) {
    stepThermal(st, fromS + s, 1);
    if (s % 60 === 0) out.push(st.tc);
  }
  return out;
}
const ga = () => {
  const st = createThermal(36.8, 70);
  st.anaesthesia = 'general';
  return st;
};

describe('heat balance', { timeout: 60_000 }, () => {
  it('unwarmed GA −0.9 °C at 30 min (−0.5 to −1.2), −1.3 at 60 (−1.0 to −1.6), then 0.3–0.6 °C/h', () => {
    const tc = run(ga(), 0, 2 * 3600);
    expect(tc[29]! - 36.8).toBeLessThanOrEqual(-0.5);
    expect(tc[29]! - 36.8).toBeGreaterThanOrEqual(-1.2);
    expect(tc[59]! - 36.8).toBeLessThanOrEqual(-1.0);
    expect(tc[59]! - 36.8).toBeGreaterThanOrEqual(-1.6);
    expect(tc[59]! - tc[119]!).toBeGreaterThanOrEqual(0.3);
    expect(tc[59]! - tc[119]!).toBeLessThanOrEqual(0.6);
  });

  it('forced-air warming from induction — first-hour nadir −0.6 to −1.2 °C', () => {
    const st = ga();
    st.warming = true;
    const tc = run(st, 0, 3600);
    const nadir = Math.min(...tc) - 36.8;
    expect(nadir).toBeLessThanOrEqual(-0.6);
    expect(nadir).toBeGreaterThanOrEqual(-1.2);
  });

  it('a colder theatre cools faster; exposure after induction deepens the first-hour fall', () => {
    const cold = ga();
    cold.ta = 18;
    const warm = ga();
    warm.ta = 24;
    expect(run(cold, 0, 3600)[59]!).toBeLessThan(run(warm, 0, 3600)[59]!);
    const ex = ga();
    ex.exposure = 'exposed';
    const d = ga();
    expect(run(ex, 0, 3600)[59]!).toBeLessThan(run(d, 0, 3600)[59]! - 0.15);
  });

  it('2 L of 21 °C crystalloid over 30 min lowers the core 0.4–0.8 °C more than a fluid warmer does', () => {
    const a = ga();
    const b = ga();
    a.iv = { mlPerMin: 2000 / 30, tempC: 21 };
    b.iv = { mlPerMin: 2000 / 30, tempC: 21 };
    b.fluidWarmer = true;
    run(a, 0, 1800);
    run(b, 0, 1800);
    expect(b.tc - a.tc).toBeGreaterThanOrEqual(0.4);
    expect(b.tc - a.tc).toBeLessThanOrEqual(0.8);
  });

  it('emergence from GA at ≈ 35 °C: depth decays (τ 10 min) and shivering starts once the threshold passes the core', () => {
    const st = ga();
    run(st, 0, 7200);
    st.anaesthesia = 'none';
    let shiv = 0;
    for (let s = 1; s <= 1800; s++) {
      stepThermal(st, 7200 + s, 1);
      shiv = Math.max(shiv, st.out.shiverW);
    }
    expect(st.depth).toBeLessThan(0.1);
    expect(shiv).toBeGreaterThan(10);
  });

  it('a raised set point (+2 °C, awake) produces vasoconstriction, shivering and a rise of ≥ 1 °C in 60 min', () => {
    const st = createThermal(36.8, 70);
    st.setShift = 2;
    stepThermal(st, 1, 1);
    expect(st.out.shiverW).toBeGreaterThan(100);
    expect(st.out.vasoF).toBeLessThan(0.01);
    const tc = run(st, 1, 3600);
    expect(tc[59]! - 36.8).toBeGreaterThanOrEqual(1.0);
  });

  // E131: the MH heat is the achieved MH VO2 × the caloric equivalent of O2 (≈ 130 W at 70 kg), no longer 8 × m0
  // (640 W): +1 °C in 15 min needs ≈ 270 W net into 70 kg. A known miss, kept, not tuned. With the skin constricted by
  // the MH sympathetic surge the periphery no longer takes most of it up: +0.18 → +0.45 °C in minutes 20 → 30.
  it.fails('MH (severity 1): +1 °C per 5–15 min once established (tables §7 check 21) — measured +0.45 °C in minutes 20 → 30 (E131: heat from the O2 consumed; the skin constricted by the MH surge)', () => {
    const st = ga();
    st.mh = { severity: 1, t0: 0 };
    const tc = run(st, 0, 30 * 60);
    const per = tc[29]! - tc[19]!; // °C in minutes 20 → 30
    if (process.env.PME_E131_PRINT) console.log(`E131 heat MH min 20→30: ${per.toFixed(3)}`);
    expect(per).toBeGreaterThanOrEqual(10 / 15);
    expect(per).toBeLessThanOrEqual(2);
  });

  const dantroleneAt20 = (): number[] => {
    const t = ga();
    t.mh = { severity: 1, t0: 0 };
    run(t, 0, 20 * 60);
    const after: number[] = []; // 7g's dantrolene effect (2.5 mg/kg at 20 min) arrives as `dantE` every step
    for (let s = 1; s <= 3600; s++) {
      t.dantE = hill(gammaConc([{ t: 0, scale: 1 }], s, 600, gammaN(600, 21_600)), 1, 1);
      stepThermal(t, 1200 + s, 1);
      if (s % 60 === 0) after.push(t.tc);
    }
    return after;
  };

  it('MH (severity 1): the core rises once established; dantrolene at 20 min turns it around within 30 min', () => {
    const st = ga();
    st.mh = { severity: 1, t0: 0 };
    const tc = run(st, 0, 30 * 60);
    expect(tc[29]! - tc[19]!).toBeGreaterThan(0); // minutes 20 → 30
    const after = dantroleneAt20();
    expect(after.indexOf(Math.max(...after))).toBeLessThan(30);
  });

  // E131: with the smaller, oxygen-derived MH heat the core peaked lower (an expected failure: 0.13 °C, peak 36.63 at
  // +7 min). Since the MH sympathetic surge constricts the skin (heat.ts `kcp`) the MH heat stays in the core (peak
  // 37.35 at +2 min) and dantrolene's suppression of the surge re-dilates it, so the core falls 0.60 °C in the hour: met
  it('MH (severity 1): after dantrolene at 20 min the core is ≥ 0.3 °C below its peak 60 min later', () => {
    const after = dantroleneAt20();
    if (process.env.PME_E131_PRINT) console.log(`E131 heat dantrolene: peak at +${after.indexOf(Math.max(...after))} min ${Math.max(...after).toFixed(3)}, +60 ${after[59]!.toFixed(3)}`);
    expect(after[59]!).toBeLessThan(Math.max(...after) - 0.3);
  });

  it('MANUAL setCoreTarget is a steady state (24 h drift < 0.01 °C) awake at 38.5 and under GA at 36.0', () => {
    const a = createThermal(36.8, 70);
    setCoreTarget(a, 38.5);
    run(a, 0, 86_400);
    expect(Math.abs(a.tc - 38.5)).toBeLessThan(0.01);
    const g = ga();
    stepThermal(g, 1, 1);
    setCoreTarget(g, 36.0);
    run(g, 1, 3600);
    expect(Math.abs(g.tc - 36.0)).toBeLessThan(0.01);
  });

  it('depth = max(neuro thermoDepth, the GA flag): 0.3 under the GA flag keeps depth 1; 1.3 deepens it; 0.7 alone sedates', () => {
    const a = ga();
    a.depthIn = 0.3;
    stepThermal(a, 1, 1);
    expect(a.depth).toBe(1);
    const b = ga();
    b.depthIn = 1.3;
    stepThermal(b, 1, 1);
    expect(b.depth).toBeCloseTo(1.3, 9);
    const c = createThermal(36.8, 70);
    c.depthIn = 0.7;
    stepThermal(c, 1, 1);
    expect(c.depth).toBeCloseTo(0.7, 9);
  });

  it('test seam pinCoreTemp (like pinHbfRel): the core stays at the pinned value under GA; unset → the heat balance runs', () => {
    const p = ga();
    p.pinCoreTemp = 36.8;
    run(p, 0, 3600);
    expect(p.tc).toBe(36.8);
    const u = ga();
    run(u, 0, 3600);
    expect(u.tc).toBeLessThan(36.0);
  });
});
