// Stage 8a: the bedside checklist page lists every item, plays the asystole demo on the saadat-like skin and
// measures the alarm delay (gate 4b: 10 s), then downloads a results file bedside:apply accepts.
// Run: PW_SYSTEM_CHROME=1 pnpm exec playwright test apps/demo/e2e/validation-bedside.e2e.ts
import { readFileSync } from 'node:fs';
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

test('asystole demo measures the saadat-like delay; results download', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${base}/validation-bedside.html`);
  await expect(page.locator('.item')).toHaveCount(10);
  const item = page.locator('[data-item="asystole-delay"]');
  await page.waitForTimeout(2000); // the start snapshot is taken 1.5 s after load
  await item.locator('.run').click();
  await expect(item.locator('.measured')).toHaveValue(/ASYSTOLE after \d+\.\d s/, { timeout: 40_000 });
  const s = Number(/after (\d+\.\d)/.exec(await item.locator('.measured').inputValue())?.[1]);
  expect(s).toBeGreaterThanOrEqual(9);
  expect(s).toBeLessThanOrEqual(12);
  await item.locator('.observed').fill('5 s');
  await item.locator('.verdict').selectOption('wrong');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#save')]);
  const r = JSON.parse(readFileSync((await dl.path()) as string, 'utf8'));
  expect(r.schema).toBe('pme-bedside-results/1');
  expect(r.results.find((x: { id: string }) => x.id === 'asystole-delay')).toMatchObject({ verdict: 'wrong', observed: '5 s' });
  expect(errors).toEqual([]);
});
