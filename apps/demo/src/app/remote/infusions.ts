// Plan learner-action-remote.md L8 (§4 D2, D3, D8; LQ4 ruled 9 November): the learner remote's Infusions tab. Two lists:
// 1. "Start an infusion": every ready preparation this phone has on its tray (the host's own `prep` news, addressed to
//    this phone only, as the tray reads them), each with the pump's rate in mL/h and, beside it, the dose rate that rate
//    means for this patient: mL/h × the HOST's concentration (its `prep` news) ÷ 60, per kg of the patient's weight as
//    this phone's engine holds it (its snapshot: the host's engine state, same build). Never the phone's own preview of
//    the preparation. "Start" sends `prep infuse` (the host turns it into `applyEvent infusion` with its concentration).
// 2. "Running": every infusion this phone's engine runs (its 1 Hz `drugs` event: the rows with a rate), whoever started it
//    (D8, LQ4: the instructor's, another remote's or this phone's), each with its mL/h, the dose rate as the engine runs
//    it (the engine's own amount per minute of the host's mL/h × concentration, per kg) and "set by <who> at mm:ss" from
//    the host's `commandApplied` of the last rate set (the device key and `issuedBy` the host wrote on it). Change and Stop
//    send `infusion set` (Stop at 0 mL/h); the host keeps that infusion's own syringe and records the device and the rate
//    it replaced (L4). A refusal is the host's words, shown as they are. An infusion that was running before this phone
//    signed in has no `commandApplied` here: it says so instead of guessing who set it.
// A restart or a bookmark restore (the host's `timeline` event) clears the preparations and who set what.
import { givenByOf, LEARNER_ISSUED_BY, type LearnerPrepNews, type LearnerPrepView, type WireMessage } from '@pme/controller';
import { DRUGS, TICK_S, type DrugsEvent, type EngineEvent, type PatientSnapshot, type PkState } from '@pme/engine-core';
import { PRESETS, unitText } from '../drugs.ts';
import { drugName } from '../glossary.ts';
import { button, clock, h, setText, stepper, type Stepper } from '../ui.ts';
import type { Follower, FollowerCommand } from '../views/follower.ts';
import { mmss, perMlText } from './bench.ts';

/** The pump's mL/h range on the phone [ENG: ui; 0.1 mL/h, a syringe pump's finest step, to 1200 mL/h, the published pumps' limit (engine-core l2/pk/tci.ts)]. */
export const INFUSION_ML_H = { min: 0.1, max: 1200, step: 0.1, start: 5 } as const;

export const INFUSION_WORDS = {
  startTitle: 'Start an infusion',
  startEmpty: 'No syringe on the tray is ready. Prepare one in the Drugs tab, then start it here.',
  runningTitle: 'Running',
  runningEmpty: 'No infusion is running.',
  rate: 'Rate',
  start: 'Start',
  change: 'Change',
  stop: 'Stop',
  preparing: (left: number) => `Preparing · ready in ${mmss(left)}`,
  replaces: (drug: string) => `Starting this replaces the running ${drug} infusion.`,
  doseAtRate: 'Dose rate at this rate',
  doseRunning: 'Dose rate',
  forWeight: (kg: number) => `for ${+kg.toFixed(1)} kg`,
  noWeight: "the patient's weight is not known on this phone yet",
  mlH: (v: number) => `${fmt(v)} mL/h`,
  noMlH: 'mL/h not known on this phone',
  tci: 'Target-controlled: changed on the instructor’s computer',
  setBy: (who: string, t: number) => `set by ${who} at ${clock(t)}`,
  setBefore: 'set before this phone signed in',
  thisPhone: 'this phone',
  instructor: 'the instructor',
  card: 'the case card',
  otherRemote: (key: string) => `another learner remote (${key.slice(0, 4)})`,
  sending: 'Sent to the instructor’s computer…',
  started: (ml: number) => `Started at ${fmt(ml)} mL/h`,
  changed: (drug: string, ml: number) => `${drug}: changed to ${fmt(ml)} mL/h`,
  stopped: (drug: string) => `${drug}: stopped`,
  notStarted: (why: string) => `Not started: ${why}`,
  notChanged: (drug: string, why: string) => `${drug}: not changed: ${why}`,
  notStopped: (drug: string, why: string) => `${drug}: not stopped: ${why}`,
} as const;

