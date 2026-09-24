import { describe, expect, it } from 'vitest';
import { fwaveAt } from '../../../src/l2/ecg/generator.ts';
import { K_STRIDE, WAVE } from '../../../src/l2/ecg/kernels.ts';
import { projectLead } from '../../../src/l2/ecg/vcg.ts';
import { applyRhythm } from '../../../src/l2/ecg/rhythm-engine.ts';
import { defaultModifiers } from '../../../src/modifiers.ts';
import { createRngState } from '../../../src/rng/sfc32.ts';
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
    expect(st.fwaves.length).toBeGreaterThan(0);
  });

  it('afib mean ventricular rate follows the hr target within ±5% across the whole 40–180 range (review M1)', () => {
    for (const hr of [40, 50, 60, 80, 100, 120, 150, 180]) {
      const { beats } = runRhythm('afib', 600, { hr, seed: 21 }); // not a calibration seed (11–13)
      const got = 60 / mean(diffs(beats.map((b) => b.t)));
      expect(Math.abs(got - hr) / hr, `target ${hr}, got ${got.toFixed(1)}`).toBeLessThan(0.05);
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

  it('ruling R18: flutter F waves in II are a continuous sawtooth (slow fall, fast return, no isoelectric segment), 0.25–0.32 mV p-p', () => {
    const { st, atrial } = runRhythm('aflutter', 12, { rhythmOpts: { ratio: 4 } });
    const cycle = 0.2; // 300/min
    const acc = new Float64Array(3);
    const lead = (lid: 'ecgII' | 'ecgIII' | 'aVF', t: number) => {
      acc.fill(0);
      for (const fw of st.fwaves) fwaveAt(fw, t, acc);
      return projectLead(lid, acc[0]!, acc[1]!, acc[2]!);
    };
    const fs = 2000;
    const t0 = atrial[20]!.t;
    const ii = Array.from({ length: 10 * cycle * fs }, (_, i) => lead('ecgII', t0 + i / fs));
    const pp = Math.max(...ii) - Math.min(...ii);
    expect(pp).toBeGreaterThanOrEqual(0.25);
    expect(pp).toBeLessThanOrEqual(0.32);
    expect(Math.abs(ii.reduce((a, b) => a + b, 0) / ii.length)).toBeLessThan(0.005); // zero mean
    // No isoelectric segment: the trace is never flat (|slope| < 1 mV/s) for 10% of a cycle (Stage 1: 59 ms flat).
    let run = 0;
    let longest = 0;
    for (let i = 1; i < ii.length; i++) {
      run = Math.abs(ii[i]! - ii[i - 1]!) * fs < 1 ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
    expect(longest / fs).toBeLessThan(0.1 * cycle);
    // Slow ramp down, fast return: in each cycle the fall (max → min) lasts ≥ 1.7× the rise (Stage 1: 1.47).
    for (let c = 1; c < 9; c++) {
      const seg = ii.slice(c * cycle * fs, (c + 1) * cycle * fs);
      const iMax = seg.indexOf(Math.max(...seg));
      const iMin = seg.indexOf(Math.min(...seg));
      const fall = (iMin - iMax + seg.length) % seg.length;
      const rise = seg.length - fall;
      expect(fall / rise).toBeGreaterThanOrEqual(1.7);
    }
    // Present in the inferior leads with the same polarity.
    const iii = ii.map((_, i) => lead('ecgIII', t0 + i / fs));
    const avf = ii.map((_, i) => lead('aVF', t0 + i / fs));
    expect(Math.max(...iii) - Math.min(...iii)).toBeGreaterThan(0.2);
    expect(Math.max(...avf) - Math.min(...avf)).toBeGreaterThan(0.2);
  });

  it('leaving AF fades the f-waves out instead of cutting them (review L8)', () => {
    const { st } = runRhythm('afib', 10, { seed: 4 });
    const ctx = { hrAt: () => 75, mods: defaultModifiers(), rng: createRngState(4), hrv: { phi: 0, psi: 0 } };
    applyRhythm(st, 'sinus', {}, 10, true, ctx);
    const acc = new Float64Array(3);
    const v = (t: number) => {
      acc.fill(0);
      for (const fw of st.fwaves) fwaveAt(fw, t, acc);
      return projectLead('ecgII', acc[0]!, acc[1]!, acc[2]!);
    };
    const end = st.fwaves[0]!.end;
    let maxStep = 0;
    for (let t = end - 0.2; t < end + 0.05; t += 0.002) maxStep = Math.max(maxStep, Math.abs(v(t + 0.002) - v(t)));
    expect(maxStep).toBeLessThan(0.01); // mV per 500 Hz sample
    expect(v(end + 0.001)).toBe(0);
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

  it('vtMono 120–130: a conducted sinus capture never overlaps a VT complex (review M2)', () => {
    for (const hr of [120, 125, 130]) {
      for (const seed of [1, 2, 3]) {
        const { beats } = runRhythm('vtMono', 60, { hr, seed });
        const rr = diffs(beats.map((b) => b.t));
        expect(Math.min(...rr), `VT ${hr} seed ${seed}`).toBeGreaterThan(0.2);
      }
    }
  });

  it('vtMono: 170/min wide complexes (QRS 140–200 ms) with dissociated P waves', () => {
    const { beats, atrial } = runRhythm('vtMono', 30);
    expect(60 / mean(diffs(beats.map((b) => b.t)))).toBeCloseTo(170, -1);
    expect(beats.every((b) => b.origin === 'ventricular' && b.qrsMs >= 140 && b.qrsMs <= 200)).toBe(true);
    expect(atrial.length).toBeGreaterThan(30); // sinus P waves march through
    expect(beats.every((b) => b.mech.kSV > 0.3 && b.mech.kSV < 0.6)).toBe(true);
  });
});
