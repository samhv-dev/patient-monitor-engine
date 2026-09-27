// Neostigmine's NMB effect (tables §5d Neo row: ceiling [P], peak ~10 min [TXT]; brief §4.9). The drug, its time
// course and its muscarinic effects are Stage 7g's gamma row, which publishes an acetylcholine gain on the bus
// (`bus.nmb.achGain`, 1 = none; R51 §3). 7f turns the gain into a multiplier on the non-depolarisers' EC50:
//   m = 1 + NEO_SMAX · x/(x + NEO_G50),   x = achGain − 1
// The CEILING is structural: m < 1 + NEO_SMAX however large the dose, so a deep block (TOF count < 2) cannot be
// lifted to recovery, and when 7g's curve fades before spontaneous recovery is complete the block returns
// (recurarisation). NEO_SMAX 0.7 [ENG] IS the ceiling (never fitted). NEO_G50 0.3 [ENG, fitted on 7g's gain curve within
// 0.3–1.2: 0.05 mg/kg at TOF 2 → TOFR 0.9 in 18.3 min (band 8–20; 0.6 gave 22.0); 0.07 mg/kg at PTC → TOFR 0.35 at 10 min].
export const NEO_SMAX = 0.7;
export const NEO_G50 = 0.3;

/** EC50 multiplier for the non-depolarisers from 7g's acetylcholine gain (1 = no neostigmine). */
export function neoEc50Mult(achGain: number): number {
  const x = Math.max(0, achGain - 1);
  return 1 + (NEO_SMAX * x) / (x + NEO_G50);
}
