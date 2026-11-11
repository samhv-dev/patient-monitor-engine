// Pump channels in the drug layer (docs/plans/pump-rack-tci.md, piece E1; decisions D4, D5, D7, D8 and §8). A channel
// holds a syringe or a bag of TRUE contents (drug, concentration, volume), carries the PROGRAMMED drug and concentration
// the learner chose, and empties at its rate. The pump moves VOLUME: the patient receives volume × the contents'
// concentration, while a dose rate is converted to mL/h with the programme, as a real pump does (§8: a remifentanil
// syringe programmed as propofol delivers remifentanil). TCI on a channel (piece E2, decision D3): the pump predicts
// with its own model — the set, computed once from the patient data typed into it, stepped with the volume it moved
// times the PROGRAMMED concentration, which is all a pump knows — and doses to reach the target in THAT model. This module holds
// no device number: the syringe size, the IV set's drops/mL, the volume limit and the bolus and purge rates arrive on the
// event, resolved by the host from the device profile (D4, D12), and the device ranges are the host's to check (C2).
import type { PumpAlarmEvent, PumpAlarmId, PumpChannel, PumpConcentration, PumpEvent, PumpPanelRow, RateUnit, TciPrediction, TciPredictionRow, TciTypedPatient } from '../../types-pk.ts';
import { pkStep, pkSystem, zeroState } from './compartment.ts';
import { DRUGS } from './data/drugs.ts';
import type { DrugRow } from './row.ts';
import { tciModeRefusal, tciSet, type TciSet } from './tci-sets/index.ts';
import { TCI_DT_S, TCI_MAX_RATE_ML_H, tciRate } from './tci.ts';
import { toAmount, toRate } from './units.ts';

/** The rack's largest channel number: the owner's ruling PQ1 = C, "1–8, default 4" (research/00-orchestrator-rulings.md, 9 November 16:00; docs/plans/pump-rack-tci.md §11). */
export const PUMP_MAX_CH = 8;
/** A volume this small is the syringe's end, not a residue of the 0.1 s volume steps [ENG: numerics; floating sum of
 * 0.1 s steps, far under any volume a pump can deliver]. */
export const PUMP_EMPTY_ML = 1e-9;

const ACTIONS: Record<PumpEvent['action'], readonly string[]> = {
  load: ['channel', 'contents', 'syringeMl'],
  program: ['drugId', 'concentration', 'set'],
  rate: ['rate', 'unit', 'limitMl', 'weightKg'],
  start: [],
  stop: [],
  unload: [],
  purge: ['volumeMl', 'rateMlH'],
  bolus: ['volumeMl', 'dose', 'weightKg', 'rateMlH'],
  tci: ['setId', 'mode', 'target', 'patient', 'opioids', 'maxRateMlH'],
};
const CONC_UNITS = ['mg', 'mcg', 'g', 'units', 'mmol'];
const pos = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0;

/** Why a row cannot run from a pump, or undefined: the same rules as the `infusion` event (pipeline.ts). */
function infusableRefusal(row: DrugRow): string | undefined {
  if (row.pk.kind === 'volatile') return `${row.id}: a volatile agent is given through the vaporiser, not as an IV drug`;
  if (row.pk.kind === 'blood' && !row.rateActsVia) return `${row.id} is given as a bolus in v1; 7c owns its kinetics`;
  if (row.pk.kind === 'gamma' && row.pk.refRate === undefined && !row.rateActsVia) return `${row.id} has no infusion model: give it as a bolus`;
  return undefined;
}

/** amount (in the row's unit) per mL of a concentration, or an error string. */
function perMlOf(row: DrugRow, c: PumpConcentration | undefined): number | string {
  if (!c || !pos(c.amount) || !pos(c.perMl) || !CONC_UNITS.includes(c.unit)) return 'concentration must be {amount > 0, unit mg|mcg|g|units|mmol, perMl > 0}';
  const a = toAmount(c.amount, c.unit, row.amountUnit, 1);
  return typeof a === 'string' ? `${row.id}: ${a}` : a / c.perMl;
}

// --- the pump's own prediction (E2, D3) -------------------------------------------------------------------------

/** Why a set cannot run this drug in this mode, or undefined: the set must be the drug's, and effect mode needs a ke0
 * (the registry's rule 3 words). Shared by the channel's `tci` action and the channel-less `tci` event. */
