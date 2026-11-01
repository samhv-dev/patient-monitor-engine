// Kit round A (2026-10-12): the numbers the showcase-2 run sheet (PR #53) marks "[to be measured at the kit round]",
// measured through the BUILT kit (served by its "Start Classroom" launcher, globalSetup kit-round-setup.ts) on Chromium and
// macOS WebKit at 1440×900, one case at a time. Every case runs as the presenter would: limit alarms ON ("All alarms on"
// before Load), Sound on, three emulated phones following over the relay (iPhone 13 on WebKit, Pixel 7 on Chromium),
// Bookmark after Load, the card's own buttons at the run sheet's cues with a presenter's reaction (KITROUND_REACT_S wall
// seconds after the cue), the Stage 10 fast-forwards, then the Debrief read, then ONE monitor-style change (Saadat-style →
// Philips-style) with the phones watched for 30 s (finding S12-F2). Documentation-grade evidence, NOT a CI test: nothing
// here asserts a band; every observed number goes to docs/showcase/kit-round-a/<case>-<browser>.{json,md} with the wall
// time from Load, the session-bar clock, the speed and the 1-minute load average of this Mac.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { loadavg } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { devices, test, type Browser, type Locator, type Page } from '@playwright/test';
import { alarms, hist, latest, maxOf, minOf, r1, record, REPO, simNow, stateId, watchConsole, type Sample } from './showcase-support.ts';
import { pdfInfo } from '../../apps/demo/e2e/pdf-text.ts';

const OUTDIR_ENV = process.env.KITROUND_OUTDIR ?? 'docs/showcase/kit-round-a'; // Q1: KITROUND_OUTDIR=docs/showcase/kit-round-a/q1
const OUTDIR = isAbsolute(OUTDIR_ENV) ? OUTDIR_ENV : join(REPO, OUTDIR_ENV); // an absolute path is used as is
const N_PHONES = Number(process.env.KITROUND_PHONES ?? 3);
const REACT_S = Number(process.env.KITROUND_REACT_S ?? 2);
/** E126: a folder for the owner's review shots of the A4 haemorrhage monitor (1280×800, the session paused for each
 *  shot so the sim clock does not move; the pulse-check shot waits 6 s of sim into the check). Unset = no shots, the
 *  measured run as before. */
const SHOTS = process.env.KITROUND_SHOTS ?? '';
/** IP9 (Instructor v2): PME_PANEL=teach2 runs the case through the Instructor v2 view (#/teach2) from the Load on: the card's
 *  buttons are its ACTION rows, the objective's tick its judged row, the bookmark its "discuss" mark, the speed, pause and
 *  fast-forward its header, the Devices and Defib tabs its sheets (today's tab bodies), Debrief its dock link. The Load
 *  itself (and the "All alarms on" before it) stays on today's Scenario tab: Instructor v2 has no library. Unset = today's
 *  view, as before. */
