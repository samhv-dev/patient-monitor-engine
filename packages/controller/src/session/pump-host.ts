// Plan pump-rack-tci.md C2 (§4 D2, D4, D7, D9, D12; §7, §8): the host's side of the pump tablet. A pump names what it
// loads and what it programs, never what a syringe holds: this module resolves a preparation (from the host's table,
// learner plan D3) or a stock item (S1) to the syringe's or bag's TRUE contents, checks every command against the
// channel's kind (Room setup's rack, A1) and the reference device's profile (D12, S1: every range and device word on a
// refusal is the profile's), resolves the device rates the engine needs (the bolus and purge rates), and builds the
// engine's `pump` event (E1, E2). It also keeps what the host APPLIED to each channel — its kind, syringe size, contents
// and their origin, programme, rate, TCI and who set each — so a change can name the value it replaced, a mismatch of
// contents and programme can be found (§8), and a remote's `infusion set` can be routed to its channel (D9). The volumes
// stay the engine's (D4): this table holds none. Pure: no clock, no I/O; host-session.ts owns when each step runs.
import { DRUGS, type DoseUnit, type RateUnit } from '@pme/engine-core';
import type { PumpCommand, PumpMeta, PumpPatient, PumpReplaced, PumpSource, WireCommand } from '../protocol.ts';
import type { Formulary, StockItem } from '../formulary/types.ts';
import type { PumpDevices, Sp500Profile, Ot701Profile } from '../pump-devices.ts';
import { notUsable, remainingOf, type HostPrep } from './preparations.ts';

/** A channel's kind, as Room setup sets it (A1; protocol.ts PumpKind once A1 merges). */
export type ChannelKind = 'syringe' | 'drip';
/** A syringe's or bag's concentration: `amount` `unit` per `perMl` mL (engine-core PumpConcentration). */
export interface Conc {
  amount: number;
  unit: 'mg' | 'mcg' | 'g' | 'units' | 'mmol';
  perMl: number;
}

/** What the host applied to one channel (never a volume: those are the engine's, D4). `by`: who set each value. */
export interface HostChannel {
  ch: number;
  kind: ChannelKind;
  syringeMl: number | null;
  /** The TRUE contents (what the patient receives), the LABEL they were made or stocked at, and where they came from. */
  contents: { drugId: string; concentration: Conc; label: Conc; volumeMl: number; origin: PumpSource | null } | null;
  programmed: { drugId: string; concentration: Conc } | null;
  set: number | null;
  rate: { rate: number; unit: RateUnit | 'drops/min'; weightKg?: number } | null;
  tci: { setId: string; mode: 'plasma' | 'effect'; target: number; patient: PumpPatient } | null;
  /** Started and not stopped since (a stop, an unload, End, Empty Container or Infusion Complete stops it). */
  running: boolean;
  by: { load?: string; programme?: string; rate?: string; tci?: string };
  /** §8: contents and programme differ; the instructor's finding and whether its notice was shown. */
  mismatch: { since: number; notice: { shownAt: number } | null } | null;
}

/** What the pump's command became: the engine's event, or the words it is refused with. */
export type PumpTranslated = { ok: true; event: Record<string, unknown>; meta: PumpMeta } | { ok: false; why: string };

/** The host's lookups a pump command needs. `prep(device, id)`: a preparation of the room's learner remotes (D3). */
export interface PumpContext {
  rack: readonly ChannelKind[];
  devices: PumpDevices;
  formulary: Formulary | null;
  channels: ReadonlyMap<number, HostChannel>;
  prep: (device: string, id: string) => HostPrep | undefined;
  simT: number;
}

