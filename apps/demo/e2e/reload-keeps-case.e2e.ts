// fix-reload-keeps-case (UI review 2026-10-24 #1): a reload of the instructor's page in the middle of a card came back as
// "No scenario" and the default patient, with the phones following that. Now the page comes back to the card, its
// state and its clock (position.ts), the phones re-follow over the relay, and a toast says what happened.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devices, expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => relay?.close());

type W = {
  __pmeFollower: { sync: { status: string; resyncs: number } | null };
  __pmeApp: {
    session: { code: string; simNow(): number };
    link: { simT: number; log: Array<{ text: string }>; send(c: unknown): Promise<{ accepted: boolean; reason?: string }>; ctl: { timeScale: number; scenario: { stateId: string | null; doc: { id: string } | null } } };
  };
};
const app = <T>(p: Page, fn: (w: W) => T) => p.evaluate(`(${fn.toString()})(window)`) as Promise<Awaited<T>>;
const tiles = (p: Page) => p.evaluate(() => [...document.querySelectorAll('.pme-stile')].map((e) => `${(e as HTMLElement).dataset.param}:${e.querySelector('[data-pme="v"]')?.textContent}`).sort().join(' '));

test('a reload mid-card comes back in the same card, state and clock, and the phones follow it again', async ({ page, browser, browserName }) => {
  test.setTimeout(180_000);
  const dir = mkdtempSync(join(tmpdir(), 'reload-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  relay = await startRelay({ port: 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = `ws://127.0.0.1:${relay.port}/`;
  await openApp(page, base, `?relay=${encodeURIComponent(ws)}&scenario=showcase-mh`, { warmMs: 1500 });
  const code = await app(page, (w) => w.__pmeApp.session.code);
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const phone = await (await browser.newContext(dev)).newPage();
  await phone.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws)}`);
  await phone.waitForFunction(() => (window as unknown as W).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000 });

  // the MH card to `intubated` by its own buttons (premedicate, induce, intubate), then a while in that state
  for (const t of ['premed', 'induce-premed', 'intubate']) {
    const r = await page.evaluate((target) => (window as unknown as W).__pmeApp.link.send({ type: 'scenario', action: 'trigger', target }), t);
    expect(r.accepted, `${t}: ${r.reason ?? ''}`).toBe(true);
  }
  await expect.poll(() => app(page, (w) => w.__pmeApp.link.ctl.scenario.stateId)).toBe('intubated');
  await page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: '×4' }).click();
  await page.waitForTimeout(8000);
  const bar = page.locator('.sessionbar .scen');
  await expect(bar).toHaveText(/^Malignant hyperthermia: /);
  const before = await app(page, (w) => w.__pmeApp.session.simNow());
  const resyncs = (await app(phone, (w) => w.__pmeFollower.sync?.resyncs)) ?? 0;

  await page.reload();
  await page.waitForFunction(() => '__pmeApp' in window);
  expect(new URL(page.url()).searchParams.get('session')).toBe(code);
  // What the toast says is also the Log tab's line (main.ts link.note), which stays: the 4-s toast itself can be gone
  // before a slow runner looks (CI Linux WebKit, run 40180609451)
  const said = () => app(page, (w) => w.__pmeApp.link.log.find((e) => e.text.startsWith('Restored after reload'))?.text ?? null);
  await expect.poll(said, { timeout: 30_000, message: 'the restore is reported' }).toMatch(/^Restored after reload: Malignant hyperthermia, \d\d:\d\d$/);
  const restoredAt = Date.now();
  const after = await app(page, (w) => w.__pmeApp.link.simT);
  console.log('reload-keeps-case', JSON.stringify({ browserName, before: Math.round(before * 10) / 10, restored: Math.round(after * 10) / 10, deltaS: Math.round((before - after) * 10) / 10, toast: await said() }));
  expect(Math.abs(before - after), 'the clock comes back within 10 s of where it was').toBeLessThan(10);
  expect(await app(page, (w) => w.__pmeApp.link.ctl.scenario.stateId)).toBe('intubated');
  await expect.poll(() => app(page, (w) => w.__pmeApp.link.ctl.timeScale), { message: 'the speed comes back' }).toBe(4);
  expect(await app(page, (w) => w.__pmeApp.link.ctl.scenario.doc?.id)).toBe('showcase-mh');
  await expect(bar).toHaveText(/^Malignant hyperthermia: Intubated/);
  // the card goes on from there: the next button is the intubated state's
  await page.click('[role=tab][data-tab=scenario]');
  await expect(page.getByRole('button', { name: /^Start surgery: rocuronium/ })).toBeVisible();

  // the phone re-follows the restored case: synced again, and the same numbers as the instructor's screen — within 5 s
  // here, within 20 s on CI and on WebKit (the 2-vCPU Linux WebKit runner holds an instructor, a phone and the relay;
  // run 40180609451 missed 5 s twice after a correct restore)
  const phoneMs = process.env.CI || browserName === 'webkit' ? 20_000 : 5000;
  await expect.poll(async () => {
    const s = await app(phone, (w) => w.__pmeFollower.sync);
    return s?.status === 'synced' && s.resyncs > resyncs && (await tiles(phone)) === (await tiles(page));
  }, { timeout: phoneMs, intervals: [100] }).toBe(true);
  console.log('reload-keeps-case phone', JSON.stringify({ browserName, sameWithinMs: Date.now() - restoredAt, boundMs: phoneMs }));

  // Restart patient forgets the position: a second reload brings back the new patient, not the case
  await app(page, (w) => (w.__pmeApp.session as unknown as { restart(s: unknown): void }).restart({ spec: (w.__pmeApp.session as unknown as { spec: unknown }).spec, mode: 'modeled' }));
  await page.waitForTimeout(3000);
  await page.goto(page.url().replace(/[?&]scenario=showcase-mh/, ''));
  await page.waitForFunction(() => '__pmeApp' in window);
  await page.waitForTimeout(3000);
  expect(await app(page, (w) => w.__pmeApp.link.ctl.scenario.doc)).toBeNull();
  await expect(bar).toHaveText('No scenario');
});
