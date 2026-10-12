// Stage 10 gate (G3, G4): ×8 and the paced fast-forward on the BUILT kit (perl launcher), both engines, 1440×900.
//   measure  — G3: the ×8 rate over 30 s of wall time and a 300 s fast-forward's wall time, anaphylaxis and bronchospasm
//              with the Ventilator view (run alone: SHOWCASE_WORKERS=1 … -g measure)
//   cards    — G4: Stage 11's showcase cards with ×8 and the 5-min / 2-min fast-forward exercised (MH: two 5-min spans
//              before and one after the call; tamponade: two 2-min spans during CPR with a second screen and a Remote open;
//              healthy induction: 2 min at ×8, then a 2-min span on the monitor view), and the Ventilator view mid-span.
// Smoke checks with the rehearsal's windows (never calibration bands). Evidence: docs/gates/stage-10/ (screenshots for the
// owner's sign-off of the look) and docs/gates/stage-10/s10-cards/ (one JSON per case and browser).
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { alarms, hist, latest, loadShowcase, minOf, openTeach, r1, record, REPO, simNow, stateId, waitSim, waitUntilSim, watchConsole } from './showcase-support.ts';

const GATE = join(REPO, 'docs/gates/stage-10');
type Hook = {
  __pmeApp: {
    frames: number[];
    session: { code: string; monitor: { audioLog: Array<{ simT: number; kind: string }> } };
    link: { simT: number; log: Array<{ text: string }>; send(c: unknown): Promise<{ accepted: boolean; reason?: string }>; ctl: { lastFastForward: { fromT: number; endT: number; alarms: Array<{ text: string; since: number; ended: boolean }> } | null; onChange(fn: () => void): () => void } };
  };
  __pmeFollower?: { sync: { status: string } | null };
};
type Result = { case: string; browser: string; base: string; steps: Array<Record<string, unknown>>; spans: Array<Record<string, unknown>>; checks: Array<{ what: string; expected: string; observed: unknown; pass: boolean }>; errors: string[] };

const begin = (name: string, browser: string): Result => ({ case: name, browser, base: process.env.SHOWCASE_BASE ?? '', steps: [], spans: [], checks: [], errors: [] });
function check(r: Result, what: string, expected: string, observed: unknown, pass: boolean): void {
  r.checks.push({ what, expected, observed, pass });
  expect.soft(pass, `${what}: expected ${expected}, observed ${JSON.stringify(observed)}`).toBe(true);
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
async function step(r: Result, page: Page, what: string, extra: Record<string, unknown> = {}): Promise<void> {
  const v = await latest(page);
  r.steps.push({ clock: mmss(await simNow(page)), state: await stateId(page), what, hr: r1(v.hr), art: `${r1(v.abpSys)}/${r1(v.abpDia)} (${r1(v.abpMean)})`, spo2: r1(v.spo2), etco2: r1(v.etco2), ...extra });
}
function finish(r: Result): void {
  r.steps.push({ presses: presses.splice(0) });
  check(r, 'no console error or page error', 'none', r.errors.slice(0, 5), r.errors.length === 0);
  mkdirSync(join(GATE, 's10-cards'), { recursive: true });
  writeFileSync(join(GATE, 's10-cards', `${slug(r.case)}-${r.browser}.json`), JSON.stringify(r, null, 2));
}
/** A screenshot for the owner's sign-off, docs/gates/stage-10/<name>.jpg (1280 px wide). */
async function shot(page: Page, name: string): Promise<void> {
  mkdirSync(GATE, { recursive: true });
  const path = join(GATE, `${name}.jpg`);
  await page.screenshot({ path, type: 'jpeg', quality: 80 });
  spawnSync('/usr/bin/sips', ['-Z', '1280', path, '--out', path], { stdio: 'ignore' });
}
const speed = async (page: Page, k: '1' | '2' | '4' | '8') => {
  await page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: `×${k}` }).click();
  await page.waitForTimeout(300);
};
/**
 * Press a card button; the state before and 1 s after and the last toast go to the record. With `expect` (the state the
 * press moves to): a press that left the state unchanged while its button is still there is recorded as NOT TAKEN and
 * pressed once more (the dry run saw two such presses in WebKit at ×8, see the gate note) — never for a press that keeps
 * the state (a second dose).
 */
