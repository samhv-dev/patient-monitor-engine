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

/**
 * Why each pending id is not yet registered, and the table its registration needs (plan §13 T2; read 10 Nov 2026).
 * A set registers only when every constant it uses has been read in the paper itself, never from memory or a
 * secondary source. On 10 Nov 2026 no full text could be read: the Anesthesiology papers (journals.lww.com) answered
 * 402 or a human-verification page, the BJA papers (bjanaesthesia.org, sciencedirect.com) 403 or the same page, and
 * Eleveld 2018 and Minto 1997 are offered only as PDF files, which this reading did not download. The abstracts were
 * read (Europe PMC); what they confirm and the two differences they show are in docs/guides/tci-sets.md, "The T2
 * reading". Every entry names the table needed. The check requires a reason for every pending id.
 */
export const PENDING_TCI_REASONS: Readonly<Record<string, string>> = {
  eleveld:
    'Eleveld 2018 (doi 10.1016/j.bja.2018.01.018, PMID 29661412): needs Table 2 (θ1–θ18 and the PD estimates) and the ' +
    "model equations of the Methods. The abstract's reference patient agrees in V1, V2, V3, CL, Q3 and ke0, but Q2 " +
    'differs: abstract 1.75 L/min, engine 1.830 (its maturation factor on Q2 is 1.0459 at 35 y).',
  schnider:
    'Schnider 1998 (doi 10.1097/00000542-199805000-00006, PMID 9605675): needs the final covariate model table ' +
    '(V1, V2, V3, CL1, CL2, CL3 with their age, weight, height and LBM terms). The abstract prints no coefficient; ' +
    'the 1999 abstract (PMID 10360845) confirms ke0 0.456 /min.',
  marsh:
    'Marsh 1991 (doi 10.1093/bja/67.1.41, PMID 1859758): needs the table of the adult model the device ran (V1 per kg, ' +
    'k10, k12, k21, k13, k31) and the ke0 0.26 /min source. The abstract prints no number; the modified ke0 1.21 /min ' +
    "is consistent with Struys 2000's abstract (PMID 10691226: t1/2 ke0 34 s, time to peak 1.6 min), not printed there.",
  minto:
    'Minto 1997 (doi 10.1097/00000542-199701000-00004, PMID 9009935): needs the complex (covariate) model table ' +
    '(V1, V2, V3, Cl1, Cl2, Cl3 with age and LBM terms) and the ke0 age model. The abstract prints only the simple ' +
    'model (V1 4.98, V2 9.01, V3 6.54 L; Cl1 2.46, Cl2 1.69, Cl3 0.065 L/min; ke0 0.516 /min), which the engine does not use.',
  shafer:
    'Shafer 1990 (doi 10.1097/00000542-199012000-00005, PMID 2248388): needs the population parameter table (V1, ' +
    'k10, k12, k21, k13, k31). The abstract prints no number. The ke0 0.117 /min (time to peak 3.6 min, Shafer & ' +
    'Varvel 1991, PMID 1824743) also needs that paper\'s table of times to peak effect.',
  gepts:
    'Gepts 1995 (doi 10.1097/00000542-199512000-00010, PMID 8533912): needs the parameter table that prints the ' +
    'microconstants, if any. The abstract prints V1 14.3, V2 63.1, V3 261.6 L, CL 0.92, Q2 1.55, Q3 0.33 L/min: the ' +
    "engine's V1, CL, Q2 and Q3 agree, but its microconstants imply V2 63.4 and V3 251.9 L (k21 0.0245, k31 0.0013). " +
    'The ke0 0.176 /min (time to peak 5.6 min, Shafer & Varvel 1991) needs that paper\'s table as well.',
};

export const tciSet = (id: string): TciSet | undefined => TCI_SETS.find((s) => s.meta.id === id);

/** What a pump and the engine say when a set without a ke0 is asked to target the effect site (rule 3). */
export const NO_KE0_REFUSAL = 'this model has no ke0: plasma targeting only';

/** The refusal for a TCI mode the set cannot run, or undefined when it can. */
export function tciModeRefusal(set: TciSet, mode: 'plasma' | 'effect'): string | undefined {
  return mode === 'effect' && set.meta.ke0.none === true ? NO_KE0_REFUSAL : undefined;
}
