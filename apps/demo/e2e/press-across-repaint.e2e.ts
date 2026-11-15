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
import { expect, test, type Locator, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { holdAcross, openApp, sheet, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
let relay: RelayHandle | null = null;
test.afterEach(async () => {
  await relay?.close();
  relay = null;
});

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

// Each surface below repaints by itself while a press is held over its words (WebKit takes the text node under the
// pointer as the pressed node) or over a control it used to rebuild (every engine): the press must still take.

/** Until `loc`'s text is no longer what it is now: the view has repainted it. */
const repainted = async (loc: Locator) => {
  const now = await loc.textContent();
  await expect(loc).not.toHaveText(now ?? '');
};
const paintNow = (p: Page) => p.evaluate(() => (window as unknown as W).__pmeApp.teach2.enter());

test('the Hamilton-style face: Silence held on the alarm banner\'s words across frames takes', async ({ page }) => {
  await page.goto(`${base}/vent-hamilton.html`);
  const banner = page.locator('#alarmBanner');
  await expect(banner).toHaveText(/\S/);
  await holdAcross(page, banner, () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))));
  await expect(banner).toHaveClass('silenced');
});

test('Instructor v2: the header\'s pill, Sound switch and Room link held across a repaint take; a step row held over its ticking lock', async ({ page }) => {
  await openApp(page, base, '?scenario=showcase-mh-v2#/teach2', { warmMs: 1000 });
  const pill = page.locator('.ip2-pill');
  await holdAcross(page, pill.locator('.ip2-pill-time'), () => repainted(pill.locator('.ip2-pill-time')));
  await expect(pill).toHaveAttribute('data-state', 'paused');
  await pill.click();
  await expect(pill).toHaveAttribute('data-state', 'running');
  const sound = page.locator('.ip2-sound');
  const was = await sound.getAttribute('aria-pressed');
  await holdAcross(page, sound, () => paintNow(page));
  await expect(sound).not.toHaveAttribute('aria-pressed', was ?? '');
  // a drug given locks the row that gives it, whose label counts the lock down every second: the press reads the lock
  expect(await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'applyEvent', event: { kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' } }).then((r) => r.accepted))).toBe(true);
  const right = page.locator('.ip2-action button.ip2-row', { hasText: 'Start surgery' }).locator('.ip2-row-right');
  await expect(right).toHaveText(/s left$/);
  await holdAcross(page, right, () => repainted(right));
  await expect(page.locator('.toast').last()).toHaveText(/^Start surgery.*: not given \(/);
  await holdAcross(page, page.locator('.ip2-room'), () => paintNow(page));
  await expect(page).toHaveURL(/#\/room$/);
});

test('the Drug sheet: a pick held over its tag while the lock counts down takes', async ({ page }) => {
  await openApp(page, base, '#/teach2', { warmMs: 1000 });
  expect(await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'applyEvent', event: { kind: 'drug', drugId: 'atropine', dose: 0.5, unit: 'mg', route: 'iv' } }).then((r) => r.accepted))).toBe(true);
  const s = await sheet(page, 'drug');
  await s.locator('[data-group="all"]').click();
  const pick = s.locator('.ip2-pick[data-key="drug:atropine"]');
  await expect(pick.locator('.ip2-pick-tag')).toHaveText(/s left$/);
  await holdAcross(page, pick.locator('.ip2-pick-tag'), () => repainted(pick.locator('.ip2-pick-tag')));
  await expect(pick).toHaveAttribute('aria-pressed', 'true');
});

test('Room setup: an opener held across the page\'s one-second redraw takes', async ({ page }) => {
  await openApp(page, base, '#/room');
  const rows = page.locator('.room-table tbody');
  await expect(rows).toBeVisible();
  const redraw = () => page.evaluate(() => new Promise<void>((r) => {
    const mo = new MutationObserver(() => (mo.disconnect(), r()));
    mo.observe(document.querySelector('.room-table tbody') as Node, { childList: true });
  }));
  await holdAcross(page, page.locator('.room-openers .join-card[data-show="vent"] a', { hasText: 'Open here' }), redraw);
  await expect(page).toHaveURL(/#\/vent$/);
});

test("the instructor's phone: \"Hold the timer\" and the mode badge held across its repaint take", async ({ page, context }) => {
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  relay = await startRelay({ port: fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0, host: '127.0.0.1' });
  const ws = `ws://127.0.0.1:${relay.port}/`;
  await openApp(page, base, `?relay=${encodeURIComponent(ws)}&scenario=showcase-mh#/teach2`, { warmMs: 1500 });
  const code = await page.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);
  const pin = (await page.evaluate(() => localStorage.getItem('pme.instructorPin'))) as string;
  const phone = await context.newPage();
  await phone.goto(`${base}/?relay=${encodeURIComponent(ws)}#/remote?code=${code}`);
  for (const d of pin) await phone.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
  await phone.locator('.ip-peer-go').click();
  await expect(phone.locator('.ip-peer-status')).toHaveText(`Signed in as the instructor's remote · ${code}`, { timeout: 15_000 });
  // the case drawn on the phone, its bar's scenario line included, so nothing is still to arrive above the press
  await expect(phone.locator('ul.next button', { hasText: 'Preoxygenate' })).toBeVisible();
  await expect(phone.locator('.scen')).toHaveText(/^Malignant hyperthermia/);
  const clock = phone.locator('.clock');
  const hold = phone.getByRole('button', { name: 'Hold the timer' });
  await holdAcross(phone, hold, () => repainted(clock));
  await expect(phone.getByRole('button', { name: 'Resume the timer' })).toBeVisible();
  await holdAcross(phone, phone.locator('.mode-badge'), () => repainted(clock));
  await expect(phone.locator('dialog[open]')).toBeVisible();
  await phone.close();
});
