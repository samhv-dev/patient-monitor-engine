// E130: the instructor sets the IBP1/IBP2 lane scales in the Devices tab (a typed range, AUTO, the fixed default) and
// the instructor's monitor, a second-screen learner monitor and a phone over the relay all draw with the same setting
// (the canvas carries it as `data-ibp-scales`; the range AUTO picks from it is the renderer's deterministic judgement at
// 30-s sim-time boundaries, unit-tested in packages/renderer/test/ibp-scales.test.ts). PME_IBP_SHOTS=<dir> also saves
// the monitor of both skins at the fixed default, a typed range and AUTO.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devices, expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { go, openApp, startVite, tab } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeFollower?: { sync: { status: string } | null }; __pmeApp: { session: { code: string }; link: { send(c: unknown): Promise<{ accepted: boolean }> } } };
const scalesOf = (p: Page) => p.evaluate(() => (document.querySelector('.monitor-host canvas') as HTMLCanvasElement | null)?.dataset.ibpScales ?? null);
const lines = (p: Page) => p.locator('.monitor-host canvas');
async function lines2(p: Page): Promise<void> {
  for (const sensor of ['abp', 'cvp']) await p.evaluate((s) => (window as unknown as W).__pmeApp.link.send({ type: 'attachSensor', sensor: s, state: 'connected' }), sensor);
}
async function setRange(p: Page, ch: string, lo: number, hi: number): Promise<void> {
  const row = p.locator(`[data-ibp="${ch}"]`).first();
  await row.getByRole('button', { name: 'Range', exact: true }).click();
  await row.locator(`input[name="${ch.toLowerCase()}-lower"]`).fill(String(lo));
  await row.locator(`input[name="${ch.toLowerCase()}-upper"]`).fill(String(hi));
  await row.getByRole('button', { name: 'Apply range' }).click();
}
const mode = (p: Page, ch: string, name: string) => p.locator(`[data-ibp="${ch}"]`).first().getByRole('button', { name, exact: true }).click();
const synced = (f: Page) => f.waitForFunction(() => (window as unknown as W).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000, polling: 250 });

test('the Devices control sets the scales; the instructor\'s monitor and a second-screen learner monitor draw the same', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit' && !!process.env.CI, 'FALLBACK ruling 2026-10-11 (as learner-monitor-follows): BroadcastChannel between pages on Playwright Linux WebKit');
  test.setTimeout(120_000);
  await openApp(page, base, '#/teach', { warmMs: 1500, site: { skin: 'saadat-like' } });
  await lines2(page);
  await tab(page, 'devices');
  await expect(page.locator('[data-ibp="IBP1"] [data-ibp-now]').first()).toHaveText("Fixed 0–200 mmHg (the monitor's own scale)");
  await setRange(page, 'IBP1', 20, 180);
  await mode(page, 'IBP2', 'Auto');
  const want = JSON.stringify({ IBP1: { mode: 'custom', lower: 20, upper: 180 }, IBP2: { mode: 'auto' } });
  await expect.poll(() => scalesOf(page)).toBe(want);
  const code = await page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
  const f = await page.context().newPage();
  await f.goto(`${base}/?follow=${code}#/monitor`);
  await synced(f);
  await expect.poll(() => scalesOf(f), { timeout: 10_000 }).toBe(want); // at the follower's start (its ask)
  await mode(page, 'IBP1', 'Fixed');
  const fixed1 = JSON.stringify({ IBP2: { mode: 'auto' } });
  await expect.poll(() => scalesOf(page)).toBe(fixed1);
  await expect.poll(() => scalesOf(f), { timeout: 10_000 }).toBe(fixed1); // and at every change
  await expect(lines(f)).toBeVisible();
});

