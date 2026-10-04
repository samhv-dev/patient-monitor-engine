// Stage 7e adapters: read the other modules' truths (duck-typed, each with a neutral fallback) and write the
// endocrine/thermal effects back through the seams the other stages own (R51 addendum 16 names).
//   in:  MAP (7a circ beats → the L1 truth), SaO2/PaCO2/core (Stage 3), antinociception/NMB/depth (7f `neuro`; its
//        antinociception only while 7g has an active agent, else the GA-flag fallback), the profile β-blockade
//        (7a `prof.betaBlock/betaBlockC`), 7g's bus (epinephrine Ce, bronchodilation, dantrolene effect, doses,
//        insulin/dextrose infusion rates), 7c's DKA severity, 7d's liver glucose factor.
//   out: MODELED — 7a `circ.ext.endo*` (MANUAL — neutral keys and an HR factor for the rhythm clock); 7c
//        `blood.core.{endoKShift, endoGlucoseMgDl}` and `blood.core.fl.kfMult`; `ps.cond.vasoResp` (7g); 7b's
//        `lungCondition anaphylaxis`; ECG modifier deltas (tempC → Osborn, shivering artefact).
import { l1Value, type L1State } from '../../l1/state.ts';
import type { Modifiers } from '../../types.ts';
import { leakSigma } from '../blood/fluids.ts'; // FU-9 F4
import { betaBlunt } from '../pk/pd.ts';
import { applyLungSpecs, type RespState } from '../resp/pipeline.ts';
import { cascade } from '../thermal/metabolic.ts';
import { mhActivity } from '../thermal/mh.ts';
import type { ThermalState } from '../thermal/heat.ts';
import type { EndoInputs } from './core.ts';
import { dextroseBolus, dextroseInfusion, insulinBolus, insulinInfusion } from './glucose.ts';
import { ANTINOC_GA_FALLBACK, EPI_EXO_PG_PER_RATE_EQ, ETOM_SUPPR_REF_MG_KG, INSDEX_DEXTROSE_G_PER_UNIT } from './params.ts';
import type { EndoCtx, EndoState } from './pipeline.ts';

type Neuro = { antinoc?: number; nmb?: number; thermoDepth?: number };
type DoseLike = { agent: string; amount: number; amountUnit: string };
type Bus = {
  agents?: Record<string, { brain?: number } | undefined>;
  volatiles?: Record<string, { macFrac?: number } | undefined>;
  doses?: DoseLike[];
  airway?: { bronchodilation?: number };
  metabolic?: { dantroleneE?: number };
};
/** Stage 7g's PkState as 7e reads it (R51 §1–3). */
export type PkLike = { bus?: Bus; betaBlockAdd?: number; drugs?: Record<string, { rate?: number } | undefined> };
type Circ = {
  beats?: { map: number }[];
  ext?: Record<string, unknown>;
  prof?: { betaBlock?: number; betaBlockC?: number; bloodVolumeMl?: number };
  base?: { v0Sv?: number };
};
type BloodLike = {
  out?: { dkaSeverity?: number };
  core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number; sigma?: number };
    endoKShift?: number; endoGlucoseMgDl?: number; endoKetoMmolMin?: number; endoKetoUtilPerMin?: number };
};

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export const pkOf = (ps: object): PkLike | undefined => (ps as { pk?: PkLike }).pk;
export const circOf = (ctx: { hemo: object }): Circ | undefined => (ctx.hemo as { circ?: Circ }).circ;
const bloodOf = (ps: object): BloodLike | undefined => (ps as { blood?: BloodLike }).blood;

/** 7g has an agent acting now (any effect-site concentration or volatile MAC fraction > 0). */
export function pkActive(pk: PkLike | undefined): boolean {
  const b = pk?.bus;
  if (!b) return false;
  for (const a of Object.values(b.agents ?? {})) if ((a?.brain ?? 0) > 0) return true;
  for (const v of Object.values(b.volatiles ?? {})) if ((v?.macFrac ?? 0) > 0) return true;
  return false;
}

