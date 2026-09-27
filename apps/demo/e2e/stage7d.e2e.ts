// Stage 7d page: a CI smoke (check 19 starts, the ICP tile reads a rising ICP, no page errors) and, with PME_SHOTS=1,
// the gate screenshots into docs/gates/stage-7d/ (node apps/demo/scripts/stage7d-shots.mjs).
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-7d');

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
test.afterAll(async () => vite?.close());

type Organs = { t: number; brain: { icp: number; state: string }; kidney: { uopMlKgH: number; oliguria: boolean } } | null;
type Hook = { send(c: Record<string, unknown>): Promise<{ accepted: boolean }>; restart(tbi?: boolean): void; simT(): number; organs(): Organs; timeScale(k: number): void; ready: boolean };
const simT = (page: Page) => page.evaluate(() => (window as unknown as Record<string, Hook>)['__pme7d']!.simT());
const organs = (page: Page) => page.evaluate(() => (window as unknown as Record<string, Hook>)['__pme7d']!.organs());
const restart = (page: Page, tbi: boolean) => page.evaluate((tbi) => (window as unknown as Record<string, Hook>)['__pme7d']!.restart(tbi), tbi);
const timeScale = (page: Page, k: number) => page.evaluate((k) => (window as unknown as Record<string, Hook>)['__pme7d']!.timeScale(k), k);
const ev = (page: Page, event: Record<string, unknown>) => page.evaluate((e) => (window as unknown as Record<string, Hook>)['__pme7d']!.send({ type: 'applyEvent', event: e }), event);
const waitSim = (page: Page, t: number) => page.waitForFunction((t) => (window as unknown as Record<string, Hook>)['__pme7d']!.simT() >= t, t, { timeout: 1_500_000 }); // the fluids phase is 3600 sim-s: 15 min wall at ×4 (a 600 s wait timed out)

async function open(page: Page, errors: string[]) {
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1140, height: 620 });
  await page.goto(`${base}/stage7d.html`);
  await page.waitForFunction(() => (window as unknown as { __pme7d?: { ready: boolean } }).__pme7d?.ready === true);
}

test('stage7d page: check 19 starts, the ICP tile shows a rising ICP, no page errors', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  await open(page, errors);
  await page.click('#check19');
  await waitSim(page, 240); // ×4: ≈ 60 s wall
  const o = await organs(page);
  expect(o!.brain.icp).toBeGreaterThanOrEqual(12);
  expect(Number(await page.locator('#tIcp b').textContent())).toBeGreaterThanOrEqual(12);
  expect(errors).toEqual([]);
});

test('stage7d gate screenshots (PME_SHOTS=1)', async ({ page, browserName }) => {
  test.skip(!process.env.PME_SHOTS, 'screenshots only: node apps/demo/scripts/stage7d-shots.mjs');
  test.skip(browserName === 'webkit', 'heavy evidence run (≈ 30 min): Chromium only (G7g rule)');
  test.setTimeout(3_600_000);
  mkdirSync(out, { recursive: true });
  const errors: string[] = [];
  await open(page, errors);
  // JPEG: the 1140×620 PNGs were ≈ 98 KB and q70 JPEGs ≈ 80 KB, over the 60 KB evidence budget; the gate images were
  // re-encoded from the q70 run to ≈ 51–58 KB (gate note D-5), q40 targets the same size on a re-run
  const shot = async (name: string) => page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 40, clip: { x: 0, y: 0, width: 1140, height: 620 }, scale: 'css' });
  const at = async (dt: number) => waitSim(page, (await simT(page)) + dt);
  await timeScale(page, 4);
  await at(60);
  await shot('rest');
  await ev(page, { kind: 'brain', massMl: 15 }); // ICP ≈ 20–25: P2 > P1
  await at(90);
  await shot('icp-25-p2-over-p1');
  await ev(page, { kind: 'drug', drugId: 'mannitol', dose: 1, unit: 'g/kg', route: 'iv' });
  await at(900);
  await shot('after-mannitol-15min');
  await restart(page, true);
  await timeScale(page, 4);
  await ev(page, { kind: 'brain', massMl: 28 }); // CPP < 40 → Cushing
  await at(120);
  expect((await organs(page))!.brain.state).toBe('cushing');
  await shot('cushing');
  await restart(page, false);
  await timeScale(page, 4);
  await page.click('#bleed');
  await at(1200);
  expect((await organs(page))!.kidney.oliguria).toBe(true);
  await shot('oliguria');
  await page.click('#fluids');
  await at(3600);
  await shot('uop-recovery');
  expect(errors).toEqual([]);
});
