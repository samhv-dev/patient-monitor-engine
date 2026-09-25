// Gate 4b evidence on the LIVE monitor: per-skin screenshots with the alarm bar idle / raised / silenced, the CSS
// flash rates, a skin switch without an engine restart, the 12-lead report, and the audio timing log.
// Run: PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage4b-device.e2e.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-4b');

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

type Hook = { send(c: Record<string, unknown>): Promise<{ accepted: boolean }>; events: Array<{ type: string; t: number; [k: string]: unknown }> };
const send = (page: Page, c: Record<string, unknown>) => page.evaluate((c) => (window as unknown as { __pme4b: Hook }).__pme4b.send(c), c);
const simT = (page: Page) => page.evaluate(() => {
  const ev = (window as unknown as { __pme4b: Hook }).__pme4b.events.filter((e) => e.type === 'alarmStatus');
  return ev.length ? ev[ev.length - 1]!.t : -1;
});

async function open(page: Page, skin: string) {
  await page.goto(`${base}/stage4b-device.html?skin=${skin}`);
  await page.waitForFunction(() => (window as unknown as { __pme4b?: { ready: boolean } }).__pme4b?.ready === true);
  await page.waitForTimeout(3000);
}

test('live monitor per skin: alarm bar idle, raised (VF), silenced', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1300, height: 640 });
  for (const skin of ['saadat-like', 'philips-like', 'zoll-like']) {
    await open(page, skin);
    await page.locator('#monitor').screenshot({ path: resolve(out, `${skin}--idle.png`) });
    await send(page, { type: 'setRhythm', rhythm: 'vfCoarse' });
    await expect(page.locator('.pme-bar')).toContainText(/VFIB/, { timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.locator('#monitor').screenshot({ path: resolve(out, `${skin}--raised.png`) });
    await send(page, { type: 'device', action: { device: 'alarm', action: 'silence' } });
    await expect(page.locator('.pme-cd')).toContainText(/\d+s/, { timeout: 3000 });
    await page.waitForTimeout(1000);
    await page.locator('#monitor').screenshot({ path: resolve(out, `${skin}--silenced.png`) });
    if (skin === 'saadat-like') await expect(page.locator('.pme-bar')).toHaveText(''); // silence hides the visual (brief §6.4.1)
    else await expect(page.locator('.pme-bar')).toContainText(/VFIB/); // IEC-style: audio only
  }
  expect(errors).toEqual([]);
});

test('flash rates: high 2.0 Hz, medium 0.6 Hz, 50 % duty (computed CSS)', async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, 'philips-like');
  await send(page, { type: 'setTarget', variable: 'hr', value: 150 });
  await expect(page.locator('.pme-bar')).toContainText(/\*\*HR/, { timeout: 15_000 });
  const l2 = await page.locator('.pme-lamp').evaluate((e) => getComputedStyle(e).animationDuration);
  expect(parseFloat(l2)).toBeCloseTo(1 / 0.6, 3);
  await send(page, { type: 'setRhythm', rhythm: 'vfCoarse' });
  await expect(page.locator('.pme-bar')).toContainText(/VFIB/, { timeout: 8000 });
  const l1 = await page.locator('.pme-lamp').evaluate((e) => getComputedStyle(e).animationDuration);
  expect(parseFloat(l1)).toBeCloseTo(0.5, 3);
  const css = await page.evaluate(() => [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n'));
  expect(css).toContain('@keyframes pme-blink{0%{opacity:1}50%{opacity:0.12}}');
});

test('skin switch relayouts lanes and tiles without restarting the engine', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page, 'saadat-like');
  const t0 = await simT(page);
  await page.selectOption('#skin', 'zoll-like');
  // the engine keeps its clock through the switch (no restart); poll, because headless WebKit on CI runs slowly
  const advanced = async (than: number) => (errors.length > 0 ? `page error: ${errors.join('; ')}` : (await simT(page)) > than);
  await expect.poll(() => advanced(t0), { timeout: 15_000 }).toBe(true);
  const t1 = await simT(page);
  // setSkin awaits the worker's command acks before it relayouts the tiles (slow on CI WebKit)
  await expect.poll(async () => (errors.length > 0 ? `page error: ${errors.join('; ')}` : page.locator('.pme-stile[data-param="CO2"]').count()), { timeout: 20_000 }).toBe(1);
  await page.selectOption('#theme', 'ecg-grid');
  await page.waitForTimeout(9000); // one full sweep, so the screenshot shows traces across the grid
  await page.locator('#monitor').screenshot({ path: resolve(out, 'zoll-like--ecg-grid.png') });
  await expect.poll(() => advanced(t1), { timeout: 15_000 }).toBe(true);
});

