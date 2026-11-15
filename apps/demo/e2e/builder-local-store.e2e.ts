// Scenario builder B2 (docs/plans/scenario-builder.md §8, layer 1), on both engines: an author opens a library card as a
// copy, edits its header, patient and briefing, sees the validator's refusal on the field it names, and the work is in
// this browser's IndexedDB as they type (the save chip says when); a reload, and a fresh load of the app, find
// every edit; a snapshot restores; Export downloads exactly the bytes the builder wrote (the library card's own file
// with the author's edits in place, key order kept); the exported file imports back as a new draft; a file the validator
// refuses is not opened, and the page says why; a change typed and reloaded at once is not lost either.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

const MH_FILE = readFileSync(resolve(import.meta.dirname, '../src/app/showcase/showcase-mh-v2.json'), 'utf8');
const MH = JSON.parse(MH_FILE) as Record<string, unknown> & { patient: Record<string, unknown>; briefing: Record<string, unknown>; takeHome: string[] };
const card = (p: Page) => p.locator('.sb-page');
const field = (p: Page, label: string) => card(p).locator('.field').filter({ has: p.locator(`label:text-is("${label}")`) });
const saved = (p: Page) => expect(p.locator('.sb-save')).toHaveText(/^This browser · saved \d\d:\d\d:\d\d$/);
/** The draft's body as IndexedDB holds it (the builder's own database), read in the page. */
const stored = (p: Page, id: string) => p.evaluate((key) => new Promise<string | null>((ok) => {
  const r = indexedDB.open('pme-builder', 1);
  r.onsuccess = () => {
    const g = r.result.transaction('bodies', 'readonly').objectStore('bodies').get(key);
    g.onsuccess = () => ok(typeof g.result === 'string' ? g.result : null);
    g.onerror = () => ok(null);
  };
  r.onerror = () => ok(null);
}), id);