const PANEL: 'teach' | 'teach2' = process.env.PME_PANEL === 'teach2' ? 'teach2' : 'teach';
const KIT_SHA = (() => {
  try {
    return /Commit:\s+([0-9a-f]{8})/.exec(readFileSync(join(process.env.SHOWCASE_KIT ?? '', 'VERSION.txt'), 'utf8'))?.[1] ?? 'unknown';
  } catch {
    return 'unknown';
  }
})();
const load1 = () => Math.round(loadavg()[0]! * 100) / 100;
const mmss = (s: number) => `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, '0')}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const n0 = (x: number | null | undefined) => (typeof x === 'number' ? Math.round(x) : '–');
const CRISIS = 'MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate';
/** E132: the haemorrhage card after the clinical review. */
const HAEM_VOLUME = 'Surgeon controls the bleeding; massive transfusion: 1 L warmed crystalloid, then red cells and plasma by rapid infuser; TXA 1 g';
const HAEM_STOP = 'Rhythm check: pulse back, stop CPR';
// Owner rc.4 (2026-10-28): the second dantrolene at normal ventilation re-applies the crisis ventilation (20 × 600, O₂ 100 %)
const DOSE2 = 'Dantrolene 2.5 mg/kg; hyperventilate again (20 × 600, O₂ 100 %)';

type Hook = {
  __pmeApp: {
    session: { code: string; simNow(): number; soundOn: boolean };
    link: {
      simT: number;
      send(c: unknown): Promise<{ accepted: boolean; reason?: string }>;
      alarms: { allOff?: boolean; silencedUntil?: number; pausedUntil?: number; active?: Array<{ text: string }> } | null;
      ctl: { timeScale: number; hostPaused: boolean; scenario: { stateId: string | null; history?: Array<{ t: number; stateId: string }> }; fastForward: unknown; lastFastForward: { fromT: number; endT: number; alarms: Array<{ text: string; since: number; ended: boolean }> } | null };
    };
  };
  __pmeFollower?: { sync?: { status: string; resyncs: number; lagS: number } };
  __st?: Array<{ t: number; id: string | null }>;
};

type Row = Record<string, unknown>;
type Res = {
  case: string; browser: string; kit: string; server: string; base: string; reactS: number; phonesN: number; startedAt: string;
  loadAvg: { start: number; end?: number; min?: number; max?: number };
  setup: Row; rows: Row[]; presses: Row[]; spans: Row[]; states: Array<{ t: number; clock: string; id: string | null }>; alarms: string[];
  measures: Row; debrief: Row | null; phones: Row | null; notes: string[]; errors: string[];
};

/** One rehearsal: the instructor page, the phones, the record. */
class Run {
  r: Res;
  t0 = 0;
  w0 = 0;
  phones: Page[] = [];
  probe: PhoneProbe | null = null;
  loads: number[] = [];
  /** PME_PANEL=teach2: true once the case is loaded and the run has moved to the Instructor v2 view. */
  v2 = false;
  /** The card's format: 2 = a pme-scenario/2 card (start's `o.card`, the /2 rounds below); 1 = every other round, whose
   *  path is unchanged (each `card === 2` branch below is taken for a /2 card only). */
  card: 1 | 2 = 1;
  constructor(readonly page: Page, readonly browser: Browser, name: string) {
    this.r = {
      case: name, browser: test.info().project.name, kit: KIT_SHA, server: process.env.SHOWCASE_SERVER ?? '', base: process.env.SHOWCASE_BASE ?? '', reactS: REACT_S, phonesN: N_PHONES,
      startedAt: new Date().toISOString(), loadAvg: { start: load1() }, setup: {}, rows: [], presses: [], spans: [], states: [], alarms: [], measures: {}, debrief: null, phones: null, notes: [], errors: [],
    };
    this.r.errors = watchConsole(page);
  }
  sim = () => simNow(this.page);
  wall = () => r1((Date.now() - this.w0) / 1000);
  speedNow = () => this.page.evaluate(() => (window as unknown as Hook).__pmeApp.link.ctl.timeScale);
  async row(what: string, extra: Row = {}): Promise<Row> {
    const v = await latest(this.page);
    const s = await this.sim();
    const l = load1();
    this.loads.push(l);
    const row = { wall: this.wall(), clock: mmss(s), simS: r1(s), speed: await this.speedNow(), state: await stateId(this.page), load1: l, what, hr: r1(v.hr), art: `${n0(v.abpSys)}/${n0(v.abpDia)} (${n0(v.abpMean)})`, spo2: r1(v.spo2), etco2: r1(v.etco2), rr: r1(v.rr), ...extra };
    this.r.rows.push(row);
    if (process.env.KITROUND_VERBOSE === '1') console.log(`[${this.r.case}] W ${row.wall} ${row.clock} ×${row.speed} ${row.state} EtCO2 ${n0(v.etco2)} load ${l}: ${what}`);
    return row;
  }
  /** Wait until ok() holds (polled every 250 ms of wall time) or maxSimS of sim time passed; the sim time it held, or null. */
  async waitSim(maxSimS: number, ok: (now: number, v: Awaited<ReturnType<typeof latest>>) => boolean | Promise<boolean>): Promise<number | null> {
    const a = await this.sim();
    const wallLimit = Date.now() + (maxSimS * 1.5 + 90) * 1000;
    for (;;) {
      const now = await this.sim();
      if (await ok(now, await latest(this.page))) return now;
      if (now - a > maxSimS || Date.now() > wallLimit) return null;
      await this.page.waitForTimeout(250);
    }
  }
  untilT = async (t: number) => this.waitSim(Math.max(0, t - (await this.sim())) + 5, (now) => now >= t);
  until = (id: string, maxSimS: number) => this.waitSim(maxSimS, async () => (await stateId(this.page)) === id);
  untilAlarm = (re: RegExp, after: number, maxSimS: number) => this.waitSim(maxSimS, async () => (await alarms(this.page)).some((a) => a.t >= after && re.test(a.text)));
  /** A /2 card: the phase entries of the run, from the runner's own history (a one-poll phase is in it; the 100-ms state
   *  log may miss one at ×4). */
  phases = () => this.page.evaluate(() => ((window as unknown as Hook).__pmeApp.link.ctl.scenario.history ?? []).map((e) => ({ t: Math.round(e.t * 10) / 10, id: e.stateId })));
  /** A /2 card: wait until the phase `id` has been entered at or after sim `from` (the runner's history), or maxSimS of
   *  sim time passed; the entry's sim time, or null. A phase wait, not a clock time: the phase times move with the rules. */
  async untilEntered(id: string, from: number, maxSimS: number): Promise<number | null> {
    const hit = async () => (await this.phases()).find((e) => e.id === id && e.t >= from - 0.5)?.t ?? null;
    return (await this.waitSim(maxSimS, async () => (await hit()) !== null)) === null ? null : hit();
  }
  /** A /2 card: a row not due now is in ACTION's "Not due now" fold (rows.ts classifyV2 `later`), pressable once open. */
  async unfold(btn: Locator): Promise<void> {
    if (await btn.isVisible().catch(() => false)) return;
    const fold = this.page.locator('.ip2-action details.ip2-later');
    if ((await fold.count()) && !(await fold.evaluate((d) => (d as HTMLDetailsElement).open))) await fold.locator('summary').click();
  }
  react = () => this.page.waitForTimeout(REACT_S * 1000);
  /** The instructor view the run goes back to (#/teach, or #/teach2 under PME_PANEL=teach2 once loaded). */
  home = () => (this.v2 ? '#/teach2' : '#/teach');
  async speed(k: 1 | 2 | 4 | 8): Promise<void> {
    if (this.v2) {
      const head = this.page.locator('.ip2-head');
      await head.locator('button.ip2-speed').click();
      await head.getByRole('button', { name: `Speed ×${k}`, exact: true }).click();
    } else await this.page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: `×${k}` }).click();
    await this.page.waitForTimeout(300);
  }
  async pauseToggle(): Promise<void> {
    if (this.v2) await this.page.locator('.ip2-head button.ip2-pill').click();
    else await this.page.locator('.sessionbar').getByRole('button', { name: /^(Pause|Resume)$/ }).click();
    await this.page.waitForTimeout(400);
  }
  /** The card's button `label`: today's Running-scenario button, or Instructor v2's open ACTION row of that title. */
  cardButton = (label: string) => this.v2
    ? this.page.locator('.ip2-action .ip2-rows:not(.ip2-finished-list) button.ip2-row', { has: this.page.locator('.ip2-row-title').getByText(label, { exact: true }) })
    : this.page.locator('section[aria-label="Running scenario"]').getByRole('button', { name: label, exact: true });
  /** Press a card button by its exact label; a press that left the state unchanged while the button is still there is
   *  recorded as NOT TAKEN and pressed once more (the Stage 10 dry run's lost presses). */
  async press(label: string, expectState?: string): Promise<number> {
    if (this.v2 && (await this.page.evaluate(() => location.hash)) !== '#/teach2') await this.teachTab('scenario');
    const btn = this.cardButton(label);
    const before = await stateId(this.page);
    if (this.card === 2) await this.unfold(btn);
    await btn.click();
    const t = await this.sim();
    await this.page.waitForTimeout(800);
    let after = await stateId(this.page);
    const rec: Row = { label, clock: mmss(t), simS: r1(t), wall: this.wall(), before, after, load1: load1(), toast: (await this.page.locator('.toasts').innerText().catch(() => '')).split('\n').slice(-2).join(' | ') };
    // a /2 press never changes the phase (no expectState, no second press): the row's look says whether it was taken
    if (this.card === 2) rec.look = await btn.getAttribute('data-look', { timeout: 5000 }).catch(() => 'row gone');
    // a transient state ("Dantrolene 2.5 mg/kg given" lasts 2 s of sim) may already have passed: the state log says
    // whether the press was taken (the first chromium MH runs pressed such buttons twice: kept as probes, not used)
    const passed = expectState ? await this.page.evaluate(([id, from]) => ((window as unknown as Hook).__st ?? []).some((x) => x.id === id && x.t >= (from as number) - 0.5), [expectState, t] as const) : true;
    if (expectState && after !== expectState && !passed && (await btn.count()) > 0) {
      rec.notTaken = true;
      await btn.click();
      await this.page.waitForTimeout(800);
      after = await stateId(this.page);
      rec.afterSecondPress = after;
    }
    this.r.presses.push(rec);
    await this.row(`press **${label}**`);
    return t;
  }
  /** Fast-forward `min` minutes from the session bar (instructor views) or through the link (Monitor / Ventilator view,
   *  what the bar's button sends). Records the wall time, the banner, the span's alarms and the speed after it. */
  async ff(min: 2 | 5, via: 'button' | 'command' = 'button'): Promise<Row> {
    const p = this.page;
    const w = Date.now();
    const s0 = await this.sim();
    const k0 = await this.speedNow();
    if (via === 'button' && this.v2) {
      // the Fast forward box in STATE (the owner's option G)
      await p.locator('.ip2-ff').getByRole('button', { name: `Fast forward by ${min} min`, exact: true }).click();
    } else if (via === 'button') await p.locator('.sessionbar').getByRole('group', { name: 'Fast-forward' }).getByRole('button', { name: `Fast-forward ${min} min` }).click();
    else await p.evaluate((v) => (window as unknown as Hook).__pmeApp.link.send({ type: 'time', action: 'jump', value: v }), min * 60);
    await p.locator('.ff-veil.on').waitFor({ timeout: 10_000 }).catch(() => undefined);
    await p.locator('.ff-veil.on').waitFor({ state: 'detached', timeout: 120_000 }).catch(async () => p.locator('.ff-veil.on').waitFor({ state: 'hidden', timeout: 60_000 }));
    const wallS = r1((Date.now() - w) / 1000);
    const banner = await p.locator('.ff-banner').innerText().catch(() => '');
    const ff = await p.evaluate(() => (window as unknown as Hook).__pmeApp.link.ctl.lastFastForward);
    const k1 = await this.speedNow();
    const a = { s: await this.sim(), w: Date.now() };
    await p.waitForTimeout(3000);
    const rateAfter = r1((await this.sim() - a.s) / ((Date.now() - a.w) / 1000));
    const span: Row = { min, via, clockBefore: mmss(s0), fromT: r1(ff?.fromT), endT: r1(ff?.endT), wallS, speedBefore: k0, speedAfter: k1, rateAfter3s: rateAfter, banner: banner.replace(/\s+/g, ' ').trim(), alarms: ff?.alarms.map((x) => `${mmss(x.since)} ${x.text}${x.ended ? ' (came and went)' : ''}`) ?? [], load1: load1() };
    this.r.spans.push(span);
    await this.row(`after the ${min}-min fast-forward`);
    return span;
  }
  async teachTab(tab: 'scenario' | 'devices' | 'drugs' | 'defib'): Promise<void> {
    if (this.v2) {
      // Instructor v2: the Scenario tab is ACTION itself (any sheet closed); Devices and Defib are its sheets
      const p = this.page;
      if ((await p.evaluate(() => location.hash)) !== '#/teach2') {
        await p.evaluate(() => (location.hash = '#/teach2'));
        await p.waitForTimeout(800);
      }
      if (tab === 'scenario') {
        const close = p.locator('.ip2-sheets .ip2-sheet-close');
        for (const b of await close.all()) if (await b.isVisible()) await b.click();
      } else {
        const tool = p.locator(`.ip2-dock-tools button.ip2-tool[data-sheet=${tab === 'drugs' ? 'drug' : tab}]`);
        if ((await tool.getAttribute('aria-pressed')) !== 'true') await tool.click();
      }
      await p.waitForTimeout(300);
      return;
    }
    if (!(await this.page.evaluate(() => location.hash)).startsWith('#/teach')) {
      await this.page.evaluate(() => (location.hash = '#/teach'));
      await this.page.waitForTimeout(800);
    }
    await this.page.click(`[role=tab][data-tab=${tab}]`);
    await this.page.waitForTimeout(300);
  }
  alarmButton = () => this.page.locator('.alarm-count').innerText().then((s) => s.trim());
  /** The instructor panel in use (IP9 review M2: both views live in the DOM): today's, or the open Instructor v2 sheet. */
  panel = () => (this.v2 ? this.page.locator('.ip2-sheets .ip2-sheet:not([hidden])') : this.page.locator('#teach-panel'));
  /** The Debrief link: today's session bar, or the Instructor v2 dock. */
  debriefLink = () => (this.v2 ? this.page.locator('.ip2-dock a.ip2-debrief') : this.page.locator('.sessionbar').getByRole('link', { name: 'Debrief' }));
  /** To the Debrief by the panel's own path: today's session-bar link; under PME_PANEL=teach2 (#/teach2 has no session
   *  bar) a /1 card goes straight to the dock's Debrief (as on main), a /2 card through Finish the case. (Since main's
   *  Finish pane, #214, was merged into the /2 chain, the dock shows Finish for a /1 card too and a press opens the
   *  pane instead of lighting Debrief: the F11 path that pressed it whenever it showed failed the /1 A4 round here.) */
  async toDebrief(): Promise<void> {
    if (this.v2 && this.card === 2) {
      // a /2 card (main's Finish pane, board "Finish 2"): Finish the case pauses and opens the pane; its "Debrief now"
      // writes the run's end into the record (the Debrief grades it final) and opens the saved debrief; the run is then
      // read on the live Debrief (#/debrief: the same run, its JSON export the pme-debrief/3 of the live record)
      if ((await this.debriefLink().getAttribute('data-ready')) !== 'true') {
        await this.page.locator('.ip2-dock').getByRole('button', { name: 'Finish the case', exact: true }).click();
        await this.page.locator('button.ip2-finish-now').click();
        await this.page.waitForFunction(() => location.hash.startsWith('#/debrief'), null, { timeout: 10_000 });
        await this.row(`Finish the case (dock) → Debrief now (${await this.page.evaluate(() => location.hash)})`);
      }
      await this.page.evaluate(() => (location.hash = '#/debrief'));
      return;
    }
    await this.debriefLink().click();
  }

  /** The QR moment: N_PHONES emulated phones join the session `code` (before any case is loaded). */
  async joinPhones(code: string): Promise<void> {
    const dev = this.r.browser === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
    const { defaultBrowserType: _d, ...phone } = dev;
    for (let i = 0; i < N_PHONES; i++) {
      const ctx = await this.browser.newContext(phone);
      const ph = await ctx.newPage();
      this.r.errors.push(...watchConsole(ph).map((e) => `phone ${i}: ${e}`));
      await ph.goto(`${process.env.SHOWCASE_BASE}/?join=${code}`);
      const ok = await ph.waitForFunction(() => (window as unknown as Hook).__pmeFollower?.sync?.status === 'synced', null, { timeout: 60_000 }).then(() => true, () => false);
      this.r.notes.push(`phone ${i} (${this.r.browser === 'webkit' ? 'iPhone 13' : 'Pixel 7'} emulation) ${ok ? 'synced' : 'NOT synced within 60 s'} before Load`);
      this.phones.push(ph);
    }
  }

  /** Fresh page, the phones, limit alarms on, Sound on, Load, Bookmark, the recorders. Q1 (`o.phones`): the same page
   *  and the phones already following (the 30-minute talk in one page); `o.cardOrder`: Load · All alarms on · speed ·
   *  Bookmark, the cue cards' order (the earlier rounds set the speed before All alarms on). */
  async start(title: string, speed: 1 | 4 | 8 = 4, bookmark: 'before-alarms' | 'after-alarms' = 'before-alarms', o: { phones?: Page[]; cardOrder?: boolean; card?: 2 } = {}): Promise<void> {
    const p = this.page;
    if (o.card === 2) this.card = 2; // a /2 card: chosen by its exact title (a /1 title can be a part of it)
    if (!o.phones) {
      await p.goto(`${process.env.SHOWCASE_BASE}/?relay#/teach`);
      await p.waitForFunction(() => '__pmeApp' in window, null, { timeout: 30_000 });
      await p.waitForTimeout(1500);
    }
    const code = await p.evaluate(() => (window as unknown as Hook).__pmeApp.session.code);
    this.r.setup.sessionCode = code;
    this.r.setup.alarmButtonAtOpen = await this.alarmButton();
    if (o.phones) {
      this.phones = o.phones;
      this.r.setup.phonesAtStart = await holds(o.phones);
    } else await this.joinPhones(code);
    // limit alarms ON (Devices & alarms → All alarms on), then Sound on (top bar)
    await this.teachTab('devices');
    await p.getByRole('button', { name: 'All alarms on', exact: true }).click();
    await p.waitForTimeout(800);
    this.r.setup.alarmButtonAfterAllOn = await this.alarmButton();
    const sound = p.locator('.sound').first();
    if (!o.phones || /Sound off/.test(await sound.innerText())) await sound.click(); // a toggle: only when it is off
    await p.waitForTimeout(800);
    this.r.setup.soundButton = (await sound.innerText()).trim();
    // Load the card (Scenario → Showcase / Airway and breathing → Load), then the speed, then Bookmark
    await this.teachTab('scenario');
    // Q1 finding: with a case running the library is hidden; the presenter presses "Choose another scenario" first
    const choose = p.locator('section[aria-label="Running scenario"]').getByRole('button', { name: 'Choose another scenario' });
    if (await choose.isVisible().catch(() => false)) {
      // Q2: on a fresh page the button can show for a moment and go (the tab repaints to the library): a bounded click
      this.r.setup.choseAnotherScenarioFirst = await choose.click({ timeout: 3000 }).then(() => true, () => 'shown, then gone before the click');
      await p.waitForTimeout(500);
    }
    const chip = title === 'Severe bronchospasm on the ventilator' ? 'Airway and breathing' : 'Showcase';
    await p.locator('.chip-btn', { hasText: chip }).click();
    const card = p.locator('section[aria-label="Scenario library"] article.scard').filter({ has: this.card === 2 ? p.locator('h3').getByText(title, { exact: true }) : p.locator('h3', { hasText: title }) });
    await card.locator('button', { hasText: 'Load' }).first().click();
    const confirm = p.getByRole('button', { name: 'Load scenario', exact: true });
    if (await confirm.waitFor({ timeout: 1500 }).then(() => true, () => false)) await confirm.click();
    await p.locator('.toasts').getByText(`Scenario loaded: ${title}`).waitFor({ timeout: 15_000 });
    this.w0 = Date.now();
    this.r.setup.panel = PANEL;
    if (this.card === 2) this.r.setup.card = 'pme-scenario/2';
    if (PANEL === 'teach2') {
      this.v2 = true;
      await this.teachTab('scenario');
    }
    await record(p);
    await p.evaluate(() => {
      const w = window as unknown as Hook & { __stIv?: number };
      if (w.__stIv) clearInterval(w.__stIv);
      w.__st = [];
      let last: string | null | undefined;
      w.__stIv = window.setInterval(() => {
        const id = w.__pmeApp.link.ctl.scenario.stateId;
        if (id !== last) {
          last = id;
          w.__st!.push({ t: w.__pmeApp.link.simT, id });
        }
      }, 100);
    });
    if (speed !== 1 && !o.cardOrder) await this.speed(speed);
    // Instructor v2 has no plain bookmark: its marks are; the neutral one ("discuss") saves the same restore point
    const mark = () => (this.v2 ? p.locator('.ip2-dock').getByRole('button', { name: 'Mark: discuss', exact: true }).click() : p.locator('.sessionbar').getByRole('button', { name: 'Bookmark' }).click());
    // A1/A2 bookmarked right after Load; the cue cards (kit round B) say Load · All alarms on · Bookmark ('after-alarms')
    if (bookmark === 'before-alarms') await mark();
    this.t0 = await this.sim();
    this.r.setup.alarmButtonAfterLoad = await this.alarmButton();
    if (o.cardOrder) await p.waitForTimeout(1000); // Q1: read the setting once the Load has settled
    this.r.setup.limitsAfterLoad = await p.evaluate(() => ((window as unknown as Hook).__pmeApp.link.alarms?.allOff ? 'Limit alarms OFF after Load' : 'limit alarms on after Load'));
    // the Load resets the monitor to its factory alarms (measured on the first run): the presenter presses "All alarms on"
    // again right after Load, as here
    this.r.setup.alarmButtonRightAfterLoad = await this.alarmButton();
    // Q1 (cardOrder): the presenter presses All alarms on after EVERY Load, whatever the button shows
    if (/OFF/.test(this.r.setup.limitsAfterLoad as string) || o.cardOrder) {
      await this.teachTab('devices');
      await p.getByRole('button', { name: 'All alarms on', exact: true }).click();
      await p.waitForTimeout(500);
      await this.teachTab('scenario');
      this.r.setup.allOnAgainAfterLoadAt = mmss(await this.sim());
      this.r.setup.alarmButtonAfterAllOnAgain = await this.alarmButton();
    }
    if (speed !== 1 && o.cardOrder) await this.speed(speed);
    if (bookmark === 'after-alarms') {
      await mark();
      this.r.setup.bookmarkAt = mmss(await this.sim());
    }
    if (this.phones.length) {
      this.probe = new PhoneProbe(p, this.phones);
      this.probe.start();
    }
    await this.row(`Load "${title}" at ×${speed}, Bookmark`);
  }

  /** Scenario tab: tick the running card's objective whose words match (the instructor's judgement, E54/E52). */
  async tick(re: RegExp): Promise<void> {
    await this.teachTab('scenario');
    if (this.v2) await this.page.locator('.ip2-action .ip2-rows:not(.ip2-finished-list) button.ip2-row[data-kind=judged]', { has: this.page.locator('.ip2-row-title', { hasText: re }) }).click();
    else await this.page.locator('section[aria-label="Running scenario"] ul[aria-label="Objectives"] li').filter({ hasText: re }).locator('input[type=checkbox]').check();
    await this.row(`objective ticked: ${re.source}`);
  }

  /** Session bar → Debrief: objectives (status and text), facts, the timeline, the minute rows, the key-time tiles
   *  (caption → value, each as recorded) and the key moments; then back to the panel. */
  async debrief(o: { json?: boolean } = {}): Promise<Row> {
    const p = this.page;
    const at = await this.sim();
    await this.toDebrief();
    const view = p.locator('[data-view=debrief]');
    await view.getByRole('heading', { level: 1, name: 'Debrief' }).waitFor({ timeout: 15_000 });
    await p.waitForTimeout(1500);
    const objectives = await view.locator('#db-objectives li').evaluateAll((li) => li.map((x) => ({ status: x.getAttribute('data-status'), mark: x.getAttribute('data-mark'), text: (x.textContent ?? '').replace(/\s+/g, ' ').trim() })));
    const dts = await view.locator('#db-facts dt').allInnerTexts();
    const dds = await view.locator('#db-facts dd').allInnerTexts();
    const timeline = (await view.locator('#db-timeline tbody tr').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ').trim());
    const minuteRows = await view.locator('#db-minutes tbody tr').count();
    const keyTimes = Object.fromEntries(await view.locator('#db-keytimes .db-tile').evaluateAll((t) => t.map((x) => [x.querySelector('.db-tile-cap')?.textContent ?? '', `${x.querySelector('.db-tile-v')?.textContent ?? ''} (${x.querySelector('.db-tile-sub')?.textContent ?? ''})`])));
    const moments = (await view.locator('#db-moments tbody tr[data-n]').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ').trim());
    const d: Row = { openedAt: mmss(at), objectives, facts: Object.fromEntries(dts.map((k, i) => [k, dds[i]])), keyTimes, moments, timelineRows: timeline.length, timeline, minuteRows };
    // a /2 card: the action table (every row: the action's first administration, then each repeat, with its grade)
    if (this.card === 2) d.actions = await view.locator('#db-actions tbody tr').evaluateAll((trs) => trs.map((tr) => { const td = [...tr.querySelectorAll('td')].map((c) => (c.firstChild?.textContent ?? '').trim()); return { row: tr.classList.contains('db-repeat') ? 'repeat' : 'action', grade: tr.getAttribute('data-grade'), label: td[0], due: td[1], given: td[2], why: [...tr.querySelectorAll('.db-why')].map((w) => (w.textContent ?? '').trim()) }; }));
    this.r.debrief = d;
    if (o.json) {
      // Q1: the report's own JSON export (Stage 13 Q3), as the presenter's button saves it (input of debrief-fa.mjs)
      const [dl] = await Promise.all([p.waitForEvent('download'), view.getByRole('button', { name: 'Download the record (JSON)' }).click()]);
      mkdirSync(OUTDIR, { recursive: true });
      await dl.saveAs(join(OUTDIR, `debrief-${slug(this.r.case)}-${this.r.browser}.json`));
      d.json = `debrief-${slug(this.r.case)}-${this.r.browser}.json (${dl.suggestedFilename()})`;
    }
    await p.evaluate((h) => (location.hash = h), this.home());
    await p.waitForTimeout(1000);
    await this.teachTab('scenario');
    return d;
  }

  /** S12-F2: ONE monitor-style change (Settings → Monitor → Philips-style) while the phones follow, watched 30 s. */
  async styleChange(): Promise<void> {
    if (!this.probe) return;
    const p = this.page;
    this.probe.mark('before the style change');
    await p.evaluate(() => (location.hash = '#/settings'));
    await p.waitForTimeout(800);
    await p.locator('[data-view=settings]').getByLabel('Monitor', { exact: true }).selectOption('philips-like');
    await p.evaluate(() => (location.hash = '#/teach'));
    this.probe.mark('after Saadat-style → Philips-style');
    await this.row('monitor style changed: Saadat-style → Philips-style (Settings)');
    await p.waitForTimeout(30_000);
    this.probe.mark('30 s after the style change');
  }

  async finish(o: { keepPhones?: boolean } = {}): Promise<void> {
    const p = this.page;
    try {
      this.r.states = ((await p.evaluate(() => (window as unknown as Hook).__st ?? []).catch(() => [])) as Array<{ t: number; id: string | null }>).map((x) => ({ t: r1(x.t) as number, clock: mmss(x.t), id: x.id }));
      this.r.alarms = (await alarms(p).catch(() => [])).map((a) => `${mmss(a.t)} ${a.text}`);
      this.r.setup.alarmButtonAtEnd = await this.alarmButton().catch(() => '');
    } catch { /* the page may be gone */ }
    if (this.probe) this.r.phones = await this.probe.stop();
    if (!o.keepPhones) for (const ph of this.phones) await ph.context().close().catch(() => undefined);
    this.r.loadAvg.end = load1();
    this.r.loadAvg.min = Math.min(...this.loads, this.r.loadAvg.start);
    this.r.loadAvg.max = Math.max(...this.loads, this.r.loadAvg.start);
    mkdirSync(OUTDIR, { recursive: true });
    const base = `${slug(this.r.case)}-${this.r.browser}${process.env.KITROUND_TAG ?? ''}`; // KITROUND_TAG=-<x>: a second evidence set beside the first
    writeFileSync(join(OUTDIR, `${base}.json`), JSON.stringify(this.r, null, 2));
    const md = [
      `### ${this.r.case} (${this.r.browser}, kit ${this.r.kit}, load avg ${this.r.loadAvg.min}–${this.r.loadAvg.max})`, '',
      `Script: scripts/showcase/kit-round-a.kitround.ts · server: ${this.r.server} · reaction ${REACT_S} s · ${N_PHONES} phones · setup: ${JSON.stringify(this.r.setup)}`, '',
      '| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |', '|---|---|---|---|---|---|---|---|---|---|---|',
      ...this.r.rows.map((x) => `| ${x.wall} | ${x.clock} | ${x.speed} | ${x.state} | ${n0(x.hr as number)} | ${x.art} | ${n0(x.spo2 as number)} | ${n0(x.etco2 as number)} | ${n0(x.rr as number)} | ${x.load1} | ${x.what}${Object.keys(x).length > 13 ? ` ${JSON.stringify(Object.fromEntries(Object.entries(x).filter(([k]) => !['wall', 'clock', 'simS', 'speed', 'state', 'load1', 'what', 'hr', 'art', 'spo2', 'etco2', 'rr'].includes(k))))}` : ''} |`),
      '', `States: ${this.r.states.map((s) => `${s.clock} ${s.id}`).join(' · ')}`,
      '', `Alarms raised: ${this.r.alarms.join(' · ') || 'none'}`,
      '', `Spans: ${this.r.spans.map((s) => JSON.stringify(s)).join('\n\n')}`,
      '', `Measures: ${JSON.stringify(this.r.measures)}`,
      '', `Debrief: ${this.r.debrief ? JSON.stringify({ objectives: this.r.debrief.objectives, ...(this.card === 2 ? { actions: this.r.debrief.actions } : {}), facts: this.r.debrief.facts, timelineRows: this.r.debrief.timelineRows, minuteRows: this.r.debrief.minuteRows }) : 'not opened'}`,
      '', `Phones: ${JSON.stringify(this.r.phones)}`,
      '', `Notes: ${this.r.notes.join(' · ')}`, '', `Errors: ${this.r.errors.slice(0, 8).join(' · ') || 'none'}`, ''];
    writeFileSync(join(OUTDIR, `${base}.md`), md.join('\n'));
  }
}

/** S12-F2 / phones: every 500 ms, the instructor's monitor tiles against each phone's; a parameter whose numbers differ
 *  (by more than 1 unit, or a number against a blank) is timed while it stays different. Skipped while either side shows
 *  the fast-forward panel and for 5 s after it, while a phone holds (Ventilator view) or is not 'synced', and while the
 *  instructor is not on the Instructor or Monitor view. */
class PhoneProbe {
  private running = false;
  private loop: Promise<void> | null = null;
  private readonly per: Array<{ maxS: number; worst: Row | null; open: Map<string, { since: number; inst: string; ph: string }>; status: Record<string, number>; hold: number; samples: number; compared: number; common: number; markOnly: number }>;
  private readonly marks: Row[] = [];
  private lastVeil = 0;
  private readonly t0 = Date.now();
  constructor(private readonly host: Page, private readonly phones: Page[]) {
    this.per = phones.map(() => ({ maxS: 0, worst: null, open: new Map(), status: {}, hold: 0, samples: 0, compared: 0, common: 0, markOnly: 0 }));
  }
  private static tiles = () => Object.fromEntries([...document.querySelectorAll('.pme-stile')].map((e) => [(e as HTMLElement).dataset.param ?? '?', (e.querySelector('[data-pme="v"]')?.textContent ?? '').trim()]));
  start(): void {
    this.running = true;
    this.loop = (async () => {
      while (this.running) {
        const w = Date.now();
        const inst = await this.host.evaluate(`(() => ({ hash: location.hash, veil: !!document.querySelector('.ff-veil.on'), tiles: (${PhoneProbe.tiles.toString()})() }))()`).catch(() => null) as { hash: string; veil: boolean; tiles: Record<string, string> } | null;
        const ph = await Promise.all(this.phones.map((p) => p.evaluate(`(() => { const h = document.querySelector('.learner-hold'); const s = window.__pmeFollower?.sync; return { veil: !!document.querySelector('.ff-veil.on'), hold: !!h && !h.hidden, status: s?.status ?? 'none', resyncs: s?.resyncs ?? 0, tiles: (${PhoneProbe.tiles.toString()})() }; })()`).catch(() => null))) as Array<{ veil: boolean; hold: boolean; status: string; resyncs: number; tiles: Record<string, string> } | null>;
        if (inst?.veil || ph.some((x) => x?.veil)) this.lastVeil = w;
        const comparable = !!inst && /^#\/(teach|monitor)/.test(inst.hash) && !inst.veil && w - this.lastVeil > 5000;
        ph.forEach((x, i) => {
          const s = this.per[i]!;
          s.samples++;
          if (!x) return;
          s.status[x.status] = (s.status[x.status] ?? 0) + 1;
          if (x.hold) s.hold++;
          if (!comparable || x.hold || x.veil || x.status !== 'synced' || !inst) return s.open.clear();
          s.compared++;
          s.common = Math.max(s.common, Object.keys(inst.tiles).filter((k) => k in x.tiles).length);
          // the number itself: a trailing signal-quality mark ("99?") is not a different number (counted apart)
          const num = (v: string) => (/^-?\d+(\.\d+)?/.test(v) ? Number(/^-?\d+(\.\d+)?/.exec(v)![0]) : null);
          for (const k of Object.keys(inst.tiles)) {
            if (!(k in x.tiles)) continue;
            const a = inst.tiles[k]!;
            const b = x.tiles[k]!;
            const na = num(a);
            const nb = num(b);
            const differ = (na === null) !== (nb === null) || (na !== null && nb !== null && Math.abs(na - nb) > 1);
            if (a !== b && !differ) s.markOnly++;
            if (!differ) {
              s.open.delete(k);
              continue;
            }
            const o = s.open.get(k) ?? { since: w, inst: a, ph: b };
            s.open.set(k, o);
            const d = (w - o.since) / 1000;
            if (d > s.maxS) {
              s.maxS = d;
              s.worst = { param: k, forS: r1(d), instructorFirst: o.inst, phoneFirst: o.ph, instructorNow: a, phoneNow: b, atWallS: r1((w - this.t0) / 1000) };
            }
          }
        });
        await new Promise((r) => setTimeout(r, Math.max(0, 500 - (Date.now() - w))));
      }
    })();
  }
  mark(label: string): void {
    this.marks.push({ label, atWallS: r1((Date.now() - this.t0) / 1000), maxMismatchSoFar: this.per.map((s) => r1(s.maxS)) });
  }
  async stop(): Promise<Row> {
    this.running = false;
    await this.loop;
    const sync = await Promise.all(this.phones.map((p) => p.evaluate(() => (window as unknown as Hook).__pmeFollower?.sync ?? null).catch(() => null)));
    return {
      rule: 'a parameter whose NUMBER differs (> 1 unit, or a number vs a blank; a trailing quality mark such as "?" ignored and counted apart) for more than 2 s while comparable = S12-F2 seen',
      s12f2Seen: this.per.some((s) => s.maxS > 2),
      marks: this.marks,
      perPhone: this.per.map((s, i) => ({ maxMismatchS: r1(s.maxS), worst: s.worst, samples: s.samples, compared: s.compared, commonTiles: s.common, sameNumberOtherMarkSamples: s.markOnly, holdSamples: s.hold, status: s.status, resyncs: sync[i]?.resyncs ?? null, lagS: r1(sync[i]?.lagS) })),
    };
  }
}

// ---------------------------------------------------------------------------------------------------------------- cases

test('premed induction, earlier intubation, RR alarm acknowledged', async ({ page, browser }) => {
  const R = new Run(page, browser, 'Induction after fentanyl and midazolam (kit round)');
  try {
    await R.start('Induction after fentanyl and midazolam', 4);
    const tPre = await R.until('premedicated', 60);
    await R.row('premedication given by itself');
    const tRr = await R.untilAlarm(/RR|resp/i, R.t0, Math.max(5, R.t0 + 170 - (await R.sim())));
    const rrAlarm = (await alarms(page)).find((a) => /RR|resp/i.test(a.text));
    await R.row('RR limit alarm raised', { alarm: rrAlarm?.text ?? null, alarmButton: await R.alarmButton() });
    let tAck = Number.NaN;
    if (rrAlarm) {
      await R.react();
      // the alarm button (top right) opens Devices & alarms → Acknowledge
      await page.locator('.alarm-count').click();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: 'Acknowledge', exact: true }).click();
      tAck = await R.sim();
      await page.waitForTimeout(500);
      await R.row('Acknowledge (alarm button → Devices & alarms)', { alarmButton: await R.alarmButton() });
      await R.teachTab('scenario');
    }
    R.r.measures.rrAlarm = { text: rrAlarm?.text ?? null, at: tRr === null ? null : mmss(rrAlarm?.t ?? tRr), afterPremedS: tPre !== null && rrAlarm ? r1(rrAlarm.t - tPre) : null, ackAfterS: rrAlarm && !Number.isNaN(tAck) ? r1(tAck - rrAlarm.t) : null, allAlarms: (await alarms(page)).map((a) => `${mmss(a.t)} ${a.text}`) };
    await R.untilT(R.t0 + 120);
    await R.row('2:00');
    await R.untilT(R.t0 + 180);
    const tInd = await R.press('Induce now', 'induced');
    const tApn = await R.untilAlarm(/APN/i, tInd, 150);
    const apn = (await alarms(page)).find((a) => a.t >= tInd && /APN/i.test(a.text));
    await R.row('CO2 apnoea alarm', { alarm: apn?.text ?? null });
    await R.react();
    const tInt = await R.press('Intubate and ventilate', 'ventilated');
    const tLow = await R.waitSim(240, (_n, v) => typeof v.abpMean === 'number' && v.abpMean < 60);
    await R.row('MAP below 60');
    let tE: number | null = null;
    if (tLow !== null) {
      await R.react();
      tE = await R.press('Ephedrine 10 mg', 'ephedrine');
    }
    const t65 = tE === null ? null : await R.waitSim(240, (_n, v) => typeof v.abpMean === 'number' && v.abpMean >= 65);
    await R.row('MAP back to 65');
    await R.untilT(R.t0 + 480);
    const nadir = minOf(await hist(page, tInd, Infinity), 'abpMean');
    await R.row('end (8:00)', { mapNadirAfterInduction: r1(nadir) });
    R.r.measures.timings = {
      apnoeaAfterInductionS: apn ? r1(apn.t - tInd) : null, apnoeaAlarmAt: apn ? mmss(apn.t) : null, intubatedAfterAlarmS: apn ? r1(tInt - apn.t) : null, intubateAt: mmss(tInt),
      mapBelow60At: tLow === null ? null : mmss(tLow), mapBelow60AfterInductionS: tLow === null ? null : r1(tLow - tInd), ephedrineAfterMapBelow60S: tE !== null && tLow !== null ? r1(tE - tLow) : null,
      map65AfterEphedrineS: t65 !== null && tE !== null ? r1(t65 - tE) : null, mapNadir: r1(nadir), apnoeaTimeTakenFrom: tApn === null ? 'not seen' : 'alarm event',
    };
    await R.debrief();
    await R.styleChange();
  } finally {
    await R.finish();
  }
});

