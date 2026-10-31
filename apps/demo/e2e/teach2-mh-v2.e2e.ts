// Plan F6 and F11: the malignant-hyperthermia card in pme-scenario/2 (showcase-mh-v2) driven on the run sheet's demo
// path (docs/showcase/SHOWCASE-2-RUN-SHEET.md §3) entirely from Instructor v2 (#/teach2): each press is a click on the
// action's row in ACTION (its `give` as one staged batch stamped with the action's id); the clock is moved between
// presses with fast-forward jumps (the room's +2/+5 min, here of the size to the next press); nothing else is sent.
// Asserted: every row is in ACTION when the path presses it and its press is accepted; the strip and the cue box follow
// the phases the physiology enters; no command is refused. PRINTED: the sim time of each press and each phase entry.
// PME_KIT_BASE=<url> runs it against a built kit (F11) instead of the dev server.
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer | undefined;
let base = process.env.PME_KIT_BASE ?? '';
test.beforeAll(async () => {
  if (!base) ({ vite, base } = await startVite());
});
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { link: { simT: number; send(c: unknown): Promise<{ accepted: boolean; reason?: string }>; log: Array<{ text: string; simT: number | null; refused?: string }>; ctl: { scenario: { stateId: string | null; doc: unknown; history: Array<{ t: number; stateId: string }> } } } } };
const app = (page: Page) => page.evaluate(() => {
  const l = (window as unknown as W).__pmeApp.link;
  return { simT: l.simT, stateId: l.ctl.scenario.stateId, history: l.ctl.scenario.history.map((e) => ({ t: e.t, stateId: e.stateId })), refused: l.log.filter((x) => x.refused).map((x) => `${x.text}: ${x.refused}`) };
});
const PATH: Array<[number, string]> = [
  [30, 'Premedicate: midazolam 2 mg, fentanyl 100 µg'],
  [60, 'Preoxygenate: 100 % O₂ by face mask'],
  [240, 'Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg'],
  [300, 'Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %'],
  [360, 'Start surgery: rocuronium 0.6 mg/kg'],
  [492, 'MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate'],
  [512, 'Dantrolene 2.5 mg/kg'],
  [832, 'EtCO₂ normal: ventilation back to 12 × 500'],
  [1153, 'Dantrolene 2.5 mg/kg; hyperventilate again (20 × 600, O₂ 100 %)'],
];
const END_S = 1471; // 24:31, the talk's end

/** Bring the sim clock to `s`: a fast-forward of the gap (whole seconds), then wait until the clock is there. */
async function to(page: Page, s: number): Promise<void> {
  const gap = Math.floor(s - (await app(page)).simT);
  if (gap >= 2) {
    const r = await page.evaluate((v) => (window as unknown as W).__pmeApp.link.send({ type: 'time', action: 'jump', value: v }), gap);
    expect(r.accepted, r.reason).toBe(true);
  }
  await expect.poll(async () => (await app(page)).simT, { timeout: 60_000 }).toBeGreaterThanOrEqual(s - 0.5);
  await page.waitForTimeout(400); // the skip's end reaches the panel; ACTION repaints (≤ 2 Hz)
}

test('the /2 MH card\'s demo path, every press a row of Instructor v2', async ({ page }) => {
  test.setTimeout(420_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, base, '?scenario=showcase-mh-v2#/teach2', { warmMs: 1500 });
  await page.waitForFunction(() => !!(window as unknown as W).__pmeApp.link.ctl.scenario.doc, null, { timeout: 30_000 });
  await expect(page.locator('.ip2-strip .ip2-current .ip2-chip-name, .ip2-chips .ip2-current .ip2-chip-name').first()).toHaveText('Baseline');
  const pressed: Array<[number, string]> = [];
  for (const [t, title] of PATH) {
    await to(page, t);
    const row = page.locator('.ip2-action .ip2-rows:not(.ip2-finished-list) button.ip2-row').filter({ has: page.locator('.ip2-row-title', { hasText: title }) }).first();
    await expect(row, `${title} in ACTION at ${t} s (phase ${(await app(page)).stateId})`).toBeVisible();
    const at = (await app(page)).simT;
    await row.click();
    await expect(row).toHaveAttribute('data-look', 'taken', { timeout: 10_000 });
    pressed.push([at, title]);
  }
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
