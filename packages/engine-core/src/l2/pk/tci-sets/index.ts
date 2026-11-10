// The TCI-set registry (docs/plans/pump-rack-tci.md §6.1, piece T1). It ships EMPTY: no set's numbers are entered
// here; piece T2 moves the engine's six models in, each read against its paper by a second reader. Nothing in the
// engine reads this module yet, so it changes no behaviour. How to add a set: docs/guides/tci-sets.md.
import type { TciSet } from './types.ts';

export type * from './types.ts';

/** Every registered set. Its order is the order a pump lists them in. */
export const TCI_SETS: readonly TciSet[] = [];

/**
 * The model ids the engine's TCI command accepts today without a registered set (`validatePkCommand`'s hard-coded list
 * in pipeline.ts), with the drug each was written for. The list only shrinks: a set registered under one of these ids
 * leaves it in the same pull request, and when it is empty T2 replaces the hard-coded list with the registry's ids
 * (rule 7 of the check).
 */
export const PENDING_TCI_MODEL_IDS: Readonly<Record<string, string>> = {
  eleveld: 'propofol',
  schnider: 'propofol',
  marsh: 'propofol',
  minto: 'remifentanil',
  shafer: 'fentanyl',
  gepts: 'sufentanil',
};

export const tciSet = (id: string): TciSet | undefined => TCI_SETS.find((s) => s.meta.id === id);

/** What a pump and the engine say when a set without a ke0 is asked to target the effect site (rule 3). */
export const NO_KE0_REFUSAL = 'this model has no ke0: plasma targeting only';

/** The refusal for a TCI mode the set cannot run, or undefined when it can. */
export function tciModeRefusal(set: TciSet, mode: 'plasma' | 'effect'): string | undefined {
  return mode === 'effect' && set.meta.ke0.none === true ? NO_KE0_REFUSAL : undefined;
}
