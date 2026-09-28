// FU-4 G12 (Task 16, D14): shivering fades out in moderate hypothermia — full above SHIVER_STOP_C + SHIVER_STOP_SPAN_C
// (32 °C), half at 31 °C, none below SHIVER_STOP_C (30 °C) (Danzl DF & Pozos RS, NEJM 1994;331:1756–1760 [TXT]; span ENG).
// Unit test on 7e's shiverW with the awake thresholds (depth 0, no fever shift), 70 kg, resting metabolism 80 W.
import { describe, expect, it } from 'vitest';
import { SHIVER_STOP_C, SHIVER_STOP_SPAN_C } from '../../../src/l2/thermal/params.ts';
import { shiverW, thresholds } from '../../../src/l2/thermal/thresholds.ts';

const thr = thresholds(0, 0);
const W = (tc: number) => shiverW(tc, thr, 80, 70, 0);

describe('FU-4 G12: shivering stops in moderate hypothermia', () => {
  it('33 °C awake: shivering (> 0), unchanged by the cut-off', () => {
    expect(W(33)).toBeGreaterThan(0);
    expect(W(SHIVER_STOP_C + SHIVER_STOP_SPAN_C)).toBeCloseTo(W(33), 9); // the deficit term is saturated below 34 °C
  });
  it('31 °C: half of the uncut value; 29.5 °C: none', () => {
    expect(W(31)).toBeCloseTo(0.5 * W(33), 9);
    expect(W(29.5)).toBe(0);
  });
});
