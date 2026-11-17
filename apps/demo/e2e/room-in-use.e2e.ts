// Room setup does not remove a device in use. The defibrillator's model cannot change while the device is charged:
// the card says why and what to do, the choice goes back, the engine's device stays charged and the site profile keeps
// its model; disarmed, the change is taken. The depth-of-anaesthesia device cannot be switched off while a Depth of
// anaesthesia window on this computer reads it; once that window is closed, it can.
// PME_E2E_PORT keeps Vite inside a machine's port range.
import { expect, test, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type HostW = {
  __pmeApp: {
    session: { host: { defibModelRefusal(): string | null; depthRefusal(name: (key: string) => string | null): string | null } };
    link: { send(c: unknown): Promise<{ accepted: boolean; reason?: string }> };
  };
};
const send = (page: Page, c: unknown) => page.evaluate((cmd) => (window as unknown as HostW).__pmeApp.link.send(cmd), c);
const site = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pme.site') ?? '{}') as { defibModel?: string | null; eegModel?: string | null });

test("the defibrillator's model is refused while it is charged, and taken once it is disarmed", async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, base, '#/room', { site: { defibModel: 'generic' } });
  const card = page.locator('.room-defib');
  const sel = card.locator('select');
  await expect(sel).toHaveValue('generic');
  expect((await send(page, { type: 'applyEvent', event: { kind: 'defib', action: 'charge' } })).accepted).toBe(true);
  await page.waitForFunction(() => (window as unknown as HostW).__pmeApp.session.host.defibModelRefusal() === 'The defibrillator is charged: disarm it first.');
  await sel.selectOption('');
  await expect(card.getByRole('alert')).toHaveText('The defibrillator is charged: disarm it first.');
  await expect(sel).toHaveValue('generic');
  expect((await site(page)).defibModel).toBe('generic');
  expect(await page.evaluate(() => (window as unknown as HostW).__pmeApp.session.host.defibModelRefusal())).toBe('The defibrillator is charged: disarm it first.');

  expect((await send(page, { type: 'applyEvent', event: { kind: 'defib', action: 'disarm' } })).accepted).toBe(true);
  await page.waitForFunction(() => (window as unknown as HostW).__pmeApp.session.host.defibModelRefusal() === null);
  await sel.selectOption('');
  await expect(card.getByRole('alert')).toHaveText('');
  await expect(sel).toHaveValue('');
  expect((await site(page)).defibModel).toBeNull();
});

test('the depth device cannot be switched off while a depth window on this computer reads it; closed, it can', async ({ page, context }) => {
  test.setTimeout(90_000);
  await openApp(page, base, '#/room', { site: { eegModel: 'generic' } });
  const card = page.locator('.room-depth');
  const sel = card.locator('select');
  await expect(sel).toHaveValue('generic');
  const opened = context.waitForEvent('page');
  await page.locator('.room-openers [data-show="depth"] button').click();
  const win = await opened;
  await expect(win.locator('.depth-window')).toHaveAttribute('data-model', 'generic', { timeout: 20_000 });
  await page.waitForFunction(() => (window as unknown as HostW).__pmeApp.session.host.depthRefusal(() => null) !== null);
  await sel.selectOption('');
  await expect(card.getByRole('alert')).toHaveText('The Depth of anaesthesia window on this computer is reading the EEG: close it first.');
  await expect(sel).toHaveValue('generic');
  expect((await site(page)).eegModel).toBe('generic');
  await expect(win.locator('.depth-window')).toHaveAttribute('data-model', 'generic');

  await win.close({ runBeforeUnload: true });
  await page.waitForFunction(() => (window as unknown as HostW).__pmeApp.session.host.depthRefusal(() => null) === null);
  await sel.selectOption('');
  await expect(card.getByRole('alert')).toHaveText('');
  await expect(sel).toHaveValue('');
  expect((await site(page)).eegModel).toBeNull();
});
