// The Case briefing on real screens (the owner's board Orientation 7b, its phone twin and the Persian twins without the
// ring): the MH card loaded with a relay, the briefing over the host's Monitor view at 1280 × 800 with the monitor
// running under it, a phone (emulated, Pixel 7 on Chromium, iPhone 13 on WebKit) joining mid-briefing and showing the
// remainder, a tap doing nothing there and a press-and-hold ending it on that phone only (the owner's ruling of 31 October), the instructor's "End briefing" ending it on the host and every phone
// (today's Instructor view; Instructor v2's status line under the stage strip, at 1440 × 900, the owner's choice of 31 October);
// then a Persian briefing (the board's Persian text: a rendering fixture, on no card) on the host and a phone.
// Screenshots go to PME_BRIEFING_SHOTS (default: this test's output folder) for the owner's look.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { devices, expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { DEFAULT_REVEAL } from '../../../packages/controller/src/panel/reveal.ts';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => relay?.close());

type W = {
  __pmeFollower: { sync: { status: string } | null };
  __pmeApp: { session: { code: string; loadScenario(doc: unknown): { ok: boolean } }; link: { simT: number } };
};
const MH = JSON.parse(readFileSync(resolve(import.meta.dirname, '../src/app/showcase/showcase-mh.json'), 'utf8')) as Record<string, unknown>;
/** The board's Persian text (OrientationFa7, as checked with the project's Persian tooling): a rendering fixture only. */
const FA_TEXT = "شما رزیدنت بیهوشی در اتاق عمل هستید. مردی ۳۵‌ساله و سالم با وزن ۸۰ کیلوگرم برای جراحی الکتیو روی تخت است. پیش‌دارو با میدازولام و فنتانیل گرفته، پره‌اکسیژنه شده، با پروپوفول و ساکسینیل‌کولین القا شده و بدون مشکل اینتوبه شده است. بیهوشی با سووفلوران ۲٪ ادامه دارد و ونتیلاتور روی ۱۲ × ۵۰۰ تنظیم شده است. جراحی تازه شروع شده است.\n\nبه مانیتور نگاه کنید. هر تغییری را که می‌بینید بلند بگویید، و بگویید در برابرش چه می‌کنید.";
const layer = (p: Page) => p.locator('.stage > .case-briefing:not(.cb-out)');
/** The footer's countdown, s (Persian digits read too). */
/** A phone's press-and-hold, ms (briefing.ts, BRIEFING_HOLD_MS). */
const BRIEFING_HOLD_MS = DEFAULT_REVEAL.longPressMs;
/** A press on the phone's briefing held for `ms`: the hairline over the footer fills while it is held. */
const hold = async (p: Page, ms: number, shotName?: string) => {
  const box = (await layer(p).boundingBox()) as { x: number; y: number; width: number; height: number };
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down();
  await p.waitForTimeout(Math.min(ms, BRIEFING_HOLD_MS / 2));
  await expect(layer(p)).toHaveAttribute('data-holding', '');
  if (shotName) await p.screenshot({ path: shotName });
  await p.waitForTimeout(Math.max(0, ms - BRIEFING_HOLD_MS / 2));
  await p.mouse.up();
};
const count = async (p: Page) => {
  const t = (await layer(p).locator('.cb-count').textContent()) ?? '';
  const m = /^(\d+):(\d\d)$/.exec(t.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))));
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};

