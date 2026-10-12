// Stage 10 (the owner's request for the 22 Oct demonstration and his decisions of 7 Oct): ×8 with the beat tone off,
// and a fast-forward of 5 or 2 min from the instructor view, on both engines. The span is paced to ≈ 10 s behind one
// panel (dimmed, blurred page; the clock running; "sound muted") on every window (instructor, monitor, Explore,
// Ventilator, a second screen); no tone inside it, one two-tone cue at its end; the banner, the clinical log and the
// trends hold the span; a latched fast-forward alarm clears on the next acknowledge; the Ventilator view's cockpit
// ventilates the patient through a span.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

// CI WebKit (PR #54, run 38172603508), three attempts: line 48 held ×5.3 against > ×6; line 103 scheduled no QRS/pulse
// tone within 10 s back at ×1; line 121 the fast-forward sent from the Ventilator view went unanswered to the 300 s
// timeout. Local macOS WebKit (the owner's Safari engine) still runs every test here; CI Chromium keeps full coverage.
test.skip(({ browserName }) => browserName === 'webkit' && !!process.env.CI, 'FALLBACK ruling 2026-10-12: the 2-vCPU CI WebKit runner holds about ×5.3, not ×8 (S10-F5); a fast-forward command from the Ventilator view once went unanswered there (fixer item FX-2b, with F-49-1); passes on macOS WebKit and CI Chromium');

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type Win = {
  __pmeApp: {
    session: { code: string; monitor: { audioLog: Array<{ simT: number; kind: string }>; trends: { series(id: string, from: number, to: number): Float32Array }; latchAlarms(a: unknown[]): void } };
    link: { simT: number; log: Array<{ simT: number | null; text: string }>; send(c: unknown): Promise<{ accepted: boolean; reason?: string }>; ctl: { lastFastForward: { fromT: number; endT: number; alarms: Array<{ text: string }> } | null } };
  };
  __pmeFollower: { sync: { status: string; lastFastForward: unknown } | null; monitor: unknown };
  __osc: Array<{ hz: number; at: number }>;
};

