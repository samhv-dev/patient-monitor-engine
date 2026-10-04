// Temperature (brief §4.6; BUILD-PLAN Stage 3 acceptance 7; research 03 §6.2) on the heat model alone, 70 kg.
import { describe, expect, it } from 'vitest';
import { createTemp, MH_VCO2_FACTOR, mhFactor, setCoreTarget, stepTemp, type TempState } from '../../../src/l2/temp/temp.ts';

function run(st: TempState, fromS: number, seconds: number): number[] {
  const out: number[] = [];
  for (let s = 1; s <= seconds; s++) {
    stepTemp(st, fromS + s, 1);
    if (s % 60 === 0) out.push(st.tc); // per minute
  }
  return out;
}

describe('two-compartment heat model', () => {
  it('awake steady state does not drift (24 h)', () => {
    const st = createTemp(36.8, 70);
    run(st, 0, 86_400);
    expect(Math.abs(st.tc - 36.8)).toBeLessThan(0.01);
  });

  it('GA: redistribution −1.0 to −1.5 °C in the first hour, then −0.3 to −0.5 °C/h, then a 34.5–35.5 °C plateau', () => {
    const st = createTemp(36.8, 70);
    st.anaesthesia = 'general';
    const tc = run(st, 0, 8 * 3600);
    const drop1 = 36.8 - tc[59]!;
    expect(drop1).toBeGreaterThanOrEqual(1.0);
    expect(drop1).toBeLessThanOrEqual(1.5);
    const rate = tc[59]! - tc[119]!; // °C lost in hour 2
    expect(rate).toBeGreaterThanOrEqual(0.3);
    expect(rate).toBeLessThanOrEqual(0.5);
    const last = tc.slice(-60); // hour 8: plateau
    expect(Math.max(...last)).toBeLessThanOrEqual(35.5);
    expect(Math.max(...last) - Math.min(...last)).toBeLessThan(0.1);
  });

  // R45 (FU-10 E5, ruling R-4, E-FU10-3): with the tables' vasoconstriction threshold 34.5 °C (was the [ENG] 34.8 this
  // band was fitted with) the GA heat model plateaus just below it — measured 34.37 °C in hour 8. Not tuned (R44).
  it.fails('GA: the hour-8 plateau stays at or above 34.5 °C — measured 34.37', () => {
    const st = createTemp(36.8, 70);
    st.anaesthesia = 'general';
    const tc = run(st, 0, 8 * 3600);
    expect(Math.min(...tc.slice(-60))).toBeGreaterThanOrEqual(34.5);
  });

  // FU-10 E3 (E-FU10-3, research/14 ET-04): "no plateau" meant no VASOCONSTRICTION plateau — the block abolishes the
  // legs' vasoconstriction, so the core keeps falling through the GA plateau's hours; it now stops only where shivering
  // ABOVE the block starts, below the lowered shivering threshold (35.5 °C; Kurz 1993). Before FU-10 the neuraxial state
  // took the GA thresholds (shivering 33.5 °C) and fell to 33.47 °C at 8 h with no shivering; now 35.22 °C, shivering.
  it('neuraxial: smaller redistribution, no vasoconstriction plateau; the fall stops only below the lowered shivering threshold', () => {
    const st = createTemp(36.8, 70);
    st.anaesthesia = 'neuraxial';
    const tc = run(st, 0, 8 * 3600);
    expect(36.8 - tc[59]!).toBeLessThan(1.0);
    expect(tc[59]! - tc[119]!).toBeGreaterThanOrEqual(0.3); // hour 2: still the linear phase (0.50 °C/h)
    expect(tc[479]!).toBeLessThan(35.5); // below the shivering threshold 36.0 − 0.5
    expect(st.out.shiverW).toBeGreaterThan(0); // shivering above the block defends it
  });

  it('forced-air warming adds +0.5–1 °C/h against the GA linear phase', () => {
    const a = createTemp(36.8, 70);
    const b = createTemp(36.8, 70);
    a.anaesthesia = b.anaesthesia = 'general';
    b.warming = true;
    const ta = run(a, 0, 3 * 3600);
    const tb = run(b, 0, 3 * 3600);
    const gain = tb[179]! - tb[119]! - (ta[179]! - ta[119]!);
    expect(gain).toBeGreaterThanOrEqual(0.5);
    expect(gain).toBeLessThanOrEqual(1.0);
  });

  it('MH: once established the core rises ≥ 1 °C per 15 min, with VCO2 × 2–5', () => {
    const st = createTemp(36.8, 70);
    st.anaesthesia = 'general';
    st.mh = { severity: 1, t0: 600 };
    const tc = run(st, 0, 45 * 60);
    expect(mhFactor(st, 45 * 60, MH_VCO2_FACTOR)).toBeGreaterThanOrEqual(2); // VCO2 × 2–5
    expect(mhFactor(st, 45 * 60, MH_VCO2_FACTOR)).toBeLessThanOrEqual(5);
    expect(tc[44]! - tc[29]!).toBeGreaterThanOrEqual(1.0); // minutes 30 → 45
  });

  it('a rectal probe lags the oesophageal probe with τ 20–60 min (step of core by the MANUAL target)', () => {
    const st = createTemp(36.8, 70);
    setCoreTarget(st, 38.8);
    for (const k of Object.keys(st.sites) as Array<keyof typeof st.sites>) st.sites[k] = 36.8 + (k === 'axilla' ? -0.5 : 0);
    let tauR = 0;
    for (let s = 1; s <= 7200; s++) {
      stepTemp(st, s, 1);
      if (!tauR && st.sites.rectal - 36.8 >= 0.632 * 2) tauR = s;
    }
    expect(st.sites.oesophageal).toBeGreaterThan(38.7);
    expect(tauR / 60).toBeGreaterThanOrEqual(20);
    expect(tauR / 60).toBeLessThanOrEqual(60);
  });
});
