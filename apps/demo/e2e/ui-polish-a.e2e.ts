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

  test(`UI-A #8 scenario Load at ${w} × ${h}: the toasts stay off the monitor stage`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: w, height: h });
    await openApp(page, base, '#/teach', { warmMs: 1500 });
    const allOn = async () => {
      await page.click('[role=tab][data-tab=devices]');
      await page.getByRole('button', { name: 'All alarms on', exact: true }).click();
    };
    await allOn();
    await page.click('[role=tab][data-tab=scenario]');
    await page.locator('.chip-btn', { hasText: 'Showcase' }).click();
    const card = page.locator('section[aria-label="Scenario library"] article.scard').filter({ has: page.locator('h3', { hasText: 'Malignant hyperthermia' }) });
    await card.locator('button', { hasText: 'Load' }).first().click();
    const confirm = page.getByRole('button', { name: 'Load scenario', exact: true });
    if (await confirm.waitFor({ timeout: 1500 }).then(() => true, () => false)) await confirm.click();
    await expect(run(page)).toContainText('Malignant hyperthermia', { timeout: 15_000 }); // loaded (its own toast may be gone on a loaded machine)
    await allOn();
    await page.click('[role=tab][data-tab=scenario]');
    const bar = page.locator('.sessionbar');
    await bar.getByRole('button', { name: 'Bookmark' }).click();
    await bar.getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: '×8' }).click();
    // A toast lives 4 s, which a slow runner can outlast (CI WebKit): the placement is the stack's, so a probe of each
    // kind that stays is measured beside whatever real toasts are still up (the same durable idea as #136's log read)
    const probe = (kind: string) =>
      page.evaluate((kind) => {
        const host = document.querySelector('.toasts') as HTMLElement;
        const t = Object.assign(document.createElement('div'), { className: 'toast uia-probe', textContent: `probe ${kind}` });
        t.dataset.kind = kind;
        host.append(t);
      }, kind);
    await probe('info');
    const toasts = await page.locator('.toast').evaluateAll((ts) => ts.map((t) => t.getBoundingClientRect().toJSON() as Box));
    const stage = (await page.locator('.stage').boundingBox()) as Box;
    const nav = (await page.locator('.topbar').boundingBox()) as Box;
    const sbar = (await bar.boundingBox()) as Box;
    console.log(`UI-A #8 ${w}x${h}: stage ${JSON.stringify(stage)} toasts (${toasts.length - 1} real + probe) ${JSON.stringify(toasts)}`);
    expect(toasts.length).toBeGreaterThanOrEqual(1);
    for (const t of toasts) {
      expect(meets(t, stage), `a toast over the monitor stage ${JSON.stringify(t)}`).toBe(false);
      expect(meets(t, nav) || meets(t, sbar), 'a toast over the nav or the session bar').toBe(false);
      expect(t.x + t.width).toBeLessThanOrEqual(w);
      expect(t.y + t.height).toBeLessThanOrEqual(h);
    }
    // the Monitor view, the device alone: the instructor's feedback stays off it, an alert ("The monitor stopped", a
    // refusal) and the learner controls' own feedback show (monitor-worker-stopped.e2e.ts: the real alert)
    await page.evaluate(() => (location.hash = '#/monitor'));
    await probe('alert');
    await probe('monitor');
    await expect(page.locator('.toast[data-kind="info"]').first()).toBeHidden();
    await expect.poll(() => page.locator('.toast[data-kind="info"]').evaluateAll((ts) => ts.filter((t) => (t as HTMLElement).offsetParent !== null).length)).toBe(0);
    await expect(page.locator('.uia-probe[data-kind="alert"]')).toBeVisible();
    await expect(page.locator('.uia-probe[data-kind="monitor"]')).toBeVisible();
    // the full-page start (#131, no bars, no stage): toasts bottom-centre; back on the Instructor view, under the bars again
    await page.evaluate(() => (location.hash = '#/start'));
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--chrome-bottom').trim())).toBe('0px');
    expect(await page.locator('.toasts').evaluate((e) => getComputedStyle(e).bottom)).not.toBe('auto');
    await page.evaluate(() => (location.hash = '#/teach'));
    await expect(page.locator('.sessionbar')).toBeVisible();
    await expect.poll(async () => {
      const t = await page.locator('.uia-probe[data-kind="info"]').evaluate((e) => e.getBoundingClientRect().toJSON() as Box);
      const b = (await bar.boundingBox()) as Box;
      return t.y >= b.y + b.height && !meets(t, (await page.locator('.stage').boundingBox()) as Box);
    }).toBe(true);
    await page.evaluate(() => document.querySelectorAll('.uia-probe').forEach((e) => e.remove()));
  });
}

test('UI-A #9 fast-forward: the banner sits under the nav and the session bar, not on the Debrief, never in print', async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page, base, '?scenario=showcase-mh', { warmMs: 1500 });
  const bar = page.locator('.sessionbar');
  await bar.getByRole('button', { name: 'Bookmark' }).click(); // a toast for the print check
  await bar.getByRole('group', { name: 'Fast-forward' }).getByRole('button', { name: 'Fast-forward 2 min' }).click();
  await expect(page.locator('.ff-veil.on')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.ff-veil.on')).toHaveCount(0, { timeout: 60_000 });
  const banner = page.locator('.ff-banner');
  await expect(banner).toBeVisible();
  const b = (await banner.boundingBox()) as Box;
  const nav = (await page.locator('.topbar').boundingBox()) as Box;
  const sbar = (await bar.boundingBox()) as Box;
  const stage = (await page.locator('.stage').boundingBox()) as Box;
  console.log(`UI-A #9 banner ${JSON.stringify(b)} nav ${JSON.stringify(nav)} sessionbar ${JSON.stringify(sbar)}`);
  expect(meets(b, nav), 'the banner over the nav').toBe(false);
  expect(meets(b, sbar), 'the banner over the session bar').toBe(false);
  expect(meets(b, stage), 'the banner over the monitor stage').toBe(false);
  // the nav stays clickable while the banner shows
  await page.locator('nav.rail').getByRole('link', { name: 'Explore physiology' }).click(); // E125: the rail replaced the top bar's tabs
  await expect(page).toHaveURL(/#\/explore/);
  await expect(banner).toBeVisible();
  expect(meets((await banner.boundingBox()) as Box, (await page.locator('.topbar').boundingBox()) as Box)).toBe(false);
  // printed from any view within its 8 s: not on the page
  await page.emulateMedia({ media: 'print' });
  await expect(banner).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await expect(banner).toBeVisible();
  // the Debrief: no banner, on screen or in print
  await page.evaluate(() => (location.hash = '#/teach'));
  await bar.getByRole('link', { name: 'Debrief' }).click();
  await expect(page.locator('[data-view=debrief]').getByRole('heading', { level: 1, name: 'Debrief' })).toBeVisible({ timeout: 15_000 });
  await expect(banner).toBeHidden();
  await page.emulateMedia({ media: 'print' });
  await expect(banner).toBeHidden();
  await expect(page.locator('.toasts')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  // nor a toast printed from another view (print hides them everywhere)
  await page.evaluate(() => (location.hash = '#/teach'));
  await bar.getByRole('button', { name: 'Bookmark' }).click();
  await expect(page.locator('.toasts')).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.toasts')).toBeHidden();
});
