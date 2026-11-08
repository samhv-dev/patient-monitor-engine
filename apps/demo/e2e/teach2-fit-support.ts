// Shared by the three teach2-fit-*.e2e.ts files (split from teach2-fit.e2e.ts so no CI shard is set by one file; the
// titles and assertions are unchanged). Not a test file: testMatch is *.e2e.ts. The helpers measure Instructor v2's fit
// at 1440 × 900 and its monitor pane; the Saadat-like tiles' text is checked for overlap, wrap or leaving its tile (plan
// R9). Screenshots go to TEACH2_SHOTS (default: the test's output folder) for the owner's look.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';
import { app, ffToPhase, openMhV2, pressPath } from './mh-v2-path.ts';

/** Each file's own Vite server, started in its beforeAll (port 0), or PME_KIT_BASE=<url>: a server already running (as
 *  teach2-mh-v2.e2e.ts). Read `.base` inside a test. */
export function serveApp(): { base: string } {
  let vite: ViteDevServer | undefined;
  const s = { base: process.env.PME_KIT_BASE ?? '' };
  test.beforeAll(async () => {
    if (!s.base) ({ vite, base: s.base } = await startVite());
  });
  test.afterAll(async () => vite?.close());
  return s;
}

export type W = { __pmeApp: { link: { send(c: unknown): Promise<{ accepted: boolean }>; ctl: { scenario: { stateId: string | null; doc: { states: Array<{ id: string; transitions?: Array<{ when: Record<string, unknown> }> }> } | null }; hostPaused: boolean } } } };

/** The tiles' text that overlaps another text of its tile, wraps, or lies outside its tile (the Saadat check, compact). */
export function tileFindings(page: Page): Promise<{ texts: number; bad: string[] }> {
  return page.evaluate(() => {
    const g = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
    const bad: string[] = [];
    let texts = 0;
    for (const tile of document.querySelectorAll<HTMLElement>('.stage .pme-stile')) {
      if (tile.offsetParent === null) continue;
      const p = tile.dataset.param ?? '?';
      const tb = tile.getBoundingClientRect();
      // the monitor is scaled as one unit (layout.grid.screenPx): the computed font sizes are layout px, the boxes screen px
      const k = tile.offsetWidth > 0 ? tb.width / tile.offsetWidth : 1;
      const inks: Array<{ t: string; l: number; r: number; top: number; bot: number }> = [];
      const walk = document.createTreeWalker(tile, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const text = n.textContent ?? '';
        const el = n.parentElement as HTMLElement;
        if (!text.trim() || el.closest('svg')) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const rects = [...range.getClientRects()].filter((r) => r.width > 0);
        if (rects.length > 1) bad.push(`${p}: "${text.trim()}" wraps`);
        if (rects.length !== 1) continue;
        texts++;
        const rc = rects[0] as DOMRect;
        g.font = `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize) * k}px ${cs.fontFamily}`;
        const m = g.measureText(text);
        const baseY = rc.top + (rc.height - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
        const ink = { t: text.trim(), l: rc.left - m.actualBoundingBoxLeft, r: rc.left + m.actualBoundingBoxRight, top: baseY - m.actualBoundingBoxAscent, bot: baseY + m.actualBoundingBoxDescent };
        if (ink.l < tb.left - 0.5 || ink.r > tb.right + 0.5 || ink.top < tb.top - 0.5 || ink.bot > tb.bottom + 0.5) bad.push(`${p}: "${ink.t}" outside its tile`);
        for (const o of inks) {
          const dx = Math.min(o.r, ink.r) - Math.max(o.l, ink.l);
          const dy = Math.min(o.bot, ink.bot) - Math.max(o.top, ink.top);
          if (dx > 0.5 && dy > 0.5) bad.push(`${p}: "${o.t}" × "${ink.t}"`);
        }
        inks.push(ink);
      }
    }
    return { texts, bad };
  });
}

/** What the fit is: scroll sizes of the page, the view and ACTION; the open step rows against the card; disabled rows;
 *  the monitor pane. */
export function measure(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as W;
    const sv = w.__pmeApp.link.ctl.scenario;
    const v2 = sv.doc as unknown as { phases?: unknown[]; actions: Array<{ phases: string[] }> } | null;
    const st = v2?.phases ? undefined : sv.doc?.states.find((s) => s.id === sv.stateId);
    const manual = (x: Record<string, unknown>): boolean => 'manual' in x || (['any', 'all'] as const).some((k) => Array.isArray(x[k]) && (x[k] as Array<Record<string, unknown>>).some(manual));
    const view = document.querySelector('.view[data-view="teach2"]') as HTMLElement;
    const action = document.querySelector('.ip2-action') as HTMLElement;
    const rows = [...document.querySelectorAll<HTMLElement>('.ip2-action .ip2-rows:not(.ip2-finished-list) .ip2-row')];
    const stage = (document.querySelector('.stage > .monitor-host') as HTMLElement).getBoundingClientRect();
    const se = document.scrollingElement as HTMLElement;
    const strip = document.querySelector('.ip2-strip') as HTMLElement;
    return {
      strip: [strip.scrollWidth, strip.clientWidth],
      chips: [...strip.querySelectorAll('.ip2-chips > .ip2-chip, .ip2-chips > .ip2-or')].map((c) => c.textContent),
      cut: [...strip.querySelectorAll<HTMLElement>('.ip2-chip-name')].filter((n) => n.scrollWidth > n.clientWidth + 0.5).length,
      state: sv.stateId,
      page: [se.scrollHeight, se.clientHeight],
      view: [view.scrollHeight, view.clientHeight],
      action: [action.scrollHeight, action.clientHeight],
      // a pme-scenario/2 card (F11): its open actions are the actions that name the phase (card-read.ts phaseRowsOf)
      cardSteps: v2?.phases ? v2.actions.filter((a) => a.phases.includes(sv.stateId as string)).length : (st?.transitions ?? []).filter((t) => manual(t.when)).length,
      stepRows: rows.filter((r) => r.dataset.kind === 'step').length,
      rows: rows.map((r) => `${r.querySelector('.ip2-key')?.textContent}:${r.dataset.look}`),
      disabled: [...document.querySelectorAll('.ip2-action .ip2-row')].filter((r) => r.matches('[disabled], [aria-disabled="true"]') && (r as HTMLElement).dataset.look !== 'waiting').length,
      pane: { w: Math.round(stage.width), h: Math.round(stage.height), x: Math.round(stage.x), y: Math.round(stage.y) },
    };
  });
}

