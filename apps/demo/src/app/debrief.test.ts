// The debrief's judgements — every rule kind met, not met and not assessable, read on the kept course (an event before
// the anchor, a second anchor, a value never measured); the measured facts, the labs and the drug totals; objectives
// without a rule listed as not assessable (with the instructor's tick); the minute table and the JSON.
import type { ObjectiveRule } from '@pme/controller/scenario';
import { validateScenario } from '@pme/controller/scenario';
import { version } from '@pme/renderer';
import { describe, expect, it } from 'vitest';
import { axisRange, drugTotals, facts, judged, marks, objectives, perMinute, span, steps, verdict } from './debrief.ts';
import { debriefJson } from './debrief-export.ts';
import { keyMoments, keyTimes } from './debrief-moments.ts';
import { emptyRun, type Row, type RunData, type Sample } from './record.ts';
import { cardOf } from './scenarios.ts';

/** A two-state case (the showcase cards' words may change). */
const DOC = { schema: 'pme-scenario/1', id: 'case', title: 'Case', initialState: 'awake', states: [{ id: 'awake', label: 'Awake' }, { id: 'induced', label: 'Induced' }] } as const;
const sample = (t: number, o: Partial<Sample> = {}): Sample => ({ t, hr: 80, map: 80, spo2: 98, etco2: 38, rr: 12, temp: 36.8, k: null, lactate: null, ph: null, glucose: null, tcore: null, ...o });
const run = (rows: Row[], samples: Sample[] = [], weightKg = 70): RunData => ({ ...emptyRun('M 40 y 70 kg', weightKg, 0), doc: DOC as never, rows, samples });
const apnoea = (t: number, undone?: number): Row => ({ t, kind: 'alarm', text: 'Apnoea (no CO₂ breaths)', ev: 'alarm:apnoea-co2', ...(undone ? { undone } : {}) });
const vent = (t: number, undone?: number): Row => ({ t, kind: 'patient', text: 'Ventilated breaths began', ev: 'ventilation', ...(undone ? { undone } : {}) });
const v = (rule: ObjectiveRule, d: RunData) => verdict(rule, d);

