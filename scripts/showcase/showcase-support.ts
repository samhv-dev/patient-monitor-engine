// Showcase kit proofs: helpers shared by the *.showcase.ts Playwright files (not a test file).
// The kit is served by its own launcher with the PERL server (globalSetup); values are read from the engine's
// `measurement` events through the app's `__pmeApp` hook (the same numbers the monitor shows, whichever skin).
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Page } from '@playwright/test';

export const REPO = resolve(import.meta.dirname, '../..');
// the video run keeps its own evidence out of docs/
export const OUT = process.env.SHOWCASE_VIDEO ? join(REPO, 'test-results/showcase-video-evidence') : join(REPO, 'docs/showcase');
export const base = (): string => {
  const b = process.env.SHOWCASE_BASE;
  if (!b) throw new Error('SHOWCASE_BASE not set: run through scripts/showcase/playwright.showcase.config.ts');
  return b;
};

export type Vals = Partial<Record<'hr' | 'abpSys' | 'abpDia' | 'abpMean' | 'spo2' | 'etco2' | 'rr' | 'awrr' | 'nibpSys', number | null>>;
export type Sample = { t: number } & Vals;

/** Errors and warnings the page logs, for the report (the app should log no error). */
export function watchConsole(page: Page): string[] {
  const errs: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(`console.error: ${m.text().slice(0, 300)}`));
  page.on('pageerror', (e) => errs.push(`pageerror: ${String(e.message).slice(0, 300)}`));
  return errs;
}

/** Open #/teach on a FRESH page load and wait for the app hook. */
export async function openTeach(page: Page, path = '/#/teach'): Promise<void> {
  await page.goto(base() + path);
  await page.waitForFunction(() => '__pmeApp' in window, null, { timeout: 30_000 });
  await page.waitForTimeout(1500);
}

/** Start recording measurements and alarms (reset on every call). */
export async function record(page: Page): Promise<void> {
  await page.evaluate(() => {
    type Ev = { type: string; t: number; values?: Record<string, { value: number | null }>; state?: string; text?: string };
    const w = window as unknown as { __rec?: { latest: Record<string, number | null>; hist: Array<Record<string, number | null>>; alarms: Array<{ t: number; text: string }>; off?: () => void }; __pmeApp: { session: { onEvent(fn: (e: Ev) => void): () => void } } };
    w.__rec?.off?.();
    const rec = { latest: {} as Record<string, number | null>, hist: [] as Array<Record<string, number | null>>, alarms: [] as Array<{ t: number; text: string }>, off: undefined as undefined | (() => void) };
    const keys = ['hr', 'abpSys', 'abpDia', 'abpMean', 'spo2', 'etco2', 'rr', 'awrr', 'nibpSys'];
    rec.off = w.__pmeApp.session.onEvent((e) => {
      if (e.type === 'measurement' && e.values) {
        const s: Record<string, number | null> = { t: e.t };
        for (const k of keys) {
          const m = e.values[k];
          if (m) {
            rec.latest[k] = m.value;
            s[k] = m.value;
          }
        }
        rec.hist.push(s);
      } else if (e.type === 'alarm' && e.state === 'raised' && e.text) rec.alarms.push({ t: e.t, text: e.text });
    });
    w.__rec = rec;
  });
}

export const simNow = (page: Page): Promise<number> => page.evaluate(() => (window as unknown as { __pmeApp: { session: { simNow(): number } } }).__pmeApp.session.simNow());
export const stateId = (page: Page): Promise<string | null> => page.evaluate(() => (window as unknown as { __pmeApp: { link: { ctl: { scenario: { stateId: string | null } } } } }).__pmeApp.link.ctl.scenario.stateId ?? null);
export const latest = (page: Page): Promise<Vals> => page.evaluate(() => (window as unknown as { __rec: { latest: Vals } }).__rec.latest);
export const hist = (page: Page, from = -Infinity, to = Infinity): Promise<Sample[]> =>
  page.evaluate(([a, b]) => (window as unknown as { __rec: { hist: Sample[] } }).__rec.hist.filter((s) => s.t >= a && s.t <= b), [from, to] as const);
export const alarms = (page: Page): Promise<Array<{ t: number; text: string }>> => page.evaluate(() => (window as unknown as { __rec: { alarms: Array<{ t: number; text: string }> } }).__rec.alarms);

