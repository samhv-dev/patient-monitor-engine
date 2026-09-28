// FU-5: the SpO2 averaging window and display update are the skin's (philips-like 10 s / 2 s: research/05 §6 [S1] p. 66,
// [S2] p. 301; saadat-like 8 s / 1 s: research/06 §4.1).
import { describe, expect, it } from 'vitest';
import { createSpo2, stepSpo2 } from '../../../src/l3/spo2/spo2.ts';

const ok = { probe: 'on' as const, pi: 2, cuffOnLimb: false, cpr: false };

describe('SpO2 per-skin averaging and update', () => {
  it('update every 2 s (philips-like) vs every 1 s (default): the shown value changes on that cadence', () => {
    for (const [updS, expected] of [[2, 2], [undefined, 1]] as const) {
      const st = createSpo2(0.97, 0);
      if (updS !== undefined) st.updS = updS;
      let changes = 0;
      let last = st.nextUpdate;
      const times: number[] = [];
      for (let k = 1; k <= 300; k++) {
        stepSpo2(st, { ...ok, siteSa: 0.97, lastFootT: k / 10 }, k / 10);
        if (st.nextUpdate !== last) { times.push(k / 10); last = st.nextUpdate; changes++; }
      }
      const gaps = times.slice(1).map((x, i) => x - (times[i] as number));
      expect(Math.min(...gaps)).toBeCloseTo(expected, 6);
      expect(changes).toBeGreaterThan(10);
    }
  });

  it('a 10 s average reaches 90 % of a 97 → 85 step later than the 8 s default, still inside the 20 s response (brief §6.1)', () => {
    const t90 = (avgS: number | undefined) => {
      const st = createSpo2(0.97, 0);
      if (avgS !== undefined) st.avgS = avgS;
      for (let k = 1; k <= 400; k++) {
        stepSpo2(st, { ...ok, siteSa: 0.85, lastFootT: k / 10 }, k / 10);
        if ((st.shown as number) <= 97 - 0.9 * 12) return k / 10;
      }
      return Infinity;
    };
    expect(t90(10)).toBeGreaterThan(t90(undefined));
    expect(t90(10)).toBeLessThanOrEqual(20);
  });
});
