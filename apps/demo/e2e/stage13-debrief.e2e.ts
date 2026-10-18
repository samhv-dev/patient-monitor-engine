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
import { openApp, scanEngineIds, startVite } from './stage9-support.ts';

const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/stage-13' : '../../../test-results/gate-shots/stage-13'); // FU-11 K1: evidence only on request
let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { link: { simT: number }; engineIds: string[] } };
const simT = (page: Page) => page.evaluate(() => (window as unknown as W).__pmeApp.link.simT);

test('a showcase run ends in a debrief that prints (timeline, facts, objectives)', async ({ page, browserName }) => {
  test.setTimeout(180_000);
  await openApp(page, base, '?scenario=showcase-anaphylaxis', { warmMs: 1500 });
  await page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: '×4' }).click();
  await page.click('[role=tab][data-tab=scenario]');
  await page.locator('.sessionbar').getByRole('button', { name: 'Bookmark' }).click();
  await expect.poll(() => simT(page), { timeout: 40_000 }).toBeGreaterThan(70); // the reaction starts at 60 s
  await page.getByRole('button', { name: 'Return here' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Return' }).click();
  await expect.poll(() => simT(page), { timeout: 5_000 }).toBeLessThan(20);
  const give = page.getByRole('button', { name: 'Give epinephrine 100 µg' });
  await expect(give).toBeHidden(); // the panel repaints at ≤ 2 Hz: the first reaction's button goes first
  await expect(give).toBeVisible({ timeout: 40_000 }); // the reaction again, 60 s after the bookmark's state began
  await give.click();

  // the end of the run: the session bar's Debrief is marked and a toast says so
  const open = page.locator('.sessionbar').getByRole('link', { name: 'Debrief' });
  await expect(open).toHaveAttribute('data-ready', 'true', { timeout: 10_000 });
  await expect(page.locator('.toast', { hasText: 'the debrief is ready' })).toBeVisible();
  await page.waitForTimeout(6000); // ≈ 24 s of sim after the epinephrine: its effect reaches the trends
  await open.click();
  const view = page.locator('[data-view=debrief]');
  await expect(view.getByRole('heading', { level: 1, name: 'Debrief' })).toBeVisible();

  const timeline = await view.locator('#db-timeline tbody tr').allInnerTexts();
  const rows = timeline.map((r) => r.replace(/\s+/g, ' ').trim());
  const has = (re: RegExp) => rows.filter((r) => re.test(r));
  expect(has(/^\d\d:\d\d Scenario Scenario loaded: Anaphylaxis under anaesthesia$/)).toHaveLength(1);
  expect(has(/^\d\d:\d\d Bookmark Bookmark: Bookmark \d+ at \d\d:\d\d$/)).toHaveLength(1);
  expect(has(/^01:0\d Scenario Scenario state: Anaphylaxis — undone by return 1$/)).toHaveLength(1); // DV-3: the 60 s state may land in a later second on a slow runner
  expect(has(/^\d\d:\d\d Return Returned to bookmark Bookmark \d+ at \d\d:\d\d$/)).toHaveLength(1);
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
  expect(objectives).toEqual([['not assessable', '– Not assessable'], ['met', '✓ Met'], ['not met', '✗ Not met']]);
  await expect(view.locator('#db-objectives li').nth(1)).toContainText(/Epinephrine \d+ s after the state "Anaphylaxis" \(01:0\d → 01:\d\d; within 2 min 00 s asked\)/);
  await expect(view.locator('.db-chart svg')).toHaveCount(6);
  const minuteRows = await view.locator('#db-minutes tbody tr').allInnerTexts(); // Q1: one row per minute
  expect(minuteRows.length).toBeGreaterThanOrEqual(2); // the kept course is ≈ 1½–2 sim-min
  expect(minuteRows[0]).toMatch(/^00:00\s+\d+/);
  await expect(view.locator('#db-minutes thead th')).toHaveCount(12);
  // R56: no engine id in the report (as stage9-glossary: an id that is also an English word, "epinephrine", is not a leak)
  const ids = (await page.evaluate(() => (window as unknown as W).__pmeApp.engineIds)).filter((id) => /[A-Z0-9]/.test(id));
  expect(await scanEngineIds(page, ids)).toEqual([]);

  await view.getByRole('textbox', { name: 'Run by' }).fill('Dr Instructor, two residents');
  await view.getByRole('textbox', { name: 'Notes' }).fill('Good closed-loop communication.');

  // Q3: the record as JSON — the same verdicts as the report; never the "Run by" line or the notes (Q2)
  const [dl] = await Promise.all([page.waitForEvent('download'), view.getByRole('button', { name: 'Download the record (JSON)' }).click()]);
  expect(dl.suggestedFilename()).toMatch(/^debrief-showcase-anaphylaxis-\d{4}-\d\d-\d\d\.json$/);
  const json = readFileSync(await dl.path(), 'utf8');
  const j = JSON.parse(json) as { schema: string; build: string; record: { rows: unknown[] }; objectives: Array<{ verdict: { status: string } }> };
  expect(j.schema).toBe('pme-debrief/1');
  expect(j.objectives.map((o) => o.verdict.status)).toEqual(['not assessable', 'met', 'not met']);
  expect(j.record.rows.length).toBeGreaterThanOrEqual(rows.length); // the run goes on while the view is open
  expect(json).not.toContain('Dr Instructor');
  expect(json).not.toContain('closed-loop');
  const build = j.build;
  await expect(view.locator('.db-foot')).toHaveText(`For education only. Not a medical device and not clinically validated: never use it for patient care. Version 1.0.0-rc.1 (pre-release), build ${build}.`);

  // print layout, both engines: only the report; trends and timeline on new pages; a chart never split
  await page.emulateMedia({ media: 'print' });
  const layout = await page.evaluate(() => {
    const vis = (s: string) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; };
    const css = (s: string, p: string) => getComputedStyle(document.querySelector(s) as Element).getPropertyValue(p);
    return {
      topbar: vis('.topbar'), stage: vis('.stage'), bar: vis('.sessionbar'), tools: vis('.db-tools'), report: vis('.debrief'),
      trends: css('#db-trends', 'break-before'), timeline: css('#db-timeline', 'break-before'), minutes: css('#db-minutes', 'break-before'),
      chart: css('.db-chart', 'break-inside'), ink: css('.db-svg path', 'stroke'), body: css('body', 'overflow'),
      undone: css('#db-timeline tbody tr.undone td', 'text-decoration-line'),
      // the footer on every page: @page margin boxes where the browser has them (Chromium), else a line before each break
      marginBoxes: [...(document.getElementById('db-page-style') as HTMLStyleElement).sheet?.cssRules ?? []].some((r) => ((r as CSSPageRule).cssRules?.length ?? 0) === 2),
      runFeet: [...document.querySelectorAll('.debrief .db-runfoot')].filter((e) => getComputedStyle(e).display !== 'none').length,
    };
  });
  const boxes = browserName === 'chromium';
  expect(layout).toEqual({ topbar: false, stage: false, bar: false, tools: false, report: true, trends: 'page', timeline: 'page', minutes: 'page', chart: 'avoid', ink: 'rgb(0, 0, 0)', body: 'visible', undone: 'line-through', marginBoxes: boxes, runFeet: boxes ? 0 : 4 });
  mkdirSync(out, { recursive: true });
  await page.screenshot({ path: `${out}/debrief-print-${browserName}.png`, fullPage: true });

  if (browserName === 'chromium') {
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
    writeFileSync(`${out}/debrief.pdf`, pdf);
    const info = pdfInfo(pdf); // every platform: no font read
    expect(info.title).toMatch(/^Debrief Anaphylaxis under anaesthesia \d{4}-\d\d-\d\d$/);
    expect(info.boxes.length).toBeGreaterThanOrEqual(5); // header, trends, timeline, appendix: at least five A4 pages
    for (const b of info.boxes) expect([Math.round(b[2] ?? 0), Math.round(b[3] ?? 0)]).toEqual([595, 842]);
    if (process.platform === 'darwin' || process.env.PME_PDF_TEXT === '1') {
      const { text, pages } = pdfText(pdf);
      expect(pages).toBe(info.boxes.length);
      const t = squash(text);
      for (const want of ['Debrief', 'Anaphylaxis under anaesthesia', 'Run by', 'Dr Instructor, two residents', 'Scenario state: Anaphylaxis — undone by return 1',
        'Epinephrine 100 µg IV', '✓ Met', '✗ Not met', '– Not assessable', 'Epinephrine, boluses in all', '100 µg (1 dose)', 'Good closed-loop communication.',
        'Appendix: one row per minute']) expect(t, want).toContain(squash(want));
      expect(text.split('\f')[0], 'objectives and facts on page 1').toContain('Measured facts');
      text.split('\f').forEach((p, i) => {
        expect(squash(p), `page ${i + 1}: the footer and the build`).toContain(squash(`For education only. Not a medical device and not clinically validated: never use it for patient care. Version 1.0.0-rc.1 (pre-release), build ${build}.`));
        expect(squash(p), `page ${i + 1}: its number`).toContain(squash(`Page ${i + 1} of ${pages}`));
      });
    } else test.info().annotations.push({ type: 'pdf text', description: 'not read on this platform (R50 I-2): page count, A4 and title only' });
  }
});
