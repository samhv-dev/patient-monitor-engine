// Glucose–insulin (tables §5c Bergman minimal model; annex B3 Pulse secretion line).
import { describe, expect, it } from 'vitest';
import { createGlucose, dextroseBolus, dextroseInfusion, insulinBolus, insulinInfusion, meal, stepGlucose, type GlucoseState } from '../../../src/l2/endo/glucose.ts';

function run(g: GlucoseState, seconds: number, p: { si?: number; beta?: number; glucagon?: number } = {}): number[] {
  const out: number[] = [];
  for (let s = 1; s <= seconds; s++) {
    stepGlucose(g, { weightKg: 70, egpF: 1, siF: p.si ?? 1, secF: 1, beta: p.beta ?? 1, glucagon: p.glucagon ?? 1, dt: 1 });
    if (s % 60 === 0) out.push(g.g);
  }
  return out;
}

describe('glucose–insulin minimal model', { timeout: 60_000 }, () => {
  it('fasting steady state 100 mg/dL / 10 µU/mL holds for 24 h', () => {
    const g = createGlucose();
    run(g, 86_400);
    expect(g.g).toBeCloseTo(100, 6);
    expect(g.i).toBeCloseTo(10, 6);
  });

  it('D50 25 g IV: +200 mg/dL at once, back within 30 mg/dL of baseline by 60 min', () => {
    const g = createGlucose();
    dextroseBolus(g, 25, 70);
    expect(g.g).toBeGreaterThan(290);
    const o = run(g, 3600);
    expect(o[59]!).toBeLessThan(130);
  });

  it('insulin 0.1 U/kg IV (insulin tolerance test): nadir 30–50 mg/dL at 15–35 min, recovery by 2 h', () => {
    const g = createGlucose();
    insulinBolus(g, 7, 70);
    const o = run(g, 3 * 3600);
    const nadir = Math.min(...o);
    const at = o.indexOf(nadir) + 1;
    expect(nadir).toBeGreaterThanOrEqual(30);
    expect(nadir).toBeLessThanOrEqual(55);
    expect(at).toBeGreaterThanOrEqual(15);
    expect(at).toBeLessThanOrEqual(35);
    expect(o[119]!).toBeGreaterThan(80);
    expect(g.i - g.iExo).toBeGreaterThan(0); // the exogenous part is tracked: the secreted part is what drives 7e's K term
    expect(g.iExo).toBeLessThan(g.i);
  });

  it('a dextrose infusion is matched by secretion: 10 g/h raises fasting glucose by 10–40 mg/dL', () => {
    const g = createGlucose();
    dextroseInfusion(g, 10);
    const o = run(g, 3 * 3600);
    expect(o[179]! - 100).toBeGreaterThanOrEqual(10);
    expect(o[179]! - 100).toBeLessThanOrEqual(40);
  });

  it('75 g oral: normal peak 140–200 at 30–90 min, < 140 at 2 h; type 2 (SI × 0.3, 144 fasting) > 200 at 2 h', () => {
    const n = createGlucose();
    meal(n, 75);
    const o = run(n, 3 * 3600);
    const pk = Math.max(...o);
    expect(pk).toBeGreaterThanOrEqual(140);
    expect(pk).toBeLessThanOrEqual(200);
    expect(o.indexOf(pk) + 1).toBeGreaterThanOrEqual(30);
    expect(o.indexOf(pk) + 1).toBeLessThanOrEqual(90);
    expect(o[119]!).toBeLessThan(140);
    const t2 = createGlucose(144);
    run(t2, 600, { si: 0.3 });
    expect(t2.g).toBeCloseTo(144, 3);
    meal(t2, 75);
    expect(run(t2, 7200, { si: 0.3 })[119]!).toBeGreaterThan(200);
  });

  it('insulinopenia (type 1, no insulin): glucose climbs over hours to > 300 mg/dL by 4 h', () => {
    const g = createGlucose();
    const o = run(g, 4 * 3600, { beta: 0 });
    expect(o[59]!).toBeLessThan(200);
    expect(o[239]!).toBeGreaterThan(300);
  });

  it('an insulin infusion of 4 U/h without dextrose takes a non-diabetic below 70 mg/dL within 2 h', () => {
    const g = createGlucose();
    insulinInfusion(g, 4);
    expect(run(g, 7200)[119]!).toBeLessThan(70);
  });
});
