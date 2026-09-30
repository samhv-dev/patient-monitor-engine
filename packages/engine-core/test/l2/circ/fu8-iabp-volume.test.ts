// FU-8 Task A20 (research/20 DV-13d, DV-M5): the balloon conserves its volume and is timed off the valve's own events.
import { describe, expect, it } from 'vitest';
import { createIabp, iabpFlow, iabpOnBeat, iabpSchedule, IABP_VOLUME_ML } from '../../../src/l2/circ/devices.ts';

const integral = (f: (t: number) => number, t0: number, t1: number, h = 1e-4): number => {
  let v = 0;
  for (let t = t0; t < t1; t += h) v += f(t) * h;
  return v;
};

describe('FU-8 A20: the IABP', () => {
  it('a new beat that arrives while the balloon is deflating does not cut the deflation short: the net volume over the run is 0 (origin/main: the rest of the 40 mL stayed in the aorta)', () => {
    const d = createIabp();
    d.on = true;
    iabpOnBeat(d, 0, 0.8, 0.37); // inflate 0.37, deflate 0.70–0.76
    const flows: Array<(t: number) => number> = [];
    const snap = () => {
      const c = { ...d };
      flows.push((t) => iabpFlow(c, t));
    };
    snap();
    // an early beat at 0.72 s (the deflation is 20 ms in) reschedules the balloon
    iabpOnBeat(d, 0.72, 0.72, 0.37);
    const net = integral((t) => (t < 0.72 ? (flows[0] as (t: number) => number)(t) : iabpFlow(d, t)), 0, 2);
    expect(Math.abs(net)).toBeLessThan(0.5);
  });
  it('the pressure trigger: inflate at the next notch, empty IABP_DEFLATE_LEAD_S before the next opening, one R–R ahead of the last valve events', () => {
    const d = createIabp();
    d.on = true;
    // MANUAL shock heart: the last opening 400 ms after its R, the closure 14 ms after the next R (systole spills over)
    iabpSchedule(d, 599.55, 0.777, 598.786, 599.18);
    expect(d.inflateAt).toBeCloseTo(599.563, 3);
    expect(d.deflateAt).toBeCloseTo(599.957 - 0.1, 3); // before the next opening, not 270 ms after it
    const vin = integral((t) => iabpFlow(d, t), d.inflateAt, d.inflateAt + 0.08, 5e-5);
    expect(vin).toBeCloseTo(IABP_VOLUME_ML, 0);
  });
});
