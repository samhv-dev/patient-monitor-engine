// Plan room-and-instruments.md §7 R8d: the ventilator on its own screen. (1) The laptop window: Room setup's opener
// "Ventilator in a new window" opens the cockpit (`vent-hamilton.html?link=<code>`, BroadcastChannel, no PIN: the same
// browser is trusted, §4 D9); while it is open it drives the patient and the phones hold; closing it hands the patient to
// the engine's own ventilator and the phones follow again. (2) A tablet over the in-process relay, marked as another
// device (`?e2e-remote`, as instructor-pin.test.ts marks one): the room's QR address opens the picker; Ventilator →
// "Show here" → P7's PIN form; a wrong PIN is refused; the right one signs it in as the `ventilator` role and the cockpit
// drives full screen; 5 s offline → the host hands over within 1 s of the silence and the patient stays ventilated;
// back online the cockpit signs in again and takes over from the engine's settings; silent with its socket left open (its
// sends held), it is handed over by the host's 1 s watchdog and takes over again. (3) The PIN never appears in an
// address, the QR, the relay's `room.json` or a learner's frames.
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devices, expect, test, type Browser, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => relay?.close());

/** A test PIN for the host (drawn for this file; the host keeps it in its store, instructor-pin.ts). */
const PIN = '3816';
type Truth = { tree?: { resp?: { driver?: { source?: string; vent?: Record<string, number> } } } };
type W = {
  __pmeFollower: { sync: { status: string; resyncs: number } | null };
  __pmeApp: {
    session: { code: string; simNow(): number; ventLink: unknown; last: { truth?: Truth; state?: { breathing?: { source: string } } } };
    link: { send(c: unknown): Promise<{ accepted: boolean }>; ctl: { measurements: Record<string, { value: number | null } | undefined> } };
  };
  __vent?: { vs: { cfg: Record<string, unknown> }; paused: boolean };
  __pmeVentDevice?: { state: string; sender: string | null };
  __r8d?: { unlinkedAt: number | null };
};

const ws = () => `ws://127.0.0.1:${relay!.port}/`;
/** The relay as the classroom runs it (app folder, phones may only follow, the room code kept in `stateDir`); a socket
 *  whose address carries `e2e-remote` is another device. */
