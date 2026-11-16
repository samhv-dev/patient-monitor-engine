// The instructor's computer reloads mid-case, and every device that was signed in comes back by itself: the learner
// remote, the pump tablet, the instructor's phone and the ventilator's own page each stay on their page, and their next
// hello proves the ticket the host handed them (no PIN, no keystroke); the Room page shows the returning device as the
// same row. And the case that must ask: the learner PIN changed while a phone was away; back, it asks for the new PIN
// and says why. Every device runs through the in-process classroom relay, as mobile-learner.e2e.ts runs it.
// PME_E2E_PORT and PME_E2E_RELAY_PORT (+ the worker's index) keep Vite and the relay inside a machine's port range.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devices, expect, test, type Browser, type BrowserContext, type Page, type WebSocketRoute } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => relay?.close());

const KEY = 'resume000001';
const ws = () => `ws://127.0.0.1:${relay!.port}/`;
type HostW = { __pmeApp: { session: { code: string } } };
type VentW = { __pmeVentDevice?: { state: string; sender: string | null } };
type Hello = { kind: 'hello'; role: string; pin?: string; ticket?: string; from: string };

async function classroom(): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'resume-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  relay = await startRelay({ port: fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer', log: () => undefined });
}
/** The laptop on the Instructor view (`hash`), with a rack of two syringe pumps; the room code and both PINs. */
async function laptop(page: Page, hash = '#/teach2'): Promise<{ code: string; learnerPin: string; instructorPin: string }> {
  await openApp(page, base, `?relay=${encodeURIComponent(ws())}&scenario=showcase-anaphylaxis${hash}`, { warmMs: 1500, site: { schema: 'pme-site/1', pumpRack: ['syringe', 'syringe'] } });
  return page.evaluate(() => ({ code: (window as unknown as HostW).__pmeApp.session.code, learnerPin: localStorage.getItem('pme.learnerPin') as string, instructorPin: localStorage.getItem('pme.instructorPin') as string }));
}
/** The laptop's page reloads: its case comes back (position.ts), and so does its book of signed-in devices. */
async function reload(page: Page): Promise<void> {
  await page.reload();
  await page.waitForFunction(() => '__pmeApp' in window);
}
/** A device's context, with every hello it says and every frame it receives over the relay kept. */
async function deviceContext(browser: Browser, o: { phone?: 'Pixel 7' | 'iPhone 13'; tablet?: boolean }): Promise<{ ctx: BrowserContext; p: Page; hellos: Hello[]; received: string[] }> {
  const { defaultBrowserType: _b, ...phone } = devices[o.phone ?? 'Pixel 7'] as (typeof devices)[string];
  const ctx = await browser.newContext(o.tablet ? { viewport: { width: 1280, height: 800 }, hasTouch: true } : phone);
  await ctx.addInitScript((k) => localStorage.setItem('pme.device', k), KEY);
  const p = await ctx.newPage();
  const hellos: Hello[] = [];
  const received: string[] = [];
  p.on('websocket', (w) => {
    w.on('framesent', (fr) => {
      const m = JSON.parse(String(fr.payload)) as Partial<Hello>;
      if (m.kind === 'hello') hellos.push(m as Hello);
    });
    w.on('framereceived', (fr) => void received.push(String(fr.payload)));
  });
  return { ctx, p, hellos, received };
}
async function typePin(p: Page, pin: string): Promise<void> {
  for (const d of pin) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
  await p.locator('.ip-peer-go').click();
}
/** The hellos said after the laptop's reload: at least one, every one proving a ticket, none carrying a PIN. */
function provedTicketOnly(hellos: Hello[], from: number): void {
  const after = hellos.slice(from);
  expect(after.length).toBeGreaterThan(0);
  for (const h of after) {
    expect(h.ticket, 'a ticket').toBeTruthy();
    expect(h).not.toHaveProperty('pin');
  }
}
/** The Room page's row of this device: one, signed in. */
async function oneRoomRow(page: Page): Promise<void> {
  await page.evaluate(() => (location.hash = '#/room'));
  const row = page.locator(`.room-table tr[data-device="${KEY}"]`);
  await expect(row).toHaveCount(1, { timeout: 15_000 });
  await expect(row).toContainText('granted', { timeout: 15_000 });
}

test('the learner remote returns by itself after the laptop reloads: no PIN, no keystroke, the same Room row; no other phone hears a ticket', async ({ page, browser, browserName }) => {
  test.setTimeout(180_000);
  await classroom();
  const { code, learnerPin } = await laptop(page);
  const d = await deviceContext(browser, { phone: browserName === 'webkit' ? 'iPhone 13' : 'Pixel 7' });
  await d.p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws())}#/remote/learner`);
  await typePin(d.p, learnerPin);
  const signed = d.p.locator('.lr-status');
  await expect(signed).toHaveText(`Signed in as a learner remote · ${code}`, { timeout: 20_000 });
  const monitor = await deviceContext(browser, { phone: browserName === 'webkit' ? 'iPhone 13' : 'Pixel 7' });
  await monitor.p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws())}#/monitor`);
  await expect(monitor.p.locator('.status-pill').first()).toContainText(code, { timeout: 20_000 });
  const before = d.hellos.length;
  await reload(page);
  await expect(signed).toHaveText(`Signed in as a learner remote · ${code}`, { timeout: 30_000 });
  await expect(d.p.locator('.ip-peer-form')).toBeHidden();
  provedTicketOnly(d.hellos, before);
  await oneRoomRow(page);
  expect(monitor.received.some((f) => f.includes('"ticket"')), "a learner monitor never receives another device's ticket").toBe(false);
  await d.ctx.close();
  await monitor.ctx.close();
});

