// MODELED spontaneous breathing: the lung model's chemoreflex drive, work of breathing and fatigue
// (l2/lung/drive.ts: drive(), pti(), stepFatigue()) set the rate and tidal volume of spontaneous cycles in MODELED
// mode, with the neuro model's depression on top. MANUAL keeps the instructor's rr/vt × the neuro model's multipliers
// (driverCtx). Re-evaluated at 1 Hz on the gas grid; plain data (snapshots, look-ahead clone).
//   set point: the resting PaCO2 the MANUAL etco2 calibration placed (paco2Rest), lowered in metabolic acidosis to
//     Winter's expected PaCO2 = 1.5·HCO3 + 8 (Albert, Dell & Winters 1967; ±2) — HCO3 from the blood model's
//     blood.core.ab.hco3 (24 without it → no shift): paco2Set = min(paco2Rest, 1.5·HCO3 + 8); raised in metabolic
//     alkalosis by 0.7 mmHg per mmol/L of HCO3 above the patient's reference (Javaheri & Kazemi 1987 / the Boston
//     rules), capped at 55 mmHg.
//   drive: the lung model's VE = [S·(PaCO2 − B)]₊·H(PaO2)·(1 − opioidDep)·(1 − hypnoticDep)·F with the neuro model's
//     opioidDep/hypnoticDep (fixed-CO2 depression); the resting pattern rr0/vt0 is the instructor's rr/vt target.
//   NMB: VT × nmbVtMult (diaphragm strength), apnoea below DIAPH_APNOEA strength; upper-airway obstruction × (1 − obs);
//     pti's pMax × diaphragm strength × the lung model's condition pMax (fatigue comes sooner in a weak patient).
import { CHRONIC_HCO3_PER_MMHG, NORMAL } from '../blood/params.ts'; // ONE reference (blood normal + chronic rule)
import { drive, pti, stepFatigue } from '../lung/drive.ts';
import { NO_FLOW_S } from '../circ/arrest.ts'; // The arrest declaration's no-flow window
import { DIAPH_APNOEA, DIAPH_EFFECTIVE, VT_EFFORT_ML_KG, type NeuroResp } from './drive.ts';

export const SPONT_DT_S = 1;
export const WINTER_SLOPE = 1.5;
export const WINTER_OFFSET = 8;
/** Spontaneous Ti/Ttot (the resp driver's SPONT_TI_FRACTION 0.38). */
const TI_FRAC = 0.38;
/**
 * Brainstem-perfusion gate. After the circulation stops, agonal gasps persist for seconds to ≈ 2 min, then apnoea;
 * after the circulation returns the drive comes back over minutes (Clark JJ et al., Ann Emerg Med 1992;21:1464–1467;
 * Bobrow BJ et al., Circulation 2008;118:2550–2554) [P]. The gate closes when the organ model's CBF is below
 * BRAINSTEM_CBF_MIN or there is no flow at all (pulseless / CO 0).
 */
export const BRAINSTEM_CBF_MIN = 0.2; // CBF < 20 % of rest (the ruling's threshold) [ENG]
export const GASP_ONSET_S = 30; // unperfused for > 30 s → gasps only [ENG, ruling]
export const GASP_END_S = 120; // gasps fade to apnoea by 2 min [ENG, ruling]
export const GASP_RR = 6; // gasp rate ceiling (/min) [ENG, ruling "RR ≤ 6"]
export const GASP_VT_FRAC = 0.3; // gasp VT ceiling × the resting VT ("small VT") [ENG]
export const GATE_REOPEN_S = 120; // the drive reopens linearly over 2 min once perfused [ENG, ruling "1–3 min"]
/**
 * The CO2 stimulus is partly CENTRAL (brain ECF PCO2, τ ≈ 60–150 s) and partly peripheral (carotid, fast): Dahan et al.
 * 1990 J Physiol 423:615 (dynamic end-tidal forcing: central τ ≈ 100 s, peripheral share ≈ 0.3) [TXT; τ 90 s ENG]. The
 * drive reads 0.3·PaCO2 + 0.7·Pc. At steady state Pc = PaCO2 (no change to any resting value).
 */
