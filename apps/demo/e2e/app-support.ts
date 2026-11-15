// Stage 9 e2e support (not a test file: testMatch is *.e2e.ts): the Vite server, the app hook, route helpers and the
// in-page audits (engine-id scan, accessibility checks) shared by the stage9-*.e2e.ts files.
import { createServer as netServer, type AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { createServer, preview, type InlineConfig, type PreviewServer, type ViteDevServer } from 'vite';

/** A port the operating system hands out now (listen on 0, read it, release it). */
async function osPort(): Promise<number> {
  const s = netServer();
  await new Promise<void>((r) => s.listen(0, '127.0.0.1', r));
  const { port } = s.address() as AddressInfo;
  await new Promise<void>((r) => s.close(() => r()));
  return port;
}

async function e2ePort(offset = 0): Promise<number> {
  const fixed = Number(process.env.PME_E2E_PORT) || 0;
  return fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) + offset : await osPort();
}

/**
 * The ONE way an e2e file starts a Vite server (brief 236; packages/validation/test/e2e-servers.test.ts keeps every file
 * on it). Each server gets its own port, held strictly: Vite 6 reads a port of 0 as "5173, or the next free one", so
 * before this every file's server took 5173 in turn and a page a test left open reloaded onto the next file's server.
 * The port: PME_E2E_PORT + the worker's parallel index (+ `portOffset`) when that variable is set (a machine whose runs
 * keep to an assigned range), otherwise one the operating system hands out. `strictPort`: a port taken meanwhile fails
 * the start loudly instead of sharing. `config` is merged over the app's own (vite.config.ts); its `server` keeps the
 * port and host given here.
 */
export async function startVite(config: InlineConfig = {}, o: { portOffset?: number } = {}): Promise<{ vite: ViteDevServer; base: string }> {
  const port = await e2ePort(o.portOffset);
  const vite = await createServer({
    root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), logLevel: 'error',
    ...config,
    server: { ...config.server, port, strictPort: true, host: '127.0.0.1' },
  });
  await vite.listen();
  return { vite, base: `http://127.0.0.1:${port}` };
}

/** The same for a `vite preview` server of a build (`config` names the build's outDir): its own port, strictly held. */
export async function startVitePreview(config: InlineConfig): Promise<{ server: PreviewServer; base: string }> {
  const port = await e2ePort();
  const server = await preview({ logLevel: 'error', ...config, preview: { ...config.preview, port, strictPort: true, host: '127.0.0.1' } });
  return { server, base: `http://127.0.0.1:${port}` };
}

/** Open the app, optionally with a site profile, and wait for the session and real warm-up time (brief §11.1). */
export async function openApp(page: Page, base: string, hash = '#/', o: { site?: Record<string, unknown>; warmMs?: number } = {}): Promise<void> {
  if (o.site) await page.addInitScript((s) => localStorage.setItem('pme.site', JSON.stringify(s)), o.site);
  await page.goto(`${base}/${hash}`);
  await page.waitForFunction(() => '__pmeApp' in window);
  if (o.warmMs) await page.waitForTimeout(o.warmMs);
}

export async function go(page: Page, hash: string, settleMs = 700): Promise<void> {
  await page.evaluate((h) => (location.hash = h), hash);
  await page.waitForTimeout(settleMs);
}

export async function tab(page: Page, id: string): Promise<void> {
  await page.click(`[role=tab][data-tab=${id}]`);
  await page.waitForTimeout(600);
}

export const TABS = ['scenario', 'vitals', 'drugs', 'airway', 'defib', 'devices', 'patient', 'log'] as const;
export const EXPLORE = ['overview', 'haemodynamics', 'respiratory', 'gas', 'blood', 'brain', 'kidney', 'liver', 'endocrine', 'neuro', 'drugs', 'labs'] as const;

/**
 * Engine ids in the visible text, aria-labels and titles of the clinical views (research/11 §5.16 rule 1). Exempt by
 * design: the monitor's interior (`.stage`: skin data, FU-5), iframes (the Stage V and 8a pages keep their own
 * device labels), Explore's collapsed "Model internals", `code` and the Developer view.
 */
