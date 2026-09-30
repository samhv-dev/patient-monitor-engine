// Post-shock rhythm (brief §6.5 "Post-shock rhythm" table; research 03 §1.8–§1.9): a scenario rule or the
// instructor's pre-selection wins; otherwise the outcome is drawn from the `outcome` PRNG stream.
import { uniform, type Sfc32State } from '../../rng/sfc32.ts';
import type { RhythmId } from '../../types.ts';

export type ShockClass = 'vf' | 'organisedPulse' | 'perfusing' | 'arrest';
export type ShockOutcome = 'unchanged' | 'vf' | 'asystole' | 'pea' | 'rosc' | 'sinus';

/** VF / pulseless VT shocked at ≥ the skin's first-shock energy. FU-7 (DV amendment, research/20 DV-01a): biphasic
 * first-shock TERMINATION (VF removed ≥ 5 s) is 85–98 % — Schneider 2000 (ORBIT 150 J 96 %), van Alem 2003 (98 %),
 * Stiell 2007 (≈ 88–90 %) [VERIFY] — so persistent 0.1 (90 %, the midpoint), replacing brief §6.5's monophasic-era 0.3.
 * Termination is not ROSC: the ROSC share stays 0.1 (van Alem 2003: higher termination, no more ROSC); the rest of the
 * termination lands in asystole/PEA, where CPR resumes (ERC 2021 ALS). */
export const VF_TABLE = { persistent: 0.1, asystolePea: 0.8, rosc: 0.1 } as const;
/** Share of the asystole/PEA outcome that is asystole (the rest organised PEA) [ENG]. */
export const ASYSTOLE_SHARE = 0.5;
/** Three-phase VF model: ROSC share × 0.5 at 4–10 min and × 0.2 beyond 10 min; the rest goes to asystole/PEA. */
export const VF_DURATION_FACTORS = [
  { fromS: 600, rosc: 0.2 },
  { fromS: 240, rosc: 0.5 },
] as const;
/** Energy below 50 % of the default halves the termination probability [ENG]. */
export const LOW_ENERGY_FRACTION = 0.5;
export const LOW_ENERGY_TERMINATION = 0.5;
/** Synchronised cardioversion of an organised tachyarrhythmia with a pulse: sinus 0.8 [ENG]. */
export const CARDIOVERSION_SINUS = 0.8;
/** Unsynchronised shock on the T peak ± 40 ms of a perfusing rhythm: VF 0.3 [ENG] (teaches sync). */
export const R_ON_T_VF = 0.3;
export const T_PEAK_WINDOW_S = 0.04;

const VF_CLASS: ReadonlySet<RhythmId> = new Set(['vfCoarse', 'vfFine', 'vtPoly', 'torsades']);
const ARREST: ReadonlySet<RhythmId> = new Set(['asystole', 'pWaveAsystole', 'agonal']);
const ORGANISED_TACHY: ReadonlySet<RhythmId> = new Set([
  'svtAvnrt', 'svtAvrt', 'aflutter', 'afib', 'preexcitedAf', 'atrialTach', 'junctionalTachy', 'mat', 'vtMono',
]);

/** What is being shocked (vtPoly/torsades count as pulseless VT: their k_rhythm is ≤ 0.2, brief §4.8) [ENG]. */
export function shockClass(id: RhythmId, pulseless: boolean): ShockClass {
  if (VF_CLASS.has(id) || (pulseless && (id === 'vtMono' || id === 'idioventricular'))) return 'vf';
  if (ARREST.has(id) || pulseless) return 'arrest';
  if (ORGANISED_TACHY.has(id)) return 'organisedPulse';
  return 'perfusing';
}

