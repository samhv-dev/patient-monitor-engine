// UI-B (the read-only demo UI review of 24 October, the remaining monitor and panel rows). #25 — the Monitor view's
// hover strip covered the date, the time and the HR tile's label; since the owner's review of 30 October it sits under
// the monitor, off it altogether (monitor-return-controls.e2e.ts). #32 — a paused session puts PAUSED over the
// monitor, never in print. #14 — a scenario's NIBP cuff cycles from Load (the Saadat default, AUTO every 5 min); the
// tile showed "/" for the whole case.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, pillV2, startVite } from './app-support.ts';

type Box = { x: number; y: number; width: number; height: number };

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

// #32 — a paused session says so on the monitor (the traces only froze), never in print
test('UI-B #32: Pause puts PAUSED over the monitor, Resume takes it away; it never prints', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page, base, '?scenario=showcase-mh#/teach2', { warmMs: 1500 });
  const mark = page.locator('.stage .paused-mark');
  await expect(mark).toBeHidden();
  const pill = pillV2(page); // Instructor v2's clock pill: the session bar's Pause / Resume
  await expect(pill).toHaveAttribute('data-state', 'running');
  await pill.click();
  await expect(mark).toBeVisible({ timeout: 5_000 });
  await expect(mark).toHaveText('PAUSED');
  const box = (await mark.boundingBox()) as Box;
  const stage = (await page.locator('.stage').boundingBox()) as Box;
  expect(box.x).toBeGreaterThan(stage.x);
  expect(box.x + box.width).toBeLessThan(stage.x + stage.width);
  await page.emulateMedia({ media: 'print' });
  await expect(mark).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await expect(pill).toHaveAttribute('data-state', 'paused');
  await pill.click();
  await expect(mark).toBeHidden({ timeout: 5_000 });
});

// @known-flaky, class crash (outside our code): CI run 42111824225 (PR #285), e2e (webkit 3/3), attempt 1 ended at 53.4 s,
// inside the 90-s wait below and without its time-out: Playwright's expect stops early only when the page or browser is
// closed under it (its call log ends on the close, no "Timeout" line). The cuff was mid-cycle and normal up to the end
// (inflated to 150, stepping down 8 mmHg every ≈ 3.5 s, at 78), so the result was seconds away; retry #1 passed in
// 30.3 s; local macOS WebKit 20/20. Debrief :493 in shard 1/3 of the same run lost its page the same way 2 min earlier
// ("Target page, context or browser has been closed"): the Linux WebKit web-process crash class F-FX1-1
// (docs/guides/known-deviations.md). Not a wait: one cycle from Load is 27.7 sim s, the result ≈ 29.5 s after the app's
// hook, at ×1 in each of 4 local probe runs under CPU load; the wait is 90 s.
test('UI-B #14: a loaded scenario starts the cuff on AUTO every 5 min and the NIBP tile shows a result', { tag: '@known-flaky' }, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page, base, '?scenario=showcase-mh#/teach2', { warmMs: 1500 }); // the NIBP tile on v2's monitor pane
  const nibp = page.locator('.stage .pme-stile[data-param="NIBP"]');
  await expect(nibp.locator('[data-pme="mode"]')).toHaveText('AUTO(5Min)', { timeout: 20_000 });
  await expect(nibp.locator('[data-pme="v"]')).toHaveText(/^\d+ \/ \d+$/, { timeout: 90_000 });
});
