// Instructor v2 (E127; plan IP9 step 3; design §2 and §8): at the laptop's 1440 × 900 window, at the MH card's second-dose
// moment (normoventilated), its treatment fan-out (treating) and the haemorrhage card's PEA, the view fits without a
// scroll (the page, the view and the ACTION column), every open step of the stage is a row of ACTION, and no row is
// disabled; the stage strip fits with its folds and cuts no name (IP9 ruling 2). The monitor pane in STATE is measured, and the Saadat-like tiles in it are checked for text that overlaps,
// wraps or leaves its tile (plan R9: they have collided at smaller panes before, and no renderer change is allowed); the
// pane's screenshot is written to TEACH2_SHOTS (default: this test's output folder) for the owner's look.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { link: { send(c: unknown): Promise<{ accepted: boolean }>; ctl: { scenario: { stateId: string | null; doc: { states: Array<{ id: string; transitions?: Array<{ when: Record<string, unknown> }> }> } | null }; hostPaused: boolean } } } };

/** The tiles' text that overlaps another text of its tile, wraps, or lies outside its tile (the Saadat check, compact). */
function tileFindings(page: Page): Promise<{ texts: number; bad: string[] }> {
  return page.evaluate(() => {
    const g = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
    const bad: string[] = [];
    let texts = 0;
    for (const tile of document.querySelectorAll<HTMLElement>('.stage .pme-stile')) {
      if (tile.offsetParent === null) continue;
      const p = tile.dataset.param ?? '?';
      const tb = tile.getBoundingClientRect();
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
        g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
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
function measure(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as W;
    const sv = w.__pmeApp.link.ctl.scenario;
    const st = sv.doc?.states.find((s) => s.id === sv.stateId);
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
      cardSteps: (st?.transitions ?? []).filter((t) => manual(t.when)).length,
      stepRows: rows.filter((r) => r.dataset.kind === 'step').length,
      rows: rows.map((r) => `${r.querySelector('.ip2-key')?.textContent}:${r.dataset.look}`),
      disabled: [...document.querySelectorAll('.ip2-action .ip2-row')].filter((r) => r.matches('[disabled], [aria-disabled="true"]')).length,
      pane: { w: Math.round(stage.width), h: Math.round(stage.height), x: Math.round(stage.x), y: Math.round(stage.y) },
    };
  });
}

const send = (page: Page, c: unknown) => page.evaluate((x) => (window as unknown as W).__pmeApp.link.send(x), c);

for (const [card, target] of [['showcase-mh', 'normoventilated'], ['showcase-mh', 'treating'], ['showcase-haemorrhage', 'pea']] as const) {
  test(`Instructor v2 fits 1440 × 900 at ${card.replace('showcase-', '')} ${target}: no scroll, every open step a row, no row disabled; the monitor pane measured`, async ({ page, browserName }, info) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page, base, `?scenario=${card}#/teach2`, { warmMs: 2000 });
    await page.waitForFunction(() => !!(window as unknown as W).__pmeApp.link.ctl.scenario.doc, null, { timeout: 30_000 });
    expect((await send(page, { type: 'scenario', action: 'goto', target })).accepted).toBe(true);
    await page.waitForFunction((id) => (window as unknown as W).__pmeApp.link.ctl.scenario.stateId === id, target, { timeout: 15_000 });
    // the tiles fill (NIBP's first cycle, SpO2 once the pleth has settled after the jump) and the view repaints (≤ 2 Hz)
    await page.waitForTimeout(8000);
    await expect.poll(() => page.evaluate(() => /\d/.test(document.querySelector('.stage .pme-stile[data-param="SpO2"] [data-pme="v"]')?.textContent ?? '')), { timeout: 30_000, intervals: [500] }).toBe(true);
    const running = await measure(page);
    const tiles = await tileFindings(page);
    const dir = process.env.TEACH2_SHOTS ?? info.outputPath();
    mkdirSync(dir, { recursive: true });
    const name = `teach2-fit-${card.replace('showcase-', '')}-${target}-${browserName}`;
    await page.screenshot({ path: join(dir, `${name}-page.png`) });
    await page.locator('.stage > .monitor-host').screenshot({ path: join(dir, `${name}-monitor.png`) });
    // paused: the pill turns amber and the monitor carries PAUSED (option G: no banner); the view still fits
    await page.locator('.ip2-head button.ip2-pill').click();
    await page.waitForFunction(() => (window as unknown as W).__pmeApp.link.ctl.hostPaused === true, null, { timeout: 10_000 });
    await page.waitForTimeout(1200);
    const paused = await measure(page);
    await page.screenshot({ path: join(dir, `${name}-paused.png`) });
    const report = { browser: browserName, card, target, running, paused, tiles };
    console.log(`teach2-fit ${JSON.stringify(report)}`);
    info.annotations.push({ type: 'teach2-fit', description: JSON.stringify(report) });

    for (const [when, m] of [['running', running], ['paused', paused]] as const) {
      expect(m.state, when).toBe(target);
      expect(m.page[0], `${when}: the page scrolls`).toBeLessThanOrEqual(m.page[1] as number);
      expect(m.view[0], `${when}: the view scrolls`).toBeLessThanOrEqual(m.view[1] as number);
      expect(m.action[0], `${when}: ACTION scrolls`).toBeLessThanOrEqual(m.action[1] as number);
      expect(m.stepRows, `${when}: every open step of the stage is a row`).toBe(m.cardSteps);
      expect(m.disabled, `${when}: a row is disabled`).toBe(0);
      // IP9 ruling 2: the strip fits with its folds, and no stage name is cut
      expect(m.strip[0], `${when}: the strip scrolls sideways`).toBeLessThanOrEqual(m.strip[1] as number);
      expect(m.cut, `${when}: a stage name is cut`).toBe(0);
    }
    expect(running.pane.w).toBeGreaterThan(400);
    expect(tiles.texts).toBeGreaterThan(0);
  });
}

