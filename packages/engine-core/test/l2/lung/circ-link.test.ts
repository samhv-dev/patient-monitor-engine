import { describe, expect, it } from 'vitest';
import { circSideFlows, writeCircPvr } from '../../../src/l2/lung/circ-link.ts';

describe('Stage 7a adapter (duck-typed, with fallback)', () => {
  it('no circulation (Stage 3 HemoState) → null and nothing written', () => {
    const hemo = { sys: { g: 1 } };
    expect(circSideFlows(hemo)).toBeNull();
    expect(writeCircPvr(hemo, [2, 1])).toBe(false);
    expect(circSideFlows(undefined)).toBeNull();
  });
  it('7a present → flows in L/min, PVR multipliers written to ext.pvrLungL/R only', () => {
    const hemo = { circOut: { qLungL: 40, qLungR: 50 }, circ: { ext: { pvr: 1.7 } as Record<string, number> } };
    expect(circSideFlows(hemo)).toEqual([2.4, 3]);
    expect(writeCircPvr(hemo, [2, 1])).toBe(true);
    expect(hemo.circ.ext).toEqual({ pvr: 1.7, pvrLungL: 2, pvrLungR: 1 });
  });
  it('a circulation in arrest (no flow) falls back', () => {
    expect(circSideFlows({ circOut: { qLungL: 0, qLungR: 0 } })).toBeNull();
  });
});
