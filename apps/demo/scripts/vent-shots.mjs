// Stage V gate screenshots (docs/gates/stage-V/*.jpg, each ≤ 60 KB): the Hamilton page, the combined page, and
// the R27/R36 demonstrations after their step has acted. Run from the repo root: node apps/demo/scripts/vent-shots.mjs
import { mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, '../../docs/gates/stage-V');
mkdirSync(out, { recursive: true });
const vite = await createServer({ root, configFile: resolve(root, 'vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await vite.listen();
const base = `http://127.0.0.1:${vite.httpServer.address().port}`;
const browser = await chromium.launch({ channel: 'chrome' });
const W = 1200;
const H = 720;
const page = await browser.newPage({ viewport: { width: W, height: H } });
const shot = async (name, clip) => {
  const path = resolve(out, `${name}.jpg`);
  for (const quality of [70, 55, 40, 30, 22]) {
    await page.screenshot({ path, type: 'jpeg', quality, clip });
    if (statSync(path).size <= 60_000) break;
  }
  console.log(name, statSync(path).size, 'bytes');
};
await page.goto(`${base}/vent-hamilton.html`);
await page.waitForTimeout(9000);
await shot('hamilton', { x: 0, y: 0, width: W, height: H });
await page.goto(`${base}/vent-link.html`);
await page.selectOption('#speed', '4');
await page.waitForTimeout(12_000);
await shot('combined', { x: 0, y: 0, width: W, height: H });
// each demonstration: its settle time plus 90 s of sim after the step, at ×4
for (const [id, after] of [['copd', 90], ['ards', 180], ['hf', 120], ['ph', 120], ['tension', 90], ['pe', 90], ['fibrosis', 60]]) {
  await page.click(`button[data-demo="${id}"]`);
  await page.selectOption('#speed', '4');
  const settle = await page.evaluate((d) => window.__link.DEMOS.find((x) => x.id === d).settleS, id);
  await page.waitForFunction((t) => window.__link.simT >= t, settle + after, { timeout: 240_000 });
  await shot(`demo-${id}`, { x: 0, y: 0, width: W, height: H });
}
await browser.close();
await vite.close();
