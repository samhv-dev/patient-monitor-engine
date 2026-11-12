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
// its Script, Outcomes, Debrief hints and Handout questions sections (each with an entry being added), before the walk;
// piece 162 the Script's command form on a sheet command with its fields (the ventilator) and a command being edited.
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

const SHEETS: readonly SheetId[] = ['drug', 'airway', 'defib', 'vitals', 'devices', 'eeg', 'patient', 'log'];

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
    await page.locator('[aria-label="New command: what"]').selectOption('vent:ventilator');
    await expect(page.locator('[aria-label="New command: Rate (/min)"]')).toBeVisible();
    await run(page, '#/scenarios/builder/<draft> Script, a new entry sending the ventilator');
    await page.getByRole('button', { name: 'Entry 1: edit command 1' }).click();
    await expect(page.locator('[aria-label="Entry 1, command 1: what"]')).toBeFocused();
    await run(page, '#/scenarios/builder/<draft> Script, a command being edited');
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
    // B6: a draft run in place, Instructor v2 with the run panel beside it. The draft audited above is left mid-edit on
    // purpose (an emptied title, and B5's built-to-show line and opener added empty: refusals Run must wait for), so the run
    // starts from a fresh copy of the MH card, which the validator accepts
    await go(page, '#/scenarios/builder');
    await page.getByRole('button', { name: 'Open a copy of Malignant hyperthermia (phases)' }).click();
    await page.waitForSelector('.sb-page .sb-edit');
    await expect(page.getByRole('button', { name: 'Run in place' })).toBeEnabled();
    await page.getByRole('button', { name: 'Run in place' }).click();
    const runIt = page.getByRole('button', { name: 'Run the draft' });
    if (await runIt.isVisible({ timeout: 1000 }).catch(() => false)) await runIt.click();
    await expect(page.locator('aside.sb-run')).toBeVisible();
    // the route has settled: Instructor v2's own view shown with its heading, and the Scenarios view gone (WebKit once
    // audited the page mid-switch and measured the Scenarios view's width under the run panel's column)
    await expect(page.locator('.main[data-route="teach2"] > .view[data-view="teach2"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Instructor v2' })).toBeAttached();
    await expect(page.locator('.view[data-view="scenarios"]')).toBeHidden();
    await run(page, '#/teach2 with the run panel (B6)');
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

