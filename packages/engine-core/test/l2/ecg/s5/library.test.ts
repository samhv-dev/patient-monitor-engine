import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../../../src/engine.ts';
import { ecgVocabulary } from '../../../../src/l2/ecg/vocabulary.ts';
import { RHYTHMS, RHYTHM_IDS } from '../../../../src/l2/ecg/rhythms.ts';
import { diffs, mean, run5, sd } from '../../../helpers/s5.ts';
import type { Command, RhythmId } from '../../../../src/types.ts';

/** Expected ventricular rate range (bpm) and max RR coefficient of variation per rhythm, at its default rate. */
const EXPECT: Record<RhythmId, { rate: [number, number]; cvMax: number } | 'none'> = {
  sinus: { rate: [60, 100], cvMax: 0.12 }, sinusBrady: { rate: [35, 59], cvMax: 0.12 }, sinusTachy: { rate: [101, 220], cvMax: 0.12 },
  sinusArrhythmia: { rate: [55, 90], cvMax: 0.35 }, sinusPause: { rate: [45, 80], cvMax: 0.6 },
  atrialTach: { rate: [150, 250], cvMax: 0.03 }, mat: { rate: [95, 155], cvMax: 0.3 }, afib: { rate: [85, 115], cvMax: 0.35 },
  aflutter: { rate: [140, 160], cvMax: 0.03 },
  svtAvnrt: { rate: [140, 280], cvMax: 0.03 }, svtAvrt: { rate: [150, 250], cvMax: 0.03 }, wpwSinus: { rate: [60, 100], cvMax: 0.12 },
  preexcitedAf: { rate: [160, 280], cvMax: 0.45 }, junctionalEscape: { rate: [40, 60], cvMax: 0.03 }, junctionalAccel: { rate: [60, 100], cvMax: 0.03 },
  junctionalTachy: { rate: [100, 180], cvMax: 0.03 },
  avb1: { rate: [60, 80], cvMax: 0.12 }, avb2Mobitz1: { rate: [45, 75], cvMax: 0.4 }, avb2Mobitz2: { rate: [45, 70], cvMax: 0.4 },
  avb2to1: { rate: [35, 45], cvMax: 0.12 }, avbHighGrade: { rate: [28, 38], cvMax: 0.12 }, avb3Narrow: { rate: [40, 60], cvMax: 0.05 },
  avb3Wide: { rate: [20, 40], cvMax: 0.05 },
  idioventricular: { rate: [20, 40], cvMax: 0.05 }, aivr: { rate: [40, 120], cvMax: 0.05 }, vtMono: { rate: [120, 250], cvMax: 0.03 },
  vtPoly: { rate: [150, 300], cvMax: 0.2 }, torsades: { rate: [195, 255], cvMax: 0.12 },
  vfCoarse: 'none', vfFine: 'none', asystole: 'none', pWaveAsystole: 'none',
  agonal: { rate: [4, 20], cvMax: 0.5 },
  pacedAAI: { rate: [65, 75], cvMax: 0.03 }, pacedVVI: { rate: [65, 75], cvMax: 0.03 }, pacedDDD: { rate: [65, 75], cvMax: 0.03 },
};

describe('rhythm library (acceptance 1)', () => {
  it('every RhythmId has a table row, a vocabulary entry and an expectation', () => {
    const v = ecgVocabulary();
    expect(RHYTHM_IDS).toHaveLength(36);
    expect(v.rhythms.map((r) => r.id).sort()).toEqual([...RHYTHM_IDS].sort());
    for (const id of RHYTHM_IDS) {
      expect(EXPECT[id]).toBeDefined();
      expect(v.groups).toContain(RHYTHMS[id].group);
    }
  });

  it.each(RHYTHM_IDS)('%s: rate and regularity within the brief §5 range over 40 seeds', (id) => {
    const e = EXPECT[id];
    for (let seed = 1; seed <= 40; seed++) {
      const { beats } = run5(id, id === 'agonal' ? 240 : 60, { seed, rhythmOpts: { autoAsystole: false } });
      if (e === 'none') {
        expect(beats.length).toBe(0);
        continue;
      }
      const rr = diffs(beats.slice(1).map((b) => b.t));
      const rate = 60 / mean(rr);
      expect(rate, `${id} seed ${seed}`).toBeGreaterThanOrEqual(e.rate[0]);
      expect(rate, `${id} seed ${seed}`).toBeLessThanOrEqual(e.rate[1]);
      expect(sd(rr) / mean(rr), `${id} seed ${seed}`).toBeLessThanOrEqual(e.cvMax);
    }
  });
});

describe('engine integration', () => {
  const cmd = (c: Record<string, unknown>, id: string): Command => ({ id, issuedBy: 'test', ...c }) as Command;

  it('accepts every Stage 5 modifier and rhythm through dispatch, and rejects out-of-range values', () => {
    const e = createEngine({ seed: 1 });
    expect(e.dispatch(cmd({ type: 'setRhythm', rhythm: 'torsades' }, 'a')).accepted).toBe(true);
    expect(e.dispatch(cmd({ type: 'setModifiers', modifiers: { st: { territory: 'inferior', mm: 2 }, bbb: 'lbbb', k: 6.8, artefact: { mains: 0.3 } } }, 'b')).accepted).toBe(true);
    expect(e.dispatch(cmd({ type: 'setModifiers', modifiers: { k: 12 } }, 'c')).reason).toMatch(/k must be/);
    expect(e.dispatch(cmd({ type: 'setModifiers', modifiers: { artefact: { cpr: { rateCpm: 300, depth: 1 } } } }, 'd')).accepted).toBe(false);
  });

  it('determinism: same seed and script → identical SHA-256 over 60 s of ecgII through VF, CPR, shock and pacing', () => {
    const script: Array<[number, Record<string, unknown>]> = [
      [5, { type: 'setRhythm', rhythm: 'vtMono' }],
      [12, { type: 'setRhythm', rhythm: 'vfCoarse' }],
      [20, { type: 'setModifiers', modifiers: { artefact: { cpr: { rateCpm: 110, depth: 0.6 } } } }],
      [35, { type: 'setModifiers', modifiers: { artefact: { cpr: null, shock: { atS: 35.5, energyJ: 200 } } } }],
      [38, { type: 'setRhythm', rhythm: 'pacedDDD' }],
      [48, { type: 'setModifiers', modifiers: { st: { territory: 'anterior', mm: 3 }, artefact: { mains: 0.2, emg: 0.3 } } }],
    ];
    const hashRun = (seed: number) => {
      const e = createEngine({ seed });
      const h = createHash('sha256');
      let from = 0;
      const out = new Float32Array(600);
      for (let t = 0.5; t <= 60 + 1e-9; t += 0.5) {
        for (const [at, c] of script) if (Math.abs(at - t) < 1e-9) e.dispatch(cmd(c, `c${at}`));
        e.advanceTo(t);
        const to = Math.round(t * 500);
        const n = e.readSamples('ecgII', from, out.subarray(0, to - from + 1));
        h.update(Buffer.from(out.buffer, 0, n * 4));
        from = to + 1;
      }
      return h.digest('hex');
    };
    expect(hashRun(42)).toBe(hashRun(42));
    expect(hashRun(42)).not.toBe(hashRun(43));
  });
});
