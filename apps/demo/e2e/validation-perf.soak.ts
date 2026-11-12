// Stage 8a performance gate (BUILD-PLAN Stage 8): (1) frame-time histograms at 60 and 30 fps on the worker path;
// (2) soak: PME_SOAK_MIN (default 60) sim-minutes at ×1 on the main-thread path (so the engine's heap is the page's),
// heap after a forced GC sampled every minute, growth from minute 5 to the end ≤ 5 MB; no apnoea alarm for a steady
// ventilated patient (the GV-obs "APNEA" flake watch). Writes docs/validation/perf/soak-<date>.json.
// Run: PW_SYSTEM_CHROME=1 PME_SOAK_MIN=5 pnpm exec playwright test -c playwright.validation.config.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/validation/perf');
const record: Record<string, unknown> = { date: new Date().toISOString() };
test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => {
  writeFileSync(resolve(out, `soak-${String(record.date).slice(0, 10)}.json`), `${JSON.stringify(record, null, 1)}\n`);
  await vite?.close();
});

type W = { __pmePerf: { frames: number[]; alarms: Array<{ t: number; id: string; state: string }>; simT: number } };
const perf = <T>(p: Page, fn: (w: W) => T) => p.evaluate(`(${fn.toString()})(window)`) as Promise<T>;
const hist = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const q = (x: number) => +(s[Math.floor(x * (s.length - 1))] ?? 0).toFixed(2);
  const bins: Record<string, number> = { '<17': 0, '17-20': 0, '20-34': 0, '34-50': 0, '>=50': 0 };
  for (const v of xs) bins[v < 17 ? '<17' : v < 20 ? '17-20' : v < 34 ? '20-34' : v < 50 ? '34-50' : '>=50']! += 1;
  return { n: xs.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), bins };
};

for (const fps of [60, 30] as const) {
  test(`frame-time histogram at ${fps} fps (worker path)`, async ({ page }) => {
    await page.setViewportSize({ width: 1300, height: 760 });
    await page.goto(`${base}/validation-perf.html?fps=${fps}`);
    await page.waitForFunction(() => '__pmePerf' in window);
    await page.waitForTimeout(5000);
    await perf(page, (w) => w.__pmePerf.frames.splice(0));
    await page.waitForTimeout(60_000);
    const h = hist(await perf(page, (w) => w.__pmePerf.frames.slice()));
    record[`frames${fps}`] = h;
    expect(h.p95).toBeLessThan((1000 / fps) * 1.5); // [ENG: test] p95 frame interval within 1.5× the target period
  });
}

// Room plan R8d: the gate holds with the laptop's ventilator window open beside the monitor. The window is the cockpit
// page itself, running on its own (no `?link`: its mechanics and its drawing every frame, as a cockpit driving the
// patient does; linked to no host it would stop at its clock limit and only draw), in a second page of the same browser.
test('frame-time histogram at 60 fps (worker path) with the ventilator window open', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 760 });
  const win = await page.context().newPage();
  await win.setViewportSize({ width: 1280, height: 800 });
  await win.goto(`${base}/vent-hamilton.html`);
  await win.waitForFunction(() => '__vent' in window);
  await page.bringToFront();
  await page.goto(`${base}/validation-perf.html?fps=60`);
  await page.waitForFunction(() => '__pmePerf' in window);
  await page.waitForTimeout(5000);
  await perf(page, (w) => w.__pmePerf.frames.splice(0));
  // its 5 ms steps (VentState.n; DT = 0.005 s) as sim seconds
  const ventT0 = await win.evaluate(() => (window as unknown as { __vent: { vs: { n: number } } }).__vent.vs.n * 0.005);
  await page.waitForTimeout(60_000);
  const h = hist(await perf(page, (w) => w.__pmePerf.frames.slice()));
  const ventS = (await win.evaluate(() => (window as unknown as { __vent: { vs: { n: number } } }).__vent.vs.n * 0.005)) - ventT0;
  record.frames60vent = { ...h, ventSimS: +ventS.toFixed(1) };
  await win.close();
  expect(ventS, 'the window ran its cockpit meanwhile').toBeGreaterThan(30); // [ENG: test] at least half of the 60 s minute
  expect(h.p95).toBeLessThan((1000 / 60) * 1.5); // [ENG: test] the gate above, unchanged
});

