import { describe, expect, it } from 'vitest';
import { createL1State } from '../../../src/l1/state.ts';
import { NO_DRUGS } from '../../../src/l2/brain/flow.ts';
import { brainParams, createBrain } from '../../../src/l2/brain/model.ts';
import { createHemoState } from '../../../src/l2/hemo/pipeline.ts';
import { applyOrganEffects, createEffects } from '../../../src/l2/organs/effects.ts';
import { createRespState } from '../../../src/l2/resp/pipeline.ts';

describe('brain → body effects (decision 4)', () => {
  it('MANUAL: the surge rides on the coupled pressures idempotently, HR follows, and both are undone', () => {
    const l1 = createL1State();
    const hemo = createHemoState(undefined, l1, 80);
    const resp = createRespState(undefined, l1, 1);
    const b = createBrain(brainParams(), { map: 90, cvp: 6, paco2: 40, pao2: 100, sao2: 0.97, hb: 14, tempC: 37, drugs: NO_DRUGS });
    let hr = 80;
    const ctx = { l1, hemo, resp, hrNow: () => hr, setHr: (x: number) => { hr = x; } };
    const e = createEffects();
    b.cush.drive = 1;
    applyOrganEffects(e, b, ctx, 1);
    applyOrganEffects(e, b, ctx, 1.1); // twice: no double counting
    expect(l1.coupled?.sbp).toBeCloseTo(120 + 1.3 * 40, 6); // CUSH_DMAP 40 at full drive
    expect(l1.coupled?.dbp).toBeCloseTo(80 + 0.85 * 40, 6);
    expect(hr).toBeCloseTo(48, 6);
    expect((resp.driver as { ataxia?: number }).ataxia).toBe(1);
    b.cush.drive = 0;
    applyOrganEffects(e, b, ctx, 2);
    expect(l1.coupled?.sbp).toBeUndefined();
    expect(hr).toBe(80);
    expect((resp.driver as { ataxia?: number }).ataxia).toBe(0);
  });
  it('MODELED: the surge goes into 7a\'s circ.ext.rSysF (R48) even though ext has no such key yet (addendum 14); HR is the baroreflex\'s', () => {
    const l1 = createL1State();
    l1.mode = 'modeled';
    const hemo = createHemoState(undefined, l1, 80);
    const resp = createRespState(undefined, l1, 1);
    const b = createBrain(brainParams(), { map: 90, cvp: 6, paco2: 40, pao2: 100, sao2: 0.97, hb: 14, tempC: 37, drugs: NO_DRUGS });
    const ext = hemo.circ.ext;
    expect(ext.rSysF).toBeUndefined(); // 7a's initialiser omits the optional key
    b.cush.drive = 1;
    applyOrganEffects(createEffects(), b, { l1, hemo, resp, hrNow: () => 80, setHr: () => {} }, 1);
    expect(ext.rSysF).toBeCloseTo(2.2, 9);
    expect(ext.hrF).toBeUndefined();
    l1.mode = 'manual';
    b.cush.drive = 0;
    applyOrganEffects(createEffects(), b, { l1, hemo, resp, hrNow: () => 80, setHr: () => {} }, 2);
    expect(ext.rSysF).toBeUndefined(); // neutral again in MANUAL
    expect(l1.coupled?.sbp).toBeUndefined();
  });
});
