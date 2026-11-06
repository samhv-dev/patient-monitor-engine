// Stage 13: a showcase run to its end, then the Debrief — the anaphylaxis card at ×4 with a bookmark and a return to it
// (the first reaction is undone, the retry is judged), treated with the card's own button. The report's timeline,
// facts (labs included), objectives, the minute appendix and the JSON download are checked on both engines, with the
// R56 engine-id scan and the print layout (print media: only the report, A4 page breaks, charts kept whole, the undone
// course struck through, the footer and the build on every page); Chromium also prints it with page.pdf(): its page
// count, A4 pages and title on every platform, its text — every page's footer and build included — on macOS (R50 I-2:
// the Linux runner's fonts may lack a glyph's ToUnicode entry; PME_PDF_TEXT=1 reads it anywhere).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { pdfInfo, pdfText, squash } from './pdf-text.ts';
import { debriefLinkV2, openApp, pillV2, scanEngineIds, sheet, closeSheets, speedV2, startVite } from './app-support.ts';
import { END_S, openMhV2, PATH, pressPath, to } from './mh-v2-path.ts';

const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/stage-13' : '../../../test-results/gate-shots/stage-13'); // FU-11 K1: evidence only on request
let vite: ViteDevServer | undefined;
let base = process.env.PME_KIT_BASE ?? ''; // PME_KIT_BASE=<url>: a server already running (as teach2-mh-v2.e2e.ts)
test.beforeAll(async () => {
  if (!base) ({ vite, base } = await startVite());
});
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { link: { simT: number; ctl: { hostPaused: boolean } }; engineIds: string[] } };
const simT = (page: Page) => page.evaluate(() => (window as unknown as W).__pmeApp.link.simT);

// CI Linux WebKit (the shared 4-vCPU runner, S10-F5): under ×4 the page served clicks and drew the Debrief late — the
// Return not landed within 5 s, timeline states seconds late, the Debrief heading absent 5 s after the click (PR #97 run
// 39338820903, PR #105 39524573921 and 39534643448, PR #107 39578631031; docs/guides/known-deviations.md). There the
// two live runs go at ×2, their waits are on the page's own clock or scaled to the speed, and the session is paused
// (the host's acknowledgement awaited) before the Debrief opens, so the click is served by an idle page. Every
// assertion is the same; local WebKit and Chromium keep ×4.
const loadedWebKit = (browserName: string) => !!process.env.CI && browserName === 'webkit';

/** Pause, and wait for the host to have paused: Instructor v2's clock pill reads PAUSED (the session bar's "Resume") as
 *  soon as it is pressed, before the host answers. */
async function pauseHost(page: Page): Promise<void> {
  const pill = pillV2(page);
  await expect(pill).toHaveAttribute('data-state', 'running');
  await pill.click();
  await expect(pill).toHaveAttribute('data-state', 'paused', { timeout: 10_000 });
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__pmeApp.link.ctl.hostPaused), { timeout: 20_000, message: 'the host has paused' }).toBe(true);
}

/** Instructor v2's dock Debrief link (the session bar's), clicked: the route first (was the click served?), then the
 *  view's heading (was it drawn?). */
async function openDebrief(page: Page, busy: boolean): Promise<void> {
  await debriefLinkV2(page).click();
  const timeout = busy ? 30_000 : 5_000; // the loaded CI WebKit page only
  await expect.poll(() => page.evaluate(() => location.hash), { timeout, message: 'the Debrief link was followed' }).toBe('#/debrief');
  await expect(page.locator('[data-view=debrief]').getByRole('heading', { level: 1, name: 'Debrief' }), 'the Debrief is drawn').toBeVisible({ timeout });
}

