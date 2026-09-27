import { describe, expect, it } from 'vitest';
import { tickBench } from '../../src/perf/tick-bench.ts';

describe('worker tick cost (Node, same engine code)', () => {
  it('10 s of ticks: p50 well under the 6 ms frame budget', { timeout: 30_000 }, async () => {
    const s = await tickBench(10);
    expect(s.ticks).toBe(500);
    // Local bound 2 ms (idle machine: p50 0.4 ms). On the shared 4-vCPU CI runner the other packages' suites run in
    // parallel with this bench (measured p50 2.67 ms, 2026-09-27), so CI asserts the brief's real budget, the 6 ms frame.
    expect(s.p50).toBeLessThan(process.env.CI ? 6 : 2);
    // No p99 bound here: under `pnpm -r test` the other packages' long tests share the cores and the tail reads
    // 38–75 ms (measured 2026-09-27) while p50 holds. The p99 gate is `perf:ticks` over 600 s (docs/validation/perf).
    expect(Number.isFinite(s.p99)).toBe(true);
  });
});