export function tciSetRefusal(set: TciSet, drugId: string, mode: 'plasma' | 'effect'): string | undefined {
  if (set.meta.drugId !== drugId) return `${set.meta.id} is a ${set.meta.drugId} set, not ${drugId}`;
  return tciModeRefusal(set, mode);
}

const PATIENT_KEYS = ['ageY', 'weightKg', 'heightCm', 'sex', 'pmaWeeks'];
/** Why typed patient data cannot be used, or undefined. Values outside the set's studied population are allowed (D6). */
function typedPatientRefusal(p: unknown): string | undefined {
  const q = p as Partial<TciTypedPatient> | undefined;
  const bad = 'TCI needs the patient typed into the pump: {ageY ≥ 0, weightKg > 0, heightCm > 0, sex m|f, pmaWeeks?}';
  if (!q || typeof q !== 'object' || Object.keys(q).some((k) => !PATIENT_KEYS.includes(k))) return bad;
  if (!(typeof q.ageY === 'number' && Number.isFinite(q.ageY) && q.ageY >= 0) || !pos(q.weightKg) || !pos(q.heightCm) || (q.sex !== 'm' && q.sex !== 'f')) return bad;
  if (q.pmaWeeks !== undefined && !pos(q.pmaWeeks)) return bad;
  return undefined;
}

/** The co-administered-opioid flag as the set reads it: only a set that lists the covariate (Eleveld) carries it. When
 * the event does not say, false [ENG: device; a real pump asks the user, and no source fixes a default — an open
 * question for the owner]. */
export const opioidsFor = (set: TciSet, typed: boolean | undefined): boolean => set.meta.covariates.includes('opioids') && typed === true;

/** A fresh prediction: the set's parameters computed ONCE from the typed patient, the pump's state at zero. */
export function newPrediction(set: TciSet, patient: TciTypedPatient, opioids: boolean): TciPrediction {
  const params = set.params(patient, { opioids });
  return { setId: set.meta.id, patient: { ...patient }, opioids, params, x: zeroState(params) };
}

/** True when a prediction was made with this set and exactly these typed data (a new target keeps it). */
export function samePrediction(p: TciPrediction, setId: string, patient: TciTypedPatient, opioids: boolean): boolean {
  return p.setId === setId && p.opioids === opioids && PATIENT_KEYS.every((k) => p.patient[k as keyof TciTypedPatient] === patient[k as keyof TciTypedPatient]);
}

/** Step a prediction by `dtS` with what the pump believes it gave (amount/min). */
export function stepPrediction(p: TciPrediction, dtS: number, perMin: number): void {
  p.x = pkStep(pkSystem(p.params, dtS), p.x, perMin);
}

/** The words for a set or patient change while a TCI runs: a real pump locks them (D6). */
export const TCI_LOCKED = 'stop the TCI (target 0) before changing the set or the patient data';

const channelOf = (pumps: PumpChannel[] | undefined, ch: number) => pumps?.find((c) => c.ch === ch);

/** mL/h of a rate as entered, with the channel's programme and set; an error string when it cannot be converted. */
function rateMlH(c: PumpChannel, rate: number, unit: RateUnit | 'drops/min', weightKg: number | undefined): number | string {
  if (unit === 'mL/h') return rate;
  if (unit === 'drops/min') {
    if (c.kind !== 'drip' || c.set === null) return 'drops/min is a drip channel\'s rate (its IV set\'s drops/mL)';
    return (rate * 60) / c.set; // mL/h = drops/min × 60 ÷ drops/mL (plan D2 item 3)
  }
  if (!c.programmed) return 'a dose rate needs the channel programmed with a drug and concentration';
  const row = DRUGS[c.programmed.drugId] as DrugRow;
  if (unit.includes('/kg/') && !pos(weightKg)) return 'a per-kg dose rate needs weightKg, the weight typed into the pump';
  const perMin = toRate(rate, unit, row.amountUnit, weightKg ?? 1);
  if (typeof perMin === 'string') return perMin;
  const perMl = perMlOf(row, c.programmed.concentration) as number;
  return (perMin * 60) / perMl;
}

