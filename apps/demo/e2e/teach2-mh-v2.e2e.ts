// Plan F6 and F11: the malignant-hyperthermia card in pme-scenario/2 (showcase-mh-v2) driven on the run sheet's demo
// path (docs/showcase/SHOWCASE-2-RUN-SHEET.md §3) entirely from Instructor v2 (#/teach2): each press is a click on the
// action's row in ACTION (its `give` as one staged batch stamped with the action's id); the clock is moved between
// presses with fast-forward jumps (the room's +2/+5 min, here of the size to the next press); nothing else is sent.
// Asserted: every row is in ACTION when the path presses it and its press is accepted; the strip and the cue box follow
// the phases the physiology enters; no command is refused. PRINTED: the sim time of each press and each phase entry.
// The run of show's four pauses (08:05 after the first fast-forward, 13:45 after span 1, 19:05 after span 2, 24:24 the
// end) and 08:45, the pause the owner used on /2 for Early signs while it was held 60 s (08:43 in the harness): the
// strip's current phase there, printed, and at four of them pinned to the owner's rules of 1 November (with the
// Treated rule and the hold from reachability of #242, and Early signs held 20 s, the owner's ruling the same afternoon:
// the /1 card's own settle), as measured: Early signs at 08:45, Recovering, Recrudescence, Recovering (the /1 card
// reads MH treatment under way, Recovering, Ventilation back, Recovering). 08:05 is printed, not pinned: Early signs is
// entered at 08:03.2 in the harness, the /1 card's own second, but in the app its rule (the EtCO₂ crossing 45, the same
// crossing as /1's) rose 1–4 s after the harness's 07:43.2, so Early signs was entered between 08:04.1 and
// 08:07.4 in the eight runs measured on 1 November (the presses land a fraction of a second after their run-sheet times,
// and the patient's course moves with them), and the 08:05 pause (485.4–486.0 s) read Early signs in three of five. It
// reads Latent or Early signs. 08:45 is pinned: Early signs is entered by 08:08 and Treated comes at 09:58.
// PME_KIT_BASE=<url> runs it against a built kit (F11) instead of the dev server.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';
import { app, END_S, openMhV2, PATH, pressPath, to, type W } from './mh-v2-path.ts';

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
  const PAUSES = [485, 525, 825, 1145, 1464];
  const pressed: Array<[number, string]> = [];
  const atPauses: Array<[number, string, string | null]> = [];
  for (const p of PAUSES) {
    pressed.push(...(await pressPath(page, (i) => (PATH[i] as [number, string])[0] < p, pressed.length)));
    await to(page, p);
    const a = await app(page);
    atPauses.push([a.simT, (await page.locator('.ip2-chips .ip2-current .ip2-chip-name').first().textContent()) ?? '', a.stateId]);
  }
  pressed.push(...(await pressPath(page, () => true, pressed.length)));
  await to(page, END_S);
  const a = await app(page);
  const mmss = (x: number) => `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(Math.round(x % 60)).padStart(2, '0')}`;
  console.log(['presses (sim):', ...pressed.map(([t, x]) => `  ${mmss(t)} (${t.toFixed(1)} s) ${x}`), 'phases (sim):', ...a.history.map((e) => `  ${mmss(e.t)} (${e.t.toFixed(1)} s) ${e.stateId}`), 'the strip at the pauses:', ...atPauses.map(([t, chip, id]) => `  ${mmss(t)} (${t.toFixed(1)} s) ${chip} (${id})`)].join('\n'));
  expect(pressed.map(([, x]) => x)).toEqual(PATH.map(([, x]) => x));
  expect(atPauses.slice(1).map(([, chip]) => chip)).toEqual(['Early signs', 'Recovering', 'Recrudescence', 'Recovering']);
  expect(['Latent', 'Early signs']).toContain(atPauses[0]?.[1]); // 08:05, within seconds of Early signs' entry in the app (header)
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
