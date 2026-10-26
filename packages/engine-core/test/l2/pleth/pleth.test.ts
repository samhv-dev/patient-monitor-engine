import { describe, expect, it } from 'vitest';
import { addPlethPulse, createPlethState, PLETH_DET_FLOOR, plethAt, plethDelayS, plethNoise, toneRatio } from '../../../src/l2/pleth/pleth.ts';
import { createPulseDet, pulseStep } from '../../../src/l3/pulse/detector.ts';

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

  it('no pulse when amp ≤ 0 (pulse deficit), only the noise floor under an occluding cuff, flat with the probe off', () => {
    const st = createPlethState();
    addPlethPulse(st, 1, 0, 0.3, 1.05);
    expect(st.pulses).toHaveLength(0);
    addPlethPulse(st, 1, 2, 0.3, 1.05);
    expect(plethAt(st, 1.26, 0, 2)).toBe(plethNoise(1.26));
    st.state = 'off';
    expect(plethAt(st, 1.26, 1, 2)).toBe(0);
  });

  // E126 (owner ruling 2026-10-26): a pulseless finger is not a flat line — the sensor's noise, unorganised and small,
  // below the pulse detector's floor so it is never counted as a pulse
  it('the noise floor: within ±floor/2, irregular, and 120 s of it give the detector no pulse', () => {
    const xs = Array.from({ length: 120 * 125 }, (_, n) => plethNoise(n / 125));
    expect(Math.max(...xs.map(Math.abs))).toBeLessThanOrEqual(PLETH_DET_FLOOR / 2);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(PLETH_DET_FLOOR / 2);
    const det = createPulseDet(PLETH_DET_FLOOR);
    expect(xs.filter((x) => pulseStep(det, x) >= 0)).toHaveLength(0);
  });

  it('vascular tone sets a2/a1; ear and forehead probes are earlier than the finger', () => {
    expect(toneRatio(1.05)).toBeCloseTo(0.2, 9);
    expect(toneRatio(0.525)).toBeCloseTo(0.5, 9);
    expect(toneRatio(2.1)).toBeCloseTo(0.08, 9);
    expect(plethDelayS('ear')).toBeLessThan(plethDelayS('leftFinger'));
  });
});
