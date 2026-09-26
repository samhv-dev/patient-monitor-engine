// Haemodynamic constants and per-beat rules (brief §4.2, §4.8, §4.9 M1–M3; research 03 §2.1, §2.5, §2.8,
// §8.2–8.3). Every number cites its source, or [ENG] when it is an engineering choice tuned by the
// Stage 2 prototype (plan "Prototype results").

export const HEMO_RATE = 125; // ABP/CVP/PAP/pleth sample rate (brief §3.2)
export const SUBSTEPS = 4; // RK4 at 2 ms substeps, four per 125 Hz sample (brief §4.2) [ENG]
export const H_S = 1 / (HEMO_RATE * SUBSTEPS); // 0.002 s

// 4-element Windkessel seeds, adult (brief §4.2 table; research 03 §2.8)
export const WK_R0 = 1.05; // mmHg·s/mL, R 1.0–1.1
export const WK_C = 1.5; // mL/mmHg, C 1.4 ± 0.7, at P0
export const WK_P0 = 95; // mmHg, reference pressure of C0 [ENG]
export const WK_CK = 0.01; // /mmHg, C(P) = C0·e^(−k(P−P0)) [ENG]
export const WK_ZC = 0.05; // mmHg·s/mL, Zc 0.03–0.06
export const WK_L = 0.01; // mmHg·s²/mL, L 0.005–0.01 (upper end: gives the radial PP 40–55 at SV 70, prototype)
export const SV_REF_ML = 70; // reference stroke volume (research 03 §2.8 PP check) [ENG]

// Ejection profile (brief §4.2 "Ejection"; research 03 §2.8)
export const KAPPA = 1.2; // sin^κ, κ 1.0–1.3 normal
/** Skew p in sin(π·u^p)^κ: peak flow at 25% of LVET, as in the aortic flow wave [ENG, prototype]. */
export const EJECTION_SKEW = 0.5;
export const BACKFLOW_FRAC = 0.04; // valve-closure backflow volume / SV → incisura [ENG]
export const BACKFLOW_S = 0.02; // 15–25 ms backflow bump (brief §4.2)

// Aorta → radial transfer (brief §4.2 "Site transfer"; research 03 §2.3, §2.8): a resonance at f_r 4–8 Hz,
// ζ_r 0.2–0.4, "its gain tuned so that radial SBP exceeds aortic SBP by 5–20 mmHg". Prototype at SV 70,
// C 1.5, HR 75: radial 122.7/78.4 vs aortic 113.0/79.7 → +9.7 mmHg, PP 44.3, PP amplification 1.33.
export const RADIAL_FR_HZ = 5;
export const RADIAL_ZETA = 0.3;
export const RADIAL_GAIN = 1.5;
/** Transport delay aortic root → radial on top of the filters' group delay [ENG]. */
export const RADIAL_DELAY_S = 0.045;
/**
 * Effective aortic-root → radial transit AS DISPLAYED (research 03 §2.1: radial PTT 60–110 ms) = transport
 * delay + transfer/transducer/12 Hz display group delays. Prototype: notch − (R + PEP + LVET) = 87 / 89 / 83 ms
 * at HR 60 / 90 / 120. Used by the notch-timing acceptance test.
 */
export const RADIAL_PTT_S = 0.085;
/** Finger PPG pulse origin after aortic valve opening (research 03 §2.1: PPG foot 200–300 ms after R) [ENG]. */
export const FINGER_DELAY_S = 0.1;
export const EAR_DELAY_S = 0.05; // ear / forehead probes are closer to the heart [ENG]

// Pulmonary circulation (brief §4.2 PAP; research 03 §2.10): same Windkessel, R 0.08–0.12, C 3–5.
export const PA_R0 = 0.1;
export const PA_C = 4;
export const PA_ZC = 0.02; // [ENG]
export const RV_PEP_LEAD_S = 0.02; // RV ejects ≈20 ms before the LV [ENG] → PA upstroke leads radial 60–120 ms
export const RV_LVET_EXTRA_S = 0.02; // RV ejection is slightly longer [ENG]

// Transducer and display (brief §4.2 "Transducer and line")
export const TRANSDUCER_FN_HZ = 20; // default fn 20 Hz [ENG]
export const TRANSDUCER_ZETA = 0.45; // default ζ 0.45 [ENG]
export const DISPLAY_FILTER_HZ = 12; // 12 Hz display filter (Philips default)
export const FLUSH_MMHG = 300; // flush bag level (brief §4.2)
export const FLUSH_S = 1.0; // 0.5–2 s square wave
export const ZERO_S = 3.0; // flat 0 line while zeroing [ENG]
export const SAMPLE_S = 10; // blood sampling: stopcock off the patient [ENG]
export const MMHG_PER_CM = 0.74; // levelling (brief §4.2)
export const DAMP_PRESETS = {
  normal: { fnHz: 20, zeta: 0.45 }, // brief default
  under: { fnHz: 12, zeta: 0.2 }, // real ICU lines: fn 10–25, ζ 0.2–0.4 (research 03 §2.6)
  over: { fnHz: 20, zeta: 1.2 }, // air bubble / clot / kink (research 03 §2.6)
} as const;

// Arrest (brief §4.2 "Arrest and CPR"; research 03 §2.7)
export const ARREST_AFTER_S = 3.0; // no ejection for this long (or 2.2 × last RR) = mechanical arrest [ENG]
export const VENOUS_TAU_S = 3.0; // CVP moves toward its target / toward Pmsf with τ 3–6 s
/** MANUAL Pmsf: 7–12 mmHg (brief §4.9 lumped model), scaled by volume status [ENG]. */
export function pmsf(volumeStatus: number): number {
  return 7 + 5 * Math.min(1, Math.max(0, volumeStatus));
}

