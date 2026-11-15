// Plan learner-action-remote.md L11 (the e2e of its "Tests first" list): the learner remote's Labs tab on a phone (Pixel 7
// on Chromium, iPhone 13 on WebKit) through the in-process classroom relay, as learner-remote.e2e.ts runs it.
// 1. A learner sends an arterial blood gas: the pending row names the room's analyser and the time from the engine's own
//    row (engine-core analysers.ts, the ABL825's 80 s); the result appears when the PHONE's engine emits its labResult,
//    with the laptop's draw tick, flagged against its ranges; the laptop's record names the panel (N84) and the phone.
// 2. LQ13 (B): a second phone does not see the first's sample, and neither phone sees the instructor's sample, although
//    every follower's engine computes all three.
// PME_E2E_PORT and PME_E2E_RELAY_PORT (+ the worker's index) keep Vite and the relay inside a machine's port range.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devices, expect, test, type Browser, type BrowserContext, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => relay?.close());

type Row = { kind: string; text: string; by?: string; name?: string };
type HostW = { __pmeApp: { session: { code: string; record: { data: { rows: Row[] } } }; link: { send(c: unknown): Promise<{ accepted: boolean; tick: number }> } } };
type PhoneW = { __pmeLearnerLabs: { samples: Array<{ panel: string; drawnAt: number; resulted: boolean }> } };

const ws = () => `ws://127.0.0.1:${relay!.port}/`;
async function classroom(): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'l11-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  relay = await startRelay({ port: fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
}
async function laptop(page: Page, names: Record<string, string>): Promise<{ code: string; pin: string }> {
  await page.addInitScript((n) => localStorage.setItem('pme.roomLayout', JSON.stringify(Object.fromEntries(Object.entries(n).map(([k, name]) => [k, { name, show: 'remote', lastSeen: Date.now() }])))), names);
  await openApp(page, base, `?relay=${encodeURIComponent(ws())}&scenario=showcase-mh-v2#/teach2`, { warmMs: 1500 });
  const code = await page.evaluate(() => (window as unknown as HostW).__pmeApp.session.code);
  const pin = (await page.evaluate(() => localStorage.getItem('pme.learnerPin'))) as string;
  return { code, pin };
}
/** A learner phone with device key `key`, signed in on the learner PIN, on its Labs tab. */
async function phone(browser: Browser, browserName: string, code: string, pin: string, key: string): Promise<{ p: Page; ctx: BrowserContext; results: string[] }> {
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const ctx = await browser.newContext(dev);
  await ctx.addInitScript((k) => localStorage.setItem('pme.device', k), key);
  const p = await ctx.newPage();
  const results: string[] = []; // a labResult must never cross the wire (§4 D6): every frame this phone received is checked
  p.on('websocket', (w) => w.on('framereceived', (fr) => void (String(fr.payload).includes('labResult') && results.push(String(fr.payload)))));
  await p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws())}#/remote/learner`);
  for (const d of pin) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
  await p.locator('.ip-peer-go').click();
  await expect(p.locator('.lr-status')).toHaveText(`Signed in as a learner remote · ${code}`, { timeout: 20_000 });
  await p.getByRole('tab', { name: 'Labs' }).click();
  await expect(p.locator('.lr-lab-send')).toHaveCount(4);
  return { p, ctx, results };
}
const rows = (page: Page) => page.evaluate(() => (window as unknown as HostW).__pmeApp.session.record.data.rows);
const samples = (p: Page) => p.evaluate(() => (window as unknown as PhoneW).__pmeLearnerLabs.samples);
const mmss = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

