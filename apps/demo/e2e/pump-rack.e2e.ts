// Plan pump-rack-tci.md A2 (its e2e): the pump tablet's channel flows, end to end, through the classroom relay running
// as a process of its OWN (`node relay/bin.ts`, as the kit runs it), with the laptop (the host), a learner remote and the
// pump tablet each in their own browser context. A learner remote prepares propofol 1 % on its bench; the pump tablet
// loads that preparation on channel 2 by its label, programs propofol 10 mg/mL, sets Eleveld effect-site 3 µg/mL with the
// patient copied from the case sheet, and starts it. What is pinned is the host ENGINE's own state afterwards, not only
// the acknowledgements: its `drugs` event shows channel 2 running in TCI on Eleveld Ce 3 with propofol in it, the
// patient's propofol amount rises, and the patient's effect-site concentration (and the pump's own prediction) move
// toward the target. The laptop's record row and its Log line name the tablet (as Room setup named it) and the channel.
// A refusal on the tablet is the host's words. Then a mismatched load — a phenylephrine syringe on a channel programmed
// as propofol — shows the instructor's card at once and nothing on the pump, until the card's one control shows the
// notice there. With the pump tablet connected and that card on the dock, every sheet's primary button on the
// instructor's page is the element at its own centre at 1440 × 900.
// PME_E2E_PORT and PME_E2E_RELAY_PORT (+ the worker's index) keep Vite and the relay inside a machine's port range;
// PME_A2_SHOTS=<dir>: each flow's form is saved there as PNG (for the PR; CI sets none).
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { devices, expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, sheet, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: { proc: ChildProcess; port: number } | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => {
  const p = relay?.proc;
  relay = null;
  if (p && p.exitCode === null) await new Promise<void>((r) => (p.once('exit', () => r()), p.kill('SIGTERM')));
});