describe('objective rules', () => {
  const within: ObjectiveRule = { kind: 'eventWithin', after: 'alarm:apnoea', event: 'ventilation', withinS: 90 };

  it('eventWithin: met, not met (late or never), not assessable (no trigger, or the run ended first)', () => {
    expect(v(within, run([apnoea(66), vent(106)]))).toEqual({ status: 'met', why: 'Ventilated breaths 40 s after the alarm Apnoea (no CO₂ breaths) (01:06 → 01:46; within 1 min 30 s asked).', measure: { fromT: 66, toT: 106, askedS: 90 } });
    expect(v(within, run([apnoea(66), vent(200)])).status).toBe('not met');
    expect(v(within, run([apnoea(66)], [sample(200)]))).toEqual({ status: 'not met', why: 'No ventilated breaths within 1 min 30 s of the alarm Apnoea (no CO₂ breaths) at 01:06.' });
    expect(v(within, run([], [sample(300)]))).toEqual({ status: 'not assessable', why: 'The alarm Apnoea (no CO₂ breaths) did not happen.' });
    expect(v(within, run([apnoea(66)], [sample(100)])).why).toBe('The run ended 34 s after the alarm Apnoea (no CO₂ breaths) at 01:06, before 1 min 30 s had passed.');
  });

  it('an event before the anchor does not count; a second anchor is not judged again (the first is)', () => {
    expect(v(within, run([vent(30), apnoea(66)], [sample(200)]))).toEqual({ status: 'not met', why: 'No ventilated breaths within 1 min 30 s of the alarm Apnoea (no CO₂ breaths) at 01:06.' });
    const cpr: ObjectiveRule = { kind: 'eventWithin', after: 'pulseLoss', event: 'cpr', withinS: 30 };
    const rows: Row[] = [
      { t: 100, kind: 'patient', text: 'Pulse lost (the model)', ev: 'pulseLoss' }, { t: 160, kind: 'patient', text: 'Circulation returned (the model)', ev: 'rosc' },
      { t: 300, kind: 'patient', text: 'Pulse lost (the model)', ev: 'pulseLoss' }, { t: 310, kind: 'action', text: 'CPR started', ev: 'cpr' },
    ];
    expect(v(cpr, run(rows))).toEqual({ status: 'not met', why: 'CPR 3 min 30 s after the pulse loss (01:40 → 05:10; within 30 s asked).', measure: { fromT: 100, toT: 310, askedS: 30 } });
  });

  it('a value never measured is not assessable, never "did not happen"', () => {
    const none = [sample(0, { spo2: null, map: null }), sample(200, { spo2: null, map: null })];
    expect(v({ kind: 'occurred', event: 'value:spo2<90' }, run([], none))).toEqual({ status: 'not assessable', why: 'SpO₂ was not measured during the run.' });
    expect(v({ kind: 'never', event: 'value:spo2<90' }, run([], none)).status).toBe('not assessable');
    const pe: Row = { t: 60, kind: 'action', text: 'Phenylephrine 100 µg IV', ev: 'drug:phenylephrine' };
    expect(v({ kind: 'eventWithin', after: 'drug:phenylephrine', event: 'value:map>65', withinS: 120 }, run([pe], [sample(0, { map: 50 }), sample(61, { map: null }), sample(300, { map: null })])))
      .toEqual({ status: 'not assessable', why: 'ART M / NIBP M was not measured after Phenylephrine at 01:00.' });
    expect(v({ kind: 'eventWithin', after: 'value:map<60', event: 'drug:phenylephrine', withinS: 60 }, run([pe], none)).why).toBe('ART M / NIBP M was not measured during the run.');
  });

  it('from: a value event counted only after an event — "EtCO₂ below 40 after the crisis was called"', () => {
    const xs = [sample(0, { etco2: 34 }), sample(20, { etco2: 52 }), sample(100, { etco2: 38 })];
    const off: Row = { t: 10, kind: 'scenario', text: 'x', ev: 'state:induced' };
    const back: Row = { t: 130, kind: 'scenario', text: 'y', ev: 'ventilation' };
    const rule: ObjectiveRule = { kind: 'eventWithin', from: 'state:induced', after: 'value:etco2<40', event: 'ventilation', withinS: 60 };
    expect(v(rule, run([off, back], xs))).toEqual({ status: 'met', why: 'Ventilated breaths 30 s after EtCO₂ below 40 mmHg after the state "Induced" (01:40 → 02:10; within 1 min 00 s asked).', measure: { fromT: 100, toT: 130, askedS: 60 } });
    expect(v({ ...rule, from: undefined } as ObjectiveRule, run([off, back], xs)).status).toBe('not met'); // without it: the baseline at 00:00
    expect(v(rule, run([back], xs))).toEqual({ status: 'not assessable', why: 'The state "Induced" did not happen.' });
    expect(v({ kind: 'occurred', from: 'state:induced', event: 'value:etco2<40' }, run([off], xs))).toEqual({ status: 'met', why: 'EtCO₂ below 40 mmHg after the state "Induced" at 01:40' });
    expect(v({ kind: 'never', from: 'state:induced', event: 'value:etco2<40' }, run([off], [sample(0, { etco2: 34 }), sample(20, { etco2: null })])).why).toBe('EtCO₂ was not measured after the state "Induced" at 00:10.');
  });

  it('Q7: a lab value in a rule — K⁺ above 5.5, treated within 300 s', () => {
    const potassium: ObjectiveRule = { kind: 'eventWithin', after: 'value:k>5.5', event: ['drug:calciumChloride', 'drug:insulinDextrose'], withinS: 300 };
    const ca: Row = { t: 400, kind: 'scenario', text: 'Calcium chloride', ev: 'drug:calciumChloride' };
    const ks = [sample(0, { k: 4.2 }), sample(200, { k: 5.6 }), sample(400, { k: 6.1 })];
    expect(v(potassium, run([ca], ks))).toEqual({ status: 'met', why: 'Calcium chloride 10 % or Insulin + dextrose 3 min 20 s after K⁺ above 5.5 mmol/L (03:20 → 06:40; within 5 min 00 s asked).', measure: { fromT: 200, toT: 400, askedS: 300 } });
    expect(v({ kind: 'stayed', value: 'k', below: 6, after: 'drug:calciumChloride', forS: 60 }, run([ca], ks)).status).toBe('not met');
  });

  it('reads the kept course: an undone try does not count, the retry does', () => {
    expect(v(within, run([apnoea(66), vent(250, 1), { t: 20, kind: 'restore', text: 'Returned to bookmark' }, apnoea(66), vent(100)])).status).toBe('met');
    expect(v(within, run([apnoea(66, 1), vent(100, 1)], [sample(30)])).status).toBe('not assessable');
  });

  it('ROSC within N s of the pulse loss is an eventWithin', () => {
    const rosc: ObjectiveRule = { kind: 'eventWithin', after: 'pulseLoss', event: 'rosc', withinS: 300 };
    const lost: Row = { t: 600, kind: 'patient', text: 'Pulse lost (the model)', ev: 'pulseLoss' };
    expect(v(rosc, run([lost, { t: 780, kind: 'patient', text: 'Circulation returned (the model)', ev: 'rosc' }])).why).toBe('The return of circulation 3 min 00 s after the pulse loss (10:00 → 13:00; within 5 min 00 s asked).');
    expect(v(rosc, run([lost], [sample(1000)])).status).toBe('not met');
  });

  it('value events and lists of events', () => {
    const xs = [sample(0, { map: 80 }), sample(30, { map: 58 }), sample(50, { map: 59 }), sample(70, { map: 66 })];
    const pe: Row = { t: 60, kind: 'action', text: 'Phenylephrine 100 µg IV', ev: 'drug:phenylephrine' };
    const treat: ObjectiveRule = { kind: 'eventWithin', after: 'value:map<60', event: ['drug:phenylephrine', 'drug:ephedrine'], withinS: 60 };
    expect(v(treat, run([pe], xs))).toEqual({ status: 'met', why: 'Phenylephrine or Ephedrine 30 s after ART M / NIBP M below 60 mmHg (00:30 → 01:00; within 1 min 00 s asked).', measure: { fromT: 30, toT: 60, askedS: 60 } });
    expect(v({ kind: 'eventWithin', after: ['drug:ephedrine', 'drug:phenylephrine'], event: 'value:map>65', withinS: 120 }, run([pe], xs)).why).toBe('ART M / NIBP M above 65 mmHg 10 s after Ephedrine or Phenylephrine (01:00 → 01:10; within 2 min 00 s asked).');
    expect(v({ kind: 'occurred', event: 'value:spo2<90' }, run([], xs))).toEqual({ status: 'not met', why: 'SpO₂ below 90 %: did not happen' });
  });

  it('occurred and never', () => {
    const drug: Row = { t: 150, kind: 'action', text: 'Dantrolene 175 mg IV', ev: 'drug:dantrolene', dose: { drugId: 'dantrolene', dose: 2.5, unit: 'mg/kg' } };
    expect(v({ kind: 'occurred', event: 'drug:dantrolene' }, run([drug]))).toEqual({ status: 'met', why: 'Dantrolene at 02:30' });
    expect(v({ kind: 'occurred', event: 'drug:dantrolene' }, run([]))).toEqual({ status: 'not met', why: 'Dantrolene: did not happen' });
    expect(v({ kind: 'never', event: 'pulseLoss' }, run([]))).toEqual({ status: 'met', why: 'The pulse loss: did not happen' });
    expect(v({ kind: 'never', event: 'state:induced' }, run([{ t: 10, kind: 'scenario', text: 'x', ev: 'state:induced' }])).why).toBe('The state "Induced" at 00:10');
  });

  it('stayed: over the whole run or a window after an event', () => {
    const spo2: ObjectiveRule = { kind: 'stayed', value: 'spo2', above: 90 };
    const xs = [sample(0, { spo2: 99 }), sample(60, { spo2: 93 }), sample(120, { spo2: 97 })];
    expect(v(spo2, run([], xs))).toEqual({ status: 'met', why: 'SpO₂ stayed above 90 % (lowest 93 % at 01:00).' });
    expect(v(spo2, run([], [...xs, sample(130, { spo2: 88 })]))).toEqual({ status: 'not met', why: 'SpO₂ 88 % at 02:10 (asked: above 90 %).' });
    expect(v(spo2, run([], [sample(0, { spo2: null })])).status).toBe('not assessable');
    const map: ObjectiveRule = { kind: 'stayed', value: 'map', above: 65, after: 'state:induced', forS: 120 };
    const induced: Row = { t: 10, kind: 'scenario', text: 'x', ev: 'state:induced' };
    expect(v(map, run([induced], [sample(5, { map: 50 }), sample(60, { map: 70 }), sample(140, { map: 66 })])).status).toBe('met'); // 5 s is before the window
    expect(v(map, run([induced], [sample(60, { map: 70 })])).why).toBe('The run ended before the 2 min 00 s window closed; ART M / NIBP M stayed above 65 mmHg until then.');
    expect(v(map, run([], [sample(60)])).status).toBe('not assessable');
    expect(v({ kind: 'stayed', value: 'etco2', below: 45 }, run([], [sample(0, { etco2: 52 })])).why).toBe('EtCO₂ 52 mmHg at 00:00 (asked: below 45 mmHg).');
  });

  it('heldThen: ventilation back only once EtCO₂ has stayed below 40 for 2 min; earlier is not met', () => {
    // the MH early-call course measured on the kit: crisis called 07:01, EtCO₂ 46 until 07:26, below 40 from 07:27
    const mh = { ...DOC, states: [{ id: 'triggerOff', label: 'Trigger off' }, { id: 'normoventilated', label: 'Ventilation back to 12 × 500' }] };
    const course = (to: number, etco2 = (t: number): number | null => (t < 447 ? 46 : 36)) => Array.from({ length: to - 400 + 1 }, (_, i) => sample(400 + i, { etco2: etco2(400 + i) }));
    const call: Row = { t: 421, kind: 'scenario', text: 'Trigger off', ev: 'state:triggerOff' };
    const back = (t: number): Row => ({ t, kind: 'scenario', text: 'Ventilation back', ev: 'state:normoventilated' });
    const at = (rows: Row[], xs: Sample[]): RunData => ({ ...run(rows, xs), doc: mh as never });
    const rule: ObjectiveRule = { kind: 'heldThen', from: 'state:triggerOff', value: 'etco2', below: 40, forS: 120, event: 'state:normoventilated' };
    // (a) pressed at "Recovering" (08:43): EtCO₂ below 40 for only 1 min 16 s
    expect(v(rule, at([call, back(523)], course(700)))).toEqual({ status: 'not met', why: 'The state "Ventilation back to 12 × 500" at 08:43, when EtCO₂ had been below 40 mmHg for 1 min 16 s (2 min 00 s asked).' });
    // (b) pressed after 2 min of EtCO₂ below 40 (held 07:27 → 09:27)
    expect(v(rule, at([call, back(600)], course(700)))).toEqual({ status: 'met', why: 'The state "Ventilation back to 12 × 500" at 10:00, after EtCO₂ had stayed below 40 mmHg for 2 min 00 s (07:27 → 09:27).' });
    // (c) never pressed
    expect(v(rule, at([call], course(700)))).toEqual({ status: 'not met', why: 'The state "Ventilation back to 12 × 500" did not happen; EtCO₂ had stayed below 40 mmHg for 2 min 00 s by 09:27.' });
    // only the first press is judged: an early press is not mended by a second one
    expect(v(rule, at([call, back(523), back(800)], course(900))).status).toBe('not met');
    // a value back at 40 restarts the 2 min; a press before the restart is complete is not met
    const bounce = (t: number) => (t < 447 ? 46 : t >= 500 && t < 510 ? 41 : 36);
    expect(v(rule, at([call, back(600)], course(700, bounce))).why).toBe('The state "Ventilation back to 12 × 500" at 10:00, when EtCO₂ had been below 40 mmHg for 1 min 30 s (2 min 00 s asked).');
    expect(v(rule, at([call, back(640)], course(700, bounce))).status).toBe('met');
    // pressed while EtCO₂ was not below 40 at all
    expect(v(rule, at([call, back(430)], course(700))).why).toBe('The state "Ventilation back to 12 × 500" at 07:10, when EtCO₂ was not below 40 mmHg (2 min 00 s asked).');
    // not assessable: the crisis never called; the run ended before the 2 min (no press yet); EtCO₂ never measured
    expect(v(rule, at([], course(700))).why).toBe('The state "Trigger off" did not happen.');
    expect(v(rule, at([call], course(520)))).toEqual({ status: 'not assessable', why: 'The run ended before EtCO₂ had stayed below 40 mmHg for 2 min 00 s after the state "Trigger off" at 07:01; the state "Ventilation back to 12 × 500" had not happened.' });
    expect(v(rule, at([call], course(700, () => null))).why).toBe('EtCO₂ was not measured after the state "Trigger off" at 07:01.');
  });

  it('objectives: strings and rule-less objects are not assessable; a tick in the Scenario tab is reported', () => {
    const d = run([apnoea(66), vent(100), { t: 140, kind: 'note', text: 'Objective met: Confirm ventilation with the capnogram' }], [sample(200)]);
    d.doc = { ...(DOC as never as NonNullable<RunData['doc']>), objectives: ['Anticipate the fall in arterial pressure after propofol', { text: 'Ventilate within 90 s of the apnoea alarm', rule: within }, { text: 'Confirm ventilation with the capnogram' }] };
    expect(objectives(d)).toEqual([
      { text: 'Anticipate the fall in arterial pressure after propofol', verdict: { status: 'not assessable', why: 'This objective has no rule: the instructor judges it.' } },
      { text: 'Ventilate within 90 s of the apnoea alarm', verdict: { status: 'met', why: expect.stringContaining('34 s after'), measure: { fromT: 66, toT: 100, askedS: 90 } } },
      { text: 'Confirm ventilation with the capnogram', verdict: { status: 'not assessable', why: 'This objective has no rule: the instructor judges it. The instructor ticked it at 02:20.', tickedT: 140 } },
    ]);
  });

  it('pme-debrief/2: discuss, the tick time of a rule-less objective only, the measured interval', () => {
    const note = (t: number, text: string): Row => ({ t, kind: 'note', text: `Objective met: ${text}` });
    const late: ObjectiveRule = { kind: 'eventWithin', after: 'alarm:apnoea', event: 'ventilation', withinS: 600 }; // the run ends before 600 s
    const d = run([apnoea(66), vent(200), note(130, 'Name the problem'), note(150, 'Ventilate late'), note(160, 'Ventilate within 90 s')], [sample(210)]);
    d.doc = { ...(DOC as never as NonNullable<RunData['doc']>), objectives: [
      { text: 'Name the problem', debrief: 'recognition' },
      { text: 'Ventilate within 90 s', rule: within, debrief: 'discuss' },
      { text: 'Ventilate late', rule: { ...late, after: 'alarm:apnoea', event: 'shock' } },
    ] };
    const [rec, disc, ruled] = objectives(d);
    // (c) a rule-less objective with its tick: tickedT, still not assessable
    expect(rec?.verdict).toMatchObject({ status: 'not assessable', tickedT: 130 });
    expect(rec).not.toHaveProperty('discuss');
    // (b) discuss: carried, the status unchanged
    expect(disc).toMatchObject({ discuss: true, verdict: { status: 'not met' } });
    // (d) the measured interval is the times the reason line prints
    expect(disc?.verdict.measure).toEqual({ fromT: 66, toT: 200, askedS: 90 });
    expect(disc?.verdict.why).toContain('(01:06 → 03:20; within 1 min 30 s asked)');
    // (c) a rule's own not assessable with a matching tick: no tickedT
    expect(ruled?.verdict.status).toBe('not assessable');
    expect(ruled?.verdict.why).toContain('The instructor ticked it at 02:30.');
    expect(ruled?.verdict).not.toHaveProperty('tickedT');
    expect(ruled?.verdict).not.toHaveProperty('measure');
    // (a) and (e): the schema, the renderer's version, and the key times and moments (B2)
    const j = JSON.parse(debriefJson(d, 'b'));
    expect(j.schema).toBe('pme-debrief/2');
    expect(j.version).toBe(version);
    expect(j.keyTimes).toEqual(keyTimes(d));
    expect(j.keyTimes.map((k: { id: string }) => k.id)).toEqual(['recognition', 'objective:1']);
    expect(j.keyTimes[0]).toMatchObject({ toT: 130, state: 'measured' });
    expect(j.keyMoments).toEqual(keyMoments(d));
    expect(j.objectives[1]).toMatchObject({ discuss: true, verdict: { measure: { fromT: 66, toT: 200, askedS: 90 } } });
  });
});

