// E134: skeletal muscle energetics and injury — the body's own limits on anaerobic metabolism, and what sustained ATP
// debt or heat does to the muscle. One state for the WHOLE musculature (there is no per-bed anatomy here), driven by
// the blood model's oxygen deficit and by the thermal model's muscle activity (MH, shivering), read back by the blood
// model's lactate and potassium and by the heat model's anaerobic heat. NOT MH-specific: crush, ischaemia, status
// epilepticus and exertional rhabdomyolysis are the same mechanism with another driver.
//
//   glycolytic flux  = kAnaer·deficit · f_pH(pH) · f_glycogen(store) · (1 − injured)      (mmol lactate/min)
//     f_pH         the phosphofructokinase brake: the enzyme sees the INTRACELLULAR pH (pHi = pH + PHI_OFFSET), a
//                  logistic with PFK_PHI_HALF/PFK_PHI_W, normalised to 1 at the resting plasma pH (kAnaer is an
//                  in-vivo yield measured at a normal pH, so the brake is RELATIVE to it)
//     f_glycogen   1 while the store is above GLYCOGEN_LOW_MMOL_PER_KG, falling linearly to 0 at an empty store
//     injured      necrotic fibres make no lactate
//   heat           = flux · GLYCOLYSIS_HEAT_J_PER_MMOL / 60   (W; heat.ts adds it to the core)
//   CO2            = NET accumulation · LACTATE_CO2_ML_PER_MMOL  (mL/min; the bicarbonate buffering, pipeline.ts). Net,
//                  not gross: the 22 mL/mmol is the non-metabolic CO2 of bicarbonate buffering an ACCUMULATING lactic
//                  acid (Beaver 1986, incremental exercise). Clearing the lactate consumes the proton again and
//                  re-fixes that CO2, so a lactate at a plateau — production matched by clearance — releases none.
//   unpaid ATP     = deficit·(1 − f_pH·f_glycogen·(1 − injured))     (mL O2-equivalent/min the cell never gets)
//   injury dose    = ∫ (unpaid ATP · muscle share / resting muscle VO2) dt + the thermal dose (CEM43)
//   injured        = clamp((dose − INJ_TOL_DOSE_MIN)/(INJ_FULL_DOSE_MIN − INJ_TOL_DOSE_MIN))     (monotone)
//   K release      = Δinjured · muscle mass · MUSCLE_K_MMOL_PER_KG  (mmol into the ECF pool, out of the cells)
//   K of ACTIVE muscle = K_ACT_PER_VO2X · (muscle activity ÷ resting VO2)   (mmol/L of the K set point, core.ts)
//
// Why the tolerance DOSE and not a rate: muscle survives about three hours of warm ischaemia and is necrotic by six
// (Blaisdell, Labbe below), so ten minutes of no flow must injure nothing. A pure rate cannot do both. The dose also
// explains the three hours without a constant for it: for the first hour anaerobic glycolysis pays the resting bill
// (dose rate ≈ 0), and the dose only runs once the pH/glycogen brake has closed.
import { K_ANAER } from './params.ts';

/**
 * Skeletal muscle mass as a fraction of body weight: men 38.4 % (33.0 kg of 86 kg), women 30.6 % (21.0 kg of 69 kg) —
 * whole-body MRI in 468 adults (Janssen I, Heymsfield SB, Wang Z, Ross R, J Appl Physiol 2000;89:81–88) [S: the
 * paper's values as quoted in a review; the abstract was not re-read].
 */
export const MUSCLE_MASS_FRAC_M = 0.384;
export const MUSCLE_MASS_FRAC_F = 0.306;
/**
 * Resting muscle glycogen, mmol glucosyl per kg WET weight: 80–90 in untrained adults on a mixed diet, ≈ 125 trained
 * (Hawley JA, Schabort EJ, Noakes TD, Dennis SC, Sports Med 1997;24:73–81) [S: via a 2016 review; the primary was not
 * read]. The centre 85 is taken. Mind the scale: the biopsy literature usually reports mmol/kg DRY weight, ≈ 4.3 ×
 * these numbers.
 */
