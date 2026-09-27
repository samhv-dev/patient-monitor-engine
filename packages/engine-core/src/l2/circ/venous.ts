// FU-2 (NR-7g-2, G7g): β-adrenergic mobilisation of unstressed venous volume. β-stimulation shifts blood out of the
// compliant splanchnic reservoir into the stressed pool (hepatic outflow dilation, Green 1977; the two-compartment
// venous return picture, Caldini 1974; Magder 2016), raising mean systemic filling pressure — so a β-agonist
// raises venous return and not only contractility, which 7a's venous-return-limited circulation needs for the
// tables' dobutamine CO rise (§6.2, sanity CO +20–40 % at 5 µg/kg/min). β-blockade shifts the EC50 competitively,
// as 7g's PD does for the drug's other β targets (l2/pk/combine.ts).
import { competitiveEc50, hill } from '../pk/pd.ts';
import { V0_RECRUIT_MAX_ML_KG } from './baroreflex.ts';

/** Most volume the β mechanism can move out of the unstressed pool, mL/kg: the whole recruitable splanchnic
 * reservoir (≈ 1 L in an adult; Guyton, Magder 2016) — the same physiological bound as the reflexes' recruitment. */
export const BETA_V0_MAX_ML_KG = V0_RECRUIT_MAX_ML_KG;
/** β-agonists with a venous (β2) action and their EC50, in the bus's rate-equivalent unit (µg/kg/min): dobutamine's
 * inotropic EC50 from tables §6.2 [ENG: the same EC50 for the venous action]. */
export const BETA_V0_AGENTS: Readonly<Record<string, number>> = { dobutamine: 7 };

/** β venous potency units Σ Ce/EC50 over the listed agents on the drug bus. */
export function betaVenousUnits(agents: Readonly<Record<string, { brain: number }>>): number {
  let u = 0;
  for (const id in BETA_V0_AGENTS) {
    const a = agents[id];
    if (a) u += Math.max(0, a.brain) / (BETA_V0_AGENTS[id] as number);
  }
  return u;
}

/** Volume (mL) moved from the unstressed to the stressed venous pool at potency u and β occupancy occ. */
export function betaDV0Ml(u: number, occ: number, weightKg: number): number {
  return hill(u, competitiveEc50(1, occ), BETA_V0_MAX_ML_KG * weightKg);
}
