import { describe, expect, it } from 'vitest';
import { acidosisFactor, betaBlunt, competitiveEc50, hill, responseSurface, tachy } from '../../../src/l2/pk/pd.ts';

describe('PD primitives', () => {
  it('Emax/Hill: half effect at EC50, zero at zero, signed Emax', () => {
    expect(hill(2, 2, 1)).toBeCloseTo(0.5, 12);
    expect(hill(0, 2, 1)).toBe(0);
    expect(hill(2, 2, -0.4, 3)).toBeCloseTo(-0.2, 12);
  });
  it('competitive antagonism shifts EC50 by 1 + occupancy/(1 − occupancy)', () => {
    expect(competitiveEc50(1, 0.5)).toBeCloseTo(2, 12);
    expect(competitiveEc50(1, 0)).toBe(1);
    expect(competitiveEc50(1, 0.99)).toBeLessThan(21); // capped at occupancy 0.95
  });
  it('acidosis blunts catecholamines: pH 7.4 → 1, 7.2 → 0.5, never below 0.4', () => {
    expect(acidosisFactor(7.4)).toBe(1);
    expect(acidosisFactor(7.5)).toBe(1);
    expect(acidosisFactor(7.2)).toBeCloseTo(0.5, 12);
    expect(acidosisFactor(6.9)).toBe(0.4);
  });
  it('response surface: additive plus synergy; tachyphylaxis 0.7 per repeat', () => {
    expect(responseSurface(1, 0)).toBe(1);
    expect(responseSurface(0.5, 0.5)).toBeCloseTo(1.375, 12);
    expect(tachy(2, 0.7)).toBeCloseTo(0.49, 12);
  });
  it('β-blockade blunts the RISE of a catecholamine-surge multiplier only (7e endoHrF/endoEesF)', () => {
    expect(betaBlunt(1.4, 0)).toBeCloseTo(1.4, 12);
    expect(betaBlunt(1.4, 0.75)).toBeCloseTo(1.1, 12);
    expect(betaBlunt(0.8, 0.9)).toBe(0.8); // a fall is not a β effect
    expect(betaBlunt(1.4, 2)).toBe(1); // occupancy clamped to 1
  });
});
