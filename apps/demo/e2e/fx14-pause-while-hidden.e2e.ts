// FX-14 / FX-15: Safari suspends a hidden instructor tab (≈ 4 min); the phones then said "The instructor's monitor is not
// answering" and the hidden minutes were lost on return (scratch/plans-backup/fx14-fx15-diagnosis.md). Under the
// 'pause' policy (E82 unanswered) the instructor's page pauses the session when its tab is hidden — the Pause button's own
// command, so a phone following over the relay shows "(paused)" — and on return resumes it with a toast. A session the
// instructor paused stays paused, and a reload sends no pause. Playwright cannot truly hide a tab, so the page's `visibilityState`/`hidden` are
// overridden and `visibilitychange` dispatched (the worker host sees the same event and runs its hidden pump).
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devices, expect, test, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { openApp, pillV2, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => relay?.close());

type W = { __pmeApp: { session: { code: string; paused: boolean; simNow(): number; monitor: { snapshot(): Promise<unknown> } | null } } };
const setHidden = (p: Page, hidden: boolean) =>
  p.evaluate((h) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
const host = (p: Page) => p.evaluate(() => { const s = (window as unknown as W).__pmeApp.session; return { paused: s.paused, simT: s.simNow() }; });
/** The pause has reached the engine: a request to the monitor's worker, sent after the pause, has come back. The worker
 *  answers in order, so every event batch it posted before it applied the pause has been taken by then. Those batches
 *  carry engine times past the host's wall-clock estimate (session.simNow), and taking them moves the paused estimate
 *  onto the engine's real stopping time: a correction of up to a frame or two (0.08–0.11 s on the CI runner, run
 *  41809522564), not a running clock. */
const engineTookPause = (p: Page) => p.evaluate(async () => void (await (window as unknown as W).__pmeApp.session.monitor?.snapshot()));

test('a hidden instructor tab pauses the session (the phone shows "(paused)") and resumes it on return with a toast', async ({ page, browser, browserName }) => {
  test.setTimeout(90_000);
  const dir = mkdtempSync(join(tmpdir(), 'fx14-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>'); // the pages come from Vite here
  relay = await startRelay({ port: 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = encodeURIComponent(`ws://127.0.0.1:${relay.port}/`);
  await openApp(page, base, `?relay=${ws}#/teach2`, { warmMs: 1500 });
  const code = await page.evaluate(() => (window as unknown as W).__pmeApp.session.code);

  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const ctx = await browser.newContext(dev);
  const phone = await ctx.newPage();
  await phone.goto(`${base}/?join=${code}&relay=${ws}`);
  const pill = phone.locator('.status-pill');
  await expect(pill).toHaveText(`Following session ${code}`, { timeout: 30_000 });

  // Hide: the session pauses and the phone says so (not "not answering")
  await setHidden(page, true);
  await expect.poll(async () => (await host(page)).paused).toBe(true);
  await expect(pill).toHaveText(`Following session ${code} (paused)`, { timeout: 10_000 });
  await engineTookPause(page);
  const t0 = (await host(page)).simT;
  await page.waitForTimeout(3000);
  expect((await host(page)).simT - t0).toBeLessThan(0.05); // the clock stood still while hidden
  await expect(pill).toHaveText(`Following session ${code} (paused)`); // past the 3 s extrapolation cap, still paused

  // Return: resumed, with the toast, and the phone follows again
  await setHidden(page, false);
  await expect(page.locator('.toast').filter({ hasText: /^Paused while this tab was hidden \(0:0[3-9]\)$/ })).toBeVisible();
  await expect.poll(async () => (await host(page)).paused).toBe(false);
  await expect(pill).toHaveText(`Following session ${code}`, { timeout: 10_000 });
  const pause = pillV2(page); // Instructor v2's clock pill: "running" is the session bar's "Pause"
  await expect(pause).toHaveAttribute('data-state', 'running');

  // Paused by the instructor: hiding and returning leave it paused, with no toast
  await pause.click();
  await expect.poll(async () => (await host(page)).paused).toBe(true);
  await page.locator('.toast').first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => undefined);
  await setHidden(page, true);
  await setHidden(page, false);
  await page.waitForTimeout(1500);
  expect((await host(page)).paused).toBe(true);
  await expect(page.locator('.toast', { hasText: 'Paused while this tab was hidden' })).toHaveCount(0);
  await expect(pill).toHaveText(`Following session ${code} (paused)`);

  // A reload is not a hidden tab: the unload's own `visibilitychange` (after `pagehide`) sends no pause
  await pause.click();
  await expect.poll(async () => (await host(page)).paused).toBe(false);
  await expect(pill).toHaveText(`Following session ${code}`, { timeout: 10_000 });
  await page.reload();
  await page.waitForFunction(() => '__pmeApp' in window);
  await page.waitForTimeout(3000);
  expect((await host(page)).paused).toBe(false);
  await expect(pill).toHaveText(`Following session ${code}`, { timeout: 15_000 });
  await ctx.close();
});
