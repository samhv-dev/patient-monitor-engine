// FX-25: on the instructor page (Saadat-like), attaching the CO2 sampling line to a ventilated patient painted the CO2
// lane as one solid yellow block from its left edge to the sweep cursor within a second, which stayed until the sweep came
// round. The lane's backfill read from before the line's first sample, and the engine returned the samples since the
// attach in place of the ones asked for, so they were drawn over and over side by side. The lane now starts blank at the
// attach point and draws the capnogram from there at the sweep speed.
// Back to back for 4 s after the click, the canvas's yellow (#F0F000, the CO2 colour; RESP is gone from that lane) is
// measured per column: the inked columns must form one run that starts at the attach point and is no wider than the sweep
// has travelled since the click; the trace is there by 2 s; a breath (a filled column) shows by 4 s. Those two times are
// on the page's own clock (its sim time since the click), each column dated back from the newest one at the sweep speed:
// CI's loaded Linux WebKit took its first capture 2.5–3.2 s after the click (PR #105 run 39534643448, PR #107 39578631031
// attempt 2) although the trace had begun ≈ 1 s after it, so a wall-clock window failed a lane drawn in time. With
// PME_SHOTS=1 (Chromium) it writes the gate screenshots to docs/gates/fx25/ (FX25_SHOT_TAG=before on main).
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { shot8 } from './indexed-png.ts';
import { openApp, startVite, tab } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/fx25');
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

const LABEL_W = 56; // the renderer's lane chrome, CSS px left of the traces
/** The rows measured, as fractions of the canvas height: the CO2 lane (the third of six) with equal lanes or the Saadat
 *  grid's weights, clear of the pleth lane's yellow "NORMAL" at the bottom. */
const ROWS = [0.3, 0.62] as const;
/** 6.25 mm/s at the default 96 dpi calibration is 23.6 px/s; the bound allows 25 px/s and two columns of stroke. */
const SWEEP_MAX_PX_S = 25;
const BREATH_PX = 20; // a column with this many yellow pixels is filled under a breath (Saadat-like co2.fill)

type W = { __pmeApp: { session: { monitor: { dispatch: (c: unknown) => Promise<{ accepted: boolean }> } }; link: { simT: number } } };
const simT = (page: Page) => page.evaluate(() => (window as unknown as W).__pmeApp.link.simT);

/** Per column of the CO2 lane (CSS px from the lane start), the count of CO2-yellow pixels; the lane width. */
async function yellow(page: Page): Promise<{ cols: number[]; laneW: number }> {
  const canvas = page.locator('.stage canvas[data-lanes]');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no monitor canvas');
  const png = await page.screenshot({ clip: box });
  return page.evaluate(async ({ b64, laneW, from, to, rows }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d') as CanvasRenderingContext2D;
    g.drawImage(img, 0, 0);
    const k = img.width / (laneW + from); // device px per CSS px
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const cols: number[] = [];
    for (let x = from; x < to; x++) {
      const px = Math.round(x * k);
      let n = 0;
      for (let y = Math.round(rows[0] * c.height); y < Math.round(rows[1] * c.height); y++) {
        const i = (y * c.width + px) * 4;
        if ((d[i] as number) > 180 && (d[i + 1] as number) > 180 && (d[i + 2] as number) < 100) n++;
      }
      cols.push(n / k);
    }
    return { cols, laneW };
  }, { b64: png.toString('base64'), laneW: box.width - LABEL_W, from: LABEL_W, to: Math.floor(box.width), rows: ROWS });
}

