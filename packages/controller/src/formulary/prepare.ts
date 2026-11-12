// Plan learner-action-remote.md L2 and §4 D3: the host's pure preparation step. From the components a learner chose
// (a drug, its stocked product, how much of it), the diluent and the simulation time, it computes what is in the
// syringe or bag: each drug's amount and concentration in the total volume, the findings (findings.ts), the time
// the preparation is ready, and the stability rows that describe each drug at its concentration. A powder is
// reconstituted with the label's own volume (`reconstitute.volumeMl`) in the chosen diluent, and a vial then holds the
// volume its label states after reconstitution (N73: the powder adds volume; `reconstitute.final`), or the added volume
// where the label states none; the diluent's `volumeMl` is added on top. Nothing the device sends is trusted beyond the
// choice: every number comes from the formulary. A field the bench needs that the entry does not give (a
// concentration) is refused; a missing preparation time is not (LQ7: ready at once, the gap named).
import { findings, type Finding } from './findings.ts';
import { stabilityRows } from './remaining.ts';
import type { Formulary, Reconstitution, Stability } from './types.ts';

/** The volume of one reconstituted vial of `amount` (the strength per vial): the label's final volume or concentration,
 *  else the volume added (the powder's own volume then ignored, as the bench says). */
const vialMl = (rc: Reconstitution, amount: number): number =>
  'volumeMl' in rc.final ? rc.final.volumeMl : 'perMl' in rc.final ? amount / rc.final.perMl : rc.volumeMl;

/** One thing drawn: `amount` vials (`unit: 'vial'`), mL (`'mL'`), or of the drug in the strength's own unit (`'mg'`, …). */
export interface PrepComponent {
  drugId: string;
  productId: string;
  amount: number;
  unit: string;
}

export interface PrepDiluent {
  id: string;
  /** Added on top of any reconstitution volume; 0 for a powder reconstituted and not diluted further. */
  volumeMl: number;
}

export type Refusal =
  | 'bad-time' | 'no-components' | 'unknown-diluent' | 'bad-volume' | 'unknown-drug' | 'unknown-product'
  | 'bad-amount' | 'no-diluent' | 'bad-unit' | 'no-concentration' | 'unit-mismatch';

/** One drug in the preparation: its amount and its concentration in the total volume. */
export interface Active {
  drugId: string;
  amount: number;
  unit: string;
  /** `amount` per mL of the whole preparation. */
  perMl: number;
  /** Indexes of the drug's stability rows that describe it here: the chosen diluent and container, and a row
   *  concentration that covers `perMl` or none stated (any temperature; remaining() picks by temperature). Empty
   *  without a diluent or a container. */
  rows: number[];
}

export interface Preparation {
  ok: true;
  actives: Active[];
  volumeMl: number;
  diluent: PrepDiluent | null;
  container: Stability['container'] | null;
  findings: Finding[];
  /** `atS` = simT + the longest sourced preparation time; `gap: 'LQ7'` when any component's time has no source. */
  ready: { atS: number; src: string[]; gap: 'LQ7' | null };
}

export type PrepareResult = Preparation | { ok: false; refused: Refusal; why: string };

/** What the record and the Debrief say for a gap of the preparation's own figures (LQ7, ruled 9 November: ready at once). */
export const GAP_WORDS: Readonly<Record<'LQ7', string>> = Object.freeze({ LQ7: 'no source for the preparation time' });

const no = (refused: Refusal, why: string): PrepareResult => ({ ok: false, refused, why });

/** The preparation made from `components` in `diluent` (none: drawn as it is) at `simT` seconds, or why not. */
export function prepare(
  components: readonly PrepComponent[], diluent: PrepDiluent | undefined, formulary: Formulary, simT: number,
  container?: Stability['container'],
): PrepareResult {
  if (!Number.isFinite(simT) || simT < 0) return no('bad-time', `the simulation time is a non-negative number of seconds, not ${simT}`);
  if (!components.length) return no('no-components', 'a preparation has at least one component');
  if (diluent && !formulary.diluents[diluent.id]) return no('unknown-diluent', `the formulary has no diluent "${diluent.id}"`);
  if (diluent && !(Number.isFinite(diluent.volumeMl) && diluent.volumeMl >= 0)) return no('bad-volume', `a diluent volume is a non-negative number of mL, not ${diluent.volumeMl}`);

  const drugs = new Map<string, { amount: number; unit: string; productIds: string[] }>();
  let volumeMl = diluent?.volumeMl ?? 0;
  let prepS = 0;
  const src = new Set<string>();
  let gap = false;
  for (const c of components) {
    const entry = formulary.drugs[c.drugId];
    if (!entry) return no('unknown-drug', `"${c.drugId}" has no formulary file`);
    const product = entry.products.find((p) => p.id === c.productId);
    if (!product) return no('unknown-product', `"${c.productId}" is not a product in ${c.drugId}'s file`);
    if (!(Number.isFinite(c.amount) && c.amount > 0)) return no('bad-amount', `an amount is a positive number, not ${c.amount}`);
    const s = product.strength;
    const rc = product.reconstitute;
    if (rc && !diluent) return no('no-diluent', `${c.productId} is reconstituted: it needs a diluent`);
    if (c.unit !== 'vial' && c.unit !== 'mL' && c.unit !== s.unit) return no('bad-unit', `${c.productId} is drawn by vial, mL or ${s.unit}, not "${c.unit}"`);
    const perVialMl = rc ? vialMl(rc, s.amount) : null;
    const perMl = s.perVial ? (perVialMl !== null ? s.amount / perVialMl : null) : s.amount;
    let amount: number;
    let vol: number;
    if (c.unit === 'vial') {
      if (!s.perVial || perVialMl === null) return no('no-concentration', `${c.productId}'s label gives no volume per vial`);
      amount = c.amount * s.amount;
      vol = c.amount * perVialMl;
    } else {
      if (perMl === null) return no('no-concentration', `${c.productId}'s label gives no concentration`);
      amount = c.unit === 'mL' ? c.amount * perMl : c.amount;
      vol = c.unit === 'mL' ? c.amount : c.amount / perMl;
    }
    const d = drugs.get(c.drugId);
    if (d && d.unit !== s.unit) return no('unit-mismatch', `${c.drugId} is in ${d.unit} and ${s.unit} in one preparation`);
    if (d) {
      d.amount += amount;
      d.productIds.push(product.id);
    } else drugs.set(c.drugId, { amount, unit: s.unit, productIds: [product.id] });
    volumeMl += vol;
    if (product.prepTime && 's' in product.prepTime) {
      prepS = Math.max(prepS, product.prepTime.s);
      src.add(product.prepTime.src);
    } else gap = true;
  }

  const items = [...drugs].map(([drugId, d]) => ({ drugId, productIds: d.productIds }));
  return {
    ok: true,
    actives: [...drugs].map(([drugId, d]) => {
      const perMl = d.amount / volumeMl;
      const rows = diluent && container ? stabilityRows(formulary.drugs[drugId]!, diluent.id, container, { perMl, unit: d.unit }) : [];
      return { drugId, amount: d.amount, unit: d.unit, perMl, rows };
    }),
    volumeMl,
    diluent: diluent ? { id: diluent.id, volumeMl: diluent.volumeMl } : null,
    container: container ?? null,
    findings: findings(items, diluent ? diluent.id : null, formulary, container),
    ready: { atS: simT + prepS, src: [...src], gap: gap ? 'LQ7' : null },
  };
}
