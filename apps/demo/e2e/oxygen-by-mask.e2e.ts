// E121b: oxygen is never assumed. On the default patient, breathing spontaneously at room air, the Instructor panel's
// Airway & ventilation tab gives oxygen by face mask at 10 L/min through Stage and Commit; the patient's FiO₂ on the
// Vitals tab goes from 21 % to 60 %, the log and the Debrief's timeline print the line, Off brings back room air, and on
// the ventilator the control is disabled and says what is in use ("… FiO₂ 50 % from the ventilator.", UI review #13).
// Driven through the visible UI only. Chromium only (one engine path; CI amendment rules).
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite, tab } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

const LINE = 'Oxygen by face mask 10 L/min (FiO₂ 60 %)';
const fio2 = async (page: Page) => {
  await tab(page, 'vitals');
  return page.locator('[data-var=fio2] .now').innerText();
};
const giveOxygen = async (page: Page, device: string) => {
  await tab(page, 'airway');
  await page.getByRole('group', { name: 'Oxygen' }).getByRole('button', { name: device }).click();
  await page.locator('h3:text-is("Oxygen") ~ .row').first().getByRole('button', { name: 'Stage' }).click();
  await page.locator('.stagebar button.primary').click(); // Commit
};

test('oxygen by face mask on the breathing patient: FiO₂ 21 → 60 %, logged, and printed by the Debrief', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Chromium only');
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page, base, '#/patient', { warmMs: 2000 }); // E125: the free-run patient's page
  await page.click('text=Open the instructor view');

  await expect.poll(() => fio2(page), { timeout: 10_000 }).toBe('21');
  await giveOxygen(page, 'Face mask');
  await expect.poll(() => fio2(page), { timeout: 15_000 }).toBe('60');

  await tab(page, 'log');
  await expect(page.locator('.log')).toContainText(LINE);

  await giveOxygen(page, 'Off (room air)');
  await expect.poll(() => fio2(page), { timeout: 15_000 }).toBe('21');

  // on the ventilator the control is off: FiO₂ is the ventilator's, and Oxygen must never take the patient off it
  await tab(page, 'airway');
  await page.getByRole('group', { name: 'Breathing' }).getByRole('button', { name: 'Ventilator' }).click();
  await page.locator('h3:text-is("Breathing") ~ .row').first().getByRole('button', { name: 'Stage' }).click();
  await page.locator('.stagebar button.primary').click(); // Commit
  const o2Stage = page.locator('h3:text-is("Oxygen") ~ .row').first().getByRole('button', { name: 'Stage' });
  await expect(o2Stage).toBeDisabled({ timeout: 10_000 });
  // the FiO₂ the engine reports: it reaches the ventilator's 50 % within a few seconds of the commit
  await expect(page.getByText(/in use.*: FiO₂ 50 % from the ventilator\./)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('group', { name: 'Oxygen' }).locator('[aria-pressed=true]')).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Oxygen' }).getByRole('button', { name: 'Face mask' })).toBeDisabled();

  await page.click('.sessionbar >> text=Debrief');
  const timeline = page.locator('.db-timeline');
  await expect(timeline).toContainText(LINE, { timeout: 10_000 });
  await expect(timeline).toContainText('Oxygen off: room air (FiO₂ 21 %)');
});