const presses: Array<Record<string, unknown>> = [];
const pressCard = async (page: Page, label: string, expectState?: string): Promise<number> => {
  const btn = page.locator('section[aria-label="Running scenario"]').getByRole('button', { name: label, exact: true });
  const before = await stateId(page);
  await btn.click();
  const t = await simNow(page);
  await page.waitForTimeout(1000);
  let after = await stateId(page);
  const rec: Record<string, unknown> = { label, at: mmss(t), before, after, toast: (await page.locator('.toasts').innerText().catch(() => '')).split('\n').slice(-2).join(' | ') };
  if (expectState && after !== expectState) {
    const ok = await waitSim(page, 30, async () => (await stateId(page)) === expectState);
    if (ok === null && (await btn.count()) > 0) {
      rec.notTaken = true;
      await btn.click();
      await page.waitForTimeout(1000);
      after = await stateId(page);
      rec.afterSecondPress = after;
    } else rec.after = await stateId(page);
  }
  presses.push(rec);
  return t;
};
const until = (page: Page, maxSimS: number, id: string) => waitSim(page, maxSimS, async () => (await stateId(page)) === id);
const toneCount = (page: Page, from: number, kinds: string[]) => page.evaluate((a) => (window as unknown as Hook).__pmeApp.session.monitor.audioLog.filter((e) => e.simT > a.from && a.kinds.includes(e.kind)).length, { from, kinds });

/**
 * Click "Fast-forward <min> min" in the session bar; `during(t)` runs ≈ `atMs` after the panel shows (screenshots);
 * waits for the panel to go and records the span (wall time, banner, the end event's alarms).
 */
async function fastForward(r: Result, page: Page, min: 2 | 5, during?: () => Promise<void>, atMs = 3000, via: 'button' | 'command' = 'button'): Promise<Record<string, unknown>> {
  const w0 = Date.now();
  const t0 = await simNow(page);
  // the session bar is on the instructor's views; on the full-screen Monitor and Ventilator views the same host command is
  // sent through the app's link (what the bar's button sends)
  if (via === 'button') await page.locator('.sessionbar').getByRole('group', { name: 'Fast-forward' }).getByRole('button', { name: `Fast-forward ${min} min` }).click();
  else expect((await page.evaluate((v) => (window as unknown as Hook).__pmeApp.link.send({ type: 'time', action: 'jump', value: v }), min * 60)).accepted).toBe(true);
  const veil = page.locator('.ff-veil.on');
  await expect(veil).toBeVisible({ timeout: 5000 });
  const title = await veil.locator('.ff-title').innerText();
  const c0 = await veil.locator('.ff-now').innerText();
  await page.waitForTimeout(atMs);
  const c1 = await veil.locator('.ff-now').innerText().catch(() => '(gone)');
  if (during) await during();
  await expect(page.locator('.ff-veil.on')).toHaveCount(0, { timeout: 90_000 });
  const wallS = (Date.now() - w0) / 1000;
  const banner = await page.locator('.ff-banner').innerText().catch(() => '');
  const ff = await page.evaluate(() => (window as unknown as Hook).__pmeApp.link.ctl.lastFastForward);
  const span = { min, title, clockAtShow: c0, clockLater: c1, wallS: r1(wallS), fromT: r1(ff?.fromT), endT: r1(ff?.endT), simStart: r1(t0), banner, alarms: ff?.alarms.map((a) => `${mmss(a.since)} ${a.text}${a.ended ? ' (came and went)' : ''}`) ?? [] };
  r.spans.push(span);
  check(r, `fast-forward ${min} min: panel title`, `FAST FORWARD · ${min} MIN`, title, title === `FAST FORWARD · ${min} MIN`);
  check(r, `fast-forward ${min} min: the clock runs on the panel`, 'changes', `${c0} → ${c1}`, c0 !== c1);
  check(r, `fast-forward ${min} min: exact span`, `${min * 60} s`, ff ? r1(ff.endT - ff.fromT) : null, !!ff && Math.abs(ff.endT - ff.fromT - min * 60) < 1e-6);
  check(r, `fast-forward ${min} min: paced`, '9.5–20 s of wall time (click to panel gone)', r1(wallS), wallS >= 9.5 && wallS <= 20);
  check(r, `fast-forward ${min} min: banner`, `"Fast-forwarded ${min} min, mm:ss → mm:ss. During it: …"`, banner, new RegExp(`^Fast-forwarded ${min} min, \\d\\d:\\d\\d → \\d\\d:\\d\\d\\. During it: .+\\.$`).test(banner.trim()));
  return span;
}