export const GLYCOGEN_MMOL_PER_KG = 85;
/**
 * The store below which glycolytic flux falls, mmol glucosyl per kg wet: 28 mmol/kg dry weight is where prolonged
 * exercise ends in fatigue (dry → wet ÷ 4.3 = 6.5) [S]. ABOVE it the store does not limit the flux — with resting
 * glycogen 257 against 611 mmol/kg dry mass, net glycogenolysis in the first ten minutes of exercise was no different
 * (Gibala MJ et al. 2002) [S]; what limits the flux earlier is the H+ brake below.
 */
export const GLYCOGEN_LOW_MMOL_PER_KG = 6.5;
/** Glycogen resynthesis with NO carbohydrate intake: 1–2 mmol/kg wet weight per hour, from gluconeogenesis (Maehlum S,
 *  Hermansen L, Scand J Clin Lab Invest 1978;38:557–560) [S]; the centre 1.5 is taken. */
export const GLYCOGEN_REFILL_MMOL_PER_KG_H = 1.5;
/** Glycogenolysis to lactate: one glucosyl unit gives 2 lactate and 3 ATP (so 1.5 ATP per lactate). */
export const LACTATE_PER_GLUCOSYL = 2;
export const ATP_PER_LACTATE = 1.5;
/**
 * The phosphofructokinase pH brake (Trivedi B, Danforth WH, J Biol Chem 1966;241:4110–4114 [P: the article's Figs 1–2
 * were read for this change]). Frog and mouse muscle extracts at 4 mM ATP: activity goes from ≈ 0 to its plateau over
 * 0.3–0.4 pH units, and the MIDPOINT moves about one pH unit with the fructose-6-phosphate concentration — pH 7.44 at
 * 0.054 mM F6P, 7.0 at 0.11 mM, ≈ 6.6 at 0.434 mM. The high-F6P row is the one that belongs here: a muscle driven to
 * its glycolytic maximum accumulates F6P (the authors' own argument that a loss of F6P affinity does not by itself
 * slow the flux), and the in-vivo floor agrees — whole-muscle 31P-MRS pHi in exercise to intolerance stops falling at
 * 6.6–6.8 [S], which is where the flux has stopped. The width 0.1 is the figures' own steepness. At ATP 0.125 mM the
 * pH sensitivity disappears altogether, so this brake is a property of muscle at physiological (mM) ATP.
 * Expressed on pHi; on the PLASMA pH the half is 6.92 (= 6.6 − PHI_OFFSET), inside the 6.9–7.0 the brief states.
 * KNOWN DEVIATION: phosphorylase is inhibited by H+ as well (Spriet LL et al. 1989) [S] — one brake stands for both.
 */
export const PFK_PHI_HALF = 6.6;
export const PFK_PHI_W = 0.1;
/**
 * Muscle intracellular pH at rest, 31P-MRS of the quadriceps: 7.08 ± 0.03 at a plasma pH of 7.40 [S], i.e. an offset
 * of −0.32. The engine moves pHi with the plasma pH one for one, which is right when the cell is making the acid
 * itself (shock, MH, arrest — every case that reaches this brake) and WRONG for an acid–base change imposed from
 * outside: at rest pHi is defended against a bicarbonate load (blood pH and HCO3 rose, muscle pH did not [S]), and a
 * CO2 load moves pHi the other way. So a bicarbonate dose releases this brake more than it should (known deviation).
 */
