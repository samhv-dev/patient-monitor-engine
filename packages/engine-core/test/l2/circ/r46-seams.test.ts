// R46 (Stage 7b requests): per-lung PVR multipliers and an external pleural source; defaults preserve 7a results.
import { describe, expect, it } from 'vitest';
import { createCircModel, circCardiacOutput } from '../../../src/l2/circ/model.ts';
import { pleuralSource } from '../../../src/l2/hemo/pipeline.ts';
import { P_PL0 } from '../../../src/l2/circ/params.ts';
import { driver, runTo, ventEnv } from '../../helpers/circ.ts';

function run(set?: (m: ReturnType<typeof createCircModel>) => void) {
  const m = createCircModel();
  set?.(m);
  const dr = driver(m);
  let qL = 0;
  let qR = 0;
  runTo(dr, 20, ventEnv());
  runTo(dr, 30, ventEnv(), (o) => {
    qL += o.qLungL;
    qR += o.qLungR;
  });
  return { m, fracR: qR / (qL + qR), co: circCardiacOutput(m), s: [...m.s] };
}

describe('R46 seams', () => {
  it('per-lung PVR multipliers default to 1 (identical state); pvrLungL raises the right-lung share; pvrLung raises both', () => {
    const a = run();
    const b = run((m) => Object.assign(m.ext, { pvrLung: 1, pvrLungL: 1, pvrLungR: 1 }));
    expect(b.s).toEqual(a.s);
    const c = run((m) => (m.ext.pvrLungL = 3));
    expect(c.fracR).toBeGreaterThan(a.fracR + 0.1);
    const d = run((m) => (m.ext.pvrLung = 3));
    expect(d.fracR).toBeCloseTo(a.fracR, 2);
    expect(d.co).toBeLessThan(a.co);
  });
  it('the external pleural source wins when it has a value; the Stage 3 path is the fallback', () => {
    const stage3 = (t: number) => -4 + t;
    expect(pleuralSource({})(3)).toBe(P_PL0);
    expect(pleuralSource({ pIt: stage3 })(3)).toBe(-1);
    const ext = pleuralSource({ pIt: stage3, pItExternal: (t) => (t > 5 ? 7 : undefined) });
    expect(ext(3)).toBe(-1);
    expect(ext(6)).toBe(7);
  });
});
