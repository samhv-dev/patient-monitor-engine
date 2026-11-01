// Instructor v2 (E127; plan IP9 step 3; design §2 and §8): at the laptop's 1440 × 900 window, at the MH card's second-dose
// moment (normoventilated), its treatment fan-out (treating) and the haemorrhage card's PEA, the view fits without a
// scroll (the page, the view and the ACTION column), every open step of the stage is a row of ACTION, and no row is
// disabled but a waiting one (rows.ts: a press the runner would refuse now, the MH card's Cool below 38.5 °C); the stage strip fits with its folds and cuts no name (IP9 ruling 2). The monitor pane in STATE is measured, and the Saadat-like tiles in it are checked for text that overlaps,
// wraps or leaves its tile (plan R9: they have collided at smaller panes before, and no renderer change is allowed); the
// pane's screenshot is written to TEACH2_SHOTS (default: this test's output folder) for the owner's look.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';
import { app, openMhV2, pressPath, to } from './mh-v2-path.ts';
import { laneTextOverlaps, recordLaneTexts } from './teach2-lane-texts.ts';

let vite: ViteDevServer | undefined;
let base = process.env.PME_KIT_BASE ?? ''; // PME_KIT_BASE=<url>: a server already running (as teach2-mh-v2.e2e.ts)
test.beforeAll(async () => {
  if (!base) ({ vite, base } = await startVite());
});
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

// Plan F11 (F6's acceptance on the /2 card): the MH card in pme-scenario/2 (showcase-mh-v2) at 1440 × 900. A /2 phase is
// entered by its own rule, never by goto, so each phase is reached on the demo path's presses (mh-v2-path.ts) and
// fast-forward. On that path since the owner's phase rules of 1 November (harness times): Latent 06:17, Early signs
// 08:43 after the call, Treated 10:58 and Recovering 0.4 s later, Recrudescence 14:59 and the second Treated 0.4 s
// later, the second Recovering 23:53. The two one-poll phases cannot be held on this path, so the fit is measured at
// every phase that can: Latent, Early signs, Recovering (after the dantrolene), the second Treated (after ventilation
// back) and the second Recovering (after the second dose). At each: no scroll (the page, the view, ACTION, the strip),
// every open action of the phase a row of ACTION, no row disabled, no phase name cut.
for (const [target, presses, tag] of [['latent', 5, 'latent'], ['earlySigns', 6, 'earlySigns'], ['recovering', 7, 'recovering'], ['treated', 8, 'treated-2'], ['recovering', 9, 'recovering-2']] as const) {
  test(`Instructor v2 fits 1440 × 900 on the /2 MH card at ${tag}: no scroll, every open action a row, no row disabled`, async ({ page, browserName }, info) => {
    test.setTimeout(360_000);
    await openMhV2(page, (h) => openApp(page, base, h, { warmMs: 2000 }));
    await pressPath(page, (i) => i < presses);
    // the phase comes from the physiology: fast-forward in 30 s steps until it is entered (at most 15 sim-min; every phase
    // targeted here lasts over 2 min on this path, so a step cannot pass one; 10 s steps ran the second Recovering, 4:40
    // after the second dose, out of the test's time)
    for (let n = 0; (await app(page)).stateId !== target && n < 30; n++) await to(page, Math.floor((await app(page)).simT) + 30);
    expect((await app(page)).stateId).toBe(target);
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
  });
}

