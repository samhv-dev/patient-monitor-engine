import { describe, expect, it } from 'vitest';
import { normal } from '../../../../src/rng/sfc32.ts';
import { dominantHz, rms } from '../../../../src/util/dsp.ts';
import { arSample, createTex, decodeTemplates, texSample, type TemplateSet } from '../../../../src/l2/ecg/texture.ts';

/** A synthetic template set: two unit-RMS 8 s tones at 5 and 6 Hz, Int16 × 4096, base64 (the bundled format). */
function synthetic(): TemplateSet {
  const enc = (f: number) => {
    const i16 = Int16Array.from({ length: 4000 }, (_, i) => Math.round(Math.SQRT2 * Math.sin((2 * Math.PI * f * i) / 500) * 4096));
    return btoa(String.fromCharCode(...new Uint8Array(i16.buffer)));
  };
  return { scale: 4096, items: [{ id: 'a', fdomHz: 5, b64: enc(5) }, { id: 'b', fdomHz: 6, b64: enc(6) }] };
}

describe('recorded-texture player', () => {
  it('decodes Int16/base64 templates to unit RMS', () => {
    const t = decodeTemplates(synthetic());
    expect(t).toHaveLength(2);
    expect(rms(t[0]!.x)).toBeCloseTo(1, 2);
  });

  it('time-warps any template to the requested dominant frequency, across segment crossfades', () => {
    const tex = decodeTemplates(synthetic());
    for (const f of [3.5, 4.5, 7]) {
      const s = createTex(tex.length, [1, 2, 3, 4]);
      const x = Float64Array.from({ length: 500 * 60 }, () => texSample(tex, s, f));
      expect(Math.abs(dominantHz(x, 500) - f)).toBeLessThanOrEqual(0.25);
      expect(rms(x)).toBeGreaterThan(0.8);
    }
  });

  it('AR(2) fallback: unit RMS with its dominant frequency at f_dom', () => {
    const st = { y1: [0, 0, 0, 0], y2: [0, 0, 0, 0] };
    const rng: [number, number, number, number] = [3, 4, 5, 6];
    const x = new Float64Array(500 * 60);
    for (let n = 0; n < x.length; n++) x[n] = arSample(st, 4.5, [normal(rng), normal(rng), normal(rng), normal(rng)]);
    expect(Math.abs(dominantHz(x.subarray(5000), 500) - 4.5)).toBeLessThanOrEqual(0.5);
    expect(rms(x.subarray(5000))).toBeGreaterThan(0.8);
    expect(rms(x.subarray(5000))).toBeLessThan(1.2);
  });
});

describe('recorded-texture player: hopping (Stage 5.1)', () => {
  it('with hopS [1, 2.5] the player changes segment every 1–2.5 s (+ 0.5 s crossfade); without it, only at segment ends', () => {
    const tex = decodeTemplates(synthetic());
    const count = (hop: readonly [number, number] | null) => {
      const s = createTex(tex.length, [1, 2, 3, 4], hop);
      let changes = 0;
      let seg = s.seg;
      for (let n = 0; n < 500 * 30; n++) {
        texSample(tex, s, 5);
        if (s.seg !== seg) {
          changes++;
          seg = s.seg;
        }
      }
      return changes;
    };
    const hopped = count([1, 2.5]);
    expect(hopped).toBeGreaterThanOrEqual(30 / 3); // ≥ one hop per 3 s
    expect(hopped).toBeLessThanOrEqual(30 / 1.5 + 1);
    expect(count(null)).toBeLessThanOrEqual(5); // 8 s windows played to their end
  });
});
