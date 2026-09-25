// Capnograph sampling model (brief §4.4 "Sampling (L3)"; research 03 §4.2): step response of the sampler.
import { describe, expect, it } from 'vitest';
import { createSampler, sampleCo2 } from '../../../src/l2/co2/capno.ts';

/** 10–90 % rise time and 10 % onset delay of the displayed signal for a 0 → 40 mmHg airway step at t = 1 s. */
function step(mode: 'sidestream' | 'mainstream', neonatal = false): { rise: number; delay: number } {
  const s = createSampler(mode, neonatal);
  const air = (t: number) => (t >= 1 ? 40 : 0);
  let t10 = 0;
  let t90 = 0;
  for (let m = 0; m < 62.5 * 6; m++) {
    const t = m / 62.5;
    const y = sampleCo2(s, t, air);
    if (!t10 && y >= 4) t10 = t;
    if (!t90 && y >= 36) t90 = t;
  }
  return { rise: t90 - t10, delay: t10 - 1 };
}

describe('capnograph sampler', () => {
  it('sidestream adult: transport delay 2.3 s, 10–90 % rise 240 ± 30 ms (Philips M3015A)', () => {
    const r = step('sidestream');
    expect(r.delay).toBeGreaterThanOrEqual(2.3);
    expect(r.delay).toBeLessThanOrEqual(2.35);
    expect(r.rise).toBeGreaterThanOrEqual(0.21);
    expect(r.rise).toBeLessThanOrEqual(0.27);
  });
  it('sidestream neonatal: rise 190 ± 30 ms; mainstream: no delay, rise < 60 ms + one sample', () => {
    const n = step('sidestream', true);
    expect(n.rise).toBeGreaterThanOrEqual(0.16);
    expect(n.rise).toBeLessThanOrEqual(0.22);
    const m = step('mainstream');
    expect(m.delay).toBeLessThanOrEqual(0.02);
    expect(m.rise).toBeLessThanOrEqual(0.06 + 0.016);
  });
});
