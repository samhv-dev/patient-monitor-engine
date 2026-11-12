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

  // the airway before: the monitor's engine follows the set PEEP
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

// Brief 202 (V3 on the redrawn face): an alarm raised by the MODEL, seen on the face as the device shows it. The
// Pressure Limits max key turned below the breath's peak: the model raises High Pressure (research/57 A-32, no delay);
// the High lamp flashes (H-06) and the message box shows the device's words on red (R-16, R-17; S-01, S-02); the silence
// key pauses the sound only (A-20), said outside the device; the limit set back: the message goes at once (A-19), the
// lamp stays lit, steady (A-16), until Esc (H-25).
test('EDP-TS face: High Pressure from the model, its lamp and message, silenced, cleared and reset with Esc', async ({ page }) => {
  test.setTimeout(120_000);
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.setViewportSize({ width: 1400, height: 820 });
  await page.goto(`${base}/vent-hamilton.html?face=edp-ts`);
  await expect(page.locator('main.edp')).toBeVisible({ timeout: 20_000 });
  const lamp = (w: string) => page.locator(`.edp-lamp[data-lamp="${w}"]`);
  const box = page.locator('.edp-alarm');
  const cfg = () => page.evaluate(() => (window as Any).__vent.vs.cfg.pmax as number);
  const peak = () => page.evaluate(() => (window as Any).__vent.vs.p.measured.PIP as number);
  await expect.poll(peak, { timeout: 20_000 }).toBeGreaterThan(10);

  // the limit under the peak: select the key, turn, press (research/57 O-01)
  const pmax0 = await cfg();
  const steps = pmax0 - Math.max(10, Math.floor((await peak()) - 5));
  await page.locator('[data-ctl="tag:pmax"]').click();
  await knobTurnPage(page, -steps);
  await page.locator('.edp-knob').click();
  expect(await cfg()).toBe(pmax0 - steps);
  await expect(box).toHaveText('High Pressure', { timeout: 15_000 });
  await expect(box).toHaveClass(/high/);
  await expect(lamp('high')).toHaveAttribute('data-state', 'fast');
  await expect(lamp('inop')).toHaveAttribute('data-state', 'off');

  // silenced: the device unchanged, the seconds left in the simulator's strip
  await page.locator('[data-ctl="side:silence"]').click();
  await expect(page.locator('.edp-strip .sil')).toHaveText(/^Alarm sound paused: (30|29) s$/);
  await expect(box).toHaveText('High Pressure');
  await expect(lamp('high')).toHaveAttribute('data-state', 'fast');

  // the limit back: the message goes, the lamp stays lit steady until Esc
  await page.locator('[data-ctl="tag:pmax"]').click();
  await knobTurnPage(page, steps);
  await page.locator('.edp-knob').click();
  expect(await cfg()).toBe(pmax0);
  await expect(box).toBeHidden({ timeout: 15_000 });
  await expect(lamp('high')).toHaveAttribute('data-state', 'steady');
  await page.locator('[data-ctl="under:esc"]').click();
  await expect(lamp('high')).toHaveAttribute('data-state', 'off');
  expect(errs).toEqual([]);
});
async function knobTurnPage(p: Page, n: number) {
  for (let i = 0; i < Math.abs(n); i++) await p.locator('.edp-knob').dispatchEvent('wheel', { deltaY: n > 0 ? -100 : 100 });
}
