// Neuromuscular block PD (tables §5d; 7f owns it, R51 §2). Effect-site concentration (ng/mL, 7g's PK via bus.ts) →
// receptor-level block B = Ce^γ/(Ce^γ + EC50'^γ), first twitch T1 = 1 − B, then the TOF picture a stimulator records:
//   TOF count: T1 visible above 3 %, T2 above 10 %, T3 above 20 %, T4 above 25 % of control (tables §5d [TXT, VERIFY]);
//   TOF ratio (non-depolarising): T1^2.5 capped at 1 (tables §5d [ENG]: TOFR 0.9 at T1 0.96, 0.7 at T1 0.87);
//   succinylcholine phase I: no fade (ratio 1); phase II: fade grows linearly from 3 to 7 mg/kg cumulative [ENG; onset
//     at the brief §4.9 "> 3–5 mg/kg or infusion"];
//   post-tetanic count (TOF count 0 only): 0 while B ≥ 0.99, then 1–15 as T1 rises from 1 % to 3 % (tables §5d "PTC
//     appears when T1 = 0 and B < 0.99" [ENG]).
// EC50' = EC50 × interaction/profile multipliers (interactions.ts) × neostigmine (neostigmine.ts). Pure functions.
import type { NmbAgent } from './bus.ts';

export type { NmbAgent };
export { NMB_AGENTS } from './bus.ts';

export interface NmbPd {
  ec50Thumb: number; // ng/mL
  ec50Dia: number; // ng/mL
  gamma: number;
  depolarising: boolean;
}

/** Diaphragm/larynx EC50 = thumb × 1.73 for every agent (Plaud 1995: rocuronium 1424/823; tables §5d). */
export const DIA_EC50_RATIO = 1.73;

/**
 * EC50 (ng/mL) and Hill γ, fitted on 7g's PK (R51 §5; Task 4 Step 5). Rocuronium: tables §5d (Plaud 1995 [P]; γ 4.8
 * [VERIFY]). Vecuronium, cisatracurium, succinylcholine [ENG]; "max block" = the stimulator plateau (decision 3).
 * Succinylcholine keeps 7g's effect-site value: its onset/duration miss is 7g's ke0 (FU-3 item 1), never fitted here.
 */
export const NMB_PD: Record<NmbAgent, NmbPd> = {
  rocuronium: { ec50Thumb: 823, ec50Dia: 1424, gamma: 4.8, depolarising: false },
  vecuronium: { ec50Thumb: 158, ec50Dia: 158 * DIA_EC50_RATIO, gamma: 4, depolarising: false }, // [ENG, fitted on 7g's PK: max block 3.03 / T1 25 % 25.2 min]
  cisatracurium: { ec50Thumb: 230, ec50Dia: 230 * DIA_EC50_RATIO, gamma: 6.9, depolarising: false }, // [ENG, 7g's value, meets on 7g's PK: max block 2.48 / T1 25 % 42.4 min]
  succinylcholine: { ec50Thumb: 200, ec50Dia: 200 * DIA_EC50_RATIO, gamma: 4, depolarising: true }, // [ENG, 7g's effect-site value; band missed: onset 0.17 / T1 10 % 5.37 min — FU-3 item 1]
};

export const TOF_THRESH = [0.03, 0.1, 0.2, 0.25] as const;
export const TOFR_EXP = 2.5;
export const PTC_LO = 0.01; // T1 at B = 0.99: the first post-tetanic twitch (tables §5d [ENG])
export const PTC_HI = 0.03; // T1 at which the first TOF twitch returns: PTC 15

/** Fractional receptor-level block 0–1 of one agent at concentration ce. */
export function hillBlock(ce: number, ec50: number, gamma: number): number {
  if (ce <= 0) return 0;
  const x = (ce / ec50) ** gamma;
  return x / (1 + x);
}

/**
 * Combined block of several agents at one site: non-depolarisers add as equipotent fractions (Ce/EC50 summed —
 * roc + vec are additive; tables §5d [TXT]); succinylcholine combines as an independent action.
 */
export function siteBlock(ce: Record<NmbAgent, number>, site: 'thumb' | 'dia', ec50Mult: Record<NmbAgent, number>): { b: number; nd: number; dep: number } {
  let u = 0;
  let gSum = 0;
  let gW = 0;
  for (const id of ['rocuronium', 'vecuronium', 'cisatracurium'] as const) {
    const pd = NMB_PD[id];
    const e = (site === 'thumb' ? pd.ec50Thumb : pd.ec50Dia) * ec50Mult[id];
    const ui = ce[id] / e;
    u += ui;
    gSum += pd.gamma * ui;
    gW += ui;
  }
  const g = gW > 0 ? gSum / gW : 4.8;
  const nd = u > 0 ? u ** g / (1 + u ** g) : 0;
  const sp = NMB_PD.succinylcholine;
  const dep = hillBlock(ce.succinylcholine, (site === 'thumb' ? sp.ec50Thumb : sp.ec50Dia) * ec50Mult.succinylcholine, sp.gamma);
  return { b: 1 - (1 - nd) * (1 - dep), nd, dep };
}

export interface TofReading {
  t1: number; // first twitch, fraction of control
  count: 0 | 1 | 2 | 3 | 4;
  ratio: number; // T4/T1 (meaningful when count = 4)
  ptc: number; // post-tetanic count 0–15 (count 0 only; 15 otherwise)
  twitches: [number, number, number, number];
}

/**
 * The TOF picture from the thumb block. `phase2` 0–1 (succinylcholine phase II), `ndShare` = fraction of the block
 * that is non-depolarising (fade comes only from that part).
 */
export function tofFrom(b: number, ndShare: number, phase2: number): TofReading {
  const t1 = Math.max(0, Math.min(1, 1 - b));
  const fadeExp = TOFR_EXP * Math.max(ndShare, phase2);
  const ratio = Math.min(1, fadeExp > 0 ? t1 ** fadeExp : 1);
  let count: TofReading['count'] = 0;
  for (const th of TOF_THRESH) if (t1 > th) count = (count + 1) as TofReading['count'];
  const tw: TofReading['twitches'] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) tw[i] = i < count ? t1 * ratio ** (i / 3) : 0;
  const ptc = count === 0 && t1 > PTC_LO ? Math.max(1, Math.min(15, Math.round((15 * (t1 - PTC_LO)) / (PTC_HI - PTC_LO)))) : 0;
  return { t1, count, ratio, ptc: count === 0 ? ptc : 15, twitches: tw };
}

/** Succinylcholine phase II fraction from the cumulative dose (7g's `cumulativeMgPerKg`): 0 at 3 mg/kg → 1 at 7 [ENG]. */
export function phase2Fraction(cumMgPerKg: number): number {
  return Math.max(0, Math.min(1, (cumMgPerKg - 3) / 4));
}
