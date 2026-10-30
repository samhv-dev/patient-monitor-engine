// E130: the instructor sets the IBP1/IBP2 lane scales in the Devices tab (a typed range, AUTO, the fixed default) and
// the instructor's monitor, a second-screen learner monitor and a phone over the relay all draw with the same setting
// (the canvas carries it as `data-ibp-scales`; the range AUTO picks from it is the renderer's deterministic judgement at
// 30-s sim-time boundaries, unit-tested in packages/renderer/test/ibp-scales.test.ts). PME_IBP_SHOTS=<dir> also saves
// the monitor of both skins at the fixed default, a typed range and AUTO.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devices, expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { go, openApp, startVite, tab } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeFollower?: { sync: { status: string } | null }; __pmeApp: { session: { code: string }; link: { send(c: unknown): Promise<{ accepted: boolean }> } } };
const scalesOf = (p: Page) => p.evaluate(() => (document.querySelector('.monitor-host canvas') as HTMLCanvasElement | null)?.dataset.ibpScales ?? null);
const lines = (p: Page) => p.locator('.monitor-host canvas');
async function lines2(p: Page): Promise<void> {
  for (const sensor of ['abp', 'cvp']) await p.evaluate((s) => (window as unknown as W).__pmeApp.link.send({ type: 'attachSensor', sensor: s, state: 'connected' }), sensor);
}
async function setRange(p: Page, ch: string, lo: number, hi: number): Promise<void> {
  const row = p.locator(`[data-ibp="${ch}"]`).first();
  await row.getByRole('button', { name: 'Range', exact: true }).click();
  await row.locator(`input[name="${ch.toLowerCase()}-lower"]`).fill(String(lo));
  await row.locator(`input[name="${ch.toLowerCase()}-upper"]`).fill(String(hi));
  await row.getByRole('button', { name: 'Apply range' }).click();
}
const mode = (p: Page, ch: string, name: string) => p.locator(`[data-ibp="${ch}"]`).first().getByRole('button', { name, exact: true }).click();
const synced = (f: Page) => f.waitForFunction(() => (window as unknown as W).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000, polling: 250 });

test('the Devices control sets the scales; the instructor\'s monitor and a second-screen learner monitor draw the same', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit' && !!process.env.CI, 'FALLBACK ruling 2026-10-11 (as learner-monitor-follows): BroadcastChannel between pages on Playwright Linux WebKit');
  test.setTimeout(120_000);
  await openApp(page, base, '#/teach', { warmMs: 1500, site: { skin: 'saadat-like' } });
  await lines2(page);
  await tab(page, 'devices');
  await expect(page.locator('[data-ibp="IBP1"] [data-ibp-now]').first()).toHaveText("Fixed 0–200 mmHg (the monitor's own scale)");
  await setRange(page, 'IBP1', 20, 180);
  await mode(page, 'IBP2', 'Auto');
  const want = JSON.stringify({ IBP1: { mode: 'custom', lower: 20, upper: 180 }, IBP2: { mode: 'auto' } });
  await expect.poll(() => scalesOf(page)).toBe(want);
  const code = await page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
  const f = await page.context().newPage();
  await f.goto(`${base}/?follow=${code}#/monitor`);
  await synced(f);
  await expect.poll(() => scalesOf(f), { timeout: 10_000 }).toBe(want); // at the follower's start (its ask)
  await mode(page, 'IBP1', 'Fixed');
  const fixed1 = JSON.stringify({ IBP2: { mode: 'auto' } });
  await expect.poll(() => scalesOf(page)).toBe(fixed1);
  await expect.poll(() => scalesOf(f), { timeout: 10_000 }).toBe(fixed1); // and at every change
  await expect(lines(f)).toBeVisible();
});

test('a phone over the relay draws the instructor\'s scales, from its join and at every change', async ({ page, browser, browserName }) => {
  test.skip(browserName === 'webkit' && !!process.env.CI, 'FX-2 (as mobile-learner): the 2-vCPU CI WebKit runner cannot hold an instructor, a phone and the relay in step');
  test.setTimeout(120_000);
  const dir = mkdtempSync(join(tmpdir(), 'e130-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const relay: RelayHandle = await startRelay({ port: 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  try {
    const ws = `ws://127.0.0.1:${relay.port}/`;
    await openApp(page, base, `?relay=${encodeURIComponent(ws)}#/teach`, { warmMs: 1500, site: { skin: 'saadat-like' } });
    await lines2(page);
    await tab(page, 'devices');
    await setRange(page, 'IBP1', 0, 160);
    const code = await page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
    const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
    const f = await (await browser.newContext(dev)).newPage();
    await f.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws)}`);
    await synced(f);
    await expect.poll(() => scalesOf(f), { timeout: 10_000 }).toBe(JSON.stringify({ IBP1: { mode: 'custom', lower: 0, upper: 160 } }));
    await mode(page, 'IBP1', 'Auto');
    await expect.poll(() => scalesOf(f), { timeout: 10_000 }).toBe(JSON.stringify({ IBP1: { mode: 'auto' } }));
    await f.context().close();
  } finally {
    await relay.close();
  }
});

test('shots: both skins at the fixed default, a typed range and AUTO (PME_IBP_SHOTS only)', async ({ browser, browserName }) => {
  const out = process.env.PME_IBP_SHOTS;
  test.skip(!out || browserName === 'webkit', 'evidence run: PME_IBP_SHOTS=<dir>, Chromium only');
  test.setTimeout(240_000);
  mkdirSync(out!, { recursive: true });
  for (const skin of ['saadat-like', 'philips-like']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await openApp(page, base, '#/teach', { warmMs: 1500, site: { skin } });
    await lines2(page);
    const shoot = async (name: string) => {
      await go(page, '#/monitor', 9000);
      writeFileSync(join(out!, `after-${skin}-${name}.png`), await page.locator('.stage').screenshot());
      await go(page, '#/teach', 800);
      await tab(page, 'devices');
    };
    await tab(page, 'devices');
    await shoot('fixed');
    writeFileSync(join(out!, `after-${skin}-devices-tab.png`), await page.locator('[data-ibp="IBP1"]').first().locator('xpath=..').screenshot());
    await setRange(page, 'IBP1', 20, 180);
    await setRange(page, 'IBP2', 0, 40);
    await shoot('range-20-180');
    await mode(page, 'IBP1', 'Auto');
    await mode(page, 'IBP2', 'Auto');
    await page.waitForTimeout(31_000); // past a 30-s boundary of sim time
    await shoot('auto');
    await ctx.close();
  }
});