export function scanEngineIds(page: Page, extraIds: readonly string[]): Promise<string[]> {
  return page.evaluate((ids) => {
    const idSet = new Set(ids);
    const leak = /\b(?!(?:mmHg|cmH|pH|mEq|kPa|iCa|mOsm|eGFR|mL|dL|mA|sO|awRR)\b)[a-z]+[A-Z][A-Za-z0-9]*\b|\b(?!a\.u\b)[a-z][a-zA-Z0-9]*\.[a-z][a-zA-Z0-9.]*\b|\bStage \d|\bR\d{2}\b/;
    const skip = (el: Element | null): boolean => !!el?.closest('.stage, iframe, .internals, code, [data-view="dev"], [hidden], dialog:not([open])');
    const hits: string[] = [];
    const check = (s: string, where: string) => {
      const m = leak.exec(s);
      if (m) hits.push(`${where}: "${m[0]}" in "${s.slice(0, 80)}"`);
      for (const w of s.split(/[^A-Za-z0-9.]+/)) if (idSet.has(w)) hits.push(`${where}: id "${w}" in "${s.slice(0, 80)}"`);
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      const t = n.textContent?.trim() ?? '';
      if (!t || skip(el) || !el || el.closest('script, style')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0 && !el.closest('.sr-only')) continue;
      check(t, el.tagName.toLowerCase());
    }
    for (const el of document.querySelectorAll('[aria-label], [title], [placeholder]')) {
      if (skip(el)) continue;
      for (const a of ['aria-label', 'title', 'placeholder']) {
        if (a === 'title' && el.hasAttribute('data-vendor-title')) continue; // quotes the monitor's own text (review F4)
        const v = el.getAttribute(a);
        if (v) check(v, `${el.tagName.toLowerCase()}[${a}]`);
      }
    }
    return [...new Set(hits)];
  }, extraIds);
}

export interface A11yFinding {
  rule: string;
  what: string;
}

/**
 * WCAG 2.2 AA checks that need no dependency (axe is the owner's question Q8): target size (2.5.8, 24 px; 44 px in the
 * instructor panel and the instructor phone's PIN form and Room card on a touch screen), accessible names (1.3.1/4.1.2), text contrast (1.4.3) from the rendered
 * colours, horizontal scroll (1.4.10) and clipped labels (brief §11.2), one h1 per view and a main landmark.
 */
