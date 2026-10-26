// The brief's five timed instructor tasks (research/13 brief §11.6), driven through the visible UI only — clicks, typing
// and keys, never the app hook — so a broken path shows as a failure. Each must finish in < 30 s; the times are
// written to the test annotations for the gate note. The same five tasks are the script for Ali's timed usability run.
// Chromium only (a heavy evidence run, CI amendment rules).
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite, tab } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

async function timed(name: string, fn: () => Promise<void>): Promise<void> {
  const t0 = Date.now();
  await fn();
  const s = (Date.now() - t0) / 1000;
  test.info().annotations.push({ type: 'task', description: `${name}: ${s.toFixed(1)} s` });
  console.log(`[task] ${name}: ${s.toFixed(1)} s`);
  expect(s, name).toBeLessThan(30);
}
const logText = (p: Page) => p.locator('.log').innerText();

test('five instructor tasks, each under 30 s', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'evidence run: Chromium only');
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page, base, '#/patient', { warmMs: 3000 }); // E125: the free-run patient's page opens the Instructor view

  // Task 3 runs first: holding and returning a value needs MODELED physiology, and the ACLS case runs MANUAL.
  await timed('3. Hold SpO₂ at 85 %, then return it to the model', async () => {
    await page.click('text=Open the instructor view');
    await tab(page, 'vitals');
    const row = page.locator('[data-var=spo2]');
    await row.locator('input').fill('85');
    await row.locator('input').dispatchEvent('change');
    await row.locator('button', { hasText: 'Set' }).click();
    await page.keyboard.press('Control+Enter');
    await expect(row.locator('.chip')).toContainText(/Held|Model override/, { timeout: 10_000 });
    await row.locator('button', { hasText: 'Return to model' }).click();
    await page.locator('.stagebar button.primary').click();
    await expect(row.locator('.chip')).toBeHidden({ timeout: 10_000 });
  });

  await timed('1. Load the ACLS VF case', async () => {
    await tab(page, 'scenario');
    await page.click('.chips >> text=Resuscitation');
    await page.locator('.scard', { hasText: 'Witnessed VF in PACU' }).locator('button', { hasText: 'Load' }).click();
    await expect(page.locator('.sessionbar .scen')).toContainText('Witnessed VF in PACU');
  });

  await timed('2. Give noradrenaline 0.1 µg/kg/min', async () => {
    await tab(page, 'drugs');
    await page.fill('input[type=search]', 'noradr');
    await page.keyboard.press('Enter');
    await page.locator('.card.dose .chips button', { hasText: '0.1 µg/kg/min' }).click();
    await page.click('.card.dose >> text=Start infusion');
    await expect(page.locator('.toasts')).toContainText('Norepinephrine 0.1 µg/kg/min infusion started');
  });

  await timed('4. Silence the alarm and bookmark', async () => {
    await page.locator('.panel').click({ position: { x: 5, y: 5 } }); // focus out of any field
    await page.keyboard.press('Shift+S');
    await page.keyboard.press('Shift+B');
    await tab(page, 'log');
    await expect.poll(() => logText(page)).toContain('Alarm sound silenced');
    await expect.poll(() => logText(page)).toMatch(/Bookmark 1 at \d\d:\d\d/);
  });

  await timed("5. Find the patient's compliance and driving pressure", async () => {
    await page.click('nav.rail a[data-route="explore"]'); // E125: the rail replaced the top bar's tabs
    await page.click('nav.xnav >> text=Respiratory mechanics and volumes');
    const labels = page.locator('table.values tbody th');
    await expect(labels.filter({ hasText: /^Cstat/ })).toHaveCount(1);
    await expect(labels.filter({ hasText: /^ΔP/ })).toHaveCount(1); // published by 7k (Request R-S9-3)
  });
});
