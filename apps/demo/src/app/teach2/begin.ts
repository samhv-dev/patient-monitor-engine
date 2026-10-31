// Instructor v2 with no case loaded (the owner's board "Empty 5", approved 30 October): which of the three ways to begin
// ACTION shows (the three cards, the case list, or Free roam), shared by ACTION and the strip through the slot context;
// the default patient's words for the header and the cue box; and the case list's order, the library's own (its two
// demonstrations first, then its order). A loaded card sends the view back to the cards for the next time no case runs.
import './begin.css';
import { drugWords } from '../glossary.ts';
import type { Link } from '../link.ts';
import { ageBandOf } from '../patients.ts';
import { hrefOf } from '../router.ts';
import { LIBRARY, type ScenarioCard } from '../scenarios.ts';
import { h, setText, toast } from '../ui.ts';
import { DEMO_CARDS } from '../views/scenarios.ts';
import type { Teach2Ctx } from './ctx.ts';

/** The three cards ('menu'), the case list ('cases') or Free roam ('free'). */
export type Way = 'menu' | 'cases' | 'free';

export interface Begin {
  readonly way: Way;
  /** Change the way; the view repaints at once. */
  set(w: Way): void;
  /** Back to the three cards without a repaint (a card is loaded: the next time no case runs starts there). */
  reset(): void;
  /** Repaint the view now. */
  repaint(): void;
}

export function beginState(repaint: () => void): Begin {
  let way: Way = 'menu';
  return {
    get way() {
      return way;
    },
    set: (w) => {
      if (w === way) return;
      way = w;
      repaint();
    },
    reset: () => void (way = 'menu'),
    repaint,
  };
}

/** The pane's foot line with no case (the "Finish the case" button itself is a later piece). */
export const FOOT_NONE = 'A reload keeps whatever is running. A case ends only with “Finish the case” in the dock.';

export const NO_CASE = 'No case loaded';

/** The default patient as the board writes it: "Adult" (or "Child", the monitor's age band) and the weight. */
export function defaultPatient(link: Link, weightKg?: () => number): { band: string; kg: number } {
  const spec = link.host?.spec;
  return { band: spec && ageBandOf(spec) === 'paediatric' ? 'Child' : 'Adult', kg: spec?.weightKg ?? weightKg?.() ?? 70 };
}

/** The library's cards in the library's order: the two demonstrations first, then the rest as it lists them. */
export function caseList(): ScenarioCard[] {
  const demos = DEMO_CARDS.map((id) => LIBRARY.find((c) => c.id === id)).filter((c): c is ScenarioCard => !!c);
  return [...demos, ...LIBRARY.filter((c) => !demos.includes(c))];
}

const ICONS: Record<'free' | 'library' | 'archive', string> = {
  free: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  library: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  archive: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 13h3M8 16h6"/>',
};

/** The way the status line's right-hand keys read. */
export const KEYS_OF: Record<Way, string> = {
  menu: '1–3 loads a case · Space pauses',
  cases: '1–9 loads a case · Esc back to the three ways · Space pauses',
  free: 'Esc back to the three ways to begin · Space pauses',
};

/** ACTION with no case: the three cards and the two buttons under them, or the case list. Free roam is ACTION's own
 *  no-card form (action.ts); this pane is hidden then. `draw()` repaints it and sets the digits. */
