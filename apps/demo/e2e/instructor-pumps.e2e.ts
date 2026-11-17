// The instructor sees the pumps: a drip channel runs to its volume limit and stops with "Infusion Complete". The
// instructor's laptop shows it at once (the pump alarm card in STATE, and the channel in the Pumps sheet) and so does the
// instructor's phone signed in over the classroom relay (its card, its Pumps tab with Room setup's whole rack, the
// amounts given and the running list, read from the host). The Log has a line when it was raised and when it ended, and
// the Debrief has the alarm, its end and the drug's amount: the engine's own figure. The channel is driven through the
// instructor's own command path (the engine's `pump` event, as mobile-learner.e2e.ts does).
// PME_INSTRUCTOR_PUMPS_SHOTS=<dir>: the laptop at 1440 wide and the phone at 390 wide are saved there as PNG.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ViteDevServer } from 'vite';
import { startRelay } from '../../../packages/controller/relay/server.ts';
import { closeSheets, debriefLinkV2, openApp, pillV2, sheet, startVite } from './app-support.ts';
import { expect, test, type Page } from './evidence.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type Drug = { id: string; totalAmount: number };
type W = { __pmeApp: { session: { code: string }; link: { log: Array<{ kind: string; text: string }>; drugs: { drugs: Drug[] } | null; ctl: { hostPaused: boolean }; send(c: unknown): Promise<{ accepted: boolean }> } } };
const PHENYLEPHRINE = { amount: 100, unit: 'mcg', perMl: 1 };
const ALARM = 'Pump channel 2 (Phenylephrine): Infusion Complete';
const RACK = ['syringe', 'drip', 'syringe', 'syringe'];

const pump = (page: Page, event: Record<string, unknown>) => page.evaluate((e) => (window as unknown as W).__pmeApp.link.send({ type: 'applyEvent', event: e }), { kind: 'pump', ...event });
/** Each step once the one before it has applied (the engine checks a pump event against the channels as they are). */
async function steps(page: Page, list: Array<Record<string, unknown>>): Promise<void> {
  for (const e of list) await expect.poll(async () => (await pump(page, e)).accepted, { message: JSON.stringify(e), timeout: 10_000, intervals: [200] }).toBe(true);
}
/** The Log's pump alarm lines (the monitor's own alarms, such as a sensor not attached, are lines of the same kind). */
const alarmLines = (page: Page) => page.evaluate(() => (window as unknown as W).__pmeApp.link.log.filter((x) => x.kind === 'alarm' && x.text.startsWith('Pump channel')).map((x) => x.text));
/** The engine's own amount of phenylephrine given (its drug panel), in µg. */
const engineMcg = (page: Page) => page.evaluate(() => (window as unknown as W).__pmeApp.link.drugs?.drugs.find((d) => d.id === 'phenylephrine')?.totalAmount ?? 0);

