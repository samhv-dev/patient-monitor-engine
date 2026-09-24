// Pulse-tone pitch maps (brief §3.6; research 03 §3.6, 05 §2.5): f = baseHz · 2^(−(100 − SpO2)·s/12).
// 'nellcor-like' s = 0.1 semitone/% (≈5 Hz per % near 100 %); 'enhanced' s = 0.4 (inside the brief's 0.25–0.5)
// [ENG]; 'none' = a fixed pitch (saadat-like until Ali's recording settles it).
export type PitchMapId = 'none' | 'nellcor-like' | 'enhanced';

export const PITCH_MAPS: Readonly<Record<PitchMapId, { semitonesPerPct: number }>> = {
  none: { semitonesPerPct: 0 },
  'nellcor-like': { semitonesPerPct: 0.1 },
  enhanced: { semitonesPerPct: 0.4 },
};

/** Beep pitch for a displayed SpO2 (%); null SpO2 (no pulse) = no tone. */
export function pitchHz(map: PitchMapId, spo2: number | null, baseHz = 880): number | null {
  if (spo2 === null || !Number.isFinite(spo2)) return null;
  const s = PITCH_MAPS[map].semitonesPerPct;
  const clamped = Math.min(100, Math.max(0, spo2));
  return baseHz * 2 ** ((-(100 - clamped) * s) / 12);
}
