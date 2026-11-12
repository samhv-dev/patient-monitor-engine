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
import { ffV2, openApp, pillV2, speedV2, startVite } from './app-support.ts';

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
/**
 * A relay as the classroom runs it (app folder, phones may only follow), on a random port or a given one.
 * PME_E2E_RELAY_PORT: a fixed port per Playwright worker (that port + TEST_PARALLEL_INDEX), as PME_E2E_PORT is Vite's,
 * for a machine whose runs must keep to a port range.
 */
async function classroom(o: RelayOptions = {}): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 's12-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>'); // the QR sheet reads `serves`; the pages come from Vite here
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  relay = await startAnyRelay({ port: fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer', ...o });
}
async function instructor(page: Page, scenario: string, site?: Record<string, unknown>): Promise<string> {
  await openApp(page, base, `?relay=${encodeURIComponent(ws())}&scenario=${scenario}#/teach2`, { warmMs: 1500, ...(site ? { site } : {}) });
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
  // R4 (Q1 ruled 5 November): the QR's address opens the instrument picker, `#/pick`
  await expect(sheet.getByRole('img', { name: /^QR code of http:\/\/\d+\.\d+\.\d+\.\d+:\d+\/\?join=[A-Z0-9]{6}#\/pick$/ })).toBeVisible();
  await expect(sheet.locator('.phones-url')).toHaveText(new RegExp(`^http://\\d+\\.\\d+\\.\\d+\\.\\d+:${relay!.port}/\\?join=${code}#/pick$`));
  await expect(sheet.locator('.phones-count')).toHaveText('0 phones following');

  const f = await phone(browser, browserName, code);
  await synced(f);
  await expect(sheet.locator('.phones-count')).toHaveText('1 phone following');
  await expect(page.locator('.room-status')).toContainText(/Stable connection|Weak connection/);
  // R7: the relay's device table lists the phone with what it shows (its hello's `show`)
  await expect(page.locator('.room-table tbody tr[data-show="learner"] td').nth(2)).toHaveText('Learner monitor');
  await page.evaluate(() => (location.hash = '#/teach2'));
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

  // Instructor v2's header (speed box, clock pill) and STATE's Fast forward box
  for (const k of [4, 8] as const) {
    await speedV2(page, k);
    await page.waitForTimeout(8000);
    // FX-2 (main run 38205878761, CI WebKit: 'waiting' 8 s after a speed change; lag 2.04 s of sim at ×8): a resync after
    // a ×4/×8 change is allowed on a loaded machine (orchestrator ruling), so the phone is awaited in state, not read once
    await expect.poll(async () => (await sync(f)).status, { timeout: 30_000 }).toBe('synced');
    expect((await sync(f)).lagS).toBeLessThan(0.5); // FX-2: WALL seconds behind the host (0.1 s at every speed by design)
    await same(f, page);
  }
  await speedV2(page, 1);
  // the instructor changes the style: the phone follows it (upright)
  await page.evaluate(() => (window as unknown as W).__pmeApp.session.setSkin('saadat-like', ''));
  await expect.poll(() => styleOf(f), { timeout: 10_000 }).toBe('saadat-like');
  await expect(f.locator('.pme-portrait')).toBeVisible();
  await same(f, page);
  await expect(pillV2(page)).toHaveAttribute('data-state', 'running');
  await pillV2(page).click();
  await expect(status(f)).toHaveText(`Following session ${code} (paused)`, { timeout: 5000 });
  await pillV2(page).click();
  await expect(status(f)).toHaveText(`Following session ${code}`, { timeout: 5000 });

  // Stage 10's fast-forward: the phone shows the same panel, waits, and starts again from the host's snapshot
  const t0 = await page.evaluate(() => (window as unknown as W).__pmeApp.link.simT);
  await ffV2(page, 2);
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
  await page.evaluate(() => (location.hash = '#/teach2'));
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

test("R4: the QR's address opens the instrument picker; one tap gives today's learner monitor, saying what it shows; #/monitor/wide is landscape and follows", async ({ page, browser, browserName }) => {
  test.setTimeout(180_000);
  await classroom();
  const code = await instructor(page, 'showcase-induction');
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const ctx = await browser.newContext(dev);
  const p = await ctx.newPage();
  // what the phone says on the wire: its hellos (Playwright sees the socket's frames)
  const hellos: Array<Record<string, unknown>> = [];
  p.on('websocket', (w) => w.on('framesent', (f) => {
    const m = JSON.parse(String(f.payload)) as Record<string, unknown>;
    if (m.kind === 'hello') hellos.push(m);
  }));
  await p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws())}#/pick`);
  const pick = p.locator('.join-pick');
  await expect(pick.getByRole('heading', { level: 1 })).toHaveText('Choose what this screen shows');
  await expect(pick.locator('.join-code .code')).toHaveText(code);
  await expect(pick.locator('.join-card h2')).toHaveText(['Learner monitor', 'Patient monitor', 'Learner remote', 'Infusion pumps', 'Ventilator', 'Depth of anaesthesia', 'Intra-aortic balloon pump']);
  const learnerBtn = pick.locator('.join-card[data-show="learner"] button');
  await expect(learnerBtn).toBeFocused(); // preselected: one tap
  expect(hellos).toEqual([]); // the picker follows nothing until the tap
  // every card's action is a 44 px target; nothing scrolls sideways
  for (const b of await pick.locator('.join-card button').all()) {
    const r = (await b.boundingBox())!;
    expect(Math.min(r.width, r.height), await b.textContent() ?? '').toBeGreaterThanOrEqual(44);
  }
  expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await learnerBtn.click();
  await synced(p);
  await expect(p).toHaveURL(new RegExp(`\\?join=${code}&relay=[^#]+#/monitor$`));
  await expect(status(p)).toHaveText(`Following session ${code}`);
  await expect(p.locator('.pme-portrait')).toBeVisible(); // today's learner monitor, upright
  expect(await p.evaluate(() => document.documentElement.dataset.learner)).toBe('phone');
  await same(p, page);
  expect(hellos.length).toBeGreaterThan(0);
  const key = hellos[0]?.device as string;
  expect(key).toMatch(/^[a-z0-9]{8,16}$/);
  for (const m of hellos) expect(m).toMatchObject({ role: 'viewer', show: 'learner', device: key });
  // "Change" goes back to the picker, which now marks the last choice
  await p.locator('.follower-bar a.follower-change').click();
  await expect(p.locator('.join-card[data-show="learner"] .st.on')).toHaveText('Last on this device');
  await expect(p.locator('.join-card[data-show="learner"] button')).toBeFocused();
  // the patient monitor, landscape, follows; its hellos say so, under the same device key
  hellos.length = 0;
  await p.locator('.join-card[data-show="monitor"] button').click();
  await synced(p);
  await expect(p).toHaveURL(/#\/monitor\/wide$/);
  await expect(p.locator('.pme-portrait')).toHaveCount(0);
  expect(await p.evaluate(() => document.documentElement.dataset.learner ?? null)).toBeNull();
  await same(p, page);
  expect(hellos.length).toBeGreaterThan(0);
  for (const m of hellos) expect(m).toMatchObject({ role: 'viewer', show: 'monitor', device: key });
  await ctx.close();
});

test('R4: the picker is one column on a 375 px phone and three across at 1280 px', async ({ browser }) => {
  for (const [width, cols] of [[375, 1], [1280, 3]] as const) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } });
    const p = await ctx.newPage();
    await p.goto(`${base}/?join=ABC234&relay=${encodeURIComponent('ws://127.0.0.1:9/')}#/pick`);
    const tops = await p.locator('.join-card').evaluateAll((cs) => cs.map((c) => Math.round(c.getBoundingClientRect().top)));
    expect(tops.filter((t) => t === tops[0]).length, `${width} px`).toBe(cols);
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width} px`).toBe(true);
    for (const b of await p.locator('.join-card button').all()) expect(((await b.boundingBox())!).height, `${width} px`).toBeGreaterThanOrEqual(44);
    await ctx.close();
  }
});

// Plan learner-action-remote.md L6: the learner remote's page on a phone. The picker's "Learner remote" opens the
// learner-PIN form (#/remote/learner); a wrong learner PIN is said in words; the PIN the laptop's Room setup shows behind
// press-and-hold signs it in: its every hello is `learner` with its device key and the PIN, the monitor follows as a
// strip over three 44 px tabs, the laptop's table lists it as "Learner remote", granted. The PIN is never in the phone's
// address or store. "New learner PIN" on the laptop signs it out with the reason; "Change" returns to the picker.
test('L6: the Learner remote card opens the learner-PIN form; the learner PIN from Room setup signs it in as `learner`; the monitor follows over three tabs; a new learner PIN signs it out', async ({ page, browser, browserName }) => {
  test.setTimeout(180_000);
  await classroom();
  const code = await instructor(page, 'showcase-induction');
  const learnerPin = (await page.evaluate(() => localStorage.getItem('pme.learnerPin'))) as string;
  const instructorPin = (await page.evaluate(() => localStorage.getItem('pme.instructorPin'))) as string;
  expect(learnerPin).toMatch(/^[0-9]{4}$/);
  expect(learnerPin).not.toBe(instructorPin);
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const ctx = await browser.newContext(dev);
  const p = await ctx.newPage();
  const hellos: Array<Record<string, unknown>> = [];
  p.on('websocket', (w) => w.on('framesent', (f) => {
    const m = JSON.parse(String(f.payload)) as Record<string, unknown>;
    if (m.kind === 'hello') hellos.push(m);
  }));
  const urls: string[] = [];
  p.on('framenavigated', (fr) => void (fr === p.mainFrame() && urls.push(fr.url())));
  await p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws())}#/pick`);
  const card = p.locator('.join-card[data-show="remote"]');
  await expect(card.locator('h2')).toHaveText('Learner remote');
  await expect(card.locator('p').first()).toHaveText("Give drugs and infusions, send samples and read their results from this phone. Everything you give is recorded under this phone's name.");
  await card.locator('button').click();
  await expect(p).toHaveURL(new RegExp(`\\?join=${code}&relay=[^#]+#/remote/learner$`));
  // the learner-PIN form first: nothing said on the wire yet
  const form = p.locator('.ip-peer-form');
  await expect(form.getByRole('heading', { level: 1 })).toHaveText('Learner remote');
  await expect(form.getByLabel('Learner PIN')).toBeVisible();
  expect(hellos).toEqual([]);
  const typePin = async (pin: string) => {
    for (const d of pin) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
    await p.locator('.ip-peer-go').click();
  };
  const wrong = ['1111', '2222', '3333'].find((x) => x !== learnerPin && x !== instructorPin) as string;
  await typePin(wrong);
  await expect(p.locator('.ip-peer-error')).toHaveText('Wrong learner PIN. Enter the learner PIN the instructor reads out.');
  await expect(p.locator('.ip-peer-pin')).toHaveValue('');
  // the instructor's PIN is a wrong learner PIN too (§4 D9)
  await typePin(instructorPin);
  await expect(p.locator('.ip-peer-error')).toHaveText('Wrong learner PIN. Enter the learner PIN the instructor reads out.');
  hellos.length = 0;
  await typePin(learnerPin);
  await expect(p.locator('.lr-status')).toHaveText(`Signed in as a learner remote · ${code}`);
  await p.waitForFunction(() => (window as unknown as { __pmeLearnerRemote: { follower(): { sync: Sync | null } | null } }).__pmeLearnerRemote.follower()?.sync?.status === 'synced', null, { timeout: 30_000 });
  const key = (await p.evaluate(() => localStorage.getItem('pme.device'))) as string;
  expect(key).toMatch(/^[a-z0-9]{8,16}$/);
  expect(hellos.length).toBeGreaterThan(0);
  for (const m of hellos) expect(m).toMatchObject({ role: 'learner', show: 'learner', device: key, pin: learnerPin });
  // the monitor follows, as a strip over the tabs, upright
  await expect(p.locator('.pme-portrait')).toBeVisible();
  await same(p, page);
  await expect(p.locator('.lr-bar .status-pill')).toHaveText(`Following session ${code}`);
  const tabs = p.getByRole('tab');
  await expect(tabs).toHaveText(['Drugs', 'Infusions', 'Labs']);
  for (const t of await tabs.all()) {
    const r = (await t.boundingBox())!;
    expect(Math.min(r.width, r.height), (await t.textContent()) ?? '').toBeGreaterThanOrEqual(44);
  }
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  // L8: the Infusions tab holds the infusions menu (learner-remote.e2e.ts drives it): nothing running, nothing ready yet
  await expect(p.getByRole('tabpanel').locator('.lr-inf-running-empty')).toHaveText('No infusion is running.');
  await expect(p.getByRole('tabpanel').locator('.lr-inf-start-empty')).toHaveText('No syringe on the tray is ready. Prepare one in the Drugs tab, then start it here.');
  const stage = (await p.locator('.stage').boundingBox())!;
  expect(stage.height).toBeLessThan((p.viewportSize()?.height ?? 0) * 0.5); // a strip, not the whole screen
  expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // the PIN is in no address the page had and in neither of its stores
  for (const u of [...urls, p.url()]) expect(u).not.toContain(learnerPin);
  expect(await p.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }))).not.toContain(learnerPin);
  // the laptop: the table lists it as a learner remote, granted; its PIN panel beside the instructor's, behind press-and-hold
  await page.evaluate(() => (location.hash = '#/room'));
  const row = page.locator(`.room-table tbody tr[data-device="${key}"] td`);
  await expect(row.nth(2)).toHaveText('Learner remote');
  await expect(row.nth(3)).toHaveText('granted');
  const panel = page.locator('#room-learner');
  await expect(panel.locator('.ip-peer-state')).toHaveText('1 learner remote signed in');
  expect(await panel.innerText()).not.toContain(learnerPin);
  // "New learner PIN": every learner remote is signed out, and says why
  await panel.getByRole('button', { name: 'New learner PIN' }).click();
  await expect(p.locator('.ip-peer-error')).toHaveText("The learner PIN was changed on the instructor's computer. Enter the new learner PIN.");
  await expect(p.locator('.ip-peer-form')).toBeVisible();
  await expect(p.getByRole('tab')).toHaveCount(0);
  await expect(panel.locator('.ip-peer-state')).toHaveText('No learner remote signed in');
  expect(await page.evaluate(() => localStorage.getItem('pme.learnerPin'))).not.toBe(learnerPin);
  // "Change" goes back to the picker, which marks the last choice
  await p.locator('.lr-change a').click();
  await expect(p.locator('.join-card[data-show="remote"] .st.on')).toHaveText('Last on this device');
  await ctx.close();
});

