// Stage 3 determinism (brief §3.3: same seed + commands → same samples) and 62.5 Hz no-drift over 24 h.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { Command } from '../../src/types.ts';
import { cmd, ev3, run } from '../helpers/resp.ts';

describe('Stage 3 determinism and drift', () => {
  it('same seed + same commands → identical SHA-256 over 60 s of co2, resp, pleth and abp; another seed differs', () => {
    const script: Array<[number, Command]> = [
      [5, ev3({ kind: 'preoxygenate', fio2: 1, durationS: 20 })],
      [15, ev3({ kind: 'ventilation', source: 'ventilator', rr: 14, vtMl: 550, fio2: 0.6, peep: 8 })],
      [25, ev3({ kind: 'airway', state: 'bronchospasm', severity: 0.7 })],
      [35, ev3({ kind: 'airway', state: 'disconnected' })],
      [45, ev3({ kind: 'airway', state: 'patent' })],
      [50, cmd({ type: 'setTarget', variable: 'spo2', value: 92, ramp: { durationS: 5 } })],
    ];
    const hashRun = (seed: number) => {
      const e = createEngine({ seed, patient: { sensors: { co2: 'on', abp: 'connected' } } });
      const h = createHash('sha256');
      const from = { co2: 0, resp: 0, pleth: 0, abp: 0 };
      for (let t = 0.5; t <= 60 + 1e-9; t += 0.5) {
        for (const [at, c] of script) if (Math.abs(at - t) < 1e-9) e.dispatch(c);
        e.advanceTo(t); // 60 s in 0.5 s steps: short enough to stay synchronous
        for (const ch of ['co2', 'resp', 'pleth', 'abp'] as const) {
          const to = Math.round(t * (ch === 'co2' || ch === 'resp' ? 62.5 : 125));
          const out = new Float32Array(to - from[ch] + 1);
          expect(e.readSamples(ch, from[ch], out)).toBe(out.length);
          h.update(out);
          from[ch] = to + 1;
        }
      }
      return h.digest('hex');
    };
    expect(hashRun(42)).toBe(hashRun(42));
    expect(hashRun(42)).not.toBe(hashRun(43));
  });

  it('no drift at 62.5 Hz: after advanceTo(86400) latestSampleIndex(co2) = latestSampleIndex(resp) = 5,400,000 + 6', { timeout: 600_000 /* 24 sim-h: ~280 s on the 2-vCPU CI runner before Stage 4b's device layer */ }, async () => {
    const e = createEngine({ seed: 11, patient: { sensors: { co2: 'on' } } });
    // one sim-hour at a time, yielding between chunks (main's CI pattern: a synchronous 24 h run starves the
    // Vitest worker RPC on a 2-vCPU runner)
    for (let h = 1; h <= 24; h++) {
      await run(e, h * 3_600);
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    expect(e.latestSampleIndex('co2')).toBe(5_400_000 + 6);
    expect(e.latestSampleIndex('resp')).toBe(5_400_000 + 6);
    expect(e.latestSampleIndex('ecgII')).toBe(43_200_000 + 50);
  });
});
