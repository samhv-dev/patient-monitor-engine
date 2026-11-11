// WCAG 2.2 AA audit of every view at a laptop and an iPad size, with no dependency (research/13 brief §9, §11.4;
// axe-core is the owner's question Q8). Targets ≥ 24 px (44 px in the instructor panel on a touch screen), names on every
// control, text contrast from the rendered colours, no sideways scroll, no clipped button labels, one h1, a main
// landmark, and a visible focus indicator on the first 25 tab stops.
// Since retire-instructor-v1 (PR 3) the laptop's Instructor view is Instructor v2: the laptop run audits ACTION and each
// of its sheets at 1280 × 800 where it audited today's eight tabs. A tablet instructor uses the Remote (Q5): the iPad
// portrait run pairs a Remote to the host by code and audits each of its tabs, with the 44-px touch targets. The
// connected Remote's heading sits beside its status (research/41 row 62), so no rule is exempted there. The scenario
// builder (B2) is audited with a draft open, at each of its three sections, and walked by keyboard; B3 adds its Phases
// section with a phase open (and its add form), B4 its Actions section with an action open (and two add forms), and B5
// its Script, Outcomes, Debrief hints and Handout questions sections (each with an entry being added), before the walk.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { startRelay } from '../../../packages/controller/relay/server.ts';
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
    const run = async (p: Page, where: string) => found.push(...(await audit(p, { touchPanel: touch })).map((f) => `${where} ${f.rule}: ${f.what}`));
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
      for (const t of TABS) {
        await tab(remote, t);
        await run(remote, `remote/${t}`);
      }
    }
    await page.bringToFront(); // a background tab draws no frames
    for (const r of ['#/', '#/room', '#/scenarios', '#/scenarios/library', '#/scenarios/builder', '#/patient', '#/monitor', '#/teach2', '#/remote', '#/settings', '#/dev', '#/validate', ...EXPLORE.slice(0, 3).map((s) => `#/explore/${s}`)]) {
      await go(page, r);
      await run(page, r);
      if (r !== '#/room') continue;
      // Room plan R7: Room setup's own question, "New room code", open
      await page.getByRole('button', { name: 'New room code' }).click();
      await run(page, '#/room (New room code asked)');
      await page.keyboard.press('Escape');
    }
    // Scenario builder B2: a draft open in the editor (a copy of the MH card) with a refusal shown in place, each of its
    // three sections, and a focus walk through the page (keyboard reachable, a visible focus on every stop)
    await go(page, '#/scenarios/builder');
    await page.getByRole('button', { name: 'Open a copy of Malignant hyperthermia (phases)' }).click();
    await page.waitForSelector('.sb-page .sb-edit');
    await page.locator('.sb-page .field').filter({ has: page.locator('label:text-is("Title")') }).locator('input').fill('');
    await expect(page.locator('.sb-page .sb-edit .sb-refuse')).toHaveCount(1);
    await run(page, '#/scenarios/builder/<draft> header (a refusal shown)');
    for (const s of ['Patient and sensors', 'Case briefing']) {
      await page.getByRole('button', { name: s }).click();
      await run(page, `#/scenarios/builder/<draft> ${s}`);
    }
    // B3: the Phases section with Early signs open (its rule tree, its next list, Instructor v2's words), then its
    // add-a-condition form open
    await page.getByRole('button', { name: /^Phases/ }).click();
    await page.locator('.sb-phases .sb-out', { hasText: 'Early signs' }).click();
    await expect(page.locator('.sb-rule')).toBeVisible();
    await run(page, '#/scenarios/builder/<draft> Phases, Early signs');
    await page.getByRole('button', { name: 'Add a condition to the rule' }).click();
    await run(page, '#/scenarios/builder/<draft> Phases, Early signs, a condition being added');
    // B4: the Actions section with dantrolene open (its criteria, routes, window, repeat, violation, press, Instructor
    // v2's row and grade()'s examples), then its add-a-violation and add-a-command forms open
    await page.getByRole('button', { name: /^Actions/ }).click();
    await page.locator('.sb-actions .sb-out').filter({ has: page.locator('.sb-pl:text-is("Dantrolene 2.5 mg/kg")') }).click();
    await expect(page.locator('.sb-examples')).toBeVisible();
    await run(page, '#/scenarios/builder/<draft> Actions, Dantrolene');
    await page.getByRole('button', { name: 'Add a violation' }).click();
    await page.getByRole('button', { name: 'Add from the Drug sheet' }).click();
    await run(page, '#/scenarios/builder/<draft> Actions, Dantrolene, a violation and a command being added');
    // B5: the Script (its entry, and a new entry's form with the command form), Outcomes (a new outcome's form), Debrief
    // hints (a line to show and an opener added) and Handout questions (a question added and counted)
    await page.getByRole('button', { name: /^Script/ }).click();
    await page.getByRole('button', { name: 'Add a script entry' }).click();
    await run(page, '#/scenarios/builder/<draft> Script, a new entry being added');
    await page.getByRole('button', { name: /^Outcomes/ }).click();
    await page.getByRole('button', { name: 'Add an outcome' }).click();
    await run(page, '#/scenarios/builder/<draft> Outcomes, a new outcome being added');
    await page.getByRole('button', { name: /^Debrief hints/ }).click();
    await page.getByRole('button', { name: 'Add a built-to-show line' }).click();
    await page.getByRole('button', { name: 'Add an opener' }).click();
    await run(page, '#/scenarios/builder/<draft> Debrief hints, a line and an opener');
    await page.getByRole('button', { name: /^Handout questions/ }).click();
    await page.getByRole('button', { name: 'Add a question' }).click();
    await page.locator('[aria-label="Question 1: its words"]').fill('What told you this was MH?');
    await run(page, '#/scenarios/builder/<draft> Handout questions, a question');
    found.push(...(await focusWalk(page, 40)).map((f) => `focus (builder): ${f}`));
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

