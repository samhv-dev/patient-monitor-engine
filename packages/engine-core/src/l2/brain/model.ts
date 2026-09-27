// BrainModel (Stage 7d, tables §5.1): plain-data state stepped at 10 Hz from the circulation/gas truths.
// Intracranial volume → ICP (mechanics.ts) ⇄ CPP → CBF (flow.ts, conductance relaxing with τ 10 s) → CBV (Grubb)
// solved by damped fixed-point each step; CSF displacement, mass lesion, oedema, osmotherapy and head-up posture
// change the volume; Cushing (cushing.ts) and herniation are states.
import { createCushing, cushingDMap, stepCushing, type CushingState } from './cushing.ts';
import { autoreg, brainOxygen, caO2, cbvRel, co2Factor, NO_DRUGS, o2Factor, tempCmro2, type BrainDrugs } from './flow.ts';
import { csfDisplacementRate, elastance, icpOfVolume } from './mechanics.ts';
import {
  CBF_LL, CBF_UL, CBV0_ML, CBV_EFF, CPP_REF, CSF_RESERVE_ML, HEAD_HEIGHT_CM, HEADUP_VOL_ML_30, HERNIATION_CPP, HERNIATION_S,
  HTS_TAU_IN_MIN, HTS_TAU_OUT_MIN, HTN_LL_SHIFT, HTN_UL_SHIFT, ICP0, MANNITOL_TAU_IN_MIN, MANNITOL_TAU_OUT_MIN, MAP_BASE_TAU_S,
  MMHG_PER_CM_BLOOD, OSM_K_MOSM, OSM_VMAX_ML, PACO2_ADAPT_TAU_S, PVI, R_OUT, TAU_VASC_S, TBI_AR_LOSS, TBI_ICP0_RISE, TBI_PVI_DROP, TBI_RESERVE_DROP,
} from './params.ts';

export interface BrainParams {
  icp0: number; pvi: number; rOut: number; csfReserve: number; ll: number; ul: number; ar: number;
}
export interface OsmDose { t0: number; mosm: number; tauIn: number; tauOut: number }
export interface BrainInputs {
  map: number; // mmHg, arterial mean at heart level (truth)
  cvp: number; // mmHg
  paco2: number; pao2: number; sao2: number; // mmHg, mmHg, fraction
  hb: number; // g/dL
  tempC: number;
  drugs: BrainDrugs; // anaesthetic CMRO2 multiplier and direct vasodilation (organs/inputs.ts: 7f/7g, or the INTERIM fallback)
}
export interface BrainState {
  t: number;
  p: BrainParams;
  mass: number; massRate: number; // mL, mL/min (a growing haematoma)
  oedema: number; // mL
  csfDisp: number; // mL displaced
  osm: OsmDose[];
  headUpDeg: number;
  g: number; // cerebrovascular conductance, CBF-relative per mmHg CPP
  paco2Ref: number;
  mapBase: number; // pre-surge MAP (LPF, frozen while Cushing is active)
  cush: CushingState;
  lowCppS: number;
  herniated: boolean;
  // outputs (truths)
  icp: number; cpp: number; mapHead: number; cbfRel: number; cbv: number; cmro2Rel: number; pbto2: number; sjvo2: number; elast: number;
}

/** Profile → brain parameters: HTN shifts the plateau right; TBI (severity 0–1) lowers PVI, raises ICP0, impairs AR. */
export function brainParams(conditions: readonly { id: string; severity?: number }[] = []): BrainParams {
  const p: BrainParams = { icp0: ICP0, pvi: PVI, rOut: R_OUT, csfReserve: CSF_RESERVE_ML, ll: CBF_LL, ul: CBF_UL, ar: 1 };
  for (const c of conditions) {
    const s = Math.min(1, Math.max(0, c.severity ?? 1));
    if (c.id === 'htn') {
      p.ll += HTN_LL_SHIFT;
      p.ul += HTN_UL_SHIFT;
    } else if (c.id === 'tbi') {
      p.pvi -= TBI_PVI_DROP * s;
      p.icp0 += TBI_ICP0_RISE * s;
      p.ar = 1 - TBI_AR_LOSS * s;
      p.csfReserve -= TBI_RESERVE_DROP * s;
    }
  }
  return p;
}

export function createBrain(p: BrainParams, inp: BrainInputs): BrainState {
  const b: BrainState = {
    t: 0, p, mass: 0, massRate: 0, oedema: 0, csfDisp: 0, osm: [], headUpDeg: 0, g: 0, paco2Ref: inp.paco2, mapBase: inp.map, // adapted to the patient's own PaCO2
    cush: createCushing(), lowCppS: 0, herniated: false,
    icp: p.icp0, cpp: inp.map - p.icp0, mapHead: inp.map, cbfRel: 1, cbv: CBV0_ML, cmro2Rel: 1, pbto2: 25, sjvo2: 0.65, elast: 0,
  };
  // start at rest: conductance at its target so t = 0 is a steady state
  b.g = targetCbf(b, inp, b.cpp) / Math.max(1, b.cpp);
  solve(b, inp, 0);
  b.mapBase = inp.map;
  return b;
}

