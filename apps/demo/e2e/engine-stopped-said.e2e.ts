// Brief 195: a stopped engine is said, never silent — end to end, through a REAL relay in its own process. The
// instructor's engine is stopped by an error in its frame step (the test makes the canvas the step draws on throw: a
// browser API, the boundary this test owns; nothing in the product is switched). The instructor's page says the
// simulation has stopped, why, and the ways on; the phone says the instructor's simulation has stopped — and keeps
// saying it well past the 5 s after which a silent host is "not answering", because the host still says so every
// second. The instructor restarts the patient and the phone follows again.
// Before brief 195 the worker-pump path froze with only a console line, and on every path the phone said "The
// instructor's monitor is not answering" three seconds after the stop, as for a host that had left.
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { devices, expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: ChildProcessWithoutNullStreams | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => {
  if (relay && relay.exitCode === null && relay.signalCode === null) {
    relay.kill('SIGTERM');
    await once(relay, 'exit');
  }
  relay = null;
});

/** The classroom relay (phones may only follow) in a process of its own; its port. PME_E2E_RELAY_PORT: a fixed port per
 *  Playwright worker (that port + TEST_PARALLEL_INDEX), as mobile-learner.e2e.ts takes it. */
async function relayProcess(): Promise<number> {
  const server = resolve(import.meta.dirname, '../../../packages/controller/relay/server.ts');
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  const port = fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0;
  const src = `import {startRelay} from ${JSON.stringify(server)};const r=await startRelay({host:'127.0.0.1',port:${port},remoteRoles:'viewer'});process.stdout.write('port '+r.port+'\\n');process.on('SIGTERM',async()=>{await r.close();process.exit(0)});`;
  const child = spawn(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', src], { stdio: ['ignore', 'pipe', 'pipe'] });
  relay = child;
  let out = '';
  return new Promise<number>((ok, no) => {
    const read = (d: Buffer) => {
      out += String(d);
      const m = /port (\d+)/.exec(out);
      if (m) ok(Number(m[1]));
    };
    child.stdout.on('data', read);
    child.stderr.on('data', read);
    child.once('exit', (code) => no(new Error(`the relay exited before it was ready (${code}): ${out}`)));
  });
}

type W = { __pmeApp: { session: { code: string; monitor: { renderPath: Promise<string> } }; link: { simT: number } }; __pmeFollower: { sync: { status: string; lagS: number } | null } };
const STOPPED_PHONE = "The instructor's simulation has stopped with an error: waiting for the instructor to restart it";
const BOOM = 'the test made the canvas throw';

/** Make the instructor's engine throw in its frame step: every draw on the monitor's canvas throws from now on. */
async function breakTheFrameStep(page: Page): Promise<string> {
  const path = await page.evaluate(() => (window as unknown as W).__pmeApp.session.monitor.renderPath);
  const throwing = (msg: string) => (ctx: Record<string, unknown>) => {
    for (const k of ['clearRect', 'fillRect', 'stroke', 'fill', 'drawImage', 'putImageData', 'fillText', 'lineTo', 'moveTo']) ctx[k] = () => { throw new Error(msg); };
  };
  if (path === 'main') {
    // the monitor's own 2D context (getContext returns the one the core draws with): this canvas only
    await page.evaluate(`(${throwing.toString()})(${JSON.stringify(BOOM)})(document.querySelector('.monitor-host canvas').getContext('2d'))`);
    return path;
  }
  // the engine worker (named 'pme-engine'): the prototype of the only context it holds, the monitor's
  let engine = null;
  for (const w of page.workers()) if ((await w.evaluate(() => (globalThis as { name?: string }).name).catch(() => '')) === 'pme-engine') engine = w;
  if (!engine) throw new Error(`no engine worker on the ${path} path`);
  await engine.evaluate(`(${throwing.toString()})(${JSON.stringify(BOOM)})(OffscreenCanvasRenderingContext2D.prototype)`);
  return path;
}

test("the instructor's engine stops on an error: the page says why and how to carry on, the phone says the simulation has stopped, and follows again after a restart", async ({ page, browser, browserName }) => {
  test.setTimeout(120_000);
  const port = await relayProcess();
  const ws = `ws://127.0.0.1:${port}/`;
  await openApp(page, base, `?relay=${encodeURIComponent(ws)}&scenario=showcase-induction#/teach2`, { warmMs: 1500 });
  const code = await page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const phone = await (await browser.newContext(dev)).newPage();
  await phone.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws)}`);
  const pill = phone.locator('.follower-bar .status-pill');
  await expect(pill).toHaveText(`Following session ${code}`, { timeout: 30_000 });

  const path = await breakTheFrameStep(page);
  test.info().annotations.push({ type: 'render path', description: path });
  console.log(`[brief 195] ${browserName}: the instructor's monitor runs on ${path}`);
  // the instructor's page: the notice, its reason and its two ways on (the toast as before)
  const notice = page.locator('.engine-stopped[role="alert"]');
  await expect(notice.locator('h2')).toHaveText('The simulation has stopped', { timeout: 10_000 });
  await expect(notice).toContainText(`Reason: an error in the simulation: ${BOOM}.`);
  await expect(notice.getByRole('button', { name: 'Restart the patient' })).toBeVisible();
  await expect(notice.getByRole('button', { name: 'Reload this page' })).toBeVisible();
  await expect(page.locator('.toast', { hasText: 'The monitor stopped — Restart the patient' })).toBeVisible();
  const frozenAt = await page.evaluate(() => (window as unknown as W).__pmeApp.link.simT);
  // the phone: the truth at once, and still the truth past the 5 s a silent host is given (8 s here), never "not answering"
  await expect(pill).toHaveText(STOPPED_PHONE, { timeout: 5_000 });
  for (let i = 0; i < 8; i++) {
    await phone.waitForTimeout(1000);
    await expect(pill, `${i + 1} s after the phone was told (render path ${path})`).toHaveText(STOPPED_PHONE, { timeout: 100 });
  }

  // the instructor carries on: a restart is a new engine; the notice goes, the clock runs, the phone follows again
  await notice.getByRole('button', { name: 'Restart the patient' }).click();
  await expect(notice).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__pmeApp.link.simT), { timeout: 10_000 }).toBeGreaterThan(1);
  expect(frozenAt).toBeGreaterThan(0);
  await expect(pill).toHaveText(`Following session ${code}`, { timeout: 30_000 });
  await expect.poll(() => phone.evaluate(() => (window as unknown as W).__pmeFollower.sync?.status), { timeout: 30_000 }).toBe('synced');
  await expect.poll(() => phone.evaluate(() => (window as unknown as W).__pmeFollower.sync?.lagS ?? Infinity), { timeout: 15_000 }).toBeLessThan(0.5);
  await phone.context().close();
});
