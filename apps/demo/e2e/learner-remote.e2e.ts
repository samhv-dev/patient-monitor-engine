// Plan learner-action-remote.md L7 (the e2e of its "Tests first" list): the learner remote's Drugs tab on a phone
// (Pixel 7 on Chromium, iPhone 13 on WebKit) through the in-process classroom relay, as mobile-learner.e2e.ts runs it.
// 1. The MH card: a learner prepares dantrolene in the label's listed diluent (water), sees the HOST's concentration and
//    the countdown on the case clock, gives it when ready, and the laptop's record row names the phone as Room setup
//    named it. 2. A second learner phone cannot see the first's tray: no `prep` event of the first reaches it. 3. An
//    incompatible admixture (sodium bicarbonate with epinephrine, Stabilis): nothing warns and no sound plays before
//    the instructor shows the notice; a Give before it is given; at the instructor's press (the host's showPrepNotice,
//    which L9's card calls) the phone sounds once and shows the finding with its source.
// L8 (the Infusions tab, its "Tests first" e2e): 4. A learner starts propofol from a ready syringe at 12 mL/h; the
//    dose-rate line shown before Start equals the running infusion's line, and both equal the HOST's arithmetic (the
//    laptop engine's amount per minute, per kg of the laptop's patient). 5. LQ4: a phone changes and stops the
//    instructor's infusion and changes another remote's; each row says who set it; the laptop's record rows name the
//    device and the rate each replaced.
// 6. L9: the laptop, the instructor phone and the learner phone together: the staging card on the dock and the phone at
//    once, a Give before the press, the phone's press reaching the learner once, the record keeping its time.
// PME_E2E_PORT and PME_E2E_RELAY_PORT (+ the worker's index) keep Vite and the relay inside a machine's port range.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devices, expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { openApp, sheet, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => relay?.close());

type Row = { kind: string; text: string; ev?: string; by?: string; name?: string; prepId?: string; dose?: { drugId: string; dose: number; unit: string } };
type Row8 = Row & { replaced?: { rate: number; rateUnit: string; by: string } };
type HostW = { __pmeApp: { session: { code: string; simNow(): number; spec: { weightKg: number }; onEvent(fn: (e: { type: string; drugs?: Array<{ id: string; rate: number | null }> }) => void): () => void; record: { data: { rows: Row[] } }; host: { showPrepNotice(by: string, id: string): boolean; preparation(by: string, id: string): { notice: { shownAt: number } | null } | undefined } }; link: { send(c: unknown): Promise<{ accepted: boolean; reason?: string }> } } };
type PhoneW = { __pmeLearnerDrugs: { tray: { ids: string[]; sounded: number } | null } };

