// Task 26 (showcase additions): Ali's headline case through the visible panel — start a severe cardiac tamponade from
// the Patient tab's acute events, give propofol 2 mg/kg from Drugs & fluids, and the patient loses cardiac output
// (pulseless: stroke volume under 6 mL for 5 s — the fu4 page's rule is < 5 mL, but in the app's default adult the
// stroke volume settles on its 5.2 mL floor, i.e. no output, measured) within 5 simulated minutes at ×4 (the host's top speed).
// Chromium only (a long evidence run, CI amendment rules).
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite, tab } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type Hooked = { __pmeApp: { session: { simNow(): number; onEvent(fn: (e: { type: string; sv?: number }) => void): () => void } } };

test('tamponade from the panel, then propofol 2 mg/kg: pulseless within 5 simulated minutes', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'evidence run: Chromium only');
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page, base, '#/teach', { warmMs: 3000 });
  // record the circulation's stroke volume (truth, 1 Hz) and when it stays under 6 mL for 5 s
  await page.evaluate(() => {
    const w = window as unknown as Hooked & { __arrest: { t: number | null; low: number } };
    w.__arrest = { t: null, low: 0 };
    w.__pmeApp.session.onEvent((e) => {
      if (e.type !== 'circ' || typeof e.sv !== 'number') return;
      w.__arrest.low = e.sv < 6 ? w.__arrest.low + 1 : 0;
      if (w.__arrest.low >= 5 && w.__arrest.t === null) w.__arrest.t = w.__pmeApp.session.simNow();
    });
  });
  await page.click('.sessionbar >> text=×4');
  await expect(page.locator('.toasts')).toContainText('Speed ×4');
  await tab(page, 'patient');
  const row = page.locator('[data-event=tamponade]');
  await row.locator('button', { hasText: 'Start' }).click(); // severity "Severe" is the default
  await page.locator('.stagebar button.primary').click(); // Commit
  await expect(page.locator('.sessionbar')).toContainText('Cardiac tamponade (severe)', { timeout: 10_000 });
  const t0 = await page.evaluate(() => (window as unknown as Hooked).__pmeApp.session.simNow());
  await tab(page, 'drugs');
  await page.fill('input[type=search]', 'propofol');
  await page.keyboard.press('Enter');
  await page.locator('.card.dose .chips button', { hasText: '2 mg/kg' }).click();
  await page.click('.card.dose >> text=Give now');
  await expect(page.locator('.toasts')).toContainText('Propofol');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __arrest: { t: number | null } }).__arrest.t), { timeout: 100_000, intervals: [1000] }).not.toBeNull();
  const tArrest = await page.evaluate(() => (window as unknown as { __arrest: { t: number } }).__arrest.t);
  console.log(`[events] pulseless ${(tArrest - t0).toFixed(0)} s (sim) after tamponade + propofol`);
  expect(tArrest - t0).toBeLessThan(300);
});
