// Stage 7d soak. CI rule: the long-run horizon is test/helpers/longrun.ts (24 h locally, 6 h on the 2-vCPU CI runner).
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { advanceOrgans, type OrgansCtx, type OrgansState } from '../../src/l2/organs/pipeline.ts';
import { expectedIndex, LONGRUN_HOURS, LONGRUN_S } from '../helpers/longrun.ts';
import { organsRig } from '../helpers/organs.ts';

async function hashRun(seed: number): Promise<string> {
  const r = organsRig({ seed, patient: { weightKg: 70, conditions: [{ id: 'tbi', severity: 1 }] } });
  r.send({ type: 'attachSensor', sensor: 'icp', state: 'on' });
  r.send({ type: 'applyEvent', event: { kind: 'brain', massRateMlPerMin: 0.5 } });
  await r.run(300);
  const n = r.e.latestSampleIndex('icp');
  const buf = new Float32Array(125 * 60);
  r.e.readSamples('icp', n - buf.length + 1, buf);
  return createHash('sha256').update(Buffer.from(buf.buffer)).update(JSON.stringify(r.last())).digest('hex');
}

describe('Stage 7d soak', () => {
  it('determinism: same seed → identical icp samples and organ state; another seed differs', { timeout: 300_000 }, async () => {
    expect(await hashRun(11)).toBe(await hashRun(11));
    expect(await hashRun(11)).not.toBe(await hashRun(12));
  });
  it(`${LONGRUN_HOURS} h at rest: no drift of the means (ICP ±0.1, hourly UOP ±2 %, lactate ±0.02); latestSampleIndex(icp) = 125 × t + 12 (24 h locally, 6 h on CI)`, { timeout: 1_800_000 }, async () => {
    const r = organsRig({ seed: 1, patient: { weightKg: 70 } });
    r.send({ type: 'attachSensor', sensor: 'icp', state: 'on' });
    // settle first: 7a's CO rises 5.6 → 6.4 L/min over the first hour, so the fallback lactate pool (τ ≈ 40 min) and the
    // neurohumoral factor (washout τ 45 min) move until ≈ 2 h (prototype: lactate 0.99 → 0.91, UOP 1.02 → 1.05)
    const snap = () => {
      const w = r.organs.slice(-60); // drift is judged on means: one sample moves UOP ≈ 2 %/mmHg of MAP noise
      const m = (f: (o: (typeof w)[number]) => number) => w.reduce((x, o) => x + f(o), 0) / w.length;
      return { icp: m((o) => o.brain.icp), uop: r.last().kidney.uop1hMlKgH, lactate: m((o) => o.liver.lactate) };
    };
    await r.run(7200);
    const a = snap();
    await r.run(LONGRUN_S - 7200 - 0.02); // the send() above stepped one tick
    const b = snap();
    console.log({ a, b }); // gate-note numbers
    expect(Math.abs(b.icp - a.icp)).toBeLessThan(0.1);
    expect(Math.abs(b.uop / a.uop - 1)).toBeLessThan(0.02);
    expect(Math.abs(b.lactate - a.lactate)).toBeLessThan(0.02);
    expect(r.e.latestSampleIndex('icp')).toBe(expectedIndex(125, 12)); // the 100 ms look-ahead at 125 Hz, as abp
  });
  it('CPU: the organ pipeline alone costs ≤ 0.05 ms per 20 ms tick', { timeout: 300_000 }, async () => {
    const r = organsRig({ seed: 1, patient: { weightKg: 70 } });
    r.send({ type: 'attachSensor', sensor: 'icp', state: 'on' });
    await r.run(60);
    const st = (r.e as unknown as { st: OrgansCtx & { organs: OrgansState; hr: unknown } }).st;
    const os = structuredClone(st.organs);
    const ctx: OrgansCtx = { l1: st.l1, hemo: st.hemo, resp: st.resp, rhythm: st.rhythm, hrNow: () => 75, setHr: () => {} };
    let m = os.m;
    const ticks = 30_000;
    const t0 = performance.now();
    for (let i = 0; i < ticks; i++) {
      m += 2.5;
      advanceOrgans(os, ctx, Math.floor(m), () => {});
    }
    const per = (performance.now() - t0) / ticks;
    console.log({ organsPerTickMs: per });
    expect(per).toBeLessThanOrEqual(0.05);
  });
});
