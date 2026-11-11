// Pump-rack E2 (docs/plans/pump-rack-tci.md §13 "E2: The pump's own prediction", decision D3, the owner's PQ5 = A): a
// TCI pump doses from its OWN model of the patient — the chosen set, computed once from the patient data typed into the
// pump, stepped with what the pump believes it delivered — and never reads the patient. The patient responds through
// the engine's own PK. Each `it` below is one line of the plan's "Tests first" list, in its order, then the channel's
// transitions and the refusals. Rates and syringes are test inputs [ENG: test], not device numbers.
import { describe, expect, it } from 'vitest';
import { advancePk, applyPkCommand, createPkState, NEUTRAL_PK_CTX, validatePkCommand, type PkCtx, type PkState } from '../../../src/l2/pk/pipeline.ts';
import { cp, pkStep, pkSystem, zeroState, type PkParams } from '../../../src/l2/pk/compartment.ts';
import { eleveldPropofol, marshPropofol, schniderPropofol } from '../../../src/l2/pk/models.ts';
import { tciRate, TCI_DT_S, type TciMode } from '../../../src/l2/pk/tci.ts';
import { NO_KE0_REFUSAL, tciSet, type TciSet } from '../../../src/l2/pk/tci-sets/index.ts';
import { tciSetRefusal } from '../../../src/l2/pk/pump.ts';
import type { Command, EngineEvent } from '../../../src/types.ts';
import type { PumpChannel } from '../../../src/types-pk.ts';

