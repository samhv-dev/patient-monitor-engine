import { describe, expect, it } from 'vitest';
import { createNibpState, invertEnvelope, NIBP, nibpCommand, nibpOnPulse, nibpStep, type NibpOut } from '../../../src/l3/nibp/nibp.ts';
import { seedStream } from '../../../src/rng/sfc32.ts';

/** Drive the cuff with a regular pulse train of fixed site pressures until done/failed (or tMax). */
function run(beat: { sbp: number; dbp: number; map: number }, hr = 75, tMax = 200) {
  const nb = createNibpState();
  const rng = seedStream(1, 'measurement');
  const out: NibpOut[] = [];
  nibpCommand(nb, 'start', 0, undefined, out);
  let nextPulse = 0.3;
  for (let t = 0; t < tMax; t += 0.008) {
    if (t >= nextPulse) {
      nibpOnPulse(nb, t, beat, false, rng);
      nextPulse += 60 / hr;
    }
    nibpStep(nb, t, 0.008, rng, out);
    if (out.some((o) => o.kind === 'phase' && (o.phase === 'done' || o.phase === 'failed'))) return { nb, out, t };
  }
  return { nb, out, t: tMax };
}

describe('l3/nibp (brief §4.5, §6.3)', () => {
  it('inverts an exact Gaussian envelope at Rs/Rd', () => {
    const [S, D, M] = [120, 80, 95];
    const steps: number[][] = [];
    for (let pc = 165; pc >= 60; pc -= 8) {
      const w = pc > M ? (S - M) / Math.sqrt(-Math.log(NIBP.RS)) : (M - D) / Math.sqrt(-Math.log(NIBP.RD));
      steps.push([pc, 2 * Math.exp(-(((pc - M) / w) ** 2))]);
    }
    const r = invertEnvelope(steps) as { sys: number; dia: number; map: number };
    expect(r.sys).toBeCloseTo(S, 0);
    expect(r.dia).toBeCloseTo(D, 0);
    expect(r.map).toBeCloseTo(M, 0);
  });

  it('a cycle inflates to 165, steps down, and reports near the truth in ≈ 25–35 s', () => {
    const { out, t } = run({ sbp: 120, dbp: 80, map: 95 });
    const done = out.find((o) => o.kind === 'phase' && o.phase === 'done') as Extract<NibpOut, { kind: 'phase' }>;
    expect(done.result!.sys).toBeGreaterThan(108);
    expect(done.result!.sys).toBeLessThan(132);
    expect(done.result!.dia).toBeGreaterThan(70);
    expect(done.result!.dia).toBeLessThan(90);
    expect(t).toBeGreaterThan(22);
    expect(t).toBeLessThan(38);
  });

  it('SBP 45 (tiny oscillations) fails after 2 attempts with the INOP', () => {
    const { out } = run({ sbp: 45, dbp: 30, map: 36 });
    expect(out.filter((o) => o.kind === 'phase' && o.phase === 'inflating')).toHaveLength(2);
    expect(out.some((o) => o.kind === 'failed' && o.text === 'NBP measurement failed')).toBe(true);
  });

  it('manual start cancels auto; stat repeats; cuff off rejects start', () => {
    const nb = createNibpState();
    const out: NibpOut[] = [];
    nibpCommand(nb, 'auto', 0, 5, out);
    expect(nb.mode).toBe('auto');
    nibpCommand(nb, 'stop', 1, undefined, out);
    expect(nb.nextStartT).toBeCloseTo(301, 9);
    nibpCommand(nb, 'start', 2, undefined, out);
    expect(nb.mode).toBe('manual');
    nibpCommand(nb, 'stat', 3, undefined, out);
    expect(nb.mode).toBe('stat');
    nb.sensor = 'off';
    expect(nibpCommand(createNibpState('off'), 'start', 0, undefined, out)).toBe('cuff not connected');
  });
});
