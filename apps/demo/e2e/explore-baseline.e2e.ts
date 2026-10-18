// FU-11 Task H2 (presenter note D5): Explore's baseline is taken at 1 minute of sim time, opened or not.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { simNow(): number; monitor: { trends: { latestS: number } } }; link: { simT: number; send(c: unknown): Promise<{ accepted: boolean }> } } };
const speed = (page: import('@playwright/test').Page, x: string) => page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: x }).click();
// fix-ci-webkit-3: Explore's stamp is waited for first (the view drawn with a baseline: CI's WebKit sometimes took over
// 5 s to draw it, "element(s) not found" 3/3), THEN its time is checked. The time window 01:00–01:09 is unchanged; a wrong
// baseline time now fails on the time with the stamp's text in the message instead of looking like a slow draw.
const baselineAt1Min = async (page: import('@playwright/test').Page) => {
  const stamp = page.getByText(/Changes are from the baseline at/);
  await expect(stamp).toBeVisible({ timeout: 20_000 });
  await expect(stamp).toHaveText(/Changes are from the baseline at 01:0\d/);
};

test('Explore compares with the 1-minute baseline although it was opened later (D5)', async ({ page }) => {
  test.setTimeout(120_000);
  await openApp(page, base, '#/teach', { warmMs: 500 });
  await speed(page, '×4');
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__pmeApp.session.simNow()), { timeout: 60_000 }).toBeGreaterThan(90);
  await page.evaluate(() => (location.hash = '#/explore'));
  await baselineAt1Min(page);
});

test('a bookmark restore to before the baseline drops it; it is taken again at 1 minute', async ({ page }) => {
  test.setTimeout(180_000);
  await openApp(page, base, '#/teach', { warmMs: 500 });
  const send = (c: unknown) => page.evaluate((x) => (window as unknown as W).__pmeApp.link.send(x), c);
  const simNow = () => page.evaluate(() => (window as unknown as W).__pmeApp.session.simNow());
  expect((await send({ type: 'scenario', action: 'bookmark', target: 'early' })).accepted).toBe(true);
  await speed(page, '×4');
  await expect.poll(simNow, { timeout: 60_000 }).toBeGreaterThan(75);
  await page.evaluate(() => (location.hash = '#/explore'));
  await baselineAt1Min(page);
  expect((await send({ type: 'scenario', action: 'restoreBookmark', target: 'early' })).accepted).toBe(true);
  await expect(page.getByText(/The baseline is set at 1 minute\./)).toBeVisible({ timeout: 20_000 });
  await expect.poll(simNow, { timeout: 60_000 }).toBeGreaterThan(65);
  await baselineAt1Min(page);
});
