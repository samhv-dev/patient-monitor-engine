// WCAG 2.2 AA audit of every view at a laptop and an iPad size, with no dependency (research/13 brief §9, §11.4;
// axe-core is Ali's question Q8). Targets ≥ 24 px (44 px in the instructor panel on a touch screen), names on every
// control, text contrast from the rendered colours, no sideways scroll, no clipped button labels, one h1, a main
// landmark, and a visible focus indicator on the first 25 tab stops.
// Since retire-instructor-v1 (PR 3) the laptop's Instructor view is Instructor v2: the laptop run audits ACTION and each
// of its sheets at 1280 × 800 where it audited today's eight tabs. A tablet instructor uses the Remote (Q5): the iPad
// portrait run pairs a Remote to the host by code and audits each of its tabs, with the 44-px touch targets.
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { audit, closeSheets, EXPLORE, focusWalk, go, openApp, sheet, type SheetId, startVite, TABS, tab, TEACH2 } from './app-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

const SHEETS: readonly SheetId[] = ['drug', 'airway', 'defib', 'vitals', 'devices', 'patient', 'log'];

for (const [name, vp, touch] of [['laptop 1280×800', { width: 1280, height: 800 }, false], ['iPad portrait 820×1180', { width: 820, height: 1180 }, true]] as const) {
  test(`accessibility: ${name}`, { tag: '@known-flaky' }, async ({ browser }) => {
    test.setTimeout(150_000);
    const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
    const page = await ctx.newPage();
    await openApp(page, base, `?scenario=acls-vf-witnessed${touch ? '' : TEACH2}`, { warmMs: 3000 });
    const found: string[] = [];
    const run = async (p: Page, where: string, skip: (rule: string, what: string) => boolean = () => false) =>
      found.push(...(await audit(p, { touchPanel: touch })).filter((f) => !skip(f.rule, f.what)).map((f) => `${where} ${f.rule}: ${f.what}`));
    let remote: Page | null = null;
    if (!touch) {
      await run(page, 'teach2/action');
      for (const s of SHEETS) {
        await sheet(page, s);
        await run(page, `teach2/${s}`);
        await closeSheets(page);
      }
    } else {
      const code = await page.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);
      remote = await ctx.newPage();
      await remote.goto(`${base}/#/remote?code=${code}`);
      await expect(remote.locator('.status-pill')).toHaveText(`Connected to ${code}`, { timeout: 15_000 });
      // The audit's one exception, documented (retire-instructor-v1 PR 3, finding 2 of PR 2): a connected Remote hides
      // its join form, and with it the page's only h1 ("Instructor remote"), so each tab shows 0 h1. The Remote keeps
      // today's panel until the phone layout replaces it (phase 2, Q1; `views/remote.ts` is not touched in phase 1):
      // its heading is that work's. Every other rule holds on the Remote, its 44-px targets included.
      const noH1 = (rule: string, what: string) => rule === 'h1' && what === '0 h1 visible';
      for (const t of TABS) {
        await tab(remote, t);
        await run(remote, `remote/${t}`, noH1);
      }
    }
    await page.bringToFront(); // a background tab draws no frames
    for (const r of ['#/', '#/room', '#/scenarios', '#/scenarios/library', '#/scenarios/builder', '#/patient', '#/monitor', '#/teach2', '#/remote', '#/settings', '#/dev', '#/validate', ...EXPLORE.slice(0, 3).map((s) => `#/explore/${s}`)]) {
      await go(page, r);
      await run(page, r);
    }
    if (remote) {
      await remote.bringToFront();
      found.push(...(await focusWalk(remote)).map((f) => `focus (remote): ${f}`));
    } else {
      await go(page, TEACH2);
      found.push(...(await focusWalk(page)).map((f) => `focus: ${f}`));
    }
    await ctx.close();
    expect(found).toEqual([]);
  });
}

// Plan instructor-peer-role.md P7: the instructor phone's way in. The PIN form at a phone's size (the address the Room's
// instructor QR code carries; its relay need not answer for the form to be audited) and the Room page's instructor card
// on the laptop and the iPad (a host page that names a relay: the card shows its PIN panel and the phone's QR fold).
// Labels, 44 px targets on touch, contrast, and a focus walk through the form; the PIN is not in the Room until held.
test("accessibility: the instructor phone's PIN form and the Room's instructor card", async ({ browser }) => {
  test.setTimeout(120_000);
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p = await phone.newPage();
  await p.goto(`${base}/?relay=ws%3A%2F%2F127.0.0.1%3A9299%2F#/remote?code=AB2CD3`);
  await p.waitForSelector('.ip-peer-form');
  const found = (await audit(p, { touchPanel: true })).map((f) => `phone form ${f.rule}: ${f.what}`);
  expect(await p.locator('.ip-peer-key').count()).toBe(12);
  await p.locator('.ip-peer-pin').focus();
  for (const d of '4729') await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
  await expect(p.locator('.ip-peer-pin')).toHaveValue('4729');
  await p.locator('.ip-peer-go').click();
  await expect(p.locator('.ip-peer-pin')).toHaveValue('');
  expect(p.url()).not.toContain('4729');
  found.push(...(await focusWalk(p, 16)).map((f) => `phone form focus: ${f}`));
  await phone.close();

  for (const [name, vp, touch] of [['laptop', { width: 1280, height: 800 }, false], ['iPad', { width: 820, height: 1180 }, true]] as const) {
    const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
    const page = await ctx.newPage();
    await openApp(page, base, '?relay=ws%3A%2F%2F127.0.0.1%3A9299%2F#/room');
    await page.waitForSelector('.ip-peer-room .ip-peer-hold');
    const pin = await page.evaluate(() => localStorage.getItem('pme.instructorPin'));
    expect(pin).toMatch(/^[0-9]{4}$/);
    expect(await page.locator('.ip-peer-room').innerText()).not.toContain(pin as string);
    found.push(...(await audit(page, { touchPanel: touch })).map((f) => `room ${name} ${f.rule}: ${f.what}`));
    await ctx.close();
  }
  expect(found).toEqual([]);
});
