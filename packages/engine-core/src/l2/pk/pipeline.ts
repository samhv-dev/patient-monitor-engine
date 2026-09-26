// Stage 7g pipeline: plain-data drug state stepped at 10 Hz on the absolute grid, commands, clearance factors and
// the PD combination. Outputs: pk.fx (7a DrugEffect), pk.betaBlockAdd, pk.bus (DrugBus — per-agent Ce, volatiles,
// the dose log; R51 §2–3), pk.out (1 Hz `drugs`). 7g consumes EVERY library drug event (decision 10).
import type { Command, EngineEvent, PatientProfile } from '../../types.ts';
import { DRUG_BUS_NEUTRAL, type BusAgent, type BusVolatile, type DoseLogEntry, type DrugBus, type PkClinicalEvent } from '../../types-pk.ts';
import type { DrugEffect } from '../circ/drugs.ts';
import { combine, NEUTRAL_FX, type Active } from './combine.ts';
import { cp, pkStep, pkSystem, zeroState, type PkParams } from './compartment.ts';
import { DEFAULT_PK_PATIENT, type PkPatient } from './covariates.ts';
import { DRUGS } from './data/drugs.ts';
import { LAST_THRESHOLDS } from './data/rows-other.ts';
import { gammaConc, gammaN, type GammaDose } from './gamma.ts';
import { eleveldPropofol, geptsSufentanil, marshPropofol, mintoRemifentanil, schniderPropofol, shaferFentanyl } from './models.ts';
import { bindSugammadex, bindSugammadexSites, CISATRACURIUM, MW, PCHE_CL_MULT, perKg, ROCURONIUM, SUCCINYLCHOLINE, SUGAMMADEX, VECURONIUM } from './nmb.ts';
import { hill, tachy } from './pd.ts';
import type { DrugRow } from './row.ts';
import { tciRate, TCI_DT_S } from './tci.ts';
import { toAmount, toRate } from './units.ts';
import { createVolatile, macForAge, macFraction, stepVolatile, type VolatileAgent, type VolatileState } from './volatile.ts';

export const PK_DT_S = 0.1;
const TACHY_WINDOW_S = 3600;
/** "Never" / "long ago" as finite numbers: snapshots travel as JSON, which turns ±Infinity into null. */
export const NEVER = 1e12;

export interface DrugInst {
  id: string;
  model: string | null; // propofol TCI model choice
  x: number[]; // compartment state (pk/nmb rows); [] for gamma/volatile/blood rows
  factor: number; // clearance factor the params were built with (quantised)
  rate: number; // amount/min
  rateUntil: number; // s (NEVER = until changed)
  tci: { mode: 'plasma' | 'effect'; target: number; maxRate: number; next: number } | null;
  doses: GammaDose[];
  infC: number; // gamma infusion state, reference units
  infTarget: number;
  total: number; // amount given
  bound: number; // amount bound by sugammadex in plasma (rocuronium/vecuronium)
  bolusTimes: number[];
}

export interface PkState {
  t: number;
  patient: PkPatient;
  drugs: Record<string, DrugInst>;
  vap: { agent: VolatileAgent; s: VolatileState; n2o: VolatileState; dialPct: number; n2oFrac: number } | null;
  fx: DrugEffect;
  betaBlockAdd: number;
  bus: DrugBus;
  pending: DoseLogEntry[]; // boluses accepted since the last advancePk call (→ bus.doses, decision 10)
  lastC: Record<string, number>; // last PD concentration per drug (panel, tests, hooks)
  desSurgeT: number; // desflurane sympathetic surge start (−NEVER: none)
  macPrev: number[]; // desflurane MAC over the last 60 s at 1 Hz
  panelNext: number;
  out: EngineEvent[];
}

/** Context gathered by the engine each pass from the other modules (duck-typed; neutral when absent). */
export interface PkCtx {
  coLpm: number; vaLpm: number; frcL: number; tempC: number; ph: number;
  hepFlow: number; hepFn: number; renal: number; betaBlockC: number; vasoResp: number;
}
export const NEUTRAL_PK_CTX: PkCtx = { coLpm: 5, vaLpm: 4.2, frcL: 2.1, tempC: 37, ph: 7.4, hepFlow: 1, hepFn: 1, renal: 1, betaBlockC: 0, vasoResp: 1 };