/** The engine's refusal of a `pump` event, or undefined when it is accepted. */
export function validatePump(ev: PumpEvent, pumps: PumpChannel[] | undefined): string | undefined {
  const allowed = Object.hasOwn(ACTIONS, ev.action) ? ACTIONS[ev.action] : undefined; // own keys only: 'toString' is no action
  if (!allowed) return `pump action must be one of ${Object.keys(ACTIONS).join(', ')}`;
  const extra = Object.keys(ev).filter((k) => k !== 'kind' && k !== 'action' && k !== 'ch' && !allowed.includes(k));
  if (extra.length) return `pump ${ev.action}: extra field ${extra.join(', ')}`;
  if (!(Number.isInteger(ev.ch) && ev.ch >= 1 && ev.ch <= PUMP_MAX_CH)) return `ch must be a whole channel number 1–${PUMP_MAX_CH}`;
  const c = channelOf(pumps, ev.ch);
  if (ev.action === 'load') {
    if (ev.channel !== 'syringe' && ev.channel !== 'drip') return 'channel must be syringe or drip';
    if (c && c.kind !== ev.channel) return `channel ${ev.ch} is a ${c.kind} channel`;
    if (c?.contents) return `channel ${ev.ch} is loaded: unload it first`;
    const k = ev.contents;
    const row = k ? DRUGS[k.drugId] : undefined;
    if (!row) return `unknown drug ${k?.drugId}`;
    const no = infusableRefusal(row);
    if (no) return no;
    const perMl = perMlOf(row, k.concentration);
    if (typeof perMl === 'string') return perMl;
    if (!pos(k.volumeMl)) return 'contents.volumeMl must be > 0';
    if (ev.channel === 'syringe') {
      if (!pos(ev.syringeMl)) return 'a syringe channel needs syringeMl, the syringe size';
      if (k.volumeMl > ev.syringeMl) return `${k.volumeMl} mL is more than a ${ev.syringeMl} mL syringe holds`;
    } else if (ev.syringeMl !== undefined) return 'a drip channel takes a bag, not a syringe (no syringeMl)';
    return undefined;
  }
  if (!c) return `channel ${ev.ch}: load a syringe or a bag first`;
  switch (ev.action) {
    case 'program': {
      const row = DRUGS[ev.drugId];
      if (!row) return `unknown drug ${ev.drugId}`;
      const perMl = perMlOf(row, ev.concentration);
      if (typeof perMl === 'string') return perMl;
      if (c.kind === 'drip' && !pos(ev.set)) return 'a drip channel is programmed with its IV set (set, drops/mL)';
      if (c.kind === 'syringe' && ev.set !== undefined) return 'an IV set (drops/mL) belongs to a drip channel';
      if (c.mode === 'tci' && ev.drugId !== c.programmed?.drugId) return `channel ${ev.ch} runs TCI of ${c.programmed?.drugId}: stop the TCI (target 0) before programming another drug`;
      return undefined;
    }
    case 'rate': {
      if (!(typeof ev.rate === 'number' && Number.isFinite(ev.rate) && ev.rate >= 0)) return 'rate must be ≥ 0';
      if (ev.limitMl !== undefined && c.kind !== 'drip') return 'a volume limit (limitMl) belongs to a drip channel';
      if (ev.limitMl !== undefined && ev.limitMl !== null && !pos(ev.limitMl)) return 'limitMl must be > 0, or null for none';
      const r = rateMlH(c, ev.rate, ev.unit, ev.weightKg);
      return typeof r === 'string' ? r : undefined;
    }
    case 'start':
      if (!c.contents) return `channel ${ev.ch}: load a syringe or a bag first`;
      if (!c.programmed) return `channel ${ev.ch}: program the drug and concentration first`;
      if (!c.rate && c.mode !== 'tci') return `channel ${ev.ch}: set a rate first`;
      if (c.volumeMl <= PUMP_EMPTY_ML) return `channel ${ev.ch} is empty: ${c.kind === 'syringe' ? 'End' : 'Empty Container'}`;
      if (c.limitMl !== null && c.infusedMl >= c.limitMl - PUMP_EMPTY_ML) return `channel ${ev.ch} reached its volume limit: set a new limit`;
      return undefined;
    case 'stop':
      return undefined;
    case 'tci': {
      if (c.kind !== 'syringe') return 'TCI runs on a syringe channel';
      if (!c.programmed) return `channel ${ev.ch}: program the drug and concentration first`;
      if (!(typeof ev.target === 'number' && Number.isFinite(ev.target) && ev.target >= 0 && ev.target <= 100)) return 'target must be 0–100';
      if (ev.mode !== 'plasma' && ev.mode !== 'effect') return 'mode must be plasma or effect';
      const set = tciSet(ev.setId);
      if (!set) return `unknown TCI set ${ev.setId}`;
      const why = tciSetRefusal(set, c.programmed.drugId, ev.mode) ?? typedPatientRefusal(ev.patient);
      if (why) return why;
      if (ev.opioids !== undefined && typeof ev.opioids !== 'boolean') return 'opioids must be true or false';
      if (ev.maxRateMlH !== undefined && !pos(ev.maxRateMlH)) return 'maxRateMlH must be > 0';
      if (ev.target > 0 && c.mode === 'tci' && c.pred && !samePrediction(c.pred, set.meta.id, ev.patient, opioidsFor(set, ev.opioids))) return TCI_LOCKED;
      return undefined;
    }
    case 'unload':
      return c.contents ? undefined : `channel ${ev.ch} holds nothing to unload`;
    case 'purge':
    case 'bolus': {
      if (ev.action === 'bolus' && c.kind !== 'syringe') return 'a bolus is a syringe channel\'s (the drip pump has none)';
      if (!c.contents) return `channel ${ev.ch}: load a syringe or a bag first`;
      if (!pos(ev.rateMlH)) return `${ev.action}: rateMlH, the device's rate the host resolves, must be > 0`;
      const v = ev.action === 'bolus' ? bolusMl(c, ev) : pos(ev.volumeMl) ? ev.volumeMl : 'purge volumeMl must be > 0';
      if (typeof v === 'string') return v;
      if (v > c.volumeMl + PUMP_EMPTY_ML) return `${+v.toFixed(2)} mL is more than the ${+c.volumeMl.toFixed(2)} mL the channel holds`;
      return undefined;
    }
  }
}

