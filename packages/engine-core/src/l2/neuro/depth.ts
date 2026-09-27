// Anaesthetic depth (tables §5d "Anaesthetic depth"). Pure functions of brain effect-site concentrations (ng/mL, from
// 7g's bus via bus.ts) and brain MAC fractions (age-adjusted by 7g: MAC(age) = MAC40·10^(−0.00269·(age − 40)),
// Mapleson). NOT a BIS algorithm: a BIS-like 0–100 index from a hypnotic interaction term
//   U = Ce_prop/Ce50_prop(age) + (MAC_potent + N2O_DI_W·MAC_N2O)/MAC_DI50 + OPIOID_W·Ce_opioidEEG/EEG_EC50 + Ce_midaz/MIDAZ_DI50
//   DI = 93·(1 − U^γ/(U^γ + 1)),  γ 1.89 below U = 1, 1.47 above (Eleveld BIS 2024 slopes)
// plus the teaching artefacts: ketamine raises the index (dissociation), N2O barely moves it, EMG adds 10–20 when the
// patient is unparalysed and stimulated, burst suppression below ~30 (suppression ratio shown).
// Consciousness is a SEPARATE hypnotic level (the index is not consciousness: ketamine, awareness under NMB).
import { FENT_EEG_POT } from './bus.ts';

export const DI_E0 = 93;
export const MAC_DI50 = 0.876; // [ENG] → DI 42 at 1.0 MAC (tables: 40–45)
export const N2O_DI_W = 0.1; // N2O ≈ 0 on the index [TXT]
export const OPIOID_W = 0.2; // tables §5d: opioids alone barely move the index
export const REMI_EEG_EC50 = 11.2; // ng/mL (Minto 1997); fentanyl FENT_EEG_POT × remifentanil (tables §5d)
export const MIDAZ_DI50 = 300; // ng/mL [VERIFY]
export const KET_DI_RISE = 15; // index points at full ketamine effect [ENG: "ketamine ↑ DI (paradox)"]
export const KET_C50 = 800; // ng/mL (hypnotic C50, [VERIFY])
export const EMG_RISE = 15; // tables §5d: +10–20 when unparalysed and stimulated [ENG]
export const MAC_AWAKE = 0.33; // Katoh 1993
export const MAC_BAR = 1.6; // MAC blocking adrenergic response (1.5–1.7) [TXT]
export const OPIOID_MAC_RMAX = 0.7; // MAC reduction ceiling [TXT]
export const OPIOID_MAC_K = 0.6; // fentanyl-eq ng/mL: −50 % at 1.5 ng/mL (tables §5d, remi 1.2)
export const REMI_MAC_POT = 1.25; // remifentanil 1.2 ng/mL ≈ fentanyl 1.5 for MAC reduction
/** Neuroglycopenia (7e, 0–1: glucose 60 → 30 mg/dL) as a hypnotic: 1 = unconscious, index ≈ 45 [ENG: coma below ~30 mg/dL]. */
export const GLYCO_U = 1.2;

export interface DepthInputs {
  ageY: number;
  ce: { propofol: number; remifentanil: number; fentanyl: number; midazolam: number; ketamine: number }; // brain, ng/mL(-eq)
  macPotent: number; // brain, age-adjusted MAC fraction of the potent volatiles (7g)
  macN2o: number; // brain, N2O (7g)
  t1: number; // thumb first twitch 0–1 (EMG needs muscle)
  stimulus: number; // 0–1 noxious stimulation now (7e's intensity / STIM_FULL, pipeline.ts)
  glyco?: number; // 0–1 neuroglycopenia (7e's endo.core.out.neuroglycopenia; 0 without 7e)
}

export interface DepthOut {
  diRaw: number;
  sr: number; // suppression ratio %
  macFrac: number; // age-adjusted MAC fraction (all agents, brain)
  macEff: number; // MAC fraction after opioid reduction (movement / awareness / MAC-BAR)
  hypnotic: number; // consciousness level: ≥ 1 unconscious
  conscious: boolean;
  stress: number; // 0–1 sympathetic response to the stimulus after blunting
  antinoc: number; // 0–1 blunting of a noxious stimulus by opioid and hypnotic (7e: noxious × (1 − antinoc))
  hypEq: number; // hypnotic MAC-equivalents (opioid-reduced MAC + propofol Ce/Ce50): movement, MAC-BAR, 7e's thermoregulatory depth
  movement: boolean;
}

