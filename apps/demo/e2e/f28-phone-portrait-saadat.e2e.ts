// F28: the Saadat-like follower on a phone held upright at its real visible height (iPhone Safari with its toolbars,
// 390 × 664, deviceScaleFactor 3) on Chromium and WebKit. Six lanes share ≈ 215 px (≈ 30–41 px each), and the three
// measurable facts of the owner's photo must hold: no IBP scale value inks over another, no lane label is erased by the
// speed text's cleared box, and the NIBP header stays inside its tile. The follower draws on the main thread, so the
// canvas text calls are recorded with their measured ink boxes.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devices, expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => relay?.close());
test.use({ viewport: { width: 1280, height: 800 } });

type T = { t: string; x: number; y: number; align: string; ch: number; l: number; r: number; top: number; bot: number };
const inter = (a: [number, number], b: [number, number]) => a[0] < b[1] && b[0] < a[1];

test('F28: the Saadat-like follower at 390 × 664 fits its short lanes and its tile headers', async ({ page, browser }) => {
  test.setTimeout(120_000);
  const dir = mkdtempSync(join(tmpdir(), 'f28-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  relay = await startRelay({ port: 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  await openApp(page, base, `?relay=${encodeURIComponent(`ws://127.0.0.1:${relay.port}/`)}`, { warmMs: 1500, site: { skin: 'saadat-like' } });
  const code = await page.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);

  const { defaultBrowserType: _b, viewport: _v, ...dev } = devices['iPhone 13'];
  const ctx = await browser.newContext({ ...dev, viewport: { width: 390, height: 664 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const f = await ctx.newPage();
  await f.addInitScript(() => {
    const log: unknown[] = ((window as unknown as { __f28: unknown[] }).__f28 = []);
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (this: CanvasRenderingContext2D, text: string, x: number, y: number, mw?: number) {
      const m = this.measureText(text);
      if (log.length < 50_000) log.push({ t: text, x, y, align: this.textAlign, ch: this.canvas.height, l: x - m.actualBoundingBoxLeft, r: x + m.actualBoundingBoxRight, top: y - m.actualBoundingBoxAscent, bot: y + m.actualBoundingBoxDescent });
      return mw === undefined ? fill.call(this, text, x, y) : fill.call(this, text, x, y, mw);
    };
  });
  await f.goto(`${base}/?join=${code}&relay=${encodeURIComponent(`ws://127.0.0.1:${relay.port}/`)}`);
  await f.waitForFunction(() => (window as unknown as { __pmeFollower?: { sync?: { status: string } } }).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000 });
  await f.waitForFunction(() => document.querySelector('.pme-stile[data-param="NIBP"] [data-pme="mode"]')?.textContent !== '', null, { timeout: 30_000 });
  await f.waitForTimeout(3000);

  // the texts of the final canvas geometry, once each
  const all = await f.evaluate(() => (window as unknown as { __f28: T[] }).__f28);
  const ch = all[all.length - 1]!.ch;
  const seen = new Map<string, T>();
  for (const e of all) if (e.ch === ch) seen.set(`${e.t}@${e.x},${e.y.toFixed(2)}`, e);
  const texts = [...seen.values()];

  // 1. the IBP scale values (left, numeric) never ink over each other
  const scale = texts.filter((e) => e.align !== 'right' && e.x <= 20 && /^-?\d+$/.test(e.t));
  expect(scale.map((e) => e.t)).toEqual(expect.arrayContaining(['200', '40', '30', '-10']));
  for (const [i, a] of scale.entries())
    for (const b of scale.slice(i + 1)) expect.soft(inter([a.l, a.r], [b.l, b.r]) && inter([a.top, a.bot], [b.top, b.bot]), `${a.t} over ${b.t}`).toBe(false);

  // 2. the lane labels (IBP, RESP, NORMAL) are drawn and no right-hand text's cleared box (y − 2 … y + 16) reaches the ink of another
  const right = texts.filter((e) => e.align === 'right');
  expect(right.map((e) => e.t)).toEqual(expect.arrayContaining(['RESP', 'IBP', 'NORMAL']));
  for (const a of right) for (const b of right) if (a !== b) expect.soft(inter([a.y - 2, a.y + 16], [b.top, b.bot]), `${a.t} clears ${b.t}`).toBe(false);

  // 3. the NIBP header stays inside its tile; the idle message bar paints no empty box
  const head = await f.evaluate(() => {
    const tile = document.querySelector('.pme-stile[data-param="NIBP"]') as HTMLElement;
    const h = tile.querySelector('.h') as HTMLElement;
    const bar = document.querySelector('.pme-bar') as HTMLElement;
    return { sw: h.scrollWidth, cw: h.clientWidth, hr: h.getBoundingClientRect().right, tr: tile.getBoundingClientRect().right, bar: bar.textContent ? null : getComputedStyle(bar).backgroundColor };
  });
  expect.soft(head.sw).toBeLessThanOrEqual(head.cw);
  expect.soft(head.hr).toBeLessThanOrEqual(head.tr);
  if (head.bar !== null) expect.soft(head.bar).toBe('rgba(0, 0, 0, 0)');
  await ctx.close();
});