const no = (why: string) => ({ ok: false as const, why });
/** A rate compared with a device step after arithmetic (0.1 mL/h steps of a typed decimal) [ENG: numerics]. */
const STEP_EPS = 1e-6;
/** µg per unit of mass; units and mmol stand alone. */
const MASS: Readonly<Record<string, number>> = { g: 1e6, mg: 1000, mcg: 1 };
const CONC_UNITS: ReadonlySet<string> = new Set(['mg', 'mcg', 'g', 'units', 'mmol']);
const list = (xs: readonly (string | number)[]): string => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const fix = (n: number): number => +n.toFixed(3);
export const deviceName = (d: { maker: string; model: string }): string => `${d.maker} ${d.model}`;

/** `amount` of `from` in `to` (mass converts; units, mmol and mEq ≡ mmol stand alone), or null when they do not convert. */
function inUnit(amount: number, from: string, to: string): number | null {
  if (from === to) return amount;
  if (from in MASS && to in MASS) return (amount * (MASS[from] as number)) / (MASS[to] as number);
  if (from === 'mEq' && to === 'mmol') return amount; // monovalent, as the engine's units.ts reads it
  return null;
}
/** A concentration's amount per mL in `unit` (null: it does not convert). */
const perMlIn = (c: Conc, unit: string): number | null => {
  const a = inUnit(c.amount, c.unit, unit);
  return a === null ? null : a / c.perMl;
};
/** Two concentrations of one amount per mL (to 1 part in 10⁶), whatever their units. */
export function sameConc(a: Conc, b: Conc): boolean {
  const x = perMlIn(a, a.unit);
  const y = perMlIn(b, a.unit);
  return x !== null && y !== null && Math.abs(x - y) <= 1e-6 * Math.max(Math.abs(x), Math.abs(y));
}
/** "10 mg/mL" (a concentration as a pump's label shows it). */
export const concText = (c: Conc): string => `${fix(c.amount / c.perMl)} ${c.unit}/mL`;

/**
 * mL/h of a rate as entered, with the PROGRAMMED concentration and the typed weight (as a real pump converts a dose rate,
 * plan D2 item 3; the engine's own conversion is l2/pk/pump.ts rateMlH, which the host cannot import: engine-core exports
 * no unit helper). drops/min converts with the IV set: mL/h = drops/min × 60 ÷ drops/mL.
 */
export function rateMlH(rate: number, unit: RateUnit | 'drops/min', c: Pick<HostChannel, 'programmed' | 'set' | 'kind'>, weightKg?: number): number | string {
  if (unit === 'mL/h') return rate;
  if (unit === 'drops/min') return c.kind === 'drip' && c.set !== null ? (rate * 60) / c.set : "drops/min is a drip channel's rate (its IV set's drops/mL)";
  const parts = unit.split('/');
  const perKg = parts[1] === 'kg';
  const time = parts.at(-1);
  if (perKg && !(typeof weightKg === 'number' && weightKg > 0)) return 'a per-kg dose rate needs weightKg, the weight typed into the pump';
  const perH = rate * (perKg ? (weightKg as number) : 1) * (time === 'min' ? 60 : 1);
  if (parts[0] === 'mL') return perH;
  if (!c.programmed) return 'a dose rate needs the channel programmed with a drug and concentration';
  const perMl = perMlIn(c.programmed.concentration, parts[0] as string);
  return perMl === null ? `${unit} does not fit ${concText(c.programmed.concentration)}` : perH / perMl;
}

/** mL of a bolus dose with the PROGRAMMED concentration (and the typed weight). */
export function doseMl(dose: { amount: number; unit: DoseUnit }, c: Pick<HostChannel, 'programmed'>, weightKg?: number): number | string {
  const perKg = dose.unit.endsWith('/kg');
  const base = perKg ? dose.unit.slice(0, -3) : dose.unit;
  if (perKg && !(typeof weightKg === 'number' && weightKg > 0)) return 'a per-kg bolus needs weightKg, the weight typed into the pump';
  const amount = dose.amount * (perKg ? (weightKg as number) : 1);
  if (base === 'mL') return amount;
  if (!c.programmed) return 'a bolus dose needs the channel programmed with a drug and concentration';
  const perMl = perMlIn(c.programmed.concentration, base);
  return perMl === null ? `${dose.unit} does not fit ${concText(c.programmed.concentration)}` : amount / perMl;
}

