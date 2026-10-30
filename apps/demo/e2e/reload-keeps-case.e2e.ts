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
    link: { simT: number; log: Array<{ text: string }>; send(c: unknown): Promise<{ accepted: boolean; reason?: string }>; ctl: { timeScale: number; hostPaused: boolean; scenario: { stateId: string | null; doc: { id: string } | null } } };
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

// The owner's board "Finish 2" (approved 30 October): "Save and restart the case" saves the debrief to the browser's
// archive and loads the same card again from 0:00 with a fresh engine, keeping the room (the probes, the session code);
// a reload then restores the NEW run. "Save and close" saves it and ends the case; a reload then shows the empty window
// (#210's three cards), not the finished case, even on the deep link the case was opened from. The archive survives
// both reloads.
type F = W & { __pmeApp: { archive: { list(): Array<{ resident: string; title: string }> }; session: { last: { state?: { sensors?: Record<string, string> } } } } };
const fin = <T>(p: Page, fn: (w: F) => T) => p.evaluate(`(${fn.toString()})(window)`) as Promise<Awaited<T>>;

test('Finish the case: a reload after "Save and restart" restores the new run; after "Save and close" the empty window', async ({ page, browserName }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, base, '?scenario=showcase-mh#/teach2', { warmMs: 1500 });
  const code = await app(page, (w) => w.__pmeApp.session.code);
  for (const t of ['premed', 'induce-premed', 'intubate']) {
    const r = await page.evaluate((target) => (window as unknown as W).__pmeApp.link.send({ type: 'scenario', action: 'trigger', target }), t);
    expect(r.accepted, `${t}: ${r.reason ?? ''}`).toBe(true);
  }
  await expect.poll(() => app(page, (w) => w.__pmeApp.link.ctl.scenario.stateId)).toBe('intubated');
  // the room: a CVP line the card does not start with
  expect((await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'attachSensor', sensor: 'cvp', state: 'connected' }))).accepted).toBe(true);
  await expect.poll(() => fin(page, (w) => w.__pmeApp.session.last.state?.sensors?.cvp)).toBe('connected');
  expect((await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'time', action: 'scale', value: 8 }))).accepted).toBe(true);
  await page.waitForTimeout(5000);
  const ranTo = await app(page, (w) => w.__pmeApp.session.simNow());

  // Save and restart
  await page.locator('.ip2-dock .ip2-finish-btn').click();
  await expect(page.locator('.ip2-finish')).toBeVisible();
  await page.locator('.ip2-finish-resident').fill('Dr First');
  await page.locator('.ip2-finish-restart').click();
  await expect(page.locator('.ip2-finish')).toBeHidden();
  await expect.poll(() => app(page, (w) => w.__pmeApp.link.ctl.scenario.stateId)).toBe('awake');
  expect((await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'time', action: 'scale', value: 1 }))).accepted).toBe(true);
  expect(await fin(page, (w) => w.__pmeApp.archive.list().map((x) => `${x.resident} · ${x.title}`))).toEqual(['Dr First · Malignant hyperthermia']);
  await expect.poll(() => app(page, (w) => w.__pmeApp.link.ctl.hostPaused)).toBe(false);
  const restartedAt = await app(page, (w) => w.__pmeApp.session.simNow());
  expect(ranTo, 'the first run ran a while').toBeGreaterThan(25);
  expect(restartedAt, 'the card starts again from 0:00').toBeLessThan(15);
  await expect.poll(() => fin(page, (w) => w.__pmeApp.session.last.state?.sensors?.cvp), { message: 'the probes stay as they were' }).toBe('connected');
  await page.waitForTimeout(3000); // a position of the new run is taken (every second)
  await page.reload();
  await page.waitForFunction(() => '__pmeApp' in window);
  expect(new URL(page.url()).searchParams.get('session')).toBe(code);
  const said = () => app(page, (w) => w.__pmeApp.link.log.find((e) => e.text.startsWith('Restored after reload'))?.text ?? null);
  await expect.poll(said, { timeout: 30_000, message: 'the new run is restored' }).toMatch(/^Restored after reload: Malignant hyperthermia, \d\d:\d\d$/);
  expect(await app(page, (w) => w.__pmeApp.link.ctl.scenario.stateId)).toBe('awake');
  expect(await app(page, (w) => w.__pmeApp.link.simT), 'the new run, not the finished one').toBeLessThan(ranTo);

  // Save and close
  await page.locator('.ip2-dock .ip2-finish-btn').click();
  await expect(page.locator('.ip2-finish')).toBeVisible();
  await page.locator('.ip2-finish-resident').fill('Dr Second');
  await page.locator('.ip2-finish-close').click();
  await expect.poll(() => app(page, (w) => w.__pmeApp.link.ctl.scenario.doc)).toBeNull();
  await expect(page.locator('.ip2-action .ip2-begin-card')).toHaveCount(3);
  await expect(page.locator('.ip2-title')).toHaveText('No case loaded');
  expect(new URL(page.url()).searchParams.get('scenario'), 'the deep link is spent').toBeNull();
  await page.waitForTimeout(2500);
  await page.reload();
  await page.waitForFunction(() => '__pmeApp' in window);
  await page.waitForTimeout(3000);
  expect(await app(page, (w) => w.__pmeApp.link.ctl.scenario.doc)).toBeNull();
  await expect(page.locator('.ip2-action .ip2-begin-card')).toHaveCount(3);
  await expect(page.locator('.ip2-begin-card[data-way="archive"] .ip2-begin-btn')).toHaveText('Open · 2');
  expect(await fin(page, (w) => w.__pmeApp.archive.list().map((x) => x.resident))).toEqual(['Dr First', 'Dr Second']);
  console.log('finish-reload', JSON.stringify({ browserName, ranTo: Math.round(ranTo), restartedAt: Math.round(restartedAt * 10) / 10 }));
});
