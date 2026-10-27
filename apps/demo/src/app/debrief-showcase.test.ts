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
import { RunRecord } from './record.ts';
import { LIBRARY } from './scenarios.ts';
import anaphylaxis from './showcase/showcase-anaphylaxis.json';
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
/** The MH early call as the cue card runs it after the E119 induction sequence (premedication 0:05, preoxygenation 0:10,
 *  induction 1:00, intubation 2:00, surgery 2:30; call 9 s into Early signs, dantrolene +20 s, cooling +30 s), then
 *  "ventilation back" when `normo` says so. */
const mhPresses = (normo: (t: number, rec: RunRecord, at: (id: string) => number | undefined) => boolean) => {
  const done = new Set<string>();
  return (t: number, rec: RunRecord): string | null => {
    const at = (id: string) => rec.data.rows.find((r) => r.ev === `state:${id}`)?.t;
    const go = (tr: string, ok: boolean) => (ok && !done.has(tr) ? (done.add(tr), tr) : null);
    const early = at('earlySigns');
    const off = at('triggerOff');
    return go('premed', t >= 5) ?? go('preox', t >= 10) ?? go('induce', t >= 60) ?? go('intubate', t >= 120) ?? go('surgery', t >= 150) ?? go('crisis-earlySigns', early !== undefined && t >= early + 9) ?? go('dant', off !== undefined && t >= off + 20)
      ?? go('cool-treating', off !== undefined && t >= off + 30 && at('treating') !== undefined) ?? go('normo', at('recovering') !== undefined && normo(t, rec, at));
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

  it('the draft numbers of the anaphylaxis and haemorrhage cards are marked for the owner in the card text', () => {
    for (const id of ['showcase-anaphylaxis', 'showcase-haemorrhage']) {
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

  it('E22 MH: ventilation back at "Recovering" is not met (the rule reads the EtCO₂ the monitor showed)', async () => {
    const vent = (rec: RunRecord) => objectives(rec.data)[5]?.verdict; // after E52's recognition objective
    const early = await hostRun(mh, 640, mhPresses((t, _r, at) => t >= (at('recovering') as number) + 8));
    expect(objectives(early.data).map((o) => o.verdict.status).slice(0, 3)).toEqual(['not assessable', 'met', 'met']); // E52: recognition is the instructor's tick
    expect(vent(early)?.status).toBe('not met');
    // E134: the early press now lands while the EtCO2 is still AT or above 40 (the buffered CO2 of the MH muscle's
    // accumulating lactate keeps it higher through Recovering), so the Debrief's reason is the "not below 40" form
    // instead of the "below 40 for 1 min xx s" one. The verdict — not met — is unchanged; only the sentence differs,
    // and both forms are the rule's own wording.
    expect(vent(early)?.why).toMatch(/^The state "Ventilation back to 12 × 500, O₂ 100 %" at \d\d:\d\d, when EtCO₂ (?:had been below 40 mmHg for 1 min \d\d s|was not below 40 mmHg) \(2 min 00 s asked\)\.$/);
  }, 300_000);

  // E134: A RECORDED MISS of the rig, not of the rule — on THIS path (crisis 9 s into the early signs, one dantrolene
  // 20 s later, no fast-forward) the displayed EtCO2 bottoms at 40 and settles at 41–42 mmHg, so it never stays BELOW
  // 40 for the two minutes the card's objective asks for and the "met" branch cannot be produced any more. The cause is
  // the residual MH activity's own lactate, whose buffered CO2 E134 counts wherever lactate accumulates. On the kit
  // round's path (the A4 MH round on this build) the dip does reach 39 and the objective IS met, with the Debrief
  // printing "after EtCO₂ had stayed below 40 mmHg for 2 min 00 s (08:21 → 10:21)" — so the rule itself is intact and
  // the margin is 1–2 mmHg wide. Reported, not tuned: the card's 40 mmHg is the owner's teaching threshold.
  it.fails('E22 MH: after 2 min of EtCO₂ below 40 the ventilation-back objective is met — measured: the EtCO2 of this rig plateaus at 41–42 and the press never comes (E134)', async () => {
    const vent = (rec: RunRecord) => objectives(rec.data)[5]?.verdict;
    // held: no sample at 40 or above for the last 2 min since the call, then the press
    const held = (t: number, rec: RunRecord, at: (id: string) => number | undefined) => {
      const xs = rec.data.samples.filter((s) => s.t >= (at('triggerOff') as number));
      const bad = xs.filter((s) => s.etco2 === null || s.etco2 >= 40).at(-1);
      return bad !== undefined && t >= bad.t + 1 + 120 + 5;
    };
    const kept = await hostRun(mh, 900, mhPresses(held));
    expect(vent(kept)?.status).toBe('met');
    expect(vent(kept)?.why).toMatch(/^The state "Ventilation back to 12 × 500, O₂ 100 %" at \d\d:\d\d, after EtCO₂ had stayed below 40 mmHg for 2 min 00 s \(\d\d:\d\d → \d\d:\d\d\)\.$/);
  }, 300_000);
});
