// Plan vent-skin-edp-ts.md V1, test (7): the EDP-TS face in a browser, linked to the patient monitor. vent-link.html
// opens vent-hamilton.html?link=…&face=edp-ts in its frame; the resident chooses PCV with the knob (Mode, turn, press,
// press to start), changes PEEP by select, turn and press, and the monitor's engine sees the airway pressure follow:
// the mean airway pressure and the PEEP of the ventilator frames it drives the patient with (its resp driver's state,
// read from its snapshot).
// Run: pnpm exec playwright test apps/demo/e2e/vent-edp-ts.e2e.ts
import { resolve } from 'node:path';
import { expect, test, type FrameLocator, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
test.afterAll(async () => vite?.close());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
/** The monitor engine's view of the airway: the mean Paw and PEEP of the ventilator frames it is driven by. */
const engineAirway = (p: Page) => p.evaluate(async () => {
  const s = JSON.stringify(await (window as Any).__link.pm.snapshot());
  const m = /"meanPaw":(-?[\d.e+-]+),"peep":(-?[\d.e+-]+)/.exec(s);
  return m ? { meanPaw: Number(m[1]), peep: Number(m[2]) } : null;
});
const knobTurn = async (f: FrameLocator, n: number) => {
  for (let i = 0; i < Math.abs(n); i++) await f.locator('.edp-knob').dispatchEvent('wheel', { deltaY: n > 0 ? -100 : 100 });
};
const knobPress = (f: FrameLocator) => f.locator('.edp-knob').click();

test('EDP-TS face: PCV chosen with the knob, PEEP changed, the monitor\'s airway pressure follows', async ({ page }) => {
  test.setTimeout(120_000);
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.setViewportSize({ width: 1400, height: 820 });
  await page.goto(`${base}/dev/vent-link.html?face=edp-ts`);
  const f = page.frameLocator('#vent');
  await expect(f.locator('main.edp')).toBeVisible({ timeout: 20_000 });
  expect(await page.locator('#vent').getAttribute('src')).toContain('face=edp-ts');
  await expect.poll(() => engineAirway(page), { timeout: 30_000 }).not.toBeNull();

  // Mode → the mode window (titled as photographed since VF); turn once to PCV; press; the confirmation; press to start (research/57 O-09, O-14)
  await f.locator('[data-ctl="side:mode"]').click();
  await expect(f.locator('.edp-win .t').first()).toHaveText('Operative Modes'); // as photographed (VF, R14; research/57 P-01)
  await knobTurn(f, 1);
  await knobPress(f);
  await expect(f.locator('.edp-win.conf')).toContainText('Mode PCV');
  await knobPress(f);
  await expect(f.locator('.edp-tl .mn')).toHaveText('PCV');
  const vent = () => page.evaluate(() => { const c = (document.getElementById('vent') as Any).contentWindow.__vent.vs.cfg; return { mode: c.mode as string, peep: c.peep as number, modeLabel: c.modeLabel as string }; });
  expect(await vent()).toMatchObject({ mode: 'PC', modeLabel: 'PCV' });

  // the airway before: the monitor's engine follows the set PEEP. Its mean airway pressure is the mean over the last
  // breath cycle (engine-core resp/driver.ts), so it is read once two PCV breaths have been delivered since the mode
  // started: read at once, the window still holds the last VCV breath, whose mean pressure is not PCV's (since piece V2
  // the EDP-TS VCV starts with the descending ramp, research/57 T-26, and its mean is the higher one)
  const breaths = () => page.evaluate(() => (document.getElementById('vent') as Any).contentWindow.__vent.vs.p.breathCount as number);
  const n0 = await breaths();
  await expect.poll(breaths, { timeout: 15_000 }).toBeGreaterThanOrEqual(n0 + 2);
  await expect.poll(async () => (await engineAirway(page))?.peep, { timeout: 15_000 }).toBe(await vent().then((c) => c.peep));
  const before = (await engineAirway(page))!;
  const peep0 = (await vent()).peep;

  // PEEP: select, turn 5, not applied until the press (research/57 O-01)
  await f.locator('[data-ctl="key:peep"]').click();
  await knobTurn(f, 5);
  await expect(f.locator('[data-ctl="key:peep"] .v')).toHaveText(String(peep0 + 5));
  expect((await vent()).peep).toBe(peep0);
  await knobPress(f);
  expect((await vent()).peep).toBe(peep0 + 5);

  await expect.poll(async () => (await engineAirway(page))?.peep, { timeout: 15_000 }).toBe(peep0 + 5);
  await expect.poll(async () => (await engineAirway(page))!.meanPaw, { timeout: 30_000 }).toBeGreaterThan(before.meanPaw + 3);
  expect(errs).toEqual([]);
});
