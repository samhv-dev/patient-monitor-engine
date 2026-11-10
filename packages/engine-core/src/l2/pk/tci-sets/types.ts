// The shape of a TCI model set: a published pharmacokinetic set (and its ke0) as data with its source, so that a pump
// predicts from the set it names and every number can be traced to its paper (docs/plans/pump-rack-tci.md §6.1;
// how to add one: docs/guides/tci-sets.md). The rules a registered set must meet are checked by
// packages/engine-core/test/l2/pk/tci-sets.test.ts on every pull request.
import type { PkParams } from '../compartment.ts';
import type { PkPatient } from '../covariates.ts';

/** What a set may be told beyond the patient: Eleveld 2018 propofol changes with co-administered opioids. */
export interface TciSetOpts {
  opioids?: boolean;
}

/** One covariate a set may read: a field of the patient typed into the pump, or `opioids` from the options. */
export type TciCovariate = 'ageY' | 'weightKg' | 'heightCm' | 'sex' | 'pmaWeeks' | 'opioids';

/** A body-size scalar the set computes from the covariates, named with its author (documentation; rule 2 tests the
 * covariates, not the scalars). */
export type TciScalar = 'lbm:james' | 'ffm:alsallami' | 'bmi';

/** A paper, citable and findable: a DOI or a PMID is required (rule 1). */
export interface TciPaper {
  authors: string;
  year: number;
  journal: string;
  vol: string;
  pages: string;
  doi?: string;
  pmid?: string;
}

/** The population the set was estimated in, as the paper reports it; `src` names the table or page. */
export interface TciPopulation {
  ageY?: readonly [number, number];
  weightKg?: readonly [number, number];
  heightCm?: readonly [number, number];
  pmaWeeks?: readonly [number, number];
  sex?: readonly ('m' | 'f')[];
  src: string;
}

/**
 * The set's ke0. `none`: the set has no effect site and is refused in effect-site mode (rule 3). Otherwise exactly one
 * of `value` (/min) or `expr` (as printed, for a covariate ke0), and how it was obtained (rule 6):
 *  - `method: 'pkpd'` estimated with a PK-PD model; `src: 'pk-paper'` when it is the PK paper's own, else the paper
 *    that estimated it, with `fittedWith` naming the PK it was estimated with;
 *  - `method: 'ttpe'` fitted to a published time to peak effect with THIS set's PK (Minto 2003; Shafer & Varvel 1991):
 *    `ttpeMin` is the published time, `src` the paper that gives it;
 *  - `method: 'device'` (the owner's ruling TQ2, 10 Nov 2026) the value a named device ran, whose derivation a
 *    peer-reviewed paper reports as never published: `src` is that reporting paper (with its DOI), `page` where it says
 *    so, `device` the device, `usedWith` the PK the device ran it with, `derivation: 'unpublished'` with the paper's
 *    statement paraphrased in `derivationNote`, and `label` the words a pump face shows beside it. It has no
 *    `fittedWith` and no `ttpeMin`: nothing about it can be reproduced, and the check says so.
 */
export type TciKe0 =
  | { none: true }
  | {
      none?: false;
      value?: number;
      expr?: string;
      method: 'pkpd' | 'ttpe' | 'device';
      src: 'pk-paper' | TciPaper;
      /** The PK model the ke0 was estimated with, when `src` is not the PK paper ("this set" for `ttpe`). */
      fittedWith?: string;
      /** Published time to peak effect (min), `ttpe` only. */
      ttpeMin?: number;
      /** `device` only: the page of `src` that reports the value and its provenance. */
      page?: string;
      /** `device` only: the device that ran the value. */
      device?: string;
      /** `device` only: the PK the device ran it with. */
      usedWith?: string;
      /** `device` only: the derivation was never published. */
      derivation?: 'unpublished';
      /** `device` only: the reporting paper's statement, paraphrased. */
      derivationNote?: string;
      /** `device` only: what a pump face shows beside the set ("device value; derivation unpublished"). */
      label?: string;
      /** Any ke0: a note on the paper's own record (a discrepancy, a ruling). */
      note?: string;
    };

/** A quantity a paper may print for its reference patient, in the engine's units (L, L/min, /min). */
export type TciQuantity = 'v1' | 'v2' | 'v3' | 'cl1' | 'cl2' | 'cl3' | 'k10' | 'k12' | 'k21' | 'k13' | 'k31' | 'ke0';

/**
 * The paper's own numbers (rule 4): the values it prints for its stated reference or typical patient, as printed (the
 * string carries the paper's precision), or `none` with the reason when the paper prints no worked values (the second
 * reader then checks the coefficients line by line).
 */
export type TciWorked =
  | { patient: PkPatient; opts?: TciSetOpts; values: Partial<Record<TciQuantity, string>>; src: string }
  | { none: string };

export interface TciSetMeta {
  /** The id a TCI command names (`tci.model`), lower-case with hyphens; the module is `tci-sets/<id>.ts`. */
  id: string;
  /** The library drug it predicts (a row with a compartment model). */
  drugId: string;
  name: string;
  paper: TciPaper;
  /** The table or equation, and its page, that the coefficients are read from. */
  table: string;
  population: TciPopulation;
  /** Exactly the covariates the function reads (rule 2 perturbs every one of them, listed or not). */
  covariates: readonly TciCovariate[];
  scalars?: readonly TciScalar[];
  /** A patient inside the population at which the set is probed (rules 2 and 6). */
  reference: PkPatient;
  ke0: TciKe0;
  site: 'arterial' | 'venous' | 'unstated';
  /** The units the function returns, always the engine's: "L, L/min, /min; amount <unit> → <conc unit>". */
  units: string;
  worked: TciWorked;
  readBy: { first: string; second: string; date: string };
}

/** A registered set: its metadata and the pure function that gives its parameters for a typed patient. */
export interface TciSet {
  meta: TciSetMeta;
  params: (patient: PkPatient, opts?: TciSetOpts) => PkParams;
}