test('the pump tablet returns by itself after the laptop reloads, its rack still there', async ({ page, browser }) => {
  test.setTimeout(180_000);
  await classroom();
  const { code, learnerPin } = await laptop(page);
  const d = await deviceContext(browser, { tablet: true });
  await d.p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws())}#/pump`);
  await typePin(d.p, learnerPin);
  const signed = d.p.locator('.pump-status');
  await expect(signed).toHaveText(`Signed in as the room's infusion pumps · ${code}`, { timeout: 20_000 });
  await expect(d.p.locator('.pump-face')).toHaveCount(2);
  const before = d.hellos.length;
  await reload(page);
  await expect(signed).toHaveText(`Signed in as the room's infusion pumps · ${code}`, { timeout: 30_000 });
  await expect(d.p.locator('.pump-face')).toHaveCount(2);
  await expect(d.p.locator('.ip-peer-form')).toBeHidden();
  provedTicketOnly(d.hellos, before);
  await oneRoomRow(page);
  await d.ctx.close();
});

test("the instructor's phone returns by itself after the laptop reloads, its panel still there", async ({ page, browser, browserName }) => {
  test.setTimeout(180_000);
  await classroom();
  const { code, instructorPin } = await laptop(page);
  const d = await deviceContext(browser, { phone: browserName === 'webkit' ? 'iPhone 13' : 'Pixel 7' });
  await d.p.goto(`${base}/?relay=${encodeURIComponent(ws())}#/remote?code=${code}`);
  await typePin(d.p, instructorPin);
  const signed = d.p.locator('.ip-peer-status');
  await expect(signed).toHaveText(`Signed in as the instructor's remote · ${code}`, { timeout: 20_000 });
  const before = d.hellos.length;
  await reload(page);
  await expect(d.p.locator('.ip-peer-notice')).toContainText("The instructor's computer restarted", { timeout: 30_000 });
  await expect(signed).toHaveText(`Signed in as the instructor's remote · ${code}`, { timeout: 30_000 });
  await expect(d.p.locator('.ip-peer-form')).toBeHidden();
  provedTicketOnly(d.hellos, before);
  await d.ctx.close();
});

test("the ventilator's own page returns by itself after the laptop reloads, on the same socket", async ({ page, browser }) => {
  test.setTimeout(180_000);
  await classroom();
  const { code, instructorPin } = await laptop(page, '#/vent');
  const d = await deviceContext(browser, { tablet: true });
  await d.p.goto(`${base}/vent-hamilton.html?join=${code}&relay=${encodeURIComponent(ws())}#/vent`);
  await d.p.locator('.ip-peer-pin').fill(instructorPin);
  await d.p.getByRole('button', { name: 'Sign in' }).click();
  await d.p.waitForFunction(() => (window as unknown as VentW).__pmeVentDevice?.state === 'granted', null, { timeout: 20_000 });
  const sender = await d.p.evaluate(() => (window as unknown as VentW).__pmeVentDevice?.sender);
  const before = d.hellos.length;
  await reload(page);
  await d.p.waitForFunction((was) => {
    const v = (window as unknown as VentW).__pmeVentDevice;
    return v?.state === 'granted' && v.sender === was;
  }, sender, { timeout: 30_000 });
  await expect(d.p.locator('.ip-peer-form')).toBeHidden();
  provedTicketOnly(d.hellos, before);
  await d.ctx.close();
});

test('the learner PIN changed while a phone was away and the laptop reloaded: back, the phone asks for the new learner PIN and says why', async ({ page, browser, browserName }) => {
  test.setTimeout(180_000);
  await classroom();
  const { code, learnerPin } = await laptop(page);
  const d = await deviceContext(browser, { phone: browserName === 'webkit' ? 'iPhone 13' : 'Pixel 7' });
  // the phone's link to the relay, cut and restored by the test (a phone out of Wi-Fi range)
  let away = false;
  const open: WebSocketRoute[] = [];
  await d.p.routeWebSocket((u) => u.port === String(relay!.port), (route) => {
    if (away) return void route.close();
    route.connectToServer();
    open.push(route);
  });
  await d.p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws())}#/remote/learner`);
  await typePin(d.p, learnerPin);
  await expect(d.p.locator('.lr-status')).toHaveText(`Signed in as a learner remote · ${code}`, { timeout: 20_000 });
  away = true;
  for (const r of open.splice(0)) await r.close();
  await page.evaluate(() => (location.hash = '#/room'));
  await page.locator('.lr-pin-change').click();
  const changed = await page.evaluate(() => localStorage.getItem('pme.learnerPin'));
  expect(changed).not.toBe(learnerPin);
  await reload(page);
  const before = d.hellos.length;
  away = false;
  await expect(d.p.locator('.ip-peer-form')).toBeVisible({ timeout: 30_000 });
  await expect(d.p.locator('.ip-peer-error')).toHaveText("The learner PIN was changed on the instructor's computer. Enter the new learner PIN.");
  provedTicketOnly(d.hellos, before);
  await typePin(d.p, changed as string);
  await expect(d.p.locator('.lr-status')).toHaveText(`Signed in as a learner remote · ${code}`, { timeout: 20_000 });
  await d.ctx.close();
});
