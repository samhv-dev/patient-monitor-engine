// Oscillometric NIBP (brief §4.5, §6.3; research 03 §5): a measurement over sim time, never a readout.
//   inflate to 165 mmHg (adult; later cycles previous SBP + 10, GE rule) at 20 mmHg/s → step-deflate by
//   8 mmHg, holding each step for two matched pulses (up to 4 in AF) → oscillation amplitude per pulse sampled
//   from the ACTUAL site beats:  A(Pc) = Amax·exp(−((Pc − MAP)/w)²), Amax = 0.05·PP (1–4 mmHg),
//   w_hi = (SBP − MAP)/√(−ln Rs), w_lo = (MAP − DBP)/√(−ln Rd), Rs 0.50, Rd 0.80 → invert the envelope at
//   Rs/Rd, MAP = envelope peak, + noise SD 4 mmHg → result + timestamp, or fail.
// Failures: Amax < 1 mmHg or SBP < 50 (no reliable envelope, e.g. SBP 45 / no pulse) fail the attempt; the
// second failed attempt raises the "NBP measurement failed" INOP. CPR corrupts every pulse → the cycle runs to
// the 170 s safety deflation and fails. Envelope not bracketed above SBP → one re-pump to +40 mmHg.
import { normal, type Sfc32State } from '../../rng/sfc32.ts';
import type { NibpPhase, NibpSite } from '../../types-hemo.ts';

export const NIBP = {
  INITIAL_TARGET: 165, // adult (Philips 165 ± 15) — paediatric 130, neonatal 100 are Stage 4 skin data
  NEXT_TARGET_ABOVE_SBP: 10, // GE rule (brief §4.5)
  REPUMP_ABOVE: 40, // [ENG]
  INFLATE_RATE: 20, // mmHg/s → under 10 s [ENG rate]
  DUMP_RATE: 50, // mmHg/s final deflation [ENG]
  STEP: 8, // mmHg [ENG]
  STEP_SETTLE_S: 0.2, // pulses in the first 200 ms of a step are ignored [ENG]
  STEP_MIN_WAIT_S: 1.0, // a step with no usable pulses ends after max(1.0 s, 1.5 × RR) [ENG]
  STEP_WAIT_RR: 1.5,
  STEP_MAX_S: 6, // hard cap on one step [ENG]
  MAX_PULSES: 5, // AF/ectopy: up to 5 pulses per step [ENG]
  MATCH: 0.15, // two pulses within 15% are "matched" [ENG]
  MIN_CUFF: 30, // stop deflating below this [ENG]
  RS: 0.5, // Rs 0.45–0.57 → 0.50 (brief §4.5)
  RD: 0.8, // Rd 0.75–0.86 → 0.80
  OSC_PER_PP: 0.05, // Amax = 0.05·PP (1–4 mmHg at PP 20–80) [ENG]
  AMP_NOISE: 0.05, // per-pulse amplitude noise (fraction) [ENG]
  A_DETECT: 0.2, // pulses smaller than this are not seen, mmHg [ENG]
  A_MIN_ENVELOPE: 1.0, // a smaller envelope peak is not a measurement [ENG]
  MIN_SBP: 50, // "SBP below about 50–60 fails" (brief §4.5)
  RESULT_SD: 4, // noise SD on SBP/DBP, mmHg (brief §4.5); MAP gets half
  SAFETY_S: 170, // adult safety auto-deflate (brief §4.5); neonatal 85 s in Stage 4
  STAT_S: 300, // STAT = back-to-back for 5 min
  CUFF_EMIT_S: 0.2, // live cuff pressure at 5 Hz (brief §3.4)
} as const;

export const AUTO_INTERVALS_MIN = [1, 2, 2.5, 3, 5, 10, 15, 20, 30, 45, 60, 120] as const;
const NEVER = 1e12;

export interface NibpResult {
  sys: number;
  dia: number;
  map: number;
  pr: number;
  at: number;
}

export interface NibpState {
  sensor: 'on' | 'off';
  site: NibpSite;
  mode: 'manual' | 'auto' | 'stat';
  intervalMin: number;
  prevMode: 'manual' | 'auto';
  statUntil: number;
  nextStartT: number;
  phase: NibpPhase;
  cuff: number;
  target: number;
  attempt: number;
  repumped: boolean;
  startT: number;
  stepPc: number;
  stepStartT: number;
  stepAmps: number[];
  stepRejects: number; // artefact pulses rejected in this step
  steps: number[][]; // [Pc, A]
  pulseTimes: number[];
  lastSbp: number | null;
  last: NibpResult | null;
  lastEmitT: number;
}

