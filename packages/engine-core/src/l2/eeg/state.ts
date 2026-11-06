// EEG stage E1: the cortical state — the drug bus and the physiology mapped onto a handful of mechanism-named variables
// (docs/plans/stage-eeg-depth-of-anaesthesia.md §7 E1, D1; numbers from research/43-eeg-sources-review.md where it gives
// a source). Pure functions; nothing here is wired into the pipeline (D4: the EEG runs only while an EEG device is on,
// E6) and nothing here is read by physiology (D7). Ch36 = Miller 10th ed. chapter 36, Ch35 = chapter 35, printed pages.
//   hyper = (gabaIv + barbiturate + etomidate + benzo)/Ce50prop(age) + (sevo + iso + des MAC) + alpha2Eq
//   lor   = (the same IV load)/LOCprop(age) + ether MAC/MAC_awake + dexmedetomidine ng/mL ÷ DEXMED_LOR_NG_ML
//   suppress = 1 − (1 − drug)·(1 − metabolic voltage loss)·(1 − hypothermic suppression)
// Neural inertia (Ch36 p. 1142, P-4): none beyond the drug layer's effect sites [ENG, plan default 0; for propofol
// supported by Kuizenga 2018 — induction and recovery C50 not different]; sevoflurane's hysteresis exists (same paper)
// but its size was not retrieved, so it is not modelled.
import type { DrugBus } from '../../types-pk.ts';
import type { AgentMix, CortexInputs, CortexState } from '../../types-eeg.ts';
import { caO2 } from '../brain/flow.ts';
import { ce50Propofol, locPropofol } from '../neuro/depth.ts';
import { DEXMED_EEG_C50_NG_ML } from '../pk/combine.ts';
import { MAC_AWAKE } from '../pk/volatile.ts';

// --- hyperpolarisation, loss of responsiveness, the alpha-to-delta shift (Ch36 pp. 1142–1144) ---
/** Dexmedetomidine plasma level at which one patient stopped responding to voice with an alpha–delta pattern, ng/mL
 * (Miller Ch36 p. 1144, Fig. 36.9: 2.09 ng/mL; one patient, so the LOR anchor only, not a C50). */
export const DEXMED_LOR_NG_ML = 2.09; // ng/mL
/** The alpha-to-delta shift: sevoflurane "above ≈ 1.7 %" (Miller Ch36 p. 1143) ÷ the engine's sevoflurane MAC40 1.80 %
 * (Mapleson 1996, pk/volatile.ts) = 0.944 MAC [INF: the % is read at 40 y]. In `hyper` units (1 MAC = 1). */
export const DEEP_ONSET = 1.7 / 1.8; // MAC (state.test.ts checks 1.8 against AGENTS.sevoflurane.mac40)

// --- burst suppression: research/43 P-1 (the owner's Q5 ruling), Ch36 p. 1141, Ch35 Table 35.1 p. 1107 ---
/** Onset (50 % of adults show a first ≥ 1 s silent second) in AGE-ADJUSTED MAC: isoflurane 1.3 (Pilge 2014, = Miller
 * Ch36 p. 1141 "about 30 % more" than immobility; Ch36 ref 50). */
export const BS_ONSET_ISO_MAC = 1.3;
/** Sevoflurane onset 1.4 MAC (Pilge 2014: "> 1.4-fold" MAC; 2.9 vol %). On the engine's MAC40 1.80 % the same 2.9 vol %
 * would be 1.61 MAC — the paper's own MAC ratio is used. */
export const BS_ONSET_SEVO_MAC = 1.4;
/** Desflurane onset ≈ 1.25 MAC [INF from Rampil 1991: "prominent burst suppression at 1.24 MAC and higher", so onset is at
 * or below it; Hoffman 1995 equates desflurane with isoflurane at equal age-adjusted MAC]. */
export const BS_ONSET_DES_MAC = 1.25;
/** An ESTABLISHED burst-suppression pattern at ≈ 1.5 MAC, every ether (Miller Ch35 Table 35.1 "> 1.5 MAC"; Ch10 p. 188
 * isoflurane "∼1.5 MAC"). */
export const BS_ESTABLISHED_MAC = 1.5;
/** NEAR-ISOELECTRIC at ≈ 2.0 MAC, every ether (Miller Ch10 p. 205 "1.5 to 2 MAC", maximal CMR fall; Kaisti 1999 still
 * bursting at 2 MAC sevoflurane, so full silence is at or above it [INF]). */