// CPR pump (brief §4.2; research 03 §2.8 "CPR pump")
/** Learner default `cpr.quality` when the event gives none: real manual CPR falls 10–20 % short (R39-2, research 09 §2). */
export const CPR_QUALITY_DEFAULT = 0.8;
export const CPR_SV_FRAC = 0.2; // SV_cpr 15–30% of normal SV, × quality
export const CPR_THORACIC_MMHG = 40; // thoracic-pump term 30–80 mmHg, × quality, on ABP and CVP
export const CPR_DUTY = 0.5; // compression phase = half the cycle [ENG]

/** Weissler PEP ≈ 131 − 0.4·HR ms (brief §4.2; research 03 §2.1, intercept 131/133 unverified by sex). */
export function pepS(hr: number): number {
  return Math.min(0.14, Math.max(0.06, (131 - 0.4 * hr) / 1000));
}

/** Weissler LVET (men) 413 − 1.7·HR ms, floored at 150 ms like the rhythm engine (research 03 §2.1, §11 #8). */
export function lvetS(hr: number): number {
  return Math.max(150, 413 - 1.7 * hr) / 1000;
}

/**
 * f_fill(RR) = 1 − exp(−max(0, RR − t_sys)/τ_fill), t_sys = LVET + 0.08 s, τ_fill 0.18 s, normalised to 1 at
 * RR 1 s (brief §4.8; research 03 §8.2). Used for the M3 stroke-volume ceiling.
 */
export function fFill(rr: number): number {
  const raw = (x: number) => 1 - Math.exp(-Math.max(0, x - (lvetS(60 / x) + 0.08)) / 0.18);
  return raw(rr) / raw(1);
}

/**
 * Valve-opening map E(k) [ENG]: a beat ejects only when its contractile drive k (= beat.mech.kSV, the
 * rhythm engine's k_rhythm × f_fill × PESP) exceeds K_OPEN, the fraction needed to lift LV pressure above
 * aortic diastolic pressure. Below it there is no upstroke → pulse deficit (brief §4.8 PVC "no ejection";
 * research 03 §2.4 AF "short RR → small or absent pulse"). E(1) = 1; PESP k = 1.2 → 1.27.
 */
export const K_OPEN = 0.25;
export function ejectionFactor(k: number): number {
  return Math.max(0, (k - K_OPEN) / (1 - K_OPEN));
}

/**
 * Frank–Starling carry-over [ENG]: the volume a beat fails to eject (vs a normal beat) stays in the ventricle
 * and raises the next beat's end-diastolic volume, so a fraction of it is ejected by the next beat. With the
 * rhythm engine's PESP k = 1.2 this gives the post-PVC SBP +8–15 mmHg (brief §4.8 "SBP about +12") that
 * potentiation alone cannot reach against the long compensatory-pause runoff (prototype: −28 mmHg without it;
 * +7.8 / +10.7 / +14.0 mmHg at 0.7 / 0.75 / 0.8 over isolated PVCs).
 */
export const FS_CARRY = 0.75;

/** M3 stroke-volume ceiling as a tracker gain limit: SV plateaus and falls above ~150–180 bpm (brief §4.9 M3). */
export const G_MAX = 2.0; // [ENG] SV ≤ 140 mL at HR ≤ 150
export function gainCeiling(rr: number): number {
  return G_MAX * Math.min(1, fFill(rr) / fFill(0.4));
}

/**
 * g_hyp from volumeStatus (brief §4.2 "Respiratory variation"): 0.03–0.06 normovolaemic → 0.15–0.25
 * hypovolaemic. volumeStatus 1 → 0.04, 0 → 0.25 [ENG, linear].
 */
export function gHyp(volumeStatus: number): number {
  return 0.04 + 0.21 * (1 - Math.min(1, Math.max(0, volumeStatus)));
}
/** Inverse of gHyp (tests and the demo slider). */
export function volumeStatusForGHyp(g: number): number {
  return 1 - (g - 0.04) / 0.21;
}
export const INSUFFLATION_GAIN = 0.03; // in-phase Δup term 0.02–0.04 (research 03 §2.5)

/**
 * Fixed-rate breath clock until Stage 3's respiratory driver (as Stage 1 did for RSA): 15 breaths/min, phase
 * shared with the ECG's RSA phase φ so RSA and PPV stay coherent. u ∈ [0, 1] is the normalised
 * intrathoracic pressure of a positive-pressure breath (research 03 §2.5 `u(t)`).
 */
export const BREATH_HZ = 0.25;
export function breathU(t: number, phi: number): number {
  return 0.5 * (1 + Math.sin(2 * Math.PI * BREATH_HZ * t + phi));
}

/**
 * Per-beat respiratory SV factor (research 03 §2.5): SV_i = SV_0·(1 − g_hyp·u(t_i − t_lag)) + in-phase
 * insufflation term, t_lag ≈ 2 beats. Normalised so the breath-cycle mean is 1 (the M2 tracker then meets
 * the targets on average).
 */
export function respFactor(t: number, rr: number, phi: number, g: number, u: (t: number) => number = (x) => breathU(x, phi)): number { // Stage 3 seam: u
  const lagged = u(t - 2 * rr);
  return (1 - g * lagged + INSUFFLATION_GAIN * u(t)) / (1 - g / 2 + INSUFFLATION_GAIN / 2);
}

/** Rhythms with electrical activity but no mechanical output (brief §4.8: VF, asystole, PEA → k 0). Stage 5 adds the IDs. */
export const PULSELESS_RHYTHMS: ReadonlySet<string> = new Set(['asystole', 'vf', 'vfCoarse', 'vfFine', 'pea']);
