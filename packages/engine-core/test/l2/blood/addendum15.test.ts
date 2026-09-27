// R51 addendum 15, the 7c side of the six sibling rulings: (5) CO0 = the circuit's settled resting CO (fallback
// 7a's ref.co); (1) haemorrhage accounting, so 7a's bleed test can assert the event's volume exactly; (4) a test-only
// seam that pins the published hbfRel.
import { describe, expect, it } from 'vitest';
import { createL1State } from '../../../src/l1/state.ts';
import { CO0_SETTLE_S, advanceBlood, applyBloodCommand, createBloodState } from '../../../src/l2/blood/pipeline.ts';
import { CI_LPM_PER_KG, CO_REF_LPM } from '../../../src/l2/gas/params.ts';
import { createRespState } from '../../../src/l2/resp/pipeline.ts';
import type { Command } from '../../../src/types.ts';

const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };
const ev = (event: Record<string, unknown>) => ({ id: 'x', issuedBy: 't', type: 'applyEvent', event }) as Command;
/** A unit rig with a duck-typed 7a circuit (ref.co 5.54) whose running CO the test sets through Stage 3's coRatio. */
function rig(coLpmCirc: number, pk?: unknown) {
  const l1 = createL1State(MAN);
  const rs = createRespState(MAN, l1, 1);
  const bs = createBloodState(MAN);
  const circ = { t: 0, vol: [] as { rate: number; until: number }[], ext: {}, ref: { co: 5.54 } };
  const toGas = (lpm: number) => (lpm / CO_REF_LPM) * CI_LPM_PER_KG * rs.pat.effKg; // circuit L/min → gas-model flow units
  rs.coRatio = coLpmCirc / CO_REF_LPM;
  return { rs, bs, circ, toGas, ctx: { resp: rs, hemo: { circ }, l1, ...(pk ? { pk } : {}) } };
}
/** Advance keeping Stage 3's coRatio (the rig has no gas step to recompute it). */
const run = (r: ReturnType<typeof rig>, t: number) => advanceBlood(r.bs, r.ctx, t);

describe('R51 addendum 15 — 7c side', () => {
  it('(5) CO0 settles on the circuit’s own resting CO (not ref.co) and is latched after the settle window', () => {
    const r = rig(6.4); // an awake rig runs ≈ +15 % above 7a's stabilised ref.co
    run(r, 1);
    expect(r.bs.core.co0).toBeCloseTo(r.toGas(5.54), 1); // starts at the ref.co fallback
    run(r, CO0_SETTLE_S + 1);
    expect(r.bs.rest.latched).toBe(true);
    expect(r.bs.core.co0).toBeCloseTo(r.toGas(6.4), 2);
    expect(r.bs.out.hbfRel).toBeCloseTo(1, 2); // at rest the hepatic flow is 1, whatever the rig
    r.rs.coRatio = 4.8 / CO_REF_LPM; // later falls in CO are real falls
    run(r, CO0_SETTLE_S + 30);
    expect(r.bs.core.co0).toBeCloseTo(r.toGas(6.4), 2);
    expect(r.bs.out.hbfRel).toBeCloseTo((4.8 / 6.4) ** 2, 2);
  });
  it('(5) a perturbation latches the reference early: a bleed, or any 7g drug on the bus', () => {
    const r = rig(6.4);
    run(r, 30);
    const co0 = r.bs.core.co0;
    expect(applyBloodCommand(r.bs, ev({ kind: 'bleed', volumeMl: 500, overS: 60 }), 30, r.rs)).toBe(true);
    expect(r.bs.rest.latched).toBe(true);
    r.rs.coRatio = 5 / CO_REF_LPM;
    run(r, 60);
    expect(r.bs.core.co0).toBe(co0);
    const lab = rig(6.4);
    applyBloodCommand(lab.bs, ev({ kind: 'lab', panel: 'abg' }), 0, lab.rs);
    expect(lab.bs.rest.latched).toBe(false); // a blood draw perturbs nothing
    const drug = rig(6.4, { bus: { doses: [], metabolic: { kShift: 0 }, agents: { propofol: {} }, volatiles: {} } });
    run(drug, 5);
    expect(drug.bs.rest.latched).toBe(true);
  });
  it('(5) without a circuit the reference stays CI × weight (unit rigs)', () => {
    const l1 = createL1State(MAN);
    const rs = createRespState(MAN, l1, 1);
    const bs = createBloodState(MAN);
    const co0 = bs.core.co0;
    advanceBlood(bs, { resp: rs, hemo: {}, l1 }, CO0_SETTLE_S + 5);
    expect(bs.core.co0).toBe(co0);
  });
  it('(1) haemorrhage accounting: the event removes exactly 500.0 mL; the circuit gets 500 − refill', () => {
    const r = rig(5.54);
    run(r, 5);
    applyBloodCommand(r.bs, ev({ kind: 'bleed', volumeMl: 500, overS: 60 }), 5, r.rs);
    const bled0 = r.bs.core.bledMl;
    const net0 = r.bs.circNetMl;
    run(r, 70);
    const pushed = r.circ.vol.reduce((s, v) => s + v.rate * 0.1, 0); // every push is a 100 ms event
    expect(r.bs.core.bledMl - bled0).toBeCloseTo(500, 6);
    const refill = r.bs.circNetMl - net0 + (r.bs.core.bledMl - bled0);
    expect(refill).toBeGreaterThan(0);
    expect(refill).toBeLessThan(10);
    expect(pushed).toBeCloseTo(r.bs.circNetMl, 3);
  });
  it('(4) test seam: pinHbfRel fixes the published hbfRel (7g reads it); unset = live flow scaling', () => {
    const r = rig(6.4);
    run(r, CO0_SETTLE_S + 1);
    r.rs.coRatio = 4.0 / CO_REF_LPM;
    run(r, CO0_SETTLE_S + 10);
    expect(r.bs.out.hbfRel).toBeLessThan(0.5);
    r.bs.pinHbfRel = 1;
    run(r, CO0_SETTLE_S + 11);
    expect(r.bs.out.hbfRel).toBe(1);
  });
});