export function createNibpState(sensor: 'on' | 'off' = 'on', site: NibpSite = 'rightArm'): NibpState {
  return {
    sensor, site, mode: 'manual', intervalMin: 15, prevMode: 'manual', statUntil: -1, nextStartT: NEVER,
    phase: 'idle', cuff: 0, target: NIBP.INITIAL_TARGET, attempt: 1, repumped: false, startT: -1,
    stepPc: 0, stepStartT: 0, stepAmps: [], stepRejects: 0, steps: [], pulseTimes: [], lastSbp: null, last: null, lastEmitT: -1,
  };
}

export type NibpOut =
  | { kind: 'phase'; phase: NibpPhase; cuff: number; nextInS?: number; result?: NibpResult }
  | { kind: 'cuff'; cuff: number; phase: NibpPhase }
  | { kind: 'failed'; text: string };

export function nibpMeasuring(nb: NibpState): boolean {
  return nb.phase === 'inflating' || nb.phase === 'deflating';
}

function begin(nb: NibpState, t: number, out: NibpOut[]): void {
  nb.phase = 'inflating';
  nb.startT = t;
  nb.attempt = 1;
  nb.repumped = false;
  nb.target = nb.lastSbp === null ? NIBP.INITIAL_TARGET : Math.max(100, nb.lastSbp + NIBP.NEXT_TARGET_ABOVE_SBP);
  nb.steps = [];
  nb.pulseTimes = [];
  nb.lastEmitT = t;
  out.push({ kind: 'phase', phase: 'inflating', cuff: nb.cuff });
}

/** device nibp commands (brief §4.5 "Modes"; §6.3). Returns a rejection reason or undefined. */
export function nibpCommand(nb: NibpState, action: 'start' | 'stat' | 'stop' | 'auto', t: number, intervalMin: number | undefined, out: NibpOut[]): string | undefined {
  if (action !== 'stop' && nb.sensor !== 'on') return 'cuff not connected';
  switch (action) {
    case 'start':
      nb.mode = 'manual'; // a manual start turns auto-cycling off (CAE, brief §4.5)
      nb.nextStartT = NEVER;
      if (!nibpMeasuring(nb)) begin(nb, t, out);
      return undefined;
    case 'auto':
      nb.mode = 'auto';
      nb.intervalMin = intervalMin ?? nb.intervalMin;
      if (!nibpMeasuring(nb)) begin(nb, t, out);
      return undefined;
    case 'stat':
      nb.prevMode = nb.mode === 'stat' ? nb.prevMode : nb.mode;
      nb.mode = 'stat';
      nb.statUntil = t + NIBP.STAT_S;
      if (!nibpMeasuring(nb)) begin(nb, t, out);
      return undefined;
    case 'stop':
      if (nb.mode === 'stat') nb.mode = nb.prevMode;
      if (nibpMeasuring(nb)) {
        nb.phase = 'done'; // dump the cuff, no result
        out.push({ kind: 'phase', phase: 'idle', cuff: nb.cuff });
      }
      nb.nextStartT = nb.mode === 'auto' ? t + nb.intervalMin * 60 : NEVER;
      return undefined;
  }
}

/** One arterial pulse at the cuff: the site beat's true SBP/DBP/MAP. `artefact` = CPR/motion corruption. */
export function nibpOnPulse(nb: NibpState, t: number, beat: { sbp: number; dbp: number; map: number }, artefact: boolean, rng: Sfc32State): void {
  if (nb.phase !== 'deflating') return;
  nb.pulseTimes.push(t);
  if (t < nb.stepStartT + NIBP.STEP_SETTLE_S) return;
  const pp = Math.max(0, beat.sbp - beat.dbp);
  const amax = NIBP.OSC_PER_PP * pp;
  const pc = nb.stepPc;
  const w = pc > beat.map
    ? Math.max(1, beat.sbp - beat.map) / Math.sqrt(-Math.log(NIBP.RS))
    : Math.max(1, beat.map - beat.dbp) / Math.sqrt(-Math.log(NIBP.RD));
  if (artefact) {
    nb.stepRejects++; // corrupted pulse: rejected, the step is held (brief §4.5 CPR/motion)
    return;
  }
  const a = amax * Math.exp(-(((pc - beat.map) / w) ** 2)) * (1 + NIBP.AMP_NOISE * normal(rng));
  if (a >= NIBP.A_DETECT) nb.stepAmps.push(a);
}

function matched(a: readonly number[]): boolean {
  if (a.length < 2) return false;
  const x = a[a.length - 1] as number;
  const y = a[a.length - 2] as number;
  return Math.abs(x - y) <= NIBP.MATCH * Math.max(x, y);
}

