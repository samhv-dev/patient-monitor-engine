// The workflow rail (E125, owner's mockups of 26 October): the app's navigation in the order of a teaching session —
// Home; before the session Room, Scenarios, Patient; during it Instructor (today's view or v2, chosen in Settings:
// owner, 30 October), Monitor, Ventilator; after it Debrief; then Explore physiology, Tools (Validate · Developer) and
// Settings, the groups parted by a thin line (no captions: the owner's correction of 26 October). Its foot carries the
// light/dark switch (the site profile's "Screen" theme, saved as Settings saves it) and a clock: the time on one line,
// the Gregorian and the Persian date on the next (the Persian date in Persian script and digits, «۴ آبان ۱۴۰۵», owner's
// request of 26 October). It replaces the top bar's tabs; on the Instructor view it collapses to a 56-px icon strip
// (app.css), on the Monitor view, a learner's window and a phone it is not shown.
import type { RouteId } from './router.ts';
import { hrefOf } from './router.ts';
import { h, setText } from './ui.ts';

/** 24 × 24 line icons, drawn in currentColor; shown on the collapsed strip only (the full rail is text, as the mockup). */
const ICONS: Record<string, string> = {
  home: 'M3.5 11 12 4l8.5 7M5.5 9.5V20h4.5v-6h4v6h4.5V9.5',
  room: 'M3 5h12v9H3zM6.5 18h5M9 14v4M17.5 8.5H21V20h-3.5z',
  scenarios: 'M4 5h16v14H4zM8 9h8M8 13h5',
  patient: 'M12 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM5 20c.9-3.9 3.6-6 7-6s6.1 2.1 7 6',
  teach: 'M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1M15 5v4M9 10v4M17 15v4',
  monitor: 'M3 5h18v14H3zM5 13h3l1.5-4 3 7 1.5-3H19',
  vent: 'M3 9h10a3 3 0 1 0-3-3M3 13h14a3 3 0 1 1-3 3M3 17h6',
  debrief: 'M9 4h6v3H9zM7 5.5H5V21h14V5.5h-2M9 14l2 2 4-4',
  explore: 'M4 4v16h16M8 15l3.5-4.5 3 3L19 8',
  validate: 'M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM8.5 12.5 11 15l4.5-5',
  dev: 'M9 7l-5 5 5 5M15 7l5 5-5 5',
  settings: 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1',
};

function icon(id: string): SVGSVGElement {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', 'rail-ico');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', ICONS[id] ?? '');
  s.append(p);
  return s;
}

type Entry = ['hr'] | [RouteId, string] | ['tools'];
/** The rail in the session's order (owner's mockup `rail.js`). */
export const RAIL: readonly Entry[] = [
  ['home', 'Home'],
  ['hr'], ['room', 'Room'], ['scenarios', 'Scenarios'], ['patient', 'Patient'],
  ['hr'], ['teach', 'Instructor'], ['monitor', 'Monitor'], ['vent', 'Ventilator'], // Instructor: the view chosen in Settings
  ['hr'], ['debrief', 'Debrief'],
  ['hr'], ['explore', 'Explore physiology'], ['tools'], ['settings', 'Settings'],
];

export interface RailOptions {
  /** "1.0.0-rc.4, pre-release". */
  version: string;
  /** The small grey words beside an entry ("4 devices", "17", "free run"), read on every refresh. */
  badges?: Partial<Record<RouteId, () => string>>;
  /** The site's screen theme: light or not, and the switch's action (it saves the site profile). */
  theme: { light(): boolean; set(light: boolean): void };
  /** The Instructor view chosen in Settings: the one "Instructor" entry leads there (today's view without it). */
  instructor?: () => 'teach' | 'teach2';
  /** For tests: the clock's time source. */
  now?: () => Date;
}

/** { time: "21:48", day: "Mon 26 Oct", fa: "۴ آبان ۱۴۰۵" }: the Persian date from the browser's own calendar (Intl,
 *  fa-IR), '' where the browser has no Persian calendar (the Gregorian date alone is shown). */
export function railClock(d: Date): { time: string; day: string; fa: string } {
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
  return { time, day, fa: persianDate(d) };
}

/** «۴ آبان ۱۴۰۵»: Persian digits and month name, or '' without a Persian calendar. */
export function persianDate(d: Date): string {
  try {
    const f = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long', year: 'numeric' });
    if (f.resolvedOptions().calendar !== 'persian') return '';
    return f.formatToParts(d).filter((p) => p.type !== 'era').map((p) => p.value).join('').trim();
  } catch {
    return '';
  }
}

export class Rail {
  readonly el: HTMLElement;
  private readonly links = new Map<RouteId, HTMLAnchorElement[]>();
  private readonly badgeEls = new Map<RouteId, HTMLElement>();
  private readonly themeBtn: HTMLButtonElement;
  private readonly themeText: HTMLElement;
  private readonly clockEl: HTMLElement;
  private readonly timeEl: HTMLElement;
  private readonly dateEl: HTMLElement;
  private readonly faEl: HTMLElement;
  private readonly timer: ReturnType<typeof setInterval>;
  private readonly o: RailOptions;

