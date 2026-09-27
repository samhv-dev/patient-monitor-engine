// Task 23: CPU budget, determinism and 24 h no-drift with the blood in the engine.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { advanceBlood, createBloodState } from '../../src/l2/blood/pipeline.ts';
import { evB, labsAt, rigB, runTo, st } from '../helpers/blood.ts';

describe('7c budget, determinism, 24 h', { timeout: 300_000 }, () => {
  it('the blood step costs ≤ 0.1 ms per 20 ms tick', () => {
    const { e } = rigB();
    e.advanceTo(10);
    const s = st(e);
    const bs = createBloodState({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175 });
    const hemo = {};
    const t0 = performance.now();
    advanceBlood(bs, { resp: s.resp, hemo, l1: s.l1 as never }, 3600);
    const perTick = (performance.now() - t0) / (3600 * 50);
    console.log(`blood CPU per tick ${perTick.toFixed(5)} ms`);
    expect(perTick).toBeLessThan(0.1);
  });
  it('same seed + script → identical labs stream; the chemistry hash is stable', async () => {
    const run = async () => {
      const { e, ev } = rigB({ seed: 3 });
      await runTo(e, 60);
      e.dispatch(evB({ kind: 'bleed', volumeMl: 1000, overS: 300 }));
      e.dispatch(evB({ kind: 'drug', drugId: 'sodiumBicarbonate', dose: 50, unit: 'mmol', route: 'iv' }));
      await runTo(e, 600);
      return createHash('sha256').update(JSON.stringify(ev.filter((x) => x.type === 'labs'))).digest('hex');
    };
    expect(await run()).toBe(await run());
  });
  it('24 h at rest (blood stepped against a steady Stage 3 state, yielding hourly): no drift after settling', async () => {
    const { e } = rigB();
    await runTo(e, 600);
    const s = st(e);
    const bs = createBloodState({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175 });
    advanceBlood(bs, { resp: s.resp, hemo: {}, l1: s.l1 as never }, 600 + 3 * 3600); // settle to THIS PaCO2 (K shift τ 43 min)
    const a = { ...bs.core.out, ph: bs.core.ab.ph, hco3: bs.core.ab.hco3 };
    for (let h = 4; h <= 24; h++) {
      advanceBlood(bs, { resp: s.resp, hemo: {}, l1: s.l1 as never }, 600 + h * 3600);
      await new Promise((r) => setImmediate(r));
    }
    const b = bs.core;
    expect(Math.abs(b.ab.ph - a.ph)).toBeLessThanOrEqual(0.005);
    expect(Math.abs(b.ab.hco3 - a.hco3)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(b.out.k - a.k)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(b.out.na - a.na)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(b.out.lactate - a.lactate)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(b.out.hb - a.hb)).toBeLessThanOrEqual(0.02);
    expect(bs.k).toBe(Math.floor((600 + 24 * 3600) * 10) + 1);
  });
});