// The owner's board "Empty 5" (approved 30 October): with no case loaded the view fits 1440 × 900 without a scroll,
// with the strip's one dashed chip (the owner, 1 November: one row, no status line), the default patient's cue box and
// ACTION's three cards; 2 opens the
// case list and 1 loads its first row (the MH card, a demonstration), after which ACTION is the card's steps. The
// page's screenshot is written to TEACH2_SHOTS for the owner's look. The owner's ruling on the monitor's height: while
// the cards show there is nothing to skip to, so the Fast forward row is hidden and the learners' monitor gets its
// height back; Free roam brings the row back. The monitor's canvas texts (wave labels, scale values, sweep speeds) are
// recorded where they are drawn (teach2-lane-texts.ts: the renderer on the main thread) and the pairs whose ink touches
// are reported.
test('Instructor v2 with no case fits 1440 × 900: the three cards, the strip\'s one chip; 2 then 1 loads the MH card', async ({ page, browserName }, info) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await recordLaneTexts(page);
  await openApp(page, base, '#/teach2', { warmMs: 2000 });
  await expect(page.locator('.ip2-ff')).toBeHidden();
  const cards = page.locator('.ip2-action .ip2-begin-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.locator('.ip2-begin-title')).toHaveText(['Free roam', 'Scenario library', 'Debrief archive']);
  await expect(page.locator('.ip2-strip .ip2-chip-none')).toHaveText('No case loaded · the stages appear here when one is');
  await expect(page.locator('.ip2-strip [role="status"]')).toBeHidden();
  await expect(page.locator('.ip2-cue-name')).toHaveText('Default patient');
  await expect(page.locator('.ip2-title')).toHaveText('No case loaded');
  await expect.poll(() => page.evaluate(() => /\d/.test(document.querySelector('.stage .pme-stile[data-param="SpO2"] [data-pme="v"]')?.textContent ?? '')), { timeout: 30_000, intervals: [500] }).toBe(true);
  await page.waitForTimeout(1200);
  const m = await measure(page);
  const box = (s: string) => page.locator(s).first().evaluate((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; });
  const layout = { strip: await box('.ip2-strip'), status: await box('.ip2-status'), cue: await box('.ip2-cue-box'), action: await box('.ip2-action'), cards: await box('.ip2-begin-cards'), two: await box('.ip2-begin-two'), foot: await box('.ip2-action .ip2-foot') };
  const tiles = await tileFindings(page);
  const labels = await laneTextOverlaps(page);
  const dir = process.env.TEACH2_SHOTS ?? info.outputPath();
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: join(dir, `teach2-fit-empty-${browserName}-page.png`) });
  // Free roam brings the Fast forward row back, and the monitor gives up that height again
  await page.locator('body').click({ position: { x: 700, y: 5 } }); // no field has the focus
  await page.keyboard.press('1');
  await expect(page.locator('.ip2-ff')).toBeVisible();
  await page.waitForTimeout(2500);
  const free = await measure(page);
  const freeLabels = await laneTextOverlaps(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('.ip2-ff')).toBeHidden();
  const report = { browser: browserName, page: m.page, view: m.view, action: m.action, pane: m.pane, layout, tiles, labels: labels.touching, freePane: free.pane, freeLabels: freeLabels.touching };
  console.log(`teach2-fit-empty ${JSON.stringify(report)}`);
  info.annotations.push({ type: 'teach2-fit-empty', description: JSON.stringify(report) });
  expect(labels.texts.length, 'the monitor\'s lane texts were recorded').toBeGreaterThan(5);
  expect(tiles.bad, 'a tile\'s text overlaps, wraps or leaves its tile').toEqual([]);
  expect(m.pane.h - free.pane.h, 'hiding Fast forward gives the monitor its height back').toBeGreaterThanOrEqual(50);
  expect(m.page[0], 'the page scrolls').toBeLessThanOrEqual(m.page[1] as number);
  expect(m.view[0], 'the view scrolls').toBeLessThanOrEqual(m.view[1] as number);
  expect(m.action[0], 'ACTION scrolls').toBeLessThanOrEqual(m.action[1] as number);
  expect(m.pane.w).toBeGreaterThan(400);
  // the strip is its own 75 px, one row (no status line under it): STATE starts right under it
  expect(layout.strip[3], 'the empty strip\'s height').toBe(75);
  // the cards sit at 80 % of the pane; the two buttons directly under the third card; the foot line under them
  const [, , aw] = layout.action as number[];
  expect(Math.abs((layout.cards[2] as number) - 0.8 * ((aw as number) - 28))).toBeLessThanOrEqual(2);
  expect((layout.two[1] as number)).toBeGreaterThan((layout.cards[1] as number) + (layout.cards[3] as number));
  expect((layout.foot[1] as number)).toBeGreaterThan((layout.two[1] as number) + (layout.two[3] as number));

  await page.keyboard.press('2');
  await expect(page.locator('.ip2-case-list')).toBeVisible();
  await expect(page.locator('.ip2-case-list .ip2-row-title').first()).toHaveText(/^Load /);
  await page.keyboard.press('1');
  await page.waitForFunction(() => (window as unknown as W).__pmeApp.link.ctl.scenario.doc !== null, null, { timeout: 30_000 });
  await expect(page.locator('.ip2-action .ip2-rows:not(.ip2-finished-list) .ip2-row[data-kind="step"]').first()).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.ip2-begin')).toHaveCount(0);
  // the MH card has a Case briefing (#211), which holds the status line for its first minute; once it ends, a loaded
  // case has no status line
  const status = page.locator('.ip2-strip [role="status"]');
  await expect(page.locator('.ip2-strip[data-briefing]')).toHaveCount(1);
  await status.getByRole('button', { name: 'End briefing' }).click();
  await expect(page.locator('.ip2-strip[data-briefing]')).toHaveCount(0);
  await expect(status).toBeHidden();
  await expect(page.locator('.ip2-ff')).toBeVisible();
});

