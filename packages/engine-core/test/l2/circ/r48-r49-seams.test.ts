// R48 (7d Cushing) and R49 (7e endocrine) control-step multipliers: defaults preserve 7a; each acts where named.
import { describe, expect, it } from 'vitest';
import { createCircModel, CTL_DT, RESTING_ENV } from '../../../src/l2/circ/model.ts';
import { stepCircModel } from '../../../src/l2/circ/model.ts';
import { createOut } from '../../../src/l2/circ/circuit.ts';
import { driver, runTo } from '../../helpers/circ.ts';

function step(set?: (m: ReturnType<typeof createCircModel>) => void) {
  const m = createCircModel();
  set?.(m);
  stepCircModel(m, CTL_DT / 2, RESTING_ENV, createOut()); // one control step
  return m;
}

describe('R48/R49 seams', () => {
  it('defaults (1, and 0 for endoDV0Frac) leave the state identical', () => {
    const a = step();
    const b = step((m) => Object.assign(m.ext, { rSysF: 1, hrF: 1, endoHrF: 1, endoSvrF: 1, endoEesF: 1, endoDV0Frac: 0, kChem: 1 }));
    expect(b.s).toEqual(a.s);
    expect(b.p).toEqual(a.p);
    expect(b.hrModel).toBe(a.hrModel);
  });
  it('each multiplier acts on its effector', () => {
    const a = step();
    expect(step((m) => (m.ext.rSysF = 1.5)).p.rSys).toBeCloseTo(a.p.rSys * 1.5, 9);
    expect(step((m) => (m.ext.endoSvrF = 1.2)).p.rSys).toBeCloseTo(a.p.rSys * 1.2, 9);
    expect(step((m) => (m.ext.hrF = 0.6)).hrModel).toBeLessThan(a.hrModel * 0.7);
    expect(step((m) => (m.ext.endoHrF = 1.3)).hrModel).toBeGreaterThan(a.hrModel * 1.2);
    expect(step((m) => (m.ext.endoEesF = 1.25)).kLv).toBeCloseTo(a.kLv * 1.25, 9);
    expect(step((m) => (m.ext.endoEesF = 1.25)).kRv).toBeCloseTo(a.kRv * 1.25, 9);
    expect(step((m) => (m.ext.endoDV0Frac = 0.1)).p.v0Sv).toBeCloseTo(a.p.v0Sv - 0.1 * a.base.v0Sv, 6);
  });
  it('7c kChem 0.8 lowers stroke volume (all four chambers)', () => {
    const sv = (k: number) => {
      const m = createCircModel();
      m.ext.kChem = k;
      const dr = driver(m);
      runTo(dr, 30, RESTING_ENV);
      return m.beats.slice(-4).reduce((a, b) => a + b.sv, 0) / 4;
    };
    expect(sv(0.8)).toBeLessThan(0.95 * sv(1));
    const m = step((mm) => (mm.ext.kChem = 0.8));
    expect(m.p.emaxLa).toBeLessThan(m.base.emaxLa);
  });
});
