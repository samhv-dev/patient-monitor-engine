// The Scenarios page's "Recent" (E125): the last three library cards loaded in this browser, newest first. Every load
// passes through the app's one loadScenario (main.ts), which notes it here. A card imported in Instructor v2 (brief 22)
// is kept while it stays in this browser's library (scenarioById finds it); the Scenarios page's own "Import a scenario
// file" keeps nothing, so a card loaded from there is not noted (it cannot be loaded again without its file).
import { scenarioById, type ScenarioCard } from './scenarios.ts';
import { store } from './store.ts';

const KEY = 'recent-cards';
const MAX = 3;
const fns = new Set<() => void>();

function ids(): string[] {
  try {
    const v = JSON.parse(store.get(KEY) ?? '[]') as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** The recent library cards, newest first. */
export const recentCards = (): ScenarioCard[] => ids().map(scenarioById).filter((c): c is ScenarioCard => !!c).slice(0, MAX);

/** A card was loaded: it moves to the front. */
export function noteRecent(id: string): void {
  if (!scenarioById(id)) return;
  store.set(KEY, JSON.stringify([id, ...ids().filter((x) => x !== id)].slice(0, MAX)));
  for (const fn of fns) fn();
}

export function onRecent(fn: () => void): () => void {
  fns.add(fn);
  return () => void fns.delete(fn);
}