// PR #258 (uniform scaling): the Saadat-like monitor is laid out at its screenPx (1280 × 800) and scaled as one unit by
// k = min(W / 1280, H / 800). The IBP scale text and the lane's dotted lines are canvas drawing in the monitor's own
// (design) px, so they must follow k like every tile. Measured on the same-browser learner monitor (a main-thread
// canvas, worker 'off'; the instructor's monitor draws in a worker, whose canvas the page cannot read): every scale
// number's fillText and every scale dot's fillRect is recorded with the canvas transform, and the dots are read back
// from the canvas pixels. At 1280 × 800 and 1920 × 1080 the positions in design px are the same, the transform is
// devicePixelRatio × k, and each position on screen is the canvas's place plus k × its design position.
type Rec = { texts: Array<{ t: string; x: number; y: number }>; dots: Record<string, number>; a: number };
const recorder = () => {
  const w = window as unknown as { __ibpRec: Rec };
  w.__ibpRec = { texts: [], dots: {}, a: 0 };
  const P = CanvasRenderingContext2D.prototype;
  const fillText = P.fillText;
  P.fillText = function (this: CanvasRenderingContext2D, t: string, x: number, y: number, mw?: number) {
    if (/^-?\d+$/.test(t) && this.canvas.closest('.monitor-host')) {
      const m = this.getTransform();
      w.__ibpRec.a = m.a;
      w.__ibpRec.texts.push({ t, x: m.a * x + m.e, y: m.d * y + m.f });
    }
    return mw === undefined ? fillText.call(this, t, x, y) : fillText.call(this, t, x, y, mw);
  };
  const fillRect = P.fillRect;
  P.fillRect = function (this: CanvasRenderingContext2D, x: number, y: number, rw: number, rh: number) {
    const m = this.getTransform();
    if (rw === rh && rw * m.a <= 4 && this.canvas.closest('.monitor-host')) {
      const k = String(Math.round(m.d * y + m.f));
      w.__ibpRec.dots[k] = (w.__ibpRec.dots[k] ?? 0) + 1;
    }
    return fillRect.call(this, x, y, rw, rh);
  };
};

test('under #258\'s one scale factor k the IBP scale text and the dotted lines follow k (1280 × 800 and 1920 × 1080)', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit' && !!process.env.CI, 'FALLBACK ruling 2026-10-11 (as learner-monitor-follows): BroadcastChannel between pages on Playwright Linux WebKit');
  test.setTimeout(150_000);
  await openApp(page, base, '#/teach', { warmMs: 1500, site: { skin: 'saadat-like' } });
  await lines2(page);
  await tab(page, 'devices');
  const code = await page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
  const f = await page.context().newPage();
  await f.addInitScript(recorder);
  await f.goto(`${base}/?follow=${code}#/monitor`);
  await synced(f);
  await setRange(page, 'IBP1', 20, 180);
  await expect.poll(() => scalesOf(f), { timeout: 10_000 }).toBe(JSON.stringify({ IBP1: { mode: 'custom', lower: 20, upper: 180 } }));
  const at = async (width: number, height: number) => {
    await f.setViewportSize({ width, height });
    await f.waitForTimeout(1500);
    await f.evaluate(() => {
      const r = (window as unknown as { __ibpRec: Rec }).__ibpRec;
      r.texts = [];
      r.dots = {};
    });
    await mode(page, 'IBP1', 'Fixed'); // a redraw of the scale text, then back to the typed range
    await expect.poll(() => scalesOf(f), { timeout: 10_000 }).toBe('{}');
    await setRange(page, 'IBP1', 20, 180);
    await expect.poll(() => scalesOf(f), { timeout: 10_000 }).toBe(JSON.stringify({ IBP1: { mode: 'custom', lower: 20, upper: 180 } }));
    await f.waitForTimeout(3000); // the sweep repaints the dots across the lane
    return f.evaluate(() => {
      const rec = (window as unknown as { __ibpRec: Rec }).__ibpRec;
      const outer = document.querySelector<HTMLElement>('.monitor-host [data-pme-scale]') as HTMLElement;
      const c = document.querySelector<HTMLCanvasElement>('.monitor-host canvas') as HTMLCanvasElement;
      const b = c.getBoundingClientRect();
      const ctx = c.getContext('2d') as CanvasRenderingContext2D;
      const lit = (y: number) => {
        const d = ctx.getImageData(0, y, c.width, 1).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) if ((d[i] as number) + (d[i + 1] as number) + (d[i + 2] as number) > 150) n++;
        return n;
      };
      // a dotted line: a device row with many dots that are lit on the canvas (a trace crossing one row lights a few)
      const rows = Object.entries(rec.dots).filter(([, n]) => n >= 20).map(([y]) => Number(y)).filter((y) => lit(y) >= 20).sort((p, q) => p - q);
      const last = new Map<string, { x: number; y: number }>();
      for (const t of rec.texts) last.set(t.t, { x: t.x, y: t.y });
      return { k: Number(outer.dataset.pmeScale), dpr: devicePixelRatio, a: rec.a, rect: [b.left, b.top, b.width, b.height, c.offsetWidth, c.offsetHeight], rows, texts: Object.fromEntries(['180', '100', '20'].map((t) => [t, last.get(t) ?? null])) };
    });
  };
  const small = await at(1280, 800);
  const large = await at(1920, 1080);
  console.log(`E130 x #258 ${browserName}: ${JSON.stringify({ small, large })}`);
  for (const m of [small, large]) {
    expect(m.a, 'the canvas draws at devicePixelRatio x k').toBeCloseTo(m.dpr * m.k, 3);
    // offsetWidth rounds the layout width to a whole px, so the ratio is compared, to 0.005
    expect((m.rect[2] as number) / (m.rect[4] as number), 'the canvas is shown k times its layout width').toBeCloseTo(m.k, 2);
    expect(m.rows.length, 'the dotted lines are drawn').toBeGreaterThanOrEqual(3);
    for (const t of ['180', '100', '20'] as const) expect(m.texts[t], `the scale value ${t} is printed`).not.toBeNull();
  }
  expect(large.k / small.k, 'the factor follows the window').toBeGreaterThan(1.2);
  const design = (m: typeof small, v: number) => v / (m.dpr * m.k);
  const dS = small.rows.map((y) => design(small, y));
  const dL = large.rows.map((y) => design(large, y));
  expect(dL.length, 'the same dotted lines at both sizes').toBe(dS.length);
  dS.forEach((y, i) => expect(Math.abs((dL[i] as number) - y), `dotted line ${i} at the same design px`).toBeLessThan(1));
  // the IBP1 lane's lines (180, 100, 20) are the first three: the 100 line is midway, at both sizes
  for (const d of [dS, dL]) expect(Math.abs((d[1] as number) - ((d[0] as number) + (d[2] as number)) / 2), 'the 100 line midway between 180 and 20').toBeLessThan(1);
  for (const t of ['180', '100', '20'] as const) {
    const s = small.texts[t] as { x: number; y: number };
    const l = large.texts[t] as { x: number; y: number };
    expect(Math.abs(design(large, l.x) - design(small, s.x)), `"${t}" at the same design x`).toBeLessThan(1);
    expect(Math.abs(design(large, l.y) - design(small, s.y)), `"${t}" at the same design y`).toBeLessThan(1);
    // on screen at 1920 x 1080: the canvas's place plus k x the design position measured at 1280 x 800
    const top = large.rect[1] as number;
    expect(Math.abs(top + l.y / large.dpr - (top + large.k * design(small, s.y))), `"${t}" on screen at k x its design y`).toBeLessThan(1.5);
  }
  await f.close();
});