/** A number as the phone prints a rate: three significant figures, no trailing zeros. */
const fmt = (x: number): string => String(+x.toPrecision(3));

/** The follower's side the menu needs: its command path, its messages, its engine's events, its weight, who it is. */
export interface InfusionsLink {
  command(body: FollowerCommand): string;
  onMessage(fn: (m: WireMessage) => void): () => void;
  /** This phone's engine events (its `drugs` panel event, 1 Hz). */
  onEngine(fn: (e: EngineEvent) => void): () => void;
  /** This phone's engine snapshot (the host's state, restored here): the patient's weight. */
  snapshot(): Promise<PatientSnapshot>;
  peerId: string;
  /** This phone's device key (the `by` the host writes on its commands). */
  device: string;
}

/** The link of a granted learner follower. */
export function infusionsLink(f: Follower, device: string): InfusionsLink | null {
  if (!f.command) return null;
  const command = f.command;
  return {
    command, peerId: f.peerId, device,
    onMessage: (fn) => f.transport.onMessage(fn),
    onEngine: (fn) => f.monitor.on(fn),
    snapshot: () => f.monitor.snapshot(),
  };
}

/** The patient's weight, kg, as an engine snapshot holds it (the drug model's patient, which every per-kg dose uses), or null. */
export function weightOfSnapshot(s: PatientSnapshot | null | undefined): number | null {
  const w = (s?.state as { st?: { pk?: Partial<PkState> } } | undefined)?.st?.pk?.patient?.weightKg;
  return typeof w === 'number' && Number.isFinite(w) && w > 0 ? w : null;
}

const MASS: Readonly<Record<string, number>> = { g: 1e6, mg: 1e3, mcg: 1 }; // in µg

/**
 * The unit a dose rate of `drugId` is read in on the phone: the library's first infusion preset (drugs.ts, the unit the
 * drug is prescribed in), else per kg per minute for µg drugs, per kg per hour for mg and g drugs, per hour otherwise.
 */
export function doseUnitOf(drugId: string, amountUnit: string): string {
  const p = PRESETS[drugId]?.infusion?.[0]?.[1];
  if (p && p !== 'mL/h' && p !== 'mL/kg/min') return p;
  if (amountUnit === 'mcg') return 'mcg/kg/min';
  if (amountUnit === 'mg' || amountUnit === 'g') return 'mg/kg/h';
  return `${amountUnit}/h`;
}

/** `perMin` (amount per minute, in `from`) in `unit`, with `weightKg` for a per-kg unit; null when the units do not meet. */
function inUnit(perMin: number, from: string, unit: string, weightKg: number): number | null {
  const [num = '', ...rest] = unit.split('/');
  const per = rest.join('/');
  const perKg = per.startsWith('kg/');
  const time = perKg ? per.slice(3) : per;
  const minutes = time === 'h' ? 60 : time === 'min' ? 1 : NaN;
  const k = num === from ? 1 : MASS[num] && MASS[from] ? (MASS[from] as number) / (MASS[num] as number) : num === 'mEq' && from === 'mmol' ? 1 : NaN;
  const v = (perMin * k * minutes) / (perKg ? weightKg : 1);
  return Number.isFinite(v) ? v : null;
}

/**
 * The dose-rate line: `perMin` (amount per minute, in `from`) as `drugId` is prescribed, for this patient's weight
 * ("26 µg/kg/min for 64 kg"); without a weight, per minute or hour without the kg, and says the weight is not known.
 */
