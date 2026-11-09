// The instrument picker (plan room-and-instruments.md R4; Q1 ruled 5 November): the device that scans the room's QR
// (`?join=CODE#/pick`) chooses what this screen shows. The design source is the owner's mock-up m5, "instrument cards"
// (docs/plans/room-and-instruments/mockup/): one card per instrument in a grid, each a drawing, a title, a status chip,
// one line and its action; the room code under the title. m5 was drawn as the host's page; on the device each card's
// one action is "Show here". Learner monitor first and preselected: one tap. The choice is kept on this device and
// preselected next time, never applied without a tap. The picker grants nothing and follows nothing.
// R8d: the Ventilator card's "Show here" opens the ventilator's own page for this room (`vent-hamilton.html?join=CODE#/vent`,
// classroom.ts), where P7's PIN form signs it in as the `ventilator`; the cockpit then fills the screen.
import { DEVICE_RE } from '@pme/controller';
import { hashOf, ventDeviceUrl, type PageLocation } from '../classroom.ts';
import { store as appStore } from '../store.ts';
import { h } from '../ui.ts';

type Store = { get(k: string): string | null; set(k: string, v: string): void };
type Shown = 'learner' | 'monitor';
type Card = { show: Shown | 'vent' | 'depth' | 'iabp'; title: string; chip: string; text: string; foot: string; action: boolean };

/**
 * The picker's words, m5's where the product does what they say (the owner rules the final words; the PR lists each
 * change from m5). Not offered yet: the Defibrillator (once R5 merges) and the Instructor remote (once P7 merges).
 */
export const PICKER_WORDS = {
  title: 'Choose what this screen shows',
  lead: 'Each screen in the room is one instrument. Choose the one this screen shows.',
  codeLabel: 'Room code',
  action: 'Show here',
  lastHere: 'Last on this device',
  ready: 'Ready',
  cards: [
    { show: 'learner', title: 'Learner monitor', chip: 'Ready', text: 'This phone follows the patient monitor.', foot: 'Upright on a phone', action: true },
    { show: 'monitor', title: 'Patient monitor', chip: 'Ready', text: "ECG, pressures, SpO₂, capnography and temperature in the room's monitor style.", foot: 'Sideways, the whole screen', action: true },
    // R8d: on a tablet over the relay (R8a–R8c), signed in with the instructor's PIN on its own page
    { show: 'vent', title: 'Ventilator', chip: "With the instructor's PIN", text: 'Modes, settings, pressure and flow loops, with the lung mechanics of the loaded patient.', foot: 'A tablet drives the patient', action: true },
    // Q7 ruled 5 November: the engine has no EEG (§9a)
    { show: 'depth', title: 'Depth of anaesthesia', chip: 'Not available yet', text: 'Needs a simulated EEG: planned as an engine stage of its own.', foot: '—', action: false },
    // Q8: a console needs a balloon-pressure wave the engine does not compute (§9)
    { show: 'iabp', title: 'Intra-aortic balloon pump', chip: 'Coming later', text: "Timing, augmentation and the arterial trace with the balloon's effect.", foot: 'Not in this release', action: false },
  ] satisfies Card[] as Card[],
};

/**
 * m5's drawings (instruments.js), inline. Every number and word in them is gone (no text, no font), as are the traces
 * of what the engine does not compute: the depth monitor's EEG line, the balloon pump's pressure wave.
 */
const PIC: Record<CardShow, string> = {
  // Room setup's Defibrillator opener (R7; the picker does not offer it): a screen with a rhythm line, an energy dial and
  // a shock button, no number or word
  defib: '<svg viewBox="0 0 200 100" aria-hidden="true"><rect x="8" y="8" width="184" height="84" rx="6" fill="#111" stroke="#2a3340"/><rect x="16" y="16" width="112" height="52" rx="3" fill="#0b0e12" stroke="#2a3340"/><polyline points="20,44 40,44 46,28 52,60 58,44 82,44 88,30 94,58 100,44 124,44" fill="none" stroke="#5fd99b" stroke-width="2"/><circle cx="160" cy="38" r="16" fill="none" stroke="#3a4656" stroke-width="3"/><rect x="146" y="64" width="28" height="14" rx="3" fill="#d9534f"/><rect x="16" y="74" width="24" height="10" rx="2" fill="#263142"/><rect x="46" y="74" width="24" height="10" rx="2" fill="#263142"/></svg>',
  monitor: '<svg viewBox="0 0 200 100" aria-hidden="true"><rect x="6" y="6" width="188" height="88" rx="6" fill="#111" stroke="#2a3340"/><polyline points="14,40 40,40 48,22 56,58 64,40 90,40 98,30 104,50 110,40 150,40 158,24 166,56 174,40 190,40" fill="none" stroke="#5fd99b" stroke-width="2"/><polyline points="14,76 60,76 70,64 80,76 120,76 130,64 140,76 190,76" fill="none" stroke="#5db7ff" stroke-width="2"/></svg>',
  vent: '<svg viewBox="0 0 200 100" aria-hidden="true"><rect x="10" y="8" width="180" height="84" rx="6" fill="#111" stroke="#2a3340"/><rect x="18" y="16" width="110" height="52" rx="3" fill="#0b0e12" stroke="#2a3340"/><path d="M22 60 L40 60 L46 30 L60 30 L66 60 L84 60 L90 30 L104 30 L110 60 L126 60" fill="none" stroke="#f0c75e" stroke-width="2"/><circle cx="160" cy="42" r="16" fill="none" stroke="#3a4656" stroke-width="3"/><rect x="18" y="74" width="24" height="10" rx="2" fill="#263142"/><rect x="48" y="74" width="24" height="10" rx="2" fill="#263142"/><rect x="78" y="74" width="24" height="10" rx="2" fill="#263142"/><rect x="146" y="70" width="28" height="12" rx="2" fill="#5fd99b"/></svg>',
  depth: '<svg viewBox="0 0 200 100" aria-hidden="true"><rect x="30" y="14" width="140" height="72" rx="8" fill="#111" stroke="#2a3340"/></svg>',
  iabp: '<svg viewBox="0 0 200 100" aria-hidden="true"><rect x="8" y="8" width="184" height="84" rx="6" fill="#111" stroke="#2a3340"/><rect x="16" y="70" width="60" height="14" rx="3" fill="#263142"/><circle cx="160" cy="76" r="8" fill="none" stroke="#3a4656" stroke-width="2"/></svg>',
  learner: '<svg viewBox="0 0 200 100" aria-hidden="true"><rect x="70" y="4" width="60" height="92" rx="10" fill="#111" stroke="#2a3340"/><rect x="76" y="14" width="48" height="66" rx="3" fill="#0b0e12"/><polyline points="80,40 92,40 96,32 100,48 104,40 120,40" fill="none" stroke="#5fd99b" stroke-width="1.5"/></svg>',
};

