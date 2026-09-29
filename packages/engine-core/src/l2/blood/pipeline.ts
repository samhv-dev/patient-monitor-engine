// Stage 7c pipeline: the engine-facing half of the blood. advanceBlood() runs right after Stage 3's advanceResp on the
// same 10 Hz grid (after Stage 7g's advancePk), OBSERVES 7g's accepted doses (`ps.pk.bus.doses`, R51 §3), steps
// core.ts, publishes the BloodView Stage 3's gas step reads and the `out` block other stages read, emits `labs`
// (1 Hz) and delayed `labResult`, moves blood-volume changes into Stage 7a's circuit, writes the lung-water key for
// 7b, applies cold units to the heat model, and exposes the ECG deltas the engine pushes into Modifiers.
import type { L1State } from '../../l1/state.ts';
import type { BloodClinicalEvent, BloodDrugId } from '../../types-blood.ts';
import type { Command, EngineEvent, PatientProfile } from '../../types.ts';
import { CI_LPM_PER_KG, CO_REF_LPM, gasPatient } from '../gas/params.ts';
import { applyLungSpecs, metabolic, type BloodView, type RespState } from '../resp/pipeline.ts';
import { applyL1Fallback, chemistryContractility, circOf, lungWaterStep, pulmCapPressure, pushCircVolume, setCircChemistry, setCircViscosity, volumeCoFactor } from './circ-adapter.ts';
import { createBloodCore, DKA_KETO_MMOL_L, stepBloodCore, type BloodCore, type BloodOut } from './core.ts';
import { bloodMl, ecfMl, type Flow } from './fluids.ts';
import { LAB_TURNAROUND_S, labPanel, type LabInputs, type PendingLab } from './labs.ts';
import { BLOOD_DT_S, COLD_UNIT_C, FLUIDS, hypertonicSaline, MG_MMOL_PER_G, NORMAL, PRODUCTS, SIGMA_PROTEIN, storedK, type Composition, type FluidId, type ProductId } from './params.ts';
import { BLOOD_DRUGS, bicarbCo2MlMin, CA_MMOL_PER_G } from './treatments.ts';
import { ivInflow } from '../thermal/environment.ts'; // Stage 7e (E-7e-1)

export interface BloodState {
  k: number; // next step index (time k·0.1 s)
  core: BloodCore;
  /** = core.out after every step: the block other stages read (7g hbfRel; 7d hb, albuminGL, bvRel, lactate; 7b cop). */
  out: BloodOut;
  view: BloodView;
  labs: PendingLab[];
  /** Cold units running: until (s), °C per s. */
  cold: { until: number; cPerS: number }[];
  /** Ketoacid infusion (mmol/s) until. */
  keto: { rate: number; until: number } | null;
  /** What the engine has already pushed into Modifiers (plan decision 9). */
  ecg: { k: number; qtc: number };
  /** Lung-water seam (G7b ruling 8): filtered pulmonary capillary pressure (mmHg) and the extra EVLWI (mL/kg). */
  lung: { pCap: number; evlwi: number };
  /** Output events (`labs`, `labResult`) waiting for the engine's flush. */
  events: EngineEvent[];
  /**
   * R51 addendum 15 (5): the resting-CO reference. `coLp` low-passes the circuit's CO (gas-model flow units) from 7a's
   * `ref.co` until `latched` (settle window over, or the first perturbation); then it is CO0 for hbfRel and lactate.
   */
  rest: { coLp: number; latched: boolean };
  /** Cumulative blood-volume change pushed into 7a's circuit, mL (R51 addendum 15 (1): refill = circNetMl + core.bledMl). */
  circNetMl: number;
  /** TEST-ONLY seam (R51 addendum 15 (4)): when set, the published `out.hbfRel` is pinned to it (7g tests). */
  pinHbfRel?: number;
}

export interface BloodCtx {
  resp: RespState;
  hemo: unknown; // HemoState; Stage 7a's `circ`/`circOut` are duck-typed
  l1: L1State;
  pk?: unknown; // Stage 7g's PkState (duck-typed: `bus.doses`, `bus.metabolic.kShift`); absent → 7c's own drug fallback
}

