// The app's small component set (research/13 brief §7), plain DOM, no library: element builder, buttons, segmented
// control, numeric stepper with unit, glossary tooltip, confirm dialog (native <dialog>), toasts. Every input gets a
// label; every control is ≥ the --target size from app.css.
import { describeEntry, entry, shortLabel, type GlossaryEntry } from './glossary.ts';

type Attrs = Record<string, string | number | boolean | undefined | ((ev: Event) => void)>;
type Child = Node | string | null | undefined | false;

/** Element builder: `h('button', { class: 'btn', onclick: fn }, 'Give')`. `on*` keys are listeners. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'text') el.textContent = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export const setText = (el: Element, s: string): void => {
  if (el.textContent !== s) el.textContent = s;
};

// ---- glossary tooltip: one shared bubble; hover, focus and tap all open it (no hover-only affordance) ----
let bubble: HTMLDivElement | null = null;
function showTip(anchor: HTMLElement, text: string): void {
  bubble ??= document.body.appendChild(h('div', { class: 'tipbubble', role: 'tooltip', id: 'tipbubble' }));
  bubble.textContent = text;
  bubble.style.cssText = 'position:fixed;z-index:60;max-width:320px;white-space:pre-line;background:var(--bezel-3);color:var(--text-strong);border:1px solid var(--line-strong);border-radius:6px;padding:8px 10px;font-size:13px;box-shadow:0 6px 24px rgb(0 0 0/.35)';
  const r = anchor.getBoundingClientRect();
  const w = Math.min(320, window.innerWidth - 16);
  bubble.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - w - 8))}px`;
  bubble.style.top = `${r.bottom + 6 + 120 > window.innerHeight ? Math.max(8, r.top - 6 - bubble.offsetHeight) : r.bottom + 6}px`;
  bubble.hidden = false;
  anchor.setAttribute('aria-describedby', 'tipbubble');
}
function hideTip(): void {
  if (bubble) bubble.hidden = true;
}
document.addEventListener('keydown', (e) => e.key === 'Escape' && hideTip());
document.addEventListener('pointerdown', (e) => !(e.target as Element).closest?.('.tip') && hideTip());

/** "ⓘ" button that shows a glossary entry's long name, unit and normal range. `label` names the button after the row
 *  it sits in ("About Cp (Propofol)"), so two rows of one entry never share a button name (review F1). */
export function tip(e: GlossaryEntry, label = shortLabel(e)): HTMLButtonElement {
  const text = `${e.label}\n${describeEntry(e)}`;
  const b = h('button', { type: 'button', class: 'tip', 'aria-label': `About ${label}` }, 'ⓘ');
  b.addEventListener('mouseenter', () => showTip(b, text));
  b.addEventListener('mouseleave', hideTip);
  b.addEventListener('focus', () => showTip(b, text));
  b.addEventListener('blur', hideTip);
  b.addEventListener('click', () => showTip(b, text));
  return b;
}

/** A glossary label with its tooltip, by glossary number. */
export function glossLabel(n: number, prefix = ''): HTMLElement {
  const e = entry(n);
  return h('span', { class: 'lbl' }, h('b', {}, `${prefix}${shortLabel(e)}`), tip(e));
}

export function button(label: string, onclick: () => void, cls = '', attrs: Attrs = {}): HTMLButtonElement {
  return h('button', { type: 'button', class: `btn ${cls}`.trim(), onclick, ...attrs }, label);
}

/** Segmented control: one tap, aria-pressed on the chosen option. */
export function seg<T extends string>(label: string, options: Array<[T, string]>, value: T, onchange: (v: T) => void): HTMLElement & { value: T; set(v: T): void } {
  const wrap = h('div', { class: 'seg', role: 'group', 'aria-label': label }) as unknown as HTMLElement & { value: T; set(v: T): void };
  const set = (v: T) => {
    wrap.value = v;
    for (const b of wrap.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.v === v));
  };
  for (const [v, text] of options) wrap.append(h('button', { type: 'button', 'data-v': v, onclick: () => (set(v), onchange(v)) }, text));
  wrap.set = set;
  set(value);
  return wrap;
}

export interface Stepper {
  el: HTMLElement;
  input: HTMLInputElement;
  get value(): number;
  set(v: number): void;
}