/** The SP-500's figures for the loaded syringe size, or why there are none. */
function syringeOf(sp: Sp500Profile, c: HostChannel | undefined): Sp500Profile['syringes'][number] | string {
  const s = c?.syringeMl != null ? sp.syringes.find((x) => x.ml === c.syringeMl) : undefined;
  return s ?? `load a syringe first: the ${deviceName(sp)}'s rates are per syringe size (${list(sp.syringes.map((x) => x.ml))} mL)`;
}
/** The OT-701's figures for the programmed IV set, or why there are none. */
function setOf(ot: Ot701Profile, c: HostChannel | undefined): Ot701Profile['sets'][number] | string {
  const s = c?.set != null ? ot.sets.find((x) => x.dropsPerMl === c.set) : undefined;
  return s ?? `program the IV set first: the ${deviceName(ot)}'s rates are per set (${list(ot.sets.map((x) => x.dropsPerMl))} drops/mL)`;
}
/** Whether `v` is a whole number of `step`s. */
const onStep = (v: number, step: number): boolean => Math.abs(v / step - Math.round(v / step)) < STEP_EPS;

/**
 * Resolve what a pump loads (D2 item 1, §7, §8): a ready preparation of one drug in a syringe (a syringe channel) or a
 * bag (a drip channel), its concentration × the fraction still intact at the load (the learner plan's §7.1), its volume
 * what is left in it; or a stock syringe or bag at its product's labelled strength (S1).
 */
function resolveSource(src: PumpSource, kind: ChannelKind, x: PumpContext): { drugId: string; concentration: Conc; label: Conc; volumeMl: number } | string {
  const f = x.formulary;
  if (!f) return 'this computer has no formulary loaded yet';
  const what = kind === 'syringe' ? 'syringe' : 'bag';
  if ('stock' in src) {
    const items: StockItem[] = kind === 'syringe' ? f.stock.syringes : f.stock.bags;
    const item = items.find((s) => s.id === src.stock);
    if (!item) return items.length ? `no stock ${what} "${src.stock}" (${list(items.map((s) => s.id))})` : `no stock ${what}s are listed: make one on the bench`;
    const p = f.drugs[item.drugId]?.products.find((x) => x.id === item.product);
    if (!p || !CONC_UNITS.has(p.strength.unit)) return `stock ${what} "${item.id}" has no strength the pump can take`;
    const c: Conc = { amount: p.strength.amount, unit: p.strength.unit as Conc['unit'], perMl: 1 };
    return { drugId: item.drugId, concentration: c, label: c, volumeMl: item.volumeMl.ml };
  }
  const h = x.prep(src.prep.device, src.prep.id);
  if (!h) return `no preparation ${src.prep.id} of that remote`;
  const container = h.prep.container;
  if (kind === 'syringe' ? container !== 'syringe-pp' : !(container === 'bag-pvc' || container === 'bag-polyolefin')) {
    return kind === 'syringe' ? 'a syringe channel takes a preparation made in a syringe' : 'a drip channel takes a preparation made in a bag';
  }
  if (h.prep.actives.length !== 1) return 'a pump channel takes a preparation of one drug';
  const why = notUsable(f, h, x.simT);
  if (why) return why;
  if (h.leftMl <= 1e-9) return 'the preparation is empty';
  const a = h.prep.actives[0]!;
  if (!CONC_UNITS.has(a.unit)) return `the pump takes no ${a.drugId} in ${a.unit}`;
  const r = remainingOf(f, h, a.drugId, x.simT).r;
  const unit = a.unit as Conc['unit'];
  return { drugId: a.drugId, concentration: { amount: a.perMl * r, unit, perMl: 1 }, label: { amount: a.perMl, unit, perMl: 1 }, volumeMl: h.leftMl };
}

