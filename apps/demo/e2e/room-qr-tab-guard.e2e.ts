// Post-demo (4 November): the two classroom fixes from the demo night test.
// (1) The Room's QR at 1920×1080 was 220 px, a fifth of the height: "Show large" (or Q) shows the same QR — the same
//     modules, drawn as vector — at least 70 % of the viewport height, with the code, the address and the count beneath;
//     Escape or Q returns.
// (2) A second instructor tab of the same browser no longer starts a new session silently: it offers the live one
//     (host-guard.ts). "Open that tab's session here" runs the same code with the running case and the first tab
//     stops; "Start a new session" gives a new code and the other tab carries on.
// (4) Room plan R7: Room setup on a relay — a device that picked the Monitor is a row of the table with the relay's ping
//     and what it shows; its name, typed over it, is kept under its key; "New room code" asks first, then reloads the
//     page under the new code and stores it, and the device stays on the old code (a grey "expected, not connected"
//     row under its kept name).
// (3) The first tab asleep (5 November: on WebKit in CI the first tab, now in the background, did not answer the 200 ms
//     ask, so no dialog and a new code): the browser's lock manager says the session exists, so the dialog appears; the
//     hand-over waits for the tab and completes when it runs again. Playwright cannot hide or suspend a page, so the
//     background tab is stood in for as a browser makes one: hidden first (visibilityState overridden and
//     visibilitychange dispatched, as fx14-pause-while-hidden does: the app pauses its own session and its worker runs
//     the hidden pump, as in a real hidden tab), then suspended: its main thread parked in a synchronous request that
//     the test answers only when the tab is to wake, so none of its tasks run and it uses no CPU meanwhile.
//     Two earlier stand-ins did not hold: Chromium's CDP frozen state still delivered BroadcastChannel messages at once,
//     and a 12 s busy loop kept the tab's engine worker running and its main thread spinning, so on the 2-vCPU CI runner
//     the waking tab and the new tab's restore fought over the cores and the restore toast came late or not at all
//     (runs 41929876356, 41946822037). A suspended tab costs nothing; this one now costs nothing.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
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

type W = { __pmeApp: { session: { code: string; paused: boolean; driver: { runner: { doc: { id: string } } | null } }; link: { log: Array<{ text: string }> } } };
/** The restore after the hand-over, as the page reports it: the toast's text is also the Log's line (main.ts link.note),
 *  which stays. The 4-s toast itself can be gone before a slow runner looks (as reload-keeps-case found on CI WebKit,
 *  run 40180609451; here run 41961260591: this file's line-87 test, attempt 0, no toast in 20 s, passed on retry). */
const restoredNote = (p: Page) => p.evaluate(() => (window as unknown as W).__pmeApp.link.log.find((e) => e.text.startsWith('Restored after the move from the other tab'))?.text ?? null);
const codeOf = (p: Page) => p.evaluate(() => (window as unknown as W).__pmeApp.session.code);

