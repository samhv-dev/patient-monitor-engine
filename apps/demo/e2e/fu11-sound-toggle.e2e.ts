// FU-11 Task H4 (Ali, live at the first showcase): the top bar's Sound button turns sound OFF again — before, it only
// unlocked audio and relabelled itself. Per window (owner ruling Q3): the learner monitor's own button does the same for
// its window only.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { soundOn: boolean; monitor: { soundOn: boolean } } } };
const state = (page: import('@playwright/test').Page) => page.evaluate(() => { const s = (window as unknown as W).__pmeApp.session; return { session: s.soundOn, monitor: s.monitor.soundOn }; });

test('Sound on, then off again, then on: the button, its pressed state and the monitor\'s audio agree', async ({ page }) => {
  test.setTimeout(60_000);
  await openApp(page, base, '#/teach', { warmMs: 500 });
  const sound = page.locator('.topright .sound');
  await expect(sound).toHaveText('Sound off');
  await sound.click();
  await expect(sound).toHaveText('Sound on');
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => state(page)).toEqual({ session: true, monitor: true });
  await sound.click();
  await expect(sound).toHaveText('Sound off');
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => state(page)).toEqual({ session: false, monitor: false });
  await sound.click();
  await expect.poll(() => state(page)).toEqual({ session: true, monitor: true });
});
