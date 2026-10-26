// Heat balance (annex B3 "Take the 2-node core/skin circuit + environment; Fix: GA thresholds, vasomotion as
// a skin-flow factor, drug effects"). Two compartments (core 2/3, periphery 1/3 of the body, 3.5 kJ/kg/°C):
//   Cc·dTc = M − k_cp·(Tc − Tp) − Q_resp + Q_iv
//   Cp·dTp = k_cp·(Tc − Tp) − Q_dry − Q_skinEvap − Q_sweat + Q_forcedAir
//   M = [m0·(1 − (1 − GA_M)·min(1, d)) + m0·(extraX − 1) + shivering]·o2Frac + MH muscle heat   (extraX: thyroid/sepsis/…)
//   MH muscle heat = M_mh·o2Frac·Weir(MH_RQ)   (W = mL/min × J/mL ÷ 60; M_mh the one MH rate, metabolic.ts)
//   o2Frac = the share of the VO2 demand the circulation delivers (the blood model's VO2/demand, blood/oxygen.ts; 1
//   above DO2crit, DO2/DO2crit below it, 0 with no flow): heat is oxidative, so the basal heat and the MH heat both
//   follow the oxygen actually consumed (E129 for the MH heat: 94 °C untreated before it; E131 for the rest).
//   Sweating and shivering × brainF (the vasomotor centre's perfusion gate, circ/baroreflex.ts `brainstemOutF`): the
//   hypothalamic efferent needs a perfused brain (E131; no "dead" flag).
// k_cp comes from the vasomotor tone around the depth-dependent vasoconstriction threshold (thresholds.ts); under
// GA at depth 1 it is the temperature signal's heat-model formula exactly, so redistribution, the linear phase and the
// plateau are unchanged. E131: the part of k_cp above tissue conduction (TISSUE_K_W_M2_C·BSA, Gagge 1971) is carried by
// skin blood flow, so it is × the perfusion fraction perfFrac (a FLOW fraction from the blood pipeline: CO relative to
// the flow at which a normally oxygenated patient's delivery becomes critical): k = min(k_v, k_t) + max(0, k_v − k_t)·
// perfFrac — unchanged at full perfusion, tissue conduction at no flow. The awake patient at 21 °C is calibrated to that heat model's balance (m0, gradient 4.3 °C)
// with the respiratory loss on the core and the insulation solved from the environment terms (environment.ts).
// Stepped at 1 Hz. Plain data.
import type { TempSite } from '../../types-resp.ts';
import {
  bsaM2, calibrateInsulation, dryW, forcedAirW, infusionW, respiratoryW, AIR_SPEED_MS, FORCED_AIR_AREA, FORCED_AIR_TAU_S, PREP_EVAP_W_70,
  SKIN_EVAP_W_70, type Envelope, type Ventilation,
} from './environment.ts';
import { stepMh, type MhState } from './mh.ts';
import {
  AMBIENT_C, CORE_FRACTION, EMERGE_TAU_S, GA_KCP, GA_M, HEAT_CAP_J_KG_C, M_AWAKE_W_70, MH_RQ, NEURAXIAL_BLOCK_FRAC, NEURAXIAL_H,
  NEURAXIAL_THR_SHIFT_C, PERIPH_GRADIENT_C, T_NORMAL, TISSUE_K_W_M2_C, VASOCONSTRICT_KCP,
} from './params.ts';
import { mhO2Demand, oxyKjPerL } from './metabolic.ts';
import { RQ } from '../gas/params.ts';
import { shiverW, sweatW, thresholds, vasoDilation, type Thresholds } from './thresholds.ts';

/** Site lag τ (s) and offset (°C) behind core (brief §4.6 table). */
export const SITES: Readonly<Record<TempSite, { tauS: number; offset: number }>> = {
  oesophageal: { tauS: 45, offset: 0 }, // 0.5–1 min
  nasopharyngeal: { tauS: 120, offset: 0 }, // 1–3 min
  tympanic: { tauS: 120, offset: 0 },
  bladder: { tauS: 720, offset: 0 }, // 5–20 min
  rectal: { tauS: 2400, offset: 0 }, // 20–60 min
  axilla: { tauS: 300, offset: -0.5 }, // 5 min, −0.5 °C
};

/** Awake resting ventilation used for the calibration, 0.1 L/min/kg (7 L/min at 70 kg): scaled so a child's insulation
 * and k0 are calibrated against its own respiratory loss [TXT]. */
