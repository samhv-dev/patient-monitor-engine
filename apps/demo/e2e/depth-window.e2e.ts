// EEG plan E12 (docs/plans/stage-eeg-depth-of-anaesthesia.md §7 E12): the depth-of-anaesthesia window in the room. The
// room's device is the generic processed-EEG reader (Room setup's choice, kept in the site profile); the host switches
// the patient's EEG on with it at the patient's mount. A phone over the relay opens the picker (`#/pick`), taps "Depth of
// anaesthesia" and follows the host's device at `#/depth`: the window's own engine reads the same samples (D3), so the
// spectral edge it SHOWS is the host engine's own SEF at the same sim time, and after a propofol bolus given on the host
// it falls, still the host's value reading after reading. The Room page's table lists the phone with `show: 'depth'`. While
// the Ventilator view drives the patient the window holds like every network follower, and follows again once the view
// closes. One case runs through a relay in its own process: the BUILT kit's (PME_KIT_RELAY=<kit>/server/relay.mjs), or
// without it the source relay's own bin, never the in-process relay the other cases use (a defect found on 11 November:
// an in-process relay can hide a host that acknowledges without applying).
// Ports: PME_E2E_PORT for Vite, PME_E2E_RELAY_PORT for the relays (that port + the worker index; the separate-process
// relay + 5); unset, the system picks free ones.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { devices, expect, test, type Browser, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { startRelay } from '../../../packages/controller/relay/server.ts';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type HostW = {
  __pmeApp: { session: { code: string; monitor: { on(fn: (e: { type: string; t: number; values?: Record<string, { value: number | null }> }) => void): () => void } }; link: { send(c: unknown): Promise<{ accepted: boolean; reason?: string }> } };
  __hostSef?: Record<string, number | null>;
};
type FolW = { __pmeFollower?: { sync: { status: string; resyncs: number } | null } };

const relayPort = (offset: number) => {
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  return fixed ? fixed + offset + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0;
};
const staticDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'e12-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>'); // the Room page reads `serves`; the pages come from Vite here
  return dir;
};

/** A relay in a process of its own: the built kit's when PME_KIT_RELAY names it, else the source relay's bin. */
async function processRelay(port: number): Promise<{ port: number; close(): Promise<void> }> {
  const kit = process.env.PME_KIT_RELAY;
  const args = kit
    ? [kit]
    : ['--experimental-strip-types', '--no-warnings', resolve(import.meta.dirname, '../../../packages/controller/relay/bin.ts')];
  args.push('--port', String(port), '--host', '127.0.0.1', '--remote-roles', 'viewer', '--static', staticDir());
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('WS_NO_')));
  const proc = spawn(process.execPath, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  let closing = false;
  const exited = new Promise<number | null>((r) => proc.once('exit', (code) => r(code)));
  const got = await new Promise<number>((ok, no) => {
    const onData = (d: Buffer) => {
      out += d;
      const m = /ready on ws:\/\/[^:]+:(\d+)\//.exec(out);
      if (m) ok(Number(m[1]));
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    void exited.then((code) => no(new Error(`relay exited before ready (${code}): ${out}`)));
  });
  console.log(`[E12] relay in its own process: ${kit ? `the built kit's ${kit}` : 'the source relay bin'} on ${got}`);
  return {
    port: got,
    close: async () => {
      if (proc.exitCode !== null || proc.signalCode !== null) {
        if (!closing) throw new Error(`the relay exited during the test (${proc.exitCode ?? proc.signalCode}): ${out.slice(-600)}`);
        return;
      }
      closing = true;
      proc.kill('SIGTERM');
      await exited;
    },
  };
}

/** The host: a free-run patient, the room's depth device the generic reader; its own engine's SEF kept by sim time. */
async function host(page: Page, ws: string): Promise<string> {
  await openApp(page, base, `?relay=${encodeURIComponent(ws)}#/teach2`, { warmMs: 1500, site: { eegModel: 'generic' } });
  await page.evaluate(() => {
    const w = window as unknown as HostW;
    w.__hostSef = {};
    w.__pmeApp.session.monitor.on((e) => {
      const v = e.type === 'measurement' ? e.values?.sef : undefined;
      if (v) (w.__hostSef as Record<string, number | null>)[String(e.t)] = v.value;
    });
  });
  return page.evaluate(() => (window as unknown as HostW).__pmeApp.session.code);
}

/** A phone (iPhone 13 on WebKit, Pixel 7 on Chromium) that scanned the room's QR: the picker, then Depth of anaesthesia. */
async function depthPhone(browser: Browser, browserName: string, code: string, ws: string): Promise<Page> {
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const p = await (await browser.newContext(dev)).newPage();
  await p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws)}#/pick`);
  const card = p.locator('.join-card[data-show="depth"]');
  await expect(card.locator('.st')).toHaveText('Ready');
  await card.getByRole('button', { name: 'Show here' }).click();
  await expect(p).toHaveURL(/#\/depth$/);
  await p.waitForFunction(() => (window as unknown as FolW).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000 });
  await expect(p.locator('.depth-window')).toHaveAttribute('data-on', 'true', { timeout: 15_000 });
  return p;
}

