// EEG plan E12, the owner's Q9 (docs/plans/stage-eeg-depth-of-anaesthesia.md §10): the instructor's EEG artefact
// switches on the Instructor page: the Devices sheet's group "EEG device: artefacts" (panel/eeg.ts), shown while an EEG
// device is on (the owner, 12 November: "the EEG should go into devices as a device"). Through a relay in a process of its OWN (the built
// kit's when PME_KIT_RELAY names it, else the source relay's bin; never the in-process relay, which can hide a host that
// acknowledges without applying), a tablet follows the room's depth device at `#/depth`. The instructor switches a
// loose electrode on: the host ENGINE's state says so, the tablet's depth window shows the degraded signal quality
// ("Check electrodes") and the raised impedance, at each reading the same quality the host's own engine read at that
// sim time, and the Log and the case record carry the line. Off again: the state, the window and the record follow.
// The second case: at 1280 × 720, 1280 × 800, 1440 × 900 and 1920 × 1080, with the Devices sheet open and the EEG group
// shown, every control of the dock, every button of the sheet's footer, its close button and both EEG switches are the
// element at their own centre. Nothing is staged: the marks group's overlap with "Staged · n" at 1280 px exists on main
// and is being cured on its own branch (instructor-dock-patient-tool).
// Ports: PME_E2E_PORT for Vite, PME_E2E_RELAY_PORT for the relay (that port + 6 + the worker index); unset, the
// system picks free ones.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { devices, expect, test, type Browser, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, sheet, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type Flags = { questionable: boolean; invalid: boolean };
type HostW = {
  __pmeApp: {
    session: { code: string; monitor: { on(fn: (e: { type: string; t: number; flags?: Flags }) => void): () => void }; record: { data: { rows: Array<{ text: string }> } } };
    link: { log: Array<{ text: string; refused?: string }>; ctl: { state: { eeg?: { model: string; impedanceKOhm: number[]; ecgPickup: boolean } } | null } };
  };
  __hostQ?: Record<string, Flags>;
};
type FolW = { __pmeFollower?: { sync: { status: string } | null } };

const relayPort = () => {
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  return fixed ? fixed + 6 + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0;
};