export const AWAKE_VE_L_MIN_KG = 0.1;
const awakeVent = (effKg: number): Ventilation => ({ veLpm: AWAKE_VE_L_MIN_KG * effKg, dryGas: false, hme: false });
export type Exposure = 'draped' | 'exposed' | 'prep';
/** Insulation × and extra evaporation per exposure: 'exposed' = uncovered skin (induction, positioning) [ENG]. */
const EXPOSURE: Record<Exposure, { ins: number; area: number; evapX: number }> = {
  draped: { ins: 1, area: 1, evapX: 1 },
  exposed: { ins: 0.15, area: 1, evapX: 1 },
  prep: { ins: 1, area: 1, evapX: 1 + PREP_EVAP_W_70 / SKIN_EVAP_W_70 },
};

export interface ThermalOut {
  vasoF: number; // 0 constricted … 1 dilated
  kcp: number; // W/°C
  metabolicW: number; // basal (GA-reduced) + extra (endocrine) heat
  shiverW: number;
  mhW: number;
  sweatW: number;
  dryW: number;
  respW: number;
  evapW: number;
  warmW: number;
  ivW: number;
}

export interface ThermalState {
  tc: number;
  tp: number;
  ta: number;
  capCore: number; // J/°C
  capPer: number;
  k0: number; // awake k_cp W/°C (the heat model's meaning)
  h: number; // The lumped loss conductance at calibration (kept for reference; not used by the step)
  m0: number; // basal metabolic heat W at the set point
  effKg: number;
  ageY: number; // The thermoregulatory thresholds fall with age (Kurz 1993)
  env: Envelope;
  anaesthesia: 'none' | 'general' | 'neuraxial';
  warming: boolean; // forced air
  warmLag: number; // 0–1 delivered fraction of the forced-air power (first-order, τ FORCED_AIR_TAU_S)
  warmAirC?: number; // The blanket's set air temperature, °C (absent = FORCED_AIR_C 43)
  mh: MhState | null;
  sites: Record<TempSite, number>;
  depth: number; // thermoregulatory depth (0 awake … 1 GA): follows `anaesthesia` unless depthIn is set
  depthIn: number | null; // `ps.neuro.thermoDepth` (neuro, duck-typed); depth = max(depthIn, the `anaesthesia` flag's)
  setShift: number; // °C added to every threshold (MANUAL target)
  feverShift: number; // °C added to every threshold by 7e's endocrine core (sepsis, SIRS, thyroid storm)
  nmb: number; // 0–1 neuromuscular block, abolishes shivering
  shiverShift: number; // °C added to the shivering threshold only (pethidine, opioids) — negative lowers it
  airMs: number;
  exposure: Exposure;
  vent: Ventilation;
  iv: { mlPerMin: number; tempC: number }; // IV fluid into the core: the blood model's `ivInflow`, every 100 ms
  fluidWarmer: boolean; // IV fluid warmed to 37 °C
  extraX: number; // endocrine/condition metabolic heat multiplier (1 = none), written by 7e's endo core
  dantE: number; // The drug model's dantrolene effect `bus.metabolic.dantroleneE` (0–1), set by the endocrine pipeline
  /** E129/E131: the blood model's achieved ÷ demanded VO2 (0–1), written by the blood pipeline only while it is below 1
   * (absent = 1: delivery meets demand). It scales the basal, shivering and MH heat (oxidative). */
  o2Frac?: number;
  /** E131: skin perfusion 0–1 for the blood-borne part of k_cp — cardiac output ÷ the output at which a normally
   * oxygenated, normal-Hb patient's delivery becomes critical (blood pipeline; ≈ 40 % of resting CO). Written only while
   * below 1 (absent = 1). A flow fraction: hypoxaemia and anaemia do not shut the skin. */
  perfFrac?: number;
  out: ThermalOut;
  /** Test-only seam (like the blood model's `pinHbfRel`): when set, the core is held at this value (°C). */
  pinCoreTemp?: number;
}

/**
 * E131: what the heat model reads from the other modules each step (absent = the defaults). `vo2Rest`: the patient's
 * resting VO2, mL/min (the gas model's `pat.vo2`; default: the VO2 the basal heat m0 implies at RQ 0.8, Weir) — the MH
 * muscle heat is this × the MH rate. `brainF`: the vasomotor centre's perfusion gate 0–1 (`brainstemOutF(cbfRel)`;
 * default 1) on the thermoregulatory efferents, sweating and shivering.
 */
export interface ThermalInputs { vo2Rest?: number; brainF?: number }

const zeroOut = (): ThermalOut => ({ vasoF: 0, kcp: 0, metabolicW: 0, shiverW: 0, mhW: 0, sweatW: 0, dryW: 0, respW: 0, evapW: 0, warmW: 0, ivW: 0 });