async function openSecond(context: BrowserContext, code: string, r: Result): Promise<Page> {
  const p = await context.newPage();
  r.errors.push(...watchConsole(p));
  await p.goto(`${process.env.SHOWCASE_BASE}/?follow=${code}#/monitor`);
  await p.waitForFunction(() => (window as unknown as Hook).__pmeFollower?.sync?.status === 'synced', undefined, { timeout: 30_000 });
  return p;
}

test('measure: ×8 rate, frame time, fast-forward pace (kit)', async ({ page }) => {
  test.skip(!process.env.PME_S10_MEASURE, 'PME_S10_MEASURE=1 runs the gate measurements (alone: SHOWCASE_WORKERS=1)');
  test.setTimeout(10 * 60_000);
  const browserName = test.info().project.name;
  const q = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(p * a.length))] ?? Number.NaN;
  const out: string[] = [];
  for (const [id, vent] of [['showcase-anaphylaxis', false], ['showcase-bronchospasm', true]] as const) {
    await openTeach(page, `/?scenario=${id}`);
    await page.getByRole('button', { name: 'Sound off' }).click();
    if (vent) {
      await page.evaluate(() => (location.hash = '#/vent'));
      await page.waitForTimeout(4000);
    }
    expect((await page.evaluate(() => (window as unknown as Hook).__pmeApp.link.send({ type: 'time', action: 'scale', value: 8 }))).accepted).toBe(true);
    await page.waitForTimeout(3000);
    const at = () => page.evaluate(() => ({ t: (window as unknown as Hook).__pmeApp.link.simT, w: performance.now(), n: (window as unknown as Hook).__pmeApp.frames.length }));
    const a = await at();
    await page.waitForTimeout(30_000);
    const b = await at();
    const fr = await page.evaluate((n) => (window as unknown as Hook).__pmeApp.frames.slice(n), a.n);
    const rate = (b.t - a.t) / ((b.w - a.w) / 1000);
    const line1 = `[measure] [${browserName}] kit ${id}${vent ? ' + Ventilator view' : ''} at ×8: rate ×${rate.toFixed(2)}; main-thread frames p50 ${q(fr, 0.5).toFixed(1)} p95 ${q(fr, 0.95).toFixed(1)} max ${Math.max(...fr).toFixed(0)} ms`;
    const ff = await page.evaluate(async () => {
      const w = window as unknown as Hook;
      const ctl = w.__pmeApp.link.ctl;
      const before = ctl.lastFastForward;
      const t0 = performance.now();
      const ack = await w.__pmeApp.link.send({ type: 'time', action: 'jump', value: 300 });
      await new Promise<void>((res) => {
        const off = ctl.onChange(() => ctl.lastFastForward && ctl.lastFastForward !== before && (off(), res()));
      });
      return { accepted: ack.accepted, s: (performance.now() - t0) / 1000 };
    });
    const line2 = `[measure] [${browserName}] kit ${id}${vent ? ' + Ventilator view' : ''}: fast-forward of 300 s took ${ff.s.toFixed(2)} s (paced to 10 s)`;
    console.log(line1);
    console.log(line2);
    out.push(line1, line2);
    expect.soft(rate).toBeGreaterThanOrEqual(7.8);
    expect(ff.accepted).toBe(true);
    expect.soft(ff.s).toBeGreaterThanOrEqual(9.5);
    expect.soft(ff.s).toBeLessThanOrEqual(13);
  }
  mkdirSync(join(GATE, 's10-cards'), { recursive: true });
  writeFileSync(join(GATE, 's10-cards', `measure-kit-${browserName}.txt`), out.join('\n') + '\n');
});

