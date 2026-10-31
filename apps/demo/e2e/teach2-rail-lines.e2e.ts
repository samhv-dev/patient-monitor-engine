// Instructor v2 (owner, 31 October): the left rail's two lines sit at the height of the two page lines they mirror —
// the rail's upper divider at the line under the stage strip, the rail foot's border at the line on top of the dock —
// at the laptop's 1440 × 900 and a 1920 × 1080 window, with no case (the 75-px strip, no status line since the owner's
// ruling of 1 November) and with a case loaded: first during its Case briefing, then once the briefing is ended in the
// strip's status line, live (the strip's 40-px status line goes: 115 px, then 75). Both are measured, so they follow the strip whatever height it takes. And the coupling stays on
// teach2: today's Instructor view keeps its rail after a visit to v2.
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { go, openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

/** The tops of the four 1-px lines, in window pixels: the strip's bottom border, the rail's first divider, the dock's top
 *  border and the rail foot's top border; and whether the strip shows no case. */
function lines(page: Page) {
  return page.evaluate(() => {
    const top = (sel: string) => (document.querySelector(sel) as HTMLElement).getBoundingClientRect().top;
    const strip = document.querySelector('.ip2-strip') as HTMLElement;
    return {
      empty: strip.hasAttribute('data-empty'),
      briefing: strip.hasAttribute('data-briefing'),
      stripH: strip.getBoundingClientRect().height,
      strip: strip.getBoundingClientRect().bottom - parseFloat(getComputedStyle(strip).borderBottomWidth),
      railRule: top('.rail .rail-hr'),
      dock: top('.ip2-dock'),
      railFoot: top('.rail .rail-foot'),
    };
  });
}

for (const [w, h] of [[1440, 900], [1920, 1080]] as const) {
  for (const state of ['loaded', 'empty'] as const) {
    test(`teach2 at ${w} × ${h}, ${state === 'loaded' ? 'a case loaded' : 'no case'}: the rail's two lines sit on the strip's and the dock's lines`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ width: w, height: h });
      await openApp(page, base, state === 'loaded' ? '?scenario=showcase-mh#/teach2' : '#/teach2', { warmMs: 1500 });
      const check = async (when: string, stripH: number) => {
        await page.waitForTimeout(500);
        const m = await lines(page);
        console.log(`teach2-rail-lines ${w}x${h} ${when} ${JSON.stringify(m)}`);
        expect(m.stripH, `${when}: the strip's height`).toBeCloseTo(stripH, 0);
        expect(Math.abs(m.railRule - m.strip), `${when}: rail divider ${m.railRule} vs strip line ${m.strip}`).toBeLessThanOrEqual(1);
        expect(Math.abs(m.railFoot - m.dock), `${when}: rail foot ${m.railFoot} vs dock line ${m.dock}`).toBeLessThanOrEqual(1);
      };
      if (state === 'empty') {
        await expect.poll(async () => (await lines(page)).empty, { timeout: 15_000 }).toBe(true);
        await check('no case', 75);
        return;
      }
      await expect.poll(async () => (await lines(page)).briefing, { timeout: 15_000 }).toBe(true);
      await check('case briefing', 115);
      await page.locator('.ip2-strip').getByRole('button', { name: 'End briefing' }).click();
      await expect.poll(async () => (await lines(page)).briefing, { timeout: 15_000 }).toBe(false);
      await check('case running', 75);
    });
  }
}

test("today's Instructor view keeps its rail after a visit to Instructor v2", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const rail = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.rail .rail-hr, .rail .rail-item, .rail .rail-foot, .rail .rail-brand')].map((e) => Math.round(e.getBoundingClientRect().top)));
  await openApp(page, base, '#/teach', { warmMs: 1000 });
  const before = await rail();
  await go(page, '#/teach2', 1000);
  await go(page, '#/teach', 1000);
  expect(await rail()).toEqual(before);
});
