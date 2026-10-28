// The showcase objectives as rules — every rule in the library names a state, drug, alarm or condition that exists, and
// on the engine (driver, host and run record wired as AppSession wires them) the anaphylaxis and induction cards are
// judged as the presenter would judge them: treated in time = met, never = not met.
import { createEngine, DRUGS } from '@pme/engine-core';
import { createInProcessHub, HostSession, type HostTarget } from '@pme/controller';
import { engineOptionsOf, ScenarioDriver, validateScenario, type ScenarioDoc } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import { FIXED_ALARM_WORDS } from './alarms.ts';
import { facts, objectives } from './debrief.ts';
import { CONDITIONS } from './describe.ts';
import { emptyRun, RunRecord, type Row, type RunData, type Sample } from './record.ts';
import { LIBRARY } from './scenarios.ts';
import anaphylaxis from './showcase/showcase-anaphylaxis.json';
import haemorrhage from './showcase/showcase-haemorrhage.json';
import induction from './showcase/showcase-induction.json';
import mh from './showcase/showcase-mh.json';

const known = (ev: string, doc: ScenarioDoc): boolean => {
  const [k = '', id = ''] = ev.split(':');
  if (k === 'state') return doc.states.some((s) => s.id === id);
  if (k === 'drug') return !!DRUGS[id];
  if (k === 'alarm') return Object.keys(FIXED_ALARM_WORDS).some((a) => a === id || a.startsWith(`${id}-`)) || /_(HIGH|LOW)$/.test(id);
  if (k === 'condition') return !!CONDITIONS[id];
  return true; // the schema's pattern already limits the rest
};

/** Run a card on the engine with presses at sim times (or when `at` says so); the record sees what AppSession's does. */
async function hostRun(raw: unknown, untilS: number, press: (t: number, rec: RunRecord) => string | null): Promise<RunRecord> {
  const v = validateScenario(raw);
  if (!v.ok) throw new Error(v.errors.join('; '));
  const eo = engineOptionsOf(v.doc, 7);
  const engine = createEngine({ ...eo, mode: v.doc.mode ?? 'modeled', truthHz: 1, patient: { ...eo.patient, ...(v.doc.patient?.sensors ? { sensors: v.doc.patient.sensors } : {}) } } as never);
  const target: HostTarget = { dispatch: (c) => engine.dispatch(c), snapshot: () => engine.snapshot(), restore: (s) => engine.restore(s), on: (f) => engine.on(f), now: () => engine.now(), time: () => {} };
  let hs: HostSession | null = null;
  const driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (e) => hs?.publish(e) });
  hs = new HostSession({ session: 'SHW234', target: driver.host, scenario: driver.hook, stateIntervalMs: 0 });
  const hub = createInProcessHub();
  hs.addTransport(hub.connect());
  const tap = hub.connect();
  const rec = new RunRecord(() => ({ patient: 'test', weightKg: v.doc.patient?.weightKg ?? 70 }));
  tap.onMessage((m) => m.kind === 'event' && m.body.forEach((e) => rec.wire(e)));
  engine.on((e) => rec.engine(e));
  const settle = () => new Promise((r) => setTimeout(r, 0));
  await hs.submit({ id: 'load', issuedBy: 'instructor', type: 'scenario', action: 'load', doc: v.doc } as never);
  for (let t = 0.1; t <= untilS; t += 0.1) {
    engine.advanceTo(t);
    driver.poll();
    const tr = press(t, rec);
    if (tr) await hs.submit({ id: `p${t}`, issuedBy: 'instructor', type: 'scenario', action: 'trigger', target: tr } as never);
    await settle();
  }
  hs.close();
  return rec;
}
const once = (fn: (t: number, rec: RunRecord) => boolean, tr: string) => {
  let done = false;
  return (t: number, rec: RunRecord) => (!done && fn(t, rec) ? ((done = true), tr) : null);
};
/** The MH early call as the cue card runs it after the E119 induction sequence, on the card's own clock (premedication
 *  0:30, preoxygenation 1:00, induction 4:00, intubation 5:00, surgery 6:00, as kit round A4 presses them; call 9 s into
 *  Early signs, dantrolene +20 s; no cooling below 38.5 °C, E132), then "ventilation back" when `normo` says so. Until
 *  the E132 rebase onto E131 this path was compressed (induction 1:00, surgery 2:30); under E131 that compressed
 *  course is not the card's: at 20 × 600 its EtCO₂ dips below 40 for only ≈ 90 s (39 at 7:00–8:00, 40 from 8:30), so
 *  "ventilation back" was never pressed, while on the card's clock it stays below 40 from 8:40 and the 2-min rule is met
 *  at 10:40 (headless, this build; kit round A4: 08:42 → 10:42). */
