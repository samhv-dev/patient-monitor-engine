import { describe, expect, it } from 'vitest';
import { geptsSufentanil, ke0ForTtpe, mintoRemifentanil, shaferFentanyl, ttpeMin } from '../../../src/l2/pk/models.ts';

const A40 = { ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' as const };

describe('opioid models', () => {
  it('Minto remifentanil at 40 y, LBM ≈ 55: V1 5.1, CL1 2.6, ke0 0.595', () => {
    const p = mintoRemifentanil(A40);
    expect(p.v1).toBeCloseTo(5.12, 1);
    expect(p.k10 * p.v1).toBeCloseTo(2.61, 1);
    expect(p.ke0[0]).toBeCloseTo(0.595, 3);
  });
  it('remifentanil TTPE rises with age (D5): 40 y 1.36–1.50 (prototype 1.43), 80 y 2.1–2.4 (2.26)', () => {
    const t40 = ttpeMin(mintoRemifentanil(A40));
    const t80 = ttpeMin(mintoRemifentanil({ ...A40, ageY: 80 }));
    expect(t40).toBeGreaterThan(1.36);
    expect(t40).toBeLessThan(1.5);
    expect(t80).toBeGreaterThan(2.1);
    expect(t80).toBeLessThan(2.4);
  });
  it('fentanyl (Shafer PK, derived ke0 0.117) peaks at 3.6 min ±3 %; with the tables 0.147 it would be 3.17 (D2)', () => {
    expect(ttpeMin(shaferFentanyl())).toBeGreaterThan(3.49);
    expect(ttpeMin(shaferFentanyl())).toBeLessThan(3.71);
    expect(ttpeMin({ ...shaferFentanyl(), ke0: [0.147] })).toBeCloseTo(3.17, 1);
  });
  it('sufentanil (Gepts PK [VERIFY], derived ke0 0.176) peaks at 5.6 min ±3 %', () => {
    expect(ttpeMin(geptsSufentanil())).toBeGreaterThan(5.43);
    expect(ttpeMin(geptsSufentanil())).toBeLessThan(5.77);
  });
  it('ke0ForTtpe inverts ttpeMin', () => {
    const k = ke0ForTtpe(shaferFentanyl(), 3.6);
    expect(k).toBeCloseTo(0.117, 3);
  });
});
