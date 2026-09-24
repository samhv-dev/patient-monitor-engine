import { describe, expect, it } from 'vitest';
import { K_STRIDE, WAVE, run5 } from '../../../helpers/s5.ts';
import { tEndAfterPeakS } from '../../../../src/l2/ecg/templates.ts';

describe('Stage 5 PVC variants', () => {
  it('trigeminy: N N V repeating with a full compensatory pause', () => {
    const { beats } = run5('sinus', 60, { hr: 75, mods: { hrvScale: 0, pvc: { pattern: 'trigeminy', probability: 0 } } });
    const seq = beats.map((b) => (b.template === 'pvc' ? 'V' : 'N')).join('');
    expect(seq.slice(2, 32)).toMatch(/^(NNV)+|^(NVN)+|^(VNN)+/);
    expect(seq.slice(2, 32).match(/V/g)!.length).toBe(10);
  });

  it('couplet / triplet / run: consecutive PVCs at 160/min', () => {
    for (const [pattern, n] of [['couplet', 2], ['triplet', 3], ['run', 6]] as const) {
      const { beats } = run5('sinus', 120, { hr: 70, mods: { hrvScale: 0, pvc: { pattern, probability: 0.2, runLength: 6 } } });
      const seq = beats.map((b) => (b.template === 'pvc' ? 'V' : 'N')).join('');
      const runs = seq.match(/V+/g) ?? [];
      expect(runs.length).toBeGreaterThan(3);
      expect(runs.every((r) => r.length === n)).toBe(true);
      const t = beats.map((b) => b.t);
      for (let i = 1; i < beats.length; i++) if (beats[i]!.template === 'pvc' && beats[i - 1]!.template === 'pvc') expect(t[i]! - t[i - 1]!).toBeCloseTo(60 / 160, 6);
    }
  });

  it('multifocal: ≥ 2 distinct PVC morphologies; all still template "pvc" in the beat event', () => {
    const { beats, st } = run5('sinus', 120, { hr: 70, mods: { pvc: { pattern: 'single', probability: 0.3, multifocal: true } } });
    expect(beats.some((b) => b.template === 'pvc')).toBe(true);
    const vecs = new Set<string>();
    for (const e of st.events) for (let i = 0; i < e.k.length; i += K_STRIDE) if (e.k[i + 6] === WAVE.R && Math.abs(e.k[i + 3]! - 1.521) > 0.01) vecs.add(e.k[i + 4]!.toFixed(2));
    expect(vecs.size).toBeGreaterThanOrEqual(2);
  });

  it('R-on-T: the PVC starts on the preceding T peak (coupling < QT)', () => {
    const { beats } = run5('sinus', 60, { hr: 70, mods: { hrvScale: 0, pvc: { pattern: 'bigeminy', probability: 0, rOnT: true } } });
    for (let i = 1; i < beats.length; i++) {
      const b = beats[i]!;
      if (b.template !== 'pvc') continue;
      const n = beats[i - 1]!;
      const onsetN = n.t - 0.04;
      const onsetV = b.t - 0.05;
      expect(onsetV - onsetN).toBeCloseTo(n.qtMs / 1000 - tEndAfterPeakS(0.03), 2); // narrow T σ_fall 30 ms
      expect(onsetV - onsetN).toBeLessThan(n.qtMs / 1000);
    }
  });
});
