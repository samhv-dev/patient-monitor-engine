// The scenario library: every `pme-scenario/1` document in packages/controller/scenarios (the five the scenario runner
// bundles and the depth and neuromuscular cases the neuro model added), so a case a later stage adds appears without a
// code change. A `pme-scenario/2` document (plan F1) is read for its header; its case details are its graded actions'
// graded actions (F6). The library holds two /2 cards (showcase-mh-v2, F8; showcase-haemorrhage-v2, F9): `ScenarioCard`'s default type parameter
// still says /1, so every reader of `doc` checks `isV2` first (F1's narrowing).
import { isV2, type AnyScenarioDoc, type ScenarioDoc } from '@pme/controller';
import type { Objective } from '@pme/controller/scenario';
import { CATEGORIES as CATS, draft, SCENARIO_META, storyOf, type Category } from './scenario-meta.ts';
import { store } from './store.ts';

const FILES = {
  // The five showcase cases (reviewed, not drafts) live with the app; they carry their own card fields
  ...import.meta.glob<{ default: ScenarioDoc }>('./showcase/*.json', { eager: true }),
  ...import.meta.glob<{ default: ScenarioDoc }>('../../../../packages/controller/scenarios/*.json', { eager: true }),
};

/** An objective's words, with or without its debrief rule. */
export const objectiveText = (o: string | Objective): string => (typeof o === 'string' ? o : o.text);

/** A library card: the library's documents are `pme-scenario/1` today (`D` = ScenarioDoc); a loaded document of either
 *  format gives `ScenarioCard<AnyScenarioDoc>`. */
export interface ScenarioCard<D extends AnyScenarioDoc = ScenarioDoc> {
  id: string;
  title: string;
  draft: boolean;
  story: string;
  category: Category | 'Other';
  minutes: number | null;
  objectives: string[];
  /** "F 72 y 70 kg" from the document's patient. */
  patient: string;
  doc: D;
}

export function cardOf<D extends AnyScenarioDoc>(doc: D): ScenarioCard<D> {
  const m = SCENARIO_META[doc.id];
  const p = doc.patient ?? {};
  const d = draft(doc.title);
  // The document's own card fields (pme-scenario/1) win; scenario-meta.ts fills what it lacks
  const cat = (CATS as readonly string[]).includes(doc.category ?? '') ? (doc.category as Category) : undefined;
  return {
    id: doc.id, title: d.title, draft: d.draft, story: doc.story ?? storyOf(doc.id, doc.notes), category: cat ?? m?.category ?? 'Other',
    minutes: doc.durationMin ?? m?.minutes ?? null, objectives: isV2(doc) ? v2Objectives(doc) : (doc.objectives ?? m?.objectives ?? []).map(objectiveText), doc,
    patient: [p.sex ?? '', p.ageY !== undefined ? `${p.ageY} y` : '', p.weightKg !== undefined ? `${p.weightKg} kg` : ''].filter(Boolean).join(' '),
  };
}

/** A /2 card's case details (plan F6): its graded actions' labels (a team act the instructor observes is a record action
 *  among them: judged rows are retired, the owner's ruling of 5 November). */
function v2Objectives(doc: Extract<AnyScenarioDoc, { schema: 'pme-scenario/2' }>): string[] {
  return doc.actions.filter((a) => a.graded !== false && !a.preparation).map((a) => a.label);
}

/** The Showcase cards in the order of the demonstration's run sheet; every other group sorts by title. */
export const SHOWCASE_ORDER: readonly string[] = ['showcase-induction', 'showcase-induction-premed', 'showcase-anaphylaxis', 'showcase-mh', 'showcase-mh-v2', 'showcase-tamponade', 'showcase-haemorrhage', 'showcase-haemorrhage-v2'];

export const LIBRARY: readonly ScenarioCard[] = Object.entries(FILES)
  .filter(([path]) => !path.endsWith('.schema.json'))
  .map(([, mod]) => cardOf(mod.default))
  .sort((a, b) => rank(a.category) - rank(b.category) || SHOWCASE_ORDER.indexOf(a.id) - SHOWCASE_ORDER.indexOf(b.id) || a.title.localeCompare(b.title));

function rank(c: string): number {
  const i = (CATS as readonly string[]).indexOf(c);
  return i < 0 ? CATS.length : i;
}

/** A card of the library, or one imported in this browser (a built-in id is never an imported card's: keepImported). */
export const scenarioById = (id: string): ScenarioCard | undefined => LIBRARY.find((c) => c.id === id) ?? importedCards().find((c) => c.id === id);

// --- Imported cards (brief 22) ---------------------------------------------------------------------------------------
// A card file opened in Instructor v2 (teach2/begin.ts), already passed by the controller's validator, kept in this
// browser's storage beside the library: per browser, never on the wire. The driver validates it again at every load,
// as it does a built-in card, so a stored document edited by hand runs only if it still passes.
const IMPORTED = 'imported-cards';

function importedDocs(): AnyScenarioDoc[] {
  try {
    const v = JSON.parse(store.get(IMPORTED) ?? '[]') as unknown;
    return Array.isArray(v) ? v.filter((d): d is AnyScenarioDoc => !!d && typeof d === 'object' && typeof (d as { id?: unknown }).id === 'string') : [];
  } catch {
    return [];
  }
}

/** The imported cards, in the order they came. Typed as the library's cards are (every reader of `doc` checks isV2). */
export const importedCards = (): ScenarioCard[] => importedDocs().map((d) => cardOf(d as ScenarioDoc));

/** Keep a validated document as an imported card; the same id again replaces the earlier import. */
export function keepImported(doc: AnyScenarioDoc): { ok: true; card: ScenarioCard; replaced: boolean } | { ok: false; reason: string } {
  if (LIBRARY.some((c) => c.id === doc.id)) return { ok: false, reason: `its id “${doc.id}” is a built-in card's; give the card an id of its own` };
  const before = importedDocs();
  const rest = before.filter((d) => d.id !== doc.id);
  const text = JSON.stringify([...rest, doc]);
  store.set(IMPORTED, text);
  if (store.get(IMPORTED) !== text) return { ok: false, reason: 'this browser did not keep it (its storage is off or full)' };
  return { ok: true, card: cardOf(doc as ScenarioDoc), replaced: rest.length < before.length };
}

/** Remove an imported card; false when no imported card has that id. */
export function removeImported(id: string): boolean {
  const before = importedDocs();
  const rest = before.filter((d) => d.id !== id);
  if (rest.length === before.length) return false;
  store.set(IMPORTED, JSON.stringify(rest));
  return true;
}