/** The relay as its own process on the fixed port (+ the worker's index) or any free one; resolves on its ready line. */
function relayProcess(): Promise<void> {
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  const port = fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0;
  const bin = resolve(import.meta.dirname, '../../../packages/controller/relay/bin.ts');
  const proc = spawn(process.execPath, ['--experimental-strip-types', '--no-warnings', bin, '--port', String(port), '--host', '127.0.0.1', '--quiet'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  return new Promise((ok, no) => {
    const onData = (b: Buffer) => {
      out += String(b);
      const m = /ready on ws:\/\/127\.0\.0\.1:(\d+)\//.exec(out);
      if (m) {
        relay = { proc, port: Number(m[1]) };
        ok();
      }
    };
    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);
    proc.once('exit', (c) => no(new Error(`relay exited (${c}): ${out}`)));
  });
}
const ws = () => `ws://127.0.0.1:${relay!.port}/`;

const REMOTE = 'bed2remote01';
const PUMPS = 'bed2pumps001';
type Row = { kind: string; text: string; ev?: string; by?: string; name?: string; channel?: number };
type PumpRow = { ch: number; state: string; mode: string; contents: { drugId: string } | null; programmed: { drugId: string } | null; infusedMl: number; tci: { setId: string; mode: string | null; target: number | null; ce: number } | null };
type DrugRow = { id: string; ce: number; totalAmount: number };
type Engine = { drugs: DrugRow[]; pumps: PumpRow[] };
type HostW = {
  __pmeApp: {
    session: { code: string; onEvent(fn: (e: { type: string; drugs?: DrugRow[]; pumps?: PumpRow[] }) => void): () => void; record: { data: { rows: Row[] } } };
    link: { log: Array<{ kind: string; text: string }> };
  };
  __engine?: Engine;
};

/** The laptop on free roam with the room's rack (two syringe channels, a drip one, a syringe one) and Room setup's names. */
async function laptop(page: Page): Promise<{ code: string; pin: string }> {
  await page.setViewportSize({ width: 1440, height: 900 });
  const names = { [REMOTE]: { name: 'bed 2 remote', show: 'remote' }, [PUMPS]: { name: 'bed 2 pumps', show: 'pump' } };
  await page.addInitScript((n) => localStorage.setItem('pme.roomLayout', JSON.stringify(Object.fromEntries(Object.entries(n).map(([k, v]) => [k, { ...v, lastSeen: Date.now() }])))), names);
  await openApp(page, base, `?relay=${encodeURIComponent(ws())}#/teach2`, { warmMs: 1500, site: { schema: 'pme-site/1', pumpRack: ['syringe', 'syringe', 'drip', 'syringe'] } });
  const code = await page.evaluate(() => (window as unknown as HostW).__pmeApp.session.code);
  const pin = (await page.evaluate(() => localStorage.getItem('pme.learnerPin'))) as string;
  // the host ENGINE's own `drugs` event, kept as it last came (the patient's drugs and the pump channels)
  await page.evaluate(() => {
    const w = window as unknown as HostW;
    w.__pmeApp.session.onEvent((e) => void (e.type === 'drugs' && (w.__engine = { drugs: e.drugs ?? [], pumps: e.pumps ?? [] })));
  });
  return { code, pin };
}
const engine = (page: Page) => page.evaluate(() => (window as unknown as HostW).__engine ?? null);
const rows = (page: Page) => page.evaluate(() => (window as unknown as HostW).__pmeApp.session.record.data.rows);
const logLines = (page: Page) => page.evaluate(() => (window as unknown as HostW).__pmeApp.link.log.map((e) => `${e.kind}|${e.text}`));

async function typePin(p: Page, pin: string): Promise<void> {
  for (const d of pin) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
  await p.locator('.ip-peer-go').click();
}
/** A learner remote on its Drugs tab that prepares propofol 1 % neat, 20 mL, in a syringe, ready on its tray; its id. */
async function remotePropofol(browser: Browser, browserName: string, code: string, pin: string): Promise<{ ctx: BrowserContext; id: string }> {
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const ctx = await browser.newContext(dev);
  await ctx.addInitScript((k) => localStorage.setItem('pme.device', k), REMOTE);
  const p = await ctx.newPage();
  await p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws())}#/remote/learner`);
  await typePin(p, pin);
  await expect(p.locator('.lr-status')).toHaveText(`Signed in as a learner remote · ${code}`, { timeout: 20_000 });
  await expect(p.locator('.lr-bench')).toBeVisible({ timeout: 15_000 });
  await p.locator('.lr-search').fill('propofol');
  await p.locator('.lr-pick[data-drug="propofol"]').click();
  await p.locator('.lr-product[data-product="propofol-1pct-aspen"]').click();
  const amount = p.locator('.lr-drawn-row[data-product="propofol-1pct-aspen"] .stepper input');
  await amount.fill('20');
  await amount.dispatchEvent('change');
  await p.locator('.lr-diluent select').selectOption('');
  await p.locator('.lr-stage').click();
  await expect(p.locator('.lr-item .lr-conc-source')).toHaveText("From the instructor’s computer", { timeout: 10_000 });
  await expect(p.locator('.lr-item .lr-state')).toHaveText(/^Ready/, { timeout: 30_000 });
  const id = await p.evaluate(() => (window as unknown as { __pmeLearnerDrugs: { tray: { ids: string[] } | null } }).__pmeLearnerDrugs.tray?.ids[0] ?? '');
  expect(id).not.toBe('');
  return { ctx, id };
}
/** The pump tablet (a 10-inch tablet in landscape, §5), signed in on the learner PIN: the rack of Room setup's four channels. */
async function pumpTablet(browser: Browser, code: string, pin: string): Promise<{ ctx: BrowserContext; p: Page }> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
  await ctx.addInitScript((k) => localStorage.setItem('pme.device', k), PUMPS);
  const p = await ctx.newPage();
  await p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(ws())}#/pump`);
  await typePin(p, pin);
  await expect(p.locator('.pump-status')).toHaveText(`Signed in as the room's infusion pumps · ${code}`, { timeout: 20_000 });
  await expect(p.locator('.pump-face')).toHaveCount(4);
  return { ctx, p };
}

