// Stage 7d organ input adapter (plan decision 16, R51 addendum 14): everything the brain, kidney and liver read,
// from whichever stage provides it. Stage 7c's blood, 7g's drug bus, 7f's neuro outputs and 7e's sepsis are
// DUCK-TYPED (each with a neutral fallback), so this file compiles and runs whichever of them has merged.
import { l1Value, type L1State } from '../../l1/state.ts';
import { totalVolume } from '../circ/circuit.ts';
import type { CircModelState } from '../circ/model.ts';
import { cardiacOutput } from '../gas/coupling.ts';
import type { HemoState } from '../hemo/pipeline.ts';
import { staticCompliance } from '../lung/lung.ts';
import { meanAirwayPressure } from '../resp/driver.ts';
import { metabolic, type RespState } from '../resp/pipeline.ts';

export const HB_DEFAULT = 14; // Stage 3 HB_G_DL until 7c
export const ALBUMIN_DEFAULT = 42; // g/L (annex B2 oncotic reference)
export const PAW_REF_CMH2O = 10; // Stage 3: only mean Paw above 10 cmH2O acts (research 03 §8.7)
/** Anaesthetised by drugs (kidney stress S, GA fallback) [ENG]: propofol Ce ≥ 1.5 µg/mL, ≥ 0.5 MAC, ketamine ≥ 0.5 ×
 *  its reference dose, or a drug CMRO2 multiplier ≤ 0.85 (any other hypnotic). */
export const GA_PROP_CE = 1.5;
export const GA_MAC = 0.5;
export const GA_KETAMINE = 0.5;
export const GA_CMRO2 = 0.85;
/** α-agonist load as norepinephrine-equivalent µg/kg/min [ENG]: NE 1, epinephrine 1, phenylephrine 0.1 (≈ 1/10 potency). */
export const PE_NE_EQ = 0.1;
/** Splanchnic constriction 0–1 = NE-eq / 0.3 (tables `hbfFactor` ×0.6 "high-dose α-agonist") [ENG]. */
export const ALPHA_E_FULL = 0.3;
/** "Above need" [ENG]: none of the α-agonist is excess at MAP ≤ 75, all of it at MAP ≥ 90 (tables §5.2 D row). */
export const ALPHA_NEED_MAP = 75;
export const ALPHA_EXCESS_MAP = 90;

export interface OrganView {
  map: number; pp: number; cvp: number; coLpm: number;
  paco2: number; pao2: number; sao2: number; tempC: number;
  hb: number; albuminGL: number; bvRel: number;
  osm: number | null; // FU-9 F11: 7c's plasma effective osmolality, mOsm/kg (null without 7c)
  demandRel: number; // FU-9 H1: Stage 3's O2 demand ÷ rest (GA, temperature, fever) — the kidney's reference output
  hbfRel: number | null; // 7c's hepatic flow ÷ baseline (null without 7c: the liver computes its fallback)
  lactate: number | null; // 7c's lactate (null without 7c: the liver's fallback pool)
  gluconate: number; // 7c's plasma gluconate, mmol/L (0 until 7c exposes it)
  anaesthesia: 'none' | 'general' | 'neuraxial'; // Stage 3 `thermal`, raised to 'general' by drugs
  pawExcessCmH2O: number;
  drugs: DrugView;
  circ: boolean; blood: boolean;
}
/** 7g's accepted boluses the organs act on (R51 §3: 7d OBSERVES; addendum 14: HTS carries `concentrationPct`). */
export interface OrganDose { agent: string; amount: number; amountUnit: string; concentrationPct?: number; t: number }
export interface DrugView {
  present: boolean; // 7g's bus found
  cmro2Mult: number; // 7f `neuro.outputs.cmro2Mult`, else 7g `bus.cns.cmro2Mult`, else 1
  cbfVaso: number; // 7g `bus.cns.cbfVaso`, else 1
  volatileMac: number; // sevoflurane + isoflurane + desflurane MAC fractions (7g `bus.volatiles`; N2O excluded)
  hypnotic: boolean; // anaesthetised by drugs (GA_* thresholds)
  furoCe: number | undefined; // 7g furosemide level in reference doses (20 mg); undefined without 7g
  alphaNe: number; // α-agonist, NE-eq µg/kg/min
  sepsis: number; // 0–1 from 7e's sepsis stage (1 SIRS → 0, 2 sepsis → 0.5, ≥ 3 septic shock → 1)
  doses: OrganDose[]; // this pass's `bus.doses` (mannitol, hypertonic saline; the rest are ignored)
}
/** 7c's seam 7d fills (R51 addendum 14): the urine ABOVE the basal UOP0 (mL/h, G7d follow-through 2) and the renal
 *  excretion rates, mmol/h. */
