// FX-4: on the default Saadat-like monitor (no alarm pause: research/06 §3, the manual's Audio Pause key has "currently
// no function") the Devices & alarms tab shows "Pause alarms" disabled with the reason in clinical words; the keyboard
// shortcut's refusal is a toast with that reason (it was silent); on a monitor with a pause (Philips-like) the control
// is enabled and pauses the alarms for the skin's time. Both browsers.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite, tab } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { setSkin(s: string, t: string): Promise<void> }; link: { alarms: { skin: string } | null } } };
const REASON = 'This monitor has no alarm pause. Silence mutes for 120 s.';

test('alarm pause follows the skin: disabled with a reason on Saadat-like, refusals shown, enabled on Philips-like', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, base, '#/teach', { warmMs: 1000 });
  await tab(page, 'devices');
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__pmeApp.link.alarms?.skin ?? null), { timeout: 20_000 }).toBe('saadat-like');

  const pause = page.getByRole('button', { name: 'Pause alarms' });
  await expect(pause).toBeVisible(); // shown, never hidden silently
  await expect(pause).toBeDisabled();
  await expect(pause).toHaveAccessibleDescription(REASON);
  await expect(page.locator('.panel').getByText(REASON)).toBeVisible();

  // the keyboard shortcut still reaches the engine; its refusal is said, in clinical words, with no skin id
  await page.locator('.panel h3', { hasText: 'Alarms' }).click();
  await page.keyboard.press('Shift+P');
  await expect(page.locator('.toasts')).toContainText(`Not done: ${REASON}`);
  await expect(page.locator('.toasts')).not.toContainText('saadat-like');

  // a monitor that has a pause: the control is offered and works
  await page.evaluate(() => (window as unknown as W).__pmeApp.session.setSkin('philips-like', ''));
  await expect(pause).toBeEnabled({ timeout: 20_000 });
  await expect(page.locator('.panel').getByText(REASON)).toBeHidden();
  await pause.click();
  await expect(page.locator('.toasts')).toContainText('Alarms paused');
  await expect(page.locator('.panel p[role=status]')).toContainText(/Alarms paused, 0[12]:\d\d left/, { timeout: 20_000 });
});