/**
 * A pump's command → the engine's `pump` event with the host's metadata (`meta`: the channel, the contents' drug a
 * bolus gives, the replaced values, the mismatch), or the refusal. `cmd` has passed pumpMay and the guard; `by` names
 * who sent it (a pump's device key, or the D9 sender) for the replaced values the table records.
 */
export function translatePump(cmd: PumpCommand, x: PumpContext): PumpTranslated {
  const n = x.rack.length;
  if (!(cmd.ch >= 1 && cmd.ch <= n)) return no(n === 0 ? 'this room has no pump channels' : `this rack has channel${n === 1 ? ' 1' : `s 1–${n}`}`);
  const kind = x.rack[cmd.ch - 1] as ChannelKind;
  const c = x.channels.get(cmd.ch);
  const sp = x.devices['sp-500'];
  const ot = x.devices['ot-701'];
  const dev = kind === 'syringe' ? sp : ot;
  const meta: PumpMeta = { ch: cmd.ch };
  const ev = (o: Record<string, unknown>): PumpTranslated => ({ ok: true, event: { kind: 'pump', ch: cmd.ch, ...o }, meta });
  if (c?.contents) meta.contents = { drugId: c.contents.drugId, concentration: c.contents.concentration };
  /** An action that gives the patient the contents: the record and grade() read the mismatch on it (§8 "Grading"). */
  const gives = (infusion?: { rate: number; unit: string }): void => {
    if (infusion) meta.infusion = infusion;
    if (c?.programmed && mismatched(c)) meta.mismatch = { programmed: c.programmed };
  };
  const prev = (what: PumpReplaced['what']): void => {
    const r = replacedOf(what, c);
    if (r) (meta.replaced ??= []).push(r);
  };
  switch (cmd.action) {
    case 'load': {
      const src = 'syringe' in cmd ? cmd.syringe : cmd.bag;
      if (('syringe' in cmd) !== (kind === 'syringe')) return no(`channel ${cmd.ch} is a ${kind} channel (${deviceName(dev)}): it takes a ${kind === 'syringe' ? 'syringe' : 'bag'}`);
      const k = resolveSource(src, kind, x);
      if (typeof k === 'string') return no(k);
      let syringeMl: number | undefined;
      if (kind === 'syringe') {
        // A preparation or stock item names its volume, not its syringe: the smallest SP-500 size that holds it
        // [ENG: device; the bench records no syringe size (learner plan D2)]
        syringeMl = [...sp.syringes].sort((a, b) => a.ml - b.ml).find((s) => s.ml >= k.volumeMl - 1e-9)?.ml;
        if (syringeMl === undefined) return no(`the ${deviceName(sp)} takes ${list(sp.syringes.map((s) => s.ml))} mL syringes: ${fix(k.volumeMl)} mL does not fit`);
      }
      meta.contents = { drugId: k.drugId, concentration: k.concentration };
      meta.origin = src;
      meta.label = k.label;
      return ev({ action: 'load', channel: kind, contents: { drugId: k.drugId, concentration: k.concentration, volumeMl: k.volumeMl }, ...(syringeMl !== undefined ? { syringeMl } : {}) });
    }
    case 'program': {
      if (!(cmd.drugId in DRUGS)) return no(`the pump has no drug "${cmd.drugId}"`);
      if (kind === 'drip') {
        if (cmd.set === undefined || !ot.sets.some((s) => s.dropsPerMl === cmd.set)) return no(`the ${deviceName(ot)} takes ${list(ot.sets.map((s) => s.dropsPerMl))} drops/mL sets`);
      } else if (cmd.set !== undefined) return no(`an IV set (drops/mL) belongs to a drip channel, not the ${deviceName(sp)}`);
      prev('programme');
      return ev({ action: 'program', drugId: cmd.drugId, concentration: cmd.concentration, ...(cmd.set !== undefined ? { set: cmd.set } : {}) });
    }
    case 'rate': {
      if (cmd.limitMl !== undefined && kind !== 'drip') return no(`a volume limit belongs to a drip channel, not the ${deviceName(sp)}`);
      if (cmd.limitMl != null && !(cmd.limitMl >= ot.volumeLimit.min && cmd.limitMl <= ot.volumeLimit.max)) {
        return no(`the ${deviceName(ot)}'s volume limit is ${ot.volumeLimit.min}–${ot.volumeLimit.max} mL${ot.volumeLimit.none ? ', or none' : ''}`);
      }
      const why = rateRefusal(cmd.rate, cmd.unit, kind, c, x.devices, cmd.weightKg);
      if (why) return no(why);
      prev('rate');
      if (c?.running) gives({ rate: cmd.rate, unit: cmd.unit });
      return ev({ action: 'rate', rate: cmd.rate, unit: cmd.unit, ...(cmd.limitMl !== undefined ? { limitMl: cmd.limitMl } : {}), ...(cmd.weightKg !== undefined ? { weightKg: cmd.weightKg } : {}) });
    }
    case 'tci': {
      if (kind !== 'syringe') return no(`the ${deviceName(ot)} has no TCI`);
      prev('tci');
      if (c?.tci && !samePatient(c.tci.patient, cmd.patient)) prev('patient');
      if (cmd.target > 0) gives();
      const { opioids, ...patient } = cmd.patient;
      // the SP5 TCI's ceiling is a gap until its manual (sp5-tci.json tci.maxRate): none sent, the engine's 1200 mL/h holds
      return ev({ action: 'tci', setId: cmd.setId, mode: cmd.mode, target: cmd.target, patient, ...(opioids !== undefined ? { opioids } : {}) });
    }
    case 'bolus': {
      if (kind !== 'syringe') return no(`the ${deviceName(ot)} has no bolus`);
      const s = syringeOf(sp, c);
      if (typeof s === 'string') return no(s);
      const ml = 'volumeMl' in cmd ? cmd.volumeMl : doseMl(cmd.dose, c ?? { programmed: null }, cmd.weightKg);
      if (c?.contents) meta.gives = c.contents.drugId; // the drug lock reads it (drug-lock.ts): the patient receives the contents
      if (typeof ml === 'number' && c?.contents) {
        // PQ3 = A: a bolus, filed as one; its seconds (volume at the rapid rate) kept for the Debrief, never `overS`
        const k = c.contents.concentration;
        meta.bolus = { volumeMl: ml, dose: (ml * k.amount) / k.perMl, unit: k.unit, seconds: (ml / s.rapid.rate) * 3600 };
      }
      gives();
      return ev({ action: 'bolus', ...('volumeMl' in cmd ? { volumeMl: cmd.volumeMl } : { dose: cmd.dose }), ...(cmd.weightKg !== undefined ? { weightKg: cmd.weightKg } : {}), rateMlH: s.rapid.rate });
    }
    case 'purge': {
      // D7: the syringe size's rapid rate on a syringe channel, the OT-701's "more than 450 mL/h" (its stated floor) on a drip one
      let rate: number;
      if (kind === 'syringe') {
        const s = syringeOf(sp, c);
        if (typeof s === 'string') return no(s);
        rate = s.rapid.rate;
      } else rate = ot.purge.rateMoreThan;
      return ev({ action: 'purge', volumeMl: cmd.volumeMl, rateMlH: rate });
    }
    case 'start':
      if (c?.rate) gives({ rate: c.rate.rate, unit: c.rate.unit });
      else if (c?.tci) gives();
      return ev({ action: 'start' });
    case 'stop':
    case 'unload':
      if (c?.running && c.rate) meta.infusion = { rate: 0, unit: c.rate.unit };
      return ev({ action: cmd.action });
  }
}