export const CENTRAL_TAU_S = 90;
export const PERIPH_SHARE = 0.3;
/**
 * The tidal-volume ceiling of the chemical drive — VT plateaus at 50–60 % of the vital capacity (Hey et al. 1966 Respir
 * Physiol 1:193), VC ≈ 60–70 mL/kg IBW → 35 mL/kg IBW, × fatigue (weakness stays nmbVtMult's) [ENG size].
 */
export const VT_MAX_ML_KG = 35;
/** A resting tidal volume per kg IBW, the size the weak diaphragm's cap reaches at DIAPH_EFFECTIVE (6–8 mL/kg [TXT: the
 * lung-protective range gas/params.ts already quotes]). */
export const VT_REST_ML_KG = 7;
const FADE_K = Math.log(VT_REST_ML_KG / VT_MAX_ML_KG) / Math.log((DIAPH_EFFECTIVE - DIAPH_APNOEA) / (1 - DIAPH_APNOEA));
/**
 * The tidal volume a partly blocked diaphragm can move in one SUSTAINED breath, mL — 35 mL (VT_EFFORT_ML_KG) at the
 * first effort, a resting VT at DIAPH_EFFECTIVE, the chemical ceiling at full strength (drive.ts DIAPH_EFFECTIVE). `nd`
 * (0–1, the non-depolarising share of the block) scales the exponent: no fade, no cap.
 */
export function diaphragmVtCapMl(strength: number, nd: number, ibwKg: number): number {
  const x = Math.min(1, Math.max(0, (strength - DIAPH_APNOEA) / (1 - DIAPH_APNOEA)));
  return ibwKg * Math.max(VT_EFFORT_ML_KG, VT_MAX_ML_KG * x ** (FADE_K * Math.min(1, Math.max(0, nd))));
}

export interface SpontDrive {
  rr: number; // < 0: not yet evaluated (driverCtx falls back to the rr/vt targets)
  vt: number;
  ve: number;
  fatigue: number; // 1 fresh → 0.3 exhausted
  paco2Rest: number; // resting PaCO2 of the MANUAL etco2 calibration (NaN until it runs)
  paco2Set: number;
  nextT: number;
  anoxS?: number; // Seconds without brainstem perfusion (absent while perfused)
  gate?: number; // 0 → 1 while the drive reopens after an anoxic spell (absent = open)
  pc?: number; // Central (brain) PCO2 the drive reads, mmHg (absent = PaCO2)
  plS?: number; // Seconds pulseless (absent while there is a pulse)
  effort?: number; // The neural inspiratory effort relative to rest (neural VT / resting VT); absent = 1
}

export function createSpontDrive(): SpontDrive {
  return { rr: -1, vt: 0, ve: 0, fatigue: 1, paco2Rest: Number.NaN, paco2Set: Number.NaN, nextT: 0 };
}

/** Winter's expected PaCO2 in metabolic acidosis (mmHg). */
export function winterPaco2(hco3: number): number {
  return WINTER_SLOPE * hco3 + WINTER_OFFSET;
}

/**
 * Metabolic alkalosis is compensated by hypoventilation — PaCO2 rises 0.7 mmHg per mmol/L HCO3 above normal (Javaheri
 * S, Kazemi H. Am Rev Respir Dis 1987;136:1011; Narins & Emmett 1980 "Boston rules"), rarely beyond 55 mmHg (the
 * hypoxaemic drive limits it). The reference is the blood model's normal HCO3 plus the chronic renal compensation the
 * patient's own resting PaCO2 implies (the blood model's CHRONIC_HCO3_PER_MMHG, tables §5b.1), plus a 0.1 mmol/L
 * deadband, so a compensated chronic hypercapnic profile is not read as a metabolic alkalosis and a resting patient is
 * exactly unchanged.
 */
