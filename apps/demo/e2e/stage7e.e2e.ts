// Stage 7e page smoke: the MH scenario runs, the endo panel fills from the 1 Hz event, EtCO2/temperature move, the
// dantrolene button is accepted by 7g. ≈ 2.5 min of ×4 simulation: Chromium only (G7g/G7x rule for long e2e runs).
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
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

type Hook = { simT(): number; endo(): { mhActivity: number; glucoseMgDl: number; epinephrinePgMl: number } | null; ready: boolean };
const hook = (page: Page) => page.evaluate(() => {
  const h = (window as unknown as Record<string, Hook>)['__pme7e']!;
  return { t: h.simT(), endo: h.endo() };
});

test('stage7e page: MH crisis → endo panel, MH activity, epinephrine surge; dantrolene accepted', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'long ×4 run (> 2 min): Chromium only (G7g/G7x)');
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 640 });
  await page.goto(`${base}/stage7e.html`);
  await page.waitForFunction(() => (window as unknown as { __pme7e?: Hook }).__pme7e?.ready === true);
  await page.waitForFunction(() => (window as unknown as Record<string, Hook>)['__pme7e']!.simT() >= 60 + 480, undefined, { timeout: 240_000, polling: 1000 });
  const h = await hook(page);
  expect(h.endo!.mhActivity).toBeGreaterThan(0.4);
  expect(h.endo!.epinephrinePgMl).toBeGreaterThan(60);
  await expect(page.locator('.pme-endo')).toContainText('GLU');
  await expect(page.locator('.pme-endo')).toContainText('MH');
  await page.click('#dant');
  await page.waitForTimeout(3000);
  await expect(page.locator('#log')).toContainText('dantrolene');
  expect(errors).toEqual([]);
});