/** What the window shows now — the SEF as drawn and the sim time of its reading — and the host engine's SEF then. */
async function reading(p: Page, page: Page): Promise<{ t: number; shown: string; host: string | null }> {
  const r = await p.evaluate(() => ({ t: (document.querySelector('.depth-window') as HTMLElement).dataset.t ?? '', shown: document.querySelector('.depth-tile[data-id="sef"] .v')?.textContent ?? '' }));
  // the host is ahead of its followers by a frame or so: wait for its reading at that time
  await expect.poll(() => page.evaluate((t) => (window as unknown as HostW).__hostSef?.[t] !== undefined, r.t), { timeout: 5000 }).toBe(true);
  const h = await page.evaluate((t) => (window as unknown as HostW).__hostSef?.[t] ?? null, r.t);
  return { t: Number(r.t), shown: r.shown, host: h === null ? null : h.toFixed(1) };
}

/** The window's SEF is the host's own at its reading's time (at least `n` readings apart), and it is returned. */
async function sameAsHost(p: Page, page: Page, n = 3): Promise<number[]> {
  const seen: number[] = [];
  let last = -1;
  while (seen.length < n) {
    const r = await reading(p, page);
    if (r.t !== last) {
      expect(r.shown, `the window's SEF at ${r.t} s is the host engine's`).toBe(r.host);
      seen.push(Number(r.shown));
      last = r.t;
    }
    await p.waitForTimeout(400);
  }
  return seen;
}

/**
 * Propofol 2 mg/kg on the host, at ×4, and the window's SEF read until it lies DROP_HZ below `before`, the LOWEST of the
 * awake readings: the awake SEF scatters by 1–3 Hz from one reading to the next (27.7, 26.9, 25.1 Hz in the first local
 * run), so 5 Hz under the lowest is the drug's effect, not the scatter [ENG: test].
 */