export interface ShockContext {
  cls: ShockClass;
  synced: boolean;
  energyJ: number;
  /** The skin's first-shock energy (defib.energyAdultJ). */
  defaultJ: number;
  /** How long VF has run (s), for the three-phase model. */
  vfDurationS: number;
  /** An unsynchronised shock landing within ±40 ms of the last beat's T peak. */
  onTPeak: boolean;
  /** FU-7 (addendum 23): the STATE the shock lands in. Every field is optional — absent = the state-free table.
   *  antiarrhythmicU: 7g's potency-weighted occupancy (amiodarone/lidocaine/procainamide), 0–1;
   *  kEcg: 7c's membrane-effective potassium (mmol/L); ph: arterial pH;
   *  cppMmHg: FU-4's CONTINUOUS no-beat coronary perfusion pressure (never a beat's minimum — DV amendment);
   *  arrestS: seconds since the arrest began (used only when vfDurationS is 0, so the VF table is not double-counted);
   *  tempC: core temperature (°C); rhythmId: the shocked rhythm (the cardioversion curve). */
  antiarrhythmicU?: number;
  kEcg?: number;
  ph?: number;
  cppMmHg?: number;
  arrestS?: number;
  tempC?: number;
  rhythmId?: RhythmId;
}

/** FU-7 (addendum 23) state factors on the ROSC share. Each is [ENG] with its sourced DIRECTION named. */
export const AA_ROSC_GAIN = 0.3; // ARREST 1999 (survival to admission 44.3 % vs 34.6 %), ALPS 2016
export const K_ROSC_PER_MMOL = 0.25; // above 6 mmol/L (UK Renal Association: treat the K before expecting a shock to work)
export const K_ROSC_FLOOR = 0.2;
export const PH_ROSC_PER_UNIT = 1.5; // below pH 7.2 (ALS reversible causes)
export const PH_ROSC_FLOOR = 0.3;
export const CPP_ROSC_REF = 20; // Paradis 1990: no ROSC below CPP 15; mean 25 in ROSC vs 8 without
export const CPP_ROSC_MIN = 0.2;
export const CPP_ROSC_MAX = 1.3;
/** FU-7 (DV amendment): CoPP matters only in the circulatory phase — Weisfeldt & Becker 2002 (0–4 min electrical
 * phase: shock at once), Cobb 1999 / Wik 2003 (CPR first helps only beyond 4–5 min). The same 240 s as VF_DURATION_FACTORS. */
export const CIRCULATORY_PHASE_S = 240;
export const ARREST_ROSC_FULL_S = 1800; // a non-VF arrest's own decay [ENG]
/** FU-7 (DV amendment, research/20 DV-24a/b): VF below 30 °C is often shock-refractory (ERC 2021 special circumstances;
 * Danzl & Pozos 1994; Brown 2012) — termination × (1 − 0.3 per °C below 30), floor 0.2 [ENG magnitude]. */
export const TEMP_SHOCK_C = 30;
export const TEMP_TERM_PER_C = 0.3;
export const TEMP_TERM_FLOOR = 0.2;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** FU-7 (addendum 23): the multiplier on the ROSC share from the state the shock lands in (1 = no information). */
export function shockStateFactor(c: ShockContext): number {
  let f = 1 + AA_ROSC_GAIN * clamp(c.antiarrhythmicU ?? 0, 0, 1);
  if (c.kEcg !== undefined) f *= clamp(1 - K_ROSC_PER_MMOL * Math.max(0, c.kEcg - 6), K_ROSC_FLOOR, 1);
  if (c.ph !== undefined) f *= clamp(1 - PH_ROSC_PER_UNIT * Math.max(0, 7.2 - c.ph), PH_ROSC_FLOOR, 1);
  const phaseS = c.vfDurationS > 0 ? c.vfDurationS : c.arrestS; // FU-7 (DV amendment): the arrest's own clock
  if (c.cppMmHg !== undefined && phaseS !== undefined && phaseS >= CIRCULATORY_PHASE_S) f *= clamp(c.cppMmHg / CPP_ROSC_REF, CPP_ROSC_MIN, CPP_ROSC_MAX);
  if (c.arrestS !== undefined && c.vfDurationS <= 0) f *= clamp(1 - c.arrestS / ARREST_ROSC_FULL_S, 0.2, 1);
  return f;
}

/** FU-7 (DV amendment): the multiplier on the whole TERMINATION (ROSC and asystole/PEA) from core temperature. */
export function temperatureTermination(tempC: number | undefined): number {
  return tempC === undefined ? 1 : clamp(1 - TEMP_TERM_PER_C * Math.max(0, TEMP_SHOCK_C - tempC), TEMP_TERM_FLOOR, 1);
}

