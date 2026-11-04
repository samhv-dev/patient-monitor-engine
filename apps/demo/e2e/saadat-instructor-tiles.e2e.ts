// Saadat pass 3 (the owner's 2026-10-23 review of rc.3): on the Instructor view at the demo laptop's window, 1990 × 1080
// with the instructor panel open (the monitor pane ≈ 1425 × 820), the tile text collided: "EtCo2 mmHg" ran into
// "FiCo2", the AWRR limits printed over its label, the "96" of %SPO2 sat on its limits, the T column's values and "°C"
// floated, the IBP1 "( )" sat outside its limits' column, and SQI%/EMG% ran together. The RR tile (no capnograph) was
// set in other type than the EtCO2 tile it stands in for (rule O4: the swap shows only in the content).
// Every text node's INK box (canvas measureText at the node's computed font, placed on its DOM baseline) is measured per
// tile: no two overlap and each lies inside its tile. With PME_SHOTS=1 it writes the gate shots to
// docs/gates/saadat-pass-3/ (SAADAT_P3_TAG=before on main).
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite, tab } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/saadat-pass-3');
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { monitor: { dispatch: (c: unknown) => Promise<{ accepted: boolean }> } } } };
type Ink = { tile: string; t: string; l: number; r: number; top: number; bot: number };

/** Per tile (by data-param; the strip's tile and fields as 'strip'), the ink boxes of its text and the tile's box. */
function inks(page: Page, params: string[]): Promise<{ boxes: Ink[]; out: Ink[]; wrapped: Ink[] }> {
  return page.evaluate((params) => {
    const g = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
    const boxes: Ink[] = [];
    const out: Ink[] = [];
    const wrapped: Ink[] = [];
    for (const p of params) {
      const tile = document.querySelector<HTMLElement>(`.stage .pme-stile[data-param="${p}"]`);
      if (!tile || tile.offsetParent === null) continue;
      const tb = tile.getBoundingClientRect();
      const walk = document.createTreeWalker(tile, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const text = n.textContent ?? '';
        const el = n.parentElement as HTMLElement;
        if (!text.trim() || el.closest('svg')) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const rects = [...range.getClientRects()].filter((r) => r.width > 0);
        if (rects.length !== 1) {
          // every tile text is one line: a wrapped one has run out of room
          if (rects.length > 1) wrapped.push({ tile: p, t: `${text.trim()} (wrapped)`, l: 0, r: 0, top: 0, bot: 0 });
          continue;
        }
        const rc = rects[0] as DOMRect;
        g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const m = g.measureText(text);
        // the DOM content box is fontAscent + fontDescent high and starts fontAscent above the baseline
        const baseY = rc.top + (rc.height - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
        const ink: Ink = { tile: p, t: text.trim(), l: rc.left - m.actualBoundingBoxLeft, r: rc.left + m.actualBoundingBoxRight, top: baseY - m.actualBoundingBoxAscent, bot: baseY + m.actualBoundingBoxDescent };
        boxes.push(ink);
        if (ink.l < tb.left - 0.5 || ink.r > tb.right + 0.5 || ink.top < tb.top - 0.5 || ink.bot > tb.bottom + 0.5) out.push(ink);
      }
    }
    return { boxes, out, wrapped };
  }, params);
}

/** Pairs of ink boxes in one tile that overlap by more than half a pixel each way. */
function overlaps(boxes: Ink[]): string[] {
  const bad: string[] = [];
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i] as Ink;
      const b = boxes[j] as Ink;
      if (a.tile !== b.tile) continue;
      const dx = Math.min(a.r, b.r) - Math.max(a.l, b.l);
      const dy = Math.min(a.bot, b.bot) - Math.max(a.top, b.top);
      if (dx > 0.5 && dy > 0.5) bad.push(`${a.tile}: "${a.t}" × "${b.t}" (${dx.toFixed(1)} × ${dy.toFixed(1)} px)`);
    }
  return bad;
}

/** The typography of a tile's label, value, unit and limits (RR alone, or the EtCO2 part of the CO2 tile). */
function type(page: Page, p: 'RR' | 'CO2') {
  return page.evaluate((p) => {
    const tile = document.querySelector(`.stage .pme-stile[data-param="${p}"]`) as HTMLElement;
    const f = (sel: string) => {
      const e = tile.querySelector(sel) as HTMLElement | null;
      if (!e) return null;
      const s = getComputedStyle(e);
      return { size: s.fontSize, weight: s.fontWeight, family: s.fontFamily, color: s.color };
    };
    const part = '[data-part="0"]';
    const b = tile.getBoundingClientRect();
    const v = (tile.querySelector(`${part} .pv`) as HTMLElement).getBoundingClientRect();
    return { label: f(`${part} .pl`), unit: f(`${part} .pu`), value: f(`${part} .pv`), lim: f(`${part} [data-lim] span`), valueDx: v.left - b.left, valueDy: v.top - b.top };
  }, p);
}

