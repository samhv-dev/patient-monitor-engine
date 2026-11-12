// Uniform scaling (roadmap "Uniform scaling and the landscape phone"; resolution audit of 4 November,
// docs/showcase/resolution-audit-2026-11-04.md): the learners' monitor is laid out at the Saadat-like skin's screen
// (layout.grid.screenPx, 1280 × 800) and scaled as one unit, so at the demo's laptop and projector sizes the Instructor v2
// pane and the Monitor view never wrap a tile. On the MH (phases) card at Early signs (the CO2 line attached, a cuff
// result shown), at 1280 × 720, 1366 × 768 and 1920 × 1080, in both views: no horizontal overflow; the NIBP, EtCO₂ (CO2)
// and SpO₂ tiles lie inside the viewport and the monitor; no text of theirs wraps or leaves its tile; and each tile's box,
// measured in the monitor's own frame, is the same at every size (one scale factor for all of it).
import { expect, test, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';
import { app, openMhV2, pressPath } from './mh-v2-path.ts';

let vite: ViteDevServer | undefined;
let base = process.env.PME_KIT_BASE ?? '';
test.beforeAll(async () => {
  if (!base) ({ vite, base } = await startVite());
});
test.afterAll(async () => vite?.close());

const SIZES = [[1280, 720], [1366, 768], [1920, 1080]] as const;
const VIEWS = [['teach2', '#/teach2'], ['monitor', '#/monitor']] as const;
const TILES = ['NIBP', 'CO2', 'SpO2'] as const;

interface Fit {
  scroll: [number, number];
  scale: number;
  frame: [number, number, number, number];
  tiles: Record<string, { box: [number, number, number, number]; rel: [number, number, number, number]; bad: string[] }>;
}

function measure(page: Page): Promise<Fit> {
  return page.evaluate((params) => {
    const se = document.scrollingElement as HTMLElement;
    const outer = document.querySelector<HTMLElement>('.stage [data-pme-scale]') as HTMLElement;
    const o = outer.getBoundingClientRect();
    const tiles: Fit['tiles'] = {};
    for (const p of params) {
      const tile = document.querySelector<HTMLElement>(`.stage .pme-stile[data-param="${p}"]`);
      if (!tile || tile.offsetParent === null) continue;
      const b = tile.getBoundingClientRect();
      const bad: string[] = [];
      if (b.left < -0.5 || b.top < -0.5 || b.right > innerWidth + 0.5 || b.bottom > innerHeight + 0.5) bad.push('past the viewport');
      if (b.left < o.left - 0.5 || b.top < o.top - 0.5 || b.right > o.right + 0.5 || b.bottom > o.bottom + 0.5) bad.push('past the monitor');
      const walk = document.createTreeWalker(tile, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const text = n.textContent ?? '';
        const el = n.parentElement as HTMLElement;
        if (!text.trim() || el.closest('svg')) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const rects = [...range.getClientRects()].filter((r) => r.width > 0);
        if (rects.length > 1) bad.push(`"${text.trim()}" wraps`);
        for (const r of rects) if (r.left < b.left - 0.5 || r.right > b.right + 0.5 || r.top < b.top - 0.5 || r.bottom > b.bottom + 0.5) bad.push(`"${text.trim()}" leaves its tile`);
      }
      const rel = [(b.left - o.left) / o.width, (b.top - o.top) / o.height, b.width / o.width, b.height / o.height] as [number, number, number, number];
      tiles[p] = { box: [b.left, b.top, b.width, b.height], rel, bad };
    }
    return { scroll: [se.scrollWidth, se.clientWidth], scale: Number(outer.dataset.pmeScale), frame: [o.left, o.top, o.width, o.height], tiles };
  }, TILES as unknown as string[]);
}

test('the monitor scales as one unit: Instructor v2 and the Monitor view at 1280 × 720, 1366 × 768 and 1920 × 1080', async ({ page }) => {
  test.setTimeout(300_000);
  await openMhV2(page, (h) => openApp(page, base, h, { warmMs: 2000 }));
  await pressPath(page, (i) => i < 6); // to the MH crisis call, pressed at Early signs (the CO2 line is attached)
  expect((await app(page)).stateId).toBe('earlySigns');
  // the cuff's result and the SpO2 reading are in their tiles
  await expect.poll(() => page.evaluate(() => /\d/.test(document.querySelector('.stage .pme-stile[data-param="NIBP"] [data-pme="v"]')?.textContent ?? '')), { timeout: 60_000 }).toBe(true);
  const ref: Record<string, Fit['tiles']> = {};
  for (const [w, h] of [...SIZES].reverse()) {
    await page.setViewportSize({ width: w, height: h });
    for (const [view, hash] of VIEWS) {
      await page.evaluate((x) => (location.hash = x), hash);
      await page.waitForTimeout(1200);
      const m = await measure(page);
      console.log(`resolution-fit ${view} ${w}x${h} ${JSON.stringify({ scroll: m.scroll, scale: m.scale, frame: m.frame.map(Math.round), tiles: Object.fromEntries(Object.entries(m.tiles).map(([p, t]) => [p, t.box.map(Math.round)])) })}`);
      expect.soft(m.scroll[0], `${view} ${w}×${h}: the page scrolls sideways`).toBeLessThanOrEqual(m.scroll[1]);
      // the monitor is drawn at its 1280 × 800 proportion
      expect.soft(m.frame[2] / m.frame[3], `${view} ${w}×${h}: the monitor's proportion`).toBeCloseTo(1280 / 800, 2);
      for (const p of TILES) {
        const t = m.tiles[p];
        expect.soft(t, `${view} ${w}×${h}: the ${p} tile is shown`).toBeDefined();
        if (!t) continue;
        expect.soft(t.bad, `${view} ${w}×${h}: ${p}`).toEqual([]);
        // one scale factor: the tile's box in the monitor's frame is the same at every size (the 1920 × 1080 one)
        const r = (ref[view] ??= m.tiles)[p];
        if (r) for (let i = 0; i < 4; i++) expect.soft(Math.abs((t.rel[i] as number) - (r.rel[i] as number)), `${view} ${w}×${h}: ${p} box [${i}]`).toBeLessThan(0.005);
      }
    }
  }
});
