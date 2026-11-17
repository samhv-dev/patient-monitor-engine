// A technical alarm sounds at its style's level: on the Saadat-style monitor the SpO2 probe off is level 2 (B9 manuals
// 9-18: yellow message, "DO-DO-DO" every 20 s), read from the message bar and the monitor's own sound log.
import { expect, test } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { alarmBursts, openApp, startVite, TEACH2 } from './app-support.ts';

test.skip(
  ({ browserName }) => browserName === 'webkit' && !!process.env.CI,
  'the CI WebKit runner has no audio output: its output timestamp stays near audio time 0, so every tone maps to ≈ 0 and plays when it is queued, and the sound log cannot show the schedule; macOS WebKit and CI Chromium run it',
);

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { link: { send(c: unknown): Promise<{ accepted: boolean }> } } };

test('saadat-like, SpO2 probe off: a yellow SPO2 SENSOR OFF and three pulses every 20 s', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, base, TEACH2, { warmMs: 1500, site: { skin: 'saadat-like' } });
  const head = page.locator('.ip2-head');
  await head.getByRole('button', { name: 'Sound off' }).click();
  await expect(head.getByRole('button', { name: 'Sound on' })).toBeVisible();
  expect((await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'attachSensor', sensor: 'spo2', state: 'off' }))).accepted).toBe(true);

  // the bar rotates its messages: one read gives the text and its colour together
  const bar = () => page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('.pme-bar');
    return el ? `${el.innerText.trim()} | ${getComputedStyle(el).backgroundColor}` : '';
  });
  await expect.poll(bar, { timeout: 20_000 }).toBe('SPO2 SENSOR OFF | rgb(240, 240, 0)');

  const count = async () => (await alarmBursts(page, 'spo2SensorOff')).length;
  await expect.poll(count, { timeout: 45_000 }).toBeGreaterThanOrEqual(3);
  const b = await alarmBursts(page, 'spo2SensorOff');
  expect(new Set(b.map((x) => x.train)).size, JSON.stringify(b)).toBe(1);
  for (const x of b.slice(0, -1)) expect(x.pulses, JSON.stringify(b)).toBe(3);
  const gaps = b.slice(1).map((x, i) => x.start - (b[i] as (typeof b)[number]).start);
  for (const g of gaps) expect(Math.abs(g - 20), `gaps ${gaps.map((x) => x.toFixed(3)).join(', ')} s: ${JSON.stringify(b)}`).toBeLessThan(0.1);
});
