// Respiratory drive, work of breathing and fatigue for SPONTANEOUS breathing (tables §4.6, Q36, Q9). Pure functions
// plus one small state (fatigue). Consumed by the resp pipeline in MODELED mode only (MANUAL keeps the rr/vt targets).
//   VE = [S·(PaCO2 − B)]₊ · H(PaO2) · (1 − Dep_opioid) · (1 − Dep_hypnotic) · F + VE_pain + J-receptor term
//   H(PaO2) = 1 + A/(PaO2 − 32) − A/68 (Weil 1970 form, A = hvrA 25 mmHg): ×1.5 at PaO2 60, ×2.6 at 45
//   B = PaCO2_set − VE0/S (apnoeic threshold ≈ 4 below resting PaCO2)
//   pattern: opioid → RR falls first (VT kept); hypnotic → VT falls, RR rises
//   PTI = (P_breath/P_max)·(Ti/Ttot); PTI > 0.15 → fatigue F falls (≈ 45 min to failure), RR ↑, VT ↓
export const CO2_SLOPE = 1.5; // L/min/mmHg (Q36; 1.60 ± 0.19)
export const APNOEA_OFFSET = 4; // mmHg below resting PaCO2 (Q36)
export const HVR_A = 25; // mmHg (Weil form constant, [ENG] Q36)
export const PTI_CRIT = 0.15; // Bellemare & Grassino 1982 (Q36)
export const P_MAX_CMH2O = 90; // 80–100
export const FATIGUE_TAU_S = 45 * 60;
export const PAIN_GAIN = 0.3; // +20–40 % at noxious 1, not anaesthetised [ENG]
export const J_RR_PER_EVLWI = 1.5; // RR +4–10 at EVLWI > 10 → +1.5/min per mL/kg above 10 [ENG]
/**
 * FU-6 R3(a): the wakefulness drive. Awake, breathing continues below the resting PaCO2 (Fink 1961 J Appl Physiol
 * 16:15); unconscious it stops a few mmHg below the ANAESTHETISED resting PaCO2 (Nunn 9e ch. 5: apnoeic threshold
 * 0.3–0.5 kPa below it; anaesthetised resting PaCO2 45–50). Loss of consciousness therefore raises the threshold B by
 * WAKE_MMHG (B = set − VE0/S = set − 5 awake → set + 3 unconscious) [ENG size, directions sourced; sourced range
 * 7–10 (threshold 2–5 mmHg above the awake resting PaCO2); fit target: test/engine/resp-induction.test.ts bands].
 */
export const WAKE_MMHG = 8;
/**
 * FU-6 R3(a): a neural drive below 10 % of the resting VE produces no breath (apnoea); breathing resumes above 15 %
 * (hysteresis, as 7f's MANUAL APNOEA_IN/OUT 0.42/0.5 of resting VE) [ENG]. Was an absolute 0.2 L/min, which a
 * depressed drive never reached: the RR floor of 4/min kept VE at 0.4–0.9 L/min after propofol + opioid.
 */
export const APNOEA_VE_IN = 0.1;
export const APNOEA_VE_OUT = 0.15;
/**
 * FU-6 F7 (Orchestrator ruling (FU-6 review), 2026-09-28): induction apnoea is PROBABILISTIC, as in patients. The
 * Diprivan label (propofol 2–2.5 mg/kg, unpremedicated adults): apnoea < 30 s in 7 %, 30–60 s in 24 %, > 60 s in 12 % —
 * 43 % overall, the modal apnoea 30–60 s. The patient-to-patient spread of the wakefulness shift (and of the CO2
 * sensitivity and hypnotic sensitivity it stands in for) is ONE seeded draw per patient: u ~ U(0, 1) from the engine's
 * own 'resp-wake' stream (resp pipeline, `createRespState`) → this quantile table → the patient's shift in mmHg
 * [ENG knots; fit target: the label's bands, measured on the 20-seed row of test/engine/resp-induction.test.ts].
 * u < 0.57 → no apnoea (the drive stays above its raised threshold); 0.57–0.64 → < 30 s; 0.64–0.88 → 30–60 s (the
 * mode, ≈ 45 s at its middle); 0.88–1 → > 60 s. Without a draw (unit tests, pre-FU-6 snapshots) WAKE_MMHG applies.
 * Re-fitted by the FU-6 executor on the merged main (FU-4 R1 root + V.1), the sweep on the 20-seed row's rig (SGA,
 * FiO2 0.5, propofol 2 mg/kg, seed 7 with the shift pinned): 0 s up to 7.3 mmHg, 30 s at 8.2, 60 s at 10.0, 110 s at
 * 13.3 (the plan's R1-emulated knots were 6.6 / 8.4 / 11 / 14.5).
 */
