// The witnessed-VF case: the QRS tone sounds in sinus and stops at the monitor's VF call (the VFIB alarm). Read from the
// tones the page's scheduler is asked to play (the monitor's audio log), against the engine's own events: the call's
// time and a later 1 Hz measurement, never a wall-clock wait. The card's coarse VF is held with `autoAsystole: false`
// and the card fixes the seed, so the VF never becomes asystole by the engine's hazard.
import { expect, test, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

const AFTER_CALL_S = 10;

type Ev = { type: string; t: number; id?: string };
type Entry = { kind: string; refT?: number };
type W = {
  __vf: { call: number | null; lastT: number };
  __pmeApp: { session: { monitor: { on(fn: (e: Ev) => void): () => void; audioLog: readonly Entry[] } }; link: { send(c: unknown): Promise<{ accepted: boolean }> } };
};
const read = <T>(page: Page, fn: (w: W) => T) => page.evaluate(`(${fn.toString()})(window)`) as Promise<T>;

test("witnessed VF: the QRS tone sounds in sinus and stops at the monitor's VF call", async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, base, '?scenario=acls-vf-witnessed', { warmMs: 1500 });
  await expect(page.locator('.ip2-head .ip2-title')).toContainText('Witnessed VF in PACU', { timeout: 10_000 });
  await page.evaluate(() => {
    const w = window as unknown as W;
    w.__vf = { call: null, lastT: 0 };
    w.__pmeApp.session.monitor.on((e) => {
      if (e.type === 'alarm' && e.id === 'VFIB' && w.__vf.call === null) w.__vf.call = e.t;
      if (e.type === 'measurement') w.__vf.lastT = e.t;
    });
  });
  await page.locator('.ip2-head .ip2-sound').click();
  await expect(page.locator('.ip2-head .ip2-sound')).toHaveText('Sound on');
  const qrs = () => read(page, (w) => w.__pmeApp.session.monitor.audioLog.filter((e) => e.kind === 'qrs').map((e) => e.refT ?? 0));
  await expect.poll(async () => (await qrs()).length, { timeout: 20_000 }).toBeGreaterThanOrEqual(3);

  await page.locator('button.ip2-row', { hasText: 'Start VF now' }).click();
  await expect(page.locator('button.ip2-row', { hasText: 'ROSC now' })).toBeVisible({ timeout: 10_000 });
  const held = await read(page, (w) => w.__pmeApp.link.send({ type: 'setRhythm', rhythm: 'vfCoarse', opts: { autoAsystole: false } }));
  expect(held.accepted).toBe(true);
  await expect.poll(() => read(page, (w) => w.__vf.call), { timeout: 20_000 }).not.toBeNull();
  const call = (await read(page, (w) => w.__vf.call)) as number;
  await expect.poll(() => read(page, (w) => w.__vf.lastT), { timeout: 30_000 }).toBeGreaterThanOrEqual(call + AFTER_CALL_S);
  const after = (await qrs()).filter((r) => r >= call);
  expect(after, `QRS tones after the VF call at ${call} s`).toEqual([]);
});
