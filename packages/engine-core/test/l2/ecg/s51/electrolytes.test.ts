import { describe, expect, it } from 'vitest';
import { fiducialOf } from '../../../../src/l2/ecg/beat-templates.ts';
import { kernelLead, morphBeat } from '../../../helpers/s5.ts';
import { beatQrs, without, WAVE } from '../../../helpers/s51.ts';
import { applyPMorphology } from '../../../../src/l2/ecg/morphology/index.ts';
import { pWaveKernels } from '../../../../src/l2/ecg/templates.ts';
import { defaultModifiers, mergeModifiers } from '../../../../src/modifiers.ts';

const ii = (k: number[], t: number) => kernelLead(k, 'ecgII', t);

describe('Stage 5.1 hyperkalaemia sine wave and Osborn J wave (measured)', () => {
  it('K 8.5: QRS ≥ 160 ms, P absent, no isoelectric ST, R–S–T oscillation (trough ≤ −0.3·R, T/R 0.6–1.4)', () => {
    const k = morphBeat({ k: 8.5 });
    const q = beatQrs(k, fiducialOf(k));
    expect(q.ms).toBeGreaterThanOrEqual(160);
    const p = applyPMorphology(pWaveKernels(), mergeModifiers(defaultModifiers(), { k: 8.5 }));
    expect(Math.max(...Array.from({ length: 200 }, (_, i) => Math.abs(ii(p, i / 1000))))).toBeLessThan(0.02);
    let rAt = 0;
    let r = -Infinity;
    for (let t = 0; t < 0.15; t += 0.0005) if (ii(k, t) > r) [r, rAt] = [ii(k, t), t];
    let tAt = 0;
    let tv = -Infinity;
    for (let t = q.off; t < 0.6; t += 0.0005) if (ii(k, t) > tv) [tv, tAt] = [ii(k, t), t];
    let trough = Infinity;
    let flatMs = 0;
    for (let t = rAt; t < tAt; t += 0.0005) trough = Math.min(trough, ii(k, t));
    for (let t = q.off; t < tAt; t += 0.0005) if (Math.abs(ii(k, t)) < 0.05) flatMs += 0.5;
    expect(trough).toBeLessThanOrEqual(-0.3 * r);
    expect(tv / r).toBeGreaterThanOrEqual(0.6);
    expect(tv / r).toBeLessThanOrEqual(1.4);
    expect(flatMs).toBeLessThanOrEqual(10);
  });

  it('Osborn J: none at ≥ 33 °C, ≥ 0.1 mV in II and V5 at 30 °C, growing monotonically below 32 °C', () => {
    const jAmp = (tempC: number, l: 'ecgII' | 'V5') => {
      const k = morphBeat({ tempC });
      const b = without(k, WAVE.J);
      let m = 0;
      for (let t = 0; t < 0.3; t += 0.0005) m = Math.max(m, kernelLead(k, l, t) - kernelLead(b, l, t));
      return m;
    };
    expect(jAmp(33, 'ecgII')).toBe(0);
    for (const l of ['ecgII', 'V5'] as const) {
      expect(jAmp(30, l)).toBeGreaterThanOrEqual(0.1);
      const a = [32, 31, 30, 29, 28].map((t) => jAmp(t, l));
      for (let i = 1; i < a.length; i++) expect(a[i]!).toBeGreaterThan(a[i - 1]!);
    }
  });
});
