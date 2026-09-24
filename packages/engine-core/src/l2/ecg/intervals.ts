// Rate rules (brief §4.1 "Rate rules"; research 03 §1.1).

/** Fridericia: QT = QTc · RR^(1/3). QTc default 400 ms gives 458/400/363/317/295/268 ms at 40/60/80/120/150/200 bpm. */
export function qtFridericiaMs(rrS: number, qtcMs = 400): number {
  return qtcMs * Math.cbrt(rrS);
}

/**
 * PR = clamp(PR60 − 0.4·(HR − 60), 110, PR60) ms [03 §1.1, ENG].
 * PR60 default 160 ms, the textbook resting adult (Gate 1 ruling R16; 190 ms is withdrawn). With the drawn T
 * ending at QT, at 150–160 bpm the P ONSET (RR − PR after QRS onset: 276 ms at 150, 255 ms at 160) lands on the
 * T downslope before its end (295 / 288 ms), so "P on T" emerges from timing alone (brief §4.1).
 */
export const DEFAULT_PR60_MS = 160;
export function prMs(hrBpm: number, pr60Ms = DEFAULT_PR60_MS): number {
  return Math.min(pr60Ms, Math.max(110, pr60Ms - 0.4 * (hrBpm - 60)));
}

/** Weissler LVET for men: 413 − 1.7·HR ms (research 03 §2.1, confirmed §11 item 8). */
export function lvetMs(hrBpm: number): number {
  return 413 - 1.7 * hrBpm;
}
