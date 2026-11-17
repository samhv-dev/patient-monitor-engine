// Room plan R5d: the learner defibrillator window presses energy select, Charge and Shock, and the host applies them as the
// instructor's own. A free-roam patient, the room's generic defibrillator (120 J adult: defib.ts FALLBACK_DEFIB); the
// instructor sets VF; the window — a device over the relay (`?join=`, the in-process relay as mobile-learner.e2e.ts runs
// it) that chose Defibrillator on the room's picker, named "bed 2" in Room setup — first shocks with no charge (refused in the device's words, nothing in the window
// blocks it), then charges and shocks. A forged `applyEvent drug` and a `time pause` on the window's own socket are
// refused and change nothing on the host; a learner phone (a viewer) still cannot command; the phone sees the shock as
// a follower does (its own engine counts it). The Debrief's timeline names the device: "Shock 120 J at mm:ss, by
// Defibrillator (bed 2)". On Chromium (and local WebKit) a window of this computer (`?follow=`, the browser's channel,
// no relay in between) forges the same two and the HOST refuses them; CI's Linux WebKit drops BroadcastChannel messages
// between pages (FALLBACK ruling 2026-10-11, learner-monitor-follows.e2e.ts), so that part is skipped there only.
// The second case: the window's Energy up (by keyboard) selects 150 J, it charges and shocks; the host's shock, the
// instructor's CPR sheet and the Log say 150 J; the keys are 44 px and nothing scrolls sideways at 375–1280 px.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { startRelay } from '../../../packages/controller/relay/server.ts';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

const KEY = 'bed2defib0001';
type Status = { defib: { shocks: number; state: string; energyJ: number; lastShock: { energyJ: number } | null } | null };
type HostW = { __pmeApp: { session: { code: string; simNow(): number; last: { deviceStatus?: Status }; record: { data: { rows: Array<{ kind: string; text: string; ev?: string }> } } }; link: { send(c: unknown): Promise<{ accepted: boolean; reason?: string }> } } };
type FolW = { __pmeFollower: { sync: { status: string } | null; transport: { send(m: unknown): void }; monitor: { viewerClock(): Promise<{ on(fn: (e: { type: string } & Status) => void, types: string[]): () => void }> } }; __shocks?: number };
const send = (p: Page, c: unknown) => p.evaluate((x) => (window as unknown as HostW).__pmeApp.link.send(x), c);
const hostDefib = (p: Page) => p.evaluate(() => (window as unknown as HostW).__pmeApp.session.last.deviceStatus?.defib ?? null);
const hostShocks = (p: Page) => p.evaluate(() => (window as unknown as HostW).__pmeApp.session.last.deviceStatus?.defib?.shocks ?? 0);
const hostRows = (p: Page) => p.evaluate(() => (window as unknown as HostW).__pmeApp.session.record.data.rows.map((r) => `${r.kind}|${r.text}|${r.ev ?? ''}`));
const synced = (w: Page) => w.waitForFunction(() => (window as unknown as FolW).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000, polling: 250 });
/** Forge on the window's own socket: under the sync's own id (the peer its hello made), through the window's sender. */
const forgeOwn = (w: Page, code: string, body: Record<string, unknown>) => w.evaluate(({ b, c }) => {
  const f = (window as unknown as FolW).__pmeFollower as unknown as { sync: { peerId: string }; transport: { send(m: unknown): void } };
  f.transport.send({ v: 1, session: c, from: f.sync.peerId, seq: 0, sentAt: Date.now(), kind: 'command', body: { id: `forged-${Math.random()}`, issuedBy: 'learner', ...b } });
}, { b: body, c: code });
const drug = { type: 'applyEvent', event: { kind: 'drug', drugId: 'adrenaline', dose: 1, unit: 'mg', route: 'iv' } };
const pause = { type: 'time', action: 'pause' };
/** The host keeps its clock running and gave no drug: the forged commands changed nothing. */
async function unchanged(page: Page): Promise<void> {
  const t0 = await page.evaluate(() => (window as unknown as HostW).__pmeApp.session.simNow());
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => (window as unknown as HostW).__pmeApp.session.simNow())).toBeGreaterThan(t0 + 0.5);
  expect((await hostRows(page)).filter((r) => r.includes('drug:'))).toEqual([]);
}