test('12-lead report: 3×4 + rhythm strip screenshot', async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, 'zoll-like');
  await page.waitForTimeout(8000); // 10 s of ECG
  await page.click('#capture');
  await expect(page.locator('#dlg')).toBeVisible();
  await page.locator('#ecg12').screenshot({ path: resolve(out, '12-lead-3x4.png') });
});

test('audio timing log: alarm pulses, charge / ready / shock tones', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', "headless WebKit's AudioContext clock does not run on the CI runner (lateness 58 s); the gate log is Chrome's");
  test.setTimeout(90_000);
  await open(page, 'zoll-like');
  await page.click('#sound');
  await send(page, { type: 'setRhythm', rhythm: 'vfCoarse' });
  await send(page, { type: 'applyEvent', event: { kind: 'defib', action: 'charge', energyJ: 120 } });
  await page.waitForTimeout(9000);
  await send(page, { type: 'applyEvent', event: { kind: 'defib', action: 'shock' } });
  await page.waitForTimeout(3000);
  const log = await page.evaluate(() => (window as unknown as { __pme4b: { pm: { audioLog: Array<{ id: string; kind: string; simT: number; when: number; lateS: number; dropped: boolean }> } } }).__pme4b.pm.audioLog);
  const kinds = new Set(log.map((e) => e.kind));
  for (const k of ['alarm', 'charge', 'chargeReady', 'shock']) expect(kinds.has(k), k).toBe(true);
  const alarm = log.filter((e) => e.kind === 'alarm');
  const late = alarm.map((e) => e.lateS);
  writeFileSync(
    resolve(out, 'audio-timing.json'),
    `${JSON.stringify({ skin: 'zoll-like', counts: Object.fromEntries([...kinds].map((k) => [k, log.filter((e) => e.kind === k).length])), alarmMaxLateS: Math.max(...late), entries: log }, null, 1)}\n`,
  );
  expect(Math.max(...late)).toBeLessThan(0.15);
});

// Added at execution (brief's gate list): pacing with capture, defibrillator charge-ready with sync markers, trends.
test('device evidence: pacing with capture, charge-ready with sync markers, trends view', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1300, height: 640 });
  type Ev = { type: string; t: number; kind?: string; data?: Record<string, unknown> };
  const markers = (kind: string) => page.evaluate((k) => (window as unknown as { __pme4b: { events: Ev[] } }).__pme4b.events.filter((e) => e.type === 'marker' && e.kind === k), kind);
  await open(page, 'zoll-like');
  await send(page, { type: 'setRhythm', rhythm: 'avb3Wide' });
  await send(page, { type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode: 'fixed', ratePpm: 70, mA: 90 } });
  await page.waitForTimeout(10_000);
  const spikes = await markers('paceSpike');
  expect(spikes.length).toBeGreaterThan(5);
  expect(spikes.slice(2).every((m) => m.data?.captured === true)).toBe(true); // 90 mA > the 60 mA default threshold (R30)
  await expect(page.locator('.pme-hdr')).toContainText('PACER FIXED 70 ppm 90 mA');
  await page.locator('#monitor').screenshot({ path: resolve(out, 'zoll-like--pacing-capture.png') });

  await send(page, { type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode: 'off' } });
  await send(page, { type: 'setRhythm', rhythm: 'sinus' });
  await send(page, { type: 'applyEvent', event: { kind: 'defib', action: 'syncOn' } });
  await send(page, { type: 'applyEvent', event: { kind: 'defib', action: 'charge', energyJ: 120 } });
  await expect(page.locator('.pme-hdr')).toContainText('120 J READY SYNC', { timeout: 15_000 });
  await page.waitForTimeout(5000);
  expect((await markers('syncR')).length).toBeGreaterThan(3);
  await page.locator('#monitor').screenshot({ path: resolve(out, 'zoll-like--defib-sync-ready.png') });

  await open(page, 'philips-like');
  await page.evaluate(() => (window as unknown as { __pme4b: { pm: { setTimeScale(k: number): void } } }).__pme4b.pm.setTimeScale(4)); // max 4× (brief §3.3)
  await page.waitForTimeout(10_000);
  await send(page, { type: 'setTarget', variable: 'hr', value: 130, ramp: { durationS: 30 } });
  await page.waitForTimeout(20_000);
  await send(page, { type: 'setTarget', variable: 'hr', value: 55, ramp: { durationS: 30 } });
  await page.waitForTimeout(20_000);
  await page.selectOption('#span', '600');
  await page.waitForTimeout(1500);
  await page.locator('#trendCanvas').screenshot({ path: resolve(out, 'trends.png') });
});
