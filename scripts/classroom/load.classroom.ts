// Stage 12: capacity of the classroom relay (docs/plans/stage-12-mobile-learner.md "Capacity"). One instructor page
// (Chromium) runs a showcase case on the BUILT app served by the relay (`pme-relay --static`, its own process), N
// simulated phones follow over WebSockets (a ViewerSync's traffic: hello as a viewer, a fresh hello on every new
// timeline, fast-forward end and host hello), and ONE real phone page (Pixel 7 emulation, CPU slowed down) follows too.
// Per phase (×1, ×8, a 2-minute fast-forward): messages and bytes per second out of the relay, the relay's CPU and
// memory, the followers' lag (receive time − the host's sentAt: one clock, one machine), the instructor page's frame
// interval and the phone page's frame interval and sync state. Writes test-results/classroom/load-<n>-<case>.json.
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { devices, expect, test, type Page } from '@playwright/test';

const repo = resolve(import.meta.dirname, '../..');
const N = Number(process.env.CLASSROOM_N ?? 30);
const THROTTLE = Number(process.env.CLASSROOM_THROTTLE ?? 4);
const PHASE_S = Number(process.env.CLASSROOM_PHASE_S ?? 60);
const VENT = process.env.CLASSROOM_VENT === '1';
const CASE = process.env.CLASSROOM_CASE ?? (VENT ? 'showcase-bronchospasm' : 'showcase-anaphylaxis');

const q = (xs: number[], p: number) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))]! : NaN);
const r1 = (x: number) => Math.round(x * 10) / 10;

let relay: ChildProcess | null = null;
test.afterAll(() => void relay?.kill('SIGTERM'));

/** A simulated phone: a viewer's traffic, counted. */
class Sim {
  ws: WebSocket;
  msgs = 0;
  bytes = 0;
  lags: number[] = [];
  snapshots = 0;
  refused: string | null = null;
  private seq = 0;
  private readonly code: string;
  private readonly id: string;
  constructor(url: string, code: string, id: string) {
    this.code = code;
    this.id = id;
    this.ws = new WebSocket(url);
    this.ws.onopen = () => this.hello();
    this.ws.onmessage = (ev) => {
      const s = String(ev.data);
      this.msgs++;
      this.bytes += s.length;
      const m = JSON.parse(s) as { kind?: string; sentAt?: number; role?: string; body?: Array<{ type: string; phase?: string }>; relay?: string; code?: string };
      if (m.relay === 'error') this.refused = m.code ?? 'error';
      if (typeof m.sentAt === 'number') this.lags.push(Date.now() - m.sentAt);
      if (m.kind === 'snapshot') this.snapshots++;
      if (m.kind === 'hello' && m.role === 'host') this.hello();
      if (m.kind === 'event' && m.body?.some((e) => e.type === 'timeline' || (e.type === 'fastForward' && e.phase === 'end'))) this.hello();
    };
  }
  hello(): void {
    this.ws.send(JSON.stringify({ v: 1, session: this.code, from: this.id, seq: ++this.seq, sentAt: Date.now(), kind: 'hello', role: 'viewer' }));
  }
  take() {
    const o = { msgs: this.msgs, bytes: this.bytes, lags: this.lags, snapshots: this.snapshots };
    this.msgs = 0;
    this.bytes = 0;
    this.lags = [];
    this.snapshots = 0;
    return o;
  }
}

const cpuSeconds = (pid: number) => {
  const t = execFileSync('ps', ['-o', 'time=', '-p', String(pid)], { encoding: 'utf8' }).trim(); // [[dd-]hh:]mm:ss.cc
  return t.split(/[-:]/).map(Number).reduce((a, x) => a * 60 + x, 0);
};
const rssMb = (pid: number) => Number(execFileSync('ps', ['-o', 'rss=', '-p', String(pid)], { encoding: 'utf8' }).trim()) / 1024;
/** The tiles as `PARAM:value` — the phone's and the instructor's agree at some moment of every second when it follows. */
const tiles = (p: Page) => p.evaluate(() => [...document.querySelectorAll('.pme-stile')].map((e) => `${(e as HTMLElement).dataset.param}:${e.querySelector('[data-pme="v"]')?.textContent}`).join(' '));
const frames = (p: Page) => p.evaluate(() => (window as unknown as { __pmeApp: { frames: number[] } }).__pmeApp.frames.splice(0));