// The owner's ruling for IP9: five chips with full names, arrows at each end. The widest windows of the two cards (their
// starts, where the names are longest) fit the strip at 1440 × 900 without a cut or a sideways scroll.
for (const [card, target] of [['showcase-mh', 'awake'], ['showcase-haemorrhage', 'bleeding']] as const) {
  test(`the stage strip at ${card.replace('showcase-', '')} ${target}: five chips with full names fit 1440 × 900`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page, base, `?scenario=${card}#/teach2`, { warmMs: 1500 });
    await page.waitForFunction((id) => (window as unknown as W).__pmeApp.link.ctl.scenario.stateId === id, target, { timeout: 30_000 });
    await page.waitForTimeout(1200);
    const m = await measure(page);
    console.log(`teach2-strip ${card} ${target} ${JSON.stringify({ strip: m.strip, cut: m.cut, chips: m.chips })}`);
    expect(m.chips.filter((c) => c !== 'or' && !/earlier$|later ›$/.test(c ?? ''))).toHaveLength(5);
    expect(m.strip[0]).toBeLessThanOrEqual(m.strip[1] as number);
    expect(m.cut).toBe(0);
  });
}

// The owner's board "Empty 5" (approved 30 October): with no case loaded the view fits 1440 × 900 without a scroll,
// with the strip's dashed chip and the status line, the default patient's cue box and ACTION's three cards; 2 opens the
// case list and 1 loads its first row (the MH card, a demonstration), after which ACTION is the card's steps. The
// page's screenshot is written to TEACH2_SHOTS for the owner's look.
test('Instructor v2 with no case fits 1440 × 900: the three cards, the strip chip, the status line; 2 then 1 loads the MH card', async ({ page, browserName }, info) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, base, '#/teach2', { warmMs: 2000 });
  const cards = page.locator('.ip2-action .ip2-begin-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.locator('.ip2-begin-title')).toHaveText(['Free roam', 'Scenario library', 'Debrief archive']);
  await expect(page.locator('.ip2-strip .ip2-chip-none')).toHaveText('No case loaded · the stages appear here when one is');
  await expect(page.locator('.ip2-strip [role="status"]')).toBeVisible();
  await expect(page.locator('.ip2-cue-name')).toHaveText('Default patient');
  await expect(page.locator('.ip2-title')).toHaveText('No case loaded');
  await expect.poll(() => page.evaluate(() => /\d/.test(document.querySelector('.stage .pme-stile[data-param="SpO2"] [data-pme="v"]')?.textContent ?? '')), { timeout: 30_000, intervals: [500] }).toBe(true);
  await page.waitForTimeout(1200);
  const m = await measure(page);
  const box = (s: string) => page.locator(s).first().evaluate((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; });
  const layout = { strip: await box('.ip2-strip'), status: await box('.ip2-status'), cue: await box('.ip2-cue-box'), action: await box('.ip2-action'), cards: await box('.ip2-begin-cards'), two: await box('.ip2-begin-two'), foot: await box('.ip2-action .ip2-foot') };
  const tiles = await tileFindings(page);
  const dir = process.env.TEACH2_SHOTS ?? info.outputPath();
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: join(dir, `teach2-fit-empty-${browserName}-page.png`) });
  console.log(`teach2-fit-empty ${JSON.stringify({ browser: browserName, page: m.page, view: m.view, action: m.action, pane: m.pane, layout, tiles })}`);
  expect(m.page[0], 'the page scrolls').toBeLessThanOrEqual(m.page[1] as number);
  expect(m.view[0], 'the view scrolls').toBeLessThanOrEqual(m.view[1] as number);
  expect(m.action[0], 'ACTION scrolls').toBeLessThanOrEqual(m.action[1] as number);
  expect(m.pane.w).toBeGreaterThan(400);
  // the cards sit at 80 % of the pane; the two buttons directly under the third card; the foot line under them
  const [, , aw] = layout.action as number[];
  expect(Math.abs((layout.cards[2] as number) - 0.8 * ((aw as number) - 28))).toBeLessThanOrEqual(2);
  expect((layout.two[1] as number)).toBeGreaterThan((layout.cards[1] as number) + (layout.cards[3] as number));
  expect((layout.foot[1] as number)).toBeGreaterThan((layout.two[1] as number) + (layout.two[3] as number));

  await page.locator('body').click({ position: { x: 700, y: 5 } }); // no field has the focus
  await page.keyboard.press('2');
  await expect(page.locator('.ip2-case-list')).toBeVisible();
  await expect(page.locator('.ip2-case-list .ip2-row-title').first()).toHaveText(/^Load /);
  await page.keyboard.press('1');
  await page.waitForFunction(() => (window as unknown as W).__pmeApp.link.ctl.scenario.doc !== null, null, { timeout: 30_000 });
  await expect(page.locator('.ip2-action .ip2-rows:not(.ip2-finished-list) .ip2-row[data-kind="step"]').first()).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.ip2-begin')).toHaveCount(0);
  await expect(page.locator('.ip2-strip [role="status"]')).toBeHidden();
});
