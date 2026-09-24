// Renderer requests R-1/R-2 (ruling R25) in a real browser, through the IIFE from file://: PatientMonitor.transports
// carries the five adapters, and MonitorHandle.snapshot()/restore()/role work on the worker path and on the
// main-thread path. Needs `npx -y pnpm@9.15.9 --filter @pme/renderer build` first (as iife-smoke does).
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

const smokeUrl = pathToFileURL(resolve(import.meta.dirname, 'iife-smoke.html')).href;

type Snap = { schema: string; tick: number };
type Handle = { role: string; renderPath: Promise<string>; snapshot(): Promise<Snap>; restore(s: Snap): Promise<void>; destroy(): void };
type PM = { transports: Record<string, unknown>; mountMonitor(el: HTMLElement, o: object): Handle };

test('PatientMonitor.transports has the five adapters', async ({ page }) => {
  await page.goto(smokeUrl);
  const keys = await page.evaluate(() => {
    const pm = (window as unknown as { PatientMonitor: PM }).PatientMonitor;
    return Object.entries(pm.transports).map(([k, v]) => `${k}:${typeof v}`).sort();
  });
  expect(keys).toEqual(['broadcastChannel:function', 'inProcess:function', 'postMessage:function', 'webrtc:function', 'websocket:function']);
});

for (const worker of ['auto', 'off'] as const) {
  test(`MonitorHandle snapshot/restore/role (worker: ${worker})`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(smokeUrl);
    const r = await page.evaluate(async (w) => {
      const pm = (window as unknown as { PatientMonitor: PM }).PatientMonitor;
      const h = pm.mountMonitor(document.getElementById('pm')!, { engine: { seed: 5 }, worker: w, role: 'viewer' });
      const path = await h.renderPath;
      const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
      await sleep(1000);
      const a = await h.snapshot();
      await sleep(1500);
      const b = await h.snapshot();
      await h.restore(a);
      const c = await h.snapshot();
      let refused = '';
      await h.restore({ schema: 'nope', tick: 0 }).catch((e: Error) => (refused = e.message));
      h.destroy();
      return { path, role: h.role, schema: a.schema, a: a.tick, b: b.tick, c: c.tick, refused };
    }, worker);
    console.log(worker, JSON.stringify(r));
    expect(r.role).toBe('viewer');
    expect(r.path).toBe(worker === 'off' ? 'main' : r.path);
    expect(r.schema).toBe('pme-snapshot/1');
    expect(r.b).toBeGreaterThan(r.a + 50); // ≥ 1 s at 50 ticks/s
    expect(r.c).toBeGreaterThanOrEqual(r.a); // back at the snapshot (plus any frame drawn in between)
    expect(r.c).toBeLessThan(r.a + 10);
    expect(r.refused).toMatch(/schema/);
    expect(errors).toEqual([]);
  });
}