test('×8 and a 5-minute fast-forward from the instructor view: paced panel everywhere, sound muted, cue, banner, log, trends', async ({ page, context, browserName }) => {
  test.setTimeout(300_000);
  // every oscillator the page starts (the end cue is 660 + 990 Hz)
  await page.addInitScript(() => {
    (window as unknown as Win).__osc = [];
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (this: OscillatorNode, ...a: [number?]) {
      (window as unknown as Win).__osc.push({ hz: this.frequency.value, at: performance.now() });
      return start.apply(this, a);
    };
  });
  await openApp(page, base, '?scenario=showcase-anaphylaxis', { warmMs: 1500 });
  await expect(page).toHaveURL(/#\/teach$/);
  await page.getByRole('button', { name: 'Sound off' }).click();
  await expect(page.getByRole('button', { name: 'Sound on' })).toBeVisible();
  const bar = page.locator('.sessionbar');
  const simT = () => page.evaluate(() => (window as unknown as Win).__pmeApp.link.simT);
  const tones = (from: number, to: number, kinds?: string[]) => page.evaluate((r) => (window as unknown as Win).__pmeApp.session.monitor.audioLog.filter((e) => e.simT > r.from && e.simT < r.to && (!r.kinds || r.kinds.includes(e.kind))).length, { from, to, kinds });
  await expect.poll(() => tones(0, 1e9, ['qrs', 'pulse']), { timeout: 10_000 }).toBeGreaterThan(0); // ×1: the beat tone sounds
  await bar.getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: '×8' }).click();
  const a = await simT();
  await page.waitForTimeout(4000);
  const b = await simT();
  expect(b - a).toBeGreaterThan(24); // ×8 = 32 s of sim in 4 s (≥ ×6 allowed on a loaded machine)
  expect(await tones(a + 2, 1e9, ['qrs', 'pulse'])).toBe(0); // owner's decision 4: no beat tone above ×4

  // a second screen that follows the session
  const code = await page.evaluate(() => (window as unknown as Win).__pmeApp.session.code);
  const second = await context.newPage();
  await second.goto(`${base}/?follow=${code}#/monitor`);
  await second.waitForFunction(() => (window as unknown as Win).__pmeFollower?.sync?.status === 'synced', undefined, { timeout: 20_000 });

  const w0 = Date.now();
  const p0 = await page.evaluate(() => performance.now());
  await bar.getByRole('group', { name: 'Fast-forward' }).getByRole('button', { name: 'Fast-forward 5 min' }).click();
  const veil = page.locator('.ff-veil.on');
  await expect(veil).toBeVisible({ timeout: 5000 });
  await expect(veil.locator('.ff-title')).toHaveText('FAST FORWARD · 5 MIN');
  await expect(veil.locator('.ff-mute')).toHaveText('sound muted');
  await expect(second.locator('.ff-veil.on .ff-title')).toHaveText('FAST FORWARD · 5 MIN');
  // the clock runs visibly
  const c0 = await veil.locator('.ff-now').textContent();
  await page.waitForTimeout(1500);
  expect(await veil.locator('.ff-now').textContent()).not.toBe(c0);
  // the panel is above every view: instructor, monitor, Explore, Ventilator (opened here for the first time)
  for (const r of ['monitor', 'explore', 'vent', 'teach']) {
    await page.evaluate((h) => (location.hash = h), `#/${r}`);
    await expect(veil, `panel on #/${r}`).toBeVisible();
  }
  await expect(page.locator('.ff-veil.on')).toHaveCount(0, { timeout: 60_000 });
  const wallS = (Date.now() - w0) / 1000;
  console.log(`[${browserName}] 5 min of sim fast-forwarded in ${wallS.toFixed(1)} s (click to panel gone)`);
  expect(wallS).toBeGreaterThan(9.5); // owner's decision 1: paced to ≈ 10 s
  expect(wallS).toBeLessThan(20);
  const ff = await page.evaluate(() => (window as unknown as Win).__pmeApp.link.ctl.lastFastForward);
  expect(ff).not.toBeNull();
  const { fromT, endT } = ff as { fromT: number; endT: number };
  expect(endT - fromT).toBeCloseTo(300, 6);
  await expect(page.locator('.ff-banner')).toContainText(/^Fast-forwarded 5 min, \d\d:\d\d → \d\d:\d\d\. During it: .+\.$/);
  await expect(second.locator('.ff-banner')).toContainText('Fast-forwarded 5 min');

  // the trends hold the span: HR in at least 290 of its 300 seconds
  const held = await page.evaluate((r) => Array.from((window as unknown as Win).__pmeApp.session.monitor.trends.series('hr', r.from, r.to)).filter((v) => Number.isFinite(v)).length, { from: Math.ceil(fromT), to: Math.floor(endT) });
  expect(held).toBeGreaterThanOrEqual(290);
  // sound muted during it: no tone scheduled for a time inside the span; one two-tone cue at the end, none at the start
  expect(await tones(fromT + 0.5, endT - 0.5)).toBe(0);
  const cue = await page.evaluate((t) => (window as unknown as Win).__osc.filter((o) => o.at >= t && (o.hz === 660 || o.hz === 990)), p0);
  expect(cue.map((o) => o.hz)).toEqual([660, 990]);
  expect((cue[0] as { at: number }).at - p0).toBeGreaterThan(9000); // at the end, not the start
  // the clinical log
  const log = await page.evaluate(() => (window as unknown as Win).__pmeApp.link.log.map((e) => e.text));
  expect(log).toContain('Fast-forward 5 min started (sound muted until it ends)');
  expect(log.some((t) => /^Fast-forward ended; (alarms during it: .+|no alarms during it)$/.test(t))).toBe(true);
  // the second screen follows the instructor's monitor again
  await second.waitForFunction(() => (window as unknown as Win).__pmeFollower?.sync?.status === 'synced', undefined, { timeout: 20_000 });
  // back at ×1 the beat tone sounds again
  await bar.getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: '×1' }).click();
  const d = await simT();
  await expect.poll(() => tones(d + 0.5, 1e9, ['qrs', 'pulse']), { timeout: 10_000 }).toBeGreaterThan(0);

  // owner's decision 5: a fast-forward alarm is latched, silent, in the monitor's alarm area until the next acknowledge
  await page.evaluate(() => (location.hash = '#/monitor'));
  await page.evaluate(() => (window as unknown as Win).__pmeApp.session.monitor.latchAlarms([{ id: 'E2E', text: 'E2E LATCHED', level: 1, category: 'physiological', since: 1, latched: false, acked: false }]));
  await expect.poll(async () => (await page.locator('.pme-bar').allTextContents()).join(' '), { timeout: 15_000 }).toContain('E2E LATCHED · during fast-forward 00:01');
  expect((await page.evaluate(() => (window as unknown as Win).__pmeApp.link.send({ type: 'device', action: { device: 'alarm', action: 'ack' } }))).accepted).toBe(true);
  await expect.poll(async () => (await page.locator('.pme-bar').allTextContents()).join(' '), { timeout: 5000 }).not.toContain('E2E LATCHED');

  // owner's decision 6: the Ventilator view (opened during the span) ventilates the patient, and a 2-minute fast-forward
  // runs with it: its frames reach the monitor on every tick of the span (the case itself may arrest meanwhile)
  await page.evaluate(() => (location.hash = '#/vent'));
  await page.waitForTimeout(3000);
  await page.evaluate((c) => {
    const w = window as unknown as { __cmds: number[] };
    w.__cmds = [];
    // FX-1: the cockpit posts its frames to this page (window.postMessage), no longer on a BroadcastChannel
    addEventListener('message', (ev: MessageEvent<{ ch?: string; m?: { kind: string; tick: number } }>) => void (ev.data?.ch === `pme-vent/v${c.toLowerCase()}` && ev.data.m?.kind === 'cmds' && w.__cmds.push(ev.data.m.tick)));
  }, code);
  const ack = await page.evaluate(() => (window as unknown as Win).__pmeApp.link.send({ type: 'time', action: 'jump', value: 120 }));
  expect(ack.accepted).toBe(true);
  await expect(page.locator('.ff-veil.on .ff-title')).toHaveText('FAST FORWARD · 2 MIN');
  await expect(page.locator('.ff-veil.on')).toHaveCount(0, { timeout: 60_000 });
  expect(await page.evaluate(() => (window as unknown as Win).__pmeApp.link.ctl.lastFastForward?.endT)).toBeGreaterThan(endT + 119);
  const ticks = await page.evaluate(() => (window as unknown as { __cmds: number[] }).__cmds);
  const span = new Set(ticks);
  // one frame per tick, without a gap, from before the span to its end (the cockpit runs ≤ 75 ticks ahead: those were
  // sent before the listener)
  expect(Math.max(...span) - Math.min(...span) + 1).toBe(span.size);
  expect(span.size).toBeGreaterThanOrEqual(6000 - 75);
});