/** Create the blood for a profile. With 7a present CO0 becomes the circuit's settled resting CO (advanceBlood, addendum 15). */
export function createBloodState(profile: PatientProfile | undefined): BloodState {
  const core = createBloodCore(profile, CI_LPM_PER_KG * gasPatient(profile).effKg, NORMAL.paco2);
  return {
    k: 0, core, out: core.out, view: { odc: { ...core.odc }, coFactor: 1, co2LoadMlMin: 0 }, labs: [], cold: [], keto: null,
    ecg: { k: 0, qtc: 0 }, lung: { pCap: 8, evlwi: 0 }, events: [], rest: { coLp: 0, latched: false }, circNetMl: 0,
  };
}

/** QTc change (ms) from ionised Ca: +10 per 0.1 below 1.1, −10 per 0.1 above 1.3 (tables §5b.2 Q46) [ENG]. */
export function qtcDeltaCa(iCa: number): number {
  return iCa < 1.1 ? (1.1 - iCa) * 100 : iCa > 1.3 ? -(iCa - 1.3) * 100 : 0;
}

/** Torsades-risk hook for 7g/rhythms (0–1): long QTc, low Mg, low K [ENG]. Exposed, not acted on in 7c. */
export function tdpRisk(qtc: number, mg: number, k: number): number {
  const q = Math.max(0, (qtc - 470) / 100);
  return Math.min(1, q * (mg < 0.7 ? 1.5 : 1) * (k < 3 ? 1.5 : 1));
}

function labInputs(rs: RespState, t: number): LabInputs {
  return { paco2: rs.co2.pf, pao2: rs.o2.pao2, tempC: rs.temp.tc, vco2: rs.pat.vco2 * metabolic(rs, t), coLpm: rs.coRatio * CI_LPM_PER_KG * rs.pat.effKg };
}

// --- Stage 7g observer (R51 §3; R50 F1/F2) ------------------------------------------------------------------------
/** The part of 7g's DoseLogEntry 7c reads; `concentrationPct` is 7d's optional field for hypertonic saline (R51 addendum 14). */
export interface DoseLike { agent: string; amount: number; amountUnit: string; t: number; concentrationPct?: number }
interface BusLike { doses: DoseLike[]; kShift: number; active: boolean }

/** 7g's bus (duck-typed), or null when 7g is absent. */
export function pkBus(pk: unknown): BusLike | null {
  const b = (pk as { bus?: { doses?: unknown; metabolic?: { kShift?: unknown } } } | null | undefined)?.bus;
  if (!b || !Array.isArray(b.doses)) return null;
  const k = b.metabolic?.kShift;
  const n = (o: unknown) => (o && typeof o === 'object' ? Object.keys(o).length : 0);
  const x = b as { agents?: unknown; volatiles?: unknown };
  // `active`: any agent or volatile on 7g's bus — a drug already perturbs the circulation (R51 addendum 15 (5))
  return { doses: b.doses as DoseLike[], kShift: typeof k === 'number' && Number.isFinite(k) ? k : 0, active: n(x.agents) + n(x.volatiles) > 0 };
}

/**
 * Resting-CO reference (R51 addendum 15 (5)) [ENG]: the circuit's running resting CO sits −13…+25 % from 7a's
 * stabilised `ref.co` depending on the rig (ventilation, PEEP, anaesthesia), which would move hbfRel and the regional
 * lactate threshold at rest. The reference low-passes the CO (τ 20 s: over breathing and the baroreflex swings) from
 * `ref.co` and latches at 120 s, or at the first perturbation (a volume/chemistry command or a 7g drug).
 */
export const CO0_SETTLE_S = 120;
export const CO0_TAU_S = 20;

/** Hypertonic saline runs in over this time when 7g's log gives no duration [ENG]. */
export const HTS_OVER_MIN = 15;

/**
 * Turn 7g's accepted boluses into 7c's mass balance and effect curves, in 7g's library units (sux mcg; calcium salts
 * mg; NaHCO3 mmol; insulin–dextrose units; MgSO4 mg; hypertonic saline mL). Salbutamol, insulin and epinephrine are
 * NOT read here: their K shift arrives once, as `bus.metabolic.kShift` (R50 F2). Each entry is listed for exactly one
 * advance pass, so each dose is observed exactly once.
 */