export function pkPatientOf(p: PatientProfile | undefined): PkPatient {
  return {
    ageY: p?.ageY ?? DEFAULT_PK_PATIENT.ageY,
    weightKg: p?.weightKg ?? DEFAULT_PK_PATIENT.weightKg,
    heightCm: p?.heightCm ?? DEFAULT_PK_PATIENT.heightCm,
    sex: p?.sex === 'F' ? 'f' : 'm',
  };
}

export function createPkState(patient: PkPatient = DEFAULT_PK_PATIENT): PkState {
  return {
    t: 0, patient, drugs: {}, vap: null, fx: { ...NEUTRAL_FX }, betaBlockAdd: 0, bus: structuredClone(DRUG_BUS_NEUTRAL),
    pending: [], lastC: {}, desSurgeT: -NEVER, macPrev: [], panelNext: 1, out: [],
  };
}

/** The row's concentration unit — the unit of every BusAgent field and of the panel's Ce (R51 §2). */
export function concUnit(row: DrugRow): string {
  if (row.pk.kind === 'gamma') return '× ref dose';
  if (row.pk.kind === 'perKg' && row.pk.conc === 'rateEq') return 'µg/kg/min eq';
  return row.amountUnit === 'mg' ? 'µg/mL' : row.amountUnit === 'mcg' ? 'ng/mL' : `${row.amountUnit}/L`;
}

/** mg/kg of an amount in the row's unit; null for units/mmol/mL rows. */
function mgPerKgOf(row: DrugRow, amount: number, w: number): number | null {
  if (row.amountUnit === 'mg') return amount / w;
  if (row.amountUnit === 'mcg') return amount / 1000 / w;
  return null;
}

// --- parameters -------------------------------------------------------------------------------------------------

const NMB_PK = { rocuronium: ROCURONIUM, vecuronium: VECURONIUM, cisatracurium: CISATRACURIUM, succinylcholine: SUCCINYLCHOLINE, sugammadex: SUGAMMADEX } as const;

function modelParams(pk: PkState, m: string): PkParams {
  const p = pk.patient;
  if (m === 'schnider') return schniderPropofol(p);
  if (m === 'marsh') return marshPropofol(p);
  if (m === 'eleveld') {
    const opioids = Object.values(pk.drugs).some((d) => DRUGS[d.id]?.cls === 'opioid' && d.total > 0);
    return eleveldPropofol(p, { opioids });
  }
  if (m === 'minto') return mintoRemifentanil(p);
  if (m === 'shafer') return shaferFentanyl();
  return geptsSufentanil();
}

function baseParams(pk: PkState, row: DrugRow, inst: DrugInst): PkParams | null {
  const p = pk.patient;
  switch (row.pk.kind) {
    case 'model': {
      const b = modelParams(pk, inst.model ?? row.pk.model);
      // opioids: a SEPARATE ventilatory effect site after the model's own (R51 §2) → x[4]
      return row.pk.ventKe0 !== undefined ? { ...b, ke0: [...b.ke0, row.pk.ventKe0] } : b;
    }
    case 'perKg':
      return perKg(row.pk.pk, p.weightKg);
    case 'nmb': {
      const pche = row.pk.agent === 'succinylcholine' ? PCHE_CL_MULT[p.pche ?? 'normal'] : 1;
      return perKg(NMB_PK[row.pk.agent], p.weightKg, pche);
    }
    default:
      return null;
  }
}

/** Clearance factor from liver flow/function, kidney and temperature (decision 7), quantised to 1 % (cache hits). */
function clFactor(row: DrugRow, ctx: PkCtx): number {
  const h = row.elim?.hepatic ?? 0;
  const r = row.elim?.renal ?? 0;
  const organ = h * (row.elim?.highExtraction ? ctx.hepFlow : ctx.hepFn) + r * ctx.renal + Math.max(0, 1 - h - r);
  const temp = Math.max(0.5, 1 - 0.05 * Math.max(0, 37 - ctx.tempC)); // [ENG] ≈ −5 %/°C (M10 ch. 24 p. 698 direction)
  return Math.round(organ * temp * 100) / 100;
}