// The owner's board "Finish 2" (approved 30 October): "Finish the case" in the dock pauses the clock, the strip's status
// line says so, and ACTION becomes the Finish pane (the Resident field, the objective and mark counts, three buttons,
// the archive under them). At 1440 × 900 the view still fits without a scroll; the pane's screenshot is written to
// TEACH2_SHOTS for the owner's look. Esc gives the case back, running, with nothing written.
test('Finish the case at the MH card\'s Recovering: the clock stops, the Finish pane fits 1440 × 900; Esc gives it back', async ({ page, browserName }, info) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, base, '?scenario=showcase-mh#/teach2', { warmMs: 2000 });
  await page.waitForFunction(() => !!(window as unknown as W).__pmeApp.link.ctl.scenario.doc, null, { timeout: 30_000 });
  expect((await send(page, { type: 'scenario', action: 'goto', target: 'recovering' })).accepted).toBe(true);
  await page.waitForFunction(() => (window as unknown as W).__pmeApp.link.ctl.scenario.stateId === 'recovering', null, { timeout: 15_000 });
  // two earlier runs in the archive (the board's rows), and marks on this one
  await page.evaluate(() => {
    const a = (window as unknown as { __pmeApp: { archive: { save(d: unknown, who: string, b: string, at?: number): unknown }; session: { record: { data: { startedAt: number } } } } }).__pmeApp;
    const d = a.session.record.data;
    a.archive.save({ ...d, startedAt: d.startedAt - 7_200_000 }, 'Dr Saberi', 'e2e', Date.now() - 7_000_000);
    a.archive.save({ ...d, startedAt: d.startedAt - 3_600_000 }, 'Dr Karimi', 'e2e', Date.now() - 3_500_000);
  });
  for (const kind of ['good', 'good', 'bad', 'discuss']) await page.locator(`.ip2-dock .ip2-mark[data-kind="${kind}"]`).click();
  await page.waitForTimeout(4500); // the marks' toasts are gone before the screenshot
  await page.locator('.ip2-dock .ip2-finish-btn').click();
  await page.waitForFunction(() => (window as unknown as W).__pmeApp.link.ctl.hostPaused === true, null, { timeout: 10_000 });
  await expect(page.locator('.ip2-finish')).toBeVisible();
  await expect(page.locator('.ip2-pill-word')).toHaveText('PAUSED');
  await expect(page.locator('.ip2-finishing .ip2-status-text')).toHaveText(/^The clock is stopped at \d\d:\d\d while you decide\. Nothing is written until you press a button on the right\.$/);
  await expect(page.locator('.ip2-finish-marks')).toHaveText(/2 good · 1 bad · 1 discuss/);
  await page.locator('.ip2-finish-resident').fill('Dr Rahimi');
  await page.waitForTimeout(1200);
  const m = await measure(page);
  const box = (s: string) => page.locator(s).first().evaluate((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; });
  const layout = { strip: await box('.ip2-strip'), status: await box('.ip2-finishing'), action: await box('.ip2-action'), pane: await box('.ip2-finish'), archive: await box('.ip2-finish-archive'), dock: await box('.ip2-dock') };
  const dir = process.env.TEACH2_SHOTS ?? info.outputPath();
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: join(dir, `teach2-finish-${browserName}-page.png`) });
  const report = { browser: browserName, page: m.page, view: m.view, action: m.action, pane: m.pane, layout };
  console.log(`teach2-finish ${JSON.stringify(report)}`);
  info.annotations.push({ type: 'teach2-finish', description: JSON.stringify(report) });
  expect(m.page[0], 'the page scrolls').toBeLessThanOrEqual(m.page[1] as number);
  expect(m.view[0], 'the view scrolls').toBeLessThanOrEqual(m.view[1] as number);
  expect(m.action[0], 'ACTION scrolls').toBeLessThanOrEqual(m.action[1] as number);
  await expect(page.locator('.ip2-finish-archive .ip2-arc-row')).toHaveCount(2);
  // Esc: running again, the rows back, nothing written
  await page.locator('body').click({ position: { x: 700, y: 5 } });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => (window as unknown as W).__pmeApp.link.ctl.hostPaused === false, null, { timeout: 10_000 });
  await expect(page.locator('.ip2-finish')).toBeHidden();
  await expect(page.locator('.ip2-action .ip2-rows:not(.ip2-finished-list) .ip2-row').first()).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __pmeApp: { archive: { list(): unknown[] } } }).__pmeApp.archive.list().length)).toBe(2);
});
// The owner, 30 October: no education line under the working views, so the dock ends at the window's bottom edge; the
// line's height (23 px: 3 + 3 px padding, a 16-px line, the 1-px rule; 23.19 measured on main at 1440 × 900) goes to the
// stage strip, 52 → 75 px, and its chips grow with it (not a taller empty bar).
const FOOTER_H = 23;
test('Instructor v2 at 1440 × 900: no footer line, the dock flush with the bottom, the stage strip taller by the line', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, base, '?scenario=showcase-mh#/teach2', { warmMs: 1500 });
  await page.waitForFunction(() => !!document.querySelector('.ip2-strip .ip2-current'), null, { timeout: 30_000 });
  // a status line under the chips (#211's Case briefing, #214's finishing) adds its 40 px to the strip's
  // 75: the MH card opens with its briefing where #211 is in the tree; ended, the strip is its own height again
  const status = page.locator('.ip2-strip [role="status"]');
  if (await status.isVisible()) {
    const withLine = await page.evaluate(() => ({ vh: innerHeight, strip: (document.querySelector('.ip2-strip') as HTMLElement).getBoundingClientRect().height, dock: (document.querySelector('.ip2-dock') as HTMLElement).getBoundingClientRect().bottom }));
    console.log(`teach2-flush with the status line ${JSON.stringify(withLine)}`);
    expect(withLine.strip).toBe(52 + FOOTER_H + 40);
    expect(withLine.dock).toBe(withLine.vh);
    await status.getByRole('button', { name: 'End briefing' }).click();
    await expect(status).toBeHidden();
  }
  const m = await page.evaluate(() => {
    const box = (s: string) => (document.querySelector(s) as HTMLElement).getBoundingClientRect();
    return { vh: innerHeight, foot: document.querySelectorAll('.app-foot').length, dock: box('.ip2-dock'), strip: box('.ip2-strip'), head: box('.ip2-head'), chip: box('.ip2-strip .ip2-current') };
  });
  console.log(`teach2-flush ${JSON.stringify({ vh: m.vh, dock: [m.dock.top, m.dock.bottom], strip: [m.strip.top, m.strip.height], chip: m.chip.height })}`);
  expect(m.foot).toBe(0);
  expect(m.dock.bottom).toBe(m.vh);
  expect(m.dock.height).toBe(64);
  expect(m.head.height).toBe(48);
  expect(m.strip.height).toBe(52 + FOOTER_H);
  expect(m.chip.height, 'the chips grow with the row').toBeGreaterThan(30);
});

