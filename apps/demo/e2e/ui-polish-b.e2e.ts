// UI-B (the read-only demo UI review of 24 October, the remaining monitor and panel rows). #25 — the Monitor view's
// hover strip sits under the monitor's header (it covered the date, the time and the HR tile's label). #32 — a paused
// session puts PAUSED over the monitor, never in print.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

type Box = { x: number; y: number; width: number; height: number };
const meets = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

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

// #32 — a paused session says so on the monitor (the traces only froze), never in print
test('UI-B #32: Pause puts PAUSED over the monitor, Resume takes it away; it never prints', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page, base, '?scenario=showcase-mh', { warmMs: 1500 });
  const mark = page.locator('.stage .paused-mark');
  await expect(mark).toBeHidden();
  const bar = page.locator('.sessionbar');
  await bar.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(mark).toBeVisible({ timeout: 5_000 });
  await expect(mark).toHaveText('PAUSED');
  const box = (await mark.boundingBox()) as Box;
  const stage = (await page.locator('.stage').boundingBox()) as Box;
  expect(box.x).toBeGreaterThan(stage.x);
  expect(box.x + box.width).toBeLessThan(stage.x + stage.width);
  await page.emulateMedia({ media: 'print' });
  await expect(mark).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await bar.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(mark).toBeHidden({ timeout: 5_000 });
});
