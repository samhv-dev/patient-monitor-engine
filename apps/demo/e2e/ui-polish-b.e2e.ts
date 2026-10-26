// UI-B (the read-only demo UI review of 24 October, the remaining monitor and panel rows). #25 — the Monitor view's
// hover strip sits under the monitor's header (it covered the date, the time and the HR tile's label).
import { expect, test } from '@playwright/test';

type Box = { x: number; y: number; width: number; height: number };
const meets = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

for (const [w, h] of [[1280, 800], [1920, 1080]] as const) {
  test(`UI-B #25 Monitor view at ${w} × ${h}: the hover strip leaves the header, the date and the HR tile visible`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: w, height: h });
    await openApp(page, base, '?scenario=showcase-mh#/monitor', { warmMs: 2000 });
    const stage = page.locator('.stage');
    await stage.hover({ position: { x: w / 2, y: 40 } });
    const strip = page.getByRole('toolbar', { name: 'Monitor view' });
    await expect(strip).toHaveCSS('opacity', '1');
    const s = (await strip.boundingBox()) as Box;
    const hdr = (await page.locator('.stage .pme-hdr').boundingBox()) as Box;
    const hr = (await page.locator('.stage .pme-stile[data-param="HR"]').boundingBox()) as Box;
    console.log(`UI-B #25 ${w}x${h}: strip ${JSON.stringify(s)} header ${JSON.stringify(hdr)}`);
    expect(meets(s, hdr), 'strip over the header').toBe(false);
    expect(meets(s, hr), 'strip over the HR tile').toBe(false);
    expect(s.y).toBeGreaterThanOrEqual(hdr.y + hdr.height - 1);
    expect(s.y).toBeLessThan(hdr.y + hdr.height + 4); // just under it, still at the top
  });
}
