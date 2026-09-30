// FU-6 page: a CI smoke (the bronchospasm demo runs, EtCO2 shows, no page errors) and, with PME_SHOTS=1, the gate
// screenshots into docs/gates/fu-6/ (Chromium only: the heavy evidence rule).
import { mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/fu-6');
type Hook = { demo(n: string): Promise<void>; simT(): number; timeScale(k: number): void; ready: boolean };
const demo = (page: Page, name: string) => page.evaluate((n) => (window as unknown as { __pme6: Hook }).__pme6.demo(n), name);
const waitSim = (page: Page, t: number) => page.waitForFunction((t) => (window as unknown as { __pme6: Hook }).__pme6.simT() >= t, t, { timeout: 900_000 });

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
test.afterAll(async () => vite?.close());

async function open(page: Page, errors: string[]) {
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1000, height: 1000 });
  await page.goto(`${base}/fu6.html`);
  await page.waitForFunction(() => (window as unknown as { __pme6?: { ready: boolean } }).__pme6?.ready === true);
}

test('fu6 page: the bronchospasm demo runs, EtCO2 shows, no page errors', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  await open(page, errors);
  await demo(page, 'bronchospasm');
  await waitSim(page, 150);
  await expect(page.locator('#diag')).toContainText('EtCO2');
  expect(errors).toEqual([]);
});

test('fu6 gate screenshots (PME_SHOTS=1)', async ({ page, browserName }) => {
  test.skip(!process.env.PME_SHOTS, 'screenshots only: PME_SHOTS=1 PW_SYSTEM_CHROME=1 npx playwright test fu6');
  test.skip(browserName === 'webkit', 'heavy evidence run: Chromium only');
  test.setTimeout(3_600_000);
  mkdirSync(out, { recursive: true });
  const errors: string[] = [];
  await open(page, errors);
  const shot = async (name: string) => {
    const path = `${out}/${name}.jpg`;
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path, type: 'jpeg', quality: 45, clip: { x: 0, y: 0, width: 1000, height: 1000 } });
    expect(statSync(path).size).toBeLessThanOrEqual(60 * 1024);
  };
  const run = async (name: string, shots: Array<[number, string]>) => {
    await demo(page, name);
    for (const [t, name] of shots) { await waitSim(page, t); await shot(name); }
  };
  await run('bronchospasm', [[400, 'bronchospasm'], [1020, 'bronchospasm-salbutamol']]);
  await run('induction', [[190, 'induction-apnoea']]);
  await run('laryngospasm', [[240, 'laryngospasm'], [300, 'laryngospasm-release']]);
  await run('kink', [[180, 'kinked-tube']]);
  await run('anaemia', [[600, 'anaemia-hb5']]);
  expect(errors).toEqual([]);
});
