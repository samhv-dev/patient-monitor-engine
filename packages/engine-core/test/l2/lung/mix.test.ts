import { describe, expect, it } from 'vitest';
import { mixCo2 } from '../../../src/l2/lung/mix-co2.ts';

const healthy = { va: 4.2, vent: [0.45, 0, 0.55, 0], perf: [2.2, 0, 2.7, 0], qLow: 0.1, qShunt: 0.1, vdAlv: [0.075, 0.075, 0.075, 0.075], tauEx: [0.54, 0.54, 0.54, 0.54], teS: 2.8, paco2: 40, vco2: 170 };

describe('CO2 mixing point (tables §4.4, decision 7)', () => {
  it('healthy: gap ≈ 3 mmHg at PaCO2 40 and full elimination efficiency', () => {
    const m = mixCo2(healthy);
    expect(40 * (1 - m.g)).toBeGreaterThan(2.5);
    expect(40 * (1 - m.g)).toBeLessThan(3.8);
    expect(m.e).toBeGreaterThan(0.95);
    expect(m.e).toBeLessThan(1.05);
  });
  it('dead space widens the gap and cuts elimination (PE / COPD direction)', () => {
    const m = mixCo2({ ...healthy, vdAlv: [0.3, 0.3, 0.3, 0.3] });
    expect(40 * (1 - m.g)).toBeGreaterThan(10);
    expect(m.e).toBeLessThan(0.8);
  });
  it('a slow, poorly ventilated unit empties last: EtCO2 rises with its share and a late phase III term appears', () => {
    const het = mixCo2({ ...healthy, vent: [0.3, 0.15, 0.35, 0.2], perf: [1.1, 1.1, 1.35, 1.35], tauEx: [0.5, 3, 0.5, 3] });
    expect(het.riseIII).toBeGreaterThan(0);
    expect(het.pA[1]).toBeGreaterThan(het.pA[0] as number);
  });
});
