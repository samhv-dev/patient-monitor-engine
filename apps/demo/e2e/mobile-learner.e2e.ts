// Stage 12 (the owner's request for the 22 Oct demonstration): learners scan a QR code and a learner monitor opens on
// their phones — a LIVE follower of the instructor's session over the relay, portrait, numerics large, no instructor
// controls, sound off until tapped. On both engines at a phone viewport (Playwright device emulation): the QR sheet, the
// phone following through speed changes and a fast-forward, a pause, the instructor's style and its change (owner ruling
// Q4), a phone that joins DURING a fast-forward, the Ventilator view (the phone holds), a relay that restarts (the phone
// reconnects), a full session and a relay a phone cannot reach.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devices, expect, test, type Browser, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle, type RelayOptions } from '../../../packages/controller/relay/server.ts';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => relay?.close());

type Sync = { status: string; resyncs: number; lagS: number };
type W = {
  __pmeFollower: { sync: Sync | null; style: { skin: string; theme: string } };
  __pmeApp: { session: { code: string; followers: number; setSkin(skin: string, theme: string): Promise<void> }; link: { simT: number; send(c: unknown): Promise<{ accepted: boolean }> }; frames: number[] };
};
const ws = () => `ws://127.0.0.1:${relay!.port}/`;
/**
 * KR-A1: PME_KIT_RELAY=<kit>/server/relay.mjs runs these tests against a BUILT kit's relay (a child process, the same
 * options as flags) instead of the source relay; a kit relay that exits before it is closed fails the test.
 */
