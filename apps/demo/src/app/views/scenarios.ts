// Scenarios (E125, owner's mockup f3-scenarios): two cards — the Scenario library and the Scenario builder — and the
// three cases loaded last. `#/scenarios/library` is the grouped list (the E123 start page's, #131): the two
// demonstrations pinned first, then each category; one sentence per case, "Case details" opening in place, no badges.
// The cards carry a heading, one paragraph and a full-width button (owner's correction, 26 October).
// `#/scenarios/builder` is the scenario builder (builder/page.ts, plan docs/plans/scenario-builder.md piece B2): this
// browser's drafts, a /2 library card opened as a copy, a card file imported; `#/scenarios/builder/<draft>` edits one.
// Load replaces the patient (asked first while a case runs) and opens the Instructor view chosen in Settings.
import { drugWords } from '../glossary.ts';
import { onRecent, recentCards } from '../recent.ts';
import { hrefOf } from '../router.ts';
import { LIBRARY, type ScenarioCard } from '../scenarios.ts';
import { CATEGORIES } from '../scenario-meta.ts';
import type { AppSession } from '../session.ts';
import type { View } from '../shell.ts';
import { REPO } from '../about.ts';
import { button, confirmDialog, h, toast } from '../ui.ts';
import { builderPage, type RunDraft } from '../builder/page.ts';

/** The 3 November demonstration's two cases, pinned first (owner, 24 October). */
export const DEMO_CARDS: readonly string[] = ['showcase-mh', 'showcase-haemorrhage'];
export const CARD_DOCS = `https://${REPO}/blob/main/docs/guides/scenario-authoring.md`;

export interface ScenariosDeps {
  session: Pick<AppSession, 'live'>;
  /** The app's one load (main.ts): replaces the patient, starts the case and notes it in Recent. */
  loadScenario(card: ScenarioCard): boolean;
  /** B6: the builder's Run in place (builder/run-panel.ts `DraftRun.run`); absent: the builder offers no Run. */
  runDraft?: RunDraft;
}

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
export const countWord = (n: number): string => WORDS[n] ?? String(n);
/** A story's first sentence. */
export const firstSentence = (s: string): string => /^.*?[.!?](?=\s|$)/.exec(s.trim())?.[0] ?? s.trim();

const ICON_LIB = 'M4 5h16v14H4zM8 9h8M8 13h5';
const ICON_ADD = 'M12 5v14M5 12h14';
function ico(d: string): HTMLElement {
  const box = h('div', { class: 'scen-ico', 'aria-hidden': 'true' });
  box.innerHTML = `<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`;
  return box;
}

