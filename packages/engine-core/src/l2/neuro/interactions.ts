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
  mgMmolL: number;
  tempC: number; // core temperature
}

export function ec50Multipliers(x: InteractionCtx): Record<NmbAgent, number> {
  const vol = 1 / (1 + 0.5 * Math.max(0, x.volatileMac));
  const mg = 1 / (1 + 0.3 * Math.max(0, x.mgMmolL - 1));
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