/** The strip's one row against its band (the strip above its status line, or the whole strip without one): the chips'
 *  vertical centre's offset from the band's, the strip's and the band's heights, the main grid's strip row, and whether
 *  a hint, a note or a status line shows. */
function stripRow(page: Page) {
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

// The owner, 1 November: no hint line under the chips ("past: return to its start · future: jump to it"; the stage's box
// says what a press does), and the chips' row centred in the strip in every state: no case loaded (one row, the chip
// alone: no note, no status line), a case, its Case briefing and Finish the case (the status line under the row). At the
// laptop's 1440 × 900 and the projector's 1920 × 1080; at 1440 the no-case and case strips are written to TEACH2_SHOTS.
for (const [w, hgt] of [[1440, 900], [1920, 1080]] as const) {
  test(`the strip's one row is centred at ${w} × ${hgt}: no case, a case, its briefing, finishing; no hint line`, async ({ page, browserName }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: w, height: hgt });
    await openApp(page, base, '#/teach2', { warmMs: 1500 });
    await expect(page.locator('.ip2-strip .ip2-chip-none')).toHaveText('No case loaded · the stages appear here when one is');
    const dir = process.env.TEACH2_SHOTS ?? info.outputPath();
    mkdirSync(dir, { recursive: true });
    const shot = (name: string) => (w === 1440 ? page.screenshot({ path: join(dir, `teach2-strip-${name}-${w}x${hgt}-${browserName}.png`) }) : null);
    const empty = await stripRow(page);
    await shot('empty');
    // 2 then 1: the MH card, whose Case briefing holds the status line for its first minute
    await page.locator('body').click({ position: { x: 700, y: 5 } }); // no field has the focus
    await page.keyboard.press('2');
    await page.keyboard.press('1');
    await page.waitForFunction(() => (window as unknown as W).__pmeApp.link.ctl.scenario.doc !== null, null, { timeout: 30_000 });
    await expect(page.locator('.ip2-strip[data-briefing]')).toHaveCount(1);
    await expect(page.locator('.ip2-strip .ip2-current')).toBeVisible();
    const briefing = await stripRow(page);
    await page.locator('.ip2-strip [role="status"]').getByRole('button', { name: 'End briefing' }).click();
    await expect(page.locator('.ip2-strip [role="status"]')).toBeHidden();
    const loaded = await stripRow(page);
    await shot('case');
    await page.locator('.ip2-dock .ip2-finish-btn').click();
    await expect(page.locator('.ip2-strip[data-finishing]')).toHaveCount(1);
    const finishing = await stripRow(page);
    await page.locator('body').click({ position: { x: 700, y: 5 } });
    await page.keyboard.press('Escape');
    await expect(page.locator('.ip2-strip[data-finishing]')).toHaveCount(0);
    const rows = { empty, loaded, briefing, finishing };
    console.log(`teach2-strip-row ${w}x${hgt} ${JSON.stringify(rows)}`);
    for (const [when, r] of Object.entries(rows)) {
      expect(r.chips, `${when}: the chips`).toBeGreaterThan(0);
      expect(r.extra, `${when}: a hint or note line`).toBe(0);
      expect(Math.abs(r.off), `${when}: the chips' row is off the band's centre by ${r.off} px`).toBeLessThanOrEqual(1);
      expect(r.row, `${when}: the main grid's strip row is the strip`).toBe(`${r.strip}px`);
      expect(r.text ?? '', `${when}: the hint`).not.toMatch(/return to its start|jump to it/i);
    }
    for (const r of [empty, loaded]) expect([r.strip, r.status]).toEqual([75, false]);
    for (const r of [briefing, finishing]) expect([r.strip, r.band, r.status]).toEqual([115, 74, true]);
  });
}

