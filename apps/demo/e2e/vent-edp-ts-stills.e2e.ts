// Brief 159 (VF): the EDP-TS face's drawing painted in each photographed display state (e2e/fixtures/edp-ts-still.*,
// test-only), the rig the comparison sheets are made with. It proves the product's paint() draws those states: the
// words and their order as photographed (research/57 P-01 to P-03), the selected tile (P-13), the ring and lamps (P-06,
// P-15), on the 800 × 600 screen of the fixed design grid (P-20), with no page error.
// Run: pnpm exec playwright test apps/demo/e2e/vent-edp-ts-stills.e2e.ts
import { resolve } from 'node:path';
import { expect, test } from './evidence.ts';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
test.afterAll(async () => vite?.close());

const ENTRIES: Record<string, [string, string[], string] | null> = {
  1542: null,
  1544: ['Operative Modes', ['VCV', 'PCV', 'PSV/CPAP', 'SIMV(PCV)+PSV', 'SIMV(VCV)+PSV', 'Noninvasive (NIV)', 'Other Operative modes'], 'SIMV(VCV)+PSV'],
  1545: ['Operative Modes', ['MMV+PSV', 'PSV+VT Assured', 'APRV', 'PRVC', 'Other Operative modes'], 'MMV+PSV'],
  1546: null,
  1547: ['Menu', ["Patient's Data", 'Backup ventilation', 'Ventilatory adjuncts', 'Records', 'Tools', 'Intrahospital transport'], "Patient's Data"],
};

for (const [shot, win] of Object.entries(ENTRIES)) {
  test(`EDP-TS still ${shot}: the photographed state, drawn by the product's paint()`, async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.setViewportSize({ width: 1080, height: 820 });
    await page.goto(`${base}/e2e/fixtures/edp-ts-still.html?shot=${shot}`);
    await expect(page.locator('body[data-ready="1"]')).toHaveCount(1, { timeout: 20_000 });
    const box = await page.locator('.edp-screen').boundingBox();
    expect(box && [Math.round(box.width), Math.round(box.height)]).toEqual([800, 600]);
    await expect(page.locator('.edp-tl .mn')).toHaveText('SIMV(VCV)+PSV');
    await expect(page.locator('.edp-tile')).toHaveCount(11);
    if (win) {
      await expect(page.locator('.edp-win .t')).toHaveText(win[0]);
      await expect(page.locator('.edp-win .edp-entry .lbl')).toHaveText(win[1]);
      await expect(page.locator('.edp-win .edp-entry.focus .lbl')).toHaveText(win[2]);
    } else await expect(page.locator('.edp-win')).toHaveCount(0);
    if (shot === '1546') await expect(page.locator('.edp-tile.sel .n')).toHaveText('Exp. Sensitiv.');
    await expect(page.locator('.edp-knob.lit')).toHaveCount(shot === '1542' ? 0 : 1);
    await expect(page.locator('.edp-lamp.on-high')).toHaveCount(shot === '1547' ? 0 : 1);
    expect(errs).toEqual([]);
  });
}