export function createThermal(tCore: number, effKg: number, heightCm = 175, ageY = 40): ThermalState {
  const m0 = M_AWAKE_W_70 * (effKg / 70);
  const tp = tCore - PERIPH_GRADIENT_C;
  const sites = {} as Record<TempSite, number>;
  for (const s of Object.keys(SITES) as TempSite[]) sites[s] = tCore;
  const bsa = bsaM2(effKg, heightCm);
  const resp = respiratoryW(awakeVent(effKg), AMBIENT_C);
  const evap = SKIN_EVAP_W_70 * (effKg / 70);
  const st: ThermalState = {
    tc: tCore, tp, ta: AMBIENT_C,
    capCore: HEAT_CAP_J_KG_C * effKg * CORE_FRACTION, capPer: HEAT_CAP_J_KG_C * effKg * (1 - CORE_FRACTION),
    k0: (m0 - resp) / PERIPH_GRADIENT_C, h: m0 / (tp - AMBIENT_C), m0, effKg, ageY,
    env: { bsa, rIns: calibrateInsulation(bsa, tp, AMBIENT_C, AIR_SPEED_MS, m0 - resp - evap) },
    anaesthesia: 'none', warming: false, warmLag: 0, mh: null, sites,
    depth: 0, depthIn: null, setShift: tCore - T_NORMAL, feverShift: 0, nmb: 0, shiverShift: 0, airMs: AIR_SPEED_MS, exposure: 'draped',
    vent: awakeVent(effKg), iv: { mlPerMin: 0, tempC: AMBIENT_C }, fluidWarmer: false, extraX: 1, dantE: 0, out: zeroOut(),
  };
  st.out = balance(st, 0);
  return st;
}

/** Current thresholds (depth, set point; the drugs' shivering-only shift; a neuraxial block lowers both cold-defence
 * thresholds). */
export function currentThresholds(st: ThermalState): Thresholds {
  const thr = thresholds(st.depth, st.setShift + st.feverShift, st.ageY);
  const nx = st.anaesthesia === 'neuraxial' ? NEURAXIAL_THR_SHIFT_C : 0;
  return { ...thr, vaso: thr.vaso + nx, shiver: thr.shiver + st.shiverShift + nx };
}

/** The fraction of the effectors (vasomotor tone, shivering) a neuraxial block abolishes; 0 otherwise. */
const blocked = (st: ThermalState): number => (st.anaesthesia === 'neuraxial' ? NEURAXIAL_BLOCK_FRAC : 0);

function kcp(st: ThermalState, tc: number, thr: Thresholds): { k: number; f: number } {
  // Below a neuraxial block the vessels are fully dilated; above it they keep their thermoregulatory tone
  const b = blocked(st);
  const f = b + (1 - b) * vasoDilation(tc, thr);
  const kv = st.k0 * (VASOCONSTRICT_KCP + (GA_KCP - VASOCONSTRICT_KCP) * f);
  const perf = st.perfFrac ?? 1;
  if (perf >= 1) return { k: kv, f };
  // E131: the blood-borne part above tissue conduction follows skin perfusion; tissue conduction stays at no flow
  const kt = TISSUE_K_W_M2_C * st.env.bsa;
  return { k: Math.min(kv, kt) + Math.max(0, kv - kt) * Math.max(0, perf), f };
}

function basalW(st: ThermalState): number {
  const ga = st.anaesthesia === 'general' || st.depthIn !== null ? Math.min(1, st.depth) : 0;
  return st.m0 * (1 - (1 - GA_M) * ga);
}

/** All heat flows at the current state (W). */
function balance(st: ThermalState, t: number, x: ThermalInputs = {}): ThermalOut {
  const thr = currentThresholds(st);
  const { k, f } = kcp(st, st.tc, thr);
  const ex = EXPOSURE[st.exposure];
  const env = { bsa: st.env.bsa, rIns: st.env.rIns * ex.ins };
  const neur = st.anaesthesia === 'neuraxial' ? NEURAXIAL_H : 1;
  const warmArea = FORCED_AIR_AREA * st.warmLag;
  const o2 = st.o2Frac ?? 1;
  const brain = Math.min(1, Math.max(0, x.brainF ?? 1));
  return {
    vasoF: f, kcp: k,
    // E131: heat is oxidative — × the delivered share of the VO2 demand; the efferents need a perfused brain
    metabolicW: (basalW(st) + st.m0 * (st.extraX - 1)) * o2,
    shiverW: shiverW(st.tc, thr, st.m0, st.effKg, st.nmb) * (1 - blocked(st)) * brain * o2, // No shivering below a block
    mhW: (mhO2Demand(st, t, x.vo2Rest ?? (st.m0 * 60) / oxyKjPerL(RQ)) * o2 * oxyKjPerL(MH_RQ)) / 60, // achieved MH VO2 × Weir
    sweatW: sweatW(st.tc, thr, st.effKg) * brain,
    dryW: dryW(env, st.tp, st.ta, st.airMs, ex.area * (1 - warmArea)) * neur,
    respW: respiratoryW(st.vent, st.ta),
    evapW: SKIN_EVAP_W_70 * (st.effKg / 70) * ex.evapX,
    warmW: st.warmLag > 0 ? forcedAirW(env, st.tp, st.warmAirC) * st.warmLag : 0,
    ivW: infusionW(st.iv.mlPerMin, st.fluidWarmer ? 37 : st.iv.tempC, st.tc),
  };
}

