// WHERE A NEW ACCESSIBILITY CASE GOES: at the END of its area's file, app-accessibility-<area>.e2e.ts (views, instructor-phone, learner-phone, pump, ventilator).
// An area with no file yet (the defibrillator window, the depth window, …) gets a NEW file app-accessibility-<area>.e2e.ts, started with `serveApp`.
// Never edit this helper or another area's file to add a case: this is the set-up every area file shares (brief 219: one file per area, no shared line).
//
// WCAG 2.2 AA audit of every view at a laptop and an iPad size, with no dependency (research/13 brief §9, §11.4;
// axe-core is the owner's question Q8). Targets ≥ 24 px (44 px in the instructor panel on a touch screen), names on every
// control, text contrast from the rendered colours, no sideways scroll, no clipped button labels, one h1, a main
// landmark, and a visible focus indicator on the first 25 tab stops.
// Not a test file (testMatch is *.e2e.ts). The audits themselves (audit, focusWalk) live in app-support.ts.
import type { ViteDevServer } from 'vite';
import { test } from './evidence.ts';
import { startVite } from './app-support.ts';

export { expect, test, type Page } from './evidence.ts';
export { startRelay } from '../../../packages/controller/relay/server.ts';
export { audit, closeSheets, EXPLORE, focusWalk, go, openApp, sheet, type SheetId, TABS, tab, TEACH2 } from './app-support.ts';

/** One Vite dev server per area file (as the single file had): started before its cases, closed after them; `onBase` is
 *  given its address. */
export function serveApp(onBase: (base: string) => void): void {
  let vite: ViteDevServer | undefined;
  test.beforeAll(async () => {
    const s = await startVite();
    vite = s.vite;
    onBase(s.base);
  });
  test.afterAll(async () => vite?.close());
}
