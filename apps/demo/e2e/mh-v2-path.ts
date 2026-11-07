// The /2 MH card's demo path (docs/showcase/SHOWCASE-2-RUN-SHEET.md §3) driven from Instructor v2 (#/teach2), shared
// by teach2-mh-v2, teach2-fit-support and debrief (plan F6, F11). Not a test file (testMatch is *.e2e.ts).
import { expect, type Page } from '@playwright/test';

export type W = { __pmeApp: { link: { simT: number; send(c: unknown): Promise<{ accepted: boolean; reason?: string }>; log: Array<{ text: string; simT: number | null; refused?: string }>; ctl: { hostPaused: boolean; fastForward: { fromT: number; toT: number } | null; scenario: { stateId: string | null; doc: unknown; history: Array<{ t: number; stateId: string }> } } } } };

export const app = (page: Page) => page.evaluate(() => {
  const l = (window as unknown as W).__pmeApp.link;
  return { simT: l.simT, ff: l.ctl.fastForward !== null, stateId: l.ctl.scenario.stateId, history: l.ctl.scenario.history.map((e) => ({ t: e.t, stateId: e.stateId })), refused: l.log.filter((x) => x.refused).map((x) => `${x.text}: ${x.refused}`) };
});

export const PATH: Array<[number, string]> = [
  [30, 'Preoxygenate: 100 % O₂ by face mask'],
  [60, 'Premedicate: midazolam 2 mg, fentanyl 100 µg'],
  [240, 'Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg'],
  [300, 'Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %'],
  [360, 'Start surgery: rocuronium 0.6 mg/kg'],
  [492, 'MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate'],
  [512, 'Dantrolene 2.5 mg/kg'],
  [832, 'EtCO₂ normal: ventilation back to 12 × 500'],
  [1153, 'Dantrolene 2.5 mg/kg; hyperventilate again (20 × 600, O₂ 100 %)'],
];
export const END_S = 1471; // 24:31, the talk's end
/** A press that waits, after its run-sheet time, for the phase the team presses it in: the call is pressed at Early signs'
 *  entry or at 08:12, whichever is later. Since the preoxygenation-first order of 1 November Early signs comes at 08:10
 *  in the harness (it was 08:03) and 1–4 s later in the app, so a press at the clock alone could land before it on a slow
 *  runner (CI run 41368401579: the row stayed "current", unmet). The 08:12 floor keeps the run sheet's clock for the
 *  presses after it (dantrolene at 08:32, the 08:45 pause read as Early signs). */
export const AFTER_PHASE: Record<string, string> = { [PATH[5]![1]]: 'earlySigns' };

/** Bring the sim clock to `s`: a fast-forward of the gap (whole seconds), then wait until the clock is there and the
 *  host has ended the fast-forward. The host refuses every command while it fast-forwards ("the simulation is
 *  fast-forwarding; try again when it ends", host-session.ts) and starts the span at the monitor's own tick, which is
 *  ahead of this page's clock (0.18–0.38 s in local runs), so the span can end past s and the clock pass s − 0.5 during
 *  its last 0.5-s step (FF_STEP_TICKS), before the host has ended it. A press then is refused before the scenario sees
 *  it and the row is never taken (CI run 42111824225, PR #285: the Intubate row stayed "ready", "press to give", 10 s
 *  after its press at 05:00; reproduced locally: four "fast-forwarding" refusals, no taking). The end is the host's own
 *  `fastForward` end event (ctl.fastForward back to null); the clock at s − 0.5 is seen only after the start event, so
 *  null there means ended. */
export async function to(page: Page, s: number): Promise<void> {
  const gap = Math.floor(s - (await app(page)).simT);
  if (gap >= 2) {
    const r = await page.evaluate((v) => (window as unknown as W).__pmeApp.link.send({ type: 'time', action: 'jump', value: v }), gap);
    expect(r.accepted, r.reason).toBe(true);
  }
  await expect.poll(async () => { const a = await app(page); return a.simT >= s - 0.5 && !a.ff; }, { timeout: 60_000, message: `the clock at ${s - 0.5} s and the fast-forward ended` }).toBe(true);
  await page.waitForTimeout(400); // the skip's end reaches the panel; ACTION repaints (≤ 2 Hz)
}

