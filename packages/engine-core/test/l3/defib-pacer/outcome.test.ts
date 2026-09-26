// Brief §6.5 post-shock table, BUILD-PLAN Stage 4 acceptance 6: over 10,000 seeded VF shocks the outcome
// frequencies are within ±2 % of the table.
import { describe, expect, it } from 'vitest';
import { drawOutcome, outcomeProbabilities, shockClass, type ShockContext, type ShockOutcome } from '../../../src/l3/defib-pacer/outcome.ts';
import { createRngState } from '../../../src/rng/sfc32.ts';

const VF: ShockContext = { cls: 'vf', synced: false, energyJ: 200, defaultJ: 200, vfDurationS: 60, onTPeak: false };

function freq(c: ShockContext, n = 10_000): Record<ShockOutcome, number> {
  const out: Record<ShockOutcome, number> = { unchanged: 0, vf: 0, asystole: 0, pea: 0, rosc: 0, sinus: 0 };
  for (let seed = 1; seed <= n; seed++) out[drawOutcome(c, createRngState(seed).outcome)]++;
  for (const k of Object.keys(out) as ShockOutcome[]) out[k] /= n;
  return out;
}

describe('post-shock outcome table', () => {
  it('classifies what is shocked', () => {
    expect(shockClass('vfCoarse', false)).toBe('vf');
    expect(shockClass('vtMono', true)).toBe('vf');
    expect(shockClass('vtMono', false)).toBe('organisedPulse');
    expect(shockClass('svtAvnrt', false)).toBe('organisedPulse');
    expect(shockClass('sinus', false)).toBe('perfusing');
    expect(shockClass('sinus', true)).toBe('arrest');
    expect(shockClass('asystole', false)).toBe('arrest');
  });

  it('VF at the default energy: persistent 0.30, asystole/PEA 0.60, ROSC 0.10 — 10,000 seeded shocks within ±2 %', () => {
    const f = freq(VF);
    expect(Math.abs(f.unchanged - 0.3)).toBeLessThan(0.02);
    expect(Math.abs(f.asystole + f.pea - 0.6)).toBeLessThan(0.02);
    expect(Math.abs(f.rosc - 0.1)).toBeLessThan(0.02);
    expect(f.vf + f.sinus).toBe(0);
  });

  it('VF duration and low energy follow the modifiers', () => {
    const p5 = outcomeProbabilities({ ...VF, vfDurationS: 300 });
    expect(p5.rosc).toBeCloseTo(0.05, 10);
    expect((p5.asystole ?? 0) + (p5.pea ?? 0)).toBeCloseTo(0.65, 10);
    expect(outcomeProbabilities({ ...VF, vfDurationS: 700 }).rosc).toBeCloseTo(0.02, 10);
    const lo = outcomeProbabilities({ ...VF, energyJ: 90 });
    expect(lo.unchanged).toBeCloseTo(0.65, 10);
    const f = freq({ ...VF, energyJ: 90 });
    expect(Math.abs(f.unchanged - 0.65)).toBeLessThan(0.02);
  });

  it('synchronised cardioversion: sinus 0.8; unsynchronised on the T peak of a perfusing rhythm: VF 0.3; asystole: nothing', () => {
    const cv = freq({ ...VF, cls: 'organisedPulse', synced: true });
    expect(Math.abs(cv.sinus - 0.8)).toBeLessThan(0.02);
    const rOnT = freq({ ...VF, cls: 'perfusing', onTPeak: true });
    expect(Math.abs(rOnT.vf - 0.3)).toBeLessThan(0.02);
    expect(outcomeProbabilities({ ...VF, cls: 'perfusing' })).toEqual({ unchanged: 1 });
    expect(outcomeProbabilities({ ...VF, cls: 'arrest' })).toEqual({ unchanged: 1 });
  });
});
