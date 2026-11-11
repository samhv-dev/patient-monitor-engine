// Plan learner-action-remote.md L2 (§4 D5, LQ11, LQ12): what the bench finds in a preparation, from the formulary
// alone. A diluent is WRONG when the stocked product's monograph does not list it (the drug's `diluents[].listed`, and,
// for a product reconstituted from powder, the product's own `reconstitute.diluents`): graded, whatever the effect.
// Whether drug is lost is a separate question, answered by the source's statement: `incompatible` or `conditional` when
// it says so, `notTested` when it says "not tested" or when no file makes a statement and the label does not list the
// diluent. Admixtures are read from both drugs' files. No Y-site (LQ12): preparations only. A statement that names its
// containers (N60: adsorption to a PVC bag) speaks only for a preparation in one of them; elsewhere it is as if absent.
// Pure: no clock, no I/O.
import type { Compat, Container, Formulary } from './types.ts';

export type FindingKind = 'wrongDiluent' | 'incompatible' | 'conditional' | 'notTested';

export interface Finding {
  kind: FindingKind;
  /** The drug whose file the finding is read from. */
  drugId: string;
  against: 'diluent' | 'admixture';
  /** The diluent id, or the other drug's id. */
  other: string;
  /** The source's statement, in our words; null where there is none. */
  statement: string | null;
  /** The `sources.json` key behind the finding; null where no source speaks. */
  src: string | null;
}

/** One drug of a preparation and the products it is drawn from (their own reconstitution lists count). */
export interface FindingItem {
  drugId: string;
  productIds: string[];
}

/** True when the statement speaks for a preparation in `container` (no containers named: every one). */
export const holdsIn = (c: Compat, container: Container | null | undefined): boolean => !c.containers || (!!container && c.containers.includes(container));

const fromStatement = (c: Compat, drugId: string, against: Finding['against'], other: string): Finding[] =>
  c.verdict === 'compatible' ? [] : [{ kind: c.verdict === 'not tested' ? 'notTested' : c.verdict, drugId, against, other, statement: c.statement, src: c.src }];

/** Every finding for these drugs (each with a file in `formulary`) in this diluent (null: none) and container (none:
 *  not named), in input order. */
export function findings(items: readonly FindingItem[], diluentId: string | null, formulary: Formulary, container?: Container | null): Finding[] {
  const out: Finding[] = [];
  if (diluentId !== null) {
    for (const { drugId, productIds } of items) {
      const entry = formulary.drugs[drugId]!;
      const listing = entry.diluents.find((d) => d.id === diluentId);
      const forPowder = entry.products.filter((p) => productIds.includes(p.id) && p.reconstitute).every((p) => p.reconstitute!.diluents.includes(diluentId));
      const listed = listing?.listed === true && forPowder;
      if (!listed) out.push({ kind: 'wrongDiluent', drugId, against: 'diluent', other: diluentId, statement: null, src: listing?.src ?? null });
      const compat = listing?.compat && holdsIn(listing.compat, container) ? listing.compat : undefined;
      if (compat) out.push(...fromStatement(compat, drugId, 'diluent', diluentId));
      else if (!listed) out.push({ kind: 'notTested', drugId, against: 'diluent', other: diluentId, statement: null, src: null });
    }
  }
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]!.drugId;
      const b = items[j]!.drugId;
      const said = [
        ...formulary.drugs[a]!.admixtures.filter((x) => x.with === b && holdsIn(x, container)).map((x) => fromStatement(x, a, 'admixture', b)),
        ...formulary.drugs[b]!.admixtures.filter((x) => x.with === a && holdsIn(x, container)).map((x) => fromStatement(x, b, 'admixture', a)),
      ];
      if (!said.length) out.push({ kind: 'notTested', drugId: a, against: 'admixture', other: b, statement: null, src: null });
      else out.push(...said.flat());
    }
  }
  return out;
}