test('the Case briefing: over the running monitor on the host and the phones, a press-and-hold ends it on a phone, End briefing everywhere; Persian', async ({ page, browser, browserName }, info) => {
  test.setTimeout(180_000);
  const out = process.env.PME_BRIEFING_SHOTS ?? info.outputPath();
  mkdirSync(out, { recursive: true });
  const shot = (p: Page, name: string) => p.screenshot({ path: join(out, `${name}-${browserName}.png`) });
  const dir = mkdtempSync(join(tmpdir(), 'briefing-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  relay = await startRelay({ port: 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = `ws://127.0.0.1:${relay.port}/`;
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page, base, `?relay=${encodeURIComponent(ws)}&scenario=showcase-mh#/monitor`);
  await expect(layer(page)).toBeVisible({ timeout: 15_000 });
  await expect(layer(page).locator('.cb-title')).toHaveText('Case briefing');
  await expect(layer(page).locator('.cb-est')).toHaveText('Estimated scenario time about 25 minutes');
  await expect(layer(page).locator('.cb-p')).toHaveCount(2);
  await expect(layer(page).locator('.cb-foot > span').nth(1)).toHaveText('Tap or click anywhere to continue now');
  // the monitor runs under it, dimmed to 40 per cent
  await expect(page.locator('.stage > .monitor-host')).toHaveCSS('opacity', '0.4');
  const t0 = await page.evaluate(() => (window as unknown as W).__pmeApp.link.simT);
  const c0 = await count(page);
  await page.waitForTimeout(4000);
  const t1 = await page.evaluate(() => (window as unknown as W).__pmeApp.link.simT);
  const c1 = await count(page);
  console.log(`briefing host: count ${c0} → ${c1}, simT ${t0.toFixed(1)} → ${t1.toFixed(1)}`);
  expect(t1 - t0, 'the monitor keeps running').toBeGreaterThan(2.5);
  expect(c1).toBeLessThan(c0);
  await shot(page, 'briefing-host-1280x800-en');

  // a phone that joins now shows the remainder
  const code = await page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  // Both phones load at once: on the 2-vCPU CI WebKit runner a second phone that starts loading only after the first
  // is following never synced within 30 s (every run of #211, 31 October; macOS WebKit 10 of 10). The wait polls on a
  // timer, not on animation frames, which Linux WebKit may hold back for a page it treats as hidden.
  const phoneAt = async () => {
    const p = await (await browser.newContext(dev)).newPage();
    await p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws)}`);
    await p.waitForFunction(() => (window as unknown as W).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000, polling: 250 });
    return p;
  };
  const [f, g] = await Promise.all([phoneAt(), phoneAt()]);
  await expect(layer(f)).toBeVisible({ timeout: 10_000 });
  await expect(layer(f).locator('.cb-foot > span').nth(1)).toHaveText('Press and hold anywhere to continue now');
  const left = await count(f);
  const hostLeft = await count(page);
  console.log(`briefing phone joined with ${left} s left (host ${hostLeft} s)`);
  expect(left).toBeLessThan(57);
  expect(Math.abs(left - hostLeft)).toBeLessThanOrEqual(1);
  expect(await f.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await f.waitForTimeout(1500);
  await shot(f, 'briefing-phone-en');
  await expect(layer(g)).toBeVisible({ timeout: 10_000 });
  // a tap does nothing on a phone (residents brush the screen), nor does a press let go early; a press-and-hold ends
  // it on that phone only
  await layer(f).tap();
  await hold(f, BRIEFING_HOLD_MS / 2);
  await f.waitForTimeout(BRIEFING_HOLD_MS);
  await expect(layer(f)).toBeVisible();
  await expect(layer(f)).not.toHaveAttribute('data-holding');
  await hold(f, BRIEFING_HOLD_MS + 300, join(out, `briefing-phone-holding-${browserName}.png`));
  await expect(f.locator('.stage > .case-briefing')).toHaveCount(0, { timeout: 3_000 });
  await expect(layer(page)).toBeVisible();
  await expect(layer(g)).toBeVisible();
  // Instructor v2 at the laptop's 1440 × 900 (the owner's choice of 31 October): the status line under the stage strip
  // reads the briefing and its time left beside End briefing; the chips' row carries no briefing element
  // the phones' windows opened over the host: CI's Linux WebKit stopped painting it there (the route change to #/teach2
  // never drew, its countdown froze; run 41196207539), so each page is brought to the front before it is driven again
  await page.bringToFront();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => (location.hash = '#/teach2'));
  const status = page.locator('.ip2-strip > .ip2-status');
  await expect(status).toBeVisible({ timeout: 5_000 });
  await expect(status.locator('.ip2-status-text')).toHaveText(/^Case briefing on every screen · 0:\d\d left$/);
  await expect(status.getByRole('button', { name: 'End briefing' })).toBeVisible();
  await expect(page.locator('.ip2-strip .cb-end')).toHaveCount(0);
  const fits = await page.evaluate(() => {
    const strip = document.querySelector('.ip2-strip') as HTMLElement;
    const st = (strip.querySelector('.ip2-status') as HTMLElement).getBoundingClientRect();
    return { strip: [strip.scrollWidth, strip.clientWidth], statusH: Math.round(st.height), page: [document.documentElement.scrollHeight, innerHeight] };
  });
  console.log(`briefing teach2 1440x900 ${JSON.stringify(fits)}`);
  expect(fits.strip[0], 'the strip scrolls sideways during the briefing').toBeLessThanOrEqual(fits.strip[1] as number);
  expect(fits.statusH).toBe(40);
  expect(fits.page[0]).toBeLessThanOrEqual(fits.page[1] as number);
  await page.waitForTimeout(1000);
  await shot(page, 'briefing-teach2-1440x900');
  await page.locator('.ip2-strip').screenshot({ path: join(out, `briefing-teach2-strip-status-1440x900-${browserName}.png`) });
  await page.setViewportSize({ width: 1280, height: 800 });
  // the instructor's End briefing (today's Instructor view) ends it on the host and every phone
  await page.evaluate(() => (location.hash = '#/teach'));
  await expect(layer(page)).toBeHidden();
  const end = page.locator('.view[data-view="teach"] > .cb-end');
  await expect(end).toBeVisible();
  await end.getByRole('button', { name: 'End briefing' }).click();
  await expect(end).toBeHidden();
  await expect(g.locator('.stage > .case-briefing')).toHaveCount(0, { timeout: 5_000 });
  await page.evaluate(() => (location.hash = '#/monitor'));
  await expect(page.locator('.stage > .case-briefing')).toHaveCount(0, { timeout: 3_000 });
  await expect(page.locator('.stage > .monitor-host')).toHaveCSS('opacity', '1');

  // Persian: the same card with the board's Persian briefing, on the host and a phone
  const fa = { ...MH, id: 'showcase-mh-fa-shot', briefing: { text: FA_TEXT, estimatedMinutes: 25, durationS: 60, lang: 'fa' } };
  expect(await page.evaluate((d) => (window as unknown as W).__pmeApp.session.loadScenario(d).ok, fa)).toBe(true);
  await expect(layer(page)).toBeVisible({ timeout: 10_000 });
  await expect(layer(page)).toHaveAttribute('dir', 'rtl');
  await expect(layer(page).locator('.cb-title')).toHaveText('معرفی سناریو');
  await expect(layer(page).locator('.cb-est')).toHaveText('زمان تقریبی سناریو: حدود ۲۵ دقیقه');
  expect(await page.evaluate(() => document.querySelector('.stage .monitor-host')?.closest('[dir="rtl"]') ?? null)).toBeNull();
  await page.waitForTimeout(3000);
  await shot(page, 'briefing-host-1280x800-fa');
  await f.bringToFront();
  await expect(layer(f)).toBeVisible({ timeout: 10_000 }); // the phone that held the English one away
  await expect(layer(f).locator('.cb-foot > span').nth(1)).toHaveText('برای ادامه، هر جای صفحه را لمس کنید و نگه دارید');
  await f.waitForTimeout(1000);
  await shot(f, 'briefing-phone-fa');
  // the same gesture in Persian: a tap does nothing, a press-and-hold ends it on that phone
  await layer(f).tap();
  await f.waitForTimeout(BRIEFING_HOLD_MS);
  await expect(layer(f)).toBeVisible();
  await hold(f, BRIEFING_HOLD_MS + 300, join(out, `briefing-phone-holding-fa-${browserName}.png`));
  await expect(f.locator('.stage > .case-briefing')).toHaveCount(0, { timeout: 3_000 });
  await expect(layer(g)).toBeVisible();
  // v2's End briefing in the status line ends it on the host and every phone, and the status line goes
  await page.bringToFront();
  await page.evaluate(() => (location.hash = '#/teach2'));
  await expect(status).toBeVisible({ timeout: 5_000 });
  await status.getByRole('button', { name: 'End briefing' }).click();
  await expect(status).toBeHidden();
  await expect(f.locator('.stage > .case-briefing')).toHaveCount(0, { timeout: 5_000 });
  await expect(g.locator('.stage > .case-briefing')).toHaveCount(0, { timeout: 5_000 });
});