function targetCbf(b: BrainState, inp: BrainInputs, cpp: number): number {
  const m = inp.drugs.cmro2Mult * tempCmro2(inp.tempC) * inp.drugs.cbfVaso;
  return autoreg(cpp, b.p.ll, b.p.ul, b.p.ar) * co2Factor(inp.paco2, b.paco2Ref) * o2Factor(inp.pao2) * m;
}

/** Osmotic brain-water loss (mL, ≥ 0) at time t: Bateman shape normalised to its peak × saturation × Vmax. */
export function osmoticLoss(doses: readonly OsmDose[], t: number): number {
  let v = 0;
  for (const d of doses) {
    const m = (t - d.t0) / 60;
    if (m <= 0) continue;
    const tp = (Math.log(d.tauOut / d.tauIn) * d.tauIn * d.tauOut) / (d.tauOut - d.tauIn);
    const peak = Math.exp(-tp / d.tauOut) - Math.exp(-tp / d.tauIn);
    v += ((Math.exp(-m / d.tauOut) - Math.exp(-m / d.tauIn)) / peak) * (d.mosm / (d.mosm + OSM_K_MOSM));
  }
  return OSM_VMAX_ML * v;
}

export function giveOsmotherapy(b: BrainState, kind: 'mannitol' | 'hypertonicSaline', mosm: number): void {
  const m = kind === 'mannitol';
  b.osm.push({ t0: b.t, mosm, tauIn: m ? MANNITOL_TAU_IN_MIN : HTS_TAU_IN_MIN, tauOut: m ? MANNITOL_TAU_OUT_MIN : HTS_TAU_OUT_MIN });
}

/** Head-up posture: tragus height above the heart (cm) and the venous volume drained (mL). */
export function headUp(deg: number): { hCm: number; volMl: number } {
  const s = Math.sin((Math.max(0, Math.min(90, deg)) * Math.PI) / 180);
  return { hCm: HEAD_HEIGHT_CM * s, volMl: (HEADUP_VOL_ML_30 * s) / 0.5 };
}

/** ICP ⇄ CBV fixed point at the current conductance (damped, 6 iterations; converges < 0.01 mmHg in tests). */
function solve(b: BrainState, inp: BrainInputs, dt: number): void {
  const hu = headUp(b.headUpDeg);
  b.mapHead = inp.map - MMHG_PER_CM_BLOOD * hu.hCm;
  const cvpHead = inp.cvp - MMHG_PER_CM_BLOOD * hu.hCm;
  const fixedV = b.mass + b.oedema - b.csfDisp - osmoticLoss(b.osm, b.t) - hu.volMl;
  let icp = b.icp;
  let cbf = b.cbfRel;
  for (let i = 0; i < 6; i++) {
    const cpp = b.mapHead - Math.max(icp, cvpHead);
    cbf = b.g * Math.max(0, cpp);
    const dCbv = CBV_EFF * CBV0_ML * (cbvRel(cbf) - 1);
    const next = Math.min(b.mapHead + 5, icpOfVolume(fixedV + dCbv, b.p.icp0, b.p.pvi));
    icp = i === 0 && dt === 0 ? next : 0.5 * (icp + next);
  }
  b.icp = icp;
  b.cpp = b.mapHead - Math.max(icp, cvpHead);
  b.cbfRel = b.g * Math.max(0, b.cpp);
  b.cbv = CBV0_ML * cbvRel(b.cbfRel);
  b.elast = elastance(icp, b.p.pvi);
}

/** Advance the brain by dt seconds (called every BRAIN_DT_S). */
export function stepBrain(b: BrainState, inp: BrainInputs, dt: number): void {
  b.t += dt;
  b.mass = Math.max(0, b.mass + (b.massRate * dt) / 60);
  b.csfDisp = Math.max(0, b.csfDisp + (csfDisplacementRate(b.icp, b.csfDisp, b.p.icp0, b.p.rOut, b.p.csfReserve) * dt) / 60);
  b.paco2Ref += (inp.paco2 - b.paco2Ref) * (dt / PACO2_ADAPT_TAU_S);
  // conductance relaxes toward the one that gives the target CBF at the current CPP (dynamic autoregulation)
  const gT = targetCbf(b, inp, b.cpp) / Math.max(1, b.cpp);
  b.g += (gT - b.g) * (1 - Math.exp(-dt / TAU_VASC_S));
  solve(b, inp, dt);
  // Cushing on the pre-surge MAP (frozen while active)
  if (b.cush.drive < 0.01) b.mapBase += (inp.map - b.mapBase) * (1 - Math.exp(-dt / MAP_BASE_TAU_S));
  const hu = headUp(b.headUpDeg);
  stepCushing(b.cush, b.mapBase - MMHG_PER_CM_BLOOD * hu.hCm - b.icp, b.mapHead - b.icp, dt);
  b.lowCppS = b.cpp <= HERNIATION_CPP ? b.lowCppS + dt : 0;
  if (b.lowCppS >= HERNIATION_S) b.herniated = true;
  b.cmro2Rel = inp.drugs.cmro2Mult * tempCmro2(inp.tempC);
  const r = (b.cbfRel * caO2(inp.hb, inp.sao2, inp.pao2)) / Math.max(1e-6, b.cmro2Rel * caO2(14, 0.97, 95));
  const o = brainOxygen(r, inp.sao2, inp.pao2);
  b.pbto2 = o.pbto2;
  b.sjvo2 = o.sjvo2;
}

export { cushingDMap, CPP_REF, NO_DRUGS };
