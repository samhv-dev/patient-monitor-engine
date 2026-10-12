// Stage 9: one document, one engine session. Switching views never restarts the engine (sim time keeps rising, the
// monitor host element is the same node), the scenario deep link still works, and a Remote in another page of the same
// browser pairs by code and moves the host's patient.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { go, openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type App = { __pmeApp: { session: { code: string; simNow(): number; monitor: unknown }; link: { log: Array<{ kind: string; text: string }>; ctl: { state: { values: Record<string, number>; control: Record<string, string> } | null } }; shell: { monitorHost: HTMLElement } } };

test('every view shares the one engine session', async ({ page }) => {
  test.setTimeout(60_000); // fix-ci-webkit-3: CI's WebKit hit the 30 s default in the route walk (29.3 s, page closed)
  await openApp(page, base, '#/teach', { warmMs: 3000 });
  await page.evaluate(() => ((window as unknown as { __host: unknown }).__host = (window as unknown as App).__pmeApp.shell.monitorHost.firstElementChild));
  const simNow = () => page.evaluate(() => (window as unknown as App).__pmeApp.session.simNow());
  const t0 = await simNow();
  // fix-ci-webkit-3: "the engine never restarts" is read at every view (a restart starts the clock again at 0, so sim time
  // would go back), not as "≥ 2.5 s of sim in ≈ 3 s of wall time", which measured how fast the runner ran the sim (CI
  // WebKit read 1.24, 2.32, 2.497: the 250 ms frame clamp drops time on a starved runner). The 2.5 s is then waited for.
  let prev = t0;
  for (const r of ['#/explore/haemodynamics', '#/settings', '#/dev', '#/monitor', '#/', '#/teach']) {
    await go(page, r, 500);
    const t = await simNow();
    expect(t, `sim time went back on ${r}: the engine restarted`).toBeGreaterThanOrEqual(prev);
    prev = t;
  }
  const same = await page.evaluate(() => (window as unknown as { __host: unknown }).__host === (window as unknown as App).__pmeApp.shell.monitorHost.firstElementChild);
  expect(same, 'the monitor was not remounted').toBe(true);
  await expect.poll(simNow, { timeout: 15_000 }).toBeGreaterThan(t0 + 2.5);
});

test('the scenario deep link loads the case into the instructor view', async ({ page }) => {
  await openApp(page, base, '?scenario=acls-vf-witnessed');
  await expect(page).toHaveURL(/#\/teach$/);
  await expect(page.locator('.sessionbar .scen')).toContainText('Witnessed VF in PACU', { timeout: 10_000 });
});

test('changing the monitor on Start updates the mirrored alarm colours (review F5)', async ({ page }) => {
  await openApp(page, base, '#/');
  const bg = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--alarm-high-bg').trim().toUpperCase());
  const skinBg = (id: string) => page.evaluate((s) => (window as unknown as { __pmeApp: { skinAlarmBar(id: string): { L1: { bg: string } } } }).__pmeApp.skinAlarmBar(s).L1.bg.toUpperCase(), id);
  const [saadat, mindray] = [await skinBg('saadat-like'), await skinBg('mindray-like')];
  expect(saadat).not.toBe(mindray); // the two skins' high-priority reds differ, so the check can fail
  expect(await bg()).toBe(saadat);
  await page.locator('[data-view="start"]').getByRole('combobox', { name: 'Monitor', exact: true }).selectOption('mindray-like');
  await expect.poll(bg).toBe(mindray);
});

test('learner controls: off by default, switched on per scenario, logged as learner actions (ruling 4)', async ({ page }) => {
  await openApp(page, base, '?scenario=acls-vf-witnessed', { warmMs: 1500 });
  await go(page, '#/monitor');
  await expect(page.locator('.learner-strip')).toBeHidden();
  await go(page, '#/teach');
  await page.click('[role=tab][data-tab=scenario]');
  await page.getByRole('button', { name: 'Learner controls on the monitor' }).click();
  await go(page, '#/monitor');
  await expect(page.locator('.learner-strip')).toBeVisible();
  await page.locator('.learner-strip').getByRole('button', { name: 'Charge 200 J' }).click();
  // fix-ci-webkit-3: a learner action is logged when the engine acknowledges it; CI's WebKit took longer than the 5 s the
  // Log tab check allowed (no learner line at all). Wait for the acknowledged entry in the link's log, then check the tab.
  await expect.poll(() => page.evaluate(() => (window as unknown as App).__pmeApp.link.log.filter((e) => e.kind === 'learner').map((e) => e.text).join(' | ')), { timeout: 20_000 }).toContain('Defibrillator charging to 200 J');
  await go(page, '#/teach');
  await page.click('[role=tab][data-tab=log]');
  await expect(page.locator('.log li[data-kind=learner]')).toContainText('Defibrillator charging to 200 J');
});

test('a remote pairs by code and changes the host patient', async ({ page, context }) => {
  await openApp(page, base, '#/', { warmMs: 2000 });
  await go(page, '#/remote');
  const code = await page.evaluate(() => (window as unknown as App).__pmeApp.session.code);
  await expect(page.locator('.bigcode')).toHaveText(code);
  // version 1.0: same browser only; no relay → no QR code, and the page says so (review F2, ruling 6)
  await expect(page.locator('.qr')).toHaveCount(0);
  await expect(page.locator('.pair-note')).toContainText('this browser only');
  const remote = await context.newPage();
  await remote.goto(`${base}/#/remote?code=${code}`);
  await expect(remote.locator('.status-pill')).toHaveText(`Connected to ${code}`, { timeout: 10_000 });
  await remote.click('[role=tab][data-tab=vitals]');
  await remote.locator('[data-var=hr] input').fill('112');
  await remote.locator('[data-var=hr] input').dispatchEvent('change');
  await remote.locator('[data-var=hr] button', { hasText: 'Set' }).click();
  await remote.click('.stagebar button.primary');
  await expect.poll(() => page.evaluate(() => (window as unknown as App).__pmeApp.link.ctl.state?.values.hr ?? 0), { timeout: 20_000 }).toBeGreaterThan(105);
  // the engine's own state says HR is held before the badge is read (R50 review F7: the badge redraws at ≤ 2 Hz on a
  // page that was in the background, so reading it first raced under two workers)
  await expect.poll(() => page.evaluate(() => (window as unknown as App).__pmeApp.link.ctl.state?.control.hr ?? ''), { timeout: 10_000 }).toBe('pinned');
  await page.bringToFront(); // a background tab draws no frames, so its session bar waits until it is visible
  await go(page, '#/teach');
  await expect(page.locator('.sessionbar .mode-badge')).toContainText('1 held', { timeout: 10_000 });
});