async function bolusMoves(page: Page, p: Page, before: number): Promise<number> {
  const DROP_HZ = 5;
  expect(await page.evaluate(() => (window as unknown as HostW).__pmeApp.link.send({ type: 'applyEvent', event: { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' } }))).toMatchObject({ accepted: true });
  expect(await page.evaluate(() => (window as unknown as HostW).__pmeApp.link.send({ type: 'time', action: 'scale', value: 4 }))).toMatchObject({ accepted: true });
  let after = before;
  await expect.poll(async () => {
    const r = await reading(p, page);
    expect(r.shown, `the window's SEF at ${r.t} s is the host engine's`).toBe(r.host);
    after = Number(r.shown);
    return before - after;
  }, { timeout: 90_000, intervals: [1000] }).toBeGreaterThanOrEqual(DROP_HZ);
  await page.evaluate(() => (window as unknown as HostW).__pmeApp.link.send({ type: 'time', action: 'scale', value: 1 }));
  return after;
}

test("a phone picks Depth of anaesthesia, shows the host's device and its SEF falls after propofol on the host; the Room table says show: 'depth'", async ({ page, browser, browserName }) => {
  test.setTimeout(240_000);
  const relay = await startRelay({ port: relayPort(0), host: '127.0.0.1', staticDir: staticDir(), remoteRoles: 'viewer' });
  try {
    const ws = `ws://127.0.0.1:${relay.port}/`;
    const code = await host(page, ws);
    const p = await depthPhone(browser, browserName, code, ws);
    await expect(p.locator('.depth-label')).toHaveText('Processed EEG (generic)');
    await expect(p.locator('.depth-face .depth-sim')).toHaveText('SIMULATION · not a clinical monitor');
    // one instrument per screen: no patient-monitor control and no alarm sound here
    expect(await p.getByRole('button').evaluateAll((bs) => bs.filter((b) => (b as HTMLElement).offsetParent !== null).map((b) => b.textContent))).toEqual([]);
    const awake = await sameAsHost(p, page, 5);
    console.log(`[E12] ${browserName}: awake SEF ${awake.join(', ')} Hz`);
    // the Room page's table: the phone, showing the depth device
    await page.evaluate(() => (location.hash = '#/room'));
    const row = page.locator('.room-table tbody tr[data-show="depth"]');
    await expect(row.locator('td').nth(2)).toHaveText('Depth of anaesthesia', { timeout: 15_000 });
    await expect(row.locator('td').nth(3)).not.toHaveText('Not available yet');
    await page.evaluate(() => (location.hash = '#/teach2'));
    const before = Math.min(...awake);
    const after = await bolusMoves(page, p, before);
    console.log(`[E12] ${browserName}: SEF ${before} → ${after} Hz after propofol 2 mg/kg (the host's own value each read)`);
    await sameAsHost(p, page, 2);
    await p.context().close();
  } finally {
    await relay.close();
  }
});

test('while the Ventilator view drives the patient the depth window holds; it follows the host again once the view closes', async ({ page, browser, browserName }) => {
  test.skip(browserName === 'webkit' && !!process.env.CI, 'FALLBACK ruling 2026-10-12 (S12-F1), as mobile-learner.e2e.ts: the hidden cockpit iframe is throttled on CI Linux WebKit, so the hold ends; macOS WebKit and CI Chromium run it');
  test.setTimeout(180_000);
  const relay = await startRelay({ port: relayPort(0), host: '127.0.0.1', staticDir: staticDir(), remoteRoles: 'viewer' });
  try {
    const ws = `ws://127.0.0.1:${relay.port}/`;
    const code = await host(page, ws);
    const p = await depthPhone(browser, browserName, code, ws);
    await page.evaluate(() => (location.hash = '#/vent'));
    await expect(p.locator('.learner-hold')).toBeVisible({ timeout: 10_000 });
    await expect(p.locator('.follower-bar .status-pill')).toHaveText('The ventilator is on the main screen: this monitor waits until it closes');
    // held: the reading on screen stays (its clock is still), and no snapshot storm
    const held = await p.locator('.depth-window').getAttribute('data-t');
    const r0 = await p.evaluate(() => (window as unknown as FolW).__pmeFollower?.sync?.resyncs ?? 0);
    await p.waitForTimeout(6000);
    expect(await p.locator('.depth-window').getAttribute('data-t')).toBe(held);
    expect((await p.evaluate(() => (window as unknown as FolW).__pmeFollower?.sync?.resyncs ?? 0)) - r0).toBeLessThanOrEqual(1);
    await page.evaluate(() => (location.hash = '#/teach2'));
    await expect(p.locator('.learner-hold')).toBeHidden({ timeout: 5000 });
    await p.waitForFunction(() => (window as unknown as FolW).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000 });
    await expect.poll(async () => Number(await p.locator('.depth-window').getAttribute('data-t')), { timeout: 15_000 }).toBeGreaterThan(Number(held));
    await sameAsHost(p, page, 2);
    await p.context().close();
  } finally {
    await relay.close();
  }
});

test("through a relay in its own process (the built kit's): the phone's depth window is the host's device, and propofol moves it", async ({ page, browser, browserName }) => {
  test.setTimeout(240_000);
  const relay = await processRelay(relayPort(5));
  try {
    const ws = `ws://127.0.0.1:${relay.port}/`;
    const code = await host(page, ws);
    const p = await depthPhone(browser, browserName, code, ws);
    const awake = await sameAsHost(p, page, 5);
    const after = await bolusMoves(page, p, Math.min(...awake));
    console.log(`[E12] ${browserName} (relay process): awake SEF ${awake.join(', ')} Hz → ${after} Hz after propofol`);
    await p.context().close();
  } finally {
    await relay.close();
  }
});
