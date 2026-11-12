// Plan learner-action-remote.md L15 (LQ13 ruled B: the laptop sees every result): the laptop's Labs sheet in Instructor v2.
// 1. Through a REAL relay in its own process (packages/controller/relay/bin.ts, as the classroom runs it): a learner phone
//    sends an arterial blood gas; the laptop's sheet shows it pending, with the phone's name and the expected time word
//    for word as the phone shows it; then, on the case's clock (×8, as L11's e2e), the result at the analyser's time,
//    its table equal to the phone's. The instructor's own sample is listed too, as the instructor's.
// 2. At 1440 × 900: with the Labs entry in the dock, every sheet's primary buttons and every dock button are still
//    clickable (a hit test at the button's centre lands on it); the open Labs sheet, with results in it, covers none of
//    them and stays above the dock. PME_L15_SHOTS=<dir> saves the screenshots the brief asks for.
// PME_E2E_PORT and PME_E2E_RELAY_PORT (+ the worker's index) keep Vite and the relay inside a machine's port range.
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { devices, expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: { port: number; proc: ChildProcess; exited: Promise<number | null> } | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => {
  if (!relay) return;
  const r = relay;
  relay = null;
  expect(r.proc.exitCode, 'the relay process ran to the end of the test').toBeNull();
  r.proc.kill('SIGTERM');
  await r.exited;
});

type HostW = { __pmeApp: { session: { code: string }; link: { send(c: unknown): Promise<{ accepted: boolean; tick: number }> } } };
const shots = process.env.PME_L15_SHOTS;

/** The relay as its own Node process: the source bin, the classroom's options (an app folder, phones may only follow). */
async function relayProcess(): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'l15-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  const port = fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0;
  const bin = resolve(import.meta.dirname, '../../../packages/controller/relay/bin.ts');
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('WS_NO_')));
  const proc = spawn(process.execPath, ['--experimental-strip-types', '--no-warnings', bin, '--port', String(port), '--host', '127.0.0.1', '--static', dir, '--remote-roles', 'viewer', '--quiet'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  const exited = new Promise<number | null>((r) => proc.once('exit', (code) => r(code)));
  let out = '';
  const got = await new Promise<number>((ok, no) => {
    const onData = (d: Buffer) => {
      out += d;
      const m = /ready on ws:\/\/[^:]+:(\d+)\//.exec(out);
      if (m) ok(Number(m[1]));
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    void exited.then((code) => no(new Error(`relay exited before ready (${code}): ${out}`)));
  });
  relay = { port: got, proc, exited };
}
const ws = () => `ws://127.0.0.1:${relay!.port}/`;

async function laptop(page: Page, names: Record<string, string>): Promise<{ code: string; pin: string }> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript((n) => localStorage.setItem('pme.roomLayout', JSON.stringify(Object.fromEntries(Object.entries(n).map(([k, name]) => [k, { name, show: 'remote', lastSeen: Date.now() }])))), names);
  await openApp(page, base, `?relay=${encodeURIComponent(ws())}&scenario=showcase-mh-v2#/teach2`, { warmMs: 1500 });
  const code = await page.evaluate(() => (window as unknown as HostW).__pmeApp.session.code);
  const pin = (await page.evaluate(() => localStorage.getItem('pme.learnerPin'))) as string;
  return { code, pin };
}
/** A learner phone with device key `key`, signed in on the learner PIN, on its Labs tab. */
async function phone(browser: Browser, browserName: string, code: string, pin: string, key: string): Promise<{ p: Page; ctx: BrowserContext }> {
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const ctx = await browser.newContext(dev);
  await ctx.addInitScript((k) => localStorage.setItem('pme.device', k), key);
  const p = await ctx.newPage();
  await p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws())}#/remote/learner`);
  for (const d of pin) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
  await p.locator('.ip-peer-go').click();
  await expect(p.locator('.lr-status')).toHaveText(`Signed in as a learner remote · ${code}`, { timeout: 20_000 });
  await p.getByRole('tab', { name: 'Labs' }).click();
  await expect(p.locator('.lr-lab-send')).toHaveCount(4);
  return { p, ctx };
}
const send = (page: Page, c: unknown) => page.evaluate((x) => (window as unknown as HostW).__pmeApp.link.send(x), c);
const labsSheet = (page: Page) => page.locator('.ip2-sheets .ip2-sheet[data-sheet="labs"]');
async function openLabs(page: Page): Promise<void> {
  const tool = page.locator('.ip2-dock-tools button.ip2-tool[data-sheet="labs"]');
  if ((await tool.getAttribute('aria-pressed')) !== 'true') await tool.click();
  await expect(labsSheet(page)).toBeVisible();
}

