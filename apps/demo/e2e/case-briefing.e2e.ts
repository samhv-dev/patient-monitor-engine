// The Case briefing on real screens (the owner's board Orientation 7b, its phone twin and the Persian twins without the
// ring): the MH card loaded with a relay, the briefing over the host's Monitor view at 1280 × 800 with the monitor
// running under it, a phone (emulated, Pixel 7 on Chromium, iPhone 13 on WebKit) joining mid-briefing and showing the
// remainder, a tap doing nothing there and a press-and-hold ending it on that phone only (the owner's ruling of 31 October), the instructor's "End briefing" ending it on the host and every phone
// (Instructor v2's status line under the stage strip, at 1440 × 900, the owner's choice of 31 October);
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

// Defect N25 (brief 103) was the session clock under load: the 250 ms frame clamp ran the body at 0.4-0.7 of real time
// and a worker's start-up delayed it behind the session clock. Brief 105 fixed both (the whole wall time is owed and run
// within a frame budget; the monitor's clock starts at its mount); the tag came off with it.
test('the Case briefing: over the running monitor on the host and the phones, a press-and-hold ends it on a phone, End briefing everywhere; Persian', async ({ page, browser, browserName }, info) => {
  // FX-2, as mobile-learner.e2e.ts and sim-line.e2e.ts: the 2-vCPU CI WebKit runner cannot hold an instructor, two phones
  // and the relay in step. After the waits were made robust (48c5b101, 485065b8, 0833320a) and the relay's two-phone bug
  // fixed (9ce27f41), the phones still did not reach 'synced' within 30 s on CI WebKit (run 41204528331: 2 attempts of 3,
  // the third with the host's v2 status line never drawn); this test passes on macOS WebKit 10/10 and on Chromium
  test.skip(browserName === 'webkit' && !!process.env.CI, 'FX-2: the 2-vCPU CI WebKit runner cannot hold an instructor, two phones and the relay in step (runs 41199805030, 41204528331); macOS WebKit and CI Chromium run it');
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
  // Both phones join at once, as a classroom's do (the relay once gave the second a snapshot without the briefing). CI's
  // Linux WebKit stops painting, and throttles the timers of, a page whose window is not in front: the host is brought
  // back to the front while the phones sync (it answers their hellos), and each page before it is driven. The wait
  // polls on a timer, not on animation frames.
  const phoneAt = async () => {
    const p = await (await browser.newContext(dev)).newPage();
    await p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws)}`);
    await page.bringToFront();
    await p.waitForFunction(() => (window as unknown as W).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000, polling: 250 });
    return p;
  };
  const [f, g] = await Promise.all([phoneAt(), phoneAt()]);
  await expect(layer(f)).toBeVisible({ timeout: 10_000 });
  await expect(layer(f).locator('.cb-foot > span').nth(1)).toHaveText('Press and hold anywhere to continue now');
  const hostLeft = await count(page); // the host is in front here
  await f.bringToFront();
  const left = await count(f);
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
  // (run 41196207539: without this the host's route change to #/teach2 never drew and its countdown froze)
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
  // the instructor's End briefing (Instructor v2's status line; today's view's step dropped, retire-instructor-v1 PR 2)
  // ends it on the host and every phone
  await expect(layer(page)).toBeHidden();
  await status.getByRole('button', { name: 'End briefing' }).click();
  await expect(status).toBeHidden();
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

// Debrief 2, D13b: a card written in English with the owner-read Persian (`briefing.textFa`), the host set to Persian
// (the Debrief's switch, pme.lang): the host and one phone both show the Persian briefing right to left in the bundled
// Vazirmatn. The texts are a rendering fixture, not a card's words: no card carries textFa until the owner has read it.
test('D13b: the host in Persian sends a card\'s textFa; the host and one phone show it right to left in Vazirmatn', async ({ page, browser, browserName }) => {
  test.setTimeout(120_000);
  const dir = mkdtempSync(join(tmpdir(), 'briefing-fa-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  relay = await startRelay({ port: 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = `ws://127.0.0.1:${relay.port}/`;
  await page.addInitScript(() => localStorage.setItem('pme.lang', 'fa'));
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page, base, `?relay=${encodeURIComponent(ws)}#/monitor`);
  const code = await page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const f = await (await browser.newContext(dev)).newPage();
  await f.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws)}`);
  await page.bringToFront();
  await f.waitForFunction(() => (window as unknown as W).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000, polling: 250 });
  const brief = MH.briefing as { text: string };
  const card = { ...MH, id: 'showcase-mh-textfa-e2e', briefing: { ...brief, lang: 'en', textFa: FA_TEXT, durationS: 60 } };
  expect(await page.evaluate((d) => (window as unknown as W).__pmeApp.session.loadScenario(d).ok, card)).toBe(true);
  for (const p of [page, f]) {
    if (p === f) await f.bringToFront();
    await expect(layer(p)).toBeVisible({ timeout: 10_000 });
    await expect(layer(p)).toHaveAttribute('dir', 'rtl');
    await expect(layer(p)).toHaveAttribute('lang', 'fa');
    await expect(layer(p).locator('.cb-title')).toHaveText('معرفی سناریو');
    await expect(layer(p).locator('.cb-p').first()).toHaveText(FA_TEXT.split('\n\n')[0] as string);
    await expect.poll(() => p.evaluate(() => [...document.fonts].some((x) => x.family.replace(/["']/g, '') === 'Vazirmatn' && x.status === 'loaded')),
      { timeout: 10_000, message: 'the bundled Vazirmatn is loaded' }).toBe(true);
    expect(await layer(p).locator('.cb-p').first().evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/^"?Vazirmatn/);
  }
  // the host set to English: the same card sends its English text
  await page.bringToFront();
  await page.evaluate(() => localStorage.setItem('pme.lang', 'en'));
  expect(await page.evaluate((d) => (window as unknown as W).__pmeApp.session.loadScenario(d).ok, { ...card, id: 'showcase-mh-textfa-e2e-en' })).toBe(true);
  await expect(layer(page)).toHaveAttribute('lang', 'en', { timeout: 10_000 });
  await expect(layer(page).locator('.cb-p').first()).toHaveText(brief.text.split('\n\n')[0] as string);
});
