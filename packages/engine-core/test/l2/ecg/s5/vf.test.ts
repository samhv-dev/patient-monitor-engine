import { describe, expect, it } from 'vitest';
import { dominantHz, rms } from '../../../../src/util/dsp.ts';
import { samples5 } from '../../../helpers/s5.ts';

const fExpected = (tMin: number) => 5.5 - 2.25 * (1 - Math.exp(-tMin / 8)); // Stage 5.1 (R39 item 3): 3.9 Hz at 10 min
const W = 20; // analysis window, s
const win = (x: Float64Array, t0: number) => x.subarray(t0 * 500, (t0 + W) * 500);
/** Remove < ~1 Hz content (respiratory wander) with a centred 0.5 s moving average before measuring amplitude. */
function hp(x: Float64Array): Float64Array {
  const h = 125;
  const out = new Float64Array(x.length);
  let acc = 0;
  for (let i = 0; i < Math.min(x.length, 2 * h + 1); i++) acc += x[i]!;
  for (let i = 0; i < x.length; i++) {
    if (i > h && i + h < x.length) acc += x[i + h]! - x[i - h - 1]!;
    out[i] = x[i]! - acc / (2 * h + 1);
  }
  return out;
}
const ampMv = (x: Float64Array, t0: number) => 2 * Math.SQRT2 * rms(hp(win(x, t0)));

/** Least-squares slope of ln(A) against t → τ (s). */
function tauFit(x: Float64Array, fromS: number, toS: number): number {
  const ts: number[] = [];
  const ys: number[] = [];
  for (let t = fromS; t + W <= toS; t += 30) {
    ts.push(t + W / 2);
    ys.push(Math.log(ampMv(x, t)));
  }
  const mt = ts.reduce((a, b) => a + b, 0) / ts.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0, den = 0;
  ts.forEach((t, i) => { num += (t - mt) * (ys[i]! - my); den += (t - mt) ** 2; });
  return -1 / (num / den);
}

describe('VF hybrid generator (acceptance 2)', () => {
  const quiet = { artefact: { noise: 0 } };

  it('dominant frequency 4–6 Hz at onset and follows f_dom(t) within ±0.5 Hz at 4 and 10 min', () => {
    const r = samples5('vfCoarse', 10 * 60 + W + 1, ['ecgII'], { mods: quiet, rhythmOpts: { autoAsystole: false } });
    const x = r.lead.ecgII!;
    const f0 = dominantHz(win(x, 0), 500);
    expect(f0).toBeGreaterThanOrEqual(4);
    expect(f0).toBeLessThanOrEqual(6);
    for (const tMin of [4, 10]) expect(Math.abs(dominantHz(win(x, tMin * 60), 500) - fExpected(tMin + W / 120))).toBeLessThanOrEqual(0.5);
    expect(r.records.find((e) => e.type === 'rhythmSegment')).toMatchObject({ rhythm: 'vfCoarse', t: 0 });
  });

  it('amplitude decays with τ = 7 min ± 20% without CPR and ≥ 15 min with CPR; coarse→fine at 0.2 mV', () => {
    // Stage 5.1 (R39: A0 1.2 mV): the coarse→fine switch moves to ≈ 753 s, so the run covers 13 min
    const r = samples5('vfCoarse', 13 * 60, ['ecgII'], { mods: quiet, rhythmOpts: { autoAsystole: false } });
    const tau = tauFit(r.lead.ecgII!, 0, 10 * 60 + W);
    expect(tau / 420).toBeGreaterThan(0.8);
    expect(tau / 420).toBeLessThan(1.2);
    expect(ampMv(r.lead.ecgII!, 0)).toBeGreaterThan(1.0); // Stage 5.1 (R39 item 3): onset 1.2 mV
    expect(ampMv(r.lead.ecgII!, 0)).toBeLessThan(1.4);
    const fine = r.records.find((e): e is Extract<typeof e, { type: 'rhythmSegment' }> => e.type === 'rhythmSegment' && e.rhythm === 'vfFine')!;
    expect(fine.t).toBeCloseTo(420 * Math.log(1.2 / 0.2), -1); // Stage 5.1 (R39: A0 1.2 mV): 753 s ± 5 s
    const c = samples5('vfCoarse', 10 * 60 + W, ['ecgII'], { mods: { artefact: { noise: 0, cpr: { rateCpm: 110, depth: 0 } } }, rhythmOpts: { autoAsystole: false } });
    const tauCpr = tauFit(c.lead.ecgII!, 60, 10 * 60 + W);
    expect(tauCpr).toBeGreaterThan(15 * 60 * 0.8);
  });

  it('epinephrine: +20–40% amplitude and ≈ +0.5 Hz at the peak of the bump (90 s after the dose), mean of 6 seeds', { timeout: 300_000 }, async () => {
    // Stage 5.1: per-cycle frequency jitter makes one 20 s window's spectral peak a noisy estimator (±0.5 Hz), so
    // the effect is measured as the mean over six seeds.
    const ratios: number[] = [];
    const dfs: number[] = [];
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const base = samples5('vfCoarse', 240, ['ecgII'], { mods: quiet, rhythmOpts: { autoAsystole: false }, seed });
      const epi = samples5('vfCoarse', 240, ['ecgII'], { mods: { ...quiet, epinephrineAtS: 120 }, rhythmOpts: { autoAsystole: false }, seed });
      const t0 = 200; // window 200–220 s straddles the peak at 210 s
      ratios.push(ampMv(epi.lead.ecgII!, t0) / ampMv(base.lead.ecgII!, t0));
      dfs.push(dominantHz(win(epi.lead.ecgII!, t0), 500) - dominantHz(win(base.lead.ecgII!, t0), 500));
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    const m = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
    expect(m(ratios)).toBeGreaterThan(1.15);
    expect(m(ratios)).toBeLessThan(1.45);
    expect(m(dfs)).toBeGreaterThan(0.2);
    expect(m(dfs)).toBeLessThan(0.8);
  });

  it('VF → asystole: forced when A < 0.05 mV (vfFine from 0.15 mV reaches it at ≈ 7.7 min)', () => {
    const r = samples5('vfFine', 9 * 60, ['ecgII'], { mods: quiet });
    const segs = r.records.filter((e): e is Extract<typeof e, { type: 'rhythmSegment' }> => e.type === 'rhythmSegment');
    const asy = segs.find((e) => e.rhythm === 'asystole')!;
    expect(asy).toBeDefined();
    expect(asy.t).toBeLessThanOrEqual(420 * Math.log(0.15 / 0.05) + 1);
    expect(r.st.id).toBe('asystole');
    const after = r.lead.ecgII!.subarray(Math.round((asy.t + 1) * 500));
    const d = after.slice(1).map((v, i) => v - after[i]!);
    expect(rms(d)).toBeLessThan(1e-3); // only the slow respiratory wander is left
  });

});
