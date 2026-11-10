// The kit store, layer 2 (docs/plans/scenario-builder.md §8, piece B8; the owner's ruling of 10 November 2026), on both
// engines, through the REAL relay with a state folder (as the kit's launchers start it, `--state-dir <kit>/user-data`):
// an author copies the MH card in the builder, edits it and presses Ctrl+S; the card is a version file in the folder,
// the card file's own bytes; this browser's storage is then cleared and the builder opened again: the folder's card is
// listed as one this browser lacks, opens at its newest version with the edit in place, and another browser context
// (another browser of the laptop) finds it too. The store line says where the work is kept, in words, and the pages
// pass the accessibility audit. From another device (this machine's own network address, not loopback) the relay
// refuses a write and its status says why; a page from another site cannot write either. Ports 9810–9819.
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { lanAddresses } from '../../../packages/controller/relay/http.ts';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { audit, openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle;
let root = '';
let dir = '';
const PORT = 9811 + Number(process.env.TEST_PARALLEL_INDEX ?? 0) * 2; // two workers at most: 9811, 9813
test.beforeAll(async () => {
  ({ vite, base } = await startVite());
  root = mkdtempSync(join(tmpdir(), 'pme-kit-store-'));
  dir = join(root, 'user-data');
  relay = await startRelay({ port: PORT, host: '0.0.0.0', remoteRoles: 'viewer', stateDir: dir });
});
test.afterAll(async () => {
  await relay?.close();
  await vite?.close();
  if (root) rmSync(root, { recursive: true, force: true });
});

const ws = () => `ws://127.0.0.1:${relay.port}/`;
const builder = (sub = '') => `?relay=${encodeURIComponent(ws())}#/scenarios/builder${sub}`;
const field = (p: Page, label: string) => p.locator('.sb-page .field').filter({ has: p.locator(`label:text-is("${label}")`) });
const holds = (p: Page) => p.locator('.sb-start .sb-holds');
const versions = (id: string) => (existsSync(join(dir, 'scenarios', id)) ? readdirSync(join(dir, 'scenarios', id)).sort() : []);

test('kit store: Ctrl+S keeps the card in the user-data folder; a cleared browser and another browser find it there', async ({ page, browser, browserName }) => {
  test.setTimeout(120_000);
  const id = `mh-kit-${browserName}`;
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, base, builder());
  await expect(holds(page)).toHaveText('no drafts, kept in this browser and in this kit’s user-data folder.');
  expect(existsSync(dir) && readdirSync(dir).includes('scenarios') && versions(id).length).toBeFalsy(); // nothing before a save

  await page.getByRole('button', { name: 'Open a copy of Malignant hyperthermia (phases)' }).click();
  await expect(page).toHaveURL(/#\/scenarios\/builder\/d[0-9a-z]+$/);
  await expect(page.locator('.sb-kit-save')).toHaveText('Kit folder · not kept yet (Ctrl+S)');
  await field(page, 'Card id').locator('input').fill(id);
  await field(page, 'Title').locator('input').fill('MH, kept in the kit');
  await expect(page.locator('.sb-save')).toHaveText(/^This browser · saved \d\d:\d\d:\d\d$/);
  await expect(page.locator('.sb-checks .sb-hint')).toHaveText(/^1 draft · \d+ snapshots? · \d+ kB, kept in this browser and in this kit’s user-data folder\.$/);
  await page.keyboard.press('Control+s');
  await expect(page.locator('.sb-kit-save')).toHaveText(/^Kit folder · version 1 kept \d\d:\d\d:\d\d$/);
  await expect(page.locator('.toast').last()).toHaveText('Kept as version 1 in this kit’s user-data folder');
  expect(versions(id)).toEqual([expect.stringMatching(/^v0001-\d{4}-\d\d-\d\dT\d\d-\d\d-\d\dZ\.json$/)]);
  const v1 = readFileSync(join(dir, 'scenarios', id, versions(id)[0]!), 'utf8');
  expect(v1).toBe(`${JSON.stringify(JSON.parse(v1), null, 2)}\n`); // the card file, as Export writes it
  expect(JSON.parse(v1)).toMatchObject({ schema: 'pme-scenario/2', id, title: 'MH, kept in the kit' });
  expect((await audit(page, { touchPanel: false })).map((f) => `${f.rule}: ${f.what}`)).toEqual([]);
  // the same draft again: nothing new; an edit: version 2, version 1 as it was
  await page.keyboard.press('Control+s');
  await expect(page.locator('.toast').last()).toHaveText('Already kept as version 1 in this kit’s user-data folder');
  await field(page, 'Title').locator('input').fill('MH, kept in the kit, edited');
  await expect(page.locator('.sb-save')).toHaveText(/^This browser · saved/);
  await page.keyboard.press('Control+s');
  await expect(page.locator('.sb-kit-save')).toHaveText(/^Kit folder · version 2 kept/);
  expect(versions(id)).toHaveLength(2);
  expect(readFileSync(join(dir, 'scenarios', id, versions(id)[0]!), 'utf8')).toBe(v1);

  // this browser's storage cleared (as Safari does after a week, or a disk short of space): the folder still has it
  await page.evaluate(() => new Promise<void>((ok) => {
    localStorage.clear();
    const r = indexedDB.deleteDatabase('pme-builder');
    r.onsuccess = r.onerror = r.onblocked = () => ok();
  }));
  await openApp(page, base, builder());
  await page.reload();
  await page.waitForFunction(() => '__pmeApp' in window);
  await expect(page.locator('.sb-drafts')).toContainText('No drafts in this browser yet');
  const kept = page.locator('.sb-kit-cards .scen-item').filter({ hasText: id });
  await expect(kept).toContainText('MH, kept in the kit, edited');
  await expect(kept).toContainText('Version 2 · kept');
  await expect(kept).toContainText('2 versions in the folder');
  expect((await audit(page, { touchPanel: false })).map((f) => `${f.rule}: ${f.what}`)).toEqual([]);
  await kept.getByRole('button', { name: `Open MH, kept in the kit, edited from this kit’s folder` }).click();
  await expect(page).toHaveURL(/#\/scenarios\/builder\/d[0-9a-z]+$/);
  await expect(field(page, 'Title').locator('input')).toHaveValue('MH, kept in the kit, edited');
  await expect(page.locator('.sb-card')).toContainText('from this kit’s user-data folder, version 2');

  // another browser of this laptop (its own, empty storage) finds it too; this one is closed first (it hosts the room)
  await page.close();
  const other = await (await browser.newContext()).newPage();
  await openApp(other, base, builder());
  await expect(other.locator('.sb-kit-cards .scen-item').filter({ hasText: id })).toContainText('Version 2 · kept');
  await other.context().close();
});

test('kit store: no write from another device or another site; the status says why', async ({ request }) => {
  const card = JSON.stringify({ schema: 'pme-scenario/2', id: 'from-elsewhere', title: 'x' });
  // a page of another site, open in this laptop's browser: its Origin is not this computer's
  const site = await request.post(`http://127.0.0.1:${relay.port}/pme-store/scenarios/from-elsewhere`, { headers: { 'Content-Type': 'application/json', Origin: 'https://example.org' }, data: card });
  expect(site.status()).toBe(403);
  const lan = lanAddresses()[0];
  let reachable = false;
  if (lan) {
    try {
      reachable = (await request.get(`http://${lan}:${relay.port}/pme-relay.json`, { timeout: 3000 })).ok();
    } catch {
      reachable = false;
    }
  }
  test.skip(!reachable, 'this machine has no network address it can reach itself on (CI has one)');
  const status = await request.get(`http://${lan}:${relay.port}/pme-store/`);
  expect(await status.json()).toMatchObject({ store: 'pme', writable: false, refused: 'not-this-computer' });
  const w = await request.post(`http://${lan}:${relay.port}/pme-store/scenarios/from-elsewhere`, { headers: { 'Content-Type': 'application/json' }, data: card });
  expect(w.status()).toBe(403);
  expect(await w.json()).toMatchObject({ refused: 'not-this-computer' });
  expect(versions('from-elsewhere')).toEqual([]);
});