/** A bolus's volume: `volumeMl`, or `dose` converted with the PROGRAMMED concentration (and the pump's weight). */
function bolusMl(c: PumpChannel, ev: Extract<PumpEvent, { action: 'bolus' }>): number | string {
  if ((ev.volumeMl === undefined) === (ev.dose === undefined)) return 'bolus: give volumeMl or dose, one of them';
  if (ev.volumeMl !== undefined) return pos(ev.volumeMl) ? ev.volumeMl : 'bolus volumeMl must be > 0';
  if (!c.programmed) return 'a bolus dose needs the channel programmed with a drug and concentration';
  const row = DRUGS[c.programmed.drugId] as DrugRow;
  const d = ev.dose!;
  if (!pos(d.amount)) return 'bolus dose amount must be > 0';
  if (d.unit.endsWith('/kg') && !pos(ev.weightKg)) return 'a per-kg bolus needs weightKg, the weight typed into the pump';
  const a = toAmount(d.amount, d.unit, row.amountUnit, ev.weightKg ?? 1);
  return typeof a === 'string' ? a : a / (perMlOf(row, c.programmed.concentration) as number);
}

/** Apply a validated `pump` event. The channel list is made on the first one, so a run without pumps is untouched. */
export function applyPump(pumps: PumpChannel[], ev: PumpEvent): void {
  let c = channelOf(pumps, ev.ch);
  if (!c) {
    c = {
      ch: ev.ch, kind: (ev as Extract<PumpEvent, { action: 'load' }>).channel, contents: null, syringeMl: null, programmed: null, set: null,
      mode: 'rate', rate: null, rateMlH: 0, limitMl: null, volumeMl: 0, infusedMl: 0, wasteMl: 0, paused: true, rapid: null, alarms: [], tci: null, pred: null,
    };
    pumps.push(c);
    pumps.sort((a, b) => a.ch - b.ch);
  }
  const reconvert = () => {
    if (c.rate) c.rateMlH = rateMlH(c, c.rate.rate, c.rate.unit, c.rate.weightKg) as number;
  };
  switch (ev.action) {
    case 'load':
      c.contents = { drugId: ev.contents.drugId, concentration: { ...ev.contents.concentration }, loadedMl: ev.contents.volumeMl };
      c.syringeMl = ev.channel === 'syringe' ? (ev.syringeMl as number) : null;
      c.volumeMl = ev.contents.volumeMl;
      c.infusedMl = 0;
      c.wasteMl = 0;
      c.paused = true;
      c.rapid = null;
      c.alarms = [];
      return;
    case 'program':
      c.programmed = { drugId: ev.drugId, concentration: { ...ev.concentration } };
      c.set = c.kind === 'drip' ? (ev.set as number) : null;
      // A dose rate or drops/min re-converts under the new programme or set; one that no longer converts (a per-kg rate
      // on a drug dosed in units) stops the channel's rate until it is set again
      if (c.rate && typeof rateMlH(c, c.rate.rate, c.rate.unit, c.rate.weightKg) === 'string') {
        c.rate = null;
        c.rateMlH = 0;
        c.paused = true;
      } else reconvert();
      if (c.tci) c.tci.next = 0; // a TCI channel's rate is re-chosen with the new concentration at the next step
      return;
    case 'rate':
      // A rate on a TCI channel leaves TCI; the prediction is kept and goes on with what the channel gives
      c.mode = 'rate';
      c.tci = null;
      c.rate = { rate: ev.rate, unit: ev.unit, ...(ev.weightKg !== undefined ? { weightKg: ev.weightKg } : {}) };
      if (ev.limitMl !== undefined) c.limitMl = ev.limitMl;
      reconvert();
      return;
    case 'start':
      c.paused = false;
      c.alarms = c.alarms.filter((a) => a !== 'infusionComplete'); // validated: the new limit lies ahead
      return;
    case 'stop':
      c.paused = true;
      return;
    case 'tci': {
      if (ev.target === 0) {
        // TCI stopped: the channel stops; its prediction is kept and goes on falling
        c.mode = 'rate';
        c.tci = null;
        c.rate = null;
        c.rateMlH = 0;
        c.paused = true;
        return;
      }
      const set = tciSet(ev.setId) as TciSet;
      const opioids = opioidsFor(set, ev.opioids);
      // A new set or new typed data starts a fresh prediction at zero — what a real pump does: it knows nothing of the
      // drug already given (validated: never while a TCI runs)
      if (!c.pred || !samePrediction(c.pred, set.meta.id, ev.patient, opioids)) c.pred = newPrediction(set, ev.patient, opioids);
      c.mode = 'tci';
      c.rate = null;
      c.tci = { mode: ev.mode, target: ev.target, maxRateMlH: ev.maxRateMlH ?? TCI_MAX_RATE_ML_H, next: 0 }; // next 0: chosen at the next step
      return;
    }
    case 'unload':
      // The syringe off: the volumes reset, the programme, TCI and the prediction stay (a syringe change mid-TCI
      // [ENG: device; how the SP5 handles a syringe change in TCI is a gap until its manual])
      c.contents = null;
      c.syringeMl = null;
      c.volumeMl = 0;
      c.infusedMl = 0;
      c.wasteMl = 0;
      c.paused = true;
      c.rapid = null;
      c.alarms = [];
      return;
    case 'purge':
      // D7: before the channel has delivered anything the line is being primed (to waste); after, it is connected and
      // the purge goes into the patient
      c.rapid = { what: 'purge', leftMl: ev.volumeMl, rateMlH: ev.rateMlH, toPatient: c.infusedMl > 0 };
      return;
    case 'bolus':
      c.rapid = { what: 'bolus', leftMl: bolusMl(c, ev) as number, rateMlH: ev.rateMlH, toPatient: true };
      return;
  }
}

