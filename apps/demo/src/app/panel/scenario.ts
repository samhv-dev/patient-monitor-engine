// Scenario (research/13 §4.3 item 1; the simulator sweep's top patterns 4 and 5): before a run, the library as cards
// (story, patient, duration, objectives) filtered by category; during a run, the state strip with the current state
// highlighted, time in state, the next triggers in clinical words with countdowns, manual triggers as buttons,
// hold/resume, jump (confirmed), bookmarks that restore the physiology, and an objectives checklist for the debrief.
import { LIBRARY, cardOf, type ScenarioCard } from '../scenarios.ts';
import { CATEGORIES } from '../scenario-meta.ts';
import { drugWords } from '../glossary.ts';
import { countdown, transitionText } from '../triggers.ts';
import { button, clock, confirmDialog, h, setText, toast, toggle } from '../ui.ts';
import { scenarioCard } from '../cards.ts';
import { bookmark } from '../commands.ts';
import type { PanelCtx } from './ctx.ts';
import { manualLabel as manualOf } from '@pme/controller';

export function scenarioTab(c: PanelCtx): HTMLElement {
  const { link } = c;
  const sv = link.ctl.scenario;
  let filter = 'All';
  let docV = -1;

  // ---- library ----
  const chips = h('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Category' });
  const cards = h('div', { class: 'cards' });
  const drawLib = () => {
    chips.replaceChildren(...['All', ...CATEGORIES].map((cat) => h('button', { type: 'button', role: 'radio', class: 'chip-btn', 'aria-checked': String(cat === filter), onclick: () => ((filter = cat), drawLib()) }, cat)));
    cards.replaceChildren(...LIBRARY.filter((x) => filter === 'All' || x.category === filter).map((x) => scenarioCard(x, h('div', { class: 'actions' }, button('Load', () => void load(x), 'primary')))));
  };
  const load = async (x: ScenarioCard) => {
    if (sv.doc && !(await confirmDialog('Load this scenario?', `"${cardOf(sv.doc).title}" is running. Loading "${x.title}" replaces the patient and restarts the scenario. The log keeps running.`, 'Load scenario', false, 'Keep the current case'))) return;
    if (c.loadScenario) {
      if (c.loadScenario(x)) toast(`Scenario loaded: ${x.title}`);
    } else {
      const r = await link.send({ type: 'scenario', action: 'load', doc: x.doc });
      toast(r.accepted ? `Scenario loaded: ${x.title}` : 'The monitor refused the scenario (see the log)');
    }
  };
  const library = h('section', { 'aria-label': 'Scenario library' }, h('h3', {}, 'Scenario library'), chips, cards);

  // ---- run view ----
  // learner controls under the learner monitor: off by default, on for this run (host only; orchestrator ruling 4)
  const host = link.host;
  const learnerToggle = host
    ? toggle('Learner controls on the monitor', host.learner, (on) => {
        host.setLearner(on);
        link.note(on ? 'Learner controls shown on the monitor' : 'Learner controls hidden', 'system');
      }, 'small')
    : null;
  host?.onLearner((on) => learnerToggle?.set(on));
  const learnerRow = learnerToggle ? h('div', { class: 'row' }, learnerToggle, h('span', { class: 'hint' }, 'Charge, shock, CPR and drugs as buttons under the learner monitor, logged as learner actions.')) : null;
  const title = h('h3', {});
  const story = h('p', { class: 'hint' });
  const strip = h('ol', { class: 'states', 'aria-label': 'Scenario states' });
  const inState = h('span', { class: 'num' });
  const hold = button('Hold the timer', () => void link.send({ type: 'scenario', action: sv.paused ? 'resume' : 'pause' }), 'small');
  const next = h('ul', { class: 'next' });
  const objectives = h('ul', { class: 'objectives checks', 'aria-label': 'Objectives' });
  const marks = h('ul', { class: 'marks' });
  const run = h('section', { 'aria-label': 'Running scenario' },
    h('div', { class: 'scard-head' }, title, button('Choose another scenario', () => ((run.hidden = true), (library.hidden = false)), 'ghost small')), story,
    strip,
    h('div', { class: 'row' }, h('span', {}, 'Time in state '), inState, hold, button('Bookmark', () => void bookmark(link), 'small')),
    learnerRow,
    h('h3', {}, 'What happens next'), next,
    h('h3', {}, 'Objectives'), objectives,
    h('h3', {}, 'Bookmarks'), marks,
  );

  const jump = async (id: string, label: string) => {
    if (!(await confirmDialog('Jump to this state?', `The scenario moves to "${label}" now and runs its changes.`, 'Jump', false, 'Stay in this state'))) return;
    const r = await link.send({ type: 'scenario', action: 'goto', target: id });
    if (r.accepted) toast(`Scenario: ${label}`);
  };

  c.onRefresh(() => {
    const doc = sv.doc;
    run.hidden = !doc;
    library.hidden = !!doc;
    if (!doc) return;
    if (docV !== sv.docVersion) {
      docV = sv.docVersion;
      const card = cardOf(doc);
      setText(title, drugWords(card.title));
      setText(story, drugWords(card.story));
      objectives.replaceChildren(...card.objectives.map((o, i) => {
        const id = `obj-${i}`;
        const words = drugWords(o);
        const box = h('input', { type: 'checkbox', id, onchange: () => box.checked && link.note(`Objective met: ${words}`, 'marker') });
        return h('li', {}, h('label', { class: 'check', for: id }, box, words));
      }));
    }
    strip.replaceChildren(...doc.states.map((s) => {
      const label = s.label ?? 'State';
      const cur = s.id === sv.stateId;
      return h('li', cur ? { 'aria-current': 'step' } : {}, cur ? label : h('button', { type: 'button', class: 'linkish', onclick: () => void jump(s.id, label), 'aria-label': `Jump to ${label}` }, label));
    }));
    const t = sv.timeInState(link.simT);
    setText(inState, clock(t));
    hold.textContent = sv.paused ? 'Resume the timer' : 'Hold the timer';
    const cur = sv.current();
    next.replaceChildren(...(cur?.transitions ?? []).map((tr) => {
      const left = countdown(tr, t, link.simT);
      const manual = manualOf(tr.when);
      return h('li', {},
        h('span', {}, transitionText(tr, doc)), left !== null ? h('span', { class: 'num muted' }, ` in ${clock(left)}`) : null,
        manual ? button(manual, () => void link.send({ type: 'scenario', action: 'trigger', target: tr.id }), 'small') : null);
    }));
    marks.replaceChildren(...(link.ctl.bookmarks.length ? link.ctl.bookmarks : []).map((b) => h('li', {}, b, ' ', button('Return here', async () => {
      if (await confirmDialog('Return to this bookmark?', `The patient goes back to "${b}". The clock keeps running.`, 'Return', false, 'Stay here')) void link.send({ type: 'scenario', action: 'restoreBookmark', target: b });
    }, 'ghost small'))));
    if (!link.ctl.bookmarks.length) marks.replaceChildren(h('li', { class: 'muted' }, 'No bookmarks yet (Shift+B)'));
  });

  drawLib();
  return h('div', {}, run, library);
}
