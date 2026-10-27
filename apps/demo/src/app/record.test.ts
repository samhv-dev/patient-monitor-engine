// The run record — every source becomes a row at its simulated time; a return to a bookmark keeps the discarded course
// as undone rows and rewinds the trend; a restart starts a new record; the data survives JSON. The last cases run a
// real engine, scenario driver and host session the way AppSession wires them (a bookmark restore; a fast-forward).
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { createInProcessHub, HostSession, type HostTarget, type WireEvent } from '@pme/controller';
import { BUILTIN_SCENARIOS, engineOptionsOf, ScenarioDriver, validateScenario } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import induction from './showcase/showcase-induction.json';
import { RunRecord } from './record.ts';

const applied = (tick: number, command: Record<string, unknown>, extra: Record<string, unknown> = {}): WireEvent =>
  ({ type: 'commandApplied', commandId: `c${tick}`, tick, resolved: { command: { id: `c${tick}`, issuedBy: 'instructor', ...command }, ...extra } }) as WireEvent;
const alarms = (t: number, ids: string[]): EngineEvent => ({ type: 'alarmStatus', t, active: ids.map((id) => ({ id, level: 1, text: id, acked: false, latched: false })) }) as unknown as EngineEvent;
const truth = (t: number, arrest: unknown): EngineEvent => ({ type: 'truth', t, tree: { hemo: { circ: { arrest } } }, leaves: 1, dropped: 0, truncated: false }) as unknown as EngineEvent;
const meas = (t: number, spo2: number): EngineEvent => ({ type: 'measurement', t, values: { spo2: { value: spo2, flag: 'ok' }, hr: { value: 80, flag: 'ok' }, abpMean: { value: null, flag: 'invalid' }, nibpMean: { value: 75, flag: 'ok' } } }) as unknown as EngineEvent;
const breath = (t: number, kind: string): EngineEvent => ({ type: 'breath', t, seq: 1, kind, tiS: 1, teS: 2, vtMl: 500, etco2True: 38 }) as unknown as EngineEvent;
const labs = (t: number, k: number): EngineEvent => ({ type: 'labs', t, values: { k, lactate: 1.4, ph: 7.31 } }) as unknown as EngineEvent;
const NO_LABS = { k: null, lactate: null, ph: null, glucose: null, tcore: null };
const fresh = () => new RunRecord(() => ({ patient: 'M 40 y 70 kg', weightKg: 70 }), () => 1_000);

