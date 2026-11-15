// Instructor v2: the /2 MH card's second course (Recrudescence, the second Treated and the second Recovering; the first
// course is in teach2-fit-stages.e2e.ts), and the stage strip: its one row centred at two sizes, a stage's box, and a
// toast resting on the dock at two sizes.
// Split from teach2-fit.e2e.ts (the titles and assertions unchanged; helpers in teach2-fit-support.ts) so that no CI
// shard is set by one ≈ 27-min file; the three files are balanced by their CI times.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from './evidence.ts';
import { openApp } from './app-support.ts';
import { mhV2Fit, popFit, send, serveApp, stripRow, type W } from './teach2-fit-support.ts';

const srv = serveApp();

// Plan F11 (F6's acceptance on the /2 card), the second course; the path and the phase times are in mhV2Fit
// (teach2-fit-support.ts).
for (const [target, presses, tag] of [['recrudescence', 8, 'recrudescence'], ['treated', 9, 'treated-2'], ['recovering', 9, 'recovering-2']] as const) {
  // @known-flaky, class crash (outside our code; brief 118): a first attempt lost its page ("Target page, context or browser
  // has been closed") in 17 of the 99 ci runs of 9 Nov with gating WebKit jobs (3 of the 25 carrying PR #369), every first attempt. Linux WebKit's web process, as pass 3's crash rows; no Chromium sighting. Local runs were
  // not made: the crash is CI's Linux WebKit and macOS has never reproduced one (pass 3); the quarantine keeps measuring it.
  test(`Instructor v2 fits 1440 × 900 on the /2 MH card at ${tag}: no scroll, every open action a row, no row disabled`, { tag: '@known-flaky' }, async ({ page, browserName }, info) => {
    test.setTimeout(360_000);
    await mhV2Fit(page, srv.base, browserName, info, target, presses, tag);
  });
}

// The owner, 1 November: no hint line under the chips ("past: return to its start · future: jump to it"; the stage's box
// says what a press does), and the chips' row centred in the strip in every state: no case loaded (one row, the chip
// alone: no note, no status line), a case, its Case briefing and Finish the case (the status line under the row). At the
// laptop's 1440 × 900 and the projector's 1920 × 1080; at 1440 the no-case and case strips are written to TEACH2_SHOTS.
for (const [w, hgt] of [[1440, 900], [1920, 1080]] as const) {
  test(`the strip's one row is centred at ${w} × ${hgt}: no case, a case, its briefing, finishing; no hint line`, async ({ page, browserName }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: w, height: hgt });
    await openApp(page, srv.base, '#/teach2', { warmMs: 1500 });
    await expect(page.locator('.ip2-strip .ip2-chip-none')).toHaveText('No case loaded · the stages appear here when one is');
    const dir = process.env.TEACH2_SHOTS ?? info.outputPath();
    mkdirSync(dir, { recursive: true });
    const shot = (name: string) => (w === 1440 ? page.screenshot({ path: join(dir, `teach2-strip-${name}-${w}x${hgt}-${browserName}.png`) }) : null);
    const empty = await stripRow(page);
    await shot('empty');
    // 2 then 1: the MH card, whose Case briefing holds the status line for its first minute
    await page.locator('body').click({ position: { x: 700, y: 5 } }); // no field has the focus
    await page.keyboard.press('2');
    await page.keyboard.press('1');
    await page.waitForFunction(() => (window as unknown as W).__pmeApp.link.ctl.scenario.doc !== null, null, { timeout: 30_000 });
    await expect(page.locator('.ip2-strip[data-briefing]')).toHaveCount(1);
    await expect(page.locator('.ip2-strip .ip2-current')).toBeVisible();
    const briefing = await stripRow(page);
    await page.locator('.ip2-strip [role="status"]').getByRole('button', { name: 'End briefing' }).click();
    await expect(page.locator('.ip2-strip [role="status"]')).toBeHidden();
    const loaded = await stripRow(page);
    await shot('case');
    await page.locator('.ip2-dock .ip2-finish-btn').click();
    await expect(page.locator('.ip2-strip[data-finishing]')).toHaveCount(1);
    const finishing = await stripRow(page);
    await page.locator('body').click({ position: { x: 700, y: 5 } });
    await page.keyboard.press('Escape');
    await expect(page.locator('.ip2-strip[data-finishing]')).toHaveCount(0);
    const rows = { empty, loaded, briefing, finishing };
    console.log(`teach2-strip-row ${w}x${hgt} ${JSON.stringify(rows)}`);
    for (const [when, r] of Object.entries(rows)) {
      expect(r.chips, `${when}: the chips`).toBeGreaterThan(0);
      expect(r.extra, `${when}: a hint or note line`).toBe(0);
      expect(Math.abs(r.off), `${when}: the chips' row is off the band's centre by ${r.off} px`).toBeLessThanOrEqual(1);
      expect(r.row, `${when}: the main grid's strip row is the strip`).toBe(`${r.strip}px`);
      expect(r.text ?? '', `${when}: the hint`).not.toMatch(/return to its start|jump to it/i);
    }
    for (const r of [empty, loaded]) expect([r.strip, r.status]).toEqual([75, false]);
    for (const r of [briefing, finishing]) expect([r.strip, r.band, r.status]).toEqual([115, 74, true]);
  });
}

