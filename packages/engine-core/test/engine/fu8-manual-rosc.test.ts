// FU-8 Task A27 (research/20 DV-M3, gap V12): the MANUAL post-ROSC pressure ramp is visible. MANUAL, 40 y 70 kg, VF from
// 30 s, 200 J at 98 s; seed 27, where the shock-outcome table gives ROSC (the device layer then commands SBP/DBP to 50 %
// of their targets, ramping back over 30–120 s — brief §6.5; here 110 s). Before FU-8: SBP 0.58 of baseline 5 s after
// the first ejecting beat and 1.04 at 10 s (research/20: 90 % at 10 s) — the ramp never existed: the device layer's
// "set 50 %" and "ramp to 100 %" land at the same instant and `rampValue` returned a zero-duration step's `from` at its
// own t0, so the ramp ran 120 → 120.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { l1Target } from '../../src/l1/state.ts';

type Beat = { t: number; sbp: number; sv: number };
async function manualRosc(seed: number): Promise<{ base: number; first: number; at: (d: number) => { sbp: number; target: number } }> {
  const e = createEngine({ seed, mode: 'manual', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected' } } as never });
  let n = 0;
  const c = (b: Record<string, unknown>) => e.dispatch({ id: `k${++n}`, issuedBy: 'test', ...b } as never);
  const st = () => (e as unknown as { st: { rhythm: { id: string; opts: { pulseless?: boolean } }; l1: never; hemo: { circ: { beats: Beat[] } } } }).st;
  e.advanceTo(30);
  const base = st().hemo.circ.beats.slice(-5).reduce((a, b) => a + b.sbp, 0) / 5;
  c({ type: 'setRhythm', rhythm: 'vfCoarse' });
  e.advanceTo(90);
  c({ type: 'applyEvent', event: { kind: 'defib', action: 'selectEnergy', energyJ: 200 } });
  c({ type: 'applyEvent', event: { kind: 'defib', action: 'charge' } });
  e.advanceTo(98);
  c({ type: 'applyEvent', event: { kind: 'defib', action: 'shock' } });
  let first = -1;
  const rows = new Map<number, { sbp: number; target: number }>();
  for (let t = 98.5; t <= 330; t += 0.5) {
    e.advanceTo(t);
    const s = st();
    if (first < 0 && s.rhythm.id === 'sinus' && s.rhythm.opts.pulseless !== true && s.hemo.circ.beats.some((b) => b.t > 99 && b.sv > 5)) first = t;
    if (first > 0) {
      const bs = s.hemo.circ.beats.filter((b) => b.t > t - 3 && b.t > first - 0.1);
      if (bs.length) rows.set(Math.round((t - first) * 2) / 2, { sbp: bs.reduce((a, b) => a + b.sbp, 0) / bs.length, target: l1Target(s.l1, 'sbp', t) });
    }
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  return { base, first, at: (d) => rows.get(d) ?? { sbp: Number.NaN, target: Number.NaN } };
}

describe('FU-8 A27: the MANUAL post-ROSC pressure ramp (research/20 DV-M3)', () => {
  it('table ROSC (seed 27): SBP 0.4–0.8 of baseline 10 s after the first ejecting beat, rising with the ramp, and within 2 mmHg of the target at its end (before FU-8: 1.04 at 10 s — no ramp)', async () => {
    const r = await manualRosc(27);
    const f = (d: number) => r.at(d).sbp / r.base;
    console.log(`fu8 A27: ROSC beat at ${r.first.toFixed(1)} s; SBP/baseline +5 ${f(5).toFixed(2)}, +10 ${f(10).toFixed(2)}, +30 ${f(30).toFixed(2)}, +60 ${f(60).toFixed(2)}, +120 ${f(120).toFixed(2)}; target/baseline +10 ${(r.at(10).target / r.base).toFixed(2)}, +120 ${(r.at(120).target / r.base).toFixed(2)}`);
    expect(r.first).toBeGreaterThan(0);
    expect(f(10)).toBeGreaterThanOrEqual(0.4);
    expect(f(10)).toBeLessThanOrEqual(0.8);
    expect(f(60)).toBeGreaterThan(f(10));
    expect(Math.abs(r.at(180).sbp - r.at(180).target)).toBeLessThanOrEqual(2);
  }, 120_000);
});
