// UI-A #10 (demo UI review 24 Oct #10; the owner circled this row on 23 October): on the Saadat-like skin the foot of
// column 2 holds the BFA module (BFI% BS% SQI% EMG%, drawn blank when no depth monitor publishes) and, while an agent is
// measured, the AGENTS tile (EtAA %, MAC). When EtAA appeared, the BFA labels collapsed to "BFI%BS%SQI%EMG%", EMG% ran
// under EtAA and "MAC 0.x" was clipped at the tile's foot; on a phone "EtAA" overlapped "EMG%". With sevoflurane on,
// at 1280 × 800 and 1920 × 1080 (Instructor view and Monitor view) and on a phone held upright at 390 × 844, every text
// of the row is measured by its INK box (the pass-3 method of saadat-instructor-tiles.e2e.ts): no two overlap, none
// lies outside its tile, none wraps, and the BFA labels keep clear space between them.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devices, expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => relay?.close());

type Ink = { tile: string; t: string; l: number; r: number; top: number; bot: number };
const ROW = ['BFA', 'NMT', 'AGENTS'];
/** The BFA labels' clear space, px (ink to ink): "BFI%BS%" read as one word below it. */
const LABEL_GAP_PX = 4;

/** The ink boxes of the row's texts (one tile set: the cell they share), those outside their tile, the wrapped ones. */
function inks(page: Page): Promise<{ boxes: Ink[]; out: Ink[]; wrapped: string[]; labels: Ink[] }> {
  return page.evaluate((params) => {
    const g = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
    const boxes: Ink[] = [];
    const out: Ink[] = [];
    const wrapped: string[] = [];
    const labels: Ink[] = [];
    for (const p of params) {
      const tile = [...document.querySelectorAll<HTMLElement>(`.pme-stile[data-param="${p}"]`)].find((e) => e.offsetParent !== null);
      if (!tile) continue;
      const tb = tile.getBoundingClientRect();
      const walk = document.createTreeWalker(tile, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const text = n.textContent ?? '';
        const el = n.parentElement as HTMLElement;
        if (!text.trim() || el.closest('svg')) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || Number(cs.opacity) === 0 || el.offsetParent === null) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const rects = [...range.getClientRects()].filter((r) => r.width > 0);
        if (rects.length > 1) wrapped.push(`${p}: "${text.trim()}" (wrapped)`);
        if (rects.length !== 1) continue;
        const rc = rects[0] as DOMRect;
        g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const m = g.measureText(text);
        const baseY = rc.top + (rc.height - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
        const ink: Ink = { tile: p, t: text.trim(), l: rc.left - m.actualBoundingBoxLeft, r: rc.left + m.actualBoundingBoxRight, top: baseY - m.actualBoundingBoxAscent, bot: baseY + m.actualBoundingBoxDescent };
        boxes.push(ink);
        if (p === 'BFA' && el.classList.contains('pl')) labels.push(ink);
        if (ink.l < tb.left - 0.5 || ink.r > tb.right + 0.5 || ink.top < tb.top - 0.5 || ink.bot > tb.bottom + 0.5) out.push(ink);
      }
    }
    return { boxes, out, wrapped, labels };
  }, ROW);
}

function faults(r: Awaited<ReturnType<typeof inks>>): string[] {
  const bad: string[] = [];
  for (let i = 0; i < r.boxes.length; i++)
    for (let j = i + 1; j < r.boxes.length; j++) {
      const a = r.boxes[i] as Ink;
      const b = r.boxes[j] as Ink;
      const dx = Math.min(a.r, b.r) - Math.max(a.l, b.l);
      const dy = Math.min(a.bot, b.bot) - Math.max(a.top, b.top);
      if (dx > 0.5 && dy > 0.5) bad.push(`${a.tile} "${a.t}" × ${b.tile} "${b.t}" (${dx.toFixed(1)} × ${dy.toFixed(1)} px)`);
    }
  for (const i of r.out) bad.push(`${i.tile} "${i.t}" outside its tile`);
  bad.push(...r.wrapped);
  // each BFA label and its right-hand neighbour on the same line: clear space between them
  for (const a of r.labels) {
    const right = r.labels.filter((b) => b !== a && b.l >= a.l && Math.min(a.bot, b.bot) - Math.max(a.top, b.top) > 0).sort((x, y) => x.l - y.l)[0];
    if (right && right.l - a.r < LABEL_GAP_PX) bad.push(`BFA "${a.t}" and "${right.t}" ${(right.l - a.r).toFixed(1)} px apart`);
  }
  return bad;
}