/** The device range a rate must fall in (D2 item 3, D12), in the profile's own figures, or null when it does. */
export function rateRefusal(rate: number, unit: RateUnit | 'drops/min', kind: ChannelKind, c: HostChannel | undefined, devices: PumpDevices, weightKg?: number): string | null {
  const ch = c ?? { programmed: null, set: null, kind };
  if (kind === 'syringe') {
    const sp = devices['sp-500'];
    const s = syringeOf(sp, c);
    if (typeof s === 'string') return s;
    const ml = rateMlH(rate, unit, ch, weightKg);
    if (typeof ml === 'string') return ml;
    const words = `the ${deviceName(sp)} runs ${s.rate.min}–${s.rate.max} mL/h with a ${s.ml} mL syringe, in ${sp.rateStep.step} mL/h steps`;
    if (ml < s.rate.min - STEP_EPS || ml > s.rate.max + STEP_EPS) return `${fix(ml)} mL/h: ${words}`;
    if (unit === 'mL/h' && !onStep(rate, sp.rateStep.step)) return `${rate} mL/h: ${words}`;
    return null;
  }
  const ot = devices['ot-701'];
  const s = setOf(ot, c);
  if (typeof s === 'string') return s;
  // the factory range ("standard", ot-701.json factory); the narrow range waits for the manual (narrowRange gap)
  const r = s.standard;
  if (unit === 'drops/min') {
    if (rate < r.dropsMin.min || rate > r.dropsMin.max) return `${rate} drops/min: the ${deviceName(ot)} runs ${r.dropsMin.min}–${r.dropsMin.max} drops/min with a ${s.dropsPerMl} drops/mL set`;
    return null; // the drops/min step is a gap until the manual (dropsStep)
  }
  const ml = rateMlH(rate, unit, ch, weightKg);
  if (typeof ml === 'string') return ml;
  const words = `the ${deviceName(ot)} runs ${r.mlH.min}–${r.mlH.max} mL/h with a ${s.dropsPerMl} drops/mL set, in ${ot.rateStep.step} mL/h steps`;
  if (ml < r.mlH.min - STEP_EPS || ml > r.mlH.max + STEP_EPS) return `${fix(ml)} mL/h: ${words}`;
  if (unit === 'mL/h' && !onStep(rate, ot.rateStep.step)) return `${rate} mL/h: ${words}`;
  return null;
}

