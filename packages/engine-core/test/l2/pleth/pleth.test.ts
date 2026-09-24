import { describe, expect, it } from 'vitest';
import { addPlethPulse, createPlethState, plethAt, plethDelayS, toneRatio } from '../../../src/l2/pleth/pleth.ts';

describe('l2/pleth (brief §4.3 pleth; research 03 §3.1–3.3)', () => {
  it('one pulse of amplitude ≈ PI per mechanical beat, peaking ≈ 260 ms after its origin at LVET 311 ms', () => {
    const st = createPlethState();
    addPlethPulse(st, 1, 2, 0.311, 1.05);
    let best = 1;
    for (let t = 0.8; t < 2.2; t += 0.002) if (plethAt(st, t, 1, 2) > plethAt(st, best, 1, 2)) best = t;
    expect(best - 1).toBeCloseTo(0.259, 2);
    expect(plethAt(st, best, 1, 2)).toBeGreaterThan(1.9);
    expect(plethAt(st, best, 1, 2)).toBeLessThan(2.1);
  });

  it('no pulse when amp ≤ 0 (pulse deficit), flat under an occluding cuff and with the probe off', () => {
    const st = createPlethState();
    addPlethPulse(st, 1, 0, 0.3, 1.05);
    expect(st.pulses).toHaveLength(0);
    addPlethPulse(st, 1, 2, 0.3, 1.05);
    expect(plethAt(st, 1.26, 0, 2)).toBe(0);
    st.state = 'off';
    expect(plethAt(st, 1.26, 1, 2)).toBe(0);
  });

  it('vascular tone sets a2/a1; ear and forehead probes are earlier than the finger', () => {
    expect(toneRatio(1.05)).toBeCloseTo(0.2, 9);
    expect(toneRatio(0.525)).toBeCloseTo(0.5, 9);
    expect(toneRatio(2.1)).toBeCloseTo(0.08, 9);
    expect(plethDelayS('ear')).toBeLessThan(plethDelayS('leftFinger'));
  });
});
