// "Choose another scenario" pressed as soon as the Scenario tab opens (finding F-CW3-1, fix-ci-webkit-3): the tab's
// first throttled repaint used to read as a new scenario document and close the library again about 1.5 s later, so
// the presenter had to press twice. The library now stays up until a scenario is loaded; loading one brings back the
// run view for the new case.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

test('the scenario library opened before the first repaint stays open until a scenario is loaded', async ({ page }) => {
  test.setTimeout(60_000);
  await openApp(page, base, '?scenario=showcase-tamponade', { warmMs: 1000 });
  const run = page.getByRole('region', { name: 'Running scenario' });
  const library = page.getByRole('region', { name: 'Scenario library' });

  // press at once: no wait for the tab's first repaint
  await page.click('[role=tab][data-tab=scenario]');
  await page.getByRole('button', { name: 'Choose another scenario' }).click();
  await expect(library).toBeVisible();
  // several repaints (≤ 2 Hz, plus the 1 s tick) with no new scenario document: the library is still up
  await page.waitForTimeout(3000);
  await expect(library).toBeVisible();
  await expect(run).toBeHidden();

  await library.getByRole('article', { name: 'Anaphylaxis under anaesthesia' }).getByRole('button', { name: 'Load' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Load scenario' }).click();
  await expect(run).toBeVisible({ timeout: 10_000 });
  await expect(run.locator('h3').first()).toContainText('Anaphylaxis under anaesthesia');
  await expect(library).toBeHidden();
});