// Plan learner-action-remote.md L6: the learner remote on a phone — its learner-PIN form, a wrong learner PIN, and the
// page signed in (the monitor strip, the three tabs, the connection line) — and the Room's learner PIN panel on the
// laptop and the iPad. 44 px targets on touch, names, contrast, one h1, no sideways scroll, a focus walk on the phone.
// A classroom relay on this machine (PME_E2E_RELAY_PORT + the worker's index when set, else any free port).
test("accessibility: the learner remote's PIN form and signed-in page, and the Room's learner PIN", async ({ browser }) => {
  test.setTimeout(150_000);
  const dir = mkdtempSync(join(tmpdir(), 'l6-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  const relay = await startRelay({ port: fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = encodeURIComponent(`ws://127.0.0.1:${relay.port}/`);
  const found: string[] = [];
  try {
    for (const [name, vp, touch] of [['laptop', { width: 1280, height: 800 }, false], ['iPad', { width: 820, height: 1180 }, true]] as const) {
      const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
      const page = await ctx.newPage();
      await openApp(page, base, `?relay=${ws}#/room`);
      await page.waitForSelector('#room-learner .ip-peer-hold');
      const pin = await page.evaluate(() => localStorage.getItem('pme.learnerPin'));
      expect(await page.locator('#room-learner').innerText()).not.toContain(pin as string);
      found.push(...(await audit(page, { touchPanel: touch })).map((f) => `room ${name} ${f.rule}: ${f.what}`));
      await ctx.close();
    }
    const host = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await openApp(host, base, `?relay=${ws}&scenario=showcase-induction#/teach2`, { warmMs: 1500 });
    const code = await host.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);
    const pin = (await host.evaluate(() => localStorage.getItem('pme.learnerPin'))) as string;
    for (const theme of ['dark', 'light'] as const) {
      const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      // the light screen is the site's projector-light theme (Settings' Screen), kept on the phone as on the laptop
      if (theme === 'light') await phone.addInitScript(() => localStorage.setItem('pme.site', JSON.stringify({ schema: 'pme-site/1', theme: 'projector-light' })));
      const p = await phone.newPage();
      await p.goto(`${base}/?join=${code}&relay=${ws}#/remote/learner`);
      await p.waitForSelector('.ip-peer-form');
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `learner form ${theme} ${f.rule}: ${f.what}`));
      const typePin = async (x: string) => {
        for (const d of x) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
        await p.locator('.ip-peer-go').click();
      };
      if (theme === 'dark') {
        found.push(...(await focusWalk(p, 16)).map((f) => `learner form focus: ${f}`));
        await typePin(pin === '1111' ? '2222' : '1111');
        await expect(p.locator('.ip-peer-error')).toHaveText(/^Wrong learner PIN/);
        found.push(...(await audit(p, { touchPanel: true })).map((f) => `learner wrong PIN ${f.rule}: ${f.what}`));
      }
      await typePin(pin);
      await expect(p.locator('.lr-status')).toHaveText(`Signed in as a learner remote · ${code}`);
      await expect(p.getByRole('tab')).toHaveCount(3);
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `learner signed in ${theme} ${f.rule}: ${f.what}`));
      if (theme === 'dark') found.push(...(await focusWalk(p, 12)).map((f) => `learner signed in focus: ${f}`));
      await phone.close();
    }
    await host.context().close();
  } finally {
    await relay.close();
  }
  expect(found).toEqual([]);
});