/** On channel `ch`'s face: open `flow`, let `fill` set its fields, optionally save the form, press its primary button. */
async function flow(p: Page, ch: number, id: string, fill: (form: ReturnType<Page['locator']>) => Promise<void>, shot?: string): Promise<void> {
  const face = p.locator(`.pump-face[data-ch="${ch}"]`);
  await face.locator(`.pf-btn[data-flow="${id}"]`).click();
  const form = face.locator(`.pf-flow[data-flow="${id}"]`);
  await expect(form).toBeVisible();
  await fill(form);
  const dir = process.env.PME_A2_SHOTS;
  if (dir && shot) await face.screenshot({ path: `${dir}/${shot}.png` });
  await form.locator('.pf-send').click();
}
const said = (p: Page, ch: number) => p.locator(`.pump-face[data-ch="${ch}"] .pf-said`);

/** The visible footer buttons of the open sheet `id` (its primary buttons) whose centre is not the button itself. */
const footBlocked = (page: Page, id: string) => page.evaluate((sid) => {
  const out: string[] = [];
  for (const el of document.querySelectorAll<HTMLElement>(`.ip2-sheets .ip2-sheet[data-sheet=${sid}]:not([hidden]) .ip2-sheet-foot button`)) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden') continue;
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!hit || !(el === hit || el.contains(hit))) out.push(`"${(el.textContent ?? '').trim().slice(0, 40)}" under ${hit instanceof HTMLElement ? hit.className || hit.tagName : 'nothing'}`);
  }
  return out;
}, id);
/** How many footer buttons the open sheet `id` shows (so the check above is not vacuous). */
const footCount = (page: Page, id: string) => page.locator(`.ip2-sheets .ip2-sheet[data-sheet=${id}]:not([hidden]) .ip2-sheet-foot button:visible`).count();

