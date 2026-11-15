// R15 (classroom): under load the instructor's own engine applied a two-command stage group on two ticks — the host
// dispatched the group's commands one at a time, each after the previous one's round trip to the monitor's worker, and a
// busy worker ran past the group's tick in between. Here the real worker is loaded: a 60 s fast-forward step keeps it busy
// while the host submits E126's rhythm check (cpr off + VF, one stage group), as the scenario runner does; both
// commands must land on one tick. The worker answers in order, so the busy step delays both. On Instructor v2 (the one
// instructor view since #323; `#/teach` now opens it).
import { expect, test } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type R = { accepted: boolean; tick: number };
type W = { __pmeApp: { session: {
  monitor: { renderPath: Promise<string>; advance(ticks: number, last: boolean): Promise<unknown> };
  host: { submit(c: unknown): Promise<R> };
} } };

test('a stage group submitted while the worker is busy lands on one tick', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, base, '#/teach2', { warmMs: 1500 });
  const path = await page.evaluate(() => (window as unknown as W).__pmeApp.session.monitor.renderPath);
  expect(path).toMatch(/^worker/); // the round trip under test is the worker's
  const runs: Array<[number, number]> = [];
  for (let i = 0; i < 5; i++) {
    const r = await page.evaluate(async (k) => {
      const s = (window as unknown as W).__pmeApp.session;
      const busy = s.monitor.advance(3000, true); // ≈ 60 s of sim in one worker task
      const g = `r15-${k}`;
      const a = s.host.submit({ id: `${g}-0`, issuedBy: 'scenario', type: 'applyEvent', event: { kind: 'cpr', active: k % 2 === 0 }, stageGroup: g });
      const b = s.host.submit({ id: `${g}-1`, issuedBy: 'scenario', type: 'setRhythm', rhythm: k % 2 ? 'sinus' : 'vfCoarse', when: 'now', stageGroup: g });
      await busy;
      const [ra, rb] = await Promise.all([a, b]);
      return [ra.accepted && rb.accepted ? ra.tick : -1, rb.tick] as [number, number];
    }, i);
    runs.push(r);
  }
  console.log('stage-group ticks', JSON.stringify(runs));
  for (const [a, b] of runs) {
    expect(a).toBeGreaterThan(0);
    expect(b, `one tick (${JSON.stringify(runs)})`).toBe(a);
  }
});
