// FU-11 Task H3 (showcase kit K3, presenter note D4): the "all limit alarms off" state is named for what it is;
// Sound is reachable below 900 px.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { simNow(): number; monitor: { trends: { latestS: number } } }; link: { simT: number; send(c: unknown): Promise<{ accepted: boolean }> } } };
const speed = (page: import('@playwright/test').Page, x: string) => page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: x }).click();

test('the top-bar alarm count says which alarms are off, and Sound stays reachable in a narrow window', { tag: '@known-flaky' }, async ({ page }) => {
  test.setTimeout(60_000);
  await openApp(page, base, '#/teach', { warmMs: 500 });
  // E114 (Saadat fidelity pass 2): the saadat-like limit alarms are ON at power-on, so the count starts at none; the
  // "all limit alarms off" state is the instructor's (every group switched off), as the as-found ICU preset nearly is
  await expect(page.locator('.alarm-count')).toHaveText('No alarms');
  const r = await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'device', action: { device: 'alarm', action: 'enableAll', value: false } }));
  expect(r.accepted).toBe(true);
  await expect(page.locator('.alarm-count')).toHaveText('Limit alarms off');
  // owner ruling Q4 (R50 M5, R56): the list comes from the saadat-like skin's `alwaysOn`, worded by the alarm table
  await expect(page.locator('.alarm-count')).toHaveAttribute('title', 'Limit alarms are off on this monitor. Still alarming: Asystole, Ventricular fibrillation or tachycardia, Ventricular tachycardia, Apnoea.');
  await page.setViewportSize({ width: 800, height: 700 });
  await expect(page.locator('.topright .sound')).toBeVisible();
});
