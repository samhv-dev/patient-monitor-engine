// Instructor v2 at 1440 × 900, the /2 haemorrhage card's arrest phases and the panes: no case loaded, Finish the case,
// and the footer line's height given to the strip with the dock flush with the bottom.
// Split from teach2-fit.e2e.ts (the titles and assertions unchanged; helpers in teach2-fit-support.ts) so that no CI
// shard is set by one ≈ 27-min file; the three files are balanced by their CI times.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { openApp } from './app-support.ts';
import { app, ffToPhase, to } from './mh-v2-path.ts';
import { measure, send, serveApp, tileFindings, type W } from './teach2-fit-support.ts';
import { laneTextOverlaps, recordLaneTexts } from './teach2-lane-texts.ts';

const srv = serveApp();

// Plan F9: the haemorrhage card in pme-scenario/2 (showcase-haemorrhage-v2) at 1440 × 900, at its fan-out: the arrest
// phases, where ten actions open at once (announce the diagnosis, call for help, CPR, bag, epinephrine, source control,
// massive transfusion, TXA, rhythm check, resume CPR). The phases come from the physiology: oxygen at 0:30 and the ventilator
// at 1:00 (the run sheet's presses), then fast-forward until Arrest: PEA (the model's pulse loss, ≈ 11:00) and, with no
// CPR, Arrest: asystole (≈ 15:25). At each: no scroll, every open action a row, no row disabled, no phase name cut.
for (const target of ['arrestPea', 'arrestAsystole'] as const) {
  test(`Instructor v2 fits 1440 × 900 on the /2 haemorrhage card at ${target}: no scroll, every open action a row, no row disabled`, async ({ page, browserName }, info) => {
    test.setTimeout(360_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page, srv.base, '?scenario=showcase-haemorrhage-v2#/teach2', { warmMs: 2000 });
    await page.waitForFunction(() => !!(window as unknown as W).__pmeApp.link.ctl.scenario.doc, null, { timeout: 30_000 });
    for (const [t, title] of [[30, 'Oxygen by face mask, FiO₂ 1.0'], [60, 'Intubate and ventilate, FiO₂ 1.0']] as const) {
      await to(page, t);
      const row = page.locator('.ip2-action .ip2-rows:not(.ip2-finished-list) button.ip2-row').filter({ has: page.locator('.ip2-row-title', { hasText: title }) }).first();
      await row.click();
      await expect(row).toHaveAttribute('data-look', 'taken', { timeout: 10_000 });
    }
    // at most 20 sim-min, in 120-s steps: Arrest: PEA lasts 4 min 20 s before asystole (entries 11:00–11:01 and 15:21–15:24,
    // PR #324), two steps and more, so a step cannot pass it; asystole lasts to the end
    expect(await ffToPhase(page, target, 1200, 120)).toBe(target);
    await page.waitForTimeout(1500);
    const running = await measure(page);
    const dir = process.env.TEACH2_SHOTS ?? info.outputPath();
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, `teach2-fit-haemorrhage-v2-${target}-${browserName}-page.png`) });
    const report = { browser: browserName, card: 'showcase-haemorrhage-v2', target, simT: (await app(page)).simT, running };
    console.log(`teach2-fit ${JSON.stringify(report)}`);
    info.annotations.push({ type: 'teach2-fit', description: JSON.stringify(report) });
    expect.soft(running.state).toBe(target);
    expect.soft(running.page[0], 'the page scrolls').toBeLessThanOrEqual(running.page[1] as number);
    expect.soft(running.view[0], 'the view scrolls').toBeLessThanOrEqual(running.view[1] as number);
    expect.soft(running.action[0], 'ACTION scrolls').toBeLessThanOrEqual(running.action[1] as number);
    expect.soft(running.cardSteps, 'the phase has its ten open actions').toBe(10);
    expect.soft(running.stepRows, 'every open action of the phase is a row').toBe(running.cardSteps);
    expect.soft(running.disabled, 'a row is disabled').toBe(0);
    expect.soft(running.strip[0], 'the strip scrolls sideways').toBeLessThanOrEqual(running.strip[1] as number);
    expect.soft(running.cut, 'a phase name is cut').toBe(0);
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
  await openApp(page, srv.base, '#/teach2', { warmMs: 2000 });
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
  await openApp(page, srv.base, '?scenario=showcase-mh#/teach2', { warmMs: 2000 });
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
  await openApp(page, srv.base, '?scenario=showcase-mh#/teach2', { warmMs: 1500 });
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
