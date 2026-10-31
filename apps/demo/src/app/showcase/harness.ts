// Runs a showcase card on a bare engine the way the app does (engine seed 7, the document's mode, truth at 1 Hz, the
// patient's sensors; apps/demo/src/app/session.ts loadScenario) and presses the card's OWN buttons on a script, so a
// test reads what the presenter will see. The driver is polled every `pollS` of sim time: the app polls every 100 ms of
// WALL time, i.e. every 0.1 s of sim at ×1, 0.4 s at ×4 and 0.8 s at ×8. Every loop yields once per sim-minute.
// Test-only: nothing in the app imports this file.
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { engineOptionsOf, isV2, ScenarioDriver, validateScenario, type Administration, type AnyScenarioDoc, type PhaseEntry, type RuleEdge, type ScenarioDoc } from '@pme/controller/scenario';
import { expect } from 'vitest';

/** One sample per second of sim time: the monitor's numerics (null = not shown or invalid), the 1 Hz arterial panel
 *  and the truth the presenter cannot see (pulse, SaO2, core temperature). */
export interface Sample {
  t: number;
  state: string;
  hr: number | null; spo2: number | null; etco2: number | null; awrr: number | null;
  sys: number | null; dia: number | null; map: number | null; cvp: number | null; temp: number | null;
  rhythm: string; pulse: boolean; cpr: boolean;
  sao2: number; tc: number; ph: number; paco2: number; k: number; lactate: number; be: number;
  /** The coronary perfusion pressure the arrest rules read (mmHg) and the myocardial state kIsch·(1 − hyp) (arrest.ts). */
  cpp: number; myo: number;
}

/** Press the button labelled `press` in the current state at sim time `t`, or `delayS` after `when` first holds (and not
 *  before `t`, if given). An act fires once; one that never finds its button stays NaN in `Run.pressed`. `send` instead
 *  of a press: a clinical event sent as an instructor panel control sends it (e.g. the Defib tab's Charge and Shock), through
 *  the driver so the card's `event` transitions see it; `press` is then only the act's name. `action` (a pme-scenario/2
 *  card, plan F8): the action's `give` commands, stamped with its `actionId` and one stage group, through `driver.host`
 *  as Instructor v2's A press sends them; `press` is then only the act's name. */
export interface Act { press: string; send?: Record<string, unknown>; action?: string; t?: number; when?: (s: Sample) => boolean; delayS?: number }

export interface Run {
  rows: Sample[];
  /** Engine alarms raised, with their text (the skins print their own words for the same alarm). */
  alarms: { t: number; text: string }[];
  /** [t, state id] on every entry, in order (the initial state at 0). */
  states: [number, string][];
  /** Sim time each act fired, in the order of `acts` (NaN: never). */
  pressed: number[];
  /** Commands the engine refused (must stay empty: every button acts). */
  refused: string[];
  /** Spontaneous breaths (`breath` events of kind `spont`): [t, vtMl]. */
  spont: [number, number][];
  /** The drawn ECG's PVCs (`beat` events of template `pvc`): their times (E133). */
  pvcs: number[];
  /** A pme-scenario/2 card (plan F3): the phase runner's timeline, administration record and rule edges at the end. */
  v2?: { phases: PhaseEntry[]; admin: Administration[]; edges: RuleEdge[] };
}

const DOCS = import.meta.glob<{ default: ScenarioDoc }>('./*.json', { eager: true });
/** A showcase card as /1 (every caller but the /2 card's own tests). */
export const showcaseDoc = (id: string): ScenarioDoc => anyShowcaseDoc(id) as ScenarioDoc;
/** A showcase card in either format. */
export const anyShowcaseDoc = (id: string): AnyScenarioDoc => {
  const m = DOCS[`./${id}.json`];
  if (!m) throw new Error(`no showcase document ${id}`);
  return m.default;
};
export const SHOWCASE_IDS: readonly string[] = Object.keys(DOCS).map((p) => p.slice(2, -5));

type Tree = Record<string, unknown>;
const at = (tree: Tree | null, path: string): unknown => {
  let o: unknown = tree;
  for (const k of path.split('.')) o = o && typeof o === 'object' ? (o as Tree)[k] : undefined;
  return o;
};
const num = (x: unknown): number => (typeof x === 'number' ? x : Number.NaN);

/** Run card `id` to `untilS` of sim time, pressing `acts`; `listen` sees every engine event; the driver is polled every
 *  `pollS` of sim time (0.1 = the app at ×1; 0.8 = the app at ×8). */