export function doseRateText(drugId: string, perMin: number, from: string, weightKg: number | null): string {
  const unit = doseUnitOf(drugId, DRUGS[drugId]?.amountUnit ?? from);
  const perKg = unit.includes('/kg/');
  const u = perKg && weightKg === null ? unit.replace('/kg', '') : unit;
  const v = inUnit(perMin, from, u, weightKg ?? 1);
  if (v === null) return `${fmt(perMin)} ${unitText(from)}/min`;
  return `${fmt(v)} ${unitText(u)}${perKg ? ` ${weightKg === null ? `(${INFUSION_WORDS.noWeight})` : INFUSION_WORDS.forWeight(weightKg)}` : ''}`;
}

/** The host's syringe of an infusion: amount per mL, in `unit`. */
type Syringe = { perMl: number; unit: string };
/** Who set a drug's running rate, when, and with what syringe, as the host's `commandApplied` said. */
interface SetBy { who: string; t: number; rateMlH: number | null; syringe: Syringe | null; tci: boolean }

interface StartRow {
  view: LearnerPrepView;
  el: HTMLElement;
  title: HTMLElement;
  state: HTMLElement;
  dose: HTMLElement;
  replaces: HTMLElement;
  said: HTMLElement;
  box: HTMLElement;
  ml: Stepper;
  btn: HTMLButtonElement;
}
interface RunRow {
  drugId: string;
  el: HTMLElement;
  rate: HTMLElement;
  dose: HTMLElement;
  setBy: HTMLElement;
  box: HTMLElement;
  ml: Stepper;
  preview: HTMLElement;
  change: HTMLButtonElement;
  stop: HTMLButtonElement;
  /** The rate the stepper was last set from (it follows the running rate until the learner types). */
  shownMlH: number | null;
}

export interface Infusions {
  el: HTMLElement;
  /** Take a granted follower's link: its acks, `prep`, `commandApplied` and `timeline` events, its engine; returns the detach. */
  attach(link: InfusionsLink): () => void;
  /** The drugs this phone's engine runs an infusion of (a test's view). */
  readonly running: string[];
  /** The weight the dose rates use, kg (null: not yet known). */
  readonly weightKg: number | null;
}

