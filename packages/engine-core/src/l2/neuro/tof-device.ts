// TOF stimulator "device" (scope 7f-1; plan decision 13): a train of four every `intervalS` (default 15 s, 12–60 s)
// while running, a single train on demand, and a post-tetanic count (50 Hz tetanus 5 s, 3 s pause, 15 twitches at
// 1 Hz: the result is reported 23 s after the command). Readings are MEASURED: acceleromyography noise (SD 0.02 on
// the ratio [ENG]), the ratio shown only when all four twitches are present (count 4), and no TOF for 60 s after a
// tetanus (post-tetanic potentiation would falsify it; devices lock it out) [TXT]. Each train emits a `tof` event
// time-stamped at the stimulus (the train marker) and a `measurement` with tofCount/tofRatio/ptc.
import { normal, type Sfc32State } from '../../rng/sfc32.ts';
import type { EngineEvent } from '../../types.ts';
import type { TofReading } from './nmb.ts';

export const TOF_DEFAULT_INTERVAL_S = 15;
export const PTC_REPORT_S = 23;
export const TETANUS_LOCKOUT_S = 60;
export const AMG_SD = 0.02;

export interface TofDevice {
  running: boolean;
  intervalS: number;
  nextT: number; // next scheduled train (NEVER when stopped)
  ptcAt: number; // time a PTC result is due, or −1
  lockUntil: number;
  rng: Sfc32State;
}

export const NEVER_T = 1e12;

export function createTofDevice(rng: Sfc32State): TofDevice {
  return { running: false, intervalS: TOF_DEFAULT_INTERVAL_S, nextT: NEVER_T, ptcAt: -1, lockUntil: -1, rng };
}

export function validateTofAction(action: string, intervalS: number | undefined): string | undefined {
  if (!['start', 'stop', 'train', 'ptc'].includes(action)) return 'tof action must be start, stop, train or ptc';
  if (intervalS !== undefined && !(Number.isFinite(intervalS) && intervalS >= 12 && intervalS <= 60)) return 'tof intervalS must be 12–60 s';
  return undefined;
}

export function tofAction(d: TofDevice, action: 'start' | 'stop' | 'train' | 'ptc', t: number, intervalS?: number): void {
  if (intervalS !== undefined) d.intervalS = intervalS;
  if (action === 'start') {
    d.running = true;
    d.nextT = Math.max(t, d.lockUntil);
  } else if (action === 'stop') {
    d.running = false;
    d.nextT = NEVER_T;
  } else if (action === 'train') d.nextT = Math.max(t, d.lockUntil);
  else {
    d.ptcAt = t + PTC_REPORT_S;
    d.lockUntil = t + TETANUS_LOCKOUT_S;
    if (d.nextT < d.lockUntil) d.nextT = d.running ? d.lockUntil : NEVER_T;
  }
}

/** Called every neuro step (0.1 s) with the TRUE reading; emits due trains into `out`. */
export function tofStep(d: TofDevice, t: number, r: TofReading, out: EngineEvent[]): void {
  if (d.ptcAt >= 0 && t >= d.ptcAt) {
    const ptc = r.count === 0 ? r.ptc : null; // PTC is only meaningful when the TOF count is 0
    out.push({ type: 'tof', t: d.ptcAt - PTC_REPORT_S, mode: 'ptc', count: r.count, ratio: null, ptc, twitches: [] });
    out.push({ type: 'measurement', t, values: { ptc: { value: ptc, flag: ptc === null ? 'invalid' : 'valid', at: t } } });
    d.ptcAt = -1;
  }
  if (t < d.nextT) return;
  const noise = AMG_SD * normal(d.rng);
  const ratio = r.count === 4 ? Math.max(0, Math.min(1.05, r.ratio + noise)) : null;
  const tw = r.twitches.map((x) => Math.round(Math.max(0, x * (1 + noise)) * 100) / 100);
  out.push({ type: 'tof', t, mode: 'tof', count: r.count, ratio: ratio === null ? null : Math.round(ratio * 100) / 100, ptc: null, twitches: tw });
  out.push({
    type: 'measurement', t,
    values: {
      tofCount: { value: r.count, flag: 'valid', at: t },
      tofRatio: { value: ratio === null ? null : Math.round(ratio * 100), flag: ratio === null ? 'invalid' : 'valid', at: t },
    },
  });
  d.nextT = d.running ? t + d.intervalS : NEVER_T;
}
