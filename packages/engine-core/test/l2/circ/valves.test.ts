import { describe, expect, it } from 'vitest';
import { stenosisK, valveFlow } from '../../../src/l2/circ/valves.ts';
import { AVA_REF, GORLIN_AV } from '../../../src/l2/circ/params.ts';

describe('valves', () => {
  it('a competent open valve is a resistor; closed it passes nothing backwards', () => {
    const v = { r: 0.02, k: 0, eroa: 0 };
    expect(valveFlow(v, 10)).toBeCloseTo(500, 9);
    expect(valveFlow(v, -50)).toBe(0);
  });
  it('the stenotic term counts only the excess over a normal orifice; severe AS (0.7 cm²) gives Gorlin gradients', () => {
    expect(stenosisK(AVA_REF, GORLIN_AV, AVA_REF)).toBe(0);
    const k = stenosisK(0.7, GORLIN_AV, AVA_REF);
    const v = { r: 0.018, k, eroa: 0 };
    // mean systolic flow 250 mL/s → ≈ 60–70 mmHg across the valve (Gorlin (Q/(44.3·A))² ≈ 65)
    let dp = 0;
    while (valveFlow(v, dp) < 250) dp += 0.1;
    expect(dp).toBeGreaterThan(55);
    expect(dp).toBeLessThan(75);
  });
  it('regurgitation is continuous through ΔP = 0 (no chattering) and follows the orifice law at large ΔP', () => {
    const v = { r: 0.016, k: 0, eroa: 0.4 };
    expect(valveFlow(v, -1e-9)).toBeCloseTo(0, 6);
    expect(valveFlow(v, 0)).toBe(0);
    const q = valveFlow(v, -100);
    expect(q).toBeLessThan(-170);
    expect(q).toBeGreaterThan(-180); // 44.3·0.4·100/√101 = 176.3
  });
});