async function startAnyRelay(o: RelayOptions): Promise<RelayHandle> {
  const bin = process.env.PME_KIT_RELAY;
  if (!bin) return startRelay(o);
  const args = [bin, '--port', String(o.port ?? 0), '--host', o.host ?? '127.0.0.1', '--remote-roles', o.remoteRoles ?? 'all', '--max-peers', String(o.maxPeersPerRoom ?? 60)];
  if (o.staticDir) args.push('--static', o.staticDir);
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('WS_NO_')));
  const proc = spawn(process.execPath, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  let closing = false;
  const exited = new Promise<number | null>((r) => proc.once('exit', (code) => r(code)));
  const port = await new Promise<number>((ok, no) => {
    const onData = (d: Buffer) => {
      out += d;
      const m = /ready on ws:\/\/[^:]+:(\d+)\//.exec(out);
      if (m) ok(Number(m[1]));
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    void exited.then((code) => no(new Error(`kit relay exited before ready (${code}): ${out}`)));
  });
  void exited.then((code) => closing || console.log(`kit relay EXITED (${code}):\n${out}`));
  return {
    port,
    close: async () => {
      if (proc.exitCode !== null || proc.signalCode !== null) {
        if (!closing) throw new Error(`the kit relay exited during the test (${proc.exitCode ?? proc.signalCode}): ${out.slice(-600)}`);
        return;
      }
      closing = true;
      proc.kill('SIGTERM');
      await exited;
    },
  } as RelayHandle;
}
/** A relay as the classroom runs it (app folder, phones may only follow), on a random port or a given one. */
async function classroom(o: RelayOptions = {}): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 's12-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>'); // the QR sheet reads `serves`; the pages come from Vite here
  relay = await startAnyRelay({ port: 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer', ...o });
}
async function instructor(page: Page, scenario: string, site?: Record<string, unknown>): Promise<string> {
  await openApp(page, base, `?relay=${encodeURIComponent(ws())}&scenario=${scenario}`, { warmMs: 1500, ...(site ? { site } : {}) });
  return page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
}
/** A phone (iPhone 13 on WebKit, Pixel 7 on Chromium) that opened the learner address. */
async function phone(browser: Browser, browserName: string, code: string, relayUrl = ws()): Promise<Page> {
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const p = await (await browser.newContext(dev)).newPage();
  await p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(relayUrl)}`);
  return p;
}
const synced = (p: Page) => p.waitForFunction(() => (window as unknown as W).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000 });
const sync = (p: Page) => p.evaluate(() => (window as unknown as W).__pmeFollower.sync as Sync);
// sorted by param: the instructor's saadat-like screen PLACES its tiles in a grid and a strip (rc.3 layout.grid) while a
// phone held upright keeps the skin's order, so the same tiles and values appear in a different DOM order
const tiles = (p: Page) => p.evaluate(() => [...document.querySelectorAll('.pme-stile')].map((e) => `${(e as HTMLElement).dataset.param}:${e.querySelector('[data-pme="v"]')?.textContent}`).sort().join(' '));
const same = (f: Page, p: Page) => expect.poll(async () => (await tiles(f)) === (await tiles(p)) || `${await tiles(f)} | ${await tiles(p)}`, { timeout: 15_000, intervals: [100] }).toBe(true);
const status = (p: Page) => p.locator('.follower-bar .status-pill');
const styleOf = (p: Page) => p.evaluate(() => (window as unknown as W).__pmeFollower.style.skin);

test("the Room page's QR, then a phone follows in the instructor's style through ×4, ×8, a style change, a pause and a 2-minute fast-forward that another phone joins", async ({ page, browser, browserName }) => {
  // FX-2 (CI-only WebKit skip, orchestrator scope addition 2026-10-12): on the 2-vCPU CI WebKit runner the phone fell behind
  // at a different step on each attempt — main run 38205878761: 'waiting' 8 s after ×4/×8, tiles unequal 15 s, lag 2.04 s
  // of sim; PR #61 run 38211190394 (after the FX-2 fixes, which cleared the speed steps): '(paused)' not shown within
  // 5 s, then a phone 15 s behind the instructor after the style change, passing on retry 2. Never reproduced on macOS
  // WebKit or Chromium under load (26 local runs, branch and base); local macOS WebKit and CI Chromium keep this test.
  test.skip(browserName === 'webkit' && !!process.env.CI, 'FX-2: the 2-vCPU CI WebKit runner cannot hold an instructor, a phone and the relay in step (runs 38205878761, 38211190394); macOS WebKit and CI Chromium run it');
  test.setTimeout(300_000);
  await classroom();
  const code = await instructor(page, 'showcase-anaphylaxis', { skin: 'philips-like' }); // not the phones' default style
  // the QR moment: the Room page (E125: the app's one QR code) with the code, the learner address (this computer's
  // network address) and the count
  await page.evaluate(() => (location.hash = '#/room'));
  const sheet = page.locator('section.room-join');
  await expect(sheet.getByRole('img', { name: /^QR code of http:\/\/\d+\.\d+\.\d+\.\d+:\d+\/\?join=/ })).toBeVisible();
  await expect(sheet.locator('.phones-url')).toHaveText(new RegExp(`^http://\\d+\\.\\d+\\.\\d+\\.\\d+:${relay!.port}/\\?join=${code}$`));
  await expect(sheet.locator('.phones-count')).toHaveText('0 phones following');

  const f = await phone(browser, browserName, code);
  await synced(f);
  await expect(sheet.locator('.phones-count')).toHaveText('1 phone following');
  await expect(page.locator('.room-status')).toContainText(/Stable connection|Weak connection/);
  await page.evaluate(() => (location.hash = '#/teach'));
  await expect(status(f)).toHaveText(`Following session ${code}`);
  // one screen, portrait: the waveforms over the whole width, the tiles in a grid under them, nothing to scroll, no
  // instructor control, sound off until tapped
  const box = await f.evaluate(() => {
    const c = document.querySelector('.monitor-host canvas')!.getBoundingClientRect();
    const t = document.querySelector('.pme-portrait')!.getBoundingClientRect();
    const b = document.querySelector('.follower-bar')!.getBoundingClientRect();
    return { cw: c.width, vw: innerWidth, vh: innerHeight, tilesTop: t.top, canvasBottom: c.bottom, barBottom: b.bottom, sw: document.documentElement.scrollWidth };
  });
  expect(box.cw).toBeGreaterThan(box.vw * 0.95);
  expect(box.tilesTop).toBeGreaterThanOrEqual(box.canvasBottom - 1);
  expect(box.barBottom).toBeLessThanOrEqual(box.vh + 1);
  expect(box.sw).toBeLessThanOrEqual(box.vw);
  expect(await f.getByRole('button').evaluateAll((bs) => bs.filter((b) => (b as HTMLElement).offsetParent !== null).map((b) => b.textContent))).toEqual(['Sound off', 'Silence here']); // nothing of the instructor's
  await same(f, page);
  // owner ruling Q4: the instructor's style, carried in the follow stream (the tiles above are Philips-style ones)
  expect(await styleOf(f)).toBe('philips-like');
  await expect(f.locator('.follower-note')).toBeHidden();

  const bar = page.locator('.sessionbar');
  for (const k of ['×4', '×8']) {
    await bar.getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: k }).click();
    await page.waitForTimeout(8000);
    // FX-2 (main run 38205878761, CI WebKit: 'waiting' 8 s after a speed change; lag 2.04 s of sim at ×8): a resync after
    // a ×4/×8 change is allowed on a loaded machine (orchestrator ruling), so the phone is awaited in state, not read once
    await expect.poll(async () => (await sync(f)).status, { timeout: 30_000 }).toBe('synced');
    expect((await sync(f)).lagS).toBeLessThan(0.5); // FX-2: WALL seconds behind the host (0.1 s at every speed by design)
    await same(f, page);
  }
  await bar.getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: '×1' }).click();
  // the instructor changes the style: the phone follows it (upright)
  await page.evaluate(() => (window as unknown as W).__pmeApp.session.setSkin('saadat-like', ''));
  await expect.poll(() => styleOf(f), { timeout: 10_000 }).toBe('saadat-like');
  await expect(f.locator('.pme-portrait')).toBeVisible();
  await same(f, page);
  await bar.getByRole('button', { name: 'Pause' }).click();
  await expect(status(f)).toHaveText(`Following session ${code} (paused)`, { timeout: 5000 });
  await bar.getByRole('button', { name: /Resume|Run/ }).click();
  await expect(status(f)).toHaveText(`Following session ${code}`, { timeout: 5000 });

  // Stage 10's fast-forward: the phone shows the same panel, waits, and starts again from the host's snapshot
  const t0 = await page.evaluate(() => (window as unknown as W).__pmeApp.link.simT);
  await bar.getByRole('group', { name: 'Fast-forward' }).getByRole('button', { name: 'Fast-forward 2 min' }).click();
  await expect(f.locator('.ff-veil.on')).toBeVisible({ timeout: 5000 });
  // R50 I6: a phone that joins DURING the span gets the host's answer (the jump among its replays) and the end
  const late = await phone(browser, browserName, code);
  await expect(late.locator('.ff-veil.on')).toBeVisible({ timeout: 8000 }); // it joined inside the span: it waits too
  await expect(f.locator('.ff-veil.on')).toHaveCount(0, { timeout: 30_000 });
  await synced(f);
  await synced(late);
  await same(late, page);
  expect(await styleOf(late)).toBe('saadat-like');
  await late.context().close();
  await expect.poll(() => f.evaluate(() => (window as unknown as { __pmeFollower: { sync: { lastFastForward: unknown } } }).__pmeFollower.sync.lastFastForward !== null)).toBe(true);
  expect(await page.evaluate(() => (window as unknown as W).__pmeApp.link.simT)).toBeGreaterThan(t0 + 120);
  await same(f, page);
});