export const PH_PLASMA_REST = 7.4;
export const PHI_OFFSET = 7.08 - PH_PLASMA_REST;
/**
 * The heat of anaerobic ATP turnover, J per mmol of lactate made from glycogen. The primary quantity is per ATP:
 * 35 kJ/mol for PCr hydrolysis, 65 for glycolysis and 72 for oxidation (Curtin NA, Woledge RC, Physiol Rev
 * 1978;58:690–761; Woledge RC, Reilly PJ, Biophys J 1988;54:97–104), as used with the same 1.5 ATP per lactate by
 * González-Alonso J, Quistorff B, Krustrup P, Bangsbo J, Saltin B, J Physiol 2000;524:603–615 [P: that paper's methods
 * were read for this change; the two older papers are second-hand]. Krustrup P et al., J Physiol 2003;549:255 use 67
 * and give the published range 65–78 kJ/mol ATP. 65 × 1.5 = 98 J per mmol lactate (the range gives 98–117). DERIVED:
 * no paper states a per-lactate enthalpy. It already includes the proton transfer to the cell's buffers (that is why
 * Woledge & Reilly's PCr value is −35 and not −44 kJ/mol). Di Prampero's O2 equivalent of blood lactate (≈ 3 mL
 * O2/kg per mmol/L) is a DIFFERENT quantity (whole-body, accumulation) and is not used here.
 */
export const GLYCOLYSIS_HEAT_J_PER_MMOL = 98;
/**
 * Potassium of ACTIVE muscle: mmol/L of the plasma K set point per × of the resting whole-body VO2 that the muscle's
 * activity adds. Twenty trained men ran one minute to exhaustion with femoral catheters: arterial K peaked at 8.17 ±
 * 0.29 mmol/L and femoral venous at 8.34, from ≈ 4.2 (Medbø JI, Sejersted OM, J Physiol 1990;421:105–122 [P: abstract
 * and the reachable text]); the peak was linearly related to the exercise intensity, though the paper gives no slope.
 * Δ ≈ +4.0 mmol/L at an intensity of about × 12 the resting VO2 → 0.36 per ×. DERIVED, and an UPPER bound: that is a
 * one-minute peak with almost no time for re-uptake, while this term is a steady-state set-point shift (after exercise
 * the same subjects undershot by 0.5 mmol/L on a stimulated pump). It replaces the fitted MH_K_EFFLUX 2.35 mmol/L at
 * activity 1, which was 6.5 × larger because it had to carry the rhabdomyolysis the model did not have.
 */
export const K_ACT_PER_VO2X = 0.36;
/** Muscle intracellular potassium, mmol per kg wet weight: ICF K ≈ 140 mmol/L of cell water × 0.75 L water/kg [TXT]. */
export const MUSCLE_K_MMOL_PER_KG = 100;
/** Muscle creatine kinase, myoglobin and total phosphate per kg wet weight — released by necrosis and kept as STATE
 *  only (no display, no effect; the phosphate does not enter the acid–base yet) [VERIFY: orders of magnitude]. */
export const MUSCLE_CK_U_PER_KG = 2.5e6;
export const MUSCLE_MB_MG_PER_KG = 4000;
export const MUSCLE_PI_MMOL_PER_KG = 60;
/** The muscle's share of the resting VO2 [TXT: ≈ 20 % of resting oxygen uptake at rest] — the clock the injury dose
 *  is measured against (one "dose minute" = one minute with the whole resting muscle bill unpaid). */
export const MUSCLE_REST_VO2_FRAC = 0.2;
/**
 * The unpaid-ATP dose at which necrosis begins and at which it is complete, in dose minutes. Warm ischaemia of
 * skeletal muscle: irreversible change after about three hours, severe or complete by six (Blaisdell FW, Cardiovasc
 * Surg 2002;10:620–630; Labbe R, Lindsay T, Walker PM, J Vasc Surg 1987;6:152–157) [S: reviews, not re-read]. The
 * first hour of that is paid for by anaerobic glycolysis, which this model produces on its own, so the dose that is
 * left runs from ≈ 120 to ≈ 300 dose minutes.
 */