export function observeDoses(bs: BloodState, doses: readonly DoseLike[]): void {
  const c = bs.core;
  for (const d of doses) {
    const g = d.amountUnit === 'mcg' ? d.amount / 1e6 : d.amountUnit === 'mg' ? d.amount / 1000 : d.amountUnit === 'g' ? d.amount : 0;
    switch (d.agent) {
      case 'succinylcholine':
        c.doses.push({ id: 'succinylcholine', t0: d.t, amount: g * 1000 });
        break;
      case 'insulinDextrose':
        c.doses.push({ id: 'insulinDextrose', t0: d.t, amount: d.amount });
        break;
      case 'calciumChloride':
      case 'calciumGluconate': {
        const mmol = g * CA_MMOL_PER_G[d.agent];
        c.so.ca += 0.5 * mmol; // half ionised once albumin binds it [ENG]
        c.doses.push({ id: d.agent, t0: d.t, amount: mmol });
        break;
      }
      case 'sodiumBicarbonate':
        if (d.amountUnit === 'mmol') {
          c.so.na += d.amount;
          c.doses.push({ id: 'sodiumBicarbonate', t0: d.t, amount: d.amount });
        }
        break;
      case 'magnesium':
        c.so.mg += g * MG_MMOL_PER_G;
        break;
      case 'hypertonicSaline':
        if (d.amountUnit === 'mL') c.fl.flows.push({ rate: d.amount / HTS_OVER_MIN, until: 1e9, leftMl: d.amount, comp: hypertonicSaline(d.concentrationPct ?? 3) });
        break;
      default:
        break;
    }
  }
}