test('a showcase run ends in a debrief that prints (timeline, facts, objectives)', { tag: '@known-flaky' }, async ({ page, browserName }) => {
  const busy = loadedWebKit(browserName);
  const k = busy ? 2 : 1; // wall time per sim second, against ×4
  test.setTimeout(busy ? 300_000 : 180_000);
  await openApp(page, base, '?scenario=showcase-anaphylaxis#/teach2', { warmMs: 1500 });
  await speedV2(page, busy ? 2 : 4);
  // Instructor v2 saves the moment with the dock's mark: today's bookmark command, under the mark's label and kind
  await page.locator('.ip2-dock').getByRole('button', { name: 'Mark: good' }).click();
  await expect.poll(() => simT(page), { timeout: 40_000 * k }).toBeGreaterThan(70); // the reaction starts at 60 s
  await (await sheet(page, 'log')).getByRole('button', { name: 'Return here' }).first().click(); // the Log sheet's marks
  await page.locator('dialog[open]').getByRole('button', { name: 'Return', exact: true }).click();
  await expect.poll(() => simT(page), { timeout: busy ? 15_000 : 5_000 }).toBeLessThan(20);
  await closeSheets(page); // ACTION, today's Scenario tab
  const give = page.locator('.ip2-action .ip2-rows:not(.ip2-finished-list) button.ip2-row', { has: page.locator('.ip2-row-title').getByText('Give epinephrine 100 µg', { exact: true }) });
  await expect(give).toBeHidden({ timeout: busy ? 15_000 : 5_000 }); // the panel repaints at ≤ 2 Hz: the first reaction's button goes first
  await expect(give).toBeVisible({ timeout: 40_000 * k }); // the reaction again, 60 s after the bookmark's state began
  const tGive = await simT(page);
  await give.click();

  // the end of the run: the dock's Debrief (the session bar's) is marked and a toast says so
  const open = debriefLinkV2(page);
  await expect(open).toHaveAttribute('data-ready', 'true', { timeout: 10_000 * k });
  await expect(page.locator('.toast', { hasText: 'the debrief is ready' })).toBeVisible();
  await expect.poll(() => simT(page), { timeout: 30_000 * k }).toBeGreaterThan(tGive + 24); // ≈ 24 s of sim after the epinephrine: its effect reaches the trends
  if (busy) await pauseHost(page);
  await openDebrief(page, busy);
  const view = page.locator('[data-view=debrief]');

  const timeline = await view.locator('#db-timeline tbody tr').allInnerTexts();
  const rows = timeline.map((r) => r.replace(/\s+/g, ' ').trim());
  const has = (re: RegExp) => rows.filter((r) => re.test(r));
  expect(has(/^\d\d:\d\d Scenario Scenario loaded: Anaphylaxis under anaesthesia$/)).toHaveLength(1);
  expect(has(/^\d\d:\d\d Bookmark Bookmark: Mark \d+ at \d\d:\d\d$/)).toHaveLength(1); // v2's mark: "Mark n at" for "Bookmark n at"
  expect(has(/^01:0\d Scenario Scenario state: Anaphylaxis — undone by return 1$/)).toHaveLength(1); // DV-3: the 60 s state may land in a later second on a slow runner
  expect(has(/^\d\d:\d\d Return Returned to bookmark Mark \d+ at \d\d:\d\d$/)).toHaveLength(1);
  expect(has(/^01:0\d Scenario Scenario state: Anaphylaxis$/)).toHaveLength(1); // the retry (DV-3)
  expect(has(/^\d\d:\d\d Scenario Epinephrine 100 µg IV$/)).toHaveLength(1);
  expect(has(/^\d\d:\d\d Scenario Scenario state: Epinephrine given$/)).toHaveLength(1);
  expect(has(/ — undone by return 1$/).length).toBeGreaterThanOrEqual(2);
  expect(has(/^00:0\d Patient Ventilated breaths began$/)).toHaveLength(1); // the restored engine's breath under way is no second start (the first breath may begin just before the 00:01 bookmark)
  const strike = await view.locator('#db-timeline tbody tr.undone td').first().evaluate((td) => getComputedStyle(td).textDecorationLine);
  expect(strike).toBe('line-through'); // Q6: the undone course struck through, its words kept

  const facts = Object.fromEntries((await view.locator('#db-facts dt').allInnerTexts()).map((k, i) => [k, i]));
  const values = await view.locator('#db-facts dd').allInnerTexts();
  expect(values[facts['Epinephrine, boluses in all'] as number]).toBe('100 µg (1 dose)');
  expect(values[facts['Lowest ART M / NIBP M'] as number]).toMatch(/^\d+ mmHg at \d\d:\d\d$/);
  expect(values[facts['Labs (the model): last (lowest–highest)'] as number]).toMatch(/^K⁺ \d\.\d mmol\/L \(\d\.\d–\d\.\d\) · Lactate \d+\.\d mmol\/L .* · pH \d\.\d\d \(.* · Glucose .* · Tcore \d+\.\d °C/); // Q7
  const objectives = await view.locator('#db-objectives li').evaluateAll((li) => li.map((x) => [x.getAttribute('data-status'), x.querySelector('.db-mark')?.textContent]));
  expect(objectives).toEqual([['not assessable', '– Not assessable'], ['met', '✓ Observed'], ['not met', '✗ Not observed']]); // E42–E44
  await expect(view.locator('#db-objectives li').nth(1)).toContainText(/Epinephrine \d+ s after the state "Anaphylaxis" \(01:0\d → 01:\d\d; within 2 min 00 s asked\)/);
  await expect(view.locator('.db-chart svg')).toHaveCount(7); // the six trends and the Pressures panel (brief 63): this run keeps the pressures
  // IP8: the card's steps — the button pressed on the kept course is a taken step (the undone first course is not read)
  await expect(view.locator('#db-steps tbody tr[data-status=taken]')).toHaveText([/^Anaphylaxis · 01:0\d\s*1\s*Give epinephrine 100 µg\s*01:\d\d \(1\)\s*✓ taken$/]);
  // redesign B (B6 b): key times and key moments on this run
  expect(await view.locator('#db-keytimes .db-tile').count()).toBeGreaterThanOrEqual(1);
  expect(await view.locator('#db-moments tbody tr').count()).toBeGreaterThanOrEqual(1);
  // the owner, 1 November: the bookmark set during the run is on the course strip, at its time, its title the Bookmarks
  // list's words
  const mark = view.locator('#db-course g.db-bm');
  await expect(mark).toHaveCount(1);
  await expect(mark).toHaveAttribute('data-kind', 'good'); // the dock's "Mark: good" (today's Bookmark had no kind)
  await expect(mark.locator('path')).toBeVisible();
  const listed = (await view.locator('#db-bookmarks li').first().innerText()).trim();
  expect(listed).toMatch(/^1 · 00:0\d Bookmark: Mark \d+ at 00:0\d · good$/); // the mark's kind follows its words // numbered as on the strip (the owner, 2 November)
  expect(await mark.locator('title').textContent()).toBe(listed);
  expect(Number(await mark.getAttribute('data-t'))).toBeLessThan(10);
  const minuteRows = await view.locator('#db-minutes tbody tr').allInnerTexts(); // Q1: one row per minute
  expect(minuteRows.length).toBeGreaterThanOrEqual(2); // the kept course is ≈ 1½–2 sim-min
  expect(minuteRows[0]).toMatch(/^00:00\s+\d+/);
  await expect(view.locator('#db-minutes thead th')).toHaveCount(15); // D6: SBP, DBP and CVP
  // R56: no engine id in the report (as stage9-glossary: an id that is also an English word, "epinephrine", is not a leak)
  const ids = (await page.evaluate(() => (window as unknown as W).__pmeApp.engineIds)).filter((id) => /[A-Z0-9]/.test(id));
  expect(await scanEngineIds(page, ids)).toEqual([]);

  await view.getByRole('textbox', { name: 'Run by' }).fill('Dr Instructor, two residents');
  await view.getByRole('textbox', { name: 'Notes' }).fill('Good closed-loop communication.');

  // Q3: the record as JSON — the same verdicts as the report; never the "Run by" line or the notes (Q2)
  const [dl] = await Promise.all([page.waitForEvent('download'), view.getByRole('button', { name: 'Download the record (JSON)' }).click()]);
  expect(dl.suggestedFilename()).toMatch(/^debrief-showcase-anaphylaxis-\d{4}-\d\d-\d\d\.json$/);
  const json = readFileSync(await dl.path(), 'utf8');
  const j = JSON.parse(json) as { schema: string; version: string; build: string; record: { rows: unknown[] }; objectives: Array<{ verdict: { status: string } }>; steps: Array<{ id: string; status: string }> };
  expect(j.schema).toBe('pme-debrief/2');
  expect(j.steps.filter((x) => x.status === 'taken').map((x) => x.id)).toEqual(['giveEpi']); // IP8: additive, still /2
  expect(j.version).toMatch(/^\d+\.\d+\.\d+/); // the renderer's version: the footer below is built from it, never written here
  expect(j.objectives.map((o) => o.verdict.status)).toEqual(['not assessable', 'met', 'not met']);
  expect(j.record.rows.length).toBeGreaterThanOrEqual(rows.length); // the run goes on while the view is open (paused on CI WebKit)
  expect(json).not.toContain('Dr Instructor');
  expect(json).not.toContain('closed-loop');
  const build = j.build;
  const foot = `For educational use only; Not to be used in patient care. Version ${j.version}${j.version.includes('-') ? ' (pre-release)' : ''}, build ${build}.`;
  await expect(view.locator('.db-foot')).toHaveText(foot);

  // print layout, both engines: only the report; trends and the appendix on new pages (drugs, the timeline and
  // bookmarks share one); a chart never split
  await page.emulateMedia({ media: 'print' });
  const layout = await page.evaluate(() => {
    const vis = (s: string) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; };
    const css = (s: string, p: string) => getComputedStyle(document.querySelector(s) as Element).getPropertyValue(p);
    return {
      topbar: vis('.topbar'), stage: vis('.stage'), bar: vis('.sessionbar'), tools: vis('.db-tools'), report: vis('.debrief'),
      trends: css('#db-trends', 'break-before'), timeline: css('#db-timeline', 'break-before'), minutes: css('#db-minutes', 'break-before'), swimlane: css('#db-swimlane', 'break-before'), moments: css('#db-moments', 'break-before'),
      chart: css('.db-chart', 'break-inside'), ink: css('.db-svg path', 'stroke'), body: css('body', 'overflow'),
      undone: css('#db-timeline tbody tr.undone td', 'text-decoration-line'),
      // the footer on every page: @page margin boxes where the browser has them (Chromium), else a line before each break
      marginBoxes: [...(document.getElementById('db-page-style') as HTMLStyleElement).sheet?.cssRules ?? []].some((r) => ((r as CSSPageRule).cssRules?.length ?? 0) === 2),
      runFeet: [...document.querySelectorAll('.debrief .db-runfoot')].filter((e) => getComputedStyle(e).display !== 'none').length,
    };
  });
  const boxes = browserName === 'chromium';
  expect(layout).toEqual({ topbar: false, stage: false, bar: false, tools: false, report: true, trends: 'page', timeline: 'auto', minutes: 'page', swimlane: 'page', moments: 'auto', chart: 'avoid', ink: 'rgb(0, 0, 0)', body: 'visible', undone: 'line-through', marginBoxes: boxes, runFeet: boxes ? 0 : 4 });
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#db-course g.db-bm') as Element).display), 'the mark prints').not.toBe('none');
  expect(await page.evaluate(() => document.querySelector('#db-course g.db-bm .db-bm-n')?.textContent), 'its number inside').toBe('1');
  mkdirSync(out, { recursive: true });
  await page.screenshot({ path: `${out}/debrief-print-${browserName}.png`, fullPage: true });

  if (browserName === 'chromium') {
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
    writeFileSync(`${out}/debrief.pdf`, pdf);
    const info = pdfInfo(pdf); // every platform: no font read
    expect(info.title).toMatch(/^Debrief Anaphylaxis under anaesthesia \d{4}-\d\d-\d\d$/);
    expect(info.boxes.length).toBeGreaterThanOrEqual(4); // header, trends, drugs + timeline + bookmarks, appendix (Decision 12)
    for (const b of info.boxes) expect([Math.round(b[2] ?? 0), Math.round(b[3] ?? 0)]).toEqual([595, 842]);
    if (process.platform === 'darwin' || process.env.PME_PDF_TEXT === '1') {
      const { text, pages } = pdfText(pdf);
      expect(pages).toBe(info.boxes.length);
      const t = squash(text);
      for (const want of ['DEBRIEF', 'Anaphylaxis under anaesthesia', 'Run by', 'Dr Instructor, two residents', 'Scenario state: Anaphylaxis — undone by return 1',
        'Epinephrine 100 µg IV', '✓ Observed', '✗ Not observed', '– Not assessable', 'Epinephrine, boluses in all', '100 µg (1 dose)', 'Good closed-loop communication.',
        'Talking points', 'Appendix: one row per minute']) expect(t, want).toContain(squash(want)); // the h1 prints as the band's capital kicker
      // B6 (a): page 1 is the key times, the course and the objectives; the facts follow the key moments on page 2
      const page1 = squash(text.split('\f')[0] ?? '');
      for (const want of ['Key times', 'The course']) expect(page1, want).toContain(squash(want));
      for (const o of await view.locator('#db-objectives li').evaluateAll((li) => li.map((x) => x.childNodes[2]?.textContent ?? ''))) expect(page1, `objective on page 1: ${o}`).toContain(squash(o));
      expect(page1, 'facts not on page 1').not.toContain(squash('Measured facts'));
      expect(squash(text.split('\f')[1] ?? ''), 'key moments and facts on page 2').toContain(squash('Measured facts'));
      text.split('\f').forEach((p, i) => {
        expect(squash(p), `page ${i + 1}: the footer and the build`).toContain(squash(foot));
        expect(squash(p), `page ${i + 1}: its number`).toContain(squash(`Page ${i + 1} of ${pages}`));
      });
    } else test.info().annotations.push({ type: 'pdf text', description: 'not read on this platform (R50 I-2): page count, A4 and title only' });
  }
});