/**
 * Envelope inversion (brief §4.5) by curve fitting, as SuperSTAT-style monitors do: each side of the envelope is
 * Gaussian, so ln(A/Amax) = −((Pc − MAP)/w)². MAP and Amax come from a parabola through ln A at the peak step and
 * its neighbours; w_hi and w_lo are the RMS fits of the steps on each side; then
 *   SBP = MAP + w_hi·√(−ln Rs),   DBP = MAP − w_lo·√(−ln Rd).
 * Linear interpolation between 8 mmHg steps instead would bias DBP ≈ +4 mmHg (the envelope is concave there).
 * Returns null when the envelope is unusable and 'repump' when the top step was not above SBP.
 */
export function invertEnvelope(steps: readonly number[][]): { sys: number; dia: number; map: number } | null | 'repump' {
  if (steps.length < 3) return null;
  let iMax = 0;
  steps.forEach((st, i) => {
    if ((st[1] as number) > ((steps[iMax] as number[])[1] as number)) iMax = i;
  });
  const pk = steps[iMax] as [number, number];
  if (pk[1] < NIBP.A_MIN_ENVELOPE) return null;
  if (iMax === 0 || ((steps[0] as number[])[1] as number) > NIBP.RS * pk[1]) return 'repump';
  let map = pk[0];
  let amax = pk[1];
  const prev = steps[iMax - 1] as [number, number];
  const next = steps[iMax + 1] as [number, number] | undefined;
  if (next && prev[1] > 0 && next[1] > 0) {
    const [la, lb, lc] = [Math.log(prev[1]), Math.log(pk[1]), Math.log(next[1])];
    const den = la - 2 * lb + lc;
    if (den < 0) {
      const h = pk[0] - prev[0]; // negative: cuff pressure falls step by step
      const u = (0.5 * (la - lc)) / den; // vertex offset in steps
      map = pk[0] + u * h;
      amax = Math.exp(lb - 0.25 * (la - lc) * u);
    }
  }
  const width = (side: number): number => {
    let sum = 0;
    let n = 0;
    for (const [pc, a] of steps as [number, number][]) {
      const d = pc - map;
      if (Math.sign(d) !== side || Math.abs(d) < 2 || !(a > 0.15 * amax && a < 0.97 * amax)) continue;
      sum += (d * d) / -Math.log(a / amax);
      n++;
    }
    return n > 0 ? Math.sqrt(sum / n) : Number.NaN;
  };
  const wHi = width(1);
  const wLo = width(-1);
  if (!Number.isFinite(wHi) || !Number.isFinite(wLo)) return null;
  return { sys: map + wHi * Math.sqrt(-Math.log(NIBP.RS)), dia: map - wLo * Math.sqrt(-Math.log(NIBP.RD)), map };
}

function finishAttempt(nb: NibpState, t: number, rng: Sfc32State, out: NibpOut[]): void {
  const inv = invertEnvelope(nb.steps);
  if (inv === 'repump' && !nb.repumped) {
    nb.repumped = true;
    nb.target = ((nb.steps[0] as number[])[0] as number) + NIBP.REPUMP_ABOVE;
    nb.steps = [];
    nb.phase = 'inflating';
    out.push({ kind: 'phase', phase: 'inflating', cuff: nb.cuff });
    return;
  }
  const res = inv === 'repump' ? null : inv;
  const sys = res ? res.sys + NIBP.RESULT_SD * normal(rng) : Number.NaN;
  if (!res || !(sys >= NIBP.MIN_SBP)) {
    if (nb.attempt === 1) {
      nb.attempt = 2; // "fails after 2 attempts" (brief §4.5)
      nb.repumped = false;
      nb.steps = [];
      nb.target = NIBP.INITIAL_TARGET;
      nb.phase = 'inflating';
      out.push({ kind: 'phase', phase: 'inflating', cuff: nb.cuff });
      return;
    }
    fail(nb, t, out);
    return;
  }
  const dia = res.dia + NIBP.RESULT_SD * normal(rng);
  const map = res.map + (NIBP.RESULT_SD / 2) * normal(rng);
  const pts = nb.pulseTimes;
  const pr = pts.length >= 2 ? (60 * (pts.length - 1)) / ((pts[pts.length - 1] as number) - (pts[0] as number)) : 0;
  const r: NibpResult = { sys: Math.round(sys), dia: Math.round(dia), map: Math.round(map), pr: Math.round(pr), at: t };
  nb.last = r;
  nb.lastSbp = r.sys;
  nb.phase = 'done';
  out.push({ kind: 'phase', phase: 'done', cuff: nb.cuff, result: r });
}

function fail(nb: NibpState, _t: number, out: NibpOut[]): void {
  nb.phase = 'failed';
  out.push({ kind: 'phase', phase: 'failed', cuff: nb.cuff });
  out.push({ kind: 'failed', text: 'NBP measurement failed' });
}

