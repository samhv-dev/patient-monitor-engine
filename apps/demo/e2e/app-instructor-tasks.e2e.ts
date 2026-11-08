// The brief's five timed instructor tasks (research/13 brief §11.6), driven through the visible UI only — clicks, typing
// and keys, never the app hook — so a broken path shows as a failure. Each must finish in < 30 s; the times are
// written to the test annotations for the gate note. The same five tasks are the script for the owner's timed usability run.
// Chromium only (a heavy evidence run, CI amendment rules).
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { closeSheets, deliver, openApp, sheet, startVite } from './app-support.ts';

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
const logText = (p: Page) => p.locator('.ip2-sheet[data-sheet=log] .log').innerText();

test('five instructor tasks, each under 30 s', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'evidence run: Chromium only');
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  // E125: the free-run patient's page opens the Instructor view (Instructor v2)
  await openApp(page, base, '#/patient', { warmMs: 3000 });

  // Task 3 runs first: holding and returning a value needs MODELED physiology, and the ACLS case runs MANUAL.
  await timed('3. Hold SpO₂ at 85 %, then return it to the model', async () => {
    await page.click('text=Open the instructor view');
    const vitals = await sheet(page, 'vitals');
    const row = vitals.locator('[data-var=spo2]');
    await row.locator('input').fill('85');
    await row.locator('input').dispatchEvent('change');
    await row.locator('button', { hasText: 'Set' }).click();
    await deliver(page); // v2's Deliver: the staged footer's Commit (Ctrl+Enter), which v2 gives no key
    await expect(row.locator('.chip')).toContainText(/Held|Model override/, { timeout: 10_000 });
    await row.locator('button', { hasText: 'Return to model' }).click();
    await deliver(page);
    await expect(row.locator('.chip')).toBeHidden({ timeout: 10_000 });
  });

  await timed('1. Load the ACLS VF case', async () => {
    await closeSheets(page); // ACTION with no case: the three ways to begin
    await page.locator('.ip2-action button.ip2-begin-card[data-way=library]').click();
    await page.locator('.ip2-action .ip2-case-list button.ip2-case-row', { hasText: 'Load Witnessed VF in PACU' }).click();
    await expect(page.locator('.ip2-head .ip2-title')).toContainText('Witnessed VF in PACU');
  });

  await timed('2. Give noradrenaline 0.1 µg/kg/min', async () => {
    const drug = await sheet(page, 'drug');
    await drug.locator('input.ip2-drug-search').fill('noradr');
    await page.keyboard.press('Enter');
    await drug.locator('.ip2-presets button.ip2-preset', { hasText: '0.1 µg/kg/min' }).click();
    await drug.locator('button.ip2-give', { hasText: /^Start norepinephrine 0\.1 / }).click();
    await expect(page.locator('.toasts')).toContainText('Norepinephrine 0.1 µg/kg/min infusion started');
  });

  await timed('4. Silence the alarm and bookmark', async () => {
    await closeSheets(page);
    await page.locator('.ip2-action').click({ position: { x: 5, y: 5 } }); // focus out of any field
    await page.keyboard.press('Shift+S');
    // v2 has no Shift+B (retire-instructor-v1 G6): the dock's mark sends today's bookmark command, labelled "Mark n at"
    await page.locator('.ip2-dock').getByRole('button', { name: 'Mark: good' }).click();
    await sheet(page, 'log');
    await expect.poll(() => logText(page)).toContain('Alarm sound silenced');
    await expect.poll(() => logText(page)).toMatch(/Mark 1 at \d\d:\d\d/);
  });

  await timed("5. Find the patient's compliance and driving pressure", async () => {
    await page.click('nav.rail a[data-route="explore"]'); // E125: the rail replaced the top bar's tabs
    await page.click('nav.xnav >> text=Respiratory mechanics and volumes');
    const labels = page.locator('table.values tbody th');
    await expect(labels.filter({ hasText: /^Cstat/ })).toHaveCount(1);
    await expect(labels.filter({ hasText: /^ΔP/ })).toHaveCount(1); // published by 7k (Request R-S9-3)
  });
});
