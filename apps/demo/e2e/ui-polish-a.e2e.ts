// UI-A (the read-only demo UI review of 24 October, rows #5, #8 and #9): what the projected Instructor view shows the
// audience. #5 — the scenario panel's long "What happens next" buttons wrap inside the panel at 1280 wide (they were cut
// at its edge). #8 — the toasts after the cue card's Load · All alarms on · Bookmark · ×8 stay off the monitor stage.
// #9 — the fast-forward banner sits under the nav and the session bar (it covered both), is not shown on the Debrief,
// and neither it nor a toast prints.
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type Box = { x: number; y: number; width: number; height: number };
const meets = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const run = (p: Page) => p.locator('section[aria-label="Running scenario"]');
const press = (p: Page, label: string) => run(p).getByRole('button', { name: label, exact: true }).click();

for (const [w, h] of [[1280, 800], [1920, 1080]] as const) {
  test(`UI-A #5 scenario panel at ${w} × ${h}: the long "What happens next" buttons wrap inside the panel`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: w, height: h });
    await openApp(page, base, '?scenario=showcase-mh', { warmMs: 1500 });
    await page.click('[role=tab][data-tab=scenario]');
    await press(page, 'Premedicate: midazolam 2 mg, fentanyl 100 µg');
    await press(page, 'Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg');
    const intubate = run(page).getByRole('button', { name: 'Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %', exact: true });
    await expect(intubate).toBeVisible({ timeout: 15_000 });
    const fit = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('section[aria-label="Running scenario"] ul.next button')].map((b) => {
        const r = b.getBoundingClientRect();
        const list = (b.closest('ul.next') as HTMLElement).getBoundingClientRect();
        const cs = getComputedStyle(b);
        return { t: b.textContent, over: b.scrollWidth - b.clientWidth, right: r.right - list.right, h: r.height, minH: parseFloat(cs.minHeight), align: cs.textAlign };
      }),
    );
    console.log(`UI-A #5 ${w}x${h}: ${JSON.stringify(fit)}`);
    expect(fit.length).toBeGreaterThan(1);
    for (const b of fit) {
      expect(b.over, `"${b.t}" clipped`).toBeLessThanOrEqual(1);
      expect(b.right, `"${b.t}" past the panel's edge`).toBeLessThanOrEqual(0.5);
      expect(b.h).toBeGreaterThanOrEqual(b.minH - 0.5); // the small buttons' rhythm: one line keeps its 32 px
      expect(b.align).toBe('left');
    }
    // other buttons keep their one-line look
    const bm = await run(page).getByRole('button', { name: 'Bookmark', exact: true }).evaluate((b) => getComputedStyle(b).whiteSpace);
    expect(bm).toBe('nowrap');
  });
}
