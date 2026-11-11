// Plan learner-action-remote.md L7 (the e2e of its "Tests first" list): the learner remote's Drugs tab on a phone
// (Pixel 7 on Chromium, iPhone 13 on WebKit) through the in-process classroom relay, as mobile-learner.e2e.ts runs it.
// 1. The MH card: a learner prepares dantrolene in the label's listed diluent (water), sees the HOST's concentration and
//    the countdown on the case clock, gives it when ready, and the laptop's record row names the phone as Room setup
//    named it. 2. A second learner phone cannot see the first's tray: no `prep` event of the first reaches it. 3. An
//    incompatible admixture (sodium bicarbonate with epinephrine, Stabilis): nothing warns and no sound plays before
//    the instructor shows the notice; a Give before it is given; at the instructor's press (the host's showPrepNotice,
//    which L9's card calls) the phone sounds once and shows the finding with its source.
// 4. L9: the laptop, the instructor phone and the learner phone together: the staging card on the dock and the phone at
//    once, a Give before the press, the phone's press reaching the learner once, the record keeping its time.
// PME_E2E_PORT and PME_E2E_RELAY_PORT (+ the worker's index) keep Vite and the relay inside a machine's port range.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devices, expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => relay?.close());

type Row = { kind: string; text: string; ev?: string; by?: string; name?: string; prepId?: string; dose?: { drugId: string; dose: number; unit: string } };
type HostW = { __pmeApp: { session: { code: string; simNow(): number; record: { data: { rows: Row[] } }; host: { showPrepNotice(by: string, id: string): boolean; preparation(by: string, id: string): { notice: { shownAt: number } | null } | undefined } }; link: { send(c: unknown): Promise<{ accepted: boolean; reason?: string }> } } };
type PhoneW = { __pmeLearnerDrugs: { tray: { ids: string[]; sounded: number } | null } };

const ws = () => `ws://127.0.0.1:${relay!.port}/`;
async function classroom(): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'l7-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  relay = await startRelay({ port: fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
}
/** The laptop on a card, with Room setup's names for the phones' device keys. */
async function laptop(page: Page, scenario: string, names: Record<string, string>): Promise<{ code: string; pin: string }> {
  await page.addInitScript((n) => localStorage.setItem('pme.roomLayout', JSON.stringify(Object.fromEntries(Object.entries(n).map(([k, name]) => [k, { name, show: 'remote', lastSeen: Date.now() }])))), names);
  await openApp(page, base, `?relay=${encodeURIComponent(ws())}&scenario=${scenario}#/teach2`, { warmMs: 1500 });
  const code = await page.evaluate(() => (window as unknown as HostW).__pmeApp.session.code);
  const pin = (await page.evaluate(() => localStorage.getItem('pme.learnerPin'))) as string;
  return { code, pin };
}
/** A learner phone with device key `key`, signed in on the learner PIN, on its Drugs tab with the formulary loaded. */
async function phone(browser: Browser, browserName: string, code: string, pin: string, key: string): Promise<{ p: Page; ctx: BrowserContext; preps: string[] }> {
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const ctx = await browser.newContext(dev);
  await ctx.addInitScript((k) => localStorage.setItem('pme.device', k), key);
  const p = await ctx.newPage();
  const preps: string[] = []; // every `prep` event this phone's socket received
  p.on('websocket', (w) => w.on('framereceived', (fr) => {
    const m = JSON.parse(String(fr.payload)) as { kind?: string; body?: Array<{ type?: string }> };
    if (m.kind === 'event') for (const e of m.body ?? []) if (e.type === 'prep') preps.push(JSON.stringify(e));
  }));
  await p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws())}#/remote/learner`);
  for (const d of pin) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
  await p.locator('.ip-peer-go').click();
  await expect(p.locator('.lr-status')).toHaveText(`Signed in as a learner remote · ${code}`, { timeout: 20_000 });
  await expect(p.getByRole('tab', { name: 'Drugs' })).toHaveAttribute('aria-selected', 'true');
  await expect(p.locator('.lr-bench')).toBeVisible({ timeout: 15_000 });
  return { p, ctx, preps };
}
/** On the bench: find `drug`, pick `product`, `amount` (vials or mL), the diluent, and put it on the tray. */
async function prepareOn(p: Page, parts: Array<{ search: string; drug: string; product: string; amount?: number }>, diluent: string | null): Promise<void> {
  for (const [i, x] of parts.entries()) {
    if (i > 0) await p.locator('.lr-another').click();
    await p.locator('.lr-search').fill(x.search);
    await p.locator(`.lr-pick[data-drug="${x.drug}"]`).click();
    await p.locator(`.lr-product[data-product="${x.product}"]`).click();
    if (x.amount !== undefined) await p.locator(`.lr-drawn-row[data-product="${x.product}"] .stepper input`).fill(String(x.amount));
    await p.locator(`.lr-drawn-row[data-product="${x.product}"] .stepper input`).dispatchEvent('change');
  }
  await p.locator('.lr-diluent select').selectOption(diluent ?? '');
  await p.locator('.lr-stage').click();
}
const rows = (page: Page) => page.evaluate(() => (window as unknown as HostW).__pmeApp.session.record.data.rows);
const trayIds = (p: Page) => p.evaluate(() => (window as unknown as PhoneW).__pmeLearnerDrugs.tray?.ids ?? []);

