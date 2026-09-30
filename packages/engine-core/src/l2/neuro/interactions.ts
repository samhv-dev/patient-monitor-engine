// NMB interactions and neuromuscular profiles (scope 7f-1; tables §5d, §1.5 [TXT]; sizes [ENG] unless cited). 7f owns
// these multipliers (R51 §2: 7g's `bus.nmb.ec50Mult` is removed from the 7g plan):
//   potent volatiles potentiate non-depolarisers: EC50 ÷ (1 + 0.5·MAC) (≈ −33 % at 1 MAC; sevoflurane > isoflurane in
//     trials, one factor here) [TXT direction; ENG size];
//   magnesium potentiates both classes: EC50 ÷ (1 + 0.3·(Mg − 1.0)) above 1.0 mmol/L (therapeutic 2–3.5) [TXT; ENG];
//   hypothermia: non-depolariser EC50 × max(0.6, 1 − 0.12 per °C below 37) (M10 ch. 24 p. 698: twitch force −10–16 %
//     per °C, the figure 7g's decision 7 cites) [TXT; ENG size]; the slower clearance is 7g's PK (−5 %/°C);
//   myasthenia gravis: non-depolarisers ×0.3 EC50 (very sensitive), succinylcholine resistant (ED95 ×2.6) [TXT];
//   Lambert–Eaton: sensitive to both (×0.3 / ×0.5) [TXT];
//   burns (> 48 h, > 20 % TBSA) and denervation/immobilisation: non-depolariser resistance ×2.5 EC50 [TXT]. Their
//     succinylcholine potassium surge is Stage 7c's (R51 §3), not 7f's.
import type { NmbAgent } from './bus.ts';

export type NmProfile = 'normal' | 'myasthenia' | 'lambertEaton' | 'burn' | 'denervation';

export interface InteractionCtx {
  profile: NmProfile;
  volatileMac: number; // potent volatiles only (brain, age-adjusted, from 7g's bus)
  /** FU-7 (addendum 24 / audit D12): 7c's `blood.out.mg` — ONE magnesium state, so the drug and the profile agree
   * (the profile's `mgMmolL` is 7c's BASELINE, not a second state). */
  mgMmolL: number;
  /** FU-7 (addendum 24 / audit D12): 7c's `blood.out.iCa` (mmol/L, normal ≈ 1.15) — calcium antagonises the magnesium
   * potentiation (M10 ch. 24 p. 698); `undefined` without 7c keeps the pre-FU-7 behaviour. */
  iCaMmolL?: number;
  tempC: number; // core temperature
}

/** FU-7 (addendum 24 / DI-51): the volatile potentiation of a non-depolarising block, as the EC50 divisor 1/(1 + k·MAC).
 * Exported so the two existing assertions that pinned it (E-FU7-10) read the constant instead of a literal. */
export const VOL_NMB_K = 0.18;

export function ec50Multipliers(x: InteractionCtx): Record<NmbAgent, number> {
  // FU-7 (addendum 24 / audit D12, DI-51): the volatile divisor is re-sized against a POTENTIATION-OF-DURATION source
  // instead of an EC50 guess. 1 MAC sevoflurane prolonged the clinical duration +127 % with 0.5 (band 25–80 %).
  // VOL_NMB_K 0.18 [ENG, fit target: DI-51's band 25–80 %, M10 ch. 24 "30–50 % at ≈ 1 MAC"] — MEASURED by the second
  // fixer on the applied tree (main + FU-4 + this plan): the ENGINE cell DI-51 reads +52.2 % (t25 46.7 vs 30.7 min at
  // 1.1 MAC) → PL. The neuro-only unit rig of `interactions.test.ts` reads only +13.4 % for the same constant, because it
  // applies a FIXED EC50 multiplier without the volatile's own PK; the ENGINE cell is the acceptance property and the
  // unit rig's +20–45 % band is carried as an `it.fails` with both numbers (Step 4).
  const vol = 1 / (1 + VOL_NMB_K * Math.max(0, x.volatileMac));
  // magnesium potentiates; calcium antagonises it (M10 ch. 24 p. 698). ONE state each: 7c's blood values.
  const ca = x.iCaMmolL === undefined ? 1 : Math.min(1.6, Math.max(0.7, x.iCaMmolL / 1.15));
  const mg = 1 / (1 + (0.3 * Math.max(0, x.mgMmolL - 1)) / ca);
  const cold = Math.max(0.6, 1 - 0.12 * Math.max(0, 37 - x.tempC));
  let nd = vol * mg * cold;
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