  constructor(o: RailOptions) {
    this.o = o;
    const items: HTMLElement[] = [];
    for (const e of RAIL) {
      if (e[0] === 'hr') items.push(h('hr', { class: 'rail-hr' }));
      else if (e[0] === 'tools') items.push(this.tools());
      else items.push(this.link(e[0], e[1]));
    }
    this.themeText = h('span', { class: 'rail-text' });
    this.themeBtn = h('button', { type: 'button', role: 'switch', class: 'rail-theme', 'aria-label': 'Light screen', onclick: () => {
      this.o.theme.set(!this.o.theme.light());
      this.drawTheme();
    } }, h('i', { class: 'rail-knob', 'aria-hidden': 'true' }), this.themeText);
    this.timeEl = h('span', { class: 'rail-time' });
    this.dateEl = h('span', {});
    this.faEl = h('bdi', { class: 'rail-fa', lang: 'fa', dir: 'rtl' });
    this.clockEl = h('p', { class: 'rail-clock rail-text' }, this.timeEl, h('span', { class: 'rail-date' }, this.dateEl, this.faEl));
    this.el = h('nav', { class: 'rail', 'aria-label': 'Pages' },
      h('div', { class: 'rail-brand' }, h('span', { class: 'mark', 'aria-hidden': 'true' }),
        h('span', { class: 'rail-text' }, h('b', {}, 'Patient monitor simulator'), h('small', {}, o.version))),
      h('div', { class: 'rail-list' }, ...items),
      h('div', { class: 'rail-foot' }, this.themeBtn, this.clockEl));
    this.drawTheme();
    this.refresh();
    this.timer = setInterval(() => this.refresh(), 15_000);
  }

  /** Mark the current page (aria-current) — the Tools row is current on Validate and on Developer, Instructor on either
   *  Instructor view (a deep link to the other one included). */
  mark(id: RouteId): void {
    const at = id === 'teach2' ? 'teach' : id;
    for (const [rid, as] of this.links) for (const a of as) (rid === at ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    this.el.querySelector('.rail-tools')?.classList.toggle('on', id === 'validate' || id === 'dev');
  }

  /** Redraw the badges, the switch and the clock. */
  refresh(): void {
    const to = this.o.instructor?.() ?? 'teach';
    for (const a of this.links.get('teach') ?? []) (a.setAttribute('href', hrefOf(to)), (a.dataset.route = to));
    for (const [id, el] of this.badgeEls) setText(el, this.o.badges?.[id]?.() ?? '');
    this.drawTheme();
    const c = railClock(this.o.now?.() ?? new Date());
    setText(this.timeEl, c.time);
    setText(this.dateEl, c.fa ? `${c.day} · ` : c.day);
    setText(this.faEl, c.fa);
    this.faEl.hidden = !c.fa;
  }

  destroy(): void {
    clearInterval(this.timer);
  }

  private drawTheme(): void {
    const light = this.o.theme.light();
    this.themeBtn.setAttribute('aria-checked', String(light));
    setText(this.themeText, light ? 'Light' : 'Dark');
  }

  private link(id: RouteId, label: string, cls = 'rail-item'): HTMLAnchorElement {
    const badge = h('small', { class: 'rail-badge' });
    const a = h('a', { class: cls, href: hrefOf(id), 'data-route': id, title: label }, icon(id), h('span', { class: 'rail-text' }, label), badge);
    if (this.o.badges?.[id]) this.badgeEls.set(id, badge);
    else badge.remove();
    this.links.set(id, [...(this.links.get(id) ?? []), a]);
    return a;
  }

  /** "Tools  validate · developer": two small links on one row (the strip shows their two icons). */
  private tools(): HTMLElement {
    const validate = this.link('validate', 'validate', 'rail-subitem');
    const dev = this.link('dev', 'developer', 'rail-subitem');
    validate.setAttribute('aria-label', 'Validate');
    dev.setAttribute('aria-label', 'Developer');
    return h('div', { class: 'rail-item rail-tools' },
      h('span', { class: 'rail-text' }, 'Tools'),
      h('span', { class: 'rail-sub' }, validate, h('span', { class: 'rail-text', 'aria-hidden': 'true' }, '·'), dev));
  }
}

/**
 * Instructor v2 (owner, 31 October): the rail's upper divider and its foot's border sit at the height of the page lines
 * they mirror — the line under the stage strip and the line on top of the dock. Measured, not copied from the page's grid
 * rows, so they follow the strip whatever height it takes (the Case briefing and the finishing state add their
 * 40-px status line under it): on the rail, `--rail-rule-y` (the rail's top to the top of the strip's bottom border) and
 * `--rail-foot-h` (the dock's top edge, its border, to the rail's bottom); app.css lays the teach2 rail out from them.
 * Removed while the view is hidden, so no other route reads them.
 */
export function trackPageLines(rail: HTMLElement, strip: HTMLElement | null, dock: HTMLElement | null): () => void {
  const set = () => {
    const s = strip?.getBoundingClientRect();
    const d = dock?.getBoundingClientRect();
    if (!strip || !s || !d || s.height === 0 || d.height === 0) {
      rail.style.removeProperty('--rail-rule-y');
      rail.style.removeProperty('--rail-foot-h');
      return;
    }
    const r = rail.getBoundingClientRect();
    rail.style.setProperty('--rail-rule-y', `${s.bottom - parseFloat(getComputedStyle(strip).borderBottomWidth) - r.top}px`);
    rail.style.setProperty('--rail-foot-h', `${r.bottom - d.top}px`);
  };
  const ro = new ResizeObserver(set);
  for (const e of [rail, strip, dock]) if (e) ro.observe(e);
  addEventListener('resize', set);
  set();
  return () => {
    ro.disconnect();
    removeEventListener('resize', set);
  };
}
