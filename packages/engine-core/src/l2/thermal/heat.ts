// Stage 7e heat balance (annex B3 "Take the 2-node core/skin circuit + environment; Fix: GA thresholds, vasomotion as
// a skin-flow factor, drug effects"). Two compartments (core 2/3, periphery 1/3 of the body, 3.5 kJ/kg/°C: Stage 3):
//   Cc·dTc = M − k_cp·(Tc − Tp) − Q_resp + Q_iv
//   Cp·dTp = k_cp·(Tc − Tp) − Q_dry − Q_skinEvap − Q_sweat + Q_forcedAir
//   M = m0·(1 − (1 − GA_M)·min(1, d)) + shivering + MH muscle heat + m0·(extraX − 1)   (extraX: thyroid/sepsis/…)
// k_cp comes from the vasomotor tone around the depth-dependent vasoconstriction threshold (thresholds.ts); under
// GA at depth 1 it is Stage 3's formula exactly, so redistribution, the linear phase and the plateau are Stage 3's.
// The awake patient at 21 °C is calibrated to Stage 3's balance (m0, gradient 4.3 °C) with the respiratory loss now
// on the core and the insulation solved from the environment terms (environment.ts). Stepped at 1 Hz. Plain data.
import type { TempSite } from '../../types-resp.ts';
import {
  bsaM2, calibrateInsulation, dryW, forcedAirW, infusionW, respiratoryW, AIR_SPEED_MS, FORCED_AIR_AREA, FORCED_AIR_TAU_S, PREP_EVAP_W_70,
  SKIN_EVAP_W_70, type Envelope, type Ventilation,
} from './environment.ts';
import { mhActivity, stepMh, type MhState } from './mh.ts';
import {
  AMBIENT_C, CORE_FRACTION, EMERGE_TAU_S, GA_KCP, GA_M, HEAT_CAP_J_KG_C, M_AWAKE_W_70, MH_HEAT_X, NEURAXIAL_BLOCK_FRAC, NEURAXIAL_H,
  NEURAXIAL_THR_SHIFT_C, PERIPH_GRADIENT_C, T_NORMAL, VASOCONSTRICT_KCP,
} from './params.ts';
import { shiverW, sweatW, thresholds, vasoDilation, type Thresholds } from './thresholds.ts';

/** Site lag τ (s) and offset (°C) behind core (brief §4.6 table; Stage 3). */
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
  k0: number; // awake k_cp W/°C (Stage 3 meaning)
  h: number; // Stage 3's lumped loss conductance at calibration (kept for reference; not used by the step)
  m0: number; // basal metabolic heat W at the set point
  effKg: number;
  ageY: number; // FU-10 E6: the thermoregulatory thresholds fall with age (Kurz 1993)
  env: Envelope;
  anaesthesia: 'none' | 'general' | 'neuraxial';
  warming: boolean; // forced air
  warmLag: number; // 0–1 delivered fraction of the forced-air power (first-order, τ FORCED_AIR_TAU_S)
  warmAirC?: number; // FU-4 item 1: the blanket's set air temperature, °C (absent = FORCED_AIR_C 43)
  mh: MhState | null;
  sites: Record<TempSite, number>;
  // --- Stage 7e ---
  depth: number; // thermoregulatory depth (0 awake … 1 GA): follows `anaesthesia` unless depthIn is set
  depthIn: number | null; // 7f's `ps.neuro.thermoDepth` (duck-typed seam); the depth is max(depthIn, the `anaesthesia` flag's)
  setShift: number; // °C added to every threshold (MANUAL target)
  feverShift: number; // °C added to every threshold by 7e's endocrine core (sepsis, SIRS, thyroid storm)
  nmb: number; // 0–1 neuromuscular block (7f), abolishes shivering
  shiverShift: number; // °C added to the shivering threshold only (pethidine, opioids: 7f/7g) — negative lowers it
  airMs: number;
  exposure: Exposure;
  vent: Ventilation;
  iv: { mlPerMin: number; tempC: number }; // IV fluid entering the core: 7c writes it every 100 ms (E-7e-1, `ivInflow`)
  fluidWarmer: boolean; // IV fluid warmed to 37 °C
  extraX: number; // endocrine/condition metabolic heat multiplier (1 = none), written by 7e's endo core
  dantE: number; // Stage 7g's dantrolene effect `bus.metabolic.dantroleneE` (0–1), written by 7e's pipeline every pass
  out: ThermalOut;
  /** Test-only seam (R51 addendum 18, like 7c's `pinHbfRel`): when set, the core is held at this value (°C). */
  pinCoreTemp?: number;
}

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
 * thresholds — FU-10 E3, ruling R-7). */
export function currentThresholds(st: ThermalState): Thresholds {
  const thr = thresholds(st.depth, st.setShift + st.feverShift, st.ageY);
  const nx = st.anaesthesia === 'neuraxial' ? NEURAXIAL_THR_SHIFT_C : 0;
  return { ...thr, vaso: thr.vaso + nx, shiver: thr.shiver + st.shiverShift + nx };
}

