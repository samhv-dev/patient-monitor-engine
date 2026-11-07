// FX-11b (classroom): the host's sim clock is an estimate (the last engine event's time run forward on the wall clock,
// capped at 1.5 s × the speed). During a worker stall it runs ahead and snaps back when the next event arrives. Both
// runners took the step back as their new "last time" and counted the same span again when the clock came forward:
// every stall added up to 1.5 s × speed to the time in state (12 s at ×8). A runner's clock now never goes back.
import { describe, expect, it } from 'vitest';
import { ScenarioRunner } from '../../src/scenario/runner.ts';
import { PhaseRunner } from '../../src/scenario/phase-runner.ts';
import { doc } from './fixtures.ts';
import { minimalV2 } from './fixtures-v2.ts';
import type { ScenarioDocV2 } from '../../src/scenario/types-v2.ts';

/** The clock a stalled host gives: forward to 10 s, an overshoot to 21.5 s (×8 for 1.5 s), back to 10.2 s, then on. */
const STALL = [10, 21.5, 10.2, 15, 21.5, 30];

describe('FX-11b: a step back of the sim clock is not counted twice', () => {
  it('pme-scenario/1: the time in state is the clock’s high-water span', () => {
    const r = new ScenarioRunner(doc([{ when: { manual: { label: 'Go' } } }]));
    r.start(0);
    for (const t of STALL) r.advance(t);
    expect(r.stateT).toBeCloseTo(30, 9);
    expect(r.scenarioT).toBeCloseTo(30, 9);
  });

  it('pme-scenario/2: the phase clock likewise', () => {
    const r = new PhaseRunner(minimalV2() as ScenarioDocV2);
    r.start(0);
    for (const t of STALL) r.advance(t);
    expect(r.scenarioT).toBeCloseTo(30, 9);
  });
});