export async function runCard(id: string, acts: readonly Act[], untilS: number, listen?: (e: EngineEvent) => void, pollS = 0.1): Promise<Run> {
  const v = validateScenario(anyShowcaseDoc(id));
  if (!v.ok) throw new Error(`${id}: ${v.errors.join('; ')}`);
  const doc = v.doc;
  const eo = engineOptionsOf(doc, 7);
  const engine = createEngine({ ...eo, mode: doc.mode ?? 'modeled', truthHz: 1, patient: { ...eo.patient, ...(doc.patient?.sensors ? { sensors: doc.patient.sensors } : {}) } } as never);
  const mon: Record<string, number | null> = {};
  let labs: Record<string, number> = {};
  let tree: Tree | null = null;
  let rhythm = doc.patient?.rhythm?.id ?? 'sinus';
  const run: Run = { rows: [], alarms: [], states: [], pressed: acts.map(() => Number.NaN), refused: [], spont: [], pvcs: [] };
  engine.on((e) => {
    if (e.type === 'measurement') for (const [k, m] of Object.entries(e.values)) mon[k] = m && m.flag !== 'invalid' ? m.value : null;
    else if (e.type === 'labs') labs = e.values as unknown as Record<string, number>;
    else if (e.type === 'truth') tree = e.tree as Tree;
    else if (e.type === 'state' && e.rhythm) rhythm = e.rhythm.id;
    else if (e.type === 'alarm' && e.state === 'raised') run.alarms.push({ t: e.t, text: e.text });
    else if (e.type === 'breath' && e.kind === 'spont') run.spont.push([e.t, e.vtMl]);
    else if (e.type === 'beat' && e.template === 'pvc') run.pvcs.push(e.t);
    listen?.(e);
  });
  const driver = new ScenarioDriver({
    target: {
      dispatch: (c) => {
        const r = engine.dispatch(c);
        if (!r.accepted) run.refused.push(`${engine.now().simT.toFixed(1)} ${JSON.stringify(c).slice(0, 160)}: ${r.reason ?? ''}`);
        return r;
      },
      snapshot: () => engine.snapshot(), restore: (s) => engine.restore(s), on: (fn) => engine.on(fn), now: () => engine.now(), time: () => {},
    },
    publish: (e) => run.states.push([e.t, e.stateId]),
  });
  const ok = driver.load(doc);
  if (!ok.ok) throw new Error(ok.reason);
  const armed = new Map<number, number>();
  const sample = (t: number): Sample => ({
    t, state: driver.runner?.stateId ?? driver.phaseRunner?.stateId ?? '',
    hr: mon.hr ?? null, spo2: mon.spo2 ?? null, etco2: mon.etco2 ?? null, awrr: mon.awrr ?? null,
    sys: mon.abpSys ?? null, dia: mon.abpDia ?? null, map: mon.abpMean ?? null, cvp: mon.cvpMean ?? null, temp: mon.tempCore ?? null,
    rhythm, pulse: tree === null || at(tree, 'hemo.circ.arrest') === null, cpr: at(tree, 'hemo.cpr.active') === true, // no truth yet: alive
    sao2: num(at(tree, 'organs.view.sao2')), tc: num(at(tree, 'resp.temp.tc')),
    ph: labs.ph ?? Number.NaN, paco2: labs.pco2 ?? Number.NaN, k: labs.k ?? Number.NaN, lactate: labs.lactate ?? Number.NaN, be: labs.be ?? Number.NaN,
    cpp: num(at(tree, 'hemo.circ.cor.cpp')), myo: num(at(tree, 'hemo.circ.cor.kIsch')) * (1 - num(at(tree, 'hemo.circ.cor.hyp'))),
  });
  let lastYield = 0;
  let nextRow = 1;
  for (let n = 1; n <= Math.round(untilS / pollS); n++) {
    const t = Math.round(n * pollS * 1000) / 1000;
    engine.advanceTo(t);
    driver.poll();
    const s = sample(t);
    for (const [i, a] of acts.entries()) {
      if (!Number.isNaN(run.pressed[i] as number) || (a.t !== undefined && t < a.t - 1e-9)) continue;
      if (a.when && !armed.has(i)) {
        if (!a.when(s)) continue;
        armed.set(i, t);
      }
      if (t + 1e-9 < (a.when ? (armed.get(i) as number) : (a.t as number)) + (a.delayS ?? 0)) continue;
      if (a.send) {
        const r = driver.host.dispatch({ type: 'applyEvent', event: a.send, id: `act-${i}`, issuedBy: 'instructor' } as never) as { accepted: boolean };
        if (!r.accepted) continue;
        driver.poll();
        run.pressed[i] = t;
        continue;
      }
      if (a.action !== undefined) {
        const action = isV2(doc) ? doc.actions.find((x) => x.id === a.action) : undefined;
        if (!action?.give?.length) throw new Error(`${id}: no action ${a.action} with a give list`);
        action.give.forEach((c, k) => {
          const { $comment: _drop, ...cmd } = c as typeof c & { $comment?: string };
          driver.host.dispatch({ ...cmd, id: `act-${i}-${k}`, issuedBy: 'instructor', stageGroup: `act-${i}`, actionId: a.action } as never);
        });
        driver.poll();
        run.pressed[i] = t;
        continue;
      }
      const tr = driver.runner?.state().transitions?.find((x) => 'manual' in x.when && x.when.manual.label === a.press);
      if (!tr || !driver.runner?.trigger(t, tr.id).ok) continue;
      driver.poll(); // as the host does on a button press: it acts on this tick
      run.pressed[i] = t;
    }
    if (t >= nextRow - 1e-9) {
      run.rows.push(s);
      nextRow += 1;
    }
    if (t - lastYield >= 60) {
      lastYield = t;
      await new Promise<void>((r) => setImmediate(r));
    }
  }
  const pr = driver.phaseRunner;
  if (pr) run.v2 = { phases: [...pr.phases], admin: [...pr.admin], edges: [...pr.edges] };
  return run;
}

