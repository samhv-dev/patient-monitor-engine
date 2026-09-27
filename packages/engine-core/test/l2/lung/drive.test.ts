import { describe, expect, it } from 'vitest';
import { drive, hypoxicFactor, pti, stepFatigue } from '../../../src/l2/lung/drive.ts';

const rest = { paco2: 40, pao2: 95, paco2Set: 40, ve0: 6, co2SlopeMult: 1, opioidDep: 0, hypnoticDep: 0, pain: 0, evlwi: 7, vt0: 500, rr0: 12 };
describe('respiratory drive (tables §4.6, Q36)', () => {
  it('rests at VE0 and rises 1.5 L/min per mmHg', () => {
    expect(drive(rest).ve).toBeCloseTo(6 * hypoxicFactor(95), 6);
    expect(drive({ ...rest, paco2: 41 }).ve - drive(rest).ve).toBeCloseTo(1.5 * hypoxicFactor(95), 6);
  });
  it('Weil hypoxic factor ×1.5 at PaO2 60 and ×2.6 at 45', () => {
    expect(hypoxicFactor(60)).toBeCloseTo(1.52, 1);
    expect(hypoxicFactor(45)).toBeCloseTo(2.55, 1);
  });
  it('apnoeic threshold 4 mmHg below rest; opioid slows the rate, hypnotic shrinks VT', () => {
    expect(drive({ ...rest, paco2: 35.9 }).rr).toBe(0);
    const o = drive({ ...rest, opioidDep: 0.5 });
    const h = drive({ ...rest, hypnoticDep: 0.5 });
    expect(o.rr).toBeLessThan(rest.rr0);
    expect(h.vt).toBeLessThan(o.vt);
  });
  it('PTI above 0.15 fatigues over tens of minutes', () => {
    const p = pti(500, 30, 25, 1.2, 2.5, 0.5);
    expect(p).toBeGreaterThan(0.15);
    let f = 1;
    for (let t = 0; t < 45 * 60; t += 1) f = stepFatigue(f, p, 1);
    expect(f).toBeLessThan(0.8);
  });
});
