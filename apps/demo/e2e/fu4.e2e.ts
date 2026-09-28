// FU-4 evidence page smoke (plan Task 23): Ali's scenario (tamponade → propofol 2 mg/kg at 11 min) reaches a pulseless
// state within 16 sim-min and the page logs no errors. ≈ 4 min of ×4 simulation: Chromium only (G7g/G7x rule).
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

type Hook = { start(s: string): void; simT(): number; state(): { pulseless: boolean; rhythm: string; map: number }; ready: boolean };

test("fu4 page: Ali's tamponade + propofol reaches a pulseless state within 16 sim-min, no page errors", async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'long ×4 run: Chromium only');
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 640 });
  await page.goto(`${base}/fu4.html`);
  await page.waitForFunction(() => (window as unknown as { __pmeFu4?: Hook }).__pmeFu4?.ready === true);
  await page.click('#tamponade');
  await page.waitForFunction(() => {
    const h = (window as unknown as Record<string, Hook>)['__pmeFu4']!;
    return h.state().pulseless || h.simT() >= 16 * 60;
  }, undefined, { timeout: 280_000, polling: 1000 });
  const st = await page.evaluate(() => ({ ...(window as unknown as Record<string, Hook>)['__pmeFu4']!.state(), t: (window as unknown as Record<string, Hook>)['__pmeFu4']!.simT() }));
  expect(st.pulseless).toBe(true);
  expect(st.t).toBeLessThanOrEqual(16 * 60);
  await expect(page.locator('#log')).toContainText('PULSELESS');
  expect(errors).toEqual([]);
});