describe('facts and totals', () => {
  it('states the extremes, the apnoea-to-ventilation time, the pulseless time, ROSC and the epinephrine total', () => {
    const epi = (t: number, dose: number, unit: string): Row => ({ t, kind: 'action', text: 'Epinephrine', ev: 'drug:epinephrine', dose: { drugId: 'epinephrine', dose, unit } });
    const d = run([
      apnoea(66), vent(106),
      { t: 300, kind: 'patient', text: 'Pulse lost (the model)', ev: 'pulseLoss' }, epi(330, 1, 'mg'), epi(510, 1000, 'mcg'),
      { t: 480, kind: 'patient', text: 'Circulation returned (the model)', ev: 'rosc' },
      { t: 500, kind: 'patient', text: 'Pulse lost (the model)', ev: 'pulseLoss' }, { t: 560, kind: 'patient', text: 'Circulation returned (the model)', ev: 'rosc' },
      epi(900, 1, 'mg', ), // undone below
    ], [sample(0), sample(200, { spo2: 81, map: 48, etco2: 52, temp: 37.4 }), sample(600)]);
    (d.rows.at(-1) as Row).undone = 1;
    expect(facts(d)).toEqual([
      { label: 'Lowest SpO₂', value: '81 % at 03:20' },
      { label: 'Lowest ART M / NIBP M', value: '48 mmHg at 03:20' },
      { label: 'Highest EtCO₂', value: '52 mmHg at 03:20' },
      { label: 'Highest T1 / T2', value: '37.4 °C at 03:20' },
      { label: 'Apnoea alarm to ventilated breaths', value: '40 s (01:06 → 01:46)' },
      { label: 'Pulseless', value: '4 min 00 s in all; first lost at 05:00' },
      { label: 'Return of circulation', value: '3 min 00 s after the pulse loss (08:00)' },
      { label: 'Epinephrine, boluses in all', value: '2 mg (2 doses)' },
    ]);
    expect(facts(run([], []))).toEqual([]);
  });

  it('Q7: the labs — last value (lowest–highest), labels and units from the glossary', () => {
    const d = run([], [sample(0, { k: 4.2, lactate: 1, ph: 7.41, glucose: 5.5, tcore: 36.8 }), sample(60, { k: 6.3, lactate: 3.4, ph: 7.19, glucose: 5.7, tcore: 39.4 }), sample(120, { k: 6.1, lactate: 3.2, ph: 7.21, glucose: 5.6, tcore: 39.1 })]);
    expect(facts(d).at(-1)).toEqual({ label: 'Labs (the model): last (lowest–highest)', value: 'K⁺ 6.1 mmol/L (4.2–6.3) · Lactate 3.2 mmol/L (1.0–3.4) · pH 7.21 (7.19–7.41) · Glucose 5.6 mmol/L (5.5–5.7) · Tcore 39.1 °C (36.8–39.4)' });
  });

  it('Q1 and Q3: one row per minute (each value’s first measurement in it); the report as JSON', () => {
    const d = run([apnoea(66), vent(106)], [sample(0, { hr: null, k: 4.2 }), sample(1, { hr: 71 }), sample(61, { hr: 90, k: 4.4 }), sample(185, { hr: 100 })]);
    expect(perMinute(d).map((m) => [m.t, m.values.hr, m.values.k])).toEqual([[0, 71, 4.2], [60, 90, 4.4], [120, null, null], [180, 100, null]]);
    const j = JSON.parse(debriefJson(d, 'abc1234 2026-10-11'));
    // IP8 (answer 17): steps, judged and marks are added at the end; the schema stays /2
    expect(Object.keys(j)).toEqual(['schema', 'version', 'build', 'record', 'objectives', 'facts', 'keyTimes', 'keyMoments', 'minutes', 'steps', 'judged', 'marks']);
    expect([j.steps, j.judged, j.marks]).toEqual([steps(d), judged(d), marks(d)]);
    expect(j.schema).toBe('pme-debrief/2');
    expect(j.record).toEqual(JSON.parse(JSON.stringify(d)));
    expect(j.minutes).toHaveLength(4);
  });

  it('totals per-kg doses by weight and keeps other units as given', () => {
    const d = run([
      { t: 1, kind: 'action', text: '', dose: { drugId: 'propofol', dose: 2, unit: 'mg/kg' } },
      { t: 2, kind: 'action', text: '', dose: { drugId: 'fentanyl', dose: 1, unit: 'mcg/kg' } },
      { t: 3, kind: 'action', text: '', dose: { drugId: 'sodiumBicarbonate', dose: 50, unit: 'mEq' } },
    ], [], 80);
    expect(drugTotals(d)).toEqual([{ drugId: 'propofol', n: 1, total: '160 mg' }, { drugId: 'fentanyl', n: 1, total: '80 µg' }, { drugId: 'sodiumBicarbonate', n: 1, total: '50 mEq' }]);
  });
});

