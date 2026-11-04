// A card's Case briefing with its defaults (pme-scenario/1 `briefing`; owner's board Orientation 7b): what the host
// sends the learners' screens when the card loads.
import type { ScenarioBriefing, ScenarioDoc } from './types.ts';

/** How long a briefing shows when the card does not say, s. */
export const BRIEFING_DEFAULT_S = 60;

/** The card's briefing with its defaults (60 s, English), or null when it has none. */
export function briefingOf(doc: Pick<ScenarioDoc, 'briefing'>): Required<Pick<ScenarioBriefing, 'text' | 'durationS' | 'lang'>> & Pick<ScenarioBriefing, 'estimatedMinutes'> | null {
  const b = doc.briefing;
  if (!b) return null;
  return { text: b.text, ...(b.estimatedMinutes !== undefined ? { estimatedMinutes: b.estimatedMinutes } : {}), durationS: b.durationS ?? BRIEFING_DEFAULT_S, lang: b.lang ?? 'en' };
}
