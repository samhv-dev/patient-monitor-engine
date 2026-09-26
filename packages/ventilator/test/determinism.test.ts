// Same seed + same script → identical ventilator trace and engine samples; another engine seed differs.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createLinkedSim } from '../src/index.ts';
import { run } from './helpers.ts';

async function hashRun(seed: number): Promise<string> {
  const s = createLinkedSim({ profile: 'ards-moderate', seed, vent: { vt: 420, pmax: 45 } });
  const h = createHash('sha256');
  const tick = () => h.update(Float64Array.of(s.vs.p.Paw, s.vs.p.Q, s.vs.p.V));
  for (let k = 1; k <= 3000; k++) {
    if (k === 1500) s.set({ peep: 12, fio2: 80 });
    s.advanceTo(k * 0.02);
    tick();
  }
  await run(s, 60);
  for (const ch of ['co2', 'abp', 'pleth'] as const) {
    const n = ch === 'co2' ? 60 * 62.5 : 60 * 125;
    const x = new Float32Array(n);
    s.engine.readSamples(ch, 0, x);
    h.update(x);
  }
  return h.digest('hex');
}

describe('linked determinism', { timeout: 120_000 }, () => {
  it('two runs with seed 42 hash identically; seed 43 differs', async () => {
    const a = await hashRun(42);
    expect(await hashRun(42)).toBe(a);
    expect(await hashRun(43)).not.toBe(a);
  });
});
