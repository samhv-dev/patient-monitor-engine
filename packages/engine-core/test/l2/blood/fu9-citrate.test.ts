// FU-9 Task A3 (F5; R50 ruling R1): citrate is a strong trivalent anion until it is metabolised (Stewart/Fencl; Driscoll
// 1987), counted once net of the Ca it complexes; the blood products are electroneutral rows built from their sourced
// ingredients (CPD, ACD-A, SAGM — params.ts).
import { describe, expect, it } from 'vitest';
import { createBloodCore, stepBloodCore } from '../../../src/l2/blood/core.ts';
import { CITRATE_CHARGE, PRODUCTS, storedComp, type ProductId } from '../../../src/l2/blood/params.ts';
import { concOf, createSolutes, K_CIT, sidOf } from '../../../src/l2/blood/solutes.ts';

const ECF = 14000;
const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };

describe('FU-9 F5: citrate in the strong-ion difference; electroneutral products', () => {
  it('1 mmol/L of free citrate lowers the apparent SID by 3 − 2·K_CIT mEq/L (the complexed Ca keeps its charge)', () => {
    const s = createSolutes({ na: 140, k: 4.2, cl: 104, iCa: 1.2, mg: 0.85, lactate: 1 }, ECF, 42, 28000);
    const c0 = concOf(s, ECF, 42, ECF);
    s.citrate = 14; // 1 mmol/L
    const c1 = concOf(s, ECF, 42, ECF);
    expect(CITRATE_CHARGE).toBe(3);
    expect(sidOf(c0, 1.2) - sidOf(c1, 1.2)).toBeCloseTo(3 - 2 * K_CIT, 9);
  });
  it('every product is electroneutral at 1, 14 and 35 days: SID (Na + K − Cl − 3·citrate − lactate) 0–30 mEq/L (Stage 7c rows: RBC −167, FFP −93)', () => {
    for (const p of Object.keys(PRODUCTS) as ProductId[]) {
      for (const d of [1, 14, 35]) {
        const c = storedComp(p, d);
        const sid = c.na + c.k - c.cl - CITRATE_CHARGE * c.citrate - c.lactate;
        expect(sid).toBeGreaterThanOrEqual(-1e-9);
        expect(sid).toBeLessThanOrEqual(30);
      }
    }
    const perUnit = (p: ProductId) => (storedComp(p, 14).citrate * PRODUCTS[p].ml * (1 - PRODUCTS[p].comp.hct)) / 1000;
    expect(perUnit('ffp')).toBeCloseTo(5.0, 1); // CPD's 19 % share of the plasma at 105 mmol/L
    expect(perUnit('rbc')).toBeLessThan(0.5); // a SAGM unit keeps only its residual plasma's citrate
    expect(storedComp('rbc', 35).k).toBe(35);
    expect(storedComp('rbc', 35).lactate).toBe(40);
  });
  it('10 FFP over 40 min at normal flow: citrate ≈ 0.4 mmol/L, iCa falls, and its metabolism alkalinises (BE up; Driscoll 1987)', () => {
    const bc = createBloodCore(MAN, 5.25, 40);
    const u = PRODUCTS.ffp;
    bc.fl.flows.push({ rate: (10 * u.ml) / 40, until: 1e9, leftMl: 10 * u.ml, comp: u.comp });
    for (let k = 0; k < 24000; k++) stepBloodCore(bc, { t: k / 10, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);
    const cit = bc.so.citrate / ((bc.fl.vp + bc.fl.visf) / 1000);
    console.log(`FU-9 F5: 10 FFP → citrate ${cit.toFixed(2)} mmol/L, iCa ${bc.out.iCa.toFixed(2)}, BE ${bc.ab.be.toFixed(2)} at 40 min`);
    expect(cit).toBeGreaterThan(0.3);
    expect(cit).toBeLessThan(0.6);
    expect(bc.out.iCa).toBeLessThan(1.1);
    expect(bc.ab.be).toBeGreaterThan(2);
  });
});
