import { describe, expect, it } from 'vitest';
import { tickBench } from '../../src/perf/tick-bench.ts';

describe('worker tick cost (Node, same engine code)', () => {
  it('10 s of ticks: p50 well under the 6 ms frame budget', { timeout: 30_000 }, async () => {
    const s = await tickBench(10);
    expect(s.ticks).toBe(500);
    expect(s.p50).toBeLessThan(2);
    expect(s.p99).toBeLessThan(20); // loose here (CI noise); the gate reads perf:ticks over 600 s
  });
});
