// The /2 MH card's demo path (docs/showcase/SHOWCASE-2-RUN-SHEET.md §3) driven from Instructor v2 (#/teach2), shared
// by teach2-mh-v2, teach2-fit and debrief (plan F6, F11). Not a test file (testMatch is *.e2e.ts).
import { expect, type Page } from '@playwright/test';

export type W = { __pmeApp: { link: { simT: number; send(c: unknown): Promise<{ accepted: boolean; reason?: string }>; log: Array<{ text: string; simT: number | null; refused?: string }>; ctl: { hostPaused: boolean; scenario: { stateId: string | null; doc: unknown; history: Array<{ t: number; stateId: string }> } } } } };

export const app = (page: Page) => page.evaluate(() => {
  const l = (window as unknown as W).__pmeApp.link;
  return { simT: l.simT, stateId: l.ctl.scenario.stateId, history: l.ctl.scenario.history.map((e) => ({ t: e.t, stateId: e.stateId })), refused: l.log.filter((x) => x.refused).map((x) => `${x.text}: ${x.refused}`) };
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

/** Bring the sim clock to `s`: a fast-forward of the gap (whole seconds), then wait until the clock is there. */
export async function to(page: Page, s: number): Promise<void> {
  const gap = Math.floor(s - (await app(page)).simT);
  if (gap >= 2) {
    const r = await page.evaluate((v) => (window as unknown as W).__pmeApp.link.send({ type: 'time', action: 'jump', value: v }), gap);
    expect(r.accepted, r.reason).toBe(true);
  }
  await expect.poll(async () => (await app(page)).simT, { timeout: 60_000 }).toBeGreaterThanOrEqual(s - 0.5);
  await page.waitForTimeout(400); // the skip's end reaches the panel; ACTION repaints (≤ 2 Hz)
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
    const row = page.locator('.ip2-action .ip2-rows:not(.ip2-finished-list) button.ip2-row').filter({ has: page.locator('.ip2-row-title', { hasText: title }) }).first();
    // a row not due now is in ACTION's "Not due now" fold (rows.ts classifyV2 `later`): pressable there once it is open
    const fold = page.locator('.ip2-action details.ip2-later');
    if (!(await row.isVisible()) && (await fold.count()) && !(await fold.evaluate((d) => (d as HTMLDetailsElement).open))) await fold.locator('summary').click();
    await expect(row, `${title} in ACTION at ${t} s (phase ${(await app(page)).stateId})`).toBeVisible();
    const at = (await app(page)).simT;
    await row.click();
    await expect(row).toHaveAttribute('data-look', 'taken', { timeout: 10_000 });
    pressed.push([at, title]);
  }
  return pressed;
}
