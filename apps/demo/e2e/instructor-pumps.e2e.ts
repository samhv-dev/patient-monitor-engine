// The instructor sees the pumps: a drip channel runs to its volume limit and stops with "Infusion Complete". The
// instructor's page shows it at once (the pump alarm card in STATE, and the channel in the Pumps sheet), the Log has a
// line when it was raised and when it ended, and the Debrief's timeline has the alarm with the time it cleared and the
// drug's amount given by infusion. The channel is driven through the instructor's own command path (the engine's `pump`
// event, as mobile-learner.e2e.ts does): what is pinned is what the instructor's screens read from the engine's record.
// PME_269_SHOTS=<dir>: the page at the instructor's width and the instructor remote at phone width are saved there.
import { expect, test, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { closeSheets, debriefLinkV2, openApp, pillV2, sheet, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { code: string }; link: { log: Array<{ kind: string; text: string }>; ctl: { hostPaused: boolean }; send(c: unknown): Promise<{ accepted: boolean }> } } };
const PHENYLEPHRINE = { amount: 100, unit: 'mcg', perMl: 1 };
const ALARM = 'Pump channel 2 (Phenylephrine): Infusion Complete';

const pump = (page: Page, event: Record<string, unknown>) => page.evaluate((e) => (window as unknown as W).__pmeApp.link.send({ type: 'applyEvent', event: e }), { kind: 'pump', ...event });
/** Each step once the one before it has applied (the engine checks a pump event against the channels as they are). */
async function steps(page: Page, list: Array<Record<string, unknown>>): Promise<void> {
  for (const e of list) await expect.poll(async () => (await pump(page, e)).accepted, { message: JSON.stringify(e), timeout: 10_000, intervals: [200] }).toBe(true);
}
/** The Log's pump alarm lines (the monitor's own alarms, such as a sensor not attached, are lines of the same kind). */
const alarmLines = (page: Page) => page.evaluate(() => (window as unknown as W).__pmeApp.link.log.filter((x) => x.kind === 'alarm' && x.text.startsWith('Pump channel')).map((x) => x.text));

test('a drip channel runs to Infusion Complete: the instructor\'s page, the Log and the Debrief show it, and when it ended', async ({ page, browserName }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, base, '#/teach2', { warmMs: 1500, site: { schema: 'pme-site/1', pumpRack: ['syringe', 'drip', 'syringe', 'syringe'] } });
  await steps(page, [
    { action: 'load', ch: 2, channel: 'drip', contents: { drugId: 'phenylephrine', concentration: PHENYLEPHRINE, volumeMl: 100 } },
    { action: 'program', ch: 2, drugId: 'phenylephrine', concentration: PHENYLEPHRINE, set: 20 },
    { action: 'rate', ch: 2, rate: 60, unit: 'mL/h', limitMl: 0.5 },
    { action: 'start', ch: 2 },
  ]);
  const card = page.locator('.ip2-state section.ip2-pa');
  await expect(card).toBeHidden();
  // 0.5 mL at 60 mL/h: the channel stops 30 s of the patient's time after its start
  await expect(card).toBeVisible({ timeout: 60_000 });
  await expect(card.locator('li')).toHaveText([ALARM]);
  await expect(page.locator('.ip2-state [role="alert"]')).toHaveText(ALARM);
  await expect.poll(() => alarmLines(page)).toEqual([ALARM]);
  // the card's control opens the rack's view, where the channel is in alarm with its programme and what it gave
  await card.getByRole('button', { name: 'Show the pumps' }).click();
  const s = await sheet(page, 'pumps');
  const ch2 = s.locator('.pumps-ch').nth(1);
  await expect(ch2).toHaveAttribute('data-state', 'alarm');
  await expect(ch2.locator('h4')).toHaveText('Channel 2 · Drip');
  await expect(ch2.locator('.pumps-alarm')).toHaveText(ALARM);
  await expect(ch2).toContainText('Phenylephrine 100 µg/mL');
  await expect(ch2).toContainText('Infused 0.5 mL');
  await expect(s.locator('.pumps-given')).toContainText('Phenylephrine: 50 µg');
  const shots = process.env.PME_269_SHOTS;
  if (shots) await page.screenshot({ path: `${shots}/269-${browserName}-instructor-1440.png`, animations: 'disabled' });
  if (shots) {
    const phone = await page.context().newPage();
    await phone.setViewportSize({ width: 390, height: 844 });
    await phone.goto(`${base}/#/remote?code=${await page.evaluate(() => (window as unknown as W).__pmeApp.session.code)}`);
    await phone.getByRole('tab', { name: 'Pumps' }).click();
    // a same-browser remote has no `style` (the host sends the rack to relay peers): it shows the channels the engine holds
    await expect(phone.locator('.pumps-ch[data-state="alarm"] h4')).toHaveText('Channel 2 · Drip', { timeout: 15_000 });
    await phone.screenshot({ path: `${shots}/269-${browserName}-remote-390.png`, fullPage: true });
    await phone.close();
    await page.bringToFront();
  }
  // a new limit and a start clear it: the card goes, the Log says it ended
  await steps(page, [{ action: 'rate', ch: 2, rate: 60, unit: 'mL/h', limitMl: 5 }, { action: 'start', ch: 2 }]);
  await expect(card).toBeHidden({ timeout: 10_000 });
  await expect.poll(() => alarmLines(page)).toEqual([ALARM, `${ALARM} ended`]);
  await closeSheets(page);
  // the Debrief: the alarm with the time it cleared, and the amount given by infusion
  const pill = pillV2(page);
  await pill.click();
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__pmeApp.link.ctl.hostPaused), { timeout: 20_000 }).toBe(true);
  await debriefLinkV2(page).click();
  const db = page.locator('[data-view=debrief]');
  await expect(db.getByRole('heading', { level: 1, name: 'Debrief' })).toBeVisible({ timeout: 10_000 });
  await expect(db.locator('.db-timeline tr[data-kind="alarm"]', { hasText: ALARM })).toHaveCount(1);
  await expect(db.locator('.db-timeline tr[data-kind="pump"]', { hasText: `${ALARM} ended` })).toHaveCount(1);
  await expect(db.locator('.db-totals li', { hasText: /^Phenylephrine: [\d.]+ µg in all \(by infusion\)$/ })).toHaveCount(1);
});