export function advanceBlood(bs: BloodState, ctx: BloodCtx, tEnd: number): void {
  const rs = ctx.resp;
  const circ = circOf(ctx.hemo);
  const bus = pkBus(ctx.pk);
  const c = bs.core;
  if (bus) observeDoses(bs, bus.doses);
  // CO0 in the gas model's flow units (coRatio × CI × effKg): the circuit's settled resting CO, starting from 7a's
  // stabilised `ref.co` (fallback) — R51 addendum 15 (5), superseding R50 F4's `ref.co` alone
  const settling = circ?.ref !== undefined && !bs.rest.latched;
  if (circ?.ref && bs.rest.coLp === 0) bs.rest.coLp = (circ.ref.co / CO_REF_LPM) * CI_LPM_PER_KG * rs.pat.effKg;
  if (settling && bus && (bus.active || bus.doses.length > 0)) bs.rest.latched = true;
  const pPv = pulmCapPressure(ctx.hemo);
  while (bs.k * BLOOD_DT_S <= tEnd + 1e-9) {
    const t = bs.k * BLOOD_DT_S;
    c.fl.anaesthesia = rs.temp.anaesthesia === 'general';
    if (bs.keto && t < bs.keto.until) c.so.keto += bs.keto.rate * BLOOD_DT_S;
    const bv0 = bloodMl(c.fl);
    const coLpm = rs.coRatio * CI_LPM_PER_KG * rs.pat.effKg;
    if (settling && !bs.rest.latched) {
      bs.rest.coLp += (coLpm - bs.rest.coLp) * (BLOOD_DT_S / CO0_TAU_S);
      if (t >= CO0_SETTLE_S) bs.rest.latched = true;
    }
    if (circ?.ref) c.co0 = bs.rest.coLp;
    const mo2 = metabolic(rs, t, 'o2');
    stepBloodCore(c, {
      t, coLpm, paco2: rs.co2.pf, pao2: rs.o2.pao2, tempC: rs.temp.tc, vo2Demand: rs.pat.vo2 * mo2, demandRel: mo2,
      ...(bus ? { kShiftExt: bus.kShift } : {}),
    }, BLOOD_DT_S);
    bs.out = bs.pinHbfRel === undefined ? c.out : { ...c.out, hbfRel: bs.pinHbfRel }; // test seam (addendum 15 (4))
    const bvRatio = c.out.bvRel;
    const kChem = chemistryContractility(c.ab.ph, c.out.iCa, c.out.kEcg); // FU-4 G3: + K
    if (circ) {
      pushCircVolume(circ, bloodMl(c.fl) - bv0, BLOOD_DT_S);
      bs.circNetMl += bloodMl(c.fl) - bv0;
      setCircChemistry(circ, kChem);
      if (ctx.l1.mode === 'modeled') setCircViscosity(circ, c.odc.hb / c.pat.hbRef); // FU-6 R11 (MODELED: MANUAL's trackers own SVR)
      circ.ext.kEcg = c.out.kEcg; // FU-4 G3: the membrane-effective K for the sinus node and the arrest hazard (7a arrest.ts)
    } else applyL1Fallback(ctx.l1, t, bvRatio, kChem);
    rs.temp.iv = ivInflow(c.fl.flows, bs.cold.some((u) => t < u.until), t, rs.temp.ta); // Stage 7e (E-7e-1): IV fluids and unwarmed units as a physical heat term (replaces decision 16's −0.25 °C per unit)
    bs.cold = bs.cold.filter((u) => u.until > t);
    bs.view.odc = { ...c.odc };
    bs.view.coFactor = circ ? 1 : volumeCoFactor(bvRatio);
    bs.view.co2LoadMlMin = bicarbCo2MlMin(c.doses, t);
    c.doses = c.doses.filter((d) => t - d.t0 < 6 * 3600); // every effect is < 1 % after 6 h
    if (pPv !== null) {
      // lung water (G7b ruling 8): 10 s filter on the pulmonary venous pressure; 7b re-resolves at ≥ 0.25 mL/kg change
      // FU-6 R3(b) (E-FU6-4): obstructed efforts lower the alveolar (≈ interstitial) pressure, so the capillary
      // TRANSMURAL pressure rises by it — negative-pressure pulmonary oedema through the same Starling step
      bs.lung.pCap += (pPv - (rs.palvObs ?? 0) - bs.lung.pCap) * (BLOOD_DT_S / 10);
      bs.lung.evlwi = lungWaterStep(bs.lung.evlwi, bs.lung.pCap, c.out.cop, c.fl.kfMult, c.fl.sigma / SIGMA_PROTEIN, BLOOD_DT_S);
      if (Math.abs(bs.lung.evlwi - (rs.evlwiExtra ?? 0)) >= 0.25) {
        rs.evlwiExtra = bs.lung.evlwi;
        applyLungSpecs(rs);
      }
    }
    if (bs.k % 10 === 0 && bs.k > 0) {
      bs.events.push({ type: 'labs', t, values: labPanel(c, labInputs(rs, t), 'abg') });
      for (const p of bs.labs) if (p.due <= t) bs.events.push({ type: 'labResult', t: p.due, drawnAt: p.drawnAt, panel: p.panel, values: p.values });
      bs.labs = bs.labs.filter((p) => p.due > t);
    }
    bs.k++;
  }
}

/** ECG targets the engine pushes as deltas: K for Modifiers.k, ΔQTc for Modifiers.qtc. */
export function bloodEcgTargets(bs: BloodState): { k: number; qtc: number } {
  return { k: bs.core.out.kEcg - NORMAL.k, qtc: qtcDeltaCa(bs.core.out.iCa) }; // FU-4 G3: absolute K (NORMAL.k = the Modifiers default 4.2) — a hyperkalaemic profile draws its ECG
}

// --- commands ----------------------------------------------------------------------------------------------------
const DRUG_UNITS: Record<BloodDrugId, readonly string[]> = {
  succinylcholine: ['mg', 'mg/kg'], insulinDextrose: ['units'], salbutamol: ['mg', 'mcg'], calciumChloride: ['g', 'mg'],
  calciumGluconate: ['g', 'mg'], sodiumBicarbonate: ['mmol', 'mmol/kg'], magnesium: ['g', 'mg'],
};
const num = (name: string, v: number | undefined, lo: number, hi: number) =>
  v === undefined || (Number.isFinite(v) && v >= lo && v <= hi) ? undefined : `${name} must be a finite number in ${lo}–${hi}`;
/** 7a's `crystalloid`/`colloid`/`blood` map to saline / gelatin / whole blood (R50 F5). */
const ALIAS: Record<string, Composition> = { crystalloid: FLUIDS.saline, colloid: FLUIDS.gelatin, blood: { ...PRODUCTS.wholeBlood.comp, k: storedK(14) } };
const FLUID_IDS = [...Object.keys(FLUIDS), ...Object.keys(ALIAS)];

