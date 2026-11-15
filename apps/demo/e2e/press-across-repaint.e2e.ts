// The dropped press (roadmap, "Classroom defects": a press dropped when its button is rebuilt under the pointer; WebKit
// seen — ui-polish-a UI-A #5 9 of 10 at 1920 × 1080, teach2-fit rows left "ready" 10 s after the click). The first
// Instructor view's scenario panel rebuilt every "What happens next" button (`next.replaceChildren`) on each repaint, so a
// press whose down and up straddle a repaint landed on a removed node and the step never happened; Instructor v2's ACTION
// moved every row into new <li> elements when the order changed. Here a repaint is FORCED between the press and the
// release, 20 times (Playwright runs the file on Chromium and on WebKit), and every press must take. The forced repaint
// is the view's own: Instructor v2 repaints at once when it is entered (views/teach2.ts paintNow). The first view's
// twin of this test (its Scenario tab, repainted by selecting the tab) retired with that view (retire-instructor-v1
// PR 3): this test holds the same intent on the only laptop view.
// The step pressed gives NO drug (the awake patient's "Preoxygenate", whose state gives face-mask oxygen): since the
// owner's ruling of 5 November 2026 the host refuses a step whose state gives a bolus of a drug given in the last 10 s
// of sim time (drug-lock.ts), so twenty presses of "Start surgery" (rocuronium) a few seconds apart were refused by
// design ("given 3 s ago by the card"). A drug-free step keeps the test's purpose — a press across a forced repaint
// takes — without waiting out the lock, and without a fast-forward (paced to ≈ 10 s of wall time, twenty would not fit).
import { expect, test, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

const RUNS = 20;
const PREOX = 'Preoxygenate: 100 % O₂ by face mask';
type W = { __pmeApp: { link: { send(c: unknown): Promise<{ accepted: boolean }>; ctl: { scenario: { stateId: string | null } } }; teach2: { enter(): void } } };
const stateId = (p: Page) => p.evaluate(() => (window as unknown as W).__pmeApp.link.ctl.scenario.stateId);
const goto = async (p: Page, target: string) => {
  expect(await p.evaluate((t) => (window as unknown as W).__pmeApp.link.send({ type: 'scenario', action: 'goto', target: t }).then((r) => r.accepted), target)).toBe(true);
  await expect.poll(() => stateId(p)).toBe(target);
};
/** Press `button`, force `repaint` while it is held, release: the press must take (the case reaches "preoxygenated"). */
async function pressAcrossRepaint(p: Page, button: import('@playwright/test').Locator, repaint: () => Promise<void>): Promise<void> {
  // into view through its list, which stays (on main the button itself is rebuilt twice a second and may be gone)
  await button.evaluate((b) => b.closest('ul, ol')?.scrollIntoView({ block: 'center' })).catch(() => undefined);
  const box = await button.boundingBox();
  if (!box) throw new Error('no button box');
  // the press must start ON the button: what is under the pointer is the button (or a node inside it)
  expect(await p.evaluate(([x, y]) => document.elementFromPoint(x as number, y as number)?.closest('button')?.textContent ?? null, [box.x + box.width / 2, box.y + box.height / 2])).toContain('Preoxygenate');
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down();
  await repaint();
  await p.mouse.up();
}

test('Instructor v2: an ACTION row press across a forced repaint takes, 20 of 20', async ({ page }) => {
  test.setTimeout(180_000);
  await openApp(page, base, '?scenario=showcase-mh#/teach2', { warmMs: 1000 });
  let taken = 0;
  for (let i = 0; i < RUNS; i++) {
    await goto(page, 'awake');
    const b = page.locator('.ip2-action .ip2-rows:not(.ip2-finished-list) button.ip2-row').filter({ hasText: PREOX });
    await b.waitFor();
    await pressAcrossRepaint(page, b, () => page.evaluate(() => (window as unknown as W).__pmeApp.teach2.enter()));
    if (await expect.poll(() => stateId(page), { timeout: 3000 }).toBe('preoxygenated').then(() => true, () => false)) taken++;
  }
  expect(taken, `presses taken of ${RUNS}`).toBe(RUNS);
});