test('plain induction, rescued at SpO2 below 90 %', async ({ page, browser }) => {
  const R = new Run(page, browser, 'Healthy induction, rescued at SpO2 below 90 (kit round)');
  try {
    await R.start('Healthy induction', 8);
    await R.untilT(R.t0 + 180);
    await R.speed(4);
    const tInd = await R.press('Induce now', 'induced');
    await R.untilAlarm(/APN/i, tInd, 120);
    const apn = (await alarms(page)).find((a) => a.t >= tInd && /APN/i.test(a.text));
    await R.row('CO2 apnoea alarm (nobody secures the airway)', { alarm: apn?.text ?? null });
    await R.untilT(R.t0 + 270);
    await R.ff(5);
    for (const m of [9.5, 10, 10.5, 11]) {
      if ((await stateId(page)) === 'desaturating') break;
      await R.untilT(R.t0 + m * 60);
      if ((await stateId(page)) !== 'desaturating') await R.row(`${m} min`);
    }
    const tDes = (await stateId(page)) === 'desaturating' ? await R.sim() : await R.until('desaturating', 300);
    await R.row('state "Airway not secured: SpO₂ below 90 %"');
    await R.react();
    const tB = await R.press('Bag-mask ventilate, FiO₂ 1.0', 'rescuedBvm');
    // SpO2 every 5 s for 60 s, then intubate ≈ 40 s after the bag-mask (the sheet's ≈ 12:00), then 2 min more
    const curve: Row[] = [];
    for (let s = 5; s <= 40; s += 5) {
      await R.untilT(tB + s);
      const v = await latest(page);
      curve.push({ afterBvmS: s, spo2: r1(v.spo2), etco2: r1(v.etco2), hr: r1(v.hr) });
    }
    const tE = await R.press('Intubate and ventilate, FiO₂ 1.0', 'rescuedEtt');
    const tCo2 = await R.waitSim(90, (_n, v) => typeof v.etco2 === 'number' && v.etco2 > 25);
    for (let s = 45; s <= 180; s += 15) {
      await R.untilT(tB + s);
      const v = await latest(page);
      curve.push({ afterBvmS: s, spo2: r1(v.spo2), etco2: r1(v.etco2), hr: r1(v.hr) });
    }
    const h = await hist(page, tB, Infinity);
    const first = (k: 'spo2', x: number) => h.find((s) => typeof s[k] === 'number' && (s[k] as number) >= x)?.t ?? null;
    const lowest = minOf(h, 'spo2');
    const nadirAt = h.find((x) => x.spo2 === lowest)?.t ?? tB;
    const after = (x: number) => h.find((s) => s.t >= nadirAt && typeof s.spo2 === 'number' && s.spo2 >= x)?.t ?? null;
    await R.untilT(R.t0 + 900);
    await R.row('end (15:00)');
    R.r.measures.rescue = {
      inducedAt: mmss(tInd), apnoeaAfterInductionS: apn ? r1(apn.t - tInd) : null, desaturatingAt: tDes === null ? null : mmss(tDes), desatAfterInductionMin: tDes === null ? null : r1((tDes - tInd) / 60),
      bvmAt: mmss(tB), bvmAfterDesatS: tDes === null ? null : r1(tB - tDes), spo2LowestAfterBvm: r1(lowest), spo2NadirAfterBvmS: r1(nadirAt - tB), spo2Back90AfterNadirFromBvmS: after(90) === null ? null : r1(after(90)! - tB), spo2Back95FromBvmS: after(95) === null ? null : r1(after(95)! - tB), firstSampleAtOrAbove90FromBvmS: first('spo2', 90) === null ? null : r1(first('spo2', 90)! - tB),
      intubatedAt: mmss(tE), etco2Above25AfterTubeS: tCo2 === null ? null : r1(tCo2 - tE), curve,
    };
    await R.debrief();
    await R.styleChange();
  } finally {
    await R.finish();
  }
});

for (const [tag, afterS] of [['1-30', 90], ['2-03', 123]] as const) {
  test(`anaphylaxis, epinephrine at ${tag} into the reaction`, async ({ page, browser }) => {
    const R = new Run(page, browser, `Anaphylaxis, epinephrine at ${tag} (kit round)`);
    try {
      await R.start('Anaphylaxis under anaesthesia', 4);
      let tA: number | null = null;
      let tE: number | null = null;
      let fluidAt: string | null = null;
      for (let s = 30; s <= 300; s += 30) {
        // the presses fall between the 30-s rows
        while (true) {
          if (tA === null && (await stateId(page)) === 'anaphylaxis') tA = (await page.evaluate(() => (window as unknown as Hook).__st?.find((x) => x.id === 'anaphylaxis')?.t ?? null)) ?? (await R.sim());
          const now = await R.sim();
          if (tA !== null && tE === null && now >= tA + afterS) {
            tE = await R.press('Give epinephrine 100 µg', 'treatedByButton');
            continue;
          }
          if (tE !== null && fluidAt === null && now >= tE + 15) {
            // objective 3: Drugs & fluids → Crystalloid 500 mL → Give
            await R.teachTab('drugs');
            await page.getByRole('button', { name: 'Give', exact: true }).click();
            fluidAt = mmss(await R.sim());
            await page.waitForTimeout(500);
            R.r.notes.push(`fluid toast: ${(await page.locator('.toasts').innerText().catch(() => '')).split('\n').slice(-1)[0]}`);
            await R.teachTab('scenario');
            await R.row('Drugs & fluids → Crystalloid 500 mL over 10 min → Give');
            continue;
          }
          if (now >= R.t0 + s) break;
          await page.waitForTimeout(250);
        }
        await R.row(`${mmss(s)} (30-s row)`);
      }
      const h = tE === null ? [] : await hist(page, tE, Infinity);
      const up = h.find((x) => typeof x.abpSys === 'number' && x.abpSys > 110);
      R.r.measures.anaphylaxis = {
        reactionAt: tA === null ? null : mmss(tA), epinephrineAt: tE === null ? null : mmss(tE), epinephrineAfterReactionS: tA !== null && tE !== null ? r1(tE - tA) : null,
        systolicAbove110AfterEpiS: up && tE !== null ? r1(up.t - tE) : null, hrPeakAfterEpi: r1(maxOf(h, 'hr')), systolicPeakAfterEpi: r1(maxOf(h, 'abpSys')), lowestSystolicBeforeEpi: tA === null ? null : r1(minOf(await hist(page, tA, tE ?? Infinity), 'abpSys')), fluidGivenAt: fluidAt,
      };
      await R.debrief();
      await R.styleChange();
    } finally {
      await R.finish();
    }
  });
}

test('bronchospasm with the Ventilator view: H5 numbers, then H21 (Monitor view 30 s)', async ({ page, browser }) => {
  const R = new Run(page, browser, 'Bronchospasm, Ventilator view, H5 and H21 (kit round)');
  const ventText = async () => {
    const f = page.frames().find((x) => x.url().includes('vent-hamilton'));
    return f ? (await f.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 900) : 'no ventilator frame';
  };
  const num = (re: RegExp, t: string) => (re.exec(t) ? Number(re.exec(t)![1]) : null);
  const readVent = async (what: string) => {
    const t = await ventText();
    const v = { vte: num(/(\d+)\s*VTE ml/, t), ppeak: num(/(\d+(?:\.\d+)?)\s*Ppeak/, t), mv: num(/(\d+(?:\.\d+)?)\s*ExpMinVol/, t), pmaxBanner: /High pressure|Pmax/i.test(t) };
    await R.row(what, { ...v, ventText: t.slice(0, 400) });
    return v;
  };
  const phoneHolds = async () => Promise.all(R.phones.map((p) => p.evaluate(() => { const h = document.querySelector('.learner-hold') as HTMLElement | null; return { hold: !!h && !h.hidden, status: (window as unknown as Hook).__pmeFollower?.sync?.status ?? 'none' }; }).catch(() => null)));
  try {
    await R.start('Severe bronchospasm on the ventilator', 4);
    await page.evaluate(() => (location.hash = '#/vent'));
    await page.waitForTimeout(5000);
    // FX-1 (main c72bba34): the cockpit hands its frames to this page's frame-port receiver; a tap counts them (the cockpit
    // DRIVES the patient while its 'cmds' frames keep arriving, tick after tick)
    const tapped = await page.evaluate((c) => {
      const w = window as unknown as { __cmds: Array<{ tick: number; w: number }>; __pmeVentRx?: Record<string, (m: { kind: string; tick: number }) => void> };
      w.__cmds = [];
      const k = `pme-vent/v${c.toLowerCase()}`;
      const own = w.__pmeVentRx?.[k];
      if (!w.__pmeVentRx || !own) return false;
      w.__pmeVentRx[k] = (m) => {
        if (m?.kind === 'cmds') w.__cmds.push({ tick: m.tick, w: performance.now() });
        own(m);
      };
      return true;
    }, R.r.setup.sessionCode as string);
    R.r.notes.push(tapped ? 'cockpit frame tap installed (__pmeVentRx)' : 'NO cockpit frame tap: __pmeVentRx missing');
    await R.row('Ventilator view opened', { phones: await phoneHolds() });
    await R.untilT(R.t0 + 84);
    const before = await readVent('≈ 1:24, before salbutamol');
    await R.untilT(R.t0 + 120);
    await page.evaluate(() => (location.hash = '#/teach'));
    await page.waitForTimeout(800);
    await R.teachTab('scenario');
    const tS = await R.press('Give salbutamol 250 µg', 'treatedByButton');
    await page.evaluate(() => (location.hash = '#/vent'));
    await page.waitForTimeout(3000);
    await R.untilT(R.t0 + 240);
    await R.ff(2, 'command');
    await page.evaluate((v) => (window as unknown as Hook).__pmeApp.link.send({ type: 'time', action: 'scale', value: v }), 8);
    await R.untilT(tS + 180);
    const at3 = await readVent('≈ 3 min after salbutamol (2-min span + ×8)');
    await R.ff(2, 'command');
    await R.untilT(tS + 360);
    const at6 = await readVent('≈ 6 min after salbutamol (second span + ×8)');
    R.r.measures.h5 = { salbutamolAt: mmss(tS), before, at3min: { ...at3, etco2: r1((await hist(page, tS + 170, tS + 185)).at(-1)?.etco2) }, at6min: { ...at6, etco2: r1((await latest(page)).etco2) } };
    // H21: the instructor leaves the Ventilator view for the Monitor view for 30 s; do the phones keep their hold, does EtCO2 stay steady?
    await page.evaluate((v) => (window as unknown as Hook).__pmeApp.link.send({ type: 'time', action: 'scale', value: v }), 4);
    await page.waitForTimeout(2000);
    const h0 = await R.sim();
    const holdBefore = await phoneHolds();
    const cmdsBefore = await page.evaluate(() => (window as unknown as { __cmds?: unknown[] }).__cmds?.length ?? 0);
    await page.evaluate(() => (location.hash = '#/monitor'));
    const per: Row[] = [];
    const wStart = Date.now();
    while (Date.now() - wStart < 30_000) {
      await page.waitForTimeout(2000);
      per.push({ wallS: r1((Date.now() - wStart) / 1000), etco2: r1((await latest(page)).etco2), phones: await phoneHolds() });
    }
    const h1 = await R.sim();
    const et = await hist(page, h0, h1);
    const cmds = await page.evaluate((n) => ((window as unknown as { __cmds?: Array<{ tick: number }> }).__cmds ?? []).slice(n).map((x) => x.tick), cmdsBefore);
    const cockpit = cmds.length ? { frames: cmds.length, firstTick: Math.min(...cmds), lastTick: Math.max(...cmds), contiguous: Math.max(...cmds) - Math.min(...cmds) + 1 === new Set(cmds).size } : { frames: 0 };
    await page.evaluate(() => (location.hash = '#/vent'));
    await page.waitForTimeout(4000);
    const back = await readVent('back on the Ventilator view after 30 s on the Monitor view');
    const etBefore = await hist(page, h0 - 30, h0);
    R.r.measures.h21 = {
      holdBefore, perTwoSeconds: per, etco2Before30s: { min: r1(minOf(etBefore, 'etco2')), max: r1(maxOf(etBefore, 'etco2')) }, etco2DuringMonitor30s: { min: r1(minOf(et, 'etco2')), max: r1(maxOf(et, 'etco2')), samples: et.length },
      cockpitDuringMonitor30s: cockpit, cockpitKeptDriving: cockpit.frames > 0 && (cockpit as { contiguous?: boolean }).contiguous === true, holdKeptEverySample: per.every((x) => (x.phones as Array<{ hold: boolean } | null>).every((p) => p?.hold === true)), simSpanS: r1(h1 - h0), ventAfter: back,
    };
    await page.evaluate(() => (location.hash = '#/teach'));
    await page.waitForTimeout(1000);
    await R.debrief();
    await R.styleChange();
  } finally {
    await R.finish();
  }
});

