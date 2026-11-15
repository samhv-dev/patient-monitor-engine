// FU-7 evidence page smoke (plan Task 20 Step 2): the page loads, panel 1 (pure math) draws and panel 2's engine run
// starts without page errors. The full four-panel run and the gate PNGs are scripts/fu7-shots.mjs (Chromium only).
import { expect, test } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';

test.beforeAll(async () => {
  ({ vite, base } = await startVite());
});
test.afterAll(async () => vite?.close());

test('drug-evidence page: loads, draws the onset panel and starts the engine panels without page errors', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'heavy evidence page: Chromium only');
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 640 });
  await page.goto(`${base}/dev/drug-evidence.html`);
  await page.waitForFunction(() => (window as unknown as { __pme7?: { ready: boolean } }).__pme7?.ready === true);
  await expect(page.locator('#status')).toContainText(/panel|done/, { timeout: 60_000 });
  expect(await page.evaluate(() => (window as unknown as { __pme7: { error: string } }).__pme7.error)).toBe('');
  expect(errors).toEqual([]);
});
