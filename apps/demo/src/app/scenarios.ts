// The scenario library: every `pme-scenario/1` document in packages/controller/scenarios (the five the scenario runner
// bundles and the depth and neuromuscular cases the neuro model added), so a case a later stage adds appears without a
// code change. A `pme-scenario/2` document (plan F1) is read for its header; its case details are its judged rows and
// graded actions (F6). The library holds one /2 card (showcase-mh-v2, F8): `ScenarioCard`'s default type parameter
// still says /1, so every reader of `doc` checks `isV2` first (F1's narrowing).
import { isV2, type AnyScenarioDoc, type ScenarioDoc } from '@pme/controller';
import type { Objective } from '@pme/controller/scenario';
import { CATEGORIES as CATS, draft, SCENARIO_META, storyOf, type Category } from './scenario-meta.ts';

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

/** A /2 card's case details (plan F6): its judged rows, then its graded actions' labels. */
function v2Objectives(doc: Extract<AnyScenarioDoc, { schema: 'pme-scenario/2' }>): string[] {
  return [...(doc.judged ?? []).map((j) => j.text), ...doc.actions.filter((a) => a.graded !== false).map((a) => a.label)];
}

/** The Showcase cards in the order of the demonstration's run sheet; every other group sorts by title. */
export const SHOWCASE_ORDER: readonly string[] = ['showcase-induction', 'showcase-induction-premed', 'showcase-anaphylaxis', 'showcase-mh', 'showcase-mh-v2', 'showcase-tamponade', 'showcase-haemorrhage'];

export const LIBRARY: readonly ScenarioCard[] = Object.entries(FILES)
  .filter(([path]) => !path.endsWith('.schema.json'))
  .map(([, mod]) => cardOf(mod.default))
  .sort((a, b) => rank(a.category) - rank(b.category) || SHOWCASE_ORDER.indexOf(a.id) - SHOWCASE_ORDER.indexOf(b.id) || a.title.localeCompare(b.title));

function rank(c: string): number {
  const i = (CATS as readonly string[]).indexOf(c);
  return i < 0 ? CATS.length : i;
}

export const scenarioById = (id: string): ScenarioCard | undefined => LIBRARY.find((c) => c.id === id);