/**
 * Validation hook: a reason, undefined (accepted) or null (not a Stage 7c command). Runs after Stage 7g's (which owns
 * every `drug` event when present — the `drug` case here is the fallback for an engine without 7g) and BEFORE
 * Stage 3's (whose `condition` rejects unknown ids).
 */
export function validateBloodCommand(cmd: Command): string | undefined | null {
  if (cmd.type !== 'applyEvent') return null;
  const ev = cmd.event as BloodClinicalEvent | { kind: string; drugId?: string; id?: string };
  switch (ev.kind) {
    case 'fluid':
    case 'bleed': {
      const f = ev as { fluid?: string; volumeMl?: number; overS?: number; rateMlPerMin?: number };
      if (f.fluid !== undefined && !FLUID_IDS.includes(f.fluid)) return `fluid must be one of ${FLUID_IDS.join(', ')}`;
      if (f.rateMlPerMin !== undefined) return num('rateMlPerMin', f.rateMlPerMin, 0, 2000);
      return f.volumeMl === undefined ? 'volumeMl or rateMlPerMin is required' : num('volumeMl', f.volumeMl, 1, 5000) ?? num('overS', f.overS, 1, 86_400);
    }
    case 'transfusion': {
      const x = ev as Extract<BloodClinicalEvent, { kind: 'transfusion' }>;
      if (!(x.product in PRODUCTS)) return `product must be one of ${Object.keys(PRODUCTS).join(', ')}`;
      return num('units', x.units, 0.5, 20) ?? num('overS', x.overS, 30, 86_400) ?? num('storageDays', x.storageDays, 1, 42) ?? (x.units === undefined ? 'units is required' : undefined);
    }
    case 'drug': {
      const d = ev as { drugId: string; dose: number; unit: string };
      if (!(BLOOD_DRUGS as readonly string[]).includes(d.drugId)) return null;
      if (!(Number.isFinite(d.dose) && d.dose > 0)) return 'dose must be > 0';
      const units = DRUG_UNITS[d.drugId as BloodDrugId];
      return units.includes(d.unit) ? undefined : `${d.drugId} unit must be ${units.join(' or ')}`;
    }
    case 'metabolic': {
      const m = ev as Extract<BloodClinicalEvent, { kind: 'metabolic' }>;
      return num('ketoacidsMmolL', m.ketoacidsMmolL, 0, 40) ?? num('acidMmol', m.acidMmol, 0, 1000) ?? num('overS', m.overS, 1, 86_400);
    }
    case 'condition': {
      const c = ev as { id: string; severity: number };
      if (c.id !== 'burns' && c.id !== 'dka') return null; // Stage 3 (mh), Stage 7a (tamponade, pe, …)
      return c.severity === undefined ? 'severity is required' : num('severity', c.severity, 0, 1);
    }
    case 'lab': {
      const l = ev as Extract<BloodClinicalEvent, { kind: 'lab' }>;
      return l.panel !== 'abg' && l.panel !== 'vbg' ? "panel must be 'abg' or 'vbg'" : num('turnaroundS', l.turnaroundS, 30, 3600);
    }
    default:
      return null;
  }
}

/** Apply hook: true when the command was a Stage 7c command. `t` is the sim time; `rs` for lab snapshots. */
export function applyBloodCommand(bs: BloodState, cmd: Command, t: number, rs: RespState): boolean {
  const ok = applyBloodEvent(bs, cmd, t, rs);
  // any accepted command except a blood draw perturbs the patient: the resting-CO reference stops settling (addendum 15 (5))
  if (ok && cmd.type === 'applyEvent' && (cmd.event as { kind: string }).kind !== 'lab') bs.rest.latched = true;
  return ok;
}

