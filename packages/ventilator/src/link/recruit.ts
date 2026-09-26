// Interim PEEP-recruitment → shunt model for the link demo [ENG]. Stage 3's gas exchange takes shunt as an
// input; PEEP recruitment is Stage 7b's lung module (R31). Until it lands, the link owns this small model and
// sends `setTarget shunt`: the recruited fraction follows a logistic curve of total PEEP (set + intrinsic),
// reached with a first-order lag — slow to recruit, faster to derecruit (research 03 §8.7 direction; the time
// constants are teaching values, not data). DELETE when Stage 7b emits shunt from its own recruitment model.
export interface RecruitParams {
  shuntMax: number; // fully derecruited (PEEP 0)
  shuntMin: number; // fully recruited
  p50: number; // total PEEP (cmH2O) at half recruitment
  k: number; // slope (cmH2O)
}
export const TAU_RECRUIT_S = 40;
export const TAU_DERECRUIT_S = 10;

export interface RecruitState { r: number; sent: number }

export const recruitTarget = (p: RecruitParams, totalPeep: number): number => 1 / (1 + Math.exp(-(totalPeep - p.p50) / p.k));
export const shuntOf = (p: RecruitParams, r: number): number => p.shuntMin + (p.shuntMax - p.shuntMin) * (1 - r);

export function createRecruit(p: RecruitParams, totalPeep: number): RecruitState {
  const r = recruitTarget(p, totalPeep);
  return { r, sent: Number.NaN };
}

/** Advance by dt seconds; returns the shunt to send when it moved ≥ 0.005 since the last send, else null. */
export function stepRecruit(s: RecruitState, p: RecruitParams, totalPeep: number, dt: number): number | null {
  const target = recruitTarget(p, totalPeep);
  const tau = target > s.r ? TAU_RECRUIT_S : TAU_DERECRUIT_S;
  s.r += (target - s.r) * Math.min(1, dt / tau);
  const sh = Math.round(shuntOf(p, s.r) * 1000) / 1000;
  if (Number.isNaN(s.sent) || Math.abs(sh - s.sent) >= 0.005) {
    s.sent = sh;
    return sh;
  }
  return null;
}
