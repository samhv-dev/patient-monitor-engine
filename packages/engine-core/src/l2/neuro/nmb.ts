// Neuromuscular block PD (tables §5d; the neuro model owns it). Effect-site concentration (ng/mL, PK via bus.ts) →
// receptor-level block B = Ce^γ/(Ce^γ + EC50'^γ), first twitch T1 = 1 − B, then the TOF picture a stimulator records:
//   TOF count: T1 visible above 3 %, T2 above 10 %, T3 above 20 %, T4 above 25 % of control (tables §5d [TXT, VERIFY]);
//   TOF ratio (non-depolarising): T1^2.5 capped at 1 (tables §5d [FIT: NMB monitoring parameter by fit; brief research/44 L2-36]: TOFR 0.9 at T1 0.96, 0.7 at T1 0.87);
//   succinylcholine phase I: no fade (ratio 1); phase II: fade grows linearly from 3 to 7 mg/kg cumulative [FIT: succinylcholine phase II fade onset; onset
//     at the brief §4.9 "> 3–5 mg/kg or infusion"; brief research/44 L2-36];
//   post-tetanic count (TOF count 0 only): 0 while B ≥ 0.99, then 1–15 as T1 rises from 1 % to 3 % (tables §5d "PTC
//     appears when T1 = 0 and B < 0.99" [FIT: NMB monitoring parameter by fit; brief research/44 L2-36]).
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
 * EC50 (ng/mL) and Hill γ, fitted on the drug model's PK. Rocuronium: tables §5d (Plaud 1995 [P]; γ 4.8
 * [VERIFY]). Vecuronium, cisatracurium, succinylcholine [FIT: NMB monitoring parameter by fit; brief research/44 L2-36]; "max block" = the stimulator plateau.
 * Succinylcholine keeps the drug model's effect-site value: `l2/pk/nmb.ts` re-fits it (EC50 200 → 1160, γ 4 → 6)
 * together with the paper's CL/V1, because no (V1, CL, ke0) triple holds the §5d label course at EC50 200/γ 4 on a
 * clearance within Roy 2002's measured 37 ± 7 mL·min⁻¹·kg⁻¹; this row mirrors the drug model's numbers, it does not
 * fit them.
 */
export const NMB_PD: Record<NmbAgent, NmbPd> = {
  rocuronium: { ec50Thumb: 823, ec50Dia: 1424, gamma: 4.8, depolarising: false },
  vecuronium: { ec50Thumb: 158, ec50Dia: 158 * DIA_EC50_RATIO, gamma: 4, depolarising: false }, // [FIT: ted on the PK: max block 3.03 / T1 25 % 25.2 min; brief research/44 L2-36]
  cisatracurium: { ec50Thumb: 230, ec50Dia: 230 * DIA_EC50_RATIO, gamma: 6.9, depolarising: false }, // [FIT: from the drug row, meets on its PK: max block 2.48 / T1 25 % 42.4 min; brief research/44 L2-36]
  succinylcholine: { ec50Thumb: 1160, ec50Dia: 1160 * DIA_EC50_RATIO, gamma: 6, depolarising: true }, // [the PK's re-fitted effect-site value on Roy 2002's CL/V1 (measured EC50 734 ± 211 ng/mL [P]); holds onset 0.73 / T1 10 % 6.98 / 90 % 11.98 min]
};

export const TOF_THRESH = [0.03, 0.1, 0.2, 0.25] as const;
export const TOFR_EXP = 2.5;
export const PTC_LO = 0.01; // T1 at B = 0.99: the first post-tetanic twitch (tables §5d [FIT: NMB monitoring parameter by fit; brief research/44 L2-36])
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
  // The thumb keeps the Hill form the TOF monitor's label fits stand on; the diaphragm's force is its margin of safety
  const nd = site === 'dia' ? diaphragmNdBlock(ce, ec50Mult) : u > 0 ? u ** g / (1 + u ** g) : 0;
  const sp = NMB_PD.succinylcholine;
  const dep = hillBlock(ce.succinylcholine, (site === 'thumb' ? sp.ec50Thumb : sp.ec50Dia) * ec50Mult.succinylcholine, sp.gamma);
  return { b: 1 - (1 - nd) * (1 - dep), nd, dep };
}

