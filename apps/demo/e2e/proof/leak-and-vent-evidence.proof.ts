// The proof: two deliberately failing tests. They never run in a normal suite (playwright.config.ts matches
// `*.e2e.ts` only; PME_E2E_PROOF=1 lets a path name this file). Run them as CI would:
//   CI=1 PME_E2E_PROOF=1 pnpm test:e2e --project=webkit --retries=0 apps/demo/e2e/proof/leak-and-vent-evidence.proof.ts
// 1. A test that passes but leaves a browser context (opened in a helper) and a page open fails at its end, and the
//    message names both lines: "a browser context opened at proof/leak-and-vent-evidence.proof.ts:<helper line> ←
//    proof/leak-and-vent-evidence.proof.ts:<test line> (/vent-hamilton.html?face=edp-ts)".
// 2. The EDP-TS face's Pmax steps of vent-edp-ts.e2e.ts ("High Pressure from the model"), then an assertion that cannot
//    hold: the attempt's evidence/1-vent.json carries `vent` (the ventilator's settings and breath state, from its e2e
//    hook) and `inputs` (the pointer, click and wheel events the page received, with their targets and ages).
import type { ViteDevServer } from 'vite';
import { startVite } from '../app-support.ts';
import { expect, test, type Browser, type Page } from '../evidence.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

const face = async (browser: Browser): Promise<Page> => {
  const p = await (await browser.newContext()).newPage();
  await p.goto(`${base}/vent-hamilton.html?face=edp-ts`);
  return p;
};

test('fails on purpose: a context and a page left open', async ({ browser }) => {
  await face(browser);
  const lone = await browser.newPage();
  await lone.goto(`${base}/vent-hamilton.html?face=edp-ts`);
});

test('fails on purpose: the face held at a wrong Pmax read', async ({ page }) => {
  await page.goto(`${base}/vent-hamilton.html?face=edp-ts`);
  await expect(page.locator('main.edp')).toBeVisible({ timeout: 20_000 });
  const cfg = () => page.evaluate(() => (window as unknown as { __vent: { vs: { cfg: { pmax: number } } } }).__vent.vs.cfg.pmax);
  await page.locator('[data-ctl="tag:pmax"]').click();
  for (let i = 0; i < 5; i++) await page.locator('.edp-knob').dispatchEvent('wheel', { deltaY: 100 });
  expect(await cfg(), 'on purpose: the knob was never pressed').toBe((await cfg()) - 5);
});
