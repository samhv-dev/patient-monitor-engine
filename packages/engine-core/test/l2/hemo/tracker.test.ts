import { describe, expect, it } from 'vitest';
import { createTracker, isReferenceBeat, trackBeat } from '../../../src/l2/hemo/tracker.ts';

const LIM = { gMin: 0.1, gMax: 2, rMin: 0.3, rMax: 4 };

describe('l2/hemo/tracker (brief §4.9 M2)', () => {
  it('reference beats exclude PVCs, potentiated and carried-over beats and ventricular rhythms', () => {
    expect(isReferenceBeat(1, 0, 70)).toBe(true);
    expect(isReferenceBeat(0.6, 12, 70)).toBe(true); // an ordinary AF beat
    expect(isReferenceBeat(0.07, 0, 70)).toBe(false);
    expect(isReferenceBeat(1.27, 0, 70)).toBe(false);
    expect(isReferenceBeat(1, 20, 70)).toBe(false);
    expect(isReferenceBeat(0.5, 0, 70, true)).toBe(false);
  });

  it('a toy linear plant (PP ∝ g, MAP = 5 + R·Q̄) converges on 90/50 within 30 beats', () => {
    const tr = createTracker(1.05);
    let beat = { sbp: 0, dbp: 0, map: 0 };
    for (let k = 0; k < 30; k++) {
      const q = (70 * tr.g) / 0.8;
      const map = 5 + tr.R * q;
      const pp = 40 * tr.g;
      beat = { sbp: map + (2 / 3) * pp, dbp: map - pp / 3, map };
      trackBeat(tr, { t: k, ...beat, ref: true, sv: 70 * tr.g, dur: 0.8 }, { sbp: 90, dbp: 50 }, 5, LIM, 2);
    }
    expect(beat.sbp).toBeCloseTo(90, 0);
    expect(beat.dbp).toBeCloseTo(50, 0);
    expect(tr.saturated).toBe(false);
  });

  it('a binding ceiling saturates (→ the override flag)', () => {
    const tr = createTracker(1.05);
    for (let k = 0; k < 20; k++) trackBeat(tr, { t: k, sbp: 100, dbp: 90, map: 95, ref: true, sv: 70, dur: 0.8 }, { sbp: 200, dbp: 60 }, 5, LIM, 1.1);
    expect(tr.g).toBe(1.1);
    expect(tr.saturated).toBe(true);
  });
});
