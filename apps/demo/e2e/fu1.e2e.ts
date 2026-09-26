// FU-1 follow-ups bundle: evidence screenshots for the gate note (docs/gates/fu-1.md).
// Run: PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/fu1.e2e.ts
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/fu-1');

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

type Ev = { type: string; t: number; kind?: string; data?: Record<string, unknown>; values?: Record<string, { value: number | null }> };
type Hook = { ready: boolean; send(c: Record<string, unknown>): Promise<{ accepted: boolean }>; events: Ev[] };
const hook = (p: Page) => p.evaluate(() => (window as unknown as { __pme4b: Hook }).__pme4b.events.length);
const send = (p: Page, c: Record<string, unknown>) => p.evaluate((c) => (window as unknown as { __pme4b: Hook }).__pme4b.send(c), c);
const events = (p: Page, type: string, kind?: string) =>
  p.evaluate(([type, kind]) => (window as unknown as { __pme4b: Hook }).__pme4b.events.filter((e) => e.type === type && (kind === undefined || e.kind === kind)), [type, kind] as const);

async function open(page: Page, skin: string) {
  await page.goto(`${base}/stage4b-device.html?skin=${skin}`);
  await page.waitForFunction(() => (window as unknown as { __pme4b?: { ready: boolean } }).__pme4b?.ready === true);
  await expect.poll(() => hook(page)).toBeGreaterThan(0);
}

test('R-51-1: TCP pace marks drawn as overlays on a pacer skin', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1300, height: 640 });
  await open(page, 'zoll-like');
  await send(page, { type: 'setRhythm', rhythm: 'avb3Wide' });
  await send(page, { type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode: 'fixed', ratePpm: 70, mA: 90 } });
  await expect.poll(async () => (await events(page, 'marker', 'paceSpike')).filter((m) => m.data?.tcp === true).length, { timeout: 30_000 }).toBeGreaterThan(10);
  await page.locator('#monitor').screenshot({ path: resolve(out, 'tcp-marks-zoll-like.png') });
});