function params(pk: PkState, row: DrugRow, inst: DrugInst): PkParams | null {
  const b = baseParams(pk, row, inst);
  return b ? { ...b, k10: b.k10 * inst.factor } : null;
}

// --- commands ---------------------------------------------------------------------------------------------------

const PK_KINDS = ['drug', 'infusion', 'tci', 'vaporiser'];

function inst(pk: PkState, id: string): DrugInst {
  let d = pk.drugs[id];
  if (!d) {
    const row = DRUGS[id] as DrugRow;
    const probe: DrugInst = { id, model: null, x: [], factor: 1, rate: 0, rateUntil: NEVER, tci: null, doses: [], infC: 0, infTarget: 0, total: 0, bound: 0, bolusTimes: [] };
    const p = baseParams(pk, row, probe);
    probe.x = p ? zeroState(p) : [];
    d = probe;
    pk.drugs[id] = d;
  }
  return d;
}

export function validatePkCommand(cmd: Command, _pk: PkState): string | undefined | null {
  if (cmd.type !== 'applyEvent') return null;
  const ev = cmd.event as { kind: string };
  if (!PK_KINDS.includes(ev.kind)) return null;
  if (ev.kind === 'vaporiser') {
    const v = ev as Extract<PkClinicalEvent, { kind: 'vaporiser' }>;
    if (!['sevoflurane', 'isoflurane', 'desflurane'].includes(v.agent)) return 'agent must be sevoflurane, isoflurane or desflurane';
    if (!(v.dialPct >= 0 && v.dialPct <= 18)) return 'dialPct must be 0–18';
    if (v.fgfLpm !== undefined && !(v.fgfLpm >= 0.2 && v.fgfLpm <= 15)) return 'fgfLpm must be 0.2–15';
    if (v.n2oFrac !== undefined && !(v.n2oFrac >= 0 && v.n2oFrac <= 0.75)) return 'n2oFrac must be 0–0.75';
    return undefined;
  }
  const e = ev as unknown as { drugId: string };
  const row = DRUGS[e.drugId];
  if (!row) return `unknown drug ${e.drugId}`;
  const w = 70;
  if (ev.kind === 'tci') {
    const c = ev as Extract<PkClinicalEvent, { kind: 'tci' }>;
    if (row.pk.kind !== 'model') return `${row.id} has no TCI model`;
    if (c.model !== undefined && !['eleveld', 'schnider', 'marsh', 'minto', 'shafer', 'gepts'].includes(c.model)) return `unknown TCI model ${c.model}`;
    return c.target >= 0 && c.target <= 100 && (c.mode === 'plasma' || c.mode === 'effect') ? undefined : 'target must be 0–100 with mode plasma or effect';
  }
  const bloodBolusOnly = `${row.id} is given as a bolus in v1; 7c owns its kinetics`;
  if (ev.kind === 'infusion') {
    if (row.pk.kind === 'blood') return bloodBolusOnly;
    const c = ev as Extract<PkClinicalEvent, { kind: 'infusion' }>;
    if (!(c.rate >= 0 && Number.isFinite(c.rate))) return 'rate must be ≥ 0';
    const perMl = c.concentration ? toAmount(c.concentration.amount, c.concentration.unit, row.amountUnit, w) : row.syringePerMl;
    const r = toRate(c.rate, c.unit, row.amountUnit, w, typeof perMl === 'number' ? perMl / (c.concentration?.perMl ?? 1) : undefined);
    return typeof r === 'string' ? r : undefined;
  }
  const d = ev as Extract<PkClinicalEvent, { kind: 'drug' }>;
  if (!(Number.isFinite(d.dose) && d.dose >= 0)) return 'dose must be ≥ 0';
  const isRate = d.unit.includes('/min') || d.unit.includes('/h');
  if (row.pk.kind === 'blood' && (isRate || d.infusion)) return bloodBolusOnly;
  if (!isRate && d.dose === 0) return 'dose must be > 0';
  const r = isRate ? toRate(d.dose, d.unit as never, row.amountUnit, w, row.syringePerMl) : toAmount(d.dose, d.unit, row.amountUnit, w, row.syringePerMl);
  return typeof r === 'string' ? r : undefined;
}