// FX-20: the app opened directly on the Debrief — the run record restarts once at load (the constructor's empty run,
// then the first timeline event) and the next 5 s refresh emptied notes typed in the first seconds. A run the view
// has drawn nothing of is not a run whose notes are dropped; a scenario loaded later still starts the notes empty.
test('FX-20: notes typed right after opening the app on the Debrief are kept; a new scenario still empties them', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, base, '#/debrief'); // a Load opens Instructor v2
  const notes = page.locator('[data-view=debrief] .db-notes');
  await notes.click({ timeout: 2_000 });
  await page.keyboard.type('kept');
  await page.waitForTimeout(7_000); // past the next 5 s refresh
  await expect(notes).toHaveText('kept');

  // Instructor v2 has no in-panel library: the Scenarios library's Load, which opens the Instructor view
  await page.evaluate(() => (location.hash = '#/scenarios/library'));
  await page.locator('[data-view=scenarios]').getByRole('button', { name: 'Load Anaphylaxis under anaesthesia', exact: true }).click();
  await expect(page).toHaveURL(/#\/teach2$/);
  await expect(page.locator('.ip2-head .ip2-title')).toHaveText('Anaphylaxis under anaesthesia', { timeout: 10_000 }); // none was running: no confirmation
  await page.waitForTimeout(6_000);
  await page.evaluate(() => (location.hash = '#/debrief'));
  await expect(notes).toBeVisible();
  await page.waitForTimeout(500);
  await expect(notes).toHaveText('');
});

