// The mechanism tree page (docs/plans/mechanism-tree.md piece T1; Q12): #/explore/mechanisms is the last entry of
// Explore's nav; the picker lists the six triggers and each draws without a console error; the propofol tree's node
// count is pinned; the page prints on one A4 page in landscape (Chromium's PDF).
import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { createServer, type ViteDevServer } from 'vite';
import { openApp } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
// PME_E2E_PORT: a fixed port for a local run inside an assigned range; 0 (any free port) otherwise, as startVite does
test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: Number(process.env.PME_E2E_PORT ?? 0), host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
test.afterAll(async () => vite?.close());

const SIX = ['trigger.bleed', 'trigger.drug.propofol', 'trigger.drug.phenylephrine', 'trigger.drug.esmolol', 'trigger.lungCondition.ptxTension', 'trigger.ventilation.peep'];
const NODES: Record<string, number> = { 'trigger.bleed': 77, 'trigger.drug.propofol': 72, 'trigger.drug.phenylephrine': 73, 'trigger.drug.esmolol': 74, 'trigger.lungCondition.ptxTension': 91, 'trigger.ventilation.peep': 91 };

test('the mechanism tree draws each of the six triggers without a console error', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('console', (m) => void (m.type() === 'error' && errors.push(m.text())));
  page.on('pageerror', (e) => void errors.push(String(e)));
  await openApp(page, base, '#/explore');
  const nav = page.locator('nav.xnav a').last();
  await expect(nav).toHaveText('Mechanism tree');
  await nav.click();
  await expect(page).toHaveURL(/#\/explore\/mechanisms$/);
  const fig = page.locator('.mt-fig');
  await expect(fig.locator('.mt-n[data-key="loop.baroreflex"]')).toBeVisible();
  await expect(fig.locator('.mt-n')).toHaveCount(72); // propofol, the default
  await expect(page.locator('#mt-trigger option')).toHaveCount(6);
  for (const t of SIX) {
    await page.selectOption('#mt-trigger', t);
    await expect(fig.locator(`.mt-n[data-key="${t}"]`)).toBeVisible();
    await expect(fig.locator('.mt-n')).toHaveCount(NODES[t] as number);
  }
  expect(errors).toEqual([]);
});

test('the propofol tree prints on one A4 page', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'page.pdf is Chromium only');
  await openApp(page, base, '#/explore/mechanisms');
  await expect(page.locator('.mt-fig .mt-n')).toHaveCount(72);
  await page.emulateMedia({ media: 'print' });
  const pdf = (await page.pdf({ preferCSSPageSize: true, printBackground: true })).toString('latin1');
  expect(pdf.match(/\/Type\s*\/Page[^s]/g)?.length).toBe(1);
  expect(pdf).toMatch(/\/MediaBox \[0 0 84\d\.\d+ 59\d\.\d+\]/); // A4 landscape (842 × 595 pt)
});