/** Alignment facts of the photo: IBP1's "( )" over its mean limits; BFA's labels evenly spaced; the T values at the right. */
function align(page: Page) {
  return page.evaluate(() => {
    const q = (s: string) => document.querySelector(s) as HTMLElement | null;
    const box = (e: Element | null) => (e ? e.getBoundingClientRect() : null);
    const ibp = q('.stage .pme-stile[data-param="IBP1"]');
    const mean = box(ibp?.querySelector('[data-pme="s"]') ?? null);
    const meanText = (() => {
      const e = ibp?.querySelector('[data-pme="s"]');
      if (!e?.firstChild) return null;
      const r = document.createRange();
      r.selectNodeContents(e);
      return r.getBoundingClientRect();
    })();
    const lims = [...(ibp?.querySelectorAll('.limrow [data-lim]') ?? [])].map((e) => e.getBoundingClientRect());
    const labels = [...document.querySelectorAll('.stage .pme-stile[data-param="BFA"] .pl')].map((e) => e.getBoundingClientRect().left);
    const temp = q('.stage .pme-stile[data-param="TEMP"]');
    const tb = box(temp);
    const tv = [...(temp?.querySelectorAll('.pv') ?? [])].map((e) => {
      const r = document.createRange();
      r.selectNodeContents(e);
      return e.textContent ? r.getBoundingClientRect().right : null;
    });
    return { mean: meanText ? (meanText.left + meanText.right) / 2 : mean ? (mean.left + mean.right) / 2 : null, meanLim: lims[2] ? [lims[2].left, lims[2].right] : null, labels, tempRight: tb?.right ?? 0, tv };
  });
}

async function shot(page: Page, name: string, browserName: string): Promise<void> {
  if (!process.env.PME_SHOTS) return;
  mkdirSync(out, { recursive: true });
  const host = page.locator('.stage > .monitor-host');
  await host.screenshot({ path: `${out}/${process.env.SAADAT_P3_TAG ?? 'after'}-instructor-${name}-${browserName}.png` });
}

