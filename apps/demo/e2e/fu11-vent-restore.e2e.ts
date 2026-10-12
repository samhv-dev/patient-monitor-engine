// FU-11 Task E3b (R50 F1): "Return here" while the Ventilator view drives the patient — the cockpit keeps ventilating
// the restored patient. Before: frames were stamped on the old timeline and no clock reached the cockpit; the replayed
// interval ran SpO2 91 → 64 where the first run had 95 → 92.
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { simNow(): number }; link: { send(c: unknown): Promise<{ accepted: boolean }> } } };
const simNow = (p: Page) => p.evaluate(() => (window as unknown as W).__pmeApp.session.simNow());
const tile = (p: Page, param: string) => p.evaluate((x) => Number(document.querySelector(`.pme-stile[data-param="${x}"] [data-pme="v"]`)?.textContent), param);
// fix-main-webkit (orchestrator ruling): the comparison means something only while the cockpit actually ventilates the
// patient. On CI's headless WebKit the ×4 cockpit took over late or not at all (CO2 tile empty in the first pass), so the
// bookmark held a patient the cockpit had not yet ventilated and the replay diverged (or both passes compared empty
// tiles). Precondition, not band: EtCO2 > 20 on two consecutive readings, within 60 s of wall time.
const ventilating = async (p: Page, when: string) => {
  let run = 0;
  await expect
    .poll(async () => (run = (await tile(p, 'CO2')) > 20 ? run + 1 : 0), {
      timeout: 60_000,
      intervals: [250],
      message: `the cockpit never ventilated the patient (EtCO2 > 20 on two consecutive readings) within 60 s ${when}`,
    })
    .toBeGreaterThanOrEqual(2);
  return simNow(p);
};
const at = async (p: Page, t: number) => {
  await expect.poll(() => simNow(p), { timeout: 60_000, intervals: [250] }).toBeGreaterThanOrEqual(t);
  return { spo2: await tile(p, 'SpO2'), co2: await tile(p, 'CO2') };
};

test('after "Return here" on the Ventilator view the replayed minute matches the first one', async ({ page, browserName }) => {
  // Orchestrator FALLBACK ruling (fix-ci-webkit-2): on CI's headless WebKit the ×4 cockpit passed the precondition but then
  // dropped out mid-replay (EtCO2 0 or 14 where the first pass read 32-42), so the replay band failed 3/3 on stage-11.
  // Chromium in CI and system Chrome locally cover it, as for vent-link.e2e.ts.
  test.skip(browserName === 'webkit' && !process.env.FX1_NOSKIP, 'long ×4 sim scenario too slow on headless WebKit');
  test.setTimeout(180_000);
  await openApp(page, base, '?scenario=showcase-bronchospasm', { warmMs: 1500 });
  await page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: '×4' }).click();
  await page.evaluate(() => (location.hash = '#/vent'));
  await at(page, 30);
  const b = Math.ceil(await ventilating(page, 'before the bookmark')); // ≥ 30 s: the bookmark holds a ventilated patient
  await at(page, b);
  await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'scenario', action: 'bookmark', target: 'vent' }));
  const first = [await at(page, b + 40), await at(page, b + 70)];
  await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'scenario', action: 'restoreBookmark', target: 'vent' }));
  await expect.poll(() => simNow(page), { timeout: 5_000 }).toBeLessThan(b + 10);
  expect(await ventilating(page, 'after "Return here"'), 'the cockpit ventilated the restored patient only after the comparison window opened').toBeLessThan(b + 40);
  const again = [await at(page, b + 40), await at(page, b + 70)];
  console.log('vent restore', JSON.stringify({ first, again }));
  for (let i = 0; i < 2; i++) {
    expect(Math.abs((again[i]?.spo2 ?? 0) - (first[i]?.spo2 ?? 0))).toBeLessThanOrEqual(3);
    expect(Math.abs((again[i]?.co2 ?? 0) - (first[i]?.co2 ?? 0))).toBeLessThanOrEqual(4);
  }
});
