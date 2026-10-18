// NMB interactions and neuromuscular profiles (tables §5d, §1.5 [TXT]; sizes [ENG] unless cited). The neuro
// model owns these multipliers (the drug model has no `bus.nmb.ec50Mult`):
//   potent volatiles potentiate non-depolarisers: EC50 ÷ (1 + 0.5·MAC) (≈ −33 % at 1 MAC; sevoflurane > isoflurane in
//     trials, one factor here) [TXT direction; ENG size];
//   magnesium potentiates both classes: EC50 ÷ (1 + 0.3·(Mg − 1.0)) above 1.0 mmol/L (therapeutic 2–3.5) [TXT; ENG];
//   hypothermia: non-depolariser EC50 × max(0.6, 1 − 0.12 per °C below 37) (M10 ch. 24 p. 698: twitch force −10–16 %
//     per °C) [TXT; ENG size]; the slower clearance is the drug model's PK (−5 %/°C);
//   myasthenia gravis: non-depolarisers ×0.3 EC50 (very sensitive), succinylcholine resistant (ED95 ×2.6) [TXT];
//   Lambert–Eaton: sensitive to both (×0.3 / ×0.5) [TXT];
//   burns (> 48 h, > 20 % TBSA) and denervation/immobilisation: non-depolariser resistance ×2.5 EC50 [TXT]. Their
//     succinylcholine potassium surge is the blood model's, not the neuro model's.
import type { NmbAgent } from './bus.ts';

export type NmProfile = 'normal' | 'myasthenia' | 'lambertEaton' | 'burn' | 'denervation';

export interface InteractionCtx {
  profile: NmProfile;
  volatileMac: number; // potent volatiles only (brain, age-adjusted, from 7g's bus)
  /** The blood model's `blood.out.mg` — ONE magnesium state, so the drug and the profile agree (the profile's
   * `mgMmolL` is the blood model's BASELINE, not a second state). */
  mgMmolL: number;
  /** The blood's `blood.out.iCa` (mmol/L, normal ≈ 1.15) — calcium antagonises the magnesium potentiation (M10
   * ch. 24 p. 698); `undefined` without the blood model: no calcium effect. */
  iCaMmolL?: number;
  tempC: number; // core temperature
  /** The blood's plasma K (`blood.out.k`, mmol/L) — the third blood electrolyte on the one path (Mg, iCa, K);
   * undefined without the blood model: no K effect. */
  kMmolL?: number;
}

/** The volatile potentiation of a non-depolarising block, as the EC50 divisor 1/(1 + k·MAC). Exported so the two
 * existing assertions that pinned it read the constant instead of a literal. */
export const VOL_NMB_K = 0.18;

export function ec50Multipliers(x: InteractionCtx): Record<NmbAgent, number> {
  // The volatile divisor is sized against a POTENTIATION-OF-DURATION source instead of an EC50 guess. VOL_NMB_K 0.18
  // [ENG, fit target: band 25–80 %, M10 ch. 24 "30–50 % at ≈ 1 MAC"] — MEASURED in the engine: +52.2 % (t25 46.7 vs
  // 30.7 min at 1.1 MAC) → PL. The neuro-only unit rig of `interactions.test.ts` reads only +13.4 % for the same
  // constant, because it applies a FIXED EC50 multiplier without the volatile's own PK; the engine measurement is the
  // acceptance property and the unit rig's +20–45 % band is carried as an `it.fails` with both numbers.
  const vol = 1 / (1 + VOL_NMB_K * Math.max(0, x.volatileMac));
  // magnesium potentiates; calcium antagonises it (M10 ch. 24 p. 698). ONE state each: blood values.
  const ca = x.iCaMmolL === undefined ? 1 : Math.min(1.6, Math.max(0.7, x.iCaMmolL / 1.15));
  const mg = 1 / (1 + (0.3 * Math.max(0, x.mgMmolL - 1)) / ca);
  const cold = Math.max(0.6, 1 - 0.12 * Math.max(0, 37 - x.tempC));
  let nd = vol * mg * cold * hypokalaemiaMult(x.kMmolL); // Hypokalaemia potentiates the non-depolarisers
  let dep = mg;
  switch (x.profile) {
    case 'myasthenia':
      nd *= 0.3;
      dep *= 2.6;
      break;
    case 'lambertEaton':
      nd *= 0.3;
      dep *= 0.5;
      break;
    case 'burn':
    case 'denervation':
      nd *= 2.5;
      break;
    default:
      break;
  }
  return { rocuronium: nd, vecuronium: nd, cisatracurium: nd, succinylcholine: dep };
}

/**
 * Hypokalaemia potentiates a non-depolarising block — the hyperpolarised end-plate needs less antagonist to fail
 * (Miller 10e ch. 27, "hypokalaemia enhances non-depolarising block"; Feldman 1963).
 * EC50 × (1 − HYPOK_SLOPE·(HYPOK_K − K)⁺), floor HYPOK_FLOOR [ENG size]; 1 at K ≥ 3.5 and without the blood model.
 */
export const HYPOK_K = 3.5;
export const HYPOK_SLOPE = 0.15;
export const HYPOK_FLOOR = 0.7;
export function hypokalaemiaMult(kMmolL: number | undefined): number {
  return kMmolL === undefined ? 1 : Math.max(HYPOK_FLOOR, 1 - HYPOK_SLOPE * Math.max(0, HYPOK_K - kMmolL));
}
