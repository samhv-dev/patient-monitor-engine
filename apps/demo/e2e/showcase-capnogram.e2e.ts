// Showcase hotfix item 4 (rulings S1, Ali 2026-10-04), revised by O4 (rc.3, research/34 §8 O4): the default patient
// breathes on its own WITHOUT the CO2 sampling line, so the Saadat-style monitor shows RESP and RR; attaching the line in
// Devices & alarms makes the CO2 waveform take the RESP lane's place and the RR tile become the split CO2 tile (EtCo2,
// FiCo2, AWRR); detaching it brings RESP and RR back. With
// PME_SHOTS=1 (Chromium) it writes the before/after gate screenshots to docs/gates/showcase-hotfix/.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { shot8 } from './indexed-png.ts';
import { openApp, startVite, tab } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/showcase-hotfix');
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

async function save(page: Page, name: string, browserName: string): Promise<void> {
  if (!process.env.PME_SHOTS || browserName !== 'chromium') return;
  mkdirSync(out, { recursive: true });
  let buf = await shot8(page, 1);
  if (buf.length > 60 * 1024) buf = await shot8(page, 0.8);
  writeFileSync(`${out}/${name}.png`, buf);
  expect(buf.length).toBeLessThanOrEqual(60 * 1024);
}

test('Saadat-style monitor: the default (non-ventilated) patient shows RESP and RR; attaching the line brings the capnogram and the CO2 tile; detaching brings RESP back', { tag: '@known-flaky' }, async ({ page, browserName }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page, base, '#/teach', { warmMs: 2000 });
  expect(await page.evaluate(() => (window as unknown as { __pmeApp: { session: { skin: string } } }).__pmeApp.session.skin)).toBe('saadat-like');
  const lanes = () => page.locator('.stage canvas[data-lanes]').getAttribute('data-lanes');
  const tileV = (p: string) => page.locator(`.pme-stile[data-param="${p}"] [data-pme="v"]`);

  // O4 (rc.3, research/34 §8 O4): the default patient breathes on its own, without the CO2 line — RESP and RR
  expect(await lanes()).toBe('ECG1 ECG2 RESP IBP1 IBP2 PLETH');
  await expect(page.locator('.pme-stile[data-param="RR"]')).toHaveCount(1);
  await expect(page.locator('.pme-stile[data-param="CO2"]')).toHaveCount(0);
  await expect(tileV('RR')).toHaveText(/^\d+$/, { timeout: 20_000 });
  // O2 (rc.3): the cuff started on AUTO every 5 min with the patient; the NIBP tile says so
  await expect(page.locator('.pme-stile[data-param="NIBP"] [data-pme="mode"]')).toHaveText('AUTO(5Min)', { timeout: 20_000 });
  await page.waitForTimeout(4000);
  await save(page, 'capnogram-detached-1280x800', browserName);

  // attach the CO2 sampling line: the capnogram lane in RESP's place, the split EtCo2 | FiCo2 | AWRR tile (IMG_8113)
  await tab(page, 'devices');
  const line = page.getByRole('button', { name: 'CO₂ sampling line' });
  await expect(line).toHaveAttribute('aria-pressed', 'false');
  await line.click();
  await expect.poll(lanes, { timeout: 10_000 }).toBe('ECG1 ECG2 CO2 IBP1 IBP2 PLETH');
  await expect(page.locator('.pme-stile[data-param="CO2"] [data-pme="lbl"]')).toHaveText('EtCo2');
  await expect(tileV('CO2')).toHaveText(/^\d+$/, { timeout: 20_000 });
  await expect(page.locator('.pme-stile[data-param="CO2"]')).toContainText('AWRR');
  await expect(page.locator('.pme-stile[data-param="RR"]')).toHaveCount(0);
  await page.waitForTimeout(4000); // a few breaths drawn for the screenshot
  await save(page, 'capnogram-attached-1280x800', browserName);

  // and detached again: RESP and RR are back
  await line.click();
  await expect.poll(lanes, { timeout: 10_000 }).toBe('ECG1 ECG2 RESP IBP1 IBP2 PLETH');
  await expect(page.locator('.pme-stile[data-param="RR"]')).toHaveCount(1);
});