// The owner, 1 November (his screenshot 22.48.47): the stage's box showed "Jump to Midazolam 2 mg and fentanyl 100 µg
// given", whose text wrapped out of the 32-px button and out of the box. The button no longer repeats the stage ("Jump to
// it", "Return to its start"; the accessible name carries it), the box is as wide as its content, and a long title wraps
// inside it. At 1440 × 900, the MH card's longest stage name, as a future stage and as a past one; the box's
// screenshot is written to TEACH2_SHOTS.
test('a stage\'s box at 1440 × 900: the long title wraps inside, "Jump to it" and "Return to its start" stay inside the box', async ({ page, browserName }, info) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, srv.base, '?scenario=showcase-mh#/teach2', { warmMs: 1500 });
  await page.waitForFunction(() => (window as unknown as W).__pmeApp.link.ctl.scenario.stateId === 'awake', null, { timeout: 30_000 });
  const NAME = 'Midazolam 2 mg and fentanyl 100 µg given';
  const dir = process.env.TEACH2_SHOTS ?? info.outputPath();
  mkdirSync(dir, { recursive: true });
  // a future stage
  const future = page.locator('.ip2-strip button.ip2-future', { hasText: NAME });
  await future.click();
  await expect(page.locator('.ip2-pop .ip2-pop-head')).toHaveText(NAME);
  await expect(page.locator('.ip2-pop').getByRole('button', { name: `Jump to ${NAME}` })).toHaveText('Jump to it');
  const fut = await popFit(page);
  await page.screenshot({ path: join(dir, `teach2-strip-pop-future-1440x900-${browserName}.png`), clip: { x: 0, y: 0, width: 1440, height: 400 } });
  await future.click(); // a second press closes it
  await expect(page.locator('.ip2-pop')).toHaveCount(0);
  // a past stage with its entry: through Preoxygenating and Premedicated to Induced (preoxygenation first: the owner's
  // ruling of 1 November)
  for (const target of ['preoxygenated', 'premedicated', 'induced']) {
    expect((await send(page, { type: 'scenario', action: 'goto', target })).accepted).toBe(true);
    await page.waitForFunction((id) => (window as unknown as W).__pmeApp.link.ctl.scenario.stateId === id, target, { timeout: 15_000 });
  }
  const past = page.locator('.ip2-strip button.ip2-past', { hasText: NAME });
  await expect(past).not.toHaveClass(/ip2-skipped/);
  await past.click();
  await expect(page.locator('.ip2-pop').getByRole('button', { name: `Return to the start of ${NAME}` })).toHaveText('Return to its start');
  const back = await popFit(page);
  await page.screenshot({ path: join(dir, `teach2-strip-pop-past-1440x900-${browserName}.png`), clip: { x: 0, y: 0, width: 1440, height: 400 } });
  console.log(`teach2-strip-pop ${JSON.stringify({ future: fut, past: back })}`);
  for (const [when, f] of [['future', fut], ['past', back]] as const) {
    expect(f.inWindow, `${when}: the box leaves the window`).toBe(true);
    expect(f.kidsInside, `${when}: a part of the box lies outside it`).toBe(true);
    expect(f.btnInside, `${when}: the button lies outside the box`).toBe(true);
    expect(f.btnTextInside, `${when}: the button's text spills out of the button`).toBe(true);
    expect(f.btnLines, `${when}: the button's text wraps`).toBe(1);
    expect(f.headInside, `${when}: the title spills out of the box`).toBe(true);
    expect(f.box[2] as number, `${when}: the box's width`).toBeLessThanOrEqual(320);
  }
});

// A toast rests on the dock (8 px above its top edge), not 40 px over it, at the laptop's and the projector's window,
// whatever sits under the dock; one raised by a jump, the way the strip raises it.
for (const [w, hgt] of [[1440, 900], [1920, 1080]] as const) {
  test(`a toast rests on the dock at ${w} × ${hgt}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: w, height: hgt });
    await openApp(page, srv.base, '?scenario=showcase-mh#/teach2', { warmMs: 1500 });
    await page.waitForFunction(() => !!(window as unknown as W).__pmeApp.link.ctl.scenario.doc, null, { timeout: 30_000 });
    await page.evaluate(() => document.body.appendChild(Object.assign(document.createElement('div'), { className: 'toasts' })).append(Object.assign(document.createElement('div'), { className: 'toast', textContent: 'Speed ×4' })));
    const m = await page.evaluate(() => {
      const t = (document.querySelector('.toasts > .toast') as HTMLElement).getBoundingClientRect();
      const d = (document.querySelector('.ip2-dock') as HTMLElement).getBoundingClientRect();
      return { gap: Math.round(d.top - t.bottom), dockTop: Math.round(d.top), toastBottom: Math.round(t.bottom) };
    });
    console.log(`teach2-toast ${w}x${hgt} ${JSON.stringify(m)}`);
    expect(m.gap, 'the toast floats over the dock or overlaps it').toBe(8);
  });
}
