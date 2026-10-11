// FU-11 Task G4 (showcase kit K2): a learner monitor opened in a second window FOLLOWS the instructor's session — the
// same patient, clock and numbers, through an instructor command, a bookmark restore, a patient restart, and while the
// Ventilator view drives the patient, across an instructor reload — instead of starting a patient of its own; it opens
// with `noopener` (its own process) and says so when the instructor's window is gone.
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type Sync = { status: string; resyncs: number; beatDriftMs: number; lagS: number };
type W = { __pmeFollower: { sync: Sync | null }; __pmeApp: { session: { code: string; simNow(): number; restart(s: unknown): void; spec: unknown }; link: { send(c: unknown): Promise<{ accepted: boolean }> } } };
const sync = (f: Page) => f.evaluate(() => { const s = (window as unknown as W).__pmeFollower.sync as Sync; return { status: s.status, resyncs: s.resyncs, drift: s.beatDriftMs, lag: s.lagS }; });
const tiles = (p: Page) => p.evaluate(() => [...document.querySelectorAll('.pme-stile')].map((e) => `${(e as HTMLElement).dataset.param}:${e.querySelector('[data-pme="v"]')?.textContent}`).join(' '));
// two windows refresh their numerics on their own frames, so the comparison waits for one moment where every tile agrees
const same = (f: Page, p: Page) => expect.poll(async () => (await tiles(f)) === (await tiles(p)) || `${await tiles(f)} | ${await tiles(p)}`, { timeout: 10_000, intervals: [100] }).toBe(true);
const send = (p: Page, c: unknown) => p.evaluate((x) => (window as unknown as W).__pmeApp.link.send(x), c);

// fix-ci-webkit-2 (diagnostic): on CI's Linux WebKit the follower never reached 'synced' within 30 s (9/9 attempts over
// three pushes; macOS WebKit and CI Chromium pass). The wait polls on a timer, not on the popup's rAF, and a timeout
// reports what each window saw, so the next CI run names the cause instead of a bare timeout.
type Diag = Record<string, unknown>;
const followerDiag = (f: Page) => f.evaluate(() => {
  const w = window as unknown as { __pmeFollower?: { sync: Sync | null; transport: { status: string; rejected: number } }; __pmeApp?: { frames: number[] } };
  const s = w.__pmeFollower?.sync;
  return { mounted: !!w.__pmeFollower, sync: s ? { status: s.status, resyncs: s.resyncs } : null, transport: w.__pmeFollower ? { status: w.__pmeFollower.transport.status, rejected: w.__pmeFollower.transport.rejected } : null, vis: document.visibilityState, focus: document.hasFocus(), frames: w.__pmeApp?.frames.length ?? -1, pill: document.querySelector('.status-pill')?.textContent ?? null };
});
const hostDiag = (p: Page) => p.evaluate(() => {
  const w = window as unknown as { __pmeApp: { frames: number[]; session: { code: string; host: { stats: unknown } } } };
  return { code: w.__pmeApp.session.code, stats: w.__pmeApp.session.host.stats, vis: document.visibilityState, frames: w.__pmeApp.frames.length };
});
/** Can a plain BroadcastChannel message cross from `a` to `b` (same origin, `name`)? */
async function bcCrosses(a: Page, b: Page, name: string): Promise<boolean> {
  await b.evaluate((n) => { const c = new BroadcastChannel(n); (window as unknown as Diag)[n] = false; c.onmessage = () => ((window as unknown as Diag)[n] = true); (window as unknown as Diag)[`${n}-ch`] = c; }, name);
  await a.evaluate((n) => { const c = new BroadcastChannel(n); c.postMessage('x'); setTimeout(() => c.close(), 2000); }, name);
  await b.waitForTimeout(1000);
  return b.evaluate((n) => (window as unknown as Diag)[n] === true, name);
}

async function follow(page: Page, scenario: string): Promise<Page> {
  const logs: string[] = [];
  const ctx = page.context();
  ctx.on('console', (m) => m.page() !== page && logs.length < 40 && logs.push(`${m.type()}: ${m.text()}`));
  ctx.on('weberror', (e) => logs.length < 40 && logs.push(`error: ${e.error().message}`));
  await openApp(page, base, `?scenario=${scenario}`, { warmMs: 1500 });
  await page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: '×4' }).click();
  await page.evaluate(() => (location.hash = '#/monitor'));
  const [f] = await Promise.all([ctx.waitForEvent('page'), page.getByRole('button', { name: 'Open on a second screen', includeHidden: true }).dispatchEvent('click')]);
  const synced = () => f!.waitForFunction(() => (window as unknown as W).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000, polling: 250 });
  try {
    await synced();
  } catch {
    const d: Diag = { follower: await followerDiag(f!), host: await hostDiag(page) };
    await page.waitForTimeout(1000);
    d.followerFramesAfter1s = (await followerDiag(f!)).frames;
    d.bcPopupToOpener = await bcCrosses(f!, page, 'diag-up');
    d.bcOpenerToPopup = await bcCrosses(page, f!, 'diag-down');
    await f!.bringToFront();
    d.syncedAfterBringToFront = await synced().then(() => true, () => false);
    d.followerAfter = await followerDiag(f!);
    d.logs = logs;
    throw new Error(`the learner monitor never synced within 30 s: ${JSON.stringify(d)}`);
  }
  console.log('follower synced', JSON.stringify(await followerDiag(f!)));
  expect(await f!.evaluate(() => window.opener)).toBeNull(); // R50 F4: its own process, not the instructor's main thread
  return f!;
}