/** A stage's box: the box, its title, its button and its text lines (each text's client rects) against the box and the
 *  window. */
function popFit(page: Page) {
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

// The owner, 1 November (his screenshot 22.48.47): the stage's box showed "Jump to Midazolam 2 mg and fentanyl 100 µg
// given", whose text wrapped out of the 32-px button and out of the box. The button no longer repeats the stage ("Jump to
// it", "Return to its start"; the accessible name carries it), the box is as wide as its content, and a long title wraps
// inside it. At 1440 × 900, the MH card's longest stage name, as a future stage and as a past one; the box's
// screenshot is written to TEACH2_SHOTS.
test('a stage\'s box at 1440 × 900: the long title wraps inside, "Jump to it" and "Return to its start" stay inside the box', async ({ page, browserName }, info) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, base, '?scenario=showcase-mh#/teach2', { warmMs: 1500 });
  await page.waitForFunction(() => (window as unknown as W).__pmeApp.link.ctl.scenario.stateId === 'awake', null, { timeout: 30_000 });
  const NAME = 'Midazolam 2 mg and fentanyl 100 µg given';
  const dir = process.env.TEACH2_SHOTS ?? info.outputPath();
  mkdirSync(dir, { recursive: true });
  // a future stage
  const future = page.locator('.ip2-strip button.ip2-future', { hasText: NAME });
  await future.click();
  await expect(page.locator('.ip2-pop .ip2-pop-head')).toHaveText(NAME);
  await expect(page.locator('.ip2-pop').getByRole('button', { name: `Jump to ${NAME}` })).toHaveText('Jump to it');
  const fut = await popFit(page);
  await page.screenshot({ path: join(dir, `teach2-strip-pop-future-1440x900-${browserName}.png`), clip: { x: 0, y: 0, width: 1440, height: 400 } });
  await future.click(); // a second press closes it
  await expect(page.locator('.ip2-pop')).toHaveCount(0);
  // a past stage with its entry: through Premedicated to Preoxygenating
  for (const target of ['premedicated', 'preoxygenated']) {
    expect((await send(page, { type: 'scenario', action: 'goto', target })).accepted).toBe(true);
    await page.waitForFunction((id) => (window as unknown as W).__pmeApp.link.ctl.scenario.stateId === id, target, { timeout: 15_000 });
  }
  const past = page.locator('.ip2-strip button.ip2-past', { hasText: NAME });
  await expect(past).not.toHaveClass(/ip2-skipped/);
  await past.click();
  await expect(page.locator('.ip2-pop').getByRole('button', { name: `Return to the start of ${NAME}` })).toHaveText('Return to its start');
  const back = await popFit(page);
  await page.screenshot({ path: join(dir, `teach2-strip-pop-past-1440x900-${browserName}.png`), clip: { x: 0, y: 0, width: 1440, height: 400 } });
  console.log(`teach2-strip-pop ${JSON.stringify({ future: fut, past: back })}`);
  for (const [when, f] of [['future', fut], ['past', back]] as const) {
    expect(f.inWindow, `${when}: the box leaves the window`).toBe(true);
    expect(f.kidsInside, `${when}: a part of the box lies outside it`).toBe(true);
    expect(f.btnInside, `${when}: the button lies outside the box`).toBe(true);
    expect(f.btnTextInside, `${when}: the button's text spills out of the button`).toBe(true);
    expect(f.btnLines, `${when}: the button's text wraps`).toBe(1);
    expect(f.headInside, `${when}: the title spills out of the box`).toBe(true);
    expect(f.box[2] as number, `${when}: the box's width`).toBeLessThanOrEqual(320);
  }
});