const ws = () => `ws://127.0.0.1:${relay!.port}/`;
async function classroom(): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'l7-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  relay = await startRelay({ port: fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
}
/** The laptop on a card (null: free roam, the default patient), with Room setup's names for the phones' device keys. */
async function laptop(page: Page, scenario: string | null, names: Record<string, string>): Promise<{ code: string; pin: string }> {
  await page.addInitScript((n) => localStorage.setItem('pme.roomLayout', JSON.stringify(Object.fromEntries(Object.entries(n).map(([k, name]) => [k, { name, show: 'remote', lastSeen: Date.now() }])))), names);
  await openApp(page, base, `?relay=${encodeURIComponent(ws())}${scenario ? `&scenario=${scenario}` : ''}#/teach2`, { warmMs: 1500 });
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
  // the bench: Agilus 120 mg, one vial, reconstituted with the label's 20 mL of water, listed first; 22.6 mL after (N73)
  await p.locator('.lr-search').fill('dantrolene');
  await p.locator('.lr-pick[data-drug="dantrolene"]').click();
  await expect(p.locator('.lr-product .lr-pname')).toHaveText(['Dantrium IV 20 mg powder for solution for injection', /Agilus/]);
  await p.locator('.lr-product[data-product="agilus-120mg"]').click();
  await expect(p.locator('.lr-diluent select optgroup').first()).toHaveAttribute('label', 'Listed in the label');
  await expect(p.locator('.lr-diluent select')).toHaveValue('water');
  await expect(p.locator('.lr-holds')).toHaveText('Dantrolene 5.31 mg/mL · 22.6 mL');
  await expect(p.locator('.lr-time')).toHaveText('Takes 0:50 to prepare');
  for (const b of await p.locator('.lr-bench button:visible, .lr-bench select:visible, .lr-bench input:visible').all()) {
    const r = (await b.boundingBox())!;
    expect(r.height, await b.evaluate((e) => e.outerHTML.slice(0, 80))).toBeGreaterThanOrEqual(44); // [ENG: ui] 44 px targets
  }
  await p.locator('.lr-stage').click();
  // the tray: the HOST's answer, then the countdown on the case clock
  const item = p.locator('.lr-item').first();
  await expect(item.locator('.lr-conc-source')).toHaveText("From the instructor’s computer", { timeout: 10_000 });
  await expect(item.locator('.lr-conc')).toHaveText('Dantrolene 5.31 mg/mL · 22.6 mL');
  await expect(item.locator('.lr-state')).toHaveText(/^Preparing · ready in 0:[0-5]\d$/);
  const [id] = await trayIds(p);
  // given before it is ready: the host refuses, in its words
  await item.locator('.lr-give-btn').click();
  await expect(item.locator('.lr-said')).toHaveText(/^Not given: not ready yet \(0:[0-5]\d\)$/);
  // ×8 on the laptop: 50 s of the case pass in a few seconds
  expect((await page.evaluate(() => (window as unknown as HostW).__pmeApp.link.send({ type: 'time', action: 'scale', value: 8 }))).accepted).toBe(true);
  await expect(item.locator('.lr-state')).toHaveText('Ready · 22.6 mL left', { timeout: 30_000 });
  await item.locator('.lr-give-btn').click();
  await expect(item.locator('.lr-said')).toHaveText(/^Given 22.6 mL at \d\d:\d\d$/, { timeout: 10_000 });
  await expect(item.locator('.lr-state')).toHaveText('Empty');
  await expect.poll(async () => (await rows(page)).filter((r) => r.ev === 'drug:dantrolene' && r.kind === 'learner').length, { timeout: 10_000 }).toBe(1);
  const row = (await rows(page)).find((r) => r.ev === 'drug:dantrolene' && r.kind === 'learner')!;
  expect(row).toMatchObject({ by: KEY, name: 'bed 2 remote', prepId: id, dose: { drugId: 'dantrolene', unit: 'mg' } });
  expect(row.dose!.dose).toBeGreaterThan(0);
  expect(row.dose!.dose).toBeLessThanOrEqual(120); // 22.6 mL × 120/22.6 mg/mL × r, r ≤ 1 (§7.1)
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

/** The laptop's own engine: the last `drugs` panel row of `drugId` (amount per minute, null: not running). */
async function hostRate(page: Page, drugId: string): Promise<number | null> {
  return page.evaluate((d) => (window as unknown as { __l8Drugs?: Record<string, number | null> }).__l8Drugs?.[d] ?? null, drugId);
}
async function watchHostDrugs(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as HostW & { __l8Drugs?: Record<string, number | null> };
    w.__l8Drugs = {};
    w.__pmeApp.session.onEvent((e) => {
      if (e.type === 'drugs') for (const d of e.drugs ?? []) (w.__l8Drugs as Record<string, number | null>)[d.id] = d.rate;
    });
  });
}
/** Propofol 1 % drawn neat, 20 mL, put on the tray and ready (×8 on the laptop if it has a preparation time). */
async function propofolReady(p: Page): Promise<void> {
  await prepareOn(p, [{ search: 'propofol', drug: 'propofol', product: 'propofol-1pct-aspen', amount: 20 }], null);
  await expect(p.locator('.lr-item .lr-conc-source')).toHaveText("From the instructor’s computer", { timeout: 10_000 });
  await expect(p.locator('.lr-item .lr-state')).toHaveText(/^Ready/, { timeout: 30_000 });
}
const infusionsTab = async (p: Page) => {
  await p.getByRole('tab', { name: 'Infusions' }).click();
  await expect(p.locator('.lr-infusions')).toBeVisible();
};
/** "26 µg/kg/min for 64 kg" from mg/min, as the phone prints a propofol rate (three significant figures). */
const propofolLine = (mgPerMin: number, kg: number) => `${String(+((mgPerMin * 1000) / kg).toPrecision(3))} µg/kg/min for ${+kg.toFixed(1)} kg`;

