// FU-7 evidence page smoke (plan Task 20 Step 2): the page loads, panel 1 (pure math) draws and panel 2's engine run
// starts without page errors. The full four-panel run and the gate PNGs are scripts/fu7-shots.mjs (Chromium only).
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
test.afterAll(async () => vite?.close());

test('fu7 page: loads, draws the onset panel and starts the engine panels without page errors', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'heavy evidence page: Chromium only');
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 640 });
  await page.goto(`${base}/fu7.html`);
  await page.waitForFunction(() => (window as unknown as { __pme7?: { ready: boolean } }).__pme7?.ready === true);
  await expect(page.locator('#status')).toContainText(/panel|done/, { timeout: 60_000 });
  expect(await page.evaluate(() => (window as unknown as { __pme7: { error: string } }).__pme7.error)).toBe('');
  expect(errors).toEqual([]);
});