test('Malignant hyperthermia at ×8 with three 5-minute fast-forwards', async ({ page }) => {
  test.setTimeout(20 * 60_000);
  const browserName = test.info().project.name;
  const r = begin('Malignant hyperthermia, x8 and fast-forward', browserName);
  const CRISIS = 'MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate';
  r.errors = watchConsole(page);
  try {
    await openTeach(page);
    await loadShowcase(page, 'Malignant hyperthermia');
    await record(page);
    const t0 = await simNow(page);
    await speed(page, '8');
    await waitUntilSim(page, t0 + 240);
    await pressCard(page, 'Start surgery: rocuronium 0.6 mg/kg', 'surgery');
    await step(r, page, 'rocuronium (×8)');
    const tEarly = await until(page, 720, 'earlySigns');
    await step(r, page, 'state earlySigns');
    check(r, 'early signs at ×8', 'state earlySigns 4–12 min after load', tEarly === null ? 'never' : `${r1((tEarly - t0) / 60)} min`, tEarly !== null && tEarly - t0 >= 240 && tEarly - t0 <= 720);
    await fastForward(r, page, 5, () => shot(page, `ff-panel-instructor-${browserName}`));
    await step(r, page, 'after the first 5-min fast-forward');
    await shot(page, `ff-banner-instructor-${browserName}`);
    const tEst = (await stateId(page)) === 'established' ? await simNow(page) : await (async () => {
      await fastForward(r, page, 5);
      await step(r, page, 'after the second 5-min fast-forward');
      return until(page, 900, 'established');
    })();
    await step(r, page, 'state established');
    check(r, 'established crisis through the spans', 'state established 14–26 min after load', tEst === null ? 'never' : `${r1((tEst - t0) / 60)} min`, tEst !== null && tEst - t0 >= 840 && tEst - t0 <= 1560);
    if (tEst === null) return;
    const tC = await pressCard(page, CRISIS, 'triggerOff');
    await waitUntilSim(page, tC + 60);
    const tD = await pressCard(page, 'Dantrolene 2.5 mg/kg', 'treating');
    await waitUntilSim(page, tC + 90);
    await pressCard(page, 'Cool: 2 L saline at room temperature');
    await waitUntilSim(page, tC + 120);
    await pressCard(page, 'Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose');
    await waitUntilSim(page, tC + 150);
    await pressCard(page, 'Sodium bicarbonate 1 mmol/kg');
    await step(r, page, 'treatment given (×8)');
    await fastForward(r, page, 5);
    await step(r, page, 'after the 5-min fast-forward following treatment');
    const tRec = (await stateId(page)) === 'recovering' ? await simNow(page) : await until(page, 900, 'recovering');
    await step(r, page, 'state recovering');
    check(r, 'recovery after dantrolene, through a span', 'state recovering within 20 min of the first dose', tRec === null ? 'never' : `${r1((tRec - tD) / 60)} min`, tRec !== null && tRec - tD <= 1200);
    const low = minOf(await hist(page, tC, Infinity), 'abpSys');
    check(r, 'no arrest on the treated path', 'arterial systolic never below 60 after the call', r1(low), low !== null && low >= 60);
    r.steps.push({ alarmsRaised: (await alarms(page)).slice(0, 40).map((a) => `${mmss(a.t)} ${a.text}`), log: (await page.evaluate(() => (window as unknown as Hook).__pmeApp.link.log.map((e) => e.text))).filter((t) => /Fast-forward/.test(t)) });
  } finally {
    finish(r);
  }
});