/** − value + with a unit in the accessible name; press-and-hold repeats; typing is allowed. */
export function stepper(o: { label: string; unit: string; min: number; max: number; step: number; value: number; digits?: number; onchange?: (v: number) => void }): Stepper {
  const digits = o.digits ?? (o.step < 1 ? Math.min(2, String(o.step).split('.')[1]?.length ?? 1) : 0);
  const input = h('input', { type: 'number', inputmode: 'decimal', min: o.min, max: o.max, step: o.step, 'aria-label': `${o.label}${o.unit ? ` (${o.unit})` : ''}` });
  const clamp = (v: number) => Math.min(o.max, Math.max(o.min, v));
  const set = (v: number) => {
    input.value = clamp(v).toFixed(digits);
  };
  const bump = (d: number) => {
    set(Number(input.value) + d * o.step);
    o.onchange?.(Number(input.value));
  };
  const hold = (d: number) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const stop = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const b = h('button', { type: 'button', 'aria-label': `${d < 0 ? 'Decrease' : 'Increase'} ${o.label}`, tabindex: -1 }, d < 0 ? '−' : '+');
    b.addEventListener('pointerdown', () => {
      bump(d);
      const rep = (ms: number) => (timer = setTimeout(() => (bump(d), rep(Math.max(40, ms * 0.8))), ms));
      rep(400);
    });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, stop);
    b.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && bump(d));
    return b;
  };
  input.addEventListener('change', () => {
    set(Number(input.value));
    o.onchange?.(Number(input.value));
  });
  set(o.value);
  const el = h('div', { class: 'stepper' }, hold(-1), input, hold(1));
  return { el, input, get value() { return Number(input.value); }, set };
}

/** Labelled select. */
export function select(label: string, options: Array<[string, string]>, value: string, onchange?: (v: string) => void, groups?: Record<string, Array<[string, string]>>): { el: HTMLElement; sel: HTMLSelectElement } {
  const id = `f${Math.random().toString(36).slice(2, 8)}`;
  const sel = h('select', { class: 'input', id });
  for (const [v, t] of options) sel.append(h('option', { value: v }, t));
  for (const [g, opts] of Object.entries(groups ?? {})) sel.append(h('optgroup', { label: g }, ...opts.map(([v, t]) => h('option', { value: v }, t))));
  sel.value = value;
  if (onchange) sel.addEventListener('change', () => onchange(sel.value));
  return { el: h('div', { class: 'field' }, h('label', { for: id }, label), sel), sel };
}

/** Labelled number/text input. */
export function input(label: string, attrs: Attrs = {}): { el: HTMLElement; inp: HTMLInputElement } {
  const id = `f${Math.random().toString(36).slice(2, 8)}`;
  const inp = h('input', { class: 'input', id, ...attrs });
  return { el: h('div', { class: 'field' }, h('label', { for: id }, label), inp), inp };
}

/** Confirm dialog (destructive or patient-resetting actions only). Both buttons name their outcome ("Restart patient" /
 *  "Keep this patient"). Resolves true on the primary action. */
export function confirmDialog(title: string, body: string, action: string, danger = true, keep = 'Cancel'): Promise<boolean> {
  return new Promise((resolve) => {
    const d = h('dialog', { 'aria-labelledby': 'dlg-t' },
      h('h2', { id: 'dlg-t' }, title), h('p', { style: 'white-space:pre-line' }, body),
      h('div', { class: 'actions' },
        button(keep, () => d.close('cancel'), 'ghost'),
        button(action, () => d.close('ok'), danger ? 'danger' : 'primary')));
    d.addEventListener('close', () => {
      resolve(d.returnValue === 'ok');
      d.remove();
    });
    document.body.append(d);
    d.showModal();
  });
}

const toastHost = (): HTMLElement => document.querySelector('.toasts') ?? document.body.appendChild(h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }));
/** "Noradrenaline 0.1 µg/kg/min started" — the same verb as the button; 4 s. */
export function toast(text: string): void {
  const t = h('div', { class: 'toast' }, text);
  toastHost().append(t);
  setTimeout(() => t.remove(), 4000);
}

