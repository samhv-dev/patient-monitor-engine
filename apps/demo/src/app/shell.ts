// The app frame (research/13 brief §4, §7 "App shell / top bar"): the workflow rail (rail.ts, E125) or, on a hostless
// Remote, the top bar's view switcher; the top bar's always-visible state (alarm count in the skin's colours, sound,
// remote code), the session bar, the monitor region ("stage") that never leaves the DOM, and one section per view. A
// route change only re-places regions by CSS grid areas and toggles `hidden`; the engine is never touched by navigation.
// The pages before a session (Home, Room, Scenarios, Patient: CONSOLE_ROUTES) are full pages beside the rail: the shell
// hides the stage, the session bar and the top bar there and shows them again on every other route.
import { resolveSkin } from '@pme/skins';
import { FOOTER_LINE } from './about.ts';
import { CONSOLE_ROUTES, hrefOf, onRoute, type Route, type RouteId } from './router.ts';
import { contrast } from './color.ts';
import { h } from './ui.ts';

export interface View {
  id: RouteId;
  el: HTMLElement;
  /** The light "bench" palette (Explore, Validate, Developer, Settings). */
  bench?: boolean;
  enter?(sub: string): void;
  leave?(): void;
}

/** Every view's name (the document title); a hostless Remote's top bar lists Settings beside it. */
export const NAV: ReadonlyArray<[RouteId, string]> = [
  ['home', 'Home'], ['room', 'Room'], ['scenarios', 'Scenarios'], ['patient', 'Patient'], ['teach', 'Instructor'], ['teach2', 'Instructor v2'], ['monitor', 'Monitor'],
  ['vent', 'Ventilator'], ['debrief', 'Debrief'], ['explore', 'Explore physiology'], ['validate', 'Validate'], ['dev', 'Developer'], ['settings', 'Settings'],
];

/** Views with their own session bar (Instructor v2's header): the shell's session bar is hidden there. */
export const OWN_BAR_ROUTES: ReadonlySet<RouteId> = new Set(['teach2']);

/** What the shell needs of the rail: its element and a way to mark the current page. */
export interface ShellRail {
  el: HTMLElement;
  mark(id: RouteId): void;
}

export class Shell {
  readonly root: HTMLElement;
  readonly main: HTMLElement;
  readonly stage: HTMLElement;
  readonly monitorHost: HTMLElement;
  readonly bar: HTMLElement;
  readonly right: HTMLElement;
  route: Route = { id: 'home', sub: '' };
  private readonly views = new Map<RouteId, View>();
  private readonly nav: HTMLElement;
  private rail: ShellRail | null = null;
  private readonly routeFns = new Set<(r: Route) => void>();
  /** A hostless Remote or a follower: the stage and the session bar keep what the constructor set. */
  private readonly fixedFrame: boolean;