/** Each visible element of `sel` whose centre does not hit it (or a child): it is covered, or off the page. */
function covered(page: Page, sel: string): Promise<string[]> {
  return page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.offsetParent !== null).flatMap((e) => {
    const r = e.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    const name = `${e.className} "${(e.textContent ?? '').trim().slice(0, 40)}"`;
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return [`${name}: off the page`];
    return hit && (hit === e || e.contains(hit)) ? [] : [`${name}: under ${hit?.className ?? 'nothing'}`];
  }), sel);
}
const DOCK = '.ip2-dock button, .ip2-dock a';
const PRIMARY = '.ip2-sheets .ip2-sheet:not([hidden]) .ip2-sheet-foot button';

test('L15: a phone sends a sample through a relay process; the laptop\'s Labs sheet shows it pending, then the result at the analyser\'s time, equal to the phone\'s', async ({ page, browser, browserName }) => {
  test.setTimeout(180_000);
  await relayProcess();
  const KEY = 'bed3remote15';
  const { code, pin } = await laptop(page, { [KEY]: 'bed 3 remote' });
  const { p, ctx } = await phone(browser, browserName, code, pin, KEY);
  await openLabs(page);
  await expect(labsSheet(page).locator('.ip2-lab-empty')).toBeVisible();
  await p.locator('.lr-lab-send[data-panel="abg"]').click();
  const mine = p.locator('.lr-lab').first();
  await expect(mine.locator('.lr-lab-state')).toHaveAttribute('data-state', 'pending', { timeout: 10_000 });
  const row = labsSheet(page).locator('.ip2-lab').first();
  await expect(row.locator('.lr-lab-state')).toHaveAttribute('data-state', 'pending', { timeout: 10_000 });
  // the same draw, the same words: the title (draw time) and the expected time with the analyser, as the phone shows them
  expect(await row.locator('.lr-lab-title').textContent()).toBe(await mine.locator('.lr-lab-title').textContent());
  expect(await row.locator('.lr-lab-state').textContent()).toBe(await mine.locator('.lr-lab-state').textContent());
  await expect(row.locator('.lr-lab-state')).toContainText('(Radiometer ABL825 FLEX, analyser time only)');
  await expect(row.locator('.ip2-lab-who')).toHaveText('Drawn by bed 3 remote');
  expect(await row.locator('tbody tr').count()).toBe(0);
  if (shots) await page.screenshot({ path: join(shots, 'labs-sheet-pending-1440x900.png') });
  // the instructor's own sample (the console's command: the sheet has no draw button), listed as the instructor's
  expect(await labsSheet(page).locator('button:not(.ip2-sheet-close):not(.ip2-deliver):not(.ip2-chip-x)').count()).toBe(0);
  expect((await send(page, { type: 'applyEvent', event: { kind: 'lab', panel: 'chem' } })).accepted).toBe(true);
  await expect(labsSheet(page).locator('.ip2-lab')).toHaveCount(2);
  await expect(labsSheet(page).locator('.ip2-lab[data-panel="chem"] .ip2-lab-who')).toHaveText('Drawn by Instructor');
  // the case's clock at ×8 on the laptop: the gas's 80 s pass in about ten
  expect((await send(page, { type: 'time', action: 'scale', value: 8 })).accepted).toBe(true);
  const gas = labsSheet(page).locator('.ip2-lab[data-panel="abg"]');
  await expect(gas.locator('.lr-lab-state')).toHaveAttribute('data-state', 'resulted', { timeout: 30_000 });
  await expect(mine.locator('.lr-lab-state')).toHaveAttribute('data-state', 'resulted', { timeout: 30_000 });
  expect((await send(page, { type: 'time', action: 'scale', value: 1 })).accepted).toBe(true);
  expect(await gas.locator('.lr-lab-state').textContent()).toBe(await mine.locator('.lr-lab-state').textContent());
  expect(await gas.locator('tbody tr').count()).toBeGreaterThan(10);
  // the laptop's engine and the phone's froze the same panel at the same tick: the same table, value for value
  expect(await gas.locator('.lr-lab-result').innerHTML()).toBe(await mine.locator('.lr-lab-result').innerHTML());
  // the phone still lists only its own sample (LQ13)
  await expect(p.locator('.lr-lab')).toHaveCount(1);
  if (shots) await page.screenshot({ path: join(shots, 'labs-sheet-result-1440x900.png') });
  await ctx.close();
});

