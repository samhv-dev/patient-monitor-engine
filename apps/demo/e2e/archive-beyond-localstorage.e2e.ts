// N39 (9 November): in Safari, after a week of use, "Finish the case" answered "The debrief could not be saved: this
// browser's storage is full or blocked" on every button. The archive kept each debrief's JSON in localStorage, and a
// body is the whole run record (one sample a second); five debriefs, one of a 138-minute run, had filled the 5 MiB
// WebKit allows. The bodies now live in IndexedDB (archive.ts). This test, on both engines: an earlier build's archive
// in localStorage moves to IndexedDB on first use; the browser's own localStorage, probed with the body of a real
// 25-minute run, refuses after a handful of copies (WebKit counts 2 bytes a character for a body with a ₂ in it); the
// archive then holds more debriefs than that localStorage could, and a real "Finish the case" still saves; a reload keeps
// them all, and a saved debrief opens.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type Meta = { id: string; resident: string; bytes?: number };
type A = {
  backend: string | null;
  list(): Meta[];
  holdsLine(): string;
  ready(): Promise<unknown>;
  debrief(id: string): Promise<string | null>;
  save(d: unknown, who: string, build: string, at?: number): Promise<Meta | { refused: string; detail: string }>;
};
type W = { __pmeApp: { archive: A } };
const arc = <T>(p: Page, fn: (a: A) => T | Promise<T>) => p.evaluate(`(async () => (${fn.toString()})(window.__pmeApp.archive))()`) as Promise<Awaited<T>>;
/** The units every localStorage key and value of this origin holds. */
const lsUnits = (p: Page) => p.evaluate(() => Object.keys(localStorage).reduce((n, k) => n + k.length + (localStorage.getItem(k) ?? '').length, 0));

// a committed kit-round export of the 25-minute mh-early-call run (1507 samples): its JSON is a debrief body as an
// earlier build kept it, and its record is a real run to save again
const FIXTURE = readFileSync(resolve(import.meta.dirname, '../src/app/__fixtures__/debrief-2/mh-early-call-a4-v2.json'), 'utf8');
const BODY = JSON.stringify(JSON.parse(FIXTURE));
const RECORD = (JSON.parse(FIXTURE) as { record: { startedAt: number } }).record;

