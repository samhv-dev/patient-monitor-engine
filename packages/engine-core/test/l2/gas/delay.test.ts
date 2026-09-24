// Circulatory delay lung → probe (brief §4.3 step 2; research 03 §3.6).
import { describe, expect, it } from 'vitest';
import { createDelay, delayStep, siteDelay } from '../../../src/l2/gas/delay.ts';

describe('circulatory delay', () => {
  it('finger 15 s and ear 5 s at normal CO; ×CO_ref/CO, longer with vasoconstriction, capped at 60 s', () => {
    expect(siteDelay('leftFinger', 1, 2)).toBe(15);
    expect(siteDelay('ear', 1, 2)).toBe(5);
    expect(siteDelay('leftFinger', 0.5, 2)).toBe(30);
    expect(siteDelay('leftFinger', 0.25, 0.1)).toBe(60);
  });
  it('a step appears at the site after the dead time', () => {
    const d = createDelay(0.97);
    const out: number[] = [];
    for (let k = 0; k < 300; k++) out.push(delayStep(d, k < 50 ? 0.97 : 0.85, 15, 0.1));
    expect(out[50 + 140]).toBeCloseTo(0.97, 6);
    expect(out[50 + 160]).toBeCloseTo(0.85, 6);
  });
});
