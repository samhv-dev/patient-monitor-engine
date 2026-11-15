// Accessibility, every view (brief 219 split this out of app-accessibility.e2e.ts; where a new case goes: app-accessibility-support.ts).
// Since retire-instructor-v1 (PR 3) the laptop's Instructor view is Instructor v2: the laptop run audits ACTION and each
// of its sheets at 1280 × 800 where it audited today's eight tabs. A tablet instructor uses the Remote (Q5): the iPad
// portrait run pairs a Remote to the host by code and audits each of its tabs, with the 44-px touch targets. The
// connected Remote's heading sits beside its status (research/41 row 62), so no rule is exempted there. The scenario
// builder (B2) is audited with a draft open, at each of its three sections, and walked by keyboard; B3 adds its Phases
// section with a phase open (and its add form), B4 its Actions section with an action open (and two add forms), and B5
// its Script, Outcomes, Debrief hints and Handout questions sections (each with an entry being added), before the walk;
// piece 162 the Script's command form on a sheet command with its fields (the ventilator) and a command being edited.
import { audit, closeSheets, EXPLORE, expect, focusWalk, go, openApp, type Page, serveApp, sheet, type SheetId, TABS, tab, TEACH2, test } from './app-accessibility-support.ts';

let base = '';
serveApp((b) => (base = b));

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
