import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { Command, EngineEvent } from '../../src/types.ts';

const cmd = (c: Record<string, unknown>, id = 'x'): Command => ({ id, issuedBy: 'test', ...c }) as Command;

describe('engine seams (Stage 5)', () => {
  it('setModifiers accepts every Stage 5 key and merges artefact levels key by key', () => {
    const e = createEngine({ seed: 3 });
    expect(e.dispatch(cmd({ type: 'setModifiers', modifiers: { bbb: 'rbbb', k: 6, artefact: { mains: 0.2 } } })).accepted).toBe(true);
    expect(e.dispatch(cmd({ type: 'setModifiers', modifiers: { artefact: { emg: 0.1 } } })).accepted).toBe(true);
    expect(e.dispatch(cmd({ type: 'setModifiers', modifiers: { tempC: 50 } })).reason).toMatch(/tempC/);
    e.advanceTo(2);
    const st = e.snapshot().state as { st: { mods: { artefact: { noise: number; mains: number; emg: number }; bbb: string } } };
    expect(st.st.mods.artefact).toMatchObject({ noise: 1, mains: 0.2, emg: 0.1 });
    expect(st.st.mods.bbb).toBe('rbbb');
  });

  it('every Stage 5 rhythm id is accepted and produces events without throwing', () => {
    const e = createEngine({ seed: 2 });
    const ev: EngineEvent[] = [];
    e.on((x) => ev.push(x));
    for (const [i, rhythm] of ['torsades', 'vtPoly', 'junctionalTachy', 'avb2to1', 'pacedVVI', 'vfCoarse', 'agonal'].entries()) {
      expect(e.dispatch(cmd({ type: 'setRhythm', rhythm }, `r${i}`)).accepted).toBe(true);
      e.advanceTo(5 * (i + 1));
    }
    expect(ev.filter((x) => x.type === 'measurement').length).toBeGreaterThan(30);
  });
});