test("L8: a learner starts propofol from a ready syringe; the dose-rate line before Start and the running one are the host's arithmetic", async ({ page, browser, browserName }) => {
  test.setTimeout(180_000);
  await classroom();
  const KEY = 'bed4remote01';
  const { code, pin } = await laptop(page, 'showcase-mh-v2', { [KEY]: 'bed 4 remote' });
  await watchHostDrugs(page);
  const kg = await page.evaluate(() => (window as unknown as HostW).__pmeApp.session.spec.weightKg);
  const { p, ctx } = await phone(browser, browserName, code, pin, KEY);
  await propofolReady(p);
  await infusionsTab(p);
  const prep = p.locator('.lr-inf-prep').first();
  await expect(prep.locator('.lr-item-title')).toHaveText('Propofol 10 mg/mL · 20 mL');
  await prep.locator('.stepper input').fill('12');
  await prep.locator('.stepper input').dispatchEvent('change');
  // 12 mL/h × the host's 10 mg/mL ÷ 60 = 2 mg/min, per kg of the patient
  await expect(prep.locator('.lr-dose')).toHaveText(`Dose rate at this rate: ${propofolLine(2, kg)}`, { timeout: 10_000 });
  const before = ((await prep.locator('.lr-dose').textContent()) ?? '').split(': ')[1];
  for (const b of await p.locator('.lr-infusions button:visible, .lr-infusions input:visible').all()) {
    const r = (await b.boundingBox())!;
    expect(r.height, await b.evaluate((e) => e.outerHTML.slice(0, 80))).toBeGreaterThanOrEqual(44); // [ENG: ui] 44 px targets
  }
  await prep.locator('.lr-start').click();
  await expect(prep.locator('.lr-said')).toHaveText('Started at 12 mL/h', { timeout: 10_000 });
  const run = p.locator('.lr-inf[data-drug="propofol"]');
  await expect(run.locator('.lr-rate')).toHaveText('12 mL/h', { timeout: 10_000 });
  await expect(run.locator('.lr-setby')).toHaveText(/^set by this phone at \d\d:\d\d$/);
  // the host's arithmetic: the laptop engine's own amount per minute, per kg of the laptop's patient
  await expect.poll(() => hostRate(page, 'propofol'), { timeout: 10_000 }).not.toBeNull();
  const host = propofolLine((await hostRate(page, 'propofol')) as number, kg);
  await expect(run.locator('.lr-dose')).toHaveText(`Dose rate: ${host}`, { timeout: 10_000 });
  expect(before).toBe(host);
  await expect.poll(async () => (await rows(page)).filter((r) => r.kind === 'learner' && r.ev === 'drug:propofol').length, { timeout: 10_000 }).toBe(1);
  expect((await rows(page)).find((r) => r.kind === 'learner' && r.ev === 'drug:propofol')).toMatchObject({ by: KEY, name: 'bed 4 remote' });
  expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await ctx.close();
});

