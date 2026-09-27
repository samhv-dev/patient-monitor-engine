// Stage 7x public types (R52): the opt-in, read-only `truth` event that carries a pruned copy of the pipeline state
// for developer tools. Its own file so parallel stages do not collide in types.ts (one union line there).
import type { SimSeconds } from './types.ts';

/** A leaf of the truth tree: finite numbers stay numbers; NaN/±Infinity arrive as the strings 'NaN', 'Infinity', '-Infinity'. */
export type TruthLeaf = number | boolean | string | null;
export interface TruthTree {
  [key: string]: TruthLeaf | TruthLeaf[] | TruthTree;
}

/**
 * Emitted every `EngineOptions.truthHz` (0 = never, the default; at most 2 Hz) after the tick's other events.
 * `tree` holds the physiology sub-trees of the pipeline state (`l1`, `hemo`, `resp`, and whatever later stages add:
 * `blood`, `organs`, `endo`, `neuro`, `pk`, …) plus the device layer as `dev`, pruned by `pruneTruth`.
 */
export type TruthEvent = {
  type: 'truth'; t: SimSeconds;
  tree: TruthTree;
  /** Leaves kept, values dropped (typed arrays, long arrays, functions, too deep), and whether the leaf cap cut the walk. */
  leaves: number; dropped: number; truncated: boolean;
};
