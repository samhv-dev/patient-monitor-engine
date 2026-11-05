// FX-11a (classroom): the worker watchdog (WORKER_SILENT_MS = 3000) took any 3 s of silence with a request out for a
// dead worker and stopped the monitor for good ("The monitor stopped — Restart the patient") — also a worker that was
// only working (CI load; a deliberate 5 s block in the rulings' test). The watchdog now judges the worker by its own
// progress: a long run in the worker reports its progress every ≤ 250 ms, so a busy worker is never silent; at 3 s of
// silence the page warns first (`pme-monitor-slow`) and starts a probe worker; only when the probe has answered — the
// machine runs workers, this one makes no progress — is the worker stopped.
// The busy worker here: one fast-forward step sized to ≈ 8 s of THIS machine's worker, from a 5000-tick step timed first
// (a Mac ran 10 000 ticks in 532–653 ms; CI's WebKit is many times slower, so a fixed size outran the test's timeout).
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { monitor: { renderPath: Promise<string>; advance(t: number, last: boolean): Promise<{ tick: number }>; dispatch(c: unknown): Promise<{ accepted: boolean }> } } }; failed?: string[]; slow?: number };

test('a worker busy for several seconds with a request out reports its progress: not warned about, not stopped', async ({ page }) => {
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
  const r = await page.evaluate(async () => {
    const m = (window as unknown as W).__pmeApp.session.monitor;
    const c0 = performance.now();
    await m.advance(5000, true);
    const perTickMs = (performance.now() - c0) / 5000;
    const ticks = Math.round(8000 / perTickMs); // ≈ 8 s by the timing; a longer step runs faster per tick (it was 3.0–3.4 s for a 5 s aim)
    const t0 = performance.now();
    const step = await m.advance(ticks, true).then((x) => x.tick, (e: Error) => `rejected: ${e.message}`);
    return { step, ticks, perTickMs: Math.round(perTickMs * 1000) / 1000, ms: Math.round(performance.now() - t0) };
  });
  console.log('busy worker', JSON.stringify(r));
  expect(r.ms, 'the worker was busy past the 3 s threshold').toBeGreaterThan(3500);
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
