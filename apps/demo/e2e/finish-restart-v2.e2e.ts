// fix-v2-save-and-restart: on a pme-scenario/2 card, Instructor v2's "Finish the case" → "Save and restart the case"
// saved the debrief and then did nothing: the app's hook (main.ts finish.restart, now teach2/finish.ts restartSameCard)
// found the card through the /1 runner only. Now the same /2 card loads again from 0:00 at its first phase, with a new
// phase runner (no takings), as a /1 card does (reload-keeps-case.e2e.ts, "Finish the case"), and the archive has the run.
import { expect, test } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';
import { app, openMhV2, pressPath } from './mh-v2-path.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type F = { __pmeApp: { archive: { list(): Array<{ resident: string; title: string }> }; session: { simNow(): number; driver: { phaseRunner: { takings: Record<string, number>; doc: { id: string } } | null } } } };
const fin = <T>(p: import('@playwright/test').Page, fn: (w: F) => T) => p.evaluate(`(${fn.toString()})(window)`) as Promise<Awaited<T>>;

test('Save and restart on a /2 card: the run is archived and the same card starts again at Baseline, its takings none', async ({ page, browserName }) => {
  test.setTimeout(150_000);
  await openMhV2(page, (hash) => openApp(page, base, hash, { warmMs: 1500 }));
  // the run sheet's first two presses (Preoxygenate at 00:30, Premedicate at 01:00), as ACTION rows
  const pressed = await pressPath(page, (i) => i < 2);
  expect(pressed).toHaveLength(2);
  await expect.poll(() => fin(page, (w) => w.__pmeApp.session.driver.phaseRunner?.takings)).toEqual({ preoxygenate: 1, premedicate: 1 });
  const ranTo = await fin(page, (w) => w.__pmeApp.session.simNow());

  await page.locator('.ip2-dock .ip2-finish-btn').click();
  await expect(page.locator('.ip2-finish')).toBeVisible();
  await page.locator('.ip2-finish-resident').fill('Dr First');
  await page.locator('.ip2-finish-restart').click();
  await expect(page.locator('.ip2-finish')).toBeHidden();
  expect(await fin(page, (w) => w.__pmeApp.archive.list().map((x) => `${x.resident} · ${x.title}`))).toEqual(['Dr First · Malignant hyperthermia (phases)']);
  // the same card again from its start: Baseline, a new phase runner with no takings, the clock from 0:00
  await expect.poll(() => fin(page, (w) => w.__pmeApp.session.driver.phaseRunner?.takings), { message: 'a new phase runner' }).toEqual({});
  expect(await fin(page, (w) => w.__pmeApp.session.driver.phaseRunner?.doc.id)).toBe('showcase-mh-v2');
  await expect.poll(async () => (await app(page)).stateId).toBe('baseline');
  await expect(page.locator('.ip2-chips .ip2-current .ip2-chip-name').first()).toHaveText('Baseline');
  await expect.poll(async () => (await app(page)).history.length, { message: 'the new run\'s history: its first phase only' }).toBe(1);
  const restartedAt = await fin(page, (w) => w.__pmeApp.session.simNow());
  expect(ranTo, 'the first run ran a while').toBeGreaterThan(55);
  expect(restartedAt, 'the card starts again from 0:00').toBeLessThan(15);
  // the presses' rows are pressable again: none reads taken
  await expect(page.locator('.ip2-action button.ip2-row[data-look="taken"]')).toHaveCount(0);
  console.log('finish-restart-v2', JSON.stringify({ browserName, ranTo: Math.round(ranTo), restartedAt: Math.round(restartedAt * 10) / 10, pressed: pressed.map(([t]) => Math.round(t)) }));
});
