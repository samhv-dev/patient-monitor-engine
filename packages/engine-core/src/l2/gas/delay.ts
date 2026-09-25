// Circulatory delay lung → probe site (brief §4.3 device chain step 2; research 03 §3.6 item 1): a dead time of
// 15 s at the finger and 5 s at the ear/forehead at normal CO [ENG within 10–20], scaled by CO_ref/CO and by
// vasoconstriction (low PI), reaching 30–60 s in low-output states. History of pulmonary SaO2 at 10 Hz.
export const DELAY_FINGER_S = 15;
export const DELAY_EAR_S = 5;
export const DELAY_MAX_S = 60;
export const DELAY_SMOOTH_S = 5; // the delay itself moves with τ 5 s so the read point never jumps [ENG]
const HIST = 72; // 71 s of whole-second points (1 Hz) — see DelayLine

/**
 * History of pulmonary SaO2 as whole-second points plus the current gas step. 1 Hz is enough for a signal whose
 * fastest change is a few %/s, and it keeps the state small: the engine structured-clones the whole state every
 * tick for its look-ahead, and a 700-point 10 Hz ring made this the largest object in it (Stage 3 perf fix).
 */
export interface DelayLine {
  hist: number[]; // ring: hist[s % HIST] holds the SaO2 at whole second s (gas step s·10)
  k: number; // next gas step index
  last: number; // SaO2 of the latest gas step
  delay: number; // current smoothed delay (s)
}

export function createDelay(sa0: number): DelayLine {
  return { hist: new Array<number>(HIST).fill(sa0), k: 0, last: sa0, delay: DELAY_FINGER_S };
}

/** Target delay for a site, CO ratio and PI (vasoconstriction below PI 1 % lengthens it) [ENG]. */
export function siteDelay(site: string, coRatio: number, pi: number | null): number {
  const base = site === 'ear' || site === 'forehead' ? DELAY_EAR_S : DELAY_FINGER_S;
  const flow = 1 / Math.min(1, Math.max(0.25, coRatio));
  const tone = pi !== null && pi < 1 ? 1 + 0.5 * (1 - Math.max(0, pi)) : 1;
  return Math.min(DELAY_MAX_S, base * flow * tone);
}

/** Push this gas step's pulmonary SaO2 and return the SaO2 at the site (interpolated `delay` seconds back). */
export function delayStep(d: DelayLine, sa: number, target: number, dtS: number): number {
  const perS = Math.round(1 / dtS);
  const now = d.k * dtS; // time of this gas step
  if (d.k % perS === 0) d.hist[(d.k / perS) % HIST] = sa;
  d.last = sa;
  d.k++;
  d.delay += (target - d.delay) * (1 - Math.exp(-dtS / DELAY_SMOOTH_S));
  const tq = now - Math.min(HIST - 2, d.delay);
  const sNow = Math.floor(d.k === 0 ? 0 : (d.k - 1) / perS); // latest whole second stored
  const at = (s: number) => d.hist[Math.max(0, s) % HIST] as number;
  if (tq >= sNow) {
    const span = now - sNow;
    return span > 0 ? at(sNow) + (d.last - at(sNow)) * ((tq - sNow) / span) : d.last;
  }
  const s0 = Math.floor(tq);
  return at(s0) + (at(s0 + 1) - at(s0)) * (tq - s0);
}
