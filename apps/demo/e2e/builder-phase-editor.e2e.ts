// Scenario builder B3 (docs/plans/scenario-builder.md §5.3), on both engines: an author opens a copy of the MH card,
// opens Early signs and edits its rule by keyboard only (a threshold typed, a plasma propofol condition added through
// the add form, Treated moved up the list of where the phase leads), reloads and finds every edit, and exports a card
// whose bytes are the library card with exactly those edits; the page with a phase open shows no engine id outside
// <code> (R56's scan); and a phase opened and left alone exports as the card's own bytes.
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
 *  below are then made with keys only: Enter on a button, typing in a field. */
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

test('builder B3: a phase rule of the MH card edited by keyboard, kept across a reload, exported as the expected card', async ({ page, browserName }, info) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, base, '#/scenarios/builder');
  await page.getByRole('button', { name: 'Open a copy of Malignant hyperthermia (phases)' }).click();
  await expect(page).toHaveURL(/#\/scenarios\/builder\/d[0-9a-z]+$/);
  await page.getByRole('button', { name: /^Phases/ }).click();

  // left alone: every phase opened, the export is the library card's bytes with the copy's id
  for (const l of ['Baseline', 'Latent', 'Early signs', 'Arrest']) await page.locator('.sb-phases .sb-out', { hasText: l }).click();
  await saved(page);
  const MH = JSON.parse(MH_FILE) as Rec;
  const untouched = { ...MH, id: 'showcase-mh-v2-copy' };
  expect(await exported(page, 'untouched.json', info)).toBe(`${JSON.stringify(untouched, null, 2)}\n`);

  // Early signs, by keyboard: open it from the list (Enter), the threshold typed, a condition added, Treated moved up
  await page.locator('.sb-phases .sb-out', { hasText: 'Early signs' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#sb-phase-h')).toContainText('Early signs');
  await expect(page.locator('.sb-preview')).toContainText('EtCO₂ climbing, HR up · when EtCO₂ > 45 and EtCO₂ rising and set minute ventilation unchanged and HR rising, held 20 s');
  await reach(page, 'condition 1: threshold');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('50');
  await expect(page.locator('.sb-rule > li > .sb-says')).toHaveText('Instructor v2 reads: EtCO₂ > 50 and EtCO₂ rising and set minute ventilation unchanged and HR rising');

  await reach(page, 'Add a condition to the rule');
  await page.keyboard.press('Enter');
  const what = label(page, 'New condition in the rule: what it reads');
  await expect(label(page, 'New condition in the rule: its kind')).toBeFocused(); // the form takes the focus
  await what.focus();
  await what.selectOption('cp:propofol'); // a select is chosen by its keys; Playwright's selectOption is that choice
  await expect(page.locator('.sb-adder')).toContainText('µg/mL');
  const add = page.getByRole('button', { name: 'Add the condition' });
  await expect(add).toBeDisabled();
  await reach(page, 'New condition in the rule: threshold');
  await page.keyboard.type('4');
  await expect(add).toBeEnabled();
  await add.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-node="/all/4"] .sb-says')).toHaveText('Instructor v2 reads: plasma propofol > 4 µg/mL');

  await reach(page, 'Move Treated up');
  await page.keyboard.press('Enter');
  await expect(page.locator('.sb-next select').first()).toHaveValue('treated');
  await saved(page);

  // no engine id outside <code> with a phase open, its add form shown
  const engineIds = await page.evaluate(() => (window as unknown as { __pmeApp: { engineIds: string[] } }).__pmeApp.engineIds);
  const IDS = [...STATE_VARS, ...engineIds].filter((id) => /[A-Z0-9]/.test(id) || STATE_VARS.includes(id));
  await label(page, 'Add a condition to the rule').click();
  // two hits are B2's, not this section's, and reported with this PR: the storage line's unit "kB" and the export
  // toast's file name ("showcase-mh-v2-copy.json") match the scan's camelCase and dotted patterns
  const b2 = [/^p: "kB" in "\d+ drafts? · /, /^div: "copy\.json" in "Exported /];
  expect((await scanEngineIds(page, IDS)).filter((x) => !b2.some((r) => r.test(x)))).toEqual([]);

  // a reload finds every edit; the export is the expected card
  await page.reload();
  await page.waitForFunction(() => '__pmeApp' in window);
  await page.getByRole('button', { name: /^Phases/ }).click();
  await page.locator('.sb-phases .sb-out', { hasText: 'Early signs' }).click();
  await expect(label(page, 'condition 1: threshold')).toHaveValue('50');
  await expect(page.locator('[data-node="/all/4"] .sb-says')).toHaveText('Instructor v2 reads: plasma propofol > 4 µg/mL');
  const want = JSON.parse(JSON.stringify(untouched)) as Rec;
  const early = (want.phases as Rec[]).find((p) => p.id === 'earlySigns')!;
  const all = (early.enter as { all: Rec[] }).all;
  (all[0]!.value as Rec).value = 50;
  all.push({ value: { var: 'cp:propofol', op: '>', value: 4 } });
  early.next = ['treated', 'established', 'arrest'];
  const bytes = await exported(page, 'edited.json', info);
  expect(bytes).toBe(`${JSON.stringify(want, null, 2)}\n`);
  await expect(page.locator('.sb-checks li').first()).toHaveText(/^The validator accepts this draft/);
  console.log(`builder-b3 ${browserName}: exported ${bytes.length} bytes, the library card with the three edits`);
});
