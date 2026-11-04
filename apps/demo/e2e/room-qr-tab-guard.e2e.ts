// Post-demo (4 November): the two classroom fixes from the demo night test.
// (1) The Room's QR at 1920×1080 was 220 px, a fifth of the height: "Show large" (or Q) shows the same QR — the same
//     modules, drawn as vector — at least 70 % of the viewport height, with the code, the address and the count beneath;
//     Escape or Q returns.
// (2) A second instructor tab of the same browser no longer starts a new session silently: it offers the live one
//     (host-guard.ts). "Open that tab's session here" runs the same code with the running case and the first tab
//     stops; "Start a new session" gives a new code and the other tab carries on.
// (3) The first tab asleep (5 November: on WebKit in CI the first tab, now in the background, did not answer the 200 ms
//     ask, so no dialog and a new code): the browser's lock manager says the session exists, so the dialog appears; the
//     hand-over waits for the tab and completes when it runs again. Playwright keeps every page "visible" and has no
//     control that suspends one, so the sleeping background tab is stood in for by the first tab's main thread held
//     busy: none of its timers or messages run until it ends, as in a tab the browser has suspended. (Chromium's
//     CDP frozen state was tried and does not hold back BroadcastChannel messages: the frozen tab answered at once.)
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => relay?.close());

type W = { __pmeApp: { session: { code: string; driver: { runner: { doc: { id: string } } | null } } } };
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
    await expect(big.locator('.room-big-url')).toHaveText(new RegExp(`^http://\\d+\\.\\d+\\.\\d+\\.\\d+:${relay.port}/\\?join=${code}$`));
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
  await expect(b.locator('.toast', { hasText: 'Restored after the move from the other tab' })).toBeVisible({ timeout: 20_000 });
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

/** Put page `a` to sleep for `ms` (its main thread held busy: it runs nothing else); resolves with the wait for its wake. */
async function putToSleep(a: Page, ms: number): Promise<() => Promise<void>> {
  const busy = a.evaluate((n) => {
    const end = performance.now() + n;
    while (performance.now() < end); // the page runs nothing else
  }, ms);
  await new Promise((r) => setTimeout(r, 100)); // the loop has begun
  return async () => void (await busy);
}

test('the first tab asleep (a background tab): the dialog still appears; the hand-over completes when that tab wakes', async ({ context }) => {
  test.setTimeout(120_000);
  const a = await context.newPage();
  await openApp(a, base, '?scenario=acls-vf-witnessed', { warmMs: 3000 });
  const code = await codeOf(a);
  const wake = await putToSleep(a, 12_000); // past B's load, the dialog, the click and TAKE_MS (2 s): the notice shows

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
  await expect(b.locator('.toast', { hasText: 'Restored after the move from the other tab' })).toBeVisible({ timeout: 20_000 });
  expect(await b.evaluate(() => (window as unknown as W).__pmeApp.session.driver.runner?.doc.id)).toBe('acls-vf-witnessed');
  await expect(a.getByRole('heading', { name: 'This session moved to another tab' })).toBeVisible();
});