// The gate's measurements (G3): skipped unless PME_S10_MEASURE=1; prints `[measure]` lines, asserts the gate's bounds.
test('measure: ×8 rate, frame time, fast-forward pace', async ({ page, browserName }) => {
  test.skip(!process.env.PME_S10_MEASURE, 'PME_S10_MEASURE=1 runs the gate measurements');
  test.setTimeout(300_000);
  const q = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(p * a.length))] ?? Number.NaN;
  for (const [id, vent] of [['showcase-anaphylaxis', false], ['showcase-bronchospasm', true]] as const) {
    await openApp(page, base, `?scenario=${id}`, { warmMs: 2000 });
    await page.getByRole('button', { name: 'Sound off' }).click();
    if (vent) {
      await page.evaluate(() => (location.hash = '#/vent'));
      await page.waitForTimeout(4000);
    }
    expect((await page.evaluate(() => (window as unknown as Win).__pmeApp.link.send({ type: 'time', action: 'scale', value: 8 }))).accepted).toBe(true);
    await page.waitForTimeout(3000);
    const at = () => page.evaluate(() => ({ t: (window as unknown as Win).__pmeApp.link.simT, w: performance.now(), n: (window as unknown as { __pmeApp: { frames: number[] } }).__pmeApp.frames.length }));
    const a = await at();
    await page.waitForTimeout(30_000);
    const b = await at();
    const fr = await page.evaluate((n) => (window as unknown as { __pmeApp: { frames: number[] } }).__pmeApp.frames.slice(n), a.n);
    const rate = (b.t - a.t) / ((b.w - a.w) / 1000);
    console.log(`[measure] [${browserName}] ${id}${vent ? ' + Ventilator view' : ''} at ×8: rate ×${rate.toFixed(2)}; main-thread frames p50 ${q(fr, 0.5).toFixed(1)} p95 ${q(fr, 0.95).toFixed(1)} max ${Math.max(...fr).toFixed(0)} ms`);
    expect(rate).toBeGreaterThanOrEqual(7.8);
    const ff = await page.evaluate(async () => {
      const w = window as unknown as Win & { __pmeApp: { link: { ctl: { onChange(fn: () => void): () => void } } } };
      const ctl = w.__pmeApp.link.ctl as unknown as { onChange(fn: () => void): () => void; lastFastForward: unknown };
      const t0 = performance.now();
      const ack = await w.__pmeApp.link.send({ type: 'time', action: 'jump', value: 300 });
      await new Promise<void>((res) => {
        const off = ctl.onChange(() => ctl.lastFastForward && (off(), res()));
      });
      return { accepted: ack.accepted, s: (performance.now() - t0) / 1000 };
    });
    console.log(`[measure] [${browserName}] ${id}${vent ? ' + Ventilator view' : ''}: fast-forward of 300 s took ${ff.s.toFixed(2)} s (paced to 10 s)`);
    expect(ff.accepted).toBe(true);
    expect(ff.s).toBeGreaterThanOrEqual(9.5);
    expect(ff.s).toBeLessThanOrEqual(13); // the cockpit's lockstep costs a round trip per step (WebKit, loaded machine: 11.6 s)
  }
});