/** Apply a validated command. True for every drug/infusion/tci/vaporiser command (7g consumes them all, R51 §3). */
export function applyPkCommand(pk: PkState, cmd: Command, t: number): boolean {
  if (cmd.type !== 'applyEvent') return false;
  const ev = cmd.event as PkClinicalEvent;
  if (!PK_KINDS.includes(ev.kind)) return false;
  if (ev.kind === 'vaporiser') {
    pk.vap ??= { agent: ev.agent, s: createVolatile(ev.agent), n2o: createVolatile('n2o'), dialPct: 0, n2oFrac: 0 };
    if (pk.vap.agent !== ev.agent) pk.vap = { ...pk.vap, agent: ev.agent, s: createVolatile(ev.agent) }; // agent change: a new vaporiser; the old agent's residual is dropped in v1 (gate note)
    pk.vap.dialPct = ev.dialPct;
    pk.vap.n2oFrac = ev.n2oFrac ?? pk.vap.n2oFrac;
    pk.vap.s.fd = ev.dialPct / 100;
    pk.vap.n2o.fd = pk.vap.n2oFrac;
    pk.vap.s.fgf = pk.vap.n2o.fgf = ev.fgfLpm ?? pk.vap.s.fgf;
    return true;
  }
  const row = DRUGS[ev.drugId] as DrugRow;
  const d = inst(pk, row.id);
  const w = pk.patient.weightKg;
  const logDose = (amount: number) => pk.pending.push({ agent: row.id, mgPerKg: mgPerKgOf(row, amount, w), amount, amountUnit: row.amountUnit, t });
  if (row.pk.kind === 'blood') {
    // 7c's chemistry (decision 10): validated as a bolus; 7g records and logs it, 7c's mass balance acts on bus.doses
    const e = ev as Extract<PkClinicalEvent, { kind: 'drug' }>;
    const amt = toAmount(e.dose, e.unit, row.amountUnit, w, row.syringePerMl) as number;
    d.total += amt;
    logDose(amt);
    return true;
  }
  const refScale = row.pk.kind === 'gamma' ? row.pk.refDose * (row.pk.perKg ? w : 1) : 1;
  const setRate = (amountPerMin: number) => {
    if (row.pk.kind === 'gamma') d.infTarget = row.pk.refRate ? amountPerMin / (row.pk.refRate * (row.pk.perKg ? w : 1)) : 0;
    else d.rate = amountPerMin;
    d.rateUntil = NEVER;
  };
  if (ev.kind === 'tci') {
    d.tci = ev.target > 0 ? { mode: ev.mode, target: ev.target, maxRate: ((ev.maxRateMlH ?? 1200) * (row.syringePerMl ?? 10)) / 60, next: t } : null;
    if (ev.model) d.model = ev.model;
    if (!d.tci) d.rate = 0;
  } else if (ev.kind === 'infusion') {
    const perMl = ev.concentration ? (toAmount(ev.concentration.amount, ev.concentration.unit, row.amountUnit, w) as number) / ev.concentration.perMl : row.syringePerMl;
    d.tci = null;
    setRate(toRate(ev.rate, ev.unit, row.amountUnit, w, perMl) as number);
  } else {
    const isRate = ev.unit.includes('/min') || ev.unit.includes('/h');
    if (isRate || ev.infusion) {
      d.tci = null;
      setRate(toRate(ev.dose, ev.unit as never, row.amountUnit, w, row.syringePerMl) as number);
    } else {
      const amt = toAmount(ev.dose, ev.unit, row.amountUnit, w, row.syringePerMl) as number;
      logDose(amt);
      if (ev.overS && ev.overS > 0 && row.pk.kind !== 'gamma') {
        d.rate = (amt / ev.overS) * 60; // `total` accrues as the rate runs (stepOnce)
        d.rateUntil = t + ev.overS;
      } else if (row.pk.kind === 'gamma') {
        d.total += amt;
        const recent = d.bolusTimes.filter((b) => t - b < TACHY_WINDOW_S).length;
        d.doses.push({ t, scale: (amt / refScale) * (row.tachyphylaxis ? tachy(recent, row.tachyphylaxis) : 1) });
        d.bolusTimes.push(t);
      } else {
        d.total += amt;
        d.x[0] = (d.x[0] as number) + amt;
      }
    }
  }
  return true;
}

// --- step -------------------------------------------------------------------------------------------------------

