// The scenario library: every `pme-scenario/1` document in packages/controller/scenarios (the five the 6b runner bundles
// and the depth and neuromuscular cases 7f added), so a case a later stage adds appears without a code change.
import type { ScenarioDoc } from '@pme/controller';
import type { Objective } from '@pme/controller/scenario';
import { CATEGORIES as CATS, draft, SCENARIO_META, storyOf, type Category } from './scenario-meta.ts';

const FILES = {
  // Task 26: the five showcase cases (reviewed, not drafts) live with the app; they carry their own card fields
  ...import.meta.glob<{ default: ScenarioDoc }>('./showcase/*.json', { eager: true }),
  ...import.meta.glob<{ default: ScenarioDoc }>('../../../../packages/controller/scenarios/*.json', { eager: true }),
};

/** Stage 13: an objective's words, with or without its debrief rule. */
export const objectiveText = (o: string | Objective): string => (typeof o === 'string' ? o : o.text);

export interface ScenarioCard {
  id: string;
  title: string;
  draft: boolean;
  story: string;
  category: Category | 'Other';
  minutes: number | null;
  objectives: string[];
  /** "F 72 y 70 kg" from the document's patient. */
  patient: string;
  doc: ScenarioDoc;
}

export function cardOf(doc: ScenarioDoc): ScenarioCard {
  const m = SCENARIO_META[doc.id];
  const p = doc.patient ?? {};
  const d = draft(doc.title);
  // the document's own card fields (pme-scenario/1 since FU-8, R-S9-4) win; scenario-meta.ts fills what it lacks
  const cat = (CATS as readonly string[]).includes(doc.category ?? '') ? (doc.category as Category) : undefined;
  return {
    id: doc.id, title: d.title, draft: d.draft, story: doc.story ?? storyOf(doc.id, doc.notes), category: cat ?? m?.category ?? 'Other',
    minutes: doc.durationMin ?? m?.minutes ?? null, objectives: (doc.objectives ?? m?.objectives ?? []).map(objectiveText), doc,
    patient: [p.sex ?? '', p.ageY !== undefined ? `${p.ageY} y` : '', p.weightKg !== undefined ? `${p.weightKg} kg` : ''].filter(Boolean).join(' '),
  };
}

/** Stage 11: the Showcase cards in the order of the demonstration's run sheet; every other group sorts by title. */
export const SHOWCASE_ORDER: readonly string[] = ['showcase-induction', 'showcase-induction-premed', 'showcase-anaphylaxis', 'showcase-mh', 'showcase-tamponade', 'showcase-haemorrhage'];

export const LIBRARY: readonly ScenarioCard[] = Object.entries(FILES)
  .filter(([path]) => !path.endsWith('.schema.json'))
  .map(([, mod]) => cardOf(mod.default))
  .sort((a, b) => rank(a.category) - rank(b.category) || SHOWCASE_ORDER.indexOf(a.id) - SHOWCASE_ORDER.indexOf(b.id) || a.title.localeCompare(b.title));

function rank(c: string): number {
  const i = (CATS as readonly string[]).indexOf(c);
  return i < 0 ? CATS.length : i;
}

export const scenarioById = (id: string): ScenarioCard | undefined => LIBRARY.find((c) => c.id === id);