/** FU-7 (DV amendment, research/20 DV-06a–c): synchronised cardioversion success by rhythm and biphasic energy,
 * p = pMax / (1 + (E50/E)^2) [ENG fit]. AF: Page 2002, Mittal 2000, ERC 2021 (120–150 J start); flutter and paroxysmal
 * SVT: ERC 2021 (70–120 J), Neumar 2010 (50–100 J), > 90 %; monomorphic VT with a pulse: Neumar 2010 (100 J, > 90 %)
 * [VERIFY]. Any other organised tachycardia, or no rhythm id, keeps the flat CARDIOVERSION_SINUS. */
export const CARDIOVERSION_HILL = 2;
export const CARDIOVERSION_CURVES: Partial<Record<RhythmId, { pMax: number; e50J: number }>> = {
  afib: { pMax: 0.95, e50J: 70 }, preexcitedAf: { pMax: 0.95, e50J: 70 },
  aflutter: { pMax: 0.97, e50J: 12 }, svtAvnrt: { pMax: 0.97, e50J: 12 }, svtAvrt: { pMax: 0.97, e50J: 12 },
  vtMono: { pMax: 0.97, e50J: 20 },
};
export function cardioversionSinus(c: ShockContext): number {
  const k = c.rhythmId === undefined ? undefined : CARDIOVERSION_CURVES[c.rhythmId];
  if (!k) return CARDIOVERSION_SINUS;
  return k.pMax / (1 + (k.e50J / Math.max(1, c.energyJ)) ** CARDIOVERSION_HILL);
}

/** Outcome probabilities for a shock (they sum to 1). */
export function outcomeProbabilities(c: ShockContext): Partial<Record<ShockOutcome, number>> {
  if (c.cls === 'arrest') return { unchanged: 1 };
  if (c.cls === 'vf') {
    let rosc: number = VF_TABLE.rosc;
    let asyPea: number = VF_TABLE.asystolePea;
    const f = VF_DURATION_FACTORS.find((x) => c.vfDurationS >= x.fromS);
    if (f) {
      asyPea += rosc * (1 - f.rosc);
      rosc *= f.rosc;
    }
    if (c.energyJ < LOW_ENERGY_FRACTION * c.defaultJ) {
      rosc *= LOW_ENERGY_TERMINATION;
      asyPea *= LOW_ENERGY_TERMINATION;
    }
    // FU-7 (DV amendment): below 30 °C the whole termination falls (the refractory hypothermic VF), like low energy
    const tf = temperatureTermination(c.tempC);
    rosc *= tf;
    asyPea *= tf;
    // FU-7 (addendum 23): the state the shock lands in moves the ROSC share; what it loses (or gains) goes to (or comes
    // from) the asystole/PEA share, so the three outcomes still sum to 1 and `unchanged` keeps its meaning.
    const roscState = Math.min(0.95, rosc * shockStateFactor(c));
    asyPea = Math.max(0, asyPea + (rosc - roscState));
    rosc = roscState;
    return { unchanged: Math.max(0, 1 - rosc - asyPea), asystole: asyPea * ASYSTOLE_SHARE, pea: asyPea * (1 - ASYSTOLE_SHARE), rosc };
  }
  if (!c.synced && c.onTPeak) return { vf: R_ON_T_VF, unchanged: 1 - R_ON_T_VF };
  if (c.cls === 'organisedPulse') {
    const p = cardioversionSinus(c); // FU-7 (DV amendment): by rhythm and energy; the flat 0.8 without a rhythm id
    return { sinus: p, unchanged: 1 - p };
  }
  return { unchanged: 1 };
}

const ORDER: readonly ShockOutcome[] = ['unchanged', 'vf', 'asystole', 'pea', 'rosc', 'sinus'];

/** Draw one outcome from the `outcome` stream (one uniform per shock, so replay is exact). */
export function drawOutcome(c: ShockContext, rng: Sfc32State): ShockOutcome {
  const p = outcomeProbabilities(c);
  const u = uniform(rng);
  let acc = 0;
  for (const k of ORDER) {
    acc += p[k] ?? 0;
    if (u < acc) return k;
  }
  return 'unchanged';
}
