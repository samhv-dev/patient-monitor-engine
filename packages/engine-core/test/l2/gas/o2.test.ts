// Oxygen truth (brief §4.3; research 03 §3.5): ODC, content, steady state, shunt calibration, apnoea direction.
import { describe, expect, it } from 'vitest';
import { content, o2Steady, odc, po2ForContent, solveShunt, stepO2, type O2Inputs } from '../../../src/l2/gas/o2.ts';

const x: O2Inputs = { vaLpm: 4.4, fio2: 0.21, massFlowFio2: null, qLpm: 5.25, vo2: 245, shunt: 0.03, paco2: 40, tempC: 37, frcMl: 2100, bloodL: 4.9 };

describe('O2 model', () => {
  it('Severinghaus ODC: P50 ≈ 26.8 mmHg, 90 % near 58 mmHg; hypothermia shifts it left', () => {
    expect(odc(26.8)).toBeCloseTo(0.5, 2);
    expect(odc(58)).toBeGreaterThan(0.89);
    expect(odc(58)).toBeLessThan(0.91);
    expect(odc(40, 33)).toBeGreaterThan(odc(40, 37));
    expect(po2ForContent(content(80))).toBeCloseTo(80, 3);
  });
  it('room-air steady state: PAO2 ≈ 100 mmHg, SaO2 96–98 %; the shunt solve inverts it', () => {
    const ss = o2Steady(x, 0.03)!;
    expect(ss.fa * 713).toBeGreaterThan(95);
    expect(ss.fa * 713).toBeLessThan(105);
    expect(ss.sa).toBeGreaterThan(0.96);
    expect(ss.sa).toBeLessThan(0.98);
    const s = solveShunt(x, 0.9);
    expect(o2Steady(x, s)!.sa).toBeCloseTo(0.9, 3);
    expect(o2Steady({ ...x, vaLpm: 0 }, 0.03)).toBeNull();
  });
  it('apnoea depletes the store; apnoeic oxygenation with O2 at a patent airway slows it', () => {
    const run = (mf: number | null) => {
      const st = o2Steady(x, 0.03)!;
      for (let i = 0; i < 900; i++) stepO2(st, { ...x, vaLpm: 0, massFlowFio2: mf }, 0.1);
      return st.sa;
    };
    expect(run(null)).toBeLessThan(0.9); // room air, 90 s
    expect(run(1)).toBeGreaterThan(run(null));
  });
});
