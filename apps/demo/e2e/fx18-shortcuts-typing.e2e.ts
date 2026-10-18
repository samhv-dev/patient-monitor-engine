// FX-18: single-key shortcuts fired while typing in the Debrief notes (a contenteditable div): `i` toggled the
// instructor view and swallowed the letter. Typing "mini" there now reads "mini" and leaves the view alone; `i` with
// nothing focused on the Monitor still opens the instructor view. Both browsers.
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

type W = { __pmeApp: { shell: { route: { id: string } } } };
const route = (page: Page) => page.evaluate(() => (window as unknown as W).__pmeApp.shell.route.id);

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

test('typing in the Debrief notes is text, not shortcuts; `i` on the Monitor still toggles the instructor view', async ({ page }) => {
  test.setTimeout(90_000);
  // the Debrief is opened after load: when the page loads on #/debrief its first 5 s refresh empties the notes once
  // (the run record's start changes after the view's first render), which is not this test's subject
  await openApp(page, base, '#/monitor', { warmMs: 1500 });
  await page.evaluate(() => (location.hash = '#/debrief'));
  await expect.poll(() => route(page)).toBe('debrief');
  const panel = page.getByRole('region', { name: 'Instructor panel' });
  const shown = await panel.isVisible();
  const notes = page.locator('[data-view=debrief] .db-notes');
  await notes.click();
  await page.keyboard.type('mini');
  await expect(notes).toHaveText('mini');
  await page.waitForTimeout(300);
  expect(await route(page)).toBe('debrief');
  expect(await panel.isVisible()).toBe(shown);

  await page.evaluate(() => (location.hash = '#/monitor'));
  await expect.poll(() => route(page)).toBe('monitor');
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(panel).toBeHidden();
  await page.keyboard.press('i');
  await expect.poll(() => route(page)).toBe('teach');
  await expect(panel).toBeVisible();
});
