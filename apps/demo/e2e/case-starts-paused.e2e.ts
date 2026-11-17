// A case loaded after "Finish the case, Debrief now" begins paused at 00:00 (the session stays paused on purpose). The
// instructor's page says so beside the case's title, with the Run that starts it; a learner remote (a phone through the
// in-process classroom relay) shows the pause as it shows any other; nothing runs until Run is pressed, and then both
// notes go. PME_E2E_PORT and PME_E2E_RELAY_PORT (+ the worker's index) keep Vite and the relay inside a port range.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devices, expect, test } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => relay?.close());

type HostW = { __pmeApp: { session: { code: string; simNow(): number }; link: { simT: number; ctl: { hostPaused: boolean; pausedAtStart: boolean } } } };

test('Debrief now, then a case loaded: the instructor\'s page says it is paused at 00:00 with Run, the learner remote shows the pause, and Run starts it', async ({ page, browser, browserName }) => {
  test.setTimeout(180_000);
  const dir = mkdtempSync(join(tmpdir(), 'paused-start-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  relay = await startRelay({ port: fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = `ws://127.0.0.1:${relay.port}/`;
  const KEY = 'bed2remote01';
  await page.addInitScript((k) => localStorage.setItem('pme.roomLayout', JSON.stringify({ [k]: { name: 'bed 2 remote', show: 'remote', lastSeen: Date.now() } })), KEY);
  await openApp(page, base, `?relay=${encodeURIComponent(ws)}&scenario=showcase-mh-v2#/teach2`, { warmMs: 1500 });
  const host = <T>(fn: (w: HostW) => T) => page.evaluate(`(${fn.toString()})(window)`) as Promise<Awaited<T>>;
  const code = await host((w) => w.__pmeApp.session.code);
  const pin = (await page.evaluate(() => localStorage.getItem('pme.learnerPin'))) as string;

  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const ctx = await browser.newContext(dev);
  try {
    await ctx.addInitScript((k) => localStorage.setItem('pme.device', k), KEY);
    const p = await ctx.newPage();
    await p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws)}#/remote/learner`);
    for (const d of pin) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
    await p.locator('.ip-peer-go').click();
    await expect(p.locator('.lr-status')).toHaveText(`Signed in as a learner remote · ${code}`, { timeout: 20_000 });
    const phonePaused = p.locator('.lr-tray .lr-paused');
    await expect(phonePaused).toBeHidden();

    const words = page.locator('.ip2-head .ip2-start-words');
    const run = page.locator('.ip2-head').getByRole('button', { name: 'Run', exact: true });
    await expect(words).toHaveText('');

    // Finish the case, Debrief now: the session is left paused
    await page.locator('.ip2-dock .ip2-finish-btn').click();
    await expect(page.locator('.ip2-finish')).toBeVisible();
    await page.locator('.ip2-finish-resident').fill('Dr First');
    await page.locator('.ip2-finish-now').click();
    await expect(page).toHaveURL(/#\/debrief/);
    await expect.poll(() => host((w) => w.__pmeApp.link.ctl.hostPaused)).toBe(true);
    await expect(phonePaused).toBeVisible({ timeout: 10_000 });

    // the next case, from the library
    await page.evaluate(() => (location.hash = '#/scenarios/library'));
    await page.locator('[data-view=scenarios]').getByRole('button', { name: 'Load Anaphylaxis under anaesthesia', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Load scenario' }).click();
    await expect(page).toHaveURL(/#\/teach2$/);
    await expect(page.locator('.ip2-head .ip2-title')).toHaveText('Anaphylaxis under anaesthesia', { timeout: 10_000 });
    await expect(words).toHaveText('This case is paused at 00:00. Press Run to start it.');
    await expect(words).toHaveAttribute('role', 'status');
    await expect(run).toBeVisible();
    await expect(phonePaused).toHaveText('The case is paused: nothing can be given until it resumes. You can still prepare.');
    // nothing has started by itself
    expect(await host((w) => w.__pmeApp.link.ctl.hostPaused)).toBe(true);
    expect(await host((w) => w.__pmeApp.session.simNow())).toBeLessThan(0.1);

    await run.click();
    await expect(words).toHaveText('');
    await expect(run).toBeHidden();
    await expect.poll(() => host((w) => w.__pmeApp.link.ctl.hostPaused)).toBe(false);
    await expect(phonePaused).toBeHidden({ timeout: 10_000 });
    await expect.poll(() => host((w) => w.__pmeApp.session.simNow()), { message: 'the case runs' }).toBeGreaterThan(1);
  } finally {
    await ctx.close();
  }
});
