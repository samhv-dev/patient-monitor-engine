// Gate 7g evidence on the live page: TCI induction, phenylephrine, sevoflurane at FGF 2 vs 0.5 L/min, adenosine on
// AVNRT, bupivacaine LAST → VF. Run: node apps/demo/scripts/stage7g-shots.mjs (headless system Chrome).
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-7g');

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

type DrugsEv = { t: number; drugs: { id: string; ce: number }[]; volatile: { macFrac: number; fa: number } | null } | null;
type Hook = { send(c: Record<string, unknown>, delayS?: number): Promise<{ accepted: boolean }>; simT(): number; timeScale(k: number): void; restart(): void; drugs(): DrugsEv; ready: boolean };
const simT = (page: Page) => page.evaluate(() => (window as unknown as Record<string, Hook>)['__pme7g']!.simT());
const drugs = (page: Page) => page.evaluate(() => (window as unknown as Record<string, Hook>)['__pme7g']!.drugs());
const timeScale = (page: Page, k: number) => page.evaluate((k) => (window as unknown as Record<string, Hook>)['__pme7g']!.timeScale(k), k);
const waitSim = (page: Page, t: number) => page.waitForFunction((t) => (window as unknown as Record<string, Hook>)['__pme7g']!.simT() >= t, t, { timeout: 300_000 });

async function restart(page: Page) {
  await page.click('#restart');
  await page.waitForTimeout(500);
  await timeScale(page, 4);
  await waitSim(page, 10);
}
async function shots(page: Page, name: string) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const a = document.querySelector('aside');
    if (a) a.scrollTop = 0;
  });
  await page.screenshot({ path: `${out}/${name}-monitor.png`, clip: { x: 0, y: 0, width: 760, height: 560 } });
  await page.screenshot({ path: `${out}/${name}-panel.png`, clip: { x: 760, y: 0, width: 380, height: 560 } });
}

test('stage7g page: TCI induction, phenylephrine, sevo FGF 2 vs 0.5, adenosine on AVNRT, LAST → VF', async ({ page }) => {
  test.setTimeout(900_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1140, height: 620 });
  await page.goto(`${base}/stage7g.html`);
  await page.waitForFunction(() => (window as unknown as { __pme7g?: { ready: boolean } }).__pme7g?.ready === true);
  await timeScale(page, 4);
  await waitSim(page, 10);
  // (a) TCI induction, 3 min later: panel Ce curves at target, ABP after induction
  await page.click('#tci');
  let t0 = await simT(page);
  await waitSim(page, t0 + 180);
  const ind = await drugs(page);
  expect(ind!.drugs.find((d) => d.id === 'propofol')!.ce).toBeGreaterThan(3.5);
  expect(ind!.drugs.find((d) => d.id === 'remifentanil')!.ce).toBeGreaterThan(2.7);
  await shots(page, 'tci-induction-3min');
  // (b) phenylephrine peak (≈ 60 s after the push)
  await restart(page);
  await page.click('#phe');
  t0 = await simT(page);
  await waitSim(page, t0 + 60);
  await shots(page, 'phenylephrine-peak');
  // (c) sevoflurane 2 % at FGF 2 vs 0.5 after 10 min: the low-flow lag in the volatile line
  const sevoAt = async (button: string, name: string) => {
    await restart(page);
    await page.click(button);
    const s = await simT(page);
    await waitSim(page, s + 600);
    await shots(page, name);
    return (await drugs(page))!.volatile!;
  };
  const high = await sevoAt('#sevo2', 'sevo-fgf2-10min');
  const low = await sevoAt('#sevoLow', 'sevo-fgf05-10min');
  expect(low.fa).toBeLessThan(high.fa);
  // (d) adenosine on AVNRT: the block on the ECG ≈ 10–30 s after the push (pushed 20 s after the rhythm)
  await restart(page);
  await page.click('#svt');
  t0 = await simT(page);
  await waitSim(page, t0 + 20 + 18);
  await shots(page, 'adenosine-block');
  // (e) LAST: bupivacaine 225 mg IV → VF within ≈ 2–3 min
  await restart(page);
  await page.click('#last');
  t0 = await simT(page);
  await waitSim(page, t0 + 180);
  await shots(page, 'last-vf');
  expect(errors).toEqual([]);
});
