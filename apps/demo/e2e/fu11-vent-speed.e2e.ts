// FU-11 Task H1 (presenter note D3): the Ventilator view's cockpit runs at the session's speed after a later change.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { simNow(): number; monitor: { trends: { latestS: number } } }; link: { simT: number } } };
const speed = (page: import('@playwright/test').Page, x: string) => page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: x }).click();

test('the Ventilator view takes a speed change made after it opened (D3)', async ({ page }) => {
  test.setTimeout(60_000);
  await openApp(page, base, '#/vent', { warmMs: 1000 });
  const frame = page.frameLocator('iframe.vent');
  await frame.locator('body').waitFor();
  const scale = () => page.frames().find((fr) => fr.url().includes('vent-hamilton'))?.evaluate(() => (window as unknown as { __vent: { scale: number } }).__vent.scale);
  await expect.poll(scale, { timeout: 10_000 }).toBe(1);
  await page.evaluate(() => (location.hash = '#/teach'));
  await speed(page, '×4');
  await expect.poll(scale, { timeout: 5_000 }).toBe(4);
});
