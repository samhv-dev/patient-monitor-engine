import { describe, expect, it } from 'vitest';
import { dominantHz, rms, welch } from '../../../../src/util/dsp.ts';
import { samples5 } from '../../../helpers/s5.ts';

const off = { noise: 0 };
const peakNear = (x: Float64Array, f0: number, tol: number, nfft = 4096) => {
  const { f, p } = welch(x, 500, nfft);
  let best = 0;
  let bf = 0;
  for (let k = 0; k < p.length; k++) if (Math.abs(f[k]! - f0) <= tol && p[k]! > best) { best = p[k]!; bf = f[k]!; }
  const band = Array.from(p).filter((_, k) => f[k]! >= 0.5 && f[k]! <= 20).sort((a, b) => a - b);
  return { f: bf, ratio: best / band[Math.floor(band.length / 2)]! };
};

describe('body artefacts (VCG)', () => {
  it('acceptance 4 — CPR artefact: fundamental at the compression rate and lines at h·f_c for h = 1…8', () => {
    for (const rateCpm of [100, 120]) {
      const r = samples5('asystole', 40, ['ecgII'], { mods: { artefact: { ...off, cpr: { rateCpm, depth: 0.5 } } } });
      const x = r.lead.ecgII!.subarray(5000);
      const fc = rateCpm / 60;
      expect(Math.abs(dominantHz(x, 500, 0.5, 3, 4096) - fc)).toBeLessThanOrEqual(0.05 * fc);
      for (let h = 1; h <= 8; h++) expect(peakNear(x, h * fc, 0.06 * h * fc).ratio).toBeGreaterThan(5);
      const a = rms(x) * 2 * Math.SQRT2;
      expect(a / 1.1).toBeGreaterThan(0.85); // depth 0.5 → 0.2 + 1.8·0.5 = 1.1 mV
      expect(a / 1.1).toBeLessThan(1.2);
    }
  });

  it('EMG 0.02–0.2 mV RMS (level 0.1 → 1), band 20–150 Hz; shiver has a 4–8 Hz envelope; wander 0.1–0.5 Hz', () => {
    const emg = samples5('asystole', 20, ['ecgII'], { mods: { artefact: { ...off, emg: 1 } } }).lead.ecgII!;
    const hp = emg.map((v, i) => (i > 0 ? v - emg[i - 1]! : 0)); // first difference: removes the slow respiratory wander
    expect(rms(hp)).toBeGreaterThan(0.1);
    const lo = samples5('asystole', 20, ['ecgII'], { mods: { artefact: { ...off, emg: 0.1 } } }).lead.ecgII!;
    expect(rms(lo.map((v, i) => (i > 0 ? v - lo[i - 1]! : 0))) / rms(hp)).toBeCloseTo(0.1, 1);
    const shiver = samples5('asystole', 20, ['ecgII'], { mods: { artefact: { ...off, shiver: 1 } } }).lead.ecgII!;
    const e = shiver.map((v, i) => (i > 0 ? Math.abs(v - shiver[i - 1]!) : 0));
    expect(dominantHz(e, 500, 2, 10, 4096)).toBeCloseTo(6, 0);
    const w = samples5('asystole', 60, ['ecgII'], { mods: { rsa: 0, artefact: { ...off, wander: 1 } } }).lead.ecgII!;
    const fw = dominantHz(w, 500, 0.05, 1, 8192);
    expect(fw).toBeGreaterThanOrEqual(0.1);
    expect(fw).toBeLessThanOrEqual(0.5);
  });
});