test('haemorrhage: Explore at 1:00 and 8:00, CPR at the no-pulse alarm, a 2-min span during CPR', async ({ page, browser }) => {
  const R = new Run(page, browser, 'Class IV haemorrhage (kit round)');
  const explore = async (setBaseline: boolean) => {
    await page.evaluate(() => (location.hash = '#/explore/haemodynamics'));
    await page.waitForTimeout(1500);
    const v = page.locator('[data-view=explore]');
    if (setBaseline) {
      await v.getByRole('button', { name: 'Set the baseline now' }).click();
      await page.waitForTimeout(800);
      return null;
    }
    await v.getByRole('button', { name: 'Changed only' }).click();
    await page.waitForTimeout(1200);
    const rows: Record<string, string[]> = {};
    for (const sec of ['overview', 'haemodynamics', 'blood']) {
      await page.evaluate((s) => (location.hash = `#/explore/${s}`), sec);
      await page.waitForTimeout(1200);
      rows[sec] = (await v.locator('table.values tbody tr').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ').trim());
    }
    rows.stamp = [await v.locator('p.hint.num').first().innerText().catch(() => '')];
    return rows;
  };
  try {
    await R.start('Class IV haemorrhage, PEA and resuscitation', 8);
    await R.untilT(R.t0 + 60);
    await R.pauseToggle();
    await explore(true);
    await page.evaluate(() => (location.hash = '#/teach'));
    await page.waitForTimeout(800);
    await R.teachTab('scenario');
    await R.pauseToggle();
    await R.row('1:00 Pause → Explore → Set the baseline now → back → Resume');
    for (const m of [2, 4, 6]) {
      await R.untilT(R.t0 + m * 60);
      await R.row(`${m}:00`);
    }
    await R.untilT(R.t0 + 480);
    await R.pauseToggle();
    await R.row('8:00 paused');
    R.r.measures.exploreAt8 = await explore(false);
    await page.evaluate(() => (location.hash = '#/teach'));
    await page.waitForTimeout(800);
    await R.teachTab('scenario');
    await R.pauseToggle();
    await R.speed(4);
    await R.untilT(R.t0 + 600);
    await R.speed(1);
    await R.row('10:00 ×1');
    const tNp = await R.untilAlarm(/NO PULSE/i, R.t0, 240);
    const np = (await alarms(page)).find((a) => /NO PULSE/i.test(a.text));
    await R.row('SPO2 NO PULSE', { alarm: np?.text ?? null });
    await R.react();
    const tC = await R.press('Start CPR, 2 L and epinephrine', 'resuscitation');
    await R.ff(2);
    await R.speed(4);
    const tR = await R.waitSim(480, (_n, v) => typeof v.abpSys === 'number' && v.abpSys > 90);
    await R.row('systolic above 90');
    await R.react();
    const tStop = await R.press('Pulse back: stop CPR', 'rosc');
    await R.untilT(tStop + 60);
    await R.row('1 min after stopping CPR');
    // the class transitions as read on the monitor (ATLS: HR > 100 class II, > 120 class III, > 140 class IV; systolic < 90)
    const h = await hist(page, R.t0, tNp ?? Infinity);
    const firstT = (f: (s: Sample) => boolean) => { const s = h.find(f); return s ? mmss(s.t) : null; };
    const span = R.r.spans[0] ?? {};
    const rosc90 = tR;
    R.r.measures.haemorrhage = {
      hrAbove100: firstT((s) => (s.hr ?? 0) > 100), hrAbove120: firstT((s) => (s.hr ?? 0) > 120), hrAbove140: firstT((s) => (s.hr ?? 0) > 140), systolicBelow90: firstT((s) => typeof s.abpSys === 'number' && s.abpSys < 90),
      staticPressure: (await alarms(page)).find((a) => /STATIC/i.test(a.text)) ? mmss((await alarms(page)).find((a) => /STATIC/i.test(a.text))!.t) : null,
      noPulseAlarm: np ? mmss(np.t) : null, cprAt: mmss(tC), cprAfterNoPulseAlarmS: np ? r1(tC - np.t) : null,
      systolicAbove90At: rosc90 === null ? null : mmss(rosc90), systolicAbove90AfterCprS: rosc90 === null ? null : r1(rosc90 - tC), returnInsideTheSpan: rosc90 !== null && typeof span.endT === 'number' ? rosc90 <= (span.endT as number) + 1 : null, stopCprAt: mmss(tStop),
    };
    await R.debrief();
    await R.styleChange();
  } finally {
    await R.finish();
  }
});

test('haemorrhage probe: CPR pressed BEFORE the no-pulse alarm (at the static arterial pressure)', async ({ page, browser }) => {
  const R = new Run(page, browser, 'Class IV haemorrhage, early CPR probe (kit round)');
  try {
    await R.start('Class IV haemorrhage, PEA and resuscitation', 8);
    await R.untilT(R.t0 + 540);
    await R.speed(1);
    const tSt = await R.untilAlarm(/STATIC/i, R.t0, 240);
    await R.row('IBP1 STATIC PRESSURE (before SPO2 NO PULSE)');
    await R.react();
    const already = (await alarms(page)).some((a) => /NO PULSE/i.test(a.text));
    const tC = await R.press('Start CPR, 2 L and epinephrine', 'resuscitation');
    await R.speed(8);
    const tR = await R.waitSim(480, (_n, v) => typeof v.abpSys === 'number' && v.abpSys > 90);
    await R.row(tR === null ? 'no systolic above 90 within 8 min' : 'systolic above 90');
    const al = await alarms(page);
    const vf = al.find((a) => a.t >= tC && /VF|FIB/i.test(a.text));
    R.r.measures.earlyCpr = {
      staticAt: tSt === null ? null : mmss(tSt), cprAt: mmss(tC), noPulseAlarmBeforeCpr: already, noPulseAlarmAt: al.find((a) => /NO PULSE/i.test(a.text)) ? mmss(al.find((a) => /NO PULSE/i.test(a.text))!.t) : null,
      vfAlarm: vf ? `${mmss(vf.t)} ${vf.text}` : 'none', systolicAbove90AfterCprS: tR === null ? null : r1(tR - tC), bestSystolicAfterCpr: r1(maxOf(await hist(page, tC, Infinity), 'abpSys')),
    };
    if (tR !== null) await R.press('Pulse back: stop CPR', 'rosc');
    await R.debrief();
  } finally {
    await R.finish();
  }
});

test('tamponade: CPR at the no-pulse alarm, the 2-min span at once (the deliberate miss), drainage, ROSC', async ({ page, browser }) => {
  const R = new Run(page, browser, 'Tamponade (kit round)');
  try {
    await R.start('Stab wound: tamponade, PEA and pericardiocentesis', 8);
    await R.untilT(R.t0 + 60);
    const tiles = await page.evaluate(() => [...document.querySelectorAll('.stage .pme-stile')].map((e) => `${(e as HTMLElement).dataset.param}: ${(e as HTMLElement).innerText.replace(/\s+/g, ' ').trim()}`));
    const lanes = await page.evaluate(() => [...document.querySelectorAll('.stage [data-lane], .stage .pme-lane, .stage [data-wave]')].map((e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 12));
    await R.row('1:00', { tiles, lanes });
    R.r.measures.cvp = { tilesAt1min: tiles, cvpTiles: tiles.filter((t) => /CVP/i.test(t)), lanes, cvpOnLanes: lanes.filter((t) => /CVP/i.test(t)) };
    await R.untilT(R.t0 + 180);
    await R.row('3:00');
    await R.untilT(R.t0 + 360);
    await R.row('6:00');
    await R.untilT(R.t0 + 420);
    await R.speed(1);
    await R.row('7:00 ×1');
    const tPea = await R.until('pea', 180);
    await R.row('state PEA');
    const tNp = await R.untilAlarm(/NO PULSE/i, R.t0, 120);
    const np = (await alarms(page)).find((a) => /NO PULSE/i.test(a.text));
    await R.row('SPO2 NO PULSE', { alarm: np?.text ?? null });
    await R.react();
    const tC = await R.press('Start CPR, intubate, FiO₂ 1.0', 'cpr');
    await R.ff(2);
    const tD = await R.press('Pericardiocentesis during CPR', 'cprDrained');
    await R.speed(4);
    await R.untilT(tD + 75);
    await R.speed(1);
    await R.row('≈ 75 s after drainage, ×1');
    // the pulse back: the model's return of circulation (the Debrief's 'rosc', what the arterial line and the capnogram
    // then show). NOT "systolic > 60": the first Chromium run stopped CPR on that cue at 11:20 — compressions alone read
    // 69/32 on the arterial line 75 s after the drainage — and the patient re-arrested (asystole 13:44; the Debrief: "The
    // return of circulation did not happen"); that run is kept as tamponade-probe-stop-on-systolic-60-chromium.*
    const tBack = await R.waitSim(240, async () => (await page.evaluate(() => (window as unknown as { __pmeApp: { session: { record: { pulse: boolean | null } } } }).__pmeApp.session.record.pulse)) === true);
    await R.row('pulse back (the model\'s return of circulation)');
    await R.react();
    const tStop = await R.press('Pulse back: stop CPR', 'rosc');
    await R.untilT(tStop + 30);
    await R.row('30 s after stopping CPR');
    await R.press('Crystalloid 500 mL', 'roscFluid');
    await R.speed(8);
    await R.untilT(R.t0 + 900);
    await R.row('15:00');
    R.r.measures.tamponade = {
      peaStateAt: tPea === null ? null : mmss(tPea), noPulseAlarmAt: np ? mmss(np.t) : null, cprAt: mmss(tC), cprAfterAlarmS: np ? r1(tC - np.t) : null, drainedAt: mmss(tD), drainAfterCprS: r1(tD - tC),
      pulseBackSeenAt: tBack === null ? null : mmss(tBack), stopCprAt: mmss(tStop), stopAfterSeenS: tBack === null ? null : r1(tStop - tBack), noPulseAlarmTakenFrom: tNp === null ? 'not seen' : 'alarm event',
    };
    await R.debrief();
    await R.styleChange();
  } finally {
    await R.finish();
  }
});

for (const path of ['early', 'late', 'early-normo'] as const) {
  test(`MH, crisis called at ${path === 'late' ? 'the established crisis' : 'the early signs'}${path === 'early-normo' ? ', ventilation back at Recovering before span 1' : ''}, three 5-min fast-forwards`, async ({ page, browser }) => {
    test.setTimeout(40 * 60_000);
    const R = new Run(page, browser, `Malignant hyperthermia, ${path} call (kit round)`);
    // the 40-mmHg check (ventilation back at 12 × 500 when Recovering shows and the CO2 tile reads below 40)
    const normo = async () => {
      if ((await stateId(page)) === 'recovering' && ((await latest(page)).etco2 ?? 99) < 40) {
        await R.press('EtCO₂ normal: ventilation back to 12 × 500', 'normoventilated');
        return true;
      }
      return false;
    };
    let normoDone = false;
    const etBelow40 = async (from: number) => (await hist(page, from, Infinity)).find((s) => typeof s.etco2 === 'number' && s.etco2 < 40) ?? null;
    try {
      await R.start('Malignant hyperthermia', 8);
      await R.untilT(R.t0 + 240);
      await R.press('Start surgery: rocuronium 0.6 mg/kg', 'surgery');
      let tC: number;
      let ffDone = 0;
      if (path !== 'late') {
        await R.untilT(R.t0 + 390);
        await R.speed(4);
        await R.row('6:30 ×4: watch the CO2 tile');
        const tEarly = await R.until('earlySigns', 600);
        await R.row('state Early signs');
        await R.react();
        tC = await R.press(CRISIS, 'triggerOff');
        R.r.measures.callAfterEarlySignsS = tEarly === null ? null : r1(tC - tEarly);
        await R.untilT(tC + 20);
        await R.press('Dantrolene 2.5 mg/kg', 'dantrolene');
        await R.untilT(tC + 30);
        await R.press('Cool: refrigerated saline 20 mL/kg (1.6 L)', 'cooling');
        await R.untilT(tC + 40);
        if (path === 'early-normo') {
          // E19 option: wait for "Recovering" (≈ 1.6 min after the call on this build), press ventilation back, THEN span 1
          await R.waitSim(300, async (_n, v) => (await stateId(page)) === 'recovering' && typeof v.etco2 === 'number' && v.etco2 < 40);
          await R.react();
          normoDone = await normo();
          await R.row('Recovering shown: ventilation back before span 1', { normoDone });
        }
        await R.ff(5);
        ffDone++;
        await R.pauseToggle();
        const et1 = (await latest(page)).etco2;
        await R.row('after span 1, paused', { co2: et1 });
        await R.pauseToggle();
        if (typeof et1 === 'number' && et1 > 45) await R.press((await stateId(page)) === 'normoventilated' ? DOSE2 : 'Dantrolene 2.5 mg/kg');
        await R.ff(5);
        ffDone++;
      } else {
        await R.speed(8);
        const tEarly = await R.until('earlySigns', 720);
        await R.row('state Early signs (not called: the late path)');
        R.r.measures.earlySignsAt = tEarly === null ? null : mmss(tEarly);
        await R.ff(5);
        ffDone++;
        if ((await stateId(page)) !== 'established') {
          await R.ff(5);
          ffDone++;
        }
        const tEst = (await stateId(page)) === 'established' ? await R.sim() : await R.until('established', 900);
        await R.row('state Established MH');
        await R.speed(4);
        await R.react();
        tC = await R.press(CRISIS, 'triggerOff');
        R.r.measures.callAfterEstablishedS = tEst === null ? null : r1(tC - tEst);
        await R.untilT(tC + 20);
        await R.press('Dantrolene 2.5 mg/kg', 'dantrolene');
        await R.untilT(tC + 30);
        await R.press('Cool: refrigerated saline 20 mL/kg (1.6 L)', 'cooling');
        await R.untilT(tC + 40);
        await R.press('Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose', 'potassium');
        await R.untilT(tC + 50);
        await R.press('Sodium bicarbonate 1 mmol/kg', 'bicarbonate');
      }
      while (ffDone < 3) {
        await R.pauseToggle();
        await R.row(`paused before span ${ffDone + 1}`);
        await R.pauseToggle();
        normoDone = normoDone || (await normo());
        const et = (await latest(page)).etco2 ?? 99;
        await R.ff(!normoDone && (await stateId(page)) === 'recovering' && et >= 40 && et < 45 ? 2 : 5);
        ffDone++;
      }
      normoDone = normoDone || (await normo());
      if (!normoDone) {
        const tLow = await R.waitSim(600, async (_n, v) => (await stateId(page)) === 'recovering' && typeof v.etco2 === 'number' && v.etco2 < 40);
        if (tLow !== null) normoDone = await normo();
      }
      await R.row('end of the path');
      const firstBelow40 = await etBelow40(tC);
      const st = (await page.evaluate(() => (window as unknown as Hook).__st ?? [])) as Array<{ t: number; id: string }>;
      const rec = st.find((x) => x.id === 'recovering');
      R.r.measures.mh = {
        path, callAt: mmss(tC), etco2FirstBelow40: firstBelow40 ? mmss(firstBelow40.t) : null, etco2Below40AfterCallMin: firstBelow40 ? r1((firstBelow40.t - tC) / 60) : null,
        recoveringAt: rec ? mmss(rec.t) : null, recoveringAfterCallMin: rec ? r1((rec.t - tC) / 60) : null, normoventilated: normoDone, fastForwards: ffDone,
        hrMaxAfterCall: r1(maxOf(await hist(page, tC, Infinity), 'hr')), etco2MaxAfterCall: r1(maxOf(await hist(page, tC, Infinity), 'etco2')), minSystolicAfterCall: r1(minOf(await hist(page, tC, Infinity), 'abpSys')),
      };
      await R.debrief();
      await R.styleChange();
    } finally {
      await R.finish();
    }
  });
}

// E22 (owner ruling 2026-10-17): the MH objective is now "hyperventilation kept until EtCO2 has stayed below 40 mmHg for
// 2 min, then ventilation normalised" (rule `heldThen`; an earlier press is not met). The early call as the cue card runs
// it, then "ventilation back" at the first moment the 2 min are complete and the page takes a press: `at-hold` (B) holds
// span 1 until then (≈ 9:27) and presses; `span-1-at-7-42` (A) runs span 1 40 s after the call (07:42, as the early path
// above) and presses as it ends (the 2 min complete inside the span, when the page refuses presses); `span-1-at-8-45`
// runs span 1 at the old cue card's 8:45 and presses after it. Then the remaining 5-min fast-forwards (three in all), the
// repeat dantrolene if EtCO2 is above 45 after a span (as the early path above), and EtCO2's course after the press from
// the page's 1 Hz history.
const NORMO = 'EtCO₂ normal: ventilation back to 12 × 500';
for (const variant of ['at-hold', 'span-1-at-7-42', 'span-1-at-8-45'] as const) {
  test(`MH E22, early call, ventilation back once EtCO2 has stayed below 40 for 2 min (${variant})`, async ({ page, browser }) => {
    test.setTimeout(40 * 60_000);
    const R = new Run(page, browser, `Malignant hyperthermia E22 ${variant} (kit round)`);
    /** The start of the current unbroken stretch of EtCO2 below 40 since `from` (a measurement without EtCO2 is skipped). */
    const below40Since = async (from: number): Promise<number | null> => {
      let run: number | null = null;
      for (const x of await hist(page, from, Infinity)) if (x.etco2 !== undefined) run = typeof x.etco2 === 'number' && x.etco2 < 40 ? (run ?? x.t) : null;
      return run;
    };
    const held = async (from: number, now: number) => {
      const h = await below40Since(from);
      return h !== null && now - h >= 120;
    };
    try {
      await R.start('Malignant hyperthermia', 8);
      await R.untilT(R.t0 + 240);
      await R.press('Start surgery: rocuronium 0.6 mg/kg', 'surgery');
      await R.untilT(R.t0 + 390);
      await R.speed(4);
      await R.row('6:30 ×4: watch the CO2 tile');
      const tEarly = await R.until('earlySigns', 600);
      await R.row('state Early signs');
      await R.react();
      const tC = await R.press(CRISIS, 'triggerOff');
      await R.untilT(tC + 20);
      await R.press('Dantrolene 2.5 mg/kg', 'dantrolene');
      await R.untilT(tC + 30);
      await R.press('Cool: refrigerated saline 20 mL/kg (1.6 L)', 'cooling');
      let ffDone = 0;
      if (variant !== 'at-hold') {
        await R.untilT(variant === 'span-1-at-7-42' ? tC + 40 : 525);
        await R.row(variant === 'span-1-at-7-42' ? 'span 1, 40 s after the call' : '8:45: span 1 as the old cue card');
        await R.ff(5);
        ffDone++;
      }
      const tHeld = await R.waitSim(600, async (now) => held(tC, now));
      const holdFrom = await below40Since(tC);
      await R.row('EtCO2 below 40 for 2 min since the call', { holdFrom: holdFrom === null ? null : mmss(holdFrom), heldAt: holdFrom === null ? null : mmss(holdFrom + 120), seenAt: tHeld === null ? null : mmss(tHeld) });
      await R.react();
      R.r.measures.buttonsBeforePress = { state: await stateId(page), normoOffered: (await page.locator('section[aria-label="Running scenario"]').getByRole('button', { name: NORMO, exact: true }).count()) > 0 };
      const tP = await R.press(NORMO, 'normoventilated');
      let repeat: number | null = null;
      while (ffDone < 3) {
        await R.ff(5);
        ffDone++;
        const et = (await latest(page)).etco2;
        await R.row(`after span ${ffDone}`, { co2: et });
        if (repeat === null && typeof et === 'number' && et > 45) repeat = await R.press(DOSE2, 'dantroleneAgain');
      }
      await R.row('end of the path');
      // EtCO2 after the press: per minute (the first measurement of each minute), the maximum, the first time at 45 or above
      const after = (await hist(page, tP, Infinity)).filter((x) => typeof x.etco2 === 'number') as Array<{ t: number; etco2: number }>;
      const perMin = Array.from({ length: Math.floor(((after.at(-1)?.t ?? tP) - tP) / 60) + 1 }, (_, m) => after.find((x) => x.t >= tP + m * 60)).map((x, m) => `+${m} min ${x ? Math.round(x.etco2) : '–'}`);
      const max = after.reduce<{ t: number; etco2: number } | null>((b, x) => (!b || x.etco2 > b.etco2 ? x : b), null);
      const at45 = after.find((x) => x.etco2 >= 45);
      const before = (await hist(page, tC, tP)).filter((x) => typeof x.etco2 === 'number') as Array<{ t: number; etco2: number }>;
      R.r.measures.e22 = {
        variant, earlySignsAt: tEarly === null ? null : mmss(tEarly), callAt: mmss(tC), etco2FirstBelow40: (() => { const x = before.find((y) => y.etco2 < 40); return x ? mmss(x.t) : null; })(),
        holdFrom: holdFrom === null ? null : mmss(holdFrom), heldAt: holdFrom === null ? null : mmss(holdFrom + 120), heldAfterCallMin: holdFrom === null ? null : r1((holdFrom + 120 - tC) / 60),
        pressAt: mmss(tP), pressAfterCallMin: r1((tP - tC) / 60), etco2AtPress: r1((await hist(page, tP - 2, tP)).filter((x) => typeof x.etco2 === 'number').at(-1)?.etco2),
        etco2MaxAfterPress: max ? `${r1(max.etco2)} at ${mmss(max.t)} (+${r1((max.t - tP) / 60)} min)` : null, etco2First45AfterPress: at45 ? `${mmss(at45.t)} (+${r1((at45.t - tP) / 60)} min)` : 'never', etco2PerMinuteAfterPress: perMin.join(' · '),
        historySamplesAfterPress: after.length, repeatDantrolene: repeat === null ? null : mmss(repeat), fastForwards: ffDone,
      };
      await R.debrief();
    } finally {
      await R.finish();
    }
  });
}

// E22 card fact: "ventilation back" is offered only in "Recovering"; a dantrolene press there (as any checklist button)
// takes the card through "Dantrolene given" (2 s) to "MH treatment under way", and the button returns only when EtCO2 has
// been below 45 for a minute again. Measured on the early call under hyperventilation: the button's absence after the press.
test('MH E22 probe: "ventilation back" offered only in Recovering; gone after a dantrolene press there', async ({ page, browser }) => {
  test.setTimeout(30 * 60_000);
  const R = new Run(page, browser, 'Malignant hyperthermia E22 probe dantrolene in Recovering (kit round)');
  const offered = async () => (await page.locator('section[aria-label="Running scenario"]').getByRole('button', { name: NORMO, exact: true }).count()) > 0;
  try {
    await R.start('Malignant hyperthermia', 8);
    await R.untilT(R.t0 + 240);
    await R.press('Start surgery: rocuronium 0.6 mg/kg', 'surgery');
    await R.untilT(R.t0 + 390);
    await R.speed(4);
    await R.until('earlySigns', 600);
    const seen: Row = { earlySigns: await offered() };
    await R.react();
    const tC = await R.press(CRISIS, 'triggerOff');
    seen.triggerOff = await offered();
    await R.untilT(tC + 20);
    await R.press('Dantrolene 2.5 mg/kg', 'dantrolene');
    await R.untilT(tC + 30);
    await R.press('Cool: refrigerated saline 20 mL/kg (1.6 L)', 'cooling');
    seen.treating = await offered();
    const tRec = await R.until('recovering', 300);
    seen.recovering = await offered();
    await R.untilT((tRec ?? (await R.sim())) + 10);
    const tD = await R.press('Dantrolene 2.5 mg/kg', 'dantrolene');
    seen.afterDantrolene = await offered();
    const tBack = await R.waitSim(300, async () => offered());
    await R.row('ventilation back offered again', { stateNow: await stateId(page) });
    R.r.measures.e22probe = { offeredIn: seen, dantroleneInRecoveringAt: mmss(tD), offeredAgainAt: tBack === null ? 'not within 5 min' : mmss(tBack), goneForS: tBack === null ? null : r1(tBack - tD) };
  } finally {
    await R.finish();
  }
});

test('session mechanics: reload survival, Silence on the Saadat-style skin, the version label', async ({ page, browser }) => {
  const R = new Run(page, browser, 'Session mechanics (kit round)');
  try {
    await R.start('Anaphylaxis under anaesthesia', 4);
    const code1 = R.r.setup.sessionCode as string;
    // Silence during an active alarm on the default (Saadat-style) skin: what the monitor and the panel show for 120 s
    const tAl = await R.waitSim(240, async () => ((await page.evaluate(() => (window as unknown as Hook).__pmeApp.link.alarms?.active?.length ?? 0)) > 0));
    await R.row('an alarm is active', { alarmButton: await R.alarmButton() });
    await R.teachTab('devices');
    R.r.measures.pauseButton = { disabled: await page.getByRole('button', { name: 'Pause alarms', exact: true }).isDisabled(), why: await R.panel().locator('[id$="alarm-pause-why"]').innerText().catch(() => '') };
    await page.getByRole('button', { name: 'Silence', exact: true }).click();
    const tSil = await R.sim();
    const silence: Row[] = [];
    const look = async (label: string) => {
      const monitorAlarmText = await page.evaluate(() => [...document.querySelectorAll('.stage .pme-bar, .stage [class*=alarm], .stage [data-pme=alarm]')].map((e) => (e as HTMLElement).innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 6));
      silence.push({ label, clock: mmss(await R.sim()), sinceSilenceS: r1((await R.sim()) - tSil), panelStatus: await page.locator('[data-view=teach] p.hint[role=status]').first().innerText().catch(() => ''), alarmButton: await R.alarmButton(), monitorAlarmText, active: await page.evaluate(() => (window as unknown as Hook).__pmeApp.link.alarms?.active?.map((a) => a.text) ?? []), silencedUntil: await page.evaluate(() => (window as unknown as Hook).__pmeApp.link.alarms?.silencedUntil ?? null) });
    };
    await page.waitForTimeout(800);
    await look('just after Silence');
    const tEnd = await R.waitSim(125, async () => (await page.evaluate(() => (window as unknown as Hook).__pmeApp.link.alarms?.silencedUntil ?? null)) === null);
    await look(tEnd === null ? 'silence still on after 125 s' : 'the silence ended');
    R.r.measures.silenceEndedAfterS = tEnd === null ? null : r1(tEnd - tSil);
    R.r.measures.alarmsRaisedDuringSilence = (await alarms(page)).filter((a) => a.t >= tSil && (tEnd === null || a.t <= tEnd + 1)).map((a) => `${mmss(a.t)} ${a.text}`);
    await page.locator('.stage').screenshot({ path: join(OUTDIR, `silence-saadat-${R.r.browser}.png`) }).catch(() => undefined);
    for (const s of [30, 60, 110, 125]) {
      await R.untilT(tSil + s);
      await look(`${s} s after Silence`);
    }
    R.r.measures.silenceSaadat = silence;
    await R.teachTab('scenario');
    // version label: every visible "version", "v1.", "rc" or "Build" on Home (E125) and the Instructor, Monitor and Settings views
    const labels: Record<string, string[]> = {};
    for (const v of ['home', 'teach', 'monitor', 'settings']) {
      await page.evaluate((x) => (location.hash = `#/${x}`), v);
      await page.waitForTimeout(1200);
      labels[v] = ((await page.locator('body').innerText()).match(/[^\n]*(version|v\d+\.\d+|\brc\b|\bBuild\b|0\.0\.0)[^\n]*/gi) ?? []).slice(0, 6);
    }
    await page.evaluate(() => (location.hash = '#/debrief'));
    await page.waitForTimeout(1500);
    labels.debrief = ((await page.locator('[data-view=debrief]').innerText()).match(/[^\n]*(Build|version)[^\n]*/gi) ?? []).slice(0, 4);
    R.r.measures.versionLabel = labels;
    await page.evaluate(() => (location.hash = '#/teach'));
    await page.waitForTimeout(800);
    // reload: do "All alarms on", "Sound on" and the session code survive?
    const before = { alarmButton: await R.alarmButton(), allOff: await page.evaluate(() => (window as unknown as Hook).__pmeApp.link.alarms?.allOff ?? null), sound: (await page.locator('.sound').first().innerText()).trim(), code: code1 };
    if (R.probe) R.probe.mark('before the reload');
    await page.reload();
    await page.waitForFunction(() => '__pmeApp' in window, null, { timeout: 30_000 });
    await page.waitForTimeout(3000);
    const after = { alarmButton: await R.alarmButton(), allOff: await page.evaluate(() => (window as unknown as Hook).__pmeApp.link.alarms?.allOff ?? null), sound: (await page.locator('.sound').first().innerText()).trim(), code: await page.evaluate(() => (window as unknown as Hook).__pmeApp.session.code), scenario: await page.evaluate(() => (window as unknown as Hook).__pmeApp.link.ctl.scenario.stateId) };
    await page.waitForTimeout(15_000);
    const phonesAfterReload = await Promise.all(R.phones.map((p) => p.evaluate(() => ({ status: (window as unknown as Hook).__pmeFollower?.sync?.status ?? 'none', text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 160) })).catch(() => null)));
    R.r.measures.reload = { before, after, phonesAfterReload15s: phonesAfterReload };
    await record(page); // the reload cleared the page's recorder
  } finally {
    await R.finish();
  }
});

// ------------------------------------------------------------------------------------------------ kit round A3 (17 Oct)

const modelPulse = (page: Page) => page.evaluate(() => (window as unknown as { __pmeApp: { session: { record: { pulse: boolean | null } } } }).__pmeApp.session.record.pulse);

test('A3 tamponade: the cue card path (CPR from PEA, x4/x1, drainage 1:30 into CPR, no fast-forward), Debrief printed', async ({ page, browser }) => {
  const R = new Run(page, browser, 'A3 tamponade, cue-card path (kit round)');
  try {
    // cue card 6: Load · All alarms on · Bookmark · ×8
    await R.start('Stab wound: tamponade, PEA and pericardiocentesis', 8, 'after-alarms');
    await R.untilT(R.t0 + 60);
    await R.row('1:00 (CVP on the IBP2 tile)', { ibp2: await page.locator('.stage .pme-stile[data-param=IBP2] [data-pme=v]').first().innerText().catch(() => null) });
    await R.tick(/^Name the tamponade/); // E54: when the cues appear (CVP rising, narrow pulse pressure); the tile shows this time as recorded
    await R.untilT(R.t0 + 420);
    await R.speed(1);
    await R.row('7:00 ×1');
    const tPea = await R.until('pea', 180);
    await R.row('card shows PEA');
    await R.react();
    const tC = await R.press('Start CPR, intubate, FiO₂ 1.0', 'cpr');
    await R.speed(4);
    await R.row('×4 after CPR');
    await R.untilT(R.t0 + 540);
    await R.speed(1);
    await R.row('9:00 ×1');
    await R.untilT(tC + 90);
    const tD = await R.press('Pericardiocentesis during CPR', 'cprDrained');
    await R.speed(4);
    await R.untilT(tD + 60);
    await R.speed(1);
    await R.row('≈ 1 min after the drainage, ×1: watch');
    // the card's cue: pressure climbs ABOVE the compressions' 69/32; the script stops on the model's return of circulation
    const tBack = await R.waitSim(240, async () => (await modelPulse(page)) === true);
    await R.row('return of circulation (the model)');
    await R.react();
    const tStop = await R.press('Pulse back: stop CPR', 'rosc');
    await R.untilT(tStop + 30);
    await R.row('30 s after stopping CPR');
    await R.press('Crystalloid 500 mL', 'roscFluid');
    const h = await hist(page, tD, tBack ?? Infinity);
    R.r.measures.a3tamponade = {
      peaStateAt: tPea === null ? null : mmss(tPea), cprAt: mmss(tC), cprAfterPeaStateS: tPea === null ? null : r1(tC - tPea), drainedAt: mmss(tD), drainAfterCprS: r1(tD - tC),
      roscAt: tBack === null ? null : mmss(tBack), drainToRoscS: tBack === null ? null : r1(tBack - tD), stopAt: mmss(tStop), stopAfterRoscS: tBack === null ? null : r1(tStop - tBack),
      maxSystolicDrainToRosc: r1(maxOf(h, 'abpSys')), artAtStop: R.r.rows.find((x) => String(x.what).includes('Pulse back'))?.art ?? null,
    };
    // the Debrief moment (card 7): read it, then Run by + Notes, print
    await R.debrief();
    await page.locator('.sessionbar').getByRole('link', { name: 'Debrief' }).click();
    const view = page.locator('[data-view=debrief]');
    await view.getByRole('heading', { level: 1, name: 'Debrief' }).waitFor({ timeout: 15_000 });
    await view.getByRole('textbox', { name: 'Run by' }).fill('Showcase 2, 22 October');
    await view.getByRole('textbox', { name: 'Notes' }).fill('Kit round A3 rehearsal of the cue-card path.').catch(() => undefined);
    await page.emulateMedia({ media: 'print' });
    mkdirSync(OUTDIR, { recursive: true });
    await page.screenshot({ path: join(OUTDIR, `a3-tamponade-debrief-print-${R.r.browser}.png`), fullPage: true }).catch(() => undefined);
    if (R.r.browser === 'chromium') {
      const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
      writeFileSync(join(OUTDIR, 'a3-tamponade-debrief-chromium.pdf'), pdf);
      const info = pdfInfo(pdf);
      R.r.measures.pdf = { pages: info.boxes.length, a4: info.boxes.every((b) => Math.round(b[2] ?? 0) === 595 && Math.round(b[3] ?? 0) === 842), title: info.title };
    } else R.r.measures.pdf = 'WebKit: Playwright has no page.pdf(); print-media screenshot only';
    // the learner handout (E51): the view's print mode, as its button sets it
    await page.evaluate(() => document.querySelector('.debrief')?.setAttribute('data-print', 'handout'));
    await page.screenshot({ path: join(OUTDIR, `a3-tamponade-handout-print-${R.r.browser}.png`), fullPage: true }).catch(() => undefined);
    if (R.r.browser === 'chromium') {
      const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
      writeFileSync(join(OUTDIR, 'a3-tamponade-handout-chromium.pdf'), pdf);
      R.r.measures.handoutPdf = { pages: pdfInfo(pdf).boxes.length };
    }
    await page.evaluate(() => document.querySelector('.debrief')?.removeAttribute('data-print'));
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => (location.hash = '#/teach'));
    await page.waitForTimeout(800);
  } finally {
    await R.finish();
  }
});

