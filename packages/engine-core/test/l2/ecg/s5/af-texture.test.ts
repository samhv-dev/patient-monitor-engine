import { describe, expect, it } from 'vitest';
import { dominantHz, rms } from '../../../../src/util/dsp.ts';
import { afTemplatesAvailable, afTexture } from '../../../../src/l2/ecg/af-texture.ts';
import { samples5 } from '../../../helpers/s5.ts';

describe('AF f-wave texture', () => {
  it('uses the recorded texture: empty sinusoid list, one rhythmSegment with the template id', () => {
    expect(afTemplatesAvailable()).toBe(true);
    const r = samples5('afib', 10, ['ecgII'], { mods: { artefact: { noise: 0 } } });
    expect(r.st.fwaves.find((f) => f.kind === 'fib')!.f).toHaveLength(0);
    const seg = r.records.filter((e) => e.type === 'rhythmSegment');
    expect(seg).toHaveLength(1);
    expect(seg[0]).toMatchObject({ rhythm: 'afib', templateId: 'af-mitdb' });
  });

  it('texture is unit RMS with its dominant frequency at 4–9 Hz and no jumps at block joins', () => {
    const x = Float64Array.from({ length: 500 * 60 }, (_, i) => afTexture(12345, i / 500));
    expect(rms(x)).toBeGreaterThan(0.8);
    expect(rms(x)).toBeLessThan(1.2);
    const f = dominantHz(x, 500, 3, 12);
    expect(f).toBeGreaterThanOrEqual(4);
    expect(f).toBeLessThanOrEqual(9);
    let maxStep = 0;
    for (let i = 1; i < x.length; i++) maxStep = Math.max(maxStep, Math.abs(x[i]! - x[i - 1]!));
    expect(maxStep).toBeLessThan(1.5); // crossfaded joins: no discontinuity bigger than the texture's own slope
  });

  it('f-wave amplitude between QRS complexes: RMS 0.02–0.06 mV in II', () => {
    const r = samples5('afib', 60, ['ecgII'], { hr: 40, mods: { artefact: { noise: 0 }, rsa: 0 } });
    const x = r.lead.ecgII!;
    const ts = r.beats.map((b) => b.t);
    const vals: number[] = [];
    for (let i = 0; i + 1 < ts.length; i++) {
      const piece = x.subarray(Math.round((ts[i]! + 0.5) * 500), Math.round((ts[i + 1]! - 0.1) * 500));
      const m = piece.reduce((p, v) => p + v, 0) / Math.max(1, piece.length);
      for (const v of piece) vals.push(v - m);
    }
    const a = rms(vals);
    expect(a).toBeGreaterThan(0.02);
    expect(a).toBeLessThan(0.06);
  });
});
