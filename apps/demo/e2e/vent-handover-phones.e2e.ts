// E128 (owner, 26 October, the E125 kit with his phone): after any visit to the Ventilator view the phones resynced every
// ≈ 4 s for the rest of the case and wiped their traces — the cockpit kept driving the patient off screen and its frames
// never reach a phone (scratch repro-vent-visit.mjs: 1 resync on release, then one every 4 s). Leaving the view now hands
// the patient to the engine's own ventilator with the cockpit's settings and stops the cockpit: the phone resyncs ONCE
// (its hold ends) and then follows; the patient stays ventilated (EtCO2, SpO2 and peak pressure carry on); a second visit
// works the same way and the cockpit restarts from the engine's settings.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devices, expect, test, type Browser, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => relay?.close());

type Sync = { status: string; resyncs: number };
type Truth = { tree?: { resp?: { driver?: { source?: string; vent?: Record<string, number> }; mechanics?: { ppeak?: number | null } } } };
type W = {
  __pmeFollower: { sync: Sync | null };
  __pmeApp: { session: { code: string; simNow(): number; last: { truth?: Truth; state?: { breathing?: { source: string } } } }; link: { send(c: unknown): Promise<{ accepted: boolean }>; ctl: { measurements: Record<string, { value: number | null } | undefined> } } };
};

