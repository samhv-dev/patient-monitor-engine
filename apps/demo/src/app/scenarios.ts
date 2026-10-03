// The scenario library: every `pme-scenario/1` document in packages/controller/scenarios (the five the 6b runner bundles
// and the depth and neuromuscular cases 7f added), so a case a later stage adds appears without a code change.
import type { ScenarioDoc } from '@pme/controller';
import { CATEGORIES as CATS, draft, SCENARIO_META, storyOf, type Category } from './scenario-meta.ts';

const FILES = import.meta.glob<{ default: ScenarioDoc }>('../../../../packages/controller/scenarios/*.json', { eager: true });

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
    minutes: doc.durationMin ?? m?.minutes ?? null, objectives: doc.objectives ?? m?.objectives ?? [], doc,
    patient: [p.sex ?? '', p.ageY !== undefined ? `${p.ageY} y` : '', p.weightKg !== undefined ? `${p.weightKg} kg` : ''].filter(Boolean).join(' '),
  };
}

export const LIBRARY: readonly ScenarioCard[] = Object.entries(FILES)
  .filter(([path]) => !path.endsWith('.schema.json'))
  .map(([, mod]) => cardOf(mod.default))
  .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));

export const scenarioById = (id: string): ScenarioCard | undefined => LIBRARY.find((c) => c.id === id);
