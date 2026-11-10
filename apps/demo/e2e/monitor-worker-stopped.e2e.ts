// FU-11 Task C3 (R50 M15): a monitor whose worker stops (the watchdog's terminal failure) says so — a toast naming the
// way out — instead of a frozen screen that only refuses commands.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

test('a worker that stops is reported: "The monitor stopped — Restart the patient"', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const W = Worker;
    (window as unknown as { ws: Worker[] }).ws = [];
    window.Worker = class extends W {
      constructor(...a: ConstructorParameters<typeof Worker>) {
        super(...a);
        (window as unknown as { ws: Worker[] }).ws.push(this);
      }
    };
  });
  await openApp(page, base, '#/monitor', { warmMs: 1500 });
  // The monitor's own render path, not the count of workers constructed: on a loaded machine the dev server's worker can
  // miss READY_TIMEOUT_MS (2 s, worker-host.ts) and the monitor falls back to the main thread with that worker still
  // built. Terminating it then kills nothing the monitor uses, and no toast can come (brief 118: CI run 42663782683; locally
  // at background QoS, 6 workers, 18 of 20 runs were on 'main' with one worker built, every one of them the CI symptom)
  const path = await page.evaluate(() => (window as unknown as { __pmeApp: { session: { monitor: { renderPath: Promise<string> } } } }).__pmeApp.session.monitor.renderPath);
  test.skip(!/^worker/.test(path), `the monitor runs on the main thread here (${path}): no worker to lose`);
  await page.evaluate(() => (window as unknown as { ws: Worker[] }).ws.at(-1)!.terminate()); // a silent death: no event
  // the watchdog listens while a request is out: the instructor's next action (here a command) finds the silence
  void page.evaluate(() => (window as unknown as { __pmeApp: { link: { send(c: unknown): Promise<unknown> } } }).__pmeApp.link.send({ type: 'setTarget', variable: 'hr', value: 90 }));
  await expect(page.locator('.toast', { hasText: 'The monitor stopped — Restart the patient' })).toBeVisible({ timeout: 10_000 });
});
