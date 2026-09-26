// Stage 8a: the blind review page loads a bundle, draws a clip, records two answers and downloads them.
// Run: PW_SYSTEM_CHROME=1 pnpm exec playwright test apps/demo/e2e/validation-review.e2e.ts
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

const sine = (fs: number, f: number, a: number, o: number) => Array.from({ length: 10 * fs }, (_, i) => o + a * Math.sin((2 * Math.PI * f * i) / fs));
const BUNDLE = {
  schema: 'pme-review-bundle/1', session: 'rtest', createdAt: '',
  clips: [
    { id: 'aaaa', channel: 'abp', fs: 125, unit: 'mmHg', range: [0, 150], x: sine(125, 1.2, 20, 95) },
    { id: 'bbbb', channel: 'ecgII', fs: 500, unit: 'mV', range: null, x: sine(500, 1.2, 0.5, 0) },
  ],
};

test('rate two clips and download the answers', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/validation-review.html`);
  await page.fill('#rater', 'Test Rater');
  await page.setInputFiles('#file', { name: 'bundle.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(BUNDLE)) });
  await expect(page.locator('#status')).toContainText('Clip 1 of 2');
  await page.waitForTimeout(600);
  const inked = await page.evaluate(() => {
    const c = document.getElementById('lane') as HTMLCanvasElement;
    const d = (c.getContext('2d') as CanvasRenderingContext2D).getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if ((d[i] as number) + (d[i + 1] as number) + (d[i + 2] as number) > 150) n++;
    return n;
  });
  expect(inked).toBeGreaterThan(50); // the sweep has drawn a trace
  for (const g of ['real', 'synthetic']) {
    await page.click(`button[data-guess=${g}]`);
    await page.click('button[data-r="4"]');
    await page.click('#next');
  }
  await expect(page.locator('#status')).toContainText('Done: 2 clips rated');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#save')]);
  const answers = JSON.parse(readFileSync((await dl.path()) as string, 'utf8'));
  expect(answers).toMatchObject({ schema: 'pme-review-answers/1', session: 'rtest', rater: 'Test Rater' });
  expect(answers.answers.map((a: { guess: string }) => a.guess)).toEqual(['real', 'synthetic']);
  expect(errors).toEqual([]);
});
