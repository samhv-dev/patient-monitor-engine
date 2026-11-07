// Showcase hotfix (rehearsal 2026-10-04): after "Choose another scenario" → Load, the patient restarts on a new engine
// whose sim time starts at 0. The session clock and the scenario's time in state must restart near 00:00 and count
// up, not stay frozen at the previous case's high-water time while the vital signs move.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, speedV2, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type App = { __pmeApp: { session: { simNow(): number }; link: { simT: number; ctl: { scenario: { doc: { id: string } | null; timeInState(t: number): number } } } } };
const seconds = (s: string): number => {
  const m = /(\d+):(\d\d)\s*$/.exec(s.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : Number.NaN;
};

test('loading another scenario restarts the session clock and the time in state, which then count up', { tag: '@known-flaky' }, async ({ page }) => {
  test.setTimeout(90_000);
  // Instructor v2 (a Load from the library opens it): the header's clock pill and speed
  // box; the time in state is the cue box's in-stage clock ("02:13 in stage")
  await openApp(page, base, '?scenario=showcase-tamponade#/teach2', { warmMs: 1000 });
  await expect(page).toHaveURL(/#\/teach2$/);
  const head = page.locator('.ip2-head');
  const clockText = () => head.locator('.ip2-pill-time').innerText();
  const inStage = async () => seconds((await page.locator('.ip2-cue .ip2-cue-clock').innerText()).split(' ')[0] ?? '');
  await speedV2(page, 4);
  // the first case runs well past a minute of sim time
  await expect.poll(async () => seconds(await clockText()), { timeout: 40_000, intervals: [500] }).toBeGreaterThan(60);
  const before = await page.evaluate(() => (window as unknown as App).__pmeApp.link.simT);

  // v2 has no in-panel library: another scenario is loaded from the Scenarios library, which asks before replacing
  await page.evaluate(() => (location.hash = '#/scenarios/library'));
  await page.locator('[data-view=scenarios]').getByRole('button', { name: 'Load Anaphylaxis under anaesthesia', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Load scenario' }).click();
  await expect(page).toHaveURL(/#\/teach2$/);
  await expect(head.locator('.ip2-title')).toContainText('Anaphylaxis under anaesthesia', { timeout: 10_000 });

  // restarted near 00:00 (the controller's clock and the bar), well below where the first case stood
  await expect.poll(async () => seconds(await clockText()), { timeout: 5_000, intervals: [250] }).toBeLessThan(15);
  const after = await page.evaluate(() => {
    const a = (window as unknown as App).__pmeApp;
    return { simT: a.link.simT, host: a.session.simNow(), inState: a.link.ctl.scenario.timeInState(a.link.simT), doc: a.link.ctl.scenario.doc?.id };
  });
  expect(before).toBeGreaterThan(60);
  expect(after.doc).toBe('showcase-anaphylaxis');
  expect(after.simT).toBeLessThan(15);
  // the panel's clock is the new engine's clock. fix-ci-webkit-3: one reading compared the panel clock (the last event's
  // time) with the host's estimate at ×4, i.e. 4 × the event delivery lag (CI WebKit and Chromium: 2.24–2.87). The same
  // bound is now waited for: a panel clock stuck on the old case (≥ 60) never comes within 2 s of the new engine's.
  await expect
    .poll(() => page.evaluate(() => { const a = (window as unknown as App).__pmeApp; return Math.abs(a.link.simT - a.session.simNow()); }), { timeout: 10_000 })
    .toBeLessThan(2);
  expect(after.inState).toBeLessThan(15);

  // …and it counts up: the bar's clock and the scenario's time in state both advance
  const c1 = seconds(await clockText());
  const s1 = await inStage();
  await page.waitForTimeout(3000);
  const c2 = seconds(await clockText());
  const s2 = await inStage();
  expect(c2).toBeGreaterThan(c1);
  expect(s2).toBeGreaterThan(s1);
  expect(c2).toBeLessThan(40);
});