export type RenalSeam = { uopAboveBasalMlH: number; excretion: { k: number; na: number; cl: number; gluconate: number } };
type BloodLike = {
  core?: { liver?: number; renal?: RenalSeam; so?: { set?: { k?: number } }; out?: { k?: number; na?: number } }; // FU-9 F6: K and its set point; R4: Na
  out?: { hb?: number; albuminGL?: number; bvRel?: number; hbfRel?: number; lactate?: number; gluconate?: number; osm?: number };
};

const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const obj = (v: unknown): Record<string, unknown> | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

/** Stage 7a's `circ.ext` (multipliers other stages write) when the circulation is present, else null. */
export function circExt(hs: HemoState): Record<string, number | undefined> | null {
  const c = obj((hs as unknown as { circ: unknown }).circ);
  return c ? (obj(c.ext) as Record<string, number | undefined> | null) : null;
}

function bloodOf(blood: unknown): BloodLike | null {
  const b = obj(blood);
  return b && ('core' in b || 'out' in b) ? (b as BloodLike) : null;
}

/** 7c's `out` once 7c has stepped, else undefined. §10 of the 7d gate: 7c creates `out` all zeros and fills it on its
 *  first step, but the engine rebaselines the organs at t = 0 before any blood step, so the kidney's TGF was settled on
 *  albumin 0 (RBF 380 mL/min at t = 0) and the brain on Hb 0. Hb 0 is not a patient: read the fallbacks until then. */
function bloodOut(b: BloodLike | null): BloodLike['out'] {
  const o = b?.out;
  return o && num(o.hb, 0) > 0 ? o : undefined;
}

/** 7c's `core` (where 7d writes `liver` and `renal`), or null. */
export function bloodCore(blood: unknown): BloodLike['core'] | null {
  return bloodOf(blood)?.core ?? null;
}

/** 7g's bus (`ps.pk.bus`), 7f's CMRO2 (`ps.neuro.outputs.cmro2Mult`) and 7e's sepsis (`ps.endo.core.cond.sepsis.cur`). */
export function readDrugView(src: { pk?: unknown; neuro?: unknown; endo?: unknown }): DrugView {
  const bus = obj(obj(src.pk)?.bus);
  const cns = obj(bus?.cns);
  const vol = obj(bus?.volatiles);
  const agents = obj(bus?.agents);
  const ce = (id: string): number => num(obj(agents?.[id])?.brain, 0);
  const mac = (id: string): number => num(obj(vol?.[id])?.macFrac, 0);
  const neuroCmro2 = obj(obj(src.neuro)?.outputs)?.cmro2Mult;
  const cmro2Mult = num(neuroCmro2, num(cns?.cmro2Mult, 1));
  const alphaNe = ce('norepinephrine') + ce('epinephrine') + PE_NE_EQ * ce('phenylephrine');
  const stage = num(obj(obj(obj(obj(src.endo)?.core)?.cond)?.sepsis)?.cur, 0);
  const doses: OrganDose[] = [];
  if (Array.isArray(bus?.doses)) {
    for (const d of bus.doses as unknown[]) {
      const x = obj(d);
      if (!x || typeof x.agent !== 'string' || typeof x.amount !== 'number' || typeof x.amountUnit !== 'string') continue;
      doses.push({ agent: x.agent, amount: x.amount, amountUnit: x.amountUnit, t: num(x.t, 0), ...(typeof x.concentrationPct === 'number' ? { concentrationPct: x.concentrationPct } : {}) });
    }
  }
  return {
    present: bus !== null,
    cmro2Mult,
    cbfVaso: num(cns?.cbfVaso, 1),
    volatileMac: mac('sevoflurane') + mac('isoflurane') + mac('desflurane'),
    hypnotic: num(cns?.propCe, 0) >= GA_PROP_CE || num(cns?.macBrain, 0) >= GA_MAC || num(cns?.ketamineCe, 0) >= GA_KETAMINE || cmro2Mult <= GA_CMRO2,
    furoCe: bus ? ce('furosemide') : undefined,
    alphaNe,
    sepsis: Math.min(1, Math.max(0, (stage - 1) / 2)),
    doses,
  };
}

