// The scenario card (research/13 brief §7 "Scenario card"; TrainingMonitor's catalogue, CAE/REALITi objectives): title,
// draft flag, the learner-facing story, category, patient, duration and objectives. Used by Start and the Scenario tab.
import type { ScenarioCard } from './scenarios.ts';
import { drugWords } from './glossary.ts';
import { h } from './ui.ts';

/** Scenario card: title, story, patient, duration, objectives (research/13 §4.3; CAE/REALITi checklists). */
export function scenarioCard(c: ScenarioCard, extra?: HTMLElement): HTMLElement {
  // scenario text names drugs in the site's set (orchestrator ruling 5): "adrenaline" or "epinephrine"
  return h('article', { class: 'card scard', 'aria-label': drugWords(c.title) },
    h('div', { class: 'scard-head' }, h('h3', {}, drugWords(c.title)), c.draft ? h('span', { class: 'tag', title: 'Not yet reviewed clinically' }, 'Draft') : null),
    h('p', {}, drugWords(c.story)),
    h('p', { class: 'meta' }, [c.category, c.patient, c.minutes ? `about ${c.minutes} min` : ''].filter(Boolean).join(', ')),
    c.objectives.length ? h('ul', { class: 'objectives', 'aria-label': 'Learning objectives' }, ...c.objectives.map((o) => h('li', {}, drugWords(o)))) : null,
    extra ?? null,
  );
}