describe('the run record', () => {
  it('turns commands, states, alarms, breaths, the pulse and notes into rows with run events', () => {
    const r = fresh();
    r.wire(applied(0, { type: 'scenario', action: 'load', doc: induction }));
    r.wire({ type: 'scenario', t: 10, stateId: 'induced', transitionId: 'induce' } as WireEvent);
    r.wire({ type: 'scenario', t: 10.5, stateId: 'induced' } as WireEvent); // a resync's repeat: no second row
    r.engine(alarms(66, ['apnoea-co2']));
    r.engine(alarms(67, ['apnoea-co2'])); // still active: not raised again
    r.wire(applied(4000, { type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 1, unit: 'mg', route: 'iv' } }));
    r.engine(breath(81, 'mech'));
    r.engine(breath(86, 'mech')); // within 15 s: the same run of breaths
    r.engine(truth(90, null));
    r.engine(truth(91, { cause: 'pea' }));
    r.engine(truth(150, null));
    r.wire(applied(5000, { type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 1, peep: 5 } }, { mirror: true })); // a cockpit frame
    r.wire(applied(5000, { type: 'time', action: 'scale', value: 4 }, { replay: true })); // a late-join replay
    r.wire(applied(5000, { type: 'scenario', action: 'trigger', target: 'intubate' })); // shown by the state it leads to
    r.wire(applied(5000, { type: 'attachSensor', sensor: 'co2', state: 'on', issuedBy: 'scenario' })); // the case's set-up
    r.wire(applied(5000, { type: 'applyEvent', event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 500, overS: 300 }, issuedBy: 'scenario' }));
    r.wire(applied(8000, { type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } }));
    r.wire(applied(8000, { type: 'applyEvent', event: { kind: 'cpr', active: true }, issuedBy: 'remote' })); // a Remote's command
    r.note(160, 'Objective met: Confirm ventilation with the capnogram');
    const rows = r.data.rows.map((x) => [x.t, x.kind, x.text, x.ev ?? '']);
    expect(rows).toEqual([
      [0, 'scenario', `Scenario loaded: ${induction.title}`, ''],
      [10, 'scenario', `Scenario state: ${induction.states.find((s) => s.id === 'induced')?.label}`, 'state:induced'],
      [66, 'alarm', 'Apnoea (no CO₂ breaths)', 'alarm:apnoea-co2'],
      [80, 'action', 'Epinephrine 1 mg IV', 'drug:epinephrine'],
      [81, 'patient', 'Ventilated breaths began', 'ventilation'],
      [91, 'patient', 'Pulse lost (the model)', 'pulseLoss'],
      [150, 'patient', 'Circulation returned (the model)', 'rosc'],
      [100, 'scenario', 'Crystalloid 500 mL over 5 min', 'fluid'],
      [160, 'action', 'Tracheal tube in place', ''],
      [160, 'remote', 'CPR started', 'cpr'],
      [160, 'note', 'Objective met: Confirm ventilation with the capnogram', ''],
    ]);
    expect(r.data.rows[3]?.dose).toEqual({ drugId: 'epinephrine', dose: 1, unit: 'mg' });
    expect(r.data.doc?.id).toBe('showcase-induction');
  });

  it('E133: a run of ≥ 3 PVCs is one row at its first PVC, counting its beats; single PVCs and couplets are not', () => {
    const r = fresh();
    const beat = (t: number, pvc: boolean) => r.engine({ type: 'beat', t, seq: 0, origin: pvc ? 'ventricular' : 'sinus', template: pvc ? 'pvc' : 'normal', qrsMs: 90, qtMs: 380, mech: { perfused: true, kSV: 1, svMl: 70, lvetMs: 280 } } as EngineEvent);
    beat(10, false); beat(10.5, true); beat(11.3, false); // a single PVC
    beat(12, true); beat(12.4, true); beat(13.2, false); // a couplet
    beat(20, true); beat(20.375, true); beat(20.75, true);
    r.engine(alarms(20.8, ['vt'])); // a row recorded while the run goes on
    beat(21.125, true); beat(21.5, true); beat(22.3, false);
    expect(r.data.rows.map((x) => [x.t, x.kind, x.text, x.ev ?? ''])).toEqual([
      [20, 'patient', 'Run of ventricular tachycardia (5 beats)', 'vtRun'],
      [20.8, 'alarm', 'vt', 'alarm:vt'],
    ]);
  });
  it('keeps one sample per simulated second, from the first valid numeric of each trend', () => {
    const r = fresh();
    r.engine(meas(0.2, 99));
    r.engine(meas(0.7, 98)); // same second: the latest value
    r.engine(meas(1.1, 97));
    expect(r.data.samples).toEqual([
      { t: 0, hr: 80, map: 75, spo2: 98, etco2: null, rr: null, temp: null, ...NO_LABS },
      { t: 1, hr: 80, map: 75, spo2: 97, etco2: null, rr: null, temp: null, ...NO_LABS },
    ]);
  });

  it('Q7: the model’s K⁺, lactate, pH, glucose and core temperature join the 1 Hz sample', () => {
    const r = fresh();
    r.engine(meas(0.2, 99));
    r.engine(labs(1, 5.6));
    r.engine({ type: 'endo', t: 1, glucoseMmolL: 6.1 } as unknown as EngineEvent);
    r.engine({ type: 'truth', t: 1, tree: { hemo: { circ: { arrest: null } }, resp: { temp: { tc: 38.04 } } }, leaves: 2, dropped: 0, truncated: false } as unknown as EngineEvent);
    r.engine(meas(1.5, 97));
    expect(r.data.samples).toEqual([
      { t: 0, hr: 80, map: 75, spo2: 99, etco2: null, rr: null, temp: null, ...NO_LABS },
      { t: 1, hr: 80, map: 75, spo2: 97, etco2: null, rr: null, temp: null, k: 5.6, lactate: 1.4, ph: 7.31, glucose: 6.1, tcore: 38 },
    ]);
  });

  it('a return to a bookmark marks the discarded course undone, rewinds the trend, and the run goes on', () => {
    const r = fresh();
    for (let t = 0; t <= 100; t++) r.engine(meas(t, 99 - t / 10));
    r.engine(alarms(10, ['HR_HIGH'])); // Active when the bookmark is taken, and after the return: one row, not two
    r.wire(applied(1000, { type: 'scenario', action: 'bookmark', target: 'Bookmark 1 at 00:20' }));
    r.engine(breath(19, 'mech')); // began before the bookmark, reported when it ended (after it)
    r.engine(alarms(66, ['apnoea-co2']));
    r.engine(truth(70, null));
    r.engine(truth(90, { cause: 'asystole' }));
    r.wire({ type: 'timeline', t: 20, tick: 1000, cause: 'restore' } as WireEvent);
    r.wire(applied(1000, { type: 'scenario', action: 'restoreBookmark', target: 'Bookmark 1 at 00:20' }));
    r.engine(alarms(66, ['HR_HIGH', 'apnoea-co2'])); // apnoea raised again on the kept course; HR high never stopped
    r.engine(breath(19, 'mech')); // the restored engine reports the breath under way again: not a new "began"
    r.engine(meas(21, 95));
    expect(r.data.returns).toBe(1);
    expect(r.data.rows.map((x) => [x.t, x.kind, x.undone ?? 0])).toEqual([ // the bookmark row's 20 s is the host's estimate
      [10, 'alarm', 0], [20, 'bookmark', 0], [19, 'patient', 0], [66, 'alarm', 1], [90, 'patient', 1], [20, 'restore', 0], [66, 'alarm', 0],
    ]);
    expect(r.data.rows.filter((x) => x.ev === 'alarm:HR_HIGH')).toHaveLength(1);
    expect(r.data.samples.at(-1)).toMatchObject({ t: 21, spo2: 95 });
    expect(r.data.samples).toHaveLength(22);
    r.engine(truth(95, { cause: 'asystole' })); // the kept course had a pulse: this loss is new
    expect(r.data.rows.at(-1)).toMatchObject({ t: 95, ev: 'pulseLoss' });
  });

  it('a restart starts a new record; the data is JSON and survives a round trip', () => {
    const r = fresh();
    r.wire(applied(0, { type: 'scenario', action: 'load', doc: induction }));
    r.engine(meas(3, 97));
    r.wire({ type: 'timeline', t: 0, tick: 0, cause: 'restore' } as WireEvent);
    r.wire(applied(0, { type: 'scenario', action: 'restoreBookmark', target: 'Bookmark 9' })); // one it never saw: rows after t
    expect(r.data.rows.map((x) => x.undone ?? 0)).toEqual([0, 0]);
    const copy = JSON.parse(JSON.stringify(r.data));
    expect(copy).toEqual(r.data);
    r.wire({ type: 'timeline', t: 0, tick: 0, cause: 'restart' } as WireEvent);
    expect(r.data).toEqual({ startedAt: 1_000, lastWall: 1_000, patient: 'M 40 y 70 kg', weightKg: 70, doc: null, rows: [], samples: [], returns: 0 });
  });

  it('on a real host: a bookmark restore keeps the course before it and marks the course after it undone', async () => {
    const v = validateScenario(induction);
    if (!v.ok) throw new Error(v.errors.join('; '));
    const eo = engineOptionsOf(v.doc, 7);
    const engine = createEngine({ ...eo, mode: 'modeled', truthHz: 1, patient: { ...eo.patient, ...(v.doc.patient?.sensors ? { sensors: v.doc.patient.sensors } : {}) } } as never);
    const target: HostTarget = { dispatch: (c) => engine.dispatch(c), snapshot: () => engine.snapshot(), restore: (s) => engine.restore(s), on: (f) => engine.on(f), now: () => engine.now(), time: () => {} };
    let hs: HostSession | null = null;
    const driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (e) => hs?.publish(e) });
    hs = new HostSession({ session: 'REC234', target: driver.host, scenario: driver.hook, stateIntervalMs: 0 });
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const tap = hub.connect();
    const r = fresh();
    tap.onMessage((m) => m.kind === 'event' && m.body.forEach((e) => r.wire(e)));
    engine.on((e) => r.engine(e));
    const settle = () => new Promise((res) => setTimeout(res, 0));
    const run = async (to: number) => {
      for (let t = engine.now().simT; t < to; t += 0.1) {
        engine.advanceTo(t + 0.1);
        driver.poll();
        await settle(); // the host applies what the driver submitted, as between the app's polls
      }
    };
    const cmd = (c: Record<string, unknown>) => hs.submit({ id: `t${Math.random()}`, issuedBy: 'instructor', ...c } as never);
    expect((await cmd({ type: 'scenario', action: 'load', doc: v.doc })).accepted).toBe(true);
    await run(20);
    expect((await cmd({ type: 'scenario', action: 'bookmark', target: 'Bookmark 1 at 00:20' })).accepted).toBe(true);
    expect((await cmd({ type: 'scenario', action: 'trigger', target: 'induce' })).accepted).toBe(true);
    await run(90); // the apnoea alarm sounds about 55 s after induction
    expect(r.data.rows.some((x) => x.ev?.startsWith('alarm:apnoea'))).toBe(true);
    expect((await cmd({ type: 'scenario', action: 'restoreBookmark', target: 'Bookmark 1 at 00:20' })).accepted).toBe(true);
    await run(25);
    const undone = r.data.rows.filter((x) => x.undone === 1);
    expect(undone.map((x) => x.ev).filter(Boolean)).toEqual(expect.arrayContaining(['state:induced', 'drug:propofol', 'alarm:apnoea-co2']));
    expect(r.data.rows.filter((x) => x.kind === 'scenario' && x.undone === undefined && x.text.startsWith('Scenario')).map((x) => x.text)).toEqual([`Scenario loaded: ${induction.title}`, `Scenario state: ${induction.states[0]?.label}`]); // the return's re-publish of Awake is no new row
    expect(r.data.rows.filter((x) => x.undone === undefined).map((x) => x.kind)).toEqual(expect.arrayContaining(['bookmark', 'restore']));
    expect(r.data.samples.at(-1)?.t).toBeLessThanOrEqual(25);
    expect(r.data.samples.every((s, i, a) => i === 0 || s.t > (a[i - 1] as { t: number }).t)).toBe(true);
    hs.close();
  }, 60_000);

  it('on a real host: every alarm raised inside a fast-forward is a row at its own time, the trend has the span', async (ctx) => {
    const v = validateScenario(BUILTIN_SCENARIOS['acls-pea-hypovolaemia']);
    if (!v.ok) throw new Error(v.errors.join('; '));
    const eo = engineOptionsOf(v.doc, 7);
    const engine = createEngine({ ...eo, truthHz: 1, patient: { ...eo.patient, ...(v.doc.patient?.sensors ? { sensors: v.doc.patient.sensors } : {}) } } as never);
    const step = (n: number) => engine.advanceTo((engine.now().tick + n) * 0.02 + 1e-9);
    const base: HostTarget = { dispatch: (c) => engine.dispatch(c), snapshot: () => engine.snapshot(), restore: (s) => engine.restore(s), on: (f) => engine.on(f), now: () => engine.now(), time: () => {} };
    const target = Object.assign(base, { fastForwardStep: async (n: number) => (step(n), engine.now()) }); // The fast-forward hook
    let hs: HostSession | null = null;
    const driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (e) => hs?.publish(e) });
    hs = new HostSession({ session: 'REC345', target: driver.host, scenario: driver.hook, stateIntervalMs: 0 });
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const r = fresh();
    const ends: Array<{ fromT: number; toT: number; alarms: Array<{ id: string }> }> = [];
    hub.connect().onMessage((m) => m.kind === 'event' && m.body.forEach((e) => {
      r.wire(e);
      const f = e as unknown as { type: string; phase?: string; fromT: number; toT: number; alarms?: Array<{ id: string }> };
      if (f.type === 'fastForward' && f.phase === 'end') ends.push({ fromT: f.fromT, toT: f.toT, alarms: f.alarms ?? [] });
    }));
    engine.on((e) => r.engine(e));
    const settle = () => new Promise((res) => setTimeout(res, 0));
    const cmd = (c: Record<string, unknown>) => hs.submit({ id: `f${Math.random()}`, issuedBy: 'instructor', ...c } as never);
    expect((await cmd({ type: 'scenario', action: 'load', doc: v.doc })).accepted).toBe(true);
    for (let i = 0; i < 200; i++) (step(5), driver.poll(), await settle()); // 20 s
    const jump = await cmd({ type: 'time', action: 'jump', value: 300 });
    if (!jump.accepted) {
      hs.close();
      return ctx.skip(`no fast-forward on this tree (${jump.reason ?? 'refused'}): Stage 10 has not merged`);
    }
    for (let i = 0; i < 4000 && !ends.length; i++) await new Promise((res) => setTimeout(res, 5));
    const end = ends[0];
    if (!end) throw new Error('no fast-forward end event');
    expect(end.alarms.length).toBeGreaterThan(0);
    for (const a of end.alarms) expect(r.data.rows.some((x) => x.ev === `alarm:${a.id}` && x.t >= end.fromT && x.t <= end.toT), a.id).toBe(true);
    expect(r.data.samples.filter((s) => s.t >= end.fromT && s.t <= end.toT).length).toBeGreaterThanOrEqual(290);
    hs.close();
  }, 60_000);
});
