// Learner remote L14 (the owner's ruling on finding N117, 12 November: "B"): a dose from a learner's device is refused
// while the case is paused, with the reason shown. Through a relay in its OWN process (the gate rule for remote pieces:
// an in-process relay can hide a host that acknowledges without applying), on the MH card, with a phone Room setup names:
// 1. paused: the phone's Give cannot be used and says why; 2. a Give tapped while the case ran whose command reaches the
//    host after the pause began (the phone's outgoing frame is held at its own socket until the laptop has paused):
//    refused at the host, the phone shows the host's reason and never "Given"; the host engine's drugs do not change;
//    the host's Log and record show the attempt, the /2 administrations hold it as not accepted;
// 3. resumed: the phone's Give is given, the engine has the drug, the Log names the phone.
// And, as a finding for the owner (this piece does not change it), what the instructor's own Drug sheet does in a pause.
// PME_E2E_PORT and PME_E2E_RELAY_PORT (+ the worker's index) keep Vite and the relay inside a machine's port range;
// PME_L14_SHOTS=<dir> saves the screenshots the brief's report shows.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { devices, expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, sheet } from './app-support.ts';
import { startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

/** The source relay's bin (or the built kit's, PME_KIT_RELAY) in a process of its own. */
async function processRelay(): Promise<{ port: number; close(): Promise<void> }> {
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  const port = fixed ? fixed + 3 + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0;
  const dir = mkdtempSync(join(tmpdir(), 'l14-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>'); // the pages come from Vite here
  const kit = process.env.PME_KIT_RELAY;
  const args = kit ? [kit] : ['--experimental-strip-types', '--no-warnings', resolve(import.meta.dirname, '../../../packages/controller/relay/bin.ts')];
  args.push('--port', String(port), '--host', '127.0.0.1', '--remote-roles', 'viewer', '--static', dir);
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('WS_NO_')));
  const proc = spawn(process.execPath, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  let closing = false;
  const exited = new Promise<number | null>((r) => proc.once('exit', (code) => r(code)));
  const got = await new Promise<number>((ok, no) => {
    const onData = (d: Buffer) => {
      out += d;
      const m = /ready on ws:\/\/[^:]+:(\d+)\//.exec(out);
      if (m) ok(Number(m[1]));
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    void exited.then((code) => no(new Error(`relay exited before ready (${code}): ${out}`)));
  });
  test.info().annotations.push({ type: 'L14 relay', description: `its own process: ${kit ? `the built kit's ${kit}` : 'the source relay bin'} on ${got}` });
  return {
    port: got,
    close: async () => {
      if (proc.exitCode !== null || proc.signalCode !== null) {
        if (!closing) throw new Error(`the relay exited during the test (${proc.exitCode ?? proc.signalCode}): ${out.slice(-600)}`);
        return;
      }
      closing = true;
      proc.kill('SIGTERM');
      await exited;
    },
  };
}

type Row = { t: number; kind: string; text: string; ev?: string; by?: string; name?: string; notGiven?: string; dose?: unknown };
type Admin = { source: string; by?: string; drugId?: string; result: { accepted: boolean; reason?: string } };
type HostW = {
  __drugs: string[];
  __pmeApp: {
    session: { code: string; onEvent(fn: (e: { type: string; drugs?: Array<{ id: string }> }) => void): () => void; record: { data: { rows: Row[]; admin?: Admin[] } } };
    link: { send(c: unknown): Promise<{ accepted: boolean; reason?: string }>; ctl: { hostPaused: boolean } };
  };
};
const engineDrugs = (page: Page) => page.evaluate(() => (window as unknown as HostW).__drugs);
const rows = (page: Page) => page.evaluate(() => (window as unknown as HostW).__pmeApp.session.record.data.rows);
const admin = (page: Page) => page.evaluate(() => (window as unknown as HostW).__pmeApp.session.record.data.admin ?? []);
const time = (page: Page, action: 'pause' | 'resume') => page.evaluate((a) => (window as unknown as HostW).__pmeApp.link.send({ type: 'time', action: a }), action);
const logLines = async (page: Page) => (await sheet(page, 'log')).locator('.log li[data-kind=learner] > span:not(.k)').allInnerTexts();
const shots = process.env.PME_L14_SHOTS;
/** A screenshot for the report (PME_L14_SHOTS only), with `show` scrolled into view and transitions finished. */
async function shot(p: Page, name: string, browserName: string, show?: string): Promise<void> {
  if (!shots) return;
  mkdirSync(shots, { recursive: true });
  if (show) await p.locator(show).first().scrollIntoViewIfNeeded();
  await p.screenshot({ path: join(shots, `${browserName}-${name}.png`), animations: 'disabled' });
}

test('L14: through a relay in its own process, a phone gives no drug while the case is paused and says why; the host refuses one that arrives after the pause; after the resume the Give acts', async ({ page, browser, browserName }) => {
  test.setTimeout(240_000);
  const relay = await processRelay();
  const KEY = 'bed2remote01';
  try {
    const ws = `ws://127.0.0.1:${relay.port}/`;
    await page.addInitScript((k) => localStorage.setItem('pme.roomLayout', JSON.stringify({ [k]: { name: 'bed 2 remote', show: 'remote', lastSeen: Date.now() } })), KEY);
    await openApp(page, base, `?relay=${encodeURIComponent(ws)}&scenario=showcase-mh-v2#/teach2`, { warmMs: 1500 });
    const code = await page.evaluate(() => (window as unknown as HostW).__pmeApp.session.code);
    const pin = (await page.evaluate(() => localStorage.getItem('pme.learnerPin'))) as string;
    await page.evaluate(() => {
      const w = window as unknown as HostW;
      w.__drugs = [];
      w.__pmeApp.session.onEvent((e) => void (e.drugs && (w.__drugs = e.drugs.map((d) => d.id))));
    });

    // the learner's phone; its socket's outgoing `prep deliver` frames can be held (the tap made while the case ran,
    // still on its way when the pause begins), every other frame passes as it is
    const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
    const ctx = await browser.newContext(dev);
    await ctx.addInitScript((k) => localStorage.setItem('pme.device', k), KEY);
    let hold = false;
    const held: Array<() => void> = [];
    await ctx.routeWebSocket(/.*/, (sock) => {
      const server = sock.connectToServer();
      sock.onMessage((m) => {
        let deliver = false;
        try {
          const x = JSON.parse(String(m)) as { kind?: string; body?: { type?: string; action?: string } };
          deliver = x.kind === 'command' && x.body?.type === 'prep' && x.body.action === 'deliver';
        } catch {
          // not JSON: pass it on
        }
        if (hold && deliver) held.push(() => server.send(m));
        else server.send(m);
      });
    });
    const p = await ctx.newPage();
    await p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws)}#/remote/learner`);
    for (const d of pin) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
    await p.locator('.ip-peer-go').click();
    await expect(p.locator('.lr-status')).toHaveText(`Signed in as a learner remote · ${code}`, { timeout: 20_000 });
    await expect(p.locator('.lr-bench')).toBeVisible({ timeout: 15_000 });
    await p.locator('.lr-search').fill('ephedrine');
    await p.locator('.lr-pick[data-drug="ephedrine"]').click();
    await p.locator('.lr-product[data-product="akovaz-50mg-ml"]').click();
    await p.locator('.lr-drawn-row[data-product="akovaz-50mg-ml"] .stepper input').fill('1');
    await p.locator('.lr-drawn-row[data-product="akovaz-50mg-ml"] .stepper input').dispatchEvent('change');
    await p.locator('.lr-diluent select').selectOption('');
    await p.locator('.lr-stage').click();
    const item = p.locator('.lr-item').first();
    await expect(item.locator('.lr-state')).toHaveText(/^Ready/, { timeout: 15_000 });
    const give = item.locator('.lr-give-btn');
    const paused = p.locator('.lr-tray .lr-paused');
    await expect(give).toBeEnabled();
    await expect(paused).toBeHidden();

    // 1. paused (the laptop's Pause, the same command as its button): the Give cannot be used and says why
    expect((await time(page, 'pause')).accepted).toBe(true);
    await expect(give).toBeDisabled({ timeout: 10_000 });
    await expect(paused).toHaveText('The case is paused: nothing can be given until it resumes. You can still prepare.');
    await expect(p.locator('.lr-deliver')).toBeDisabled();
    await shot(p, 'phone-paused-give-disabled', browserName, '.lr-tray .lr-paused');
    expect((await time(page, 'resume')).accepted).toBe(true);
    await expect(give).toBeEnabled({ timeout: 10_000 });

    // 2. the race: tapped while the case runs, the command held at the phone's socket; the laptop pauses; it arrives
    hold = true;
    await give.click();
    await expect.poll(() => held.length, { timeout: 5_000 }).toBe(1);
    expect((await time(page, 'pause')).accepted).toBe(true);
    await expect(give).toBeDisabled({ timeout: 10_000 }); // the phone has heard the pause: the host has applied it
    hold = false;
    held.splice(0).forEach((send) => send());
    await expect(item.locator('.lr-said')).toHaveText('Not given: the case was paused', { timeout: 10_000 });
    await shot(p, 'phone-refused-reason', browserName, '.lr-item .lr-said');
    expect(await engineDrugs(page)).not.toContain('ephedrine');
    await expect.poll(() => logLines(page), { timeout: 10_000 }).toEqual(['Ephedrine 50 mg IV (learner remote: bed 2 remote) not given: the case was paused']);
    await shot(page, 'laptop-log-not-given', browserName);
    const attempt = (await rows(page)).filter((r) => r.kind === 'learner' && r.by === KEY);
    expect(attempt).toEqual([expect.objectContaining({ text: 'Ephedrine 50 mg IV not given: the case was paused', name: 'bed 2 remote', notGiven: 'the case was paused' })]);
    expect(attempt[0]).not.toHaveProperty('dose');
    expect(attempt[0]).not.toHaveProperty('ev');
    await expect.poll(async () => (await admin(page)).filter((a) => a.source === 'learner' && a.drugId === 'ephedrine').map((a) => a.result), { timeout: 10_000 })
      .toEqual([{ accepted: false, reason: 'the case was paused', routeNotModelled: false }]);

    // a finding for the owner (this piece leaves it as it is): the instructor's own Drug sheet during the same pause
    const d = await sheet(page, 'drug');
    await d.locator('input.ip2-drug-search').fill('phenyl');
    await page.keyboard.press('Enter');
    await d.locator('.ip2-presets button.ip2-preset').first().click();
    await d.locator('button.ip2-give', { hasText: /^Give .* now$/ }).click();
    const instructorLine = await (await sheet(page, 'log')).locator('.log li[data-kind=instructor] > span:not(.k)').allInnerTexts();
    await page.waitForTimeout(1500); // a second of wall time: the engine's 1 Hz drugs report would have come by now if it ran
    const pausedDrugs = await engineDrugs(page);
    test.info().annotations.push({ type: `L14 Drug sheet while paused (${browserName})`, description: `Log: ${JSON.stringify(instructorLine)}; engine drugs reported while paused: ${JSON.stringify(pausedDrugs)}` });

    // 3. resumed: the same Give is given, the engine has the drug, the Log names the phone
    expect((await time(page, 'resume')).accepted).toBe(true);
    await expect(give).toBeEnabled({ timeout: 10_000 });
    await expect(paused).toBeHidden();
    await give.click();
    await expect(item.locator('.lr-said')).toHaveText(/^Given 1 mL at \d\d:\d\d$/, { timeout: 10_000 });
    await expect.poll(() => engineDrugs(page), { timeout: 10_000 }).toContain('ephedrine');
    await expect.poll(() => logLines(page), { timeout: 10_000 }).toEqual([ // the Log sheet lists the newest first
      'Ephedrine 50 mg IV (learner remote: bed 2 remote)',
      'Ephedrine 50 mg IV (learner remote: bed 2 remote) not given: the case was paused',
    ]);
    await expect.poll(async () => (await admin(page)).filter((a) => a.source === 'learner' && a.drugId === 'ephedrine').map((a) => a.result.accepted), { timeout: 10_000 }).toEqual([false, true]);
    await shot(p, 'phone-given-after-resume', browserName, '.lr-item .lr-said');
    await shot(page, 'laptop-log-after-resume', browserName);
    test.info().annotations.push({ type: `L14 engine drugs after the resume (${browserName})`, description: JSON.stringify(await engineDrugs(page)) });
    await ctx.close();
  } finally {
    await relay.close();
  }
});
