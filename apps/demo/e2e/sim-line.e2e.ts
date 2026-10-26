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
    const text = sp?.getAttribute('aria-label') || sp?.textContent;
    const strip = document.querySelector('.stage .sim-strip');
    const foot = document.querySelector('.app-foot');
    return {
      at: vis(sp) && text === line ? 'header' : vis(strip) && strip?.textContent === line ? 'strip' : 'none',
      footer: vis(foot),
    };
  }, LINE);
const hostBox = (p: Page) => p.locator('.stage > .monitor-host').boundingBox();
/** Go to a route and wait until the shell shows it (a loaded CI WebKit runner took over 5 s once, run 40320503647). */
async function go(p: Page, hash: string): Promise<void> {
  await p.evaluate((h) => (location.hash = h), hash);
  const id = hash.replace(/^#\/?/, '').split('/')[0] || 'home';
  await p.waitForFunction((r) => document.querySelector('.app')?.getAttribute('data-route') === r, id, { timeout: 15_000 });
}
async function classroom(): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), 'sim-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  relay = await startRelay({ port: 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  return `ws://127.0.0.1:${relay.port}/`;
}

test('the line is on the Monitor view and the learner window, never on the instructor pages; no footer on a monitor', async ({ page, context }) => {
  test.setTimeout(150_000);
  const ws = await classroom();
  await openApp(page, base, `?relay=${encodeURIComponent(ws)}#/teach`, { warmMs: 1500, site: { skin: 'saadat-like' } });
  // the Instructor view: the same monitor, no line
  expect(await where(page)).toEqual({ at: 'none', footer: true });
  const teachHeader = await page.locator('.stage .pme-hdr').boundingBox();
  // the Monitor view: in the saadat-like header, the monitor not moved
  const before = await hostBox(page);
  await go(page, '#/monitor');
  await expect.poll(() => where(page), { timeout: 15_000 }).toEqual({ at: 'header', footer: false });
  await go(page, '#/teach');
  await expect.poll(() => where(page), { timeout: 15_000 }).toEqual({ at: 'none', footer: true });
  expect(await page.locator('.stage .pme-hdr').boundingBox()).toEqual(teachHeader);
  expect(await hostBox(page)).toEqual(before);
  for (const r of ['#/', '#/room', '#/scenarios', '#/patient', '#/debrief', '#/explore', '#/settings']) {
    await go(page, r);
    await expect.poll(() => page.evaluate((line) => document.body.innerText.includes(line), LINE), { message: r }).toBe(false);
  }
  // another skin (a one-row header): a strip above the monitor on the Monitor view only
  await page.evaluate(() => (window as unknown as W).__pmeApp.session.setSkin('philips-like', ''));
  await go(page, '#/monitor');
  await expect.poll(() => where(page), { timeout: 15_000 }).toEqual({ at: 'strip', footer: false });
  const strip = await page.locator('.stage .sim-strip').boundingBox();
  expect(strip!.height).toBeLessThanOrEqual(16);
  expect((await hostBox(page))!.y).toBeGreaterThanOrEqual(strip!.y + strip!.height - 0.5);
  await page.evaluate(() => (window as unknown as W).__pmeApp.session.setSkin('saadat-like', ''));
  await expect.poll(() => where(page), { timeout: 15_000 }).toEqual({ at: 'header', footer: false });

  // the learner monitor window (same browser): in the header
  const code = await page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
  const win = await context.newPage();
  await win.goto(`${base}/?follow=${code}#/monitor`);
  await win.waitForFunction(() => (window as unknown as W).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000 });
  await expect.poll(() => where(win)).toEqual({ at: 'header', footer: false });
});

test("the line is on a learner's phone held upright: the idle message area, whole at 390 px, no footer", async ({ page, browser, browserName }) => {
  // FX-2, as mobile-learner.e2e.ts: the 2-vCPU CI WebKit runner cannot hold an instructor, a phone and the relay in step —
  // here the phone never reached 'synced' within 30 s on two attempts (run 40320503647, sim-line.e2e.ts:82), while the
  // line's own assertions passed there; this test passes on macOS WebKit (3/3) and on Chromium locally and in CI
  test.skip(browserName === 'webkit' && !!process.env.CI, 'FX-2: the 2-vCPU CI WebKit runner cannot hold an instructor, a phone and the relay in step (run 40320503647); macOS WebKit and CI Chromium run it');
  test.setTimeout(150_000);
  const ws = await classroom();
  await openApp(page, base, `?relay=${encodeURIComponent(ws)}#/teach`, { warmMs: 1500, site: { skin: 'saadat-like' } });
  const code = await page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
  const { defaultBrowserType: _b, ...dev } = devices['iPhone 13']; // 390 px wide, the narrowest phone measured
  const ph = await (await browser.newContext(dev)).newPage();
  await ph.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws)}`);
  await ph.waitForFunction(() => (window as unknown as W).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000 });
  await expect.poll(() => where(ph)).toEqual({ at: 'header', footer: false });
  // the whole line, not cut short with an ellipsis
  expect(await ph.locator('.stage .pme-hdr [data-pme="note"] span').evaluateAll((ss) => ss.every((e) => e.scrollWidth <= e.clientWidth && e.getBoundingClientRect().bottom <= e.closest('.pme-hdr')!.getBoundingClientRect().bottom))).toBe(true);
  await ph.context().close();
});