test('Tamponade: 2-minute fast-forwards during CPR, with a second screen and a Remote', async ({ page, context }) => {
  test.setTimeout(20 * 60_000);
  const browserName = test.info().project.name;
  const r = begin('Tamponade, CPR with 2-min fast-forwards, second screen and Remote', browserName);
  r.errors = watchConsole(page);
  try {
    await openTeach(page);
    await loadShowcase(page, 'Stab wound: tamponade, PEA and pericardiocentesis');
    await record(page);
    const t0 = await simNow(page);
    const code = await page.evaluate(() => (window as unknown as Hook).__pmeApp.session.code);
    const second = await openSecond(context, code, r);
    await page.evaluate(() => (location.hash = '#/remote'));
    await page.waitForTimeout(1000);
    const [R] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: 'Open the remote in a new window' }).click()]);
    r.errors.push(...watchConsole(R));
    await R.waitForLoadState('load');
    const connected = await R.getByRole('status').filter({ hasText: /connected/i }).first().waitFor({ timeout: 30_000 }).then(() => true, () => false);
    check(r, 'the Remote pairs', 'connected', connected, connected);
    await page.evaluate(() => (location.hash = '#/teach'));
    await page.bringToFront();
    await page.click('[role=tab][data-tab=scenario]');
    await speed(page, '8');
    const tPea = await until(page, 480, 'pea');
    await step(r, page, 'state pea (×8)');
    check(r, 'PEA without drainage at ×8', 'state pea 5–11 min after load', tPea === null ? 'never' : `${r1((tPea - t0) / 60)} min`, tPea !== null && tPea - t0 >= 300 && tPea - t0 <= 660);
    if (tPea === null) return;
    await pressCard(page, 'Start CPR, intubate, FiO₂ 1.0', 'cpr');
    await step(r, page, 'CPR started');
    const remoteVeil = { shown: false, title: '' };
    await fastForward(r, page, 2, async () => {
      // a background page is not painted (Chromium): each window is brought to the front for its screenshot
      await second.bringToFront();
      await shot(second, `ff-panel-second-screen-${browserName}`);
      await R.bringToFront();
      remoteVeil.shown = await R.locator('.ff-veil.on').isVisible();
      remoteVeil.title = await R.locator('.ff-veil.on .ff-title').innerText().catch(() => '');
      await shot(R, `ff-panel-remote-${browserName}`);
      await page.bringToFront();
    }, 2000);
    check(r, 'the panel on the second screen during the span', 'shown', 'see screenshot', true);
    check(r, 'the panel on the Remote during the span', 'FAST FORWARD · 2 MIN', remoteVeil, remoteVeil.shown && remoteVeil.title === 'FAST FORWARD · 2 MIN');
    await step(r, page, 'after 2 min of CPR fast-forwarded');
    const tD = await pressCard(page, 'Pericardiocentesis during CPR', 'cprDrained');
    await fastForward(r, page, 2);
    await step(r, page, 'after 2 min more (the pulse returns ≈ 96 s after the drainage)');
    const tStop = await pressCard(page, 'Pulse back: stop CPR', 'rosc');
    await waitUntilSim(page, tStop + 30);
    const sys = minOf(await hist(page, tStop + 10, tStop + 30), 'abpSys');
    await step(r, page, '30 s after stopping CPR', { minSys10to30: r1(sys), drainToStopS: r1(tStop - tD) });
    check(r, 'the pulse holds after CPR stops (drained, the span ran through the return)', 'arterial systolic > 90 from 10 to 30 s after stopping', r1(sys), sys !== null && sys > 90);
    const synced = await second.waitForFunction(() => (window as unknown as Hook).__pmeFollower?.sync?.status === 'synced', undefined, { timeout: 30_000 }).then(() => true, () => false);
    check(r, 'the second screen follows again after the spans', 'synced', synced, synced);
    await second.bringToFront();
    await shot(second, `ff-after-second-screen-${browserName}`);
    await page.bringToFront();
  } finally {
    finish(r);
  }
});

