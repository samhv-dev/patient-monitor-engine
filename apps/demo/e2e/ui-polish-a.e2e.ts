// UI-A (the read-only demo UI review of 24 October, row #9): what the projected Instructor view shows the audience.
// #9 — the fast-forward banner sits under the nav and the session bar (it covered both), is not shown on the Debrief,
// and neither it nor a toast prints. Rows #5 and #8 and E128 drove today's Scenario tab and retired with it
// (retire-instructor-v1 PR 2): #5 to teach2-fit-stages.e2e.ts / teach2-fit-panes.e2e.ts / teach2-fit-strip.e2e.ts
// (every open step a row, long titles wrap in the box), #8 to teach2-fit-strip.e2e.ts ("a toast rests on the dock"),
// E128 to teach2-fit-panes.e2e.ts ("Instructor v2 with no case fits 1440 × 900": a Load hands the pane to ACTION).
// #9 stays on today's view for now: on #/teach2 the banner (top: --chrome-bottom + 8 px) covers v2's header.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type Box = { x: number; y: number; width: number; height: number };
const meets = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test('UI-A #9 fast-forward: the banner sits under the nav and the session bar, not on the Debrief, never in print', async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page, base, '?scenario=showcase-mh', { warmMs: 1500 });
  const bar = page.locator('.sessionbar');
  await bar.getByRole('button', { name: 'Bookmark' }).click(); // a toast for the print check
  await bar.getByRole('group', { name: 'Fast-forward' }).getByRole('button', { name: 'Fast-forward 2 min' }).click();
  await expect(page.locator('.ff-veil.on')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.ff-veil.on')).toHaveCount(0, { timeout: 60_000 });
  const banner = page.locator('.ff-banner');
  await expect(banner).toBeVisible();
  const b = (await banner.boundingBox()) as Box;
  const nav = (await page.locator('.topbar').boundingBox()) as Box;
  const sbar = (await bar.boundingBox()) as Box;
  const stage = (await page.locator('.stage').boundingBox()) as Box;
  console.log(`UI-A #9 banner ${JSON.stringify(b)} nav ${JSON.stringify(nav)} sessionbar ${JSON.stringify(sbar)}`);
  expect(meets(b, nav), 'the banner over the nav').toBe(false);
  expect(meets(b, sbar), 'the banner over the session bar').toBe(false);
  expect(meets(b, stage), 'the banner over the monitor stage').toBe(false);
  // E128: under the panel's tab strip; owner's mockup m13: two lines, the alarm line straight under the title
  expect(meets(b, (await page.locator('[role=tablist][aria-label="Instructor controls"]').boundingBox()) as Box), 'the banner over the tab strip').toBe(false);
  const gap = await banner.evaluate((e) => {
    const [a, c] = [...e.children].map((d) => d.getBoundingClientRect());
    return { gap: c!.top - a!.bottom, line: a!.height };
  });
  console.log(`m13 banner lines ${JSON.stringify(gap)}`);
  expect(await banner.locator('> div').count()).toBe(2);
  expect(gap.gap).toBeLessThan(0.25 * gap.line);
  // the nav stays clickable while the banner shows
  await page.locator('nav.rail').getByRole('link', { name: 'Explore physiology' }).click(); // E125: the rail replaced the top bar's tabs
  await expect(page).toHaveURL(/#\/explore/);
  await expect(banner).toBeVisible();
  expect(meets((await banner.boundingBox()) as Box, (await page.locator('.topbar').boundingBox()) as Box)).toBe(false);
  // printed from any view within its 8 s: not on the page
  await page.emulateMedia({ media: 'print' });
  await expect(banner).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await expect(banner).toBeVisible();
  // the Debrief: no banner, on screen or in print
  await page.evaluate(() => (location.hash = '#/teach'));
  await bar.getByRole('link', { name: 'Debrief' }).click();
  await expect(page.locator('[data-view=debrief]').getByRole('heading', { level: 1, name: 'Debrief' })).toBeVisible({ timeout: 15_000 });
  await expect(banner).toBeHidden();
  await page.emulateMedia({ media: 'print' });
  await expect(banner).toBeHidden();
  await expect(page.locator('.toasts')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  // nor a toast printed from another view (print hides them everywhere)
  await page.evaluate(() => (location.hash = '#/teach'));
  await bar.getByRole('button', { name: 'Bookmark' }).click();
  await expect(page.locator('.toasts')).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.toasts')).toBeHidden();
});