export const INJ_TOL_DOSE_MIN = 120;
export const INJ_FULL_DOSE_MIN = 300;
/**
 * Thermal injury on the same tolerance: the cumulative equivalent minutes at 43 °C, CEM43 = Σ R^(43−T)·dt with
 * R = 0.5 above 43 °C and 0.25 below (Sapareto SA, Dewey WC, Int J Radiat Oncol Biol Phys 1984;10:787–800) [S]. The
 * threshold CEM43_MUSCLE_MIN is derived from the human critical thermal exposure, 42 °C for about 45 min (Bynum GD et
 * al., Am J Physiol 1978;235:R228) [S]: 45 × 0.25 = 11 CEM43 minutes. Rather than a second damage curve, the thermal
 * dose consumes the SAME tolerance (one insult, two clocks), scaled so that 11 CEM43 minutes alone reach it.
 */
export const CEM43_R_HOT = 0.5;
export const CEM43_R_COLD = 0.25;
export const CEM43_MUSCLE_MIN = 11;
/** The dose model is calibrated around 43 °C and says nothing about normothermia, so no thermal dose is counted below
 *  this core temperature — otherwise an ordinary 37 °C day would creep toward necrosis [ENG guard: a febrile 39 °C for
 *  two hours is 1.9 CEM43 minutes, well under the threshold, so the guard only removes the meaningless tail]. */
export const CEM43_FROM_C = 38;

export interface MuscleRelease {
  kMmol: number; // cumulative K released by necrosis (mmol)
  ckU: number; // state only
  mbMg: number; // state only
  piMmol: number; // state only
}

export interface MuscleState {
  massKg: number;
  glycogenMmol: number; // glucosyl units left in the whole musculature
  glycogen0Mmol: number; // the resting store (the refill target)
  injured: number; // 0–1 of the muscle mass, necrotic; monotone (no repair within a case)
  cem43Min: number; // cumulative thermal dose, equivalent minutes at 43 °C
  doseMin: number; // cumulative unpaid-ATP dose (+ the thermal dose's share), dose minutes
  release: MuscleRelease;
  kHandedMmol: number; // of release.kMmol, what the blood pool has already taken
  /** Published each step for the other modules: the braked anaerobic lactate production (mmol/min), its heat (W) and
   * the unpaid ATP (mL O2-equivalent/min). */
  lacMmolMin: number;
  /** The NET rate the lactate pool is accumulating at (mmol/min, ≥ 0; production minus clearance, written by the blood
   * core after its lactate step) — the only part that releases buffered CO2. */
  lacNetMmolMin: number;
  anaerW: number;
  unpaidMlMin: number;
}

export function createMuscle(weightKg: number, female: boolean): MuscleState {
  const massKg = (female ? MUSCLE_MASS_FRAC_F : MUSCLE_MASS_FRAC_M) * weightKg;
  const g0 = GLYCOGEN_MMOL_PER_KG * massKg;
  return {
    massKg, glycogenMmol: g0, glycogen0Mmol: g0, injured: 0, cem43Min: 0, doseMin: 0,
    release: { kMmol: 0, ckU: 0, mbMg: 0, piMmol: 0 }, kHandedMmol: 0, lacMmolMin: 0, lacNetMmolMin: 0, anaerW: 0, unpaidMlMin: 0,
  };
}

/** Muscle intracellular pH at a plasma pH (the enzyme's own pH). */
export const pHi = (ph: number): number => ph + PHI_OFFSET;

/** The phosphofructokinase brake 0–1 at a plasma pH, normalised to 1 at the resting plasma pH. */
export function pfkFactor(ph: number): number {
  const f = (p: number) => 1 / (1 + Math.exp(-(pHi(p) - PFK_PHI_HALF) / PFK_PHI_W));
  return Math.min(1, f(ph) / f(PH_PLASMA_REST));
}

/** The substrate brake 0–1: the store above GLYCOGEN_LOW does not limit the flux. */
export function glycogenFactor(st: MuscleState): number {
  const low = GLYCOGEN_LOW_MMOL_PER_KG * st.massKg;
  return Math.min(1, Math.max(0, st.glycogenMmol / Math.max(1e-9, low)));
}

/** The whole anaerobic factor 0–1 on the oxygen deficit's lactate: pH × substrate × the surviving muscle. */
export function anaerobicFactor(st: MuscleState | null | undefined, ph: number): number {
  if (!st) return 1;
  return pfkFactor(ph) * glycogenFactor(st) * (1 - st.injured);
}

