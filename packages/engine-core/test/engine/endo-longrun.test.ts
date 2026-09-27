// Stage 7e: determinism, CPU ≤ 0.05 ms per tick for the 7e work, long-run no-drift (24 h locally, 6 h on CI: the CI
// rule amendment's LONGRUN_HOURS) with per-sim-minute yielding.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createEndoCore, NEUTRAL_ENDO_INPUTS, stepEndoCore } from '../../src/l2/endo/core.ts';
import { createThermal, stepThermal } from '../../src/l2/thermal/heat.ts';
import type { EngineEvent } from '../../src/types.ts';
import { expectedIndex, LONGRUN_HOURS } from '../helpers/longrun.ts';
import { ADULT, ev3, read62, rig3, run, stateSeries } from '../helpers/resp.ts';

describe('Stage 7e long-run', () => {
  it('same seed + script → identical co2 samples and endo events; another seed differs', { timeout: 300_000 }, async () => {
    const go = async (seed: number) => {
      const { e, ev } = rig3({ seed, patient: { ...ADULT, endo: { diabetes: 'type2' } } });
      e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
      e.dispatch(ev3({ kind: 'stimulus', intensity: 1 }));
      e.dispatch(ev3({ kind: 'condition', id: 'sepsis', severity: 0.5, phase: 'warm' }));
      e.dispatch(ev3({ kind: 'drug', drugId: 'dextrose', dose: 10, unit: 'g', route: 'iv' }));
      await run(e, 600);
      const h = createHash('sha256');
      h.update(Buffer.from(read62(e, 'co2', 1, 600).buffer));
      h.update(JSON.stringify(ev.filter((x) => x.type === 'endo')));
      return h.digest('hex');
    };
    expect(await go(11)).toBe(await go(11));
    expect(await go(11)).not.toBe(await go(12));
  });

  it('CPU: one heat step + one endocrine step per simulated second cost ≤ 0.05 ms per 20 ms tick (≤ 2.5 ms per step pair)', () => {
    const th = createThermal(36.8, 70);
    th.anaesthesia = 'general';
    const c = createEndoCore();
    const t0 = performance.now();
    for (let s = 1; s <= 3600; s++) {
      stepThermal(th, s, 1);
      stepEndoCore(c, NEUTRAL_ENDO_INPUTS, 1);
    }
    const perStepPair = (performance.now() - t0) / 3600; // ms
    console.log(`7e CPU: ${(1000 * perStepPair).toFixed(1)} µs per simulated second = ${((1000 * perStepPair) / 50).toFixed(2)} µs per tick`);
    expect(perStepPair / 50).toBeLessThanOrEqual(0.05); // 50 ticks per simulated second
  });

  it(`${LONGRUN_HOURS} h at rest (awake, 21 °C): latestSampleIndex(co2) = 62.5 × t + 6; tempCore, glucose and the stress index do not drift (24 h locally, 6 h on CI)`, { timeout: 1_800_000 }, async () => {
    const { e, ev } = rig3({ patient: ADULT });
    for (let h = 1; h <= LONGRUN_HOURS; h++) await run(e, h * 3600); // run() yields once per simulated minute
    expect(e.latestSampleIndex('co2')).toBe(expectedIndex(62.5, 6));
    const tc = stateSeries(ev, 'tempCore');
    expect(Math.abs(tc[tc.length - 1]![1] - 36.8)).toBeLessThan(0.02);
    const endo = ev.filter((x): x is Extract<EngineEvent, { type: 'endo' }> => x.type === 'endo');
    expect(endo[endo.length - 1]!.t).toBe(LONGRUN_HOURS * 3600);
    expect(Math.abs(endo[endo.length - 1]!.glucoseMgDl - 100)).toBeLessThanOrEqual(1);
    expect(endo[endo.length - 1]!.stressIndex).toBe(0);
  });
});