export function scenariosView(d: ScenariosDeps): View {
  const load = async (c: ScenarioCard): Promise<void> => {
    if (d.session.live && !(await confirmDialog('Load this scenario?', `The current patient is replaced by the scenario's patient. The log keeps running.`, 'Load scenario', false, 'Keep the current case'))) return;
    if (!d.loadScenario(c)) return;
    toast(`Scenario loaded: ${c.title}`); // As the Instructor's library says it
    d.session.live = true;
    location.hash = hrefOf('teach2'); // a Load opens the Instructor view
  };
  const loadBtn = (c: ScenarioCard, cls = '') => {
    const b = button('Load', () => void load(c), cls);
    b.setAttribute('aria-label', `Load ${drugWords(c.title)}`);
    return b;
  };
  const minutes = (c: ScenarioCard) => h('span', { class: 'scen-dur' }, c.minutes ? `${c.minutes} min` : '');

  // ------------------------------------------------------------------------------------------------------------- main
  const recent = h('div', { class: 'scen-list', 'aria-label': 'Recent' });
  const drawRecent = () => {
    const cs = recentCards();
    recent.replaceChildren(...(cs.length ? cs.map((c) => {
      const demo = DEMO_CARDS.indexOf(c.id);
      return h('div', { class: 'scen-item' },
        h('div', {}, h('p', { class: 't' }, drugWords(c.title), demo >= 0 ? h('span', { class: 'scen-tag' }, `Demonstration ${demo + 1}`) : null), h('p', { class: 'd' }, drugWords(firstSentence(c.story)))),
        minutes(c), loadBtn(c));
    }) : [h('p', { class: 'hint' }, 'The cases you load appear here.')]));
  };
  onRecent(drawRecent);
  drawRecent();
  const main = h('div', { class: 'console-page' },
    h('h1', { id: 'scen-h' }, 'Scenarios'),
    h('p', { class: 'console-sub' }, 'Load opens the Instructor view with the patient running; every monitor that follows this session shows it.'),
    h('div', { class: 'scen-two' },
      h('article', { class: 'scen-card' }, ico(ICON_LIB), h('h2', {}, 'Scenario library'),
        h('p', {}, `${countWord(LIBRARY.length)} cases from healthy induction to malignant hyperthermia and class IV haemorrhage, each with objectives, a measured course and a debrief.`),
        h('a', { class: 'btn primary scen-open', href: hrefOf('scenarios', 'library') }, 'Open the library')),
      h('article', { class: 'scen-card' }, ico(ICON_ADD), h('h2', {}, 'Scenario builder'),
        h('p', {}, 'Write a case of your own: patient, states, what the instructor can press, what the engine does at each step, the objectives for the debrief.'),
        h('a', { class: 'btn scen-open', href: hrefOf('scenarios', 'builder') }, 'Open the builder'))),
    h('h2', { class: 'scen-h3' }, 'Recent'), recent);

  // ---------------------------------------------------------------------------------------------------------- library
  const item = (c: ScenarioCard) => h('div', { class: 'scen-item lib' },
    h('div', {},
      h('h3', { class: 't' }, drugWords(c.title)),
      h('p', { class: 'd' }, drugWords(firstSentence(c.story))),
      h('details', { class: 'scen-details' }, h('summary', {}, 'Case details'),
        h('p', {}, drugWords(c.story)),
        h('p', { class: 'muted' }, [c.patient, c.minutes ? `about ${c.minutes} min` : ''].filter(Boolean).join(' · ')),
        c.objectives.length ? h('ul', { class: 'objectives', 'aria-label': 'Learning objectives' }, ...c.objectives.map((o) => h('li', {}, drugWords(o)))) : null)),
    minutes(c), loadBtn(c, DEMO_CARDS.includes(c.id) ? 'primary' : ''));
  const demos = DEMO_CARDS.map((id) => LIBRARY.find((c) => c.id === id)).filter((c): c is ScenarioCard => !!c);
  const groups = [...CATEGORIES, 'Other'].map((cat) => [cat, LIBRARY.filter((c) => c.category === cat && !demos.includes(c))] as const).filter(([, cs]) => cs.length);
  const library = h('div', { class: 'console-page' },
    h('a', { class: 'console-back', href: hrefOf('scenarios') }, '← Scenarios'),
    h('h1', { id: 'scen-lib-h' }, 'Scenario library'),
    h('p', { class: 'console-sub' }, 'One sentence per case; Case details opens the story and the objectives.'),
    h('section', { class: 'scen-group scen-demos', 'aria-labelledby': 'scen-demo-h' }, h('h2', { id: 'scen-demo-h', class: 'scen-h3' }, "Today's demonstrations"), h('div', { class: 'scen-list' }, ...demos.map(item))),
    ...groups.map(([cat, cs], i) => h('section', { class: 'scen-group', 'aria-labelledby': `scen-g${i}` }, h('h2', { id: `scen-g${i}`, class: 'scen-h3' }, cat), h('div', { class: 'scen-list' }, ...cs.map(item)))));

  // ---------------------------------------------------------------------------------------------------------- builder
  // B2 (docs/plans/scenario-builder.md): the builder's page, in place of the stub that explained the /1 format
  const builder = builderPage(undefined, undefined, d.runDraft && { run: d.runDraft, live: () => d.session.live });

  const el = h('section', { class: 'console scenarios', 'aria-labelledby': 'scen-h' }, main, library, builder.el);
  const show = (sub: string) => {
    const build = sub === 'builder' || sub.startsWith('builder/');
    main.hidden = sub === 'library' || build;
    library.hidden = sub !== 'library';
    builder.el.hidden = !build;
    if (build) void builder.enter(sub.slice('builder/'.length)).then(() => el.setAttribute('aria-labelledby', builder.headingId()));
    else builder.leave();
    el.setAttribute('aria-labelledby', sub === 'library' ? 'scen-lib-h' : build ? builder.headingId() : 'scen-h');
    el.scrollTop = 0;
  };
  show('');
  return {
    id: 'scenarios',
    el,
    enter(sub) {
      show(sub);
      drawRecent();
    },
    leave() {
      builder.leave();
    },
  };
}