function mapOf(ctx: EndoCtx, t: number): number {
  const c = circOf(ctx) as { beats?: { map: number }[]; mapNow?: number } | undefined;
  if (c && typeof c.mapNow === 'number') return c.mapNow; // FU-4 G4: the current MAP, beats or none
  const beats = c?.beats;
  const last = beats && beats.length ? beats[beats.length - 1] : undefined;
  if (last) return last.map;
  return (l1Value(ctx.l1, 'sbp', t) + 2 * l1Value(ctx.l1, 'dbp', t)) / 3;
}

/** 7c's DKA severity: `blood.out.dkaSeverity` (R51 addendum 16); fallback: 7c's ketoacid pool ÷ 25 mmol/L (its DKA at 1). */
function dkaOf(blood: BloodLike | undefined): number {
  const s = blood?.out?.dkaSeverity;
  if (num(s)) return s;
  const keto = blood?.core?.so?.keto;
  const fl = blood?.core?.fl;
  if (!num(keto) || !fl || !num(fl.vp) || !num(fl.visf)) return 0;
  return Math.min(1, Math.max(0, keto / ((fl.vp + fl.visf) / 1000) / 25));
}

export function readEndoInputs(ctx: EndoCtx, es: EndoState, t: number): EndoInputs {
  const th = ctx.resp.temp;
  const n = (ctx.ps as { neuro?: Neuro }).neuro;
  const pk = pkOf(ctx.ps);
  th.depthIn = num(n?.thermoDepth) ? n.thermoDepth : null;
  th.nmb = num(n?.nmb) ? n.nmb : 0;
  const flag = th.anaesthesia === 'general' ? ANTINOC_GA_FALLBACK * Math.min(1, th.depth) : 0;
  const antinoc = num(n?.antinoc) && pkActive(pk) ? n.antinoc : flag;
  const prof = circOf(ctx)?.prof;
  return {
    noxious: es.noxious, antinoc, mapMmHg: mapOf(ctx, t), mapSetMmHg: ctx.hemo?.circ?.baro?.set ?? 85, sao2: ctx.resp.o2.sa, paco2: ctx.resp.co2.pf, tempC: th.tc,
    mhActivity: mhActivity(th.mh, t),
    liverF: (ctx.ps as { organs?: { liver?: { glucoseF?: number } } }).organs?.liver?.glucoseF ?? 1,
    weightKg: es.weightKg, betaBlock: prof?.betaBlock ?? 0, betaBlockC: prof?.betaBlockC ?? 0,
    epiExoPgMl: (pk?.bus?.agents?.epinephrine?.brain ?? 0) * EPI_EXO_PG_PER_RATE_EQ,
    bronchoDilExt: pk?.bus?.airway?.bronchodilation ?? 0,
    dkaSeverity: dkaOf(bloodOf(ctx.ps)),
  };
}

/**
 * 7g's accepted boluses (`bus.doses`, each listed for exactly one engine pass, R51 §3) → the glucose model: dextrose
 * (7g amount unit mg) and insulin (units). Called once per engine pass. `bus.metabolic.glucoseDelta` is NOT used (7e
 * owns glucose). FU-10 E8: 7c's `insulinDextrose` row (the hyperkalaemia treatment; its K⁺ curve stays 7c's) is the same
 * insulin and dextrose to the glucose model — 10 units with 25 g, i.e. INSDEX_DEXTROSE_G_PER_UNIT per unit given.
 */
export function observeDoses(es: EndoState, pk: PkLike | undefined): void {
  for (const d of pk?.bus?.doses ?? []) {
    if (d.agent === 'dextrose') dextroseBolus(es.core.glucose, d.amountUnit === 'mg' ? d.amount / 1000 : d.amount, es.weightKg);
    else if (d.agent === 'insulin' && d.amountUnit === 'units') insulinBolus(es.core.glucose, d.amount, es.weightKg);
    else if (d.agent === 'etomidate') { // FU-10 E10: 11β-hydroxylase suppression for hours after one induction dose
      const perKg = d.amountUnit === 'mg/kg' ? d.amount : d.amountUnit === 'mg' ? d.amount / es.weightKg : 0;
      if (perKg > 0) es.core.etomSuppr = Math.min(1, (es.core.etomSuppr ?? 0) + perKg / ETOM_SUPPR_REF_MG_KG);
    } else if (d.agent === 'insulinDextrose' && d.amountUnit === 'units') { // FU-10 E8
      insulinBolus(es.core.glucose, d.amount, es.weightKg);
      dextroseBolus(es.core.glucose, d.amount * INSDEX_DEXTROSE_G_PER_UNIT, es.weightKg);
    }
  }
}

