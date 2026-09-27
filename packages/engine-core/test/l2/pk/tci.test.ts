import { describe, expect, it } from 'vitest';
import { cp, pkStep, pkSystem, zeroState, type PkParams } from '../../../src/l2/pk/compartment.ts';
import { eleveldPropofol, marshPropofol, mintoRemifentanil, schniderPropofol } from '../../../src/l2/pk/models.ts';
import { tciRate, TCI_DT_S, type TciMode } from '../../../src/l2/pk/tci.ts';

const REF = { ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' as const };
const PUMP_PROPOFOL = (1200 * 10) / 60; // 1200 mL/h of 10 mg/mL = 200 mg/min
const PUMP_REMI = (1200 * 50) / 60; // 50 µg/mL

function run(p: PkParams, mode: TciMode, target: number, maxRate: number, minutes: number) {
  const s = pkSystem(p, 0.1);
  let x = zeroState(p);
  let rate = 0;
  let first = 0;
  let reach = -1;
  let maxCe = 0;
  let maxCp = 0;
  for (let k = 0; k < minutes * 600; k++) {
    if (k % (TCI_DT_S * 10) === 0) rate = tciRate(p, x, mode, target, maxRate);
    x = pkStep(s, x, rate);
    if (k < 600) first += rate / 600;
    maxCe = Math.max(maxCe, x[3]!);
    maxCp = Math.max(maxCp, cp(p, x));
    if (reach < 0 && x[3]! >= 0.95 * target) reach = k / 600;
  }
  return { first, reach, maxCe, maxCp, ce: x[3]!, cp: cp(p, x) };
}

describe('TCI', () => {
  it('Eleveld effect-site 3 µg/mL: ~140 mg in minute 1, 95 % at 2.1–2.6 min, no overshoot, holds target', () => {
    const r = run(eleveldPropofol(REF), 'effect', 3, PUMP_PROPOFOL, 60);
    expect(r.first).toBeGreaterThan(126);
    expect(r.first).toBeLessThan(154); // prototype 140.4
    expect(r.reach).toBeGreaterThan(2.1);
    expect(r.reach).toBeLessThan(2.6); // prototype 2.35
    expect(r.maxCe).toBeLessThan(3.003);
    expect(r.ce).toBeCloseTo(3, 2);
    expect(r.cp).toBeCloseTo(3, 2);
  });
  it('Schnider effect-site 3: 95 % within 1.0–1.4 min (prototype 1.21), plasma overshoot drives it', () => {
    const r = run(schniderPropofol(REF), 'effect', 3, PUMP_PROPOFOL, 20);
    expect(r.reach).toBeGreaterThan(1.0);
    expect(r.reach).toBeLessThan(1.4);
    expect(r.maxCp).toBeGreaterThan(6);
  });
  it('Marsh plasma 4: the first interval delivers V1·Cp (63.8 mg) + maintenance; Cp never exceeds target', () => {
    const r = run(marshPropofol(REF), 'plasma', 4, 1e9, 30);
    expect(r.first).toBeGreaterThan(70);
    expect(r.first).toBeLessThan(86); // prototype 78.3
    expect(r.maxCp).toBeLessThan(4.001);
  });
  it('Minto effect-site 4 ng/mL: 95 % at 0.9–1.3 min (prototype 1.09)', () => {
    const r = run(mintoRemifentanil({ ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' }), 'effect', 4, PUMP_REMI, 30);
    expect(r.reach).toBeGreaterThan(0.9);
    expect(r.reach).toBeLessThan(1.3);
    expect(r.maxCe).toBeLessThan(4.004);
  });
  it('a lower target stops the pump until Ce has fallen to it', () => {
    const p = eleveldPropofol(REF);
    const s = pkSystem(p, TCI_DT_S);
    let x = zeroState(p);
    for (let k = 0; k < 120; k++) x = pkStep(s, x, tciRate(p, x, 'effect', 4, PUMP_PROPOFOL));
    expect(tciRate(p, x, 'effect', 2, PUMP_PROPOFOL)).toBe(0);
  });
});
