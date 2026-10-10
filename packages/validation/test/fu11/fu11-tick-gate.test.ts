// FU-11 Task J5 (external review F10): validation cannot certify an invalid result as green.
import { describe, expect, it } from 'vitest';
import { overBudget } from '../../src/perf/tick-bench.ts';

describe('FU-11 J5: the tick p99 gate (F10)', () => {
  it('passes at or under the budget, fails above it or on a non-number, is off without a budget', () => {
    expect(overBudget({ p99: 1.9 }, 2)).toBeNull();
    expect(overBudget({ p99: 2 }, 2)).toBeNull();
    expect(overBudget({ p99: 2.01 }, 2)).toMatch(/over the 2 ms budget/);
    expect(overBudget({ p99: Number.NaN }, 2)).toMatch(/NaN/);
    expect(overBudget({ p99: 99 }, null)).toBeNull();
  });
});