// A toast rests on the dock (8 px above its top edge), not 40 px over it, at the laptop's and the projector's window,
// whatever sits under the dock; one raised by a jump, the way the strip raises it.
for (const [w, hgt] of [[1440, 900], [1920, 1080]] as const) {
  test(`a toast rests on the dock at ${w} × ${hgt}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: w, height: hgt });
    await openApp(page, base, '?scenario=showcase-mh#/teach2', { warmMs: 1500 });
    await page.waitForFunction(() => !!(window as unknown as W).__pmeApp.link.ctl.scenario.doc, null, { timeout: 30_000 });
    await page.evaluate(() => document.body.appendChild(Object.assign(document.createElement('div'), { className: 'toasts' })).append(Object.assign(document.createElement('div'), { className: 'toast', textContent: 'Speed ×4' })));
    const m = await page.evaluate(() => {
      const t = (document.querySelector('.toasts > .toast') as HTMLElement).getBoundingClientRect();
      const d = (document.querySelector('.ip2-dock') as HTMLElement).getBoundingClientRect();
      return { gap: Math.round(d.top - t.bottom), dockTop: Math.round(d.top), toastBottom: Math.round(t.bottom) };
    });
    console.log(`teach2-toast ${w}x${hgt} ${JSON.stringify(m)}`);
    expect(m.gap, 'the toast floats over the dock or overlaps it').toBe(8);
  });
}