/** FU-10 E3: the fraction of the effectors (vasomotor tone, shivering) a neuraxial block abolishes; 0 otherwise. */
const blocked = (st: ThermalState): number => (st.anaesthesia === 'neuraxial' ? NEURAXIAL_BLOCK_FRAC : 0);

function kcp(st: ThermalState, tc: number, thr: Thresholds): { k: number; f: number } {
  // FU-10 E3: below a neuraxial block the vessels are fully dilated; above it they keep their thermoregulatory tone
  const b = blocked(st);
  const f = b + (1 - b) * vasoDilation(tc, thr);
  return { k: st.k0 * (VASOCONSTRICT_KCP + (GA_KCP - VASOCONSTRICT_KCP) * f), f };
}

function basalW(st: ThermalState): number {
  const ga = st.anaesthesia === 'general' || st.depthIn !== null ? Math.min(1, st.depth) : 0;
  return st.m0 * (1 - (1 - GA_M) * ga);
}

/** All heat flows at the current state (W). */
function balance(st: ThermalState, t: number): ThermalOut {
  const thr = currentThresholds(st);
  const { k, f } = kcp(st, st.tc, thr);
  const ex = EXPOSURE[st.exposure];
  const env = { bsa: st.env.bsa, rIns: st.env.rIns * ex.ins };
  const neur = st.anaesthesia === 'neuraxial' ? NEURAXIAL_H : 1;
  const warmArea = FORCED_AIR_AREA * st.warmLag;
  return {
    vasoF: f, kcp: k,
    metabolicW: basalW(st) + st.m0 * (st.extraX - 1),
    shiverW: shiverW(st.tc, thr, st.m0, st.effKg, st.nmb) * (1 - blocked(st)), // FU-10 E3: no shivering below a block
    mhW: st.m0 * MH_HEAT_X * mhActivity(st.mh, t),
    sweatW: sweatW(st.tc, thr, st.effKg),
    dryW: dryW(env, st.tp, st.ta, st.airMs, ex.area * (1 - warmArea)) * neur,
    respW: respiratoryW(st.vent, st.ta),
    evapW: SKIN_EVAP_W_70 * (st.effKg / 70) * ex.evapX,
    warmW: st.warmLag > 0 ? forcedAirW(env, st.tp, st.warmAirC) * st.warmLag : 0,
    ivW: infusionW(st.iv.mlPerMin, st.fluidWarmer ? 37 : st.iv.tempC, st.tc),
  };
}

/** One step of dtS seconds (≤ 1 s). */
export function stepThermal(st: ThermalState, t: number, dtS: number): void {
  // depth = max(7f's thermoDepth, the Stage 3 `thermal` flag's depth) (R51 addendum 16): a Stage 3 scenario that sets
  // anaesthesia 'general' without drugs keeps its R39-7 course after 7f lands. Neuraxial (FU-10 E3): no central depth of
  // its own — the block acts on the effectors below it (kcp, shivering) and lowers the shivering threshold; sedation
  // reaches the thresholds through 7f's depth.
  const target = Math.max(st.depthIn ?? 0, st.anaesthesia === 'general' ? 1 : 0);
  // induction is fast (drug onset); emergence follows the elimination of the agent (τ EMERGE_TAU_S) [ENG]
  st.depth = target >= st.depth ? target : target + (st.depth - target) * Math.exp(-dtS / EMERGE_TAU_S);
  st.warmLag += ((st.warming ? 1 : 0) - st.warmLag) * (1 - Math.exp(-dtS / FORCED_AIR_TAU_S));
  stepMh(st.mh, st.dantE, dtS);
  const o = balance(st, t);
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
 * MANUAL target (Stage 3 plan decision 2): a steady state with core = tCore. The set point moves with it (a fever is
 * a raised set point: every threshold shifts), the periphery is re-solved from the current flows and m0 re-solved so
 * nothing drifts afterwards.
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
 * Restore of a pre-7e snapshot: its `resp.temp` is Stage 3's TempState (no `env`). Keep Stage 3's live fields and
 * take the 7e fields from a fresh normothermic state of the same body (the set point is the normal one).
 */
export function upgradeThermal(st: ThermalState): ThermalState {
  if ((st as Partial<ThermalState>).env !== undefined) return st;
  const fresh = createThermal(T_NORMAL, (st.m0 / M_AWAKE_W_70) * 70, 175, st.ageY ?? 40);
  return {
    ...fresh, tc: st.tc, tp: st.tp, ta: st.ta, anaesthesia: st.anaesthesia, warming: st.warming, mh: st.mh, sites: st.sites,
    depth: st.anaesthesia === 'general' ? 1 : 0, // FU-10 E3: a neuraxial block has no central depth
  };
}
