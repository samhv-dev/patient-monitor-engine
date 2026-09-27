// Stage 7a test helpers: drive a CircModel with a sinus rhythm that follows the model's own HR request (as the
// rhythm engine follows the hr ramp in MODELED mode), and a ventilator pleural signal.
import { circOnAtrial, circOnBeat, RESTING_ENV, stepCircModel, type CircBeat, type CircEnv, type CircModelState } from '../../src/l2/circ/model.ts';
import { createOut, type CircOut } from '../../src/l2/circ/circuit.ts';
import { CMH2O_TO_MMHG, P_PL0, T_IT } from '../../src/l2/circ/params.ts';

export interface Vent { peep: number; vt: number; c: number; rr: number; ie: number }
export const VENT_DEFAULT: Vent = { peep: 5, vt: 500, c: 50, rr: 12, ie: 2 };

/** Alveolar pressure (cmH2O) of a volume-controlled breath with passive exponential expiration (τ 0.5 s). */
export function palv(v: Vent, t: number): number {
  const T = 60 / v.rr;
  const ti = T / (1 + v.ie);
  const u = ((t % T) + T) % T;
  const vol = u < ti ? v.vt * (u / ti) : v.vt * Math.exp(-(u - ti) / 0.5);
  return v.peep + vol / v.c;
}
export function ventEnv(v: Vent = VENT_DEFAULT): CircEnv {
  return { ...RESTING_ENV, pIt: (t) => P_PL0 + T_IT * palv(v, t) * CMH2O_TO_MMHG };
}

export interface Driver { m: CircModelState; nextBeat: number; o: CircOut }
export function driver(m: CircModelState): Driver {
  return { m, nextBeat: m.t + 0.2, o: createOut() };
}

/** Run to tEnd: beats follow m.hrModel (P wave 160 ms before each R). */
export function runTo(dr: Driver, tEnd: number, env: CircEnv, onStep?: (o: CircOut, t: number) => void): void {
  const m = dr.m;
  while (m.t < tEnd - 1e-9) {
    while (dr.nextBeat <= m.t + 0.3) {
      circOnAtrial(m, dr.nextBeat - 0.16);
      circOnBeat(m, dr.nextBeat, m.hrModel, 'sinus', true);
      dr.nextBeat += 60 / m.hrModel;
    }
    stepCircModel(m, Math.min(tEnd, m.t + 0.02), env, dr.o, onStep);
  }
}

export const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
export function beatsIn(m: CircModelState, all: CircBeat[], t0: number, t1: number): CircBeat[] {
  return all.filter((b) => b.t >= t0 && b.t < t1);
}
/** Collects every completed beat (the model keeps only 16). */
export function collectBeats(m: CircModelState, into: CircBeat[]): () => void {
  let n = 0;
  return () => {
    for (const b of m.beats) if (b.t > (into[into.length - 1]?.t ?? -1)) into.push(b);
    n++;
  };
}
export function ppv(bs: CircBeat[]): number {
  const pp = bs.map((b) => b.sbp - b.dbp);
  return ((Math.max(...pp) - Math.min(...pp)) / mean(pp)) * 100;
}