export const ALK_SLOPE = 0.7;
export const ALK_PACO2_MAX = 55;
/** The branch opens only 0.1 mmol/L above the reference [ENG]: the blood model's resting HCO3 is 24.40045 at t = 0. */
export const ALK_DEADBAND = 0.1;
/**
 * Acute CO2 buffering, mmol/L HCO3 per mmHg PaCO2 (Brackett, Cohen & Schwartz 1965 NEJM 272:6; the blood model's own
 * 0.11–0.15).
 */
export const ACUTE_HCO3_PER_MMHG = 0.1;
/**
 * The chemoreflex set point: the resting PaCO2, lowered to Winter's value in metabolic acidosis, raised in metabolic
 * alkalosis. The alkalosis branch reads the METABOLIC bicarbonate — the measured HCO3 less the acute buffering of a
 * PaCO2 above the resting value (`paco2`, default the resting value) — so an acute hypercapnia (opioids, dead space) is
 * never read as a metabolic alkalosis that would lift the set point further; at rest the set point is unchanged.
 */
export function paco2SetPoint(paco2Rest: number, hco3: number, paco2 = paco2Rest): number {
  const ref = NORMAL.hco3 + CHRONIC_HCO3_PER_MMHG * Math.max(0, paco2Rest - NORMAL.paco2) + ALK_DEADBAND; // Blood-model values
  const met = hco3 - ACUTE_HCO3_PER_MMHG * Math.max(0, paco2 - paco2Rest);
  if (met > ref) return Math.max(paco2Rest, Math.min(ALK_PACO2_MAX, paco2Rest + ALK_SLOPE * (met - ref)));
  return Math.min(paco2Rest, winterPaco2(hco3));
}

export interface SpontInputs {
  t: number;
  paco2: number; // Arterial (the fast CO2 compartment)
  pao2: number;
  hco3: number; // blood.core.ab.hco3 (24 without the blood model)
  rr0: number; // instructor's rr/vt targets = the resting pattern
  vt0: number;
  co2SlopeMult: number; // The lung model's condition co2Slope (COPD)
  pMaxMult: number; // The lung model's condition pMax
  evlwi: number; // mL/kg (J-receptor term)
  complianceMl: number; // mL/cmH2O
  resistance: number; // cmH2O·s/L
  neuro?: NeuroResp;
  noFlow?: boolean; // No circulation (pulseless rhythm or cardiac output 0)
  pulseless?: boolean; // The engine's pulseless determination (pulseless flag or a no-beat rhythm)
  wakeMmHg?: number; // The patient's drawn wakefulness shift (resp pipeline; absent = WAKE_MMHG)
  cbfRel?: number; // organs.brain.cbfRel (absent without the organ model)
  ibwKg?: number; // The VT ceiling's size (absent = 70)
  setShift?: number; // mmHg subtracted from the resting set point (pregnancy's progesterone drive)
  airwayObs?: number; // The airway event's obstruction (1 = `obstructed`: laryngospasm, foreign body)
  jDrive?: number; // Acute PE severity (the lung's `pe` spec) — J-receptor drive
}

