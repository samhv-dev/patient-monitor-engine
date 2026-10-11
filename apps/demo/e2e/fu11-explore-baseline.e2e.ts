// FU-11 Task H2 (presenter note D5): Explore's baseline is taken at 1 minute of sim time, opened or not.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { simNow(): number; monitor: { trends: { latestS: number } } }; link: { simT: number; send(c: unknown): Promise<{ accepted: boolean }> } } };
const speed = (page: import('@playwright/test').Page, x: string) => page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: x }).click();

test('Explore compares with the 1-minute baseline although it was opened later (D5)', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, base, '#/teach', { warmMs: 500 });
  await speed(page, '×4');
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__pmeApp.session.simNow()), { timeout: 40_000 }).toBeGreaterThan(90);
  await page.evaluate(() => (location.hash = '#/explore'));
  await expect(page.getByText(/Changes are from the baseline at 01:0\d/)).toBeVisible({ timeout: 5_000 });
});

test('a bookmark restore to before the baseline drops it; it is taken again at 1 minute (R50 M14)', async ({ page }) => {
  test.setTimeout(120_000);
  await openApp(page, base, '#/teach', { warmMs: 500 });
  const send = (c: unknown) => page.evaluate((x) => (window as unknown as W).__pmeApp.link.send(x), c);
  const simNow = () => page.evaluate(() => (window as unknown as W).__pmeApp.session.simNow());
  expect((await send({ type: 'scenario', action: 'bookmark', target: 'early' })).accepted).toBe(true);
  await speed(page, '×4');
  await expect.poll(simNow, { timeout: 40_000 }).toBeGreaterThan(75);
  await page.evaluate(() => (location.hash = '#/explore'));
  await expect(page.getByText(/Changes are from the baseline at 01:0\d/)).toBeVisible({ timeout: 5_000 });
  expect((await send({ type: 'scenario', action: 'restoreBookmark', target: 'early' })).accepted).toBe(true);
  await expect(page.getByText(/The baseline is set at 1 minute\./)).toBeVisible({ timeout: 5_000 });
  await expect.poll(simNow, { timeout: 40_000 }).toBeGreaterThan(65);
  await expect(page.getByText(/Changes are from the baseline at 01:0\d/)).toBeVisible({ timeout: 5_000 });
});
