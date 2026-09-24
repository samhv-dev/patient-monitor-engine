import { describe, expect, it } from 'vitest';
import { createRngState } from '../../../src/rng/sfc32.ts';
import { ECG_RATE, generateVcg, pruneEvents, tableNormal } from '../../../src/l2/ecg/generator.ts';
import { makeEvent } from '../../../src/l2/ecg/kernels.ts';
import { narrowKernels } from '../../../src/l2/ecg/templates.ts';
import { projectLead } from '../../../src/l2/ecg/vcg.ts';

const hrv = { phi: 0, psi: 0 };

describe('l2/ecg/generator', () => {
  it('reproduces the analytic kernel sum: lead II R peak ≈ 1.1 mV at QRS onset + 40 ms', () => {
    const ev = makeEvent(1.0, narrowKernels(400));
    const ii: number[] = [];
    generateVcg({ events: [ev], fwaves: [], hrv, noiseLevel: 0, noise: createRngState(1).noise }, 450, 700, (_n, x, y, z) =>
      ii.push(projectLead('ecgII', x, y, z)),
    );
    const peak = Math.max(...ii);
    const at = 450 + ii.indexOf(peak);
    expect(at).toBe(Math.round(1.04 * ECG_RATE));
    // wander adds ≤ 0.08 mV at this phase; the R kernel dominates
    expect(peak).toBeGreaterThan(1.0);
    expect(peak).toBeLessThan(1.25);
  });

  it('noise level 1 gives ≈0.025 mV SD per axis; level 0 gives none', () => {
    const noise = createRngState(9).noise;
    const xs: number[] = [];
    generateVcg({ events: [], fwaves: [], hrv, noiseLevel: 1, noise }, 0, 49_999, (_n, x) => xs.push(x));
    // remove the (deterministic) wander by differencing adjacent samples: var(diff) = 2σ²
    const d = xs.slice(1).map((x, i) => x - xs[i]!);
    const sd = Math.sqrt(d.reduce((a, b) => a + b * b, 0) / d.length / 2);
    expect(sd).toBeGreaterThan(0.023);
    expect(sd).toBeLessThan(0.027);
    const q: number[] = [];
    generateVcg({ events: [], fwaves: [], hrv, noiseLevel: 0, noise }, 0, 10, (_n, x) => q.push(x));
    expect(new Set(q.map((v) => Math.abs(v) < 0.2)).has(false)).toBe(false);
  });

  it('table noise is ~N(0,1) and deterministic per stream', () => {
    const a = createRngState(3).noise;
    const b = createRngState(3).noise;
    const va = Array.from({ length: 20_000 }, () => tableNormal(a));
    const vb = Array.from({ length: 20_000 }, () => tableNormal(b));
    expect(va).toEqual(vb);
    const m = va.reduce((p, x) => p + x, 0) / va.length;
    expect(Math.abs(m)).toBeLessThan(0.05);
  });

  it('prunes finished events', () => {
    const evs = [makeEvent(0, narrowKernels(400)), makeEvent(5, narrowKernels(400))];
    expect(pruneEvents(evs, 2)).toHaveLength(1);
  });
});