test('L7: on the MH card a learner prepares dantrolene in water on the phone, sees the host\'s concentration and countdown, gives it, and the record names the phone', async ({ page, browser, browserName }) => {
  test.setTimeout(180_000);
  await classroom();
  const KEY = 'bed2remote01';
  const { code, pin } = await laptop(page, 'showcase-mh-v2', { [KEY]: 'bed 2 remote' });
  const { p, ctx } = await phone(browser, browserName, code, pin, KEY);
  // the bench: Agilus 120 mg, one vial, reconstituted with the label's 20 mL of water, listed first
  await p.locator('.lr-search').fill('dantrolene');
  await p.locator('.lr-pick[data-drug="dantrolene"]').click();
  await expect(p.locator('.lr-product .lr-pname')).toHaveText(['Dantrium IV 20 mg powder for solution for injection', /Agilus/]);
  await p.locator('.lr-product[data-product="agilus-120mg"]').click();
  await expect(p.locator('.lr-diluent select optgroup').first()).toHaveAttribute('label', 'Listed in the label');
  await expect(p.locator('.lr-diluent select')).toHaveValue('water');
  await expect(p.locator('.lr-holds')).toHaveText('Dantrolene 6 mg/mL · 20 mL');
  await expect(p.locator('.lr-time')).toHaveText('Takes 0:50 to prepare');
  for (const b of await p.locator('.lr-bench button:visible, .lr-bench select:visible, .lr-bench input:visible').all()) {
    const r = (await b.boundingBox())!;
    expect(r.height, await b.evaluate((e) => e.outerHTML.slice(0, 80))).toBeGreaterThanOrEqual(44); // [ENG: ui] 44 px targets
  }
  await p.locator('.lr-stage').click();
  // the tray: the HOST's answer, then the countdown on the case clock
  const item = p.locator('.lr-item').first();
  await expect(item.locator('.lr-conc-source')).toHaveText("From the instructor’s computer", { timeout: 10_000 });
  await expect(item.locator('.lr-conc')).toHaveText('Dantrolene 6 mg/mL · 20 mL');
  await expect(item.locator('.lr-state')).toHaveText(/^Preparing · ready in 0:[0-5]\d$/);
  const [id] = await trayIds(p);
  // given before it is ready: the host refuses, in its words
  await item.locator('.lr-give-btn').click();
  await expect(item.locator('.lr-said')).toHaveText(/^Not given: not ready yet \(0:[0-5]\d\)$/);
  // ×8 on the laptop: 50 s of the case pass in a few seconds
  expect((await page.evaluate(() => (window as unknown as HostW).__pmeApp.link.send({ type: 'time', action: 'scale', value: 8 }))).accepted).toBe(true);
  await expect(item.locator('.lr-state')).toHaveText('Ready · 20 mL left', { timeout: 30_000 });
  await item.locator('.lr-give-btn').click();
  await expect(item.locator('.lr-said')).toHaveText(/^Given 20 mL at \d\d:\d\d$/, { timeout: 10_000 });
  await expect(item.locator('.lr-state')).toHaveText('Empty');
  await expect.poll(async () => (await rows(page)).filter((r) => r.ev === 'drug:dantrolene' && r.kind === 'learner').length, { timeout: 10_000 }).toBe(1);
  const row = (await rows(page)).find((r) => r.ev === 'drug:dantrolene' && r.kind === 'learner')!;
  expect(row).toMatchObject({ by: KEY, name: 'bed 2 remote', prepId: id, dose: { drugId: 'dantrolene', unit: 'mg' } });
  expect(row.dose!.dose).toBeGreaterThan(0);
  expect(row.dose!.dose).toBeLessThanOrEqual(120); // 20 mL × 6 mg/mL × r, r ≤ 1 (§7.1)
  expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await ctx.close();
});

