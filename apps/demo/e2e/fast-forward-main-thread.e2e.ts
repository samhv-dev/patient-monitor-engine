// Brief 126 (N47): the monitor on the page's main thread — a browser without OffscreenCanvas transfer, or a worker that
// failed — runs a fast-forward without freezing the page. Before brief 126 a span that fell behind its pace ran as one
// task: at background QoS the panel was never seen, the page drew nothing for 11–13 s and a click came back after the
// span. Here the main thread is forced (no transferControlToOffscreen, so canUseWorker() is false): the panel shows, the
// page keeps drawing frames while the span runs, and the span is the whole span.
import { expect, test } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { ffV2, openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type Win = {
  __frames: number;
  __pmeApp: {
    session: { monitor: { renderPath: Promise<string> } };
    link: { ctl: { fastForward: unknown; lastFastForward: { fromT: number; endT: number } | null } };
  };
};

test('on the main thread a 5-minute fast-forward shows its panel and the page keeps drawing while it runs', async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    delete (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).transferControlToOffscreen;
    const w = window as unknown as Win;
    w.__frames = 0;
    const loop = () => {
      w.__frames++;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  await openApp(page, base, '?scenario=showcase-anaphylaxis#/teach2', { warmMs: 1500 });
  expect(await page.evaluate(() => (window as unknown as Win).__pmeApp.session.monitor.renderPath)).toBe('main');
  const state = () => page.evaluate(() => {
    const w = window as unknown as Win;
    return { frames: w.__frames, running: w.__pmeApp.link.ctl.fastForward !== null };
  });
  await ffV2(page, 5);
  const veil = page.locator('.ff-veil.on');
  await expect(veil, 'the panel shows').toBeVisible({ timeout: 5000 });
  // the page answers while the span runs (before brief 126 this read came back only after the span had ended) …
  const a = await state();
  expect(a.running, 'the page answered during the span').toBe(true);
  // … and draws: a new frame while it runs (before: none from the click to the span's end). CI's Linux WebKit drew one
  // or two a second here (PR #389's run 42778057798), so no rate is asserted, only that frames go on
  await expect.poll(async () => { const s = await state(); return s.running && s.frames > a.frames; }, { timeout: 5000 }).toBe(true);
  await expect(veil).toHaveCount(0, { timeout: 150_000 });
  const ff = await page.evaluate(() => (window as unknown as Win).__pmeApp.link.ctl.lastFastForward);
  expect(ff).not.toBeNull();
  expect((ff as { endT: number }).endT - (ff as { fromT: number }).fromT).toBeCloseTo(300, 6);
  await expect(page.locator('.ff-banner > div').first()).toHaveText('Fast-forwarded 5 min');
});
