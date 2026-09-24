// CVP (right-atrial pressure) generator (brief §4.2 "CVP"; research 03 §2.9): five Gaussians timed from ECG
// events on top of the venous mean. Parametric, not the Infirmary Integrated vertex table: the brief
// specifies Gaussians, and they re-time themselves to each P and QRS (AF, CHB, cannon a waves), which a
// one-cycle vertex table cannot do without the same re-timing.
//   a  peaks 80–100 ms after P onset (atrial systole)          → P onset + 60 ms (+30 ms display delay)
//   c  end of the QRS (tricuspid bulging)                        → R + QRS − 40 ms
//   x  trough in ventricular systole                             → c + 120 ms
//   v  near the end of the T wave                                → QRS onset + QT
//   y  trough after tricuspid opening                            → v + 160 ms
// AF has no P records, so no a wave. A P wave falling inside ventricular systole gives a cannon a wave.
// Amplitudes a 2–4, v 1–3 mmHg (research 03 §2.9) [ENG within range].
import type { Pulse } from './ejection.ts';
import { pressureAt } from './ejection.ts';
import { breathU } from './params.ts';

export interface Wave {
  t: number; // centre, s
  a: number; // mmHg
  s: number; // σ, s
}

export const CVP_WAVES = {
  a: { a: 3, s: 0.035, dt: 0.06 }, // displayed peak = +60 ms + ≈30 ms transducer/display delay → 80–100 ms
  c: { a: 1.5, s: 0.02 },
  x: { a: -2.5, s: 0.06, dt: 0.12 },
  v: { a: 2.5, s: 0.05 },
  y: { a: -2.5, s: 0.06, dt: 0.16 },
} as const;
export const CANNON_GAIN = 3; // cannon a wave ≈ 3× a [ENG]
export const CVP_RESP_MMHG = 3; // positive-pressure insufflation raises CVP (research 03 §2.9) [ENG 2–5]
const SQRT_2PI = Math.sqrt(2 * Math.PI);

export interface CvpState {
  waves: Wave[];
  /** Mean contribution of the waves per second, subtracted so the displayed mean stays at the venous mean. */
  corr: number;
  pendingArea: number; // area of a waves since the last beat
  lastOnset: number; // QRS onset of the last beat (s)
  lastQt: number; // its QT (s)
}

export function createCvpState(): CvpState {
  return { waves: [], corr: 0, pendingArea: 0, lastOnset: -1e12, lastQt: 0 };
}

const area = (w: { a: number; s: number }) => w.a * w.s * SQRT_2PI;

/** An atrial P wave with onset tP (brief §4.2: cannon a when the P falls in ventricular systole). */
export function cvpOnP(st: CvpState, tP: number): void {
  const inSystole = tP >= st.lastOnset && tP <= st.lastOnset + st.lastQt;
  const a = CVP_WAVES.a.a * (inSystole ? CANNON_GAIN : 1);
  st.waves.push({ t: tP + CVP_WAVES.a.dt, a, s: CVP_WAVES.a.s });
  st.pendingArea += area({ a, s: CVP_WAVES.a.s });
}

/** A ventricular beat with R time tR, QRS and QT in ms, preceded by an RR of rr seconds. */
export function cvpOnBeat(st: CvpState, tR: number, qrsMs: number, qtMs: number, rr: number): void {
  const onset = tR - 0.04;
  const tc = tR + qrsMs / 1000 - 0.04;
  const tv = onset + qtMs / 1000;
  const w: Wave[] = [
    { t: tc, a: CVP_WAVES.c.a, s: CVP_WAVES.c.s },
    { t: tc + CVP_WAVES.x.dt, a: CVP_WAVES.x.a, s: CVP_WAVES.x.s },
    { t: tv, a: CVP_WAVES.v.a, s: CVP_WAVES.v.s },
    { t: tv + CVP_WAVES.y.dt, a: CVP_WAVES.y.a, s: CVP_WAVES.y.s },
  ];
  st.waves.push(...w);
  const beatArea = w.reduce((acc, x) => acc + area(x), st.pendingArea);
  st.corr = beatArea / Math.max(0.25, rr);
  st.pendingArea = 0;
  st.lastOnset = onset;
  st.lastQt = qtMs / 1000;
}

/** Sum of the wave deviations at time t (mean-corrected). */
export function cvpWavesAt(st: CvpState, t: number): number {
  let p = -st.corr;
  for (const w of st.waves) {
    const d = t - w.t;
    if (d > -4 * w.s && d < 4 * w.s) p += w.a * Math.exp((-d * d) / (2 * w.s * w.s));
  }
  return p;
}

/** CVP at time t: venous mean + waves + positive-pressure respiratory swing + CPR thoracic pulses. */
export function cvpAt(st: CvpState, t: number, pv: number, phi: number, thor: readonly Pulse[]): number {
  return pv + cvpWavesAt(st, t) + CVP_RESP_MMHG * (breathU(t, phi) - 0.5) + pressureAt(thor, t);
}

/** Drop waves that can no longer contribute; stop the mean correction when no beat arrives (arrest). */
export function pruneCvp(st: CvpState, t: number, arrested: boolean): void {
  st.waves = st.waves.filter((w) => w.t + 4 * w.s >= t);
  if (arrested) st.corr = 0;
}