/** One step of dtS seconds (≤ 1 s). */
export function stepThermal(st: ThermalState, t: number, dtS: number, x: ThermalInputs = {}): void {
  // depth = max(the neuro model's thermoDepth, the `thermal` flag's depth): a scenario that sets anaesthesia
  // 'general' without drugs keeps its course. Neuraxial: no central depth of its own — the block acts on the effectors
  // below it (kcp, shivering) and lowers the shivering threshold; sedation reaches the thresholds through the neuro
  // model's depth.
  const target = Math.max(st.depthIn ?? 0, st.anaesthesia === 'general' ? 1 : 0);
  // induction is fast (drug onset); emergence follows the elimination of the agent (τ EMERGE_TAU_S) [ENG]
  st.depth = target >= st.depth ? target : target + (st.depth - target) * Math.exp(-dtS / EMERGE_TAU_S);
  st.warmLag += ((st.warming ? 1 : 0) - st.warmLag) * (1 - Math.exp(-dtS / FORCED_AIR_TAU_S));
  stepMh(st.mh, st.dantE, dtS);
  const o = balance(st, t, x);
  st.out = o;
  const flux = o.kcp * (st.tc - st.tp);
  st.tc += ((o.metabolicW + o.shiverW + o.mhW - flux - o.respW + o.ivW) / st.capCore) * dtS;
  if (st.pinCoreTemp !== undefined) st.tc = st.pinCoreTemp; // test seam (addendum 18)
  st.tp += ((flux - o.dryW - o.evapW - o.sweatW + o.warmW) / st.capPer) * dtS;
  for (const s of Object.keys(SITES) as TempSite[]) {
    const p = SITES[s];
    st.sites[s] += (st.tc + p.offset - st.sites[s]) * (1 - Math.exp(-dtS / p.tauS));
  }
}

/**
 * MANUAL target: a steady state with core = tCore. The set point moves with it (a fever is a raised set point: every
 * threshold shifts), the periphery is re-solved from the current flows and m0 re-solved so nothing drifts afterwards.
 */
export function setCoreTarget(st: ThermalState, tCore: number): void {
  st.setShift += tCore - st.tc;
  st.tc = tCore;
  const o0 = balance(st, 0);
  // periphery: k(Tc − Tp) = dry(Tp) + evap + sweat − warm → bisection on Tp in [ta, tc]
  let lo = Math.min(st.ta, tCore) - 5;
  let hi = tCore;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    st.tp = mid;
    const o = balance(st, 0);
    const net = o0.kcp * (tCore - mid) - o.dryW - o.evapW - o.sweatW + o.warmW;
    if (net > 0) lo = mid;
    else hi = mid;
  }
  st.tp = (lo + hi) / 2;
  const o = balance(st, 0);
  const need = o.kcp * (tCore - st.tp) + o.respW - o.ivW - o.shiverW - o.mhW - st.m0 * (st.extraX - 1);
  st.m0 = need / (basalW({ ...st, m0: 1 }) || 1);
}

/**
 * Restore of an older snapshot without thermoregulation: its `resp.temp` is the heat model's TempState (no `env`).
 * Keep its live fields and take the thermoregulation fields from a fresh normothermic state of the same body (the
 * set point is the normal one).
 */
export function upgradeThermal(st: ThermalState): ThermalState {
  if ((st as Partial<ThermalState>).env !== undefined) return st;
  const fresh = createThermal(T_NORMAL, (st.m0 / M_AWAKE_W_70) * 70, 175, st.ageY ?? 40);
  return {
    ...fresh, tc: st.tc, tp: st.tp, ta: st.ta, anaesthesia: st.anaesthesia, warming: st.warming, mh: st.mh, sites: st.sites,
    depth: st.anaesthesia === 'general' ? 1 : 0, // a neuraxial block has no central depth
  };
}