test('A3 Return here: does a bookmark restore keep "All alarms on"?', async ({ page, browser }) => {
  const R = new Run(page, browser, 'A3 Return here and All alarms on (kit round)');
  const allOff = () => page.evaluate(() => (window as unknown as Hook).__pmeApp.link.alarms?.allOff ?? null);
  const returnTo = async (i: number) => {
    await R.teachTab('scenario');
    const li = page.locator('section[aria-label="Running scenario"] li').filter({ has: page.getByRole('button', { name: 'Return here' }) });
    const label = (await li.nth(i).innerText()).replace(/\s*Return here\s*$/, '').trim();
    await li.nth(i).getByRole('button', { name: 'Return here' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Return' }).click();
    await page.waitForTimeout(2500);
    return { bookmark: label, clock: mmss(await R.sim()), allOff: await allOff(), alarmButton: await R.alarmButton() };
  };
  try {
    // Bookmark 1 right after Load (limits are off after every Load), then All alarms on, then Bookmark 2 (the cue cards' order)
    await R.start('Anaphylaxis under anaesthesia', 4, 'before-alarms');
    await page.locator('.sessionbar').getByRole('button', { name: 'Bookmark' }).click();
    await page.waitForTimeout(500);
    const marks = await page.locator('section[aria-label="Running scenario"] li').filter({ has: page.getByRole('button', { name: 'Return here' }) }).allInnerTexts();
    const before = { allOff: await allOff(), alarmButton: await R.alarmButton(), bookmarks: marks.map((x) => x.replace(/\s*Return here\s*$/, '').trim()) };
    await R.untilT(R.t0 + 150); // into the reaction: HR alarms may sound
    const running = { clock: mmss(await R.sim()), allOff: await allOff(), alarmButton: await R.alarmButton() };
    const toSecond = await returnTo(1);
    await R.untilT((await R.sim()) + 40);
    const after40 = { clock: mmss(await R.sim()), allOff: await allOff(), alarmButton: await R.alarmButton() };
    const toFirst = await returnTo(0);
    R.r.measures.a3return = { before, running, returnToBookmarkTakenWithAlarmsOn: toSecond, after40s: after40, returnToBookmarkTakenRightAfterLoad: toFirst };
    await R.row('after the two returns');
  } finally {
    await R.finish();
  }
});

test('A3 bronchospasm: ×8 and a 2-min fast-forward from the Instructor view with the cockpit hidden, then back to the Ventilator view', async ({ page, browser }) => {
  const R = new Run(page, browser, 'A3 bronchospasm, instructor-view fast-forward, cockpit hidden (kit round)');
  const phoneHolds = async () => Promise.all(R.phones.map((p) => p.evaluate(() => { const h = document.querySelector('.learner-hold') as HTMLElement | null; return { hold: !!h && !h.hidden, status: (window as unknown as Hook).__pmeFollower?.sync?.status ?? 'none' }; }).catch(() => null)));
  const ventText = async () => {
    const f = page.frames().find((x) => x.url().includes('vent-hamilton'));
    return f ? (await f.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 900) : 'no ventilator frame';
  };
  const vte = (t: string) => (/(\d+)\s*VTE ml/.exec(t) ? Number(/(\d+)\s*VTE ml/.exec(t)![1]) : null);
  const ticks = (from = 0) => page.evaluate((n) => ((window as unknown as { __cmds?: Array<{ tick: number }> }).__cmds ?? []).slice(n).map((x) => x.tick), from);
  const summary = (t: number[]) => (t.length ? { frames: t.length, firstTick: Math.min(...t), lastTick: Math.max(...t), contiguous: Math.max(...t) - Math.min(...t) + 1 === new Set(t).size } : { frames: 0 });
  try {
    await R.start('Severe bronchospasm on the ventilator', 4, 'after-alarms');
    await page.evaluate(() => (location.hash = '#/vent'));
    await page.waitForTimeout(5000);
    const tapped = await page.evaluate((c) => {
      const w = window as unknown as { __cmds: Array<{ tick: number }>; __pmeVentRx?: Record<string, (m: { kind: string; tick: number }) => void> };
      w.__cmds = [];
      const k = `pme-vent/v${c.toLowerCase()}`;
      const own = w.__pmeVentRx?.[k];
      if (!w.__pmeVentRx || !own) return false;
      w.__pmeVentRx[k] = (m) => {
        if (m?.kind === 'cmds') w.__cmds.push({ tick: m.tick });
        own(m);
      };
      return true;
    }, R.r.setup.sessionCode as string);
    await R.untilT(R.t0 + 90);
    const vBefore = vte(await ventText());
    await R.row('Ventilator view, 1:30', { vte: vBefore, phones: await phoneHolds() });
    const n0 = (await ticks()).length;
    const etBefore = await hist(page, (await R.sim()) - 30, Infinity);
    // to the Instructor view (the cockpit is hidden), ×8, then the session bar's "Fast-forward 2 min"
    await page.evaluate(() => (location.hash = '#/teach'));
    await page.waitForTimeout(800);
    const hidden = await page.evaluate(() => { const f = document.querySelector('iframe[src*="vent-hamilton"]') as HTMLElement | null; return f ? !f.offsetParent || getComputedStyle(f).visibility === 'hidden' : 'no frame'; });
    await R.speed(8);
    const p1 = await phoneHolds();
    const sA = await R.sim();
    await R.untilT(sA + 40);
    const span = await R.ff(2, 'button');
    const p2 = await phoneHolds();
    await page.waitForTimeout(5000);
    const sB = await R.sim();
    const during = await ticks(n0);
    const etDuring = await hist(page, sA, sB);
    await page.evaluate(() => (location.hash = '#/vent'));
    await page.waitForTimeout(5000);
    const vAfter = vte(await ventText());
    const n1 = (await ticks()).length;
    await page.waitForTimeout(5000);
    const after = await ticks(n1);
    R.r.measures.a3bronch = {
      tapped, cockpitHiddenOnInstructorView: hidden, simSpanOnInstructorViewS: r1(sB - sA), expectedTicks: Math.round((sB - sA) / 0.02),
      cockpitWhileHidden: summary(during), cockpitAfterReturn5sWall: summary(after), etco2Before30s: { min: r1(minOf(etBefore, 'etco2')), max: r1(maxOf(etBefore, 'etco2')) },
      etco2WhileHidden: { min: r1(minOf(etDuring, 'etco2')), max: r1(maxOf(etDuring, 'etco2')), samples: etDuring.length }, vteBefore: vBefore, vteAfterReturn: vAfter,
      phonesAtX8: p1, phonesAfterSpan: p2, phonesAfterReturn: await phoneHolds(), span,
    };
    await R.row('back on the Ventilator view', { vte: vAfter });
  } finally {
    await R.finish();
  }
});

// ------------------------------------------------------------------------------------- kit round Q1 (the 30-minute talk)

// Q1: the 30-minute talk end to end in ONE page, as the 3 November programme runs it. The owner's programme of
// 29 October: ONE case, malignant hyperthermia on the E119 card, with three pauses in which he explains the physiology
// the engine is computing on the Explore view, the matching model page open behind it in a second browser tab prepared
// before the talk; the class IV haemorrhage case leaves the programme (it stays in the build as a reserve, and its A4
// test below still measures it). Segments: 0 the opening on Home and the Room (three phones join once; the model-page
// tab is opened here, "before the talk"), 1 MH to the early signs (×8 then ×4), STOP 1 at the early signs (Pause,
// Explore from the Instructor's rail, the presenter's sections, the model-page tab in front and back, Resume), 2 the
// call, hyperventilation and dantrolene, the EtCO₂ falling, span 1, STOP 2 as span 1 ends (Recovering), 3 ventilation
// back and the climb (span 2), STOP 3 as span 2 ends (before the second dose), 4 the second dose with hyperventilation
// again, span 3, the end Paused and the MH Debrief read on screen (not printed). The talk itself is not measured: every
// wall time here is the machine's (the presses, the spans, the Explore openings) with the presenter's reaction
// (KITROUND_REACT_S) and a short look (KITROUND_STOP_LOOK_S) where the talk will be. The engine's path in sim time is the
// A4 / OWR4 path's (the stops pause the clock where A4 pressed on), so the speaker's reference numbers apply.
// Screenshots of each stop (the projector's view, 1440 × 900) go to KITROUND_SHOTS if set, else to the OUTDIR.
//   KITROUND_OUTDIR=… KITROUND_SHOTS=… SHOWCASE_KIT=… npx playwright test -c scripts/showcase/playwright.kit-round.config.ts -g "Q1 30-minute talk" --project chromium
//   KITROUND_EXPLORE_ALL=1: also read every Explore section at each stop (after the presenter's path, timed apart)
//   KITROUND_VERBOSE=1: print every row as it is taken (progress on a loaded machine)
const holds = (phones: Page[]) => Promise.all(phones.map((p) => p.evaluate(() => { const h = document.querySelector('.learner-hold') as HTMLElement | null; const s = (window as unknown as Hook).__pmeFollower?.sync; return { hold: !!h && !h.hidden, status: s?.status ?? 'none', resyncs: s?.resyncs ?? null }; }).catch(() => null)));
const sessionBarScen = (page: Page) => page.locator('.sessionbar .scen').innerText().then((s) => s.trim()).catch(() => 'no session bar');
const STOP_LOOK_S = Number(process.env.KITROUND_STOP_LOOK_S ?? 3);
const MODEL_PAGE = (page: string) => `https://${'github.com/samhv-dev/patient-monitor-engine'}/blob/main/docs/model/${page}.md`;
/** The presenter's path at each stop (run sheet §3): the Explore sections he opens, in order, with "Changed only" OFF
 *  (it would hide the dantrolene rows, which have no 1:00 baseline); `scrollTo` = the row he scrolls to (centred) after
 *  the section's first screen; and the model page(s) behind. */
const STOPS: Record<1 | 2 | 3, { sections: Array<{ id: string; scrollTo?: string }>; modelPages: string[] }> = {
  1: { sections: [{ id: 'endocrine' }, { id: 'blood', scrollTo: 'BE' }], modelPages: ['endocrine-thermal'] },
  2: { sections: [{ id: 'drugs' }, { id: 'endocrine' }, { id: 'gas', scrollTo: 'V̇A' }, { id: 'blood', scrollTo: 'BE' }], modelPages: ['pharmacology', 'blood'] },
  3: { sections: [{ id: 'endocrine' }, { id: 'drugs' }, { id: 'gas', scrollTo: 'V̇A' }], modelPages: ['endocrine-thermal'] },
};
const EXPLORE_IDS = ['overview', 'haemodynamics', 'respiratory', 'gas', 'blood', 'brain', 'kidney', 'liver', 'endocrine', 'neuro', 'drugs', 'labs'];
const hostPaused = (page: Page) => page.evaluate(() => (window as unknown as Hook).__pmeApp.link.ctl.hostPaused);
const phoneLines = (phones: Page[]) => Promise.all(phones.map((p) => p.evaluate(() => (/Following session[^\n]*|The instructor[^\n]*/.exec(document.body.innerText) ?? [''])[0]).catch(() => null)));

/** The Explore section on screen: its title, the time stamp, the vitals strip and every row of the table as shown. */
async function exploreNow(page: Page): Promise<Row> {
  const v = page.locator('[data-view=explore]');
  return {
    title: await v.locator('#x-h').innerText().catch(() => ''),
    stamp: await v.locator('p.hint.num').first().innerText().catch(() => ''),
    vitals: (await v.locator('.vitals').innerText().catch(() => '')).replace(/\s+/g, ' ').trim(),
    rows: await v.locator('table.values:not(.dense) > tbody > tr').evaluateAll((trs) => trs.map((tr) => {
      const t = (s: string) => (tr.querySelector(s)?.textContent ?? '').trim();
      return { label: t('th .lbl b'), now: t('td.v'), unit: t('td.u'), normal: t('td.n'), change: t('td.d'), dir: tr.getAttribute('data-dir') };
    })),
  };
}

/** One look-inside stop: the session is Paused; Explore opened from the Instructor's rail; the presenter's sections; the
 *  model-page tab brought to the front and back; (optionally every section, timed apart); back to the Instructor. The
 *  session must still be paused at the same sim second, and the phones still following. Resume is the caller's. */
async function lookInside(R: Run, page: Page, phones: Page[], modelTab: Page | null, n: 1 | 2 | 3, dir: string): Promise<Row> {
  const plan = STOPS[n];
  const w = Date.now();
  const sim0 = await R.sim();
  const out: Row = { stop: n, clock: mmss(sim0), pausedAtStart: await hostPaused(page), phonesAtStart: await phoneLines(phones) };
  await page.locator('nav.rail a[href="#/explore"]').click();
  await page.locator('[data-view=explore]').waitFor({ state: 'visible', timeout: 10_000 });
  out.sessionBarOnExplore = await page.locator('.sessionbar').isVisible().catch(() => false);
  out.pauseButtonOnExplore = await page.locator('.sessionbar').getByRole('button', { name: /^(Pause|Resume)$/ }).first().innerText().catch(() => null);
  const seen: Row[] = [];
  for (const { id, scrollTo } of plan.sections) {
    await page.locator(`[data-view=explore] nav.xnav a[data-id="${id}"]`).click();
    await page.waitForTimeout(900); // the table redraws at most every 500 ms
    mkdirSync(dir, { recursive: true });
    const file = `stop${n}-${id}-${R.r.browser}.png`;
    await page.screenshot({ path: join(dir, file) });
    const x: Row = { id, shot: file, ...(await exploreNow(page)) };
    await page.waitForTimeout(STOP_LOOK_S * 1000); // the presenter points (the talk is not measured)
    if (scrollTo) {
      const row = page.locator('[data-view=explore] table.values:not(.dense) > tbody > tr').filter({ has: page.locator('th .lbl b', { hasText: new RegExp(`^${scrollTo}$`) }) }).first();
      await row.evaluate((e) => e.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(500);
      const f2 = `stop${n}-${id}-scrolled-${R.r.browser}.png`;
      await page.screenshot({ path: join(dir, f2) });
      x.scrolledTo = scrollTo;
      x.scrolledShot = f2;
      await page.waitForTimeout(STOP_LOOK_S * 1000);
    }
    seen.push(x);
  }
  out.sections = seen;
  out.presenterExploreWallS = r1((Date.now() - w) / 1000);
  // the model page behind: the second tab (prepared before the talk) brought to the front, then the instructor's tab
  if (modelTab) {
    const tabs: Row[] = [];
    for (const mp of plan.modelPages) {
      const wt = Date.now();
      const nav = await modelTab.goto(MODEL_PAGE(mp), { timeout: 20_000, waitUntil: 'domcontentloaded' }).then((r) => r?.status() ?? 'no response', (e: Error) => `not loaded: ${e.message.split('\n')[0]}`);
      await modelTab.bringToFront();
      await modelTab.waitForTimeout(1500);
      const file = `stop${n}-model-${mp}-${R.r.browser}.png`;
      await modelTab.screenshot({ path: join(dir, file) }).catch(() => undefined);
      tabs.push({ page: mp, url: MODEL_PAGE(mp), status: nav, shot: file, instructorVisibility: await page.evaluate(() => document.visibilityState), instructorPaused: await hostPaused(page), phones: await phoneLines(phones), wallS: r1((Date.now() - wt) / 1000) });
      await page.bringToFront();
      await page.waitForTimeout(800);
    }
    out.modelTab = tabs;
    out.afterModelTab = { visibility: await page.evaluate(() => document.visibilityState), paused: await hostPaused(page), toasts: (await page.locator('.toasts').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(-200) };
  }
  if (process.env.KITROUND_EXPLORE_ALL === '1') {
    const wa = Date.now();
    const all: Row[] = [];
    for (const id of EXPLORE_IDS) {
      await page.locator(`[data-view=explore] nav.xnav a[data-id="${id}"]`).click();
      await page.waitForTimeout(900);
      all.push({ id, ...(await exploreNow(page)) });
    }
    out.allSections = all;
    out.allSectionsWallS = r1((Date.now() - wa) / 1000);
  }
  await page.locator('nav.rail a[href="#/teach"]').click();
  await page.waitForTimeout(800);
  await R.teachTab('scenario');
  const sim1 = await R.sim();
  out.simMovedS = r1(sim1 - sim0);
  out.pausedAtEnd = await hostPaused(page);
  out.phonesAtEnd = await holds(phones);
  out.phoneLinesAtEnd = await phoneLines(phones);
  out.stopWallS = r1((Date.now() - w) / 1000);
  await R.row(`stop ${n}: back on the Instructor, still paused`, { stopWallS: out.stopWallS });
  return out;
}

test('Q1 30-minute talk, the 3 November programme: opening, MH (E119) with three look-inside stops on the Explore view, the MH Debrief read', async ({ page, browser }) => {
  test.setTimeout(60 * 60_000);
  page.setDefaultTimeout(30_000); // a press that cannot land fails the run at once instead of waiting out the test
  const talk0 = Date.now();
  const T = () => mmss((Date.now() - talk0) / 1000);
  const talk: Row[] = [];
  const segW: Record<string, number | null> = {};
  let segStart = Date.now();
  const seg = (what: string, extra: Row = {}) => {
    const wallS = r1((Date.now() - segStart) / 1000);
    talk.push({ tPlus: T(), segment: what, segmentWallS: wallS, ...extra });
    segW[what] = wallS;
    segStart = Date.now();
  };
  const dir = SHOTS || OUTDIR;
  let phones: Page[] = [];
  let modelTab: Page | null = null;
  const stops: Row[] = [];
  const saveTalk = () => {
    mkdirSync(OUTDIR, { recursive: true });
    writeFileSync(join(OUTDIR, `q1-talk-${test.info().project.name}.json`), JSON.stringify({ kit: KIT_SHA, browser: test.info().project.name, startedAt: new Date(talk0).toISOString(), reactS: REACT_S, stopLookS: STOP_LOOK_S, segments: talk, segmentWallS: segW, stops }, null, 2));
  };

  // ---- 0 opening on Home and the Room; the model-page tab prepared before the talk
  const O = new Run(page, browser, 'Q1 0 opening and QR');
  try {
    O.w0 = Date.now();
    await page.goto(`${process.env.SHOWCASE_BASE}/?relay#/`);
    await page.waitForFunction(() => '__pmeApp' in window, null, { timeout: 30_000 });
    await page.waitForTimeout(1500);
    const about = { start: await page.locator('[data-view=home] [data-about]').first().innerText().catch(() => 'no [data-about] on Home'), footer: await page.locator('.app-foot').innerText().catch(() => 'no footer line'), documentationLink: await page.locator('[data-view=home] .home-links a', { hasText: 'Documentation' }).getAttribute('href').catch(() => null) } as Row;
    O.r.measures.about = about;
    // the pre-flight item: a second tab with the first stop's model page, opened before the talk
    modelTab = await page.context().newPage();
    O.r.measures.modelTabPrepared = await modelTab.goto(MODEL_PAGE(STOPS[1].modelPages[0] ?? 'endocrine-thermal'), { timeout: 20_000, waitUntil: 'domcontentloaded' }).then((r) => r?.status() ?? 'no response', (e: Error) => `not loaded: ${e.message.split('\n')[0]}`);
    await page.bringToFront();
    const code = await page.evaluate(() => (window as unknown as Hook).__pmeApp.session.code);
    O.r.setup.sessionCode = code;
    segStart = Date.now();
    await page.locator('[data-view=home]').getByRole('link', { name: 'Start here' }).click().catch(async () => page.evaluate(() => (location.hash = '#/room')));
    const sheet = page.locator('section.room-join');
    await sheet.locator('.phones-url').waitFor({ timeout: 15_000 }).catch(() => undefined);
    const qr: Row = { url: await sheet.locator('.phones-url').innerText().catch(() => null), code: await sheet.locator('.phones-code').innerText().catch(() => null), countBefore: await sheet.locator('.phones-count').innerText().catch(() => null) };
    const wJoin = Date.now();
    await O.joinPhones(code);
    phones = O.phones;
    await page.waitForTimeout(2000);
    qr.joinWallS = r1((Date.now() - wJoin) / 1000);
    qr.countAfter = await sheet.locator('.phones-count').innerText().catch(() => null);
    O.r.measures.qr = qr;
    O.r.measures.phonesAfterJoin = await holds(phones);
    seg('0 opening on Home and the Room, the phones join', { about, qr });
  } finally {
    await O.finish({ keepPhones: true });
  }

  const M = new Run(page, browser, 'Q1 1 malignant hyperthermia with three look-inside stops');
  try {
    // ---- 1 MH to the early signs
    await M.start('Malignant hyperthermia', 8, 'after-alarms', { phones, cardOrder: true });
    await M.untilT(M.t0 + 30);
    await M.press('Premedicate: midazolam 2 mg, fentanyl 100 µg', 'premedicated');
    await M.untilT(M.t0 + 60);
    await M.press('Preoxygenate: 100 % O₂ by face mask', 'preoxygenated');
    await M.untilT(M.t0 + 240);
    const tInd = await M.press('Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg', 'induced');
    await M.untilT(M.t0 + 300);
    await M.press('Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %', 'intubated');
    await M.untilT(M.t0 + 360);
    const tSurg = await M.press('Start surgery: rocuronium 0.6 mg/kg', 'surgery');
    await M.untilT(M.t0 + 450);
    await M.speed(4);
    await M.row('7:30 ×4: watch the CO₂ tile');
    const tEarly = await M.until('earlySigns', 600);
    await M.pauseToggle();
    await M.row('state Early signs: Pause (stop 1)');
    mkdirSync(OUTDIR, { recursive: true });
    await page.locator('.stage').screenshot({ path: join(OUTDIR, `q2-mh-monitor-early-signs-${M.r.browser}.png`) }).catch(() => undefined); // the monitor the release-day runbook looks at
    seg('1 MH to the early signs (×8 then ×4)', { earlySignsAt: tEarly === null ? null : mmss(tEarly) });

    // ---- STOP 1: why the EtCO₂ rises when it should fall
    stops.push(await lookInside(M, page, phones, modelTab, 1, dir));
    await M.tick(/^Name malignant hyperthermia/); // ticked while still paused: the call is named at the early signs
    await M.pauseToggle();
    seg('stop 1 (machine part: Pause, Explore, model tab, back, tick, Resume)');

    // ---- 2 the call, hyperventilation, dantrolene; the EtCO₂ falls; span 1 (the call pressed at once on Resume: the
    // presenter has had the whole stop to react)
    const tC = await M.press(CRISIS, 'triggerOff');
    await M.untilT(tC + 20);
    const tD1 = await M.press('Dantrolene 2.5 mg/kg', 'dantrolene');
    const below40 = await M.waitSim(120, (_n, v) => (v.etco2 ?? 99) < 40);
    await M.row('EtCO₂ below 40');
    await M.ff(5); // span 1, hyperventilation kept
    await M.pauseToggle();
    await M.row('span 1 ended: Pause (stop 2)');
    seg('2 the call, hyperventilation, dantrolene; EtCO₂ falls (span 1)');

    // ---- STOP 2: dantrolene in the model, why we hyperventilate, the potassium's source
    stops.push(await lookInside(M, page, phones, modelTab, 2, dir));
    await M.pauseToggle();
    seg('stop 2 (machine part)');

    // ---- 3 ventilation back, the climb (span 2): pressed at once on Resume
    const stateAtNormo = await stateId(page);
    const tP = await M.press(NORMO, 'normoventilated');
    await M.untilT(tP + 4);
    await M.ff(5); // span 2
    await M.pauseToggle();
    await M.row('span 2 ended: Pause (stop 3), before the second dose');
    seg('3 ventilation back, the climb (span 2)', { stateAtNormo });

    // ---- STOP 3: recrudescence and what the second dose answers; the two sentences on E134
    stops.push(await lookInside(M, page, phones, modelTab, 3, dir));
    await M.pauseToggle();
    seg('stop 3 (machine part)');

    // ---- 4 the second dose with hyperventilation again, span 3, the end; the MH Debrief read on screen
    const tDose2 = await M.press(DOSE2, 'dantroleneAgain');
    await M.ff(5); // span 3
    await M.untilT(tDose2 + 317); // 24:31 on the A4 / OWR4 path (the dose at 19:14)
    await M.pauseToggle();
    await M.row('end of the case: Pause (do not press ventilation back)', { normoOffered: (await page.locator('section[aria-label="Running scenario"]').getByRole('button', { name: NORMO, exact: true }).count()) > 0 });
    await page.screenshot({ path: join(dir, `end-instructor-${M.r.browser}.png`) }).catch(() => undefined);
    M.r.measures.wallLoadToEndS = M.wall();
    const wDb = Date.now();
    await M.debrief({ json: true });
    await M.toDebrief(); // F11: #/teach2 has no session bar; the v2 path is the dock (Finish the case → Debrief)
    await page.locator('[data-view=debrief]').getByRole('heading', { level: 1, name: 'Debrief' }).waitFor({ timeout: 15_000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(dir, `debrief-mh-on-screen-${M.r.browser}.png`) }).catch(() => undefined);
    await page.evaluate((h) => (location.hash = h), M.home());
    await page.waitForTimeout(800);
    M.r.measures.debriefReadWallS = r1((Date.now() - wDb) / 1000);
    seg('4 the end of the case and the MH Debrief, read on screen');

    // the course, for the run sheet (the same keys as A4's a4mh)
    const all = (await hist(page, 0, Infinity)).filter((x) => typeof x.etco2 === 'number') as Array<{ t: number; etco2: number }>;
    const afterNormo = all.filter((x) => x.t >= tP);
    const above45 = afterNormo.find((x) => x.etco2 > 45) ?? null;
    const sinceDose2 = all.filter((x) => x.t >= tDose2);
    const perMin = (from: number, xs: Array<{ t: number; etco2: number }>) => Array.from({ length: Math.floor(((xs.at(-1)?.t ?? from) - from) / 60) + 1 }, (_, m) => xs.find((x) => x.t >= from + m * 60)).map((x, m) => `+${m} ${x ? Math.round(x.etco2) : '–'}`).join(' · ');
    M.r.measures.mhStops = {
      states: await stateLog(page), inducedAt: mmss(tInd), surgeryAt: mmss(tSurg), earlySignsAt: tEarly === null ? null : mmss(tEarly), earlyAfterSuxS: tEarly === null ? null : r1(tEarly - tInd),
      callAt: mmss(tC), callAfterEarlyS: tEarly === null ? null : r1(tC - tEarly), dantroleneAt: mmss(tD1), etco2Below40At: below40 === null ? null : mmss(below40),
      normoAt: mmss(tP), etco2Above45AfterNormoAt: above45 ? mmss(above45.t) : null, dose2At: mmss(tDose2), dose2AfterAbove45S: above45 ? r1(tDose2 - above45.t) : null,
      etco2AtDose2: r1(afterNormo.filter((x) => x.t <= tDose2).at(-1)?.etco2), etco2PerMinuteAfterNormo: perMin(tP, afterNormo.filter((x) => x.t < tDose2)), etco2PerMinuteAfterDose2: perMin(tDose2, sinceDose2),
      stopClocks: stops.map((s) => s.clock),
    };
    seg('end');
  } finally {
    await M.finish();
    if (modelTab) await modelTab.close().catch(() => undefined);
    saveTalk();
  }
});

// Q1 FX-12 probe: after Restart patient, then Return here, the session bar reads "No scenario" (the talk above). Does the
// restored case still run as a case: the card's next button, the state, the session bar, the Debrief?
test('Q1 FX-12 probe: Restart patient, then Return here; does the restored case still take card presses?', async ({ page, browser }) => {
  test.setTimeout(20 * 60_000);
  const R = new Run(page, browser, 'Q1 FX-12 probe restart then return here');
  const bar = () => sessionBarScen(page);
  const allOff = () => page.evaluate(() => (window as unknown as Hook).__pmeApp.link.alarms?.allOff ?? null);
  try {
    await R.start('Malignant hyperthermia', 8, 'after-alarms', { cardOrder: true });
    await R.untilT(R.t0 + 60);
    const fx: Row = { before: { bar: await bar(), state: await stateId(page), clock: mmss(await R.sim()) } };
    await page.click('[role=tab][data-tab=patient]');
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Restart patient', exact: true }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Restart patient', exact: true }).click();
    await page.waitForTimeout(3000);
    fx.afterRestart = { bar: await bar(), state: await stateId(page), clock: mmss(await R.sim()), allOff: await allOff() };
    await R.teachTab('scenario');
    const list = (await page.locator('section[aria-label="Running scenario"] li').filter({ has: page.getByRole('button', { name: 'Return here' }) }).allInnerTexts()).map((x) => x.replace(/\s*Return here\s*$/, '').trim());
    fx.bookmarkList = list;
    const vis = async () => ({ runningSectionVisible: await page.locator('section[aria-label="Running scenario"]').isVisible().catch(() => null), libraryVisible: await page.locator('section[aria-label="Scenario library"]').isVisible().catch(() => null), returnHereVisible: await page.getByRole('button', { name: 'Return here' }).count() });
    fx.panelAfterRestart = await vis();
    const reachable = await page.getByRole('button', { name: 'Return here' }).last().waitFor({ timeout: 15_000 }).then(() => true, () => false);
    fx.returnHereReachable = reachable;
    if (!reachable) {
      fx.panelAfter15s = await vis();
      R.r.measures.fx12probe = fx;
      await R.debrief();
      return;
    }
    await page.getByRole('button', { name: 'Return here' }).last().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Return' }).click();
    await page.waitForTimeout(3000);
    await record(page);
    fx.panelAfterReturn = await vis();
    fx.afterReturn = { bar: await bar(), state: await stateId(page), clock: mmss(await R.sim()), allOff: await allOff(), speed: await R.speedNow(), cardButtons: await page.locator('section[aria-label="Running scenario"] button').allInnerTexts() };
    // the card's next press, at 4:00 as card 4 does
    await R.untilT(240);
    const btn = page.locator('section[aria-label="Running scenario"]').getByRole('button', { name: 'Start surgery: rocuronium 0.6 mg/kg', exact: true });
    fx.surgeryButtonShown = (await btn.count()) > 0;
    if (fx.surgeryButtonShown) {
      await btn.click();
      await page.waitForTimeout(1500);
    }
    fx.afterPress = { bar: await bar(), state: await stateId(page), clock: mmss(await R.sim()), toasts: (await page.locator('.toasts').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(-200) };
    await R.untilT(300);
    fx.at5min = { bar: await bar(), state: await stateId(page) };
    await R.debrief();
    fx.debrief = { scenario: R.r.debrief?.facts, objectives: (R.r.debrief?.objectives as Array<{ status: string; text: string }> | undefined)?.map((o) => `${o.status}: ${o.text.slice(-120)}`), timelineRows: R.r.debrief?.timelineRows };
    fx.debriefScenarioLine = await (async () => {
      await page.locator('.sessionbar').getByRole('link', { name: 'Debrief' }).click();
      await page.waitForTimeout(1200);
      const t = await page.locator('[data-view=debrief]').innerText();
      await page.evaluate(() => (location.hash = '#/teach'));
      return (/Scenario\s*\n?\s*([^\n]+)/.exec(t)?.[1] ?? '').trim();
    })();
    R.r.measures.fx12probe = fx;
  } finally {
    await R.finish();
  }
});

// ------------------------------------------------------------------------------- kit round A4 (24 Oct): the live-demo cards

/** The Debrief moment of an A4 path: read it (with the JSON export, the Persian handout's input), then Run by + Notes, the
 *  report printed (Chromium: PDF and its page count; WebKit: print-media screenshot) and the learner handout (E51). */
async function a4Debrief(R: Run, page: Page, key: string): Promise<void> {
  await R.debrief({ json: true });
  await R.debriefLink().click();
  const view = page.locator('[data-view=debrief]');
  await view.getByRole('heading', { level: 1, name: 'Debrief' }).waitFor({ timeout: 15_000 });
  await view.getByRole('textbox', { name: 'Run by' }).fill('Live demo, 3 November');
  await view.getByRole('textbox', { name: 'Notes' }).fill('Kit round A4 rehearsal of the live-demo path.').catch(() => undefined);
  await page.emulateMedia({ media: 'print' });
  mkdirSync(OUTDIR, { recursive: true });
  await page.screenshot({ path: join(OUTDIR, `a4-${key}-debrief-print-${R.r.browser}.png`), fullPage: true }).catch(() => undefined);
  if (R.r.browser === 'chromium') {
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
    writeFileSync(join(OUTDIR, `a4-${key}-debrief-chromium.pdf`), pdf);
    const info = pdfInfo(pdf);
    R.r.measures.pdf = { pages: info.boxes.length, a4: info.boxes.every((b) => Math.round(b[2] ?? 0) === 595 && Math.round(b[3] ?? 0) === 842), title: info.title };
  } else R.r.measures.pdf = 'WebKit: Playwright has no page.pdf(); print-media screenshot only';
  await page.evaluate(() => document.querySelector('.debrief')?.setAttribute('data-print', 'handout'));
  await page.screenshot({ path: join(OUTDIR, `a4-${key}-handout-print-${R.r.browser}.png`), fullPage: true }).catch(() => undefined);
  if (R.r.browser === 'chromium') {
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
    writeFileSync(join(OUTDIR, `a4-${key}-handout-chromium.pdf`), pdf);
    R.r.measures.handoutPdf = { pages: pdfInfo(pdf).boxes.length };
  }
  await page.evaluate(() => document.querySelector('.debrief')?.removeAttribute('data-print'));
  await page.emulateMedia({ media: 'screen' });
  await page.evaluate((h) => (location.hash = h), R.home());
  await page.waitForTimeout(800);
}

/** Every state entry of the run, with its sim time, from the page's own state log (R.start records it every 100 ms). */
const stateLog = (page: Page) => page.evaluate(() => ((window as unknown as Hook).__st ?? []).map((x) => ({ t: Math.round(x.t * 10) / 10, id: x.id })));

test('A4 MH (E119): the induction sequence, early call, three 5-min fast-forwards, Debrief printed', async ({ page, browser }) => {
  const R = new Run(page, browser, 'A4 MH E119 induction sequence and early call (kit round)');
  try {
    // cue card: Load · All alarms on · Bookmark · ×8
    await R.start('Malignant hyperthermia', 8, 'after-alarms');
    await R.untilT(R.t0 + 30);
    await R.press('Premedicate: midazolam 2 mg, fentanyl 100 µg', 'premedicated');
    await R.untilT(R.t0 + 60);
    await R.press('Preoxygenate: 100 % O₂ by face mask', 'preoxygenated');
    await R.untilT(R.t0 + 240);
    const tInd = await R.press('Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg', 'induced');
    await R.untilT(R.t0 + 300);
    const tInt = await R.press('Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %', 'intubated');
    await R.untilT(R.t0 + 360);
    await R.press('Start surgery: rocuronium 0.6 mg/kg', 'surgery');
    await R.untilT(R.t0 + 450);
    await R.speed(4);
    await R.row('7:30 ×4: watch the CO₂ tile');
    const tEarly = await R.until('earlySigns', 300);
    await R.row('state Early signs');
    await R.tick(/^Name malignant hyperthermia/);
    const tCall = await R.press(CRISIS, 'triggerOff');
    await R.untilT(tCall + 20);
    await R.press('Dantrolene 2.5 mg/kg', 'dantrolene');
    // E132: no cooling on the early-call path (the cue card: only above 38.5 °C)
    const below40 = await R.waitSim(120, (_n, v) => (v.etco2 ?? 99) < 40);
    await R.row('EtCO₂ below 40');
    await R.ff(5);
    // E22: ventilation back once EtCO2 has stayed below 40 for 2 min, in Recovering (the button is offered only there)
    const tNormo = (await stateId(page)) === 'recovering' ? await R.press('EtCO₂ normal: ventilation back to 12 × 500', 'normoventilated') : null;
    if (tNormo === null) R.r.notes.push(`after span 1 the state was ${await stateId(page)}: ventilation back NOT pressed`);
    await R.ff(5);
    // E132 (clinical review finding 1): the EtCO₂ climbing back at normal ventilation is MH not controlled: second dose
    await R.row('after span 2: the EtCO₂ climbing back at normal ventilation');
    if (SHOTS) await R.cardButton(DOSE2).scrollIntoViewIfNeeded().catch(() => undefined); // the new button in the shot
    await shot(R, page, 'owr4-1-before-second-dose');
    // owner rc.4 (2026-10-28): the second dose re-applies the crisis ventilation, 20 × 600 at 100 % O₂
    const tDose2 = await R.press(DOSE2, 'dantroleneAgain');
    await shot(R, page, 'owr4-2-second-dose-pressed');
    await R.ff(5);
    // ventilation back again only once EtCO₂ has stayed below 40 for 2 min since the second dose, in Recovering
    const sinceDose2 = (await hist(page, tDose2, Infinity)).filter((x) => typeof x.etco2 === 'number') as Array<{ t: number; etco2: number }>;
    let run2: number | null = null;
    let held2: number | null = null;
    for (const x of sinceDose2) {
      run2 = x.etco2 < 40 ? (run2 ?? x.t) : null;
      if (held2 === null && run2 !== null && x.t - run2 >= 120) held2 = x.t;
    }
    const tNormo2 = held2 !== null && (await stateId(page)) === 'recovering' ? await R.press('EtCO₂ normal: ventilation back to 12 × 500', 'normoventilated') : null;
    if (tNormo2 === null) R.r.notes.push(`after span 3 (${mmss(await R.sim())}) the state was ${await stateId(page)} and EtCO₂ had ${held2 === null ? 'not yet' : 'already'} stayed below 40 for 2 min since the second dose: ventilation back again ${held2 === null ? 'NOT pressed (its rule not met)' : 'not offered'}`);
    await shot(R, page, 'owr4-3-end-of-case');
    await R.pauseToggle();
    await R.row('end: paused');
    const h = await hist(page, tInd, tInt + 60);
    const afterNormo = tNormo === null ? [] : ((await hist(page, tNormo, Infinity)).filter((x) => typeof x.etco2 === 'number') as Array<{ t: number; etco2: number }>);
    const above45 = afterNormo.find((x) => x.etco2 > 45) ?? null;
    const peak = afterNormo.reduce<{ t: number; etco2: number } | null>((b, x) => (!b || x.etco2 > b.etco2 ? x : b), null);
    const perMin = tNormo === null ? [] : Array.from({ length: Math.floor(((afterNormo.at(-1)?.t ?? tNormo) - tNormo) / 60) + 1 }, (_, m) => afterNormo.find((x) => x.t >= (tNormo as number) + m * 60)).map((x, m) => `+${m} ${x ? Math.round(x.etco2) : '–'}`);
    R.r.measures.a4mh = {
      states: await stateLog(page), inducedAt: mmss(tInd), intubatedAt: mmss(tInt), earlySignsAt: tEarly === null ? null : mmss(tEarly),
      earlyAfterSuxS: tEarly === null ? null : r1(tEarly - tInd), callAt: mmss(tCall), callAfterEarlyS: tEarly === null ? null : r1(tCall - tEarly),
      etco2Below40At: below40 === null ? null : mmss(below40), normoAt: tNormo === null ? null : mmss(tNormo), spo2MinInductionToTube: r1(minOf(h, 'spo2')),
      etco2Above45AfterNormoAt: above45 === null ? null : mmss(above45.t), dose2At: mmss(tDose2), dose2AfterAbove45S: above45 === null ? null : r1(tDose2 - above45.t),
      etco2AtDose2: r1(afterNormo.filter((x) => x.t <= tDose2).at(-1)?.etco2), etco2PeakAfterNormo: peak ? `${r1(peak.etco2)} at ${mmss(peak.t)}` : null, etco2PerMinuteAfterNormo: perMin.join(' · '),
      // owner rc.4: after the second dose (the crisis ventilation again)
      etco2Below40AfterDose2At: ((b) => (b ? `${mmss(b.t)} (+${r1(b.t - tDose2)} s)` : null))(sinceDose2.find((x) => x.etco2 < 40)),
      held2At: held2 === null ? null : mmss(held2), normo2At: tNormo2 === null ? null : mmss(tNormo2),
      etco2PerMinuteAfterDose2: Array.from({ length: Math.floor(((sinceDose2.at(-1)?.t ?? tDose2) - tDose2) / 60) + 1 }, (_, m) => sinceDose2.find((x) => x.t >= tDose2 + m * 60)).map((x, m) => `+${m} ${x ? Math.round(x.etco2) : '–'}`).join(' · '),
      awrrEnd: (await latest(page)).awrr ?? null,
    };
    await R.pauseToggle();
    await a4Debrief(R, page, 'mh');
  } finally {
    await R.finish();
  }
});

// ------------------------------------------------------- the /2 rounds (1 November): the MH card in pme-scenario/2
// The same two rounds on the new-format MH card ("Malignant hyperthermia (phases)", showcase-mh-v2), for a kit carrying
// both cards. Run with PME_PANEL=teach2 (Instructor v2 is the /2 card's panel). What differs from the /1 rounds above,
// and only that: the card is chosen by its exact title (the /1 title is a part of it); a press waits for no state and is
// never pressed twice (a /2 press does not change the phase; the row's look after it is recorded instead); the waits
// are on /2 PHASES, never on clock times, because the phase times move with the card's rules: the first pause is the
// first Early signs (≈ 08:43 on PR #239's rules, not the /1 08:09), "ventilation back" waits for Recovering, the second
// dose and the third stop for Recrudescence to have been entered since ventilation back, and the end for the second
// Recovering (and no sooner than the /1 end, the dose + 317 s); the Debrief's action table is read beside its judged
// rows. The same measures in the same JSON/MD shape (a4mh, mhStops) as the /1 rounds, plus the phase history. The test
// names do not contain "A4 MH" or "Q1 30-minute talk", so the /1 rounds' -g patterns select the /1 rounds only.
const MH2 = 'Malignant hyperthermia (phases)';

test('A4 /2 MH (phases card): the induction sequence, early call, three 5-min fast-forwards, Debrief printed', async ({ page, browser }) => {
  test.skip(PANEL !== 'teach2', 'the /2 card runs on Instructor v2: PME_PANEL=teach2');
  page.setDefaultTimeout(60_000); // a press that cannot land fails the run instead of waiting out the test
  const R = new Run(page, browser, 'A4 MH phases card induction sequence and early call (kit round)');
  try {
    await R.start(MH2, 8, 'after-alarms', { card: 2 });
    await R.untilT(R.t0 + 30);
    await R.press('Premedicate: midazolam 2 mg, fentanyl 100 µg');
    await R.untilT(R.t0 + 60);
    await R.press('Preoxygenate: 100 % O₂ by face mask');
    await R.untilT(R.t0 + 240);
    const tInd = await R.press('Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg');
    await R.untilT(R.t0 + 300);
    const tInt = await R.press('Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %');
    await R.untilT(R.t0 + 360);
    await R.press('Start surgery: rocuronium 0.6 mg/kg');
    await R.untilT(R.t0 + 450);
    await R.speed(4);
    await R.row('7:30 ×4: watch the CO₂ tile');
    const tEarly = await R.until('earlySigns', 300);
    await R.row('state Early signs');
    await R.tick(/^Name malignant hyperthermia/);
    const tCall = await R.press(CRISIS);
    await R.untilT(tCall + 20);
    await R.press('Dantrolene 2.5 mg/kg');
    const below40 = await R.waitSim(120, (_n, v) => (v.etco2 ?? 99) < 40);
    await R.row('EtCO₂ below 40');
    await R.ff(5);
    // ventilation back in Recovering (the phase waited for, ≤ 2 min of sim)
    const tRec = await R.until('recovering', 120);
    const tNormo = tRec !== null ? await R.press(NORMO) : null;
    if (tNormo === null) R.r.notes.push(`after span 1 and 2 min the phase was ${await stateId(page)}: ventilation back NOT pressed`);
    await R.ff(5);
    // the second dose once Recrudescence has been entered since ventilation back (≤ 5 min of sim)
    const tRecrud = tNormo === null ? null : await R.untilEntered('recrudescence', tNormo, 300);
    if (tRecrud === null) R.r.notes.push(`no Recrudescence since ventilation back by ${mmss(await R.sim())} (phase ${await stateId(page)}): the second dose pressed at the wait's end`);
    await R.row('after span 2: the EtCO₂ climbing back at normal ventilation', { recrudescenceAt: tRecrud === null ? null : mmss(tRecrud) });
    if (SHOTS) await R.cardButton(DOSE2).scrollIntoViewIfNeeded().catch(() => undefined);
    await shot(R, page, 'owr4-1-before-second-dose');
    const tDose2 = await R.press(DOSE2);
    await shot(R, page, 'owr4-2-second-dose-pressed');
    await R.ff(5);
    const sinceDose2 = (await hist(page, tDose2, Infinity)).filter((x) => typeof x.etco2 === 'number') as Array<{ t: number; etco2: number }>;
    let run2: number | null = null;
    let held2: number | null = null;
    for (const x of sinceDose2) {
      run2 = x.etco2 < 40 ? (run2 ?? x.t) : null;
      if (held2 === null && run2 !== null && x.t - run2 >= 120) held2 = x.t;
    }
    const tNormo2 = held2 !== null && (await stateId(page)) === 'recovering' ? await R.press(NORMO) : null;
    if (tNormo2 === null) R.r.notes.push(`after span 3 (${mmss(await R.sim())}) the phase was ${await stateId(page)} and EtCO₂ had ${held2 === null ? 'not yet' : 'already'} stayed below 40 for 2 min since the second dose: ventilation back again ${held2 === null ? 'NOT pressed (its rule not met)' : 'not pressed (not Recovering)'}`);
    await shot(R, page, 'owr4-3-end-of-case');
    await R.pauseToggle();
    await R.row('end: paused');
    const h = await hist(page, tInd, tInt + 60);
    const afterNormo = tNormo === null ? [] : ((await hist(page, tNormo, Infinity)).filter((x) => typeof x.etco2 === 'number') as Array<{ t: number; etco2: number }>);
    const above45 = afterNormo.find((x) => x.etco2 > 45) ?? null;
    const peak = afterNormo.reduce<{ t: number; etco2: number } | null>((b, x) => (!b || x.etco2 > b.etco2 ? x : b), null);
    const perMin = tNormo === null ? [] : Array.from({ length: Math.floor(((afterNormo.at(-1)?.t ?? tNormo) - tNormo) / 60) + 1 }, (_, m) => afterNormo.find((x) => x.t >= (tNormo as number) + m * 60)).map((x, m) => `+${m} ${x ? Math.round(x.etco2) : '–'}`);
    R.r.measures.a4mh = {
      states: await stateLog(page), inducedAt: mmss(tInd), intubatedAt: mmss(tInt), earlySignsAt: tEarly === null ? null : mmss(tEarly),
      earlyAfterSuxS: tEarly === null ? null : r1(tEarly - tInd), callAt: mmss(tCall), callAfterEarlyS: tEarly === null ? null : r1(tCall - tEarly),
      etco2Below40At: below40 === null ? null : mmss(below40), normoAt: tNormo === null ? null : mmss(tNormo), spo2MinInductionToTube: r1(minOf(h, 'spo2')),
      etco2Above45AfterNormoAt: above45 === null ? null : mmss(above45.t), dose2At: mmss(tDose2), dose2AfterAbove45S: above45 === null ? null : r1(tDose2 - above45.t),
      etco2AtDose2: r1(afterNormo.filter((x) => x.t <= tDose2).at(-1)?.etco2), etco2PeakAfterNormo: peak ? `${r1(peak.etco2)} at ${mmss(peak.t)}` : null, etco2PerMinuteAfterNormo: perMin.join(' · '),
      etco2Below40AfterDose2At: ((b) => (b ? `${mmss(b.t)} (+${r1(b.t - tDose2)} s)` : null))(sinceDose2.find((x) => x.etco2 < 40)),
      held2At: held2 === null ? null : mmss(held2), normo2At: tNormo2 === null ? null : mmss(tNormo2),
      etco2PerMinuteAfterDose2: Array.from({ length: Math.floor(((sinceDose2.at(-1)?.t ?? tDose2) - tDose2) / 60) + 1 }, (_, m) => sinceDose2.find((x) => x.t >= tDose2 + m * 60)).map((x, m) => `+${m} ${x ? Math.round(x.etco2) : '–'}`).join(' · '),
      awrrEnd: (await latest(page)).awrr ?? null,
      // the /2 card: the runner's phase history, the phase waits
      phases: await R.phases(), recoveringSeenAt: tRec === null ? null : mmss(tRec), recrudescenceAt: tRecrud === null ? null : mmss(tRecrud),
    };
    await R.pauseToggle();
    await a4Debrief(R, page, 'mh');
  } finally {
    await R.finish();
  }
});

test('Q1 /2 30-minute talk on the phases card: opening, MH (pme-scenario/2) with three look-inside stops on the Explore view, the MH Debrief read', async ({ page, browser }) => {
  test.skip(PANEL !== 'teach2', 'the /2 card runs on Instructor v2: PME_PANEL=teach2');
  test.setTimeout(60 * 60_000);
  page.setDefaultTimeout(30_000);
  const talk0 = Date.now();
  const T = () => mmss((Date.now() - talk0) / 1000);
  const talk: Row[] = [];
  const segW: Record<string, number | null> = {};
  let segStart = Date.now();
  const seg = (what: string, extra: Row = {}) => {
    const wallS = r1((Date.now() - segStart) / 1000);
    talk.push({ tPlus: T(), segment: what, segmentWallS: wallS, ...extra });
    segW[what] = wallS;
    segStart = Date.now();
  };
  const dir = SHOTS || OUTDIR;
  let phones: Page[] = [];
  let modelTab: Page | null = null;
  const stops: Row[] = [];
  const saveTalk = () => {
    mkdirSync(OUTDIR, { recursive: true });
    writeFileSync(join(OUTDIR, `q1-talk-${test.info().project.name}.json`), JSON.stringify({ kit: KIT_SHA, browser: test.info().project.name, card: 'pme-scenario/2', startedAt: new Date(talk0).toISOString(), reactS: REACT_S, stopLookS: STOP_LOOK_S, segments: talk, segmentWallS: segW, stops }, null, 2));
  };

  // ---- 0 opening on Home and the Room (as the /1 talk)
  const O = new Run(page, browser, 'Q1 0 opening and QR');
  try {
    O.w0 = Date.now();
    await page.goto(`${process.env.SHOWCASE_BASE}/?relay#/`);
    await page.waitForFunction(() => '__pmeApp' in window, null, { timeout: 30_000 });
    await page.waitForTimeout(1500);
    const about = { start: await page.locator('[data-view=home] [data-about]').first().innerText().catch(() => 'no [data-about] on Home'), footer: await page.locator('.app-foot').innerText().catch(() => 'no footer line'), documentationLink: await page.locator('[data-view=home] .home-links a', { hasText: 'Documentation' }).getAttribute('href').catch(() => null) } as Row;
    O.r.measures.about = about;
    // the pre-flight item: a second tab with the first stop's model page, opened before the talk
    modelTab = await page.context().newPage();
    O.r.measures.modelTabPrepared = await modelTab.goto(MODEL_PAGE(STOPS[1].modelPages[0] ?? 'endocrine-thermal'), { timeout: 20_000, waitUntil: 'domcontentloaded' }).then((r) => r?.status() ?? 'no response', (e: Error) => `not loaded: ${e.message.split('\n')[0]}`);
    await page.bringToFront();
    const code = await page.evaluate(() => (window as unknown as Hook).__pmeApp.session.code);
    O.r.setup.sessionCode = code;
    segStart = Date.now();
    await page.locator('[data-view=home]').getByRole('link', { name: 'Start here' }).click().catch(async () => page.evaluate(() => (location.hash = '#/room')));
    const sheet = page.locator('section.room-join');
    await sheet.locator('.phones-url').waitFor({ timeout: 15_000 }).catch(() => undefined);
    const qr: Row = { url: await sheet.locator('.phones-url').innerText().catch(() => null), code: await sheet.locator('.phones-code').innerText().catch(() => null), countBefore: await sheet.locator('.phones-count').innerText().catch(() => null) };
    const wJoin = Date.now();
    await O.joinPhones(code);
    phones = O.phones;
    await page.waitForTimeout(2000);
    qr.joinWallS = r1((Date.now() - wJoin) / 1000);
    qr.countAfter = await sheet.locator('.phones-count').innerText().catch(() => null);
    O.r.measures.qr = qr;
    O.r.measures.phonesAfterJoin = await holds(phones);
    seg('0 opening on Home and the Room, the phones join', { about, qr });
  } finally {
    await O.finish({ keepPhones: true });
  }

  const M = new Run(page, browser, 'Q1 1 malignant hyperthermia phases card with three look-inside stops');
  try {
    // ---- 1 MH to the early signs: the first pause is the first Early signs reading (a phase, not 08:05)
    await M.start(MH2, 8, 'after-alarms', { phones, cardOrder: true, card: 2 });
    await M.untilT(M.t0 + 30);
    await M.press('Premedicate: midazolam 2 mg, fentanyl 100 µg');
    await M.untilT(M.t0 + 60);
    await M.press('Preoxygenate: 100 % O₂ by face mask');
    await M.untilT(M.t0 + 240);
    const tInd = await M.press('Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg');
    await M.untilT(M.t0 + 300);
    await M.press('Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %');
    await M.untilT(M.t0 + 360);
    const tSurg = await M.press('Start surgery: rocuronium 0.6 mg/kg');
    await M.untilT(M.t0 + 450);
    await M.speed(4);
    await M.row('7:30 ×4: watch the CO₂ tile');
    const tEarly = await M.until('earlySigns', 600);
    await M.pauseToggle();
    await M.row('state Early signs: Pause (stop 1)');
    mkdirSync(OUTDIR, { recursive: true });
    await page.locator('.stage').screenshot({ path: join(OUTDIR, `q2-mh-monitor-early-signs-${M.r.browser}.png`) }).catch(() => undefined);
    seg('1 MH to the early signs (×8 then ×4)', { earlySignsAt: tEarly === null ? null : mmss(tEarly) });

    // ---- STOP 1
    stops.push(await lookInside(M, page, phones, modelTab, 1, dir));
    await M.tick(/^Name malignant hyperthermia/);
    await M.pauseToggle();
    seg('stop 1 (machine part: Pause, Explore, model tab, back, tick, Resume)');

    // ---- 2 the call, dantrolene; span 1; stop 2 once the phase is Recovering (≤ 3 min of sim after the span)
    const tC = await M.press(CRISIS);
    await M.untilT(tC + 20);
    const tD1 = await M.press('Dantrolene 2.5 mg/kg');
    const below40 = await M.waitSim(120, (_n, v) => (v.etco2 ?? 99) < 40);
    await M.row('EtCO₂ below 40');
    await M.ff(5);
    const tRec = await M.until('recovering', 180);
    if (tRec === null) M.r.notes.push(`stop 2: the phase was ${await stateId(page)} 3 min after span 1, not Recovering`);
    await M.pauseToggle();
    await M.row('span 1 ended: Pause (stop 2)');
    seg('2 the call, hyperventilation, dantrolene; EtCO₂ falls (span 1)', { recoveringSeenAt: tRec === null ? null : mmss(tRec) });

    // ---- STOP 2
    stops.push(await lookInside(M, page, phones, modelTab, 2, dir));
    await M.pauseToggle();
    seg('stop 2 (machine part)');

    // ---- 3 ventilation back, the climb (span 2); stop 3 once Recrudescence has been entered since (≤ 5 min of sim)
    const stateAtNormo = await stateId(page);
    const tP = await M.press(NORMO);
    await M.untilT(tP + 4);
    await M.ff(5);
    const tRecrud = await M.untilEntered('recrudescence', tP, 300);
    if (tRecrud === null) M.r.notes.push(`stop 3: no Recrudescence since ventilation back by ${mmss(await M.sim())} (phase ${await stateId(page)})`);
    await M.pauseToggle();
    await M.row('span 2 ended: Pause (stop 3), before the second dose', { recrudescenceAt: tRecrud === null ? null : mmss(tRecrud) });
    seg('3 ventilation back, the climb (span 2)', { stateAtNormo });

    // ---- STOP 3
    stops.push(await lookInside(M, page, phones, modelTab, 3, dir));
    await M.pauseToggle();
    seg('stop 3 (machine part)');

    // ---- 4 the second dose, span 3, the end at the second Recovering (≤ 10 min of sim) and no sooner than the /1
    // round's end (the dose + 317 s); the MH Debrief read on screen
    const tDose2 = await M.press(DOSE2);
    await M.ff(5);
    const tRec2 = await M.untilEntered('recovering', tDose2, 600);
    if (tRec2 === null) M.r.notes.push(`end: no second Recovering within 10 min of the second dose (phase ${await stateId(page)})`);
    await M.untilT(tDose2 + 317);
    await M.pauseToggle();
    await M.row('end of the case: Pause (do not press ventilation back)', { secondRecoveringAt: tRec2 === null ? null : mmss(tRec2), normoOffered: (await M.cardButton(NORMO).count()) > 0 });
    await page.screenshot({ path: join(dir, `end-instructor-${M.r.browser}.png`) }).catch(() => undefined);
    M.r.measures.wallLoadToEndS = M.wall();
    const wDb = Date.now();
    await M.debrief({ json: true });
    await M.toDebrief();
    await page.locator('[data-view=debrief]').getByRole('heading', { level: 1, name: 'Debrief' }).waitFor({ timeout: 15_000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(dir, `debrief-mh-on-screen-${M.r.browser}.png`) }).catch(() => undefined);
    await page.evaluate((h) => (location.hash = h), M.home());
    await page.waitForTimeout(800);
    M.r.measures.debriefReadWallS = r1((Date.now() - wDb) / 1000);
    seg('4 the end of the case and the MH Debrief, read on screen');

    const all = (await hist(page, 0, Infinity)).filter((x) => typeof x.etco2 === 'number') as Array<{ t: number; etco2: number }>;
    const afterNormo = all.filter((x) => x.t >= tP);
    const above45 = afterNormo.find((x) => x.etco2 > 45) ?? null;
    const sinceDose2 = all.filter((x) => x.t >= tDose2);
    const perMin = (from: number, xs: Array<{ t: number; etco2: number }>) => Array.from({ length: Math.floor(((xs.at(-1)?.t ?? from) - from) / 60) + 1 }, (_, m) => xs.find((x) => x.t >= from + m * 60)).map((x, m) => `+${m} ${x ? Math.round(x.etco2) : '–'}`).join(' · ');
    M.r.measures.mhStops = {
      states: await stateLog(page), inducedAt: mmss(tInd), surgeryAt: mmss(tSurg), earlySignsAt: tEarly === null ? null : mmss(tEarly), earlyAfterSuxS: tEarly === null ? null : r1(tEarly - tInd),
      callAt: mmss(tC), callAfterEarlyS: tEarly === null ? null : r1(tC - tEarly), dantroleneAt: mmss(tD1), etco2Below40At: below40 === null ? null : mmss(below40),
      normoAt: mmss(tP), etco2Above45AfterNormoAt: above45 ? mmss(above45.t) : null, dose2At: mmss(tDose2), dose2AfterAbove45S: above45 ? r1(tDose2 - above45.t) : null,
      etco2AtDose2: r1(afterNormo.filter((x) => x.t <= tDose2).at(-1)?.etco2), etco2PerMinuteAfterNormo: perMin(tP, afterNormo.filter((x) => x.t < tDose2)), etco2PerMinuteAfterDose2: perMin(tDose2, sinceDose2),
      stopClocks: stops.map((s) => s.clock),
      phases: await M.phases(), recoveringSeenAt: tRec === null ? null : mmss(tRec), recrudescenceAt: tRecrud === null ? null : mmss(tRecrud), secondRecoveringAt: tRec2 === null ? null : mmss(tRec2),
    };
    seg('end');
  } finally {
    await M.finish();
    if (modelTab) await modelTab.close().catch(() => undefined);
    saveTalk();
  }
});

/** The engine's rhythm changes, from the session's own events (installed after Load). */
const logRhythms = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { __rh?: Array<{ t: number; id: string }>; __pmeApp: { session: { onEvent(fn: (e: { type: string; t: number; rhythm?: { id: string } }) => void): () => void } } };
  w.__rh = [];
  w.__pmeApp.session.onEvent((e) => {
    if (e.type === 'state' && e.rhythm && w.__rh!.at(-1)?.id !== e.rhythm.id) w.__rh!.push({ t: e.t, id: e.rhythm.id });
  });
});
const rhythmLog = (page: Page) => page.evaluate(() => (window as unknown as { __rh?: Array<{ t: number; id: string }> }).__rh ?? []);

/** The model's defibrillator, as the Defib tab mirrors it. */
const defibNow = (page: Page) => page.evaluate(() => (window as unknown as { __pmeApp: { link: { device?: { defib?: { state: string; shocks: number; lastShock: { t: number; outcome: string } | null } | null } } } }).__pmeApp.link.device?.defib ?? null);

/** KITROUND_SHOTS only (E126): the page at 1280×800 with the session paused, then back to the run's size and speed. */
async function shot(R: Run, page: Page, name: string): Promise<void> {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  const size = page.viewportSize();
  await R.pauseToggle();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(SHOTS, `${name}-${R.r.browser}.png`) });
  if (size) await page.setViewportSize(size);
  await page.waitForTimeout(600);
  await R.pauseToggle();
  R.r.notes.push(`shot ${name} at ${mmss(await R.sim())}`);
}

