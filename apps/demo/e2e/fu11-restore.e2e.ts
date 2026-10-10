// FU-11 Task E4 (external review F03–F05, F09; browser audit BA01–BA05): "Return here" restores the patient AND the
// screen — the session clock, the trends and the waveforms go back with it.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { simNow(): number; monitor: { trends: { latestS: number } } }; link: { simT: number } } };
const speed = (page: import('@playwright/test').Page, x: string) => page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: x }).click();

test('Return here: the clock, the trends and the waveforms go back with the patient (F03–F05, F09)', async ({ page }) => {
  test.setTimeout(120_000);
  await openApp(page, base, '?scenario=showcase-induction', { warmMs: 1500 });
  await speed(page, '×4');
  await page.click('[role=tab][data-tab=scenario]');
  await page.getByRole('button', { name: 'Bookmark', exact: true }).first().click();
  const tMark = await page.evaluate(() => (window as unknown as W).__pmeApp.link.simT);
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__pmeApp.session.simNow()), { timeout: 20_000 }).toBeGreaterThan(tMark + 30);
  await page.getByRole('button', { name: 'Return here' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Return' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__pmeApp.link.simT), { timeout: 5_000 }).toBeLessThan(tMark + 5);
  const clip = { x: 0, y: 160, width: 560, height: 220 };
  const a = await page.screenshot({ clip });
  await page.waitForTimeout(1500);
  const b = await page.screenshot({ clip });
  expect(b.equals(a), 'the waveform keeps sweeping after the restore').toBe(false);
  const r = await page.evaluate(() => ({ t: (window as unknown as W).__pmeApp.session.simNow(), trend: (window as unknown as W).__pmeApp.session.monitor.trends.latestS }));
  expect(r.trend).toBeLessThanOrEqual(Math.floor(r.t) + 1);
});
