// Accessibility, the ventilator windows (brief 219 split this out of app-accessibility.e2e.ts; where a new case goes: app-accessibility-support.ts).
import { audit, expect, serveApp, test } from './app-accessibility-support.ts';

let base = '';
serveApp((b) => (base = b));

// Plan vent-skin-edp-ts.md V1: the EDP-TS ventilator face (vent-hamilton.html?face=edp-ts) at the laptop size and at
// 1920 × 1080, running and with the mode window and the Alarm settings window open: targets, names, contrast, one h1,
// a main landmark, no sideways scroll. Since VF (brief 159) the drawn device keeps its photographed colours: contrast is
// not checked inside `.edp-dev` (the audit's one `drawnDevice` exemption); the strip, handle and drawer keep it.
test('accessibility: the EDP-TS ventilator face', async ({ browser }) => {
  test.setTimeout(120_000);
  const found: string[] = [];
  for (const vp of [{ width: 1280, height: 800 }, { width: 1920, height: 1080 }]) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    await page.goto(`${base}/vent-hamilton.html?face=edp-ts`);
    await page.waitForSelector('main.edp .edp-tile');
    const at = `${vp.width}×${vp.height}`;
    found.push(...(await audit(page, { touchPanel: false, drawnDevice: '.edp-dev' })).map((f) => `edp-ts ${at} running ${f.rule}: ${f.what}`));
    await page.click('[data-ctl="side:mode"]');
    found.push(...(await audit(page, { touchPanel: false, drawnDevice: '.edp-dev' })).map((f) => `edp-ts ${at} modes ${f.rule}: ${f.what}`));
    await page.click('[data-ctl="side:alarmLimits"]');
    found.push(...(await audit(page, { touchPanel: false, drawnDevice: '.edp-dev' })).map((f) => `edp-ts ${at} alarm settings ${f.rule}: ${f.what}`));
    await ctx.close();
  }
  expect(found).toEqual([]);
});
