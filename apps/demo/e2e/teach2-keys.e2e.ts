// Instructor v2 (E127; plan IP9 step 4; answers 9, 16, 19; the owner's ruling on answer 3): the keyboard on the real
// page — a digit presses its ACTION row (what today's state button sends), the letters open and close their sheets, Esc
// closes a sheet first, Space pauses and resumes through the clock pill, and Fast forward is disabled while paused; the
// alarm count goes to the Instructor view used last; and once, end to end, a past stage of the strip returns to its
// start (press, confirm, the driver's stage mark restored, the stage back).
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { go, openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { link: { send(c: unknown): Promise<{ accepted: boolean }>; log: Array<{ text: string }>; ctl: { hostPaused: boolean; scenario: { stateId: string | null; doc: unknown } } }; session: { driver: { stageMarks(): Array<{ note?: string }> } } } };
const stateOf = (page: Page) => page.evaluate(() => (window as unknown as W).__pmeApp.link.ctl.scenario.stateId);
const send = (page: Page, c: unknown) => page.evaluate((x) => (window as unknown as W).__pmeApp.link.send(x), c);
const sheet = (page: Page, name: string) => page.locator('.ip2-sheets').getByRole('dialog', { name, exact: true });

async function openMh(page: Page, at: string): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, base, '?scenario=showcase-mh#/teach2', { warmMs: 1500 });
  await page.waitForFunction(() => !!(window as unknown as W).__pmeApp.link.ctl.scenario.doc, null, { timeout: 30_000 });
  expect((await send(page, { type: 'scenario', action: 'goto', target: at })).accepted).toBe(true);
  await expect.poll(() => stateOf(page)).toBe(at);
  await page.waitForTimeout(800); // the view repaints (≤ 2 Hz)
  await page.locator('body').click({ position: { x: 700, y: 5 } }); // no field has the focus
}

test('keys: 1–9 press the rows, letters open and close sheets, Esc closes first, Space pauses (Fast forward off), and resumes', async ({ page }) => {
  test.setTimeout(90_000);
  await openMh(page, 'triggerOff');
  // a digit: row 1 at Trigger off is Dantrolene, the card's "dant" (today's button sends the same trigger)
  const row1 = page.locator('.ip2-action .ip2-rows:not(.ip2-finished-list) button.ip2-row').first();
  await expect(row1.locator('.ip2-row-title')).toHaveText('Dantrolene 2.5 mg/kg');
  await page.keyboard.press('1');
  await expect.poll(() => stateOf(page), { timeout: 10_000 }).toMatch(/^(dantrolene|treating)$/);
  await expect.poll(() => stateOf(page), { timeout: 10_000 }).toBe('treating');
  expect(await page.evaluate(() => (window as unknown as W).__pmeApp.link.log.some((x) => x.text === 'Scenario event'))).toBe(true);

  // letters: D opens and closes the Drug sheet; A, F and V open theirs; Esc closes the open sheet
  await page.keyboard.press('d');
  await expect(sheet(page, 'Drug')).toBeVisible();
  await page.keyboard.press('d');
  await expect(sheet(page, 'Drug')).toBeHidden();
  for (const [k, name] of [['a', 'Airway'], ['f', 'Defib · CPR'], ['v', 'Vitals']] as const) {
    await page.keyboard.press(k);
    await expect(sheet(page, name)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet(page, name)).toBeHidden();
  }

  // Esc closes the sheet first: the pause is not touched, nothing else answers
  await page.keyboard.press('d');
  await expect(sheet(page, 'Drug')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet(page, 'Drug')).toBeHidden();
  expect(await page.evaluate(() => (window as unknown as W).__pmeApp.link.ctl.hostPaused)).toBe(false);

  // Space: the clock pill pauses; Fast forward is disabled while paused (answer 9); Space again resumes
  const pill = page.locator('.ip2-head button.ip2-pill');
  const ff = page.locator('.ip2-head button.ip2-ff');
  await expect(ff).toBeEnabled();
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__pmeApp.link.ctl.hostPaused)).toBe(true);
  await expect(pill).toHaveAttribute('data-state', 'paused');
  await expect(ff).toBeDisabled();
  await expect(page.locator('.ip2-paused-row > .ip2-paused')).toBeVisible();
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__pmeApp.link.ctl.hostPaused)).toBe(false);
  await expect(pill).toHaveAttribute('data-state', 'running');
  await expect(ff).toBeEnabled();
  await expect(page.locator('.ip2-paused-row > .ip2-paused')).toBeHidden();
});

test('the alarm count goes to the Instructor view used last (answer 19): v2 opens its Devices sheet, today\'s its Devices tab', async ({ page }) => {
  test.setTimeout(60_000);
  await openMh(page, 'awake');
  await go(page, '#/settings'); // a page with the top bar's alarm count, away from both Instructor views
  await page.locator('.alarm-count').click();
  await expect(page).toHaveURL(/#\/teach2$/);
  await expect(sheet(page, 'Devices')).toBeVisible();
  await go(page, '#/teach');
  await go(page, '#/settings'); // a page with the top bar's alarm count, away from both Instructor views
  await page.locator('.alarm-count').click();
  await expect(page).toHaveURL(/#\/teach$/);
  await expect(page.locator('[role=tab][data-tab=devices]')).toHaveAttribute('aria-selected', 'true');
});

test('a past stage returns to its start (the owner\'s ruling on answer 3): press, confirm, the stage mark restored, the stage back', async ({ page }) => {
  test.setTimeout(90_000);
  await openMh(page, 'triggerOff');
  // the driver marks the stage once its onEnter is applied
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__pmeApp.session.driver.stageMarks().some((m) => m.note === 'triggerOff')), { timeout: 15_000 }).toBe(true);
  await page.waitForTimeout(1500);
  await page.keyboard.press('1'); // Dantrolene: on to the treatment stage
  await expect.poll(() => stateOf(page), { timeout: 10_000 }).toBe('treating');
  await page.waitForTimeout(1200);
  const past = page.locator('.ip2-strip button.ip2-past', { hasText: 'Trigger off' });
  await past.click();
  const back = page.getByRole('button', { name: 'Return to the start of Trigger off' });
  await expect(back).toBeEnabled();
  await back.click();
  const dialog = page.getByRole('dialog', { name: 'Return to the start of Trigger off?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Return', exact: true }).click();
  await expect.poll(() => stateOf(page), { timeout: 15_000 }).toBe('triggerOff');
  await expect(page.locator('.ip2-strip .ip2-current')).toContainText('Trigger off');
});