/**
 * One PK step of every channel: the volume each moves in `dtS`, the amount per minute each drug of the CONTENTS
 * receives from them (D5: channels of one drug add), and an alarm event, once, when a channel stops (D8): End (a
 * syringe channel empty), Empty Container (a drip channel's bag empty), Infusion Complete (a drip channel's volume
 * limit reached). A bolus or purge runs at its own rate in place of the channel's rate, and then the channel goes on
 * as it was (running or stopped).
 */
export function stepPumps(pumps: PumpChannel[], dtS: number, t: number, out: PumpAlarmEvent[]): Record<string, number> {
  const perMin: Record<string, number> = {};
  for (const c of pumps) {
    const row = c.programmed ? (DRUGS[c.programmed.drugId] as DrugRow) : null;
    const progPerMl = row && c.programmed ? (perMlOf(row, c.programmed.concentration) as number) : 0;
    // TCI (E2): every TCI_DT_S the controller chooses the rate that reaches the target IN THE PUMP'S MODEL, clamped to
    // the channel's ceiling in mL/h × the programmed concentration
    if (c.mode === 'tci' && c.tci && c.pred && t >= c.tci.next - 1e-9) {
      const amt = tciRate(c.pred.params, c.pred.x, c.tci.mode, c.tci.target, (c.tci.maxRateMlH * progPerMl) / 60);
      c.rateMlH = progPerMl > 0 ? (amt * 60) / progPerMl : 0;
      c.tci.next = t + TCI_DT_S;
    }
    const intoPatientMl = moveChannel(c, dtS, t, perMin, out);
    // The prediction is fed what the pump believes it gave: the volume it moved into the line × its programme
    if (c.pred) stepPrediction(c.pred, dtS, ((intoPatientMl * progPerMl) / dtS) * 60);
  }
  return perMin;
}

