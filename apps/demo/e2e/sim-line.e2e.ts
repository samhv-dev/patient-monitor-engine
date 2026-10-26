// "SIMULATION · not a clinical monitor" on every monitor surface and on none of the instructor's pages (the owner, 26
// October): the Monitor view and the learner monitor window (saadat-like: in the header's free centre, the monitor's
// size unchanged; another skin: a 16-px strip above it), and a learner's phone (the upright one-row header's idle
// message area, so the lanes keep their height).
// No monitor surface carries the page footer's disclaimer.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devices, expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => relay?.close());
test.use({ viewport: { width: 1280, height: 800 } });

const LINE = 'SIMULATION · not a clinical monitor';
type W = { __pmeApp: { session: { code: string; setSkin(s: string, t: string): Promise<void> } }; __pmeFollower: { sync: { status: string } | null } };
/** Where the line shows: 'header' (the two-row header's centre), 'strip', or 'none'; and the footer line's state. */
const where = (p: Page) =>
  p.evaluate((line) => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null && (e as HTMLElement).getBoundingClientRect().height > 0;
    const sp = document.querySelector('.stage .pme-hdr.two .r1 > .sp') ?? document.querySelector('.stage .pme-hdr [data-pme="note"]');
    const strip = document.querySelector('.stage .sim-strip');
    const foot = document.querySelector('.app-foot');
    return {
      at: vis(sp) && sp?.textContent === line ? 'header' : vis(strip) && strip?.textContent === line ? 'strip' : 'none',
      footer: vis(foot),
    };
  }, LINE);
const hostBox = (p: Page) => p.locator('.stage > .monitor-host').boundingBox();

test('the line is on the Monitor view, the learner window and the phone, never on the instructor pages; no footer on a monitor', async ({ page, browser, context }) => {
  test.setTimeout(150_000);
  const dir = mkdtempSync(join(tmpdir(), 'sim-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  relay = await startRelay({ port: 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = `ws://127.0.0.1:${relay.port}/`;
  await openApp(page, base, `?relay=${encodeURIComponent(ws)}#/teach`, { warmMs: 1500, site: { skin: 'saadat-like' } });
  // the Instructor view: the same monitor, no line
  expect(await where(page)).toEqual({ at: 'none', footer: true });
  const teachHeader = await page.locator('.stage .pme-hdr').boundingBox();
  // the Monitor view: in the saadat-like header, the monitor not moved
  const before = await hostBox(page);
  await page.evaluate(() => (location.hash = '#/monitor'));
  await expect.poll(() => where(page)).toEqual({ at: 'header', footer: false });
  await page.evaluate(() => (location.hash = '#/teach'));
  await expect.poll(() => where(page)).toEqual({ at: 'none', footer: true });
  expect(await page.locator('.stage .pme-hdr').boundingBox()).toEqual(teachHeader);
  expect(await hostBox(page)).toEqual(before);
  for (const r of ['#/', '#/room', '#/scenarios', '#/patient', '#/debrief', '#/explore', '#/settings']) {
    await page.evaluate((h) => (location.hash = h), r);
    await expect.poll(() => page.evaluate((line) => document.body.innerText.includes(line), LINE), { message: r }).toBe(false);
  }
  // another skin (a one-row header): a strip above the monitor on the Monitor view only
  await page.evaluate(() => (window as unknown as W).__pmeApp.session.setSkin('philips-like', ''));
  await page.evaluate(() => (location.hash = '#/monitor'));
  await expect.poll(() => where(page)).toEqual({ at: 'strip', footer: false });
  const strip = await page.locator('.stage .sim-strip').boundingBox();
  expect(strip!.height).toBeLessThanOrEqual(16);
  expect((await hostBox(page))!.y).toBeGreaterThanOrEqual(strip!.y + strip!.height - 0.5);
  await page.evaluate(() => (window as unknown as W).__pmeApp.session.setSkin('saadat-like', ''));
  await expect.poll(() => where(page)).toEqual({ at: 'header', footer: false });

  // the learner monitor window (same browser): in the header
  const code = await page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
  const win = await context.newPage();
  await win.goto(`${base}/?follow=${code}#/monitor`);
  await win.waitForFunction(() => (window as unknown as W).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000 });
  await expect.poll(() => where(win)).toEqual({ at: 'header', footer: false });

  // a learner's phone held upright: the one-row header's idle message area, no strip
  const { defaultBrowserType: _b, ...dev } = devices['Pixel 7'];
  const ph = await (await browser.newContext(dev)).newPage();
  await ph.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws)}`);
  await ph.waitForFunction(() => (window as unknown as W).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000 });
  await expect.poll(() => where(ph)).toEqual({ at: 'header', footer: false });
  await ph.context().close();
});
