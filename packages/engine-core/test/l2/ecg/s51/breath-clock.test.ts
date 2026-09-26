import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { defaultModifiers, mergeModifiers } from '../../../../src/modifiers.ts';
import { createRngState } from '../../../../src/rng/sfc32.ts';
import { drawHrvPhase } from '../../../../src/l2/ecg/hrv.ts';
import { createRhythmState, planUntil, type RhythmCtx } from '../../../../src/l2/ecg/rhythm-engine.ts';
import { ecgGenInputs, generateEcg } from '../../../../src/l2/ecg/ecg-gen.ts';
import { projectLead } from '../../../../src/l2/ecg/vcg.ts';
import { cycleBreathClock, fixedBreathClock, type BreathClock } from '../../../../src/l2/ecg/breath-clock.ts';
import { dominantHz } from '../../../../src/util/dsp.ts';

function beatsRR(breath?: BreathClock) {
  const rng = createRngState(5);
  const mods = mergeModifiers(defaultModifiers(), { rsa: 1 });
  const hrv = drawHrvPhase(rng.hrv);
  const ctx: RhythmCtx = { hrAt: () => 60, mods, rng, hrv, ...(breath ? { breath } : {}) };
  const st = createRhythmState('sinus', {}, 0, ctx);
  planUntil(st, 300, ctx);
  const t = st.records.filter((r) => r.type === 'beat').map((r) => r.t);
  return { hrv, t: t.slice(1), rr: t.slice(1).map((x, i) => x - t[i]!) };
}
const corr = (a: number[], b: number[]) => {
  const m = (x: number[]) => x.reduce((p, q) => p + q, 0) / x.length;
  const ma = m(a), mb = m(b);
  let n = 0, da = 0, db = 0;
  a.forEach((v, i) => { n += (v - ma) * (b[i]! - mb); da += (v - ma) ** 2; db += (b[i]! - mb) ** 2; });
  return n / Math.sqrt(da * db);
};
/** Breaths every 6 s (10/min), 2 s inspiration. */
const tenPerMin = (t: number) => (t < 0 ? undefined : { seq: Math.floor(t / 6), t0: Math.floor(t / 6) * 6, ti: 2, te: 4 });

describe('Stage 5.1 BreathClock seam (R-S3-3)', () => {
  it('no clock and the explicit fixed clock give identical beats and samples (Stage 1–5 behaviour unchanged)', () => {
    const d = beatsRR();
    expect(beatsRR(fixedBreathClock(d.hrv)).rr).toEqual(d.rr);
    const hash = (withClock: boolean) => {
      const rng = createRngState(9);
      const mods = defaultModifiers();
      const hrv = drawHrvPhase(rng.hrv);
      const breath = withClock ? fixedBreathClock(hrv) : undefined;
      const ctx: RhythmCtx = { hrAt: () => 75, mods, rng, hrv, ...(breath ? { breath } : {}) };
      const st = createRhythmState('sinus', {}, 0, ctx);
      planUntil(st, 10.2, ctx);
      const h = createHash('sha256');
      generateEcg(ecgGenInputs({ rhythm: st, mods, hrv, rng, ...(breath ? { breath } : {}) }, 50), 0, 4999, (_n, x, y, z) => h.update(String(projectLead('ecgII', x, y, z))));
      return h.digest('hex');
    };
    expect(hash(true)).toBe(hash(false));
  });

  it('RSA follows a pluggable breath driver: RR correlates with the driver phase (r > 0.7) and not with the fixed clock (|r| < 0.2)', () => {
    const d = beatsRR();
    const fixed = fixedBreathClock(d.hrv);
    const slow = cycleBreathClock(tenPerMin, fixed);
    const s = beatsRR(slow);
    const phaseAt = (c: BreathClock, x: { t: number[]; rr: number[] }) => x.t.map((t, i) => Math.sin(c.phaseRad(t - x.rr[i]!)));
    expect(corr(s.rr, phaseAt(slow, s))).toBeGreaterThan(0.7);
    expect(Math.abs(corr(s.rr, phaseAt(fixed, s)))).toBeLessThan(0.2);
    expect(corr(d.rr, phaseAt(fixed, d))).toBeGreaterThan(0.7);
  });

  it('baseline wander follows the driver (dominant 1/6 Hz) and stops swinging in apnoea (phase held, rate 0)', () => {
    const rng = createRngState(2);
    const mods = mergeModifiers(defaultModifiers(), { artefact: { noise: 0 } });
    const hrv = drawHrvPhase(rng.hrv);
    const apnoeaAt = 60;
    const breath = cycleBreathClock((t) => (t >= apnoeaAt ? tenPerMin(apnoeaAt - 1) : tenPerMin(t)), fixedBreathClock(hrv));
    const ctx: RhythmCtx = { hrAt: () => 60, mods, rng, hrv, breath };
    const st = createRhythmState('asystole', {}, 0, ctx);
    planUntil(st, 120.2, ctx);
    const x = new Float64Array(60_000);
    generateEcg(ecgGenInputs({ rhythm: st, mods, hrv, rng, breath }, 50), 0, 59_999, (n, a, b, c) => { x[n] = projectLead('ecgII', a, b, c); });
    expect(dominantHz(x.subarray(0, 30_000), 500, 0.05, 1, 8192)).toBeCloseTo(1 / 6, 1);
    const late = x.subarray(35_000, 60_000);
    expect(Math.max(...late) - Math.min(...late)).toBeLessThan(1e-9);
    expect(breath.rateBpm(30)).toBeCloseTo(10, 6);
    expect(breath.rateBpm(90)).toBe(0);
  });
});