test("a drip channel runs to Infusion Complete: the laptop, the phone over the relay, the Log and the Debrief show it, and when it ended", async ({ page, browser, browserName }) => {
  test.setTimeout(240_000);
  const dir = mkdtempSync(join(tmpdir(), 'instructor-pumps-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  const relay = await startRelay({ port: fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = encodeURIComponent(`ws://127.0.0.1:${relay.port}/`);
  const shots = process.env.PME_INSTRUCTOR_PUMPS_SHOTS;
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page, base, `?relay=${ws}#/teach2`, { warmMs: 1500, site: { schema: 'pme-site/1', pumpRack: RACK } });
    const code = await page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
    const instructorPin = (await page.evaluate(() => localStorage.getItem('pme.instructorPin'))) as string;
    // the instructor's phone over the relay, signed in with the instructor PIN
    const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const phone = await pctx.newPage();
    await phone.goto(`${base}/?relay=${ws}#/remote?code=${code}`);
    for (const d of instructorPin) await phone.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
    await phone.locator('.ip-peer-go').click();
    await phone.getByRole('tab', { name: 'Pumps' }).click({ timeout: 20_000 });
    await expect(phone.locator('.pumps-ch')).toHaveCount(RACK.length, { timeout: 15_000 }); // Room setup's rack, from the host

    await steps(page, [
      { action: 'load', ch: 2, channel: 'drip', contents: { drugId: 'phenylephrine', concentration: PHENYLEPHRINE, volumeMl: 100 } },
      { action: 'program', ch: 2, drugId: 'phenylephrine', concentration: PHENYLEPHRINE, set: 20 },
      { action: 'rate', ch: 2, rate: 60, unit: 'mL/h', limitMl: 0.5 },
      { action: 'start', ch: 2 },
    ]);
    // while it runs, the phone's Drugs tab lists it by what the bag holds
    await phone.getByRole('tab', { name: 'Drugs & fluids' }).click();
    await expect(phone.locator('.infusions li', { hasText: /^Phenylephrine [\d.]+ µg\/min: pump channel 2$/ })).toHaveCount(1, { timeout: 15_000 });
    await phone.getByRole('tab', { name: 'Pumps' }).click();

    const card = page.locator('.ip2-state section.ip2-pa');
    // 0.5 mL at 60 mL/h: the channel stops 30 s of the patient's time after its start
    await expect(card).toBeVisible({ timeout: 60_000 });
    await expect(card.locator('li')).toHaveText([ALARM]);
    await expect(page.locator('.ip2-state [role="alert"]')).toHaveText(ALARM);
    await expect.poll(() => alarmLines(page)).toEqual([ALARM]);
    // the phone: its card and the channel in alarm in its Pumps tab, with the amount given as the host reads it
    await expect(phone.locator('section.ip2-pa li')).toHaveText([ALARM], { timeout: 15_000 });
    const pch2 = phone.locator('.pumps-ch').nth(1);
    await expect(pch2).toHaveAttribute('data-state', 'alarm');
    await expect(pch2.locator('.pumps-alarm')).toHaveText(ALARM);
    await expect(phone.locator('.pumps-given li')).toHaveText([/^Phenylephrine: 50 µg in all \(an infusion\)$/], { timeout: 15_000 });
    // the laptop: the card's control opens the rack's view, where the channel is in alarm with its programme and what it gave
    await card.getByRole('button', { name: 'Show the pumps' }).click();
    const s = await sheet(page, 'pumps');
    const ch2 = s.locator('.pumps-ch').nth(1);
    await expect(ch2).toHaveAttribute('data-state', 'alarm');
    await expect(ch2.locator('h4')).toHaveText('Channel 2 · Drip');
    await expect(ch2.locator('.pumps-alarm')).toHaveText(ALARM);
    await expect(ch2).toContainText('Phenylephrine 100 µg/mL');
    await expect(ch2).toContainText('Infused 0.5 mL');
    if (shots) {
      await page.screenshot({ path: `${shots}/instructor-pumps-${browserName}-laptop-1440.png`, animations: 'disabled' });
      await phone.screenshot({ path: `${shots}/instructor-pumps-${browserName}-phone-390.png`, fullPage: true, animations: 'disabled' });
    }
    // a new limit and a start clear it: both cards go, the Log says it ended
    await steps(page, [{ action: 'rate', ch: 2, rate: 60, unit: 'mL/h', limitMl: 5 }, { action: 'start', ch: 2 }]);
    await expect(card).toBeHidden({ timeout: 10_000 });
    await expect(phone.locator('section.ip2-pa')).toBeHidden({ timeout: 15_000 });
    await expect.poll(() => alarmLines(page)).toEqual([ALARM, `${ALARM} ended`]);
    await closeSheets(page);
    // the Debrief: the alarm, its end, and the engine's own amount as the case was paused
    await pillV2(page).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as W).__pmeApp.link.ctl.hostPaused), { timeout: 20_000 }).toBe(true);
    const mcg = await engineMcg(page);
    expect(mcg).toBeGreaterThan(50);
    await debriefLinkV2(page).click();
    const db = page.locator('[data-view=debrief]');
    await expect(db.getByRole('heading', { level: 1, name: 'Debrief' })).toBeVisible({ timeout: 10_000 });
    await expect(db.locator('.db-timeline tr[data-kind="alarm"]', { hasText: ALARM })).toHaveCount(1);
    await expect(db.locator('.db-timeline tr[data-kind="pump"]', { hasText: `${ALARM} ended` })).toHaveCount(1);
    await expect(db.locator('.db-totals li')).toHaveText([`Phenylephrine: ${+mcg.toPrecision(3)} µg in all (an infusion)`]);
    await pctx.close();
  } finally {
    await relay.close();
  }
});