// A1 (plan pump-rack-tci.md §2, §4 D1, §5, §8; PQ10 = B): the QR's picker offers "Infusion pumps" in the owner's words;
// its Show here opens the learner-PIN form at #/pump (nothing said on the wire before the PIN); the learner PIN says hello
// as `{role: 'pump', show: 'pump', device, pin}` through the classroom relay (the guard and C1's relay pass it). The host
// grants a pump in C2, not yet: the tablet says so after 10 s. To show the rack in a browser before C2, the test then
// issues the grant ITSELF through the host's own grant method (HostSession.grant, standing in for C2's admission; the
// product does not grant a pump yet, and this is not a sign-in path), and the instructor's own command path loads two
// channels (the engine's `pump` event, E1; C2 will build these from the tablet's commands): channel 1 a REMIFENTANIL
// syringe programmed as propofol (§8's mismatch), channel 3 a drip bag. The tablet shows Room setup's channels and
// kinds, a change on Room setup at once, each face's programme, and never the contents.
// PME_A1_SHOTS=<dir>: the card and the rack are saved there as PNG (for the PR; CI sets none).
test('A1: the Infusion pumps card opens #/pump; its learner PIN says hello as `pump`; before C2 the host does not sign it in; granted, the rack shows Room setup\'s channels and the programme, never the contents', async ({ page, browser, browserName }) => {
  test.setTimeout(180_000);
  await classroom();
  const code = await instructor(page, 'showcase-induction', { schema: 'pme-site/1', skin: 'saadat-like', theme: '', fps: 60, gasUnit: 'mmHg', sensorsOff: false, drugNames: 'us', defibModel: null, pumpRack: ['syringe', 'syringe', 'drip', 'syringe'] });
  const learnerPin = (await page.evaluate(() => localStorage.getItem('pme.learnerPin'))) as string;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true }); // a 10-inch tablet, landscape (§5)
  const p = await ctx.newPage();
  const hellos: Array<Record<string, unknown>> = [];
  const refused: string[] = [];
  p.on('websocket', (w) => {
    w.on('framesent', (f) => {
      const m = JSON.parse(String(f.payload)) as Record<string, unknown>;
      if (m.kind === 'hello') hellos.push(m);
    });
    w.on('framereceived', (f) => void (/"relay":"error"/.test(String(f.payload)) && refused.push(String(f.payload))));
  });
  const shots = process.env.PME_A1_SHOTS;
  await p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws())}#/pick`);
  const card = p.locator('.join-card[data-show="pump"]');
  await expect(card.locator('h2')).toHaveText('Infusion pumps');
  await expect(card.locator('p').first()).toHaveText("A rack of syringe and drip pumps for infusions and TCI. Everything you set is recorded under this tablet's name.");
  if (shots) await card.screenshot({ path: `${shots}/155-${browserName}-card.png` });
  await card.locator('button').click();
  await expect(p).toHaveURL(new RegExp(`\\?join=${code}&relay=[^#]+#/pump$`));
  const form = p.locator('.ip-peer-form');
  await expect(form.getByRole('heading', { level: 1 })).toHaveText('Infusion pumps');
  await expect(form.getByLabel('Learner PIN')).toBeVisible();
  expect(hellos).toEqual([]);
  for (const d of learnerPin) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
  await p.locator('.ip-peer-go').click();
  await expect.poll(() => hellos.length).toBeGreaterThan(0);
  const key = (await p.evaluate(() => localStorage.getItem('pme.device'))) as string;
  for (const m of hellos) expect(m).toMatchObject({ role: 'pump', show: 'pump', device: key, pin: learnerPin });
  // Before C2 the host welcomes the tablet (it follows) but does not grant it: said in words, the form again
  await expect(p.locator('.ip-peer-error')).toHaveText("The instructor's computer did not sign this tablet in: its app does not take pump tablets yet.", { timeout: 20_000 });
  expect(refused).toEqual([]); // the relay refused nothing: the hello passed the guard and the relay
  expect(p.url()).not.toContain(learnerPin);

  // The rack in a browser: sign in again, and the TEST grants it through the host's own grant method (not a product path)
  type PumpW = { __pmePumpPage: { follower(): { peerId: string } | null } };
  type HostG = { __pmeApp: { session: { relay: unknown; host: { grant(t: unknown, to: string, granted: boolean): void } } } };
  for (const d of learnerPin) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
  await p.locator('.ip-peer-go').click();
  const from = await p.waitForFunction(() => (window as unknown as PumpW).__pmePumpPage.follower()?.peerId ?? null).then((h) => h.jsonValue() as Promise<string>);
  await page.evaluate((to) => { const s = (window as unknown as HostG).__pmeApp.session; s.host.grant(s.relay, to, true); }, from);
  await expect(p.locator('.pump-status')).toHaveText(`Signed in as the room's infusion pumps · ${code}`);
  const faces = p.locator('.pump-face');
  await expect(faces).toHaveCount(4);
  expect(await faces.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.kind))).toEqual(['syringe', 'syringe', 'drip', 'syringe']);
  // no monitor on the tablet, and none of its sound
  await expect(p.locator('.stage')).toBeHidden();
  await expect(p.getByRole('button', { name: /^Sound|Silence/ })).toHaveCount(0);
  // the instructor's own command path loads channel 1 (a mismatch) and channel 3 (a drip bag), E1's `pump` event
  const send = (event: Record<string, unknown>) => page.evaluate((e) => (window as unknown as W).__pmeApp.link.send({ type: 'applyEvent', event: e }), { kind: 'pump', ...event });
  const steps: Array<Record<string, unknown>> = [
    { action: 'load', ch: 1, channel: 'syringe', contents: { drugId: 'remifentanil', concentration: { amount: 50, unit: 'mcg', perMl: 1 }, volumeMl: 50 }, syringeMl: 50 },
    { action: 'program', ch: 1, drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 } },
    { action: 'rate', ch: 1, rate: 20, unit: 'mL/h' },
    { action: 'start', ch: 1 },
    { action: 'load', ch: 3, channel: 'drip', contents: { drugId: 'norepinephrine', concentration: { amount: 4, unit: 'mg', perMl: 250 }, volumeMl: 250 } },
    { action: 'program', ch: 3, drugId: 'norepinephrine', concentration: { amount: 4, unit: 'mg', perMl: 250 }, set: 20 },
    { action: 'rate', ch: 3, rate: 30, unit: 'drops/min', limitMl: 100 },
    { action: 'start', ch: 3 },
  ];
  // the engine checks a pump event against the channels as they are, and applies it a tick later: each step is sent
  // once the one before it has applied (a refused send applies nothing, so sending it again is safe)
  for (const e of steps) await expect.poll(async () => (await send(e)).accepted, { message: JSON.stringify(e), timeout: 10_000, intervals: [200] }).toBe(true);
  const one = p.locator('.pump-face[data-ch="1"]');
  const three = p.locator('.pump-face[data-ch="3"]');
  // the faces follow the engine's 1 Hz `drugs` event: each channel is awaited running before its fields are read
  await expect(one).toHaveAttribute('data-state', 'running', { timeout: 20_000 });
  await expect(three).toHaveAttribute('data-state', 'running', { timeout: 20_000 });
  await expect(one.locator('[data-face="programmed"]')).toHaveText('Propofol 10 mg/mL');
  await expect(one.locator('[data-field="rate"] dd')).toHaveText('20 mL/h');
  await expect(one.locator('[data-field="dose"] dd')).toHaveText('200 mg/h');
  await expect(three.locator('[data-face="programmed"]')).toHaveText('Norepinephrine 4 mg in 250 mL');
  await expect(three.locator('[data-field="rate"] dd')).toHaveText('30 drops/min');
  await expect(three.locator('[data-field="rateOther"] dd')).toHaveText('90 mL/h');
  await expect(three.locator('[data-field="limit"] dd')).toHaveText('100 mL');
  // the contents of channel 1's syringe are nowhere in the tablet's page (§8)
  expect(await p.content()).not.toMatch(/remifentanil|50 µg|mcg/i);
  // a change on Room setup reaches the tablet at once: five channels, the fifth a drip
  await page.evaluate(() => (window as unknown as { __pmeApp: { session: { setPumpRack(k: string[]): void } } }).__pmeApp.session.setPumpRack(['syringe', 'syringe', 'drip', 'syringe', 'drip']));
  await expect(faces).toHaveCount(5);
  await expect(p.locator('.pump-rack')).toHaveAttribute('data-rows', '2');
  if (shots) await p.screenshot({ path: `${shots}/155-${browserName}-rack.png`, fullPage: true });
  await ctx.close();
});
