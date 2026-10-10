// FU-11 Task H4 (R50 F10): a new patient (patient restart, scenario load) unloads the Ventilator view's cockpit — it no
// longer ventilates the next case with the last case's settings; the next visit loads a fresh one, as on a fresh page.
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { restart(s: unknown): void; spec: unknown; timeScale: number } } };
const cockpits = (p: Page) => p.frames().filter((f) => f.url().includes('vent-hamilton')).length;
const restart = (p: Page) => p.evaluate(() => { const s = (window as unknown as W).__pmeApp.session; s.restart({ spec: s.spec, mode: 'modeled' }); });

test('the cockpit is unloaded by a new patient and reloads fresh on the next visit (or at once when shown)', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, base, '#/vent', { warmMs: 2000 });
  await expect.poll(() => cockpits(page), { timeout: 10_000 }).toBe(1);
  await page.evaluate(() => (location.hash = '#/teach'));
  await restart(page);
  await expect.poll(() => page.locator('iframe.vent').getAttribute('src'), { timeout: 5_000 }).toBe('about:blank');
  await expect.poll(() => cockpits(page), { timeout: 5_000 }).toBe(0);
  await page.evaluate(() => (location.hash = '#/vent'));
  await expect.poll(() => cockpits(page), { timeout: 10_000 }).toBe(1);
  // on screen during the restart: a fresh cockpit at once
  const cockpit = () => page.frames().find((f) => f.url().includes('vent-hamilton'));
  await cockpit()?.evaluate(() => void ((window as unknown as { __old?: boolean }).__old = true));
  await restart(page);
  const fresh = async () => (await cockpit()?.evaluate(() => !(window as unknown as { __old?: boolean }).__old && '__vent' in window).catch(() => false)) ?? false;
  await expect.poll(fresh, { timeout: 10_000 }).toBe(true);
});
