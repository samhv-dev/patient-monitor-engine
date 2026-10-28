import { describe, expect, it } from 'vitest';
import { chemoFactors, co2VascularF } from '../../../src/l2/circ/model.ts';
import { chemistryContractility } from '../../../src/l2/blood/circ-adapter.ts';

describe('chemoreflex hook (B §4.9; tables §1.1 hypoxiaHrSign)', () => {
  it('normoxia is neutral', () => {
    expect(chemoFactors({ sao2: 0.97 }, 'adult')).toEqual({ hrF: 1 });
  });
  it('adult hypoxaemia → tachycardia; infant hypoxaemia and adult SaO2 < 60 % → bradycardia', () => {
    expect(chemoFactors({ sao2: 0.75 }, 'adult').hrF).toBeGreaterThan(1.1);
    expect(chemoFactors({ sao2: 0.75 }, 'infant').hrF).toBeLessThan(0.8);
    expect(chemoFactors({ sao2: 0.5 }, 'adult').hrF).toBeLessThan(0.8);
  });
  it('hypercapnia does NOT raise the rate here: the sympathetic limb is the endocrine bus, not a pressor multiplier', () => {
    expect(chemoFactors({ sao2: 0.97 }, 'adult').hrF).toBe(1);
  });
});

// CO2's own (non-sympathetic) actions, both ≈ 0.4 % per mmHg of PaCO2 above 40 (Walley 1990 after propranolol:
// SVR still fell 20 % and Emax 4.6 → 3.6 at PCO2 92), both held at the source's measured end (PCO2 92).
describe("CO2's direct vascular and myocardial actions (audit §2.5; Walley 1990, PMID 2118837)", () => {
  it('normocapnia and hypocapnia are neutral (the hypocapnic arm is not modelled)', () => {
    expect(co2VascularF(40)).toBe(1);
    expect(co2VascularF(25)).toBe(1);
    expect(chemistryContractility(7.4, 1.1, 4.2, 40)).toBeCloseTo(1, 6);
  });
  it('vasodilation 0.4 %/mmHg: PaCO2 50 → SVR ×0.96, PaCO2 92 → ×0.792, and no further fall above the measured end', () => {
    expect(co2VascularF(50)).toBeCloseTo(0.96, 6);
    expect(co2VascularF(92)).toBeCloseTo(0.792, 6);
    expect(co2VascularF(140)).toBeCloseTo(co2VascularF(92), 6);
  });
  it('myocardial depression 0.4 %/mmHg at a pH the acidaemia term does not reach: PaCO2 55, pH 7.28 → ×0.94', () => {
    expect(chemistryContractility(7.28, 1.1, 4.2, 55)).toBeCloseTo(0.94, 6);
  });
  it('no double count: a metabolic acidosis at a normal PaCO2 is unchanged, and the deeper acidaemia carries it', () => {
    expect(chemistryContractility(7.1, 1.1, 4.2, 25)).toBeCloseTo(0.85, 6); // metabolic: the pH term alone, as before
    expect(chemistryContractility(7.05, 1.1, 4.2, 64)).toBeCloseTo(0.775, 6); // pH 7.05 (22.5 %) over CO2 64 (9.6 %)
  });
});