export function audit(page: Page, o: { touchPanel: boolean; drawnDevice?: string }): Promise<A11yFinding[]> {
  return page.evaluate(({ touchPanel, drawnDevice }) => {
    const out: Array<{ rule: string; what: string }> = [];
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !el.closest('[hidden], .stage canvas, iframe, dialog:not([open])') && r.bottom > 0 && r.right > 0 && r.top < innerHeight * 3;
    };
    const name = (el: Element) => {
      const t = el.getAttribute('aria-label') ?? '';
      if (t.trim()) return t;
      const by = el.getAttribute('aria-labelledby');
      if (by) return by.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
      if (el.id) {
        const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (l?.textContent?.trim()) return l.textContent;
      }
      const wrap = el.closest('label');
      if (wrap?.textContent?.trim()) return wrap.textContent;
      if (el instanceof HTMLInputElement && (el.type === 'button' || el.type === 'submit')) return el.value;
      return ['BUTTON', 'A', 'SUMMARY'].includes(el.tagName) || el.getAttribute('role') === 'tab' ? el.textContent ?? '' : '';
    };
    const ctl = 'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=tab], [role=radio]';
    for (const el of document.querySelectorAll(ctl)) {
      if (!visible(el) || el.closest('.stage') || el.classList.contains('sr-only')) continue;
      // a checkbox or radio is hit through its whole label (WCAG 2.5.8 counts the label as the target)
      const box = el.matches('input[type=checkbox], input[type=radio]') ? el.closest('label') ?? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) ?? el : el;
      const r = box.getBoundingClientRect();
      const inline = el.tagName === 'A' && !!el.closest('p, li') && !el.classList.contains('btn');
      const min = touchPanel && el.closest('.panel, .sessionbar, .ip-peer-form, .ip-peer-room, .lr-pin-room, .lr') && !el.classList.contains('tip') ? 44 : 24; // the instructor phone's way in (P7) and the learner remote with its Room panel (L6) too
      if (!inline && (r.width < min - 0.5 || r.height < min - 0.5)) out.push({ rule: 'target', what: `${el.tagName.toLowerCase()} "${(el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 30)}" ${Math.round(r.width)}×${Math.round(r.height)} < ${min}` });
      if (!name(el).trim() && el.getAttribute('type') !== 'file') out.push({ rule: 'name', what: `${el.tagName.toLowerCase()}#${el.id} has no accessible name` });
      if ((el.tagName === 'BUTTON' || el.getAttribute('role') === 'tab') && el.scrollWidth > el.clientWidth + 1) out.push({ rule: 'clipped', what: `"${el.textContent?.trim().slice(0, 30)}" clipped` });
    }
    // contrast: every visible text node against the first opaque background behind it
    const rgb = (s: string): [number, number, number, number] => {
      const m = s.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1];
      return [m[0] ?? 0, m[1] ?? 0, m[2] ?? 0, m[3] ?? 1];
    };
    const lum = ([r, g, b]: number[]) => {
      const f = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r ?? 0) + 0.7152 * f(g ?? 0) + 0.0722 * f(b ?? 0);
    };
    const bgOf = (el: Element | null): number[] => {
      for (let e = el; e; e = e.parentElement) {
        const c = rgb(getComputedStyle(e).backgroundColor);
        if (c[3] > 0.95) return c;
      }
      return [255, 255, 255, 1];
    };
    const seen = new Set<Element>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || seen.has(el) || !n.textContent?.trim() || !visible(el) || el.closest('.stage, .sr-only, [disabled], option, .qr')) continue;
      // ONE narrow exemption, contrast only (brief 159): the drawn picture of a real device (the EDP-TS ventilator's
      // housing and screen) keeps the device's own photographed colours, small white-on-blue words included; bending
      // them to 4.5:1 would make the picture unlike the machine the resident will use. Everything outside it (the
      // simulator's strip, the handle, the drawer) stays under the full rule, and targets and names hold inside it too.
      if (drawnDevice && el.closest(drawnDevice)) continue;
      seen.add(el);
      const cs = getComputedStyle(el);
      const fg = rgb(cs.color);
      const bg = bgOf(el);
      const a = fg[3];
      const mix = [0, 1, 2].map((i) => (fg[i] ?? 0) * a + (bg[i] ?? 0) * (1 - a));
      const [x, y] = [lum(mix), lum(bg)].sort((p, q) => q - p) as [number, number];
      const ratio = (x + 0.05) / (y + 0.05);
      const size = Number.parseFloat(cs.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
      const need = large ? 3 : 4.5;
      const disabledBtn = el.closest('button:disabled');
      if (ratio < need - 0.01 && !disabledBtn) out.push({ rule: 'contrast', what: `"${n.textContent.trim().slice(0, 30)}" ${ratio.toFixed(2)}:1 < ${need}` });
    }
    const vis = [...document.querySelectorAll('.view:not([hidden])')];
    const h1s = [...document.querySelectorAll('h1')].filter((h) => !h.closest('[hidden]'));
    if (h1s.length !== 1) out.push({ rule: 'h1', what: `${h1s.length} h1 visible` });
    if (!document.querySelector('main')) out.push({ rule: 'landmark', what: 'no main' });
    if (document.documentElement.scrollWidth > innerWidth + 1) out.push({ rule: 'reflow', what: `page scrolls sideways (${document.documentElement.scrollWidth} > ${innerWidth})` });
    for (const v of vis) if (v.scrollWidth > v.clientWidth + 1) out.push({ rule: 'reflow', what: `view ${(v as HTMLElement).dataset.view} scrolls sideways` });
    return out;
  }, o);
}

/** Tab through the first `n` focusable elements; every one must show a focus indicator (2.4.7). */
export async function focusWalk(page: Page, n = 25): Promise<string[]> {
  const bad: string[] = [];
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body || el.closest('iframe, .stage')) return null;
      const cs = getComputedStyle(el);
      const shown = (cs.outlineStyle !== 'none' && Number.parseFloat(cs.outlineWidth) >= 1) || cs.boxShadow !== 'none';
      return shown ? null : `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 30)}"`;
    });
    if (r) bad.push(r);
  }
  return bad;
}