export function concOf(pk: PkState, id: string): number {
  return pk.lastC[id] ?? 0;
}

/** PD concentration (brain/effect site), plasma and the extra sites, all in concUnit(row). */
function siteConc(pk: PkState, row: DrugRow, d: DrugInst, p: PkParams | null, t: number): { c: number; plasma: number; vent?: number; nmj?: number; dia?: number } {
  switch (row.pk.kind) {
    case 'model':
      return { c: d.x[3] as number, plasma: p ? cp(p, d.x) : 0, ...(row.pk.ventKe0 !== undefined ? { vent: d.x[4] as number } : {}) };
    case 'perKg': {
      // rateEq: Ce·CL/W (decision 4), plasma in the same unit
      const k = row.pk.conc === 'rateEq' && p ? (p.k10 * p.v1) / pk.patient.weightKg : 1;
      return { c: (d.x[3] as number) * k, plasma: p ? cp(p, d.x) * k : 0 };
    }
    case 'nmb':
      return { c: d.x[3] as number, plasma: p ? cp(p, d.x) : 0, nmj: d.x[3] as number, dia: d.x[4] as number };
    case 'gamma': {
      const c = gammaConc(d.doses, t, row.pk.tpS, gammaN(row.pk.tpS, row.pk.t10S)) + d.infC;
      return { c, plasma: c };
    }
    default:
      return { c: 0, plasma: 0 };
  }
}

