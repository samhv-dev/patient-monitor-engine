import { describe, expect, it } from 'vitest';
import { FLUIDS, MOLAR_MASS, mgdlToMmol } from '../../../src/l2/blood/params.ts';
import { addFluid, concOf, createSolutes, ionisedCa, sidOf, stepSolutes } from '../../../src/l2/blood/solutes.ts';

const ECF = 14000;
const make = () => createSolutes({ na: 140, k: 4.2, cl: 104, iCa: 1.2, mg: 0.85, lactate: 1 }, ECF, 42, 28000);

describe('solutes (tables §5b.1–5b.2; annex B1)', () => {
  it('K molar mass is 39.098 g/mol: 15.6 mg/dL of K is 4.0 mmol/L, not Pulse’s 5.0 (annex D14)', () => {
    expect(MOLAR_MASS.k).toBe(39.098);
    expect(mgdlToMmol(15.6, MOLAR_MASS.k)).toBeCloseTo(3.99, 2);
  });
  it('the SID is dynamic: lactate, chloride and sodium all move it', () => {
    const s = make();
    const c = concOf(s, ECF, 42, ECF);
    const sid0 = sidOf(c, 1.2);
    s.lac += 5 * 42;
    expect(sidOf(concOf(s, ECF, 42, ECF), 1.2)).toBeCloseTo(sid0 - 5, 6);
    s.cl += 3 * 14;
    expect(sidOf(concOf(s, ECF, 42, ECF), 1.2)).toBeCloseTo(sid0 - 8, 6);
  });
  it('2 L 0.9 % saline into 14 L ECF: Cl +6.3, Na +1.8, SID (Na − Cl) −4.5', () => {
    const s = make();
    addFluid(s, 2000, FLUIDS.saline);
    const c = concOf(s, ECF + 2000, 42, ECF);
    expect(c.cl - 104).toBeCloseTo(6.25, 1);
    expect(c.na - 140).toBeCloseTo(1.75, 1);
  });
  it('a K load moves 50 % into cells in ≈ 30 min (tables `vK`); cellular K rises by the same amount', () => {
    const s = make();
    s.k += 1 * 14; // +1 mmol/L
    const icf0 = s.kIcf;
    for (let t = 0; t < 1800; t += 0.1) stepSolutes(s, ECF, 0.1, 4.2, 1);
    expect(s.k / 14 - 4.2).toBeGreaterThan(0.45);
    expect(s.k / 14 - 4.2).toBeLessThan(0.55);
    expect(s.kIcf - icf0).toBeCloseTo(14 - (s.k - 4.2 * 14), 6);
  });
  it('ionised Ca: −0.05 per +0.1 pH; citrate chelates (1 unit / 5 min steady state → −0.1, Q46)', () => {
    const s = make();
    const c = concOf(s, ECF, 42, ECF);
    expect(ionisedCa(c, 7.5)).toBeCloseTo(1.2 - 0.05, 2);
    s.citrate = 15.6 * 14 / 14; // ≈ 1.11 mmol/L at the 1 unit / 5 min steady state (15.6 mmol × 5 min τ / 5 min)
    expect(ionisedCa(concOf(s, ECF, 42, ECF), 7.4)).toBeCloseTo(1.1, 1);
  });
});
