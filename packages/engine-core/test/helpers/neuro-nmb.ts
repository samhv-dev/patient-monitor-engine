// TOF reading on the 7g rig (Task 3): 7f's NMB PD (nmb.ts, neostigmine.ts) applied to the bus concentrations.
import { readBus, type NmbAgent } from '../../src/l2/neuro/bus.ts';
import { neoEc50Mult } from '../../src/l2/neuro/neostigmine.ts';
import { phase2Fraction, siteBlock, tofFrom, type TofReading } from '../../src/l2/neuro/nmb.ts';
import type { DrugBus } from '../../src/types-pk.ts';
import { runTo, until, type Rig } from './neuro.ts';

export const ONE: Record<NmbAgent, number> = { rocuronium: 1, vecuronium: 1, cisatracurium: 1, succinylcholine: 1 };

export interface NmbPoint {
  tof: TofReading;
  dia: number; // diaphragm block 0–1
}

/** The TOF picture and the diaphragm block from a bus, with interaction multipliers `ec50` (neostigmine read from the bus). */
export function readNmb(bus: DrugBus, ec50: Record<NmbAgent, number> = ONE): NmbPoint {
  const x = readBus(bus);
  const neo = neoEc50Mult(x.achGain);
  const m: Record<NmbAgent, number> = {
    rocuronium: ec50.rocuronium * neo, vecuronium: ec50.vecuronium * neo, cisatracurium: ec50.cisatracurium * neo, succinylcholine: ec50.succinylcholine,
  };
  const th = siteBlock(x.nmj, 'thumb', m);
  const di = siteBlock(x.dia, 'dia', m);
  const ndShare = th.b > 0 ? th.nd / Math.max(1e-9, th.nd + th.dep) : 0;
  return { tof: tofFrom(th.b, ndShare, phase2Fraction(x.suxCumMgPerKg)), dia: di.b };
}

/** Minutes from now until the TOF predicate holds (checked every second); NaN if never within `maxMin`. */
export function untilTof(r: Rig, pred: (p: NmbPoint) => boolean, maxMin: number, ec50: Record<NmbAgent, number> = ONE): number {
  return until(r, (bus) => pred(readNmb(bus, ec50)), maxMin);
}

/** T1 (thumb, fraction of control) every simulated second from now for `min` minutes: index i = second i + 1. */
export function t1Course(r: Rig, min: number, ec50: Record<NmbAgent, number> = ONE): number[] {
  const out: number[] = [];
  runTo(r, r.tS / 60 + min, (bus) => out.push(readNmb(bus, ec50).tof.t1));
  return out;
}

/**
 * Onset = time to MAXIMUM block as a stimulator sees it — the labels' "max block" (tables §5d: vecuronium 3–5 min,
 * cisatracurium 2–3 min): the first second with T1 < 10 % after which T1 falls by less than 1 point over the next
 * 45 s (three 15 s trains) [ENG operational rule: a one-compartment effect site keeps creeping toward its nadir for
 * minutes, below the stimulator's resolution]. Minutes from the start of the course; NaN if never.
 */
export function onsetMin(t1: number[]): number {
  for (let i = 0; i + 45 < t1.length; i++) if ((t1[i] as number) < 0.1 && (t1[i] as number) - (t1[i + 45] as number) < 0.01) return (i + 1) / 60;
  return Number.NaN;
}

/** Minutes from the start of the course until T1 first reaches `level` AFTER the nadir; NaN if never. */
export function recoveryMin(t1: number[], level: number): number {
  let im = 0;
  for (let i = 1; i < t1.length; i++) if ((t1[i] as number) < (t1[im] as number)) im = i;
  for (let i = im; i < t1.length; i++) if ((t1[i] as number) >= level) return (i + 1) / 60;
  return Number.NaN;
}