// Decision 12: a free run (no scenario) prints in at most four A4 pages — the header band with facts, talking points and
// notes; trends; drugs, timeline and bookmarks; the appendix. Its /2 export is saved for the Persian check (A7 Step 4).
// The run goes at ×4 and is paused before the Debrief opens: the CI Linux WebKit runner cannot hold ×8 (S10-F5), and
// there a click on the session bar's Debrief link at ×8 was not served within 5 s (main run 39173099640, 3 of 3). At ×4
// it then failed the same way (PR #105 run 39524573921, PR #107 39578631031 attempts 1 and 3): there it now goes at ×2
// to 3 sim-min on the page's clock, and the Debrief is opened once the host has acknowledged the pause.
// @known-flaky, class crash (outside our code): CI run 42132450433 (PR #288), e2e (webkit 1/3), attempt 1: "page.evaluate:
// Target page, context or browser has been closed" at 101.7 s, inside the 150-s wait for 3 sim-min below (no time-out);
// no page snapshot could be taken; retry #1 passed in 93.8 s; local macOS WebKit 10/10. fx25-co2-attach :80 in the same
// shard lost its page the same way 6 min later: the Linux WebKit web-process crash class F-FX1-1
// (docs/guides/known-deviations.md)
test('a free run prints in at most four pages; its export is pme-debrief/2', { tag: '@known-flaky' }, async ({ page, browserName }) => {
  const busy = loadedWebKit(browserName);
  test.setTimeout(busy ? 240_000 : 120_000);
  await openApp(page, base, '#/teach2', { warmMs: 1500 }); // Instructor v2, no scenario
  await speedV2(page, busy ? 2 : 4);
  await expect.poll(() => simT(page), { timeout: busy ? 150_000 : 75_000 }).toBeGreaterThanOrEqual(180); // 3 sim-min
  await pauseHost(page);
  await openDebrief(page, busy);
  const view = page.locator('[data-view=debrief]');
  await expect(view.locator('.db-title')).toHaveText('No scenario (free run)');
  await expect(view.locator('#db-pearls .db-pearl')).toHaveCount(4);
  await expect(view.locator('#db-moments')).toHaveCount(0); // B6 (d): no key moment, no page break for them
  await expect(view.locator('#db-steps')).toHaveCount(0); // IP8: no card, no steps section
  await expect(view.locator('#db-trends figure[data-trend=pressures] path[data-p]'), 'brief 63: the Pressures panel, SBP, DBP and CVP').toHaveCount(3);
  const [dl] = await Promise.all([page.waitForEvent('download'), view.getByRole('button', { name: 'Download the record (JSON)' }).click()]);
  const json = readFileSync(await dl.path(), 'utf8');
  const j = JSON.parse(json) as { schema: string; keyTimes: unknown[]; keyMoments: unknown[] };
  expect([j.schema, j.keyTimes, j.keyMoments]).toEqual(['pme-debrief/2', [], []]);
  const results = resolve(import.meta.dirname, '../../../test-results');
  mkdirSync(results, { recursive: true });
  if (browserName === 'chromium') {
    writeFileSync(`${results}/debrief-a.json`, json);
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
    writeFileSync(`${results}/debrief-a-free-run.pdf`, pdf);
    const pages = pdfInfo(pdf).boxes.length;
    test.info().annotations.push({ type: 'free-run pages', description: String(pages) });
    expect(pages).toBeLessThanOrEqual(4);
  }
});

// Debrief redesign B on the recorded tamponade path of kit round A3.1 (its record shown in the view, the card's
// objectives as they are now): page 1 (key times, the course, the objectives) within one A4 page, the key moments with
// SpO₂ "–" while pulseless (E60), the learner handout without verdicts (E51) printing alone on one page, its button,
// and typing in Run by and Notes across a refresh (Decision 11). Both engines; Chromium also prints both PDFs.
const A31 = resolve(import.meta.dirname, '../../../docs/showcase/kit-round-a/fa/debrief-a3-tamponade-cue-card-path-kit-round-chromium.json');
const TAMPONADE = resolve(import.meta.dirname, '../src/app/showcase/showcase-tamponade.json');
// R-B C2: the committed full MH run (kit round A, early call, ventilation back) with the card's six objectives (E52)
const MH_RUN = resolve(import.meta.dirname, '../../../docs/showcase/kit-round-a/fa/debrief-malignant-hyperthermia-early-normo-call-kit-round-chromium.json');
const MH = resolve(import.meta.dirname, '../src/app/showcase/showcase-mh.json');
// E132: the kit-round A4 haemorrhage run on the card after the clinical review (21 key moments, three take-home lines)
const HAEM_RUN = resolve(import.meta.dirname, '../../../docs/showcase/kit-round-a/e132/debrief-a4-haemorrhage-e132-chromium.json');
const HAEM = resolve(import.meta.dirname, '../src/app/showcase/showcase-haemorrhage.json');
const MM = 96 / 25.4;
const VERDICT = /Observed|Not observed|Not assessable|Discuss|✓|✗|◆/;

type StateRow = { kind: string; ev?: string; undone?: number; tr?: string; by?: string };
type Card = { states: Array<{ id: string; transitions?: Array<{ id: string; to: string; when: unknown }> }> };
/** IP8: a record made before the record kept how each state was entered, as the record would keep it now — each kept
 *  state entered by the card's first transition to it from the state before (pressed when it has a button, else by
 *  its rule), a jump when none leads there — so that the page bounds below are measured with the steps section in. */
function withSteps(rows: StateRow[], card: Card): void {
  let prev: string | undefined;
  for (const r of rows) {
    if (r.kind !== 'scenario' || !r.ev?.startsWith('state:') || r.undone !== undefined) continue;
    const id = r.ev.slice('state:'.length);
    const tr = prev === undefined ? undefined : card.states.find((s) => s.id === prev)?.transitions?.find((t) => t.to === id);
    if (prev !== undefined) Object.assign(r, tr ? { tr: tr.id, by: JSON.stringify(tr.when).includes('"manual"') ? 'press' : 'rule' } : { by: 'goto' });
    prev = id;
  }
}
/** The view with a recorded run in place of the live one (its scenario's objectives as the card holds them now): the
 *  simulation paused first, so nothing is added to it; the Debrief opened by its route, not the session-bar link. */
async function showRecorded(page: Page, run = A31, card = TAMPONADE): Promise<void> {
  const rec = JSON.parse(readFileSync(run, 'utf8')).record;
  const doc = JSON.parse(readFileSync(card, 'utf8'));
  withSteps(rec.rows, doc);
  rec.doc.objectives = doc.objectives;
  rec.doc.takeHome = doc.takeHome; // rc.3: the owner's take-home lines (the recordings predate them)
  await page.setViewportSize({ width: Math.round(182 * MM), height: 1000 }); // the A4 content width (182 mm)
  await openApp(page, base, '#/teach2', { warmMs: 1000 });
  await pillV2(page).click(); // Instructor v2's clock pill pauses
  await page.waitForTimeout(500);
  await page.evaluate((r) => ((window as unknown as { __pmeApp: { session: { record: { data: unknown } } } }).__pmeApp.session.record.data = r), rec);
  await page.evaluate(() => (location.hash = '#/debrief'));
  await expect(page.locator('[data-view=debrief] #db-moments')).toBeVisible();
}
/** Heights in print media (mm): the page-1 block (header band to the end of the objectives; a /2 run has no objectives
 *  section since judged rows were retired, 5 November: to the end of the course strip) and the handout; whether
 *  the bundled print font is loaded (rc.3: the heights are measured in it on every platform); and the printed size (pt)
 *  of the handout course strip's labels (0 when the handout is not shown). */
/** The view loads the bundled print font on entering (loadPrintFont, not awaited) and its print buttons await it; a
 *  measurement taken straight after opening could beat that load (main run 39598457184, Chromium attempt 1: not loaded
 *  2.6 s into the MH test). Wait, bounded, for the view's own load: the test never loads the font itself. */