/** A relay, the host with the generic model, and the window on another device opened from the room's picker. */
async function openWindow(page: Page) {
  const dir = mkdtempSync(join(tmpdir(), 'r5d-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const relay = await startRelay({ port: 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = `ws://127.0.0.1:${relay.port}/`;
  // Room setup named this device "bed 2" (R7's remembered layout, kept on the instructor's computer)
  await page.addInitScript((k) => localStorage.setItem('pme.roomLayout', JSON.stringify({ [k]: { name: 'bed 2', show: 'defib', lastSeen: Date.now() } })), KEY);
  await openApp(page, base, `?relay=${encodeURIComponent(ws)}`, { warmMs: 1500, site: { defibModel: 'generic' } });
  const code = await page.evaluate(() => (window as unknown as HostW).__pmeApp.session.code);
  const ctx = await page.context().browser()!.newContext();
  await ctx.addInitScript((k) => localStorage.setItem('pme.device', k), KEY);
  const win = await ctx.newPage();
  // the room's QR opens the picker; its Defibrillator card opens the window on this device
  await win.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws)}#/pick`);
  await Promise.all([win.waitForEvent('load'), win.locator('.join-card[data-show="defib"]').getByRole('button', { name: 'Show here' }).click()]);
  return { relay, ws, code, ctx, win };
}