const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event }) as unknown as Command;
const REF = { ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' as const };
const PROPOFOL_10 = { amount: 10, unit: 'mg', perMl: 1 };
const PUMP_PROPOFOL = (1200 * 10) / 60; // 1200 mL/h of 10 mg/mL = 200 mg/min (tci.ts: the published pumps' limit)
const HALF_LIVER: PkCtx = { ...NEUTRAL_PK_CTX, hepFlow: 0.5 };

function send(pk: PkState, event: Record<string, unknown>, t = pk.t): void {
  const why = validatePkCommand(ev(event), pk);
  if (why !== undefined) throw new Error(`refused: ${why}`);
  expect(applyPkCommand(pk, ev(event), t)).toBe(true);
}
const refused = (pk: PkState, event: Record<string, unknown>) => validatePkCommand(ev(event), pk);
const chan = (pk: PkState, ch: number) => pk.pumps!.find((c) => c.ch === ch) as PumpChannel;
function pinned(patient = REF): PkState {
  const pk = createPkState(patient);
  pk.pinDistQ = 1; // the cardiac-output ratio pinned at 1 [ENG: test]: only what the test changes differs
  return pk;
}
/** A 100 mL syringe [ENG: test; larger than a pump's 50 mL, so no half-hour test runs it empty] of propofol 10 mg/mL on
 * channel `ch`, programmed the same, on TCI with the typed patient. */
function tciChannel(pk: PkState, o: { ch?: number; setId?: string; mode?: TciMode; target?: number; patient?: typeof REF; contents?: typeof PROPOFOL_10 } = {}): void {
  const ch = o.ch ?? 1;
  send(pk, { kind: 'pump', action: 'load', ch, channel: 'syringe', syringeMl: 100, contents: { drugId: 'propofol', concentration: o.contents ?? PROPOFOL_10, volumeMl: 100 } });
  send(pk, { kind: 'pump', action: 'program', ch, drugId: 'propofol', concentration: PROPOFOL_10 });
  send(pk, { kind: 'pump', action: 'tci', ch, setId: o.setId ?? 'eleveld', mode: o.mode ?? 'effect', target: o.target ?? 3, patient: o.patient ?? REF });
  send(pk, { kind: 'pump', action: 'start', ch });
}
/** The set's own controller on the set's own model alone (tci.test.ts's rig): the amount it gives in `s` seconds. */
function standalone(p: PkParams, mode: TciMode, target: number, maxRate: number, s: number): { amount: number; x: number[] } {
  const sys = pkSystem(p, 0.1);
  let x = zeroState(p);
  let rate = 0;
  let amount = 0;
  for (let k = 0; k < s * 10; k++) {
    if (k % (TCI_DT_S * 10) === 0) rate = tciRate(p, x, mode, target, maxRate);
    x = pkStep(sys, x, rate);
    amount += (rate * 0.1) / 60;
  }
  return { amount, x };
}
const drugsEvents = (pk: PkState) => pk.out.filter((e): e is Extract<EngineEvent, { type: 'drugs' }> => e.type === 'drugs');

describe('pump-rack E2: the pump predicts with its own model; the patient responds with the engine\'s', () => {
  // Plan §12 review focus 2, both forms: the channel-less `tci` (the instructor's Drug sheet, the cards) and a channel
  it('the patient\'s clearance halved: the pump\'s rate is unchanged and the patient\'s Ce is higher (channel-less TCI)', () => {
    const a = pinned();
    const b = pinned();
    for (const pk of [a, b]) send(pk, { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3 }, 0);
    advancePk(a, NEUTRAL_PK_CTX, 1800);
    advancePk(b, HALF_LIVER, 1800);
    expect(b.drugs.propofol!.factor).toBe(0.7); // 0.6 hepatic × 0.5 + 0.4 other: the patient's clearance is lower
    expect(b.drugs.propofol!.rate).toBe(a.drugs.propofol!.rate); // the pump never saw it
    expect(b.drugs.propofol!.total).toBeCloseTo(a.drugs.propofol!.total, 9);
    expect(b.drugs.propofol!.pred!.x).toEqual(a.drugs.propofol!.pred!.x); // the same prediction
    const ceA = a.drugs.propofol!.x[3] as number;
    const ceB = b.drugs.propofol!.x[3] as number;
    expect(ceA).toBeCloseTo(3, 2); // a patient identical to the set: on target
    expect(ceB).toBeGreaterThan(3.2); // the patient with the lower clearance: above the target the pump still shows
    expect(b.drugs.propofol!.pred!.x[3]).toBeCloseTo(3, 2); // what the pump shows
  });

  it('the patient\'s clearance halved: the same on a pump channel', () => {
    const a = pinned();
    const b = pinned();
    tciChannel(a);
    tciChannel(b);
    advancePk(a, NEUTRAL_PK_CTX, 1800);
    advancePk(b, HALF_LIVER, 1800);
    expect(chan(b, 1).rateMlH).toBe(chan(a, 1).rateMlH);
    expect(chan(b, 1).infusedMl).toBeCloseTo(chan(a, 1).infusedMl, 9);
    expect(chan(b, 1).pred!.x).toEqual(chan(a, 1).pred!.x);
    expect(a.drugs.propofol!.x[3]).toBeCloseTo(3, 2);
    expect(b.drugs.propofol!.x[3]).toBeGreaterThan(3.2);
  });

  it('a wrong weight typed into the pump changes the dose and not the patient', () => {
    const right = pinned();
    const wrong = pinned();
    tciChannel(right);
    tciChannel(wrong, { patient: { ...REF, weightKg: 100 } }); // the 70 kg patient typed as 100 kg
    advancePk(right, NEUTRAL_PK_CTX, 1800);
    advancePk(wrong, NEUTRAL_PK_CTX, 1800);
    // The dose is the set's own for each typed patient (the standalone controller on that patient's parameters)
    const exp = (w: number) => standalone(eleveldPropofol({ ...REF, weightKg: w }), 'effect', 3, PUMP_PROPOFOL, 1800).amount;
    expect(chan(right, 1).infusedMl * 10).toBeCloseTo(exp(70), 6);
    expect(chan(wrong, 1).infusedMl * 10).toBeCloseTo(exp(100), 6);
    expect(chan(wrong, 1).infusedMl).toBeGreaterThan(1.2 * chan(right, 1).infusedMl);
    // The patient is the same 70 kg patient in both: the pump's prediction says 3, the patient's Ce is higher
    expect(wrong.patient.weightKg).toBe(70);
    expect(chan(wrong, 1).pred!.x[3]).toBeCloseTo(3, 2);
    expect(wrong.drugs.propofol!.x[3]).toBeGreaterThan(3.3);
    expect(right.drugs.propofol!.x[3]).toBeCloseTo(3, 2);
  });

  it('two sets for the same target give the dose difference the sets\' own equations give (Eleveld and Schnider, Ce 3)', () => {
    const el = pinned();
    const sc = pinned();
    tciChannel(el, { setId: 'eleveld' });
    tciChannel(sc, { setId: 'schnider' });
    advancePk(el, NEUTRAL_PK_CTX, 600);
    advancePk(sc, NEUTRAL_PK_CTX, 600);
    const eExp = standalone(eleveldPropofol(REF), 'effect', 3, PUMP_PROPOFOL, 600);
    const sExp = standalone(schniderPropofol(REF), 'effect', 3, PUMP_PROPOFOL, 600);
    expect(chan(el, 1).infusedMl * 10).toBeCloseTo(eExp.amount, 6);
    expect(chan(sc, 1).infusedMl * 10).toBeCloseTo(sExp.amount, 6);
    expect(chan(sc, 1).infusedMl * 10 - chan(el, 1).infusedMl * 10).toBeCloseTo(sExp.amount - eExp.amount, 6);
    expect(Math.abs(sExp.amount - eExp.amount)).toBeGreaterThan(5); // a real difference, not rounding
    // ...and the pump's prediction is the set's own state
    for (let i = 0; i < 4; i++) expect(chan(sc, 1).pred!.x[i]).toBeCloseTo(sExp.x[i] as number, 9);
    // The patient is Eleveld in both (the row's model): the Schnider pump's patient is not on the Schnider target
    expect(sc.drugs.propofol!.x.length).toBe(el.drugs.propofol!.x.length);
    expect(Math.abs((sc.drugs.propofol!.x[3] as number) - 3)).toBeGreaterThan(0.05);
  });

  it('a set without ke0 refuses effect mode (the registry\'s words); plasma mode stays', () => {
    const noKe0 = { ...(tciSet('marsh') as TciSet), meta: { ...(tciSet('marsh') as TciSet).meta, ke0: { none: true as const } } };
    expect(tciSetRefusal(noKe0, 'propofol', 'effect')).toBe(NO_KE0_REFUSAL);
    expect(tciSetRefusal(noKe0, 'propofol', 'plasma')).toBeUndefined();
    expect(tciSetRefusal(tciSet('marsh')!, 'propofol', 'effect')).toBeUndefined(); // Marsh carries its device ke0
    expect(tciSetRefusal(tciSet('minto')!, 'propofol', 'plasma')).toBe('minto is a remifentanil set, not propofol');
  });

  it('plasma and effect targeting on the pump\'s state match tci.ts on a patient identical to the set', () => {
    for (const [setId, mode, target, f] of [['eleveld', 'effect', 3, eleveldPropofol], ['marsh', 'plasma', 4, marshPropofol]] as const) {
      const a = pinned();
      send(a, { kind: 'tci', drugId: 'propofol', model: setId, mode, target }, 0);
      const b = pinned();
      tciChannel(b, { setId, mode, target });
      advancePk(a, NEUTRAL_PK_CTX, 1200);
      advancePk(b, NEUTRAL_PK_CTX, 1200);
      const exp = standalone(f(REF), mode, target, PUMP_PROPOFOL, 1200);
      expect(a.drugs.propofol!.total).toBeCloseTo(exp.amount, 6);
      expect(b.drugs.propofol!.total).toBeCloseTo(exp.amount, 6);
      for (let i = 0; i < 4; i++) {
        expect(a.drugs.propofol!.pred!.x[i]).toBeCloseTo(exp.x[i] as number, 9);
        expect(chan(b, 1).pred!.x[i]).toBeCloseTo(exp.x[i] as number, 9);
      }
      // The patient is Eleveld (the row's model): on the Eleveld pump the patient IS the set, so the two states agree
      if (setId === 'eleveld') expect(a.drugs.propofol!.x).toEqual(a.drugs.propofol!.pred!.x);
    }
  });

  // The control the long-run row's re-recording rests on (pk-longrun.test.ts): the pump's covariates the patient's,
  // the patient's clearance and distribution factors pinned at 1 (the TEST-ONLY seams) — then over 6 h the patient's
  // state IS the pump's, whatever the context says. Every difference the long run shows is therefore the patient's
  // physiology, which the pump does not see.
  it('control: pump covariates identical to the patient and the factors pinned at 1 — the patient\'s state equals the pump\'s over 6 h', () => {
    const pk = pinned();
    pk.pinClFactor = 1;
    send(pk, { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 2.5 }, 0);
    for (let t = 600; t <= 6 * 3600; t += 600) {
      advancePk(pk, HALF_LIVER, t);
      const d = pk.drugs.propofol!;
      for (let i = 0; i < 4; i++) expect(Math.abs((d.x[i] as number) - (d.pred!.x[i] as number))).toBeLessThan(1e-12 * Math.max(1, Math.abs(d.x[i] as number)));
    }
    expect(pk.drugs.propofol!.x[3]).toBeCloseTo(2.5, 2);
  });

  it('the drugs event: the patient\'s row stays the patient\'s truth; the pump\'s prediction is its own row', () => {
    const pk = pinned();
    send(pk, { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3 }, 0);
    tciChannel(pk, { ch: 2, setId: 'schnider' });
    advancePk(pk, HALF_LIVER, 1800);
    const last = drugsEvents(pk).at(-1)!;
    const row = last.drugs.find((r) => r.id === 'propofol')!;
    const d = pk.drugs.propofol!;
    expect(row.ce).toBe(pk.lastC.propofol);
    expect(row.ce).toBeCloseTo(d.x[3] as number, 12); // DrugPanelRow: the patient
    expect(row.tci).toEqual({ mode: 'effect', target: 3, model: 'eleveld' });
    const pred = last.tciPumps!.find((r) => r.drugId === 'propofol')!;
    expect(pred).toMatchObject({ drugId: 'propofol', setId: 'eleveld', mode: 'effect', target: 3, unit: 'µg/mL' });
    expect(pred.ce).toBeCloseTo(d.pred!.x[3] as number, 12);
    expect(pred.cp).toBeCloseTo(cp(d.pred!.params, d.pred!.x), 12);
    expect(Math.abs(pred.ce - row.ce)).toBeGreaterThan(0.1); // two different things
    const ch = last.pumps!.find((c) => c.ch === 2)!;
    expect(ch.mode).toBe('tci');
    expect(ch.tci).toMatchObject({ setId: 'schnider', mode: 'effect', target: 3 });
    expect(ch.tci!.ce).toBeCloseTo(chan(pk, 2).pred!.x[3] as number, 12);
  });

  it('a run without TCI has no tciPumps list and its channels no prediction', () => {
    const pk = pinned();
    send(pk, { kind: 'infusion', drugId: 'propofol', rate: 30, unit: 'mL/h' }, 0);
    advancePk(pk, NEUTRAL_PK_CTX, 5);
    expect(drugsEvents(pk).at(-1)!.tciPumps).toBeUndefined();
  });
});

describe('pump-rack E2: the prediction is the pump\'s own record of what it gave', () => {
  it('the pump predicts with the PROGRAMME: a 20 mg/mL syringe programmed as 10 mg/mL doubles the patient\'s dose, not the prediction', () => {
    const ok = pinned();
    const mis = pinned();
    tciChannel(ok);
    tciChannel(mis, { contents: { amount: 20, unit: 'mg', perMl: 1 } });
    advancePk(ok, NEUTRAL_PK_CTX, 600);
    advancePk(mis, NEUTRAL_PK_CTX, 600);
    expect(chan(mis, 1).pred!.x).toEqual(chan(ok, 1).pred!.x); // the pump cannot tell
    expect(mis.drugs.propofol!.total).toBeCloseTo(2 * ok.drugs.propofol!.total, 9);
  });

  it('the maximum rate is the channel\'s mL/h ceiling × the PROGRAMMED concentration', () => {
    const pk = pinned();
    send(pk, { kind: 'pump', action: 'load', ch: 1, channel: 'syringe', syringeMl: 50, contents: { drugId: 'propofol', concentration: PROPOFOL_10, volumeMl: 50 } });
    send(pk, { kind: 'pump', action: 'program', ch: 1, drugId: 'propofol', concentration: PROPOFOL_10 });
    send(pk, { kind: 'pump', action: 'tci', ch: 1, setId: 'eleveld', mode: 'effect', target: 6, patient: REF, maxRateMlH: 300 });
    send(pk, { kind: 'pump', action: 'start', ch: 1 });
    advancePk(pk, NEUTRAL_PK_CTX, 5);
    expect(chan(pk, 1).rateMlH).toBe(300); // 50 mg/min, the ceiling: a 6 µg/mL step asks for more
    expect(pk.drugs.propofol!.pumpRate).toBeCloseTo((300 * 10) / 60, 9);
  });

  it('a new target with the same set and patient keeps the prediction (no re-loading); target 0 stops and the prediction decays', () => {
    const pk = pinned();
    tciChannel(pk);
    advancePk(pk, NEUTRAL_PK_CTX, 600);
    const before = chan(pk, 1).pred!.x.slice();
    send(pk, { kind: 'pump', action: 'tci', ch: 1, setId: 'eleveld', mode: 'effect', target: 4, patient: REF });
    expect(chan(pk, 1).pred!.x).toEqual(before);
    advancePk(pk, NEUTRAL_PK_CTX, 1200);
    expect(chan(pk, 1).pred!.x[3]).toBeCloseTo(4, 2);
    send(pk, { kind: 'pump', action: 'tci', ch: 1, setId: 'eleveld', mode: 'effect', target: 0, patient: REF });
    expect(chan(pk, 1).mode).toBe('rate');
    advancePk(pk, NEUTRAL_PK_CTX, 1500);
    expect(chan(pk, 1).rateMlH).toBe(0);
    expect(chan(pk, 1).pred!.x[3]).toBeLessThan(3); // the pump keeps predicting the fall
    // Restarted with the same set and patient: from the prediction it holds, not from zero
    const held = chan(pk, 1).pred!.x.slice();
    send(pk, { kind: 'pump', action: 'tci', ch: 1, setId: 'eleveld', mode: 'effect', target: 3, patient: REF });
    expect(chan(pk, 1).pred!.x).toEqual(held);
  });

  it('while TCI runs, a new set or new patient data is refused; stopped, a new set starts a fresh prediction at zero', () => {
    const pk = pinned();
    tciChannel(pk);
    advancePk(pk, NEUTRAL_PK_CTX, 600);
    expect(refused(pk, { kind: 'pump', action: 'tci', ch: 1, setId: 'schnider', mode: 'effect', target: 3, patient: REF })).toMatch(/stop the TCI/);
    expect(refused(pk, { kind: 'pump', action: 'tci', ch: 1, setId: 'eleveld', mode: 'effect', target: 3, patient: { ...REF, weightKg: 80 } })).toMatch(/stop the TCI/);
    send(pk, { kind: 'pump', action: 'tci', ch: 1, setId: 'eleveld', mode: 'effect', target: 0, patient: REF });
    send(pk, { kind: 'pump', action: 'tci', ch: 1, setId: 'schnider', mode: 'effect', target: 3, patient: REF });
    expect(chan(pk, 1).pred!.setId).toBe('schnider');
    expect(chan(pk, 1).pred!.x.every((v) => v === 0)).toBe(true); // the hazard of a real pump: it knows nothing of the drug already given
    // The channel-less TCI keeps the same rule
    send(pk, { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3 });
    expect(refused(pk, { kind: 'tci', drugId: 'propofol', model: 'schnider', mode: 'effect', target: 3 })).toMatch(/stop the TCI/);
    expect(refused(pk, { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3, opioids: true })).toMatch(/stop the TCI/);
  });

  it('stop and start: the prediction steps with nothing delivered while stopped; a rate command leaves TCI', () => {
    const pk = pinned();
    tciChannel(pk);
    advancePk(pk, NEUTRAL_PK_CTX, 300);
    send(pk, { kind: 'pump', action: 'stop', ch: 1 });
    const ce0 = chan(pk, 1).pred!.x[3] as number;
    const ml0 = chan(pk, 1).infusedMl;
    advancePk(pk, NEUTRAL_PK_CTX, 600);
    expect(chan(pk, 1).infusedMl).toBe(ml0);
    expect(chan(pk, 1).pred!.x[3]).toBeLessThan(ce0);
    send(pk, { kind: 'pump', action: 'start', ch: 1 });
    advancePk(pk, NEUTRAL_PK_CTX, 1200);
    expect(chan(pk, 1).pred!.x[3]).toBeCloseTo(3, 2);
    send(pk, { kind: 'pump', action: 'rate', ch: 1, rate: 10, unit: 'mL/h' });
    expect(chan(pk, 1).mode).toBe('rate');
    expect(chan(pk, 1).tci).toBeNull();
    advancePk(pk, NEUTRAL_PK_CTX, 1210);
    expect(chan(pk, 1).rateMlH).toBe(10);
  });

  it('a syringe change mid-TCI keeps the prediction (unload, load, start)', () => {
    const pk = pinned();
    tciChannel(pk);
    advancePk(pk, NEUTRAL_PK_CTX, 600);
    send(pk, { kind: 'pump', action: 'unload', ch: 1 });
    send(pk, { kind: 'pump', action: 'load', ch: 1, channel: 'syringe', syringeMl: 50, contents: { drugId: 'propofol', concentration: PROPOFOL_10, volumeMl: 50 } });
    advancePk(pk, NEUTRAL_PK_CTX, 660);
    expect(chan(pk, 1).mode).toBe('tci');
    expect(chan(pk, 1).pred!.x[3]).toBeGreaterThan(2);
    send(pk, { kind: 'pump', action: 'start', ch: 1 });
    advancePk(pk, NEUTRAL_PK_CTX, 1200);
    expect(chan(pk, 1).pred!.x[3]).toBeCloseTo(3, 2);
  });

  it('snapshot mid-run (JSON) restores the predictions and the run continues identically', () => {
    const a = pinned();
    send(a, { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3 }, 0);
    tciChannel(a, { ch: 2, setId: 'schnider' });
    advancePk(a, HALF_LIVER, 300);
    const b = JSON.parse(JSON.stringify(a)) as PkState;
    advancePk(a, HALF_LIVER, 900);
    advancePk(b, HALF_LIVER, 900);
    expect(b.drugs.propofol!.pred).toEqual(a.drugs.propofol!.pred);
    expect(chan(b, 2).pred).toEqual(chan(a, 2).pred);
    expect(b.drugs.propofol!.x).toEqual(a.drugs.propofol!.x);
  });

  it('an older snapshot with a running channel-less TCI and no prediction: the prediction is seeded from the patient once', () => {
    const pk = pinned();
    send(pk, { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3 }, 0);
    advancePk(pk, NEUTRAL_PK_CTX, 300);
    const old = JSON.parse(JSON.stringify(pk)) as PkState;
    delete (old.drugs.propofol as { pred?: unknown }).pred;
    advancePk(old, NEUTRAL_PK_CTX, 1200);
    expect(old.drugs.propofol!.pred!.setId).toBe('eleveld');
    expect(old.drugs.propofol!.pred!.x[3]).toBeCloseTo(3, 2);
  });

  it('refusals: TCI on a drip channel, before programming, a set for another drug, patient data missing', () => {
    const pk = pinned();
    const c = { amount: 8, unit: 'mcg', perMl: 1 };
    send(pk, { kind: 'pump', action: 'load', ch: 2, channel: 'drip', contents: { drugId: 'norepinephrine', concentration: c, volumeMl: 500 } });
    expect(refused(pk, { kind: 'pump', action: 'tci', ch: 2, setId: 'eleveld', mode: 'effect', target: 3, patient: REF })).toMatch(/syringe channel/);
    send(pk, { kind: 'pump', action: 'load', ch: 1, channel: 'syringe', syringeMl: 50, contents: { drugId: 'propofol', concentration: PROPOFOL_10, volumeMl: 50 } });
    expect(refused(pk, { kind: 'pump', action: 'tci', ch: 1, setId: 'eleveld', mode: 'effect', target: 3, patient: REF })).toMatch(/program/);
    send(pk, { kind: 'pump', action: 'program', ch: 1, drugId: 'propofol', concentration: PROPOFOL_10 });
    expect(refused(pk, { kind: 'pump', action: 'tci', ch: 1, setId: 'minto', mode: 'effect', target: 3, patient: REF })).toBe('minto is a remifentanil set, not propofol');
    expect(refused(pk, { kind: 'pump', action: 'tci', ch: 1, setId: 'nosuch', mode: 'effect', target: 3, patient: REF })).toMatch(/unknown TCI set/);
    expect(refused(pk, { kind: 'pump', action: 'tci', ch: 1, setId: 'eleveld', mode: 'effect', target: 3 })).toMatch(/patient/);
    expect(refused(pk, { kind: 'pump', action: 'tci', ch: 1, setId: 'eleveld', mode: 'effect', target: 3, patient: { ...REF, weightKg: 0 } })).toMatch(/patient/);
    expect(refused(pk, { kind: 'tci', drugId: 'propofol', model: 'minto', mode: 'effect', target: 3 })).toBe('minto is a remifentanil set, not propofol');
  });
});
