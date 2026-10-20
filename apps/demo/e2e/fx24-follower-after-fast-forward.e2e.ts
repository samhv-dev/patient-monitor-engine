// FX-24 (found by the FX-23 fixer): right after a fast-forward, and when it joins, a following phone showed compressed
// waveforms for up to 0.75 s (the lanes ran at ×12–24 the sweep speed, behind the sweep cursor) and the ECG gain label
// read X4 for ≈ 2 s. The phone restores the host's snapshot at both moments, and a restore clears the engine's sample
// buffers; the lanes' backfill and the ECG auto-gain read back from before the snapshot as if the samples were there.
// Host + one emulated phone (Pixel 7 on Chromium, iPhone 13 on WebKit) over the relay. An init script watches the phone's
// canvas: per frame, where the ECG trace's newest point is and the phone's sim time; and every ECG lane label drawn
// ("II  X1  NORMAL"). For 5 s after a 2-min fast-forward, and after a second phone joins: every frame's newest point sits
// at the sweep cursor (renderT × the measured sweep speed, modulo the lane), so nothing races or lags; after the
// fast-forward every label drawn has the gain shown before it; a joining phone shows the skin's own gain until its
// auto-gain has 4 s of signal, then the first phone's.
import { mkdtempSync, writeFileSync } from 'node:fs';
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

const LABEL_W = 56; // the renderer's lane chrome, CSS px left of the trace
type Pt = { n: number; x: number; y: number };
type Frame = { at: number; simT: number | null; pts: Record<string, Pt> };
type Watch = { frames: Frame[]; labels: Array<{ at: number; text: string }>; clock: { renderT(): number } | null };
type Win = { __fx24: Watch; __pmeFollower?: { sync?: { status: string }; monitor: { viewerClock(): Promise<{ renderT(): number }> } } };

