// The run record — every source becomes a row at its simulated time; a return to a bookmark keeps the discarded course
// as undone rows and rewinds the trend; a restart starts a new record; the data survives JSON. The last cases run a
// real engine, scenario driver and host session the way AppSession wires them (a bookmark restore; a fast-forward).
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { createInProcessHub, HostSession, type HostTarget, type WireEvent } from '@pme/controller';
import { BUILTIN_SCENARIOS, engineOptionsOf, ScenarioDriver, validateScenario } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import type { Administration, PhaseEntry, RuleEdge } from '@pme/controller/scenario';
import induction from './showcase/showcase-induction.json';
import mhV2 from './showcase/showcase-mh-v2.json';
import { emptyRun, RunRecord } from './record.ts';

const applied = (tick: number, command: Record<string, unknown>, extra: Record<string, unknown> = {}): WireEvent =>
  ({ type: 'commandApplied', commandId: `c${tick}`, tick, resolved: { command: { id: `c${tick}`, issuedBy: 'instructor', ...command }, ...extra } }) as WireEvent;
const alarms = (t: number, ids: string[]): EngineEvent => ({ type: 'alarmStatus', t, active: ids.map((id) => ({ id, level: 1, text: id, acked: false, latched: false })) }) as unknown as EngineEvent;
const truth = (t: number, arrest: unknown): EngineEvent => ({ type: 'truth', t, tree: { hemo: { circ: { arrest } } }, leaves: 1, dropped: 0, truncated: false }) as unknown as EngineEvent;
const meas = (t: number, spo2: number): EngineEvent => ({ type: 'measurement', t, values: { spo2: { value: spo2, flag: 'ok' }, hr: { value: 80, flag: 'ok' }, abpMean: { value: null, flag: 'invalid' }, nibpMean: { value: 75, flag: 'ok' } } }) as unknown as EngineEvent;
const breath = (t: number, kind: string): EngineEvent => ({ type: 'breath', t, seq: 1, kind, tiS: 1, teS: 2, vtMl: 500, etco2True: 38 }) as unknown as EngineEvent;
const labs = (t: number, k: number): EngineEvent => ({ type: 'labs', t, values: { k, lactate: 1.4, ph: 7.31 } }) as unknown as EngineEvent;
const NO_LABS = { k: null, lactate: null, ph: null, glucose: null, tcore: null };
/** D1: the pressures of a sample with no arterial line, no CVP and no cuff cycle in its second. */
const NO_P = { sys: null, dia: null, cvp: null };
/** A measurement event of the given numerics, each measured at `at` (default: the event's time), `null` invalid. */
const numerics = (t: number, v: Record<string, number | null>, at = t): EngineEvent => ({ type: 'measurement', t, values: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, { value: x, flag: x === null ? 'invalid' : 'valid', at }])) }) as unknown as EngineEvent;
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

  it('IP8: a state row names its transition and how the runner took it (the event\'s `by`), whatever the acknowledgements say', () => {
    const r = fresh();
    r.wire(applied(0, { type: 'scenario', action: 'load', doc: induction }));
    r.wire({ type: 'scenario', t: 0, stateId: 'awake' } as WireEvent); // the first state: no transition, no "by"
    r.wire({ type: 'scenario', t: 10.023, stateId: 'induced', transitionId: 'induce', by: 'press' } as WireEvent);
    // the press acknowledged at the tick of the host's first clock read, more than a tick before the state's time: the
    // record used to match the two within one tick and left this press 'rule'
    r.wire(applied(500, { type: 'scenario', action: 'trigger', target: 'induce' }));
    r.wire({ type: 'scenario', t: 30, stateId: 'desaturating', transitionId: 'desat', by: 'rule' } as WireEvent);
    r.wire(applied(2000, { type: 'scenario', action: 'trigger', target: 'rescueBvm-desaturating' })); // waits for its condition
    r.wire({ type: 'scenario', t: 41, stateId: 'rescuedBvm', transitionId: 'rescueBvm-desaturating', by: 'press' } as WireEvent);
    r.wire({ type: 'scenario', t: 50, stateId: 'cpr', by: 'goto' } as WireEvent);
    r.wire(applied(2500, { type: 'scenario', action: 'goto', target: 'cpr' }));
    r.wire(applied(3000, { type: 'scenario', action: 'goto', target: 'rosc' })); // a jump acknowledged first
    r.wire({ type: 'scenario', t: 60, stateId: 'rosc', by: 'goto' } as WireEvent);
    r.wire(applied(3500, { type: 'scenario', action: 'trigger', target: 'intubate' })); // a press whose state came by its rule
    r.wire({ type: 'scenario', t: 70, stateId: 'ventilated', transitionId: 'intubate', by: 'rule' } as WireEvent);
    const states = r.data.rows.filter((x) => x.ev?.startsWith('state:')).map((x) => [x.t, x.ev, x.tr ?? '', x.by ?? '']);
    expect(states).toEqual([
      [0, 'state:awake', '', ''], [10.023, 'state:induced', 'induce', 'press'], [30, 'state:desaturating', 'desat', 'rule'],
      [41, 'state:rescuedBvm', 'rescueBvm-desaturating', 'press'], [50, 'state:cpr', '', 'goto'], [60, 'state:rosc', '', 'goto'], [70, 'state:ventilated', 'intubate', 'rule'],
    ]);
    // the jumps still print as before, the presses still do not
    expect(r.data.rows.filter((x) => x.kind === 'scenario' && !x.ev).map((x) => x.text)).toEqual([`Scenario loaded: ${induction.title}`, 'Scenario: jumped to a state', 'Scenario: jumped to a state']);
  });

  it('IP8: a mark keeps its kind and note; an item of a staged delivery keeps its own row with the delivery; other rows are unchanged', () => {
    const r = fresh();
    r.wire(applied(1000, { type: 'scenario', action: 'bookmark', target: 'Mark 1 at 00:20', kind: 'good', note: '  called it early ' }));
    r.wire(applied(1500, { type: 'scenario', action: 'bookmark', target: 'Mark 2 at 00:30', kind: 'loud', note: '' })); // no such kind
    r.wire(applied(1600, { type: 'scenario', action: 'bookmark', target: 'Bookmark 1 at 00:32' }));
    const batch = { id: 'sg-7', n: 2 };
    r.wire(applied(2000, { type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 1, unit: 'mg', route: 'iv' }, batch }));
    r.wire(applied(2000, { type: 'applyEvent', event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 500, overS: 300 }, batch }));
    r.wire(applied(2100, { type: 'applyEvent', event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 500, overS: 300 }, issuedBy: 'scenario', batch: { id: 'x', n: 1 } })); // the card's own: no batch
    r.wire(applied(2200, { type: 'applyEvent', event: { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' } }));
    const [m1, m2, m3, a, b, sc, c] = r.data.rows;
    expect([m1?.markKind, m1?.note, m1?.mark]).toEqual(['good', 'called it early', 'Mark 1 at 00:20']);
    expect([m2, m3].map((x) => [x && 'markKind' in x, x && 'note' in x])).toEqual([[false, false], [false, false]]);
    expect([a?.ev, a?.batch, b?.ev, b?.batch]).toEqual(['drug:epinephrine', batch, 'fluid', batch]); // rules still see each item
    expect([sc?.kind, sc && 'batch' in sc, c && 'batch' in c]).toEqual(['scenario', false, false]);
    expect(Object.keys(c as object).sort()).toEqual(['dose', 'ev', 'kind', 't', 'text']); // a row with nothing new is as before
  });

  it('D2: an alarm raise row keeps when its condition cleared (endT) and when it was acknowledged (ackT)', () => {
    const r = fresh();
    const st = (t: number, a: Array<[string, { latched?: boolean; acked?: boolean }?]>) => r.engine({ type: 'alarmStatus', t, active: a.map(([id, f]) => ({ id, level: 1, text: id, acked: f?.acked ?? false, latched: f?.latched ?? false })) } as unknown as EngineEvent);
    st(10, [['A'], ['B'], ['C'], ['D']]);
    st(11, [['A'], ['B'], ['C'], ['D']]); // all four still active
    st(12, [['A'], ['B'], ['C', { acked: true }], ['D']]); // C acknowledged at 12 while its condition lasts
    st(13, [['A'], ['B'], ['C', { acked: true }], ['D']]);
    st(20, [['A'], ['B', { latched: true }], ['C', { acked: true }], ['D']]); // B's condition gone, the alarm latched
    st(25, [['B', { latched: true }], ['C', { acked: true }], ['D']]); // A left the active list
    st(30, [['B', { latched: true, acked: true }], ['C', { acked: true }], ['D']]);
    st(40, [['D']]); // B and C end; D is still active at the end of the record
    st(50, [['A'], ['D']]); // A raised again after its end: its own row
    const row = (id: string, i = 0) => r.data.rows.filter((x) => x.ev === `alarm:${id}`)[i];
    expect(['A', 'B', 'C', 'D'].map((id) => [row(id)?.t, row(id)?.endT, row(id)?.ackT])).toEqual([[10, 25, undefined], [10, 20, 30], [10, 40, 12], [10, undefined, undefined]]);
    expect([row('A', 1)?.t, row('A', 1)?.endT]).toEqual([50, undefined]);
    expect(r.data.keeps).toEqual(expect.arrayContaining(['pressures', 'alarmEnd']));
    // a row with nothing new is as before (no endT/ackT keys while open)
    expect(Object.keys(row('D') as object).sort()).toEqual(['ev', 'kind', 't', 'text']);
  });

  it('D2: a latched alarm whose condition comes back is live again: its end is the later one (manager.ts: "the condition came back while latched")', () => {
    const r = fresh();
    const st = (t: number, latched: boolean | null) => r.engine({ type: 'alarmStatus', t, active: latched === null ? [] : [{ id: 'X', level: 1, text: 'X', acked: false, latched }] } as unknown as EngineEvent);
    st(10, false); st(15, true); st(18, false); st(30, true); st(35, null);
    expect(r.data.rows.map((x) => [x.t, x.endT])).toEqual([[10, 30]]);
  });

  it('D2: a return to a bookmark clears every end and acknowledgement later than the restore; the alarm active at the bookmark ends on the kept course', () => {
    const r = fresh();
    const st = (t: number, a: Array<[string, boolean?]>) => r.engine({ type: 'alarmStatus', t, active: a.map(([id, acked]) => ({ id, level: 1, text: id, acked: acked ?? false, latched: false })) } as unknown as EngineEvent);
    st(5, [['E']]);
    st(8, []); // E ended before the bookmark: kept
    st(10, [['A']]);
    r.wire(applied(750, { type: 'scenario', action: 'bookmark', target: 'Bookmark 1 at 00:15' })); // 15 s: A active
    st(18, [['A', true]]);
    st(22, [['B']]); // raised after the bookmark: undone with the course
    st(25, [['B']]); // A ends at 25 on the discarded course
    r.wire({ type: 'timeline', t: 15, tick: 750, cause: 'restore' } as WireEvent);
    r.wire(applied(750, { type: 'scenario', action: 'restoreBookmark', target: 'Bookmark 1 at 00:15' }));
    const a = () => r.data.rows.find((x) => x.ev === 'alarm:A');
    expect([a()?.endT, a()?.ackT]).toEqual([undefined, undefined]);
    expect(r.data.rows.find((x) => x.ev === 'alarm:E')?.endT).toBe(8);
    expect(r.data.rows.find((x) => x.ev === 'alarm:B')?.undone).toBe(1);
    st(16, [['A']]); // the restored engine: A still active, not raised again
    st(31, []); // and it ends at 31 on the kept course
    expect(r.data.rows.filter((x) => x.ev === 'alarm:A').map((x) => [x.t, x.endT, x.ackT])).toEqual([[10, 31, undefined]]);
  });

  it('D3: a CPR command that stops compressions is a row with ev "cprStop" (the instructor\'s, a Remote\'s or the card\'s)', () => {
    const r = fresh();
    r.wire(applied(500, { type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110 } }));
    r.wire(applied(1000, { type: 'applyEvent', event: { kind: 'cpr', active: false } }));
    r.wire(applied(1500, { type: 'applyEvent', event: { kind: 'cpr', active: true }, issuedBy: 'remote' }));
    r.wire(applied(2000, { type: 'applyEvent', event: { kind: 'cpr', active: false }, issuedBy: 'scenario' }));
    expect(r.data.rows.map((x) => [x.t, x.kind, x.text, x.ev])).toEqual([
      [10, 'action', 'CPR started, 110 /min', 'cpr'], [20, 'action', 'CPR stopped', 'cprStop'],
      [30, 'remote', 'CPR started', 'cpr'], [40, 'scenario', 'CPR stopped', 'cprStop'],
    ]);
    expect(r.data.keeps).toEqual(expect.arrayContaining(['pressures', 'alarmEnd', 'cprStop']));
  });

  it('D3 cross-check on a real host: the CPR rows\' on/off times are the edges of the engine\'s hemo.cpr.active, within one tick', async () => {
    const v = validateScenario(BUILTIN_SCENARIOS['acls-pea-hypovolaemia']);
    if (!v.ok) throw new Error(v.errors.join('; '));
    const eo = engineOptionsOf(v.doc, 7);
    const engine = createEngine({ ...eo, mode: 'modeled', truthHz: 1, patient: { ...eo.patient, ...(v.doc.patient?.sensors ? { sensors: v.doc.patient.sensors } : {}) } } as never);
    // the engine's own CPR state (l2/hemo/pipeline.ts `hs.cpr.active`), read after every tick: the truth event carries
    // it too (`tree.hemo.cpr.active`) but at most at 2 Hz, too coarse to place an edge within a tick
    const cprActive = () => (engine as unknown as { st: { hemo: { cpr: { active: boolean } } } }).st.hemo.cpr.active;
    const target: HostTarget = { dispatch: (c) => engine.dispatch(c), snapshot: () => engine.snapshot(), restore: (s) => engine.restore(s), on: (f) => engine.on(f), now: () => engine.now(), time: () => {} };
    let hs: HostSession | null = null;
    const driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (e) => hs?.publish(e) });
    hs = new HostSession({ session: 'REC567', target: driver.host, scenario: driver.hook, stateIntervalMs: 0 });
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const r = fresh();
    hub.connect().onMessage((m) => m.kind === 'event' && m.body.forEach((e) => r.wire(e)));
    const edges: Array<[number, 'cpr' | 'cprStop']> = [];
    const truths: boolean[] = [];
    engine.on((e) => {
      r.engine(e);
      if (e.type === 'truth') truths.push((e.tree.hemo as { cpr?: { active?: unknown } } | undefined)?.cpr?.active === true);
    });
    let was = cprActive();
    const settle = () => new Promise((res) => setTimeout(res, 0));
    const run = async (to: number) => {
      while (engine.now().simT < to - 1e-9) {
        for (let i = 0; i < 5; i++) {
          engine.advanceTo((engine.now().tick + 1) * 0.02 + 1e-9);
          const on = cprActive();
          if (on !== was) edges.push([engine.now().tick * 0.02, on ? 'cpr' : 'cprStop']);
          was = on;
        }
        driver.poll();
        await settle();
      }
    };
    const cmd = async (c: Record<string, unknown>) => expect((await hs.submit({ id: `x${Math.random()}`, issuedBy: 'instructor', ...c } as never)).accepted).toBe(true);
    await cmd({ type: 'scenario', action: 'load', doc: v.doc });
    await run(2);
    await cmd({ type: 'scenario', action: 'trigger', target: 'losePulse' }); // PEA
    for (const [t, active] of [[6, true], [16, false], [21, true], [33, false]] as const) {
      await run(t);
      await cmd({ type: 'applyEvent', event: { kind: 'cpr', active, rate: 110, quality: 0.8 } });
    }
    await run(40);
    hs.close();
    const loss = r.data.rows.find((x) => x.ev === 'pulseLoss');
    expect(loss && loss.t < 6).toBe(true); // all four inside one pulseless span (no return of circulation)
    expect(r.data.rows.some((x) => x.ev === 'rosc')).toBe(false);
    const rows = r.data.rows.filter((x) => x.ev === 'cpr' || x.ev === 'cprStop').map((x): [number, string] => [x.t, x.ev as string]);
    expect(rows.map((x) => x[1])).toEqual(['cpr', 'cprStop', 'cpr', 'cprStop']);
    // every edge of the engine's own state has its row, and no edge comes without a command
    expect(edges.map((x) => x[1])).toEqual(rows.map((x) => x[1]));
    edges.forEach(([t], i) => expect(Math.abs(t - (rows[i] as [number, string])[0]), `edge ${i} at ${t}`).toBeLessThanOrEqual(0.02 + 1e-6));
    expect(truths.filter((x, i) => i > 0 && x !== truths[i - 1])).toHaveLength(4); // the 1 Hz truth sees the same four
  }, 60_000);

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
      { t: 0, hr: 80, map: 75, spo2: 98, etco2: null, rr: null, temp: null, ...NO_LABS, ...NO_P },
      { t: 1, hr: 80, map: 75, spo2: 97, etco2: null, rr: null, temp: null, ...NO_LABS, ...NO_P },
    ]);
  });

  it('D1: systolic, diastolic and CVP join the sample: the arterial line first, else the cuff in the second of its cycle only', () => {
    const r = fresh();
    // ART before the cuff; each stored in whole mmHg, as the monitor prints it (the orchestrator's ruling on #282)
    r.engine(numerics(10, { abpSys: 92.4, abpDia: 57.6, abpMean: 70.2, cvpMean: 16.5, nibpSys: 120, nibpDia: 80 }));
    expect(r.data.samples.at(-1)).toMatchObject({ t: 10, sys: 92, dia: 58, cvp: 17, map: 70.2 }); // `map` (TREND) as before
    // no arterial line reading; a cuff cycle reports 100/60 at 40.3 s (the hemo pipeline's one measurement of a cycle)
    r.engine(numerics(40, { abpSys: null, abpDia: null, abpMean: null, cvpMean: 12 }));
    r.engine(numerics(40.3, { nibpSys: 100, nibpDia: 60, nibpMean: 73 }));
    r.engine(numerics(40.6, { hr: 88 })); // a later event of the same second keeps the cycle's value
    for (let t = 41; t <= 45; t++) r.engine(numerics(t, { abpSys: null, abpDia: null, abpMean: null, cvpMean: 12, hr: 88 }));
    // the same cycle's reading repeated, as a monitor's tile would hold it: it is still the cycle of 40 s, not a new one
    r.engine(numerics(46, { nibpSys: 100, nibpDia: 60, nibpMean: 73 }, 40.3));
    r.engine(numerics(100.2, { nibpSys: 104, nibpDia: 62, nibpMean: 76 })); // the next cycle
    const at = (t: number) => r.data.samples.find((x) => x.t === t);
    expect(at(40)).toMatchObject({ sys: 100, dia: 60, cvp: 12 });
    expect([41, 42, 43, 44, 45, 46].map((t) => [at(t)?.sys, at(t)?.dia])).toEqual(Array(6).fill([null, null])); // the gap stays blank
    expect(at(100)).toMatchObject({ sys: 104, dia: 62 });
    // `map` (TREND, the first valid of abpMean then nibpMean) follows the same rule (research/41 row 53): the cuff's 73
    // sits in its cycle's second and the seconds between cycles are null, never the cycle's value held
    expect(at(40)?.map).toBe(73);
    expect([41, 42, 43, 44, 45, 46].map((t) => at(t)?.map)).toEqual(Array(6).fill(null));
    expect(at(100)?.map).toBe(76);
    // an invalid value is null; a line that stops reporting is null in the seconds it is silent, never its last value
    r.engine(numerics(101, { abpSys: null, abpDia: null, cvpMean: null }));
    r.engine(numerics(102, { hr: 70 }));
    expect([at(101), at(102)].map((x) => [x?.sys, x?.dia, x?.cvp])).toEqual([[null, null, null], [null, null, null]]);
  });

  it('D1: an arterial MAP is kept every second; a cuff MAP only in the second of its cycle, null between cycles', () => {
    const r = fresh();
    r.engine(numerics(40.3, { nibpSys: 100, nibpDia: 60, nibpMean: 73 })); // a cuff cycle, no arterial line
    for (let t = 41; t <= 44; t++) r.engine(numerics(t, { abpMean: null, hr: 80 }));
    for (let t = 45; t <= 48; t++) r.engine(numerics(t, { abpMean: 80 + t - 45 })); // the arterial line reads every second
    const at = (t: number) => r.data.samples.find((x) => x.t === t)?.map;
    expect([40, 41, 42, 43, 44].map(at)).toEqual([73, null, null, null, null]);
    expect([45, 46, 47, 48].map(at)).toEqual([80, 81, 82, 83]);
  });

  it('D1: a record keeps `keeps` = the facts its build records; a new record and emptyRun() have "pressures"', () => {
    expect(fresh().data.keeps).toEqual(expect.arrayContaining(['pressures']));
    expect(emptyRun().keeps).toEqual(expect.arrayContaining(['pressures']));
    const r = fresh();
    r.wire({ type: 'timeline', t: 0, tick: 0, cause: 'restart' } as WireEvent);
    expect(r.data.keeps).toEqual(expect.arrayContaining(['pressures']));
  });

  it('D5: note() takes an optional ev (the /1 Recognised press); `keeps` gains "recognised"; a return undoes a press after it', () => {
    const r = fresh();
    r.note(30, 'Recognised (instructor)', 'recognised');
    r.note(40, 'a plain note');
    expect(r.data.rows.slice(-2)).toEqual([{ t: 30, kind: 'note', text: 'Recognised (instructor)', ev: 'recognised' }, { t: 40, kind: 'note', text: 'a plain note' }]);
    expect(r.data.keeps).toEqual(expect.arrayContaining(['recognised']));
    expect(emptyRun().keeps).toEqual(expect.arrayContaining(['recognised']));
  });

  it('D1 on a real engine: a cuff with no arterial line gives sys/dia in the second of each cycle only', async () => {
    const v = validateScenario(induction);
    if (!v.ok) throw new Error(v.errors.join('; '));
    const eo = engineOptionsOf(v.doc, 7);
    const engine = createEngine({ ...eo, mode: 'modeled', truthHz: 1, patient: { ...eo.patient, sensors: { ...v.doc.patient?.sensors, abp: 'none' } } } as never);
    const r = fresh();
    const cycles: Array<{ t: number; sys: number }> = [];
    let nibpEvents = 0;
    engine.on((e) => {
      r.engine(e);
      if (e.type === 'nibp' && e.result) cycles.push({ t: e.t, sys: e.result.sys });
      if (e.type === 'measurement' && 'nibpSys' in e.values) nibpEvents++;
    });
    engine.advanceTo(1);
    engine.dispatch({ id: 'n1', issuedBy: 'instructor', type: 'device', action: { device: 'nibp', action: 'auto', intervalMin: 1 } } as never);
    for (let t = 1; t < 200; t += 0.5) engine.advanceTo(t + 0.5);
    expect(cycles.length).toBeGreaterThanOrEqual(3);
    // the pipeline emits nibpSys once per cycle (pipeline.ts nibpEvents): as many measurement events as cycles
    expect(nibpEvents).toBe(cycles.length);
    const withSys = r.data.samples.filter((s) => s.sys !== null);
    expect(withSys.map((s) => [s.t, s.sys])).toEqual(cycles.map((c) => [Math.floor(c.t), Math.round(c.sys)]));
    expect(r.data.samples.every((s) => s.sys === null || Number.isInteger(s.sys))).toBe(true);
    expect(r.data.samples.every((s) => s.cvp === null)).toBe(true); // the card has no CVP line
  }, 60_000);

  it('Q7: the model’s K⁺, lactate, pH, glucose and core temperature join the 1 Hz sample', () => {
    const r = fresh();
    r.engine(meas(0.2, 99));
    r.engine(labs(1, 5.6));
    r.engine({ type: 'endo', t: 1, glucoseMmolL: 6.1 } as unknown as EngineEvent);
    r.engine({ type: 'truth', t: 1, tree: { hemo: { circ: { arrest: null } }, resp: { temp: { tc: 38.04 } } }, leaves: 2, dropped: 0, truncated: false } as unknown as EngineEvent);
    r.engine(meas(1.5, 97));
    expect(r.data.samples).toEqual([
      { t: 0, hr: 80, map: 75, spo2: 99, etco2: null, rr: null, temp: null, ...NO_LABS, ...NO_P },
      { t: 1, hr: 80, map: 75, spo2: 97, etco2: null, rr: null, temp: null, k: 5.6, lactate: 1.4, ph: 7.31, glucose: 6.1, tcore: 38, ...NO_P },
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
    expect(r.data).toEqual({ startedAt: 1_000, lastWall: 1_000, patient: 'M 40 y 70 kg', weightKg: 70, doc: null, rows: [], samples: [], returns: 0, keeps: ['pressures', 'alarmEnd', 'cprStop', 'recognised'] });
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

  it('IP8 on a real host: a press, a jump, a mark with its kind and note, and a staged delivery reach the record as the host applies them', async () => {
    const v = validateScenario(induction);
    if (!v.ok) throw new Error(v.errors.join('; '));
    const eo = engineOptionsOf(v.doc, 7);
    const engine = createEngine({ ...eo, mode: 'modeled', truthHz: 1, patient: { ...eo.patient, ...(v.doc.patient?.sensors ? { sensors: v.doc.patient.sensors } : {}) } } as never);
    const target: HostTarget = { dispatch: (c) => engine.dispatch(c), snapshot: () => engine.snapshot(), restore: (s) => engine.restore(s), on: (f) => engine.on(f), now: () => engine.now(), time: () => {} };
    let hs: HostSession | null = null;
    const driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (e) => hs?.publish(e) });
    hs = new HostSession({ session: 'REC456', target: driver.host, scenario: driver.hook, stateIntervalMs: 0 });
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const r = fresh();
    hub.connect().onMessage((m) => m.kind === 'event' && m.body.forEach((e) => r.wire(e)));
    engine.on((e) => r.engine(e));
    const settle = () => new Promise((res) => setTimeout(res, 0));
    const run = async (to: number) => {
      for (let t = engine.now().simT; t < to; t += 0.1) (engine.advanceTo(t + 0.1), driver.poll(), await settle());
    };
    const cmd = async (c: Record<string, unknown>) => {
      const a = await hs.submit({ id: `i${Math.random()}`, issuedBy: 'instructor', ...c } as never);
      await settle();
      return a.accepted;
    };
    expect(await cmd({ type: 'scenario', action: 'load', doc: v.doc })).toBe(true);
    await run(5);
    expect(await cmd({ type: 'scenario', action: 'trigger', target: 'induce' })).toBe(true);
    await run(10);
    expect(await cmd({ type: 'scenario', action: 'bookmark', target: 'Mark 1 at 00:10', kind: 'discuss', note: 'slow induction' })).toBe(true);
    const batch = { id: 'sg-ip8', n: 2 };
    expect(await cmd({ type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 0.01, unit: 'mg', route: 'iv' }, stageGroup: 'sg-ip8', batch })).toBe(true);
    expect(await cmd({ type: 'applyEvent', event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 250, overS: 300 }, stageGroup: 'sg-ip8', batch })).toBe(true);
    await run(15);
    expect(await cmd({ type: 'scenario', action: 'goto', target: 'cpr' })).toBe(true);
    await run(20);
    const states = r.data.rows.filter((x) => x.ev?.startsWith('state:')).map((x) => [x.ev, x.tr ?? '', x.by ?? '']);
    expect(states).toEqual([['state:awake', '', ''], ['state:induced', 'induce', 'press'], ['state:cpr', '', 'goto']]);
    expect(r.data.rows.find((x) => x.kind === 'bookmark')).toMatchObject({ mark: 'Mark 1 at 00:10', markKind: 'discuss', note: 'slow induction' });
    expect(r.data.rows.filter((x) => x.batch).map((x) => [x.ev, x.batch])).toEqual([['drug:epinephrine', batch], ['fluid', batch]]);
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

  it('F7: a /2 run copies the runner\'s phases, administrations and edges (each second and on a phase); they survive keep()/resume() and a restore', () => {
    const pr: { phases: PhaseEntry[]; admin: Administration[]; edges: RuleEdge[] } = { phases: [{ id: 'baseline', t: 0, rule: 'start' }], admin: [], edges: [] };
    const r = new RunRecord(() => ({ patient: 'M 35 y 80 kg', weightKg: 80 }), () => 1_000, () => pr);
    r.wire(applied(0, { type: 'scenario', action: 'load', doc: mhV2 }));
    r.wire({ type: 'scenario', t: 0, stateId: 'baseline' } as WireEvent);
    expect(r.data).toMatchObject({ format: 2, phases: [{ id: 'baseline', t: 0, rule: 'start' }], admin: [], edges: [] });
    pr.admin.push({ seq: 1, t: 30.5, source: 'action', actionId: 'premedicate', kind: 'drug', drugId: 'midazolam', dose: 2, unit: 'mg', route: 'iv', result: { accepted: true } });
    r.engine(meas(30.5, 99)); // the second's sample: the copy goes with it
    expect(r.data.admin).toHaveLength(1);
    pr.edges.push({ rule: 'action:callCrisis:anchor', t: 40, value: true });
    r.engine(meas(40.2, 99));
    pr.phases[0]!.exitT = 60; // the runner closes the entry in place: the copy is not a reference to it
    pr.phases.push({ id: 'latent', t: 60, rule: 'enter:latent' });
    r.wire({ type: 'scenario', t: 60, stateId: 'latent' } as WireEvent); // a phase: copied at once
    expect(r.data.phases).toEqual([{ id: 'baseline', t: 0, exitT: 60, rule: 'start' }, { id: 'latent', t: 60, rule: 'enter:latent' }]);
    pr.phases[1]!.exitT = 999;
    expect(r.data.phases?.[1]).toEqual({ id: 'latent', t: 60, rule: 'enter:latent' });
    delete pr.phases[1]!.exitT;
    // the page reloads: the kept record goes on without the driver
    const kept = JSON.parse(JSON.stringify(r.keep())) as ReturnType<RunRecord['keep']>;
    const b = new RunRecord(() => ({ patient: 'M 35 y 80 kg', weightKg: 80 }), () => 1_000);
    b.resume(kept, 61);
    expect(b.data).toMatchObject({ format: 2, phases: r.data.phases, admin: r.data.admin, edges: r.data.edges });
    // a return to a bookmark at 35 s: the runner's state goes back, and so does the copy (the kept course)
    pr.phases.splice(1);
    delete pr.phases[0]!.exitT;
    pr.edges.splice(0);
    r.wire({ type: 'timeline', t: 35, tick: 1750, cause: 'restore' } as WireEvent);
    expect(r.data).toMatchObject({ phases: [{ id: 'baseline', t: 0, rule: 'start' }], admin: [{ seq: 1 }], edges: [] });
    // a /1 run carries none of it
    const one = new RunRecord(() => ({ patient: 'M 35 y 80 kg', weightKg: 80 }), () => 1_000, () => pr);
    one.wire(applied(0, { type: 'scenario', action: 'load', doc: induction }));
    one.wire({ type: 'scenario', t: 0, stateId: 'awake' } as WireEvent);
    one.engine(meas(1, 99));
    expect(Object.keys(one.data)).toEqual(['startedAt', 'lastWall', 'patient', 'weightKg', 'doc', 'rows', 'samples', 'returns', 'keeps']);
  });
});