test("A2: a remote's propofol loaded on channel 2 runs Eleveld Ce 3 µg/mL in the host engine; the record and the Log name the tablet and channel; a mismatched load shows the instructor's card; every sheet's primary button stays clickable", async ({ page, browser, browserName }) => {
  test.setTimeout(240_000);
  await relayProcess();
  const { code, pin } = await laptop(page);
  const remote = await remotePropofol(browser, browserName, code, pin);
  const { ctx, p } = await pumpTablet(browser, code, pin);

  // Load (D2 item 1): the remote's preparation by its LABEL, on channel 2
  await flow(p, 2, 'load', async (form) => {
    const source = form.locator('select[name="source"]');
    await expect(source.locator('option').first()).toHaveText(/^Propofol 10 mg\/mL · 20 mL · made on bed2remote01 at \d\d:\d\d$/);
    await source.selectOption(`prep|${REMOTE}|${remote.id}`);
  }, '201-load');
  await expect(said(p, 2)).toHaveText('Loaded on channel 2.', { timeout: 10_000 });
  await expect(p.locator('.pump-face[data-ch="2"]')).toHaveAttribute('data-state', 'loaded', { timeout: 10_000 });
  // Program (D2 item 2): propofol 10 mg/mL from the pump's drug list
  await flow(p, 2, 'program', async (form) => {
    await form.locator('select[name="drugId"]').selectOption('propofol');
    await form.locator('input[name="amount"]').fill('10');
    await form.locator('select[name="unit"]').selectOption('mg');
    await form.locator('input[name="perMl"]').fill('1');
  }, '201-program');
  await expect(said(p, 2)).toHaveText('Programmed on channel 2.', { timeout: 10_000 });
  await expect(p.locator('.pump-face[data-ch="2"] [data-face="programmed"]')).toHaveText('Propofol 10 mg/mL', { timeout: 10_000 });
  // TCI (D2 item 4, D6): Eleveld, effect site, 3 µg/mL, the patient copied from the case sheet
  await flow(p, 2, 'tci', async (form) => {
    const sets = await form.locator('select[name="setId"] option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
    expect(sets).toContain('eleveld');
    expect(sets).not.toContain('minto'); // only the sets registered for the programmed drug
    await form.locator('select[name="setId"]').selectOption('eleveld');
    await form.locator('select[name="mode"]').selectOption('effect');
    await form.locator('input[name="target"]').fill('3');
    await form.locator('.pf-copy').click();
    await expect(form.locator('select[name="sex"]')).not.toHaveValue('');
    await expect(form.locator('input[name="weightKg"]')).not.toHaveValue('');
  }, '201-tci');
  await expect(said(p, 2)).toHaveText('Target set on channel 2: press Start to run it.', { timeout: 10_000 });
  await p.locator('.pump-face[data-ch="2"] .pf-btn[data-flow="start"]').click();
  await expect(said(p, 2)).toHaveText('Started on channel 2.', { timeout: 10_000 });
  await expect(p.locator('.pump-face[data-ch="2"]')).toHaveAttribute('data-state', 'running', { timeout: 10_000 });
  await expect(p.locator('.pump-face[data-ch="2"]')).toHaveAttribute('data-mode', 'tci');

  // The host ENGINE: channel 2 running in TCI (Eleveld, Ce 3) with the preparation's propofol in it
  await expect.poll(async () => (await engine(page))?.pumps.find((c) => c.ch === 2)?.state ?? null, { timeout: 15_000 }).toBe('running');
  const a = (await engine(page))!;
  const ch2 = a.pumps.find((c) => c.ch === 2)!;
  expect(ch2).toMatchObject({ mode: 'tci', contents: { drugId: 'propofol' }, programmed: { drugId: 'propofol' }, tci: { setId: 'eleveld', mode: 'effect', target: 3 } });
  const before = a.drugs.find((d) => d.id === 'propofol')!;
  expect(before.totalAmount).toBeGreaterThan(0);
  // ... and later: more propofol in the patient, the patient's Ce and the pump's own Ce both higher and still under 3
  await expect.poll(async () => {
    const b = (await engine(page))!;
    const now = b.drugs.find((d) => d.id === 'propofol')!;
    const pump = b.pumps.find((c) => c.ch === 2)!;
    return now.totalAmount > before.totalAmount && now.ce > before.ce && pump.tci!.ce > ch2.tci!.ce && Math.abs(3 - pump.tci!.ce) < Math.abs(3 - ch2.tci!.ce) && pump.infusedMl > ch2.infusedMl;
  }, { timeout: 30_000, intervals: [1000] }).toBe(true);
  const b = (await engine(page))!;
  expect(b.drugs.find((d) => d.id === 'propofol')!.ce).toBeGreaterThan(0);
  // the tablet shows the pump's prediction only, the programme's fields; never the patient's
  await expect(p.locator('.pump-face[data-ch="2"] [data-field="tciSet"] dd')).toHaveText('eleveld');

  // The laptop's record rows and Log lines name the tablet and the channel
  await expect.poll(async () => (await rows(page)).filter((r) => r.kind === 'pump' && r.channel === 2).map((r) => r.text), { timeout: 10_000 }).toEqual(expect.arrayContaining([expect.stringMatching(/^Channel 2: TCI eleveld, Ce target 3/)]));
  const tciRow = (await rows(page)).find((r) => r.kind === 'pump' && r.channel === 2 && /TCI eleveld/.test(r.text))!;
  expect(tciRow).toMatchObject({ by: PUMPS, name: 'bed 2 pumps', ev: 'drug:propofol' });
  await expect.poll(() => logLines(page), { timeout: 10_000 }).toEqual(expect.arrayContaining([
    'learner|Channel 2: TCI eleveld, Ce target 3 (pump tablet: bed 2 pumps)',
    'learner|Channel 2 started (pump tablet: bed 2 pumps)',
  ]));

  // A refusal is the host's words: 400 mL/h with a 20 mL stock syringe is past the SP-500's 300
  await flow(p, 1, 'load', async (form) => void (await form.locator('select[name="source"]').selectOption('stock|propofol-10mg-ml-20ml')));
  await expect(said(p, 1)).toHaveText('Loaded on channel 1.', { timeout: 10_000 });
  await expect(p.locator('.pump-face[data-ch="1"]')).toHaveAttribute('data-state', 'loaded', { timeout: 10_000 });
  await flow(p, 1, 'rate', async (form) => {
    await expect(form.locator('.pf-hint').first()).toHaveText('JMS SP-500: 0.1–300 mL/h with a 20 mL syringe, in 0.1 mL/h steps');
    await form.locator('input[name="rate"]').fill('400');
  }, '201-rate');
  await expect(said(p, 1)).toHaveText("Refused by the instructor's computer: 400 mL/h: the JMS SP-500 runs 0.1–300 mL/h with a 20 mL syringe, in 0.1 mL/h steps", { timeout: 10_000 });
  // the bolus and purge forms, as §5 and D7 state them (opened and shot; not sent)
  for (const id of ['bolus', 'purge'] as const) {
    const face = p.locator('.pump-face[data-ch="1"]');
    await face.locator(`.pf-btn[data-flow="${id}"]`).click();
    await expect(face.locator(`.pf-flow[data-flow="${id}"] .pf-hint`).first()).toContainText('JMS SP-500: ');
    if (process.env.PME_A2_SHOTS) await face.screenshot({ path: `${process.env.PME_A2_SHOTS}/201-${id}.png` });
    await face.locator(`.pf-flow[data-flow="${id}"] .pf-cancel`).click();
  }

  // A mismatched load: channel 1 programmed as propofol, then a phenylephrine stock syringe loaded on it
  await flow(p, 1, 'program', async (form) => {
    await form.locator('select[name="drugId"]').selectOption('propofol');
    await form.locator('input[name="amount"]').fill('10');
    await form.locator('select[name="unit"]').selectOption('mg');
  });
  await expect(said(p, 1)).toHaveText('Programmed on channel 1.', { timeout: 10_000 });
  await p.locator('.pump-face[data-ch="1"] .pf-btn[data-flow="unload"]').click();
  await expect(said(p, 1)).toHaveText('Unloaded from channel 1.', { timeout: 10_000 });
  await expect(p.locator('.pump-face[data-ch="1"]')).toHaveAttribute('data-state', 'notLoaded', { timeout: 10_000 });
  await flow(p, 1, 'load', async (form) => void (await form.locator('select[name="source"]').selectOption('stock|phenylephrine-100mcg-ml-20ml')));
  await expect(said(p, 1)).toHaveText('Loaded on channel 1.', { timeout: 10_000 });
  // the instructor's card at once; the pump says nothing of it (§8: the pump never warns by itself)
  const card = page.locator('.ip2-dock .ip2-pm');
  await expect(card).toBeVisible({ timeout: 10_000 });
  await expect(card.locator('.ip2-pm-what')).toHaveText('Channel 1 (pump tablet: bed 2 pumps): syringe and programme differ. Loaded: Phenylephrine 100 µg/mL; programmed: Propofol 10 mg/mL.');
  await expect(p.locator('.pump-face[data-ch="1"] .pf-notice')).toBeHidden();
  expect(await p.content()).not.toMatch(/phenylephrine 100|100 µg\/mL/i); // the label listed it; the face shows the programme only
  if (process.env.PME_A2_SHOTS) await card.screenshot({ path: `${process.env.PME_A2_SHOTS}/201-card-${browserName}.png` });

  // Every sheet's primary buttons on the instructor's page at 1440 × 900, the tablet connected and the card on the dock
  for (const id of ['airway', 'defib', 'vitals', 'devices', 'patient', 'log', 'drug'] as const) {
    await sheet(page, id);
    expect.soft(await footBlocked(page, id), `the ${id} sheet's primary buttons`).toEqual([]);
    if (id === 'drug') expect.soft(await footCount(page, id), 'the Drug sheet shows its footer').toBeGreaterThan(0);
  }
  await expect(card).toBeVisible();

  // The card's one control: the pump shows the notice on channel 1, in the host's words
  await card.locator('.ip2-pm-show').click();
  await expect(card.locator('.ip2-pm-shown')).toHaveText(/^Notice shown at \d\d:\d\d$/, { timeout: 10_000 });
  await expect(p.locator('.pump-face[data-ch="1"] .pf-notice')).toHaveText('syringe and programme differ', { timeout: 10_000 });
  await expect(p.locator('.pump-face[data-ch="2"] .pf-notice')).toBeHidden();
  expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await ctx.close();
  await remote.ctx.close();
});