test('a phone over the relay draws the instructor\'s scales, from its join and at every change', async ({ page, browser, browserName }) => {
  test.skip(browserName === 'webkit' && !!process.env.CI, 'FX-2 (as mobile-learner): the 2-vCPU CI WebKit runner cannot hold an instructor, a phone and the relay in step');
  test.setTimeout(120_000);
  const dir = mkdtempSync(join(tmpdir(), 'e130-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const relay: RelayHandle = await startRelay({ port: 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  try {
    const ws = `ws://127.0.0.1:${relay.port}/`;
    await openApp(page, base, `?relay=${encodeURIComponent(ws)}#/teach`, { warmMs: 1500, site: { skin: 'saadat-like' } });
    await lines2(page);
    await tab(page, 'devices');
    await setRange(page, 'IBP1', 0, 160);
    const code = await page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
    const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
    const f = await (await browser.newContext(dev)).newPage();
    await f.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws)}`);
    await synced(f);
    await expect.poll(() => scalesOf(f), { timeout: 10_000 }).toBe(JSON.stringify({ IBP1: { mode: 'custom', lower: 0, upper: 160 } }));
    await mode(page, 'IBP1', 'Auto');
    await expect.poll(() => scalesOf(f), { timeout: 10_000 }).toBe(JSON.stringify({ IBP1: { mode: 'auto' } }));
    await f.context().close();
  } finally {
    await relay.close();
  }
});

test('shots: both skins at the fixed default, a typed range and AUTO (PME_IBP_SHOTS only)', async ({ browser, browserName }) => {
  const out = process.env.PME_IBP_SHOTS;
  test.skip(!out || browserName === 'webkit', 'evidence run: PME_IBP_SHOTS=<dir>, Chromium only');
  test.setTimeout(240_000);
  mkdirSync(out!, { recursive: true });
  for (const skin of ['saadat-like', 'philips-like']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await openApp(page, base, '#/teach', { warmMs: 1500, site: { skin } });
    await lines2(page);
    const shoot = async (name: string) => {
      await go(page, '#/monitor', 9000);
      writeFileSync(join(out!, `after-${skin}-${name}.png`), await page.locator('.stage').screenshot());
      await go(page, '#/teach', 800);
      await tab(page, 'devices');
    };
    await tab(page, 'devices');
    await shoot('fixed');
    writeFileSync(join(out!, `after-${skin}-devices-tab.png`), await page.locator('[data-ibp="IBP1"]').first().locator('xpath=..').screenshot());
    await setRange(page, 'IBP1', 20, 180);
    await setRange(page, 'IBP2', 0, 40);
    await shoot('range-20-180');
    await mode(page, 'IBP1', 'Auto');
    await mode(page, 'IBP2', 'Auto');
    await page.waitForTimeout(31_000); // past a 30-s boundary of sim time
    await shoot('auto');
    await ctx.close();
  }
});
