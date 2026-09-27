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

describe('Stage 7e heat balance', { timeout: 60_000 }, () => {
  it('R39-7: unwarmed GA −0.9 °C at 30 min (−0.5 to −1.2), −1.3 at 60 (−1.0 to −1.6), then 0.3–0.6 °C/h', () => {
    const tc = run(ga(), 0, 2 * 3600);
    expect(tc[29]! - 36.8).toBeLessThanOrEqual(-0.5);
    expect(tc[29]! - 36.8).toBeGreaterThanOrEqual(-1.2);
    expect(tc[59]! - 36.8).toBeLessThanOrEqual(-1.0);
    expect(tc[59]! - 36.8).toBeGreaterThanOrEqual(-1.6);
    expect(tc[59]! - tc[119]!).toBeGreaterThanOrEqual(0.3);
    expect(tc[59]! - tc[119]!).toBeLessThanOrEqual(0.6);
  });

  it('R39-7: forced-air warming from induction — first-hour nadir −0.6 to −1.2 °C', () => {
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

  it('MH (severity 1): +1 °C per 5–15 min once established; dantrolene at 20 min turns the core around within 30 min', () => {
    const st = ga();
    st.mh = { severity: 1, t0: 0 };
    const tc = run(st, 0, 30 * 60);
    const per = tc[29]! - tc[19]!; // °C in minutes 20 → 30
    expect(per).toBeGreaterThanOrEqual(10 / 15);
    expect(per).toBeLessThanOrEqual(2);
    const t = ga();
    t.mh = { severity: 1, t0: 0 };
    run(t, 0, 20 * 60);
    const after: number[] = []; // 7g's dantrolene effect (2.5 mg/kg at 20 min) arrives as `dantE` every step
    for (let s = 1; s <= 3600; s++) {
      t.dantE = hill(gammaConc([{ t: 0, scale: 1 }], s, 600, gammaN(600, 21_600)), 1, 1);
      stepThermal(t, 1200 + s, 1);
      if (s % 60 === 0) after.push(t.tc);
    }
    const peak = Math.max(...after);
    expect(after.indexOf(peak)).toBeLessThan(30);
    expect(after[59]!).toBeLessThan(peak - 0.3);
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

  it('depth = max(7f thermoDepth, the Stage 3 flag): 0.3 under the GA flag keeps depth 1; 1.3 deepens it; 0.7 alone sedates', () => {
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
});
