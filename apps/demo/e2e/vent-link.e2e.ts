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

test('vent-link.html: two-way link, disconnection, COPD demonstration', async ({ page }) => {
  test.setTimeout(180_000);
  const errs = errorsOf(page);
  await page.setViewportSize({ width: 1400, height: 820 });
  await page.goto(`${base}/vent-link.html`);
  await page.selectOption('#speed', '4');
  // vent → engine: the monitor counts the ventilator's 14/min
  await expect.poll(() => last(page, 'awrr'), { timeout: 30_000 }).toBe(14);
  // engine → vent: lungState arrived
  expect(await vent<boolean>(page, '(v) => v.core.lung.ref !== null')).toBe(true);
  // disconnection: ventilator alarm, then EtCO2 0 on the monitor
  await page.click('#disc');
  await expect.poll(() => page.frameLocator('#vent').locator('#alarmBanner').textContent(), { timeout: 10_000 }).toContain('Disconnection');
  await expect.poll(() => last(page, 'etco2'), { timeout: 20_000 }).toBe(0);
  await page.click('#disc');
  await expect.poll(() => last(page, 'etco2'), { timeout: 30_000 }).toBeGreaterThan(25);
  // COPD: RR 10 → 20 at 90 s sim; MAP falls
  await page.click('button[data-demo="copd"]');
  await page.selectOption('#speed', '4');
  await page.waitForFunction(() => (window as Any).__link.simT >= 85, null, { timeout: 60_000 });
  const before = (await last(page, 'abpMean')) as number;
  await page.waitForFunction(() => (window as Any).__link.simT >= 200, null, { timeout: 90_000 });
  const after = (await last(page, 'abpMean')) as number;
  expect(await vent<number>(page, '(v) => v.vs.cfg.rate')).toBe(20);
  expect(await vent<number>(page, '(v) => v.vs.p.measured.autoPEEP')).toBeGreaterThan(6);
  expect(before - after).toBeGreaterThan(10);
  expect(errs).toEqual([]);
});
