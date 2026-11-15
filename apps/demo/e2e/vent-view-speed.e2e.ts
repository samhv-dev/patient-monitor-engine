// FU-11 Task H1 (presenter note D3): the Ventilator view's cockpit runs at the session's speed after a later change.
import { expect, test } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, speedV2, startVite, TEACH2 } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { simNow(): number; monitor: { trends: { latestS: number } } }; link: { simT: number } } };

test('the Ventilator view takes a speed change made after it opened', async ({ page }) => {
  test.setTimeout(60_000);
  await openApp(page, base, '#/vent', { warmMs: 1000 });
  const frame = page.frameLocator('iframe.vent');
  await frame.locator('body').waitFor();
  // FX-1: undefined until the cockpit's module has set __vent (its <body> comes first), instead of a throw that ends the poll
  const scale = () => page.frames().find((fr) => fr.url().includes('vent-hamilton'))?.evaluate(() => (window as unknown as { __vent?: { scale: number } }).__vent?.scale);
  await expect.poll(scale, { timeout: 10_000 }).toBe(1);
  await page.evaluate(() => (location.hash = '#/teach2'));
  await speedV2(page, 4);
  await expect.poll(scale, { timeout: 5_000 }).toBe(4);
});
