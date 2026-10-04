// Showcase hotfix item 4 (rulings S1, Ali 2026-10-04): on the default Saadat-style monitor the capnogram is visible.
// With the CO2 sampling line attached (the default patient) the CO2 waveform takes the RESP lane's place and the RR tile
// becomes the CO2 tile (EtCO2, FiCO2, awRR); detaching the line in Devices & alarms brings RESP and RR back. With
// PME_SHOTS=1 (Chromium) it writes the before/after gate screenshots to docs/gates/showcase-hotfix/.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { shot8 } from './stage9-png8.ts';
import { openApp, startVite, tab } from './stage9-support.ts';

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

test('Saadat-style monitor: CO2 replaces RESP and RR while the line is attached; RESP and RR return when it is detached', async ({ page, browserName }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page, base, '#/teach', { warmMs: 2000 });
  expect(await page.evaluate(() => (window as unknown as { __pmeApp: { session: { skin: string } } }).__pmeApp.session.skin)).toBe('saadat-like');
  const lanes = () => page.locator('.stage canvas[data-lanes]').getAttribute('data-lanes');
  const tileV = (p: string) => page.locator(`.pme-stile[data-param="${p}"] [data-pme="v"]`);

  // attached (the default patient): the capnogram lane in RESP's place, an EtCO2 number with awRR
  expect(await lanes()).toBe('ECG1 PLETH IBP1 IBP2 CO2');
  await expect(page.locator('.pme-stile[data-param="CO2"] [data-pme="lbl"]')).toHaveText('CO2');
  await expect(tileV('CO2')).toHaveText(/^\d+$/, { timeout: 20_000 });
  await expect(page.locator('.pme-stile[data-param="CO2"]')).toContainText('awRR');
  await expect(page.locator('.pme-stile[data-param="RR"]')).toHaveCount(0);
  await page.waitForTimeout(4000); // a few breaths drawn for the screenshot
  await save(page, 'capnogram-attached-1280x800', browserName);

  // detach the CO2 sampling line: RESP and RR come back
  await tab(page, 'devices');
  const line = page.getByRole('button', { name: 'CO₂ sampling line' });
  await expect(line).toHaveAttribute('aria-pressed', 'true');
  await line.click();
  await expect.poll(lanes, { timeout: 10_000 }).toBe('ECG1 PLETH IBP1 IBP2 RESP');
  await expect(page.locator('.pme-stile[data-param="RR"]')).toHaveCount(1);
  await expect(page.locator('.pme-stile[data-param="CO2"]')).toHaveCount(0);
  await expect(tileV('RR')).toHaveText(/^\d+$/, { timeout: 20_000 });
  await page.waitForTimeout(4000);
  await save(page, 'capnogram-detached-1280x800', browserName);

  // and attached again: the capnogram is back
  await line.click();
  await expect.poll(lanes, { timeout: 10_000 }).toBe('ECG1 PLETH IBP1 IBP2 CO2');
});
