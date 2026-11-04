// FX-12 (classroom; Q1 rehearsal): after "Restart patient" the session bar read "No scenario", the bookmark list was gone
// with the case's panel, and "Return here" brought back the patient and the clock but not the case (no card buttons, a
// free-run Debrief). The case now survives a restart: it starts again from 0:00 on its own patient, the bookmarks stay
// listed, and "Return here" goes back into the case.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { link: { simT: number; ctl: { scenario: { doc: { id: string } | null }; bookmarks: string[] } } } };
const caseId = (page: import('@playwright/test').Page) => page.evaluate(() => (window as unknown as W).__pmeApp.link.ctl.scenario.doc?.id ?? null);

test('Restart patient keeps the case: the bar names it, the bookmarks stay, Return here goes back into it', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, base, '?scenario=showcase-induction', { warmMs: 1500 });
  const bar = page.locator('.sessionbar');
  await expect(bar).toContainText('Healthy induction', { timeout: 10_000 });
  await page.click('[role=tab][data-tab=scenario]');
  await page.getByRole('button', { name: 'Bookmark', exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__pmeApp.link.ctl.bookmarks.length)).toBe(1);
  const mark = await page.evaluate(() => (window as unknown as W).__pmeApp.link.ctl.bookmarks[0] as string);

  await page.click('[role=tab][data-tab=patient]');
  await page.getByRole('button', { name: 'Restart patient', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Restart patient' }).click();
  await page.waitForTimeout(1000);
  await expect(bar, 'the bar names the case after the restart').not.toContainText('No scenario');
  await expect(bar).toContainText('Healthy induction');
  expect(await caseId(page)).toBe('showcase-induction');

  await page.click('[role=tab][data-tab=scenario]');
  const marks = page.locator('.marks');
  await expect(marks, 'the bookmark is still listed').toContainText(mark);
  await marks.getByRole('button', { name: 'Return here' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Return' }).click();
  await page.waitForTimeout(1000);
  await expect(bar, 'Return here goes back into the case').toContainText('Healthy induction');
  expect(await caseId(page)).toBe('showcase-induction');
});