test('the second-screen learner monitor follows commands, a bookmark restore and a restart', async ({ page }) => {
  test.setTimeout(180_000);
  const f = await follow(page, 'showcase-induction');
  await page.waitForTimeout(10_000);
  expect(await sync(f)).toMatchObject({ status: 'synced', resyncs: 0, drift: 0 });
  await same(f, page);
  await send(page, { type: 'setTarget', variable: 'hr', value: 120, ramp: { durationS: 10 } });
  await page.waitForTimeout(10_000);
  expect(await sync(f)).toMatchObject({ status: 'synced', resyncs: 0, drift: 0 });
  await send(page, { type: 'scenario', action: 'bookmark', target: 'fu11' });
  await page.waitForTimeout(6_000);
  await send(page, { type: 'scenario', action: 'restoreBookmark', target: 'fu11' });
  await expect.poll(async () => (await sync(f)).status, { timeout: 15_000 }).toBe('synced');
  await page.waitForTimeout(3_000);
  await same(f, page);
  await page.evaluate(() => { const a = (window as unknown as W).__pmeApp.session; a.restart({ spec: a.spec, mode: 'modeled' }); });
  await expect.poll(async () => (await sync(f)).status, { timeout: 15_000 }).toBe('synced');
  await page.waitForTimeout(4_000);
  await same(f, page);
  expect((await sync(f)).lag).toBeLessThan(0.5);
  // R50 F5: an instructor reload keeps the code; the learner monitor finds the session again
  const code = await page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
  await page.reload();
  await page.waitForFunction(() => '__pmeApp' in window);
  expect(await page.evaluate(() => (window as unknown as W).__pmeApp.session.code)).toBe(code);
  await expect(f.locator('.status-pill')).toHaveText(`Following session ${code}`, { timeout: 15_000 });
  await page.waitForTimeout(3_000);
  await same(f, page);
  // …and a closed instructor window is reported, not shown as followed
  await page.close();
  await expect(f.locator('.status-pill')).toHaveText("The instructor's monitor is not answering", { timeout: 10_000 });
});

test('it follows while the Ventilator view drives the patient (the link\'s commands are mirrored)', async ({ page }) => {
  test.setTimeout(180_000);
  const f = await follow(page, 'showcase-bronchospasm');
  await page.evaluate(() => (location.hash = '#/vent'));
  await page.waitForTimeout(30_000);
  expect(await sync(f)).toMatchObject({ status: 'synced', resyncs: 0, drift: 0 });
  await same(f, page);
});

test("it wears the instructor's monitor style and follows a change; its alarm sound is its own (owner ruling Q3)", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await follow(page, 'showcase-induction');
  type S = { __pmeFollower: { style: { skin: string }; monitor: { skin: { id: string } | null } } };
  type I = { __pmeApp: { session: { skin: string; setSkin(s: string, t: string): Promise<void> }; link: { alarms: { silencedUntil: number | null } | null } } };
  const skinOf = () => f.evaluate(() => { const x = (window as unknown as S).__pmeFollower; return `${x.style.skin}|${x.monitor.skin?.id}`; });
  const own = await page.evaluate(() => (window as unknown as I).__pmeApp.session.skin);
  await expect.poll(skinOf).toBe(`${own}|${own}`);
  const other = own === 'philips-like' ? 'saadat-like' : 'philips-like';
  await page.evaluate((s) => (window as unknown as I).__pmeApp.session.setSkin(s, ''), other);
  await expect.poll(skinOf, { timeout: 10_000 }).toBe(`${other}|${other}`);
  // its own Silence: pressed on the learner window, nothing reaches the instructor's session
  const hush = f.getByRole('button', { name: 'Silence here' });
  await expect(hush).toBeDisabled(); // nothing to silence before this window's sound is on
  await f.getByRole('button', { name: 'Sound off' }).click();
  await expect(hush).toBeEnabled();
  await hush.click();
  await expect(hush).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(1_500);
  expect(await page.evaluate(() => (window as unknown as I).__pmeApp.link.alarms?.silencedUntil ?? null)).toBeNull();
  await expect(f.locator('.status-pill')).toHaveText(/^Following session /);
  // H4: its Sound turns this window's sound off again (and Silence here has nothing left to silence)
  await f.getByRole('button', { name: 'Sound on' }).click();
  await expect(f.getByRole('button', { name: 'Sound off' })).toHaveAttribute('aria-pressed', 'false');
  await expect(hush).toBeDisabled();
});
