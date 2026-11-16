// A screen set up as one of the room's instruments stays that instrument when it reloads (or its browser restores the
// tab): the same address, the same title, the same instrument on the screen, and its hellos still name it. Each window
// follows the instructor's session over the in-process relay (`?join=`), as a tablet in the room does.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle;
test.beforeAll(async () => {
  ({ vite, base } = await startVite());
  const dir = mkdtempSync(join(tmpdir(), 'reload-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>'); // the Room page reads `serves`; the pages come from Vite here
  relay = await startRelay({ port: 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
});
test.afterAll(async () => {
  await relay?.close();
  await vite?.close();
});

type W = { __pmeApp: { session: { code: string } }; __pmeFollower?: { sync: { status: string } | null } };

const layout = (p: Page) => p.evaluate(() => document.documentElement.dataset.learner ?? null);
const INSTRUMENTS = [
  { hash: '#/monitor', show: 'learner', name: 'Learner monitor', is: async (p: Page) => expect(await layout(p)).toBe('phone') },
  { hash: '#/monitor/wide', show: 'monitor', name: 'Patient monitor', is: async (p: Page) => expect(await layout(p)).toBeNull() },
  { hash: '#/defib', show: 'defib', name: 'Defibrillator', is: (p: Page) => expect(p.locator('.defib-readout')).toHaveText('120 J', { timeout: 10_000 }) },
  { hash: '#/depth', show: 'depth', name: 'Depth of anaesthesia', is: (p: Page) => expect(p.locator('.depth-window')).toBeVisible() },
];

for (const { hash, show, name, is } of INSTRUMENTS) {
  test(`the ${name} window at ${hash} is the ${name} again after a reload`, async ({ page, browser }) => {
    test.setTimeout(120_000);
    const ws = `ws://127.0.0.1:${relay.port}/`;
    await openApp(page, base, `?relay=${encodeURIComponent(ws)}&scenario=showcase-induction`, { warmMs: 1500, site: { defibModel: 'generic' } });
    const code = await page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
    const ctx = await browser.newContext();
    const win = await ctx.newPage();
    const hellos: Array<Record<string, unknown>> = [];
    win.on('websocket', (s) => s.on('framesent', (f) => {
      const m = JSON.parse(String(f.payload)) as Record<string, unknown>;
      if (m.kind === 'hello') hellos.push(m);
    }));
    const url = `${base}/?join=${code}&relay=${encodeURIComponent(ws)}${hash}`;
    await win.goto(url);
    for (const load of ['opened', 'reloaded']) {
      await win.waitForFunction(() => (window as unknown as W).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000, polling: 250 });
      expect(win.url(), load).toBe(url);
      await expect(win).toHaveTitle(`${name}: patient monitor simulator`);
      await is(win);
      expect(hellos.length, load).toBeGreaterThan(0);
      for (const m of hellos) expect(m, load).toMatchObject({ show });
      hellos.length = 0;
      if (load === 'opened') await win.reload();
    }
    await ctx.close();
  });
}
