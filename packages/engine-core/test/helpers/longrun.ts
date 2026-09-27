// Long-run horizon for the engine-level no-drift tests. The design horizon is 24 sim-h and every local gate run
// uses it. On the 2-vCPU CI runner the three full-engine 24 h runs exceed the 600 s budget since Stage 7a (the
// four-chamber circulation costs +40–60 % CPU per tick), so CI runs 6 sim-h of the same integer-index assertion.
export const LONGRUN_HOURS = process.env.CI ? 6 : 24;
export const LONGRUN_S = LONGRUN_HOURS * 3_600;
/** Expected latest sample index of a channel at LONGRUN_S for a given rate and its start offset. */
export const expectedIndex = (rate: number, offset: number): number => Math.round(rate * LONGRUN_S) + offset;
