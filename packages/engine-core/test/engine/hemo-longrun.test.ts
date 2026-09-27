import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { expectedIndex, LONGRUN_HOURS } from '../helpers/longrun.ts';
import { createEngine } from '../../src/engine.ts';
import type { Command } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';

describe('Stage 2 determinism and drift', () => {
  it('same seed + same commands → identical SHA-256 over 60 s of abp, cvp, pap and pleth; another seed differs', () => {
    const script: Array<[number, Command]> = [
      [5, cmd({ type: 'setTarget', variable: 'sbp', value: 100, ramp: { durationS: 10 } })],
      [12, cmd({ type: 'device', action: { device: 'nibp', action: 'start' } })],
      [20, cmd({ type: 'setRhythm', rhythm: 'afib' })],
      [30, cmd({ type: 'applyEvent', event: { kind: 'line', line: 'abp', action: 'flush' } })],
      [40, cmd({ type: 'setModifiers', modifiers: { pvc: { pattern: 'bigeminy', probability: 0 } } })],
    ];
    const run = (seed: number) => {
      const e = createEngine({ seed, patient: { sensors: { abp: 'connected', cvp: 'connected', pap: 'connected' } } });
      const h = createHash('sha256');
      let from = 0;
      for (let t = 0.5; t <= 60 + 1e-9; t += 0.5) {
        for (const [at, c] of script) if (Math.abs(at - t) < 1e-9) e.dispatch(c);
        e.advanceTo(t);
        const to = Math.round(t * 125);
        for (const ch of ['abp', 'cvp', 'pap', 'pleth'] as const) {
          const out = new Float32Array(to - from + 1);
          expect(e.readSamples(ch, from, out)).toBe(out.length);
          h.update(out);
        }
        from = to + 1;
      }
      return h.digest('hex');
    };
    expect(run(42)).toBe(run(42));
    expect(run(42)).not.toBe(run(43));
  });

  it(`no drift at 125 Hz: after advanceTo(${LONGRUN_HOURS} h) latestSampleIndex(abp) = latestSampleIndex(pleth) = 125 × t + 12 (24 h locally, 6 h on CI)`, { timeout: 600_000 }, async () => {
    const e = createEngine({ seed: 11, patient: { sensors: { abp: 'connected' } } });
    // One sim-minute at a time, yielding between chunks (CI rule), so the run never starves the Vitest worker's
    // RPC on a 2-vCPU CI runner ("Timeout calling onTaskUpdate"). Per sim-hour was not enough: the first hour is a
    // 15.4 s synchronous stretch locally (≈ 60 s on CI) and tripped the 60 s RPC timeout with Stage 7d's organs.
    for (let m = 1; m <= LONGRUN_HOURS * 60; m++) {
      e.advanceTo(m * 60);
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    expect(e.latestSampleIndex('abp')).toBe(expectedIndex(125, 12));
    expect(e.latestSampleIndex('pleth')).toBe(expectedIndex(125, 12));
    expect(e.latestSampleIndex('ecgII')).toBe(expectedIndex(500, 50));
  });
});