// The owner's window: 1990 × 1080 outside, Safari's toolbars, tab and bookmarks bars take ≈ 160 px, so the page is
// 1990 × 920 and the monitor pane 1430 × 820 (the photo's). The full 1080 high viewport is checked too, and a 1000 × 800
// pane (1420 × 900: the 420 px panel), where the release-day rehearsal on the rc.3 kit found the same overlaps.
// E125: the rail's 56-px icon strip beside the Instructor view takes its share (the 23-px footer line under it left on
// 30 October): the owner's window now gives a 1374 × 820 pane (1374 × 980 at 1080 high), and the 1000 × 800 pane needs a
// 1496 × 900 window (the 440 px panel). A 1420 × 900 window gave 944 × 777 with the footer line, where the Saadat-like
// NIBP tile wrapped (PR #137, reported).
for (const [w, h, paneW, pane] of [[1990, 920, 1374, 820], [1990, 1080, 1374, 980], [1496, 900, 1000, 800]] as const) {
  test(`Saadat-like on the Instructor view at ${w} × ${h}: no tile text overlaps; the RR tile is set as the EtCO2 tile`, async ({ page, browserName }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width: w, height: h });
    await openApp(page, base, '#/teach', { warmMs: 2500 });
    const host = await page.locator('.stage > .monitor-host').boundingBox();
    console.log(`saadat-p3 ${browserName} ${w}x${h}: monitor pane ${host?.width.toFixed(0)} × ${host?.height.toFixed(0)}`);
    expect(Math.abs((host?.width ?? 0) - paneW)).toBeLessThan(15); // the instructor panel is open beside the monitor
    expect(Math.abs((host?.height ?? 0) - pane)).toBeLessThan(15);

    // no capnograph: the RR tile stands in for the CO2 tile. First while the cuff's first cycle is running (the NIBP tile
    // prints the cuff pressure and "NBP inflating"), then with every numeric filled
    const TILES = ['HR', 'NIBP', 'TEMP', 'IBP1', 'IBP2', 'BFA', 'SpO2'];
    const a0 = await inks(page, ['NIBP']);
    const filled = () =>
      page.evaluate(() => {
        const v = (p: string) => document.querySelector(`.stage .pme-stile[data-param="${p}"] [data-pme="v"]`)?.textContent ?? '';
        return /\d+ \/ \d+/.test(v('NIBP')) && /\d/.test(v('SpO2')) && /\d/.test(v('RR')) && /\d/.test(v('HR'));
      });
    await expect.poll(filled, { timeout: 60_000, intervals: [500] }).toBe(true);
    const a = await inks(page, [...TILES, 'RR']);
    await shot(page, `${w}x${h}-rr`, browserName);
    const rr = await type(page, 'RR').catch(() => null);
    const al = await align(page);

    // the capnograph attached (the Devices tab's CO2 sampling line on a ventilated patient)
    const vent = await page.evaluate(() => (window as unknown as W).__pmeApp.session.monitor.dispatch({ id: 'p3-vent', issuedBy: 'test', type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 } }));
    expect(vent.accepted).toBe(true);
    await tab(page, 'devices');
    await page.getByRole('button', { name: 'CO₂ sampling line' }).click();
    await expect(page.locator('.stage .pme-stile[data-param="CO2"]')).toBeVisible({ timeout: 5_000 });
    // the CO2 numerics fill: EtCO2 and the AWRR (the ventilator's rate) both printed
    const co2Filled = () =>
      page.evaluate(() => [...document.querySelectorAll('.stage .pme-stile[data-param="CO2"] .pv')].filter((e) => /\d/.test(e.textContent ?? '')).length);
    await expect.poll(co2Filled, { timeout: 30_000, intervals: [500] }).toBe(3);
    const b = await inks(page, [...TILES, 'CO2']);
    await shot(page, `${w}x${h}-etco2`, browserName);
    const co2 = await type(page, 'CO2');

    const bad = [...overlaps(a0.boxes), ...overlaps(a.boxes), ...overlaps(b.boxes)];
    const clipped = [...[...a0.out, ...a.out, ...b.out].map((i) => `${i.tile}: "${i.t}" outside its tile`), ...[...a0.wrapped, ...a.wrapped, ...b.wrapped].map((i) => `${i.tile}: "${i.t}"`)];
    console.log(`saadat-p3 ${browserName} ${w}x${h}: ${a0.boxes.length + a.boxes.length + b.boxes.length} ink boxes; overlaps ${bad.length}, outside ${clipped.length}\n${[...bad, ...clipped].join('\n')}\nalign ${JSON.stringify(al)}`);
    expect(bad, 'tile texts whose ink overlaps').toEqual([]);
    expect(clipped, 'tile texts outside their tile').toEqual([]);
    // IBP1: the blank mean "( )" stands over its own limits (60 115), not beyond them at the tile's edge
    const [ml = 0, mr = 0] = al.meanLim ?? [];
    expect(al.mean ?? -1, 'the IBP1 "( )" over its mean limits').toBeGreaterThanOrEqual(ml);
    expect(al.mean ?? -1, 'the IBP1 "( )" over its mean limits').toBeLessThanOrEqual(mr);
    // BFA: the four labels evenly spaced across the tile
    const steps = al.labels.slice(1).map((x, k) => x - (al.labels[k] as number));
    expect(steps.length).toBe(3);
    expect(Math.max(...steps) - Math.min(...steps), `BFA label steps ${steps.map((s) => s.toFixed(0)).join(', ')}`).toBeLessThan(2);
    // T: each value right-aligned inside the tile, all on one right edge
    const tv = al.tv.filter((x): x is number => x !== null);
    expect(tv.length).toBeGreaterThan(0);
    for (const x of tv) expect(al.tempRight - x, 'a T value right-aligned inside its tile').toBeGreaterThan(3);
    expect(Math.max(...tv) - Math.min(...tv)).toBeLessThan(1);
    // rule O4: the RR tile is the EtCO2 tile's first part with other content — same label, unit, digit and limit type
    expect(rr, 'the RR tile is laid out as the EtCO2 part').not.toBeNull();
    expect(rr?.label).toEqual(co2.label);
    expect(rr?.unit).toEqual(co2.unit);
    expect(rr?.value).toEqual(co2.value);
    expect(rr?.lim).toEqual(co2.lim);
    expect(Math.abs((rr?.valueDy ?? 0) - co2.valueDy)).toBeLessThan(1);
  });
}
