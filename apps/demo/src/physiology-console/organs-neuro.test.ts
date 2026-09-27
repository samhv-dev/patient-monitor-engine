import { describe, expect, it } from 'vitest';
import { groupOf, isInternal } from './organs.ts';

describe('Stage 7f paths in the physiology console (7x organ map)', () => {
  it('neuro machinery is internal; the published 7e fields, the resp hook and the outputs stay visible under Neuro', () => {
    for (const p of ['neuro.tof.nextT', 'neuro.last.x.brain.propofol', 'neuro.flags.aware', 'neuro.fasc.from', 'neuro.doseSeenT']) expect(isInternal(p)).toBe(true);
    for (const p of ['neuro.antinoc', 'neuro.nmb', 'neuro.thermoDepth', 'neuro.resp.veRest', 'neuro.outputs.cmro2Mult']) {
      expect(isInternal(p)).toBe(false);
      expect(groupOf(p)).toBe('neuro');
    }
    expect(isInternal('resp.spont.nextT')).toBe(true);
    expect(isInternal('resp.spont.paco2Set')).toBe(false);
  });
});