// Plan pump-rack-tci.md A1: the pump tablet at a 10-inch tablet's landscape size (§5: 1280 px), dark and light, with
// the 44 px touch targets: the learner-PIN form, then the rack. The host grants a pump in C2, not yet,
// so the TEST issues the grant through the host's own grant method (HostSession.grant; not a product path) and loads a
// syringe and a drip channel through the instructor's own command path (E1's `pump` event), to audit the rack as the
// tablet draws it.
test('accessibility: the pump tablet\'s PIN form and its rack of syringe and drip channels at a tablet size', async ({ browser }) => {
  test.setTimeout(150_000);
  const dir = mkdtempSync(join(tmpdir(), 'a1-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  const relay = await startRelay({ port: fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = encodeURIComponent(`ws://127.0.0.1:${relay.port}/`);
  const found: string[] = [];
  type HostW = { __pmeApp: { session: { code: string; relay: unknown; host: { grant(t: unknown, to: string, granted: boolean): void } }; link: { send(c: unknown): Promise<{ accepted: boolean }> } } };
  try {
    const host = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await openApp(host, base, `?relay=${ws}&scenario=showcase-induction#/teach2`, { warmMs: 1500, site: { schema: 'pme-site/1', pumpRack: ['syringe', 'drip', 'syringe', 'syringe'] } });
    const code = await host.evaluate(() => (window as unknown as HostW).__pmeApp.session.code);
    const pin = (await host.evaluate(() => localStorage.getItem('pme.learnerPin'))) as string;
    const send = (event: Record<string, unknown>) => host.evaluate((e) => (window as unknown as HostW).__pmeApp.link.send({ type: 'applyEvent', event: e }), { kind: 'pump', ...event });
    for (const e of [
      { action: 'load', ch: 1, channel: 'syringe', contents: { drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 }, volumeMl: 50 }, syringeMl: 50 },
      { action: 'program', ch: 1, drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 } },
      { action: 'rate', ch: 1, rate: 20, unit: 'mL/h' },
      { action: 'start', ch: 1 },
      { action: 'load', ch: 2, channel: 'drip', contents: { drugId: 'norepinephrine', concentration: { amount: 4, unit: 'mg', perMl: 250 }, volumeMl: 250 } },
      { action: 'program', ch: 2, drugId: 'norepinephrine', concentration: { amount: 4, unit: 'mg', perMl: 250 }, set: 20 },
      { action: 'rate', ch: 2, rate: 30, unit: 'drops/min' },
      { action: 'start', ch: 2 },
    ]) await expect.poll(async () => (await send(e)).accepted, { message: JSON.stringify(e), timeout: 10_000, intervals: [200] }).toBe(true); // each once the one before has applied
    for (const theme of ['dark', 'light'] as const) {
      const tablet = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
      if (theme === 'light') await tablet.addInitScript(() => localStorage.setItem('pme.site', JSON.stringify({ schema: 'pme-site/1', theme: 'projector-light' })));
      const p = await tablet.newPage();
      await p.goto(`${base}/?join=${code}&relay=${ws}#/pump`);
      await p.waitForSelector('.ip-peer-form');
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `pump form ${theme} ${f.rule}: ${f.what}`));
      const typePin = async (x: string) => {
        for (const d of x) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
        await p.locator('.ip-peer-go').click();
      };
      // (no wrong-PIN state here: before C2 the host answers no pump hello at all; its words are pump/page.dom.test.ts's)
      if (theme === 'dark') found.push(...(await focusWalk(p, 16)).map((f) => `pump form focus: ${f}`));
      await typePin(pin);
      const from = await p.waitForFunction(() => (window as unknown as { __pmePumpPage: { follower(): { peerId: string } | null } }).__pmePumpPage.follower()?.peerId ?? null).then((x) => x.jsonValue() as Promise<string>);
      await host.evaluate((to) => { const s = (window as unknown as HostW).__pmeApp.session; s.host.grant(s.relay, to, true); }, from);
      await expect(p.locator('.pump-face')).toHaveCount(4);
      await expect(p.locator('.pump-face[data-ch="2"]')).toHaveAttribute('data-state', 'running', { timeout: 20_000 });
      await expect(p.locator('.pump-face[data-ch="1"]')).toHaveAttribute('data-state', 'running', { timeout: 20_000 });
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `pump rack ${theme} ${f.rule}: ${f.what}`));
      if (theme === 'dark') found.push(...(await focusWalk(p, 12)).map((f) => `pump rack focus: ${f}`));
      await tablet.close();
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

