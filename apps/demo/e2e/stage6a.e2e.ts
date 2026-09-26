// Stage 6a browser checks: host + remote + viewer over BroadcastChannel, the relay (WebSocket) and WebRTC,
// in one browser context. Starts its own Vite dev server and relay on free ports.
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';

// Headless Chrome cannot resolve the mDNS (.local) host candidates it hands out, so WebRTC on localhost needs
// real IPs. Headed browsers on a LAN resolve mDNS normally.

let vite: ViteDevServer;
let relay: RelayHandle;
let base = '';
let relayUrl = '';

test.beforeAll(async () => {
  relay = await startRelay({ port: 0, host: '127.0.0.1' });
  relayUrl = `ws://127.0.0.1:${relay.port}/`;
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
test.afterAll(async () => {
  await vite?.close();
  await relay?.close();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type W = { __pme6a: Record<string, any> };
/** Evaluate `fn(window)` in the page once the page has published window.__pme6a. */
async function g<T>(p: Page, fn: (w: W) => T): Promise<T> {
  await p.waitForFunction(() => '__pme6a' in window);
  return p.evaluate(`(${fn.toString()})(window)`) as Promise<T>;
}

async function trio(page: Page, via: 'bc' | 'relay' | 'rtc') {
  const ctx = page.context();
  const relayQ = via === 'bc' ? '' : `&relay=${encodeURIComponent(relayUrl)}`;
  await page.goto(`${base}/stage6a.html?session=E2E${via === 'bc' ? 'BCC' : via === 'relay' ? 'WSS' : 'RTC'}${relayQ}`);
  const session = await g(page, (w) => w.__pme6a.session as string);
  const remote = await ctx.newPage();
  await remote.goto(`${base}/stage6a-remote.html?session=${session}&via=${via}${relayQ}`);
  const viewer = await ctx.newPage();
  await viewer.goto(`${base}/stage6a-viewer.html?session=${session}&via=${via}${relayQ}`);
  await expect.poll(() => g(remote, (w) => w.__pme6a.remote.session?.hostOnline === true), { timeout: 10_000 }).toBe(true);
  await expect.poll(() => g(viewer, (w) => w.__pme6a.sync.status as string), { timeout: 10_000 }).toBe('synced');
  return { remote, viewer, session };
}

for (const via of ['bc', 'relay', 'rtc'] as const) {
  test(`host + remote + viewer over ${via}`, async ({ page, browserName }) => {
    // Headless WebKit on Linux CI cannot complete a loopback WebRTC ICE exchange (no host candidates);
    // the WebRTC transport is covered on Chromium and on real Safari by the LAN gate check.
    test.skip(via === 'rtc' && browserName === 'webkit', 'loopback WebRTC unsupported in headless WebKit');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const { remote, viewer } = await trio(page, via);
    for (let i = 0; i < 20; i++) {
      const r = await g(remote, (w) => w.__pme6a.fire());
      expect((r as { accepted: boolean }).accepted).toBe(true);
    }
    // FU-1: poll until all 20 commands are visible instead of asserting after a fixed 3 s wait
    await expect.poll(() => g(page, (w) => (w.__pme6a.timings as Array<{ visibleAt: number | null }>).filter((t) => t.visibleAt !== null).length), { timeout: 20_000 }).toBe(20);
    const v = await g(viewer, (w) => ({ status: w.__pme6a.sync.status, resyncs: w.__pme6a.sync.resyncs, lag: w.__pme6a.sync.lagS, drift: w.__pme6a.sync.beatDriftMs }));
    expect(v.status).toBe('synced');
    expect(v.drift).toBe(0);
    const timings = await g(page, (w) => w.__pme6a.timings as Array<{ visibleAt: number | null }>);
    expect(timings.filter((t) => t.visibleAt !== null).length).toBe(20);
    console.log(via, JSON.stringify(v));
    expect(errors).toEqual([]);
  });
}