const mhPresses = (normo: (t: number, rec: RunRecord, at: (id: string) => number | undefined) => boolean) => {
  const done = new Set<string>();
  return (t: number, rec: RunRecord): string | null => {
    const at = (id: string) => rec.data.rows.find((r) => r.ev === `state:${id}`)?.t;
    const go = (tr: string, ok: boolean) => (ok && !done.has(tr) ? (done.add(tr), tr) : null);
    const early = at('earlySigns');
    const off = at('triggerOff');
    return go('premed', t >= 30) ?? go('preox', t >= 60) ?? go('induce', t >= 240) ?? go('intubate', t >= 300) ?? go('surgery', t >= 360) ?? go('crisis-earlySigns', early !== undefined && t >= early + 9) ?? go('dant', off !== undefined && t >= off + 20)
      ?? go('normo', at('recovering') !== undefined && normo(t, rec, at));
  };
};
const alarmAt = (rec: RunRecord) => rec.data.rows.find((r) => r.ev?.startsWith('alarm:apnoea'))?.t;
/** The verdict of the objective whose rule starts at the apnoea alarm (its place in the list is the card's business). */
const apnoeaObjective = (rec: RunRecord) => {
  const i = (rec.data.doc?.objectives ?? []).findIndex((o) => typeof o !== 'string' && o.rule?.kind === 'eventWithin' && o.rule.after === 'alarm:apnoea');
  return objectives(rec.data)[i]?.verdict;
};

