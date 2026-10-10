// FU-2 engine follow-ups: evidence screenshots for the gate note (docs/gates/fu-2.md) — MODELED rhythm-intrinsic
// rates on the live 7a page (NR-7g-5). JPEG clips ≤ 60 KB.
// Run: PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/fu2.e2e.ts
import { mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
// CI run 36294420648: headless WebKit wrote a > 60 KB JPEG (its font rendering) and closed the page on retry; the evidence is Chromium's.
test.skip(({ browserName }) => browserName === 'webkit', 'heavy evidence run: Chromium only (G7g rule)');
const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/fu-2' : '../../../test-results/gate-shots/fu-2'); // FU-11 K1: evidence only on request

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

type Ev = { type: string; t: number; values?: Record<string, number | undefined>; rhythm?: { id: string; rateBpm: number } };
type Hook = { send(c: Record<string, unknown>): Promise<{ accepted: boolean }>; events: Ev[]; simT(): number; timeScale(k: number): void; ready: boolean };
const send = (p: Page, c: Record<string, unknown>) => p.evaluate((c) => (window as unknown as { __pme7a: Hook }).__pme7a.send(c), c);
const simT = (p: Page) => p.evaluate(() => (window as unknown as { __pme7a: Hook }).__pme7a.simT());
const waitSim = (p: Page, t: number) => p.waitForFunction((t) => (window as unknown as { __pme7a: Hook }).__pme7a.simT() >= t, t, { timeout: 120_000 });
/** The rhythm's rate truth over the last `s` sim-seconds: mean `state.values.hr` and the last `state.rhythm` (the page keeps state events). */
const rateTruth = (p: Page, s: number) =>
  p.evaluate((s) => {
    const h = (window as unknown as { __pme7a: Hook }).__pme7a;
    const t1 = h.simT();
    const st = h.events.filter((e) => e.type === 'state' && e.t > t1 - s);
    const v = st.map((e) => e.values?.hr ?? 0);
    return { hr: v.reduce((a, b) => a + b, 0) / Math.max(1, v.length), rhythm: st.at(-1)?.rhythm };
  }, s);

async function shot(page: Page, name: string) {
  const path = resolve(out, `${name}.jpg`);
  await page.screenshot({ path, type: 'jpeg', quality: 70, clip: { x: 0, y: 0, width: 760, height: 560 } });
  expect(statSync(path).size).toBeLessThanOrEqual(60_000);
}

test('NR-7g-5 on the live MODELED page: SVT 180, sinus bradycardia 40 and AF 100 keep their own rates', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1120, height: 620 });
  await page.goto(`${base}/stage7a.html`);
  await page.waitForFunction(() => (window as unknown as { __pme7a?: { ready: boolean } }).__pme7a?.ready === true);
  await page.evaluate(() => (window as unknown as { __pme7a: Hook }).__pme7a.timeScale(4));
  // AF: the reflex may move the response by ≤ 10 % (AV_MOD_MAX) — the others hold their rate exactly
  for (const [rhythm, rate, tol, name] of [['svtAvnrt', 180, 1, 'modeled-svt-180'], ['sinusBrady', 40, 1, 'modeled-sinus-brady-40'], ['afib', 100, 10, 'modeled-af-100']] as const) {
    await send(page, { type: 'setRhythm', rhythm, opts: { rateBpm: rate } });
    await waitSim(page, (await simT(page)) + 60);
    const r = await rateTruth(page, 20);
    console.log(`FU-2 e2e ${rhythm} ${rate}: state hr ${r.hr.toFixed(1)}, rhythm ${JSON.stringify(r.rhythm)}`);
    expect(r.rhythm?.id).toBe(rhythm);
    expect(Math.abs(r.hr - rate)).toBeLessThanOrEqual(tol);
    await shot(page, name);
  }
});
