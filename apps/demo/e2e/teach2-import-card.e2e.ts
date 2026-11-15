// Brief 22: a pme-scenario/2 card opened from a file in Instructor v2 (#/teach2) runs as the library's own. A copy of the
// showcase /2 MH card (showcase-mh-v2.json) under another id and title is picked in "Open a card file…"; it is kept
// across a reload under "Imported" in the case list; "Start it" loads it through the app's one load; it starts in its
// first phase (Baseline), and the run sheet's first five presses (docs/showcase/SHOWCASE-2-RUN-SHEET.md §3, the rows of
// ACTION, mh-v2-path.ts) bring it into Latent by its own rule, as they do the built-in card (teach2-mh-v2.e2e.ts).
// Nothing is refused. PME_KIT_BASE=<url> runs it against a built kit instead of the dev server.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';
import { app, pressPath, to, type W } from './mh-v2-path.ts';

let vite: ViteDevServer | undefined;
let base = process.env.PME_KIT_BASE ?? '';
test.beforeAll(async () => {
  if (!base) ({ vite, base } = await startVite());
});
test.afterAll(async () => vite?.close());

const ID = 'imported-mh-v2';
const TITLE = 'Malignant hyperthermia, imported copy';

test('a copy of the /2 MH card opened from a file starts and runs its phases as the built-in card', async ({ page }) => {
  test.setTimeout(300_000);
  const doc = JSON.parse(readFileSync(resolve(import.meta.dirname, '../src/app/showcase/showcase-mh-v2.json'), 'utf8')) as Record<string, unknown>;
  expect(doc.schema).toBe('pme-scenario/2');
  const body = Buffer.from(JSON.stringify({ ...doc, id: ID, title: TITLE }, null, 2));
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, base, '#/teach2', { warmMs: 1500 });
  await expect(page.locator('.ip2-title')).toHaveText('No case loaded');

  // the menu's "Open a card file…" opens the file dialog; the picked file is checked and kept
  const chooser = page.waitForEvent('filechooser');
  await page.locator('.ip2-begin-two button', { hasText: 'Open a card file…' }).click();
  await (await chooser).setFiles({ name: 'my-mh-v2.json', mimeType: 'application/json', buffer: body });
  const note = page.locator('.ip2-begin-note');
  await expect(note).toHaveAttribute('role', 'status');
  await expect(note.locator('.ip2-begin-note-head')).toHaveText(`“${TITLE}” is in this browser's library, under Imported in the Scenario library.`);

  // kept in this browser: after a reload it is under "Imported" in the case list
  await page.reload();
  await page.waitForFunction(() => '__pmeApp' in window);
  await page.locator('body').click({ position: { x: 700, y: 5 } }); // no field has the focus
  await page.keyboard.press('2');
  await expect(page.locator('.ip2-imported-h')).toHaveText('Imported');
  const row = page.locator(`.ip2-imported-list button.ip2-case-row[data-card="${ID}"]`);
  await expect(row.locator('.ip2-row-title')).toHaveText(`Load ${TITLE}`);
  await page.keyboard.press('Escape');

  // the same file again: the offer to start it, and Start
  const again = page.waitForEvent('filechooser');
  await page.locator('.ip2-begin-two button', { hasText: 'Open a card file…' }).click();
  await (await again).setFiles({ name: 'my-mh-v2.json', mimeType: 'application/json', buffer: body });
  await expect(note.locator('.ip2-begin-note-head')).toContainText('It replaces the earlier import with the same id.');
  await note.locator('button', { hasText: 'Start it' }).click();
  await page.waitForFunction((id) => ((window as unknown as W).__pmeApp.link.ctl.scenario.doc as { id?: string } | null)?.id === id, ID, { timeout: 30_000 });
  await expect(page.locator('.ip2-title')).toHaveText(TITLE);
  await expect(page.locator('.ip2-chips .ip2-current .ip2-chip-name').first()).toHaveText('Baseline');
  expect((await app(page)).stateId).toBe('baseline');

  // its phases and actions run as the built-in card's: the run sheet's first five presses, then Latent by its rule
  const pressed = await pressPath(page, (i) => i < 5);
  expect(pressed).toHaveLength(5);
  await to(page, 420);
  await expect.poll(async () => (await app(page)).stateId, { timeout: 30_000 }).toBe('latent');
  await expect(page.locator('.ip2-chips .ip2-current .ip2-chip-name').first()).toHaveText('Latent');
  const a = await app(page);
  console.log(`imported /2 card: presses ${pressed.map(([t, x]) => `${t.toFixed(1)} s ${x}`).join(' | ')}; phases ${a.history.map((e) => `${e.t.toFixed(1)} s ${e.stateId}`).join(', ')}`);
  expect(a.refused).toEqual([]);
});
