// Stage 7d liver and metabolism (tables §5.3; annex B2 "Hepatic (what exists)"). Pulse has NO hepatic model, so this
// is ours, except the hepatic flow share (ICRP-89 via Pulse, NOTICES N-P10, imported from circ/params.ts). Hepatic
// FLOW is 7c's `blood.out.hbfRel` when 7c is present (R51 addendum 14); the CO-based flow below is the fallback.
// Drug clearance is 7g's (it reads 7c's hbfRel and the liver function 7d writes into `blood.core.liver`).
// Plain JSON-safe state, stepped at 1 Hz.
import { ICRP89_FLOW_FRACTIONS_M } from '../circ/params.ts';

export const HBF_FRAC = ICRP89_FLOW_FRACTIONS_M.liver; // 0.255 of CO (tables `hbfFrac` 0.25, range 0.2–0.3)
export const K_LAC0_PER_H = 1.4; // tables `kLac` [ENG] (t½ ≈ 30 min), Q41
export const LAC_SPLIT = { liver: 0.6, kidney: 0.3, other: 0.1 } as const; // tables clearance split [TXT]
export const LAC_PROD0_MMOL_DAY = 1400; // tables `lacProd0` [TXT] (Pulse 1.3 mol/day)
export const V_LAC_L_KG = 0.6; // tables `vLac` [ENG]
export const CLEAR_TEMP_PER_C = 0.1; // tables `clearTemp` −10 %/°C below 37 [TXT]
/** liver function × (1 − 0.7·severity): the LIVER share of lactate clearance ×0.3 at severity 1 [DEVIATION: tables
 *  `kLac` row says "×0.3 in liver failure" on the whole kLac, its clearance-split row scales by organ; the split row is
 *  applied so failure does not stop renal/other clearance: kLac 1.4 → 0.81/h, t½ 51 min (whole-kLac ×0.3 would be 99 min). Q41] */
export const HEPATIC_FAILURE_LOSS = 0.7;
export const SPLANCHNIC_GAIN = 0.4; // hbfFactor ×0.6 at full sympathetic splanchnic constriction (tables `hbfFactor`)
export const VOLATILE_HBF_PER_MAC = 0.2; // ×0.8 at 1 MAC volatile (tables `hbfFactor`)
export const DO2_CRIT = 6; // mL/kg/min, tables `do2Crit` (Q42) — fallback lactate production only
export const K_ANAER = 0.03; // mmol lactate per mL O2 deficit, tables `kAnaer` (Q41) — fallback only

export interface LiverInputs {
  coLpm: number; co0Lpm: number;
  bvRel: number; // blood volume ÷ baseline (sympathetic splanchnic constriction below 0.9)
  alphaE: number; // 0–1 α-agonist effect (7g); 0 until then
  volatileMac: number;
  tempC: number;
  gfrRel: number; // kidney's GFR ÷ its set point (renal share of lactate clearance)
  hbfRel?: number; // 7c's `blood.out.hbfRel` (7c owns hepatic flow); absent → CO × hbfFactor (fallback)
  do2MlKgMin: number; // global O2 delivery (fallback lactate production when 7c is absent)
}
export interface LiverState {
  t: number;
  weightKg: number;
  failure: number; // 0–1 hepatic failure condition
  hbfRel: number; liverFn: number; tempF: number;
  glucoseF: number; // published for 7e (`organs.liver.glucoseF`): hepatic glucose output factor = liver function
  kLacPerH: number; // whole-body lactate clearance rate constant
  lactate: number; // mmol/L — the FALLBACK pool (7c's pool is authoritative when present)
  inr: number; // coagulopathy placeholder (not used by any model in 7d)
}

export function createLiver(weightKg: number, inp: LiverInputs, failure = 0): LiverState {
  const s: LiverState = {
    t: 0, weightKg, failure, hbfRel: 1, liverFn: 1, tempF: 1, glucoseF: 1, kLacPerH: K_LAC0_PER_H, lactate: 1, inr: 1,
  };
  update(s, inp);
  s.lactate = lactateSteady(s);
  return s;
}

/** Splanchnic/hepatic flow factor: sympathetic constriction with volume loss (full at −30 %) or α-agonists, volatile ×0.8/MAC. */
export function hbfFactor(inp: LiverInputs): number {
  const symp = Math.min(1, Math.max(inp.alphaE, (1 - inp.bvRel) / 0.3));
  return (1 - SPLANCHNIC_GAIN * symp) * Math.max(0.5, 1 - VOLATILE_HBF_PER_MAC * inp.volatileMac);
}

function update(s: LiverState, inp: LiverInputs): void {
  const coRel = Math.max(0, inp.coLpm) / Math.max(0.1, inp.co0Lpm);
  s.hbfRel = inp.hbfRel ?? coRel * hbfFactor(inp);
  s.liverFn = 1 - HEPATIC_FAILURE_LOSS * s.failure;
  s.glucoseF = s.liverFn;
  s.tempF = Math.max(0.3, 1 - CLEAR_TEMP_PER_C * Math.max(0, 37 - inp.tempC));
  const liverPart = LAC_SPLIT.liver * Math.min(1.5, s.hbfRel) * s.liverFn * s.tempF;
  s.kLacPerH = K_LAC0_PER_H * (liverPart + LAC_SPLIT.kidney * Math.min(1.5, inp.gfrRel) + LAC_SPLIT.other);
  s.inr = 1 + 2 * s.failure;
}

/** Basal lactate production, mmol/h. */
export const lacProdBasal = (): number => LAC_PROD0_MMOL_DAY / 24;
function lactateSteady(s: LiverState): number {
  return lacProdBasal() / (V_LAC_L_KG * s.weightKg * s.kLacPerH);
}

/** One-compartment lactate pool (mmol/L): dL/dt = P/V − k·L; exact over dt for constant P and k. */
export function stepLactatePool(l: number, prodMmolH: number, kPerH: number, vL: number, dtS: number): number {
  const ss = prodMmolH / (vL * kPerH);
  return ss + (l - ss) * Math.exp(-(kPerH * dtS) / 3600);
}

/** Step at dt s. `prodMmolH` overrides the fallback production (pass undefined to use basal + global O2 debt). */
export function stepLiver(s: LiverState, inp: LiverInputs, dt: number, prodMmolH?: number): void {
  s.t += dt;
  update(s, inp);
  const debt = Math.max(0, DO2_CRIT - inp.do2MlKgMin) * s.weightKg * 60; // mL O2/h below critical delivery
  const prod = prodMmolH ?? lacProdBasal() + K_ANAER * debt;
  s.lactate = stepLactatePool(s.lactate, prod, s.kLacPerH, V_LAC_L_KG * s.weightKg, dt);
}
