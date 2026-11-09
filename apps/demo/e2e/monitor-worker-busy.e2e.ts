// FX-11a (classroom): the worker watchdog (WORKER_SILENT_MS = 3000) took any 3 s of silence with a request out for a
// dead worker and stopped the monitor for good ("The monitor stopped — Restart the patient") — also a worker that was
// only working (CI load; a deliberate 5 s block in the rulings' test). The watchdog now judges the worker by its own
// progress: a long run in the worker reports its progress every ≤ 250 ms, so a busy worker is never silent; at 3 s of
// silence the page warns first (`pme-monitor-slow`) and starts a probe worker; only when the probe has answered — the
// machine runs workers, this one makes no progress — is the worker stopped.
// The busy worker here: one fast-forward step sized to ≈ 8 s of THIS machine's worker, from a 5000-tick step timed first
// (a Mac ran 10 000 ticks in 532–653 ms; CI's WebKit is many times slower, so a fixed size outran the test's timeout).
// The short timing overstates the cost of a tick (CI WebKit, run 42163657382: 0.576 ms a tick timed, 0.214 ms in the
// 13 884-tick step, which lasted 2967 ms: under the threshold). So a step that ends short of the threshold plus 2 s is
// sized again from its own rate and run again; the one that counts lasts past WORKER_SILENT_MS + 2000 ms (5 s against
// 3 s), the product's own constant, read from the module the page runs.
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { monitor: { renderPath: Promise<string>; advance(t: number, last: boolean): Promise<{ tick: number }>; dispatch(c: unknown): Promise<{ accepted: boolean }> } } }; failed?: string[]; slow?: number };

// @known-flaky, class crash (outside our code; brief 103): in 45 ci runs with the gating WebKit jobs, 8 Nov 12:05 to 9 Nov 02:50 UTC (after PR #342), the first attempt lost its page in 6 runs
// (13 %), every time "page.evaluate: Target page, context or browser has been closed" inside the ≈ 8-s busy-worker step below,
// and in run 42540487370 on all three attempts (the job failed); since 7 Nov 12:00 UTC 19 more retry-only passes, all the same.
// No failure of any other kind. Local macOS WebKit 14/14 (6 more skipped: no worker there), Chromium 0 sightings. An 8-s
// busy worker is the measurement, and CI's Linux WebKit web process does not survive it often enough to gate on.
test('a worker busy for several seconds with a request out reports its progress: not warned about, not stopped', { tag: '@known-flaky' }, async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    const w = window as unknown as W;
    w.failed = [];
    w.slow = 0;
    addEventListener('pme-monitor-failed', (e) => w.failed?.push((e as CustomEvent<{ reason: string }>).detail.reason));
    addEventListener('pme-monitor-slow', () => void (w.slow = (w.slow ?? 0) + 1));
  });
  await openApp(page, base, '#/monitor', { warmMs: 1500 });
  test.skip(!/^worker/.test(await page.evaluate(() => (window as unknown as W).__pmeApp.session.monitor.renderPath)), 'no worker on this browser');
  const r = await page.evaluate(async (root) => {
    const { WORKER_SILENT_MS } = (await import('/@fs' + root + '/packages/renderer/src/worker-host.ts')) as { WORKER_SILENT_MS: number };
    const m = (window as unknown as W).__pmeApp.session.monitor;
    const minMs = WORKER_SILENT_MS + 2000; // a clear margin past the warn threshold
    const c0 = performance.now();
    await m.advance(5000, true);
    let perTickMs = (performance.now() - c0) / 5000;
    const runs: Array<{ ticks: number; ms: number }> = [];
    let step: number | string = 'not run';
    for (let k = 0; k < 4; k++) {
      const ticks = Math.round(8000 / perTickMs); // ≈ 8 s by the latest rate
      const t0 = performance.now();
      step = await m.advance(ticks, true).then((x) => x.tick, (e: Error) => `rejected: ${e.message}`);
      const ms = Math.round(performance.now() - t0);
      runs.push({ ticks, ms });
      if (typeof step !== 'number' || ms > minMs) break;
      perTickMs = ms / ticks; // the long step's own rate
    }
    return { step, minMs, threshold: WORKER_SILENT_MS, runs, ms: runs[runs.length - 1]?.ms ?? 0 };
  }, resolve(import.meta.dirname, '../../..'));
  console.log('busy worker', JSON.stringify(r));
  expect(r.ms, `the worker was busy past the ${r.threshold} ms threshold with a margin (${r.minMs} ms)`).toBeGreaterThan(r.minMs);
  expect(typeof r.step, `the step was answered (${String(r.step)})`).toBe('number');
  expect(await page.evaluate(() => (window as unknown as W).failed)).toEqual([]);
  expect(await page.evaluate(() => (window as unknown as W).slow), 'a working worker is not slow').toBe(0);
  const c = await page.evaluate(() => (window as unknown as W).__pmeApp.session.monitor.dispatch({ id: 'after-busy', issuedBy: 'test', type: 'setTarget', variable: 'hr', value: 80 }));
  expect(c.accepted, 'the monitor still takes commands').toBe(true);
  await expect(page.locator('.toast', { hasText: 'The monitor stopped' })).toHaveCount(0);
});

test('a worker that dies is warned about first, then stopped, inside 5 s', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const w = window as unknown as W & { ws: Worker[]; order: string[] };
    w.ws = [];
    w.order = [];
    const Wk = Worker;
    window.Worker = class extends Wk {
      constructor(...a: ConstructorParameters<typeof Worker>) {
        super(...a);
        w.ws.push(this);
      }
    };
    addEventListener('pme-monitor-slow', () => w.order.push(`slow ${Math.round(performance.now())}`));
    addEventListener('pme-monitor-failed', () => w.order.push(`failed ${Math.round(performance.now())}`));
  });
  await openApp(page, base, '#/monitor', { warmMs: 1500 });
  test.skip(!/^worker/.test(await page.evaluate(() => (window as unknown as W).__pmeApp.session.monitor.renderPath)), 'no worker on this browser');
  const t0 = await page.evaluate(() => {
    const w = window as unknown as W & { ws: Worker[] };
    w.ws[0]?.terminate(); // the engine's worker (the first one made): a silent death, no event
    void w.__pmeApp.session.monitor.dispatch({ id: 'after-death', issuedBy: 'test', type: 'setTarget', variable: 'hr', value: 80 });
    return performance.now();
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { order: string[] }).order.length), { timeout: 5000 }).toBe(2);
  const order = await page.evaluate(() => (window as unknown as { order: string[] }).order);
  console.log('dead worker', JSON.stringify({ t0: Math.round(t0), order }));
  expect(order.map((x) => x.split(' ')[0])).toEqual(['slow', 'failed']);
});