/** The Infusions tab: "Start an infusion" over "Running". */
export function infusionsView(o: { now(): number | null }): Infusions {
  const preps = new Map<string, StartRow>();
  const runs = new Map<string, RunRow>();
  const setBy = new Map<string, SetBy>();
  /** A command's id → what it asked for, and where its answer goes. */
  const pending = new Map<string, { what: 'start' | 'change' | 'stop'; drug: string; ml: number; said: HTMLElement }>();
  let last: DrugsEvent | null = null;
  let weightKg: number | null = null;
  let link: InfusionsLink | null = null;

  const startList = h('ul', { class: 'lr-tray-list lr-inf-start', 'aria-label': INFUSION_WORDS.startTitle });
  const startEmpty = h('p', { class: 'hint lr-inf-start-empty' }, INFUSION_WORDS.startEmpty);
  const runList = h('ul', { class: 'lr-tray-list lr-inf-running', 'aria-label': INFUSION_WORDS.runningTitle });
  const runEmpty = h('p', { class: 'hint lr-inf-running-empty' }, INFUSION_WORDS.runningEmpty);
  const runSaid = h('p', { class: 'lr-said lr-inf-said', role: 'status' });
  const el = h('div', { class: 'lr-infusions' },
    h('section', { class: 'lr-inf-section', 'aria-label': INFUSION_WORDS.runningTitle }, h('h2', { class: 'lr-h2' }, INFUSION_WORDS.runningTitle), runSaid, runEmpty, runList),
    h('section', { class: 'lr-inf-section', 'aria-label': INFUSION_WORDS.startTitle }, h('h2', { class: 'lr-h2' }, INFUSION_WORDS.startTitle), startEmpty, startList));

  const rowOf = (drugId: string) => last?.drugs.find((d) => d.id === drugId && d.rate !== null) ?? null;
  const isReady = (v: LearnerPrepView) => (o.now() ?? -Infinity) >= v.ready.atS;
  /** The dose rate of `ml` mL/h through `syringe` (amount/min = mL/h × amount per mL ÷ 60). */
  const doseAt = (drugId: string, ml: number, s: Syringe) => doseRateText(drugId, (ml * s.perMl) / 60, s.unit, weightKg);
  /** The running infusion's syringe: the host's, else the engine row's own (what the host's `infusion set` keeps then). */
  const syringeOf = (drugId: string): Syringe | null => {
    const s = setBy.get(drugId)?.syringe;
    if (s) return s;
    const row = DRUGS[drugId];
    return row?.syringePerMl ? { perMl: row.syringePerMl, unit: row.amountUnit } : null;
  };
  /** The running mL/h: as the host set it, else the engine's amount per minute through the syringe. */
  const mlHOf = (drugId: string): number | null => {
    const s = setBy.get(drugId);
    if (s?.rateMlH != null) return s.rateMlH;
    const row = rowOf(drugId);
    const syr = syringeOf(drugId);
    return row?.rate != null && syr && row.amountUnit === syr.unit ? (row.rate * 60) / syr.perMl : null;
  };

  function send(what: 'start' | 'change' | 'stop', body: FollowerCommand, drug: string, ml: number, said: HTMLElement): void {
    if (!link) return;
    pending.set(link.command(body), { what, drug, ml, said });
    setText(said, INFUSION_WORDS.sending);
  }

  function addPrep(v: LearnerPrepView): StartRow {
    const ml = stepper({ label: INFUSION_WORDS.rate, unit: 'mL/h', min: INFUSION_ML_H.min, max: INFUSION_ML_H.max, step: INFUSION_ML_H.step, value: INFUSION_ML_H.start, onchange: () => drawPrep(r) });
    const r: StartRow = {
      view: v, ml,
      el: h('li', { class: 'lr-item lr-inf-prep', 'data-prep': v.id }),
      title: h('p', { class: 'lr-item-title' }),
      state: h('p', { class: 'lr-state' }),
      dose: h('p', { class: 'lr-dose', 'aria-live': 'polite' }),
      replaces: h('p', { class: 'hint lr-replaces' }),
      said: h('p', { class: 'lr-said', role: 'status' }),
      box: h('div', { class: 'lr-give' }),
      btn: button(INFUSION_WORDS.start, () => send('start', { type: 'prep', action: 'infuse', prepId: r.view.id, rateMlH: r.ml.value }, names(r.view), r.ml.value, r.said), 'primary lr-start'),
    };
    ml.input.addEventListener('input', () => drawPrep(r));
    r.box.append(h('div', { class: 'field' }, h('span', { class: 'lr-label' }, `${INFUSION_WORDS.rate} (mL/h)`), ml.el), r.dose, r.replaces, h('div', { class: 'lr-actions' }, r.btn));
    r.el.append(r.title, r.state, r.box, r.said);
    preps.set(v.id, r);
    startList.append(r.el);
    return r;
  }
  const names = (v: LearnerPrepView) => v.actives.map((a) => drugName(a.drugId)).join(' + ');

  function drawPrep(r: StartRow): void {
    const v = r.view;
    setText(r.title, `${v.actives.map((a) => `${drugName(a.drugId)} ${perMlText(a.perMl, a.unit)}`).join(' + ')} · ${+v.leftMl.toFixed(2)} mL`);
    const now = o.now();
    const left = now === null ? null : v.ready.atS - now;
    setText(r.state, left !== null && left > 0 ? INFUSION_WORDS.preparing(left) : '');
    r.box.hidden = !isReady(v);
    const ml = r.ml.value;
    setText(r.dose, `${INFUSION_WORDS.doseAtRate}: ${v.actives.map((a) => `${v.actives.length > 1 ? `${drugName(a.drugId)} ` : ''}${doseAt(a.drugId, ml, { perMl: a.perMl, unit: a.unit })}`).join(' · ')}`);
    const running = v.actives.find((a) => rowOf(a.drugId));
    setText(r.replaces, running ? INFUSION_WORDS.replaces(drugName(running.drugId)) : '');
  }

  function addRun(drugId: string): RunRow {
    const ml = stepper({ label: `${drugName(drugId)} ${INFUSION_WORDS.rate}`, unit: 'mL/h', min: INFUSION_ML_H.min, max: INFUSION_ML_H.max, step: INFUSION_ML_H.step, value: INFUSION_ML_H.start, onchange: () => drawRun(r) });
    const name = drugName(drugId);
    const r: RunRow = {
      drugId, ml, shownMlH: null,
      el: h('li', { class: 'lr-item lr-inf', 'data-drug': drugId }, h('p', { class: 'lr-item-title' }, name)),
      rate: h('p', { class: 'lr-conc lr-rate' }),
      dose: h('p', { class: 'lr-dose', 'data-from': 'engine' }),
      setBy: h('p', { class: 'hint lr-setby' }),
      box: h('div', { class: 'lr-give lr-inf-change' }),
      preview: h('p', { class: 'hint lr-dose-preview', 'aria-live': 'polite' }),
      change: button(INFUSION_WORDS.change, () => send('change', { type: 'infusion', action: 'set', drugId, rateMlH: r.ml.value }, name, r.ml.value, runSaid), 'primary lr-change-btn'),
      stop: button(INFUSION_WORDS.stop, () => send('stop', { type: 'infusion', action: 'set', drugId, rateMlH: 0 }, name, 0, runSaid), 'lr-stop'),
    };
    ml.input.addEventListener('input', () => drawRun(r));
    r.box.append(h('div', { class: 'field' }, h('span', { class: 'lr-label' }, `${INFUSION_WORDS.rate} (mL/h)`), ml.el), r.preview, h('div', { class: 'lr-actions' }, r.change, r.stop));
    r.el.append(r.rate, r.dose, r.setBy, r.box);
    runs.set(drugId, r);
    runList.append(r.el);
    return r;
  }

  function drawRun(r: RunRow): void {
    const row = rowOf(r.drugId);
    if (!row || row.rate === null) return;
    const s = setBy.get(r.drugId);
    const tci = row.tci !== null || s?.tci === true;
    const ml = mlHOf(r.drugId);
    setText(r.rate, tci ? INFUSION_WORDS.tci : ml !== null ? INFUSION_WORDS.mlH(ml) : INFUSION_WORDS.noMlH);
    setText(r.dose, `${INFUSION_WORDS.doseRunning}: ${doseRateText(r.drugId, row.rate, row.amountUnit, weightKg)}`);
    setText(r.setBy, s ? INFUSION_WORDS.setBy(s.who, s.t) : INFUSION_WORDS.setBefore);
    r.box.hidden = tci;
    // the stepper follows the running rate until the learner types a new one
    if (ml !== null && ml !== r.shownMlH && document.activeElement !== r.ml.input) {
      r.ml.set(ml);
      r.shownMlH = ml;
    }
    const syr = syringeOf(r.drugId);
    setText(r.preview, syr ? `${INFUSION_WORDS.doseAtRate}: ${doseAt(r.drugId, r.ml.value, syr)}` : '');
  }

  function draw(): void {
    for (const r of preps.values()) drawPrep(r);
    const live = new Set((last?.drugs ?? []).filter((d) => d.rate !== null).map((d) => d.id));
    for (const [id, r] of runs) if (!live.has(id)) (r.el.remove(), runs.delete(id));
    for (const id of live) drawRun(runs.get(id) ?? addRun(id));
    startEmpty.hidden = [...preps.values()].some((r) => isReady(r.view));
    runEmpty.hidden = runs.size > 0;
  }

  function onNews(n: LearnerPrepNews): void {
    const v = n.prep;
    const r = preps.get(v.id);
    // what can be started: a preparation with something left; a discarded or emptied one goes
    if (n.news === 'discarded' || v.leftMl <= 0) {
      r?.el.remove();
      preps.delete(v.id);
      return;
    }
    if (r) r.view = v;
    else addPrep(v);
  }

  function onApplied(tick: number, resolved: unknown): void {
    const res = resolved as { command?: Record<string, unknown>; mirror?: boolean } | null;
    const c = res?.command;
    if (!c || res?.mirror || c.type !== 'applyEvent') return;
    const e = c.event as { kind?: string; drugId?: unknown; rate?: unknown; dose?: unknown; unit?: unknown; infusion?: unknown; concentration?: { amount?: unknown; unit?: unknown; perMl?: unknown } } | undefined;
    if (!e || typeof e.drugId !== 'string') return;
    // as the host's own table of running infusions reads a command (host-session.ts noteInfusion)
    const rate = e.kind === 'infusion' ? e.rate : e.kind === 'drug' && (e.infusion === true || /\/(min|h)$/.test(String(e.unit))) ? e.dose : undefined;
    if (e.kind !== 'tci' && typeof rate !== 'number') return;
    if (rate === 0) return void setBy.delete(e.drugId);
    const issuedBy = String(c.issuedBy ?? '');
    const by = typeof c.by === 'string' ? c.by : null;
    const who = issuedBy === LEARNER_ISSUED_BY
      ? by === link?.device ? INFUSION_WORDS.thisPhone : INFUSION_WORDS.otherRemote(by ?? '')
      : givenByOf(issuedBy) === 'card' ? INFUSION_WORDS.card : INFUSION_WORDS.instructor;
    const k = e.concentration;
    const syringe = k && typeof k.amount === 'number' && typeof k.unit === 'string' && typeof k.perMl === 'number' && k.perMl > 0 ? { perMl: k.amount / k.perMl, unit: k.unit } : null;
    setBy.set(e.drugId, { who, t: tick * TICK_S, rateMlH: e.kind === 'infusion' && e.unit === 'mL/h' ? (rate as number) : null, syringe, tci: e.kind === 'tci' });
  }

  function onAck(commandId: string, accepted: boolean, reason: string | undefined): void {
    const p = pending.get(commandId.replace(/\.\d+$/, '')); // a two-drug preparation's items are acked as <id>, <id>.2 (L4)
    if (!p) return;
    pending.delete(commandId.replace(/\.\d+$/, ''));
    const why = reason ?? '';
    const W = INFUSION_WORDS;
    setText(p.said, p.what === 'start' ? (accepted ? W.started(p.ml) : W.notStarted(why)) : p.what === 'change' ? (accepted ? W.changed(p.drug, p.ml) : W.notChanged(p.drug, why)) : accepted ? W.stopped(p.drug) : W.notStopped(p.drug, why));
  }

  function clear(): void {
    for (const r of preps.values()) r.el.remove();
    preps.clear();
    setBy.clear();
    pending.clear();
    setText(runSaid, '');
  }

  const readWeight = (l: InfusionsLink) => void l.snapshot().then((s) => {
    if (link !== l) return;
    weightKg = weightOfSnapshot(s) ?? weightKg;
    draw();
  }, () => undefined);

  function attach(l: InfusionsLink): () => void {
    link = l;
    readWeight(l);
    const offMsg = l.onMessage((m) => {
      if (m.kind === 'ack') return onAck(m.commandId, m.accepted, m.reason);
      // a new timeline's snapshot: the patient (and so the weight) may be another
      if (m.kind === 'snapshot') weightKg = weightOfSnapshot(m.body) ?? weightKg;
      if (m.kind !== 'event') return draw();
      for (const e of m.body) {
        if (e.type === 'timeline') clear();
        if (e.type === 'prep' && e.to === l.peerId) onNews(e.body as LearnerPrepNews);
        if (e.type === 'commandApplied') onApplied(e.tick, e.resolved);
      }
      draw();
    });
    const offEngine = l.onEngine((e) => {
      if (e.type !== 'drugs') return;
      last = e;
      draw();
    });
    return () => {
      offMsg();
      offEngine();
      if (link === l) link = null;
    };
  }

  draw();
  return { el, attach, get running() { return [...runs.keys()]; }, get weightKg() { return weightKg; } };
}
