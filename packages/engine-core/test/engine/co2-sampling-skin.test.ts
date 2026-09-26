// R39-5 (research 09 §5): the sidestream sampler uses the ACTIVE skin's transport delay and 10–90 % rise time.
// Measured on the sampled waveform: delay = step → 10 % crossing, rise = 10 % → 90 % crossing.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { CO2_RATE, createSampler, sampleCo2, type SamplerState } from '../../src/l2/co2/capno.ts';
import { deviceProfile } from '../../src/l3/alarms/profile.ts';
import { cmd, read62 } from '../helpers/resp.ts';

/** Step 0 → 40 mmHg at t = 1 s through a sampler; returns [delay, rise] in s. */
function stepResponse(s: SamplerState): [number, number] {
  let t10 = -1;
  let t90 = -1;
  for (let n = 0; n < 8 * CO2_RATE; n++) {
    const t = n / CO2_RATE;
    const y = sampleCo2(s, t, (u) => (u >= 1 ? 40 : 0));
    if (t10 < 0 && y >= 4) t10 = t;
    if (t90 < 0 && y >= 36) t90 = t;
  }
  return [t10 - 1, t90 - t10];
}

// [delay band s, rise band s] from research 09 §5
const BANDS: Record<string, [[number, number], [number, number]]> = {
  'philips-like': [[2.0, 3.0], [0.19, 0.26]],
  'saadat-like': [[2.3, 3.0], [0.18, 0.25]],
  'zoll-like': [[2.3, 3.0], [0.18, 0.25]],
  'lifepak-like': [[2.3, 3.0], [0.18, 0.25]],
  'mindray-like': [[3.0, 4.5], [0.25, 0.31]],
  'ge-like': [[3.0, 4.5], [0.25, 0.31]],
};

describe('R39-5 sidestream CO2 delay and rise per skin', () => {
  it.each(Object.keys(BANDS))('%s: step response of the skin-configured sampler is in its band', (id) => {
    const p = deviceProfile(id);
    const s = createSampler('sidestream');
    s.side = { ...p.co2Sidestream };
    const [delay, rise] = stepResponse(s);
    const [[d0, d1], [r0, r1]] = BANDS[id]!;
    expect(delay).toBeGreaterThanOrEqual(d0);
    expect(delay).toBeLessThanOrEqual(d1);
    expect(rise).toBeGreaterThanOrEqual(r0);
    expect(rise).toBeLessThanOrEqual(r1);
    expect(Math.abs(delay - p.co2Sidestream.delayS)).toBeLessThan(0.05);
    expect(Math.abs(rise - p.co2Sidestream.riseS)).toBeLessThan(0.03);
  });

  it('no skin data: the sampler falls back to the engine constants (2.3 s / 240 ms)', () => {
    const [delay, rise] = stepResponse(createSampler('sidestream'));
    expect(Math.abs(delay - 2.3)).toBeLessThan(0.05);
    expect(Math.abs(rise - 0.24)).toBeLessThan(0.03);
  });

  it('engine: the capnogram of a mindray-like monitor lags a philips-like one by 1.2 s; a runtime skin switch applies', () => {
    const mk = (skin: string) => {
      const e = createEngine({ seed: 5, device: { skin }, patient: { sensors: { co2: 'on' } } });
      e.advanceTo(40);
      return e;
    };
    const a = read62(mk('philips-like'), 'co2', 20, 40);
    const b = read62(mk('mindray-like'), 'co2', 20, 40);
    let best = 0;
    let bestErr = Infinity;
    for (let lag = 0; lag <= 2.5 * CO2_RATE; lag++) {
      let err = 0;
      for (let i = 0; i + lag < a.length; i++) err += (a[i]! - b[i + lag]!) ** 2;
      err /= a.length - lag;
      if (err < bestErr) [best, bestErr] = [lag, err];
    }
    expect(best / CO2_RATE).toBeGreaterThanOrEqual(1.15);
    expect(best / CO2_RATE).toBeLessThanOrEqual(1.25);

    const e = createEngine({ seed: 5, device: { skin: 'philips-like' }, patient: { sensors: { co2: 'on' } } });
    e.advanceTo(1);
    e.dispatch(cmd({ type: 'device', action: { device: 'monitor', action: 'skin', value: 'ge-like' } }));
    e.advanceTo(2);
    const side = (e.snapshot().state as { st: { resp: { sampler: SamplerState } } }).st.resp.sampler.side;
    expect(side).toEqual({ delayS: 3.5, riseS: 0.28 });
  });
});
