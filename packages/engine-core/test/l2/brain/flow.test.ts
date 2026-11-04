import { describe, expect, it } from 'vitest';
import { autoreg, autoregIntact, brainOxygen, cmro2Rel, co2Factor, dilatorReserve, NO_ANAESTHESIA, o2Factor, spendReserve, vasoDirect } from '../../../src/l2/brain/flow.ts';

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
  // fix-cerebral-dilator-reserve: one finite vasodilatory reserve. Maximal dilation is the pressure-passive line the
  // autoregulation curve already follows below its lower limit, F_max = (CPP − 10)/(LL − 10); the reserve is F_max/A.
  it('dilator reserve: 1.40 at CPP 80, 1.20 at CPP 70, spent (1) at and below LL; HTN (LL 75) leaves 70/65 at CPP 80', () => {
    expect(dilatorReserve(80, 60, 150, 1)).toBeCloseTo(1.4, 9);
    expect(dilatorReserve(70, 60, 150, 1)).toBeCloseTo(1.2, 9);
    expect(dilatorReserve(60, 60, 150, 1)).toBe(1);
    expect(dilatorReserve(33, 60, 150, 1)).toBe(1);
    expect(dilatorReserve(20, 60, 150, 1)).toBe(1);
    expect(dilatorReserve(80, 75, 170, 1)).toBeCloseTo(70 / 65, 9);
    expect(dilatorReserve(5, 60, 150, 1)).toBe(1); // no flow: nothing to spend, nothing removed
  });
  it('the limbs spend one reserve: dilation up to it is delivered unchanged, beyond it none; constriction always passes', () => {
    expect(spendReserve(co2Factor(50), 1.4)).toBeCloseTo(1.3, 9); // the 3 %/mmHg recovered inside the reserve
    expect(spendReserve(co2Factor(50) * o2Factor(40), 1.4)).toBeCloseTo(1.4, 9); // CO2 and hypoxia share one ceiling
    expect(spendReserve(co2Factor(52), 1)).toBe(1); // below LL: no limb adds flow
    expect(spendReserve(co2Factor(30), 1)).toBeCloseTo(0.7, 9); // hypocapnic constriction is not a dilator: unchanged
  });
});
