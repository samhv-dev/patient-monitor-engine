// "Return here" while the Ventilator view drives the patient: the ventilator goes back with the patient (its settings,
// its breath, its state), so the replayed minute is the first one. The values compared are the engine's own measurement
// events at the same simulated seconds, not tiles read on a poll: nothing of the page's sampling stands between them,
// and the two passes must be equal.
import { expect, test, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, speedV2, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type Reading = { t: number; spo2: number | null; co2: number | null };
type Ev = { type: string; t: number; ids?: string[]; values?: Record<string, { value: number | null } | undefined> };
type W = {
  __pmeApp: {
    session: { simNow(): number; onMount(fn: (m: { on(fn: (e: Ev) => void): () => void }) => void): () => void };
    link: { send(c: unknown): Promise<{ accepted: boolean }> };
  };
  __readings: Reading[];
};
const simNow = (p: Page) => p.evaluate(() => (window as unknown as W).__pmeApp.session.simNow());
const tile = (p: Page, param: string) => p.evaluate((x) => Number(document.querySelector(`.pme-stile[data-param="${x}"] [data-pme="v"]`)?.textContent), param);
// The comparison means something only while the cockpit ventilates the patient: EtCO2 > 20 on two consecutive readings.
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
const reach = (p: Page, t: number) => expect.poll(() => simNow(p), { timeout: 60_000, intervals: [250] }).toBeGreaterThanOrEqual(t);
/** The engine's SpO2 and EtCO2 measurement events of this timeline (since the last restore), by sim second, in (from, to]. */
const readings = async (p: Page, from: number, to: number) => {
  const all = await p.evaluate(() => (window as unknown as W).__readings);
  return new Map(all.filter((r) => r.t > from && r.t <= to).map((r) => [r.t.toFixed(3), r]));
};

test('after "Return here" on the Ventilator view the replayed minute is the first one', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit' && !!process.env.CI, 'CI Linux WebKit page crash after "Return here" in this ×4 Ventilator-view flow (finding F-FX1-1)');
  test.setTimeout(180_000);
  await openApp(page, base, '?scenario=showcase-bronchospasm#/teach2', { warmMs: 1500 });
  await page.evaluate(() => {
    const w = window as unknown as W;
    w.__readings = [];
    w.__pmeApp.session.onMount((m) => m.on((e) => {
      if (e.type === 'toneCancel' && e.ids === undefined) w.__readings = []; // the engine's restore marker: a new timeline
      if (e.type === 'measurement' && e.values && ('spo2' in e.values || 'etco2' in e.values)) w.__readings.push({ t: e.t, spo2: e.values.spo2?.value ?? null, co2: e.values.etco2?.value ?? null });
    }));
  });
  await speedV2(page, 4);
  await page.evaluate(() => (location.hash = '#/vent'));
  await reach(page, 30);
  const b = Math.ceil(await ventilating(page, 'before the bookmark')); // ≥ 30 s: the bookmark holds a ventilated patient
  await reach(page, b);
  await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'scenario', action: 'bookmark', target: 'vent' }));
  await reach(page, b + 71);
  const first = await readings(page, b, b + 70);
  await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'scenario', action: 'restoreBookmark', target: 'vent' }));
  await expect.poll(() => simNow(page), { timeout: 5_000 }).toBeLessThan(b + 10);
  await reach(page, b + 71);
  const again = await readings(page, b, b + 70);
  console.log('vent restore', JSON.stringify({ b, n: first.size, differing: [...first].filter(([t, r]) => JSON.stringify(again.get(t)) !== JSON.stringify(r)).length }));
  expect(first.size).toBeGreaterThan(60);
  expect([...again.keys()]).toEqual([...first.keys()]);
  expect([...again.values()]).toEqual([...first.values()]);
});
