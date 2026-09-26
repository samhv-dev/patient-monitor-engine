// Stage 6b in a browser: load the ACLS scenario from the panel's Scenario tab, start VF from the REMOTE's manual
// button, shock from the learner bar, reach ROSC; screenshots and the scenario run log go to docs/gates/stage-6b/.
// Run: PW_SYSTEM_CHROME=1 pnpm exec playwright test apps/demo/e2e/stage6b.e2e.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-6b');

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type W = { __pme6b: Record<string, any> };
async function g<T>(p: Page, fn: (w: W) => T): Promise<T> {
  await p.waitForFunction(() => '__pme6b' in window);
  return p.evaluate(`(${fn.toString()})(window)`) as Promise<T>;
}
/** The bounding box around the given elements (for clipped gate screenshots). */
async function box(p: Page, ...sel: string[]): Promise<{ x: number; y: number; width: number; height: number }> {
  const bs = await Promise.all(sel.map(async (s) => (await p.locator(s).first().boundingBox()) ?? { x: 0, y: 0, width: 0, height: 0 }));
  const x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y));
  const r = Math.max(...bs.map((b) => b.x + b.width)), b = Math.max(...bs.map((q) => q.y + q.height));
  const right = x < 860 ? Math.min(r, 860) : r; // host-side clips stop at the drawer's edge
  return { x, y, width: right - x, height: b - y };
}
const stateId = (p: Page) => g(p, (w) => (w.__pme6b.driver.runner?.stateId ?? null) as string | null);

test('ACLS VF: panel load → remote starts VF → learner shocks → ROSC', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${base}/stage6b-acls.html?session=GATE6B&seed=42`);
  await page.keyboard.press('i');
  await page.locator('[data-tab=scenario]').click();
  await page.locator('select[name=scenario-builtin]').selectOption('acls-vf-witnessed');
  await page.locator('[data-action=scenario-load-builtin]').click();
  await expect(page.locator('.pme-scn-state')).toHaveText('Stable in PACU');
  await expect(page.locator('.pme-scn-next li')).toHaveCount(1);

  const remote = await page.context().newPage();
  await remote.setViewportSize({ width: 390, height: 844 });
  await remote.goto(`${base}/stage6a-remote.html?session=GATE6B&via=bc`);
  const strip = remote.locator('.pme-scn-remote');
  await expect(strip.locator('button')).toHaveText(['Start VF now']);
  await strip.locator('button').click();
  await expect.poll(() => stateId(page), { timeout: 5_000 }).toBe('vf');
  await expect(page.locator('.pme-scn-state')).toHaveText('Coarse VF');
  await expect(strip.locator('button')).toHaveText(['ROSC now']);
  await page.waitForTimeout(7_000); // a sweep of the VF stand-in
  // Gate screenshots are kept ≤ 60 kB each (orchestrator instruction): clipped regions instead of the whole page.
  await page.screenshot({ path: resolve(out, 'scenario-tab.png'), clip: await box(page, '[data-pane=scenario]') });
  await page.screenshot({ path: resolve(out, 'learner-bar.png'), clip: await box(page, '#scenario', '#actions') });
  await remote.screenshot({ path: resolve(out, 'remote-vf.png'), fullPage: true });

  await page.locator('#actions button', { hasText: 'Start CPR' }).click();
  await page.locator('#actions button', { hasText: 'Charge 200 J' }).click(); // Stage 4b: the engine charges (7 s) before it shocks
  await page.waitForTimeout(8_000);
  await page.locator('#actions button', { hasText: 'Shock 200 J' }).click();
  await expect.poll(() => stateId(page), { timeout: 5_000 }).toBe('rosc'); // seed 42: the first draw is 0.062 < 0.3
  await expect(page.locator('.pme-scn-state')).toHaveText('ROSC');
  await page.waitForTimeout(9_000);
  await page.screenshot({ path: resolve(out, 'host-rosc.png'), clip: await box(page, '#monitor', '#scenario') });

  const log = await g(page, (w) => ({ entries: w.__pme6b.driver.runner.log, notes: w.__pme6b.driver.notes, lines: w.__pme6b.scenarioLog }));
  writeFileSync(resolve(out, 'run-log.json'), `${JSON.stringify(log, null, 2)}\n`);
  expect(log.lines.map((l: string) => l.replace(/^[\d.]+ s /, ''))).toEqual(['→ stable', '→ vf (arrest)', '→ rosc (shockVf)']);
  expect(errors).toEqual([]);
});
