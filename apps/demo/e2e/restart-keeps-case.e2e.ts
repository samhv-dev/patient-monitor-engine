// FX-12 (classroom; Q1 rehearsal): after "Restart patient" the instructor's view read "No scenario", the bookmark list
// was gone with the case's panel, and "Return here" brought back the patient and the clock but not the case (no card
// buttons, a free-run Debrief). The case now survives a restart: it starts again from 0:00 on its own patient, the
// bookmarks stay listed, and "Return here" goes back into the case. On Instructor v2 (the one instructor view since
// #323): the header's title names the case, the dock's mark saves the bookmark, the Patient sheet holds "Restart
// patient", the Log sheet lists the marks with "Return here".
import { expect, test } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, sheet, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { link: { simT: number; ctl: { scenario: { doc: { id: string } | null }; bookmarks: string[] } } } };
const caseId = (page: import('@playwright/test').Page) => page.evaluate(() => (window as unknown as W).__pmeApp.link.ctl.scenario.doc?.id ?? null);

test('Restart patient keeps the case: the header names it, the marks stay, Return here goes back into it', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, base, '?scenario=showcase-induction#/teach2', { warmMs: 1500 });
  const title = page.locator('.ip2-head .ip2-title');
  const stage = page.locator('.ip2-cue .ip2-cue-name');
  await expect(title).toHaveText('Healthy induction', { timeout: 10_000 });
  await page.locator('.ip2-dock .ip2-mark[data-kind="good"]').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__pmeApp.link.ctl.bookmarks.length)).toBe(1);
  const mark = await page.evaluate(() => (window as unknown as W).__pmeApp.link.ctl.bookmarks[0] as string);

  const patient = await sheet(page, 'patient');
  await patient.getByRole('button', { name: 'Restart patient', exact: true }).click();
  await page.locator('dialog[open]').getByRole('button', { name: 'Restart patient', exact: true }).click();
  await page.waitForTimeout(1000);
  await expect(title, 'the header names the case after the restart').not.toHaveText('No case loaded');
  await expect(title).toHaveText('Healthy induction');
  await expect(stage, 'the cue box shows a stage of the case').not.toBeEmpty();
  expect(await caseId(page)).toBe('showcase-induction');

  const log = await sheet(page, 'log');
  const marks = log.locator('.ip2-marks');
  await expect(marks, 'the mark is still listed').toContainText(mark);
  await marks.getByRole('button', { name: 'Return here' }).first().click();
  await page.locator('dialog[open]').getByRole('button', { name: 'Return', exact: true }).click();
  await page.waitForTimeout(1000);
  await expect(title, 'Return here goes back into the case').toHaveText('Healthy induction');
  await expect(stage).not.toBeEmpty();
  expect(await caseId(page)).toBe('showcase-induction');
});
