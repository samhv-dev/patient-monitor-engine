// The ventilator's alarms reach the instructor. The library case "Severe bronchospasm on the ventilator" holds the
// patient in bronchospasm until salbutamol; the ventilator runs in a window of the instructor's computer (Room setup's
// "Ventilator in a new window": `vent-hamilton.html?link=<code>`, each face) and drives the patient. Each alarm the face
// shows reaches the instructor's alarm line under the monitor, named as the ventilator's, in its priority's colour and
// announced; the face's own silence shows there as silenced; closing the window hands the patient to the engine's
// ventilator and ends them; the Log and the Debrief's record hold each with its start and its end.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from './evidence.ts';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type Alarm = { id: string; text: string; priority: string; silenced: boolean };
type W = {
  __pmeApp: {
    session: { code: string; record: { data: { rows: Array<{ t: number; ev?: string; text: string; endT?: number }> } } };
    link: { ventAlarms: { screen: string; active: Alarm[] } | null; log: ReadonlyArray<{ simT: number | null; text: string }> };
  };
};
const EDP_WORDS = (JSON.parse(readFileSync(resolve(import.meta.dirname, '../src/vent/faces/edp-ts/face.json'), 'utf8')) as { alarms: Record<string, { text: { v: string } }> }).alarms;

/** The ventilator's alarms as the instructor's page holds them, once the host has reported them `as` (an event, not a time). */
const ventAlarms = async (page: Page, as: 'raised' | 'silenced' | 'ended', id: string | null = null): Promise<Alarm[]> => {
  await page.waitForFunction(([k, want]) => {
    const a = (window as unknown as W).__pmeApp.link.ventAlarms?.active ?? [];
    if (k === 'ended') return a.length === 0;
    return a.some((x) => want === null || x.id === want) && (k === 'raised' || a.every((x) => x.silenced));
  }, [as, id] as const, { timeout: 60_000 });
  return page.evaluate(() => (window as unknown as W).__pmeApp.link.ventAlarms?.active ?? []);
};

for (const face of ['hamilton-style', 'edp-ts'] as const) {
  test(`${face}: the ventilator's alarms on the instructor's alarm line, silenced as silenced, ended at the hand-over, in the Log and the record`, async ({ page }, info) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1600, height: 1000 });
    await openApp(page, base, '?scenario=showcase-bronchospasm#/teach2');
    const code = await page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
    const line = page.locator('.ip2-alarmline');
    await expect(line).toBeVisible();

    const win = await page.context().newPage();
    await win.goto(`${base}/vent-hamilton.html?link=${code}${face === 'edp-ts' ? '&face=edp-ts' : ''}`);
    await win.waitForFunction(() => '__vent' in window);

    // the Hamilton-style face: its Pmax alarm, as the walk-through saw it (research/78 finding 4, s17/04); EDP-TS: its first
    const raised = await ventAlarms(page, 'raised', face === 'hamilton-style' ? 'pmax' : null);
    const first = (face === 'hamilton-style' ? raised.find((a) => a.id === 'pmax') : raised[0]) as Alarm;
    if (face === 'hamilton-style') expect(first.text).toBe('High pressure (Pmax)');
    else for (const a of raised) expect(a.text, a.id).toBe(EDP_WORDS[a.id]?.text.v); // the face's own words
    const item = line.locator('.ip2-alarm-texts > [data-vent]', { hasText: `Ventilator: ${first.text}` });
    await expect(item).toHaveAttribute('data-vent', first.priority);
    await expect(line.locator('.ip2-alarm-count')).not.toHaveText('No alarms');
    await expect(line.locator('[aria-live]')).toContainText(`Ventilator alarm: ${first.text}`);
    await expect(line.locator('.ip2-alarm-hint')).toHaveText('Shift+S silences the monitor only · opens the list');
    await line.screenshot({ path: info.outputPath(`instructor-alarm-line-${face}.png`) });

    // the ventilator's own silence: shown as silenced, never as ended
    await (face === 'edp-ts' ? win.locator('[data-ctl="side:silence"]') : win.locator('#alarmBanner')).click();
    await ventAlarms(page, 'silenced');
    await expect(line.locator('.ip2-alarm-texts > [data-vent]').first()).toContainText('(silenced)');
    await line.screenshot({ path: info.outputPath(`instructor-alarm-line-${face}-silenced.png`) });

    await win.close(); // the engine's own ventilator takes the patient: the window's alarms end
    await ventAlarms(page, 'ended');
    await expect(line.locator('[data-vent]')).toHaveCount(0);

    const log = await page.evaluate(() => (window as unknown as W).__pmeApp.link.log.map((e) => e.text));
    expect(log).toContain(`Ventilator window: ${first.text} raised, ${first.priority} priority`);
    expect(log).toContain(`Ventilator window: ${first.text} sound silenced on the ventilator`);
    expect(log).toContain(`Ventilator window: ${first.text} ended`);
    const rows = await page.evaluate(() => (window as unknown as W).__pmeApp.session.record.data.rows.filter((r) => r.ev?.startsWith('ventAlarm:')));
    const row = rows.find((r) => r.ev === `ventAlarm:${first.id}`);
    expect(row?.text).toBe(`Ventilator window: ${first.text}`);
    expect(row?.endT).toBeGreaterThan(row?.t ?? Infinity);
  });
}
