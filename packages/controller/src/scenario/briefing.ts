// A card's Case briefing with its defaults (pme-scenario/1 `briefing`; owner's board Orientation 7b): what the host
// sends the learners' screens when the card loads.
import type { ScenarioBriefing, ScenarioDoc } from './types.ts';

/** How long a briefing shows when the card does not say, s. */
export const BRIEFING_DEFAULT_S = 60;

/** The card's briefing with its defaults (60 s, English), or null when it has none. `hostLang` (Debrief 2 D13b): the
 *  host's language; set to Persian, a card that carries `textFa` sends it (lang fa) in place of its English `text`. A
 *  card written in Persian (`lang: 'fa'`) and a card without `textFa` send their own text in either setting: nothing is
 *  translated at run time. */
export function briefingOf(doc: Pick<ScenarioDoc, 'briefing'>, hostLang: 'en' | 'fa' = 'en'): Required<Pick<ScenarioBriefing, 'text' | 'durationS' | 'lang'>> & Pick<ScenarioBriefing, 'estimatedMinutes'> | null {
  const b = doc.briefing;
  if (!b) return null;
  const fa = hostLang === 'fa' && (b.lang ?? 'en') === 'en' && b.textFa ? b.textFa : null;
  return { text: fa ?? b.text, ...(b.estimatedMinutes !== undefined ? { estimatedMinutes: b.estimatedMinutes } : {}), durationS: b.durationS ?? BRIEFING_DEFAULT_S, lang: fa ? 'fa' : b.lang ?? 'en' };
}
