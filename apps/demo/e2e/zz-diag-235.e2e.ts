// DIAGNOSTIC for brief 235 (branch diag-233-vent-knob-webkit only; never merged). Deterministic: leftover pages ON
// PURPOSE. "File 1" opens a host, a ventilator device page signed in over the relay and a learner monitor, then closes
// its servers as its afterAll would but leaves the device page and the monitor open (as vent-window.e2e.ts and
// learner-defib.e2e.ts leave theirs). "File 2" starts its Vite on the SAME port (as `port: 0` gives 5173 to every file;
// here one fixed port of the brief's range so the rule on ports is kept), waits until the leftovers have reloaded onto
// it, then runs vent-edp-ts.e2e.ts:117's steps to line 136 in a fresh context. Every channel between pages is probed:
// the relay (the leftovers' own sockets), the Vite server's broadcasts, BroadcastChannel and localStorage on the one
// origin (with a same-context positive control). Variant "relay alive": file 1's relay and host stay up, so the leftover
// device keeps every chance it has to sign in again and send settings.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { devices, expect, test, type Browser, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';

const VITE_PORT = Number(process.env.DIAG235_VITE_PORT ?? 10410);
const RELAY_PORT = Number(process.env.DIAG235_RELAY_PORT ?? 10411);
const PIN = '3816';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

async function vite(log: string[]): Promise<ViteDevServer> {
  const v = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: VITE_PORT, strictPort: true, host: '127.0.0.1' }, logLevel: 'error' });
  const send = v.ws.send.bind(v.ws) as (...a: unknown[]) => void;
  (v.ws as unknown as { send: (...a: unknown[]) => void }).send = (...a: unknown[]) => { log.push(JSON.stringify(a).slice(0, 160)); send(...a); };
  await v.listen();
  return v;
}
async function relayUp(): Promise<RelayHandle> {
  const dir = mkdtempSync(join(tmpdir(), 'd235-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  return startRelay({ port: RELAY_PORT, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer', stateDir: mkdtempSync(join(tmpdir(), 'd235-state-')), isLocal: (_a, req) => !req?.url?.includes('e2e-remote'), log: () => undefined });
}
const dev = (b: string) => { const { defaultBrowserType: _d, ...d } = b === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7']; return d; };

/** File 1: a host, a signed-in ventilator device page (its own Pmax 40, the default, and its PEEP turned to 12 so its
 *  settings are its own) and a learner monitor; returns the two leftover pages and the host. */
async function file1(browser: Browser, browserName: string, base: string, ws: string) {
  const hctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const host = await hctx.newPage();
  await host.addInitScript((pin) => localStorage.setItem('pme.instructorPin', pin), PIN);
  await host.goto(`${base}/?relay=${encodeURIComponent(ws)}&scenario=showcase-anaphylaxis#/room`);
  await host.waitForFunction(() => '__pmeApp' in window);
  await host.waitForTimeout(1500);
  const code = await host.evaluate(() => (window as Any).__pmeApp.session.code as string);
  const tctx = await browser.newContext(dev(browserName));
  const dev1 = await tctx.newPage();
  await dev1.goto(`${base}/vent-hamilton.html?join=${code}&relay=${encodeURIComponent(`${ws}?e2e-remote`)}#/vent`);
  await dev1.locator('.ip-peer-pin').fill(PIN);
  await dev1.getByRole('button', { name: 'Sign in' }).click();
  await dev1.waitForFunction(() => (window as Any).__pmeVentDevice?.state === 'granted', null, { timeout: 15_000 });
  await dev1.waitForFunction(() => !!(window as Any).__vent, null, { timeout: 15_000 });
  await dev1.evaluate(() => (window as Any).__vent.vs.cfg.pmax as number);
  const mon = await (await browser.newContext(dev(browserName))).newPage();
  await mon.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws)}#/monitor`);
  await mon.waitForFunction(() => (window as Any).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000 });
  // the channels on the shared origin, written by the leftovers' contexts: a BroadcastChannel that keeps posting (the
  // ventilator's own name pattern) and a localStorage key; and one more page in the device's context (positive control)
  for (const p of [dev1, mon]) {
    await p.evaluate(() => {
      const c = new BroadcastChannel('pme-vent/d235');
      setInterval(() => c.postMessage({ v: 1, kind: 'settings', cfg: { pmax: 40 } }), 100);
      localStorage.setItem('d235.leftover', location.href);
    });
  }
  return { host, hctx, dev1, mon, code };
}