/**
 * The margin of safety of neuromuscular transmission (Paton & Waud, J Physiol 1967;191:59, PMID 4292958): a muscle
 * fibre fails all-or-none when the FREE fraction of its end-plate receptors falls below 1/S, S its safety factor.
 * Threshold block (the most sensitive fibres) at a fractional occupancy 0.76 ± 0.05, nearly complete block (the most
 * resistant) at 0.917: safety factors 4.1 and 12 (the same paper). Miller 10e ch. 39 p. 1210 ("Safety margin"): block
 * becomes evident at 70–80 % occupancy and is complete at 90–95 %. The whole muscle's force is the share of its
 * fibres still transmitting (Miller 10e ch. 39 p. 1210: "the response decreases in parallel with the number of fibers
 * blocked"), so the two sourced occupancies are HARD EDGES: full force at or above the free fraction where even the
 * most sensitive fibres still transmit, exactly zero at or below the most resistant fibre's. Between the edges the fall
 * follows the muscle's OWN measured concentration-effect steepness (the agent's Hill exponent from its
 * concentration-effect study: rocuronium 4.8, Plaud 1995; the ED95-scaled exponents of the others), applied to the
 * normalised position inside the margin window, which keeps the half force at the window's midpoint and so at the
 * muscle's own EC50. A FLAT spread of fibre thresholds was measured first and is wrong: it made the whole-muscle curve
 * so shallow that cisatracurium 0.15 mg/kg still moved 39 breaths/min at 5 1/2 min, where apnoea clinically comes in
 * about 2 min - most fibres do not fail at the margin's far end.
 */
export const MOS_OCC_THRESHOLD = 0.76;
export const MOS_OCC_COMPLETE = 0.917;
/** Free fraction at which the most resistant (lo) and the most sensitive (hi) fibres of the THUMB fail. */
const MOS_FREE_LO = 1 - MOS_OCC_COMPLETE;
const MOS_FREE_HI = 1 - MOS_OCC_THRESHOLD;
/** u = Ce/Kd at the thumb's half force: the free fraction halfway between the edges, f50 = 1/(1 + u50). */
const MOS_U50 = 1 / ((MOS_FREE_LO + MOS_FREE_HI) / 2) - 1;

/**
 * The force (0–1) of a muscle whose fibres fail between free fractions `lo` (the most resistant) and `hi` (the most
 * sensitive), with the muscle's own Hill steepness inside that window: w = the normalised position in the window,
 * force = w^g / (w^g + (1 - w)^g) — exactly 1 at or above `hi`, exactly 0 at or below `lo`, one half at the midpoint.
 */
export function marginForce(free: number, lo: number, hi: number, gamma = 1): number {
  const w = Math.max(0, Math.min(1, (free - lo) / (hi - lo)));
  if (w <= 0 || w >= 1) return w;
  const x = w ** gamma;
  return x / (x + (1 - w) ** gamma);
}

/**
 * The DIAPHRAGM's non-depolarising force from its receptors' free fraction. Competitive occupancy p = u/(1 + u), u =
 * Σ Ce_i/Kd_i (agents add as equipotent fractions, tables §5d). Kd is the RECEPTOR's (the same molecule at every
 * muscle): it is placed so the thumb's force is halved at the thumb's EC50 (Kd = EC50_thumb/u50; rocuronium 823 ng/mL,
 * Plaud 1995), a derived value, not a fit. The diaphragm is more resistant because its margin is larger, not because its
 * receptors bind less: its fibres' free-fraction thresholds are the thumb's divided by m, m placed so its half force
 * falls at its own EC50 (1424 ng/mL, Plaud 1995; Miller 10e ch. 39 p. 1213: the diaphragm needs 1.4–2.0× the dose).
 * Force is exactly 0 while occupancy is above the most resistant fibre's threshold — the FIRST effort appears when the
 * block's recovery crosses the margin, not at an arbitrary fraction of a Hill curve. Returns the BLOCK, 1 − force.
 */
export function diaphragmNdBlock(ce: Record<NmbAgent, number>, ec50Mult: Record<NmbAgent, number>): number {
  let u = 0;
  let ratioW = 0;
  let gSum = 0;
  for (const id of ['rocuronium', 'vecuronium', 'cisatracurium'] as const) {
    const pd = NMB_PD[id];
    const kd = (pd.ec50Thumb * ec50Mult[id]) / MOS_U50;
    const ui = ce[id] / kd;
    u += ui;
    ratioW += ui * (pd.ec50Dia / pd.ec50Thumb);
    gSum += ui * pd.gamma; // the agents' own steepness, weighted as they add
  }
  if (!(u > 0)) return 0;
  const ratio = ratioW / u; // the diaphragm's potency ratio (1.73 for every agent)
  const m = (1 + ratio * MOS_U50) / (1 + MOS_U50); // f50,thumb / f50,dia
  return 1 - marginForce(1 / (1 + u), MOS_FREE_LO / m, MOS_FREE_HI / m, gSum / u);
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

/**
 * Succinylcholine phase II fraction from the cumulative dose (the drug model's `cumulativeMgPerKg`): 0 at 3 mg/kg →
 * 1 at 7 [FIT: NMB monitoring parameter by fit; brief research/44 L2-36].
 */
export function phase2Fraction(cumMgPerKg: number): number {
  return Math.max(0, Math.min(1, (cumMgPerKg - 3) / 4));
}
