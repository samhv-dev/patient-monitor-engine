// FU-11 Task H5: the app's Ventilator view runs VC at the monitor ventilator's flow for its VT and rate (I:E 1:2, no
// pause), and follows a rate change — the cockpit's preset 60 L/min + 0.3 s pause delivered half the volume in severe
// bronchospasm (the parity is unit-tested in packages/ventilator/test/fu11-vc-flow-parity.test.ts).
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type V = { __vent: { vs: { cfg: { vcFlow: number; pause: number; rate: number; vt: number; mode: string } } } };

test('the linked cockpit matches the monitor ventilator\'s flow, and keeps matching a new rate', async ({ page }) => {
  test.setTimeout(60_000);
  await openApp(page, base, '#/vent', { warmMs: 1000 });
  await page.frameLocator('iframe.vent').locator('body').waitFor();
  const cfg = () => page.frames().find((f) => f.url().includes('vent-hamilton'))!.evaluate(() => { const c = (window as unknown as V).__vent.vs.cfg; return { mode: c.mode, vt: c.vt, rate: c.rate, vcFlow: c.vcFlow, pause: c.pause }; });
  await expect.poll(cfg, { timeout: 10_000 }).toEqual({ mode: 'VC', vt: 500, rate: 14, vcFlow: 21, pause: 0 });
  await page.frames().find((f) => f.url().includes('vent-hamilton'))!.evaluate(() => void ((window as unknown as V).__vent.vs.cfg.rate = 12));
  await expect.poll(cfg, { timeout: 5_000 }).toEqual({ mode: 'VC', vt: 500, rate: 12, vcFlow: 18, pause: 0 });
});
