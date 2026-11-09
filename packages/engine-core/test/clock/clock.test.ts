import { describe, expect, it } from 'vitest';
import { BEHIND_REPORT_S, Clock, FRAME_BUDGET_MAX_MS, FRAME_BUDGET_MS, frameBudgetMs, MAX_TIME_SCALE, runOwed, TICK_MS } from '../../src/clock/clock.ts';
import { createRng } from '../../src/rng/sfc32.ts';

describe('clock/Clock', () => {
  it('10,000 random 8–50 ms frames: ticks == floor(Σ(wallΔ·scale)/20 ms) and acc < 20 ms', () => {
    const rnd = createRng(2026).stream('scenario');
    const scales = [0.25, 0.5, 1, 2, 4, 8];
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

  it('brief 105: a 5 s frame is owed in full (no clamp), × scale', () => {
    for (const scale of [0.25, 1, 4, 8]) {
      const clock = new Clock();
      clock.timeScale = scale;
      clock.credit(5000);
      expect(clock.owedTicks).toBe(Math.floor((5000 * scale) / TICK_MS));
      expect(clock.behindS).toBeCloseTo(clock.owedTicks * 0.02, 12);
      expect(clock.take()).toBe(Math.floor((5000 * scale) / TICK_MS));
      expect(clock.behindS).toBe(0);
    }
  });

  it('brief 105: runOwed runs 20-ms ticks one at a time within the budget, leaves the rest owed, and catches up later', () => {
    const clock = new Clock();
    let wall = 0;
    const costMs = 7; // a starved machine's tick (brief 105 measured 6.6 ms)
    const ran: number[] = [];
    const runTo = (simT: number) => {
      ran.push(simT);
      wall += costMs;
    };
    clock.credit(400); // one frame 400 ms after the last: 20 ticks owed
    const n = runOwed(clock, runTo, FRAME_BUDGET_MS, () => wall);
    expect(n).toBe(Math.ceil(FRAME_BUDGET_MS / costMs)); // 8 ticks: the budget is spent, then one more check
    expect(ran.map((t, i) => t - (ran[i - 1] ?? 0)).every((d) => Math.abs(d - TICK_MS / 1000) < 1e-9)).toBe(true); // never a larger dt
    expect(clock.owedTicks).toBe(20 - n);
    expect(clock.behindS).toBeCloseTo((20 - n) * 0.02, 12);
    expect(clock.renderT).toBeLessThan(clock.simT + TICK_MS / 1000); // a renderer never draws the owed ticks
    runOwed(clock, runTo, FRAME_BUDGET_MS, () => wall);
    runOwed(clock, runTo, FRAME_BUDGET_MS, () => wall);
    expect(clock.owedTicks).toBe(0);
    expect(clock.simT).toBeCloseTo(0.4, 12); // nothing lost: 400 ms of wall is 400 ms of sim
  });

  it('brief 105: a machine that cannot keep up stays behind and says how far, it never runs slow in silence', () => {
    const clock = new Clock();
    let wall = 0;
    const runTo = () => void (wall += 30); // a tick costs more than the 20 ms it simulates
    let last = 0;
    for (let f = 0; f < 50; f++) {
      clock.credit(wall - last + 16);
      last = wall;
      runOwed(clock, runTo, FRAME_BUDGET_MS, () => wall);
    }
    expect(clock.simT + clock.behindS).toBeGreaterThan((wall / 1000) * 0.99); // run + owed = the wall time credited
    expect(clock.behindS).toBeGreaterThan(BEHIND_REPORT_S);
  });

  it('brief 105: a frame may spend what passed since the last one (50–250 ms), so frames 400 ms apart keep real time', () => {
    expect(frameBudgetMs(16)).toBe(FRAME_BUDGET_MS);
    expect(frameBudgetMs(120)).toBe(120);
    expect(frameBudgetMs(400)).toBe(FRAME_BUDGET_MAX_MS);
    // PR #369's first CI run: with a fixed 50 ms, 400-ms frames at ≈ 2.7 ms a tick owed 1.8 s after 20 s. At 7 ms a tick
    // (worse than CI, the 6.6 ms of a starved laptop) the gap's budget runs every owed tick, frame after frame
    const clock = new Clock();
    let wall = 0;
    for (let f = 0; f < 50; f++) {
      wall = f * 400;
      clock.credit(400);
      runOwed(clock, () => void (wall += 7), frameBudgetMs(400), () => wall);
    }
    expect(clock.behindS).toBe(0);
    expect(clock.simT).toBeCloseTo(20, 9);
    // the fixed 50 ms floor alone would not: the same frames owe more and more
    const slow = new Clock();
    for (let f = 0; f < 50; f++) {
      wall = f * 400;
      slow.credit(400);
      runOwed(slow, () => void (wall += 7), FRAME_BUDGET_MS, () => wall);
    }
    expect(slow.behindS).toBeGreaterThan(10);
  });

  it('brief 105: at least one owed tick runs per frame however slow a tick is', () => {
    const clock = new Clock();
    let wall = 0;
    clock.credit(100);
    expect(runOwed(clock, () => void (wall += 1000), FRAME_BUDGET_MS, () => wall)).toBe(1);
    expect(clock.owedTicks).toBe(4);
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

  it('a pause keeps what was owed before it, credits nothing during it, and the owed ticks run after resume', () => {
    const clock = new Clock();
    clock.credit(100); // owed: 5 ticks
    clock.pause();
    clock.credit(10_000);
    expect(clock.take()).toBe(0);
    clock.resume();
    expect(clock.take()).toBe(5);
  });

  it('rejects timeScale outside 0.25–8 (×8 is the fastest speed)', () => {
    const clock = new Clock();
    expect(() => {
      clock.timeScale = 0.1;
    }).toThrow(RangeError);
    expect(() => {
      clock.timeScale = 8.5;
    }).toThrow(RangeError);
    clock.timeScale = 8;
    expect(clock.timeScale).toBe(8);
    expect(MAX_TIME_SCALE).toBe(8);
  });

  it('a 24 h run in 20 ms frames lands exactly on tick 4,320,000', () => {
    const clock = new Clock();
    for (let i = 0; i < 4_320_000; i++) clock.advance(20);
    expect(clock.tick).toBe(4_320_000);
    expect(clock.simT).toBe(86_400);
  });
});
