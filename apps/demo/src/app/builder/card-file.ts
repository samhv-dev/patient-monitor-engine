// A card as a file (docs/plans/scenario-builder.md §8, "Export and import as files"; piece B2): a draft leaves the
// browser as its card JSON, `<id>.json`, the format a library card has (`JSON.stringify(card, null, 2)` and a newline,
// as showcase-mh-v2.json is written), loadable by Instructor v2's "Open a card file…"; a card file comes in only if the
// controller's validator accepts it, as a load would, and only as `pme-scenario/2` (the builder writes /2 only, F-8).
// Pure, no DOM.
import { isV2, validateScenario } from '@pme/controller/scenario';
import type { ScenarioDocV2 } from '@pme/controller/scenario';

/** The bytes an export writes: exactly the document `docOf` produced, as a library card file is written. */
export const cardFileText = (doc: object): string => `${JSON.stringify(doc, null, 2)}\n`;

/** The export's file name: the card's id, else "card". */
export const cardFileName = (doc: { id?: unknown }): string => `${typeof doc.id === 'string' && doc.id ? doc.id : 'card'}.json`;

/** An import: the card, or why not with the validator's lines. */
export type Read = { ok: true; doc: ScenarioDocV2; warnings: string[] } | { ok: false; why: string; errors: string[] };

/** How many of the validator's lines an import's refusal lists (it reports up to 20); the rest are counted. [ENG: ui] */
export const IMPORT_ERRORS_SHOWN = 6;

/** A file's text as a card the builder can open. */
export function readCardFile(name: string, text: string): Read {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, why: `${name} was not opened: it is not a JSON file.`, errors: [] };
  }
  const v = validateScenario(raw);
  if (!v.ok) {
    const more = v.errors.length - IMPORT_ERRORS_SHOWN;
    return { ok: false, why: `${name} was not opened: the validator refuses it.`, errors: [...v.errors.slice(0, IMPORT_ERRORS_SHOWN), ...(more > 0 ? [`and ${more} more`] : [])] };
  }
  if (!isV2(v.doc)) return { ok: false, why: `${name} was not opened: it is a pme-scenario/1 card, and the builder edits pme-scenario/2 cards only. Instructor v2 still runs it (Open a card file…).`, errors: [] };
  return { ok: true, doc: v.doc, warnings: v.warnings };
}