/** Defib tab: Charge (200 J, the default), Shock once ready; back to the Scenario tab. Returns the shock's sim time and
 *  outcome. `checkT` (KITROUND_SHOTS): the pulse check's sim time — the shot of the check is taken 6 s into it. */
async function chargeAndShock(R: Run, page: Page, checkT?: number, shotName?: string): Promise<{ t: number; outcome: string | null }> {
  await R.teachTab('defib');
  const shocks0 = (await defibNow(page))?.shocks ?? 0;
  await page.getByRole('button', { name: 'Charge', exact: true }).click();
  await R.waitSim(30, async () => (await defibNow(page))?.state === 'ready');
  if (SHOTS && checkT !== undefined && shotName) {
    await R.waitSim(10, (now) => now >= checkT + 6);
    await shot(R, page, shotName);
  }
  await page.getByRole('button', { name: 'Shock', exact: true }).click();
  await R.waitSim(10, async () => ((await defibNow(page))?.shocks ?? 0) > shocks0);
  const d = await defibNow(page);
  await R.row(`Defib tab: Shock 200 J → ${d?.lastShock?.outcome ?? '?'}`);
  await R.teachTab('scenario');
  return { t: d?.lastShock?.t ?? (await R.sim()), outcome: d?.lastShock?.outcome ?? null };
}