export const BS_NEAR_ISO_MAC = 2.0;
/** Suppression (fraction of time suppressed) at the established point [ENG: the mid-point of the curve; the shape
 * between the anchors is not in the sources — research/43 "INF on the shape"]. */
export const SUPP_ESTABLISHED = 0.5;
/** Suppression at the near-isoelectric point [ENG: "near" silence read as 90 % of the time suppressed]. */
export const SUPP_NEAR_ISO = 0.9;
/** Full suppression (isoelectric), MAC [ENG: the 2.0 → 1 slope continued, 0.5 MAC past the near-isoelectric point]. */
export const BS_ISOELECTRIC_MAC = 2.5;
/** Propofol(-equivalent) onset, ng/mL: CP50_BS 4.9 µg/mL (Pilge 2014; Miller Ch36 p. 1141 "about 5 mcg/mL"). Thiopental
 * and etomidate at the same propofol-equivalent [INF]; not age-adjusted (the source gives a concentration). */
export const BS_ONSET_PROP_NG_ML = 4900; // ng/mL

// --- ischaemia, hypoxia (Ch35 pp. 1105, 1122, 1126) and hypothermia (Ch35 p. 1127; Stecker 2001) ---
/** The EEG turns abnormal at CBF 20 of 50 mL/100 g/min (Miller Ch35 p. 1122) — read as O2 DELIVERY relative to normal,
 * so hypoxaemia acts only once flow compensation is exhausted (Ch35 p. 1126) [INF]. */
export const DO2_EEG_ABNORMAL = 20 / 50;
/** Cellular survival threatened at CBF 12 mL/100 g/min (Miller Ch35 p. 1122): the voltage is gone. */
export const DO2_EEG_LOST = 12 / 50;
/** The share of `metabolic` that only slows (voltage preserved) before the voltage goes (Ch35 p. 1105: "first slowing
 * with preserved voltage, then loss of voltage") [ENG: half]. */
export const METABOLIC_SLOW_SHARE = 0.5;
/** Hypothermic burst suppression appears at 24.4 °C (Stecker 2001, 109 patients, mean nasopharyngeal ± 4 °C). */
export const BS_TEMP_ONSET_C = 24.4; // °C
/** Electrocerebral silence at 17.8 °C (Stecker 2001; Miller Ch35 p. 1127 "complete suppression usually at 15–18 °C"). */
export const BS_TEMP_SILENT_C = 17.8; // °C
/** Hypothermic slowing starts at normothermia [ENG: linear from 37 °C to the burst-suppression temperature; Ch35 p. 1127
 * gives a close correlation with temperature, no shape]. */
export const COLD_SLOW_FROM_C = 37; // °C

// --- ketamine, N2O, opioids, arousal (Ch36 pp. 1141, 1144–1145) ---
/** The N2O transient's trigger: a step to ≥ 50 % inspired (Pavone 2016, Ch36 ref 86) ≈ 0.5 MAC [INF: N2O MAC ≈ 104 %].
 * A step of this size saturates the transient. */
export const N2O_TRIGGER_MAC = 0.5;
/** Its duration: the slow-delta lasted median 3 min (2–12) (Pavone 2016) — the cortex adapts to the new N2O level with
 * τ = 3 min. The amplitude of the transient is [ENG] (spectra.ts). */
export const N2O_TRANSIENT_TAU_S = 180;
/** Opioid alone above 8 ng/mL fentanyl-eq raises delta and lowers the median frequency (Miller Ch36 p. 1144). */
export const OPIOID_EEG_FENT_NG_ML = 8; // ng/mL

// --- age (Ch36 p. 1145; research/43 P-7) ---
/** The age span the age terms run over: Purdon 2015's cohort, 18–90 y. Below 18 the adult value (P-3: children's
 * amplitude factor × 1 [ENG] — Miller says "much higher", with no number). */
export const AGE_YOUNG_Y = 18;
/** The upper end of the age span: Purdon 2015's oldest patients, 90 y. */
export const AGE_OLD_Y = 90;
/** The slope flattens by ≈ 20 % with age (Miller Ch36 p. 1145; Kreuzer 2020, Ch36 ref 95) — reached at AGE_OLD_Y [INF]. */
export const AGE_SLOPE_FLATTEN = 0.2;
/** Amplitude × 0.4 at AGE_OLD_Y (Purdon 2015, Ch36 ref 94: the elderly's oscillations "≈ 2–3-fold smaller", i.e. × 0.33–0.5;
 * 0.4 inside it), linear in age [INF]. */
