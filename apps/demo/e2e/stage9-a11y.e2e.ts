// WCAG 2.2 AA audit of every view at a laptop and an iPad size, with no dependency (research/13 brief §9, §11.4;
// axe-core is Ali's question Q8). Targets ≥ 24 px (44 px in the instructor panel on a touch screen), names on every
// control, text contrast from the rendered colours, no sideways scroll, no clipped button labels, one h1, a main
// landmark, and a visible focus indicator on the first 25 tab stops.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { audit, EXPLORE, focusWalk, go, openApp, startVite, TABS, tab } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

for (const [name, vp, touch] of [['laptop 1280×800', { width: 1280, height: 800 }, false], ['iPad portrait 820×1180', { width: 820, height: 1180 }, true]] as const) {
  test(`accessibility: ${name}`, async ({ browser }) => {
    test.setTimeout(150_000);
    const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
    const page = await ctx.newPage();
    await openApp(page, base, '?scenario=acls-vf-witnessed', { warmMs: 3000 });
    const found: string[] = [];
    const run = async (where: string) => found.push(...(await audit(page, { touchPanel: touch })).map((f) => `${where} ${f.rule}: ${f.what}`));
    for (const t of TABS) {
      await tab(page, t);
      await run(`teach/${t}`);
    }
    for (const r of ['#/', '#/monitor', '#/remote', '#/settings', '#/dev', '#/validate', ...EXPLORE.slice(0, 3).map((s) => `#/explore/${s}`)]) {
      await go(page, r);
      await run(r);
    }
    await go(page, '#/teach');
    found.push(...(await focusWalk(page)).map((f) => `focus: ${f}`));
    await ctx.close();
    expect(found).toEqual([]);
  });
}
