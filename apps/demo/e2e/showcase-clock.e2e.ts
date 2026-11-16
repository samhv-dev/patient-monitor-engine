// After another scenario is loaded the patient restarts on a new engine whose sim time starts at 0. The session clock
// and the scenario's time in state must restart near 00:00 and count up, not stay at the previous case's time.
import { expect, test, type Route } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, speedV2, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type App = { __pmeApp: { session: { simNow(): number; monitor: { renderPath: Promise<string> } | null }; link: { simT: number; ctl: { scenario: { doc: { id: string } | null; timeInState(t: number): number } } } } };
/** The engine worker's entry module on the dev server. */
const WORKER = /engine\.worker\.ts\?worker_file/;
const seconds = (s: string): number => {
  const m = /(\d+):(\d\d)\s*$/.exec(s.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : Number.NaN;
};

test('loading another scenario restarts the session clock and the time in state, which then count up', async ({ page }) => {
  test.setTimeout(90_000);
  // Instructor v2 (a Load from the library opens it): the header's clock pill and speed
  // box; the time in state is the cue box's in-stage clock ("02:13 in stage")
  await openApp(page, base, '?scenario=showcase-tamponade#/teach2', { warmMs: 1000 });
  await expect(page).toHaveURL(/#\/teach2$/);
  const head = page.locator('.ip2-head');
  const clockText = () => head.locator('.ip2-pill-time').innerText();
  const clockS = async () => seconds(await clockText());
  const inStage = async () => seconds((await page.locator('.ip2-cue .ip2-cue-clock').innerText()).split(' ')[0] ?? '');
  await speedV2(page, 4);
  // the first case runs well past a minute of sim time
  await expect.poll(clockS, { timeout: 40_000, intervals: [500] }).toBeGreaterThan(60);
  const before = await page.evaluate(() => (window as unknown as App).__pmeApp.link.simT);

  // The Load's new monitor loads its engine worker, on the dev server one module per request and seconds under load.
  // Its entry module is held here, so the clocks are read before the new engine's first event on every run.
  const held: Route[] = [];
  await page.context().route(WORKER, (r) => void held.push(r));

  // v2 has no in-panel library: another scenario is loaded from the Scenarios library, which asks before replacing
  await page.evaluate(() => (location.hash = '#/scenarios/library'));
  await page.locator('[data-view=scenarios]').getByRole('button', { name: 'Load Anaphylaxis under anaesthesia', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Load scenario' }).click();
  await expect(page).toHaveURL(/#\/teach2$/);
  await expect(head.locator('.ip2-title')).toContainText('Anaphylaxis under anaesthesia', { timeout: 10_000 });

  // restarted near 00:00 (the controller's clock and the bar), well below where the first case stood
  await expect.poll(clockS, { timeout: 5_000, intervals: [250] }).toBeLessThan(15);
  const after = await page.evaluate(() => {
    const a = (window as unknown as App).__pmeApp;
    return { simT: a.link.simT, inState: a.link.ctl.scenario.timeInState(a.link.simT), doc: a.link.ctl.scenario.doc?.id };
  });
  expect(before).toBeGreaterThan(60);
  expect(after.doc).toBe('showcase-anaphylaxis');
  expect(after.simT).toBeLessThan(15);
  expect(after.inState).toBeLessThan(15);
  expect(held.length).toBeGreaterThan(0);

  // The clocks count from the new engine's events: the count-up is read once its monitor runs (the handle's renderPath
  // settles when the worker is ready). Before that the host's estimate can sit within 2 s of the panel's 0.
  for (const r of held) await r.continue();
  await page.context().unroute(WORKER);
  await page.evaluate(async () => void (await (window as unknown as App).__pmeApp.session.monitor?.renderPath));
  // the panel's clock is the new engine's clock: one stuck on the old case (≥ 60) never comes within 2 s of it
  await expect
    .poll(() => page.evaluate(() => { const a = (window as unknown as App).__pmeApp; return Math.abs(a.link.simT - a.session.simNow()); }), { timeout: 10_000 })
    .toBeLessThan(2);

  // …and it counts up: the bar's clock and the scenario's time in state both advance
  const c1 = await clockS();
  const s1 = await inStage();
  await expect.poll(clockS).toBeGreaterThan(c1);
  await expect.poll(inStage).toBeGreaterThan(s1);
  expect(await clockS()).toBeLessThan(40);
});
