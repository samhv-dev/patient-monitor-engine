// The EDP-TS face in a browser: an inspiratory hold on a patient of known compliance (research/57 H-18, H-19, R-21,
// K-16, N-05). The Insp/Exp Pause key is held with the pointer during an inspiration; the valves close at its end and
// stay closed while the key is held; the left column shows the plateau; released, ventilation goes on. Patient's Data
// (Menu, its first row) then shows the static compliance, VT / (Pplateau − PEEP), equal to the patient's compliance
// within the tenth the face prints it to. Every wait is for the model's state (its phase, its hold), read through the
// page's e2e hook.
// Run: pnpm exec playwright test apps/demo/e2e/vent-edp-ts-holds.e2e.ts
import { expect, test } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => {
  ({ vite, base } = await startVite());
});
test.afterAll(async () => vite?.close());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

test('EDP-TS face: an inspiratory hold held with the key gives the plateau and the patient\'s static compliance', async ({ page }) => {
  test.setTimeout(120_000);
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.setViewportSize({ width: 1400, height: 820 });
  await page.goto(`${base}/vent-hamilton.html?face=edp-ts`);
  await expect(page.locator('main.edp')).toBeVisible({ timeout: 20_000 });
  const vent = () => page.evaluate(() => {
    const v = (window as Any).__vent.vs;
    return { hold: v.hold as string | null, phase: v.p.phase as string, compliance: v.cfg.compliance as number, paw: v.p.Paw as number };
  });
  // two complete breaths, so the breath record (the measured PEEP) exists; then the start of an inspiration
  await page.waitForFunction(() => (window as Any).__vent.vs.p.breathCount >= 3, null, { timeout: 60_000, polling: 50 });
  await page.waitForFunction(() => { const p = (window as Any).__vent.vs.p; return p.phase === 'insp' && p.phaseT < 0.3; }, null, { timeout: 30_000, polling: 'raf' });

  const key = page.locator('[data-ctl="under:inspExpPause"]');
  const b = (await key.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  // the valves close at the end of this inspiration, and stay closed while the key is held
  await page.waitForFunction(() => (window as Any).__vent.vs.hold === 'insp', null, { timeout: 10_000, polling: 'raf' });
  await expect(key).toHaveClass(/\blit\b/);
  const plateau = page.locator('.edp-screen .lv').nth(2); // under Peak and Trach.
  const held = await vent();
  await expect(plateau).toHaveText(held.paw.toFixed(0));
  expect((await vent()).hold, 'still held').toBe('insp');
  await page.mouse.up();
  await page.waitForFunction(() => (window as Any).__vent.vs.hold === null, null, { timeout: 5_000, polling: 'raf' });
  await expect(key).not.toHaveClass(/\blit\b/);

  // Patient's Data: Cst, VT / (Pplateau − PEEP), the patient's compliance to the tenth (research/57 K-16)
  await page.locator('[data-ctl="side:menu"]').click();
  await page.locator('.edp-knob').click();
  await expect(page.locator('.edp-win .t').first()).toHaveText("Patient's Data");
  const cst = page.locator('.edp-win .edp-entry', { hasText: 'Cst' }).locator('.val');
  await expect(cst).toHaveText(/^\d+\.\d mL\/cmH2O$/);
  const value = Number((await cst.textContent())!.split(' ')[0]);
  expect(Math.abs(value - held.compliance), `Cst ${value} against the patient's ${held.compliance}`).toBeLessThanOrEqual(0.05);
  expect(errs).toEqual([]);
});
