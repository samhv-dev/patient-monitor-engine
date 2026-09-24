import { describe, expect, it } from 'vitest';
import { Clock, MAX_FRAME_MS, TICK_MS } from '../../src/clock/clock.ts';
import { createRng } from '../../src/rng/sfc32.ts';

describe('clock/Clock', () => {
  it('10,000 random 8–50 ms frames: ticks == floor(Σ(wallΔ·scale)/20 ms) and acc < 20 ms', () => {
    const rnd = createRng(2026).stream('scenario');
    const scales = [0.25, 0.5, 1, 2, 4];
    for (const scale of scales) {
      const clock = new Clock();
      clock.timeScale = scale;
      let sum = 0;
      let ticks = 0;
      for (let i = 0; i < 10_000; i++) {
        // Multiples of 1/16 ms are exact in float64, so the reference sum is exact too.
        const wallDelta = 8 + Math.floor(rnd.next() * 42 * 16) / 16;
        sum += wallDelta * scale;
        ticks += clock.advance(wallDelta);
        expect(clock.accumulatorMs).toBeGreaterThanOrEqual(0);
        expect(clock.accumulatorMs).toBeLessThan(TICK_MS);
      }
      expect(ticks).toBe(Math.floor(sum / TICK_MS));
      expect(clock.tick).toBe(ticks);
    }
  });

  it('clamps a 5 s frame to at most 250 ms × scale', () => {
    for (const scale of [0.25, 1, 4]) {
      const clock = new Clock();
      clock.timeScale = scale;
      const n = clock.advance(5000);
      expect(n * TICK_MS).toBeLessThanOrEqual(MAX_FRAME_MS * scale);
      expect(n).toBe(Math.floor((MAX_FRAME_MS * scale) / TICK_MS));
    }
  });

  it('simT and renderT follow the tick count and the accumulator', () => {
    const clock = new Clock();
    clock.advance(50);
    expect(clock.tick).toBe(2);
    expect(clock.simT).toBeCloseTo(0.04, 12);
    expect(clock.renderT).toBeCloseTo(0.05, 12);
  });

  it('pause stops time; step advances only while paused', () => {
    const clock = new Clock();
    expect(clock.step(3)).toBe(0);
    clock.pause();
    expect(clock.advance(100)).toBe(0);
    expect(clock.step(3)).toBe(3);
    expect(clock.tick).toBe(3);
    clock.resume();
    expect(clock.advance(40)).toBe(2);
  });

  it('rejects timeScale outside 0.25–4', () => {
    const clock = new Clock();
    expect(() => {
      clock.timeScale = 0.1;
    }).toThrow(RangeError);
    expect(() => {
      clock.timeScale = 5;
    }).toThrow(RangeError);
    clock.timeScale = 4;
    expect(clock.timeScale).toBe(4);
  });

  it('a 24 h run in 20 ms frames lands exactly on tick 4,320,000', () => {
    const clock = new Clock();
    for (let i = 0; i < 4_320_000; i++) clock.advance(20);
    expect(clock.tick).toBe(4_320_000);
    expect(clock.simT).toBe(86_400);
  });
});
