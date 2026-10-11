// The app frame (research/13 brief §4, §7 "App shell / top bar"): top bar with the view switcher and the always-visible
// state (alarm count in the skin's colours, sound, remote code), the session bar, the monitor region ("stage") that
// never leaves the DOM, and one section per view. A route change only re-places regions by CSS grid areas and toggles
// `hidden`; the engine is never touched by navigation.
import { resolveSkin } from '@pme/skins';
import { hrefOf, onRoute, type Route, type RouteId } from './router.ts';
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

export const NAV: ReadonlyArray<[RouteId, string]> = [
  ['start', 'Start'], ['monitor', 'Monitor'], ['teach', 'Instructor'], ['explore', 'Explore physiology'], ['vent', 'Ventilator'],
  ['validate', 'Validate'], ['dev', 'Developer'], ['settings', 'Settings'],
];

export class Shell {
  readonly root: HTMLElement;
  readonly main: HTMLElement;
  readonly stage: HTMLElement;
  readonly monitorHost: HTMLElement;
  readonly bar: HTMLElement;
  readonly right: HTMLElement;
  route: Route = { id: 'start', sub: '' };
  private readonly views = new Map<RouteId, View>();
  private readonly nav: HTMLElement;
  private readonly routeFns = new Set<(r: Route) => void>();

  constructor(parent: HTMLElement, o: { hostless: boolean }) {
    this.nav = h('nav', { class: 'nav', 'aria-label': 'Views' }, ...NAV.filter(([id]) => !o.hostless || id === 'settings').map(([id, label]) => h('a', { href: hrefOf(id), 'data-route': id }, label)));
    this.right = h('div', { class: 'topright' });
    // narrow screens (iPad portrait, phones): the view list moves into a menu dialog so no label is clipped
    const menuDlg = h('dialog', { class: 'menu-sheet', 'aria-label': 'Views' },
      h('nav', { class: 'menu-list', 'aria-label': 'Views' }, ...NAV.filter(([id]) => !o.hostless || id === 'settings').map(([id, label]) => h('a', { href: hrefOf(id), onclick: () => menuDlg.close() }, label))),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => menuDlg.close() }, 'Close'));
    const menuBtn = h('button', { type: 'button', class: 'btn small menu-btn', 'aria-haspopup': 'dialog', onclick: () => menuDlg.showModal() }, 'Menu');
    const top = h('header', { class: 'topbar' }, h('a', { class: 'brand', href: hrefOf(o.hostless ? 'remote' : 'start') }, 'Patient monitor simulator'), menuBtn, this.nav, h('div', { class: 'spacer' }), this.right, menuDlg);
    this.monitorHost = h('div', { class: 'monitor-host', role: 'img', 'aria-label': 'Patient monitor' });
    this.stage = h('div', { class: 'stage', id: 'monitor' }, this.monitorHost);
    this.bar = h('div', { class: 'sessionbar', role: 'region', 'aria-label': 'Session' });
    this.main = h('main', { class: 'main', id: 'main', tabindex: -1 }, this.bar, this.stage);
    this.root = h('div', { class: 'app' }, h('a', { class: 'skip', href: '#main', onclick: (e: Event) => (e.preventDefault(), this.main.focus()) }, 'Skip to the main content'), top, this.main);
    parent.append(this.root);
    if (o.hostless) {
      this.stage.hidden = true;
      this.bar.hidden = true;
      this.main.classList.add('hostless');
    }
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
    const v = this.views.get(r.id) ?? this.views.get('start');
    if (!v) return;
    this.route = { id: v.id, sub: r.id === v.id ? r.sub : '' };
    this.main.dataset.route = v.id;
    this.root.dataset.route = v.id;
    v.el.hidden = false;
    v.enter?.(this.route.sub);
    for (const a of this.nav.querySelectorAll('a')) {
      if (a.dataset.route === v.id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
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
 * still code priority by a mark as well as colour and word (rule 4; R50 review F12).
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

/** FU-11 (owner ruling Q4): what the skin (and its preset) says still alarms with every limit group off. */
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
 *  follow the active skin (`applySkinAlarmColours`): the mirror shows the monitor's own marks (R50 review F12). */
export const LEVEL_MARK: Record<1 | 2 | 3, string> = { 1: '!!!', 2: '!!', 3: '!' };

