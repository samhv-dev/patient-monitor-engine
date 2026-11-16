// The alarm sound keeps its rhythm in real time when the instructor changes the case speed: a sounding VF alarm on the
// default monitor, ×1 → ×8 → ×1, read from the monitor's own sound log. Each burst is whole and every burst starts one
// repeat (the one measured at ×1) after the one before, with none missing and none piled up.
import { expect, test } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, speedV2, startVite, TEACH2 } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type Entry = { id: string; kind: string; when: number };
type W = { __pmeApp: { session: { monitor: { audioLog: Entry[] } }; link: { send(c: unknown): Promise<{ accepted: boolean }> } } };
type Burst = { train: string; start: number; pulses: number };

/** Every alarm burst in the sound log, from its pulse ids `alarm:<alarm>:<train>:<burst>:<pulse>`: audio start, pulses. */
const alarmBursts = (page: import('@playwright/test').Page): Promise<Burst[]> =>
  page.evaluate(() => {
    const by = new Map<string, number[]>();
    for (const e of (window as unknown as W).__pmeApp.session.monitor.audioLog) {
      if (e.kind !== 'alarm') continue;
      const key = e.id.split(':').slice(0, 4).join(':');
      by.set(key, [...(by.get(key) ?? []), e.when]);
    }
    return [...by].map(([key, w]) => ({ train: key.split(':').slice(0, 3).join(':'), start: Math.min(...w), pulses: w.length })).sort((a, b) => a.start - b.start);
  });

test('speed changes during a sounding alarm: every burst whole, one repeat after the last, in real time', async ({ page }) => {
  test.setTimeout(150_000);
  await openApp(page, base, TEACH2, { warmMs: 1000 });
  const head = page.locator('.ip2-head');
  await head.getByRole('button', { name: 'Sound off' }).click();
  await expect(head.getByRole('button', { name: 'Sound on' })).toBeVisible();
  expect((await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'setRhythm', rhythm: 'vfCoarse' }))).accepted).toBe(true);
  const count = async () => (await alarmBursts(page)).length;
  await expect.poll(count, { timeout: 40_000 }).toBeGreaterThanOrEqual(2);
  await speedV2(page, 8);
  await expect.poll(count, { timeout: 40_000 }).toBeGreaterThanOrEqual(4);
  await speedV2(page, 1);
  await expect.poll(count, { timeout: 40_000 }).toBeGreaterThanOrEqual(6);

  const b = await alarmBursts(page);
  expect(new Set(b.map((x) => x.train)).size, 'one alarm sounding throughout').toBe(1);
  const repeat = (b[1] as Burst).start - (b[0] as Burst).start;
  const gaps = b.slice(1).map((x, i) => +(x.start - (b[i] as Burst).start).toFixed(3));
  for (const g of gaps) expect(Math.abs(g - repeat), `gaps ${gaps.join(', ')} s against ${repeat.toFixed(3)} s`).toBeLessThan(0.1);
  // the last burst may still be playing out; every earlier one holds the first one's pulses, no more
  for (const x of b.slice(1, -1)) expect(x.pulses, JSON.stringify(b)).toBe((b[0] as Burst).pulses);
});
