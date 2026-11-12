// Brief 194, the proof: a deliberately failing two-page test. It never runs in a normal suite (playwright.config.ts
// matches `*.e2e.ts` only; PME_E2E_PROOF=1 lets a path name this file). The instructor's page and a phone in its own
// browser context follow one session over a relay; once the phone is synced, the FIRST attempt fails on purpose and a
// retry passes, as a retry-only pass does in CI. Run it as CI would:
//   CI=1 PME_E2E_PROOF=1 pnpm test:e2e --project=chromium apps/demo/e2e/proof --reporter=list,json
// and the first attempt's folder in test-results/ holds trace.zip (both contexts), evidence/1-host.json,
// evidence/2-follower.json, their .console.txt and index.json; `node scripts/ci/e2e-report.mjs retry <report.json>` names
// that folder.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle } from '../../../../packages/controller/relay/server.ts';
import { openApp, startVite } from '../app-support.ts';
import { devices, expect, test } from '../evidence.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => relay?.close()); // after the evidence is read: the fixture reads at the end of the test function

test('the first attempt fails on purpose with a host and a phone open; a retry passes', async ({ page, browser, browserName }) => {
  test.setTimeout(90_000);
  const dir = mkdtempSync(join(tmpdir(), 'proof194-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  relay = await startRelay({ port: Number(process.env.PME_E2E_RELAY_PORT) || 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = encodeURIComponent(`ws://127.0.0.1:${relay.port}/`);
  await openApp(page, base, `?relay=${ws}#/teach2`, { warmMs: 1500 });
  await page.evaluate(() => console.log('proof 194: the host page says hello'));
  const code = await page.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const phone = await (await browser.newContext(dev)).newPage();
  await phone.goto(`${base}/?join=${code}&relay=${ws}`);
  await phone.waitForFunction(() => (window as unknown as { __pmeFollower?: { sync?: { status: string } } }).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000 });
  await phone.evaluate(() => console.warn('proof 194: the phone says hello'));
  expect(test.info().retry, 'the first attempt fails on purpose (brief 194 proof)').toBeGreaterThan(0);
  await phone.context().close();
});
