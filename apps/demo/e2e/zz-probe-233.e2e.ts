// DIAGNOSTIC probe for brief 233 (branch diag-233-vent-knob-webkit only; never merged): the steps of
// vent-edp-ts.e2e.ts:117 with each step's state and every input event the page received logged, asserting nothing
// until the end, so a run that loses the turn says where.
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const wsLog: string[] = [];
test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'info' });
  const send = vite.ws.send.bind(vite.ws) as (...a: unknown[]) => void;
  (vite.ws as unknown as { send: (...a: unknown[]) => void }).send = (...a: unknown[]) => { wsLog.push(`${Date.now()} ${JSON.stringify(a).slice(0, 200)}`); send(...a); };
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
test.afterAll(async () => { console.log('probe233-ws', JSON.stringify(wsLog)); await vite?.close(); });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

test('probe 233', async ({ page }) => {
  test.setTimeout(90_000);
  const ev: string[] = [];
  const t0 = Date.now();
  const mark = (s: string) => ev.push(`${Date.now() - t0} ${s}`);
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) mark(`nav ${f.url()}`); });
  page.on('load', () => mark('load'));
  page.on('pageerror', (e) => mark(`pageerror ${String(e).slice(0, 200)}`));
  page.on('console', (m) => mark(`console ${m.type()} ${m.text().slice(0, 160)}`));
  page.on('crash', () => mark('crash'));
  await page.setViewportSize({ width: 1400, height: 820 });
  await page.goto(`${base}/vent-hamilton.html?face=edp-ts`);
  await expect(page.locator('main.edp')).toBeVisible({ timeout: 20_000 });
  await page.evaluate(() => {
    (window as Any).__ev = [];
    const t = performance.now();
    for (const ty of ['pointerdown', 'pointerup', 'pointercancel', 'click', 'wheel', 'lostpointercapture', 'gotpointercapture', 'mousedown', 'mouseup', 'keydown', 'blur', 'focus', 'resize', 'visibilitychange', 'pagehide'])
      addEventListener(ty, (e) => {
        const el = e.target as HTMLElement;
        const ctl = el?.closest?.('[data-ctl]')?.getAttribute('data-ctl') ?? el?.tagName ?? String(el);
        const xy = 'clientX' in e ? ` ${(e as MouseEvent).clientX},${(e as MouseEvent).clientY}` : '';
        const d = 'deltaY' in e ? ` dy=${(e as WheelEvent).deltaY}` : '';
        (window as Any).__ev.push(`${Math.round(performance.now() - t)} ${ty} ${ctl}${xy}${d} trusted=${e.isTrusted} prevented=${e.defaultPrevented}`);
      }, true);
  });
  const cfg = () => page.evaluate(() => (window as Any).__vent.vs.cfg.pmax as number);
  const peak = () => page.evaluate(() => (window as Any).__vent.vs.p.measured.PIP as number);
  const tag = page.locator('[data-ctl="tag:pmax"]');
  const knob = page.locator('.edp-knob');
  const st = async (s: string) => mark(`${s} cfg=${await cfg()} tagSel=${await tag.evaluate((e) => e.classList.contains('sel'))} tagText=${await tag.innerText()} ring=${await knob.evaluate((e) => e.classList.contains('lit'))} strip=${JSON.stringify(await page.locator('.edp-strip').innerText())} win=${await page.locator('.edp-win').count()} perf=${await page.evaluate(() => Math.round(performance.now()))} vis=${await page.evaluate(() => document.visibilityState)} hit=${await page.evaluate(() => { const k = document.querySelector('.edp-knob')!.getBoundingClientRect(); const t = document.querySelector('[data-ctl="tag:pmax"]')!.getBoundingClientRect(); const at = (x: number, y: number) => { const e = document.elementFromPoint(x, y) as HTMLElement | null; return e ? (e.closest('[data-ctl]')?.getAttribute('data-ctl') ?? e.className) : 'none'; }; return JSON.stringify({ knob: [k.x, k.y, k.width, k.height].map(Math.round), atKnob: at(k.x + k.width / 2, k.y + k.height / 2), tag: [t.x, t.y, t.width, t.height].map(Math.round), atTag: at(t.x + t.width / 2, t.y + t.height / 2), scroll: [scrollX, scrollY, document.scrollingElement?.scrollTop ?? -1] }); })}`);
  await expect.poll(peak, { timeout: 20_000 }).toBeGreaterThan(10);
  const pmax0 = await cfg();
  const pk = await peak();
  const steps = pmax0 - Math.max(10, Math.floor(pk - 5));
  mark(`peak=${pk} steps=${steps}`);
  await st('before tag click');
  await tag.click();
  await st('after tag click');
  for (let i = 0; i < steps; i++) await knob.dispatchEvent('wheel', { deltaY: 100 });
  await st('after turns');
  await knob.click();
  await st('after knob click');
  const pageEv = await page.evaluate(() => (window as Any).__ev as string[]);
  const got = await cfg();
  mark(`contexts ${JSON.stringify(page.context().browser()?.contexts().map((c) => c.pages().map((pg) => pg.url())))}`);
  mark(`ws ${JSON.stringify(wsLog)}`);
  console.log(`probe233 ${got === pmax0 - steps ? 'OK' : 'LOST'} ${JSON.stringify(ev)}`);
  console.log(`probe233-events ${JSON.stringify(pageEv.filter((x) => !x.includes(' wheel ')))} wheels=${pageEv.filter((x) => x.includes(' wheel ')).length} firstWheel=${pageEv.find((x) => x.includes(' wheel '))}`);
  expect(got).toBe(pmax0 - steps);
});