/** A relay in a process of its own (as depth-window.e2e.ts starts it). */
async function processRelay(port: number): Promise<{ port: number; close(): Promise<void> }> {
  const dir = mkdtempSync(join(tmpdir(), 'e12b-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>'); // the Room page reads `serves`; the pages come from Vite here
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
  console.log(`[Q9] relay in its own process: ${kit ? `the built kit's ${kit}` : 'the source relay bin'} on ${got}`);
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

/** The host on the Instructor page: a free-run patient, the room's depth device the generic reader; its own engine's
 *  reading flags kept by sim time. */
async function host(page: Page, q: string): Promise<string> {
  await openApp(page, base, `${q}#/teach2`, { warmMs: 1500, site: { eegModel: 'generic' } });
  await page.evaluate(() => {
    const w = window as unknown as HostW;
    w.__hostQ = {};
    w.__pmeApp.session.monitor.on((e) => {
      if (e.type === 'eegReading' && e.flags) (w.__hostQ as Record<string, Flags>)[String(e.t)] = e.flags;
    });
  });
  return page.evaluate(() => (window as unknown as HostW).__pmeApp.session.code);
}
/** With PME_SHOTS set (a local review run), a screenshot of `p` there; nothing on CI. */
const shot = async (p: Page, name: string, browserName: string) => {
  if (process.env.PME_SHOTS) await p.screenshot({ path: join(process.env.PME_SHOTS, `${name}-${browserName}.png`) });
};
const engineEeg = (page: Page) => page.evaluate(() => (window as unknown as HostW).__pmeApp.link.ctl.state?.eeg ?? null);

/** A tablet that scanned the room's QR: the picker, then Depth of anaesthesia, synced and reading. */
async function depthTablet(browser: Browser, code: string, ws: string): Promise<Page> {
  const { defaultBrowserType: _b, ...dev } = devices['iPad (gen 7)'];
  const p = await (await browser.newContext(dev)).newPage();
  await p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws)}#/pick`);
  const card = p.locator('.join-card[data-show="depth"]');
  await expect(card.locator('.st')).toHaveText('Ready');
  await card.getByRole('button', { name: 'Show here' }).click();
  await expect(p).toHaveURL(/#\/depth$/);
  await p.waitForFunction(() => (window as unknown as FolW).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000 });
  await expect(p.locator('.depth-window')).toHaveAttribute('data-on', 'true', { timeout: 15_000 });
  return p;
}

/** The quality the tablet shows now, and the host engine's own reading flags at that reading's sim time. */
async function quality(p: Page, page: Page): Promise<{ t: string; shown: string; imp: string; host: string }> {
  const r = await p.evaluate(() => ({
    t: (document.querySelector('.depth-window') as HTMLElement).dataset.t ?? '',
    shown: (document.querySelector('.depth-sqi') as HTMLElement | null)?.dataset.q ?? '',
    imp: document.querySelector('.depth-tile[data-id="eegImp"] .v')?.textContent ?? '',
  }));
  await expect.poll(() => page.evaluate((t) => (window as unknown as HostW).__hostQ?.[t] !== undefined, r.t), { timeout: 5000 }).toBe(true);
  const f = await page.evaluate((t) => (window as unknown as HostW).__hostQ?.[t] as Flags, r.t);
  return { ...r, host: f.invalid ? 'invalid' : f.questionable ? 'questionable' : 'good' };
}
/** Wait until the tablet shows `want`, then check it is the host's own quality over three readings. */
async function shows(p: Page, page: Page, want: string, imp: string): Promise<void> {
  await expect(p.locator('.depth-sqi')).toHaveAttribute('data-q', want, { timeout: 15_000 });
  let last = '';
  for (let n = 0; n < 3;) {
    const r = await quality(p, page);
    if (r.t !== last) {
      expect(r.shown, `the tablet's quality at ${r.t} s is the host engine's`).toBe(r.host);
      expect(r.shown).toBe(want);
      expect(r.imp).toBe(imp);
      last = r.t;
      n++;
    }
    await p.waitForTimeout(400);
  }
}

test("through a relay in its own process: the instructor's loose electrode degrades the tablet's depth quality as the host engine's, and off restores it", async ({ page, browser, browserName }) => {
  test.setTimeout(240_000);
  const relay = await processRelay(relayPort());
  try {
    const ws = `ws://127.0.0.1:${relay.port}/`;
    const code = await host(page, `?relay=${encodeURIComponent(ws)}`);
    const p = await depthTablet(browser, code, ws);
    await shows(p, page, 'good', '2.0');
    await expect(p.locator('.depth-sqi')).toHaveText('Signal good');
    await shot(p, 'tablet-depth-before', browserName);
    const s = await sheet(page, 'devices');
    await expect(s.locator('[data-group="eeg"]')).toBeVisible();
    const loose = s.getByRole('button', { name: 'Loose electrode', exact: true });
    await expect(loose).toHaveAttribute('aria-pressed', 'false');
    await loose.click();
    await expect.poll(() => engineEeg(page), { timeout: 10_000 }).toMatchObject({ impedanceKOhm: [2, 2, 20] });
    await expect(loose).toHaveAttribute('aria-pressed', 'true');
    await expect(s.locator('[data-artefact="electrode"] .eeg-state')).toHaveText('Electrodes 2 · 2 · 20 kΩ');
    await shows(p, page, 'questionable', '20.0');
    await expect(p.locator('.depth-sqi')).toHaveText('Check electrodes');
    await shot(p, 'tablet-depth-loose-electrode', browserName);
    await shot(page, 'host-devices-eeg-loose-electrode', browserName);
    console.log(`[Q9] ${browserName}: loose electrode on: the tablet reads "Check electrodes", 20.0 kΩ, the host engine's quality`);
    const line = 'EEG electrodes 2 · 2 · 20 kΩ';
    const logs = () => page.evaluate(() => (window as unknown as HostW).__pmeApp.link.log.map((x) => x.text));
    const rows = () => page.evaluate(() => (window as unknown as HostW).__pmeApp.session.record.data.rows.map((x) => x.text));
    expect(await logs()).toContain(line);
    await expect.poll(rows).toContain(line);
    await loose.click();
    await expect.poll(() => engineEeg(page), { timeout: 10_000 }).toMatchObject({ impedanceKOhm: [2, 2, 2] });
    await expect(loose).toHaveAttribute('aria-pressed', 'false');
    await shows(p, page, 'good', '2.0');
    await shot(p, 'tablet-depth-after-off', browserName);
    expect(await logs()).toContain('EEG electrodes 2 kΩ each');
    await expect.poll(rows).toContain('EEG electrodes 2 kΩ each');
    console.log(`[Q9] ${browserName}: loose electrode off: "Signal good" and 2.0 kΩ again, as the host engine's`);
    await p.context().close();
  } finally {
    await relay.close();
  }
});

test('at four laptop sizes, with the Devices sheet open and its EEG group shown, every dock control, every footer button, the close button and both EEG switches are on top', async ({ page, browserName }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, base, '#/teach2', { warmMs: 1500, site: { eegModel: 'generic' } });
  await expect.poll(() => engineEeg(page), { timeout: 10_000 }).toMatchObject({ model: 'generic' });
  const s = await sheet(page, 'devices'); // the dock's tool, clicked by Playwright: visible, enabled, not covered
  await expect(s.locator('[data-group="eeg"]')).toBeVisible();
  expect(await page.locator('.ip2-dock-tools button.ip2-tool[data-sheet="eeg"]').count()).toBe(0); // no EEG tool in the dock
  for (const [w, hgt] of [[1280, 720], [1280, 800], [1440, 900], [1920, 1080]] as const) {
    await page.setViewportSize({ width: w, height: hgt });
    await s.locator('[data-artefact="electrode"]').scrollIntoViewIfNeeded();
    const misses = await page.evaluate(() => {
      const sheetEl = document.querySelector('.ip2-sheets .ip2-sheet[data-sheet="devices"]') as HTMLElement;
      const els = [
        ...document.querySelectorAll<HTMLElement>('.ip2-dock button, .ip2-dock a, .ip2-dock input'),
        ...sheetEl.querySelectorAll<HTMLElement>('.ip2-sheet-foot button, .ip2-sheet-close, [data-artefact] button'),
      ].filter((e) => e.offsetParent !== null);
      return els.flatMap((e) => {
        const r = e.getBoundingClientRect();
        const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const ok = r.width > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && !!at && (at === e || e.contains(at));
        return ok ? [] : [`${(e.textContent || e.getAttribute('aria-label') || e.tagName).trim()} (covered by ${(at as HTMLElement | null)?.className ?? 'nothing'})`];
      });
    });
    expect(misses, `${w} × ${hgt}`).toEqual([]);
    await shot(page, `instructor-devices-eeg-${w}x${hgt}`, browserName);
  }
});