const samePatient = (a: PumpPatient, b: PumpPatient): boolean =>
  a.ageY === b.ageY && a.weightKg === b.weightKg && a.heightCm === b.heightCm && a.sex === b.sex && a.pmaWeeks === b.pmaWeeks && a.opioids === b.opioids;

/** The value a change replaces on the channel, and who had set it (D9, §7 "Record"); undefined when nothing was set. */
function replacedOf(what: PumpReplaced['what'], c: HostChannel | undefined): PumpReplaced | undefined {
  if (!c) return undefined;
  if (what === 'programme' && c.programmed) return { what, drugId: c.programmed.drugId, concentration: c.programmed.concentration, ...(c.set !== null ? { set: c.set } : {}), by: c.by.programme ?? '' };
  if (what === 'rate' && c.rate) return { what, rate: c.rate.rate, unit: c.rate.unit, by: c.by.rate ?? '' };
  if (what === 'tci' && c.tci) return { what, setId: c.tci.setId, mode: c.tci.mode, target: c.tci.target, by: c.by.tci ?? '' };
  if (what === 'patient' && c.tci) return { what, patient: c.tci.patient, by: c.by.tci ?? '' };
  return undefined;
}

/** A channel's contents and programme differ (§8): another drug, or the same drug at another concentration than its label. */
export function mismatched(c: HostChannel): boolean {
  return !!c.contents && !!c.programmed && (c.contents.drugId !== c.programmed.drugId || !sameConc(c.contents.label, c.programmed.concentration));
}

/**
 * An APPLIED `pump` event (accepted by the engine) into the host's table, by `by` (a device key, or the sender's
 * drug-lock.ts GivenBy) at sim time `t`. Returns the channel as it now is.
 */