/** Run the clock at ×8 (the clock's top rate) until the scenario is in `phase`, or `withinS` sim seconds have passed, then
 *  back to ×1; returns the phase it stopped in. A phase that comes from the physiology is found this way, not by
 *  fast-forwarding in steps: the host paces every fast-forward to FF_WALL_MS (10 s of wall time, however short the span;
 *  host-session.ts), so 30-s steps cost 10.3–11.8 s each (98 measured locally, the same on both browsers; 20 steps to Arrest: PEA =
 *  217 s) and the haemorrhage card's Arrest: asystole, 29 steps from 01:00, ran into its 360-s limit on CI (run
 *  42279079387: 6.0 min, the retry 5.9 min). At ×8 the span costs its sim length / 8, and the run stops within one
 *  scenario poll (100 ms of wall, 0.8 sim s) of the phase's entry instead of up to one step (30 s) after it. */
export async function runToPhase(page: Page, phase: string, withinS: number): Promise<string | null> {
  const scale = (v: number) => page.evaluate((x) => (window as unknown as W).__pmeApp.link.send({ type: 'time', action: 'scale', value: x }), v);
  const until = (await app(page)).simT + withinS;
  expect((await scale(8)).accepted).toBe(true);
  await page.waitForFunction(([id, t]) => { const l = (window as unknown as W).__pmeApp.link; return l.ctl.scenario.stateId === id || l.simT >= t; }, [phase, until] as const, { timeout: 0, polling: 100 });
  expect((await scale(1)).accepted).toBe(true);
  return (await app(page)).stateId;
}

/** Open the /2 MH card on Instructor v2 at 1440 × 900. */
export async function openMhV2(page: Page, open: (hash: string) => Promise<void>): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open('?scenario=showcase-mh-v2#/teach2');
  await page.waitForFunction(() => !!(window as unknown as W).__pmeApp.link.ctl.scenario.doc, null, { timeout: 30_000 });
}

/** Press the path's rows from `from` while `go(index)` holds, each at its time; returns the presses (sim s, title). */
export async function pressPath(page: Page, go: (i: number) => boolean | Promise<boolean>, from = 0): Promise<Array<[number, string]>> {
  const pressed: Array<[number, string]> = [];
  for (let i = from; i < PATH.length && (await go(i)); i++) {
    const [t, title] = PATH[i] as [number, string];
    await to(page, t);
    const phase = AFTER_PHASE[title];
    if (phase) await expect.poll(async () => (await app(page)).stateId, { timeout: 30_000, message: `${title}: waiting for ${phase}` }).toBe(phase);
    const row = page.locator('.ip2-action .ip2-rows:not(.ip2-finished-list) button.ip2-row').filter({ has: page.locator('.ip2-row-title', { hasText: title }) }).first();
    // a row not due now is in ACTION's "Not due now" fold (rows.ts classifyV2 `later`): pressable there once it is open.
    // ACTION repaints at ≤ 2 Hz, so a row whose phase has just been entered is still in the fold for up to 500 ms: wait
    // one repaint and more (1 s) for it to come out before opening the fold. The fold is closed again after the press, so
    // the view the tests measure is the instructor's, never one this helper opened (CI run 41785967473, PR #257:
    // Early signs entered at 08:13, after the 08:12 floor, the fold was opened for the MH call and left open, and ACTION
    // measured 776 px for 685).
    const fold = page.locator('.ip2-action details.ip2-later');
    await row.waitFor({ state: 'visible', timeout: 1000 }).catch(() => undefined);
    const opened = !(await row.isVisible()) && (await fold.count()) > 0 && !(await fold.evaluate((d) => (d as HTMLDetailsElement).open));
    if (opened) await fold.locator('summary').click();
    await expect(row, `${title} in ACTION at ${t} s (phase ${(await app(page)).stateId})`).toBeVisible();
    const at = (await app(page)).simT;
    await row.click();
    // a press not taken in 10 s (CI WebKit, 6 Nov: Premedicate ×2, Start surgery ×3, the row "ready", "press to give";
    // mechanism not found): say whether the host refused it, what the toasts said and where the clock was
    await expect(row).toHaveAttribute('data-look', 'taken', { timeout: 10_000 }).catch(async (err: Error) => {
      const a = await app(page);
      const toasts = await page.locator('.toast').allTextContents();
      throw new Error(`${title} pressed at ${at.toFixed(1)} s not taken; now ${a.simT.toFixed(1)} s, ff ${a.ff}, phase ${a.stateId}; refused ${JSON.stringify(a.refused.slice(-3))}; toasts ${JSON.stringify(toasts)}\n${err.message}`);
    });
    if (opened && (await fold.count()) && (await fold.evaluate((d) => (d as HTMLDetailsElement).open))) await fold.locator('summary').click();
    pressed.push([at, title]);
  }
  return pressed;
}
