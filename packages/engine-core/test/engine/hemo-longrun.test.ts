import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
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

  it('no drift at 125 Hz: after advanceTo(86400) latestSampleIndex(abp) = latestSampleIndex(pleth) = 10,800,000 + 12', { timeout: 300_000 }, async () => {
    const e = createEngine({ seed: 11, patient: { sensors: { abp: 'connected' } } });
    // Same pattern as the ECG 24 h test on main: one sim-hour at a time, yielding between chunks, so the
    // ≈ 65 s run does not starve the Vitest worker's RPC on a 2-vCPU CI runner ("Timeout calling onTaskUpdate").
    for (let h = 1; h <= 24; h++) {
      e.advanceTo(h * 3_600);
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    expect(e.latestSampleIndex('abp')).toBe(10_800_000 + 12);
    expect(e.latestSampleIndex('pleth')).toBe(10_800_000 + 12);
    expect(e.latestSampleIndex('ecgII')).toBe(43_200_000 + 50);
  });
});
