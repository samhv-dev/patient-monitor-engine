// Instructor v2 (E127; plan IP9 step 3; design §2 and §8), the fit at the card stages: at the laptop's 1440 × 900 window,
// at the MH card's second-dose moment (normoventilated), its treatment fan-out (treating) and the haemorrhage card's PEA,
// the view fits without a scroll (the page, the view and the ACTION column), every open step of the stage is a row of
// ACTION, and no row is disabled but a waiting one (rows.ts: a press the runner would refuse now, the MH card's Cool
// below 38.5 °C); the stage strip fits with its folds and cuts no name (IP9 ruling 2). The monitor pane in STATE is
// measured, and the Saadat-like tiles in it are checked for text that overlaps, wraps or leaves its tile (plan R9: they
// have collided at smaller panes before, and no renderer change is allowed). Then the strip's five chips at the cards'
// starts, and the /2 MH card's first course (Latent to Recovering); its second course is in teach2-fit-strip.e2e.ts.
// Split from teach2-fit.e2e.ts (the titles and assertions unchanged; helpers in teach2-fit-support.ts) so that no CI
// shard is set by one ≈ 27-min file; the three files are balanced by their CI times.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { openApp } from './app-support.ts';
import { measure, mhV2Fit, send, serveApp, tileFindings, type W } from './teach2-fit-support.ts';

const srv = serveApp();

for (const [card, target] of [['showcase-mh', 'normoventilated'], ['showcase-mh', 'treating'], ['showcase-haemorrhage', 'pea']] as const) {
  // @known-flaky, class crash (outside our code; brief 118): a first attempt lost its page ("Target page, context or browser
  // has been closed") in 13 of the 99 ci runs of 9 Nov with gating WebKit jobs (4 of the 25 carrying PR #369); one more first attempt was a 30-s phase wait (42645906101). Linux WebKit's web process, as pass 3's crash rows; no Chromium sighting. Local runs were
  // not made: the crash is CI's Linux WebKit and macOS has never reproduced one (pass 3); the quarantine keeps measuring it.
  test(`Instructor v2 fits 1440 × 900 at ${card.replace('showcase-', '')} ${target}: no scroll, every open step a row, no row disabled; the monitor pane measured`, { tag: '@known-flaky' }, async ({ page, browserName }, info) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page, srv.base, `?scenario=${card}#/teach2`, { warmMs: 2000 });
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
    await openApp(page, srv.base, `?scenario=${card}#/teach2`, { warmMs: 1500 });
    await page.waitForFunction((id) => (window as unknown as W).__pmeApp.link.ctl.scenario.stateId === id, target, { timeout: 30_000 });
    await page.waitForTimeout(1200);
    const m = await measure(page);
    console.log(`teach2-strip ${card} ${target} ${JSON.stringify({ strip: m.strip, cut: m.cut, chips: m.chips })}`);
    expect(m.chips.filter((c) => c !== 'or' && !/earlier$|later ›$/.test(c ?? ''))).toHaveLength(5);
    expect(m.strip[0]).toBeLessThanOrEqual(m.strip[1] as number);
    expect(m.cut).toBe(0);
  });
}

// Plan F11 (F6's acceptance on the /2 card), the first course; the path and the phase times are in mhV2Fit
// (teach2-fit-support.ts).
for (const [target, presses, tag] of [['latent', 5, 'latent'], ['earlySigns', 6, 'earlySigns'], ['treated', 7, 'treated'], ['recovering', 7, 'recovering']] as const) {
  test(`Instructor v2 fits 1440 × 900 on the /2 MH card at ${tag}: no scroll, every open action a row, no row disabled`, async ({ page, browserName }, info) => {
    test.setTimeout(360_000);
    await mhV2Fit(page, srv.base, browserName, info, target, presses, tag);
  });
}