  constructor(parent: HTMLElement, o: { hostless: boolean; follower?: boolean }) {
    this.fixedFrame = o.hostless || !!o.follower;
    // The top bar lists views on a hostless Remote only (Settings); the host's pages are on the rail, and a
    // second-screen learner monitor shows the monitor alone
    const navIds = (id: RouteId) => o.hostless && id === 'settings';
    this.nav = h('nav', { class: 'nav', 'aria-label': 'Views' }, ...NAV.filter(([id]) => navIds(id)).map(([id, label]) => h('a', { href: hrefOf(id), 'data-route': id }, label)));
    this.right = h('div', { class: 'topright' });
    // narrow screens (iPad portrait, phones): the view list moves into a menu dialog so no label is clipped
    const menuDlg = h('dialog', { class: 'menu-sheet', 'aria-label': 'Views' },
      h('nav', { class: 'menu-list', 'aria-label': 'Views' }, ...NAV.filter(([id]) => navIds(id)).map(([id, label]) => h('a', { href: hrefOf(id), onclick: () => menuDlg.close() }, label))),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => menuDlg.close() }, 'Close'));
    const menuBtn = h('button', { type: 'button', class: 'btn small menu-btn', 'aria-haspopup': 'dialog', onclick: () => menuDlg.showModal() }, 'Menu');
    const top = h('header', { class: 'topbar' }, o.hostless ? h('a', { class: 'brand', href: hrefOf('remote') }, 'Patient monitor simulator') : null, o.hostless ? menuBtn : null, this.nav, h('div', { class: 'spacer' }), this.right, o.hostless ? menuDlg : null);
    this.monitorHost = h('div', { class: 'monitor-host', role: 'img', 'aria-label': 'Patient monitor' });
    this.stage = h('div', { class: 'stage', id: 'monitor' }, this.monitorHost);
    this.bar = h('div', { class: 'sessionbar', role: 'region', 'aria-label': 'Session' });
    this.main = h('main', { class: 'main', id: 'main', tabindex: -1 }, this.bar, this.stage);
    // The owner's disclaimer as a quiet footer line on every page but the monitor screens (the Monitor view and the
    // Ventilator cockpit: app.css; a learner's window and a phone have no footer)
    const foot = o.follower ? null : h('footer', { class: 'app-foot' }, FOOTER_LINE);
    this.root = h('div', { class: 'app' }, h('a', { class: 'skip', href: '#main', onclick: (e: Event) => (e.preventDefault(), this.main.focus()) }, 'Skip to the main content'), top, this.main, foot);
    parent.append(this.root);
    if (o.follower) this.bar.hidden = true;
    if (o.hostless) {
      this.stage.hidden = true;
      this.bar.hidden = true;
      this.main.classList.add('hostless');
    }
  }

  /** The workflow rail (host only): placed before the top bar; the current page is marked on every route. */
  setRail(rail: ShellRail): void {
    this.rail = rail;
    this.root.classList.add('has-rail');
    this.root.insertBefore(rail.el, this.root.querySelector('.topbar'));
    rail.mark(this.route.id);
  }

  add(v: View): void {
    v.el.classList.add('view');
    v.el.dataset.view = v.id;
    v.el.hidden = true;
    if (v.bench) v.el.classList.add('bench');
    this.views.set(v.id, v);
    this.main.append(v.el);
  }

  onRoute(fn: (r: Route) => void): () => void {
    this.routeFns.add(fn);
    return () => void this.routeFns.delete(fn);
  }

  start(): void {
    onRoute((r) => this.show(r));
  }

  show(r: Route): void {
    const prev = this.views.get(this.route.id);
    if (prev && prev.id !== r.id) {
      prev.leave?.();
      prev.el.hidden = true;
    }
    const v = this.views.get(r.id) ?? this.views.get('home');
    if (!v) return;
    this.route = { id: v.id, sub: r.id === v.id ? r.sub : '' };
    this.main.dataset.route = v.id;
    this.root.dataset.route = v.id;
    if (!this.fixedFrame) {
      // The pages before a session have no monitor beside them; any other route shows the stage (placed by the route's
      // CSS grid)
      this.stage.hidden = CONSOLE_ROUTES.has(v.id);
      this.bar.hidden = CONSOLE_ROUTES.has(v.id) || OWN_BAR_ROUTES.has(v.id);
    }
    v.el.hidden = false;
    v.enter?.(this.route.sub);
    for (const a of this.nav.querySelectorAll('a')) {
      if (a.dataset.route === v.id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
    this.rail?.mark(v.id);
    const title = NAV.find(([id]) => id === v.id)?.[1] ?? (v.id === 'remote' ? 'Remote' : '');
    document.title = title ? `${title}: patient monitor simulator` : 'Patient monitor simulator';
    for (const fn of this.routeFns) fn(this.route);
  }
}

/**
 * Mirror the active skin's alarm colours AND priority marks into the shell (brief §6.2: alarm colours are never shell
 * tokens; the panel's alarm list and the top-bar count read what the monitor shows). White text on a bright red below
 * 4.5:1 switches to black (research/13-ui-design-references rule 9: black text on bright red). A skin whose messages
 * carry asterisks gets `***`/`**`/`*`; a skin without marks (saadat-like) keeps `!!!`/`!!`/`!`, because the mirror must
 * still code priority by a mark as well as colour and word (rule 4).
 */
export function applySkinAlarmColours(skin: string, theme: string): void {
  const bar = skinAlarmBar(skin, theme);
  if (!bar) return;
  Object.assign(LEVEL_MARK, bar.prefix === 'asterisks' ? { 1: '***', 2: '**', 3: '*' } : { 1: '!!!', 2: '!!', 3: '!' });
  const s = document.documentElement.style;
  const levels: Array<['high' | 'medium' | 'low', { bg: string; fg: string }]> = [['high', bar.L1], ['medium', bar.L2], ['low', bar.L3]];
  for (const [k, c] of levels) {
    s.setProperty(`--alarm-${k}-bg`, c.bg);
    s.setProperty(`--alarm-${k}-fg`, contrast(c.fg, c.bg) >= 4.5 ? c.fg : contrast('#000000', c.bg) >= contrast('#ffffff', c.bg) ? '#000000' : '#ffffff');
  }
}

/** The active skin's message-bar colours (L1–L3), or null for an unknown skin. */
export function skinAlarmBar(skin: string, theme = ''): { L1: { bg: string; fg: string }; L2: { bg: string; fg: string }; L3: { bg: string; fg: string }; prefix: 'asterisks' | 'none' } | null {
  try {
    return resolveSkin(skin, theme ? { theme } : {}).skin.alarms.messageBar;
  } catch {
    return null;
  }
}

/** What the skin (and its preset) says still alarms with every limit group off. */
export function skinAlwaysOn(skin: string): { alwaysOn: readonly string[]; apnoeaOff: boolean } {
  try {
    const r = resolveSkin(skin);
    return { alwaysOn: r.skin.alarms.alwaysOn, apnoeaOff: r.preset?.startState?.apneaLimit === 'OFF' };
  } catch {
    return { alwaysOn: [], apnoeaOff: false };
  }
}

export const LEVEL_NAME: Readonly<Record<1 | 2 | 3, 'high' | 'medium' | 'low'>> = { 1: 'high', 2: 'medium', 3: 'low' };
/** Priority as text and marker as well as colour (IEC 60601-1-8; research/13-ui-design-references rule 4). The marks
 *  follow the active skin (`applySkinAlarmColours`): the mirror shows the monitor's own marks. */
export const LEVEL_MARK: Record<1 | 2 | 3, string> = { 1: '!!!', 2: '!!', 3: '!' };