/** Advance the cuff by dt seconds at time t (called once per 125 Hz sample). */
export function nibpStep(nb: NibpState, t: number, dt: number, rng: Sfc32State, out: NibpOut[]): void {
  if (nb.phase === 'idle' || nb.phase === 'done' || nb.phase === 'failed') {
    if (nb.cuff > 0) {
      nb.cuff = Math.max(0, nb.cuff - NIBP.DUMP_RATE * dt);
      if (nb.cuff === 0 && nb.phase !== 'idle') {
        nb.phase = 'idle';
        schedule(nb, t);
        const e: NibpOut = { kind: 'phase', phase: 'idle', cuff: 0 };
        if (nb.nextStartT < NEVER) e.nextInS = nb.nextStartT - t;
        out.push(e);
      }
    } else if (nb.phase !== 'idle') {
      nb.phase = 'idle';
      schedule(nb, t);
    }
    if (nb.phase === 'idle' && nb.sensor === 'on' && t >= nb.nextStartT) begin(nb, t, out);
    return;
  }
  if (t - nb.startT >= NIBP.SAFETY_S) {
    fail(nb, t, out); // safety auto-deflate (brief §4.5)
    return;
  }
  if (nb.phase === 'inflating') {
    nb.cuff = Math.min(nb.target, nb.cuff + NIBP.INFLATE_RATE * dt);
    if (nb.cuff >= nb.target) {
      nb.phase = 'deflating';
      nb.stepPc = nb.target;
      nb.stepStartT = t;
      nb.stepAmps = [];
      nb.stepRejects = 0;
      out.push({ kind: 'phase', phase: 'deflating', cuff: nb.cuff });
    }
  } else {
    nb.cuff = nb.stepPc;
    const a = nb.stepAmps;
    const pt = nb.pulseTimes;
    const rr = pt.length >= 2 ? (pt[pt.length - 1] as number) - (pt[pt.length - 2] as number) : 0.8;
    // no usable pulse for max(1.0 s, 1.5 RR) → an empty step; otherwise wait for a matched pair (≤ 4 pulses)
    const waited = t - nb.stepStartT;
    const timedOut = a.length === 0 ? waited >= Math.max(NIBP.STEP_MIN_WAIT_S, NIBP.STEP_WAIT_RR * rr) : waited >= NIBP.STEP_MAX_S;
    if (matched(a) || a.length >= NIBP.MAX_PULSES || timedOut) {
      if (timedOut && a.length === 0 && nb.stepRejects > 0) {
        nb.stepStartT = t; // every pulse was artefact: hold this step until the safety timeout
        nb.stepRejects = 0;
        return;
      }
      // the last pair (matched or not — with irregular pulses the device settles for what it has) [ENG]
      const amp = a.length >= 2 ? ((a[a.length - 1] as number) + (a[a.length - 2] as number)) / 2 : a.length ? (a[0] as number) : 0;
      nb.steps.push([nb.stepPc, amp]);
      // done when the last TWO steps are below Rd·peak on the low side (one noisy dip is not the end)
      const peak = nb.steps.reduce((m, st) => Math.max(m, st[1] as number), 0);
      const iPeak = nb.steps.findIndex((st) => st[1] === peak);
      const n = nb.steps.length;
      const low = (i: number) => i > iPeak && ((nb.steps[i] as number[])[1] as number) < NIBP.RD * peak;
      const pastPeak = peak >= NIBP.A_MIN_ENVELOPE && low(n - 1) && low(n - 2);
      if (pastPeak || nb.stepPc - NIBP.STEP < NIBP.MIN_CUFF) {
        finishAttempt(nb, t, rng, out);
        return;
      }
      nb.stepPc -= NIBP.STEP;
      nb.stepStartT = t;
      nb.stepAmps = [];
      nb.stepRejects = 0;
    }
  }
  if (t - nb.lastEmitT >= NIBP.CUFF_EMIT_S - 1e-9) {
    nb.lastEmitT = t;
    out.push({ kind: 'cuff', cuff: nb.cuff, phase: nb.phase });
  }
}

function schedule(nb: NibpState, t: number): void {
  if (nb.mode === 'stat') {
    if (t < nb.statUntil) {
      nb.nextStartT = t;
      return;
    }
    nb.mode = nb.prevMode;
  }
  nb.nextStartT = nb.mode === 'auto' ? nb.startT + nb.intervalMin * 60 : NEVER;
}

/** Seconds to the next automatic start, or undefined. */
export function nibpNextIn(nb: NibpState, t: number): number | undefined {
  return nb.nextStartT < NEVER ? Math.max(0, nb.nextStartT - t) : undefined;
}
