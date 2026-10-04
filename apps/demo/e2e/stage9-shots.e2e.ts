// Stage 9 gate evidence: every view at the four target sizes (research/13 brief §8, §11.1), each an indexed PNG
// ≤ 60 KB in docs/gates/stage-9/, after a real warm-up so the waveforms are drawn. Chromium only (evidence run).
// Run: PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage9-shots.e2e.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { shot8 } from './stage9-png8.ts';
import { go, openApp, startVite, tab } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-9');
test.beforeAll(async () => {
  ({ vite, base } = await startVite());
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

const SIZES = [[1280, 800, false], [1920, 1080, false], [1180, 820, true], [820, 1180, true]] as const;

async function save(page: Page, name: string, w: number): Promise<void> {
  let buf = await shot8(page, w > 1440 ? 0.75 : 1);
  if (buf.length > 60 * 1024) buf = await shot8(page, w > 1440 ? 0.6 : 0.8);
  writeFileSync(`${out}/${name}.png`, buf);
  expect(buf.length, `${name}.png ≤ 60 KB`).toBeLessThanOrEqual(60 * 1024);
}

for (const [w, h, touch] of SIZES) {
  test(`views at ${w}×${h}`, async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit', 'evidence run: Chromium only');
    test.setTimeout(180_000);
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
    const page = await ctx.newPage();
    await openApp(page, base, '#/', { warmMs: 9000 });
    const s = `${w}x${h}`;
    await save(page, `start-${s}`, w);
    await go(page, '#/monitor', 6000);
    await save(page, `monitor-${s}`, w);
    await go(page, '#/teach', 1500);
    await tab(page, 'vitals');
    await save(page, `instructor-vitals-${s}`, w);
    await tab(page, 'scenario');
    await page.locator('.scard', { hasText: 'Witnessed VF in PACU' }).locator('button', { hasText: 'Load' }).click();
    await page.waitForTimeout(8000);
    await save(page, `instructor-scenario-${s}`, w);
    await tab(page, 'drugs');
    await save(page, `instructor-drugs-${s}`, w);
    await tab(page, 'devices');
    await save(page, `instructor-devices-${s}`, w);
    for (const [r, name, wait] of [['#/remote', 'remote-pairing', 800], ['#/explore/haemodynamics', 'explore-haemodynamics', 1500], ['#/explore/respiratory', 'explore-respiratory', 1500], ['#/vent', 'ventilator', 9000], ['#/validate', 'validate', 4000], ['#/dev', 'developer', 800], ['#/settings', 'settings', 800]] as const) {
      await go(page, r, wait);
      await save(page, `${name}-${s}`, w);
    }
    // the Remote as a phone/tablet sees it: a second page joined by the code
    const code = await page.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);
    await go(page, '#/remote', 300); // the host shows its code while the remote joins (see stage9-glossary.e2e.ts)
    const remote = await ctx.newPage();
    await remote.goto(`${base}/#/remote?code=${code}`);
    await expect(remote.locator('.status-pill')).toContainText('Connected', { timeout: 20_000 });
    await remote.waitForTimeout(1500);
    await save(remote, `remote-panel-${s}`, w);
    await ctx.close();
  });
}
