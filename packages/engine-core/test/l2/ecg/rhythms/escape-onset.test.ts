// An escape or accelerated focus starts at its own interval after the last ventricular beat (owner report 2026-10-30,
// scratch review owner-oct30-findings §2). Physiology: a subsidiary pacemaker (A-V junction 40–60/min, Purkinje
// 15–40/min) is discharged by every sinus impulse before it reaches its own threshold, so it can fire only when the
// ventricle has been silent for longer than its own cycle (an escape), or when it is faster than the sinus (an
// accelerated, "ectopic" pacemaker) — and then its first beat still comes one of its own cycles after the last
// discharge. Guyton AC, Hall JE, Textbook of Medical Physiology, ch. 10 "Rhythmical Excitation of the Heart",
// sections "The Sinus Node as the Pacemaker of the Heart" and "Abnormal Pacemakers — 'Ectopic' Pacemaker" (the A-V
// block case adds a further 5–20 s of overdrive suppression, not modelled here). Before the fix every focus started
// max(switch + 50 ms, refractory end + 10 ms): the first junctional "escape" came 0.48 s after the last sinus beat, the
// first idioventricular one 0.41 s — on screen a premature beat, then a pause.
// VT, SVT and torsades take over at once (re-entry / triggered activity, not a subsidiary pacemaker) and keep that
// onset; the AV-block escapes run on their own escape timer. Both are pinned at the values measured before the fix.
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent } from '../../../../src/index.ts';
import { TICK_MS } from '../../../../src/clock/clock.ts';
import { RHYTHMS } from '../../../../src/l2/ecg/rhythms.ts';
import type { RhythmId } from '../../../../src/types.ts';

const SWITCH_T = 10;
const TICK_S = TICK_MS / 1000;
const SEEDS = [7, 8, 9] as const;

/** Sinus at 75 for 10 s, then `rhythm`; the last beat before the new rhythm's first, and the beats from it on. */
function switchTo(rhythm: RhythmId, seed: number): { last: number; first: number; after: number[] } {
  const e = createEngine({ seed, patient: { rhythm: { id: 'sinus' } } });
  const beats: { t: number; origin: string }[] = [];
  e.on((ev: EngineEvent) => {
    if (ev.type === 'beat') beats.push({ t: ev.t, origin: ev.origin });
  });
  e.advanceTo(SWITCH_T);
  e.dispatch({ id: 'r', issuedBy: 'test', type: 'setRhythm', rhythm } as Command);
  e.advanceTo(SWITCH_T + 25);
  const i = beats.findIndex((b) => b.t >= SWITCH_T && b.origin !== 'sinus');
  return { last: beats[i - 1]!.t, first: beats[i]!.t, after: beats.slice(i, i + 7).map((b) => b.t) };
}

describe('escape / accelerated focus onset after a rhythm switch', () => {
  // The junctional focus fires its retrograde P′ at the focus time and the QRS 80 ms later (foci-junctional.ts), so the
  // first junctional QRS may come up to that much beyond the interval
  const JUNCTIONAL_PR_S = 0.08;
  it.each(['junctionalEscape', 'junctionalAccel', 'idioventricular', 'aivr'] as const)(
    '%s: the first focus beat comes one focus interval (60/rate) after the last sinus beat, within one tick, seeds 7–9',
    (id) => {
      const interval = 60 / RHYTHMS[id].defaultRateBpm;
      for (const seed of SEEDS) {
        const r = switchTo(id, seed);
        const gap = r.first - r.last;
        expect(gap, `seed ${seed}`).toBeGreaterThanOrEqual(interval - TICK_S);
        expect(gap, `seed ${seed}`).toBeLessThanOrEqual(interval + JUNCTIONAL_PR_S + TICK_S);
      }
    },
  );

  it.each(['junctionalEscape', 'junctionalAccel', 'idioventricular', 'aivr'] as const)('%s: the steady-state cycle stays 60/rate', (id) => {
    const interval = 60 / RHYTHMS[id].defaultRateBpm;
    for (const seed of SEEDS) {
      const t = switchTo(id, seed).after;
      for (let k = 1; k < t.length; k++) expect(Math.abs(t[k]! - t[k - 1]! - interval), `seed ${seed} beat ${k}`).toBeLessThan(TICK_S);
    }
  });

  // Measured on main (6d19b8b3) before the fix: the gap from the last sinus beat to the first focus / escape beat (s)
  it.each([
    ['vtMono', [0.40724, 0.40864, 0.40838]],
    ['vtPoly', [0.40724, 0.40864, 0.40838]],
    ['torsades', [0.40724, 0.40864, 0.40838]],
    ['svtAvnrt', [0.39724, 0.39864, 0.39838]],
    ['svtAvrt', [0.39724, 0.39864, 0.39838]],
    ['junctionalTachy', [0.47724, 0.47864, 0.47838]],
    ['avb3Narrow', [1.63999, 1.59721, 1.676]],
    ['avb3Wide', [2.19166, 2.14887, 2.22767]],
  ] as const)('%s: onset unchanged (seeds 7–9)', (id, gaps) => {
    SEEDS.forEach((seed, k) => {
      const r = switchTo(id, seed);
      expect(Math.abs(r.first - r.last - gaps[k]!), `seed ${seed}`).toBeLessThan(1e-4);
    });
  });
});