export function noteApplied(channels: Map<number, HostChannel>, e: Record<string, unknown>, meta: PumpMeta | undefined, by: string): HostChannel | undefined {
  const ch = e.ch as number;
  let c = channels.get(ch);
  if (e.action === 'load') {
    const k = e.contents as { drugId: string; concentration: Conc; volumeMl: number };
    c ??= { ch, kind: e.channel as ChannelKind, syringeMl: null, contents: null, programmed: null, set: null, rate: null, tci: null, running: false, by: {}, mismatch: null };
    c.kind = e.channel as ChannelKind;
    c.syringeMl = typeof e.syringeMl === 'number' ? e.syringeMl : null;
    c.contents = { drugId: k.drugId, concentration: k.concentration, label: meta?.label ?? k.concentration, volumeMl: k.volumeMl, origin: meta?.origin ?? null };
    c.running = false;
    c.by.load = by;
    channels.set(ch, c);
    return c;
  }
  if (!c) return undefined;
  switch (e.action) {
    case 'program':
      c.programmed = { drugId: e.drugId as string, concentration: e.concentration as Conc };
      c.set = c.kind === 'drip' ? (e.set as number) : null;
      c.by.programme = by;
      break;
    case 'rate':
      c.rate = { rate: e.rate as number, unit: e.unit as RateUnit, ...(typeof e.weightKg === 'number' ? { weightKg: e.weightKg } : {}) };
      c.tci = null; // a rate leaves TCI (engine pump.ts)
      c.by.rate = by;
      break;
    case 'tci':
      if (e.target === 0) {
        c.tci = null;
        c.rate = null;
        c.running = false;
      } else c.tci = { setId: e.setId as string, mode: e.mode as 'plasma' | 'effect', target: e.target as number, patient: { ...(e.patient as PumpPatient), ...(typeof e.opioids === 'boolean' ? { opioids: e.opioids } : {}) } };
      c.by.tci = by;
      break;
    case 'start':
      c.running = true;
      break;
    case 'stop':
      c.running = false;
      break;
    case 'unload':
      c.contents = null;
      c.syringeMl = null;
      c.running = false;
      break;
  }
  return c;
}

/** The channels on which `drugId` runs now (its contents are that drug and it is started), by channel number (D9). */
export function channelsRunning(channels: ReadonlyMap<number, HostChannel>, drugId: string): number[] {
  return [...channels.values()].filter((c) => c.running && c.contents?.drugId === drugId).map((c) => c.ch).sort((a, b) => a - b);
}

/** D9's refusal: "running on pumps 2 and 3: change it on the pump" (and the channel-less infusion beside them, if any). */
export function onPumpsWords(chs: readonly number[], channelLess: boolean): string {
  const pumps = `${chs.length === 1 ? 'pump' : 'pumps'} ${list(chs)}`;
  return `running on ${pumps}${channelLess ? ' and as an infusion' : ''}: change it on the pump`;
}

/**
 * D9: a remote's or the Drug sheet's rate for a drug that runs on exactly one channel (and no channel-less infusion),
 * as that channel's `pump rate` (or `pump stop` at 0), checked against its device.
 */
export function routedToChannel(c: HostChannel, rate: number, unit: RateUnit, x: PumpContext): PumpTranslated {
  const cmd: PumpCommand = rate === 0 ? { type: 'pump', ch: c.ch, action: 'stop' } : { type: 'pump', ch: c.ch, action: 'rate', rate, unit };
  return translatePump(cmd, x);
}

/** The command a translated pump action becomes (the instructor's own `applyEvent`, through command()). */
export function pumpWire(base: { id: string; issuedBy: string; by?: string; stageGroup?: string; batch?: { id: string; n: number } }, t: Extract<PumpTranslated, { ok: true }>): WireCommand {
  return { ...base, type: 'applyEvent', event: t.event, pump: t.meta } as unknown as WireCommand;
}