async function printFontLoaded(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => [...document.fonts].some((f) => f.family.replace(/["']/g, '') === 'Inter Print' && f.status === 'loaded')),
    { timeout: 10_000, message: 'the Debrief view has loaded the bundled print font' }).toBe(true);
}
const printHeights = (page: Page) => page.evaluate((mm) => {
  const r = (s: string) => (document.querySelector(s) as Element).getBoundingClientRect();
  const strip = document.querySelector('#db-handout .db-course svg') as SVGSVGElement;
  const label = strip.querySelector('.db-lane-l') as SVGTextElement;
  const stripPt = (strip.getBoundingClientRect().width / strip.viewBox.baseVal.width) * parseFloat(getComputedStyle(label).fontSize) * 0.75;
  const printFont = [...document.fonts].some((f) => f.family.replace(/["']/g, '') === 'Inter Print' && f.status === 'loaded');
  const end = document.querySelector('#db-objectives') ? '#db-objectives' : '#db-course';
  return { page1: (r(end).bottom - r('#db-live-1 > .db-band').top) / mm, handout: r('#db-handout').height / mm, printFont, stripPt };
}, MM);

/** D7b: the swimlane heads page 2, before the key moments, whole on its page; its printed height (mm) at the 182 mm
 *  content width, and its window rows' labels and verdict words. Read in print media. */
const swimPrint = (page: Page) => page.evaluate((mm) => {
  const sec = document.querySelector('#db-swimlane') as HTMLElement;
  const cs = getComputedStyle(sec);
  return {
    next: sec.nextElementSibling?.id ?? '', prev: (sec.previousElementSibling as HTMLElement | null)?.className ?? '',
    breakBefore: cs.breakBefore, breakInside: cs.breakInside,
    momentsBreak: getComputedStyle(document.querySelector('#db-moments') as Element).breakBefore,
    heightMm: (sec.querySelector('svg') as SVGSVGElement).getBoundingClientRect().height / mm,
    widthMm: (sec.querySelector('svg') as SVGSVGElement).getBoundingClientRect().width / mm,
  };
}, MM);
const swimRows = (page: Page) => page.locator('#db-swimlane .db-swim-win').evaluateAll((gs) => gs.map((g) => ({
  label: g.querySelector('title')?.textContent ?? '', words: [...g.querySelectorAll('.db-swim-tick .db-swim-v, .db-swim-missed .db-swim-v')].map((t) => t.textContent),
})));

test('Debrief B on the A3.1 tamponade path: key times, the course, key moments, the learner handout', async ({ page, browserName }) => {
  test.setTimeout(90_000);
  await showRecorded(page);
  const view = page.locator('[data-view=debrief]');

  // page 1: six tiles, the course with seven numbered moments and one pulseless band
  const tiles = await view.locator('#db-keytimes .db-tile').evaluateAll((t) => t.map((x) => [x.getAttribute('data-key'), x.querySelector('.db-tile-v')?.textContent]));
  expect(tiles).toEqual([['recognition', '–'], ['firstTeam', '7 min 51 s'], ['objective:1', '3 s'], ['objective:2', '1 min 30 s'], ['objective:3', '2 s'], ['pulseless', '3 min 07 s']]);
  await expect(view.locator('#db-keytimes [data-key=recognition] .db-tile-sub')).toHaveText('not ticked');
  await expect(view.locator('#db-course .db-badge')).toHaveCount(7);
  await expect(view.locator('#db-course rect.db-pulseless')).toHaveCount(4); // the band, in each of the four panels
  await expect(view.locator('#db-course .db-legend')).toHaveText('▼ team action · ▼ patient event · ▽ scenario state · numbers match Key moments · marks: bookmark'); // the recording's bookmark at 00:13
  await expect(view.locator('#db-course g.db-bm')).toHaveCount(1);
  await expect(view.locator('#db-objectives .db-measure')).toHaveText(['3 s of 10 s', '1 min 30 s of 2 min 00 s', '2 s of 30 s']);
  expect(await view.locator('#db-steps tbody tr').count(), 'IP8: the steps section is in the report measured below').toBeGreaterThan(0);

  // page 2: the key moments with SpO₂ as the monitor showed it (E126: this rc.2 record kept the oximeter's reading through
  // the pulseless span, CPR having begun 3 s after the loss), and the sentence that says what it means
  const moments = await view.locator('#db-moments tbody tr[data-n]').evaluateAll((tr) => tr.map((x) => [...x.querySelectorAll('td')].map((td) => td.textContent?.trim())));
  expect(moments.map((m) => [m[0], m[1], m[8]])).toEqual([['1', '06:13', '99'], ['2', '07:48', '99'], ['3', '07:51', '99'], ['4', '09:21', '99'], ['5', '10:55', '99'], ['6', '10:57', '99'], ['7', '11:27', '99']]);
  expect(moments.map((m) => m[6])).toEqual(['71', '21', '20', '28', '45', '63', '90']); // MAP rounded
  // D6: this rc.2 export predates the pressures and the alarm ends: "·" in SBP/DBP and CVP, one "not recorded" line
  expect(moments.map((m) => [m[5], m[7]])).toEqual(Array.from({ length: 7 }, () => ['·', '·']));
  await expect(view.locator('#db-moments .db-norecord')).toHaveCount(1);
  await expect(view.locator('#db-moments .db-note60')).toHaveCount(1);
  await expect(view.locator('#db-moments .db-note60')).toHaveText('SpO₂ as the monitor showed it: – while pulseless without compressions (no pulsatile signal); a number during CPR reflects compression-generated flow and is unreliable.'); // the owner's ruling E126, 2026-10-26 (was E60, 2026-10-19)
  await expect(view.locator('#db-moments tr.db-alarms').first()).toHaveText(/Alarms since the last row: CVP high, SpO₂: low perfusion, ART S low/);

  // D7b: page 2 opens with the swimlane — one window row per timed objective, each tick with its verdict words
  await expect(view.locator('#db-swimlane h2')).toHaveText('The run, lane by lane');
  await expect(view.locator('#db-swimlane .db-legend')).toContainText('▭ expected window, │ the act, with its verdict');
  expect(await swimRows(page)).toEqual([{ label: 'Objective 2', words: ['✓ Observed'] }, { label: 'Objective 3', words: ['✓ Observed'] }, { label: 'Objective 4', words: ['✓ Observed'] }]);
  await expect(view.locator('#db-swimlane svg')).toHaveAttribute('aria-label', /expected windows: Objective 2, 07:48 to 07:58: 07:51 ✓ Observed; Objective 3/);

  // (g) typing in Run by and Notes across a 5 s refresh: the text and the caret stay
  const who = view.locator('#db-who');
  await who.click();
  await page.keyboard.type('Dr A');
  await page.waitForTimeout(5_600);
  await page.keyboard.type(', Dr B');
  await expect(who).toHaveValue('Dr A, Dr B');
  await expect(view.locator('.db-runby')).toHaveText('Dr A, Dr B');
  const notes = view.locator('.db-notes');
  await notes.click();
  await page.keyboard.type('first');
  await page.waitForTimeout(5_600);
  await page.keyboard.type(' second');
  await expect(notes).toHaveText('first second');

  // the button: the handout mode for the print, cleared after it, the file name from the case
  await page.evaluate(() => {
    window.print = () => {
      (window as unknown as { printed: unknown }).printed = [document.querySelector('.debrief')?.getAttribute('data-print'), document.title];
      dispatchEvent(new Event('afterprint'));
    };
  });
  await view.getByRole('button', { name: 'Print the learner handout' }).click();
  await expect.poll(() => page.evaluate(() => !!(window as unknown as { printed?: string[] }).printed)).toBe(true); // rc.3: printed once the print font is loaded
  const printed = await page.evaluate(() => (window as unknown as { printed: string[] }).printed);
  expect(printed[0]).toBe('handout');
  expect(printed[1]).toMatch(/^Learner handout Stab wound: tamponade, PEA and pericardiocentesis \d{4}-\d\d-\d\d$/);
  await expect(page.locator('.debrief')).not.toHaveAttribute('data-print');

  // (f) print media at the 182 mm content width: page 1 and the handout each within one A4 page (267 mm)
  await page.emulateMedia({ media: 'print' });
  await printFontLoaded(page);
  const report = await printHeights(page);
  expect(report.printFont, 'the bundled print font is loaded').toBe(true);
  expect(report.page1, 'page 1 (mm)').toBeLessThanOrEqual(267);
  const sw = await swimPrint(page);
  expect(sw).toMatchObject({ next: 'db-moments', breakBefore: 'page', breakInside: 'avoid', momentsBreak: 'auto' });
  expect(sw.heightMm, 'the swimlane (mm)').toBeLessThanOrEqual(90);
  test.info().annotations.push({ type: 'A3.1 swimlane (mm)', description: `${sw.heightMm.toFixed(1)} high at ${sw.widthMm.toFixed(1)} wide` });
  await expect(view.locator('#db-handout')).toBeHidden(); // never with the report
  const foot = (await view.locator('.db-foot').textContent()) ?? '';
  let reportPdf: Buffer | null = null;
  if (browserName === 'chromium') reportPdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });

  // (e) the handout alone, no verdict and no objective in its visible text (a DOM check, both engines, every platform)
  await page.evaluate(() => document.querySelector('.debrief')?.setAttribute('data-print', 'handout'));
  const seen = await page.evaluate(() => {
    const d = document.querySelector('.debrief') as HTMLElement;
    const shown = [...d.querySelectorAll('.page > *')].filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.id || e.className);
    return { text: d.innerText, shown };
  });
  expect(seen.shown).toEqual(browserName === 'webkit' ? ['db-handout', 'db-foot db-runfoot'] : ['db-handout']); // the footer: margin boxes or Safari's line
  expect(seen.text).toContain('Questions to think about');
  const take = JSON.parse(readFileSync(TAMPONADE, 'utf8')).takeHome as string[];
  expect(take).toHaveLength(3); // the owner's confirmed lines (rc.3), printed as written instead of the blank lines
  for (const t of take) expect(seen.text).toContain(t);
  expect(seen.text).not.toContain('Your take-home points');
  expect(seen.text).not.toMatch(VERDICT);
  for (const o of JSON.parse(readFileSync(TAMPONADE, 'utf8')).objectives as Array<{ text: string }>) expect(seen.text).not.toContain(o.text);
  if (browserName === 'webkit') expect(seen.text).toContain(foot); // Safari's footer line (Chromium prints it in the margin)
  const ho = await printHeights(page);
  expect(ho.handout, 'handout (mm)').toBeLessThanOrEqual(267);
  expect(ho.stripPt, 'handout course labels (pt)').toBeGreaterThanOrEqual(6); // rc.3: were ≈ 3.2 pt
  mkdirSync(out, { recursive: true });
  await page.screenshot({ path: `${out}/debrief-b-handout-${browserName}.png`, fullPage: true });
  test.info().annotations.push({ type: 'A3.1 heights (mm)', description: `page 1 ${report.page1.toFixed(1)}, handout ${ho.handout.toFixed(1)}` });

  if (browserName === 'chromium' && reportPdf) {
    const handoutPdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
    writeFileSync(`${out}/debrief-b-a31.pdf`, reportPdf);
    writeFileSync(`${out}/debrief-b-a31-handout.pdf`, handoutPdf);
    const pages = pdfInfo(reportPdf).boxes.length;
    test.info().annotations.push({ type: 'A3.1 pages', description: String(pages) });
    expect(pages).toBeLessThanOrEqual(7); // B6 Step 3: measured, expected 6–7 (Review Focus 6)
    expect(pdfInfo(handoutPdf).boxes).toHaveLength(1);
    if (process.platform === 'darwin' || process.env.PME_PDF_TEXT === '1') {
      // (a) page 1 holds the key times, the course and every objective; (c) the handout's one page, its footer, no verdict
      const page1 = squash(pdfText(reportPdf).text.split('\f')[0] ?? '');
      for (const want of ['Key times', 'The course', ...(JSON.parse(readFileSync(TAMPONADE, 'utf8')).objectives as Array<{ text: string }>).map((o) => o.text)]) expect(page1, want).toContain(squash(want));
      const h = pdfText(handoutPdf);
      expect(h.pages).toBe(1);
      expect(squash(h.text)).toContain(squash('Questions to think about'));
      expect(squash(h.text)).toContain(squash(foot));
      expect(squash(h.text)).toContain(squash('Page 1 of 1'));
      expect(h.text).not.toMatch(VERDICT);
    }
  }
});

// B6 (f) on the malignant hyperthermia card (six objectives, E52), on its recorded full run (R-B C2): page 1 and the
// learner handout each within one A4 page, both engines; Chromium prints the handout on one page.
test('Debrief B on the MH card: page 1 and the handout within one A4 page', async ({ page, browserName }) => {
  test.setTimeout(90_000);
  await showRecorded(page, MH_RUN, MH);
  const view = page.locator('[data-view=debrief]');
  await expect(view.locator('#db-objectives li')).toHaveCount(6);
  await expect(view.locator('#db-keytimes [data-key=recognition]')).toBeVisible(); // the MH recognition objective (E52)
  expect((await swimRows(page)).map((r) => r.label)).toEqual(['Objective 2', 'Objective 3']); // the two eventWithin objectives whose anchor came
  expect(await view.locator('#db-steps tbody tr').count(), 'IP8: the steps section is in the report').toBeGreaterThan(0);
  await page.emulateMedia({ media: 'print' });
  await printFontLoaded(page);
  const { page1, printFont } = await printHeights(page);
  await page.evaluate(() => document.querySelector('.debrief')?.setAttribute('data-print', 'handout'));
  const { handout, stripPt } = await printHeights(page);
  expect(printFont, 'the bundled print font is loaded').toBe(true);
  expect(stripPt, 'handout course labels (pt)').toBeGreaterThanOrEqual(6);
  test.info().annotations.push({ type: 'MH heights (mm)', description: `page 1 ${page1.toFixed(1)}, handout ${handout.toFixed(1)}` });
  expect(page1, 'page 1 (mm)').toBeLessThanOrEqual(267);
  expect(handout, 'handout (mm)').toBeLessThanOrEqual(267);
  if (browserName === 'chromium') {
    mkdirSync(out, { recursive: true });
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
    writeFileSync(`${out}/debrief-b-mh-handout.pdf`, pdf);
    expect(pdfInfo(pdf).boxes).toHaveLength(1);
    await page.evaluate(() => document.querySelector('.debrief')?.removeAttribute('data-print'));
    const report = await page.pdf({ preferCSSPageSize: true, printBackground: false });
    writeFileSync(`${out}/debrief-b-mh.pdf`, report);
    test.info().annotations.push({ type: 'MH pages', description: String(pdfInfo(report).boxes.length) });
  }
});

// E132 on the haemorrhage card (its recorded A4 run: 21 key moments, the three take-home lines): the learner handout
// within one A4 page, both engines; Chromium prints it on one page (#133's compact layout for a long Key moments table).
test('Debrief B on the haemorrhage card: the learner handout within one A4 page', async ({ page, browserName }) => {
  test.setTimeout(90_000);
  await showRecorded(page, HAEM_RUN, HAEM);
  const view = page.locator('[data-view=debrief]');
  await expect(view.locator('.db-hmoments tbody tr[data-n]')).toHaveCount(21);
  await page.emulateMedia({ media: 'print' });
  await printFontLoaded(page);
  await page.evaluate(() => document.querySelector('.debrief')?.setAttribute('data-print', 'handout'));
  const { handout } = await printHeights(page);
  test.info().annotations.push({ type: 'haemorrhage handout (mm)', description: handout.toFixed(1) });
  expect(handout, 'handout (mm)').toBeLessThanOrEqual(267);
  if (browserName === 'chromium') {
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
    mkdirSync(out, { recursive: true });
    writeFileSync(`${out}/debrief-b-haemorrhage-handout.pdf`, pdf);
    expect(pdfInfo(pdf).boxes).toHaveLength(1);
  }
});

// Plan F11 (F7's acceptance on a live /2 run): the MH card in pme-scenario/2 driven on the demo path from Instructor v2
// to the talk's end, paused, then the Debrief: its JSON export is pme-debrief/3 (phases, graded actions, outcomes,
// violations; no /2 objectives, steps or judged rows), the action table is in the report, and in print media at the
// 182 mm content width page 1 and the learner handout each fit one A4 page (≤ 267 mm, IP8); Chromium prints the
// handout on one page. Both engines. The instructor presses the recognition at the call, 08:12: a timed record action
// since the owner's ruling of 5 November retired judged rows, its window from Early signs' entry, as the /1 card's
// recognition runs from its "early signs" state (brief fv2-debrief-recognition-clock-nov1 and the ruling the same day),
// met in seconds, not from the pre-intubation EtCO₂ of 03:51.
test('a /2 MH run: the Debrief exports pme-debrief/3, page 1 and the handout within one A4 page', async ({ page, browserName }) => {
  test.setTimeout(480_000);
  await openMhV2(page, (h) => openApp(page, base, h, { warmMs: 1500 }));
  const CALL = PATH.findIndex(([, x]) => x.startsWith('MH crisis'));
  await pressPath(page, (i) => i <= CALL);
  await page.locator('.ip2-action button.ip2-row').filter({ has: page.locator('.ip2-row-title', { hasText: 'Name malignant hyperthermia' }) }).first().click();
  await pressPath(page, () => true, CALL + 1);
  await to(page, END_S);
  await page.locator('.ip2-head button.ip2-pill').click(); // Instructor v2's clock pill pauses (it has no session bar)
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__pmeApp.link.ctl.hostPaused), { timeout: 20_000, message: 'the host has paused' }).toBe(true);
  await page.setViewportSize({ width: Math.round(182 * MM), height: 1000 }); // the A4 content width (182 mm)
  await page.evaluate(() => (location.hash = '#/debrief'));
  const view = page.locator('[data-view=debrief]');
  await expect(view.getByRole('heading', { level: 1, name: 'Debrief' })).toBeVisible({ timeout: 10_000 });
  await expect(view.locator('#db-actions tbody tr.db-act').first()).toBeVisible();
  await expect(view.locator('#db-steps')).toHaveCount(0); // a /2 run has the action table instead

  const [dl] = await Promise.all([page.waitForEvent('download'), view.getByRole('button', { name: 'Download the record (JSON)' }).click()]);
  expect(dl.suggestedFilename()).toMatch(/^debrief-showcase-mh-v2-\d{4}-\d\d-\d\d\.json$/);
  const j = JSON.parse(readFileSync(await dl.path(), 'utf8')) as Record<string, unknown> & { phases: Array<{ id?: string; phaseId?: string }>; actions: Array<{ id: string; grade: string; dueT: number | null; givenT: number | null }> };
  expect(j.schema).toBe('pme-debrief/3');
  for (const k of ['version', 'build', 'record', 'phases', 'actions', 'outcomes', 'violations', 'facts', 'keyTimes', 'keyMoments', 'minutes', 'marks']) expect(j, `pme-debrief/3 key ${k}`).toHaveProperty(k);
  for (const k of ['objectives', 'steps', 'judged']) expect(j, `no /2 key ${k}`).not.toHaveProperty(k);
  expect(j.phases.length, 'the phases entered').toBeGreaterThan(1);
  expect(j.actions.length, 'the graded actions').toBeGreaterThan(0);
  expect(j.actions.filter((a) => a.givenT !== null).map((a) => a.id)).toEqual(expect.arrayContaining(['callCrisis', 'dantrolene', 'ventilationBack'])); // the setup actions (induce …) are not graded on this card
  // the owner's phase rules of 1 November: Recrudescence is entered (14:59) and opens the second dose's window, so the
  // second dose at 19:13 is met, as the /1 card's objective 4
  expect(Object.fromEntries(j.actions.filter((a) => ['callCrisis', 'dantrolene', 'dantroleneAgain', 'ventilationBack'].includes(a.id)).map((a) => [a.id, a.grade]))).toEqual({ callCrisis: 'met', dantrolene: 'met', dantroleneAgain: 'met', ventilationBack: 'met' });
  // the recognition, a record action: its window from Early signs' entry, pressed at the call; D5: the card marks it
  // recognition: true, so the recognition tile is that action (its window, its press)
  const rec = j.actions.find((a) => a.id === 'nameMh');
  const earlyT = (j.phases as Array<{ id: string; t: number }>).find((p) => p.id === 'earlySigns')?.t;
  test.info().annotations.push({ type: 'MH /2 recognition', description: `nameMh ${rec?.grade}: window ${rec?.dueT} → pressed ${rec?.givenT}` });
  expect(rec?.grade).toBe('met');
  expect(rec?.dueT, 'the window opens at Early signs\' entry, not at the pre-intubation EtCO₂').toBe(earlyT);
  expect((rec?.givenT ?? Infinity) - (rec?.dueT ?? 0), 'seconds, not minutes').toBeLessThan(60);
  expect((j.keyTimes as Array<{ id: string; fromT: number | null; toT: number | null; grade?: string }>).find((k) => k.id === 'recognition')).toMatchObject({ fromT: rec?.dueT, toT: rec?.givenT, grade: 'met' });
  const results = resolve(import.meta.dirname, '../../../test-results');
  mkdirSync(results, { recursive: true });
  writeFileSync(`${results}/debrief-mh-v2-${browserName}.json`, JSON.stringify(j, null, 1));
  test.info().annotations.push({ type: 'MH /2 grades', description: j.actions.map((a) => `${a.id}:${a.grade}`).join(' ') });

  // D7b: one window row per graded action with a window opened (report3's dueT), each act's grade words beside its tick
  const timed = (j.actions as unknown as Array<{ label: string; dueT: number | null; givenT: number | null; firstGrade: string }>).filter((a) => a.dueT !== null);
  const rows = await swimRows(page);
  test.info().annotations.push({ type: 'MH /2 windows', description: `${rows.length}: ${rows.map((r) => `${r.label} ${r.words.join(' ')}`).join('; ')}` });
  expect(rows.map((r) => r.label)).toEqual(timed.map((a) => a.label));
  const GRADE: Record<string, string> = { met: '✓ met', deviation: '◆ deviation', overdue: '! overdue', failed: '✗ failed', due: '… due', 'not applicable': '– not applicable' };
  timed.forEach((a, i) => expect(rows[i]?.words[0], a.label).toBe(GRADE[a.firstGrade]));

  await page.emulateMedia({ media: 'print' });
  await printFontLoaded(page);
  const { page1, printFont } = await printHeights(page);
  // D6, page 2 on a record of this build (the pressures and alarm ends kept): the key-moments table with its ten
  // columns fits the 182 mm content width, and no Who cell wraps (else the plan drops its word to the shape alone)
  const p2 = await page.evaluate((mm) => {
    const sec = document.querySelector('#db-moments') as HTMLElement;
    const table = sec.querySelector('table.db-moments') as HTMLElement;
    const who = [...sec.querySelectorAll('td.db-whocell')].map((td) => { // the lines its words take (not the row's height)
      const r = document.createRange();
      r.selectNodeContents(td);
      return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size;
    });
    const bp = [...sec.querySelectorAll('tbody tr[data-n]')].map((tr) => tr.querySelectorAll('td')[5]?.textContent ?? '');
    return { section: sec.getBoundingClientRect().width / mm, table: table.getBoundingClientRect().width / mm, height: sec.getBoundingClientRect().height / mm, whoLines: Math.max(...who), bp };
  }, MM);
  test.info().annotations.push({ type: 'MH /2 page 2 (mm)', description: `key moments ${p2.height.toFixed(1)} tall, table ${p2.table.toFixed(1)} of ${p2.section.toFixed(1)} wide, Who cells ≤ ${p2.whoLines} line(s); SBP/DBP ${p2.bp.join(' | ')}` });
  expect(p2.height, 'the key-moments section is laid out in print').toBeGreaterThan(0);
  expect(p2.whoLines, 'no Who cell wraps').toBe(1);
  expect(p2.table, 'the key-moments table within the content width (mm)').toBeLessThanOrEqual(p2.section + 0.5);
  expect(p2.bp.some((x) => /^\d+\/\d+/.test(x)), 'an SBP/DBP printed on this run (arterial, or the cuff with its age)').toBe(true);
  const sw = await swimPrint(page);
  test.info().annotations.push({ type: 'MH /2 swimlane (mm)', description: `${sw.heightMm.toFixed(1)} high at ${sw.widthMm.toFixed(1)} wide, ${rows.length} windows` });
  expect(sw).toMatchObject({ next: 'db-moments', breakBefore: 'page', breakInside: 'avoid', momentsBreak: 'auto' });
  if (rows.length <= 6) expect(sw.heightMm, 'the swimlane (mm)').toBeLessThanOrEqual(90);
  await page.evaluate(() => document.querySelector('.debrief')?.setAttribute('data-print', 'handout'));
  const { handout } = await printHeights(page);
  test.info().annotations.push({ type: 'MH /2 heights (mm)', description: `page 1 ${page1.toFixed(1)}, handout ${handout.toFixed(1)}` });
  expect(printFont, 'the bundled print font is loaded').toBe(true);
  expect(page1, 'page 1 (mm)').toBeLessThanOrEqual(267);
  expect(handout, 'handout (mm)').toBeLessThanOrEqual(267);
  if (browserName === 'chromium') {
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
    mkdirSync(out, { recursive: true });
    writeFileSync(`${out}/debrief-mh-v2-handout.pdf`, pdf);
    expect(pdfInfo(pdf).boxes).toHaveLength(1);
    await page.evaluate(() => document.querySelector('.debrief')?.removeAttribute('data-print'));
    const report = await page.pdf({ preferCSSPageSize: true, printBackground: false });
    writeFileSync(`${out}/debrief-mh-v2.pdf`, report);
    test.info().annotations.push({ type: 'MH /2 pages', description: String(pdfInfo(report).boxes.length) });
  }
});