test("L8 (LQ4): a phone changes and stops the instructor's infusion and changes another remote's; the record names the device and the rate replaced", async ({ page, browser, browserName }) => {
  test.setTimeout(180_000);
  await classroom();
  const A = 'phoneaaaa101';
  const B = 'phonebbbb202';
  const { code, pin } = await laptop(page, 'showcase-mh-v2', { [A]: 'bed 5 remote', [B]: 'bed 6 remote' });
  const a = await phone(browser, browserName, code, pin, A);
  const b = await phone(browser, browserName, code, pin, B);
  // the instructor's remifentanil, in µg/kg/min from the laptop
  expect(await page.evaluate(() => (window as unknown as HostW).__pmeApp.link.send({ type: 'applyEvent', event: { kind: 'infusion', drugId: 'remifentanil', rate: 0.1, unit: 'mcg/kg/min' } }))).toMatchObject({ accepted: true });
  // the second phone's propofol at 10 mL/h
  await propofolReady(b.p);
  await infusionsTab(b.p);
  await b.p.locator('.lr-inf-prep .stepper input').first().fill('10');
  await b.p.locator('.lr-inf-prep .stepper input').first().dispatchEvent('change');
  await b.p.locator('.lr-inf-prep .lr-start').first().click();
  await expect(b.p.locator('.lr-inf-prep .lr-said')).toHaveText('Started at 10 mL/h', { timeout: 10_000 });
  // the first phone lists both, with who set each
  await infusionsTab(a.p);
  const remi = a.p.locator('.lr-inf[data-drug="remifentanil"]');
  const prop = a.p.locator('.lr-inf[data-drug="propofol"]');
  await expect(remi.locator('.lr-setby')).toHaveText(/^set by the instructor at \d\d:\d\d$/, { timeout: 15_000 });
  await expect(prop.locator('.lr-setby')).toHaveText(/^set by another learner remote \(phon\) at \d\d:\d\d$/, { timeout: 15_000 });
  await expect(prop.locator('.lr-rate')).toHaveText('10 mL/h');
  await expect(b.p.locator('.lr-inf[data-drug="propofol"] .lr-setby')).toHaveText(/^set by this phone at /);
  // change the instructor's: 6 mL/h through the engine row's own syringe, the host keeps
  await remi.locator('.stepper input').fill('6');
  await remi.locator('.stepper input').dispatchEvent('change');
  await remi.locator('.lr-change-btn').click();
  await expect(a.p.locator('.lr-inf-said')).toHaveText('Remifentanil: changed to 6 mL/h', { timeout: 10_000 });
  await expect(remi.locator('.lr-setby')).toHaveText(/^set by this phone at /, { timeout: 10_000 });
  await expect(remi.locator('.lr-rate')).toHaveText('6 mL/h');
  // change the other remote's: 5 mL/h
  await prop.locator('.stepper input').fill('5');
  await prop.locator('.stepper input').dispatchEvent('change');
  await prop.locator('.lr-change-btn').click();
  await expect(a.p.locator('.lr-inf-said')).toHaveText('Propofol: changed to 5 mL/h', { timeout: 10_000 });
  await expect(b.p.locator('.lr-inf[data-drug="propofol"] .lr-setby')).toHaveText(/^set by another learner remote \(phon\) at /, { timeout: 10_000 });
  await expect(b.p.locator('.lr-inf[data-drug="propofol"] .lr-rate')).toHaveText('5 mL/h');
  // stop the instructor's (it was this phone's rate by then)
  await remi.locator('.lr-stop').click();
  await expect(a.p.locator('.lr-inf-said')).toHaveText('Remifentanil: stopped', { timeout: 10_000 });
  await expect(remi).toHaveCount(0, { timeout: 10_000 });
  await expect(b.p.locator('.lr-inf[data-drug="remifentanil"]')).toHaveCount(0, { timeout: 10_000 });
  // the laptop's record: each change under the device, with the rate it replaced and who had set that
  const mine = async () => ((await rows(page)) as Row8[]).filter((r) => r.kind === 'learner' && r.by === A);
  await expect.poll(async () => (await mine()).length, { timeout: 10_000 }).toBe(3);
  const [r1, r2, r3] = await mine();
  expect(r1).toMatchObject({ ev: 'drug:remifentanil', name: 'bed 5 remote', replaced: { rate: 0.1, rateUnit: 'mcg/kg/min', by: 'laptop' } });
  expect(r2).toMatchObject({ ev: 'drug:propofol', name: 'bed 5 remote', replaced: { rate: 10, rateUnit: 'mL/h', by: B } });
  expect(r3).toMatchObject({ ev: 'drug:remifentanil', name: 'bed 5 remote', replaced: { rate: 6, rateUnit: 'mL/h', by: A } });
  expect(await a.p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await a.ctx.close();
  await b.ctx.close();
});

// Brief 164 (the owner's phone test, 11 Nov): a phone's Give was acknowledged ("Given 1 mL at 02:57") yet the laptop's Log
// had no line for it, and a laptop give after it was reported lost. These follow his steps on the laptop's own screens:
// the dose is in the ENGINE's drugs (not only an ack), the record row and the Log sheet's line name the phone, a give
// from the laptop's Drug sheet after it is applied and logged, and both again when the Give arrives while the laptop's
// tab is hidden (the session pauses itself then: hidden-tab.ts; since L14 the Give waits for the resume). Free roam (no
// card) and on a card.
type DrugsW = { __drugs: string[] };
/** Every drug the laptop's engine reports, from its own events (not the acks). */
const engineDrugs = (page: Page) => page.evaluate(() => (window as unknown as DrugsW).__drugs);
const logLines = async (page: Page, kind: 'learner' | 'instructor') => (await sheet(page, 'log')).locator(`.log li[data-kind=${kind}] > span:not(.k)`).allInnerTexts();
/** The laptop's Drug sheet: find `search`, press its first preset, then "Give … now". */
async function laptopGive(page: Page, search: string): Promise<void> {
  const d = await sheet(page, 'drug');
  await d.locator('input.ip2-drug-search').fill(search);
  await page.keyboard.press('Enter');
  await d.locator('.ip2-presets button.ip2-preset').first().click();
  await d.locator('button.ip2-give', { hasText: /^Give .* now$/ }).click();
}
/** The laptop's tab hidden or shown again, as the browser says it (the page's own visibility handlers run). */
const tabHidden = (page: Page, hidden: boolean) => page.evaluate((h) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
  document.dispatchEvent(new Event('visibilitychange'));
}, hidden);
for (const card of [null, 'showcase-mh-v2']) {
  test(`brief 164 (${card ?? 'free roam'}): a phone's Give reaches the laptop's engine, record and Log; a laptop give after it, and a Give around the laptop's hidden tab (it waits for the resume)`, async ({ page, browser, browserName }) => {
    test.setTimeout(240_000);
    await classroom();
    const KEY = 'bed3remote01';
    const { code, pin } = await laptop(page, card, { [KEY]: 'bed 3 remote' });
    await page.evaluate(() => {
      const w = window as unknown as HostW & DrugsW;
      w.__drugs = [];
      w.__pmeApp.session.onEvent((e) => void (e.drugs && (w.__drugs = e.drugs.map((d) => d.id))));
    });
    const { p, ctx } = await phone(browser, browserName, code, pin, KEY);
    // (a) the phone's Give
    await prepareOn(p, [{ search: 'ephedrine', drug: 'ephedrine', product: 'akovaz-50mg-ml', amount: 1 }], null);
    const item = p.locator('.lr-item').first();
    await expect(item.locator('.lr-state')).toHaveText(/^Ready/, { timeout: 15_000 });
    await item.locator('.lr-give-btn').click();
    await expect(item.locator('.lr-said')).toHaveText(/^Given 1 mL at \d\d:\d\d$/, { timeout: 10_000 });
    await expect.poll(() => engineDrugs(page), { timeout: 10_000 }).toContain('ephedrine');
    await expect.poll(async () => (await rows(page)).filter((r) => r.ev === 'drug:ephedrine' && r.kind === 'learner' && r.by === KEY && r.name === 'bed 3 remote').length, { timeout: 10_000 }).toBe(1);
    await expect.poll(() => logLines(page, 'learner'), { timeout: 10_000 }).toEqual(['Ephedrine 50 mg IV (learner remote: bed 3 remote)']);
    // (b) the laptop's own Drug sheet after it
    await laptopGive(page, 'epineph');
    await expect.poll(() => engineDrugs(page), { timeout: 10_000 }).toContain('epinephrine');
    await expect.poll(() => logLines(page, 'instructor'), { timeout: 10_000 }).toContain('Epinephrine 10 µg IV');
    // (c) the laptop's tab hidden: the session pauses (hidden-tab.ts). Since L14 (the owner's ruling on N117: no learner
    // dose while the case is paused) the phone's Give cannot be used then and says why; shown again, the session resumes
    // and the phone's Give is applied and logged (a preparation's time runs on the case clock, which stands still while
    // paused: it is made ready before the hide)
    await prepareOn(p, [{ search: 'midazolam', drug: 'midazolam', product: 'hypnovel-5mg-ml', amount: 1 }], null);
    const second = p.locator('.lr-item').nth(1);
    await expect(second.locator('.lr-state')).toHaveText(/^Ready/, { timeout: 15_000 });
    await tabHidden(page, true);
    await expect.poll(() => page.evaluate(() => (window as unknown as HostW & { __pmeApp: { link: { ctl: { hostPaused: boolean } } } }).__pmeApp.link.ctl.hostPaused), { timeout: 10_000 }).toBe(true);
    await expect(second.locator('.lr-give-btn')).toBeDisabled({ timeout: 10_000 });
    await expect(p.locator('.lr-tray .lr-paused')).toBeVisible();
    await tabHidden(page, false);
    await expect(second.locator('.lr-give-btn')).toBeEnabled({ timeout: 10_000 });
    await second.locator('.lr-give-btn').click();
    await expect(second.locator('.lr-said')).toHaveText(/^Given 1 mL at \d\d:\d\d$/, { timeout: 10_000 });
    await expect.poll(() => engineDrugs(page), { timeout: 10_000 }).toContain('midazolam');
    await expect.poll(() => logLines(page, 'learner'), { timeout: 10_000 }).toEqual(['Midazolam 5 mg IV (learner remote: bed 3 remote)', 'Ephedrine 50 mg IV (learner remote: bed 3 remote)']);
    await laptopGive(page, 'phenyl');
    await expect.poll(() => engineDrugs(page), { timeout: 10_000 }).toContain('phenylephrine');
    await expect.poll(() => logLines(page, 'instructor'), { timeout: 10_000 }).toContain('Phenylephrine 50 µg IV');
    await ctx.close();
  });
}

