import { describe, expect, it } from 'vitest';
import { createIabp, iabpFlow, iabpOnBeat, IABP_VOLUME_ML } from '../../../src/l2/circ/devices.ts';
import { createCircModel, RESTING_ENV, type CircBeat } from '../../../src/l2/circ/model.ts';
import { collectBeats, driver, runTo } from '../../helpers/circ.ts';

describe('IABP (tables §8.1)', () => {
  it('the balloon flow integrates to +volume on inflation and −volume on deflation', () => {
    const d = createIabp();
    d.on = true;
    iabpOnBeat(d, 0, 0.8, 0.37);
    let v = 0;
    for (let t = 0; t < 0.8; t += 0.001) v += iabpFlow(d, t) * 0.001;
    expect(Math.abs(v)).toBeLessThan(0.5);
    let vin = 0;
    for (let t = 0.37; t < 0.37 + 0.08; t += 0.0005) vin += iabpFlow(d, t) * 0.0005;
    expect(vin).toBeCloseTo(IABP_VOLUME_ML, 0);
  });
  it('1:1 augmentation: diastolic peak exceeds the unassisted systolic peak; assisted end-diastolic pressure falls', () => {
    const m = createCircModel();
    const dr = driver(m);
    const all: CircBeat[] = [];
    const col = collectBeats(m, all);
    runTo(dr, 30, { ...RESTING_ENV, modeled: false });
    col();
    const unassisted = all.slice(-5);
    const d = createIabp();
    d.on = true;
    let seen = m.beats.length ? m.beats[m.beats.length - 1]!.t : 0;
    let peakDia = 0;
    const env = { ...RESTING_ENV, modeled: false, qAortaSrc: (t: number) => iabpFlow(d, t) };
    for (let k = 0; k < 20 * 50; k++) {
      runTo(dr, m.t + 0.02, env, (o, t) => {
        const b = m.beats[m.beats.length - 1];
        // the running beat began where the last completed one ended (the plan's window on the completed beat never matched)
        const s0 = b ? b.t + b.dur : 0;
        if (b && t > s0 + b.avClose + 0.05 && t < s0 + b.dur - 0.05) peakDia = Math.max(peakDia, o.pAo);
      });
      const b = m.beats[m.beats.length - 1];
      if (b && b.t > seen) {
        seen = b.t;
        iabpOnBeat(d, b.t + b.dur, b.dur, b.avClose); // schedule for the beat that has just started
      }
      col();
    }
    const assisted = all.slice(-5);
    const uSys = unassisted.reduce((a, b) => a + b.aoSys, 0) / 5;
    const uDia = unassisted.reduce((a, b) => a + b.aoDia, 0) / 5;
    const aDia = assisted.reduce((a, b) => a + b.aoDia, 0) / 5;
    expect(peakDia).toBeGreaterThan(uSys);
    expect(aDia).toBeLessThan(uDia - 5);
  }, 60_000);
});
