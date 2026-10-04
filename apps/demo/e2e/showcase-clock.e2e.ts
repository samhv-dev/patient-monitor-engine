// Showcase hotfix (rehearsal 2026-10-04): after "Choose another scenario" → Load, the patient restarts on a new engine
// whose sim time starts at 0. The session clock and the scenario's time in state must restart near 00:00 and count
// up, not stay frozen at the previous case's high-water time while the vital signs move.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type App = { __pmeApp: { session: { simNow(): number }; link: { simT: number; ctl: { scenario: { doc: { id: string } | null; timeInState(t: number): number } } } } };
const seconds = (s: string): number => {
  const m = /(\d+):(\d\d)\s*$/.exec(s.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : Number.NaN;
};

test('loading another scenario restarts the session clock and the time in state, which then count up', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, base, '?scenario=showcase-tamponade', { warmMs: 1000 });
  await expect(page).toHaveURL(/#\/teach$/);
  const bar = page.locator('.sessionbar');
  const clockText = () => bar.locator('.clock').innerText();
  await bar.getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: '×4' }).click();
  // the first case runs well past a minute of sim time
  await expect.poll(async () => seconds(await clockText()), { timeout: 40_000, intervals: [500] }).toBeGreaterThan(60);
  const before = await page.evaluate(() => (window as unknown as App).__pmeApp.link.simT);

  await page.click('[role=tab][data-tab=scenario]');
  await page.getByRole('button', { name: 'Choose another scenario' }).click();
  await page.getByRole('article', { name: 'Anaphylaxis under anaesthesia' }).getByRole('button', { name: 'Load' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Load scenario' }).click();
  await expect(bar.locator('.scen')).toContainText('Anaphylaxis under anaesthesia', { timeout: 10_000 });

  // restarted near 00:00 (the controller's clock and the bar), well below where the first case stood
  await expect.poll(async () => seconds(await clockText()), { timeout: 5_000, intervals: [250] }).toBeLessThan(15);
  const after = await page.evaluate(() => {
    const a = (window as unknown as App).__pmeApp;
    return { simT: a.link.simT, host: a.session.simNow(), inState: a.link.ctl.scenario.timeInState(a.link.simT), doc: a.link.ctl.scenario.doc?.id };
  });
  expect(before).toBeGreaterThan(60);
  expect(after.doc).toBe('showcase-anaphylaxis');
  expect(after.simT).toBeLessThan(15);
  expect(Math.abs(after.simT - after.host)).toBeLessThan(2); // the panel's clock is the new engine's clock
  expect(after.inState).toBeLessThan(15);

  // …and it counts up: the bar's clock and the scenario's time in state both advance
  const c1 = seconds(await clockText());
  const s1 = seconds(await bar.locator('.scen').innerText());
  await page.waitForTimeout(3000);
  const c2 = seconds(await clockText());
  const s2 = seconds(await bar.locator('.scen').innerText());
  expect(c2).toBeGreaterThan(c1);
  expect(s2).toBeGreaterThan(s1);
  expect(c2).toBeLessThan(40);
});
