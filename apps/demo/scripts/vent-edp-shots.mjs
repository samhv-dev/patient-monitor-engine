// Screenshots of the EDP-TS face (plan vent-skin-edp-ts.md V1, brief 154) for its pull request: the running screen, the
// mode window, a pending value, an alarm and an unavailable control with its reason, at 1280, 1440 and 1920 px wide.
// Needs a dev server of apps/demo (`pnpm --filter @pme/demo exec vite --port <p>`):
//   node apps/demo/scripts/vent-edp-shots.mjs http://127.0.0.1:<p> <out-dir>
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const [base, outArg] = process.argv.slice(2);
if (!base || !outArg) throw new Error('usage: vent-edp-shots.mjs <base-url> <out-dir>');
const out = resolve(outArg);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const [w, h] of [[1280, 800], [1440, 900], [1920, 1080]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(`${base}/vent-hamilton.html?face=edp-ts`);
  await page.waitForFunction(() => window.__vent?.vs.p.breathCount >= 4, null, { timeout: 60_000 });
  await page.waitForTimeout(13_000); // a full 12 s sweep
  const shot = (n) => page.screenshot({ path: `${out}/edp-ts-${w}-${n}.png` });
  const knob = page.locator('.edp-knob');
  await shot('1-running');
  await page.click('[data-ctl="side:mode"]');
  await knob.dispatchEvent('wheel', { deltaY: -100 });
  await shot('2-mode-window');
  await knob.click();
  await shot('3-mode-confirmation');
  await page.click('[data-ctl="under:esc"]');
  await page.click('[data-ctl="under:esc"]');
  await page.click('[data-ctl="key:peep"]');
  for (let i = 0; i < 3; i++) await knob.dispatchEvent('wheel', { deltaY: -100 });
  await shot('4-pending-value');
  await page.click('[data-ctl="under:esc"]');
  await page.click('[data-ctl="right:nebulizer"]', { force: true }); // aria-disabled: Playwright would wait for it
  await shot('5-unavailable-reason');
  await page.evaluate(() => { window.__vent.vs.cfg.pmax = 10; });
  await page.waitForTimeout(6000);
  await shot('6-alarm');
  await page.click('[data-ctl="side:menu"]');
  await page.click('[data-ctl="side:menu"]');
  await shot('7-menu-adjuncts');
  await page.close();
}
await browser.close();
console.log(`vent-edp-shots: ${out}`);