export const WAKE_QUANTILES: ReadonlyArray<readonly [number, number]> = [[0, 2], [0.57, 7.3], [0.64, 8.2], [0.88, 10.0], [1, 13.3]];
export function wakeShiftMmHg(u: number): number {
  let [u0, w0] = WAKE_QUANTILES[0] as readonly [number, number];
  for (const [u1, w1] of WAKE_QUANTILES.slice(1)) {
    if (u <= u1) return w0 + ((w1 - w0) * (Math.max(u0, u) - u0)) / (u1 - u0);
    [u0, w0] = [u1, w1];
  }
  return w0;
}

export interface DriveInputs {
  paco2: number; pao2: number; paco2Set: number; ve0: number; // resting PaCO2 and VE (L/min)
  co2SlopeMult: number; // COPD grade (conditions `co2Slope`)
  opioidDep: number; hypnoticDep: number; // 0–1 (7f supplies them; 0 until then)
  pain: number; // 0–1
  evlwi: number;
  vt0: number; rr0: number; // resting pattern
  wake?: number; // FU-6 R3(a): 0 awake … 1 unconscious (the wakefulness drive lost); absent = awake
  wakeMmHg?: number; // FU-6 F7: this patient's drawn wakefulness shift (wakeShiftMmHg); absent = WAKE_MMHG
  apnoeic?: boolean; // FU-6 R3(a): the last evaluation was apnoeic (hysteresis)
  load?: number; // FU-6 R3(b): 0–1 inspiratory (upper-airway) obstruction the effort works against; absent = 0
}
export interface DriveOut { ve: number; rr: number; vt: number }

export function hypoxicFactor(pao2: number): number {
  return Math.min(4, 1 + HVR_A / Math.max(1, pao2 - 32) - HVR_A / 68); // capped ×4 near PaO2 40 [ENG]
}

/** Minute ventilation and its split. Returns rr 0 (apnoea) when the CO2 drive is below threshold. */
export function drive(x: DriveInputs, fatigue = 1): DriveOut {
  const s = CO2_SLOPE * x.co2SlopeMult;
  const b = x.paco2Set - x.ve0 / s + (x.wakeMmHg ?? WAKE_MMHG) * (x.wake ?? 0); // FU-6 R3(a); F7: the patient's draw
  const chem = Math.max(0, s * (x.paco2 - b)) * hypoxicFactor(x.pao2);
  let ve = chem * (1 - x.opioidDep) * (1 - x.hypnoticDep) * fatigue;
  if (ve > 0) ve *= 1 + PAIN_GAIN * x.pain;
  if (ve <= Math.max(0.2, (x.apnoeic ? APNOEA_VE_OUT : APNOEA_VE_IN) * x.ve0)) return { ve: 0, rr: 0, vt: 0 }; // FU-6 R3(a)
  // split: opioids slow the rate, hypnotics shrink the tidal volume; fatigue → rapid shallow
  const rrF = (1 - 0.7 * x.opioidDep) * (1 + 0.5 * x.hypnoticDep) * (1 + 0.6 * (1 - fatigue));
  // FU-6 R3(b): against an inspiratory load the extra drive goes into effort (VT), not rate — load compensation
  // (Zechman, Hall & Hull 1957 J Appl Physiol 10:356: resistive loading slows RR and deepens the breath)
  const q = ve / x.ve0; // a depressed drive slows the rate as before; only the RISE is suppressed by the load
  const rr = Math.max(4, Math.min(45, x.rr0 * rrF * (q < 1 ? Math.sqrt(q) : q ** (0.5 * (1 - (x.load ?? 0)))) + J_RR_PER_EVLWI * Math.max(0, x.evlwi - 10)));
  return { ve, rr, vt: (ve * 1000) / rr };
}

/** Pressure–time index of a spontaneous breath (VT mL, C mL/cmH2O, R cmH2O·s/L, Ti/Ttot). */
export function pti(vt: number, c: number, r: number, ti: number, ttot: number, pMaxMult = 1): number {
  const pBreath = vt / Math.max(1, c) + r * (vt / 1000 / Math.max(0.2, ti));
  return (pBreath / (P_MAX_CMH2O * pMaxMult)) * (ti / Math.max(0.5, ttot));
}

/** Fatigue F (1 fresh → 0.3 exhausted): falls while PTI > PTI_CRIT, recovers with the same τ below it. */
export function stepFatigue(f: number, ptiNow: number, dt: number): number {
  const target = ptiNow > PTI_CRIT ? Math.max(0.3, 1 - 4 * (ptiNow - PTI_CRIT)) : 1;
  return f + (target - f) * (1 - Math.exp(-dt / FATIGUE_TAU_S));
}