test('while the Ventilator view drives the patient the phone holds; it follows again once the view closes', async ({ page, browser, browserName }) => {
  test.skip(browserName === 'webkit' && !!process.env.CI, 'FALLBACK ruling 2026-10-12 (S12-F1, PR #57 run 38194080645): hidden cockpit iframe throttled on CI Linux WebKit — the cockpit stops sending frames on the Monitor view, so the hold ends; passes on macOS WebKit and CI Chromium. The owner checks it by hand (H21, docs/gates/stage-12-real-phone.md)');
  test.setTimeout(180_000);
  await classroom();
  const code = await instructor(page, 'showcase-bronchospasm');
  const f = await phone(browser, browserName, code);
  await synced(f);
  await page.evaluate(() => (location.hash = '#/vent'));
  await expect(f.locator('.learner-hold')).toBeVisible({ timeout: 10_000 });
  await expect(status(f)).toHaveText('The ventilator is on the main screen: this monitor waits until it closes');
  const r0 = (await sync(f)).resyncs;
  await page.waitForTimeout(8000);
  expect((await sync(f)).resyncs - r0).toBeLessThanOrEqual(1); // held: no snapshot storm (it re-synced every ≈ 4 s before)
  // UI-A #2 (demo review 24 Oct #2): the cockpit keeps the patient while the case runs (FU-11 H6: a new case unloads it),
  // but the phone holds only while the Ventilator view is ON SCREEN — leaving it releases the phone at once (`cockpit
  // off`), well inside the 2.5 s the quiet timeout alone would take
  const left = Date.now();
  await page.evaluate(() => (location.hash = '#/teach'));
  await expect(f.locator('.learner-hold')).toBeHidden({ timeout: 2000 });
  const releasedMs = Date.now() - left;
  await synced(f);
  await expect(status(f)).toHaveText(`Following session ${code}`, { timeout: 10_000 });
  const r1 = (await sync(f)).resyncs;
  await page.waitForTimeout(4000);
  await expect(f.locator('.learner-hold')).toBeHidden(); // still following, 4 s later
  console.log(`[UI-A #2] ${browserName}: released ${releasedMs} ms after leaving the view; ${(await sync(f)).resyncs - r1} resync(s) in the next 4 s (E128: the engine's ventilator took the patient over)`);
  expect((await sync(f)).resyncs - r1, 'E128: no resync after the one on release').toBe(0);
  // back on the Ventilator view: it holds again
  await page.evaluate(() => (location.hash = '#/vent'));
  await expect(f.locator('.learner-hold')).toBeVisible({ timeout: 10_000 });
  await expect(status(f)).toHaveText('The ventilator is on the main screen: this monitor waits until it closes');
});

