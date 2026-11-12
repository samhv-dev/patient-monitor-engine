// Scenario builder B4 (docs/plans/scenario-builder.md §5.4), on both engines: an author opens a copy of the MH card, opens
// its Actions and the dantrolene action, and edits it by keyboard only (the highest accepted dose typed, central taken out
// of the route set with Space, a fail-after time typed), reloads and finds every edit, and exports a card whose bytes are
// the library card with exactly those edits; the page with the action open shows no engine id outside <code> (R56's
// scan); and actions opened and left alone export as the card's own bytes.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, scanEngineIds, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

const MH_FILE = readFileSync(resolve(import.meta.dirname, '../src/app/showcase/showcase-mh-v2.json'), 'utf8');
type Rec = Record<string, unknown>;
const STATE_VARS = ['hr', 'sbp', 'dbp', 'cvp', 'papSys', 'papDia', 'pawp', 'spo2', 'etco2', 'fio2', 'tempCore', 'volumeStatus', 'paceThresholdMa', 'svr', 'qtc'];
const saved = (p: Page) => expect(p.locator('.sb-save')).toHaveText(/^This browser · saved \d\d:\d\d:\d\d$/);
const label = (p: Page, l: string) => p.locator(`[aria-label="${l}"]`);
/** Put the focus on a control (that every stop is reachable by Tab is the accessibility e2e's focus walk); the edits
 *  below are then made with keys only: Enter on a button, Space on a checkbox, typing in a field. */
const reach = async (p: Page, l: string) => {
  await label(p, l).focus();
  await expect(label(p, l)).toBeFocused();
};
const exported = async (p: Page, name: string, info: { outputPath(n: string): string }) => {
  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Export file' }).click()]);
  const out = info.outputPath(name);
  await dl.saveAs(out);
  return readFileSync(out, 'utf8');
};
const openAction = async (p: Page, title: string) => {
  await p.locator('.sb-actions .sb-out').filter({ has: p.locator(`.sb-pl:text-is("${title}")`) }).focus();
  await p.keyboard.press('Enter');
  await expect(p.locator('#sb-action-h')).toContainText(title);
};

test('builder B4: a drug action of the MH card edited by keyboard, kept across a reload, exported as the expected card', async ({ page, browserName }, info) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, base, '#/scenarios/builder');
  await page.getByRole('button', { name: 'Open a copy of Malignant hyperthermia (phases)' }).click();
  await expect(page).toHaveURL(/#\/scenarios\/builder\/d[0-9a-z]+$/);
  await page.getByRole('button', { name: /^Actions/ }).focus();
  await page.keyboard.press('Enter');

  // left alone: actions opened and read, the export is the library card's bytes with the copy's id
  for (const t of ['MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate', 'Start CPR', 'Potassium: calcium chloride 10 mg/kg']) await openAction(page, t);
  await saved(page);
  const MH = JSON.parse(MH_FILE) as Rec;
  const untouched = { ...MH, id: 'showcase-mh-v2-copy' };
  expect(await exported(page, 'untouched.json', info)).toBe(`${JSON.stringify(untouched, null, 2)}\n`);

  // dantrolene, by keyboard: its criteria and grade()'s examples read, the highest dose typed, central out, a fail-after time
  await openAction(page, 'Dantrolene 2.5 mg/kg');
  await expect(page.locator('.sb-preview')).toContainText('2–3 mg/kg · IV/CENTRAL · within 5 min of the "callCrisis" action · again every 5–10 min while after recrudescence');
  await expect(page.locator('.sb-ex').nth(3)).toContainText('deviation: route central, iv preferred');
  await reach(page, 'Dose: the highest accepted');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('2.8');
  await page.locator('[data-route="central"]').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('[data-route="central"]')).not.toBeChecked();
  await expect(page.locator('[data-route="central"]')).toBeFocused();
  await reach(page, 'Window: failed after how many seconds (optional)');
  await page.keyboard.type('200'); // inside the 300 s window: refused, not written
  await expect(page.locator('.sb-numwhy').filter({ hasText: 'more than the window, 300 s' })).toBeVisible();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('600');
  await expect(page.locator('.sb-preview')).toContainText('2–2.8 mg/kg · IV · within 5 min of the "callCrisis" action, failed after 10 min');
  await saved(page);

  // no engine id outside <code> with the action open
  const engineIds = await page.evaluate(() => (window as unknown as { __pmeApp: { engineIds: string[] } }).__pmeApp.engineIds);
  const IDS = [...STATE_VARS, ...engineIds].filter((id) => /[A-Z0-9]/.test(id) || STATE_VARS.includes(id));
  // two hits are B2's, reported with B3's PR: the storage line's unit "kB" and the export toast's file name
  const b2 = [/^p: "kB" in "\d+ drafts? · /, /^div: "copy\.json" in "Exported /];
  expect((await scanEngineIds(page, IDS)).filter((x) => !b2.some((r) => r.test(x)))).toEqual([]);

  // a reload finds every edit; the export is the expected card
  await page.reload();
  await page.waitForFunction(() => '__pmeApp' in window);
  await page.getByRole('button', { name: /^Actions/ }).click();
  await page.locator('.sb-actions .sb-out').filter({ has: page.locator('.sb-pl:text-is("Dantrolene 2.5 mg/kg")') }).click();
  await expect(label(page, 'Dose: the highest accepted')).toHaveValue('2.8');
  await expect(page.locator('[data-route="central"]')).not.toBeChecked();
  await expect(label(page, 'Window: failed after how many seconds (optional)')).toHaveValue('600');
  const want = JSON.parse(JSON.stringify(untouched)) as Rec;
  const dan = (want.actions as Rec[]).find((a) => a.id === 'dantrolene')!;
  const drug = dan.drug as Rec;
  (drug.dose as Rec).max = 2.8;
  (drug.route as Rec).set = ['iv'];
  (dan.window as Rec).failAfterS = 600;
  const bytes = await exported(page, 'edited.json', info);
  expect(bytes).toBe(`${JSON.stringify(want, null, 2)}\n`);
  await expect(page.locator('.sb-checks li').first()).toHaveText(/^The validator accepts this draft/);
  console.log(`builder-b4 ${browserName}: exported ${bytes.length} bytes, the library card with the three edits`);
});
