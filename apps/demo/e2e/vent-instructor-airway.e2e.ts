// The instructor's "Circuit disconnected" on a patient ventilated from the ventilator's own window (Room setup's window,
// `vent-hamilton.html?link=<code>`), on each face: delivered from the Airway sheet, the sheet says it acts, the window's
// circuit opens, its volumes fall to zero and its own alarm is shown in its own words; "Patent" closes the circuit and
// the alarm message goes. The window keeps its mode throughout.
// Run: pnpm exec playwright test apps/demo/e2e/vent-instructor-airway.e2e.ts
import { expect, test, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { deliver, openApp, sheet, startVite, TEACH2 } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = {
  __pmeApp: { session: { code: string; last: { state?: { breathing?: { source: string } } } } };
  __vent?: { vs: { circuit: string; cfg: { mode: string; modeLabel: string | null }; p: { measured: { VTE: number } } } };
};
const source = (p: Page) => p.evaluate(() => (window as unknown as W).__pmeApp.session.last.state?.breathing?.source ?? '?');
const vent = (w: Page) => w.evaluate(() => {
  const v = (window as unknown as W).__vent!.vs;
  return { circuit: v.circuit, mode: v.cfg.mode, label: v.cfg.modeLabel, vte: v.p.measured.VTE };
});
async function airway(page: Page, label: string): Promise<void> {
  const s = await sheet(page, 'airway');
  await s.getByLabel('Airway', { exact: true }).selectOption({ label });
  await s.locator('.row', { has: page.getByLabel('Airway', { exact: true }) }).getByRole('button', { name: 'Stage' }).click();
  await deliver(page);
}

const FACES = [
  { name: 'Hamilton-style', query: '', alarm: (w: Page) => w.locator('#alarmBanner'), text: 'Disconnection on patient side' },
  { name: 'EDP-TS', query: '&face=edp-ts', alarm: (w: Page) => w.locator('.edp-alarm'), text: 'Disconnection' },
];
for (const face of FACES) {
  test(`${face.name} window: the instructor's circuit disconnection opens its circuit and raises its own alarm; Patent closes it`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1600, height: 900 });
    await openApp(page, base, TEACH2, { warmMs: 1500 });
    const code = await page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
    const win = await page.context().newPage();
    await win.goto(`${base}/vent-hamilton.html?link=${code}${face.query}`);
    await win.waitForFunction(() => '__vent' in window);
    await expect.poll(() => source(page), { timeout: 20_000, message: 'the window drives the patient' }).toBe('external');
    await expect.poll(async () => (await vent(win)).vte, { timeout: 30_000 }).toBeGreaterThan(300);
    const before = await vent(win);

    await airway(page, 'Circuit disconnected');
    await expect(page.getByTestId('airway-now')).toHaveText('Now: Circuit disconnected.', { timeout: 10_000 });
    await win.waitForFunction(() => (window as unknown as W).__vent!.vs.circuit === 'disconnected', null, { timeout: 10_000 });
    await expect(face.alarm(win)).toContainText(face.text, { timeout: 20_000 });
    expect((await vent(win)).vte).toBe(0);

    await airway(page, 'Patent');
    await expect(page.getByTestId('airway-now')).toHaveText('Now: Patent.', { timeout: 10_000 });
    await win.waitForFunction(() => (window as unknown as W).__vent!.vs.circuit === 'connected', null, { timeout: 10_000 });
    await expect.poll(async () => (await vent(win)).vte, { timeout: 30_000 }).toBeGreaterThan(300);
    await expect(face.alarm(win)).not.toContainText(face.text, { timeout: 20_000 });
    expect(await vent(win)).toMatchObject({ mode: before.mode, label: before.label, circuit: 'connected' });
    await win.close();
  });
}