test('builder B2: edits are kept in this browser across a reload; refusal in place; restore; export bytes; import', async ({ page, browserName }, info) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, base, '#/scenarios/builder');
  await expect(page.locator('.sb-drafts')).toContainText('No drafts in this browser yet');

  // 1. a copy of the MH card, with an id of its own
  await page.getByRole('button', { name: 'Open a copy of Malignant hyperthermia (phases)' }).click();
  await expect(page).toHaveURL(/#\/scenarios\/builder\/d[0-9a-z]+$/);
  const draft = page.url().split('/').at(-1)!;
  await expect(field(page, 'Card id').locator('input')).toHaveValue('showcase-mh-v2-copy');
  await saved(page);

  // 2. a refusal on its field, gone when fixed
  await field(page, 'Title').locator('input').fill('');
  await expect(field(page, 'Title').locator('.sb-refuse')).toHaveText('The validator refuses: /title: must NOT have fewer than 1 characters');
  await expect(page.locator('.sb-checks li').first()).toHaveText(/^The validator refuses this draft: 1 refusal/);
  await expect(page.getByRole('button', { name: 'Export file' })).toBeDisabled();
  await field(page, 'Title').locator('input').fill('MH, edited in the builder');
  await expect(field(page, 'Title').locator('.sb-refuse')).toHaveCount(0);

  // 3. the three sections: a header field, the patient, the briefing; the chip says when it is saved
  await page.locator('.sb-takehome input').nth(1).fill('Call for help, stop the trigger, hyperventilate with 100 % oxygen.');
  await page.getByRole('button', { name: 'Patient and sensors' }).click();
  await field(page, 'Age, years').locator('input').fill('52');
  await field(page, 'Temperature probe').locator('select').selectOption('');
  await page.getByRole('button', { name: 'Case briefing' }).click();
  await field(page, 'Estimated time, minutes').locator('input').fill('25');
  await saved(page);
  const sensors = { ...MH.patient.sensors as Record<string, string> };
  delete sensors.temp;
  const want = {
    ...MH, id: 'showcase-mh-v2-copy', title: 'MH, edited in the builder', takeHome: MH.takeHome.map((t, i) => (i === 1 ? 'Call for help, stop the trigger, hyperventilate with 100 % oxygen.' : t)),
    patient: { ...MH.patient, ageY: 52, sensors }, briefing: { ...MH.briefing, estimatedMinutes: 25 },
  };
  await expect.poll(() => stored(page, draft)).toBe(JSON.stringify(want));

  // 4. a reload finds every edit; so does the drafts list of a fresh load of the app (a second tab of this browser would
  //    be asked first by the host guard, so the same tab loads the app again)
  await page.reload();
  await page.waitForFunction(() => '__pmeApp' in window);
  await expect(field(page, 'Title').locator('input')).toHaveValue('MH, edited in the builder');
  await page.getByRole('button', { name: 'Patient and sensors' }).click();
  await expect(field(page, 'Age, years').locator('input')).toHaveValue('52');
  await expect(field(page, 'Temperature probe').locator('select')).toHaveValue('');
  await openApp(page, base, '#/scenarios/builder');
  await expect(page.locator('.sb-drafts .scen-item')).toHaveCount(1);
  await expect(page.locator('.sb-drafts .t')).toHaveText('MH, edited in the builder showcase-mh-v2-copy');
  await page.getByRole('link', { name: 'Open the draft MH, edited in the builder' }).click();
  await expect(field(page, 'Title').locator('input')).toHaveValue('MH, edited in the builder');

  // 5. Export: exactly the bytes the builder wrote, the library file with the edits in place
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export file' }).click()]);
  expect(dl.suggestedFilename()).toBe('showcase-mh-v2-copy.json');
  const out = info.outputPath('showcase-mh-v2-copy.json');
  await dl.saveAs(out);
  const bytes = readFileSync(out, 'utf8');
  expect(bytes).toBe(`${JSON.stringify(want, null, 2)}\n`);
  expect(bytes).toBe(`${JSON.stringify(JSON.parse((await stored(page, draft))!), null, 2)}\n`);
  await expect(page.locator('.sb-checks').getByText(/^Snapshot 2 · \d\d:\d\d · exported$/)).toBeVisible();

  // 6. a snapshot restores; the draft it replaced is kept
  await page.getByRole('button', { name: 'Restore snapshot 1' }).click();
  await page.getByRole('button', { name: 'Header and story' }).click();
  await expect(field(page, 'Title').locator('input')).toHaveValue('Malignant hyperthermia (phases)');
  await expect(page.locator('.sb-checks').getByText(/^Snapshot 3 · \d\d:\d\d · before snapshot 1 was restored$/)).toBeVisible();
  await page.reload();
  await page.waitForFunction(() => '__pmeApp' in window);
  await expect(field(page, 'Title').locator('input')).toHaveValue('Malignant hyperthermia (phases)');

  // 7. import: the exported file comes back as a new draft; a refused file says why and opens nothing
  await page.evaluate(() => (location.hash = '#/scenarios/builder'));
  await page.locator('#sb-import').setInputFiles(out);
  await expect(page).toHaveURL(/#\/scenarios\/builder\/d[0-9a-z]+$/);
  expect(page.url()).not.toContain(draft);
  await expect(field(page, 'Title').locator('input')).toHaveValue('MH, edited in the builder');
  await page.evaluate(() => (location.hash = '#/scenarios/builder'));
  await page.locator('#sb-import').setInputFiles({ name: 'refused.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...want, takeHome: ['a', 'b', 'c', 'd', 'e'] })) });
  await expect(page.locator('.sb-import-err')).toHaveText('refused.json was not opened: the validator refuses it./takeHome: must NOT have more than 4 items');
  await expect(page.locator('.sb-drafts .scen-item')).toHaveCount(2);

  // 8. a change typed and reloaded at once, inside the 300 ms before its save: the page's going away keeps it
  await page.evaluate((id) => (location.hash = `#/scenarios/builder/${id}`), draft);
  await expect(field(page, 'Title').locator('input')).toHaveValue('Malignant hyperthermia (phases)');
  await field(page, 'Title').locator('input').fill('Typed just before the reload');
  await page.reload();
  await page.waitForFunction(() => '__pmeApp' in window);
  await expect(field(page, 'Title').locator('input')).toHaveValue('Typed just before the reload');
  await saved(page);
  await expect.poll(async () => JSON.parse((await stored(page, draft)) ?? '{}').title).toBe('Typed just before the reload');
  console.log(`builder-b2 ${browserName}: export ${bytes.length} bytes, identical to the stored body; reload kept the draft`);
});