test("L7: a second learner phone cannot see the first's tray", async ({ page, browser, browserName }) => {
  test.setTimeout(180_000);
  await classroom();
  const { code, pin } = await laptop(page, 'showcase-mh-v2', {});
  const a = await phone(browser, browserName, code, pin, 'phoneaaaa001');
  const b = await phone(browser, browserName, code, pin, 'phonebbbb002');
  await prepareOn(a.p, [{ search: 'fentanyl', drug: 'fentanyl', product: 'fentanyl-50mcg-ml', amount: 2 }], 'saline');
  await expect(a.p.locator('.lr-item .lr-conc-source')).toHaveText("From the instructor’s computer", { timeout: 10_000 });
  await expect(a.p.locator('.lr-item .lr-state')).toHaveText('Ready · preparation time: no source');
  const [id] = await trayIds(a.p);
  expect(a.preps.some((e) => e.includes(id as string))).toBe(true);
  await b.p.waitForTimeout(1500); // the relay's next frames have gone out
  expect(await trayIds(b.p)).toEqual([]);
  await expect(b.p.locator('.lr-tray-empty')).toBeVisible();
  expect(b.preps).toEqual([]); // not one `prep` event of the first phone's reached the second
  await a.ctx.close();
  await b.ctx.close();
});

test('L7: an incompatible admixture: no warning and no sound before the instructor shows the notice; a Give before it is given; the press sounds once and shows the finding', async ({ page, browser, browserName }) => {
  test.setTimeout(180_000);
  await classroom();
  const KEY = 'bed3remote01';
  const { code, pin } = await laptop(page, 'showcase-mh-v2', { [KEY]: 'bed 3 remote' });
  const { p, ctx } = await phone(browser, browserName, code, pin, KEY);
  // sodium bicarbonate 8.4 % 10 mL + epinephrine 1 mg/mL 1 mL, one syringe, nothing added
  await prepareOn(p, [
    { search: 'sodium bic', drug: 'sodiumBicarbonate', product: 'sodium-bicarbonate-84mg-ml', amount: 10 },
    { search: 'epinephrine', drug: 'epinephrine', product: 'adrenalin-1mg-ml', amount: 1 },
  ], null);
  const item = p.locator('.lr-item').first();
  await expect(item.locator('.lr-conc-source')).toHaveText("From the instructor’s computer", { timeout: 10_000 });
  await expect(item.locator('.lr-finding')).toBeHidden();
  expect(await p.locator('.lr-drugs').innerText()).not.toMatch(/incompatib/i);
  expect(await p.evaluate(() => (window as unknown as PhoneW).__pmeLearnerDrugs.tray?.sounded)).toBe(0);
  const [id] = await trayIds(p);
  // a Give (2 mL) before the notice: given
  await item.locator('.seg button[data-v="part"]').click();
  await item.locator('.lr-give .stepper input').first().fill('2');
  await item.locator('.lr-give .stepper input').first().dispatchEvent('change');
  await item.locator('.lr-give-btn').click();
  await expect(item.locator('.lr-said')).toHaveText(/^Given 2 mL at \d\d:\d\d$/, { timeout: 10_000 });
  await expect.poll(async () => (await rows(page)).filter((r) => r.kind === 'learner' && r.prepId === id).map((r) => r.ev).sort(), { timeout: 10_000 }).toEqual(['drug:epinephrine', 'drug:sodiumBicarbonate']);
  expect(await page.evaluate(({ k, i }) => (window as unknown as HostW).__pmeApp.session.host.preparation(k, i)?.notice ?? null, { k: KEY, i: id as string })).toBeNull();
  expect(await p.evaluate(() => (window as unknown as PhoneW).__pmeLearnerDrugs.tray?.sounded)).toBe(0);
  // the instructor's press
  expect(await page.evaluate(({ k, i }) => (window as unknown as HostW).__pmeApp.session.host.showPrepNotice(k, i), { k: KEY, i: id as string })).toBe(true);
  await expect(item.locator('.lr-finding')).toBeVisible({ timeout: 10_000 });
  await expect(item.locator('.lr-finding-head')).toHaveText(/^A concern about this preparation · Raised at \d\d:\d\d$/);
  await expect(item.locator('.lr-finding-row[data-kind="incompatible"]').first()).toContainText(/^Incompatible: (Sodium bicarbonate 8\.4 % with Epinephrine|Epinephrine with Sodium bicarbonate 8\.4 %)\..*\(Stabilis /);
  await expect.poll(() => p.evaluate(() => (window as unknown as PhoneW).__pmeLearnerDrugs.tray?.sounded)).toBe(1);
  await p.waitForTimeout(1000);
  expect(await p.evaluate(() => (window as unknown as PhoneW).__pmeLearnerDrugs.tray?.sounded)).toBe(1); // once
  await ctx.close();
});

// Plan learner-action-remote.md L9 (§4 D7, LQ3): the laptop, the instructor's phone and the learner's phone in one room.
// The learner stages the incompatible mix; the card shows at once on the laptop's dock AND on the instructor's phone, with
// the finding and its source; a Give before the press is given and both cards say "notice not shown"; the instructor
// presses on the PHONE, the learner's phone sounds once and shows the finding, both cards read "Notice shown at mm:ss",
// the laptop's control is gone, and the host's record keeps the time.
test('L9: the instructor sees the staging on the laptop dock and the phone, and the phone\'s press shows the notice on the learner\'s phone once', async ({ page, browser, browserName }) => {
  test.setTimeout(180_000);
  await classroom();
  const KEY = 'bed2remote01';
  const { code, pin } = await laptop(page, 'showcase-mh-v2', { [KEY]: 'Bed 2' });
  const instructorPin = (await page.evaluate(() => localStorage.getItem('pme.instructorPin'))) as string;
  // the instructor's phone, signed in with the instructor PIN
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const ictx = await browser.newContext(dev);
  const ip = await ictx.newPage();
  await ip.goto(`${base}/?relay=${encodeURIComponent(ws())}#/remote?code=${code}`);
  for (const d of instructorPin) await ip.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
  await ip.locator('.ip-peer-go').click();
  await expect(ip.locator('.ip-peer-status')).toHaveText(`Signed in as the instructor's remote · ${code}`, { timeout: 20_000 });
  // the learner's phone stages sodium bicarbonate 8.4 % 10 mL + epinephrine 1 mg/mL 1 mL in one syringe
  const { p, ctx } = await phone(browser, browserName, code, pin, KEY);
  await prepareOn(p, [
    { search: 'sodium bic', drug: 'sodiumBicarbonate', product: 'sodium-bicarbonate-84mg-ml', amount: 10 },
    { search: 'epinephrine', drug: 'epinephrine', product: 'adrenalin-1mg-ml', amount: 1 },
  ], null);
  const item = p.locator('.lr-item').first();
  await expect(item.locator('.lr-conc-source')).toHaveText("From the instructor’s computer", { timeout: 10_000 });
  const [id] = await trayIds(p);
  const onLaptop = page.locator(`.ip2-dock .ip2-lp-card[data-prep="${id}"]`);
  const onPhone = ip.locator(`.ip2-lp-inline .ip2-lp-card[data-prep="${id}"]`);
  for (const c of [onLaptop, onPhone]) {
    await expect(c.locator('.ip2-lp-what')).toHaveText(/^Bed 2 remote staged Sodium bicarbonate 8\.4 % 10 mmol \+ Epinephrine 1 mg, one syringe, 11 mL$/, { timeout: 5_000 });
    await expect(c.locator('.ip2-lp-finding[data-kind="incompatible"]').first()).toContainText(/^Incompatible: .+\(Stabilis .+; Trissel 2013 .+ agrees\)$/);
    await expect(c.getByRole('button', { name: 'Show the incompatibility notice to the learner' })).toBeVisible();
  }
  await expect(page.locator('.ip2-preps-count')).toHaveText('1 preparation to look at');
  await expect(item.locator('.lr-finding')).toBeHidden(); // nothing on the learner's phone before the press
  // a Give (2 mL) before the press: given, and both cards say the notice had not been shown
  await item.locator('.seg button[data-v="part"]').click();
  await item.locator('.lr-give .stepper input').first().fill('2');
  await item.locator('.lr-give .stepper input').first().dispatchEvent('change');
  await item.locator('.lr-give-btn').click();
  await expect(item.locator('.lr-said')).toHaveText(/^Given 2 mL at \d\d:\d\d$/, { timeout: 10_000 });
  for (const c of [onLaptop, onPhone]) await expect(c.locator('.ip2-lp-fate')).toHaveText(/^given at \d\d:\d\d, notice not shown$/, { timeout: 10_000 });
  expect(await p.evaluate(() => (window as unknown as PhoneW).__pmeLearnerDrugs.tray?.sounded)).toBe(0);
  // the instructor presses on the phone
  await onPhone.getByRole('button', { name: 'Show the incompatibility notice to the learner' }).click();
  await expect(item.locator('.lr-finding')).toBeVisible({ timeout: 10_000 });
  await expect.poll(() => p.evaluate(() => (window as unknown as PhoneW).__pmeLearnerDrugs.tray?.sounded)).toBe(1);
  for (const c of [onLaptop, onPhone]) {
    await expect(c.locator('.ip2-lp-shown')).toHaveText(/^Notice shown at \d\d:\d\d$/, { timeout: 10_000 });
    await expect(c.locator('.ip2-lp-show')).toHaveCount(0);
  }
  await expect(page.locator('.ip2-preps-count')).toBeHidden();
  const rec = await page.evaluate(({ k, i }) => (window as unknown as HostW).__pmeApp.session.host.preparation(k, i)?.notice ?? null, { k: KEY, i: id as string });
  expect(rec?.shownAt).toEqual(expect.any(Number));
  await expect(onLaptop.locator('.ip2-lp-shown')).toHaveText(`Notice shown at ${String(Math.floor(rec!.shownAt / 60)).padStart(2, '0')}:${String(Math.floor(rec!.shownAt % 60)).padStart(2, '0')}`);
  await p.waitForTimeout(1000);
  expect(await p.evaluate(() => (window as unknown as PhoneW).__pmeLearnerDrugs.tray?.sounded)).toBe(1); // once
  await ctx.close();
  await ictx.close();
});
