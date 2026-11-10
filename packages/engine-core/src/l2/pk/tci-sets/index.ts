// The TCI-set registry (docs/plans/pump-rack-tci.md §6.1, pieces T1 and T2). Each registered set was read against its
// paper by two readers (docs/guides/tci-sets.md, "The T2 reading"); the engine's patient models and the TCI command
// read their parameters and ids from here. How to add a set: docs/guides/tci-sets.md.
import { ELEVELD } from './eleveld.ts';
import { GEPTS } from './gepts.ts';
import { MARSH } from './marsh.ts';
import { MARSH_MODIFIED } from './marsh-modified.ts';
import { MINTO } from './minto.ts';
import { SCHNIDER } from './schnider.ts';
import { SHAFER } from './shafer.ts';
import type { TciSet } from './types.ts';

export type * from './types.ts';

/** Every registered set. Its order is the order a pump lists them in. */
export const TCI_SETS: readonly TciSet[] = [ELEVELD, SCHNIDER, MARSH, MARSH_MODIFIED, MINTO, SHAFER, GEPTS];

/**
 * Model ids the engine's TCI command accepts without a registered set, with the drug each was written for. The list
 * only shrinks (rule 7 of the check); since T2 it is empty, and the command accepts exactly the registry's ids
 * (`TCI_MODEL_IDS` in pipeline.ts).
 */
export const PENDING_TCI_MODEL_IDS: Readonly<Record<string, string>> = {};

/**
 * Why each pending id is not yet registered, and what its registration needs (plan §13 T2). A set registers only when
 * every constant it uses has been read in the paper itself by two readers who agree digit for digit. The check
 * requires a reason for every pending id.
 */
export const PENDING_TCI_REASONS: Readonly<Record<string, string>> = {};

export const tciSet = (id: string): TciSet | undefined => TCI_SETS.find((s) => s.meta.id === id);

/** What a pump and the engine say when a set without a ke0 is asked to target the effect site (rule 3). */
export const NO_KE0_REFUSAL = 'this model has no ke0: plasma targeting only';

/** The refusal for a TCI mode the set cannot run, or undefined when it can. */
export function tciModeRefusal(set: TciSet, mode: 'plasma' | 'effect'): string | undefined {
  return mode === 'effect' && set.meta.ke0.none === true ? NO_KE0_REFUSAL : undefined;
}
