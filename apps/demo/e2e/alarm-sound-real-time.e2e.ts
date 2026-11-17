// The alarm sound keeps its rhythm in real time when the instructor changes the case speed: a sounding VF alarm on the
// default monitor, ×1 → ×8 → ×1, read from the monitor's own sound log. Each burst is whole and every burst starts one
// repeat (the one measured at ×1) after the one before, with none missing and none piled up. Only the VFIB train is
// read: before VF is confirmed its waves can raise VTAC first, which then sounds until VFIB takes over. The VF is set
// without its own decay to asystole, so the alarm under test stays raised for the whole run (several sim minutes at ×8).
import { expect, test } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { alarmBursts, openApp, speedV2, startVite, TEACH2, type Burst } from './app-support.ts';

test.skip(
  ({ browserName }) => browserName === 'webkit' && !!process.env.CI,
  'the CI WebKit runner has no audio output: its output timestamp stays near audio time 0, so every tone maps to ≈ 0 and plays when it is queued, and the sound log cannot show the schedule; macOS WebKit and CI Chromium run it',
);

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { link: { send(c: unknown): Promise<{ accepted: boolean }> } } };

test('speed changes during a sounding alarm: every burst whole, one repeat after the last, in real time', async ({ page }) => {
  test.setTimeout(150_000);
  await openApp(page, base, TEACH2, { warmMs: 1000 });
  const head = page.locator('.ip2-head');
  await head.getByRole('button', { name: 'Sound off' }).click();
  await expect(head.getByRole('button', { name: 'Sound on' })).toBeVisible();
  expect((await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'setRhythm', rhythm: 'vfCoarse', opts: { autoAsystole: false } }))).accepted).toBe(true);
  const count = async () => (await alarmBursts(page, 'VFIB')).length;
  await expect.poll(count, { timeout: 40_000 }).toBeGreaterThanOrEqual(2);
  await speedV2(page, 8);
  await expect.poll(count, { timeout: 40_000 }).toBeGreaterThanOrEqual(4);
  await speedV2(page, 1);
  await expect.poll(count, { timeout: 40_000 }).toBeGreaterThanOrEqual(6);

  const b = await alarmBursts(page, 'VFIB');
  expect(new Set(b.map((x) => x.train)).size, `one VFIB train throughout: ${JSON.stringify(b)}`).toBe(1);
  const repeat = (b[1] as Burst).start - (b[0] as Burst).start;
  const gaps = b.slice(1).map((x, i) => +(x.start - (b[i] as Burst).start).toFixed(3));
  for (const g of gaps) expect(Math.abs(g - repeat), `gaps ${gaps.join(', ')} s against ${repeat.toFixed(3)} s: ${JSON.stringify(b)}`).toBeLessThan(0.1);
  // the last burst may still be playing out; every earlier one holds the first one's pulses, no more
  for (const x of b.slice(1, -1)) expect(x.pulses, JSON.stringify(b)).toBe((b[0] as Burst).pulses);
});