export const AGE_AMP_OLD = 0.4;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** The age terms at `ageY`: slope factor and amplitude factor (both 1 at AGE_YOUNG_Y and below). */
export function ageFactors(ageY: number): { slope: number; amp: number } {
  const f = clamp01((ageY - AGE_YOUNG_Y) / (AGE_OLD_Y - AGE_YOUNG_Y));
  return { slope: 1 - AGE_SLOPE_FLATTEN * f, amp: 1 - (1 - AGE_AMP_OLD) * f };
}
const ETHERS = ['sevoflurane', 'isoflurane', 'desflurane'] as const;
const ONSET: Record<(typeof ETHERS)[number], number> = { sevoflurane: BS_ONSET_SEVO_MAC, isoflurane: BS_ONSET_ISO_MAC, desflurane: BS_ONSET_DES_MAC };

/** Suppression (0–1) at a suppressing load `m` in MAC-equivalents, onset `o`: 0 → o, linear to the established and the
 * near-isoelectric anchors, 1 at BS_ISOELECTRIC_MAC [ENG piecewise-linear shape between sourced anchors]. */
export function suppressionCurve(m: number, o: number): number {
  if (m <= o) return 0;
  if (m <= BS_ESTABLISHED_MAC) return (SUPP_ESTABLISHED * (m - o)) / (BS_ESTABLISHED_MAC - o);
  if (m <= BS_NEAR_ISO_MAC) return SUPP_ESTABLISHED + ((SUPP_NEAR_ISO - SUPP_ESTABLISHED) * (m - BS_ESTABLISHED_MAC)) / (BS_NEAR_ISO_MAC - BS_ESTABLISHED_MAC);
  return Math.min(1, SUPP_NEAR_ISO + ((1 - SUPP_NEAR_ISO) * (m - BS_NEAR_ISO_MAC)) / (BS_ISOELECTRIC_MAC - BS_NEAR_ISO_MAC));
}

/** Cerebral O2 delivery relative to normal: CBF/CBF0 × CaO2 ÷ the brain model's reference CaO2 (Hb 14, SaO2 0.97,
 * PaO2 95: l2/brain/model.ts). */
export function brainDo2Rel(cbfRel: number, hb: number, sao2: number, pao2: number): number {
  return (Math.max(0, cbfRel) * caO2(hb, sao2, pao2)) / caO2(14, 0.97, 95);
}

/** The cortex's inputs from the drug bus and the physiology (read-only). `macF` is the endocrine model's hypothermic
 * MAC reduction, applied as the depth index applies it (l2/neuro/pipeline.ts). */
export function cortexInputsOf(bus: DrugBus, o: { ageY: number; stimulus: number; antinoc: number; do2Rel: number; tempC: number; macF?: number }): CortexInputs {
  const h = bus.cns.hypByClass;
  const macF = Math.max(0.3, o.macF ?? 1);
  const mac = (a: 'sevoflurane' | 'isoflurane' | 'desflurane' | 'n2o') => (bus.volatiles[a]?.macFrac ?? 0) / macF;
  return {
    ageY: o.ageY,
    hyp: { gabaIv: 1000 * (h?.gabaIv ?? 0), barbiturate: 1000 * (h?.barbiturate ?? 0), etomidate: 1000 * (h?.etomidate ?? 0), benzo: 1000 * (h?.benzo ?? 0), dissociative: 1000 * (h?.dissociative ?? 0) },
    alpha2Eq: bus.cns.alpha2Eq ?? 0,
    mac: { sevoflurane: mac('sevoflurane'), isoflurane: mac('isoflurane'), desflurane: mac('desflurane'), n2o: mac('n2o') },
    opioidFentEq: bus.cns.opioidCeFentEq ?? 0,
    stimulus: o.stimulus, antinoc: o.antinoc, do2Rel: o.do2Rel, tempC: o.tempC,
  };
}

/** The shares of the hyperpolarising load per class (they sum to 1 when `hyper` > 0), N2O and age: what the spectrum
 * needs to know about WHICH drug, beyond the state. */
export function agentMixOf(x: CortexInputs): AgentMix {
  const c50 = ce50Propofol(x.ageY);
  const parts = {
    gabaIv: x.hyp.gabaIv / c50, barbiturate: x.hyp.barbiturate / c50, etomidate: x.hyp.etomidate / c50, benzo: x.hyp.benzo / c50,
    alpha2: x.alpha2Eq, sevoflurane: x.mac.sevoflurane, isoflurane: x.mac.isoflurane, desflurane: x.mac.desflurane,
  };
  const tot = Object.values(parts).reduce((a, b) => a + Math.max(0, b), 0);
  const sh = (v: number) => (tot > 0 ? Math.max(0, v) / tot : 0);
  return {
    gabaIv: sh(parts.gabaIv), barbiturate: sh(parts.barbiturate), etomidate: sh(parts.etomidate), benzo: sh(parts.benzo), alpha2: sh(parts.alpha2),
    sevoflurane: sh(parts.sevoflurane), isoflurane: sh(parts.isoflurane), desflurane: sh(parts.desflurane),
    n2oMac: Math.max(0, x.mac.n2o), ageY: x.ageY,
  };
}

