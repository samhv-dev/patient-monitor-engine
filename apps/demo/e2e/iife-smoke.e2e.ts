import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

const smokeUrl = pathToFileURL(resolve(import.meta.dirname, 'iife-smoke.html')).href;

type PM = {
  version?: string;
  createEngine?: unknown;
  transports?: unknown;
  mountMonitor?: (el: HTMLElement, o: object) => { renderPath: Promise<string> };
};

test('the IIFE loads from file:// and exposes window.PatientMonitor.version', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(smokeUrl);
  const version = await page.evaluate(() => (window as unknown as { PatientMonitor?: PM }).PatientMonitor?.version);
  expect(version).toBe('0.0.0');
  expect(errors).toEqual([]);
});

test('Stage 1: mountMonitor draws two ECG lanes and an HR number from file://', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(smokeUrl);
  const shape = await page.evaluate(() => {
    const pm = (window as unknown as { PatientMonitor: PM }).PatientMonitor;
    return [typeof pm.mountMonitor, typeof pm.createEngine, typeof pm.transports];
  });
  expect(shape).toEqual(['function', 'function', 'object']);
  const path = await page.evaluate(async () => {
    const pm = (window as unknown as { PatientMonitor: PM }).PatientMonitor;
    const h = pm.mountMonitor!(document.getElementById('pm')!, { skin: 'philips-like', engine: { seed: 1 } });
    return h.renderPath;
  });
  expect(['worker-raf', 'worker-pump', 'main']).toContain(path);
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.locator('.pme-tile')).toContainText(/HR[\s\S]*\d{2,3}/, { timeout: 15_000 });
  expect(errors).toEqual([]);
});
