// "Return here" while the Ventilator view drives the patient: the ventilator goes back with the patient (its settings,
// its breath, its state), so the replayed minute is the first one. Compared: every measurement and lungState event the
// engine emits over the 70 s after the bookmark's own tick (the restore marker says which), in both runs. They are the
// engine's events, not tiles read on a poll, so nothing of the page's sampling stands between them: they must be equal.
import { expect, test, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, speedV2, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type Ev = { type: string; t: number; ids?: string[]; after?: number; breathing?: { source?: string } };
type W = {
  __pmeApp: {
    session: {
      onMount(fn: (m: { on(fn: (e: Ev) => void): () => void }) => void): () => void;
      ventLink: { restoring(): Promise<string> | null } | null;
    };
    link: { send(c: unknown): Promise<{ accepted: boolean; tick: number }> };
  };
  __events: string[][];
  __marks: number[];
  __source: string;
};
const WINDOW_S = 70;
const send = (p: Page, action: 'bookmark' | 'restoreBookmark') =>
  p.evaluate((a) => (window as unknown as W).__pmeApp.link.send({ type: 'scenario', action: a, target: 'vent' }), action);
/** The newest event time of run `run` (0: first, 1: after the return). */
const newest = (p: Page, run: number) => p.evaluate((r) => {
  const last = (window as unknown as W).__events[r]?.at(-1);
  return last ? (JSON.parse(last) as Ev).t : -1;
}, run);
const reach = (p: Page, run: number, t: number) => expect.poll(() => newest(p, run), { timeout: 120_000, intervals: [250] }).toBeGreaterThanOrEqual(t);
const between = (all: string[], from: number, to: number) => all.filter((j) => {
  const t = (JSON.parse(j) as Ev).t;
  return t > from + 1e-9 && t <= to + 1e-9;
});

test('after "Return here" on the Ventilator view the replayed minute is the first one', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit' && !!process.env.CI, 'CI Linux WebKit: the page itself crashes after "Return here" in this ×4 Ventilator-view flow');
  test.setTimeout(300_000);
  await openApp(page, base, '?scenario=showcase-bronchospasm#/teach2', { warmMs: 1500 });
  await page.evaluate(() => {
    const w = window as unknown as W;
    w.__events = [[]];
    w.__marks = [];
    w.__source = '';
    w.__pmeApp.session.onMount((m) => m.on((e) => {
      if (e.type === 'toneCancel' && e.ids === undefined && e.after !== undefined) {
        w.__marks.push(e.after); // the engine's restore marker: a new run, from this time
        w.__events.push([]);
      }
      if (e.type === 'state') w.__source = e.breathing?.source ?? '';
      if (e.type === 'measurement' || e.type === 'lungState') w.__events.at(-1)!.push(JSON.stringify(e));
    }));
  });
  await speedV2(page, 4);
  await page.evaluate(() => (location.hash = '#/vent'));
  // the bookmark holds a patient the cockpit ventilates: its frames drive the engine (the 1 Hz `state` says `external`)
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__source), { timeout: 60_000, message: 'the cockpit never ventilated the patient' }).toBe('external');
  const ack = await send(page, 'bookmark');
  expect(ack.accepted).toBe(true);
  await reach(page, 0, ack.tick * 0.02 + WINDOW_S + 5);
  expect((await send(page, 'restoreBookmark')).accepted).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__marks.length), { timeout: 10_000 }).toBe(1);
  // the cockpit's answer to the return, as its link settled it
  const outcome = () => page.evaluate(async () => {
    const p = (window as unknown as W).__pmeApp.session.ventLink?.restoring();
    return p ? await p : 'pending';
  });
  await expect.poll(outcome, { timeout: 10_000, message: 'the cockpit took the bookmark back' }).toBe('loaded');
  const at = await page.evaluate(() => (window as unknown as W).__marks.at(-1)!);
  await reach(page, 1, at + WINDOW_S);
  const [first, again] = await page.evaluate(() => (window as unknown as W).__events.slice(0, 2));
  const a = between(first!, at, at + WINDOW_S);
  const b = between(again!, at, at + WINDOW_S);
  console.log('vent restore', JSON.stringify({ at, events: a.length, differing: b.filter((x, i) => x !== a[i]).length }));
  expect(a.length).toBeGreaterThan(WINDOW_S);
  expect(b).toEqual(a);
});