export function mountBeginPane(ctx: Teach2Ctx, host: HTMLElement): { el: HTMLElement; draw(): void; destroy(): void } {
  const { link, keys } = ctx;
  const way = (): Way => ctx.begin?.way ?? 'menu';
  const go = (w: Way) => ctx.begin?.set(w);

  /** The card's load: the app's one load, as the library's Load (main.ts `loadScenario`); a follower sends it. */
  const load = (c: ScenarioCard) => {
    if (ctx.loadScenario) {
      if (!ctx.loadScenario(c)) return;
      toast(`Scenario loaded: ${c.title}`); // as the library says it
    } else void link.send({ type: 'scenario', action: 'load', doc: c.doc }).then((r) => toast(r.accepted ? `Scenario loaded: ${c.title}` : 'The monitor refused the scenario (see the log)'));
    ctx.begin?.repaint();
  };
  const archive = () => void (location.hash = hrefOf('debrief'));

  const card = (id: keyof typeof ICONS, n: number, title: string, line: string, btn: string, act: () => void, primary = false) => {
    const ico = h('span', { class: 'ip2-begin-ico', 'aria-hidden': 'true' });
    ico.innerHTML = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">${ICONS[id]}</svg>`;
    return h('button', { type: 'button', class: `ip2-begin-card${primary ? ' ip2-begin-primary' : ''}`, 'data-way': id, 'aria-keyshortcuts': String(n), onclick: act },
      ico, h('span', { class: 'ip2-begin-text' }, h('span', { class: 'ip2-begin-title' }, title), h('span', { class: 'ip2-begin-line' }, line)), h('span', { class: 'ip2-begin-btn' }, btn));
  };
  // the archive comes with the Debrief redesign: until then the card opens the Debrief view and its button has no count
  const ways: Array<[() => void, HTMLElement]> = [
    [() => go('free'), card('free', 1, 'Free roam', 'The default patient with every tool, nothing scripted, nothing graded; the Log and the Debrief still record it all.', 'Start', () => go('free'))],
    [() => go('cases'), card('library', 2, 'Scenario library', `${LIBRARY.length} cards. Pick one and this pane becomes its stages and steps.`, 'Browse', () => go('cases'), true)],
    [archive, card('archive', 3, 'Debrief archive', 'Every saved run: resident, card, time, objectives and score. Open one, print it, or compare residents on the same card.', 'Open', archive)],
  ];
  // Room setup opens Settings until its own window exists; the builder comes with the pme-scenario/2 authoring guide
  const two = h('div', { class: 'ip2-begin-two' },
    h('button', { type: 'button', class: 'ip2-begin-small', onclick: () => void (location.hash = hrefOf('settings')), title: 'Opens Settings until the room setup has its own window' }, 'Room setup'),
    h('button', { type: 'button', class: 'ip2-begin-small', disabled: true, title: 'Comes with the pme-scenario/2 authoring guide' }, 'Scenario builder ', h('span', { class: 'ip2-begin-tag' }, 'after the demo')));
  const menu = h('div', { class: 'ip2-begin-menu' }, h('div', { class: 'ip2-begin-cards' }, ...ways.map(([, el]) => el)), two);

  // the case list: one row per card, the library's order; a last row opens the whole library (the Scenarios view)
  const cards = caseList();
  const rows = cards.map((c, i) => {
    const n = i + 1;
    const title = `Load ${drugWords(c.title)}`;
    const sub = [c.patient, c.minutes ? `${c.minutes} min` : ''].filter(Boolean).join(' · ');
    const tag = (c.doc.mode ?? 'modeled').toUpperCase();
    return h('button', { type: 'button', class: 'ip2-row ip2-case-row', 'data-card': c.id, onclick: () => load(c), 'aria-label': `${n <= 9 ? `${n}. ` : ''}${title}. ${sub}. ${tag}`, ...(n <= 9 ? { 'aria-keyshortcuts': String(n) } : {}) },
      h('span', { class: 'ip2-key', 'aria-hidden': 'true' }, n <= 9 ? String(n) : ''),
      h('span', { class: 'ip2-row-text' }, h('b', { class: 'ip2-row-title' }, title), h('span', { class: 'ip2-row-sub' }, sub)),
      h('span', { class: 'ip2-row-right ip2-case-mode' }, tag));
  });
  const whole = h('a', { class: 'ip2-row ip2-case-all', href: hrefOf('scenarios') },
    h('span', { class: 'ip2-key', 'aria-hidden': 'true' }, '…'), h('span', { class: 'ip2-row-text' }, h('b', { class: 'ip2-row-title' }, 'The whole library'), h('span', { class: 'ip2-row-sub' }, 'the Scenarios view: every card with its story and objectives')));
  const list = h('ol', { class: 'ip2-rows ip2-case-list', 'aria-label': 'Cases to load' }, ...[...rows, whole].map((r) => h('li', {}, r)));

  const hint = h('span', { class: 'ip2-begin-hint' });
  const el = h('div', { class: 'ip2-begin' }, hint, menu, list);

  // Esc: the case list (and Free roam) back to the three cards; an open sheet is closed first (sheets.ts)
  const offEsc = keys.escape(() => {
    if (link.ctl.scenario.doc || way() === 'menu' || host.closest('.ip2')?.querySelector('.ip2-sheet:not([hidden])')) return false;
    go('menu');
    return true;
  });

  const draw = () => {
    const w = way();
    menu.hidden = w !== 'menu';
    list.hidden = w !== 'cases';
    setText(hint, w === 'cases' ? `the library: ${LIBRARY.length} cards · 1–9 on the keyboard · Esc back` : 'no case: three ways to begin · 1–3 on the keyboard · two shortcuts');
    for (let n = 1; n <= 9; n++) {
      const fn = w === 'menu' ? ways[n - 1]?.[0] : w === 'cases' ? ((c) => c && (() => load(c)))(cards[n - 1]) : undefined;
      keys.digit(n, fn ?? null);
    }
  };
  return { el, draw, destroy: offEsc };
}
