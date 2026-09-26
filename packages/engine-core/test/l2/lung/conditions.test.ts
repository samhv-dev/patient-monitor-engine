import { describe, expect, it } from 'vitest';
import { effectValue, interp, resolveLung } from '../../../src/l2/lung/conditions.ts';

describe('conditions → per-lung parameters (catalogue §33, Q93)', () => {
  it('knots interpolate and clamp', () => {
    expect(interp([[0, 1], [0.5, 2], [1, 4]], 0.25)).toBeCloseTo(1.5, 9);
    expect(interp([[0, 1], [1, 4]], 2)).toBe(4);
    expect(effectValue({ key: 'crs', op: 'mul', v: 0.5, src: 'x', tag: 'ENG' }, 0.5)).toBeCloseTo(0.75, 9);
  });
  it('healthy: no conditions → the healthy adult', () => {
    const { lp, blocked } = resolveLung([], 70);
    expect(blocked).toEqual([]);
    expect(lp.side[0]!.cL + lp.side[1]!.cL).toBeCloseTo(1 / (1 / 55 - 1 / 200), 6);
    expect(lp.side[0]!.vdAlv).toBeCloseTo(0.075, 9);
  });
  it('COPD GOLD 3 (severity 0.75): R 25, ratio 1.55, slow unit 0.5 / 2.0 s, VD +0.2, Crs 68', () => {
    const { lp } = resolveLung([{ id: 'copd', severity: 0.75 }], 70);
    const s = lp.side[1]!;
    expect(s.rLung * 0.55 + 4).toBeCloseTo(25, 6);
    expect(s.rawExp).toBeCloseTo(1.55, 9);
    expect(s.fSlow).toBeCloseTo(0.5, 9);
    expect(s.tauSlowS).toBeCloseTo(2, 9);
    expect(s.vdAlv).toBeCloseTo(0.275, 9);
    expect(1 / (1 / (lp.side[0]!.cL + s.cL) + 1 / 200)).toBeCloseTo(68.2, 0);
  });
  it('ARDS recruitability override re-splits the non-aerated lung', () => {
    const { lp } = resolveLung([{ id: 'ards', severity: 0.67, recruitFrac: 0.5 }], 70);
    expect(lp.side[0]!.atel).toBeCloseTo(0.175, 3);
    expect(lp.side[0]!.consol).toBeCloseTo(0.175, 3);
    expect(lp.side[0]!.aerRef).toBeCloseTo(0.65, 3);
  });
  it('OLV blocks the affected side and puts the DLT resistance on the ventilated lung', () => {
    const { lp, blocked } = resolveLung([{ id: 'olv', severity: 1 }], 70);
    expect(blocked).toEqual(['L']);
    expect(lp.side[1]!.rLung).toBeGreaterThan(lp.side[0]!.rLung);
    expect(lp.side[0]!.perf).toBeCloseTo(0.89, 2);
  });
  it('a sided condition acts on its side: simple pneumothorax 0.3 on the left', () => {
    const { lp } = resolveLung([{ id: 'ptxSimple', severity: 0.3, side: 'L' }], 70);
    expect(lp.side[0]!.consol).toBeCloseTo(0.3, 6);
    expect(lp.side[1]!.consol).toBe(0);
    expect(lp.side[0]!.cL).toBeLessThan(lp.side[1]!.cL * (0.45 / 0.55));
  });
  it('stacking multiplies R and adds non-aeration; severity 0 removes a condition', () => {
    const a = resolveLung([{ id: 'copd', severity: 0.75 }, { id: 'pneumonia', severity: 0.4, side: 'R' }], 70).lp;
    const b = resolveLung([{ id: 'copd', severity: 0.75 }, { id: 'pneumonia', severity: 0, side: 'R' }], 70).lp;
    expect(a.side[1]!.rLung).toBeGreaterThan(b.side[1]!.rLung);
    expect(a.side[1]!.atel + a.side[1]!.consol).toBeGreaterThan(0.2);
    expect(b.side[1]!.atel + b.side[1]!.consol).toBe(0);
  });
});
