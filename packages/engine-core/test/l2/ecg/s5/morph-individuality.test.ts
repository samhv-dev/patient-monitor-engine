import { describe, expect, it } from 'vitest';
import { QRS_WAVES } from '../../../../src/l2/ecg/morphology/ops.ts';
import { K_STRIDE } from '../../../../src/l2/ecg/kernels.ts';
import { kernelLead, morphBeat, run5 } from '../../../helpers/s5.ts';


const base = morphBeat({});
const beat = morphBeat;

describe('individuality (acceptance 10)', () => {
  const lead2 = (k: number[]) => Array.from({ length: 300 }, (_, i) => kernelLead(k, 'ecgII', i / 500 - 0.1));
  const corr = (a: number[], b: number[]) => {
    const ma = a.reduce((p, v) => p + v, 0) / a.length;
    const mb = b.reduce((p, v) => p + v, 0) / b.length;
    let n = 0, da = 0, db = 0;
    a.forEach((v, i) => { n += (v - ma) * (b[i]! - mb); da += (v - ma) ** 2; db += (b[i]! - mb) ** 2; });
    return n / Math.sqrt(da * db);
  };

  it('same patientSeed → identical morphology across rhythm steps; different seeds differ (Stage 5.1: by ≥ 0.05 mV in II)', () => {
    const p = (seed: number) => beat({ patientSeed: seed, morphologyVariation: 1 });
    expect(p(7)).toEqual(p(7));
    const a = run5('sinus', 8, { hr: 60, mods: { hrvScale: 0, patientSeed: 7, morphologyVariation: 1 } });
    const b = run5('sinusBrady', 8, { hr: 60, mods: { hrvScale: 0, patientSeed: 7, morphologyVariation: 1 } });
    // QRS timing and vector directions (amplitude varies with respiration, so compare unit vectors)
    const shape = (k: number[]) => {
      const out: number[] = [];
      for (let i = 0; i < k.length; i += K_STRIDE) {
        if (!QRS_WAVES.has(k[i + 6]!)) continue;
        const n = Math.hypot(k[i + 3]!, k[i + 4]!, k[i + 5]!);
        out.push(k[i]!, k[i + 1]!, k[i + 2]!, k[i + 3]! / n, k[i + 4]! / n, k[i + 5]! / n);
      }
      return out.map((v) => v.toFixed(9));
    };
    expect(shape(a.st.events.at(-1)!.k)).toEqual(shape(b.st.events.at(-1)!.k));
    for (const [s1, s2] of [[1, 2], [3, 4], [5, 6]]) {
      const a = lead2(p(s1!));
      const b = lead2(p(s2!));
      expect(corr(a, b)).toBeLessThan(0.9999);
      expect(Math.max(...a.map((v, i) => Math.abs(v - b[i]!)))).toBeGreaterThanOrEqual(0.05);
    }
    expect(beat({ patientSeed: 99, morphologyVariation: 0 })).toEqual(base);
  });
});