export function ce50Propofol(ageY: number): number {
  return 3.08 * Math.exp(-0.00635 * (ageY - 35)) * 1000; // ng/mL (Eleveld BIS 2024 via tables §5d)
}
/** Schnider C50 for loss of consciousness: 2.35 / 1.8 / 1.25 µg/mL at 25 / 50 / 75 y (tables §6.1). */
export function locPropofol(ageY: number): number {
  return Math.max(600, 2350 - 22 * (ageY - 25));
}
export function opioidFentEq(ce: DepthInputs['ce']): number {
  return ce.fentanyl + REMI_MAC_POT * ce.remifentanil;
}

export function depth(x: DepthInputs): DepthOut {
  const macFrac = x.macPotent + x.macN2o;
  const volU = x.macPotent + N2O_DI_W * x.macN2o;
  const awakeU = macFrac / MAC_AWAKE;
  const fe = opioidFentEq(x.ce);
  const red = (OPIOID_MAC_RMAX * fe) / (fe + OPIOID_MAC_K);
  const macEff = macFrac / (1 - red);
  const opEeg = x.ce.remifentanil + FENT_EEG_POT * x.ce.fentanyl;
  const glyco = Math.max(0, Math.min(1, x.glyco ?? 0));
  const u = x.ce.propofol / ce50Propofol(x.ageY) + volU / MAC_DI50 + (OPIOID_W * opEeg) / REMI_EEG_EC50 + x.ce.midazolam / MIDAZ_DI50 + GLYCO_U * glyco;
  const g = u < 1 ? 1.89 : 1.47;
  const ug = u > 0 ? u ** g : 0;
  const eKet = x.ce.ketamine / (x.ce.ketamine + KET_C50);
  const base = DI_E0 * (1 - ug / (ug + 1));
  const sr = Math.max(0, Math.min(100, ((30 - base) / 25) * 100));
  const emg = EMG_RISE * x.stimulus * Math.max(0, Math.min(1, x.t1));
  const diRaw = Math.max(0, Math.min(98, base + KET_DI_RISE * eKet + emg));
  // consciousness: propofol LOC C50, volatile MAC-awake (opioid-reduced), midazolam, ketamine (all additive)
  const hypnotic = x.ce.propofol / locPropofol(x.ageY) + awakeU / (1 - 0.5 * red) + x.ce.midazolam / 150 + x.ce.ketamine / KET_C50 + GLYCO_U * glyco;
  // nociception: stimulus blunted by opioid (fentanyl-eq C50 2 ng/mL) and by the hypnotic depth (MAC-BAR scale)
  const bOp = fe / (fe + 2);
  const hypEq = macEff + x.ce.propofol / ce50Propofol(x.ageY) / (1 - red); // MAC-equivalents
  const bHyp = hypEq ** 3 / (hypEq ** 3 + 1); // 50 % blunting at 1 MAC-eq, 80 % at MAC-BAR 1.6 [ENG]
  const antinoc = 1 - (1 - bOp) * (1 - bHyp);
  const stress = Math.max(0, Math.min(1, x.stimulus * (1 - antinoc)));
  const movement = x.stimulus >= 0.3 && x.t1 > 0.25 && hypEq < 1; // MAC = 50 % move to incision: below 1 MAC-eq they move [ENG]
  return { diRaw, sr, macFrac, macEff, hypnotic, conscious: hypnotic < 1, stress, antinoc, hypEq, movement };
}

/** Displayed index: first-order smoothing τ 20 s (tables: 15–30 s device lag), stepped at dt. */
export function smoothDi(prev: number, raw: number, dt: number, tauS = 20): number {
  return prev + ((raw - prev) * dt) / tauS;
}
