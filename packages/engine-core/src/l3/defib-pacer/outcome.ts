// Post-shock rhythm (brief §6.5 "Post-shock rhythm" table; research 03 §1.8–§1.9): a scenario rule or the
// instructor's pre-selection wins; otherwise the outcome is drawn from the `outcome` PRNG stream.
import { uniform, type Sfc32State } from '../../rng/sfc32.ts';
import type { RhythmId } from '../../types.ts';

export type ShockClass = 'vf' | 'organisedPulse' | 'perfusing' | 'arrest';
export type ShockOutcome = 'unchanged' | 'vf' | 'asystole' | 'pea' | 'rosc' | 'sinus';

/** VF / pulseless VT shocked at ≥ the skin's first-shock energy (brief §6.5). */
export const VF_TABLE = { persistent: 0.3, asystolePea: 0.6, rosc: 0.1 } as const;
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
    return { unchanged: 1 - rosc - asyPea, asystole: asyPea * ASYSTOLE_SHARE, pea: asyPea * (1 - ASYSTOLE_SHARE), rosc };
  }
  if (!c.synced && c.onTPeak) return { vf: R_ON_T_VF, unchanged: 1 - R_ON_T_VF };
  if (c.cls === 'organisedPulse') return { sinus: CARDIOVERSION_SINUS, unchanged: 1 - CARDIOVERSION_SINUS };
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