describe('the objective rule in pme-scenario/1', () => {
  const doc = (objectives: unknown[]) => ({ ...DOC, objectives });
  it('accepts strings and { text, rule } of every kind; the card shows the words', () => {
    const r = validateScenario(doc([
      'Plain words',
      { text: 'No rule' },
      { text: 'A', rule: { kind: 'eventWithin', after: 'alarm:apnoea', event: 'ventilation', withinS: 90 } },
      { text: 'B', rule: { kind: 'occurred', event: 'drug:dantrolene' } },
      { text: 'C', rule: { kind: 'never', event: 'pulseLoss' } },
      { text: 'D', rule: { kind: 'stayed', value: 'spo2', above: 90, after: 'state:induced', forS: 300 } },
      { text: 'E', rule: { kind: 'eventWithin', after: 'value:map<60', event: ['drug:phenylephrine', 'drug:ephedrine'], withinS: 60 } },
      { text: 'F', rule: { kind: 'eventWithin', after: 'value:k>5.5', event: ['drug:calciumChloride', 'drug:insulinDextrose'], withinS: 300 } },
      { text: 'G', rule: { kind: 'stayed', value: 'ph', above: 7.2 } },
      { text: 'H', rule: { kind: 'eventWithin', from: 'state:triggerOff', after: 'value:etco2<40', event: 'state:normoventilated', withinS: 300 } },
      { text: 'I', rule: { kind: 'heldThen', from: 'state:triggerOff', value: 'etco2', below: 40, forS: 120, event: 'state:normoventilated' } },
    ]));
    expect(r.ok, r.ok ? '' : r.errors.join('\n')).toBe(true);
    if (r.ok) expect(cardOf(r.doc).objectives).toEqual(['Plain words', 'No rule', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
  });
  it.each([
    [{ text: 'x', rule: { kind: 'soon', event: 'cpr' } }],
    [{ text: 'x', rule: { kind: 'occurred', event: 'ventilated' } }],
    [{ text: 'x', rule: { kind: 'stayed', value: 'spo2' } }],
    [{ text: 'x', rule: { kind: 'eventWithin', after: 'cpr', event: 'shock' } }],
    [{ rule: { kind: 'occurred', event: 'cpr' } }],
    [{ text: 'x', rule: { kind: 'occurred', event: 'value:na>150' } }],
    [{ text: 'x', rule: { kind: 'occurred', event: [] } }],
    [{ text: 'x', rule: { kind: 'stayed', value: 'spo2', above: 90, from: 'start' } }],
    [{ text: 'x', rule: { kind: 'heldThen', value: 'etco2', below: 40, event: 'state:normoventilated' } }],
    [{ text: 'x', rule: { kind: 'heldThen', value: 'etco2', forS: 120, event: 'state:normoventilated' } }],
    [{ text: 'x', rule: { kind: 'heldThen', value: 'etco2', below: 40, forS: 120 } }],
  ])('refuses %j', (o) => {
    expect(validateScenario(doc([o])).ok).toBe(false);
  });
});

describe('the trend axes have a least span', () => {
  it('a few-point wobble is not drawn at full height: the floor, centred on the data, SpO₂ never above 100', () => {
    expect(axisRange('spo2', 96, 99)).toEqual([80, 100]); // 20 points, capped at 100
    expect(axisRange('spo2', 70, 80)).toEqual([65, 85]); // centred below the cap
    expect(axisRange('hr', 70, 78)).toEqual([54, 94]); // 40 bpm
    expect(axisRange('map', 94, 96)).toEqual([75, 115]); // 40 mmHg
    expect(axisRange('etco2', 33, 35)).toEqual([24, 44]); // 20 mmHg
    expect(axisRange('etco2', 0, 2)).toEqual([0, 20]); // never below zero when the data are not
    expect(axisRange('temp', 36.8, 36.8)).toEqual([35.8, 37.8]); // 2 °C
    expect(axisRange('hr', 70, 148)).toEqual([70, 148]); // a wide range is the data's own
    expect(axisRange('rr', 12, 12)).toEqual([11, 13]); // no floor ruled for RR: unchanged (± 1 when flat)
  });
});

describe('FX-13: a span is rounded to whole seconds before it is split into minutes and seconds', () => {
  it('never reads "1 min 60 s" or "60 s"', () => {
    expect(span(0)).toBe('0 s');
    expect(span(59.4)).toBe('59 s');
    expect(span(59.5)).toBe('1 min 00 s'); // an exact .5 tie: Math.round rounds up
    expect(span(59.6)).toBe('1 min 00 s');
    expect(span(119.5)).toBe('2 min 00 s'); // an exact .5 tie
    expect(span(119.7)).toBe('2 min 00 s');
    expect(span(125)).toBe('2 min 05 s');
  });
});

/** IP8: a card with two stages of steps, a hop back into one of them, a mixed step, a drug given on entering a state,
 *  a timed objective on each of two states, and two objectives the instructor judges. */
const CARD = {
  schema: 'pme-scenario/1', id: 'steps', title: 'Steps', initialState: 'a',
  objectives: [
    'Name the problem',
    { text: 'Reach B within 60 s', rule: { kind: 'eventWithin', after: 'state:a', event: 'state:b', withinS: 60 } },
    { text: 'Epinephrine within 30 s', rule: { kind: 'eventWithin', after: 'state:a', event: 'drug:epinephrine', withinS: 30 } },
    { text: 'Debrief the team' },
  ],
  states: [
    { id: 'a', label: 'A', transitions: [
      { id: 'toB', to: 'b', when: { manual: { label: 'Go to B' } } },
      { id: 'toC', to: 'c', when: { manual: { label: 'Give epinephrine' } } },
      { id: 'auto', to: 'c', when: { afterS: 600 } },
    ] },
    { id: 'b', label: 'B', transitions: [
      { id: 'x1', to: 'h1', when: { manual: { label: 'First' } } },
      { id: 'x2', to: 'h2', when: { manual: { label: 'Second' } } },
      { id: 'mixed', to: 'd', when: { any: [{ manual: { label: 'Finish' } }, { vital: { var: 'spo2', op: '<', value: 80 } }] } },
    ] },
    { id: 'h1', label: 'Hop 1', transitions: [{ id: 'h1b', to: 'b', when: { afterS: 1 } }] },
    { id: 'h2', label: 'Hop 2', transitions: [{ id: 'h2b', to: 'b', when: { afterS: 1 } }] },
    { id: 'c', label: 'C', onEnter: [{ type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 1, unit: 'mg', route: 'iv' } }], transitions: [{ id: 'cd', to: 'd', when: { manual: { label: 'C to D' } } }] },
    { id: 'd', label: 'D' },
  ],
} as const;
const st = (t: number, id: string, tr?: string, by?: Row['by']): Row => ({ t, kind: 'scenario', text: `Scenario state: ${id}`, ev: `state:${id}`, ...(tr ? { tr } : {}), ...(by ? { by } : {}) });
const onCard = (rows: Row[], end = 200): RunData => ({ ...emptyRun('M 40 y 70 kg', 70, 0), doc: CARD as never, rows, samples: [sample(0), sample(end)] });
const brief = (d: RunData) => steps(d).map((x) => [x.stateId, x.n, x.id, x.takenT, x.order, x.status, x.ruleT ?? null]);

describe('IP8: the steps, the judged objectives and the marks', () => {
  it('steps: taken, out of order, failed, not done (a mixed step its rule fired), in the card order of each stage entered', () => {
    const d = onCard([
      st(0, 'a'), st(70, 'b', 'toB', 'press'), // late for its objective, but taken: a late press is a press
      st(80, 'h2', 'x2', 'press'), st(81, 'b', 'h2b', 'rule'), st(90, 'h1', 'x1', 'press'), st(91, 'b', 'h1b', 'rule'),
      st(100, 'd', 'mixed', 'rule'),
    ]);
    expect(brief(d)).toEqual([
      ['a', 1, 'toB', 70, 1, 'taken', null],
      ['a', 2, 'toC', null, null, 'failed', null], // its stage passed, and C can no longer be reached from D
      ['b', 1, 'x1', 90, 2, 'out of order', null], // taken after the second step of its stage
      ['b', 2, 'x2', 80, 1, 'taken', null],
      ['b', 3, 'mixed', null, null, 'not done', 100], // its rule fired it, not a press
    ]);
    expect(steps(d).map((x) => [x.label, x.dueT])).toEqual([['Go to B', 0], ['Give epinephrine', 0], ['First', 70], ['Second', 70], ['Finish', 70]]);
  });

  it('steps: overdue when a linked objective’s window has passed (a state it enters, or a drug given on entering it); not done before', () => {
    expect(brief(onCard([st(0, 'a')], 200)).map((x) => x[5])).toEqual(['overdue', 'overdue']); // state:b and drug:epinephrine (C's onEnter)
    expect(brief(onCard([st(0, 'a')], 40)).map((x) => x[5])).toEqual(['not done', 'overdue']); // B's 60 s are not over yet
    expect(brief(onCard([st(0, 'a')], 20)).map((x) => x[5])).toEqual(['not done', 'not done']);
    // the stage left by a jump: a step that can still be reached is not failed
    expect(brief(onCard([st(0, 'a'), st(10, 'c', undefined, 'goto')], 20))).toEqual([
      ['a', 1, 'toB', null, null, 'failed', null], ['a', 2, 'toC', null, null, 'not done', null], ['c', 1, 'cd', null, null, 'not done', null],
    ]);
  });

  it('steps: read on the kept course; none without a scenario, nor for a record made before the record kept how a state was entered', () => {
    const d = onCard([st(0, 'a'), { ...st(70, 'b', 'toB', 'press'), undone: 1 }]);
    expect(brief(d).map((x) => x[5])).toEqual(['overdue', 'overdue']); // the press was undone by a return
    expect(steps(onCard([st(0, 'a'), st(70, 'b'), st(100, 'd')]))).toEqual([]); // the rc.3 records: no tr, no by
    expect(steps({ ...onCard([st(0, 'a')]), doc: null })).toEqual([]);
    expect(steps(onCard([st(0, 'a')], 20)).length).toBe(2); // only the first state: nothing to tell yet, and nothing lost
  });

  it('judged: the objectives with no rule, with the instructor’s tick; objectives() is unchanged by them', () => {
    const d = onCard([st(0, 'a'), { t: 50, kind: 'note', text: 'Objective met: Name the problem' }]);
    expect(judged(d)).toEqual([{ n: 1, text: 'Name the problem', tickedT: 50 }, { n: 4, text: 'Debrief the team', tickedT: null }]);
    expect(objectives(d)[0]?.verdict).toMatchObject({ status: 'not assessable', tickedT: 50 });
  });

  it('marks: every bookmark in order, its kind and note when it has them, undone when a return discarded it', () => {
    const d = onCard([
      { t: 20, kind: 'bookmark', text: 'Bookmark: Mark 1 at 00:20', mark: 'Mark 1 at 00:20', markKind: 'good', note: 'called it' },
      { t: 30, kind: 'bookmark', text: 'Bookmark: Bookmark 1 at 00:30', mark: 'Bookmark 1 at 00:30', undone: 1 },
      { t: 25, kind: 'restore', text: 'Returned to bookmark Mark 1 at 00:20' },
    ]);
    expect(marks(d)).toEqual([{ t: 20, label: 'Mark 1 at 00:20', kind: 'good', note: 'called it' }, { t: 30, label: 'Bookmark 1 at 00:30', undone: 1 }]);
  });
});
