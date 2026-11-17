// The learner remote's monitor strip (LEARNER_STRIP, learner-remote.ts): the follower's monitor drawn by the one renderer
// as a strip over the tabs, with ECG lane 1, the pleth and the tiles a learner deciding on a drug reads.
// 1. At three phones upright, a phone on its side and a small tablet both ways, in two styles with the CO2 sensor on (the
//    tallest tiles): ECG lane 1 is drawn, the pleth too where both get the height the renderer needs to label a lane
//    (MIN_LANE_PX); every tile and value lies whole inside the strip; the tabs and the connection line stay on the
//    screen; nothing scrolls sideways.
// 2. At 375 × 812 in sinus rhythm and in ventricular fibrillation: both lanes, the HR box as the skin prints it for that
//    state, and the message bar showing one of the phone's own active alarms, the VF alarm among them; both screenshots
//    attached.
// PME_E2E_PORT and PME_E2E_RELAY_PORT (+ the worker's index) keep Vite and the relay inside a machine's port range.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devices, expect, test, type Browser, type BrowserContext, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { MIN_LANE_PX } from '../../../packages/renderer/src/lane-metrics.ts';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => relay?.close());

type Alarm = { id: string; text: string };
type HostW = { __pmeApp: { session: { code: string; setSkin(skin: string, theme: string): Promise<void> }; link: { send(c: unknown): Promise<{ accepted: boolean }> } } };
type PhoneW = {
  __pmeLearnerRemote: { follower(): { sync: { status: string } | null; style: { skin: string }; monitor: { skin: { skin: { glyphs: { noValue: string } } } | null; on(fn: (e: { type: string; active?: Alarm[] }) => void): () => void } } | null };
  __alarms?: Alarm[][];
};

const SIZES = [
  { name: '375 × 812 phone', width: 375, height: 812 },
  { name: '390 × 844 phone', width: 390, height: 844 },
  { name: '390 × 664 phone (a browser\'s bars shown)', width: 390, height: 664 },
  { name: '844 × 390 phone on its side', width: 844, height: 390 },
  { name: '768 × 1024 tablet', width: 768, height: 1024 },
  { name: '1024 × 768 tablet on its side', width: 1024, height: 768 },
];