test('A4 haemorrhage (E120): PEA on a junctional rhythm → asystole → CPR, volume → VF → two shocks → ROSC, Debrief printed', async ({ page, browser }) => {
  const R = new Run(page, browser, 'A4 haemorrhage E120 course (kit round)');
  try {
    await R.start('Class IV haemorrhage, PEA and resuscitation', 8, 'after-alarms');
    await logRhythms(page);
    await R.untilT(R.t0 + 30);
    await R.press('Oxygen by face mask, FiO₂ 1.0', 'bleedingO2');
    await R.untilT(R.t0 + 60);
    await R.press('Intubate and ventilate, FiO₂ 1.0', 'ventilated');
    await R.untilT(R.t0 + 240);
    await R.row('4:00');
    await R.untilT(R.t0 + 480);
    await R.row('8:00');
    const tJ = await R.until('junctional', 300);
    await R.row('the card sets the junctional rhythm');
    await R.speed(4);
    const tPea = await R.until('pea', 240);
    await R.row('state PEA');
    const tLoss = await R.waitSim(120, async () => (await modelPulse(page)) === false);
    await R.row('the model\'s pulse loss');
    if (SHOTS && tLoss !== null) {
      await R.waitSim(30, (now) => now >= tLoss + 15);
      await shot(R, page, 'e126-1-pea-pulseless');
    }
    await R.speed(8);
    const tAsy = await R.until('asystole', 600);
    const tAgonal = (await rhythmLog(page)).find((x) => x.id === 'agonal')?.t ?? null;
    await R.speed(1);
    await R.row('state Asystole');
    await shot(R, page, 'e126-2-asystole');
    await R.react();
    const tCpr = await R.press('Start CPR: compressions, bag via the tube 10/min, FiO₂ 1.0', 'cpr');
    await R.press(HAEM_VOLUME, 'cprVolume');
    await R.untilT(tCpr + 20);
    await R.press('Epinephrine 1 mg', 'cprEpi');
    await R.speed(4);
    await R.untilT(tCpr + 60);
    await R.row('1 min into CPR');
    await shot(R, page, 'e126-3-cpr-running');
    await R.untilT(tCpr + 118);
    await R.speed(1);
    const tPc1 = await R.press('Rhythm check', 'vf');
    const s1 = await chargeAndShock(R, page, tPc1, 'e126-4-pulse-check-vf');
    await R.speed(4);
    await R.untilT(s1.t + 60);
    await R.row('1 min after the first shock');
    await shot(R, page, 'e126-5-post-shock-cpr');
    await R.untilT(s1.t + 70);
    const tEpi2 = await R.press('Epinephrine 1 mg', 'postShock1Epi'); // E132: the second dose, 3–5 min after the first
    await R.untilT(s1.t + 118);
    await R.speed(1);
    const tPc2 = await R.press('Rhythm check', 'vf2');
    const s2 = await chargeAndShock(R, page);
    await R.speed(4);
    const tBack = await R.waitSim(112, async () => (await modelPulse(page)) === true);
    await R.row('return of circulation (the model)');
    await R.untilT(s2.t + 118);
    await R.speed(1);
    await R.row('2 min after the second shock: rhythm check');
    await R.react();
    const tStop = await R.press(HAEM_STOP, 'rosc'); // E132: the return of circulation recognised at the 2-min rhythm check
    await R.speed(4);
    await R.untilT(tStop + 60);
    await R.row('1 min after stopping CPR');
    await shot(R, page, 'e126-6-rosc');
    const hc = await hist(page, tCpr, tPc1);
    R.r.measures.a4haemorrhage = {
      states: await stateLog(page), junctionalAt: tJ === null ? null : mmss(tJ), peaStateAt: tPea === null ? null : mmss(tPea), pulseLossAt: tLoss === null ? null : mmss(tLoss),
      idioventricularAt: tAgonal === null ? null : mmss(tAgonal), asystoleAt: tAsy === null ? null : mmss(tAsy), asystoleAfterLossS: tAsy === null || tLoss === null ? null : r1(tAsy - tLoss),
      cprAt: mmss(tCpr), rhythmCheck1At: mmss(tPc1), shock1At: mmss(s1.t), shock1: s1.outcome, epinephrine2At: mmss(tEpi2), rhythmCheck2At: mmss(tPc2), shock2At: mmss(s2.t), shock2: s2.outcome,
      roscAt: tBack === null ? null : mmss(tBack), roscAfterShock2S: tBack === null ? null : r1(tBack - s2.t), roscAfterLossS: tBack === null || tLoss === null ? null : r1(tBack - tLoss),
      rhythms: (await rhythmLog(page)).map((x) => `${mmss(x.t)} ${x.id}`), stopAt: mmss(tStop), stopAfterRoscS: tBack === null ? null : r1(tStop - tBack), artMeanMaxInCpr: r1(maxOf(hc, 'abpMean')), etco2MaxInCpr: r1(maxOf(hc, 'etco2')),
    };
    await a4Debrief(R, page, 'haemorrhage');
  } finally {
    await R.finish();
  }
});
