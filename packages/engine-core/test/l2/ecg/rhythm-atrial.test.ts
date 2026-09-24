import { describe, expect, it } from 'vitest';
import { K_STRIDE, WAVE } from '../../../src/l2/ecg/kernels.ts';
import { diffs, mean, runRhythm, sd } from '../../helpers/rhythm.ts';
import { lag1 } from '../../helpers/stats.ts';

describe('rhythm engine: AF, flutter, AVNRT', () => {
  it('acceptance 7: afib — RR CV 0.15–0.25, |lag-1 autocorrelation| < 0.1, no P kernels', () => {
    const { st, beats, atrial } = runRhythm('afib', 600, { seed: 3 });
    const rr = diffs(beats.map((b) => b.t));
    const cv = sd(rr) / mean(rr);
    expect(cv).toBeGreaterThanOrEqual(0.15);
    expect(cv).toBeLessThanOrEqual(0.25);
    expect(Math.abs(lag1(rr))).toBeLessThan(0.1);
    const pKernels = st.events.flatMap((e) => e.k.filter((v, i) => i % K_STRIDE === 6 && v === WAVE.P));
    expect(pKernels).toHaveLength(0);
    expect(atrial.every((a) => a.kind === 'fib')).toBe(true);
    expect(st.fwave).not.toBeNull();
  });

  it('afib mean ventricular rate follows the hr target within ±10% (60–150 bpm)', () => {
    for (const hr of [60, 100, 150]) {
      const { beats } = runRhythm('afib', 600, { hr, seed: 11 });
      const got = 60 / mean(diffs(beats.map((b) => b.t)));
      expect(Math.abs(got - hr) / hr).toBeLessThan(0.1);
    }
  });

  it('afib beats carry k_rhythm 0.8 × f_fill(RR) and short RRs lose ejection (brief §4.8)', () => {
    const { beats } = runRhythm('afib', 300, { hr: 130, seed: 2 });
    const ks = beats.map((b) => b.mech.kSV);
    expect(Math.max(...ks)).toBeLessThanOrEqual(0.9);
    expect(Math.min(...ks)).toBeLessThan(0.6);
  });

  it('aflutter: atrial 300/min; 2:1 → 150, 4:1 → 75; variable mixes both', () => {
    const two = runRhythm('aflutter', 60, { rhythmOpts: { ratio: 2 } });
    expect(60 / mean(diffs(two.atrial.map((a) => a.t)))).toBeCloseTo(300, 6);
    expect(60 / mean(diffs(two.beats.map((b) => b.t)))).toBeCloseTo(150, 1);
    const four = runRhythm('aflutter', 60, { rhythmOpts: { ratio: 4 } });
    expect(60 / mean(diffs(four.beats.map((b) => b.t)))).toBeCloseTo(75, 1);
    const v = runRhythm('aflutter', 120, { rhythmOpts: { ratio: 'variable' }, seed: 5 });
    const rr = diffs(v.beats.map((b) => b.t)).map((x) => Math.round(x * 10) / 10);
    expect(new Set(rr)).toEqual(new Set([0.4, 0.8]));
    expect(v.atrial.every((a) => a.kind === 'flutter')).toBe(true);
  });

  it('svtAvnrt: regular narrow junctional rhythm at 180 with a retrograde P', () => {
    const { st, beats, atrial } = runRhythm('svtAvnrt', 30);
    const rr = diffs(beats.map((b) => b.t));
    expect(60 / mean(rr)).toBeCloseTo(180, 0);
    expect(sd(rr)).toBeLessThan(0.005);
    expect(beats.every((b) => b.origin === 'junctional' && b.qrsMs < 120)).toBe(true);
    expect(atrial.every((a) => a.kind === 'retrograde')).toBe(true);
    const retro = st.events.flatMap((e) => e.k.filter((v, i) => i % K_STRIDE === 6 && v === WAVE.RETRO_P));
    expect(retro.length).toBeGreaterThan(0);
  });

  it('vtMono: 170/min wide complexes (QRS 140–200 ms) with dissociated P waves', () => {
    const { beats, atrial } = runRhythm('vtMono', 30);
    expect(60 / mean(diffs(beats.map((b) => b.t)))).toBeCloseTo(170, -1);
    expect(beats.every((b) => b.origin === 'ventricular' && b.qrsMs >= 140 && b.qrsMs <= 200)).toBe(true);
    expect(atrial.length).toBeGreaterThan(30); // sinus P waves march through
    expect(beats.every((b) => b.mech.kSV > 0.3 && b.mech.kSV < 0.6)).toBe(true);
  });
});
