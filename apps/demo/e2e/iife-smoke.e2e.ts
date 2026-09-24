import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

const smokeUrl = pathToFileURL(resolve(import.meta.dirname, 'iife-smoke.html')).href;

test('the IIFE loads from file:// and exposes window.PatientMonitor.version', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(smokeUrl);
  const version = await page.evaluate(
    () => (window as unknown as { PatientMonitor?: { version?: string } }).PatientMonitor?.version,
  );
  expect(version).toBe('0.0.0');
  expect(errors).toEqual([]);
});
