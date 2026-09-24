import { describe, expect, it } from 'vitest';
import { diffs, runRhythm } from '../../helpers/rhythm.ts';

describe('rhythm engine: PVC modifier', () => {
  it('acceptance 8: bigeminy — coupling + pause = 2·RR ± 10 ms, PVC QRS 120–200 ms', () => {
    for (const hr of [60, 75, 100]) {
      const { beats } = runRhythm('sinus', 60, { hr, mods: { hrvScale: 0, pvc: { pattern: 'bigeminy', probability: 0 } } });
      const rr = 60 / hr;
      let checked = 0;
      for (let i = 1; i + 1 < beats.length; i++) {
        const b = beats[i]!;
        if (b.template !== 'pvc') continue;
        const prev = beats[i - 1]!;
        const next = beats[i + 1]!;
        expect(prev.template).not.toBe('pvc');
        expect(next.template).not.toBe('pvc');
        // measure on QRS onsets (fiducials differ between narrow 40 ms and wide 50 ms)
        const coupling = b.t - 0.05 - (prev.t - 0.04);
        const pause = next.t - 0.04 - (b.t - 0.05);
        expect(Math.abs(coupling + pause - 2 * rr)).toBeLessThanOrEqual(0.01);
        expect(b.qrsMs).toBeGreaterThanOrEqual(120);
        expect(b.qrsMs).toBeLessThanOrEqual(200);
        checked++;
      }
      expect(checked).toBeGreaterThan(10);
    }
  });

  it('bigeminy alternates N-V-N-V; single PVCs appear at roughly the set probability', () => {
    const big = runRhythm('sinus', 30, { hr: 75, mods: { pvc: { pattern: 'bigeminy', probability: 0 } } });
    const seq = big.beats.slice(2, 12).map((b) => (b.template === 'pvc' ? 'V' : 'N')).join('');
    expect(['NVNVNVNVNV', 'VNVNVNVNVN']).toContain(seq);
    const single = runRhythm('sinus', 600, { hr: 75, seed: 3, mods: { pvc: { pattern: 'single', probability: 0.2 } } });
    const pvcs = single.beats.filter((b) => b.template === 'pvc').length;
    const normals = single.beats.length - pvcs;
    expect(pvcs / normals).toBeGreaterThan(0.15);
    expect(pvcs / normals).toBeLessThan(0.25);
  });

  it('PVC mechanics: early PVCs do not eject; the beat after a PVC is potentiated (brief §4.8)', () => {
    const { beats } = runRhythm('sinus', 60, { hr: 75, mods: { hrvScale: 0, pvc: { pattern: 'bigeminy', probability: 0 } } });
    const i = beats.findIndex((b, j) => j > 2 && b.template === 'pvc');
    expect(beats[i]!.mech.kSV).toBeGreaterThanOrEqual(0);
    expect(beats[i]!.mech.kSV).toBeLessThanOrEqual(0.6);
    expect(beats[i + 1]!.mech.kSV).toBeCloseTo(1.2, 6);
    expect(diffs([beats[i - 1]!.t, beats[i]!.t])[0]).toBeGreaterThan(0.35);
  });
});
