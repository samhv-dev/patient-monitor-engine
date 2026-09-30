// FU-8 (C4; R50 review F1, orchestrator ruling 1): ONE continuous body-size rule for the adult circulation, shared so
// 7c (FU-9) and any later module size the same patient the same way. Pure, deterministic, plain data.
//
// Lemmens' indexed blood volume (Lemmens HJM, Bernstein DP, Brodsky JB. Obes Surg 2006;16:773–6: BV = 70/√(BMI/22)
// mL/kg of actual weight, the tables' §1.3 rule) makes blood volume proportional to height × √weight. The circulation
// is sized on the weight at which the band's own per-kg blood volume gives that volume ("size weight"), so blood volume
// AND resting cardiac output (the isometric §2.2 scaling runs on the size weight) follow one continuous, monotonic curve
// in weight — no BMI step, with or without a stated height. ANCHOR: the band's default patient (70 kg at the band's
// default height) is exactly itself, so the default 70 kg adult keeps 4,900 mL (M) / 4,550 mL (F) and every rig that
// gives no height and 70 kg is bit-identical. 127 kg / 175 cm: size 94.3 kg → BV 6.6 L, CO × 1.35 (tables §1.3).

/** The reference weight of the anchor (the engine's default adult, kg). */
export const SIZE_REF_KG = 70;
/** The default height by band when the profile gives none (cm) — 7c's band defaults (`l2/blood/params.ts` BAND). */
export const DEFAULT_HEIGHT_CM = { adult: 175, elderly: 170 } as const;

/**
 * The weight (kg) the adult circulation is sized on: (height / default height) × √(70 × weight). Children and
 * adolescents are sized on their weight as given (Lemmens is an adult rule; the paediatric scaling is W12, Ali's).
 */
export function sizeWeightKg(band: string, weightKg: number, heightCm?: number): number {
  if (band !== 'adult' && band !== 'elderly') return weightKg;
  const hDef = DEFAULT_HEIGHT_CM[band];
  return ((heightCm ?? hDef) / hDef) * Math.sqrt(SIZE_REF_KG * weightKg);
}