async function classroom(): Promise<string> {
  const dir = mkdtempSync(join(tmpdir(), 'r8d-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const stateDir = mkdtempSync(join(tmpdir(), 'r8d-state-'));
  relay = await startRelay({ port: 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer', stateDir, isLocal: (_a, req) => !req?.url?.includes('e2e-remote'), log: () => undefined });
  return stateDir;
}
async function host(page: Page, hash: string): Promise<string> {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.addInitScript((pin) => localStorage.setItem('pme.instructorPin', pin), PIN);
  await openApp(page, base, `?relay=${encodeURIComponent(ws())}&scenario=showcase-anaphylaxis${hash}`, { warmMs: 1500 });
  return page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
}
const device = (browserName: string) => {
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  return dev;
};
/** A learner phone; every frame it receives over the relay is kept (the PIN-secrecy check). */
async function phone(browser: Browser, browserName: string, code: string): Promise<{ p: Page; frames: string[] }> {
  const p = await (await browser.newContext(device(browserName))).newPage();
  const frames: string[] = [];
  p.on('websocket', (s) => s.on('framereceived', (f) => void frames.push(String(f.payload))));
  await p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws())}#/monitor`);
  await p.waitForFunction(() => (window as unknown as W).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000 });
  return { p, frames };
}
/** Who ventilates the host's patient now (the engine's truth), and its ventilator's settings. */
const patient = (p: Page) =>
  p.evaluate(() => {
    const a = (window as unknown as W).__pmeApp;
    const r = a.session.last.truth?.tree?.resp;
    return { source: r?.driver?.source ?? a.session.last.state?.breathing?.source ?? '?', vent: r?.driver?.vent ?? null, spo2: a.link.ctl.measurements.spo2?.value ?? null };
  });
const cockpitCfg = (p: Page) =>
  p.evaluate(() => {
    const c = (window as unknown as W).__vent;
    return c ? { mode: c.vs.cfg.mode, rate: c.vs.cfg.rate, vt: c.vs.cfg.vt, peep: c.vs.cfg.peep, fio2: c.vs.cfg.fio2, paused: c.paused } : null;
  });
const ventRow = (p: Page) => p.locator('.room-table tbody tr', { hasText: 'Ventilator' });

test('the laptop window: the Room opener opens the cockpit in its own window, it drives, closing it hands over, the phones hold then follow', async ({ page, browser, browserName }) => {
  test.setTimeout(240_000);
  await classroom();
  const code = await host(page, '#/room');
  const { p: f } = await phone(browser, browserName, code);

  const [win] = await Promise.all([page.context().waitForEvent('page'), page.getByRole('button', { name: 'Ventilator in a new window' }).click()]);
  await win.waitForLoadState();
  expect(new URL(win.url()).search).toBe(`?link=${code}`);
  await win.waitForFunction(() => '__vent' in window);
  await expect.poll(async () => (await patient(page)).source, { timeout: 15_000, message: 'the window cockpit drives the patient' }).toBe('external');
  await expect(f.locator('.learner-hold')).toBeVisible({ timeout: 10_000 });
  await expect(ventRow(page)).toContainText('driving');
  expect((await cockpitCfg(win))?.paused).toBe(false);

  const held = (await f.evaluate(() => (window as unknown as W).__pmeFollower.sync!.resyncs));
  await win.close();
  // the engine's own ventilator takes the patient with the window's settings; the phones are released and follow
  await expect.poll(async () => (await patient(page)).source, { timeout: 5000, message: 'handed over to the engine ventilator' }).toBe('ventilator');
  await expect(f.locator('.learner-hold')).toBeHidden({ timeout: 5000 });
  await f.waitForFunction(() => (window as unknown as W).__pmeFollower?.sync?.status === 'synced', null, { timeout: 15_000 });
  await page.waitForTimeout(5000);
  expect(await f.evaluate(() => (window as unknown as W).__pmeFollower.sync!.resyncs) - held, 'one resync when the hold ends, then none').toBeLessThanOrEqual(1);
  expect((await patient(page)).source).toBe('ventilator');
  await expect(ventRow(page)).toContainText('handed over');
});

test('a tablet over the relay: picker → Ventilator → PIN → cockpit; a wrong PIN is refused; 5 s offline hands over within 1 s, back online it signs in again; the PIN stays secret', async ({ page, browser, browserName }) => {
  test.setTimeout(300_000);
  const stateDir = await classroom();
  const code = await host(page, '#/room');
  // the room's own QR address, as the tablet's camera reads it
  const qrUrl = (await page.locator('section.room-join .phones-url').textContent()) ?? '';
  expect(qrUrl).toMatch(new RegExp(`\\?join=${code}#/pick$`));
  const learner = await phone(browser, browserName, code);

  const tctx = await browser.newContext(device(browserName));
  const t = await tctx.newPage();
  const visited: string[] = [];
  t.on('framenavigated', (fr) => void visited.push(fr.url()));
  await t.goto(`${base}/?join=${code}&relay=${encodeURIComponent(`${ws()}?e2e-remote`)}#/pick`);
  await t.locator('.join-card[data-show="vent"]').getByRole('button', { name: 'Show here' }).click();
  await expect(t).toHaveURL(new RegExp(`/vent-hamilton\\.html\\?join=${code}&relay=[^#]+#/vent$`));

  // a wrong PIN is refused, and says so
  const wrong = PIN.replace(/^./, (d) => String((Number(d) + 1) % 10));
  await t.locator('.ip-peer-pin').fill(wrong);
  await t.getByRole('button', { name: 'Sign in' }).click();
  await expect(t.locator('.ip-peer-error')).toHaveText(/Wrong PIN/, { timeout: 10_000 });
  expect(await t.evaluate(() => '__vent' in window), 'no cockpit before the grant').toBe(false);
  expect((await patient(page)).source).not.toBe('external');

  // the right PIN: the cockpit full screen, driving the patient
  await t.locator('.ip-peer-pin').fill(PIN);
  await t.getByRole('button', { name: 'Sign in' }).click();
  await t.waitForFunction(() => (window as unknown as W).__pmeVentDevice?.state === 'granted', null, { timeout: 15_000 });
  await expect(t.locator('.ip-peer-form')).toBeHidden();
  await expect(t.locator('#screen')).toBeVisible();
  await expect.poll(async () => (await patient(page)).source, { timeout: 15_000, message: 'the tablet drives the patient' }).toBe('external');
  await expect(learner.p.locator('.learner-hold')).toBeVisible({ timeout: 10_000 });
  await expect(ventRow(page)).toContainText('driving');
  const first = await t.evaluate(() => (window as unknown as W).__pmeVentDevice!.sender);

  /** Watch, on the host, for the moment its desk unlinks the cockpit (the hand-over starts). */
  const watchUnlink = () =>
    page.evaluate(() => {
      const w = window as unknown as W;
      w.__r8d = { unlinkedAt: null };
      const tick = () => {
        if (w.__pmeApp.session.ventLink === null && w.__r8d!.unlinkedAt === null) w.__r8d!.unlinkedAt = Date.now();
        else if (w.__r8d!.unlinkedAt === null) setTimeout(tick, 5);
      };
      tick();
    });

  // Silence with the socket left open (a Wi-Fi that stalls without the browser noticing): the tablet's frames stop
  // leaving it (the test holds its WebSocket's sends for 3 s); the host's 1 s watchdog hands over; the patient stays
  // ventilated; when its frames come again the cockpit takes over
  await watchUnlink();
  const mutedAt = await t.evaluate(() => {
    const ws = WebSocket.prototype as unknown as { send: (d: unknown) => void; __send?: (d: unknown) => void };
    ws.__send = ws.send;
    ws.send = () => undefined;
    return Date.now();
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__r8d!.unlinkedAt), { timeout: 5000 }).not.toBeNull();
  const silentMs = (await page.evaluate(() => (window as unknown as W).__r8d!.unlinkedAt))! - mutedAt;
  console.log(`[R8d] ${browserName}: hand-over ${silentMs} ms after the tablet fell silent (socket open)`);
  // [ENG: ui] COCKPIT_SILENCE_MS (1 s, views/vent.ts), less the up to 20 ms batch already on its way, plus 250 ms for
  // the watchdog's timer and the host page's 5 ms poll
  expect(silentMs).toBeGreaterThanOrEqual(950);
  expect(silentMs).toBeLessThanOrEqual(1250);
  await expect.poll(async () => (await patient(page)).source, { timeout: 5000 }).toBe('ventilator');
  await page.waitForTimeout(1500);
  await t.evaluate(() => {
    const ws = WebSocket.prototype as unknown as { send: (d: unknown) => void; __send?: (d: unknown) => void };
    ws.send = ws.__send!;
  });
  await expect.poll(async () => (await patient(page)).source, { timeout: 15_000, message: 'its frames again: the tablet drives again' }).toBe('external');

  // 5 s offline: the host hands over within 1 s of the silence; the patient is ventilated throughout
  await watchUnlink();
  const offAt = Date.now();
  await tctx.setOffline(true);
  const sources = new Set<string>();
  for (let i = 0; i < 25; i++) {
    sources.add((await patient(page)).source);
    await page.waitForTimeout(200);
  }
  const unlinkedAt = await page.evaluate(() => (window as unknown as W).__r8d!.unlinkedAt);
  expect(unlinkedAt, 'the host handed the silent cockpit over').not.toBeNull();
  const lateMs = unlinkedAt! - offAt;
  console.log(`[R8d] ${browserName}: hand-over ${lateMs} ms after the tablet went offline`);
  // [ENG: ui] COCKPIT_SILENCE_MS (1 s, views/vent.ts) plus 250 ms: the watchdog's timer, the last 20 ms batch, and
  // Playwright's call latency between Date.now() here and setOffline reaching the browser
  expect(lateMs).toBeLessThanOrEqual(1250);
  await expect.poll(async () => (await patient(page)).source, { timeout: 5000 }).toBe('ventilator');
  sources.add((await patient(page)).source);
  expect([...sources].every((s) => s === 'external' || s === 'ventilator'), `who ventilated during the silence: ${[...sources].join(', ')}`).toBe(true);
  // the instructor sets the engine's ventilator while the tablet is away
  expect(await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 16, vtMl: 450, peep: 6, fio2: 0.5 } }).then((r) => r.accepted))).toBe(true);
  await expect.poll(async () => (await patient(page)).vent).toMatchObject({ rr: 16, vt: 450, peep: 6 });

  // back online: a new socket, a new hello with the PIN the page holds, and the cockpit takes over from the engine's settings
  await tctx.setOffline(false);
  await t.waitForFunction((was) => { const d = (window as unknown as W).__pmeVentDevice; return d?.state === 'granted' && d.sender !== was; }, first, { timeout: 20_000 });
  await expect.poll(async () => (await patient(page)).source, { timeout: 15_000, message: 'the tablet drives again' }).toBe('external');
  expect(await cockpitCfg(t)).toMatchObject({ mode: 'VC', rate: 16, vt: 450, peep: 6, fio2: 50, paused: false });

  // the PIN in no address (the tablet's, the QR's), not in the relay's room.json, not in a learner's frames
  for (const u of [...visited, t.url(), qrUrl]) expect(u.includes(PIN), `an address: ${u}`).toBe(false);
  const roomFiles = readdirSync(stateDir);
  expect(roomFiles).toContain('room.json');
  for (const name of roomFiles) expect(readFileSync(join(stateDir, name), 'utf8').includes(PIN), name).toBe(false);
  expect(learner.frames.length).toBeGreaterThan(0);
  expect(learner.frames.filter((x) => x.includes('"pin"') || x.includes(`"${PIN}"`))).toEqual([]);
});
