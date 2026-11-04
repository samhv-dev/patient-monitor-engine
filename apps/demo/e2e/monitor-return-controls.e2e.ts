// The owner's review of 30 October (GitHub Pages, a 2000-px Safari window, Saadat-like skin): the Monitor view's return
// controls (Instructor view, Full screen, Open on a second screen, Home) showed over the right half of the ECG lane.
// They now sit in a strip under the monitor: shown on hover, their box never meets the monitor's (the stage the
// monitor fills, its header and its wave canvas), on both skins, at laptop widths. A shot of each is kept in
// test-results/monitor-return-controls/ (the PR's before/after evidence).
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

type Box = { x: number; y: number; width: number; height: number };
const meets = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../test-results/monitor-return-controls');
test.beforeAll(async () => {
  ({ vite, base } = await startVite());
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

for (const skin of ['saadat-like', 'philips-like'] as const) {
  for (const [w, h] of [[1440, 900], [2000, 1000]] as const) {
    test(`${skin} at ${w} × ${h}: the return controls sit under the monitor, off the ECG`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width: w, height: h });
      await openApp(page, base, '#/monitor', { warmMs: 2500, site: { skin } });
      await page.locator('.stage').hover({ position: { x: w / 2, y: h / 3 } });
      const strip = page.getByRole('toolbar', { name: 'Monitor view' });
      await expect(strip).toHaveCSS('opacity', '1');
      await page.waitForTimeout(400); // the opacity transition
      await page.screenshot({ path: `${out}/${skin}-${w}.png` });
      const s = (await strip.boundingBox()) as Box;
      const stage = (await page.locator('.stage').boundingBox()) as Box;
      const canvas = (await page.locator('.stage canvas[data-lanes]').first().boundingBox()) as Box;
      console.log(`${skin} ${w}x${h}: strip ${JSON.stringify(s)} stage ${JSON.stringify(stage)} canvas ${JSON.stringify(canvas)}`);
      expect(meets(s, canvas), 'controls over the wave canvas').toBe(false);
      expect(meets(s, stage), 'controls over the monitor').toBe(false);
      expect(s.y + s.height, 'the strip inside the window').toBeLessThanOrEqual(h);
      for (const name of ['Instructor view', 'Full screen', 'Open on a second screen', 'Home']) {
        const b = (await strip.getByText(name, { exact: true }).boundingBox()) as Box;
        expect(meets(b, stage), `${name} over the monitor`).toBe(false);
        expect(b.x + b.width, `${name} inside the window`).toBeLessThanOrEqual(w);
      }
    });
  }
}
