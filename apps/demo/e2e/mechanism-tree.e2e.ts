// The mechanism tree page (docs/plans/mechanism-tree.md piece T1; Q12): #/explore/mechanisms is the last entry of
// Explore's nav; the picker lists the six triggers and each draws without a console error; the propofol tree's node
// count is pinned; the page prints on one A4 page in landscape (Chromium's PDF). Brief 104 (T1b): each trigger opens on
// its default view (the trigger and 4 generations, the folds), which fits one screen at 1440 × 900 without scrolling and
// prints on one A4 page; "+n" draws more, "path to" ART M leaves a route on each trigger, and the whole tree (the T1
// pins) is one button away.
import { expect, test } from './evidence.ts';
import { resolve } from 'node:path';
import { createServer, type ViteDevServer } from 'vite';
import { openApp } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
// PME_E2E_PORT: a fixed port for a local run inside an assigned range; 0 (any free port) otherwise, as startVite does
test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: Number(process.env.PME_E2E_PORT ?? 0), host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
test.afterAll(async () => vite?.close());

const SIX: string[] = ['trigger.bleed', 'trigger.drug.propofol', 'trigger.drug.phenylephrine', 'trigger.drug.esmolol', 'trigger.lungCondition.ptxTension', 'trigger.ventilation.peep'];
// the whole tree's node counts, src/app/mechanisms/graph.test.ts PINS, re-recorded at 182 rows (main 8119ecd0): the EEG
// rows add eeg.cortex and eeg.signal to every trigger's tree (+2 each; the cause per trigger is written beside PINS)
const WHOLE: Record<string, number> = { 'trigger.bleed': 79, 'trigger.drug.propofol': 74, 'trigger.drug.phenylephrine': 75, 'trigger.drug.esmolol': 76, 'trigger.lungCondition.ptxTension': 93, 'trigger.ventilation.peep': 93 };
// the default view's node counts (graph.test.ts DEFAULT_PINS), re-recorded for brief 104: the page opens on the trigger
// and 4 generations past it, folds drawn (a fold box counts as a node); the measured fit below holds for these
const NODES: Record<string, number> = { 'trigger.bleed': 6, 'trigger.drug.propofol': 13, 'trigger.drug.phenylephrine': 8, 'trigger.drug.esmolol': 12, 'trigger.lungCondition.ptxTension': 12, 'trigger.ventilation.peep': 11 };

test('the mechanism tree draws each of the six triggers without a console error', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('console', (m) => void (m.type() === 'error' && errors.push(m.text())));
  page.on('pageerror', (e) => void errors.push(String(e)));
  await openApp(page, base, '#/explore');
  const nav = page.locator('nav.xnav a').last();
  await expect(nav).toHaveText('Mechanism tree');
  await nav.click();
  await expect(page).toHaveURL(/#\/explore\/mechanisms$/);
  const fig = page.locator('.mt-fig');
  await expect(fig.locator('.mt-n[data-key="pk.bus.cns.propCe"]')).toBeVisible();
  await expect(fig.locator('.mt-n')).toHaveCount(NODES['trigger.drug.propofol'] as number); // propofol, the default
  await expect(page.locator('#mt-trigger option')).toHaveCount(6);
  for (const t of SIX) {
    await page.selectOption('#mt-trigger', t);
    await expect(fig.locator(`.mt-n[data-key="${t}"]`)).toBeVisible();
    await expect(fig.locator('.mt-n')).toHaveCount(NODES[t] as number);
    await page.click('#mt-whole');
    await expect(fig.locator('.mt-n')).toHaveCount(WHOLE[t] as number);
    await page.click('#mt-default');
    await expect(fig.locator('.mt-n')).toHaveCount(NODES[t] as number);
  }
  expect(errors).toEqual([]);
});

test('each default view fits one screen at 1440 × 900; "+n" draws more; "path to" ART M leaves a route on each trigger', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, base, '#/explore/mechanisms');
  const fig = page.locator('.mt-fig');
  for (const t of SIX) {
    await page.selectOption('#mt-trigger', t);
    await expect(fig.locator('.mt-n')).toHaveCount(NODES[t] as number);
    // the drawing needs no scroll inside its frame, and the frame sits inside the window
    const m = await fig.evaluate((el) => {
      const svg = el.querySelector('svg') as SVGSVGElement;
      const r = el.getBoundingClientRect();
      return { sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight, svgW: svg.getBoundingClientRect().width, svgH: svg.getBoundingClientRect().height, right: r.right, bottom: r.bottom, top: r.top };
    });
    console.log(`fit ${t}: svg ${Math.round(m.svgW)} × ${Math.round(m.svgH)} px in a frame ${m.cw} × ${m.ch} (top ${Math.round(m.top)}, bottom ${Math.round(m.bottom)})`);
    expect(m.sw, t).toBeLessThanOrEqual(m.cw);
    expect(m.sh, t).toBeLessThanOrEqual(m.ch);
    expect(m.right, t).toBeLessThanOrEqual(1440);
    expect(m.bottom, t).toBeLessThanOrEqual(900);
    // "path to" ART M: the trigger, the monitor's mean, and a route between them
    await page.selectOption('#mt-path', 'mon.abpMean');
    await expect(fig.locator('.mt-n[data-key="mon.abpMean"]')).toBeVisible();
    await expect(fig.locator(`.mt-n[data-key="${t}"]`)).toBeVisible();
    expect(await fig.locator('.mt-e').count(), t).toBeGreaterThanOrEqual(2);
    await page.click('#mt-default');
  }
  // "+n" on propofol's radial pressure draws its four effects, the monitor box among them; the box opens on Enter
  await page.selectOption('#mt-trigger', 'trigger.drug.propofol');
  await page.locator('.mt-more[data-expand="hemo.circOut.pRad"]').click();
  await expect(fig.locator('.mt-n')).toHaveCount((NODES['trigger.drug.propofol'] as number) + 4);
  await page.locator('.mt-n[data-key="device.monitor"]').focus();
  await page.keyboard.press('Enter');
  await expect(fig.locator('.mt-n[data-key="mon.abpMean"]')).toBeVisible();
});

test('each default view prints on one A4 page, and so does the whole propofol tree', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'page.pdf is Chromium only');
  test.setTimeout(90_000);
  await openApp(page, base, '#/explore/mechanisms');
  const pages = async (): Promise<string> => {
    await page.emulateMedia({ media: 'print' });
    const pdf = (await page.pdf({ preferCSSPageSize: true, printBackground: true })).toString('latin1');
    await page.emulateMedia({ media: 'screen' });
    expect(pdf).toMatch(/\/MediaBox \[0 0 84\d\.\d+ 59\d\.\d+\]/); // A4 landscape (842 × 595 pt)
    return String(pdf.match(/\/Type\s*\/Page[^s]/g)?.length);
  };
  for (const t of SIX) {
    await page.selectOption('#mt-trigger', t);
    await expect(page.locator('.mt-fig .mt-n')).toHaveCount(NODES[t] as number);
    expect(await pages(), t).toBe('1');
  }
  await page.selectOption('#mt-trigger', 'trigger.drug.propofol');
  await page.click('#mt-whole');
  await expect(page.locator('.mt-fig .mt-n')).toHaveCount(WHOLE['trigger.drug.propofol'] as number);
  expect(await pages()).toBe('1');
});