test('N39: the archive outgrows a full localStorage; an earlier build\'s debriefs move to IndexedDB; Finish the case still saves', async ({ page, browserName }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, base, '#/teach2', { warmMs: 500 });

  // 1. an earlier build's archive: the index (no sizes) and two bodies under their own localStorage keys
  const legacy = [
    { id: 'old1', runStartedAt: RECORD.startedAt - 86_400_000, resident: 'Dr Old One', cardId: 'showcase-mh', title: 'Malignant hyperthermia', savedAt: Date.now() - 3 * 86_400_000, durationS: 1507, objectives: { met: 1, total: 2, notMet: 0, notAssessable: 1 } },
    { id: 'old2', runStartedAt: RECORD.startedAt - 43_200_000, resident: 'Dr Old Two', cardId: 'showcase-mh', title: 'Malignant hyperthermia', savedAt: Date.now() - 2 * 86_400_000, durationS: 1507, objectives: { met: 1, total: 2, notMet: 0, notAssessable: 1 } },
  ];
  await page.evaluate(([index, body]) => {
    localStorage.setItem('pme.archive', index as string);
    for (const id of ['old1', 'old2']) localStorage.setItem(`pme.archive.${id}`, body as string);
  }, [JSON.stringify(legacy), BODY]);
  await page.reload();
  await page.waitForFunction(() => '__pmeApp' in window);
  await arc(page, (a) => a.ready());
  expect(await arc(page, (a) => a.backend)).toBe('indexeddb');
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('pme.archive.')))).toEqual([]);
  expect(await arc(page, (a) => Promise.all(['old1', 'old2'].map((id) => a.debrief(id))))).toEqual([BODY, BODY]);
  expect(await arc(page, (a) => a.holdsLine())).toBe(`2 saved · ${Math.round((2 * new TextEncoder().encode(BODY).length) / 1e3)} kB`);

  // 2. before: this browser's own localStorage, filled with copies of that body until it refuses
  const probe = await page.evaluate((body) => {
    let n = 0;
    let error = '';
    try {
      for (; n < 100; n++) localStorage.setItem(`n39.probe.${n}`, body);
    } catch (e) {
      error = (e as Error).name;
    }
    for (let i = 0; i <= n; i++) localStorage.removeItem(`n39.probe.${i}`);
    return { n, error };
  }, BODY);
  console.log(`n39-probe ${browserName}: localStorage took ${probe.n} copies of a ${BODY.length}-unit body (${((probe.n * BODY.length) / 1e6).toFixed(2)} M units), then ${probe.error}`);
  expect(probe.error).toBe('QuotaExceededError');
  expect(probe.n, 'a 5 MB localStorage refuses well before 24 debriefs of a 25-minute run').toBeLessThan(24);

  // 3. after: 24 more debriefs of that run, more than that localStorage held, and localStorage keeps the index only
  const saved = await page.evaluate(async (d) => {
    const a = (window as unknown as W).__pmeApp.archive;
    const out: string[] = [];
    for (let i = 0; i < 24; i++) {
      const r = await a.save({ ...(d as object), startedAt: (d as { startedAt: number }).startedAt + (i + 1) * 3_600_000 }, `Dr ${i + 1}`, 'e2e');
      out.push('refused' in r ? `refused ${r.refused} (${r.detail})` : 'saved');
    }
    return out;
  }, RECORD);
  expect(saved).toEqual(Array(24).fill('saved'));
  const bytes = await arc(page, (a) => a.list().reduce((n, e) => n + (e.bytes ?? 0), 0));
  expect(bytes, 'more JSON than any 5 MB localStorage holds').toBeGreaterThan(5_242_880);
  expect(await lsUnits(page), 'localStorage: the index and the app\'s own few keys').toBeLessThan(60_000);

  // 4. a real "Finish the case" on a running card still saves, and the pane says how much the archive holds
  await openApp(page, base, '?scenario=showcase-mh#/teach2', { warmMs: 1500 });
  await page.waitForFunction(() => !!(window as unknown as { __pmeApp: { link: { ctl: { scenario: { doc: unknown } } } } }).__pmeApp.link.ctl.scenario.doc, null, { timeout: 30_000 });
  await page.locator('.ip2-dock .ip2-finish-btn').click();
  await expect(page.locator('.ip2-finish')).toBeVisible();
  await expect(page.locator('.ip2-finish-archive .ip2-arc-count')).toHaveText(/^Archive · 24 saved today · 26 saved · \d+\.\d MB$/);
  await page.locator('.ip2-finish-resident').fill('Dr After');
  await page.locator('.ip2-finish-close').click();
  await expect(page.locator('.ip2-finish')).toBeHidden();
  await expect(page.locator('.toast').filter({ hasText: 'could not be saved' })).toHaveCount(0);
  expect(await arc(page, (a) => a.list().length)).toBe(27);
  expect(await arc(page, (a) => a.list().at(-1)?.resident)).toBe('Dr After');

  // 5. a reload keeps them all; a migrated and a new debrief open from the archive
  await page.reload();
  await page.waitForFunction(() => '__pmeApp' in window);
  expect(await arc(page, (a) => a.list().length)).toBe(27);
  await page.evaluate(() => (location.hash = '#/debrief/archive/old1'));
  await expect(page.locator('.db-viewing')).toHaveText(/^Saved debrief 1: Dr Old One · Malignant hyperthermia, saved at \d\d:\d\d\. Back to the current run$/);
  await expect(page.locator('#db-archive .db-arc-count')).toHaveText(/^27 saved · \d+\.\d MB, 25 today · kept in this browser until you clear it$/);
  const last = await arc(page, (a) => a.list().at(-2)?.id);
  await page.evaluate((id) => (location.hash = `#/debrief/archive/${id}`), last);
  await expect(page.locator('.db-viewing')).toHaveText(/^Saved debrief 26: Dr 24 · /);
  console.log(`n39-after ${browserName}: ${JSON.stringify({ entries: 27, bytes, localStorageUnits: await lsUnits(page), probe })}`);
});
