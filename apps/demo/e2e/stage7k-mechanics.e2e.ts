// Gate 7k evidence on the live 7x console: the Ventilation panel ("Respiratory mechanics and volumes") fills from the
// engine's truth once the internal ventilator runs, and a bronchospasm raises Ppeak, Rinsp and PEEPi on the next
// breaths. JPEG element shots (≤ 60 KB) for docs/gates/stage-7k/. Chromium only (evidence; WebKit fonts change sizes).
// Run: PME_SHOTS=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage7k-mechanics.e2e.ts --project=chromium (shots)
import { mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/stage-7k' : '../../../test-results/gate-shots/stage-7k'); // FU-11 K1: evidence only on request

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

type Hook = { ready: boolean; ui: { model: { t: number } } };
const waitSim = (page: Page, t: number) => page.waitForFunction((t) => (window as unknown as { __pmeConsole: Hook }).__pmeConsole.ui.model.t >= t, t, { timeout: 120_000 });
const simT = (page: Page) => page.evaluate(() => (window as unknown as { __pmeConsole: Hook }).__pmeConsole.ui.model.t);
const num = async (page: Page, path: string) => Number((await page.locator(`tr[data-path="${path}"] .v`).textContent())?.replace(/[^\d.-]/g, ''));
/** JPEGs only with PME_SHOTS=1 (R50 F9: the bytes are not deterministic; CI and `test:e2e` run the smoke only). */
async function shot(page: Page, name: string) {
  if (process.env.PME_SHOTS !== '1') return;
  const path = `${out}/${name}.jpg`;
  await page.locator('details[data-group="mechanics"]').screenshot({ path, type: 'jpeg', quality: 55 });
  expect(statSync(path).size, `${name}.jpg ≤ 60 KB`).toBeLessThanOrEqual(60 * 1024);
}

test('Ventilation panel: VCV fills ΔP/Cstat/Ppeak; bronchospasm raises Ppeak and PEEPi', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'evidence shots are Chromium-only (the 7x precedent)');
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/physiology-console.html`);
  await page.waitForFunction(() => (window as unknown as { __pmeConsole?: Hook }).__pmeConsole?.ready === true);
  await page.selectOption('[data-id="speed"]', '4');
  // collapse the other sections so the panel is in view
  await page.evaluate(() => document.querySelectorAll<HTMLDetailsElement>('details.pc-sec').forEach((d) => { d.open = d.dataset.group === 'mechanics'; }));
  await page.selectOption('[data-f="src"]', 'ventilator');
  await page.click('[data-act="vent"]');
  await waitSim(page, (await simT(page)) + 40);
  const sec = page.locator('details[data-group="mechanics"]');
  await expect(sec).toBeVisible();
  for (const p of ['resp.mechanics.dp', 'resp.mechanics.cstat', 'resp.mechanics.ppeak', 'resp.vd.vdvt', 'resp.volumes.frc', 'resp.volumes.ratio']) await expect(sec.locator(`tr[data-path="${p}"]`)).toBeVisible();
  await expect(sec.locator('tr[data-path="resp.mechanics.dp"] .lbl')).toHaveText(/^ΔP/);
  const ppk0 = await num(page, 'resp.mechanics.ppeak');
  await shot(page, 'vcv-healthy');
  await page.fill('[data-f="lcond"]', 'bronchospasm');
  await page.fill('[data-f="lsev"]', '1');
  await page.click('[data-act="lcond"]');
  await waitSim(page, (await simT(page)) + 60);
  expect(await num(page, 'resp.mechanics.ppeak')).toBeGreaterThan(ppk0 + 10);
  expect(await num(page, 'resp.mechanics.peepi')).toBeGreaterThan(3);
  await shot(page, 'vcv-bronchospasm');
  expect(errors).toEqual([]);
});
