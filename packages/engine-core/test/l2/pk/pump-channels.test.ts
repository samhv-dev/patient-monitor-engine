// Pump-rack E1 (docs/plans/pump-rack-tci.md §13 "E1: Pump channels in the PK layer, both kinds"): a channel is loaded
// with a syringe or a bag of stated contents, programmed, set to a rate, started, stopped, purged and unloaded; its
// volume falls at its rate; at empty it stops and raises one alarm; channels of one drug add (D5); the patient receives
// the CONTENTS, not the programme (§8). Each `it` below is one line of the plan's "Tests first" list, in its order, then
// the refusals the validation gives. Rate mode only (TCI on a channel is E2). The bolus and purge rates are carried on
// the event, as the host resolves them from the device profile (D4, D12): the rates below are test inputs [ENG: test],
// not device numbers.
import { describe, expect, it } from 'vitest';
import { advancePk, applyPkCommand, createPkState, NEUTRAL_PK_CTX, validatePkCommand, type PkState } from '../../../src/l2/pk/pipeline.ts';
import { createEngine } from '../../../src/engine.ts';
import type { Command, EngineEvent } from '../../../src/types.ts';
import type { PumpAlarmEvent, PumpChannel } from '../../../src/types-pk.ts';

const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event }) as unknown as Command;
const REF = { ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' as const };
const PROPOFOL_10 = { amount: 10, unit: 'mg', perMl: 1 };
const REMI_50 = { amount: 50, unit: 'mcg', perMl: 1 }; // 2.5 mg in 50 mL [ENG: test]

/** Validate, then apply (the engine's order); a refusal fails the test with its words. */
function send(pk: PkState, event: Record<string, unknown>, t = pk.t): void {
  const why = validatePkCommand(ev(event), pk);
  if (why !== undefined) throw new Error(`refused: ${why}`);
  expect(applyPkCommand(pk, ev(event), t)).toBe(true);
}
const refused = (pk: PkState, event: Record<string, unknown>) => validatePkCommand(ev({ kind: 'pump', ...event }), pk);
const chan = (pk: PkState, ch: number) => pk.pumps!.find((c) => c.ch === ch) as PumpChannel;
const alarms = (pk: PkState) => pk.out.filter((e): e is PumpAlarmEvent => e.type === 'pumpAlarm');

function pinned(): PkState {
  const pk = createPkState(REF);
  pk.pinDistQ = 1; // the cardiac-output ratio pinned at 1 [ENG: test], so two runs differ only by what they are given
  return pk;
}
/** A syringe channel loaded with `volumeMl` of propofol 10 mg/mL in a 50 mL syringe, programmed the same. */
function propofolSyringe(pk: PkState, ch = 1, volumeMl = 50, rateMlH = 30): void {
  send(pk, { kind: 'pump', action: 'load', ch, channel: 'syringe', syringeMl: 50, contents: { drugId: 'propofol', concentration: PROPOFOL_10, volumeMl } });
  send(pk, { kind: 'pump', action: 'program', ch, drugId: 'propofol', concentration: PROPOFOL_10 });
  send(pk, { kind: 'pump', action: 'rate', ch, rate: rateMlH, unit: 'mL/h' });
}
/** A drip channel: a 500 mL bag of norepinephrine 8 mcg/mL [ENG: test] on a 20 drops/mL set, programmed the same. */
function noradBag(pk: PkState, ch = 2, volumeMl = 500): void {
  const c = { amount: 8, unit: 'mcg', perMl: 1 };
  send(pk, { kind: 'pump', action: 'load', ch, channel: 'drip', contents: { drugId: 'norepinephrine', concentration: c, volumeMl } });
  send(pk, { kind: 'pump', action: 'program', ch, drugId: 'norepinephrine', concentration: c, set: 20 });
}

describe('pump-rack E1: pump channels in the drug layer, both kinds', () => {
  it('load, program, rate, stop, start and unload on a syringe channel; nothing flows until start, nothing while stopped', () => {
    const pk = pinned();
    propofolSyringe(pk);
    const c = chan(pk, 1);
    expect(c).toMatchObject({ ch: 1, kind: 'syringe', syringeMl: 50, volumeMl: 50, infusedMl: 0, wasteMl: 0, paused: true, mode: 'rate', rateMlH: 30, alarms: [] });
    expect(c.contents).toEqual({ drugId: 'propofol', concentration: PROPOFOL_10, loadedMl: 50 });
    expect(c.programmed).toEqual({ drugId: 'propofol', concentration: PROPOFOL_10 });
    advancePk(pk, NEUTRAL_PK_CTX, 60);
    expect(chan(pk, 1).volumeMl).toBe(50); // loaded and programmed, not started: no flow
    expect(pk.drugs.propofol).toBeUndefined();
    send(pk, { kind: 'pump', action: 'start', ch: 1 });
    advancePk(pk, NEUTRAL_PK_CTX, 180); // 120 s at 30 mL/h = 1 mL
    expect(chan(pk, 1).volumeMl).toBeCloseTo(49, 9);
    send(pk, { kind: 'pump', action: 'stop', ch: 1 });
    advancePk(pk, NEUTRAL_PK_CTX, 300);
    expect(chan(pk, 1).volumeMl).toBeCloseTo(49, 9); // stopped: the programme kept, no flow
    expect(chan(pk, 1).paused).toBe(true);
    expect(chan(pk, 1).rateMlH).toBe(30);
    send(pk, { kind: 'pump', action: 'start', ch: 1 });
    advancePk(pk, NEUTRAL_PK_CTX, 420);
    expect(chan(pk, 1).volumeMl).toBeCloseTo(48, 9);
    expect(pk.drugs.propofol!.total).toBeCloseTo(20, 9); // 2 mL × 10 mg/mL
    send(pk, { kind: 'pump', action: 'unload', ch: 1 });
    expect(chan(pk, 1)).toMatchObject({ contents: null, volumeMl: 0, infusedMl: 0, paused: true });
    expect(chan(pk, 1).programmed).toEqual({ drugId: 'propofol', concentration: PROPOFOL_10 }); // the channel keeps its programme
    advancePk(pk, NEUTRAL_PK_CTX, 600);
    expect(pk.drugs.propofol!.total).toBeCloseTo(20, 9); // unloaded: nothing more
    // a new syringe goes on the same channel
    send(pk, { kind: 'pump', action: 'load', ch: 1, channel: 'syringe', syringeMl: 20, contents: { drugId: 'propofol', concentration: PROPOFOL_10, volumeMl: 20 } });
    expect(chan(pk, 1).volumeMl).toBe(20);
  });

  it('load, program, rate, stop, start and unload on a drip channel', () => {
    const pk = pinned();
    noradBag(pk);
    send(pk, { kind: 'pump', action: 'rate', ch: 2, rate: 30, unit: 'mL/h' });
    expect(chan(pk, 2)).toMatchObject({ kind: 'drip', set: 20, syringeMl: null, volumeMl: 500, paused: true, rateMlH: 30 });
    send(pk, { kind: 'pump', action: 'start', ch: 2 });
    advancePk(pk, NEUTRAL_PK_CTX, 120); // 2 min at 30 mL/h = 1 mL
    expect(chan(pk, 2).volumeMl).toBeCloseTo(499, 9);
    send(pk, { kind: 'pump', action: 'stop', ch: 2 });
    advancePk(pk, NEUTRAL_PK_CTX, 240);
    expect(chan(pk, 2).volumeMl).toBeCloseTo(499, 9);
    send(pk, { kind: 'pump', action: 'start', ch: 2 });
    advancePk(pk, NEUTRAL_PK_CTX, 360);
    expect(chan(pk, 2).infusedMl).toBeCloseTo(2, 9);
    expect(pk.drugs.norepinephrine!.total).toBeCloseTo(16, 9); // 2 mL × 8 mcg/mL
    send(pk, { kind: 'pump', action: 'unload', ch: 2 });
    expect(chan(pk, 2).contents).toBeNull();
  });

  it('purge before delivery moves the volume to waste and nothing reaches the patient (D7), syringe and drip', () => {
    const pk = pinned();
    propofolSyringe(pk);
    noradBag(pk);
    send(pk, { kind: 'pump', action: 'purge', ch: 1, volumeMl: 1, rateMlH: 800 });
    send(pk, { kind: 'pump', action: 'purge', ch: 2, volumeMl: 2, rateMlH: 450 });
    advancePk(pk, NEUTRAL_PK_CTX, 4.4); // 1 mL at 800 mL/h is 4.5 s: still purging
    expect(chan(pk, 1).rapid).not.toBeNull();
    advancePk(pk, NEUTRAL_PK_CTX, 30);
    for (const [ch, ml] of [[1, 1], [2, 2]] as const) {
      expect(chan(pk, ch).wasteMl).toBeCloseTo(ml, 9);
      expect(chan(pk, ch).infusedMl).toBe(0);
      expect(chan(pk, ch).rapid).toBeNull();
      expect(chan(pk, ch).paused).toBe(true); // a purge does not start the channel
    }
    expect(chan(pk, 1).volumeMl).toBeCloseTo(49, 9);
    expect(chan(pk, 2).volumeMl).toBeCloseTo(498, 9);
    expect(pk.drugs.propofol?.total ?? 0).toBe(0);
    expect(pk.drugs.norepinephrine?.total ?? 0).toBe(0);
  });

  it('purge after delivery is a bolus into the patient at the purge rate (D7), syringe and drip', () => {
    const pk = pinned();
    propofolSyringe(pk);
    noradBag(pk);
    send(pk, { kind: 'pump', action: 'rate', ch: 2, rate: 30, unit: 'mL/h' });
    for (const ch of [1, 2]) send(pk, { kind: 'pump', action: 'start', ch });
    advancePk(pk, NEUTRAL_PK_CTX, 120); // 1 mL each
    for (const ch of [1, 2]) send(pk, { kind: 'pump', action: 'stop', ch });
    send(pk, { kind: 'pump', action: 'purge', ch: 1, volumeMl: 1, rateMlH: 800 });
    send(pk, { kind: 'pump', action: 'purge', ch: 2, volumeMl: 2, rateMlH: 450 });
    advancePk(pk, NEUTRAL_PK_CTX, 180);
    expect(chan(pk, 1).wasteMl).toBe(0);
    expect(chan(pk, 1).infusedMl).toBeCloseTo(2, 9);
    expect(pk.drugs.propofol!.total).toBeCloseTo(20, 9); // 1 mL run + 1 mL purged into the patient
    expect(chan(pk, 2).infusedMl).toBeCloseTo(3, 9);
    expect(pk.drugs.norepinephrine!.total).toBeCloseTo(24, 9);
  });

  it('a bolus on a syringe channel runs its volume at the carried rate into the patient, then the channel goes on as before', () => {
    const pk = pinned();
    propofolSyringe(pk);
    send(pk, { kind: 'pump', action: 'start', ch: 1 });
    // 2 mg/kg × 70 kg = 140 mg = 14 mL at the programme's 10 mg/mL; at 800 mL/h it takes 63 s
    send(pk, { kind: 'pump', action: 'bolus', ch: 1, dose: { amount: 2, unit: 'mg/kg' }, weightKg: 70, rateMlH: 800 });
    advancePk(pk, NEUTRAL_PK_CTX, 63);
    expect(chan(pk, 1).rapid).toBeNull();
    expect(chan(pk, 1).infusedMl).toBeCloseTo(14, 9);
    advancePk(pk, NEUTRAL_PK_CTX, 183); // then 120 s at 30 mL/h
    expect(chan(pk, 1).infusedMl).toBeCloseTo(15, 9);
    expect(pk.drugs.propofol!.total).toBeCloseTo(150, 9);
  });

  it('the volume falls at the rate, and the delivered amount is the volume × the contents\' concentration', () => {
    const pk = pinned();
    propofolSyringe(pk, 1, 50, 12);
    send(pk, { kind: 'pump', action: 'start', ch: 1 });
    for (const [t, left] of [[300, 49], [900, 47], [1800, 44]] as const) {
      advancePk(pk, NEUTRAL_PK_CTX, t);
      expect(chan(pk, 1).volumeMl).toBeCloseTo(left, 9);
      expect(chan(pk, 1).infusedMl).toBeCloseTo(50 - left, 9);
      expect(pk.drugs.propofol!.total).toBeCloseTo((50 - left) * 10, 9);
    }
    expect(pk.drugs.propofol!.rate).toBe(0); // the channel-less rate is untouched (D5)
    expect(pk.drugs.propofol!.pumpRate).toBeCloseTo((12 * 10) / 60, 12); // 2 mg/min from the channel
  });

  it('a dose rate converts with the PROGRAMMED concentration and the weight typed into the pump', () => {
    const pk = pinned();
    propofolSyringe(pk);
    send(pk, { kind: 'pump', action: 'rate', ch: 1, rate: 6, unit: 'mg/kg/h', weightKg: 80 });
    expect(chan(pk, 1).rateMlH).toBeCloseTo(48, 12); // 6 × 80 mg/h ÷ 10 mg/mL — the pump's 80 kg, not the patient's 70
  });

  it('a drip channel converts drops/min with its set: 60 drops/min on a 20 drops/mL set is 180 mL/h', () => {
    const pk = pinned();
    noradBag(pk);
    send(pk, { kind: 'pump', action: 'rate', ch: 2, rate: 60, unit: 'drops/min' });
    expect(chan(pk, 2).rateMlH).toBe(180);
    send(pk, { kind: 'pump', action: 'start', ch: 2 });
    advancePk(pk, NEUTRAL_PK_CTX, 60);
    expect(chan(pk, 2).infusedMl).toBeCloseTo(3, 9); // 180 mL/h for 1 min
    // a different set re-converts the same drops/min: 60 drops/mL gives 60 mL/h
    send(pk, { kind: 'pump', action: 'program', ch: 2, drugId: 'norepinephrine', concentration: { amount: 8, unit: 'mcg', perMl: 1 }, set: 60 });
    expect(chan(pk, 2).rateMlH).toBe(60);
  });

  it('at empty the delivery stops and ONE alarm is raised: End on a syringe channel, Empty Container on a drip channel', () => {
    const pk = pinned();
    propofolSyringe(pk, 1, 1, 60); // 1 mL at 60 mL/h: empty at 60 s
    send(pk, { kind: 'pump', action: 'load', ch: 2, channel: 'drip', contents: { drugId: 'norepinephrine', concentration: { amount: 8, unit: 'mcg', perMl: 1 }, volumeMl: 2 } });
    send(pk, { kind: 'pump', action: 'program', ch: 2, drugId: 'norepinephrine', concentration: { amount: 8, unit: 'mcg', perMl: 1 }, set: 20 });
    send(pk, { kind: 'pump', action: 'rate', ch: 2, rate: 60, unit: 'mL/h' }); // 2 mL: empty at 120 s
    for (const ch of [1, 2]) send(pk, { kind: 'pump', action: 'start', ch });
    advancePk(pk, NEUTRAL_PK_CTX, 59.9);
    expect(alarms(pk)).toEqual([]);
    advancePk(pk, NEUTRAL_PK_CTX, 600);
    expect(alarms(pk).map(({ ch, alarm, channel }) => ({ ch, alarm, channel }))).toEqual([
      { ch: 1, alarm: 'end', channel: 'syringe' },
      { ch: 2, alarm: 'emptyContainer', channel: 'drip' },
    ]);
    expect(alarms(pk)[0]!.t).toBeCloseTo(60, 6);
    expect(alarms(pk)[1]!.t).toBeCloseTo(120, 6);
    expect(chan(pk, 1)).toMatchObject({ volumeMl: 0, paused: true, alarms: ['end'] });
    expect(chan(pk, 2)).toMatchObject({ volumeMl: 0, paused: true, alarms: ['emptyContainer'] });
    expect(pk.drugs.propofol!.total).toBeCloseTo(10, 9); // exactly the 1 mL it held
    expect(pk.drugs.norepinephrine!.total).toBeCloseTo(16, 9);
    expect(pk.drugs.propofol!.pumpRate).toBe(0);
    expect(refused(pk, { action: 'start', ch: 1 })).toMatch(/empty/);
  });

  it('at a drip channel\'s volume limit the channel stops with Infusion Complete; a new limit lets it go on', () => {
    const pk = pinned();
    noradBag(pk);
    send(pk, { kind: 'pump', action: 'rate', ch: 2, rate: 60, unit: 'mL/h', limitMl: 5 });
    send(pk, { kind: 'pump', action: 'start', ch: 2 });
    advancePk(pk, NEUTRAL_PK_CTX, 900);
    expect(alarms(pk).map((a) => a.alarm)).toEqual(['infusionComplete']);
    expect(alarms(pk)[0]!.t).toBeCloseTo(300, 6); // 5 mL at 60 mL/h
    expect(chan(pk, 2)).toMatchObject({ paused: true, alarms: ['infusionComplete'] });
    expect(chan(pk, 2).infusedMl).toBeCloseTo(5, 9);
    expect(chan(pk, 2).volumeMl).toBeCloseTo(495, 9);
    expect(refused(pk, { action: 'start', ch: 2 })).toMatch(/limit/);
    send(pk, { kind: 'pump', action: 'rate', ch: 2, rate: 60, unit: 'mL/h', limitMl: 6 });
    send(pk, { kind: 'pump', action: 'start', ch: 2 });
    expect(chan(pk, 2).alarms).toEqual([]);
    advancePk(pk, NEUTRAL_PK_CTX, 1200);
    expect(chan(pk, 2).infusedMl).toBeCloseTo(6, 9);
    expect(alarms(pk).length).toBe(2);
  });

  it('two channels of one drug add (D5), and add to the channel-less infusion', () => {
    const a = pinned();
    const b = pinned();
    applyPkCommand(a, ev({ kind: 'infusion', drugId: 'propofol', rate: 30, unit: 'mL/h' }), 0);
    propofolSyringe(b, 1, 50, 10);
    propofolSyringe(b, 2, 50, 20);
    for (const ch of [1, 2]) send(b, { kind: 'pump', action: 'start', ch });
    advancePk(a, NEUTRAL_PK_CTX, 600);
    advancePk(b, NEUTRAL_PK_CTX, 600);
    expect(b.drugs.propofol!.total).toBeCloseTo(a.drugs.propofol!.total, 9);
    for (let i = 0; i < 4; i++) expect(b.drugs.propofol!.x[i]).toBeCloseTo(a.drugs.propofol!.x[i] as number, 9);
    // a third source: the channel-less infusion beside them
    applyPkCommand(b, ev({ kind: 'infusion', drugId: 'propofol', rate: 6, unit: 'mL/h' }), 600);
    advancePk(b, NEUTRAL_PK_CTX, 660);
    expect(b.drugs.propofol!.total).toBeCloseTo(a.drugs.propofol!.total + (36 * 10) / 60, 9);
  });

  it('the contents are delivered, not the programme: a remifentanil syringe programmed as propofol raises remifentanil (§8)', () => {
    const pk = pinned();
    send(pk, { kind: 'pump', action: 'load', ch: 1, channel: 'syringe', syringeMl: 50, contents: { drugId: 'remifentanil', concentration: REMI_50, volumeMl: 50 } });
    send(pk, { kind: 'pump', action: 'program', ch: 1, drugId: 'propofol', concentration: PROPOFOL_10 });
    send(pk, { kind: 'pump', action: 'rate', ch: 1, rate: 6, unit: 'mg/kg/h', weightKg: 70 }); // 42 mL/h of "propofol"
    send(pk, { kind: 'pump', action: 'start', ch: 1 });
    advancePk(pk, NEUTRAL_PK_CTX, 300);
    expect(pk.drugs.propofol).toBeUndefined(); // no propofol reached the patient
    expect(pk.drugs.remifentanil!.total).toBeCloseTo(((42 * 300) / 3600) * 50, 9); // 3.5 mL × 50 mcg/mL
    expect(pk.bus.agents.remifentanil!.brain).toBeGreaterThan(3); // 35 mcg/min of remifentanil: a large opioid effect site
    expect(pk.bus.agents.propofol).toBeUndefined();
    // and a syringe twice the programme's strength gives twice the amount for the same programme
    const q = pinned();
    send(q, { kind: 'pump', action: 'load', ch: 1, channel: 'syringe', syringeMl: 50, contents: { drugId: 'propofol', concentration: { amount: 20, unit: 'mg', perMl: 1 }, volumeMl: 50 } });
    send(q, { kind: 'pump', action: 'program', ch: 1, drugId: 'propofol', concentration: PROPOFOL_10 });
    send(q, { kind: 'pump', action: 'rate', ch: 1, rate: 30, unit: 'mL/h' });
    send(q, { kind: 'pump', action: 'start', ch: 1 });
    advancePk(q, NEUTRAL_PK_CTX, 600);
    expect(q.drugs.propofol!.total).toBeCloseTo(100, 9); // 5 mL × 20 mg/mL, not × 10
  });

  it('a pumped drug reaches the endocrine model through its running rate (an insulin channel)', () => {
    const pk = pinned();
    const c = { amount: 1, unit: 'units', perMl: 1 };
    send(pk, { kind: 'pump', action: 'load', ch: 1, channel: 'syringe', syringeMl: 50, contents: { drugId: 'insulin', concentration: c, volumeMl: 50 } });
    send(pk, { kind: 'pump', action: 'program', ch: 1, drugId: 'insulin', concentration: c });
    send(pk, { kind: 'pump', action: 'rate', ch: 1, rate: 3, unit: 'mL/h' });
    send(pk, { kind: 'pump', action: 'start', ch: 1 });
    advancePk(pk, NEUTRAL_PK_CTX, 60);
    expect(pk.drugs.insulin!.pumpRate).toBeCloseTo(3 / 60, 12); // units/min, read beside `rate` by the endocrine adapter
    expect(pk.drugs.insulin!.infTarget).toBe(0); // the channel-less target untouched
  });

  it('the drugs event lists the channels; with no pump event it carries no `pumps` key', () => {
    const a = pinned();
    applyPkCommand(a, ev({ kind: 'infusion', drugId: 'propofol', rate: 30, unit: 'mL/h' }), 0);
    advancePk(a, NEUTRAL_PK_CTX, 2);
    const da = a.out.find((e) => e.type === 'drugs') as Extract<EngineEvent, { type: 'drugs' }>;
    expect('pumps' in da).toBe(false);
    expect(a.pumps).toBeUndefined();
    const b = pinned();
    propofolSyringe(b);
    send(b, { kind: 'pump', action: 'start', ch: 1 });
    advancePk(b, NEUTRAL_PK_CTX, 120);
    const db = b.out.filter((e) => e.type === 'drugs').at(-1) as Extract<EngineEvent, { type: 'drugs' }>;
    expect(db.pumps).toHaveLength(1);
    expect(db.pumps![0]).toMatchObject({ ch: 1, kind: 'syringe', state: 'running', rateMlH: 30, programmed: { drugId: 'propofol' } });
    expect(db.pumps![0]!.volumeMl).toBeCloseTo(49, 6);
    expect(db.pumps![0]!.timeToEmptyMin).toBeCloseTo(98, 6); // 49 mL at 30 mL/h
    const row = db.drugs.find((r) => r.id === 'propofol')!;
    expect(row.rate).toBeCloseTo(5, 12); // the panel's running rate includes the channel's 5 mg/min
  });

  it('a snapshot taken mid-run restores the channels, and the restored run goes on identically', () => {
    const mk = () => createEngine({ seed: 7, patient: { ageY: 35, sex: 'M', weightKg: 70, heightCm: 170 } } as never);
    const e = mk();
    let n = 0;
    const cmd = (event: Record<string, unknown>) => {
      const r = e.dispatch({ id: `c${++n}`, issuedBy: 'test', type: 'applyEvent', event } as never);
      expect(r.reason).toBeUndefined();
      e.advanceTo(n * 0.04); // a command applies on the next 20 ms tick; the next one is validated against it
    };
    cmd({ kind: 'pump', action: 'load', ch: 3, channel: 'syringe', syringeMl: 10, contents: { drugId: 'propofol', concentration: PROPOFOL_10, volumeMl: 2 } });
    cmd({ kind: 'pump', action: 'program', ch: 3, drugId: 'propofol', concentration: PROPOFOL_10 });
    cmd({ kind: 'pump', action: 'rate', ch: 3, rate: 60, unit: 'mL/h' });
    cmd({ kind: 'pump', action: 'start', ch: 3 });
    e.advanceTo(30);
    const snap = e.snapshot();
    const seen: string[] = [];
    e.on((x: EngineEvent) => { if (x.type === 'pumpAlarm') seen.push(`${x.ch}:${x.alarm}@${x.t.toFixed(1)}`); }, ['pumpAlarm']);
    e.advanceTo(150);
    const pkOf = (x: typeof e) => (x.snapshot().state as unknown as { st: { pk: PkState } }).st.pk;
    const end = pkOf(e);
    const r = mk();
    r.restore(JSON.parse(JSON.stringify(snap)));
    const mid = pkOf(r);
    expect(mid.pumps![0]!.volumeMl).toBeCloseTo(1.5, 2); // 30 s at 60 mL/h (the PK grid may trail by < 1 step)
    const seenR: string[] = [];
    r.on((x: EngineEvent) => { if (x.type === 'pumpAlarm') seenR.push(`${x.ch}:${x.alarm}@${x.t.toFixed(1)}`); }, ['pumpAlarm']);
    r.advanceTo(150);
    expect(seen).toEqual(['3:end@120.1']); // started at the 0.16 s tick: its first 0.1 s step ends at 0.2 s, 2 mL later is 120.1 s
    expect(seenR).toEqual(seen);
    expect(pkOf(r).pumps).toEqual(end.pumps);
    expect(pkOf(r).drugs.propofol!.x).toEqual(end.drugs.propofol!.x);
  });

  it('an older snapshot without channels restores and then takes a pump event', () => {
    const e = createEngine({ seed: 3 } as never);
    e.advanceTo(5);
    const snap = e.snapshot();
    expect((snap.state as unknown as { st: { pk: PkState } }).st.pk.pumps).toBeUndefined();
    const r = createEngine({ seed: 3 } as never);
    r.restore(snap);
    const res = r.dispatch({ id: 'p1', issuedBy: 'test', type: 'applyEvent', event: { kind: 'pump', action: 'load', ch: 1, channel: 'drip', contents: { drugId: 'norepinephrine', concentration: { amount: 8, unit: 'mcg', perMl: 1 }, volumeMl: 250 } } } as never);
    expect(res.accepted).toBe(true);
  });

  it('a command validated at dispatch but no longer allowed when it applies is not applied, and is said', () => {
    const e = createEngine({ seed: 5 } as never);
    const out: EngineEvent[] = [];
    e.on((x: EngineEvent) => { out.push(x); }, ['pumpRefused']);
    const load = { kind: 'pump', action: 'load', ch: 1, channel: 'syringe', syringeMl: 10, contents: { drugId: 'propofol', concentration: PROPOFOL_10, volumeMl: 10 } };
    // two loads in one tick: both validate against the empty channel; the second finds it loaded
    expect(e.dispatch({ id: 'a', issuedBy: 'test', type: 'applyEvent', event: load } as never).accepted).toBe(true);
    expect(e.dispatch({ id: 'b', issuedBy: 'test', type: 'applyEvent', event: load } as never).accepted).toBe(true);
    e.advanceTo(1);
    expect(out).toEqual([{ type: 'pumpRefused', t: expect.any(Number), ch: 1, action: 'load', reason: 'channel 1 is loaded: unload it first' }]);
  });

  it('refuses what a channel cannot do, with words', () => {
    const pk = pinned();
    const contents = { drugId: 'propofol', concentration: PROPOFOL_10, volumeMl: 50 };
    expect(refused(pk, { action: 'load', ch: 0, channel: 'syringe', syringeMl: 50, contents })).toMatch(/ch/);
    expect(refused(pk, { action: 'load', ch: 9, channel: 'syringe', syringeMl: 50, contents })).toMatch(/ch/);
    expect(refused(pk, { action: 'load', ch: 1, channel: 'syringe', contents })).toMatch(/syringeMl/);
    expect(refused(pk, { action: 'load', ch: 1, channel: 'syringe', syringeMl: 20, contents })).toMatch(/more than/);
    expect(refused(pk, { action: 'load', ch: 1, channel: 'drip', syringeMl: 50, contents })).toMatch(/syringe/);
    expect(refused(pk, { action: 'load', ch: 1, channel: 'syringe', syringeMl: 50, contents: { ...contents, drugId: 'sevoflurane' } })).toMatch(/vaporiser/);
    expect(refused(pk, { action: 'load', ch: 1, channel: 'syringe', syringeMl: 50, contents: { ...contents, drugId: 'calciumChloride' } })).toMatch(/bolus/);
    expect(refused(pk, { action: 'program', ch: 1, drugId: 'propofol', concentration: PROPOFOL_10 })).toMatch(/load/);
    expect(refused(pk, { action: 'tci', ch: 1 })).toMatch(/action/);
    expect(refused(pk, { action: 'toString', ch: 1 })).toMatch(/action/);
    propofolSyringe(pk);
    noradBag(pk);
    expect(refused(pk, { action: 'load', ch: 1, channel: 'syringe', syringeMl: 50, contents })).toMatch(/unload/);
    expect(refused(pk, { action: 'program', ch: 1, drugId: 'propofol', concentration: PROPOFOL_10, set: 20 })).toMatch(/drip/);
    expect(refused(pk, { action: 'program', ch: 2, drugId: 'norepinephrine', concentration: { amount: 8, unit: 'mcg', perMl: 1 } })).toMatch(/set/);
    expect(refused(pk, { action: 'program', ch: 1, drugId: 'propofol', concentration: { amount: 10, unit: 'units', perMl: 1 } })).toMatch(/unit/);
    expect(refused(pk, { action: 'rate', ch: 1, rate: 10, unit: 'drops/min' })).toMatch(/drip/);
    expect(refused(pk, { action: 'rate', ch: 1, rate: 10, unit: 'mL/h', limitMl: 5 })).toMatch(/drip/);
    expect(refused(pk, { action: 'rate', ch: 1, rate: -1, unit: 'mL/h' })).toMatch(/rate/);
    expect(refused(pk, { action: 'rate', ch: 1, rate: 6, unit: 'mg/kg/h' })).toMatch(/weightKg/);
    expect(refused(pk, { action: 'bolus', ch: 2, volumeMl: 1, rateMlH: 450 })).toMatch(/syringe/);
    expect(refused(pk, { action: 'bolus', ch: 1, volumeMl: 60, rateMlH: 800 })).toMatch(/holds/);
    expect(refused(pk, { action: 'bolus', ch: 1, volumeMl: 1 })).toMatch(/rateMlH/);
    expect(refused(pk, { action: 'purge', ch: 1, volumeMl: 0, rateMlH: 800 })).toMatch(/volumeMl/);
    expect(refused(pk, { action: 'start', ch: 4 })).toMatch(/load/);
    expect(refused(pk, { action: 'stop', ch: 1, extra: 1 })).toMatch(/extra/);
    // a programmed channel with no rate cannot start
    send(pk, { kind: 'pump', action: 'load', ch: 3, channel: 'syringe', syringeMl: 50, contents });
    send(pk, { kind: 'pump', action: 'program', ch: 3, drugId: 'propofol', concentration: PROPOFOL_10 });
    expect(refused(pk, { action: 'start', ch: 3 })).toMatch(/rate/);
    // a channel keeps its kind
    send(pk, { kind: 'pump', action: 'unload', ch: 1 });
    expect(refused(pk, { action: 'load', ch: 1, channel: 'drip', contents })).toMatch(/syringe channel/);
  });
});