test('the defibrillator window charges and shocks the free-roam patient; nothing else it sends is applied; the Debrief names it', async ({ page, browserName }) => {
  test.setTimeout(180_000);
  const { relay, ws, code, ctx, win } = await openWindow(page);
  try {
    const phone = await (await page.context().browser()!.newContext()).newPage();
    await phone.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws)}#/monitor`);
    for (const w of [win, phone]) await synced(w);
    await expect(win.locator('.defib-readout')).toHaveText('120 J', { timeout: 10_000 });
    await expect(win).toHaveTitle('Defibrillator: patient monitor simulator');
    // the phone counts shocks from its own engine, as a follower sees everything the host applied
    await phone.evaluate(() => (window as unknown as FolW).__pmeFollower.monitor.viewerClock().then((c) => c.on((e) => void ((window as unknown as FolW).__shocks = e.defib?.shocks ?? 0), ['deviceStatus'])));

    expect((await send(page, { type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' })).accepted).toBe(true); // the instructor sets VF
    const charge = win.getByRole('button', { name: 'Charge', exact: true });
    const shock = win.getByRole('button', { name: 'Shock', exact: true });
    await expect(charge).toBeEnabled();
    await expect(shock).toBeEnabled();
    expect(await charge.evaluate((b) => b.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44); // [ENG: ui] WCAG 2.5.5

    await shock.click(); // no charge: the window sends it, the host's device refuses it
    await expect(win.locator('.defib-said')).toHaveText('Not charged', { timeout: 5000 });
    await expect(shock).toBeEnabled();
    expect(await hostShocks(page)).toBe(0);

    await charge.click();
    await expect(win.locator('.defib-readout')).toHaveText('120 J CHARGING', { timeout: 5000 });
    await expect(win.locator('.defib-said')).toHaveText('');
    await expect(win.locator('.defib-readout')).toHaveText('120 J READY', { timeout: 15_000 });
    await shock.click();
    await expect.poll(() => hostShocks(page), { timeout: 5000 }).toBe(1);
    await expect.poll(() => phone.evaluate(() => (window as unknown as FolW).__shocks ?? 0), { timeout: 5000 }).toBe(1);
    const learnerRows = (await hostRows(page)).filter((r) => r.startsWith('learner|'));
    expect(learnerRows).toEqual(['learner|Charge 120 J|', 'learner|Shock 120 J|shock']); // the refused shock is no row

    // forged on the window's own socket: the relay refuses them, and nothing changes on the host
    await forgeOwn(win, code, drug);
    await forgeOwn(win, code, pause);
    await unchanged(page);
    // a learner phone (a viewer) still cannot command
    await forgeOwn(phone, code, { type: 'applyEvent', event: { kind: 'defib', action: 'charge' } });
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => (window as unknown as HostW).__pmeApp.session.last.deviceStatus?.defib?.state)).toBe('idle');

    // a window of this computer, on the browser's channel: no relay in between, the HOST refuses the same two
    if (!(browserName === 'webkit' && process.env.CI)) {
      const local = await page.context().newPage();
      await local.goto(`${base}/?follow=${code}#/defib`);
      await synced(local);
      await expect(local).toHaveTitle('Defibrillator: patient monitor simulator');
      await local.evaluate(() => {
        const w = window as unknown as { __acks: Array<{ accepted: boolean; reason?: string }>; __pmeFollower: { transport: { onMessage(fn: (m: { kind: string; commandId?: string; accepted?: boolean; reason?: string }) => void): void } } };
        w.__acks = [];
        w.__pmeFollower.transport.onMessage((m) => void (m.kind === 'ack' && m.commandId?.startsWith('forged-') && w.__acks.push({ accepted: !!m.accepted, reason: m.reason })));
      });
      await forgeOwn(local, code, drug);
      await forgeOwn(local, code, pause);
      // the host's own answer (no relay here): both refused with the allow-list's reason
      await expect.poll(() => local.evaluate(() => (window as unknown as { __acks: unknown[] }).__acks), { timeout: 5000 })
        .toEqual([{ accepted: false, reason: 'The defibrillator window sends energy, Charge and Shock only.' }, { accepted: false, reason: 'The defibrillator window sends energy, Charge and Shock only.' }]);
      await unchanged(page);
      await local.close();
    }

    // the Debrief's who line
    await page.evaluate(() => (location.hash = '#/debrief'));
    const timeline = page.locator('#db-timeline tbody tr[data-kind="learner"]');
    await expect(timeline).toHaveCount(2, { timeout: 10_000 });
    const lines = (await timeline.allInnerTexts()).map((r) => r.replace(/\s+/g, ' ').trim());
    expect(lines[0]).toMatch(/^\d\d:\d\d Learner Charge 120 J at \d\d:\d\d, by Defibrillator \(bed 2\)$/);
    expect(lines[1]).toMatch(/^\d\d:\d\d Learner Shock 120 J at \d\d:\d\d, by Defibrillator \(bed 2\)$/);
    await ctx.close();
    await phone.context().close();
  } finally {
    await relay.close();
  }
});

test("the resident selects 150 J on the window, charges and shocks; the host records a 150 J shock; the window's keys fit every width", async ({ page }) => {
  test.setTimeout(180_000);
  const { relay, ctx, win } = await openWindow(page);
  try {
    await synced(win);
    await expect(win.locator('.defib-readout')).toHaveText('120 J', { timeout: 10_000 });
    expect((await send(page, { type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' })).accepted).toBe(true);
    const group = win.getByRole('group', { name: 'Energy select' });
    const up = group.getByRole('button', { name: 'Energy up' });
    const selected = group.locator('output[aria-label="Selected energy"]');
    await expect(selected).toHaveText('120 J');
    await up.focus();
    await win.keyboard.press('Enter'); // reachable and operable by keyboard
    await expect(win.locator('.defib-readout')).toHaveText('150 J', { timeout: 5000 });
    await expect(selected).toHaveText('150 J');
    await expect.poll(async () => (await hostDefib(page))?.energyJ, { timeout: 5000 }).toBe(150);

    await win.getByRole('button', { name: 'Charge', exact: true }).click();
    await expect(win.locator('.defib-readout')).toHaveText('150 J READY', { timeout: 15_000 });
    await win.getByRole('button', { name: 'Shock', exact: true }).click();
    await expect.poll(async () => (await hostDefib(page))?.lastShock?.energyJ, { timeout: 5000 }).toBe(150);
    expect((await hostRows(page)).filter((r) => r.startsWith('learner|'))).toEqual(['learner|Energy 150 J|', 'learner|Charge 150 J|', 'learner|Shock 150 J|shock']);
    // the instructor's CPR sheet and the log say what was delivered
    await page.locator('.ip2-dock button.ip2-tool[data-sheet="defib"]').click();
    await expect(page.locator('.ip2-sheet[data-sheet="defib"]')).toContainText('last shock 150 J', { timeout: 10_000 });
    await page.locator('.ip2-dock button.ip2-tool[data-sheet="log"]').click();
    const log = page.locator('.ip2-sheet[data-sheet="log"] .log li[data-kind=learner]');
    for (const line of ['Energy 150 J', 'Defibrillator charging to 150 J', 'Shock delivered at 150 J']) await expect(log.filter({ hasText: line })).toHaveCount(1, { timeout: 10_000 });

    for (const width of [375, 768, 1024, 1280]) {
      await win.setViewportSize({ width, height: width < 768 ? 812 : 768 });
      const fit = await win.evaluate(() => ({
        sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        keys: [...document.querySelectorAll<HTMLElement>('.defib-energy button, .defib-keys button')].map((b) => {
          const r = b.getBoundingClientRect();
          return { h: r.height, w: r.width, inside: r.left >= 0 && r.right <= innerWidth };
        }),
      }));
      expect(fit.sideways, `${width} px`).toBeLessThanOrEqual(0);
      expect(fit.keys.map((k) => k.inside), `${width} px`).toEqual(fit.keys.map(() => true));
      expect(Math.min(...fit.keys.flatMap((k) => [k.h, k.w])), `${width} px`).toBeGreaterThanOrEqual(44);
    }
    await ctx.close();
  } finally {
    await relay.close();
  }
});