const ws = () => `ws://127.0.0.1:${relay!.port}/`;
async function phone(browser: Browser, browserName: string, code: string): Promise<Page> {
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const p = await (await browser.newContext(dev)).newPage();
  await p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws())}`);
  return p;
}
const sync = (p: Page) => p.evaluate(() => (window as unknown as W).__pmeFollower.sync as Sync);
const resyncs = async (p: Page) => (await sync(p)).resyncs;
/** The host patient: who ventilates it, EtCO2, SpO2 and the last breath's peak airway pressure. */
const patient = (p: Page) =>
  p.evaluate(() => {
    const a = (window as unknown as W).__pmeApp;
    const m = a.link.ctl.measurements;
    const r = a.session.last.truth?.tree?.resp;
    return { t: Math.round(a.session.simNow()), source: r?.driver?.source ?? a.session.last.state?.breathing?.source ?? '?', vent: r?.driver?.vent ?? null, etco2: m.etco2?.value ?? null, spo2: m.spo2?.value ?? null, ppeak: r?.mechanics?.ppeak ?? null };
  });
const cockpitCfg = (p: Page) =>
  p.frames().find((f) => f.url().includes('vent-hamilton'))?.evaluate(() => {
    const c = (window as unknown as { __vent?: { vs: { cfg: Record<string, unknown> }; paused: boolean } }).__vent;
    return c ? { mode: c.vs.cfg.mode, rate: c.vs.cfg.rate, vt: c.vs.cfg.vt, peep: c.vs.cfg.peep, fio2: c.vs.cfg.fio2, pmax: c.vs.cfg.pmax, paused: c.paused } : null;
  });
/** Watch `s` seconds, logging the phone's resyncs and the patient every 10 s; returns the resyncs it counted. */
async function watch(host: Page, f: Page, s: number, tag: string): Promise<number> {
  const r0 = await resyncs(f);
  for (let i = 10; i <= s; i += 10) {
    await host.waitForTimeout(10_000);
    console.log(`[E128] ${tag} +${i}s: phone resyncs ${(await resyncs(f)) - r0}, host ${JSON.stringify(await patient(host))}`);
  }
  return (await resyncs(f)) - r0;
}
const within = (a: number | null, b: number | null, tol: number) => a !== null && b !== null && Math.abs(a - b) <= tol;

test('leaving the Ventilator view hands the patient to the engine ventilator: one resync on release, then the phone follows', async ({ page, browser, browserName }) => {
  test.skip(browserName === 'webkit' && !!process.env.CI, 'FALLBACK ruling 2026-10-12 (S12-F1): the 2-vCPU CI Linux WebKit runner throttles the cockpit iframe and cannot hold an instructor, a phone and the relay in step; macOS WebKit and CI Chromium run it');
  test.setTimeout(420_000);
  const dir = mkdtempSync(join(tmpdir(), 'e128-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  relay = await startRelay({ port: 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  await page.setViewportSize({ width: 1600, height: 900 });
  // the owner's path: the Scenarios library, Load on the first demonstration
  await openApp(page, base, `?relay=${encodeURIComponent(ws())}#/scenarios/library`, { warmMs: 1500 });
  await page.locator('[data-view=scenarios]').getByRole('button', { name: /^Load/ }).first().click();
  await expect(page).toHaveURL(/#\/teach/);
  const code = await page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
  const f = await phone(browser, browserName, code);
  await f.waitForFunction(() => (window as unknown as W).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000 });

  // baseline: a minute with no resync
  expect(await watch(page, f, 60, 'baseline'), 'resyncs before any visit').toBe(0);

  for (const visit of [1, 2]) {
    if (visit === 2) {
      // between the visits the instructor sets the engine's ventilator from the panel (the phone follows: no resync)
      const r0 = await resyncs(f);
      expect(await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 16, vtMl: 450, peep: 6, fio2: 0.5 } }).then((r) => r.accepted))).toBe(true);
      await expect.poll(async () => (await patient(page)).vent).toMatchObject({ rr: 16, vt: 450, peep: 6 });
      await page.waitForTimeout(5000);
      expect((await resyncs(f)) - r0, 'the panel\'s ventilator change is followed').toBe(0);
    }
    await page.evaluate(() => (location.hash = '#/vent'));
    await expect(f.locator('.learner-hold')).toBeVisible({ timeout: 10_000 });
    await expect.poll(async () => (await patient(page)).source, { timeout: 15_000, message: 'the cockpit drives the patient' }).toBe('external');
    if (visit === 2) {
      // E128: the cockpit restarted from the engine's ventilator settings (what it handed over on the first visit)
      const c = await cockpitCfg(page);
      console.log(`[E128] visit 2 cockpit ${JSON.stringify(c)}`);
      expect(c).toMatchObject({ mode: 'VC', rate: 16, vt: 450, peep: 6, fio2: 50, paused: false });
    }
    await page.waitForTimeout(6000);
    const onVent = await patient(page);
    const held = await resyncs(f);
    console.log(`[E128] visit ${visit} on the Ventilator view 6 s: ${JSON.stringify(onVent)} cockpit ${JSON.stringify(await cockpitCfg(page))}`);

    await page.evaluate(() => (location.hash = '#/teach'));
    await expect(f.locator('.learner-hold')).toBeHidden({ timeout: 3000 });
    // the hand-over: the engine's own ventilator, the cockpit paused and silent
    await expect.poll(async () => (await patient(page)).source, { timeout: 5000 }).toBe('ventilator');
    const cfg = await cockpitCfg(page);
    expect(cfg?.paused, 'the hidden cockpit is stopped').toBe(true);
    console.log(`[E128] visit ${visit} handed over: engine ${JSON.stringify((await patient(page)).vent)} from cockpit ${JSON.stringify(cfg)}`);
    expect((await patient(page)).vent).toMatchObject({ rr: cfg!.rate, vt: cfg!.vt, peep: cfg!.peep });
    await f.waitForFunction(() => (window as unknown as W).__pmeFollower?.sync?.status === 'synced', null, { timeout: 15_000 });
    const released = (await resyncs(f)) - held;
    console.log(`[E128] visit ${visit}: ${released} resync(s) on release`);
    expect(released, 'one resync when the hold ends').toBe(1);

    const span = visit === 1 ? 60 : 30;
    expect(await watch(page, f, span, `visit ${visit} back on the Instructor view`), `no further resync in ${span} s`).toBe(0);
    const after = await patient(page);
    expect(after.source).toBe('ventilator');
    // the patient continues ventilated as the cockpit left it (the engine's normal breath-to-breath variation)
    expect(within(after.etco2, onVent.etco2, 5), `EtCO2 ${after.etco2} vs ${onVent.etco2} on the cockpit`).toBe(true);
    expect(within(after.spo2, onVent.spo2, 3), `SpO2 ${after.spo2} vs ${onVent.spo2} on the cockpit`).toBe(true);
    expect(within(after.ppeak, onVent.ppeak, 5), `peak pressure ${after.ppeak} vs ${onVent.ppeak} on the cockpit`).toBe(true);
  }
});