/** 7g's running infusions (`ps.pk.drugs.<id>.rate`, amount/min in the row's unit: dextrose mg, insulin units). */
export function readInfusions(es: EndoState, pk: PkLike | undefined): void {
  dextroseInfusion(es.core.glucose, ((pk?.drugs?.dextrose?.rate ?? 0) * 60) / 1000);
  insulinInfusion(es.core.glucose, (pk?.drugs?.insulin?.rate ?? 0) * 60);
}

/**
 * The endoHrF 7a must receive so that its `betaBlunt(endoHrF, b)` equals `target` (fever unblunted, R51 addendum 16).
 * betaBlunt keeps factors ≤ 1 and scales the excess above 1 by (1 − b); this is its inverse.
 */
export function preBlunt(target: number, b: number): number {
  const k = 1 - Math.min(1, Math.max(0, b));
  return target > 1 && k > 1e-6 ? 1 + (target - 1) / k : target;
}

/**
 * HR factor = the β-mediated part blunted by 7g's drug β-blockade × the temperature term (not a β effect, R51
 * addendum 16). MODELED: the stress/thyroid part and the whole fever term — a condition's reflex tachycardia emerges
 * from 7a's baroreflex, so its HR row is not applied. MANUAL (no reflex): the conditions' HR rows (the tables'
 * composite) and the fever above their set-point shift.
 */
export function endoHr(es: EndoState, betaBlockAdd: number, modeled: boolean): number {
  const o = es.core.out;
  return modeled ? betaBlunt(o.hrF, betaBlockAdd) * o.feverHrF : betaBlunt(o.hrF * o.condHrF, betaBlockAdd) * o.feverHrFExcess;
}

/**
 * The circulation seam (R51 addendum 16, F2/F3). MODELED with 7a's circuit: the four `ext.endo*` keys (7a multiplies
 * them in control(); 7g's `betaBlunt` blunts HR/Ees there), and 7a's V0 sign: `endoDV0Frac` is a fraction of the base
 * unstressed volume, POSITIVE = venoconstriction, so 7e's venodilation (+ fraction of blood volume) maps to
 * −dV0Frac·BV/base.v0Sv. Returns 1 (the rhythm clock keeps its rate: 7a drives it). MANUAL: the keys are held
 * neutral (the instructor owns the pressures; 7a's MANUAL tracker would fight them) and the return value is the HR
 * factor for the rhythm clock (1 when the instructor pinned `hr`).
 */
export function writeCirc(ctx: EndoCtx, es: EndoState): number {
  const circ = circOf(ctx);
  const ext = circ?.ext;
  const pk = pkOf(ctx.ps);
  const bba = pk?.betaBlockAdd ?? 0;
  const o = es.core.out;
  if (ctx.l1.mode === 'modeled' && ext) {
    ext.endoHrF = preBlunt(endoHr(es, bba, true), bba);
    ext.endoSvrF = o.svrF;
    ext.endoEesF = o.eesF;
    const bv = circ?.prof?.bloodVolumeMl ?? 0;
    const v0 = circ?.base?.v0Sv ?? 0;
    ext.endoDV0Frac = v0 > 0 ? (-o.dV0Frac * bv) / v0 : 0;
    ext.endoHumDV0Frac = o.humDV0Frac; // FU-4 F2(a): fraction of BLOOD VOLUME, into 7a's shared reservoir
    ext.endoHumSvrF = o.humSvrF; // FU-4 G-FU4-1: the humoral share of endoSvrF (7a withdraws its effect under ischaemia)
    return 1;
  }
  if (ext && ext.endoHrF !== undefined) {
    ext.endoHrF = 1;
    ext.endoSvrF = 1;
    ext.endoEesF = 1;
    ext.endoDV0Frac = 0;
    ext.endoHumDV0Frac = 0;
    ext.endoHumSvrF = 1;
  }
  return ctx.l1.pinned.includes('hr') ? 1 : endoHr(es, bba, false);
}