/** Init script: per animation frame, the last point and the point count of every stroke colour; every ECG lane label. */
function watchCanvas(): void {
  const w = window as unknown as Win;
  w.__fx24 = { frames: [], labels: [], clock: null };
  const P = CanvasRenderingContext2D.prototype;
  const lineTo = P.lineTo;
  const fillText = P.fillText;
  let pts: Record<string, Pt> = {};
  P.lineTo = function (this: CanvasRenderingContext2D, x: number, y: number) {
    if (x < 56) return lineTo.call(this, x, y); // the lane chrome (the 1-mV calibration pulse), not a trace (LABEL_W)
    const p = (pts[String(this.strokeStyle)] ??= { n: 0, x: 0, y: 0 });
    p.n++;
    p.x = x;
    p.y = y;
    return lineTo.call(this, x, y);
  };
  P.fillText = function (this: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth?: number) {
    if (/^II\s+X\S+/.test(String(text))) w.__fx24.labels.push({ at: performance.now(), text: String(text) });
    return maxWidth === undefined ? fillText.call(this, text, x, y) : fillText.call(this, text, x, y, maxWidth);
  };
  // registered first, so it runs before the monitor's frame: it files what the previous frame drew with the sim time that
  // frame drew at
  const loop = (now: number) => {
    if (!w.__fx24.clock && w.__pmeFollower) void w.__pmeFollower.monitor.viewerClock().then((c) => (w.__fx24.clock = c));
    w.__fx24.frames.push({ at: now, simT: w.__fx24.clock?.renderT() ?? null, pts });
    if (w.__fx24.frames.length > 3000) w.__fx24.frames.splice(0, 1000);
    pts = {};
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

const now = (p: Page) => p.evaluate(() => performance.now());
const synced = (p: Page) => p.waitForFunction(() => (window as unknown as Win).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000, polling: 20 });

/** The ECG trace's newest point per frame (x, CSS px) with the frame's sim time, between two moments; and the lane width. */
async function trace(p: Page, from: number, to: number): Promise<{ laneW: number; pts: Array<{ at: number; x: number; t: number }> }> {
  const d = await p.evaluate(() => ({ frames: (window as unknown as Win).__fx24.frames, w: (document.querySelector('canvas') as HTMLCanvasElement).getBoundingClientRect().width }));
  const count = new Map<string, number>(); // the ECG colour: the most points in the topmost lane
  for (const f of d.frames) for (const [k, q] of Object.entries(f.pts)) if (q.y < 120) count.set(k, (count.get(k) ?? 0) + q.n);
  const color = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  const pts = d.frames.filter((f) => f.at >= from && f.at < to && f.simT !== null && f.pts[color]).map((f) => ({ at: f.at, x: (f.pts[color] as Pt).x, t: f.simT as number }));
  return { laneW: d.w - LABEL_W, pts };
}

/** px per sim second while the phone simply follows (the trace's advance over 3 s). */
async function sweepSpeed(p: Page): Promise<number> {
  const t1 = await now(p);
  await p.waitForTimeout(3000);
  const { laneW, pts } = await trace(p, t1, await now(p));
  let dx = 0;
  for (let i = 1; i < pts.length; i++) dx += ((((pts[i] as { x: number }).x - (pts[i - 1] as { x: number }).x) % laneW) + laneW) % laneW;
  return dx / ((pts.at(-1) as { t: number }).t - (pts[0] as { t: number }).t);
}

/**
 * Frames in [from, from + 5 s) whose newest ECG point is away from the sweep cursor. The cursor is at
 * (sim time × px/s) modulo the lane width, so (x − that) is the same on every frame while the trace keeps up with the clock;
 * a frame more than 12 px from the window's median drew behind the clock (the FX-24 race: 4–15 frames on main, and an X4 label). One
 * frame at a restore may differ (its points were drawn before the restore moved the clock), so one is allowed.
 */
async function offCursor(p: Page, from: number, pxPerS: number): Promise<{ off: number; frames: number; worst: number; at: string[]; step: string }> {
  const { laneW, pts } = await trace(p, from, from + 5000);
  const wrap = (v: number) => ((((v + laneW / 2) % laneW) + laneW) % laneW) - laneW / 2;
  const ref = (pts[0]?.x ?? 0) - (pts[0]?.t ?? 0) * pxPerS;
  const rel = pts.map((q) => wrap(q.x - q.t * pxPerS - ref));
  const med = [...rel].sort((a, b) => a - b)[Math.floor(rel.length / 2)] ?? 0;
  const dev = rel.map((r) => Math.abs(wrap(r - med)));
  const off = dev.flatMap((d, i) => (d > 12 ? [i] : []));
  let k = 1; // the largest sim-time step between two frames (a re-anchoring jump of the follower's clock), for the log
  for (let i = 2; i < pts.length; i++) if ((pts[i] as { t: number }).t - (pts[i - 1] as { t: number }).t > (pts[k] as { t: number }).t - (pts[k - 1] as { t: number }).t) k = i;
  const step = pts.length > 1 ? `${((pts[k] as { t: number }).t - (pts[k - 1] as { t: number }).t).toFixed(2)} s at +${((pts[k] as { at: number }).at - from).toFixed(0)} ms` : '';
  return { step, off: off.length, frames: pts.length, worst: Math.max(0, ...dev), at: off.slice(0, 8).map((i) => `+${((pts[i] as { at: number }).at - from).toFixed(0)} ms`) };
}

const labelsSince = (p: Page, from: number) => p.evaluate((t) => (window as unknown as Win).__fx24.labels.filter((l) => l.at >= t).map((l) => l.text), from);
const lastLabel = (p: Page) => p.evaluate(() => (window as unknown as Win).__fx24.labels.at(-1)?.text ?? null);

async function phone(browser: Browser, browserName: string, url: string): Promise<Page> {
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const ctx = await browser.newContext(dev);
  await ctx.addInitScript(watchCanvas);
  const p = await ctx.newPage();
  await p.goto(url);
  return p;
}

test('a following phone sweeps at the cursor and keeps its ECG gain after a fast-forward and when it joins', async ({ page, browser, browserName }) => {
  test.setTimeout(150_000);
  const dir = mkdtempSync(join(tmpdir(), 'fx24-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>'); // the pages come from Vite here
  relay = await startRelay({ port: 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = encodeURIComponent(`ws://127.0.0.1:${relay.port}/`);
  await openApp(page, base, `?relay=${ws}#/teach`, { warmMs: 1500 });
  const code = await page.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);
  const url = `${base}/?join=${code}&relay=${ws}`;

  const a = await phone(browser, browserName, url);
  await synced(a);
  await a.waitForTimeout(6000); // past the first 4-s auto-gain window
  const pxPerS = await sweepSpeed(a);
  const gain = await lastLabel(a); // the gain the phone shows
  console.log(`FX-24 ${browserName}: sweep ${pxPerS.toFixed(1)} px per sim s, label "${gain}"`);
  expect(pxPerS).toBeGreaterThan(20);
  expect(gain).toMatch(/^II\s+X/);

  // 1. a 2-min fast-forward: the phone holds, then restores the host's snapshot at the end
  await page.locator('.sessionbar').getByRole('group', { name: 'Fast-forward' }).getByRole('button', { name: 'Fast-forward 2 min' }).click();
  await expect(a.locator('.ff-veil.on')).toBeVisible({ timeout: 10_000 });
  await expect(a.locator('.ff-veil.on')).toHaveCount(0, { timeout: 60_000 });
  await synced(a);
  const end = await now(a);
  await a.waitForTimeout(5500);
  const ff = await offCursor(a, end, pxPerS);
  const ffLabels = await labelsSince(a, end - 1000);
  console.log(`FX-24 ${browserName}: after the fast-forward ${ff.off} of ${ff.frames} frames off the cursor ${JSON.stringify(ff.at)} (worst ${ff.worst.toFixed(1)} px; largest clock step ${ff.step}); labels ${JSON.stringify([...new Set(ffLabels)])}`);
  expect(ff.frames).toBeGreaterThan(100);
  expect(ff.off).toBeLessThanOrEqual(1);
  expect(ffLabels.length).toBeGreaterThan(0);
  for (const l of ffLabels) expect(l).toBe(gain);

  // 2. a second phone joins the running session
  const b = await phone(browser, browserName, url);
  await synced(b);
  const joined = await now(b);
  await b.waitForTimeout(5500);
  const jn = await offCursor(b, joined, pxPerS);
  const jnLabels = await labelsSince(b, joined - 1000);
  console.log(`FX-24 ${browserName}: after joining ${jn.off} of ${jn.frames} frames off the cursor ${JSON.stringify(jn.at)} (worst ${jn.worst.toFixed(1)} px; largest clock step ${jn.step}); labels ${JSON.stringify([...new Set(jnLabels)])}`);
  expect(jn.frames).toBeGreaterThan(100);
  expect(jn.off).toBeLessThanOrEqual(1);
  expect(jnLabels.length).toBeGreaterThan(0);
  // a new monitor shows the skin's own gain (Saadat-like, the default site: X1) until its auto-gain has a 4-s window of
  // signal, as at any monitor's start, then the same choice as the first phone; never one taken on a sliver of signal
  for (const l of jnLabels) expect([gain, 'II  X1  NORMAL']).toContain(l);
  expect(jnLabels.at(-1)).toBe(gain);
  await a.context().close();
  await b.context().close();
});