/** One step of the cortical state. Pure: `prev` is read (only the N2O reference carries over), never mutated. */
export function cortexStep(prev: CortexState | undefined, x: CortexInputs, dtS: number): CortexState {
  const c50 = ce50Propofol(x.ageY);
  const loc = locPropofol(x.ageY);
  const ivGaba = Math.max(0, x.hyp.gabaIv) + Math.max(0, x.hyp.barbiturate) + Math.max(0, x.hyp.etomidate) + Math.max(0, x.hyp.benzo);
  const vol = ETHERS.reduce((a, k) => a + Math.max(0, x.mac[k]), 0);
  const a2 = Math.max(0, x.alpha2Eq);
  // GABA-ergic drugs and dexmedetomidine "primarily cause significant thalamocortical hyperpolarization" (Ch36 p. 1142;
  // Ch08 p. 137: a hyperpolarised thalamus shifts from tonic to burst firing); ketamine and N2O act otherwise
  const hyper = ivGaba / c50 + vol + a2;
  const lor = ivGaba / loc + vol / MAC_AWAKE + (a2 * DEXMED_EEG_C50_NG_ML) / DEXMED_LOR_NG_ML;
  const deep = Math.max(0, hyper - DEEP_ONSET);
  // Burst suppression from the GABA-ergic IV agents that suppress (not the benzodiazepines, Ch35 p. 1106) and the
  // ethers, the two loads added in onset units [ENG: isobolic]; the ether mix's own onset weights the agents by MAC
  const ivSupp = (Math.max(0, x.hyp.gabaIv) + Math.max(0, x.hyp.barbiturate) + Math.max(0, x.hyp.etomidate)) / BS_ONSET_PROP_NG_ML;
  const onset = vol > 0 ? ETHERS.reduce((a, k) => a + Math.max(0, x.mac[k]) * ONSET[k], 0) / vol : BS_ONSET_ISO_MAC; // IV alone: isoflurane's anchors [ENG]
  const mEq = vol + ivSupp * onset;
  const drugSupp = suppressionCurve(mEq, onset);
  // Ischaemia / hypoxia: delivery below the abnormal level slows, then the voltage goes
  const metabolic = clamp01((DO2_EEG_ABNORMAL - x.do2Rel) / (DO2_EEG_ABNORMAL - DO2_EEG_LOST));
  const metSupp = clamp01((metabolic - METABOLIC_SLOW_SHARE) / (1 - METABOLIC_SLOW_SHARE));
  const cold = clamp01((COLD_SLOW_FROM_C - x.tempC) / (COLD_SLOW_FROM_C - BS_TEMP_ONSET_C));
  const coldSupp = clamp01((BS_TEMP_ONSET_C - x.tempC) / (BS_TEMP_ONSET_C - BS_TEMP_SILENT_C));
  const suppress = 1 - (1 - drugSupp) * (1 - metSupp) * (1 - coldSupp);
  // N2O: the cortex adapts to the N2O level with τ; the transient is the not-yet-adapted change (either sign)
  const n2o = Math.max(0, x.mac.n2o);
  const ref = prev?.n2oRef ?? n2o;
  const n2oTransient = clamp01(Math.abs(n2o - ref) / N2O_TRIGGER_MAC);
  const n2oRef = ref + (n2o - ref) * (1 - Math.exp(-Math.max(0, dtS) / N2O_TRANSIENT_TAU_S));
  const age = ageFactors(x.ageY);
  return {
    hyper, lor, deep, volShare: hyper > 0 ? vol / hyper : 0,
    suppressDrive: mEq / onset, suppress,
    ketDepol: Math.max(0, x.hyp.dissociative) / loc,
    n2oTransient, n2oRef,
    opioid: Math.max(0, x.opioidFentEq) / OPIOID_EEG_FENT_NG_ML,
    arousal: clamp01(x.stimulus) * (1 - clamp01(x.antinoc)),
    ageSlope: age.slope,
    ageAmp: age.amp,
    metabolic, cold,
  };
}
