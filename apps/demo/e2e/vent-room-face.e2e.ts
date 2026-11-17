// The ventilator's model is chosen in Room setup: the Ventilator view and the Room's "New window" open that face, the
// choice survives a reload, and it cannot change while a ventilator screen is ventilating the patient. One case per face.
import { expect, test, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

const model = (page: Page) => page.locator('section.room-vent select');
const refused = (page: Page) => page.locator('section.room-vent [role="alert"]');
const ventChip = (page: Page) => page.locator('.room-openers .join-card[data-show="vent"] .st');
const code = (page: Page) => page.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);

async function newWindow(page: Page): Promise<Page> {
  const [win] = await Promise.all([page.context().waitForEvent('page'), page.getByRole('button', { name: 'Ventilator in a new window' }).click()]);
  await win.waitForLoadState();
  await win.waitForFunction(() => '__vent' in window);
  return win;
}

test("the Hamilton-style face, the room's default: the new window and the Ventilator view wear it", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await openApp(page, base, '#/room');
  await expect(model(page)).toHaveValue('hamilton-style');
  const win = await newWindow(page);
  expect(new URL(win.url()).search).toBe(`?link=${await code(page)}&face=hamilton-style`);
  await expect(win.locator('#modesBtn')).toBeVisible();
  await expect(win.locator('main.edp')).toHaveCount(0);
  await win.close();

  await page.getByRole('link', { name: 'Open here' }).click();
  const f = page.frameLocator('iframe.vent');
  await expect(f.locator('#modesBtn')).toBeVisible({ timeout: 20_000 });
  await expect(f.locator('main.edp')).toHaveCount(0);
  expect(await page.locator('iframe.vent').getAttribute('src')).toContain('face=hamilton-style');
});

test('the EDP-TS face chosen in Room setup: kept over a reload, worn by the new window and the view; no change while the window ventilates', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await openApp(page, base, '#/room');
  await model(page).selectOption('edp-ts');
  await expect(refused(page)).toHaveText('');
  await page.reload();
  await page.waitForFunction(() => '__pmeApp' in window);
  await expect(model(page)).toHaveValue('edp-ts');

  const win = await newWindow(page);
  expect(new URL(win.url()).searchParams.get('face')).toBe('edp-ts');
  await expect(win.locator('main.edp')).toBeVisible();
  await expect(ventChip(page)).toHaveText('Window · driving', { timeout: 15_000 });
  await model(page).selectOption('hamilton-style');
  await expect(refused(page)).toHaveText('The ventilator window is ventilating the patient: close it first.');
  await expect(model(page)).toHaveValue('edp-ts');
  await win.close();
  await expect(ventChip(page)).toHaveText('On this computer', { timeout: 15_000 });

  await page.getByRole('link', { name: 'Open here' }).click();
  const f = page.frameLocator('iframe.vent');
  await expect(f.locator('main.edp')).toBeVisible({ timeout: 20_000 });
  expect(await page.locator('iframe.vent').getAttribute('src')).toContain('face=edp-ts');
});
