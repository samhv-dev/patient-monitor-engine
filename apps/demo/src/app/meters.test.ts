// Home's "CPU, this app" tile: the main thread's busy share over the last 2 s from the long tasks and the frame overruns
// that no long task covers (meters.ts says the method).
import { describe, expect, it } from 'vitest';
import { busyFraction, median } from './meters.ts';

const frames = (from: number, to: number, step = 1000 / 60) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

describe('busyFraction', () => {
  it('a smooth page with no long task is idle', () => {
    expect(busyFraction([], frames(0, 6000), 6000)).toBe(0);
  });
  it('counts a long task once, not again as the frame gap it causes', () => {
    const f = [...frames(0, 3000), ...frames(3500, 6000)]; // a 500-ms gap: the long task
    expect(busyFraction([{ start: 3000, dur: 500 }], f, 6000, 5000)).toBeCloseTo(0.1, 2); // over a 5 s window
  });
  it('counts a frame overrun with no long task beyond its one frame', () => {
    const f = [...frames(0, 3000), ...frames(3040, 6000)];
    expect(busyFraction([], f, 6000, 5000)).toBeGreaterThan(0.004); // over a 5 s window
    expect(busyFraction([], f, 6000, 5000)).toBeLessThan(0.006);
  });
  it('the default window is the last 2 s (MUI-17): a long task 3 s ago is out of it, one in it counts', () => {
    expect(busyFraction([{ start: 3000, dur: 500 }], [...frames(0, 3000), ...frames(3500, 6000)], 6000)).toBe(0);
    const f = [...frames(0, 3000), ...frames(3500, 5000), ...frames(5200, 6000)];
    expect(busyFraction([{ start: 3000, dur: 500 }, { start: 5000, dur: 200 }], f, 6000)).toBeCloseTo(0.1, 2); // 200 ms of 2000
  });
  it('median', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([])).toBeNull();
  });
});