/** First sample at or after `from` where `pred` holds (undefined: never). */
export const first = (rows: readonly Sample[], pred: (s: Sample) => boolean, from = 0): Sample | undefined => rows.find((s) => s.t >= from && pred(s));
/** The sample nearest `t`. */
export const near = (rows: readonly Sample[], t: number): Sample => rows.reduce((b, s) => (Math.abs(s.t - t) < Math.abs(b.t - t) ? s : b));
/** Extremes of a field over [t0, t1] (finite values only). */
export function range(rows: readonly Sample[], key: keyof Sample, t0: number, t1: number): { min: number; max: number } {
  const xs = rows.filter((s) => s.t >= t0 && s.t <= t1).map((s) => s[key]).filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
  return { min: Math.min(...xs), max: Math.max(...xs) };
}
/** The PVC events in [t0, t1): beats < 0.5 s apart are one event (a couplet or a run); their sizes, in order. */
export function pvcEvents(run: Run, t0 = 0, t1 = Number.POSITIVE_INFINITY): number[] {
  const out: number[] = [];
  let last = -Infinity;
  for (const t of run.pvcs) {
    if (t < t0 || t >= t1) continue;
    if (t - last < 0.5) out[out.length - 1] = (out.at(-1) as number) + 1;
    else out.push(1);
    last = t;
  }
  return out;
}
/** Sim time the run entered state `id` (NaN: never). */
export const entered = (run: Run, id: string): number => run.states.find(([, s]) => s === id)?.[0] ?? Number.NaN;
/** First engine alarm whose text matches `re` at or after `from` (NaN: none). */
export const alarmAt = (run: Run, re: RegExp, from = 0): number => run.alarms.find((a) => a.t >= from && re.test(a.text))?.t ?? Number.NaN;

/**
 * The bands: every number a card promises sits in [lo, hi], taken from the measured prototype ± a stated tolerance.
 * They are never widened to make a later change pass: a number that leaves its band goes to the owner with both values.
 * PME_SHOWCASE_PRINT=1 prints every measured number (for the gate note).
 */
export function bands(card: string, got: Record<string, number>, want: Record<string, readonly [number, number]>): void {
  if (process.env.PME_SHOWCASE_PRINT) console.log(`${card} ${JSON.stringify(Object.fromEntries(Object.entries(got).map(([k, x]) => [k, Math.round(x * 100) / 100])))}`);
  for (const [k, [lo, hi]] of Object.entries(want)) {
    const x = got[k];
    expect(x, `${card}: ${k} was never measured`).toBeTypeOf('number');
    expect(x, `${card}: ${k} = ${x} outside [${lo}, ${hi}]`).toBeGreaterThanOrEqual(lo);
    expect(x, `${card}: ${k} = ${x} outside [${lo}, ${hi}]`).toBeLessThanOrEqual(hi);
  }
}