// Debrief 2, D5: the /1 fallback press. On a free run the session bar's "Recognised" writes one note row with the run
// event 'recognised' at the host's time; the Debrief's recognition tile and its key moment read that time.
test('D5: Recognised pressed on a free run at ≈ 30 s: the Debrief shows the tile and the key moment at the recorded time', async ({ page, browserName }) => {
  const busy = loadedWebKit(browserName);
  test.setTimeout(busy ? 180_000 : 90_000);
  await openApp(page, base, '#/teach2', { warmMs: 1500 });
  await speedV2(page, busy ? 2 : 4);
  await expect.poll(() => simT(page), { timeout: busy ? 60_000 : 30_000 }).toBeGreaterThanOrEqual(30);
  const button = page.locator('.ip2-dock').getByRole('button', { name: 'Recognised', exact: true }); // the dock's copy
  await expect(button).not.toHaveAttribute('aria-keyshortcuts');
  await button.click();
  type R = { __pmeApp: { session: { record: { data: { rows: Array<{ t: number; ev?: string }> } } } } };
  await expect.poll(() => page.evaluate(() => (window as unknown as R).__pmeApp.session.record.data.rows.filter((r) => r.ev === 'recognised').length)).toBe(1);
  const t = await page.evaluate(() => (window as unknown as R).__pmeApp.session.record.data.rows.find((r) => r.ev === 'recognised')?.t as number);
  expect(t).toBeGreaterThanOrEqual(30);
  expect(t).toBeLessThan(60);
  await pauseHost(page);
  await openDebrief(page, busy);
  const view = page.locator('[data-view=debrief]');
  const mmss = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const tile = view.locator('#db-keytimes [data-key=recognition]');
  await expect(tile.locator('.db-tile-cap')).toHaveText("Recognition (instructor's press)");
  await expect(tile.locator('.db-tile-v')).toHaveText(`${Math.round(t)} s`);
  await expect(tile.locator('.db-tile-sub')).toHaveText(`00:00 start → ${mmss} pressed`);
  const row = view.locator('#db-moments tbody tr[data-recognised]');
  await expect(row).toHaveCount(1);
  await expect(row.locator('td').nth(1)).toHaveText(mmss);
  await expect(row.locator('td').nth(3)).toHaveText('Recognised (instructor)');
});