async function classroom(page: Page): Promise<{ code: string; pin: string }> {
  const dir = mkdtempSync(join(tmpdir(), 'strip-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  relay = await startRelay({ port: fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  await openApp(page, base, `?relay=${encodeURIComponent(`ws://127.0.0.1:${relay.port}/`)}#/teach2`, { warmMs: 1500 });
  const code = await page.evaluate(() => (window as unknown as HostW).__pmeApp.session.code);
  const pin = (await page.evaluate(() => localStorage.getItem('pme.learnerPin'))) as string;
  return { code, pin };
}

/** A learner phone at 375 × 812, signed in on the learner PIN and following the laptop. */
async function phone(browser: Browser, browserName: string, code: string, pin: string): Promise<{ p: Page; ctx: BrowserContext }> {
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const ctx = await browser.newContext({ ...dev, viewport: { width: 375, height: 812 } });
  await ctx.addInitScript(() => localStorage.setItem('pme.device', 'stripphone01'));
  const p = await ctx.newPage();
  await p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(`ws://127.0.0.1:${relay!.port}/`)}#/remote/learner`);
  for (const d of pin) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
  await p.locator('.ip-peer-go').click();
  await expect(p.locator('.lr-status')).toHaveText(`Signed in as a learner remote · ${code}`, { timeout: 20_000 });
  await p.waitForFunction(() => (window as unknown as PhoneW).__pmeLearnerRemote.follower()?.sync?.status === 'synced', null, { timeout: 30_000, polling: 250 });
  return { p, ctx };
}

const shot = async (p: Page, path: string) => (await p.screenshot({ path }), path);

/** The strip's geometry: its lanes, each tile and each printed value against the strip, and the page around it. */
const geometry = (p: Page) => p.evaluate(() => {
  const stage = (document.querySelector('.stage') as HTMLElement).getBoundingClientRect();
  const canvas = document.querySelector('.stage canvas') as HTMLCanvasElement;
  const lanes = canvas.dataset.lanes?.split(' ') ?? [];
  const inside = (r: DOMRect, o: DOMRect) => r.left >= o.left - 0.5 && r.right <= o.right + 0.5 && r.top >= o.top - 0.5 && r.bottom <= o.bottom + 0.5;
  const outside = [...document.querySelectorAll('.stage .pme-stile')].flatMap((t) => {
    const tr = t.getBoundingClientRect();
    const name = (t as HTMLElement).dataset.param;
    const values = [...t.querySelectorAll('.v, .pv, .s')].filter((v) => (v.textContent ?? '').trim() !== '' && v.getClientRects().length > 0);
    return [...(inside(tr, stage) ? [] : [`tile ${name}`]), ...values.filter((v) => !inside(v.getBoundingClientRect(), tr) || v.scrollWidth > v.clientWidth + 1).map((v) => `${name}: ${v.textContent}`)];
  });
  const tabs = (document.querySelector('.lr-tabs') as HTMLElement).getBoundingClientRect();
  const bar = (document.querySelector('.lr-bar') as HTMLElement).getBoundingClientRect();
  return {
    lanes, laneH: canvas.getBoundingClientRect().height / Math.max(1, lanes.length), outside,
    tiles: [...document.querySelectorAll('.stage .pme-stile')].map((t) => (t as HTMLElement).dataset.param),
    onScreen: tabs.top >= 0 && tabs.bottom <= innerHeight && bar.bottom <= innerHeight + 0.5,
    sideways: document.documentElement.scrollWidth > innerWidth,
  };
});

test('the remote strip at phone and tablet sizes: every lane tall enough to read, every tile and value whole, the tabs on screen', async ({ page, browser, browserName }, testInfo) => {
  test.setTimeout(180_000);
  const { code, pin } = await classroom(page);
  const { p, ctx } = await phone(browser, browserName, code, pin);
  expect((await page.evaluate(() => (window as unknown as HostW).__pmeApp.link.send({ type: 'attachSensor', sensor: 'co2', state: 'on' }))).accepted).toBe(true);
  const measured: Record<string, string> = {}; // the lanes and their height, attached for the record
  const styles = [
    { skin: 'saadat-like', tiles: ['HR', 'NIBP', 'IBP1', 'SpO2', 'CO2'] },
    { skin: 'philips-like', tiles: ['HR', 'ART', 'NIBP', 'SpO2', 'CO2'] },
  ];
  for (const s of styles) {
    await page.evaluate((skin) => (window as unknown as HostW).__pmeApp.session.setSkin(skin, ''), s.skin);
    await p.waitForFunction((skin) => (window as unknown as PhoneW).__pmeLearnerRemote.follower()?.style.skin === skin, s.skin, { timeout: 15_000, polling: 250 });
    await expect.poll(async () => (await geometry(p)).tiles, { timeout: 15_000 }).toEqual(s.tiles); // the CO2 tile once the sensor's swap reached the phone
    for (const t of ['HR', 'SpO2']) await expect(p.locator(`.stage .pme-stile[data-param="${t}"] .v`)).toHaveText(/\d/, { timeout: 15_000 }); // the tiles at their full height
    for (const size of SIZES) {
      await p.setViewportSize({ width: size.width, height: size.height });
      // the strip's plan after the resize: both lanes where each gets MIN_LANE_PX of the wave area, else the ECG alone
      await p.waitForFunction((min) => {
        const c = document.querySelector('.stage canvas') as HTMLCanvasElement;
        return c.dataset.lanes === ((c.parentElement as HTMLElement).clientHeight >= 2 * min ? 'ECG1 PLETH' : 'ECG1');
      }, MIN_LANE_PX, { timeout: 10_000 });
      const g = await geometry(p);
      const at = `${s.skin} at ${size.name}`;
      measured[at] = `${g.lanes.join(' + ')} at ${Math.floor(g.laneH)} px`;
      expect(['ECG1 PLETH', 'ECG1'], at).toContain(g.lanes.join(' '));
      expect(g.laneH, at).toBeGreaterThanOrEqual(MIN_LANE_PX);
      expect(g.outside, at).toEqual([]);
      expect(g.onScreen, at).toBe(true);
      expect(g.sideways, at).toBe(false);
    }
    await p.setViewportSize({ width: 375, height: 812 });
  }
  writeFileSync(testInfo.outputPath('lane-heights.json'), JSON.stringify(measured, null, 1));
  await testInfo.attach('lane heights (px)', { path: testInfo.outputPath('lane-heights.json'), contentType: 'application/json' });
  await ctx.close();
});

test('the remote strip at 375 × 812 in sinus rhythm and in ventricular fibrillation: the trace, the HR box and the alarm message as the monitor shows them', async ({ page, browser, browserName }, testInfo) => {
  test.setTimeout(180_000);
  const { code, pin } = await classroom(page);
  const { p, ctx } = await phone(browser, browserName, code, pin);
  // every alarm status this phone's own engine publishes, newest last
  await p.evaluate(() => {
    const w = window as unknown as PhoneW;
    w.__alarms = [];
    w.__pmeLearnerRemote.follower()!.monitor.on((e) => void (e.type === 'alarmStatus' && w.__alarms!.push(e.active ?? [])));
  });
  const hr = p.locator('.stage .pme-stile[data-param="HR"] .v');
  await expect(hr).toHaveText(/^\d+$/, { timeout: 15_000 });
  await expect(p.locator('.stage .pme-stile[data-param="SpO2"] .v')).toHaveText(/^\d+$/, { timeout: 15_000 });
  expect((await geometry(p)).lanes).toEqual(['ECG1', 'PLETH']);
  await testInfo.attach('remote strip 375 x 812 sinus', { path: await shot(p, testInfo.outputPath('strip-375x812-sinus-' + browserName + '.png')), contentType: 'image/png' });

  expect((await page.evaluate(() => (window as unknown as HostW).__pmeApp.link.send({ type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' }))).accepted).toBe(true);
  await p.waitForFunction(() => ((window as unknown as PhoneW).__alarms ?? []).at(-1)?.some((a) => a.id === 'VFIB') === true, null, { timeout: 30_000, polling: 250 });
  const noValue = await p.evaluate(() => (window as unknown as PhoneW).__pmeLearnerRemote.follower()!.monitor.skin!.skin.glyphs.noValue);
  await expect(hr).toHaveText(noValue);
  // the bar prints one of the active alarms (the skin's own choice among them; it may rotate), read with the alarm list
  const seen = await p.evaluate(() => {
    const all = (window as unknown as PhoneW).__alarms ?? [];
    return { bar: document.querySelector('.stage .pme-bar')?.textContent ?? '', texts: [...(all.at(-2) ?? []), ...(all.at(-1) ?? [])].map((a) => a.text) };
  });
  expect(seen.texts).toContain(seen.bar);
  expect((await geometry(p)).lanes).toEqual(['ECG1', 'PLETH']);
  await testInfo.attach('remote strip 375 x 812 ventricular fibrillation', { path: await shot(p, testInfo.outputPath('strip-375x812-vf-' + browserName + '.png')), contentType: 'image/png' });
  await ctx.close();
});