// Plan learner-action-remote.md L7: the learner remote's Drugs tab on a phone, dark and light: the bench open on a
// product (the vial, the diluent with its groups, the volume, the container, the preview and the time), then a tray of
// two (a ready syringe and a preparing one). 44 px targets on touch, names, contrast, one h1, no sideways scroll, and a
// focus walk through the bench and the tray.
test("accessibility: the learner remote's Drugs tab with the bench open and a tray of two", async ({ browser }) => {
  test.setTimeout(150_000);
  const dir = mkdtempSync(join(tmpdir(), 'l7-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  const relay = await startRelay({ port: fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = encodeURIComponent(`ws://127.0.0.1:${relay.port}/`);
  const found: string[] = [];
  try {
    const host = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await openApp(host, base, `?relay=${ws}&scenario=showcase-mh-v2#/teach2`, { warmMs: 1500 });
    const code = await host.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);
    const pin = (await host.evaluate(() => localStorage.getItem('pme.learnerPin'))) as string;
    for (const theme of ['dark', 'light'] as const) {
      const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      if (theme === 'light') await phone.addInitScript(() => localStorage.setItem('pme.site', JSON.stringify({ schema: 'pme-site/1', theme: 'projector-light' })));
      const p = await phone.newPage();
      await p.goto(`${base}/?join=${code}&relay=${ws}#/remote/learner`);
      for (const d of pin) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
      await p.locator('.ip-peer-go').click();
      await expect(p.locator('.lr-status')).toHaveText(`Signed in as a learner remote · ${code}`);
      await expect(p.locator('.lr-bench')).toBeVisible({ timeout: 15_000 });
      // the bench open: Agilus, one vial, water
      await p.locator('.lr-search').fill('dantrolene');
      await p.locator('.lr-pick[data-drug="dantrolene"]').click();
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `drugs products ${theme} ${f.rule}: ${f.what}`));
      await p.locator('.lr-product[data-product="agilus-120mg"]').click();
      await expect(p.locator('.lr-time')).toHaveText('Takes 0:50 to prepare');
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `drugs bench ${theme} ${f.rule}: ${f.what}`));
      if (theme === 'dark') found.push(...(await focusWalk(p, 20)).map((f) => `drugs bench focus: ${f}`));
      await p.locator('.lr-stage').click();
      // a second: fentanyl 2 mL with no sourced time, ready at once (LQ7)
      await p.locator('.lr-search').fill('fentanyl');
      await p.locator('.lr-pick[data-drug="fentanyl"]').click();
      await p.locator('.lr-product[data-product="fentanyl-50mcg-ml"]').click();
      await p.locator('.lr-stage').click();
      await expect(p.locator('.lr-item')).toHaveCount(2);
      await expect(p.locator('.lr-item .lr-state[data-state="preparing"]')).toHaveCount(1, { timeout: 10_000 });
      await expect(p.locator('.lr-item .lr-state[data-state="ready"]')).toHaveCount(1);
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `drugs tray ${theme} ${f.rule}: ${f.what}`));
      if (theme === 'dark') found.push(...(await focusWalk(p, 30)).map((f) => `drugs tray focus: ${f}`));
      await phone.close();
    }
    await host.context().close();
  } finally {
    await relay.close();
  }
  expect(found).toEqual([]);
});
