// The ported lung mechanics (v1.9 formulas) and the original's LCG stream.
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, easeShape, expResistance, pbw, pmusValue, recoilPressure, simRand, type VentConfig, type VentState } from '../src/index.ts';

const cfg = (o: Partial<VentConfig> = {}): VentConfig => ({ ...DEFAULT_CONFIG, ...o });

describe('v1.9 mechanics', () => {
  it('linear recoil V/C; airway closure (sqrt below the recruited volume); upper inflection ×2.2 above threshold − PEEP', () => {
    expect(recoilPressure(cfg(), 500)).toBe(10);
    const ards = cfg({ compliance: 33, airwayClosure: true, openPressure: 14, recruitedVol: 180 });
    expect(recoilPressure(ards, 45)).toBeCloseTo(7, 9);
    expect(recoilPressure(ards, 510)).toBeCloseTo(24, 9);
    expect(recoilPressure(cfg({ uip: true, uipThresh: 20, peep: 5 }), 1000)).toBeCloseTo(15 + 5 * 2.2, 9);
  });
  it('expiratory resistance: flow limitation × severity, PEEP stenting down to 30 %; custom factor 1/eflK', () => {
    expect(expResistance(cfg())).toBe(10);
    expect(expResistance(cfg({ efl: true, eflSeverity: 'moderate', peep: 3 }))).toBe(30);
    expect(expResistance(cfg({ efl: true, eflSeverity: 'severe', peep: 15, peepStent: 100 }))).toBeCloseTo(15, 9);
    expect(expResistance(cfg({ efl: true, eflSeverity: 'custom', eflK: 0.25, peepStent: 0 }))).toBeCloseTo(40, 9);
  });
  it('Pmus: smoothstep rise to A = pmus·(0.4 + 0.6·responsiveness), hold, half-cosine decay; PBW (Devine)', () => {
    const c = cfg({ pmus: 10, responsiveness: 50 });
    expect(pmusValue(c, 0.15)).toBeCloseTo(7 * easeShape(0.5, 'smoothstep'), 9);
    expect(pmusValue(c, 0.32)).toBeCloseTo(7, 9);
    expect(pmusValue(c, 0.35 + 0.2)).toBeCloseTo(3.5, 9);
    expect(pmusValue(c, 2)).toBe(0);
    expect(pbw(cfg({ sex: 'female', height: 165 }))).toBeCloseTo(45.5 + 2.3 * (165 / 2.54 - 60), 9);
  });
  it('simRand reproduces the original float-multiply LCG from seed 12345', () => {
    const vs = { seed: 12345 } as VentState;
    const xs = [simRand(vs), simRand(vs), simRand(vs)];
    let s = 12345;
    const ref = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    expect(xs).toEqual([ref(), ref(), ref()]);
    let m = 12345;
    const imul = () => { m = (Math.imul(m, 1103515245) + 12345) & 0x7fffffff; return m / 0x7fffffff; };
    expect(xs).not.toEqual([imul(), imul(), imul()]); // the rounding of the float product is part of the stream
  });
});
