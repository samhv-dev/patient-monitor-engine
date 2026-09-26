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
    expect(h.p95).toBeLessThan((1000 / fps) * 1.5); // [ENG] p95 frame interval within 1.5× the target period
  });
}

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