export interface MuscleInputs {
  ph: number; // plasma pH
  tempC: number; // core temperature (the only muscle temperature the engine has; real MH muscle runs hotter)
  deficitMlMin: number; // the blood model's lactate deficit (mL O2/min of unmet demand)
  factor: number; // `anaerobicFactor` at this step (so the brake is applied once)
  activityMlMin: number; // muscle activity above rest, mL O2/min (the MH rate + shivering)
  restVo2MlMin: number; // the patient's resting whole-body VO2, mL/min
  demandMlMin: number; // the whole VO2 demand, mL/min
}

/**
 * One step (dtS ≤ 1 s). Returns the potassium (mmol) the blood pool must take from the cells this step; the state
 * carries the rest.
 */
export function stepMuscle(st: MuscleState, x: MuscleInputs, dtS: number): number {
  const dtM = dtS / 60;
  const lac = K_ANAER * Math.max(0, x.deficitMlMin) * Math.max(0, Math.min(1, x.factor));
  st.lacMmolMin = lac;
  st.anaerW = (lac * GLYCOLYSIS_HEAT_J_PER_MMOL) / 60;
  // substrate: glycogenolysis spends it, gluconeogenesis refills it slowly
  const refill = GLYCOGEN_REFILL_MMOL_PER_KG_H * st.massKg * (dtM / 60);
  st.glycogenMmol = Math.min(st.glycogen0Mmol, Math.max(0, st.glycogenMmol - (lac / LACTATE_PER_GLUCOSYL) * dtM + refill));
  // the ATP the cell never gets, and the muscle's share of it
  const unpaid = Math.max(0, x.deficitMlMin) * (1 - Math.max(0, Math.min(1, x.factor)));
  st.unpaidMlMin = unpaid;
  const restMuscle = MUSCLE_REST_VO2_FRAC * x.restVo2MlMin;
  const share = x.demandMlMin > 0 ? Math.min(1, (restMuscle + Math.max(0, x.activityMlMin)) / x.demandMlMin) : 0;
  st.doseMin += ((unpaid * share) / Math.max(1e-9, restMuscle)) * dtM;
  // the thermal dose consumes the same tolerance (CEM43, scaled so CEM43_MUSCLE_MIN alone reaches it)
  const cem = x.tempC >= CEM43_FROM_C ? Math.min(1e6, (x.tempC > 43 ? CEM43_R_HOT : CEM43_R_COLD) ** (43 - x.tempC)) * dtM : 0;
  st.cem43Min += cem;
  st.doseMin += cem * (INJ_TOL_DOSE_MIN / CEM43_MUSCLE_MIN);
  const want = Math.min(1, Math.max(0, (st.doseMin - INJ_TOL_DOSE_MIN) / (INJ_FULL_DOSE_MIN - INJ_TOL_DOSE_MIN)));
  if (want > st.injured) {
    const d = want - st.injured;
    st.injured = want;
    st.release.kMmol += d * st.massKg * MUSCLE_K_MMOL_PER_KG;
    st.release.ckU += d * st.massKg * MUSCLE_CK_U_PER_KG;
    st.release.mbMg += d * st.massKg * MUSCLE_MB_MG_PER_KG;
    st.release.piMmol += d * st.massKg * MUSCLE_PI_MMOL_PER_KG;
  }
  const hand = st.release.kMmol - st.kHandedMmol;
  st.kHandedMmol = st.release.kMmol;
  return hand;
}

/** The K set-point shift of ACTIVE (not injured) muscle, mmol/L. */
export function muscleActivityKShift(st: MuscleState | null | undefined, activityMlMin: number, restVo2MlMin: number): number {
  if (!(restVo2MlMin > 0)) return 0;
  return K_ACT_PER_VO2X * (Math.max(0, activityMlMin) / restVo2MlMin) * (1 - (st?.injured ?? 0));
}
