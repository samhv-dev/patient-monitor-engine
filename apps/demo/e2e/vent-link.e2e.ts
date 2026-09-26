// Stage V in a browser: the Hamilton ventilator alone (menus, knobs), then linked to the monitor in
// vent-link.html (BroadcastChannel, iframe): breaths reach the monitor, lungState reaches the ventilator,
// disconnection alarms on both sides, and the COPD demonstration lowers MAP.
// Run: PW_SYSTEM_CHROME=1 pnpm exec playwright test apps/demo/e2e/vent-link.e2e.ts
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

const errorsOf = (p: Page) => {
  const errs: string[] = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  return errs;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const last = (p: Page, k: string) => p.evaluate((key) => (window as Any).__link.last[key] as number | undefined, k);
const vent = <T>(p: Page, fn: string) => p.evaluate(`(${fn})(document.getElementById('vent').contentWindow.__vent)`) as Promise<T>;

test('vent-hamilton.html: breathes, Modes → PCV+ → Confirm, a knob turns PEEP', async ({ page }) => {
  const errs = errorsOf(page);
  await page.goto(`${base}/vent-hamilton.html`);
  await page.waitForFunction(() => (window as Any).__vent?.vs.p.breathCount >= 2, null, { timeout: 15_000 });
  await page.click('#modesBtn');
  await page.getByRole('button', { name: 'PCV+', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.locator('#mnMain')).toHaveText('PCV+');
  const peep = page.locator('.dial[data-key="peep"]');
  await peep.hover();
  await page.mouse.wheel(0, -100);
  await page.mouse.wheel(0, -100);
  expect(await page.evaluate(() => (window as Any).__vent.vs.cfg.peep)).toBe(7);
  expect(errs).toEqual([]);
});
