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

  // Both airway readings are taken at points defined in SIMULATED time. The engine's mean airway pressure is the mean of
  // the alveolar pressure of the frames over the last breath cycle (engine-core resp/driver.ts: the last Ti + Te, here
  // 5 s). A reading is taken once, after the change it compares, one complete breath cycle has ended (breath k + 1 ran
  // from its start to the start of breath k + 2) and breath k + 2 has ended its inspiration: the window then lies
  // inside breaths k + 1 and k + 2. k is the model's breath counter (the e2e hook `__vent`) at the change. Read straight
  // after the change, the window still holds the breath before it: since piece V2 the EDP-TS VCV starts with the
  // descending ramp (research/57 T-26), whose mean is above PCV's, and a VCV inspiration in "before" decided the result.
  const st = () => page.evaluate(() => {
    const w = (document.getElementById('vent') as Any).contentWindow.__vent;
    return { n: w.vs.p.breathCount as number, phase: w.vs.p.phase as string, t: w.vs.p.t as number, rate: w.vs.cfg.rate as number, ti: w.vs.cfg.itime as number, engineT: (window as Any).__link.simT as number, behind: (window as Any).__link.pm.behindS() as number };
  });
  await page.evaluate(() => { (window as Any).__behindMax = 0; document.addEventListener('pme-monitor-behind', (e) => { (window as Any).__behindMax = Math.max((window as Any).__behindMax, (e as CustomEvent).detail.behindS); }, true); });
  const s0 = await st();
  // The wall-clock bound only guards against a hung page: the suite's rule for waits on simulated time (vent-embed.e2e.ts
  // `until`, orchestrator ruling, 8b review): the simulated span still to run at x1 real time, plus 60 s of slack. The
  // span here is at most two breath periods (the next breath may be one period away) and one Ti.
  const spanS = 2 * (60 / s0.rate) + s0.ti;
  const guardMs = spanS * 1000 + 60_000;
  test.setTimeout(120_000 + 2 * guardMs); // the test's own 120 s plus the two guarded waits, by the same rule
  const settled = async (k: number) => {
    await page.waitForFunction((k) => { const p = (document.getElementById('vent') as Any).contentWindow.__vent.vs.p; return p.breathCount >= k + 2 && p.phase === 'exp'; }, k, { timeout: guardMs, polling: 100 });
  };
  const w0 = Date.now();
  await settled(s0.n);
  const peep0 = (await vent()).peep;
  const before = (await engineAirway(page))!;
  expect(before.peep).toBe(peep0);

  // PEEP: select, turn 5, not applied until the press (research/57 O-01)
  await f.locator('[data-ctl="key:peep"]').click();
  await knobTurn(f, 5);
  await expect(f.locator('[data-ctl="key:peep"] .v')).toHaveText(String(peep0 + 5));
  expect((await vent()).peep).toBe(peep0);
  await knobPress(f);
  expect((await vent()).peep).toBe(peep0 + 5);
  const s1 = await st();

  await settled(s1.n);
  const after = (await engineAirway(page))!;
  const s2 = await st();
  const wallS = (Date.now() - w0) / 1000;
  console.log(`vent-edp-ts ${JSON.stringify({
    browser: test.info().project.name, wallS: Number(wallS.toFixed(2)),
    ventSimS: Number((s2.t - s0.t).toFixed(2)), engineSimS: Number((s2.engineT - s0.engineT).toFixed(2)),
    ventSimPerWall: Number(((s2.t - s0.t) / wallS).toFixed(3)), engineSimPerWall: Number(((s2.engineT - s0.engineT) / wallS).toFixed(3)),
    behindS: [s0.behind, s1.behind, s2.behind].map((b) => Number(b.toFixed(2))), behindEventMaxS: await page.evaluate(() => (window as Any).__behindMax as number),
    before: before.meanPaw, after: after.meanPaw, rise: Number((after.meanPaw - before.meanPaw).toFixed(3)),
  })}`);
  // In PCV the airway pressure is PEEP plus the set PC (vent.ts controller), and the alveolar pressure is PEEP plus the
  // recoil of a tidal volume that the unchanged driving pressure keeps the same: both phases rise by the PEEP step, so
  // the model gives +5 cmH2O; the test asks for more than 3, as V1 wrote it
  expect(after.peep).toBe(peep0 + 5);
  expect(after.meanPaw).toBeGreaterThan(before.meanPaw + 3);
  expect(errs).toEqual([]);
});