describe('the showcase objectives as rules', () => {
  it('every rule in the library names a state, drug, alarm or condition that exists', () => {
    let n = 0;
    for (const c of LIBRARY) {
      for (const o of c.doc.objectives ?? []) {
        if (typeof o === 'string' || !o.rule) continue;
        const evs = [('event' in o.rule ? o.rule.event : []), ('after' in o.rule ? o.rule.after : [])].flat().filter((x): x is string => !!x);
        for (const ev of evs) expect(known(ev, c.doc), `${c.id}: "${o.text}" names ${ev}`).toBe(true);
        n++;
      }
    }
    expect(n).toBeGreaterThanOrEqual(7);
  });

  it('the draft numbers of the anaphylaxis card are marked for the owner in the card text; the haemorrhage card has none (E132)', () => {
    const haem = (LIBRARY.find((c) => c.id === 'showcase-haemorrhage')?.doc.objectives ?? []).map((o) => (typeof o === 'string' ? o : o.text));
    expect(haem.filter((t) => /draft/i.test(t))).toEqual([]);
    for (const id of ['showcase-anaphylaxis']) {
      const timed = (LIBRARY.find((c) => c.id === id)?.doc.objectives ?? []).filter((o) => typeof o !== 'string' && o.rule?.kind === 'eventWithin');
      expect(timed.length, id).toBeGreaterThan(0);
      for (const o of timed) expect(typeof o === 'string' ? o : o.text).toMatch(/ \(debrief: .+ — draft, owner to confirm\)$/);
    }
  });

  it('anaphylaxis: epinephrine a minute into the reaction is met, no fluid is not met, recognition is the instructor’s', async () => {
    const rec = await hostRun(anaphylaxis, 200, once((t) => t >= 120, 'giveEpi'));
    expect(objectives(rec.data).map((o) => o.verdict.status)).toEqual(['not assessable', 'met', 'not met']);
    expect(objectives(rec.data)[1]?.verdict.why).toMatch(/^Epinephrine 1 min 00 s after the state "Anaphylaxis" \(01:00 → 02:00/);
    expect(facts(rec.data)).toContainEqual({ label: 'Epinephrine, boluses in all', value: '100 µg (1 dose)' });
  }, 120_000);

  it('induction: ventilated 40 s after the apnoea alarm is met; never ventilated is not met', async () => {
    const press = (t: number, rec: RunRecord) => (t >= 10 && !rec.data.rows.some((r) => r.ev === 'state:induced') ? 'induce' : null);
    const intubate = once((t, r) => alarmAt(r) !== undefined && t >= (alarmAt(r) as number) + 40, 'intubate');
    const treated = await hostRun(induction, 150, (t, rec) => press(t, rec) ?? intubate(t, rec));
    expect(apnoeaObjective(treated)?.status).toBe('met');
    expect(facts(treated.data).find((f) => f.label === 'Apnoea alarm to ventilated breaths')?.value).toMatch(/^4\d s \(/);
    const untreated = await hostRun(induction, 170, press);
    expect(apnoeaObjective(untreated)?.status).toBe('not met');
  }, 120_000);

  it('E22 MH: ventilation back at "Recovering" is not met; after 2 min of EtCO₂ below 40 it is met', async () => {
    const vent = (rec: RunRecord) => objectives(rec.data)[5]?.verdict; // after E52's recognition objective
    const early = await hostRun(mh, 700, mhPresses((t, _r, at) => t >= (at('recovering') as number) + 8));
    expect(objectives(early.data).map((o) => o.verdict.status).slice(0, 3)).toEqual(['not assessable', 'met', 'met']); // E52: recognition is the instructor's tick
    expect(vent(early)?.status).toBe('not met');
    expect(vent(early)?.why).toMatch(/^The state "Ventilation back to 12 × 500, O₂ 100 %" at \d\d:\d\d, when EtCO₂ had been below 40 mmHg for 1 min \d\d s \(2 min 00 s asked\)\.$/);
    // held: no sample at 40 or above for the last 2 min since the call, then the press
    const held = (t: number, rec: RunRecord, at: (id: string) => number | undefined) => {
      const xs = rec.data.samples.filter((s) => s.t >= (at('triggerOff') as number));
      const bad = xs.filter((s) => s.etco2 === null || s.etco2 >= 40).at(-1);
      return bad !== undefined && t >= bad.t + 1 + 120 + 5;
    };
    const kept = await hostRun(mh, 780, mhPresses(held));
    expect(vent(kept)?.status).toBe('met');
    expect(vent(kept)?.why).toMatch(/^The state "Ventilation back to 12 × 500, O₂ 100 %" at \d\d:\d\d, after EtCO₂ had stayed below 40 mmHg for 2 min 00 s \(\d\d:\d\d → \d\d:\d\d\)\.$/);
  }, 300_000);
});

/** A recorded run of `doc` with these rows and samples (the rule is the card's own). */
const recorded = (doc: unknown, rows: Row[], samples: Array<Partial<Sample> & { t: number }>): RunData => ({
  ...emptyRun('M 35 y 80 kg', 80, 0), doc: doc as never, rows,
  samples: samples.map((x) => ({ hr: 80, map: 80, spo2: 98, etco2: 38, rr: 12, temp: 36.8, k: null, lactate: null, ph: null, glucose: null, tcore: null, ...x })),
});
const row = (t: number, ev: string, text = ev): Row => ({ t, kind: ev.startsWith('state:') ? 'scenario' : 'action', text, ev });

describe('E132: the objectives of the two demo cards after the clinical review', () => {
  it('MH objective 4 marks the second dantrolene when the EtCO₂ climbs back at normal ventilation; the first dose does not count', () => {
    const i = mh.objectives.findIndex((o) => typeof o !== 'string' && o.rule?.kind === 'occurred' && o.rule.from === 'state:normoventilated');
    expect(i).toBe(3);
    const xs = [{ t: 860, etco2: 36 }, { t: 900, etco2: 44 }, { t: 960, etco2: 46 }, { t: 1100, etco2: 52 }, { t: 1500, etco2: 51 }];
    const base = [row(540, 'drug:dantrolene', 'Dantrolene 2.5 mg/kg IV'), row(880, 'state:normoventilated', 'Ventilation back')];
    const given = objectives(recorded(mh, [...base, row(1180, 'drug:dantrolene', 'Dantrolene 2.5 mg/kg IV')], xs))[i]?.verdict;
    expect(given?.status).toBe('met');
    expect(given?.why).toBe('Dantrolene after the state "Ventilation back to 12 × 500, O₂ 100 %" at 19:40');
    expect(given?.measure).toBeUndefined(); // no timed tile: the Debrief's page 1 keeps every objective (B6 f)
    expect(objectives(recorded(mh, base, xs))[i]?.verdict.status).toBe('not met');
    expect(objectives(recorded(mh, [row(540, 'drug:dantrolene')], xs))[i]?.verdict.status).toBe('not assessable'); // never normoventilated
  });

  it('owner rc.4 (2026-10-28): the second dose at normal ventilation re-applies the crisis ventilation; objective 6 still judges the first return', () => {
    const doc = mh as unknown as ScenarioDoc;
    const press = doc.states.find((s) => s.id === 'normoventilated')?.transitions?.find((t) => t.id === 'dant-normoventilated');
    expect(press?.to).toBe('dantroleneAgain');
    expect(press?.label).toBe('Dantrolene 2.5 mg/kg; hyperventilate again (20 × 600, O₂ 100 %)'); // the button says what it gives
    const again = doc.states.find((s) => s.id === 'dantroleneAgain');
    const events = (again?.onEnter ?? []).map((c) => (c.type === 'applyEvent' ? c.event : null));
    expect(events).toContainEqual({ kind: 'drug', drugId: 'dantrolene', dose: 2.5, unit: 'mg/kg', route: 'iv' });
    expect(events).toContainEqual({ kind: 'ventilation', source: 'ventilator', rr: 20, vtMl: 600, peep: 5, fio2: 1 }); // the trigger-off ventilation
    // back to the checklist: Recovering, then the same "ventilation back" button as the first time
    expect(again?.transitions?.map((t) => t.to)).toEqual(['treating']);
    expect(doc.states.find((s) => s.id === 'recovering')?.transitions?.find((t) => t.id === 'normo')?.to).toBe('normoventilated');
    expect(doc.states.find((s) => s.id === 'dantrolene')?.onEnter?.some((c) => c.type === 'applyEvent' && c.event.kind === 'ventilation')).toBe(false); // the first dose leaves the ventilation as it is
    // objective 6 (heldThen, the first ventilation back) is judged on the first return even when a second follows
    const vent = mh.objectives.findIndex((o) => typeof o !== 'string' && o.rule?.kind === 'heldThen');
    expect(vent).toBe(5);
    const rows = [row(500, 'state:triggerOff'), row(540, 'drug:dantrolene'), row(836, 'state:normoventilated', 'Ventilation back'), row(1154, 'state:dantroleneAgain', 'Dantrolene again'), row(1632, 'state:normoventilated', 'Ventilation back')];
    const xs = [{ t: 520, etco2: 39 }, ...Array.from({ length: 316 }, (_, k) => ({ t: 521 + k, etco2: 38 })), { t: 900, etco2: 53 }, { t: 1154, etco2: 64 }, { t: 1600, etco2: 38 }];
    const v = objectives(recorded(mh, rows, xs))[vent]?.verdict;
    expect(v?.status).toBe('met');
    expect(v?.why).toMatch(/ at 13:56, after EtCO₂ had stayed below 40 mmHg for 2 min 00 s \(08:40 → 10:40\)\.$/);
  });

  it('haemorrhage: no draft words; CPR on the pulse loss is judged as before; the return of circulation is recognised at the rhythm check', () => {
    expect(haemorrhage.objectives.map((o) => (typeof o === 'string' ? o : o.text)).join(' ')).not.toMatch(/draft|owner to confirm/i);
    const rows = [row(660, 'pulseLoss'), row(939, 'cpr'), row(1258, 'rosc'), row(1314, 'state:rosc', 'Return of circulation')];
    const v = objectives(recorded(haemorrhage, rows, [{ t: 0 }, { t: 1400 }])).map((o) => o.verdict);
    expect(v.map((x) => x.status)).toEqual(['not assessable', 'not met', 'met']);
    expect(v[2]?.measure).toEqual({ fromT: 1258, toT: 1314, askedS: 120 }); // owner rc.4 (2026-10-28): 150 → 120 s
  });

  it('haemorrhage: "Rhythm check" everywhere, never "Pulse check"; epinephrine offered in every CPR state', () => {
    const doc = haemorrhage as unknown as ScenarioDoc;
    const text = JSON.stringify(doc);
    expect(text).not.toMatch(/Pulse check|Pulse back: stop CPR/);
    const labels = (id: string) => (doc.states.find((s) => s.id === id)?.transitions ?? []).map((t) => t.label);
    for (const id of ['cpr', 'cprRunning', 'postShock1', 'postShock1Running', 'postShock2', 'postShock2Running']) expect(labels(id), id).toContain('Epinephrine 1 mg');
    for (const id of ['cpr', 'cprRunning', 'postShock1', 'postShock1Running']) expect(labels(id), id).toContain('Rhythm check');
    for (const id of ['postShock2', 'postShock2Running']) expect(labels(id), id).toContain('Rhythm check: pulse back, stop CPR');
  });
});
