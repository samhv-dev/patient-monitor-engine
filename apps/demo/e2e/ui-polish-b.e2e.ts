// UI-B (the read-only demo UI review of 24 October, the remaining monitor and panel rows). #25 — the Monitor view's
// hover strip covered the date, the time and the HR tile's label; since the owner's review of 30 October it sits under
// the monitor, off it altogether (monitor-return-controls.e2e.ts). #32 — a paused session puts PAUSED over the
// monitor, never in print. #14 — a scenario's NIBP cuff cycles from Load (the Saadat default, AUTO every 5 min); the
// tile showed "/" for the whole case.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

type Box = { x: number; y: number; width: number; height: number };

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

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

test('UI-B #14: a loaded scenario starts the cuff on AUTO every 5 min and the NIBP tile shows a result', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page, base, '?scenario=showcase-mh', { warmMs: 1500 });
  const nibp = page.locator('.stage .pme-stile[data-param="NIBP"]');
  await expect(nibp.locator('[data-pme="mode"]')).toHaveText('AUTO(5Min)', { timeout: 20_000 });
  await expect(nibp.locator('[data-pme="v"]')).toHaveText(/^\d+ \/ \d+$/, { timeout: 90_000 });
});