test.describe('the Room at 1920×1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });
  test('"Show large" and Q: the same QR at ≥ 70 % of the height, the code, the address and the count beneath', async ({ page }) => {
    test.setTimeout(90_000);
    const dir = mkdtempSync(join(tmpdir(), 'room-qr-'));
    writeFileSync(join(dir, 'index.html'), '<!doctype html>'); // the Room reads `serves`; the pages come from Vite here
    relay = await startRelay({ port: 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
    await openApp(page, base, `?relay=${encodeURIComponent(`ws://127.0.0.1:${relay.port}/`)}#/room`, { warmMs: 500 });
    const code = await codeOf(page);
    const card = page.locator('section.room-join .room-qr svg');
    await expect(card).toBeVisible();
    const small = (await card.boundingBox())!;
    const big = page.locator('dialog.room-big');
    const bigSvg = big.locator('.room-big-qr svg');

    await page.getByRole('button', { name: 'Show large' }).click();
    await expect(big).toBeVisible();
    const box = (await bigSvg.boundingBox())!;
    console.log(`[room-qr] 1920×1080: card QR ${small.width}×${small.height} px, large QR ${box.width}×${box.height} px (${((100 * box.height) / 1080).toFixed(1)} % of the height)`);
    expect(box.height).toBeGreaterThanOrEqual(0.7 * 1080);
    expect(box.width).toBe(box.height);
    expect(box.y + box.height).toBeLessThanOrEqual(1080);
    // the same symbol as the card's: the same modules (one path), so the same address; vector at both sizes
    const symbol = (sel: string) => page.locator(sel).evaluate((s) => `${s.getAttribute('viewBox')} ${s.querySelector('path')?.getAttribute('d')}`);
    expect(await symbol('dialog.room-big .room-big-qr svg')).toBe(await symbol('section.room-join .room-qr svg'));
    await expect(big.locator('.room-big-code')).toBeVisible();
    await expect(big.locator('.room-big-code')).toHaveText(code);
    // R4: the address of the QR, which opens the instrument picker
    await expect(big.locator('.room-big-url')).toHaveText(new RegExp(`^http://\\d+\\.\\d+\\.\\d+\\.\\d+:${relay.port}/\\?join=${code}#/pick$`));
    await expect(big.locator('.room-big-count')).toHaveText('0 phones following');
    const below = async (sel: string) => (await big.locator(sel).boundingBox())!.y >= box.y + box.height;
    expect(await below('.room-big-code')).toBe(true);
    expect(await below('.room-big-url')).toBe(true);
    expect((await big.locator('.room-big-count').boundingBox())!.y + 10).toBeLessThanOrEqual(1080);

    if (process.env.ROOM_QR_SHOT) await page.screenshot({ path: process.env.ROOM_QR_SHOT });
    await page.keyboard.press('Escape');
    await expect(big).toBeHidden();
    await page.keyboard.press('q');
    await expect(big).toBeVisible();
    await page.keyboard.press('q');
    await expect(big).toBeHidden();
    // Q does nothing on another page
    await page.evaluate(() => (location.hash = '#/scenarios'));
    await page.keyboard.press('q');
    await expect(big).toBeHidden();
  });
});

test('R7 Room setup on a relay: the Monitor device with its ping, its name kept; "New room code" asks, reloads under the new code and stores it', async ({ page, browser, browserName }) => {
  test.setTimeout(120_000);
  const dir = mkdtempSync(join(tmpdir(), 'room-setup-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  // a 2 s heartbeat (the kit's is 10 s) so the first ping is measured within the test; port in this suite's range (9250–9259)
  relay = await startRelay({ port: 9251, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer', heartbeatMs: 2000 });
  const ws = `ws://127.0.0.1:${relay.port}/`;
  await openApp(page, base, `?relay=${encodeURIComponent(ws)}#/room`, { warmMs: 500 });
  const code = await codeOf(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Room setup');

  // a device that chose "Patient monitor" on the picker
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const tablet = await (await browser.newContext(dev)).newPage();
  await tablet.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws)}#/monitor/wide`);
  await expect(tablet.locator('.follower-bar .status-pill')).toHaveText(`Following session ${code}`, { timeout: 30_000 });
  const row = page.locator('.room-table tbody tr[data-show="monitor"]');
  await expect(row.locator('td').nth(2)).toHaveText('Monitor');
  await expect(row.locator('.room-ping')).toHaveText(/^\d+ ms$/, { timeout: 15_000 });
  await expect(page.locator('.room-status')).toHaveAttribute('data-level', 'stable');
  await expect(page.locator('.room-status small')).toHaveText(/^2 devices · worst ping \d+ ms$/);
  console.log(`[room-setup] ${browserName}: ${JSON.stringify(await page.locator('.room-table tbody tr').evaluateAll((trs) => trs.map((tr) => [...(tr as HTMLTableRowElement).cells].slice(1).map((td) => td.querySelector('input')?.placeholder ?? td.textContent))))}; box "${await page.locator('.room-status').innerText()}"`);
  if (process.env.ROOM_SETUP_SHOT) {
    await page.screenshot({ path: `${process.env.ROOM_SETUP_SHOT}-top.png` });
    await page.locator('section.room-setup').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${process.env.ROOM_SETUP_SHOT}-foot.png` });
  }
  const key = await row.getAttribute('data-device');
  expect(key).toMatch(/^[a-z0-9]{8,16}$/);
  await row.locator('input.room-name').fill('Projector tablet');
  await row.locator('input.room-name').press('Enter');
  await expect.poll(() => page.evaluate((k) => JSON.parse(localStorage.getItem('pme.roomLayout') ?? '{}')[k!]?.name, key)).toBe('Projector tablet');

  // "New room code": asked first; Keep changes nothing
  await page.getByRole('button', { name: 'New room code' }).click();
  const ask = page.locator('dialog.room-renew');
  await expect(ask).toBeVisible();
  await expect(ask).toContainText(`The phones and screens following ${code} will stay on it`);
  await ask.getByRole('button', { name: `Keep ${code}` }).click();
  await expect(ask).toBeHidden();
  expect(await codeOf(page)).toBe(code);
  await page.getByRole('button', { name: 'New room code' }).click();
  await ask.getByRole('button', { name: 'Make a new code' }).click();
  await page.waitForURL((u) => u.searchParams.get('session') !== code, { timeout: 30_000 });
  await page.waitForFunction(() => '__pmeApp' in window, null, { timeout: 30_000 });
  const fresh = await codeOf(page);
  expect(fresh).toMatch(/^[A-Z0-9]{6}$/);
  expect(new URL(page.url()).searchParams.get('session')).toBe(fresh);
  expect(await page.evaluate(() => localStorage.getItem('pme.roomCode'))).toBe(fresh);
  await expect(page.locator('.room-code-now')).toHaveText(fresh);
  // the tablet stays on the old code; its kept name is a grey row of the new room
  expect(new URL(tablet.url()).searchParams.get('join')).toBe(code);
  const grey = page.locator(`.room-table tbody tr[data-device="${key}"]`);
  await expect(grey).toHaveAttribute('data-level', 'absent');
  await expect(grey.locator('input.room-name')).toHaveValue('Projector tablet');
  await expect(grey.locator('td').nth(3)).toHaveText('expected, not connected');
  await tablet.context().close();
});

test('a second instructor tab is asked: "open that session here" takes the code and the case; "start a new session" does not', async ({ context }) => {
  test.setTimeout(120_000);
  const a = await context.newPage();
  await openApp(a, base, '?scenario=acls-vf-witnessed', { warmMs: 3000 }); // a case under way: its position is kept every 1 s
  const code = await codeOf(a);

  // B: the app's address typed again, no ?session=
  const b = await context.newPage();
  await b.goto(`${base}/`);
  const ask = b.locator('dialog.host-guard');
  await expect(ask).toBeVisible();
  await expect(ask).toContainText(`A classroom session is already running in another tab (code ${code})`);
  expect(await b.evaluate(() => '__pmeApp' in window)).toBe(false); // nothing started before the choice
  await ask.getByRole('button', { name: "Open that tab's session here" }).click();
  await b.waitForFunction(() => '__pmeApp' in window);
  expect(await codeOf(b)).toBe(code);
  expect(new URL(b.url()).searchParams.get('session')).toBe(code);
  await expect.poll(() => restoredNote(b), { timeout: 20_000, message: 'the restore is reported' }).toMatch(/^Restored after the move from the other tab: /);
  expect(await b.evaluate(() => (window as unknown as W).__pmeApp.session.driver.runner?.doc.id)).toBe('acls-vf-witnessed');
  // A stopped and says where the session went
  await expect(a.getByRole('heading', { name: 'This session moved to another tab' })).toBeVisible();
  expect(new URL(a.url()).searchParams.get('moved')).toBe(code);

  // C: asked about B's session; "start a new session" = a new code, and B carries on
  const c = await context.newPage();
  await c.goto(`${base}/`);
  await expect(c.locator('dialog.host-guard')).toContainText(`(code ${code})`);
  await c.getByRole('button', { name: 'Start a new session' }).click();
  await c.waitForFunction(() => '__pmeApp' in window);
  expect(await codeOf(c)).not.toBe(code);
  await b.waitForTimeout(500);
  expect(await codeOf(b)).toBe(code);
  expect(new URL(b.url()).searchParams.get('moved')).toBeNull();
});

/** The page's own visibility, as fx14-pause-while-hidden sets it (Playwright cannot hide a page). */
const setHidden = (p: Page, hidden: boolean) =>
  p.evaluate((x) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (x ? 'hidden' : 'visible') });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => x });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);

/** Put page `a` to sleep as a browser does a background tab: hidden (the app pauses itself), then suspended (its main
 *  thread parked in a synchronous request this test holds open). Resolves once it is parked, with its wake: the request
 *  answered, the page running again and shown. */
async function putToSleep(a: Page): Promise<() => Promise<void>> {
  await setHidden(a, true);
  await expect.poll(() => a.evaluate(() => (window as unknown as W).__pmeApp.session.paused)).toBe(true);
  let arrived!: () => void;
  let answer!: () => void;
  const parkedThere = new Promise<void>((r) => (arrived = r));
  const answered = new Promise<void>((r) => (answer = r));
  const srv = createServer((_req, res) => {
    arrived();
    void answered.then(() => res.writeHead(200, { 'access-control-allow-origin': '*', 'content-type': 'text/plain' }).end('awake'));
  });
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${(srv.address() as AddressInfo).port}/park`;
  const parked = a.evaluate((u) => {
    const x = new XMLHttpRequest();
    x.open('GET', u, false); // synchronous: the page runs nothing until it is answered
    x.send();
  }, url);
  await parkedThere;
  return async () => {
    answer();
    await parked;
    srv.close();
    // Shown again (the instructor clicks it); a tab that has already handed over and moved has no page left to show
    await setHidden(a, false).catch(() => undefined);
  };
}

test('the first tab asleep (a background tab): the dialog still appears; the hand-over completes when that tab wakes', async ({ context }) => {
  test.setTimeout(120_000);
  const a = await context.newPage();
  await openApp(a, base, '?scenario=acls-vf-witnessed', { warmMs: 3000 });
  const code = await codeOf(a);
  // A tab that went to sleep in the background had kept its case long before (every SAVE_MS = 1 s, position.ts; not
  // while hidden); on the 2-vCPU CI runner the first save can come after the 3 s warm-up. So it sleeps once it is kept.
  await a.waitForFunction(() => sessionStorage.getItem('pme.position') !== null, undefined, { timeout: 20_000 });
  const wake = await putToSleep(a); // asleep until wake(): past B's load, the dialog, the click and TAKE_MS

  const b = await context.newPage();
  await b.goto(`${base}/`);
  const ask = b.locator('dialog.host-guard');
  await expect(ask).toBeVisible(); // from the browser's lock manager: A answered nothing
  await expect(ask).toContainText(`(code ${code})`);
  await ask.getByRole('button', { name: "Open that tab's session here" }).click();
  // A has not handed over: B waits for it, says so, and has started nothing
  const wait = b.locator('dialog.host-wait');
  await expect(wait).toBeVisible();
  await expect(wait).toContainText(`(code ${code})`);
  expect(await b.evaluate(() => '__pmeApp' in window)).toBe(false);

  await wake();
  await b.waitForFunction(() => '__pmeApp' in window);
  await expect(wait).toBeHidden();
  expect(await codeOf(b)).toBe(code);
  await expect.poll(() => restoredNote(b), { timeout: 20_000, message: 'the restore is reported' }).toMatch(/^Restored after the move from the other tab: /);
  expect(await b.evaluate(() => (window as unknown as W).__pmeApp.session.driver.runner?.doc.id)).toBe('acls-vf-witnessed');
  // A stops on B's receipt, which it reads after the 12 s of work it was kept from (its engine's frames queued
  // meanwhile): on the CI runner that took longer than the 5 s default (run 41929876356, first attempt)
  await expect(a.getByRole('heading', { name: 'This session moved to another tab' })).toBeVisible({ timeout: 20_000 });
});
