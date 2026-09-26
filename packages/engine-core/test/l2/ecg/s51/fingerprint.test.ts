import { describe, expect, it } from 'vitest';
import { fiducialOf } from '../../../../src/l2/ecg/beat-templates.ts';
import { frontalAxisDeg } from '../../../../src/l2/ecg/morphology/ops.ts';
import { applyPMorphology } from '../../../../src/l2/ecg/morphology/index.ts';
import { pWaveKernels } from '../../../../src/l2/ecg/templates.ts';
import { defaultModifiers, mergeModifiers } from '../../../../src/modifiers.ts';
import { K_STRIDE } from '../../../../src/l2/ecg/kernels.ts';
import { kernelLead, morphBeat, samples5 } from '../../../helpers/s5.ts';
import { beatQrs, WAVE } from '../../../helpers/s51.ts';

/** Peak spatial magnitude |VCG| of the selected waves (rotation-invariant amplitude), measured at 2 kHz. */
function spatialPeak(k: readonly number[], waves: number[], t0: number, t1: number): number {
  const sel: number[] = [];
  for (let i = 0; i < k.length; i += K_STRIDE) if (waves.includes(k[i + 6] as number)) sel.push(...k.slice(i, i + K_STRIDE));
  let m = 0;
  for (let t = t0; t < t1; t += 0.0005) {
    let x = 0, y = 0, z = 0;
    for (let i = 0; i < sel.length; i += K_STRIDE) {
      const d = t - sel[i]!;
      const s = d < 0 ? sel[i + 1]! : sel[i + 2]!;
      const g = Math.exp((-d * d) / (2 * s * s));
      x += sel[i + 3]! * g; y += sel[i + 4]! * g; z += sel[i + 5]! * g;
    }
    m = Math.max(m, Math.hypot(x, y, z));
  }
  return m;
}
const QRS = [WAVE.Q, WAVE.R, WAVE.S];
const fp = (seed: number) => morphBeat({ patientSeed: seed, morphologyVariation: 1 });
const pOf = (seed: number, mv: number) => applyPMorphology(pWaveKernels(), mergeModifiers(defaultModifiers(), { patientSeed: seed, morphologyVariation: mv }));

describe('Stage 5.1 per-patient fingerprint (Squiggler-style)', () => {
  const base = morphBeat({});
  const baseQrs = beatQrs(base, fiducialOf(base)).ms;
  const seeds = Array.from({ length: 30 }, (_, i) => i + 1);

  it('bounds over 30 patients: P/QRS/T amplitude and QRS width within ±10 %, frontal axis within ±15° of the textbook beat, and the full range is used', () => {
    const ax: number[] = [];
    for (const s of seeds) {
      const k = fp(s);
      const qa = spatialPeak(k, QRS, -0.05, 0.25) / spatialPeak(base, QRS, -0.05, 0.25);
      const ta = spatialPeak(k, [WAVE.T], 0.1, 0.6) / spatialPeak(base, [WAVE.T], 0.1, 0.6);
      const pa = spatialPeak(pOf(s, 1), [WAVE.P], 0, 0.15) / spatialPeak(pOf(s, 0), [WAVE.P], 0, 0.15);
      for (const a of [qa, ta, pa]) expect(Math.abs(a - 1)).toBeLessThanOrEqual(0.1 + 1e-9);
      expect(Math.abs(beatQrs(k, fiducialOf(k)).ms / baseQrs - 1)).toBeLessThanOrEqual(0.1 + 0.01);
      ax.push(frontalAxisDeg(k) - frontalAxisDeg(base));
    }
    expect(Math.max(...ax.map(Math.abs))).toBeLessThanOrEqual(15.5);
    expect(Math.max(...ax) - Math.min(...ax)).toBeGreaterThan(15); // patients really differ in axis
  });

  it('two patients differ visibly (lead II beats differ by ≥ 0.05 mV somewhere), each patient is identical beat to beat and run to run', () => {
    const lead2 = (k: number[]) => Array.from({ length: 300 }, (_, i) => kernelLead(k, 'ecgII', i / 500 - 0.1));
    for (const [a, b] of [[1, 2], [3, 4], [5, 6], [7, 8]] as const) {
      const A = lead2(fp(a));
      const B = lead2(fp(b));
      expect(Math.max(...A.map((v, i) => Math.abs(v - B[i]!)))).toBeGreaterThanOrEqual(0.05);
    }
    expect(fp(7)).toEqual(fp(7));
    const run = () => samples5('sinus', 10, ['ecgII'], { seed: 4, mods: { patientSeed: 7, morphologyVariation: 1 } }).lead.ecgII!;
    expect(Array.from(run())).toEqual(Array.from(run()));
    expect(morphBeat({ patientSeed: 99, morphologyVariation: 0 })).toEqual(base);
  });
});
