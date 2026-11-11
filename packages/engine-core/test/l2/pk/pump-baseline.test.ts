// Pump-rack S0 (docs/plans/pump-rack-tci.md §13 "S0: Baseline"): what the engine's infusion and TCI do TODAY, pinned so
// that each later piece of the plan changes it knowingly. Every test names the piece that will change it and why. These
// tests describe present behaviour, not intended behaviour: the plan's §1.3 calls today's TCI an oracle. Since E2 the two
// rows E2 was named for pin E2's behaviour instead, each saying what it pinned before.
import { describe, expect, it } from 'vitest';
import { advancePk, applyPkCommand, createPkState, NEUTRAL_PK_CTX, type PkCtx, type PkState } from '../../../src/l2/pk/pipeline.ts';
import { cp } from '../../../src/l2/pk/compartment.ts';
import { eleveldPropofol, schniderPropofol } from '../../../src/l2/pk/models.ts';
import type { Command } from '../../../src/types.ts';

const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event }) as unknown as Command;
const REF = { ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' as const };

/** A propofol state with the cardiac-output ratio pinned at 1 [ENG: test] (the test-only seam), so the parameters are
 * the model's own and only the clearance factor moves them. */
function pinned(): PkState {
  const pk = createPkState(REF);
  pk.pinDistQ = 1;
  return pk;
}

describe('pump-rack S0 baseline: today\'s infusion and TCI', () => {
  // Pinned before E2: pipeline.ts applyPkCommand (`if (ev.model) d.model = ev.model`) and baseParams (`inst.model ??
  // row.pk.model`) — a `tci` with model schnider turned the PATIENT into a Schnider patient. CHANGED BY E2 (plan §6.3
  // item 2, decision D3): the plant no longer takes the TCI event's `model`; the set drives the PUMP's prediction only,
  // and the patient keeps the row's own model (Eleveld for propofol). Pins E2's behaviour now.
  it('a `tci` with model schnider leaves the PATIENT an Eleveld patient; the set is the pump\'s (E2, D3)', () => {
    const a = pinned();
    const b = pinned();
    applyPkCommand(b, ev({ kind: 'tci', drugId: 'propofol', model: 'schnider', mode: 'effect', target: 3 }), 0);
    applyPkCommand(b, ev({ kind: 'tci', drugId: 'propofol', model: 'schnider', mode: 'effect', target: 0 }), 0);
    expect(b.drugs.propofol!.tci).toBeNull();
    expect(b.drugs.propofol!.pred!.setId).toBe('schnider'); // the pump's set
    for (const pk of [a, b]) applyPkCommand(pk, ev({ kind: 'infusion', drugId: 'propofol', rate: 60, unit: 'mL/h' }), 0);
    advancePk(a, NEUTRAL_PK_CTX, 600);
    advancePk(b, NEUTRAL_PK_CTX, 600);
    // The same 10 mg/min for 10 min into the same Eleveld patient: the same state
    expect(b.drugs.propofol!.x).toEqual(a.drugs.propofol!.x);
    expect(cp(eleveldPropofol(REF), b.drugs.propofol!.x)).not.toBeCloseTo(cp(schniderPropofol(REF), b.drugs.propofol!.x), 1);
  });

  // Pins pipeline.ts applyPkCommand `infusion`: one DrugInst per drug id, one `rate`, set (not added) by each event.
  // CHANGED BY E1 (plan §6.3 item 3, decisions D4 and D5): pump channels carry their own rates and the drug instance's
  // rate becomes the channel-less rate plus the channels' rates, so two channels of one drug ADD.
  it('two `infusion` events of one drug leave one rate: the second replaces the first', () => {
    const pk = pinned();
    applyPkCommand(pk, ev({ kind: 'infusion', drugId: 'propofol', rate: 20, unit: 'mL/h' }), 0);
    applyPkCommand(pk, ev({ kind: 'infusion', drugId: 'propofol', rate: 30, unit: 'mL/h' }), 0);
    // 30 mL/h × 10 mg/mL (the row's syringe) ÷ 60 = 5 mg/min, not (20 + 30) × 10 ÷ 60
    expect(pk.drugs.propofol!.rate).toBeCloseTo(5, 12);
  });

  // Pins pipeline.ts applyPkCommand `tci`: maxRate = (maxRateMlH ?? 1200) × (row.syringePerMl ?? 10) ÷ 60, whatever
  // syringe the drug last ran from. CHANGED BY E1/E2 (plan §1.1 row "The TCI maximum rate", decision D4): a pump
  // channel carries its own loaded concentration, and the TCI limit is that channel's mL/h × its concentration.
  it('the TCI maximum rate uses the row\'s default syringe (propofol 10 mg/mL), not the syringe last loaded', () => {
    const pk = pinned();
    // A 20 mg/mL syringe ran first; the TCI event that follows ignores it
    applyPkCommand(pk, ev({ kind: 'infusion', drugId: 'propofol', rate: 10, unit: 'mL/h', concentration: { amount: 20, unit: 'mg', perMl: 1 } }), 0);
    expect(pk.drugs.propofol!.rate).toBeCloseTo((10 * 20) / 60, 12);
    applyPkCommand(pk, ev({ kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3, maxRateMlH: 600 }), 0);
    expect(pk.drugs.propofol!.tci!.maxRate).toBeCloseTo((600 * 10) / 60, 12); // 100 mg/min, not 200
    applyPkCommand(pk, ev({ kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3 }), 0);
    expect(pk.drugs.propofol!.tci!.maxRate).toBeCloseTo((1200 * 10) / 60, 12); // the default 1200 mL/h
  });

  // Pinned before E2: pipeline.ts stepOnce `tciRate(params(pk, row, d), d.x, …)` — the controller predicted with the
  // patient's own state and clearance factor, so the rate fell by about the clearance ratio and the patient's Ce stayed
  // on target (the oracle of plan §1.3). CHANGED BY E2 (decision D3, PQ5 = A): the pump predicts from its own state and
  // set with the typed covariates, blind to the patient, so a halved liver flow leaves the pump's rate unchanged and
  // raises the patient's true Ce above target (plan §12 review focus 2; test/l2/pk/pump-tci.test.ts). E2 also
  // re-records the self-referential long-run row (test/engine/pk-longrun.test.ts) for the same cause.
  it('the TCI rate no longer follows the patient\'s clearance factor, and the patient\'s Ce rises above the target (E2, D3)', () => {
    const half: PkCtx = { ...NEUTRAL_PK_CTX, hepFlow: 0.5 };
    const a = pinned();
    const b = pinned();
    for (const pk of [a, b]) applyPkCommand(pk, ev({ kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3 }), 0);
    advancePk(a, NEUTRAL_PK_CTX, 1800);
    advancePk(b, half, 1800);
    expect(a.drugs.propofol!.factor).toBe(1);
    expect(b.drugs.propofol!.factor).toBe(0.7); // 0.6 hepatic × 0.5 + 0.4 other = 0.7
    // The pump has not seen the lower clearance: the same rate...
    expect(b.drugs.propofol!.rate).toBe(a.drugs.propofol!.rate);
    // ...and so the patient with the lower clearance is above the target the pump shows: the liver is now visible
    const ceA = a.drugs.propofol!.x[3] as number;
    const ceB = b.drugs.propofol!.x[3] as number;
    expect(ceA).toBeCloseTo(3, 2);
    expect(ceB).toBeGreaterThan(3.2);
  });
});