/** The α-agonist that is "above need" (tables §5.2 D row: renal cost of over-pressing) [ENG]. */
export function alphaExcess(v: OrganView): number {
  return v.drugs.alphaNe * Math.min(1, Math.max(0, (v.map - ALPHA_NEED_MAP) / (ALPHA_EXCESS_MAP - ALPHA_NEED_MAP)));
}

export interface OrganSources { l1: L1State; hemo: HemoState; resp: RespState; blood?: unknown; pk?: unknown; neuro?: unknown; endo?: unknown }

export function readOrganView(ctx: OrganSources, t: number): OrganView {
  const hs = ctx.hemo;
  const rs = ctx.resp;
  const b = bloodOf(ctx.blood);
  const site = hs.lastSite;
  // without 7c: MODELED reads 7a's circulating volume (a 7a `bleed` or `fluid` changes it); MANUAL maps the instructor's
  // volumeStatus 1 → normovolaemic, 0 → −40 % (brief §4.9 "severe hypovolaemia") [ENG]
  const circ = ctx.l1.mode === 'modeled' ? (hs as unknown as { circ?: CircModelState }).circ : undefined;
  const bvFallback = circ
    ? totalVolume(circ.s, circ.p) / circ.prof.bloodVolumeMl
    : 0.6 + 0.4 * Math.min(1, Math.max(0, l1Value(ctx.l1, 'volumeStatus', t)));
  const paw = meanAirwayPressure(rs.driver, t, staticCompliance(rs.lung)); // Stage 7b: the lung module's compliance
  const drugs = readDrugView(ctx);
  const out = bloodOut(b);
  const hbf = out?.hbfRel;
  const lac = out?.lactate;
  return {
    map: (hs as unknown as { circ?: { mapNow?: number } }).circ?.mapNow ?? site.map, // FU-4 G4: the circulation's current MAP (no beat during an arrest)
    pp: Math.max(0, site.sbp - site.dbp),
    cvp: hs.pv,
    coLpm: cardiacOutput(hs, t),
    paco2: rs.co2.pf,
    pao2: rs.o2.pao2,
    sao2: rs.o2.sa,
    tempC: rs.temp.tc,
    hb: num(out?.hb, HB_DEFAULT),
    albuminGL: num(out?.albuminGL, ALBUMIN_DEFAULT),
    bvRel: num(out?.bvRel, bvFallback),
    osm: typeof out?.osm === 'number' && Number.isFinite(out.osm) && out.osm > 0 ? out.osm : null, // FU-9 F11
    demandRel: metabolic(rs, t, 'o2'), // FU-9 H1
    hbfRel: typeof hbf === 'number' && Number.isFinite(hbf) ? hbf : null,
    lactate: typeof lac === 'number' && Number.isFinite(lac) ? lac : null,
    gluconate: num(out?.gluconate, 0),
    anaesthesia: drugs.hypnotic && rs.temp.anaesthesia === 'none' ? 'general' : rs.temp.anaesthesia,
    pawExcessCmH2O: Math.max(0, paw - PAW_REF_CMH2O),
    drugs,
    circ: circExt(hs) !== null,
    blood: b !== null,
  };
}