export const clock = (t: number | null | undefined): string =>
  t === null || t === undefined || !Number.isFinite(t) ? '--:--' : `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export { store } from './store.ts';

export const PIN_SVG = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 1h4l-.6 3.2L9.5 6v1H6.5v4L6 12l-.5-1V7h-3V6l2.1-1.8z" fill="currentColor"/></svg>';
export const WAVE_SVG = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M0 7h2l1.5-4 2 8 2-6 1 2H12" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>';

/** Run `fn` at most every `ms` (trailing call kept), inside one animation frame: the panel's ≤ 2 Hz refresh (brief §10). */
export function throttle(fn: () => void, ms: number): () => void {
  let last = 0;
  let busy = false; // a timer or a frame is pending: a hidden tab (no frames) never piles up callbacks
  const frame = () => {
    busy = false;
    last = performance.now();
    fn();
  };
  return () => {
    if (busy) return;
    busy = true;
    setTimeout(() => requestAnimationFrame(frame), Math.max(0, last + ms - performance.now()));
  };
}

export interface TabDef {
  id: string;
  label: string;
  render(): HTMLElement;
}

/** ARIA tabs (arrow keys move, Home/End jump); panels are built on first open. Returns the root and a selector. */
export function tabs(label: string, defs: readonly TabDef[], initial: string, onSelect?: (id: string) => void, cls = 'tabs'): { el: HTMLElement; panels: HTMLElement; select(id: string): void; current(): string } {
  const list = h('div', { class: cls, role: 'tablist', 'aria-label': label });
  const panels = h('div', { class: 'tabpanels' });
  const built = new Map<string, HTMLElement>();
  let cur = '';
  const btns = defs.map((d) =>
    h('button', { type: 'button', role: 'tab', id: `tab-${d.id}`, 'aria-controls': `tp-${d.id}`, 'aria-selected': 'false', tabindex: -1, 'data-tab': d.id, onclick: () => select(d.id) }, d.label),
  );
  list.append(...btns);
  list.addEventListener('keydown', (e) => {
    const i = btns.findIndex((b) => b.dataset.tab === cur);
    const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? btns.length - 1 : null;
    if (n === null) return;
    e.preventDefault();
    const b = btns[(n + btns.length) % btns.length] as HTMLButtonElement;
    select(b.dataset.tab as string);
    b.focus();
  });
  function select(id: string): void {
    if (!defs.some((d) => d.id === id)) return;
    cur = id;
    for (const b of btns) {
      const on = b.dataset.tab === id;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    for (const d of defs) {
      let p = built.get(d.id);
      if (d.id === id && !p) {
        p = h('div', { class: 'tabpanel', role: 'tabpanel', id: `tp-${d.id}`, 'aria-labelledby': `tab-${d.id}`, tabindex: 0 }, d.render());
        built.set(d.id, p);
        panels.append(p);
      }
      if (p) p.hidden = d.id !== id;
    }
    onSelect?.(id);
  }
  select(initial);
  return { el: h('div', { class: 'tabs-wrap' }, list, panels), panels, select, current: () => cur };
}

/** Download a text file (log export, site profile). */
export function download(name: string, text: string, type = 'text/plain'): void {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => (URL.revokeObjectURL(a.href), a.remove()), 0);
}

/** Toggle button with aria-pressed and a filled dot when on (brief §7 "toggle"). */
export function toggle(label: string, on: boolean, onchange: (on: boolean) => void, cls = ''): HTMLButtonElement & { set(v: boolean): void } {
  const b = button(label, () => {
    const v = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(v));
    onchange(v);
  }, cls) as HTMLButtonElement & { set(v: boolean): void };
  b.setAttribute('aria-pressed', String(on));
  b.set = (v) => b.setAttribute('aria-pressed', String(v));
  return b;
}

/** Information dialog with one Close button (shortcut sheet, help). */
export function infoDialog(title: string, body: string | HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const d = h('dialog', { 'aria-labelledby': 'info-t' },
      h('h2', { id: 'info-t' }, title), typeof body === 'string' ? h('p', { style: 'white-space:pre-line' }, body) : body,
      h('div', { class: 'actions' }, button('Close', () => d.close(), 'primary')));
    d.addEventListener('close', () => {
      d.remove();
      resolve();
    });
    document.body.append(d);
    d.showModal();
  });
}
