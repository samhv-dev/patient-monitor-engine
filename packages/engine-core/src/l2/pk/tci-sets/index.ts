// The TCI-set registry (docs/plans/pump-rack-tci.md §6.1, pieces T1 and T2). Each registered set was read against its
// paper by two readers (docs/guides/tci-sets.md, "The T2 reading"); the engine's patient models and the TCI command
// read their parameters and ids from here. How to add a set: docs/guides/tci-sets.md.
import { ELEVELD } from './eleveld.ts';
import { GEPTS } from './gepts.ts';
import { MINTO } from './minto.ts';
import { SCHNIDER } from './schnider.ts';
import { SHAFER } from './shafer.ts';
import type { TciSet } from './types.ts';

export type * from './types.ts';

/** Every registered set. Its order is the order a pump lists them in. */
export const TCI_SETS: readonly TciSet[] = [ELEVELD, SCHNIDER, MINTO, SHAFER, GEPTS];

/**
 * The model ids the engine's TCI command accepts today without a registered set (`validatePkCommand`'s hard-coded list
 * in pipeline.ts), with the drug each was written for. The list only shrinks: a set registered under one of these ids
 * leaves it in the same pull request, and when it is empty T2 replaces the hard-coded list with the registry's ids
 * (rule 7 of the check).
 */
export const PENDING_TCI_MODEL_IDS: Readonly<Record<string, string>> = {
  marsh: 'propofol',
};

/**
 * Why each pending id is not yet registered, and what its registration needs (plan §13 T2). A set registers only when
 * every constant it uses has been read in the paper itself by two readers who agree digit for digit. The check
 * requires a reason for every pending id.
 */
export const PENDING_TCI_REASONS: Readonly<Record<string, string>> = {
  marsh:
    'Marsh 1991 (doi 10.1093/bja/67.1.41, PMID 1859758): the PK is confirmed by both readers in Table I, p. 42 (Vc ' +
    '228 ml/kg from the authors\' pilot studies; k10 0.119, k12 0.112, k13 0.0419, k21 0.055, k31 0.0033 /min, which ' +
    'the table attributes to its ref. 9, Gepts 1987, Anesth Analg 66:1256, not in the library). The ke0 0.26 /min ' +
    'has no source: Marsh prints no ke0, and Struys 2000 (PMID 10691226) gives 0.20 (Billard 1997, group II) and 1.21 ' +
    '(time to peak 1.6 min with Marsh PK, p. 404). Registration needs the source of 0.26 (the table it is printed in).',
};

export const tciSet = (id: string): TciSet | undefined => TCI_SETS.find((s) => s.meta.id === id);

/** What a pump and the engine say when a set without a ke0 is asked to target the effect site (rule 3). */
export const NO_KE0_REFUSAL = 'this model has no ke0: plasma targeting only';

/** The refusal for a TCI mode the set cannot run, or undefined when it can. */
export function tciModeRefusal(set: TciSet, mode: 'plasma' | 'effect'): string | undefined {
  return mode === 'effect' && set.meta.ke0.none === true ? NO_KE0_REFUSAL : undefined;
}
