import { describe, expect, it } from 'vitest';
import { autoreg, autoregIntact, brainOxygen, cmro2Rel, co2Factor, NO_ANAESTHESIA, o2Factor, vasoDirect } from '../../../src/l2/brain/flow.ts';

describe('CBF factors (tables §5.1)', () => {
  it('autoregulation: plateau 60–150, linear to 0 at CPP 10, +1 %/mmHg above 150; pressure-passive when ar = 0', () => {
    expect(autoregIntact(60, 60, 150)).toBe(1);
    expect(autoregIntact(150, 60, 150)).toBe(1);
    expect(autoregIntact(35, 60, 150)).toBeCloseTo(0.5, 9);
    expect(autoregIntact(10, 60, 150)).toBe(0);
    expect(autoregIntact(170, 60, 150)).toBeCloseTo(1.2, 9);
    expect(autoreg(40, 60, 150, 0)).toBeCloseTo(0.5, 9); // CPP 40 / 80
    expect(autoreg(55, 75, 170, 1)).toBeCloseTo(45 / 65, 9); // HTN-shifted plateau, tables §7 check 18
  });
  it('CO2 reactivity 3 %/mmHg, clamped below 20 and above 80', () => {
    expect(co2Factor(30)).toBeCloseTo(0.7, 9);
    expect(co2Factor(50)).toBeCloseTo(1.3, 9);
    expect(co2Factor(15)).toBeCloseTo(co2Factor(20), 9);
    expect(co2Factor(90)).toBeCloseTo(co2Factor(80), 9);
  });
  it('O2 reactivity: none above 60, ×2 at 30', () => {
    expect(o2Factor(100)).toBe(1);
    expect(o2Factor(60)).toBe(1);
    expect(o2Factor(30)).toBeCloseTo(2, 9);
  });
  it('anaesthetics: propofol halves CMRO2; iso 1.5 MAC CBF net +72 %; sevo 0.5 MAC +4 %; hypothermia −7 %/°C', () => {
    expect(cmro2Rel({ ...NO_ANAESTHESIA, propofolE: 1 }, 37)).toBeCloseTo(0.5, 9);
    const iso = { ...NO_ANAESTHESIA, isoMac: 1.5 };
    expect(cmro2Rel(iso, 37) * vasoDirect(iso)).toBeCloseTo(1.72, 2);
    const sevo = { ...NO_ANAESTHESIA, sevoMac: 0.5 };
    expect(cmro2Rel(sevo, 37) * vasoDirect(sevo)).toBeCloseTo(1.04, 2);
    expect(cmro2Rel(NO_ANAESTHESIA, 34)).toBeCloseTo(0.79, 9);
  });
  it('brain oxygen: normal PbtO2 25 and SjvO2 ≈ 65 %; halved delivery lowers both', () => {
    const n = brainOxygen(1, 0.97, 100);
    expect(n.pbto2).toBeCloseTo(25, 6);
    expect(n.sjvo2).toBeCloseTo(0.65, 2);
    const h = brainOxygen(0.5, 0.97, 100);
    expect(h.pbto2).toBeCloseTo(14.9, 1);
    expect(h.sjvo2).toBeCloseTo(0.33, 2);
  });
});
