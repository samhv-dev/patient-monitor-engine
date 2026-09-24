// Circulatory delay lung → probe site (brief §4.3 device chain step 2; research 03 §3.6 item 1): a dead time of
// 15 s at the finger and 5 s at the ear/forehead at normal CO [ENG within 10–20], scaled by CO_ref/CO and by
// vasoconstriction (low PI), reaching 30–60 s in low-output states. History of pulmonary SaO2 at 10 Hz.
export const DELAY_FINGER_S = 15;
export const DELAY_EAR_S = 5;
export const DELAY_MAX_S = 60;
export const DELAY_SMOOTH_S = 5; // the delay itself moves with τ 5 s so the read point never jumps [ENG]
const HIST = 700; // 70 s at 10 Hz

export interface DelayLine {
  hist: number[]; // ring, index k % HIST holds gas step k
  k: number; // next gas step index
  delay: number; // current smoothed delay (s)
}

export function createDelay(sa0: number): DelayLine {
  return { hist: new Array<number>(HIST).fill(sa0), k: 0, delay: DELAY_FINGER_S };
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
  d.hist[d.k % HIST] = sa;
  d.k++;
  d.delay += (target - d.delay) * (1 - Math.exp(-dtS / DELAY_SMOOTH_S));
  const back = Math.min(HIST - 2, d.delay / dtS);
  const i0 = Math.floor(back);
  const w = back - i0;
  const at = (j: number) => d.hist[(((d.k - 1 - j) % HIST) + HIST) % HIST] as number;
  return at(i0) * (1 - w) + at(i0 + 1) * w;
}