/** File 2's page in a fresh context: vent-edp-ts.e2e.ts:117 to line 136, plus what the page heard on the channels. */
async function file2(browser: Browser, base: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.addInitScript(() => {
    const w = window as Any;
    w.__heard = [];
    new BroadcastChannel('pme-vent/d235').onmessage = (e) => w.__heard.push(JSON.stringify(e.data));
  });
  await page.setViewportSize({ width: 1400, height: 820 });
  await page.goto(`${base}/vent-hamilton.html?face=edp-ts`);
  await expect(page.locator('main.edp')).toBeVisible({ timeout: 20_000 });
  const cfg = () => page.evaluate(() => (window as Any).__vent.vs.cfg.pmax as number);
  const peak = () => page.evaluate(() => (window as Any).__vent.vs.p.measured.PIP as number);
  await expect.poll(peak, { timeout: 20_000 }).toBeGreaterThan(10);
  const pmax0 = await cfg();
  const steps = pmax0 - Math.max(10, Math.floor((await peak()) - 5));
  await page.locator('[data-ctl="tag:pmax"]').click();
  for (let i = 0; i < steps; i++) await page.locator('.edp-knob').dispatchEvent('wheel', { deltaY: 100 });
  await page.locator('.edp-knob').click();
  const got = await cfg();
  await page.waitForTimeout(1500); // a second and a half more of the leftovers posting
  const heard = await page.evaluate(() => (window as Any).__heard as string[]);
  const ls = await page.evaluate(() => localStorage.getItem('d235.leftover'));
  const sockets = await page.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name).filter((n) => n.startsWith('ws')));
  await ctx.close();
  return { pmax0, steps, got, heard: heard.length, ls, errs, sockets };
}

for (const relayAlive of [false, true]) {
  test(`diag 235: leftover device page + learner monitor reloaded onto the next file's server, then :117 (relay ${relayAlive ? 'alive' : 'closed'})`, async ({ browser, browserName }) => {
    test.setTimeout(150_000);
    const log1: string[] = [];
    const log2: string[] = [];
    let relay: RelayHandle | null = await relayUp();
    const ws = `ws://127.0.0.1:${relay.port}/`;
    const v1 = await vite(log1);
    const base = `http://127.0.0.1:${VITE_PORT}`;
    const f1 = await file1(browser, browserName, base, ws);
    // positive control: a page in the leftover device's OWN context hears its BroadcastChannel and sees its storage
    const ctl = await f1.dev1.context().newPage();
    await ctl.goto(`${base}/vent-hamilton.html`);
    const ctlHeard = await ctl.evaluate(() => new Promise<number>((r) => { let n = 0; const c = new BroadcastChannel('pme-vent/d235'); c.onmessage = () => n++; setTimeout(() => r(n), 1000); }));
    const ctlLs = await ctl.evaluate(() => localStorage.getItem('d235.leftover'));
    await ctl.close();
    const navs: string[] = [];
    for (const [n, p] of [['device', f1.dev1], ['monitor', f1.mon]] as const) p.on('framenavigated', (fr) => { if (fr === p.mainFrame()) navs.push(`${n} ${fr.url().replace(/relay=[^&#]+/, 'relay=…')}`); });
    // file 1's afterEach/afterAll: the page fixture's context (the host) closes; the servers close; the leftovers stay
    if (!relayAlive) { await f1.hctx.close(); await relay.close(); relay = null; }
    await v1.close();
    await new Promise((r) => setTimeout(r, 1500));
    // file 2: its server on the same port
    const v2 = await vite(log2);
    await expect.poll(() => navs.length, { timeout: 20_000, message: 'the leftovers reload onto the new server' }).toBeGreaterThanOrEqual(2);
    await f1.dev1.waitForLoadState('load');
    await f1.mon.waitForLoadState('load');
    await f1.dev1.waitForTimeout(2000);
    const devAfter = await f1.dev1.evaluate(() => ({ state: (window as Any).__pmeVentDevice?.state ?? null, cockpit: !!(window as Any).__vent, pinForm: !!document.querySelector('.ip-peer-pin'), origin: location.origin }));
    const r = await file2(browser, base);
    const devLater = await f1.dev1.evaluate(() => ({ state: (window as Any).__pmeVentDevice?.state ?? null, cockpit: !!(window as Any).__vent }));
    const leftovers = browser.contexts().map((c) => c.pages().map((p) => p.url().replace(/relay=[^&#]+/, 'relay=…')));
    console.log(`diag235 ${JSON.stringify({ browser: browserName, relayAlive, ctlHeard, ctlLs: !!ctlLs, navs, devAfter, devLater, file2: r, viteBroadcasts1: log1, viteBroadcasts2: log2, leftovers })}`);
    await f1.dev1.context().close();
    await f1.mon.context().close();
    if (relayAlive) await f1.hctx.close();
    await v2.close();
    await relay?.close();
    expect(ctlHeard, 'positive control: the same context hears the channel').toBeGreaterThan(0);
    expect(r.got, ':117 line 136').toBe(r.pmax0 - r.steps);
    expect(r.heard, 'no BroadcastChannel message crosses contexts').toBe(0);
    expect(r.ls, 'no localStorage crosses contexts').toBeNull();
  });
}
