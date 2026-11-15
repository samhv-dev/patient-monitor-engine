// Scenario builder B6 (docs/plans/scenario-builder.md §6, mock-up 04), on both engines: an author imports a small card
// as a draft, runs it in place, and Instructor v2 opens with the run panel beside it; "To the next phase" fast-forwards
// and stops at the phase change, and "What fired, and why" names the rule's leaf with the value it read, the script
// entry and the action it opened. The draft is in neither the library, the imported cards nor Recent. An edit in the
// builder does not change the run until "Apply my edits and restart". The three widths are captured for the PR.
import { writeFileSync } from 'node:fs';
import { expect, test } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

/** Calm, then Warm once HR has been above 0 for 90 s (the stop "To the next phase" meets); a script entry on Warm's
 *  entry and an action whose window opens with it. */
const CARD = {
  schema: 'pme-scenario/2', id: 'b6-run-draft', title: 'B6 run draft',
  phases: [
    { id: 'calm', label: 'Calm', initial: true, next: ['warm'] },
    { id: 'warm', label: 'Warm', enter: { value: { var: 'hr', op: '>', value: 0, forS: 90 } } },
  ],
  actions: [{ id: 'callHelp', label: 'Call for help', kind: 'communication', phases: ['warm'], window: { anchor: 'phase:warm', withinS: 120 } }],
  script: [{ id: 'warmUp', on: 'phase:warm', commands: [{ type: 'setTarget', variable: 'hr', value: 100 }] }],
};

test('builder B6: a draft runs in place beside Instructor v2, the next phase is reached and the log says why', async ({ page, browserName }, info) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openApp(page, base, '#/scenarios/builder');
  const file = info.outputPath('b6-run-draft.json');
  writeFileSync(file, JSON.stringify(CARD));
  await page.locator('#sb-import').setInputFiles(file);
  await expect(page).toHaveURL(/#\/scenarios\/builder\/d[0-9a-z]+$/);
  const draftUrl = page.url();
  await expect(page.locator('.sb-save')).toHaveText(/saved/);
  const run = page.getByRole('button', { name: 'Run in place' });
  await expect(run).toBeEnabled();
  await run.click();

  await expect(page).toHaveURL(/#\/teach2$/);
  const panel = page.locator('aside.sb-run');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'Run in place' })).toBeVisible();
  await expect(panel).toContainText('It is not in the library');
  await expect(panel.locator('.sb-run-log')).toContainText('Calm: the card starts here');

  await panel.getByRole('button', { name: 'To the next phase' }).click();
  const log = panel.locator('.sb-run-log');
  await expect(log).toContainText('Warm entered by its rule', { timeout: 60_000 });
  await expect(log).toContainText(/hr \S+ > 0, held 90 of 90 s ✓/);
  await expect(log).toContainText('Script (card-set) warmUp, on entering Warm');
  await expect(log).toContainText('Opened: Call for help');
  await expect(page.locator('.ff-banner')).toContainText('stopped early: the next phase began');
  await page.waitForTimeout(8500); // the banner's own 8 s, so the shot shows the run
  await page.screenshot({ path: info.outputPath(`run-in-place-1920-${browserName}.png`) });

  // the draft is nowhere a device could name it
  const kept = await page.evaluate(() => ({ imported: localStorage.getItem('pme.imported-cards'), recent: localStorage.getItem('pme.recent-cards') }));
  expect(kept.imported ?? '').not.toContain('b6-run-draft');
  expect(kept.recent ?? '').not.toContain('b6-run-draft');

  // an edit in the builder does not touch the run; Apply my edits and restart runs it again from 0:00
  await page.goto(draftUrl);
  await page.getByLabel('Title').fill('B6 run draft, edited');
  await expect(page.locator('.sb-save')).toHaveText(/saved/);
  await page.evaluate(() => (location.hash = '#/teach2'));
  await expect(panel).toContainText('The draft B6 run draft (b6-run-draft)');
  await panel.getByRole('button', { name: 'Apply my edits and restart' }).click();
  await expect(panel).toContainText('The draft B6 run draft, edited (b6-run-draft)');
  await expect(log).not.toContainText('Warm entered');

  // below 1600 px the panel folds to a strip by itself (finding 5: Instructor v2 crowds below about 1000 px of its
  // own); the author may open it again, and then the width no longer decides
  for (const w of [1440, 1280]) {
    await page.setViewportSize({ width: w, height: 900 });
    await expect(page.locator('.app')).toHaveAttribute('data-run', 'strip');
    await page.waitForTimeout(1200); // Instructor v2 repaints at 1 Hz
    await page.screenshot({ path: info.outputPath(`run-in-place-${w}-strip-${browserName}.png`) });
  }
  await panel.getByRole('button', { name: 'Run panel' }).click();
  await expect(page.locator('.app')).toHaveAttribute('data-run', 'open');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: info.outputPath(`run-in-place-1280-open-${browserName}.png`) });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(page.locator('.app')).toHaveAttribute('data-run', 'open');
});
