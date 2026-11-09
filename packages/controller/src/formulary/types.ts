// Plan learner-action-remote.md §5, L1: the formulary layer's types. One file per drug (`formulary/<drugId>.json`) and
// per diluent (`formulary/diluents/<id>.json`), every number in an object that names its source (`src`, a key into
// `formulary/sources.json`) or is marked a gap with an owner question id (`gap: 'LQ7'`). The data is read by the bench
// (L2, L7), never by the engine. The JSON Schema `formulary/schema.json` is the same contract for the files.

/** An owner question id of the plan's §10 (LQ1–LQ14): the only thing a `gap` may name. */
export type GapId = `LQ${number}`;

/** A quantity with its source: a number never stands alone in a formulary file. */
export interface Sourced {
  /** A key into `sources.json`. */
  src: string;
}

/** A field the sources do not give: named, with the owner question that rules what the bench does without it. */
export interface Gap {
  gap: GapId;
}

/** The three sources an entry can have (LQ5, ruled 9 November): Stabilis is primary, Trissel 2013 the cross-check. */
export interface Has {
  stabilis: boolean;
  trissel: boolean;
  monograph: boolean;
}

export interface Strength extends Sourced {
  amount: number;
  unit: string;
  /** True when `amount` is the whole vial or ampoule; false when it is per mL. */
  perVial: boolean;
}

export interface Reconstitution extends Sourced {
  /** Diluent ids (`diluents/<id>.json`) the monograph lists for reconstitution. */
  diluents: string[];
  volumeMl: number;
}

/** The preparation time, or a gap (LQ7: ready at once, the Debrief says "no source for the preparation time"). */
export type PrepTime = (Sourced & { s: number }) | Gap;

export interface Product {
  id: string;
  form: 'powder' | 'solution' | 'emulsion';
  strength: Strength;
  reconstitute?: Reconstitution;
  prepTime?: PrepTime;
}

/** Trissel 2013's reading of a statement whose source of record is Stabilis (or Trissel itself). */
export interface CrossCheck {
  trissel: 'agrees' | 'differs' | 'not listed';
  /** A `trissel` key in `sources.json` (edition and page); required unless `not listed`. */
  src?: string;
  /** Required when `differs`: who ruled, when, and which source the entry follows. */
  ruling?: { by: string; date: string; follows: 'stabilis' | 'trissel' | 'monograph' };
}

export type Verdict = 'incompatible' | 'compatible' | 'conditional' | 'not tested';

/** A compatibility or stability statement: our words (≤ 200 characters, a paraphrase, never a copied monograph). */
export interface Statement extends Sourced {
  statement: string;
  crossCheck: CrossCheck;
}

export interface Compat extends Statement {
  verdict: Verdict;
}

export interface DiluentListing extends Sourced {
  id: string;
  /** Listed in the stocked product's monograph (LQ11: a diluent not listed is wrong, graded). */
  listed: boolean;
  compat?: Compat;
}

export interface Admixture extends Compat {
  with: string;
}

export interface Stability extends Statement {
  diluent: string;
  container: 'vial' | 'syringe-pp' | 'bag-pvc' | 'bag-polyolefin';
  tempC: number;
  /** [hours, fraction remaining] pairs as the source gives them. */
  points: Array<[number, number]>;
}

export interface DrugEntry {
  drugId: string;
  products: Product[];
  diluents: DiluentListing[];
  admixtures: Admixture[];
  stability: Stability[];
  has: Has;
}

export interface DiluentEntry {
  diluentId: string;
  name: string;
  /** The diluent's own content (e.g. 0.9 g/100 mL sodium chloride), with its source. */
  content?: Sourced & { amount: number; unit: string };
  has: Has;
}

export type Source =
  /** A Stabilis monograph: its id, the date it was read, and the reference Stabilis cites for the figure. */
  | { kind: 'stabilis'; id: string; retrieved: string; cites: string }
  /** Trissel's Handbook on Injectable Drugs, read in place, cited by edition and page; never copied. */
  | { kind: 'trissel'; edition: string; monograph: string; page: number | string; reader: string; date: string }
  /** The product's label: DailyMed or EMC for now (LQ6), the department's leaflet later. */
  | { kind: 'monograph'; product: string; holder: string; version: string; issuer: 'DailyMed' | 'EMC' | 'department' }
  /** A cited paper, for a preparation time or a measured loss. */
  | { kind: 'study'; citation: string; doi?: string; pmid?: string };

export type SourceKind = Source['kind'];

/** The layer as files: path (relative to the formulary folder) → parsed JSON. */
export type FormularyFiles = Record<string, unknown>;

export interface Formulary {
  drugs: Record<string, DrugEntry>;
  diluents: Record<string, DiluentEntry>;
  sources: Record<string, Source>;
  /** The injectable drug ids with no file yet: may only shrink (§5 rule 5). */
  pending: string[];
}

/** One broken rule: which of §5's six, the file, the JSON path inside it, and why. */
export interface FormularyProblem {
  rule: 1 | 2 | 3 | 4 | 5 | 6;
  file: string;
  path: string;
  why: string;
}
