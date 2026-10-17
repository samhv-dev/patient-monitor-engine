// Stage 8b: the ventilator-simulator embed (BUILD-PLAN Stage 8 acceptance 5) opened from file:// — no server. The
// page is built by `pnpm build` (apps/demo "build": vite.embed.config.ts + scripts/build-embed.mjs) into
// apps/demo/dist/embed/: the Hamilton ventilator on the left, window.PatientMonitor (the release IIFE) on the right,
// linked in-page (frames in, lungState out).
// Run: pnpm build && PW_SYSTEM_CHROME=1 pnpm exec playwright test apps/demo/e2e/vent-embed.e2e.ts
import { mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

const url = pathToFileURL(resolve(import.meta.dirname, '../dist/embed/ventilator-monitor.html')).href;
const shots = resolve(import.meta.dirname, '../../../docs/gates/stage-8b');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const last = (p: Page, k: string) => p.evaluate((key) => (window as Any).__embed.last[key] as number | undefined, k);
const simT = (p: Page) => p.evaluate(() => (window as Any).__embed.simT() as number);
// Wait until sim time t. The budget comes from the span still to run, assuming only ×1 real time (the page runs two
// engines — the 200 Hz ventilator on the main thread and the monitor in its worker — on a 2-vCPU CI runner that is
// ≈ 4× slower than a Mac for engine work), plus 60 s of slack (orchestrator ruling, 8b review).
const until = async (p: Page, t: number) => {
  const span = Math.max(0, t - (await simT(p)));
  await p.waitForFunction((t) => (window as Any).__embed.simT() >= t, t, { timeout: span * 1000 + 60_000, polling: 250 });
};
const shot = async (p: Page, name: string) => {
  mkdirSync(shots, { recursive: true });
  const path = resolve(shots, `${name}.jpg`);
  for (const quality of [60, 45, 35, 25]) {
    await p.screenshot({ path, type: 'jpeg', quality });
    if (statSync(path).size <= 60_000) break;
  }
  expect(statSync(path).size, `${name}.jpg must be ≤ 60 KB (committed screenshot rule)`).toBeLessThanOrEqual(60_000);
};

test('vent embed: loads from file:// with no errors; the ventilator breathes and the monitor counts its breaths', async ({ page }) => {
  // The waits below add up to 80 s (20 + 30 + 30); the 30 s default cut the awRR poll short on the CI WebKit runner
  // (PR #66 run 39066929916: passed only on retry #2). Same values, the whole budget.
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setViewportSize({ width: 1400, height: 800 });
  await page.goto(url);
  expect(await page.evaluate(() => (window as Any).PatientMonitor.version)).toBe('1.0.0-rc.1');
  await page.waitForFunction(() => (window as Any).__embed?.vent.vs.p.breathCount >= 2, null, { timeout: 20_000 });
  await expect.poll(() => last(page, 'awrr'), { timeout: 30_000 }).toBe(14); // vent → engine: the ventilator's 14/min
  await expect.poll(() => last(page, 'spo2'), { timeout: 30_000 }).toBeGreaterThan(90);
  expect(errors).toEqual([]);
});

test('vent embed: FiO2 0.21 at shunt 30 % lowers SpO2 after the §4.3 lag; RR 6 raises EtCO2', async ({ page, browserName }) => {
  // Heavy (≈ 480 sim-s asked at ×4): Chromium only (the G7g/FU-1 rule; headless WebKit cannot hold ×4 on the
  // 2-vCPU runner). 900 s covers the whole run at ×1 real time plus every wait's slack.
  test.skip(browserName === 'webkit', 'long ×4 scenario: Chromium only');
  test.setTimeout(900_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1400, height: 800 });
  await page.goto(url);
  await expect.poll(() => last(page, 'spo2'), { timeout: 30_000 }).toBeGreaterThan(90);
  await page.evaluate(() => {
    const e = (window as Any).__embed;
    e.setSpeed(4); // ×4: the speed this test's budgets are set for (the embed clamps to 0.25–4; Stage 10's ×8 is not used here)
    void e.monitor.dispatch({ id: 'e2e-shunt', issuedBy: 'e2e', type: 'setTarget', variable: 'shunt', value: 0.3 });
    e.setVent({ fio2: 100 });
  });
  const w0 = Date.now(); // for the achieved sim/wall ratio (recorded in the gate note, CI's value too)
  const st0 = await simT(page);
  await until(page, (await simT(page)) + 90);
  const t0 = await simT(page);
  const s0 = (await last(page, 'spo2')) as number;
  await page.evaluate(() => (window as Any).__embed.setVent({ fio2: 21 })); // the ventilator's O2 knob to room air
  await until(page, t0 + 20);
  const s20 = (await last(page, 'spo2')) as number;
  await until(page, t0 + 120);
  const s120 = (await last(page, 'spo2')) as number;
  await shot(page, 'vent-embed-fio2-21');
  // prototype (main 9f864b3, system Chrome): 98 → 98 at +20 s → 92 at +120 s (91 at +150 s); refresh on 48864439: 99 → 99 → 92
  expect(s20).toBeGreaterThanOrEqual(s0 - 1); // the lag: circulation + probe averaging (brief §4.3)
  expect(s120).toBeLessThanOrEqual(s0 - 4);
  await page.evaluate(() => (window as Any).__embed.setVent({ fio2: 40 }));
  await until(page, (await simT(page)) + 60);
  const t1 = await simT(page);
  const c0 = (await last(page, 'etco2')) as number;
  await page.evaluate(() => (window as Any).__embed.setVent({ rate: 6 }));
  await until(page, t1 + 180);
  const c180 = (await last(page, 'etco2')) as number;
  await shot(page, 'vent-embed-rr6');
  // prototype: 38 → 47 mmHg at +180 s (48 at +240 s); refresh on 48864439: 34 → 42; the monitor's awRR reads 6
  expect(c180).toBeGreaterThanOrEqual(c0 + 5);
  expect(await last(page, 'awrr')).toBe(6);
  const simPerWall = Number((((await simT(page)) - st0) / ((Date.now() - w0) / 1000)).toFixed(2));
  console.log(`vent-embed ${JSON.stringify({ s0, s20, s120, c0, c180, simPerWall })}`); // for the gate note
  expect(errors).toEqual([]);
});
