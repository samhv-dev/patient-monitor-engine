// E133: the PVCs the physiology asks for (RhythmState.physPvc, set by the hemo pipeline from circ/ectopy.ts) are drawn
// by the planner after the next supraventricular beat — a single PVC, a couplet, a run at the run rate — and the
// instructor's own PVC setting keeps drawing first.
import { describe, expect, it } from 'vitest';
import { defaultModifiers } from '../../../src/modifiers.ts';
import { createRngState } from '../../../src/rng/sfc32.ts';
import { drawHrvPhase } from '../../../src/l2/ecg/hrv.ts';
import { createRhythmState, planUntil, type RhythmCtx } from '../../../src/l2/ecg/rhythm-engine.ts';
import { PVC_RUN_RATE_BPM } from '../../../src/l2/ecg/ectopy.ts';
import type { Modifiers } from '../../../src/types.ts';
import type { Beat } from '../../helpers/rhythm.ts';

function plan(n: number, at: number, mods: Partial<Modifiers> = {}) {
  const rng = createRngState(1);
  const ctx: RhythmCtx = { hrAt: () => 75, mods: { ...defaultModifiers(), hrvScale: 0, ...mods }, rng, hrv: drawHrvPhase(rng.hrv) };
  const st = createRhythmState('sinus', {}, 0, ctx);
  planUntil(st, at, ctx);
  st.physPvc = n;
  planUntil(st, at + 10, ctx);
  return { st, beats: st.records.filter((r): r is Beat => r.type === 'beat') };
}

describe('physiological PVCs on the ECG', () => {
  for (const n of [1, 2, 5]) {
    it(`${n} PVC${n > 1 ? 's' : ''} after the next sinus beat, wide, the run at ${PVC_RUN_RATE_BPM}/min, then sinus again`, () => {
      const { st, beats } = plan(n, 5);
      const pvcs = beats.filter((b) => b.template === 'pvc');
      expect(pvcs).toHaveLength(n);
      expect(st.physPvc).toBeUndefined(); // consumed once
      const i = beats.indexOf(pvcs[0] as Beat);
      expect(beats[i - 1]?.template).not.toBe('pvc');
      expect(beats[i - 1]!.t).toBeGreaterThanOrEqual(5);
      for (let k = 1; k < n; k++) expect(beats[i + k]!.t - beats[i + k - 1]!.t).toBeCloseTo(60 / PVC_RUN_RATE_BPM, 2);
      for (const p of pvcs) expect(p.qrsMs).toBeGreaterThanOrEqual(120);
      expect(beats[i + n]?.template).not.toBe('pvc');
    });
  }
  it('nothing is placed without a request (a resting sinus has no PVC)', () => {
    const rng = createRngState(1);
    const ctx: RhythmCtx = { hrAt: () => 75, mods: defaultModifiers(), rng, hrv: drawHrvPhase(rng.hrv) };
    const st = createRhythmState('sinus', {}, 0, ctx);
    planUntil(st, 120, ctx);
    expect(st.records.some((r) => r.type === 'beat' && r.template === 'pvc')).toBe(false);
    expect('physPvc' in st).toBe(false);
  });
  it("the instructor's PVC setting draws first: bigeminy overrides (the request waits for a free beat); with occasional PVCs it adds", () => {
    const big = plan(1, 5, { pvc: { pattern: 'bigeminy', probability: 0 } });
    expect(big.beats.filter((b) => b.t >= 5).map((b) => (b.template === 'pvc' ? 'V' : 'N')).join('')).toMatch(/^(NV)+N?$/);
    expect(big.st.physPvc).toBe(1);
    const count = (n: number) => plan(n, 5, { pvc: { pattern: 'single', probability: 0 } }).beats.filter((b) => b.template === 'pvc').length;
    expect(count(2)).toBe(2); // the instructor's setting draws none here: the request is placed
  });
});
