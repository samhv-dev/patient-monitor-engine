// Gate 7a evidence on the live page: resting monitor + PV loop + chamber pressures, phenylephrine, the AS + CAD
// profile before and after propofol and after the phenylephrine rescue, and the IABP.
// Run: PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage7a.e2e.ts
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-7a');

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

type Hook = { send(c: Record<string, unknown>): Promise<{ accepted: boolean }>; simT(): number; timeScale(k: number): void; restart(): void; ready: boolean };
const H = () => (window as unknown as { __pme7a: Hook }).__pme7a;
const send = (page: Page, c: Record<string, unknown>) => page.evaluate((c) => (window as unknown as { __pme7a: Hook }).__pme7a.send(c), c);
const simT = (page: Page) => page.evaluate(() => (window as unknown as { __pme7a: Hook }).__pme7a.simT());
const timeScale = (page: Page, k: number) => page.evaluate((k) => (window as unknown as { __pme7a: Hook }).__pme7a.timeScale(k), k);
void H;
const waitSim = async (page: Page, t: number) => page.waitForFunction((t) => (window as unknown as { __pme7a: Hook }).__pme7a.simT() >= t, t, { timeout: 120_000 });

async function shots(page: Page, name: string) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const a = document.querySelector('aside');
    if (a) a.scrollTop = 0;
  });
  await page.screenshot({ path: `${out}/${name}-monitor.png`, clip: { x: 0, y: 0, width: 760, height: 560 } });
  await page.screenshot({ path: `${out}/${name}-views.png`, clip: { x: 770, y: 0, width: 350, height: 540 } });
}

test('stage7a page runs, draws the PV loop and chamber pressures, reacts to drugs, AS + CAD, IABP', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1120, height: 620 });
  await page.goto(`${base}/stage7a.html`);
  await page.waitForFunction(() => (window as unknown as { __pme7a?: { ready: boolean } }).__pme7a?.ready === true);
  await timeScale(page, 4);
  await waitSim(page, 30);
  await expect(page.locator('#diag')).toContainText('CO');
  await shots(page, 'resting');
  await send(page, { type: 'applyEvent', event: { kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' } });
  const t0 = await simT(page);
  await waitSim(page, t0 + 75);
  await shots(page, 'phenylephrine');
  // AS + CAD: rest, propofol 1.5 mg/kg (+2 min), phenylephrine rescue (+90 s)
  await page.selectOption('#preset', 'ascad');
  await page.click('#restart');
  await page.waitForTimeout(500);
  await timeScale(page, 4);
  await waitSim(page, 40);
  await shots(page, 'as-cad-rest');
  await send(page, { type: 'applyEvent', event: { kind: 'drug', drugId: 'propofol', dose: 1.5, unit: 'mg/kg', route: 'iv' } });
  await waitSim(page, 40 + 125);
  await shots(page, 'as-cad-propofol-2min');
  await send(page, { type: 'applyEvent', event: { kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' } });
  await waitSim(page, 40 + 125 + 90);
  await shots(page, 'as-cad-phenylephrine');
  // IABP 1:1 on the adult
  await page.selectOption('#preset', 'adult');
  await page.click('#restart');
  await page.waitForTimeout(500);
  await timeScale(page, 4);
  await waitSim(page, 20);
  await page.click('#iabp');
  await waitSim(page, 40);
  await shots(page, 'iabp');
  expect(errors).toEqual([]);
});
