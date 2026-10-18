// FX-16 (owner's report: a phone's sound is "hit and miss" at ×4): the beat-tone gate (beeps off above ×4) was evaluated
// on a follower's STEERED clock rate, which ViewerSync holds at the host's rate ±10 %, so at ×4 every beat on a frame
// that ran a hair fast was silent (37–60 % of beats played; 16–29 % under relay jitter). The gate now reads the
// session's nominal speed. Host + one emulated phone (Pixel 7 on Chromium, iPhone 13 on WebKit) over the relay, Sound on
// on both, ×4 for 20 s: the phone starts at least 90 % as many QRS beeps as the host. Web Audio is counted by an init
// script: a beep is the oscillator whose PeriodicWave is the beep's (packages/audio/src/tones.ts playBeep: 4 coefficients,
// the 3rd harmonic at 1/3; the device tones also have 4, with the 3rd at −12 dB ≈ 0.25).
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

const WINDOW_MS = 20_000;

/** Init script: count every QRS/pulse beep this page starts (`window.__beeps`). */
function countBeeps(): void {
  const w = window as unknown as { __beeps: number; BaseAudioContext?: typeof BaseAudioContext; OscillatorNode?: typeof OscillatorNode };
  w.__beeps = 0;
  const BAC = w.BaseAudioContext;
  const Osc = w.OscillatorNode;
  if (!BAC || !Osc) return;
  const beep = new WeakSet<object>();
  const cpw = BAC.prototype.createPeriodicWave;
  BAC.prototype.createPeriodicWave = function (this: BaseAudioContext, real: Float32Array, imag: Float32Array, o?: PeriodicWaveConstraints) {
    const wave = cpw.call(this, real, imag, o);
    if (imag.length === 4 && Math.abs(imag[3]! - 1 / 3) < 1e-3) beep.add(wave);
    return wave;
  } as typeof cpw;
  const spw = Osc.prototype.setPeriodicWave;
  Osc.prototype.setPeriodicWave = function (this: OscillatorNode & { __beep?: boolean }, wave: PeriodicWave) {
    this.__beep = beep.has(wave);
    return spw.call(this, wave);
  };
  const start = Osc.prototype.start;
  Osc.prototype.start = function (this: OscillatorNode & { __beep?: boolean }, ...a: Parameters<typeof start>) {
    if (this.__beep) w.__beeps++;
    return start.apply(this, a);
  };
}
const beeps = (p: Page) => p.evaluate(() => (window as unknown as { __beeps: number }).__beeps);
/** What the page's tone scheduler did with its beat tones (played / dropped as stale), and its audio state — printed so a
 *  failure says whether the beeps were gated, dropped or never started. */
const diag = (p: Page) =>
  p.evaluate(() => {
    type Log = Array<{ kind: string; dropped: boolean; lateS: number }>;
    const w = window as unknown as { __pmeApp?: { session: { monitor: { audioLog: Log } | null } }; __pmeFollower?: { monitor: { audioLog: Log } } };
    const log = (w.__pmeFollower?.monitor ?? w.__pmeApp?.session.monitor)?.audioLog ?? [];
    const qrs = log.filter((e) => e.kind === 'qrs');
    return { qrsPlayed: qrs.filter((e) => !e.dropped).length, qrsDropped: qrs.filter((e) => e.dropped).length, maxLateS: Math.max(0, ...qrs.map((e) => e.lateS)) };
  });

test('at ×4 a following phone beeps for (nearly) every beat the host beeps for', async ({ page, browser, browserName }) => {
  // As in device-layer-page.e2e.ts: headless WebKit's AudioContext clock does not run on the Linux CI runner, so its tone
  // schedulers are tens of seconds late and the host drops every QRS beep as stale (run 39147551166: host 0 beeps, its
  // scheduler 0–2 played / 38–47 dropped, lateness 34–42 s; the phone 46–51 played at 26–29 s late). Nothing to compare
  // there. macOS WebKit (the owner's Safari engine) runs this locally: 5/5 at 98–101 %; CI Chromium keeps it.
  test.skip(browserName === 'webkit' && !!process.env.CI, "headless WebKit's AudioContext clock does not run on the CI runner (host lateness 34–42 s, every host beep dropped as stale; run 39147551166); macOS WebKit and CI Chromium run it");
  test.setTimeout(120_000);
  const dir = mkdtempSync(join(tmpdir(), 'fx16-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>'); // the pages come from Vite here
  relay = await startRelay({ port: 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = encodeURIComponent(`ws://127.0.0.1:${relay.port}/`);

  await page.addInitScript(countBeeps);
  await openApp(page, base, `?relay=${ws}#/teach`, { warmMs: 1500 });
  const code = await page.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);

  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const ctx = await browser.newContext(dev);
  await ctx.addInitScript(countBeeps);
  const phone = await ctx.newPage();
  await phone.goto(`${base}/?join=${code}&relay=${ws}`);
  await phone.waitForFunction(() => (window as unknown as { __pmeFollower?: { sync?: { status: string } } }).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000 });
  await phone.locator('button.sound').click();
  await expect(phone.locator('button.sound')).toHaveText('Sound on');

  await page.locator('.topright .sound').click();
  await expect(page.locator('.topright .sound')).toHaveText('Sound on');
  await page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: '×4' }).click();
  await page.waitForTimeout(4000); // the phone re-anchors on the speed change

  const [h0, p0] = await Promise.all([beeps(page), beeps(phone)]);
  await page.waitForTimeout(WINDOW_MS);
  const [h1, p1] = await Promise.all([beeps(page), beeps(phone)]);
  const host = h1 - h0;
  const learner = p1 - p0;
  console.log(`FX-16 ${browserName}: ×4 for ${WINDOW_MS / 1000} s — host ${host} beeps, phone ${learner} (${((100 * learner) / Math.max(1, host)).toFixed(0)} %); scheduler logs host ${JSON.stringify(await diag(page))} phone ${JSON.stringify(await diag(phone))}`);
  expect(host).toBeGreaterThan(40); // ≈ 4 beats a second at ×4: the host's own beep is the reference
  expect(learner).toBeGreaterThanOrEqual(Math.floor(0.9 * host));
  await ctx.close();
});