test(`classroom load: ${N} followers, ${CASE}`, async ({ page, browser }) => {
  let app = process.env.CLASSROOM_APP;
  if (!app) {
    app = join(mkdtempSync(join(tmpdir(), 'pme-classroom-')), 'app');
    execFileSync(join(repo, 'node_modules/.bin/vite'), ['build', '--base', './', '--outDir', app, '--emptyOutDir', '--logLevel', 'error'], { cwd: join(repo, 'apps/demo'), stdio: 'inherit' });
  }
  relay = spawn(process.execPath, ['--experimental-strip-types', '--no-warnings', join(repo, 'packages/controller/relay/bin.ts'), '--host', '127.0.0.1', '--port', '0', '--static', app, '--quiet', '--max-peers', String(Math.max(60, N + 5))], { stdio: ['ignore', 'pipe', 'inherit'] });
  const port = await new Promise<number>((ok, no) => {
    let out = '';
    const t = setTimeout(() => no(new Error(`relay gave no port: ${out}`)), 15_000);
    relay!.stdout!.on('data', (b) => {
      out += b;
      const m = /ready on ws:\/\/[^:]+:(\d+)\//.exec(out);
      if (m) (clearTimeout(t), ok(Number(m[1])));
    });
  });
  const pid = relay.pid!;
  const base = `http://127.0.0.1:${port}`;
  await page.goto(`${base}/?relay&scenario=${CASE}`);
  await page.waitForFunction(() => '__pmeApp' in window);
  await page.waitForTimeout(2000);
  const code = await page.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);
  if (VENT) await page.evaluate(() => (location.hash = '#/vent'));

  // the real phone page, CPU slowed down like a mid-range phone
  const { defaultBrowserType: _b, ...pixel } = devices['Pixel 7'];
  const ctx = await browser.newContext(pixel);
  const phone = await ctx.newPage();
  const cdp = await ctx.newCDPSession(phone);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  await phone.goto(`${base}/?join=${code}`);
  await phone.waitForFunction(() => (window as unknown as { __pmeFollower?: { sync?: { status: string } } }).__pmeFollower?.sync?.status === 'synced', null, { timeout: 60_000 });

  const sims = Array.from({ length: N }, (_, i) => new Sim(`ws://127.0.0.1:${port}/`, code, `sim-${i}`));
  await expect.poll(() => sims.filter((s) => s.snapshots > 0).length, { timeout: 60_000 }).toBe(N);
  const phoneSync = () => phone.evaluate(() => { const s = (window as unknown as { __pmeFollower: { sync: { status: string; resyncs: number; lagS: number } } }).__pmeFollower.sync; return { status: s.status, resyncs: s.resyncs, lagS: s.lagS }; });
  const send = (c: unknown) => page.evaluate((x) => (window as unknown as { __pmeApp: { link: { send(c: unknown): Promise<{ accepted: boolean; reason?: string }> } } }).__pmeApp.link.send(x), c);

  const rows: Record<string, unknown>[] = [];
  const phase = async (name: string, seconds: number) => {
    for (const s of sims) s.take();
    await frames(page);
    await frames(phone);
    const c0 = cpuSeconds(pid);
    const w0 = Date.now();
    const rss: number[] = [];
    const rs0 = (await phoneSync()).resyncs;
    for (let i = 0; i < seconds; i++) {
      await page.waitForTimeout(1000);
      rss.push(rssMb(pid));
    }
    const wall = (Date.now() - w0) / 1000;
    const cpu = (cpuSeconds(pid) - c0) / wall;
    const got = sims.map((s) => s.take());
    const msgs = got.reduce((a, g) => a + g.msgs, 0);
    const bytes = got.reduce((a, g) => a + g.bytes, 0);
    const lags = got.flatMap((g) => g.lags);
    const hostF = await frames(page);
    const phoneF = await frames(phone);
    const ps = await phoneSync();
    const holding = await phone.locator('.learner-hold').isVisible();
    let tilesEqual = false;
    for (let i = 0; i < 100 && !holding && !tilesEqual; i++) tilesEqual = (await tiles(phone)) === (await tiles(page)) || (await page.waitForTimeout(100), false);
    const row = {
      phase: name, followers: N + 1, seconds: r1(wall),
      relayOutMsgPerS: Math.round(msgs / wall), perFollowerMsgPerS: r1(msgs / wall / N), relayOutKBPerS: Math.round(bytes / wall / 1024), perFollowerKBPerS: r1(bytes / wall / 1024 / N),
      snapshotsPerFollower: r1(got.reduce((a, g) => a + g.snapshots, 0) / N),
      relayCpuPct: r1(cpu * 100), relayRssMbMax: r1(Math.max(...rss)),
      lagMsP50: q(lags, 0.5), lagMsP95: q(lags, 0.95), lagMsMax: Math.max(...lags),
      hostFrameMsP50: r1(q(hostF, 0.5)), hostFrameMsP95: r1(q(hostF, 0.95)),
      phoneFrameMsP50: r1(q(phoneF, 0.5)), phoneFrameMsP95: r1(q(phoneF, 0.95)), phoneFrameMsMax: r1(Math.max(...phoneF)), phoneThrottle: THROTTLE,
      phoneStatus: holding ? 'holding' : ps.status, phoneTilesEqual: holding ? null : tilesEqual, phoneResyncs: ps.resyncs - rs0, phoneLagS: r1(ps.lagS),
      refused: sims.filter((s) => s.refused).length,
    };
    rows.push(row);
    console.log(JSON.stringify(row));
  };
  const speed = async (k: number) => expect((await send({ type: 'time', action: 'scale', value: k })).accepted).toBe(true);

  await phase('x1', PHASE_S);
  await speed(8);
  await phase('x8', PHASE_S);
  await speed(1);
  expect((await send({ type: 'time', action: 'jump', value: 120 })).accepted).toBe(true);
  await phase('fast-forward 2 min (+ resync)', 20);
  // one more than the session takes is refused, not served
  const extra = Array.from({ length: Math.max(0, Math.max(60, N + 5) - N) }, (_, i) => new Sim(`ws://127.0.0.1:${port}/`, code, `extra-${i}`));
  await page.waitForTimeout(3000);
  const over = new Sim(`ws://127.0.0.1:${port}/`, code, 'over');
  await expect.poll(() => over.refused, { timeout: 10_000 }).toBe('full');
  for (const s of [...sims, ...extra, over]) s.ws.close();
  mkdirSync(join(repo, 'test-results/classroom'), { recursive: true });
  writeFileSync(join(repo, `test-results/classroom/load-${N}-${CASE}.json`), JSON.stringify(rows, null, 2));
  await ctx.close();
});
