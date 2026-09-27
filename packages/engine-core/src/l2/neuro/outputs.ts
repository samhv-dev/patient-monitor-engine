// What the anaesthetic state hands to the other systems (scope 7f-2; each consumer reads it when present).
// NOT here, by R51: the circulation's drug effects — including the propofol/volatile baroreflex-gain depression — are
// Stage 7g's PD (addendum 8); potassium (succinylcholine) is 7c's; MH is 7e's (§3, §6).
//   7d brain: CMRO2 × (tables §5.1: −50–60 % at burst suppression; ≈ −40 % at DI 40 [ENG]);
//   7e endocrine/thermal: `antinoc`, `nmb`, `thermoDepth` — the fields the 7e plan reads as ps.neuro.{antinoc, nmb,
//     thermoDepth}; NeuroState mirrors them on its top level (pipeline.ts);
//   published only: the anaesthetic MAP operating-point shift (A11 forbids applying it: Q-7f-1) and the pupil size.
export interface NeuroOutputs {
  mapSetShiftMmHg: number; // published only (A11, Q-7f-1)
  cmro2Mult: number;
  pupilMm: number; // optional display: opioid miosis 2 mm, awake 4 mm [TXT]
  /** 0–1 antinociception: blunting of a noxious stimulus by opioid and hypnotic (7e: noxious × (1 − antinoc)). */
  antinoc: number;
  /** 0–1 neuromuscular block of peripheral muscle (thumb block; 7e: shivering × (1 − nmb)). */
  nmb: number;
  /** 0–1.5 thermoregulatory depth = hypnotic MAC-equivalents (Sessler: thresholds fall linearly with concentration) [ENG scale]. */
  thermoDepth: number;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export function neuroOutputs(x: { diRaw: number; opioidFentEq: number; antinoc: number; thumbBlock: number; hypEq: number }): NeuroOutputs {
  const anaes = clamp01((93 - x.diRaw) / 53); // 0 awake → 1 at DI 40
  return {
    mapSetShiftMmHg: anaes > 0 ? -10 * anaes : 0,
    cmro2Mult: x.diRaw < 30 ? 0.45 : 1 - 0.4 * anaes,
    pupilMm: Math.max(1.5, 4 - 2 * (x.opioidFentEq / (x.opioidFentEq + 1))),
    antinoc: clamp01(x.antinoc),
    nmb: clamp01(x.thumbBlock),
    thermoDepth: Math.max(0, Math.min(1.5, x.hypEq)),
  };
}