const sevo = async (page: Page) => {
  type L = { __pmeApp: { link: { send(c: unknown): Promise<{ accepted: boolean }> } } };
  for (const event of [{ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 }, { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2 }]) {
    const r = await page.evaluate((event) => (window as unknown as L).__pmeApp.link.send({ type: 'applyEvent', event }), event);
    expect(r.accepted).toBe(true);
  }
};
const agentsShown = (p: Page) =>
  expect.poll(() => p.evaluate(() => [...document.querySelectorAll<HTMLElement>('.pme-stile[data-param="AGENTS"]')].some((e) => e.offsetParent !== null && /\d/.test(e.querySelector('[data-pme="v"]')?.textContent ?? ''))), { timeout: 60_000, intervals: [500] }).toBe(true);
const shot = async (p: Page, name: string) => {
  const dir = process.env.UIA_SHOTS;
  if (!dir) return;
  const cell = p.locator('.pme-stile[data-param="BFA"]').locator('xpath=..');
  await cell.first().screenshot({ path: `${dir}/${name}.png` });
};

// the review's two sizes and the owner's own window (1990 × 920 inside Safari)
for (const [w, h] of [[1280, 800], [1920, 1080], [1990, 920]] as const) {
  test(`UI-A #10 Saadat skin at ${w} × ${h}: the BFI/EtAA row has clear space on the Instructor and Monitor views`, async ({ page, browserName }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width: w, height: h });
    await openApp(page, base, '#/teach', { warmMs: 2000, site: { skin: 'saadat-like' } });
    await sevo(page);
    await agentsShown(page);
    const teach = await inks(page);
    await shot(page, `${browserName}-${w}x${h}-teach`);
    await page.evaluate(() => (location.hash = '#/monitor'));
    await page.waitForTimeout(800);
    const mon = await inks(page);
    await shot(page, `${browserName}-${w}x${h}-monitor`);
    const bad = [...faults(teach).map((s) => `teach: ${s}`), ...faults(mon).map((s) => `monitor: ${s}`)];
    console.log(`UI-A #10 ${browserName} ${w}x${h}: ${teach.boxes.length + mon.boxes.length} ink boxes; ${bad.length} faults\n${bad.join('\n')}`);
    expect(teach.boxes.map((b) => b.t)).toEqual(expect.arrayContaining(['BFI%', 'BS%', 'SQI%', 'EMG%', 'EtAA']));
    expect(teach.boxes.some((b) => /^MAC /.test(b.t))).toBe(true);
    expect(bad).toEqual([]);
  });
}

test('UI-A #10 Saadat skin on a phone held upright (390 × 844): the BFI/EtAA row has clear space', async ({ page, browser, browserName }) => {
  test.setTimeout(150_000);
  const dir = mkdtempSync(join(tmpdir(), 'uia10-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  relay = await startRelay({ port: 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = encodeURIComponent(`ws://127.0.0.1:${relay.port}/`);
  await openApp(page, base, `?relay=${ws}`, { warmMs: 1500, site: { skin: 'saadat-like' } });
  const code = await page.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);
  const { defaultBrowserType: _b, viewport: _v, ...dev } = devices['iPhone 13'];
  const f = await (await browser.newContext({ ...dev, viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })).newPage();
  await f.goto(`${base}/?join=${code}&relay=${ws}`);
  await f.waitForFunction(() => (window as unknown as { __pmeFollower?: { sync?: { status: string } } }).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000 });
  await sevo(page);
  await agentsShown(f);
  await f.waitForTimeout(1000);
  const r = await inks(f);
  if (process.env.UIA_SHOTS) await f.screenshot({ path: `${process.env.UIA_SHOTS}/${browserName}-phone-390x844.png` });
  const bad = faults(r);
  console.log(`UI-A #10 ${browserName} phone 390x844: ${r.boxes.length} ink boxes; ${bad.length} faults\n${bad.join('\n')}`);
  expect(r.boxes.map((b) => b.t)).toEqual(expect.arrayContaining(['BFI%', 'BS%', 'SQI%', 'EMG%', 'EtAA']));
  expect(bad).toEqual([]);
});
