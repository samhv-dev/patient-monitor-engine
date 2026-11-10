// The scenario builder's model (docs/plans/scenario-builder.md §5.1, piece B1): a card as the form the editor shows, and
// back. Pure, no DOM. `docOf(formOf(doc))` is the card again, deep-equal and in the same key order at every level, for
// every card of the library (form.test.ts proves it on all 20); a field the form does not know is carried, never dropped.
//
// Key order, what is guaranteed (a signature hashes the bytes of the version it signs, §9.4):
//   - untouched: the written document serialises to the same JSON text as the card (`JSON.stringify` equal); a file
//     written as `JSON.stringify(doc, null, 2)` comes back byte for byte;
//   - edited: a field the author changes keeps its place; a field the author adds comes last in its object; a top-level
//     block the card did not have follows the card's own blocks, in the schema's property order. Arrays keep the form's
//     order (`next` and action order are meaningful): nothing here sorts.
import { SCENARIO_SCHEMA_V2 } from '@pme/controller/scenario';
import type { ScenarioDocV2 } from '@pme/controller/scenario';

/** The builder's sections (§5.2), each a block of the page; `carried` is what the /2 form does not edit. */
export type Section = 'header' | 'patient' | 'briefing' | 'phases' | 'script' | 'actions' | 'outcomes' | 'debrief' | 'carried';

/** Every top-level property of `pme-scenario/2`, in the schema's order: read from the schema, so a block the format adds
 *  (M2's media) is a form field without a change here. */
export const DOC_KEYS: readonly string[] = Object.keys((SCENARIO_SCHEMA_V2 as { properties: object }).properties);

const SECTION: Record<string, Section> = {
  patient: 'patient', device: 'patient', briefing: 'briefing', phases: 'phases', script: 'script', actions: 'actions',
  outcomes: 'outcomes', debriefHints: 'debrief',
};

/** The section a top-level key belongs to; a key outside the /2 schema is carried. */
export const sectionOf = (key: string): Section => SECTION[key] ?? (DOC_KEYS.includes(key) ? 'header' : 'carried');

type Fields = { -readonly [K in keyof ScenarioDocV2]?: ScenarioDocV2[K] };

export interface CardForm {
  /** The card's top-level keys in its own order. */
  order: string[];
  /** The /2 blocks, a copy the editors change in place. */
  fields: Fields;
  /** Top-level keys the /2 schema does not have (a /1 card's states, a retired judged block): kept whole. */
  carried: Record<string, unknown>;
}

/** A deep copy without the fields set to undefined, at every level (what JSON would write), in the object's own order. */
const copy = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(copy)
    : v !== null && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, copy(x)]))
      : v;

/** The form of a card: its /2 fields and everything else carried. The card is copied, never shared. */
export function formOf(doc: object): CardForm {
  const fields: Record<string, unknown> = {};
  const carried: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(copy(doc) as object)) (sectionOf(k) === 'carried' ? carried : fields)[k] = v;
  return { order: Object.keys(doc), fields: fields as Fields, carried };
}

/** The document the form writes: the card's keys in their order, then new blocks in the schema's order, then anything
 *  else carried. A field set to undefined is not written, at any level. A copy: changing it never changes the form. */
export function docOf(form: CardForm): ScenarioDocV2 {
  const fields = form.fields as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const put = (k: string) => {
    if (k in out) return;
    const v = k in fields ? fields[k] : form.carried[k];
    if (v !== undefined) out[k] = copy(v);
  };
  [...form.order, ...DOC_KEYS, ...Object.keys(fields), ...Object.keys(form.carried)].forEach(put);
  return out as unknown as ScenarioDocV2;
}