// Defibrillator plan E4a: the cost of measuring one 3-s ECG segment (packages/engine-core l3/ecg-analysis/features.ts)
// on a phone. A phone is emulated by Chromium's CPU throttling at 4× (Lighthouse's mobile setting) [ENG: test]; the
// segment is 1 500 samples at the engine's 500 Hz, a 5 Hz wave with 75 /min pulses. Reported in the soak record, not
// gated: no consumer runs it per tick yet (E4b and B1 do, and gate their own cost).
test('ECG analysis: one 3-s segment measured on an emulated phone (CPU ×4)', async ({ page }) => {
  await page.goto(`${base}/validation-perf.html?fps=30`);
  await page.waitForFunction(() => '__pmePerf' in window);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const src = `/@fs${resolve(import.meta.dirname, '../../../packages/engine-core/src/l3/ecg-analysis/features.ts')}`;
  const ms = await page.evaluate(async (url) => {
    const { measureSegment } = (await import(/* @vite-ignore */ url)) as { measureSegment: (x: Float64Array, fs: number) => unknown };
    const x = Float64Array.from({ length: 1500 }, (_, i) => Math.sin((2 * Math.PI * 5 * i) / 500) + ((i % 400) < 40 ? 1 : 0));
    for (let k = 0; k < 5; k++) measureSegment(x, 500); // warm-up
    const out: number[] = [];
    for (let k = 0; k < 30; k++) {
      const t0 = performance.now();
      measureSegment(x, 500);
      out.push(performance.now() - t0);
    }
    return out;
  }, src);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const h = hist(ms);
  record.ecgSegmentPhoneMs = { cpuThrottle: 4, p50: h.p50, p95: h.p95, n: h.n };
  expect(h.n).toBe(30);
  expect(Number.isFinite(h.p95)).toBe(true);
});

test('soak: heap growth ≤ 5 MB, no spurious apnoea alarm', async ({ page }) => {
  const minutes = Number(process.env.PME_SOAK_MIN ?? 60);
  await page.setViewportSize({ width: 1300, height: 760 });
  await page.goto(`${base}/validation-perf.html?fps=60&worker=off`);
  await page.waitForFunction(() => '__pmePerf' in window);
  const cdp = await page.context().newCDPSession(page);
  const heap = async () => {
    await cdp.send('HeapProfiler.collectGarbage');
    return ((await cdp.send('Runtime.getHeapUsage')) as { usedSize: number }).usedSize / 1048576;
  };
  const samples: Array<[number, number]> = [];
  for (let m = 0; m <= minutes; m++) {
    samples.push([m, +(await heap()).toFixed(2)]);
    await perf(page, (w) => w.__pmePerf.frames.splice(0));
    if (m < minutes) await page.waitForTimeout(60_000);
  }
  const from = samples[Math.min(5, samples.length - 1)]?.[1] ?? 0;
  const growth = (samples.at(-1)?.[1] ?? 0) - from;
  const alarms = await perf(page, (w) => w.__pmePerf.alarms.filter((a) => a.state === 'raised'));
  const simT = await perf(page, (w) => w.__pmePerf.simT);
  record.soak = { minutes, simT, heapMb: samples, growthMbFromMinute5: +growth.toFixed(2), alarms };
  expect(simT).toBeGreaterThan(minutes * 60 * 0.95); // ×1 real time held
  expect(growth).toBeLessThanOrEqual(5);
  expect(alarms.filter((a) => a.id.startsWith('apnoea'))).toEqual([]);
});
