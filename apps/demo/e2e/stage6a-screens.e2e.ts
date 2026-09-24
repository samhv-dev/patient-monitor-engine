// Gate 6a screenshots: host with the panel open, the remote (phone size) and the viewer, over BroadcastChannel.
// Run: PW_SYSTEM_CHROME=1 pnpm exec playwright test apps/demo/e2e/stage6a-screens.e2e.ts
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-6a');

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type W = { __pme6a: Record<string, any> };
async function g<T>(p: Page, fn: (w: W) => T): Promise<T> {
  await p.waitForFunction(() => '__pme6a' in window);
  return p.evaluate(`(${fn.toString()})(window)`) as Promise<T>;
}

test('panel, remote and viewer screenshots', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${base}/stage6a.html?session=GATE6A`);
  const remote = await page.context().newPage();
  await remote.setViewportSize({ width: 390, height: 844 });
  await remote.goto(`${base}/stage6a-remote.html?session=GATE6A&via=bc`);
  const viewer = await page.context().newPage();
  await viewer.setViewportSize({ width: 1100, height: 520 });
  await viewer.goto(`${base}/stage6a-viewer.html?session=GATE6A&via=bc`);
  await expect.poll(() => g(viewer, (w) => w.__pme6a.sync.status as string), { timeout: 10_000 }).toBe('synced');
  await remote.locator('select[name=rhythm]').selectOption('avb2Mobitz1');
  await remote.locator('[data-action=rhythm]').click();
  await remote.locator('input[name=hr-value]').fill('95');
  await remote.locator('input[name=hr-ramp]').fill('30');
  await remote.locator('[data-var=hr] [data-action=set]').click();
  await page.waitForTimeout(12_000); // two sweeps + HR tile
  await page.keyboard.press('i');
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(out, 'host-panel.png') });
  await remote.screenshot({ path: resolve(out, 'remote.png'), fullPage: true });
  await viewer.screenshot({ path: resolve(out, 'viewer.png') });
  expect(await g(viewer, (w) => w.__pme6a.sync.beatDriftMs as number)).toBe(0);
});
