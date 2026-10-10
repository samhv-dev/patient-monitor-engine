// FU-11 Task F3 (R50 M4): the session bar's Pause button shows what the instructor asked for while the host has not yet
// answered — the 1 s redraw from the host's state must not flip it back (a quick second click then sent the wrong action).
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { link: { send(c: unknown): Promise<unknown> } } };

test('Pause stays "Resume" while the host is slow to answer, and the host ends paused', async ({ page }) => {
  test.setTimeout(60_000);
  await openApp(page, base, '#/teach', { warmMs: 1000 });
  // a slow host: every command reaches it 1.5 s late (two 1 s redraws of the bar fall inside that window)
  await page.evaluate(() => {
    const l = (window as unknown as W).__pmeApp.link;
    const send = l.send.bind(l);
    l.send = (c: unknown) => new Promise((r) => setTimeout(r, 1500)).then(() => send(c));
  });
  const pause = page.locator('.sessionbar').getByRole('button', { name: /^(Pause|Resume)$/ });
  await pause.click();
  const seen: string[] = [];
  for (let i = 0; i < 25; i++) {
    seen.push((await pause.textContent()) ?? '');
    await page.waitForTimeout(100);
  }
  expect(seen.every((s) => s === 'Resume'), seen.join(',')).toBe(true);
  await expect(pause).toHaveText('Resume');
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
});
