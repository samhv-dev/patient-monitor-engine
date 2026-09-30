// FU-4 Task 18g (E-FU4-18; FU-6's Request 3; D26): a non-finite scheduled time never crashes the engine for an
// operator and never passes silently in CI. (i) With finite rates the guard is inert: every rhythm's 60 s schedule
// (seed 7) is byte-identical to the fixture recorded BEFORE the guard was written (FNV-1a of the records' JSON).
// (ii) An injected NaN rate throws in the test environment, naming the clock and the sim time. (iii) With the test
// flag off it clamps, keeps stepping for 60 s and warns exactly once. The infant rig that first hit this
// (vent-infant.test.ts, Task 18d Step 2b) runs with the guard LOUD and passes — the dead-space root fix saved it, not
// the guard.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultModifiers } from '../../../src/modifiers.ts';
import { createRngState } from '../../../src/rng/sfc32.ts';
import { drawHrvPhase } from '../../../src/l2/ecg/hrv.ts';
import { createRhythmState, nonFiniteIsLoud, planUntil, type RhythmCtx } from '../../../src/l2/ecg/rhythm-engine.ts';
import { RHYTHMS } from '../../../src/l2/ecg/rhythms.ts';
import type { RhythmId } from '../../../src/types.ts';
import { runRhythm } from '../../helpers/rhythm.ts';

const fnv = (s: string) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
// recorded on a36578f (before the guard) with runRhythm(id, 60, { seed: 7 })
const FIXTURE: Record<string, string> = {"sinus":"51b630bc","sinusBrady":"a6442a4c","sinusTachy":"6adb8b9f","sinusArrhythmia":"53084148","sinusPause":"fe934c89","atrialTach":"aa806f26","mat":"0bb8bad0","afib":"e44bcd91","aflutter":"a25cf05f","svtAvnrt":"4f07b590","svtAvrt":"cb153dc0","wpwSinus":"931149c9","preexcitedAf":"83ca6f9d","junctionalEscape":"5f277786","junctionalAccel":"b958fb55","junctionalTachy":"4d081563","avb1":"dff23667","avb2Mobitz1":"c4f36488","avb2Mobitz2":"7b3c2874","avb2to1":"744fce1c","avbHighGrade":"dc1c8c93","avb3Narrow":"dda3f2a9","avb3Wide":"3126ade7","idioventricular":"db89ed8d","aivr":"a8f563c4","vtMono":"2648f677","vtPoly":"286c8063","torsades":"32fbd05e","vfCoarse":"49de5d33","vfFine":"afa83bdc","asystole":"741638a5","pWaveAsystole":"73e78d5f","agonal":"d9075744","pacedAAI":"4b99dc53","pacedVVI":"2b5c59f1","pacedDDD":"291a270e"};

function nanRig(id: RhythmId = 'sinus') {
  const rng = createRngState(7);
  let hr = 72;
  const ctx: RhythmCtx = { hrAt: () => hr, mods: defaultModifiers(), rng, hrv: drawHrvPhase(rng.hrv) };
  const st = createRhythmState(id, {}, 0, ctx);
  planUntil(st, 10, ctx);
  hr = NaN; // a physiological dead end upstream (e.g. a rate derived from a non-finite PaCO2)
  return { st, ctx };
}

describe('FU-4 18g: the non-finite scheduled-time guard', () => {
  const env = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = env; vi.restoreAllMocks(); });

  // The fixture was recorded on darwin-arm64 (a36578f, before the guard); the schedules are platform-dependent in the
  // last float bits (CI's Linux runner hashes preexcitedAf as 53cb9098 — measured on PR #25), so the byte-identity is
  // asserted where it was recorded, and everywhere the guard is proven inert by never firing (in the test environment
  // it throws) and by every scheduled instant being finite.
  it('is inert with finite rates: every rhythm schedules byte-identically to the pre-guard fixture (darwin, where recorded); the guard never fires', () => {
    const ids = Object.keys(RHYTHMS) as RhythmId[];
    expect(Object.keys(FIXTURE).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      const recs = runRhythm(id, 60, { seed: 7 }).st.records; // would throw here if the guard fired (NODE_ENV=test)
      expect(recs.every((r) => Number.isFinite((r as { t: number }).t))).toBe(true);
      if (process.platform === 'darwin') expect([id, fnv(JSON.stringify(recs))]).toEqual([id, FIXTURE[id]]);
    }
  });
  it('throws in the test environment with the value, the clock and the sim time', () => {
    expect(nonFiniteIsLoud()).toBe(true);
    const { st, ctx } = nanRig();
    expect(() => planUntil(st, 70, ctx)).toThrow(/rhythm sinus: next event time is NaN \(atria\.nextT, sim t [0-9.]+ s\)/);
  });
  it('outside tests it clamps, keeps stepping for 60 s and warns exactly once', () => {
    process.env.NODE_ENV = 'production';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { st, ctx } = nanRig();
    const n0 = st.records.length;
    for (let t = 11; t <= 70; t++) planUntil(st, t, ctx);
    expect(st.planT).toBe(70);
    expect(st.records.length).toBeGreaterThan(n0 + 30); // it kept beating (1/s at the fallback interval)
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/atria\.nextT/);
  });
});