async function save(page: Page, name: string, browserName: string): Promise<void> {
  if (!process.env.PME_SHOTS || browserName !== 'chromium') return;
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/${process.env.FX25_SHOT_TAG ?? 'after'}-${name}.png`, await shot8(page, 1)); // 1280×800, indexed
}

test('attaching the CO2 line on a ventilated patient: the CO2 lane starts blank at the attach point and fills from there', async ({ page, browserName }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page, base, '#/teach', { warmMs: 2000 });
  expect(await page.evaluate(() => (window as unknown as { __pmeApp: { session: { skin: string } } }).__pmeApp.session.skin)).toBe('saadat-like');
  const lanes = () => page.locator('.stage canvas[data-lanes]').getAttribute('data-lanes');
  expect(await lanes()).toBe('ECG1 ECG2 RESP IBP1 IBP2 PLETH');
  // the patient on the ventilator (as the Airway tab stages it), breathing at 12/min for a while before the line goes on
  const vent = await page.evaluate(() => (window as unknown as W).__pmeApp.session.monitor.dispatch({ id: 'fx25-vent', issuedBy: 'test', type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 } }));
  expect(vent.accepted).toBe(true);
  await page.waitForTimeout(12_000);
  await tab(page, 'devices');
  const line = page.getByRole('button', { name: 'CO₂ sampling line' });
  await expect(line).toHaveAttribute('aria-pressed', 'false');

  const t0 = await page.evaluate(() => performance.now());
  const s0 = await simT(page); // the page's own clock at the click
  await line.click();
  await expect.poll(lanes, { timeout: 5_000, intervals: [50] }).toBe('ECG1 ECG2 CO2 IBP1 IBP2 PLETH');
  await page.waitForTimeout(150); // the worker draws the new layout (the RESP trace cleared) a frame after the page marks it
  let attachCol = -1;
  let tracedBy2s = false;
  let breathAt = Number.NaN;
  const log: string[] = [];
  let shot = false;
  const bad: string[] = [];
  for (;;) {
    const { cols, laneW } = await yellow(page);
    const t = ((await page.evaluate(() => performance.now())) - t0) / 1000; // after the pixels were taken: a generous bound
    const ts = (await simT(page)) - s0; // the page's sim seconds since the click, also read after the pixels
    const inked = cols.flatMap((n, x) => (n > 0 ? [x] : []));
    const reach = SWEEP_MAX_PX_S * t + 2; // how far the sweep can have gone since the click
    if (attachCol < 0 && inked.length >= 3) attachCol = inked[0] as number;
    const far = attachCol < 0 ? [] : inked.filter((x) => (x - attachCol + laneW) % laneW > reach);
    const breath = cols.findIndex((n) => n >= BREATH_PX);
    // when column x was drawn (sim s after the click): the newest ink is now, older columns behind it at the sweep speed.
    // Dated at the fastest sweep the bound allows and against a clock read after the capture, it is never too early.
    const last = attachCol < 0 ? -1 : (inked.at(-1) as number);
    const drawnAt = (x: number) => ts - ((last - x + laneW) % laneW) / SWEEP_MAX_PX_S;
    log.push(`+${t.toFixed(2)} s (sim +${ts.toFixed(2)} s): ${inked.length} inked columns [${inked[0] ?? '-'}..${inked.at(-1) ?? '-'}], beyond the sweep ${far.length}, breath column ${breath}`);
    // the lane left of the attach point stays blank: nothing is drawn beyond what the sweep has covered since the click
    if (inked.length > reach + 1 || far.length > 0) bad.push(log.at(-1) as string);
    if (attachCol >= 0 && drawnAt(attachCol) <= 2) tracedBy2s = true;
    if (attachCol >= 0 && breath >= 0 && Number.isNaN(breathAt)) breathAt = drawnAt(breath);
    if (!shot && t >= 2) {
      await save(page, 'co2-attached-plus2s-1280x800', browserName);
      shot = true;
    }
    if (t >= 4) break;
  }
  console.log(`FX-25 ${browserName}: attach column ${attachCol}, first breath column drawn at sim +${breathAt.toFixed(2)} s, ${bad.length} of ${log.length} captures with ink beyond the sweep\n${log.join('\n')}`);
  if (process.env.PME_SHOTS) {
    await page.waitForTimeout(6_000);
    await save(page, 'co2-attached-plus10s-1280x800', browserName);
  }
  expect(bad, 'ink left of the attach point or beyond the sweep').toEqual([]);
  expect(tracedBy2s, 'the capnogram is drawn right of the attach point within 2 s of the page\'s sim time').toBe(true);
  expect(breathAt, 'a breath shows right of the attach point within 4 s of the page\'s sim time').toBeLessThanOrEqual(4);
});
