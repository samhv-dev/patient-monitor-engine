// Room plan R1 (docs/plans/room-and-instruments.md §7; Q3 ruled 5 November = A): the room code stays. The instructor's
// page at the bare address (no ?session=) starts under the code this browser stored, so a page closed and opened again
// (a restart, the next day) runs the same room, and a phone left open on the old page follows the new one (the relay
// admits the new host once the old socket is gone: server.ts `join`).
// R1b: the kit moves to the next port when 8650 is busy, and a new port is a new origin with an empty store. The relay
// keeps the last room's code in its state directory (--state-dir) and answers it in /pme-relay.json, so the page on the
// new origin starts under the same code. A phone's page talks to the relay of its own address (classroom.ts relayOf):
// one left on the first address cannot follow the move by itself; its socket fails and it says so, as it does today.
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devices, expect, test, type Browser, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../packages/controller/relay/server.ts';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
const relays: RelayHandle[] = [];
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => {
  for (const r of relays.splice(0)) await r.close();
});

type W = {
  __pmeApp: { session: { code: string } };
  __pmeFollower: { sync: { status: string; resyncs: number } | null };
};
const codeOf = (p: Page) => p.evaluate(() => (window as unknown as W).__pmeApp.session.code);
const wsOf = (r: RelayHandle) => `ws://127.0.0.1:${r.port}/`;
/** A phone (its own browser: its own storage) on the learner address of `code`. */
async function phone(browser: Browser, browserName: string, code: string, relay: string): Promise<Page> {
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const p = await (await browser.newContext(dev)).newPage();
  await p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(relay)}`);
  return p;
}
const status = (p: Page) => p.locator('.follower-bar .status-pill');

test('the bare address after the page was closed: the same room code; a phone left on the old page follows the new one', async ({ page, browser, browserName }) => {
  test.setTimeout(120_000);
  // ports in this suite's range (9170–9179)
  const relay = await startRelay({ port: 9171, host: '127.0.0.1', remoteRoles: 'viewer' });
  relays.push(relay);
  const bare = `?relay=${encodeURIComponent(wsOf(relay))}#/`;
  await openApp(page, base, bare, { warmMs: 500 });
  const code = await codeOf(page);
  expect(await page.evaluate(() => localStorage.getItem('pme.roomCode'))).toBe(code);

  const p = await phone(browser, browserName, code, wsOf(relay));
  await expect(status(p)).toHaveText(`Following session ${code}`, { timeout: 30_000 });

  await page.close(); // the laptop's browser closed (or restarted): its socket goes, the phone hears the host left
  await expect(status(p)).toHaveText("The instructor's monitor is not answering", { timeout: 15_000 });

  const again = await page.context().newPage();
  await openApp(again, base, bare, { warmMs: 500 });
  expect(await codeOf(again)).toBe(code);
  expect(new URL(again.url()).searchParams.get('session')).toBe(code);
  await expect(again.locator('dialog.host-guard')).toHaveCount(0); // nothing else hosts it: no question
  await expect(status(p)).toHaveText(`Following session ${code}`, { timeout: 30_000 });
  await p.context().close();
});

test('the kit on another port (a new origin, an empty store): the relay\'s state directory gives the page the same code', async ({ page, browser, browserName }) => {
  test.setTimeout(120_000);
  const state = join(mkdtempSync(join(tmpdir(), 'room-state-')), 'PME Classroom');
  // the first day: the kit on 9172
  const first = await startRelay({ port: 9172, host: '127.0.0.1', remoteRoles: 'viewer', stateDir: state });
  relays.push(first);
  await openApp(page, base, `?relay=${encodeURIComponent(wsOf(first))}#/`, { warmMs: 500 });
  const code = await codeOf(page);
  await expect.poll(() => { try { return JSON.parse(readFileSync(join(state, 'room.json'), 'utf8')) as unknown; } catch { return null; } }).toEqual({ lastRoom: code });
  const p = await phone(browser, browserName, code, wsOf(first));
  await expect(status(p)).toHaveText(`Following session ${code}`, { timeout: 30_000 });
  await page.context().close();
  await first.close();
  relays.length = 0;

  // the next start: 9172 is busy, the kit takes 9173, and the app comes from another origin (another server here)
  const second = await startRelay({ port: 9173, host: '127.0.0.1', remoteRoles: 'viewer', stateDir: state });
  relays.push(second);
  const other = await startVite();
  try {
    expect(other.base).not.toBe(base);
    const fresh = await (await browser.newContext()).newPage();
    await openApp(fresh, other.base, `?relay=${encodeURIComponent(wsOf(second))}#/`, { warmMs: 500 });
    expect(await codeOf(fresh)).toBe(code); // its store came empty (another origin): the code is the relay's lastRoom
    expect(await fresh.evaluate(() => localStorage.getItem('pme.roomCode'))).toBe(code); // and it is this origin's room code now
    // the phone on the first address: its relay is gone, and it says so (it is told to reconnect, as today)
    await expect(status(p)).toHaveText('Connection lost: reconnecting…', { timeout: 30_000 });
    await fresh.context().close();
  } finally {
    await other.vite.close();
    await p.context().close();
  }
});
