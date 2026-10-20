import { describe, expect, it } from 'vitest';
import { tickBench } from '../../src/perf/tick-bench.ts';

describe('worker tick cost (Node, same engine code)', () => {
  it('10 s of ticks: p50 well under the 6 ms frame budget', { timeout: 60_000 }, async () => {
    // Run it: `pnpm --filter @pme/validation test` (unset PME_TEST_SET runs it with the rest, as before), or alone with
    // `PME_TEST_SET=perf pnpm --filter @pme/validation exec vitest run`. Local bound 2 ms on one sample (idle machine:
    // p50 0.4–0.7 ms). CI asserts the brief's real budget, the 6 ms frame, on the BEST of three 10-s samples, and runs
    // this file in its own step after `pnpm test` (vite.config.ts: PME_TEST_SET=fast leaves it out, =perf runs only it).
    // Why: inside `pnpm -r test` the other packages' suites share the 4-vCPU runner (p50 2.67 ms, 2026-09-27) and that
    // load grew with the suites until the bench failed from load alone, engine unchanged: p50 6.56, 7.74 and 8.42 ms on
    // 2026-10-20, then 7.26 and 7.20 ms on a main run and its re-run (56b0746e). Best-of-three alone did not help, since
    // the load lasts the whole job; on an idle runner it absorbs a stray burst. A real engine slowdown raises every
    // sample, so the minimum still fails it.
    const samples = [];
    for (let i = 0; i < (process.env.CI ? 3 : 1); i++) samples.push(await tickBench(10));
    for (const s of samples) {
      expect(s.ticks).toBe(500);
      // No p99 bound here: under `pnpm -r test` the other packages' long tests share the cores and the tail reads
      // 38–75 ms (measured 2026-09-27) while p50 holds. The p99 gate is `perf:ticks` over 600 s (docs/validation/perf).
      expect(Number.isFinite(s.p99)).toBe(true);
    }
    expect(Math.min(...samples.map((s) => s.p50))).toBeLessThan(process.env.CI ? 6 : 2);
  });
});