test('L11: a learner sends an arterial blood gas, waits the analyser time from the engine row, and reads the flagged result; the record names the panel', async ({ page, browser, browserName }) => {
  test.setTimeout(180_000);
  await classroom();
  const KEY = 'bed3remote01';
  const { code, pin } = await laptop(page, { [KEY]: 'bed 3 remote' });
  const { p, ctx, results } = await phone(browser, browserName, code, pin, KEY);
  for (const b of await p.locator('.lr-lab-send').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44); // [ENG: ui] 44 px targets
  await p.locator('.lr-lab-send[data-panel="abg"]').click();
  const row = p.locator('.lr-lab').first();
  await expect(row.locator('.lr-lab-state')).toHaveAttribute('data-state', 'pending', { timeout: 10_000 });
  const [s] = await samples(p);
  expect(s?.panel).toBe('abg');
  // the time is the ABL825 row's 80 s after the laptop's draw tick (Radiometer 928-544), named with the analyser
  await expect(row.locator('.lr-lab-title')).toHaveText(`Arterial blood gas drawn ${mmss(s!.drawnAt)}`);
  await expect(row.locator('.lr-lab-state')).toHaveText(`Result expected ${mmss(s!.drawnAt + 80)} (Radiometer ABL825 FLEX, analyser time only)`);
  expect(await row.locator('tbody tr').count()).toBe(0);
  // ×8 on the laptop: the 80 s pass in about ten
  expect((await page.evaluate(() => (window as unknown as HostW).__pmeApp.link.send({ type: 'time', action: 'scale', value: 8 }))).accepted).toBe(true);
  await expect(row.locator('.lr-lab-state')).toHaveText(`Resulted ${mmss(s!.drawnAt + 80)}`, { timeout: 30_000 });
  expect(await row.locator('tbody tr').count()).toBeGreaterThan(10);
  await expect(row.locator('tr[data-key="k"] .range')).toHaveText('3.5–5');
  expect(results).toEqual([]); // the result is the phone's own engine's, not a frame from the laptop
  // the laptop's record: the panel by name (N84), filed as this phone's
  await expect.poll(async () => (await rows(page)).filter((r) => r.kind === 'learner' && r.text.includes('Arterial blood gas sent')).length, { timeout: 10_000 }).toBe(1);
  expect((await rows(page)).find((r) => r.text.includes('Arterial blood gas sent'))).toMatchObject({ by: KEY, name: 'bed 3 remote' });
  expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await ctx.close();
});

test("L11 (LQ13): a second phone does not see the first's sample, and neither sees the instructor's", async ({ page, browser, browserName }) => {
  test.setTimeout(180_000);
  await classroom();
  const { code, pin } = await laptop(page, {});
  const a = await phone(browser, browserName, code, pin, 'phoneaaaa011');
  const b = await phone(browser, browserName, code, pin, 'phonebbbb012');
  await a.p.locator('.lr-lab-send[data-panel="vbg"]').click();
  await expect(a.p.locator('.lr-lab')).toHaveCount(1, { timeout: 10_000 });
  const inst = await page.evaluate(() => (window as unknown as HostW).__pmeApp.link.send({ type: 'applyEvent', event: { kind: 'lab', panel: 'abg' } }));
  expect(inst.accepted).toBe(true);
  expect((await page.evaluate(() => (window as unknown as HostW).__pmeApp.link.send({ type: 'time', action: 'scale', value: 8 }))).accepted).toBe(true);
  await expect(a.p.locator('.lr-lab .lr-lab-state')).toHaveAttribute('data-state', 'resulted', { timeout: 30_000 });
  await b.p.waitForTimeout(12_000); // the instructor's 80 s at ×8 have passed on every engine
  expect(await samples(a.p)).toEqual([expect.objectContaining({ panel: 'vbg', resulted: true })]);
  await expect(a.p.locator('.lr-lab')).toHaveCount(1);
  await expect(b.p.locator('.lr-lab')).toHaveCount(0);
  await expect(b.p.locator('.lr-lab-empty')).toBeVisible();
  expect(await b.p.locator('.lr-labs table').count()).toBe(0);
  await a.ctx.close();
  await b.ctx.close();
});
