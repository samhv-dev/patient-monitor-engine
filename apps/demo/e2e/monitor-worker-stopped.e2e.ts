// FU-11 Task C3 (R50 M15): a monitor whose worker stops (the watchdog's terminal failure) says so — a toast naming the
// way out — instead of a frozen screen that only refuses commands.
import { expect, test, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

const renderPath = (page: Page) => page.evaluate(() => (window as unknown as { __pmeApp: { session: { monitor: { renderPath: Promise<string> } } } }).__pmeApp.session.monitor.renderPath);

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
  expect(await renderPath(page)).toMatch(/^worker/);
  await page.evaluate(() => (window as unknown as { ws: Worker[] }).ws.at(-1)!.terminate()); // a silent death: no event
  // the watchdog listens while a request is out: the instructor's next action (here a command) finds the silence
  void page.evaluate(() => (window as unknown as { __pmeApp: { link: { send(c: unknown): Promise<unknown> } } }).__pmeApp.link.send({ type: 'setTarget', variable: 'hr', value: 90 }));
  await expect(page.locator('.toast', { hasText: 'The monitor stopped — Restart the patient' })).toBeVisible({ timeout: 10_000 });
});

test('a worker ready only after the page said it was late runs the monitor, and the page says it has started', async ({ page }) => {
  test.setTimeout(60_000);
  // The engine worker's messages, its 'ready' first, reach the monitor only when the test releases them
  await page.addInitScript(() => {
    const W = Worker;
    window.Worker = class extends W {
      constructor(...a: ConstructorParameters<typeof Worker>) {
        super(...a);
        if (a[1]?.name !== 'pme-engine') return;
        let handler: ((e: MessageEvent) => void) | null = null;
        let held: MessageEvent[] | null = [];
        Object.defineProperty(this, 'onmessage', { get: () => handler, set: (h: typeof handler) => (handler = h) });
        this.addEventListener('message', (e) => (held ? held.push(e) : handler?.(e)));
        Object.assign(window, { releaseWorker: () => { const q = held ?? []; held = null; for (const e of q) handler?.(e); } });
      }
    };
  });
  await openApp(page, base, '#/teach2'); // the monitor view shows no info toast
  await expect(page.locator('.toast', { hasText: 'The monitor is still starting' })).toBeVisible();
  await page.evaluate(() => (window as unknown as { releaseWorker(): void }).releaseWorker());
  await expect(page.locator('.toast', { hasText: 'The monitor has started' })).toBeVisible();
  expect(await renderPath(page)).toMatch(/^worker/);
  await expect(page.locator('.toast', { hasText: 'The monitor runs without its worker' })).toHaveCount(0);
});