/**
 * 7c seams: the ENDOGENOUS K set-point term (`blood.core.endoKShift`, E-7e-3), the glucose for the lab panel
 * (`blood.core.endoGlucoseMgDl`, E-7e-2) and the capillary leak (`blood.core.fl.kfMult`, R51 addendum 16; written
 * only when 7e's value changes, so a resting 7e never overwrites another writer) and, with it, the protein reflection
 * coefficient `fl.sigma` = 7c's `leakSigma(kfMult)` (FU-9 F4: a leak without a high pulmonary venous pressure now makes
 * lung water). False without 7c.
 */
export function writeBlood(ps: object, es: EndoState): boolean {
  const c = bloodOf(ps)?.core;
  if (!c) return false;
  const o = es.core.out;
  c.endoKShift = o.kShift;
  c.endoGlucoseMgDl = o.glucoseMgDl;
  c.endoKetoMmolMin = o.ketoMmolMin; // FU-10 E7: ketogenesis from the insulin deficit — 7c integrates it into its pool
  c.endoKetoUtilPerMin = o.ketoUtilPerMin; // FU-10 E7 (R-2): insulin-dependent utilisation of that pool
  if (c.fl && o.kfMult !== es.kfMult) {
    c.fl.kfMult = o.kfMult;
    c.fl.sigma = leakSigma(o.kfMult); // FU-9 F4: the same leak lowers the protein reflection coefficient (lung water, Starling)
    es.kfMult = o.kfMult;
  }
  return true;
}

/** 7g reads vasopressor responsiveness at `ps.cond.vasoResp` (R51 addendum 16), mirroring `endo.core.out.vasoResp`. */
export function writeCond(ps: object, es: EndoState): void {
  const p = ps as { cond?: { vasoResp: number } };
  if (p.cond) p.cond.vasoResp = es.core.out.vasoResp;
  else p.cond = { vasoResp: es.core.out.vasoResp };
}

/**
 * Anaphylaxis bronchospasm → 7b's `lungCondition anaphylaxis` (its grades I–V = severity 0.2–1; 7e's grade = 4 ×
 * mediator, relieved by β2 bronchodilation). Re-resolved only when the severity moves by ≥ 0.02 (7b's resolve is
 * not a per-tick operation). The capillary leak reaches the lungs through 7c's lung-water seam (kfMult).
 */
export function writeLung(rs: RespState, es: EndoState): void {
  const sev = Math.round(es.core.out.anaphLung * 100) / 100;
  if (Math.abs(sev - es.lungSev) < 0.02 && !(sev === 0 && es.lungSev > 0)) return;
  es.lungSev = sev;
  const rest = rs.lungSpecs.filter((s) => !(s.id === 'anaphylaxis' && s.side === undefined));
  rs.lungSpecs = sev > 0 ? [...rest, { id: 'anaphylaxis', severity: sev }] : rest;
  applyLungSpecs(rs);
}

/**
 * ECG modifier DELTAS (7c decision 9 pattern): tempC follows the core (Osborn waves below 33 °C, already in the ECG
 * generator) and the shivering artefact the shivering level. K is 7c's (its own deltas).
 */
export function ecgDeltas(es: EndoState, th: ThermalState, mods: Modifiers): Modifiers {
  const c = cascade(th);
  const d = { tempC: th.tc - 36.8 - es.ecg.tempC, shiver: c.shiverLevel - es.ecg.shiver };
  if (Math.abs(d.tempC) < 0.01 && Math.abs(d.shiver) < 0.01) return mods;
  es.ecg = { tempC: es.ecg.tempC + d.tempC, shiver: es.ecg.shiver + d.shiver };
  return {
    ...mods,
    tempC: Math.min(43, Math.max(20, mods.tempC + d.tempC)),
    artefact: { ...mods.artefact, shiver: Math.min(1, Math.max(0, mods.artefact.shiver + d.shiver)) },
  };
}

export type { L1State };