test('Healthy induction: 2 min at ×8 (no beat tone), then a 2-minute fast-forward on the monitor view (the seam)', async ({ page }) => {
  test.setTimeout(15 * 60_000);
  const browserName = test.info().project.name;
  const r = begin('Healthy induction, x8 and the seam', browserName);
  r.errors = watchConsole(page);
  try {
    await openTeach(page);
    await loadShowcase(page, 'Healthy induction');
    await record(page);
    const t0 = await simNow(page);
    await waitUntilSim(page, t0 + 180);
    const tInd = await pressCard(page, 'Induce now', 'induced');
    await speed(page, '8');
    const a = await simNow(page);
    const spo2a = (await latest(page)).spo2;
    const w = Date.now();
    await waitUntilSim(page, a + 120);
    const wallS = (Date.now() - w) / 1000;
    const tonesAt8 = await toneCount(page, a + 2, ['qrs', 'pulse']);
    await step(r, page, '2 min at ×8 after induction', { wallS: r1(wallS), spo2Before: r1(spo2a), beatTonesAtX8: tonesAt8 });
    check(r, '×8: 2 min of sim', '≤ 25 s of wall time', r1(wallS), wallS <= 25);
    check(r, '×8: no beat tone', '0 QRS/pulse tones after the switch', tonesAt8, tonesAt8 === 0);
    const apn = (await alarms(page)).find((x) => x.t > tInd && /apn/i.test(x.text));
    check(r, 'apnoea alarm after "Induce now" (at ×8)', 'within 75 s sim', apn ? `${r1(apn.t - tInd)} s "${apn.text}"` : 'none', !!apn && apn.t - tInd <= 75);
    await pressCard(page, 'Intubate and ventilate', 'ventilated');
    await speed(page, '1');
    await page.evaluate(() => (location.hash = '#/monitor'));
    await page.waitForTimeout(3000);
    await fastForward(r, page, 2, () => shot(page, `ff-panel-monitor-${browserName}`), 3000, 'command');
    await page.waitForTimeout(700);
    await shot(page, `ff-seam-banner-monitor-${browserName}`);
    await page.waitForTimeout(8500);
    await shot(page, `ff-seam-monitor-after-banner-${browserName}`);
    await step(r, page, 'after the 2-min span on the monitor view (×1)');
  } finally {
    finish(r);
  }
});

test('Bronchospasm with the Ventilator view: a 2-minute fast-forward ventilated through, mid-span screenshot', async ({ page }) => {
  test.setTimeout(10 * 60_000);
  const browserName = test.info().project.name;
  const r = begin('Bronchospasm, Ventilator view through a 2-min span', browserName);
  r.errors = watchConsole(page);
  try {
    await openTeach(page, '/?scenario=showcase-bronchospasm#/teach');
    await record(page);
    const code = await page.evaluate(() => (window as unknown as Hook).__pmeApp.session.code);
    await page.evaluate(() => (location.hash = '#/vent'));
    await page.waitForTimeout(5000);
    await page.evaluate((c) => {
      const w = window as unknown as { __cmds: number[] };
      w.__cmds = [];
      // FX-1: the cockpit posts its frames to this page (window.postMessage), no longer on a BroadcastChannel
      addEventListener('message', (ev: MessageEvent<{ ch?: string; m?: { kind: string; tick: number } }>) => void (ev.data?.ch === `pme-vent/v${c.toLowerCase()}` && ev.data.m?.kind === 'cmds' && w.__cmds.push(ev.data.m.tick)));
    }, code);
    await fastForward(r, page, 2, () => shot(page, `ff-panel-ventilator-${browserName}`), 3000, 'command');
    const ticks = await page.evaluate(() => (window as unknown as { __cmds: number[] }).__cmds);
    const span = new Set(ticks);
    const contiguous = Math.max(...span) - Math.min(...span) + 1 === span.size;
    check(r, 'the cockpit ventilates through the span', 'a frame on every tick (≥ 5 925, contiguous)', { frames: span.size, contiguous }, contiguous && span.size >= 6000 - 75);
    const n0 = ticks.length;
    await page.waitForTimeout(5000);
    const n1 = await page.evaluate(() => (window as unknown as { __cmds: number[] }).__cmds.length);
    check(r, 'the cockpit keeps ventilating after the span', 'frames continue', n1 - n0, n1 - n0 > 100);
    await shot(page, `ff-after-ventilator-${browserName}`);
    await step(r, page, 'after the span with the cockpit');
  } finally {
    finish(r);
  }
});
