// Stage 6a latency measurement (docs/gates/stage-6a.md; BUILD-PLAN Stage 6 acceptance 1; research 05 §3.2
// budget 70–140 ms). For each path: N commands, 100 ms apart, from the panel (in-process), a remote over
// BroadcastChannel, over the relay (WebSocket) and over WebRTC — all on this machine (localhost).
//   ack      = remote send → ack back at the remote
//   visible  = remote send → first host animation frame whose drawn sim time reaches the command's tick
// Run: PW_SYSTEM_CHROME=1 LAT_N=200 pnpm exec playwright test apps/demo/e2e/stage6a-latency.e2e.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';

test.use({ launchOptions: { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] } });
test.setTimeout(600_000);

const N = Number(process.env.LAT_N ?? 200);
let vite: ViteDevServer;
let relay: RelayHandle;
let base = '';
let relayUrl = '';

test.beforeAll(async () => {
  relay = await startRelay({ port: 0, host: '127.0.0.1' });
  relayUrl = `ws://127.0.0.1:${relay.port}/`;
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
test.afterAll(async () => {
  await vite?.close();
  await relay?.close();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type W = { __pme6a: Record<string, any> };
async function g<T>(p: Page, fn: (w: W) => T): Promise<T> {
  await p.waitForFunction(() => '__pme6a' in window);
  return p.evaluate(`(${fn.toString()})(window)`) as Promise<T>;
}
type Fired = { commandId: string; sentAt: number; ackAt: number; accepted: boolean };
const pct = (a: number[], p: number) => a[Math.min(a.length - 1, Math.floor(p * a.length))] as number;
const stats = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  return { n: a.length, min: a[0] as number, p50: pct(a, 0.5), p95: pct(a, 0.95), max: a[a.length - 1] as number };
};

test('command → ack → visible latency on four paths', async ({ page }) => {
  const results: Record<string, { ack: ReturnType<typeof stats>; visible: ReturnType<typeof stats> }> = {};
  for (const path of ['in-process', 'bc', 'relay', 'rtc'] as const) {
    const relayQ = path === 'relay' || path === 'rtc' ? `&relay=${encodeURIComponent(relayUrl)}` : '';
    const session = { 'in-process': 'QATAAA', bc: 'QATBBB', relay: 'QATCCC', rtc: 'QATDDD' }[path];
    await page.goto(`${base}/stage6a.html?session=${session}${relayQ}`);
    let sender = page;
    let fire = (w: W) => w.__pme6a.firePanel();
    if (path !== 'in-process') {
      sender = await page.context().newPage();
      await sender.goto(`${base}/stage6a-remote.html?session=${session}&via=${path}${relayQ}`);
      await expect.poll(() => g(sender, (w) => w.__pme6a.remote.session?.hostOnline === true), { timeout: 15_000 }).toBe(true);
      fire = (w: W) => w.__pme6a.fire();
    }
    await page.waitForTimeout(1000);
    const fired: Fired[] = [];
    for (let i = 0; i < N; i++) {
      fired.push(await g(sender, fire));
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(500);
    const timings = await g(page, (w) => w.__pme6a.timings as Array<{ commandId: string; visibleAt: number | null }>);
    const byId = new Map(timings.map((t) => [t.commandId, t.visibleAt]));
    expect(fired.every((f) => f.accepted)).toBe(true);
    results[path] = {
      ack: stats(fired.map((f) => f.ackAt - f.sentAt)),
      visible: stats(fired.map((f) => (byId.get(f.commandId) ?? Number.NaN) - f.sentAt)),
    };
    if (sender !== page) await sender.close();
  }
  const out = resolve(import.meta.dirname, '../../../docs/gates/stage-6a');
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, 'latency.json'), `${JSON.stringify({ n: N, measuredAt: new Date().toISOString(), results }, null, 2)}\n`);
  for (const [k, v] of Object.entries(results)) {
    console.log(`${k.padEnd(10)} ack p50 ${v.ack.p50.toFixed(1)} p95 ${v.ack.p95.toFixed(1)} | visible p50 ${v.visible.p50.toFixed(1)} p95 ${v.visible.p95.toFixed(1)} max ${v.visible.max.toFixed(1)} ms`);
  }
  expect(results['in-process']!.visible.p95).toBeLessThanOrEqual(60); // BUILD-PLAN Stage 6 acceptance 1
  expect(results.relay!.visible.p95).toBeLessThanOrEqual(150);
});