// Plan learner-action-remote.md L9: the learner preparations card on the laptop's dock (Instructor v2 at 1280 × 800)
// and on the instructor's phone (390 × 844, touch: 44 px targets), with a finding and its one control, in the dark and
// the light theme on the phone; names, contrast, no sideways scroll, one h1, and a focus walk that reaches the control.
test('accessibility: the learner preparations card on the laptop dock and on the instructor phone', async ({ browser }) => {
  test.setTimeout(180_000);
  const dir = mkdtempSync(join(tmpdir(), 'l9-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  const relay = await startRelay({ port: fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = encodeURIComponent(`ws://127.0.0.1:${relay.port}/`);
  const found: string[] = [];
  try {
    const hostCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await hostCtx.addInitScript(() => localStorage.setItem('pme.roomLayout', JSON.stringify({ bed2remote01: { name: 'Bed 2', show: 'remote', lastSeen: Date.now() } })));
    const host = await hostCtx.newPage();
    await openApp(host, base, `?relay=${ws}&scenario=showcase-mh-v2#/teach2`, { warmMs: 1500 });
    const code = await host.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);
    const learnerPin = (await host.evaluate(() => localStorage.getItem('pme.learnerPin'))) as string;
    const instructorPin = (await host.evaluate(() => localStorage.getItem('pme.instructorPin'))) as string;
    // a learner phone stages sodium bicarbonate + epinephrine in one syringe (incompatible, Stabilis)
    const lctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await lctx.addInitScript(() => localStorage.setItem('pme.device', 'bed2remote01'));
    const lp = await lctx.newPage();
    await lp.goto(`${base}/?join=${code}&relay=${ws}#/remote/learner`);
    for (const d of learnerPin) await lp.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
    await lp.locator('.ip-peer-go').click();
    await expect(lp.locator('.lr-bench')).toBeVisible({ timeout: 20_000 });
    const parts = [['sodium bic', 'sodiumBicarbonate', 'sodium-bicarbonate-84mg-ml', 10], ['epinephrine', 'epinephrine', 'adrenalin-1mg-ml', 1]] as const;
    for (const [n, [search, drug, product, amount]] of parts.entries()) {
      if (n > 0) await lp.locator('.lr-another').click();
      await lp.locator('.lr-search').fill(search);
      await lp.locator(`.lr-pick[data-drug="${drug}"]`).click();
      await lp.locator(`.lr-product[data-product="${product}"]`).click();
      const field = lp.locator(`.lr-drawn-row[data-product="${product}"] .stepper input`);
      await field.fill(String(amount));
      await field.dispatchEvent('change');
    }
    await lp.locator('.lr-diluent select').selectOption('');
    await lp.locator('.lr-stage').click();
    // the laptop: the card over the dock
    await expect(host.locator('.ip2-dock .ip2-lp-card .ip2-lp-show')).toBeVisible({ timeout: 15_000 });
    found.push(...(await audit(host, { touchPanel: false })).map((f) => `card laptop ${f.rule}: ${f.what}`));
    // the instructor's phone, dark then light: the card above the panel
    for (const theme of ['dark', 'light'] as const) {
      const ictx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      if (theme === 'light') await ictx.addInitScript(() => localStorage.setItem('pme.site', JSON.stringify({ schema: 'pme-site/1', theme: 'projector-light' })));
      const ip = await ictx.newPage();
      await ip.goto(`${base}/?relay=${ws}#/remote?code=${code}`);
      for (const d of instructorPin) await ip.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
      await ip.locator('.ip-peer-go').click();
      await expect(ip.locator('.ip2-lp-inline .ip2-lp-card .ip2-lp-show')).toBeVisible({ timeout: 20_000 });
      // the session bar's mode badge is empty (a button with no name) until the host's first state reaches the phone: a
      // gap that predates this card (sessionbar.ts), so the audit runs once the state has arrived
      await expect(ip.locator('.mode-badge')).not.toHaveText('', { timeout: 10_000 });
      found.push(...(await audit(ip, { touchPanel: true })).map((f) => `card phone ${theme} ${f.rule}: ${f.what}`));
      if (theme === 'dark') found.push(...(await focusWalk(ip, 12)).map((f) => `card phone focus: ${f}`));
      await ictx.close();
    }
    await lctx.close();
    await hostCtx.close();
  } finally {
    await relay.close();
  }
  expect(found).toEqual([]);
});

// Plan learner-action-remote.md L8: the learner remote's Infusions tab on a phone, dark and light: a ready syringe to
// start (its mL/h and the dose rate beside it) over a running infusion this phone started (its rate, dose rate, "set by",
// Change and Stop) and the instructor's, started before the phone signed in. 44 px targets on touch, names, contrast, one h1, no sideways scroll, a focus walk.
test("accessibility: the learner remote's Infusions tab with a syringe to start and two running infusions", async ({ browser }) => {
  test.setTimeout(150_000);
  const dir = mkdtempSync(join(tmpdir(), 'l8-'));
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
    const sent = await host.evaluate(() => (window as unknown as { __pmeApp: { link: { send(c: unknown): Promise<{ accepted: boolean }> } } }).__pmeApp.link.send({ type: 'applyEvent', event: { kind: 'infusion', drugId: 'remifentanil', rate: 0.1, unit: 'mcg/kg/min' } }));
    expect(sent.accepted).toBe(true);
    for (const theme of ['dark', 'light'] as const) {
      const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      if (theme === 'light') await phone.addInitScript(() => localStorage.setItem('pme.site', JSON.stringify({ schema: 'pme-site/1', theme: 'projector-light' })));
      const p = await phone.newPage();
      await p.goto(`${base}/?join=${code}&relay=${ws}#/remote/learner`);
      for (const d of pin) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
      await p.locator('.ip-peer-go').click();
      await expect(p.locator('.lr-status')).toHaveText(`Signed in as a learner remote · ${code}`);
      await expect(p.locator('.lr-bench')).toBeVisible({ timeout: 15_000 });
      // two fentanyl syringes, ready at once (LQ7): one started, one left to start
      for (let i = 0; i < 2; i++) {
        await p.locator('.lr-search').fill('fentanyl');
        await p.locator('.lr-pick[data-drug="fentanyl"]').click();
        await p.locator('.lr-product[data-product="fentanyl-50mcg-ml"]').click();
        await p.locator('.lr-stage').click();
      }
      await expect(p.locator('.lr-item .lr-state[data-state="ready"]')).toHaveCount(2, { timeout: 10_000 });
      await p.getByRole('tab', { name: 'Infusions' }).click();
      await expect(p.locator('.lr-inf-prep .lr-start')).toHaveCount(2);
      await p.locator('.lr-inf-prep .lr-start').first().click();
      await expect(p.locator('.lr-inf[data-drug="fentanyl"] .lr-setby')).toHaveText(/^set by this phone at /, { timeout: 15_000 });
      // the instructor's started before this phone signed in: the phone says so instead of naming anyone
      await expect(p.locator('.lr-inf[data-drug="remifentanil"] .lr-setby')).toHaveText('set before this phone signed in');
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `infusions ${theme} ${f.rule}: ${f.what}`));
      if (theme === 'dark') found.push(...(await focusWalk(p, 30)).map((f) => `infusions focus: ${f}`));
      await phone.close();
    }
    await host.context().close();
  } finally {
    await relay.close();
  }
  expect(found).toEqual([]);
});