export const send = (page: Page, c: unknown) => page.evaluate((x) => (window as unknown as W).__pmeApp.link.send(x), c);

/** The strip's one row against its band (the strip above its status line, or the whole strip without one): the chips'
 *  vertical centre's offset from the band's, the strip's and the band's heights, the main grid's strip row, and whether
 *  a hint, a note or a status line shows. */
export function stripRow(page: Page) {
  return page.evaluate(() => {
    const strip = document.querySelector('.ip2-strip') as HTMLElement;
    const s = strip.getBoundingClientRect();
    const status = strip.querySelector('.ip2-status') as HTMLElement;
    const bottom = status.hidden ? s.bottom - 1 : status.getBoundingClientRect().top; // less the strip's 1-px rule
    const chips = [...strip.querySelectorAll('.ip2-chips > .ip2-chip, .ip2-chips > .ip2-chip-none')].map((c) => c.getBoundingClientRect());
    const top = Math.min(...chips.map((c) => c.top));
    const bot = Math.max(...chips.map((c) => c.bottom));
    const row = getComputedStyle(document.querySelector('.main[data-route="teach2"]') as HTMLElement).gridTemplateRows.split(' ')[1];
    return { chips: chips.length, off: Math.round(((top + bot) / 2 - (s.top + bottom) / 2) * 10) / 10, strip: Math.round(s.height), band: Math.round(bottom - s.top), row, extra: strip.querySelectorAll('.ip2-strip-hint, .ip2-strip-note').length, status: !status.hidden, text: strip.querySelector('.ip2-chips')?.textContent };
  });
}

/** A stage's box: the box, its title, its button and its text lines (each text's client rects) against the box and the
 *  window. */
export function popFit(page: Page) {
  return page.evaluate(() => {
    const pop = document.querySelector('.ip2-pop') as HTMLElement;
    const p = pop.getBoundingClientRect();
    const within = (r: DOMRect, o: DOMRect) => r.left >= o.left - 0.5 && r.right <= o.right + 0.5 && r.top >= o.top - 0.5 && r.bottom <= o.bottom + 0.5;
    const lines = (e: Element) => {
      const range = document.createRange();
      range.selectNodeContents(e);
      return [...range.getClientRects()].filter((r) => r.width > 0);
    };
    const btn = pop.querySelector('button') as HTMLButtonElement;
    const b = btn.getBoundingClientRect();
    const head = pop.querySelector('.ip2-pop-head') as HTMLElement;
    return {
      box: [Math.round(p.left), Math.round(p.top), Math.round(p.width), Math.round(p.height)],
      inWindow: p.left >= 0 && p.right <= innerWidth,
      kidsInside: [...pop.children].every((k) => within(k.getBoundingClientRect(), p)),
      btnInside: within(b, p),
      btnTextInside: lines(btn).every((r) => within(r, b)),
      btnLines: new Set(lines(btn).map((r) => Math.round(r.top))).size,
      headInside: lines(head).every((r) => within(r, p)),
      headLines: new Set(lines(head).map((r) => Math.round(r.top))).size,
      btn: [btn.textContent, btn.getAttribute('aria-label')],
    };
  });
}