export function stepSpontDrive(s: SpontDrive, x: SpontInputs): void {
  if (x.t + 1e-9 < s.nextT) return;
  s.nextT = x.t + SPONT_DT_S;
  if (Number.isNaN(s.paco2Rest)) s.paco2Rest = x.paco2;
  s.paco2Set = paco2SetPoint(s.paco2Rest - (x.setShift ?? 0), x.hco3, x.paco2); // The pregnancy set point; the metabolic HCO3
  const n = x.neuro;
  s.pc = (s.pc ?? x.paco2) + (x.paco2 - (s.pc ?? x.paco2)) * (1 - Math.exp(-SPONT_DT_S / CENTRAL_TAU_S));
  const out = drive({
    paco2: PERIPH_SHARE * x.paco2 + (1 - PERIPH_SHARE) * s.pc, pao2: x.pao2, paco2Set: s.paco2Set, ve0: (x.rr0 * x.vt0) / 1000, co2SlopeMult: x.co2SlopeMult,
    opioidDep: n?.opioidDep ?? 0, hypnoticDep: n?.hypnoticDep ?? 0, pain: n?.pain ?? 0, evlwi: x.evlwi, vt0: x.vt0, rr0: x.rr0, // Pain
    wakeMmHg: x.wakeMmHg, // This patient's drawn wakefulness shift
    wake: n?.loc ?? 0, apnoeic: s.rr === 0,
    load: Math.max(n?.obstruction ?? 0, x.airwayObs ?? 0),
    hvrDep: n?.hvrDep ?? 0, jDrive: x.jDrive ?? 0,
  }, s.fatigue);
  const strength = n?.pMaxMult ?? 1;
  let { rr, vt } = out;
  // The neural VT has a ceiling; the effort is what the patient MAKES, the delivered VT what gets through
  vt = Math.min(vt, VT_MAX_ML_KG * (x.ibwKg ?? 70) * s.fatigue); // weakness is nmbVtMult's (below), not counted twice
  s.effort = rr > 0 && x.vt0 > 0 ? vt / x.vt0 : 0;
  if (strength < DIAPH_APNOEA) rr = vt = 0;
  else if (n) {
    vt *= n.nmbVtMult * (1 - Math.min(0.9, n.obstruction));
    // A fading (non-depolarising) block lets the diaphragm make efforts long before it can move a breath
    if ((n.diaNd ?? 0) > 0) vt = Math.min(vt, diaphragmVtCapMl(strength, n.diaNd ?? 0, x.ibwKg ?? 70));
  }
  // Brainstem-perfusion gate
  const unperfused = x.noFlow === true || (x.cbfRel !== undefined && x.cbfRel < BRAINSTEM_CBF_MIN);
  if (unperfused) s.anoxS = (s.anoxS ?? 0) + SPONT_DT_S;
  else if (s.anoxS !== undefined) {
    if (s.anoxS > GASP_ONSET_S) s.gate = 0; // a gasping or apnoeic brainstem recovers over GATE_REOPEN_S
    delete s.anoxS;
  }
  const anox = s.anoxS ?? 0;
  if (anox > GASP_ONSET_S) {
    const fade = Math.max(0, 1 - (anox - GASP_ONSET_S) / (GASP_END_S - GASP_ONSET_S));
    rr = Math.min(rr, GASP_RR * fade);
    vt = Math.min(vt, GASP_VT_FRAC * x.vt0 * fade);
    if (fade <= 0) rr = vt = 0;
  } else if (s.gate !== undefined) {
    if (!unperfused) s.gate = Math.min(1, s.gate + SPONT_DT_S / GATE_REOPEN_S);
    rr *= s.gate;
    if (s.gate >= 1) delete s.gate;
  }
  // The patient's inspiratory effort — spontaneous and ventilator-triggering — is withdrawn while the circulation is
  // PULSELESS (the engine's own determination: a pulseless rhythm flag or a no-beat rhythm, which covers an
  // instructor-commanded VF without an arrest state), ramped to zero over the arrest declaration's NO_FLOW_S window and
  // restored when the circulation returns.
  if (x.pulseless) s.plS = (s.plS ?? 0) + SPONT_DT_S;
  else if (s.plS !== undefined) delete s.plS;
  if (s.plS !== undefined) rr *= Math.max(0, 1 - s.plS / NO_FLOW_S);
  s.rr = rr;
  s.vt = vt;
  s.ve = (rr * vt) / 1000;
  if (rr > 0) {
    const ttot = 60 / rr;
    s.fatigue = stepFatigue(s.fatigue, pti(vt, x.complianceMl, x.resistance, TI_FRAC * ttot, ttot, strength * x.pMaxMult), SPONT_DT_S);
  }
}
