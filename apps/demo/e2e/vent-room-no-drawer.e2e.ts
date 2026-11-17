// A ventilator linked to a room has no Patient drawer (the patient is the room's): the app's Ventilator view drives the
// room's patient with a cockpit that has no drawer, no Utilities tab and no Patient button. The stand-alone page keeps
// the drawer, and while it is closed none of its controls can take the focus.
import { expect, test } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { ventLink: unknown } } };

test("the room's Ventilator view drives the patient with no Patient drawer", async ({ page }) => {
  await openApp(page, base, '#/vent');
  const cockpit = page.frameLocator('iframe.vent');
  await expect(cockpit.locator('#rail .railbtn', { hasText: 'Reset' })).toBeVisible();
  await page.waitForFunction(() => (window as unknown as W).__pmeApp.session.ventLink !== null);
  await expect(cockpit.locator('#drawer')).toHaveCount(0);
  await expect(cockpit.locator('#tabUtil')).toHaveCount(0);
  await expect(cockpit.locator('#rail .railbtn', { hasText: /^Patient$/ })).toHaveCount(0);
  await expect(cockpit.getByText('ARDS', { exact: false })).toHaveCount(0);
});

test('the stand-alone page keeps the drawer; closed, its controls take no focus', async ({ page }) => {
  await page.goto(`${base}/vent-hamilton.html`);
  await expect(page.locator('#rail .railbtn', { hasText: 'Reset' })).toBeVisible();
  const inDrawer = () => page.evaluate(() => document.getElementById('drawer')!.contains(document.activeElement));
  const focusable = () => page.evaluate(() => {
    const b = document.querySelector<HTMLElement>('#drawer button')!;
    (document.activeElement as HTMLElement | null)?.blur();
    b.focus();
    return document.activeElement === b;
  });
  expect(await focusable()).toBe(false);
  await page.locator('#tabUtil').click();
  await expect(page.locator('#drawer.on')).toBeVisible();
  expect(await focusable()).toBe(true);
  await page.locator('#closeDrawer').click();
  await expect(page.locator('#drawer.on')).toHaveCount(0);
  expect(await inDrawer()).toBe(false); // the focus left with it
  expect(await focusable()).toBe(false);
});