// Brief 164, second round (the owner's "even from the drugs menu on laptop the drug given does not register"): once a
// phone has staged a preparation, L9's staging card in the dock lay over the bottom of the open sheet, so the Drug
// sheet's "Give … now" was under it and the laptop's press never reached the button. Every control of the open sheet,
// and the card's own, must be the element at its own centre, at the laptop sizes; and a real click on Give gives.
const SIZES = [{ width: 1280, height: 720 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }];
/** The controls in `scope` whose centre point is taken by an element inside `over` (that region lies over them). */
const covered = (page: Page, scope: string, over: string) => page.evaluate(([sel, by]) => {
  const out: string[] = [];
  for (const root of document.querySelectorAll(sel)) {
    for (const el of root.querySelectorAll<HTMLElement>('button, summary, input, select, a[href]')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden') continue;
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const box = root.getBoundingClientRect(); // scrolled out of the sheet's (or card's) own box: hidden by it, not covered
      if (x < Math.max(0, box.left) || y < Math.max(0, box.top) || x > Math.min(innerWidth, box.right) || y > Math.min(innerHeight, box.bottom)) continue;
      const hit = document.elementFromPoint(x, y);
      if (hit && !(el === hit || el.contains(hit)) && hit.closest(by)) out.push(`${el.className || el.tagName} "${(el.textContent ?? '').trim().slice(0, 40)}" under ${hit instanceof HTMLElement ? hit.className || hit.tagName : 'nothing'}`);
    }
  }
  return out;
}, [scope, over] as const);
for (const which of ['clean', 'incompatible'] as const) {
  test(`brief 164 (the staging card, ${which}): no open sheet's control lies under the dock's card, at the laptop sizes; the Drug sheet's Give gives`, async ({ page, browser, browserName }) => {
    test.setTimeout(240_000);
    await classroom();
    const KEY = 'bed4remote01';
    const { code, pin } = await laptop(page, null, { [KEY]: 'bed 4 remote' });
    await page.evaluate(() => {
      const w = window as unknown as HostW & DrugsW;
      w.__drugs = [];
      w.__pmeApp.session.onEvent((e) => void (e.drugs && (w.__drugs = e.drugs.map((d) => d.id))));
    });
    const { p, ctx } = await phone(browser, browserName, code, pin, KEY);
    await prepareOn(p, which === 'clean'
      ? [{ search: 'ephedrine', drug: 'ephedrine', product: 'akovaz-50mg-ml', amount: 1 }]
      : [{ search: 'sodium bic', drug: 'sodiumBicarbonate', product: 'sodium-bicarbonate-84mg-ml', amount: 10 }, { search: 'epinephrine', drug: 'epinephrine', product: 'adrenalin-1mg-ml', amount: 1 }], null);
    const card = page.locator('.ip2-dock .ip2-lp');
    await expect(card).toBeVisible({ timeout: 15_000 });
    const control = which === 'clean' ? card.locator('.ip2-lp-clean-sum') : card.locator('.ip2-lp-show');
    await expect(control).toBeVisible();
    for (const size of SIZES) {
      await page.setViewportSize(size);
      for (const id of ['airway', 'defib', 'devices', 'drug'] as const) {
        await sheet(page, id);
        if (id === 'drug') {
          const d = page.locator('.ip2-sheets .ip2-sheet[data-sheet=drug]');
          await d.locator('input.ip2-drug-search').fill('epineph');
          await page.keyboard.press('Enter');
          await d.locator('.ip2-presets button.ip2-preset').first().click();
        }
        expect.soft(await covered(page, `.ip2-sheets .ip2-sheet[data-sheet=${id}]:not([hidden])`, '.ip2-dock'), `${id} sheet at ${size.width}×${size.height}`).toEqual([]);
        expect.soft(await covered(page, '.ip2-dock .ip2-lp', '.ip2-sheets'), `the card at ${size.width}×${size.height} with the ${id} sheet open`).toEqual([]);
        // the dock's own controls stay on their one row under the card
        const mids = await page.locator('.ip2-dock > :not(.ip2-lp)').evaluateAll((es) => es.map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0).map((r) => Math.round(r.top + r.height / 2)));
        expect.soft(Math.max(...mids) - Math.min(...mids), `the dock's controls on one row at ${size.width}×${size.height}`).toBeLessThanOrEqual(2);
      }
    }
    // a real press of the laptop's Give (no force): the drug is in the engine, the record and the Log
    await page.locator('.ip2-sheets .ip2-sheet[data-sheet=drug] button.ip2-give', { hasText: /^Give epinephrine 10 µg now$/ }).click({ timeout: 5_000 });
    await expect.poll(() => engineDrugs(page), { timeout: 10_000 }).toContain('epinephrine');
    await expect.poll(async () => (await rows(page)).filter((r) => r.ev === 'drug:epinephrine' && r.kind === 'action').length, { timeout: 10_000 }).toBe(1);
    await expect.poll(() => logLines(page, 'instructor'), { timeout: 10_000 }).toContain('Epinephrine 10 µg IV');
    await expect(control).toBeVisible(); // the card is still there to use
    await ctx.close();
  });
}
