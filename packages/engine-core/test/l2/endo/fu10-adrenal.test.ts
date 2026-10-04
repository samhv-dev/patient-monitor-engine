// FU-10 Task A6 (E10, E13): etomidate suppresses the adrenal's cortisol RESPONSE for hours; adrenal insufficiency is a
// BASAL deficit and cortisol below basal costs resting vascular tone (permissive effect, below basal only).
import { describe, expect, it } from 'vitest';
import { cortBasalF, cortResponseOf, createEndoCore, NEUTRAL_ENDO_INPUTS, stepEndoCore, DEFAULT_ENDO_PROFILE } from '../../../src/l2/endo/core.ts';
import { stressEffects } from '../../../src/l2/endo/effects.ts';
import { createHormones } from '../../../src/l2/endo/hormones.ts';
import { CORT_BASAL, ETOM_SUPPR_T12_S } from '../../../src/l2/endo/params.ts';

const AI = { ...DEFAULT_ENDO_PROFILE, adrenalInsufficiency: true };
const NB = { hr: 0, c: 0 };

describe('FU-10 E10/E13: etomidate and adrenal insufficiency (Wagner 1984; Absalom 1999; Annane 2017)', () => {
  it('cortResponseOf: 1 normal, 0.5 adrenal insufficiency, 0.4 after a full etomidate suppression, 0.2 for both', () => {
    const n = createEndoCore();
    const a = createEndoCore(AI);
    expect(cortResponseOf(n)).toBe(1);
    expect(cortResponseOf(a)).toBe(0.5);
    n.etomSuppr = 1;
    a.etomSuppr = 1;
    expect(cortResponseOf(n)).toBeCloseTo(0.4, 9);
    expect(cortResponseOf(a)).toBeCloseTo(0.2, 9);
  });
  it('the etomidate suppression halves in ETOM_SUPPR_T12_S (8 h)', () => {
    const c = createEndoCore();
    c.etomSuppr = 1;
    for (let s = 0; s < ETOM_SUPPR_T12_S; s += 60) stepEndoCore(c, NEUTRAL_ENDO_INPUTS, 60);
    expect(c.etomSuppr).toBeCloseTo(0.5, 2);
  });
  it('adrenal insufficiency starts at a low basal cortisol; below basal the SVR falls; a HIGH cortisol never raises it', () => {
    expect(cortBasalF(AI)).toBe(0.5);
    expect(createEndoCore(AI).hormones.cort).toBeCloseTo(0.5 * CORT_BASAL, 9);
    const low = stressEffects(createHormones(0.5), NB, 0.5);
    const normal = stressEffects(createHormones(1), NB, 1);
    const high = stressEffects({ ...createHormones(1), cort: 4 * CORT_BASAL }, NB, 1);
    expect(low.svrF).toBeLessThan(1);
    expect(normal.svrF).toBe(1);
    expect(high.svrF).toBe(1);
  });
});