test('L15 at 1440 × 900: with the Labs entry in the dock every sheet\'s primary button is clickable, and the Labs sheet covers none', async ({ page }) => {
  test.setTimeout(180_000);
  await relayProcess();
  await laptop(page, {});
  const tools = await page.locator('.ip2-dock-tools button.ip2-tool').evaluateAll((bs) => bs.map((b) => (b as HTMLElement).dataset.sheet));
  expect(tools).toEqual(['drug', 'airway', 'defib', 'vitals', 'devices', 'patient', 'log', 'labs']);
  expect(await covered(page, DOCK)).toEqual([]);
  // each sheet in turn: its footer (Deliver, the sheet's own buttons) and the dock, hit-tested
  const found: string[] = [];
  for (const id of tools) {
    await page.locator(`.ip2-dock-tools button.ip2-tool[data-sheet="${id}"]`).click();
    await expect(page.locator(`.ip2-sheets .ip2-sheet[data-sheet="${id}"]`)).toBeVisible();
    found.push(...(await covered(page, PRIMARY)).map((f) => `${id}: ${f}`), ...(await covered(page, DOCK)).map((f) => `${id} (dock): ${f}`));
    for (const b of await page.locator(`${PRIMARY}:not([disabled])`).all()) await b.click({ trial: true, timeout: 2000 });
  }
  // the Drug sheet with a drug chosen: its Give and Stage in the footer
  await page.locator('.ip2-dock-tools button.ip2-tool[data-sheet="drug"]').click();
  await page.locator('.ip2-sheet[data-sheet="drug"] .ip2-pick').first().click();
  expect(await page.locator(PRIMARY).count()).toBeGreaterThan(1);
  found.push(...(await covered(page, PRIMARY)).map((f) => `drug, chosen: ${f}`));
  for (const b of await page.locator(`${PRIMARY}:not([disabled])`).all()) await b.click({ trial: true, timeout: 2000 });
  // the Labs sheet full: three results and a pending one; it ends above the dock and covers no dock button
  for (const panel of ['abg', 'vbg', 'chem']) expect((await send(page, { type: 'applyEvent', event: { kind: 'lab', panel } })).accepted).toBe(true);
  expect((await send(page, { type: 'time', action: 'scale', value: 8 })).accepted).toBe(true);
  await openLabs(page);
  await expect(labsSheet(page).locator('.lr-lab-state[data-state="resulted"]')).toHaveCount(2, { timeout: 30_000 });
  expect((await send(page, { type: 'time', action: 'scale', value: 1 })).accepted).toBe(true);
  expect((await send(page, { type: 'applyEvent', event: { kind: 'lab', panel: 'coag' } })).accepted).toBe(true);
  await expect(labsSheet(page).locator('.ip2-lab')).toHaveCount(4);
  found.push(...(await covered(page, DOCK)).map((f) => `labs (dock): ${f}`), ...(await covered(page, PRIMARY)).map((f) => `labs: ${f}`));
  const [sheetBox, dockBox] = [await labsSheet(page).boundingBox(), await page.locator('.ip2-dock').boundingBox()];
  expect(sheetBox!.y + sheetBox!.height).toBeLessThanOrEqual(dockBox!.y + 0.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  if (shots) await page.screenshot({ path: join(shots, 'labs-sheet-four-samples-1440x900.png') });
  expect(found).toEqual([]);
});