test('a relay restart, a full session and a relay the phone cannot reach', { tag: '@known-flaky' }, async ({ page, browser, browserName }) => {
  test.setTimeout(180_000);
  await classroom({ maxPeersPerRoom: 1 });
  const port = relay!.port;
  const code = await instructor(page, 'showcase-induction');
  const f = await phone(browser, browserName, code);
  await synced(f);
  const g = await phone(browser, browserName, code);
  await expect(status(g)).toHaveText('This session is full: please watch the main screen', { timeout: 10_000 });
  await g.context().close();
  // the network blinks: the relay goes away and comes back on the same address
  await relay!.close();
  await expect(status(f)).toHaveText(/Connection lost: reconnecting…|The instructor's monitor is not answering/, { timeout: 15_000 });
  relay = await startAnyRelay({ port, host: '127.0.0.1', remoteRoles: 'viewer' });
  await expect(status(f)).toHaveText(`Following session ${code}`, { timeout: 30_000 });
  await same(f, page);
  // a phone on another network: it waits, then says what to check
  const lost = await phone(browser, browserName, code, 'ws://127.0.0.1:9/');
  await expect(status(lost)).toHaveText("Waiting for the instructor: this phone cannot reach the instructor's laptop. Is it on the classroom Wi-Fi?", { timeout: 15_000 });
});