// ---- Instructor v2 (#/teach2): the old view's session bar, tabs and staged footer, reached through v2's own controls
// (retire-instructor-v1 PR 2; lifted from the kit round's dual paths, scripts/showcase/kit-round-a.kitround.ts). ----

/** Instructor v2's route (the only Instructor view; the old `#/teach` resolves to it). */
export const TEACH2 = '#/teach2';

/** The header's speed box: open it and choose ×k (what the session bar's speed buttons sent). */
export async function speedV2(page: Page, k: 1 | 2 | 4 | 8): Promise<void> {
  const head = page.locator('.ip2-head');
  await head.locator('button.ip2-speed').click();
  await head.getByRole('button', { name: `Speed ×${k}`, exact: true }).click();
}

/** The header's clock pill (the session bar's Pause / Resume): data-state "running" or "paused". */
export const pillV2 = (page: Page) => page.locator('.ip2-head button.ip2-pill');

/** Press the clock pill once (pause when running, resume when paused). */
export async function pauseV2(page: Page): Promise<void> {
  await pillV2(page).click();
}

/** STATE's Fast forward box: +2 or +5 min (the session bar's "Fast-forward n min"). */
export async function ffV2(page: Page, min: 2 | 5): Promise<void> {
  await page.locator('.ip2-ff').getByRole('button', { name: `Fast forward by ${min} min`, exact: true }).click();
}

/** A dock sheet, or one of the Patient sheet's two tabs: since brief 208 (the owner's ruling of 12 November) 'vitals' is
 *  the Patient sheet on "Vitals & rhythm" and 'patient' the same sheet on "Patient & events". */
export type SheetId = 'drug' | 'airway' | 'defib' | 'vitals' | 'devices' | 'patient' | 'log';
/** The tab of the Patient sheet a SheetId names. */
const PATIENT_TABS: Partial<Record<SheetId, string>> = { vitals: 'Vitals & rhythm', patient: 'Patient & events' };

/** Open the dock's sheet `id` (today's tab of the same body) if it is not open, on its tab; the open sheet's locator. */
export async function sheet(page: Page, id: SheetId) {
  const sid = id === 'vitals' ? 'patient' : id;
  const tool = page.locator(`.ip2-dock-tools button.ip2-tool[data-sheet=${sid}]`);
  if ((await tool.getAttribute('aria-pressed')) !== 'true') await tool.click();
  const s = page.locator(`.ip2-sheets .ip2-sheet[data-sheet=${sid}]`);
  await s.waitFor();
  const name = PATIENT_TABS[id];
  if (name) {
    const t = s.getByRole('tab', { name, exact: true });
    if ((await t.getAttribute('aria-selected')) !== 'true') await t.click();
    await s.locator('[role=tabpanel]:not([hidden])').filter({ has: page.locator(id === 'vitals' ? '[data-var]' : '[data-event]') }).waitFor();
  }
  return s;
}

/** Close the open sheet (ACTION, today's Scenario tab, is then in view). */
export async function closeSheets(page: Page): Promise<void> {
  for (const b of await page.locator('.ip2-sheets .ip2-sheet:not([hidden]) .ip2-sheet-close').all()) await b.click();
}

/** Deliver the staged cache from the open sheet (the old footer's Commit), with the tray's Onset `onsetS` when given. */
export async function deliver(page: Page, onsetS?: 0 | 30 | 60 | 120 | 300): Promise<void> {
  const open = page.locator('.ip2-sheets .ip2-sheet:not([hidden])');
  if (onsetS !== undefined) await open.locator('.ip2-onset select').selectOption(String(onsetS));
  await open.locator('button.ip2-deliver').click();
}

/** The dock's Debrief link (the session bar's "Debrief"); data-ready "true" once the case has ended. */
export const debriefLinkV2 = (page: Page) => page.locator('.ip2-dock a.ip2-debrief');
