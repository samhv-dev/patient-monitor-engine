import { describe, expect, it } from 'vitest';
import { createLiver, HBF_FRAC, stepLactatePool, stepLiver, type LiverInputs } from '../../../src/l2/liver/liver.ts';

const BASE: LiverInputs = { coLpm: 5.6, co0Lpm: 5.6, bvRel: 1, alphaE: 0, volatileMac: 0, tempC: 37, gfrRel: 1, do2MlKgMin: 15 };
function halfLife(inp: LiverInputs, failure = 0): number {
  const l = createLiver(70, inp, failure);
  const ss = 1400 / 24 / (0.6 * 70 * l.kLacPerH);
  l.lactate = 5;
  let t = 0;
  while (l.lactate - ss > (5 - ss) / 2) {
    stepLiver(l, inp, 1);
    t++;
  }
  return t / 60;
}

describe('liver and lactate (tables §5.3)', () => {
  it('rest: lactate 1.0, hepatic flow share 0.255 (ICRP-89, N-P10), kLac 1.4/h, glucose factor 1', () => {
    const l = createLiver(70, BASE);
    expect(l.lactate).toBeCloseTo(0.99, 2);
    expect(HBF_FRAC).toBe(0.255);
    expect(l.hbfRel).toBe(1);
    expect(l.kLacPerH).toBeCloseTo(1.4, 6);
    expect(l.glucoseF).toBe(1);
    expect(createLiver(70, BASE, 1).glucoseF).toBeCloseTo(0.3, 9); // hepatic failure → 7e's EGP × 0.3
  });
  it('lactate clearance t½ ≈ 30 min normal; longer with low hepatic flow, hypothermia and liver failure', () => {
    expect(halfLife(BASE)).toBeCloseTo(29.7, 0);
    expect(halfLife({ ...BASE, coLpm: 3.4, bvRel: 0.65 })).toBeGreaterThan(40); // prototype 48
    expect(halfLife({ ...BASE, tempC: 33 })).toBeGreaterThan(35); // prototype 39
    expect(halfLife(BASE, 1)).toBeGreaterThan(45); // prototype 51
  });
  it('the pool integrates exactly (steady state and exponential approach)', () => {
    expect(stepLactatePool(1, 58.33, 1.4, 42, 1e6)).toBeCloseTo(58.33 / (42 * 1.4), 6);
    expect(stepLactatePool(5, 0, 1.4, 42, 3600)).toBeCloseTo(5 * Math.exp(-1.4), 6);
  });
  it('hepatic flow: 7c\'s hbfRel wins when present (never multiplied twice); the fallback falls with CO and splanchnic constriction', () => {
    expect(createLiver(70, { ...BASE, coLpm: 3.4, bvRel: 0.7 }).hbfRel).toBeCloseTo((3.4 / 5.6) * 0.6, 9);
    expect(createLiver(70, { ...BASE, coLpm: 3.4, bvRel: 0.7, hbfRel: 0.8 }).hbfRel).toBe(0.8);
  });
});