/** Wait (polling every 500 ms of wall time) until `ok(...)` holds or `maxSimS` of sim time has passed since the call. */
export async function waitSim(page: Page, maxSimS: number, ok: (now: number, v: Vals) => boolean | Promise<boolean>): Promise<number | null> {
  const t0 = await simNow(page);
  const wallLimit = Date.now() + (maxSimS / 2 + 90) * 1000; // ×4 speed with a factor-2 margin for a loaded machine
  for (;;) {
    const now = await simNow(page);
    if (await ok(now, await latest(page))) return now;
    if (now - t0 > maxSimS || Date.now() > wallLimit) return null;
    await page.waitForTimeout(500);
  }
}
export const waitUntilSim = async (page: Page, t: number): Promise<number | null> => waitSim(page, Math.max(0, t - (await simNow(page))) + 5, (now) => now >= t);

/** Scenario tab → Showcase filter → Load the card titled `title`; then ×4. Returns the visible labels on the way. */
export async function loadShowcase(page: Page, title: string): Promise<Record<string, string>> {
  const seen: Record<string, string> = {};
  seen.alarmButtonAtOpen = await page.locator('.alarm-count').innerText();
  await page.click('[role=tab][data-tab=scenario]');
  seen.tab = (await page.locator('[role=tab][data-tab=scenario]').innerText()).trim();
  await page.locator('.chip-btn', { hasText: 'Showcase' }).click();
  const cards = page.locator('section[aria-label="Scenario library"] article.scard');
  seen.showcaseCards = (await cards.locator('h3').allInnerTexts()).join(' | ');
  const card = cards.filter({ has: page.locator('h3', { hasText: title }) });
  await card.locator('button', { hasText: 'Load' }).click();
  await page.locator('.toasts').getByText(`Scenario loaded: ${title}`).waitFor({ timeout: 15_000 });
  seen.toast = `Scenario loaded: ${title}`;
  await page.locator('.sessionbar button', { hasText: '×4' }).click();
  await page.locator('.toasts').getByText('Speed ×4').waitFor({ timeout: 10_000 });
  seen.speed = '×4 (session bar) → toast "Speed ×4"';
  await page.waitForTimeout(500);
  seen.running = await runText(page);
  seen.alarmButtonAfterLoad = await page.locator('.alarm-count').innerText();
  seen.sessionBar = (await page.locator('.sessionbar').innerText()).replace(/\s+/g, ' ');
  return seen;
}

/** The visible text of the running-scenario section (title, states, next steps and buttons). */
export const runText = (page: Page): Promise<string> => page.locator('section[aria-label="Running scenario"]').innerText().then((s) => s.replace(/\n{2,}/g, '\n').trim());

/** Press an on-panel scenario action button by its exact visible label. */
export async function action(page: Page, label: string): Promise<number> {
  const b = page.locator('section[aria-label="Running scenario"] button', { hasText: label });
  await b.first().click();
  return simNow(page);
}

export function save(name: string, data: unknown): void {
  mkdirSync(join(OUT, 'results'), { recursive: true });
  writeFileSync(join(OUT, 'results', name), JSON.stringify(data, null, 2));
}

/** A screenshot under docs/showcase/rehearsal/, shrunk to ≤ 60 KB (960 px wide, macOS `sips`) for the repository. */
export const shot = async (page: Page, name: string): Promise<void> => {
  mkdirSync(join(OUT, 'rehearsal'), { recursive: true });
  const path = join(OUT, 'rehearsal', `${name}.jpg`);
  await page.screenshot({ path, type: 'jpeg', quality: 55 });
  spawnSync('/usr/bin/sips', ['-Z', '960', '-s', 'formatOptions', '35', path, '--out', path], { stdio: 'ignore' });
};

export const r1 = (x: number | null | undefined): number | null => (typeof x === 'number' ? Math.round(x * 10) / 10 : null);
export const minOf = (s: Sample[], k: keyof Vals): number | null => {
  const v = s.map((x) => x[k]).filter((x): x is number => typeof x === 'number');
  return v.length ? Math.min(...v) : null;
};
export const maxOf = (s: Sample[], k: keyof Vals): number | null => {
  const v = s.map((x) => x[k]).filter((x): x is number => typeof x === 'number');
  return v.length ? Math.max(...v) : null;
};
export const meanOf = (s: Sample[], k: keyof Vals): number | null => {
  const v = s.map((x) => x[k]).filter((x): x is number => typeof x === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