// The body of the tests "Instructor v2 fits 1440 × 900 on the /2 MH card at <tag>": teach2-fit-stages and teach2-fit-strip
// each run part of the list with this one body.
// Plan F11 (F6's acceptance on the /2 card): the MH card in pme-scenario/2 (showcase-mh-v2) at 1440 × 900. A /2 phase is
// entered by its own rule, never by goto, so each phase is reached on the demo path's presses (mh-v2-path.ts) and
// fast-forward. On that path since the owner's phase rules of 1 November, with the Treated rule (the dantrolene effect
// rising) and the hold from reachability proposed the same day, and Early signs held 20 s (the owner's ruling of the
// same afternoon; harness times): Latent 06:17, Early signs 08:03 before the call (so it is measured just after the
// call at 08:12), Treated 09:57 after the first dose, Recovering 10:57, Recrudescence 14:59 after ventilation back, the
// second Treated 20:58 after the second dose, the second Recovering 23:53. Every phase lasts at least 60 s, so the fit
// is measured at each: Latent, Early signs, Treated and Recovering (after the dantrolene), Recrudescence (after
// ventilation back), the second Treated and the second Recovering (after the second dose). At each: no scroll (the page,
// the view, ACTION, the strip), every open action of the phase a row of ACTION, no row disabled, no phase name cut.
export async function mhV2Fit(page: Page, base: string, browserName: string, info: TestInfo, target: string, presses: number, tag: string): Promise<void> {
  await openMhV2(page, (h) => openApp(page, base, h, { warmMs: 2000 }));
  await pressPath(page, (i) => i < presses);
  // the phase comes from the physiology: fast-forward in 30-s steps until it is entered (at most 15 sim-min; every phase
  // targeted here lasts at least 60 s on this path, two steps, so a step cannot pass one; ffToPhase says why not ×8)
  expect(await ffToPhase(page, target, 900, 30)).toBe(target);
  await page.waitForTimeout(1500); // the view repaints (≤ 2 Hz)
  const running = await measure(page);
  const dir = process.env.TEACH2_SHOTS ?? info.outputPath();
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: join(dir, `teach2-fit-mh-v2-${tag}-${browserName}-page.png`) });
  await page.locator('.ip2-head button.ip2-pill').click();
  await page.waitForFunction(() => (window as unknown as W).__pmeApp.link.ctl.hostPaused === true, null, { timeout: 10_000 });
  await page.waitForTimeout(1200);
  const paused = await measure(page);
  const report = { browser: browserName, card: 'showcase-mh-v2', target: tag, simT: (await app(page)).simT, running, paused };
  console.log(`teach2-fit ${JSON.stringify(report)}`);
  info.annotations.push({ type: 'teach2-fit', description: JSON.stringify(report) });
  for (const [when, m] of [['running', running], ['paused', paused]] as const) {
    expect.soft(m.state, when).toBe(target);
    expect.soft(m.page[0], `${when}: the page scrolls`).toBeLessThanOrEqual(m.page[1] as number);
    expect.soft(m.view[0], `${when}: the view scrolls`).toBeLessThanOrEqual(m.view[1] as number);
    expect.soft(m.action[0], `${when}: ACTION scrolls`).toBeLessThanOrEqual(m.action[1] as number);
    expect.soft(m.cardSteps, `${when}: the phase has open actions`).toBeGreaterThan(0);
    expect.soft(m.stepRows, `${when}: every open action of the phase is a row`).toBe(m.cardSteps);
    expect.soft(m.disabled, `${when}: a row is disabled`).toBe(0);
    expect.soft(m.strip[0], `${when}: the strip scrolls sideways`).toBeLessThanOrEqual(m.strip[1] as number);
    expect.soft(m.cut, `${when}: a phase name is cut`).toBe(0);
  }
}