/** One channel's volume for one step (E1): the mL it moved into the patient (0 when nothing flowed or it went to waste). */
function moveChannel(c: PumpChannel, dtS: number, t: number, perMin: Record<string, number>, out: PumpAlarmEvent[]): number {
  if (!c.contents) return 0;
  const rapid = c.rapid;
  const flow = rapid ? rapid.rateMlH : c.paused ? 0 : c.rateMlH;
  if (!(flow > 0)) return 0;
  let dv = Math.min((flow * dtS) / 3600, c.volumeMl);
  if (rapid) dv = Math.min(dv, rapid.leftMl);
  else if (c.limitMl !== null) dv = Math.min(dv, Math.max(0, c.limitMl - c.infusedMl));
  c.volumeMl -= dv;
  if (c.volumeMl <= PUMP_EMPTY_ML) c.volumeMl = 0;
  if (rapid && !rapid.toPatient) c.wasteMl += dv;
  else {
    c.infusedMl += dv;
    const row = DRUGS[c.contents.drugId] as DrugRow;
    const amt = dv * (perMlOf(row, c.contents.concentration) as number);
    perMin[row.id] = (perMin[row.id] ?? 0) + (amt / dtS) * 60;
  }
  if (rapid) {
    rapid.leftMl -= dv;
    if (rapid.leftMl <= PUMP_EMPTY_ML) c.rapid = null;
  }
  let alarm: PumpAlarmId | null = null;
  if (c.volumeMl === 0) alarm = c.kind === 'syringe' ? 'end' : 'emptyContainer';
  else if (!rapid && c.limitMl !== null && c.infusedMl >= c.limitMl - PUMP_EMPTY_ML) alarm = 'infusionComplete';
  if (alarm && !c.alarms.includes(alarm)) {
    c.alarms.push(alarm);
    c.paused = true;
    c.rapid = null;
    out.push({ type: 'pumpAlarm', t, ch: c.ch, channel: c.kind, alarm, programmed: c.programmed?.drugId ?? null });
  }
  return rapid && !rapid.toPatient ? 0 : dv;
}

/** A prediction's row in the `drugs` event (the pump face's Cp and Ce). */
export function predictionRow(p: TciPrediction, ctl: { mode: 'plasma' | 'effect'; target: number } | null | undefined, unit: string): TciPredictionRow {
  return { setId: p.setId, mode: ctl ? ctl.mode : null, target: ctl ? ctl.target : null, cp: (p.x[0] as number) / p.params.v1, ce: p.x[3] as number, unit };
}

/** The `drugs` event's channel rows (1 Hz). */
export function pumpPanel(pumps: PumpChannel[], unitOf: (drugId: string) => string): PumpPanelRow[] {
  return pumps.map((c) => {
    const flow = c.contents && !c.paused ? c.rateMlH : 0;
    return {
      ch: c.ch, kind: c.kind,
      state: !c.contents ? 'notLoaded' : c.alarms.length ? 'alarm' : !c.paused ? 'running' : c.infusedMl > 0 ? 'paused' : 'loaded',
      programmed: c.programmed ? { drugId: c.programmed.drugId, concentration: { ...c.programmed.concentration } } : null,
      contents: c.contents ? { drugId: c.contents.drugId, concentration: { ...c.contents.concentration } } : null,
      syringeMl: c.syringeMl, set: c.set, mode: c.mode,
      rate: c.rate ? { ...c.rate } : null, rateMlH: c.rateMlH, limitMl: c.limitMl,
      volumeMl: c.volumeMl, infusedMl: c.infusedMl, wasteMl: c.wasteMl,
      timeToEmptyMin: flow > 0 ? (c.volumeMl / flow) * 60 : null,
      alarms: [...c.alarms],
      tci: c.pred ? predictionRow(c.pred, c.mode === 'tci' ? c.tci : null, unitOf(tciSet(c.pred.setId)?.meta.drugId ?? '')) : null,
    };
  });
}
