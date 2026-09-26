import { describe, expect, it } from 'vitest';
import { chemoFactors } from '../../../src/l2/circ/model.ts';

describe('chemoreflex hook (B §4.9; tables §1.1 hypoxiaHrSign)', () => {
  it('normoxia/normocapnia is neutral', () => {
    expect(chemoFactors({ sao2: 0.97, paco2: 40 }, 'adult')).toEqual({ hrF: 1, svrF: 1 });
  });
  it('adult hypoxaemia → tachycardia; infant hypoxaemia and adult SaO2 < 60 % → bradycardia', () => {
    expect(chemoFactors({ sao2: 0.75, paco2: 40 }, 'adult').hrF).toBeGreaterThan(1.1);
    expect(chemoFactors({ sao2: 0.75, paco2: 40 }, 'infant').hrF).toBeLessThan(0.8);
    expect(chemoFactors({ sao2: 0.5, paco2: 40 }, 'adult').hrF).toBeLessThan(0.8);
  });
  it('hypercapnia raises HR and SVR, capped at +20 %', () => {
    const f = chemoFactors({ sao2: 0.97, paco2: 80 }, 'adult');
    expect(f.hrF).toBeCloseTo(1.2, 6);
    expect(f.svrF).toBeCloseTo(1.2, 6);
  });
});
