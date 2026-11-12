// Shared by every e2e test that checks Instructor v2's dock and the open sheet at the laptop sizes (brief 208; taken
// from PR 459's pump-rack.e2e.ts checks so either can import them). Not a test file: testMatch is *.e2e.ts.
// A control "fits" when it is the element at its own centre (nothing lies over it) and its box overlaps no other control.
import type { Page } from '@playwright/test';

/** The laptop sizes the dock is measured at (the gate's four). */
export const DOCK_SIZES = [{ width: 1280, height: 720 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }] as const;

/** The dock's visible controls (its tools, marks, note field, links and the cards' buttons) whose centre is not the
 *  control itself; a control scrolled out of a card's own box is hidden by it, not covered. */
export const dockBlocked = (page: Page): Promise<string[]> => page.evaluate(() => {
  const out: string[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('.ip2-dock button, .ip2-dock a[href], .ip2-dock summary, .ip2-dock input, .ip2-dock select')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden') continue;
    const box = (el.closest('.ip2-lp, .ip2-pm') ?? el).getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (y < box.top || y > box.bottom) continue;
    const hit = document.elementFromPoint(x, y);
    if (!hit || !(el === hit || el.contains(hit))) out.push(`${el.className || el.tagName} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" under ${hit instanceof HTMLElement ? hit.className || hit.tagName : 'nothing'}`);
  }
  return out;
});

/** Pairs of the dock's visible controls whose boxes overlap (by more than half a pixel each way), with the overlap in px. */
export const dockOverlaps = (page: Page): Promise<string[]> => page.evaluate(() => {
  const els = [...document.querySelectorAll<HTMLElement>('.ip2-dock button, .ip2-dock a[href], .ip2-dock summary, .ip2-dock input, .ip2-dock select')].filter((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
  });
  const name = (e: HTMLElement) => (e.textContent || e.getAttribute('aria-label') || e.className).trim().slice(0, 20);
  const out: string[] = [];
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = els[i] as HTMLElement, b = els[j] as HTMLElement;
    if (a.contains(b) || b.contains(a)) continue;
    const p = a.getBoundingClientRect(), q = b.getBoundingClientRect();
    const w = Math.min(p.right, q.right) - Math.max(p.left, q.left), hh = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
    if (w > 0.5 && hh > 0.5) out.push(`"${name(a)}" × "${name(b)}" (${Math.round(w)} px)`);
  }
  return out;
});

/** The open sheet's footer and tray controls (Deliver, the Onset select, the sheet's own primary buttons, the tray's
 *  chips) whose centre is not the control itself, or that lie outside the window or under the dock. */
export const sheetFootBlocked = (page: Page): Promise<string[]> => page.evaluate(() => {
  const out: string[] = [];
  const s = document.querySelector<HTMLElement>('.ip2-sheets .ip2-sheet:not([hidden])');
  if (!s) return ['no sheet open'];
  const dock = document.querySelector('.ip2-dock')?.getBoundingClientRect();
  for (const el of s.querySelectorAll<HTMLElement>('.ip2-sheet-foot button, .ip2-sheet-foot select, .ip2-sheet-tray button')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden') continue;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const what = `"${(el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 40)}"`;
    if (y > innerHeight || (dock && y > dock.top)) {
      out.push(`${what} below the window or under the dock`);
      continue;
    }
    const hit = document.elementFromPoint(x, y);
    if (!hit || !(el === hit || el.contains(hit))) out.push(`${what} under ${hit instanceof HTMLElement ? hit.className || hit.tagName : 'nothing'}`);
  }
  return out;
});

/** How many footer controls the open sheet shows (so the check above is not vacuous). */
export const sheetFootCount = (page: Page): Promise<number> => page.locator('.ip2-sheets .ip2-sheet:not([hidden]) .ip2-sheet-foot').locator('button:visible, select:visible').count();

/** The open sheet's rows as drawn: each grid row's height, and whether the Onset select shows its whole chosen text
 *  (the prototype of brief 207 saw "Nc" at 1280 px and a tray row not drawn at 1280 × 800). */
export const sheetRows = (page: Page): Promise<{ head: number; tabs: number; body: number; tray: number; foot: number; trayInView: boolean; onsetCut: boolean; onsetW: number }> => page.evaluate(() => {
  const s = document.querySelector<HTMLElement>('.ip2-sheets .ip2-sheet:not([hidden])') as HTMLElement;
  const hOf = (sel: string) => Math.round(s.querySelector(sel)?.getBoundingClientRect().height ?? 0);
  const tray = s.querySelector('.ip2-sheet-tray')?.getBoundingClientRect();
  const dockTop = document.querySelector('.ip2-dock')?.getBoundingClientRect().top ?? innerHeight;
  const sel = s.querySelector<HTMLSelectElement>('.ip2-onset select');
  // the chosen option's text, measured in the select's own font, against the room inside it (padding and the arrow)
  let onsetCut = false;
  let onsetW = 0;
  if (sel) {
    const cs = getComputedStyle(sel);
    const g = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
    g.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const longest = Math.max(...[...sel.options].map((o) => g.measureText(o.text).width));
    onsetW = Math.round(sel.getBoundingClientRect().width);
    onsetCut = sel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 14 < longest; // 14 px: the drop arrow
  }
  return { head: hOf('.ip2-sheet-head'), tabs: hOf('.ip2-sheet-tabs'), body: hOf('.ip2-sheet-body'), tray: Math.round(tray?.height ?? 0), foot: hOf('.ip2-sheet-foot'), trayInView: !!tray && tray.height >= 40 && tray.bottom <= dockTop + 0.5, onsetCut, onsetW };
});
