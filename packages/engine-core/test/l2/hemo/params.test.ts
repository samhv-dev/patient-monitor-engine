import { describe, expect, it } from 'vitest';
import { breathU, ejectionFactor, fFill, gainCeiling, gHyp, lvetS, pepS, respFactor, volumeStatusForGHyp } from '../../../src/l2/hemo/params.ts';

describe('l2/hemo/params', () => {
  it('Weissler LVET and PEP follow HR (brief §4.2; research 03 §2.1)', () => {
    expect(lvetS(60)).toBeCloseTo(0.311, 6);
    expect(lvetS(120)).toBeCloseTo(0.209, 6);
    expect(lvetS(200)).toBe(0.15);
    expect(pepS(60)).toBeCloseTo(0.107, 6);
    expect(pepS(120)).toBeCloseTo(0.083, 6);
  });

  it('f_fill is 1 at RR 1 s and falls at short RR; the M3 ceiling plateaus then falls', () => {
    expect(fFill(1)).toBeCloseTo(1, 9);
    expect(fFill(0.35)).toBeLessThan(0.55);
    expect(gainCeiling(0.8)).toBe(2);
    expect(gainCeiling(0.3)).toBeLessThan(1.2);
  });

  it('E(k): no ejection below K_OPEN, 1 at k = 1, PESP k = 1.2 above 1', () => {
    expect(ejectionFactor(0)).toBe(0);
    expect(ejectionFactor(0.2)).toBe(0);
    expect(ejectionFactor(1)).toBe(1);
    expect(ejectionFactor(1.2)).toBeCloseTo(1.2667, 3);
  });

  it('g_hyp maps volumeStatus 1 → 0.04 and 0 → 0.25; the inverse round-trips', () => {
    expect(gHyp(1)).toBeCloseTo(0.04, 12);
    expect(gHyp(0)).toBeCloseTo(0.25, 12);
    expect(gHyp(volumeStatusForGHyp(0.2))).toBeCloseTo(0.2, 12);
  });

  it('the respiratory SV factor averages 1 over a breath', () => {
    let s = 0;
    for (let i = 0; i < 400; i++) s += respFactor(i * 0.01, 0.8, 0.3, 0.2);
    expect(s / 400).toBeCloseTo(1, 2);
    expect(breathU(0, -Math.PI / 2)).toBeCloseTo(0, 12);
  });
});
