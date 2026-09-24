import { describe, expect, it } from 'vitest';
import { createCvpState, cvpOnBeat, cvpOnP, cvpWavesAt } from '../../../src/l2/hemo/cvp.ts';

describe('l2/hemo/cvp (brief §4.2 CVP; research 03 §2.9)', () => {
  it('a wave peaks 60 ms after P onset in the truth (80–100 ms once displayed); c, v follow the QRS and T', () => {
    const st = createCvpState();
    cvpOnP(st, 1.0);
    cvpOnBeat(st, 1.2, 90, 400, 1);
    let best = 1;
    for (let t = 1; t < 1.15; t += 0.001) if (cvpWavesAt(st, t) > cvpWavesAt(st, best)) best = t;
    expect(best).toBeCloseTo(1.06, 2);
  });

  it('a P wave inside ventricular systole makes a cannon a wave (×3)', () => {
    const st = createCvpState();
    cvpOnBeat(st, 1.0, 90, 400, 1);
    cvpOnP(st, 1.2); // between QRS onset (0.96) and T end (1.36)
    const cannon = st.waves[st.waves.length - 1]!.a;
    cvpOnP(st, 2.0);
    expect(cannon).toBe(3 * st.waves[st.waves.length - 1]!.a);
  });

  it('the mean correction keeps the waves zero-mean over a beat', () => {
    const st = createCvpState();
    for (let k = 0; k < 10; k++) {
      cvpOnP(st, k - 0.16);
      cvpOnBeat(st, k, 90, 400, 1);
    }
    let s = 0;
    for (let t = 5; t < 8; t += 0.001) s += cvpWavesAt(st, t);
    expect(s / 3000).toBeCloseTo(0, 1);
  });
});
