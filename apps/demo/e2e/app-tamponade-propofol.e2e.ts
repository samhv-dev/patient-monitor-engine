// Task 26 (showcase additions): the owner's headline case through the visible panel (Instructor v2's sheets) — start a severe cardiac tamponade
// from the Patient sheet's acute events, give propofol 2 mg/kg from the Drug sheet, and the patient loses cardiac output
// (pulseless: stroke volume under 6 mL for 5 s — the fu4 page's rule is < 5 mL, but in the app's default adult the
// stroke volume settles on its 5.2 mL floor, i.e. no output, measured) within 5 simulated minutes at ×4 (the host's top speed).
// Chromium only (a long evidence run, CI amendment rules).
import { expect, test } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { deliver, openApp, sheet, speedV2, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type Hooked = { __pmeApp: { session: { simNow(): number; onEvent(fn: (e: { type: string; sv?: number }) => void): () => void } } };

test('tamponade from the panel, then propofol 2 mg/kg: pulseless within 5 simulated minutes', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'evidence run: Chromium only');
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page, base, '#/teach2', { warmMs: 3000 });
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
  await speedV2(page, 4);
  await expect(page.locator('.toasts')).toContainText('Speed ×4');
  const patient = await sheet(page, 'patient');
  const row = patient.locator('[data-event=tamponade]');
  await row.locator('button', { hasText: 'Start' }).click(); // severity "Severe" is the default
  await deliver(page); // the staged footer's Commit
  await expect(page.locator('.ip2-head')).toContainText('Cardiac tamponade (severe)', { timeout: 10_000 });
  const t0 = await page.evaluate(() => (window as unknown as Hooked).__pmeApp.session.simNow());
  const drug = await sheet(page, 'drug');
  await drug.locator('input.ip2-drug-search').fill('propofol');
  await page.keyboard.press('Enter');
  await drug.locator('.ip2-presets button.ip2-preset', { hasText: '2 mg/kg' }).click();
  await drug.locator('button.ip2-give', { hasText: /^Give propofol 2 mg\/kg now$/ }).click();
  await expect(page.locator('.toasts')).toContainText('Propofol');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __arrest: { t: number | null } }).__arrest.t), { timeout: 100_000, intervals: [1000] }).not.toBeNull();
  const tArrest = await page.evaluate(() => (window as unknown as { __arrest: { t: number } }).__arrest.t);
  console.log(`[events] pulseless ${(tArrest - t0).toFixed(0)} s (sim) after tamponade + propofol`);
  expect(tArrest - t0).toBeLessThan(300);
});
