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
      // the monitor is scaled as one unit (layout.grid.screenPx): the computed font sizes are layout px, the boxes screen px
      const k = tile.offsetWidth > 0 ? tb.width / tile.offsetWidth : 1;
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
        g.font = `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize) * k}px ${cs.fontFamily}`;
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
    // brief 47: how late the engine worker's event batches reach the page (now − the batch's own wall time), the largest
    // and the latest, so a miss below can tell a queue between the worker and the page from a slow command
    await page.addInitScript(() => {
      const lag = { max: 0, last: 0, n: 0 };
      Object.assign(window, { __p47lag: lag });
      const W = window.Worker;
      window.Worker = class extends W {
        constructor(...a: ConstructorParameters<typeof Worker>) {
          super(...a);
          this.addEventListener('message', (e: MessageEvent<{ type?: string; anchor?: { epochMs: number } }>) => {
            if (e.data?.type !== 'events' || !e.data.anchor) return;
            lag.last = performance.timeOrigin + performance.now() - e.data.anchor.epochMs;
            lag.max = Math.max(lag.max, lag.last);
            lag.n++;
          });
        }
      };
    });
    await openApp(page, base, '#/teach', { warmMs: 2500 });
    const host = await page.locator('.stage > .monitor-host').boundingBox();
    // the render path (brief 47): 'worker-pump' (the page posts the frames) once queued them without bound and delayed every
    // command; CI's WebKit printed 'worker-raf' (run 42170491121), so a miss below is not that
    const path = await page.evaluate(() => (window as unknown as { __pmeApp: { session: { monitor: { renderPath: Promise<string> } } } }).__pmeApp.session.monitor.renderPath);
    console.log(`saadat-p3 ${browserName} ${w}x${h}: monitor pane ${host?.width.toFixed(0)} × ${host?.height.toFixed(0)}, render path ${path}`);
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
    const tFilled = Date.now();
    const a = await inks(page, [...TILES, 'RR']);
    await shot(page, `${w}x${h}-rr`, browserName);
    const rr = await type(page, 'RR').catch(() => null);
    const al = await align(page);

    // the capnograph attached (the Devices tab's CO2 sampling line on a ventilated patient)
    const vent = await page.evaluate(() => (window as unknown as W).__pmeApp.session.monitor.dispatch({ id: 'p3-vent', issuedBy: 'test', type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 } }));
    expect(vent.accepted).toBe(true);
    await tab(page, 'devices');
    // brief 47: the press's path is timed in the page (the main thread's longest stall, the panel's send and answer, the
    // monitor's dispatch and answer, the tile's arrival), so a miss says where the time went; the assertion is unchanged
    await page.evaluate(() => {
      const app = (window as unknown as { __pmeApp: { link: { send: (c: unknown) => Promise<unknown> }; session: { monitor: { dispatch: (c: unknown) => Promise<unknown> } } } }).__pmeApp;
      const t0 = performance.now();
      const at = () => Math.round(performance.now() - t0);
      const d: { log: string[]; stallMs: number } = { log: [], stallMs: 0 };
      (window as unknown as { __p47: typeof d }).__p47 = d;
      let beat = performance.now();
      setInterval(() => ((d.stallMs = Math.max(d.stallMs, performance.now() - beat - 50)), (beat = performance.now())), 50);
      const wrap = (o: Record<string, unknown>, k: string, name: string) => {
        const f = (o[k] as (c: unknown) => Promise<unknown>).bind(o);
        o[k] = (c: unknown) => (d.log.push(`${at()} ${name} ${(c as { type?: string }).type}`), f(c).then((r) => (d.log.push(`${at()} ${name} answered ${JSON.stringify(r)}`), r)));
      };
      wrap(app.link as never, 'send', 'panel');
      wrap(app.session.monitor as never, 'dispatch', 'monitor');
      document.addEventListener('click', () => d.log.push(`${at()} click`), true);
      new MutationObserver(() => document.querySelector('.stage .pme-stile[data-param="CO2"]') && !d.log.some((l) => l.endsWith('tile')) && d.log.push(`${at()} tile`)).observe(document.body, { subtree: true, childList: true });
    });
    const tPress = Date.now();
    const lagAtPress = await page.evaluate(() => ({ ...(window as unknown as { __p47lag: object }).__p47lag }));
    await page.getByRole('button', { name: 'CO₂ sampling line' }).click();
    // CI run 42111824225 (PR #285, webkit 2/3, attempt 1): no CO2 tile 5 s after the press, the toggle pressed, no
    // refusal on the page, the session clock running; local macOS WebKit 20/20, and 8 probe runs (idle and under CPU
    // load) answered the attach in 16–30 ms with the tile at once. The mechanism is not found: a miss now prints the
    // press's answer, the engine's reported line and the clocks, so the next one names it (the assertion is unchanged)
    const co2Tile = page.locator('.stage .pme-stile[data-param="CO2"]');
    const tileShown = await co2Tile.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false);
    if (!tileShown) {
      const at5 = await page.evaluate(() => {
        const a = (window as unknown as { __pmeApp: { link: { simT: number; log: Array<{ simT: number | null; text: string; refused?: string }>; ctl: { state: unknown; pendingCount: number } }; session: { simNow(): number } } }).__pmeApp;
        return { log: a.link.log.slice(-4), engineCo2: (a.link.ctl.state as { sensors?: { co2?: string } } | null)?.sensors?.co2 ?? null, pending: a.link.ctl.pendingCount, linkSimT: a.link.simT, hostSimT: a.session.simNow(), pressed: document.querySelector('[role=tabpanel] .toggles button:nth-child(4)')?.getAttribute('aria-pressed') ?? null, workerEventLag: (window as unknown as { __p47lag: object }).__p47lag, visibility: document.visibilityState };
      });
      console.log(`saadat-p3 ${browserName} ${w}x${h}: no CO2 tile 5 s after the press (filled → press ${tPress - tFilled} ms, worker event lag at the press ${JSON.stringify(lagAtPress)}) ${JSON.stringify(at5)}`);
      // for the diagnosis only (the test still fails): how late the tile comes, if it comes, and the press's timeline
      await co2Tile.waitFor({ state: 'visible', timeout: 25_000 }).catch(() => undefined);
      const later = await page.evaluate(() => ({ ...(window as unknown as { __p47: object }).__p47, workerEventLag: (window as unknown as { __p47lag: object }).__p47lag }));
      console.log(`saadat-p3 ${browserName} ${w}x${h}: the press's timeline ${JSON.stringify(later)}`);
    } else console.log(`saadat-p3 ${browserName} ${w}x${h}: CO2 tile within 5 s (filled → press ${tPress - tFilled} ms, worker event lag at the press ${JSON.stringify(lagAtPress)})`);
    expect(tileShown, 'the CO2 tile within 5 s of the CO₂ sampling line press').toBe(true);
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
