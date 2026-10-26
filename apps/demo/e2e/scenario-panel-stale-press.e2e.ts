// A scenario card button drawn for the previous state (Stage 10 finding on WebKit: "MH crisis" pressed the instant the
// case reached "Established" did nothing). Deterministic: the buttons drawn in "Intubated" (reached with a goto: the card
// starts awake since E119) are held by reference, the case
// is moved to "Surgery under way" through the link, and the held buttons are clicked once the panel's view has the new
// state, whether or not the ≤ 2 Hz repaint has replaced them yet.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { link: { send(c: unknown): Promise<{ accepted: boolean }>; log: Array<{ kind: string; refused?: string }>; ctl: { scenario: { stateId: string | null } } } }; __stale: { crisis: HTMLButtonElement; surgery: HTMLButtonElement } };
const CRISIS = 'MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate';
const SURGERY = 'Start surgery: rocuronium 0.6 mg/kg';

test('a card button drawn for the previous state acts on the current one, or says why not', { tag: '@known-flaky' }, async ({ page }) => {
  await openApp(page, base, '?scenario=showcase-mh', { warmMs: 1000 });
  await page.click('[role=tab][data-tab=scenario]');
  const run = page.locator('section[aria-label="Running scenario"]');
  const stateId = () => page.evaluate(() => (window as unknown as W).__pmeApp.link.ctl.scenario.stateId);
  expect(await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'scenario', action: 'goto', target: 'intubated' }).then((r) => r.accepted))).toBe(true);
  await expect.poll(stateId).toBe('intubated');
  await run.getByRole('button', { name: CRISIS, exact: true }).waitFor();
  await run.getByRole('button', { name: SURGERY, exact: true }).waitFor();

  // hold the two buttons drawn in "Intubated", then move the case on without them
  await page.evaluate(([crisis, surgery]) => {
    const all = [...document.querySelectorAll<HTMLButtonElement>('section[aria-label="Running scenario"] ul.next button')];
    (window as unknown as W).__stale = { crisis: all.find((b) => b.textContent === crisis)!, surgery: all.find((b) => b.textContent === surgery)! };
  }, [CRISIS, SURGERY]);
  expect(await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'scenario', action: 'goto', target: 'surgery' }).then((r) => r.accepted))).toBe(true);
  await expect.poll(stateId).toBe('surgery');
  const logged = () => page.evaluate(() => (window as unknown as W).__pmeApp.link.log.filter((e) => e.kind === 'instructor').length);
  const before = await logged();

  // "Start surgery" does not exist in "Surgery under way": a toast in clinical words, nothing sent, nothing logged
  await page.evaluate(() => (window as unknown as W).__stale.surgery.click());
  await expect(page.locator('.toasts')).toContainText('Not available now: the case has moved to Surgery under way: sevoflurane 2 %, rocuronium.');
  expect(await stateId()).toBe('surgery');
  expect(await logged()).toBe(before);

  // "MH crisis" exists in both states: the press takes the current state's transition
  await page.evaluate(() => (window as unknown as W).__stale.crisis.click());
  await expect.poll(stateId).toBe('triggerOff');
  expect(await logged()).toBe(before + 1);
  expect(await page.evaluate(() => (window as unknown as W).__pmeApp.link.log.filter((e) => e.refused).length)).toBe(0);
});
