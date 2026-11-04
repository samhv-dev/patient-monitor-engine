// Gate 7x evidence on the live page: the console loads with the real monitor, the organ sections fill from the
// engine's truth event, a phenylephrine bolus from the rail makes one change-log entry and turns the SVR delta
// positive. Screenshots (JPEG clips, ≤ 60 KB each) for the gate note.
// Run: PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/physiology-console.e2e.ts
// Served from a production build of this page (`vite build` + `vite preview`), not the dev server: the claim below is a
// property of the shipped product (the truth tree crosses the worker boundary). On the dev server the worker loads its
// own copy of the module graph one request per module (278–1875 ms to 'ready' on an idle Mac), close to the renderer's
// 2 s READY_TIMEOUT_MS; on the CI runner it sometimes lost and the page fell back to the main thread (run 41808357837:
// "render path main"). The built worker is one inline bundle, which is what a user runs.
import { mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { build, preview, type PreviewServer } from 'vite';

let server: PreviewServer;
let outDir = '';
let base = '';
const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/stage-7x' : '../../../test-results/gate-shots/stage-7x'); // FU-11 K1: evidence only on request

test.beforeAll(async () => {
  test.setTimeout(120_000); // the one-page build: ≈ 2 s on a Mac
  const root = resolve(import.meta.dirname, '..');
  const configFile = resolve(root, 'vite.config.ts');
  outDir = mkdtempSync(join(tmpdir(), 'pme-console-build-'));
  const input = { 'physiology-console': resolve(root, 'dev/physiology-console.html') }; // this page only
  await build({ root, configFile, logLevel: 'error', build: { outDir, emptyOutDir: true, rollupOptions: { input } } });
  server = await preview({ root, configFile, logLevel: 'error', build: { outDir }, preview: { port: 0, host: '127.0.0.1' } });
  const addr = server.httpServer.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => {
  await server?.close();
  if (outDir) rmSync(outDir, { recursive: true, force: true });
});

type Hook = { ready: boolean; renderPath(): Promise<string>; ui: { model: { t: number; baseT: number | null; truth: { leaves: number; bytes: number; truncated: boolean } } } };
const simT = (page: Page) => page.evaluate(() => (window as unknown as { __pmeConsole: Hook }).__pmeConsole.ui.model.t);
const waitSim = (page: Page, t: number) => page.waitForFunction((t) => (window as unknown as { __pmeConsole: Hook }).__pmeConsole.ui.model.t >= t, t, { timeout: 120_000 });
/** Three JPEG clips per state (monitor + rail + log; the organ sections' top and bottom halves), each ≤ 60 KB. */
async function shots(page: Page, name: string) {
  if (test.info().project.name === 'webkit') return; // evidence comes from Chromium/Chrome; WebKit's font rendering changes JPEG sizes
  const x = await page.evaluate(() => Math.round((document.querySelector('.pc-left') as HTMLElement).getBoundingClientRect().right));
  const w = 1440 - x;
  const parts = [['left', { x: 0, y: 0, width: x, height: 900 }], ['organs-top', { x, y: 0, width: w, height: 450 }], ['organs-bottom', { x, y: 450, width: w, height: 450 }]] as const;
  for (const [part, clip] of parts) {
    const path = `${out}/${name}-${part}.jpg`;
    await page.screenshot({ path, type: 'jpeg', quality: 55, clip });
    expect(statSync(path).size, `${name}-${part}.jpg ≤ 60 KB`).toBeLessThanOrEqual(60 * 1024);
  }
}

test('physiology console: monitor + organ tree; phenylephrine → one log entry, SVR delta positive', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Chromium only: on the CI runner headless WebKit never turned the command log entry from pending to ok within 5 s (3 attempts, G7x); Safari behaviour is checked by hand in the LAN tests (7x.1)');
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  // The worker's time from construction to its 'ready' message, printed with the render path (READY_TIMEOUT_MS is 2 s)
  await page.addInitScript(() => {
    const W = window.Worker;
    window.Worker = class extends W {
      constructor(url: string | URL, o?: WorkerOptions) {
        super(url, o);
        const t = performance.now();
        this.addEventListener('message', (e: MessageEvent<{ type?: string }>) => void (e.data?.type === 'ready' && Object.assign(window, { __pmeWorkerReadyMs: performance.now() - t })));
      }
    };
  });
  await page.goto(`${base}/dev/physiology-console.html`);
  await page.waitForFunction(() => (window as unknown as { __pmeConsole?: Hook }).__pmeConsole?.ready === true);
  await page.selectOption('[data-id="speed"]', '4');
  // the auto-baseline waits for the modeled reflexes to settle: the first truth event at sim ≥ 60 s (×4: ≈ 15 s)
  await page.waitForFunction(() => (window as unknown as { __pmeConsole: Hook }).__pmeConsole.ui.model.baseT !== null, undefined, { timeout: 120_000 });
  await waitSim(page, 61);
  await expect(page.locator('details[data-group="circulation"] tr[data-path="ev.circ.svr"]')).toBeVisible();
  await expect(page.locator('details[data-group="monitor"] tr[data-path="mon.hr"] .v')).toHaveText(/^\d+$/);
  // 7x.1 (FU-3 item 12): the CO2 sampling line starts attached, so the monitor's CO2 tile and mon.etco2 read at rest
  await expect(page.locator('.pme-stile[data-param="CO2"] [data-pme="v"]')).toHaveText(/^\d+$/);
  await expect(page.locator('details[data-group="monitor"] tr[data-path="mon.etco2"] .v')).toHaveText(/^\d+$/);
  await expect(page.locator('.pc-log li')).toHaveCount(0);
  // the truth tree crossed the worker boundary inside the monitor's event batches, pruned and under the 50 KB budget
  const path = await page.evaluate(() => (window as unknown as { __pmeConsole: Hook }).__pmeConsole.renderPath());
  const truth = await page.evaluate(() => (window as unknown as { __pmeConsole: Hook }).__pmeConsole.ui.model.truth);
  const readyMs = await page.evaluate(() => (window as unknown as { __pmeWorkerReadyMs?: number }).__pmeWorkerReadyMs);
  console.log(`render path ${path} (worker ready ${readyMs === undefined ? 'never' : `${Math.round(readyMs)} ms`}); truth ${truth.leaves} leaves, ${truth.bytes} B${truth.truncated ? ' (TRUNCATED)' : ''}`);
  if (test.info().project.name !== 'webkit') expect(path).toMatch(/^worker/);
  expect(truth.bytes).toBeLessThan(50_000);
  await shots(page, 'rest');
  await page.click('[data-act="bolus"]'); // rail defaults: phenylephrine 100 mcg
  await expect(page.locator('.pc-log li[data-kind="cmd"]')).toHaveCount(1);
  await expect(page.locator('.pc-log li').first()).toHaveClass('ok');
  await expect(page.locator('.pc-log li').first()).toContainText('phenylephrine 100 mcg iv');
  const t0 = await simT(page);
  await waitSim(page, t0 + 40);
  const svr = page.locator('tr[data-path="ev.circ.svr"]');
  await expect(svr.locator('.d')).toHaveText(/^\+\d+/);
  await expect(svr).toHaveClass('up');
  await shots(page, 'phenylephrine-40s');
  await page.check('[data-id="changed"]');
  await shots(page, 'phenylephrine-changed-only');
  expect(errors).toEqual([]);
});