/** What a tap shows on this page and is remembered for next time (the ventilator opens a page of its own: R8d). */
const SHOWN: ReadonlySet<string> = new Set(PICKER_WORDS.cards.filter((c) => c.action && c.show !== 'vent').map((c) => c.show));

/** This device's own key (§4 D1, for the remembered layout): 12 of [a-z0-9], drawn once and kept in its store. */
export function deviceKey(s: Store = appStore): string {
  const kept = s.get('device');
  if (kept && DEVICE_RE.test(kept)) return kept;
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const key = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => abc[b % abc.length]).join('');
  s.set('device', key);
  return key;
}

export type CardShow = Card['show'] | 'defib';

/**
 * One instrument card (m5): its drawing, title, status chip, one line, and a foot line with its actions. The picker
 * and Room setup (R7) build their cards with it, so the two pages look alike.
 */
export function instrumentCard(c: { show: CardShow; title: string; chip: string; on?: boolean; text: string; foot: string; selected?: boolean; actions: readonly HTMLElement[] }): HTMLElement {
  const pic = h('div', { class: 'join-pic' });
  pic.innerHTML = PIC[c.show]; // a constant of this file: no input reaches it
  return h('article', { class: 'join-card', 'data-show': c.show, 'data-selected': c.selected ? 'true' : undefined },
    pic,
    h('div', { class: 'join-row' }, h('h2', {}, c.title), h('span', { class: `st${c.on ? ' on' : ''}` }, c.chip)),
    h('p', {}, c.text),
    h('div', { class: 'join-row' }, h('span', { class: 'join-foot small muted' }, c.foot), ...(c.actions.length ? [h('span', { class: 'join-acts' }, ...c.actions)] : [])));
}

export interface PickerOptions {
  code: string;
  store?: Store;
  /** Opens the chosen instrument's hash (default: this page's location; main.ts reloads the page on the change). */
  go?: (hash: string) => void;
  /** Appended here, with the preselected card's action focused. */
  parent?: HTMLElement;
  /** R8d: opens another page of the app (default `location.assign`): the Ventilator's own page. */
  open?: (url: string) => void;
  /** R8d: this page's address, whose search (the code, the relay) the Ventilator's page keeps (default `location`). */
  here?: Pick<PageLocation, 'pathname' | 'search'>;
}

/** The picker's page for room `code`: the cards, the preselected one marked and (with `parent`) its action focused. */
export function pickerView(o: PickerOptions): HTMLElement {
  const s = o.store ?? appStore;
  const go = o.go ?? ((hash: string) => void (location.hash = hash));
  const last = s.get('instrument');
  const pre: Shown = last !== null && SHOWN.has(last) ? (last as Shown) : 'learner';
  const W = PICKER_WORDS;
  let focus: HTMLButtonElement | null = null;
  const card = (c: Card) => {
    const shownHere = c.action && c.show === last;
    const tap = c.show === 'vent'
      ? () => (o.open ?? ((u: string) => location.assign(u)))(ventDeviceUrl(o.here ?? location)) // the picker grants nothing: the PIN is typed there
      : () => (s.set('instrument', c.show), go(hashOf(c.show as Shown)));
    const act = c.action ? h('button', { type: 'button', class: `btn${c.show === pre ? ' primary' : ''}`, onclick: tap }, W.action) : null;
    if (c.show === pre) focus = act;
    return instrumentCard({ show: c.show, title: c.title, chip: shownHere ? W.lastHere : c.chip, on: shownHere, text: c.text, foot: c.foot, selected: c.show === pre, actions: act ? [act] : [] });
  };
  const el = h('main', { class: 'join-pick' },
    h('header', { class: 'join-top' },
      h('div', {}, h('h1', {}, W.title), h('p', { class: 'join-lead' }, W.lead)),
      h('div', { class: 'join-code' }, h('div', { class: 'small muted' }, W.codeLabel), h('div', { class: 'code' }, o.code))),
    h('section', { class: 'join-grid', 'aria-label': 'Instruments' }, ...W.cards.map(card)));
  if (o.parent) {
    o.parent.append(el);
    (focus as HTMLButtonElement | null)?.focus();
  }
  return el;
}
