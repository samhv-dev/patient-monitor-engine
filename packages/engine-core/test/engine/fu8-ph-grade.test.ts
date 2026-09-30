// FU-8 Task A18 (research/19 C8): the pulmonary-hypertension grade sets PVR (tables §1.5: 3 / 5 / 10 Wood units).
// Before FU-8 every grade got PVR × 3 (measured 5.1 WU here; 5.9 WU in the CM run for "severe").
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

type St = { hemo: { circ: { qFwd: number }; circOut: { pPa: number; pPv: number } } };
function pvrWu(grade?: string): number {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 50, sex: 'M', weightKg: 70, conditions: [{ id: 'ph', ...(grade ? { grade } : {}) }] } as never });
  e.advanceTo(300);
  let dp = 0;
  let n = 0;
  for (let t = 300.02; t < 310; t += 0.02) {
    e.advanceTo(t);
    const o = (e as unknown as { st: St }).st.hemo.circOut;
    dp += o.pPa - o.pPv;
    n++;
  }
  return dp / n / ((e as unknown as { st: St }).st.hemo.circ.qFwd * 0.06);
}

describe('FU-8 A18 (C8): PH grades', () => {
  it('mild 3, moderate 5, severe 10 WU (± 20 %); no grade = moderate (the pre-FU-8 × 3)', () => {
    const r = { mild: pvrWu('mild'), moderate: pvrWu('moderate'), severe: pvrWu('severe'), none: pvrWu() };
    console.log(`fu8 A18: PVR ${Object.entries(r).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', ')} WU`);
    expect(Math.abs(r.mild / 3 - 1)).toBeLessThanOrEqual(0.2);
    expect(Math.abs(r.moderate / 5 - 1)).toBeLessThanOrEqual(0.2);
    expect(Math.abs(r.severe / 10 - 1)).toBeLessThanOrEqual(0.2);
    expect(r.none).toBeCloseTo(r.moderate, 6);
  }, 120_000);
});
