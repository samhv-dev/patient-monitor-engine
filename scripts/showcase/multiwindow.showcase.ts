// Proof (c): which second windows stay in step with the instructor's session (one browser context, as when the
// presenter opens a second window or tab of the same browser). Observation only: nothing here is fixed.
//   A = instructor window (#/teach) running "Healthy induction" at ×4.
//   B = a second window at #/monitor, C = at #/explore, D = at #/vent (each a fresh page load of the same address).
//   R = the Remote opened from A's own "Open the remote in a new window" button (#/remote, the designed pairing).
// For each: session code, scenario, sim clock and numbers before and after A presses "Induce now".
import { expect, test, type Page } from '@playwright/test';
import { action, loadShowcase, openTeach, r1, record, save, shot, simNow, stateId, waitSim, watchConsole } from './showcase-support.ts';

type Hook = { __pmeApp: { session?: { code: string; simNow(): number; timeScale: number }; link?: { ctl: { scenario: { stateId: string | null; doc?: { title?: string } | null } } } }; __rec?: { latest: Record<string, number | null> } };

async function look(p: Page): Promise<Record<string, unknown>> {
  return p.evaluate(() => {
    const w = window as unknown as Hook;
    const s = w.__pmeApp.session;
    const sc = w.__pmeApp.link?.ctl.scenario;
    const v = w.__rec?.latest ?? {};
    return {
      route: location.hash, code: s?.code ?? null, simT: s ? Math.round(s.simNow() * 10) / 10 : null, speed: s?.timeScale ?? null,
      scenario: sc?.doc?.title ?? null, state: sc?.stateId ?? null,
      hr: v.hr ?? null, abp: v.abpSys == null ? null : `${Math.round(v.abpSys)}/${Math.round(v.abpDia ?? 0)} (${Math.round(v.abpMean ?? 0)})`, etco2: v.etco2 ?? null, rr: v.rr ?? null,
      bar: (document.querySelector('.sessionbar') as HTMLElement | null)?.innerText.replace(/\s+/g, ' ').slice(0, 160) ?? null,
    };
  });
}

test('second windows: monitor, explore, ventilator and the paired remote', async ({ page, context, browserName }) => {
  const errors: Record<string, string[]> = { A: watchConsole(page) };
  const out: Record<string, unknown> = { browser: browserName, base: process.env.SHOWCASE_BASE, server: process.env.SHOWCASE_SERVER, windows: {} };
  const win = out.windows as Record<string, unknown>;

  await openTeach(page);
  await loadShowcase(page, 'Healthy induction');
  await record(page);
  const t0 = await simNow(page);
  await waitSim(page, 40, (now) => now >= t0 + 20);

  const open = async (name: string, hash: string): Promise<Page> => {
    const p = await context.newPage();
    errors[name] = watchConsole(p);
    await p.goto(`${process.env.SHOWCASE_BASE}/${hash}`);
    await p.waitForFunction(() => '__pmeApp' in window, null, { timeout: 30_000 });
    if (await p.evaluate(() => !!(window as unknown as Hook).__pmeApp.session)) await record(p);
    await p.waitForTimeout(4000);
    return p;
  };
  const B = await open('B', '#/monitor');
  const C = await open('C', '#/explore');
  const D = await open('D', '#/vent');
  await page.bringToFront();

  const before: Record<string, unknown> = { A: await look(page), B: await look(B), C: await look(C), D: await look(D) };
  const tInd = await action(page, 'Induce now');
  await waitSim(page, 120, (now) => now >= tInd + 60);
  const after: Record<string, unknown> = { A: await look(page), B: await look(B), C: await look(C), D: await look(D) };
  for (const [k, p] of [['B', B], ['C', C], ['D', D]] as const) await shot(p, `multiwindow-${k}-${p.url().split('#/')[1]}-${browserName}`);

  // a second window follows A only if it shows A's session: same code, A's scenario and state, A's clock and numbers
  const A0 = before.A as Record<string, unknown>;
  const A1 = after.A as Record<string, unknown>;
  for (const k of ['B', 'C', 'D']) {
    const b0 = before[k] as Record<string, unknown>;
    const b1 = after[k] as Record<string, unknown>;
    win[k] = {
      route: b1.route, before: b0, after: b1,
      sameCode: b1.code === A1.code, sameScenario: b1.scenario === A1.scenario, sameState: b1.state === A1.state,
      clockGapS: typeof b1.simT === 'number' && typeof A1.simT === 'number' ? r1(A1.simT - b1.simT) : null,
      followsInduction: b0.state !== b1.state || b1.state === A1.state,
      inStep: b1.code === A1.code && b1.state === A1.state && b1.scenario === A1.scenario,
    };
  }
  win.A = { before: A0, after: A1 };

  // R: the designed pairing — A shows #/remote, its button opens the Remote window, which joins A's session by code
  await page.evaluate(() => (location.hash = '#/remote'));
  await page.waitForTimeout(1000);
  const [R] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: 'Open the remote in a new window' }).click()]);
  errors.R = watchConsole(R);
  await R.waitForLoadState('load');
  const connected = await R.getByRole('status').filter({ hasText: /connected/i }).first().waitFor({ timeout: 30_000 }).then(() => true, () => false);
  await page.evaluate(() => (location.hash = '#/monitor')); // A becomes the projector monitor
  await R.waitForTimeout(3000);
  const rStatus = await R.getByRole('status').first().innerText().catch(() => '');
  await R.click('[role=tab][data-tab=scenario]').catch(() => undefined);
  await R.waitForTimeout(1000);
  const rRun = await R.locator('section[aria-label="Running scenario"]').innerText().catch(() => 'no running scenario shown');
  const rBar = await R.locator('.sessionbar').innerText().catch(() => '');
  const aBefore = await look(page);
  const pressed = await R.locator('section[aria-label="Running scenario"] button', { hasText: 'Intubate and ventilate' }).click({ timeout: 10_000 }).then(() => true, () => false);
  const aState = await waitSim(page, 60, async () => (await stateId(page)) === 'ventilated');
  await page.waitForTimeout(2000);
  await shot(R, `multiwindow-R-remote-${browserName}`);
  await shot(page, `multiwindow-A-monitor-with-remote-${browserName}`);
  win.R = {
    connected, status: rStatus, scenarioShownOnRemote: rRun.split('\n')[0], sessionBar: rBar.replace(/\s+/g, ' ').slice(0, 160),
    pressedIntubateOnRemote: pressed, instructorStateBefore: aBefore.state, hostReachedVentilated: aState !== null, hostAfter: await look(page),
    inStep: connected && pressed && aState !== null,
  };
  out.errors = errors;
  save(`multiwindow-${browserName}.json`, out);
  for (const k of ['B', 'C', 'D', 'R']) console.log(`[multiwindow ${browserName}] ${k}: inStep=${(win[k] as { inStep: boolean }).inStep}`);
  expect(out).toBeTruthy(); // observation only
});