function applyBloodEvent(bs: BloodState, cmd: Command, t: number, rs: RespState): boolean {
  if (cmd.type !== 'applyEvent') return false;
  const c = bs.core;
  const w = c.pat.weightKg;
  const ev = cmd.event as BloodClinicalEvent | { kind: string };
  switch (ev.kind) {
    case 'fluid':
    case 'bleed': {
      const f = ev as { fluid?: string; volumeMl?: number; overS?: number; rateMlPerMin?: number };
      const comp = ev.kind === 'bleed' ? null : f.fluid === undefined ? FLUIDS.saline : (ALIAS[f.fluid] ?? FLUIDS[f.fluid as FluidId]);
      if (f.rateMlPerMin !== undefined) {
        // an open-ended rate replaces the previous open-ended flow of the same kind; 0 stops it
        c.fl.flows = c.fl.flows.filter((x) => !((x.comp === null) === (comp === null) && x.leftMl === undefined && x.until >= 1e8));
        if (f.rateMlPerMin > 0) c.fl.flows.push({ rate: f.rateMlPerMin, until: 1e9, comp });
      } else {
        const over = f.overS ?? (ev.kind === 'bleed' ? 60 : 600);
        const ml = f.volumeMl as number;
        c.fl.flows.push({ rate: (ml * 60) / over, until: 1e9, leftMl: ml, comp }); // exactly the ordered volume
      }
      return true;
    }
    case 'transfusion': {
      const x = ev as { product: ProductId; units: number; overS?: number; storageDays?: number; warmed?: boolean };
      const p = PRODUCTS[x.product];
      const over = x.overS ?? 600 * x.units; // 10 min per unit unless told
      const comp = { ...p.comp, k: p.comp.hct > 0 ? storedK(x.storageDays ?? 14) : p.comp.k };
      const fl: Flow = { rate: (p.ml * x.units * 60) / over, until: 1e9, leftMl: p.ml * x.units, comp };
      c.fl.flows.push(fl);
      if (x.warmed !== true) bs.cold.push({ until: t + over, cPerS: (COLD_UNIT_C * x.units) / over });
      return true;
    }
    case 'drug': {
      // FALLBACK (no Stage 7g in the engine): with 7g, its validator claims every `drug` event and 7c observes bus.doses
      const d = ev as { drugId: BloodDrugId; dose: number; unit: string };
      if (!(BLOOD_DRUGS as readonly string[]).includes(d.drugId)) return false;
      let amount = d.dose;
      if (d.drugId === 'calciumChloride' || d.drugId === 'calciumGluconate') {
        amount = (d.unit === 'mg' ? d.dose / 1000 : d.dose) * CA_MMOL_PER_G[d.drugId];
        c.so.ca += 0.5 * amount; // half ionised once albumin binds it [ENG]
      } else if (d.drugId === 'sodiumBicarbonate') {
        amount = d.unit === 'mmol/kg' ? d.dose * w : d.dose;
        c.so.na += amount;
      } else if (d.drugId === 'magnesium') {
        amount = (d.unit === 'mg' ? d.dose / 1000 : d.dose) * MG_MMOL_PER_G;
        c.so.mg += amount;
      }
      c.doses.push({ id: d.drugId, t0: t, amount });
      return true;
    }
    case 'metabolic': {
      const m = ev as Extract<BloodClinicalEvent, { kind: 'metabolic' }>;
      const v = ecfMl(c.fl) / 1000;
      if (m.acidMmol) c.so.cl += m.acidMmol; // HCl / NH4Cl: the chloride stays, the H+ is buffered (Stewart)
      if (m.ketoacidsMmolL !== undefined) {
        const over = m.overS ?? 1;
        bs.keto = { rate: (m.ketoacidsMmolL * v - c.so.keto) / over, until: t + over };
      }
      return true;
    }
    case 'condition': {
      const x = ev as { id: string; severity: number };
      if (x.id === 'burns') c.burns = x.severity;
      else if (x.id === 'dka') c.so.keto = DKA_KETO_MMOL_L * x.severity * (ecfMl(c.fl) / 1000); // established DKA: 25 mmol/L at 1 [ENG]
      else return false;
      return true;
    }
    case 'lab': {
      const l = ev as Extract<BloodClinicalEvent, { kind: 'lab' }>;
      bs.labs.push({ drawnAt: t, due: t + (l.turnaroundS ?? LAB_TURNAROUND_S), panel: l.panel, values: labPanel(c, labInputs(rs, t), l.panel) });
      return true;
    }
    default:
      return false;
  }
}