function stepOnce(pk: PkState, ctx: PkCtx, t: number): void {
  const actives: Active[] = [];
  let lipid = 0;
  for (const d of Object.values(pk.drugs)) {
    const row = DRUGS[d.id] as DrugRow;
    if (row.pk.kind === 'gamma') {
      const tau = (d.infTarget > d.infC ? row.pk.tauOnS : row.pk.tauOffS) ?? 300;
      d.infC += (d.infTarget - d.infC) * (1 - Math.exp(-PK_DT_S / tau));
      const tpS = row.pk.tpS;
      const n = gammaN(tpS, row.pk.t10S);
      d.doses = d.doses.filter((x) => t - x.t < tpS * (4 + 12 / Math.sqrt(n))); // pruned when < 1e-4 of peak [ENG bound]
    } else if (d.x.length) {
      const f = clFactor(row, ctx);
      if (f !== d.factor) d.factor = f;
      const p = params(pk, row, d) as PkParams;
      if (d.tci && t >= d.tci.next - 1e-9) {
        d.rate = tciRate(p, d.x, d.tci.mode, d.tci.target, d.tci.maxRate);
        d.tci.next = t + TCI_DT_S;
      }
      if (t > d.rateUntil) {
        d.rate = 0;
        d.rateUntil = NEVER;
      }
      d.x = pkStep(pkSystem(p, PK_DT_S), d.x, d.rate);
      d.total += (d.rate * PK_DT_S) / 60;
    }
  }
  // sugammadex: instant 1:1 molar binding in plasma AND at both effect sites (R51 §5; decision 6; Task 5, D7)
  const sgx = pk.drugs.sugammadex;
  if (sgx && sgx.x.length) {
    for (const nmb of ['rocuronium', 'vecuronium'] as const) {
      const d = pk.drugs[nmb];
      if (!d) continue;
      d.bound += bindSugammadex(d.x, sgx.x, MW[nmb]).boundUmol * MW[nmb];
      bindSugammadexSites(d.x, sgx.x, MW[nmb]);
    }
  }
  // volatiles (R51 §2 / addendum 9: every inhaled agent incl. N2O on the bus)
  let macBrain = 0;
  const volatiles: DrugBus['volatiles'] = {};
  if (pk.vap) {
    const env = { vaLpm: ctx.vaLpm, coLpm: ctx.coLpm, frcL: ctx.frcL, weightKg: pk.patient.weightKg };
    stepVolatile(pk.vap.s, env, PK_DT_S);
    stepVolatile(pk.vap.n2o, env, PK_DT_S);
    for (const s of [pk.vap.s, pk.vap.n2o]) {
      const v: BusVolatile = { fet: 100 * s.fa, brain: 100 * s.vrg, macAge: macForAge(s.agent, pk.patient.ageY), macFrac: macFraction(s, pk.patient.ageY) };
      volatiles[s.agent] = v;
      macBrain += v.macFrac;
      actives.push({ row: DRUGS[s.agent] as DrugRow, c: v.macFrac });
      pk.lastC[s.agent] = v.macFrac;
    }
  }
  // concentrations → actives and per-agent bus entries (LAST: free-fraction factor; lipid sink)
  const lip = pk.drugs.lipidEmulsion;
  if (lip) lipid = hill(siteConc(pk, DRUGS.lipidEmulsion as DrugRow, lip, null, t).c, 1, 0.5);
  const freeF = (1 + 2 * Math.max(0, 7.4 - ctx.ph)) * (1 - lipid);
  let cnsE = 0;
  let cvE = 0;
  let seizure = false;
  const agents: Record<string, BusAgent> = {};
  for (const d of Object.values(pk.drugs)) {
    const row = DRUGS[d.id] as DrugRow;
    const p = d.x.length ? params(pk, row, d) : null;
    const sc = siteConc(pk, row, d, p, t);
    let c = sc.c;
    if (row.cls === 'localAnaesthetic') {
      c *= freeF;
      const th = LAST_THRESHOLDS[row.id];
      if (th) {
        cnsE = Math.max(cnsE, hill(c, th.cns, 1, 3));
        cvE = Math.max(cvE, hill(c, th.cv, 1, 3));
        seizure ||= c >= th.seizure;
      }
    }
    pk.lastC[d.id] = c;
    actives.push({ row, c });
    agents[d.id] = {
      unit: concUnit(row), plasma: sc.plasma, brain: c,
      ...(sc.vent !== undefined ? { vent: sc.vent } : {}),
      ...(sc.nmj !== undefined ? { nmj: sc.nmj, dia: sc.dia ?? sc.nmj } : {}),
      cumulativeMgPerKg: mgPerKgOf(row, d.total, pk.patient.weightKg) ?? 0,
      ...(row.id === 'rocuronium' || row.id === 'vecuronium' ? { sgxBoundFrac: d.total > 0 ? Math.min(1, d.bound / d.total) : 0 } : {}),
    };
  }
  const r = combine(actives, { ph: ctx.ph, betaBlockC: ctx.betaBlockC, vasoResp: ctx.vasoResp, ageY: pk.patient.ageY, macBrain });
  // desflurane sympathetic surge on a rapid rise above 1 MAC (T6.3): HR +25 %, SVR +20 % over 2–4 min [TXT]
  if (pk.vap?.agent === 'desflurane' && Math.abs(t - Math.round(t)) < PK_DT_S / 2) {
    pk.macPrev.push(macBrain);
    if (pk.macPrev.length > 60) pk.macPrev.shift();
    if (macBrain > 1 && macBrain - (pk.macPrev[0] as number) > 0.3 && t - pk.desSurgeT > 600) pk.desSurgeT = t;
  }
  const surge = t - pk.desSurgeT < 240 ? Math.sin((Math.PI * (t - pk.desSurgeT)) / 240) : 0;
  r.fx.hr *= 1 + 0.25 * surge;
  r.fx.svr *= 1 + 0.2 * surge;
  pk.fx = r.fx;
  pk.betaBlockAdd = r.betaBlockAdd;
  r.bus.agents = agents;
  r.bus.volatiles = volatiles;
  r.bus.doses = pk.bus.doses; // this pass's dose log survives every 0.1 s step (advancePk sets it)
  r.bus.last = { cnsE, cvE };
  r.bus.cns.seizure = seizure;
  pk.bus = r.bus;
}

/**
 * Step to tEnd on the absolute grid t_k = k·PK_DT_S. First, the boluses accepted since the previous call become
 * `bus.doses` (and the previous pass's list is dropped): the engine calls this once per advance pass, before every
 * consumer, so each dose is observed exactly once (decision 10, R51 §3).
 */
export function advancePk(pk: PkState, ctx: PkCtx, tEnd: number): void {
  pk.bus.doses = pk.pending;
  pk.pending = [];
  while (pk.t + PK_DT_S <= tEnd + 1e-9) {
    const t = Math.round((pk.t + PK_DT_S) * 10) / 10;
    stepOnce(pk, ctx, t);
    pk.t = t;
  }
}
