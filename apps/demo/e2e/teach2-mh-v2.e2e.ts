// Plan F6 and F11: the malignant-hyperthermia card in pme-scenario/2 (showcase-mh-v2) driven on the run sheet's demo
// path (docs/showcase/SHOWCASE-2-RUN-SHEET.md §3) entirely from Instructor v2 (#/teach2): each press is a click on the
// action's row in ACTION (its `give` as one staged batch stamped with the action's id); the clock is moved between
// presses with fast-forward jumps (the room's +2/+5 min, here of the size to the next press); nothing else is sent.
// Asserted: every row is in ACTION when the path presses it and its press is accepted; the strip and the cue box follow
// the phases the physiology enters; no command is refused. PRINTED: the sim time of each press and each phase entry.
// PME_KIT_BASE=<url> runs it against a built kit (F11) instead of the dev server.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';
import { app, END_S, openMhV2, pressPath, to, type W } from './mh-v2-path.ts';

let vite: ViteDevServer | undefined;
let base = process.env.PME_KIT_BASE ?? '';
test.beforeAll(async () => {
  if (!base) ({ vite, base } = await startVite());
});
test.afterAll(async () => vite?.close());

test('the /2 MH card\'s demo path, every press a row of Instructor v2', async ({ page }) => {
  test.setTimeout(420_000);
  await openMhV2(page, (h) => openApp(page, base, h, { warmMs: 1500 }));
  await expect(page.locator('.ip2-strip .ip2-current .ip2-chip-name, .ip2-chips .ip2-current .ip2-chip-name').first()).toHaveText('Baseline');
  const pressed = await pressPath(page, () => true);
  await to(page, END_S);
  const a = await app(page);
  const mmss = (x: number) => `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(Math.round(x % 60)).padStart(2, '0')}`;
  console.log(['presses (sim):', ...pressed.map(([t, x]) => `  ${mmss(t)} (${t.toFixed(1)} s) ${x}`), 'phases (sim):', ...a.history.map((e) => `  ${mmss(e.t)} (${e.t.toFixed(1)} s) ${e.stateId}`)].join('\n'));
  expect(a.refused).toEqual([]);
  expect(a.history.map((e) => e.stateId).filter((x) => x !== 'baseline')[0]).toBe('latent'); // the view's history may begin after the initial phase
  // the strip and the cue box follow the phase the physiology is in
  const label = await page.evaluate(() => {
    const d = (window as unknown as W).__pmeApp.link.ctl.scenario;
    return ((d.doc as { phases: Array<{ id: string; label: string }> }).phases.find((p) => p.id === d.stateId) as { label: string }).label;
  });
  await expect(page.locator('.ip2-cue-name')).toHaveText(label);
  await expect(page.locator('.ip2-chips .ip2-current .ip2-chip-name')).toHaveText(label);
});