// Plan learner-action-remote.md L11: the learner remote's Labs tab on a phone, dark and light: a gas pending (its expected
// time and analyser), then its result table with flagged values (the MH card), a chemistry sample still pending beside it.
// 44 px targets on touch, names, contrast, one h1, no sideways scroll, a focus walk. PME_L11_SHOTS=<dir> also saves the
// screenshots the brief asks for (the pending row, the result, a flagged value; dark and light).
test("accessibility: the learner remote's Labs tab with a pending sample and a flagged result", async ({ browser }) => {
  test.setTimeout(180_000);
  const dir = mkdtempSync(join(tmpdir(), 'l11-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  const fixed = Number(process.env.PME_E2E_RELAY_PORT) || 0;
  const relay = await startRelay({ port: fixed ? fixed + Number(process.env.TEST_PARALLEL_INDEX ?? 0) : 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer' });
  const ws = encodeURIComponent(`ws://127.0.0.1:${relay.port}/`);
  const shots = process.env.PME_L11_SHOTS;
  const found: string[] = [];
  type L = { __pmeApp: { session: { code: string }; link: { send(c: unknown): Promise<{ accepted: boolean }> } } };
  try {
    const host = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await openApp(host, base, `?relay=${ws}&scenario=showcase-mh-v2#/teach2`, { warmMs: 1500 });
    const code = await host.evaluate(() => (window as unknown as L).__pmeApp.session.code);
    const pin = (await host.evaluate(() => localStorage.getItem('pme.learnerPin'))) as string;
    for (const theme of ['dark', 'light'] as const) {
      const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      if (theme === 'light') await phone.addInitScript(() => localStorage.setItem('pme.site', JSON.stringify({ schema: 'pme-site/1', theme: 'projector-light' })));
      const p = await phone.newPage();
      await p.goto(`${base}/?join=${code}&relay=${ws}#/remote/learner`);
      for (const d of pin) await p.locator('.ip-peer-key', { hasText: new RegExp(`^${d}$`) }).click();
      await p.locator('.ip-peer-go').click();
      await expect(p.locator('.lr-status')).toHaveText(`Signed in as a learner remote · ${code}`);
      await p.getByRole('tab', { name: 'Labs' }).click();
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `labs empty ${theme} ${f.rule}: ${f.what}`));
      // sodium bicarbonate 200 mmol and calcium chloride 3 g on the laptop first, two minutes of the case before the draw (×8),
      // so the gas has flagged values (HCO3, BE, pH, Na) and a critical one (iCa) to show and to check for contrast; the
      // light pass draws from the same patient
      if (theme === 'dark') {
        for (const event of [{ kind: 'drug', drugId: 'sodiumBicarbonate', dose: 200, unit: 'mmol', route: 'iv' }, { kind: 'drug', drugId: 'calciumChloride', dose: 3, unit: 'g', route: 'iv' }]) {
          expect((await host.evaluate((ev) => (window as unknown as L).__pmeApp.link.send({ type: 'applyEvent', event: ev }), event)).accepted).toBe(true);
        }
        expect((await host.evaluate(() => (window as unknown as L).__pmeApp.link.send({ type: 'time', action: 'scale', value: 8 }))).accepted).toBe(true);
        await p.waitForTimeout(15_000);
        expect((await host.evaluate(() => (window as unknown as L).__pmeApp.link.send({ type: 'time', action: 'scale', value: 1 }))).accepted).toBe(true);
      }
      await p.locator('.lr-lab-send[data-panel="abg"]').click();
      await expect(p.locator('.lr-lab .lr-lab-state[data-state="pending"]')).toHaveCount(1, { timeout: 10_000 });
      await p.locator('.lr-lab').first().scrollIntoViewIfNeeded();
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `labs pending ${theme} ${f.rule}: ${f.what}`));
      if (shots) await p.screenshot({ path: join(shots, `labs-pending-${theme}.png`) });
      expect((await host.evaluate(() => (window as unknown as L).__pmeApp.link.send({ type: 'time', action: 'scale', value: 8 }))).accepted).toBe(true);
      await expect(p.locator('.lr-lab .lr-lab-state[data-state="resulted"]')).toHaveCount(1, { timeout: 30_000 });
      expect((await host.evaluate(() => (window as unknown as L).__pmeApp.link.send({ type: 'time', action: 'scale', value: 1 }))).accepted).toBe(true);
      await p.locator('.lr-lab-send[data-panel="chem"]').click();
      await expect(p.locator('.lr-lab')).toHaveCount(2, { timeout: 10_000 });
      found.push(...(await audit(p, { touchPanel: true })).map((f) => `labs result ${theme} ${f.rule}: ${f.what}`));
      if (theme === 'dark') found.push(...(await focusWalk(p, 16)).map((f) => `labs focus: ${f}`));
      await expect(p.locator('.lr-lab[data-panel="abg"] tr.high').first()).toBeVisible();
      if (theme === 'dark') await expect(p.locator('.lr-lab[data-panel="abg"] tr.crit').first()).toBeVisible();
      if (shots) {
        await p.locator('.lr-lab[data-panel="abg"]').screenshot({ path: join(shots, `labs-result-${theme}.png`) });
        await p.locator('.lr-lab[data-panel="abg"] tr.crit, .lr-lab[data-panel="abg"] tr.high').last().scrollIntoViewIfNeeded();
        await p.screenshot({ path: join(shots, `labs-flagged-${theme}.png`) });
      }
      await phone.close();
    }
    await host.context().close();
  } finally {
    await relay.close();
  }
  expect(found).toEqual([]);
});
