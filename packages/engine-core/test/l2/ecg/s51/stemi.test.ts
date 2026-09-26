import { describe, expect, it } from 'vitest';
import { fiducialOf } from '../../../../src/l2/ecg/beat-templates.ts';
import { ST_TERRITORIES } from '../../../../src/l2/ecg/morphology/st.ts';
import { createFilterState, designEcgFilter, filterSample } from '../../../../src/l3/ecg-filter.ts';
import { LEAD_IDS, type LeadId, type StTerritory } from '../../../../src/types.ts';
import { morphBeat, samples5 } from '../../../helpers/s5.ts';
import { beatQrs } from '../../../helpers/s51.ts';

// ST(J+60) is measured the clinical way: lead value at J + 60 ms minus the PR-segment level (QRS onset − 20 ms), on
// 500 Hz lead samples through the DIAGNOSTIC filter (0.05–150 Hz, the ST-analysis bandwidth), as the change against
// the same seed without the modifier (so the normal ST/T level cancels). J and the onset come from the tangent QRS.
const k0 = morphBeat({});
const q0 = beatQrs(k0, fiducialOf(k0));
const J_AFTER_R = q0.off - fiducialOf(k0);
const ON_AFTER_R = q0.on - fiducialOf(k0);
const diag = (x: Float64Array) => {
  const sec = designEcgFilter('diagnostic', 500, 50);
  const s = createFilterState(sec);
  return x.map((v) => filterSample(sec, s, v));
};
const quiet = { artefact: { noise: 0 } };
const base = samples5('sinus', 20, LEAD_IDS, { seed: 1, mods: quiet });

function deltaSt(territory: StTerritory, mm: number): (l: LeadId) => number {
  const r = samples5('sinus', 20, LEAD_IDS, { seed: 1, mods: { ...quiet, st: { territory, mm } } });
  const beats = r.beats.filter((b) => b.t > 12 && b.t < 19);
  return (l) => {
    const a = diag(r.lead[l]!);
    const b = diag(base.lead[l]!);
    const d = beats.map((bt) => {
      const j = Math.round((bt.t + J_AFTER_R + 0.06) * 500);
      const p = Math.round((bt.t + ON_AFTER_R - 0.02) * 500);
      return a[j]! - a[p]! - (b[j]! - b[p]!);
    });
    return d.reduce((s, v) => s + v, 0) / d.length;
  };
}

describe('Stage 5.1 STEMI magnitude (measured at J+60 on the generated leads)', () => {
  it.each(Object.keys(ST_TERRITORIES) as StTerritory[])('%s 2 mm: every index lead 0.2 ± 0.02 mV, reciprocal leads ≤ −0.05 mV', (territory) => {
    const ter = ST_TERRITORIES[territory];
    const st = deltaSt(territory, 2);
    for (const l of ter.leads) expect(Math.abs(st(l) - ter.sign * 0.2)).toBeLessThanOrEqual(0.02);
    for (const l of ter.recip) expect(st(l)).toBeLessThanOrEqual(-0.05);
  });

  it('scales with mm: inferior 3 mm (the demo default) reads 0.3 ± 0.03 mV in II/III/aVF', () => {
    const st = deltaSt('inferior', 3);
    for (const l of ['ecgII', 'ecgIII', 'aVF'] as const) expect(Math.abs(st(l) - 0.3)).toBeLessThanOrEqual(0.03);
  });
});
