import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createCircModel, RESTING_ENV } from '../../src/l2/circ/model.ts';
import { totalVolume } from '../../src/l2/circ/circuit.ts';
import { driver, runTo, ventEnv } from '../helpers/circ.ts';
import { createEngine } from '../../src/engine.ts';
import { cmd } from '../helpers/hemo.ts';

describe('Stage 7a long runs', () => {
  it('CPU: the circulation (circuit + control) costs ≤ 0.3 ms per 20 ms tick in Node', () => {
    const m = createCircModel();
    const dr = driver(m);
    const env = ventEnv();
    runTo(dr, 10, env);
    const t0 = performance.now();
    runTo(dr, 310, env);
    const perTick = (performance.now() - t0) / (300 / 0.02);
    console.log(`circulation ${perTick.toFixed(4)} ms per tick`);
    expect(perTick).toBeLessThanOrEqual(0.3);
  });
  it('determinism: same seed and command list → identical 60 s ABP/CVP/PAP hash; another seed differs', () => {
    const h = (seed: number) => {
      const e = createEngine({ seed, mode: 'modeled', patient: { sensors: { abp: 'connected', cvp: 'connected', pap: 'connected' } } });
      e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' }, atTick: 500 }));
      e.dispatch(cmd({ type: 'setRhythm', rhythm: 'afib', atTick: 2000 }));
      e.advanceTo(60);
      const hash = createHash('sha256');
      for (const ch of ['abp', 'cvp', 'pap'] as const) {
        const out = new Float32Array(60 * 125);
        e.readSamples(ch, 1, out);
        hash.update(Buffer.from(out.buffer));
      }
      return hash.digest('hex');
    };
    const a = h(42);
    console.log(`hash seed 42 ${a}`);
    expect(h(42)).toBe(a);
    expect(h(43)).not.toBe(a);
  }, 120_000);
  it('24 h on the bare model: blood volume drifts < 0.1 mL and pressures stay finite (yielding per sim-minute)', async () => {
    const m = createCircModel();
    const dr = driver(m);
    const v0 = totalVolume(m.s, m.p);
    for (let t = 60; t <= 86_400; t += 60) {
      runTo(dr, t, { ...RESTING_ENV });
      if (t % 600 === 0) await new Promise((r) => setImmediate(r));
    }
    expect(Math.abs(totalVolume(m.s, m.p) - v0)).toBeLessThan(0.1);
    for (const x of m.s) expect(Number.isFinite(x)).toBe(true);
  }, 600_000);
});
